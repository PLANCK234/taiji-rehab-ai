#!/usr/bin/env python3
"""Synthetic Demo backup, isolated restore verification, and macOS scheduling.

Only Python's standard library and the locally installed Docker CLI are needed.
No source database writes, uploads, retention deletion, or raw data logging.
"""
import argparse
import contextlib
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import signal
import subprocess
import sys
import time
import uuid

LABEL = "org.taiji-rehab.demo-backup"
DEFAULT_INTERVAL = 86400
DEFAULT_RETRY = 300


class BackupError(Exception):
    pass


def command(args, *, data=None, output=None, timeout=180):
    try:
        result = subprocess.run(args, input=data, stdout=output or subprocess.PIPE,
                                stderr=subprocess.PIPE, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired):
        raise BackupError("Command unavailable or timed out; check Docker and local disk.") from None
    if result.returncode:
        # PostgreSQL errors can contain row values; deliberately never log stderr.
        raise BackupError("Command failed; check Docker, permissions and free space.")
    return result.stdout


def private_directory(path):
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    if path.is_symlink() or path.stat().st_uid != os.getuid():
        raise BackupError("Backup directory must be owned by the current user, not a symlink.")
    path.chmod(0o700)


def write_json(path, value):
    temporary = path.with_name(path.name + ".tmp-" + uuid.uuid4().hex)
    with temporary.open("x") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
    temporary.chmod(0o600)
    temporary.replace(path)


def remaining(last_success, now, interval):
    # A backwards wall-clock adjustment must not defer work indefinitely.
    if last_success is None or now < last_success:
        return 0
    return max(0, interval - (now - last_success))


def check_destination(root, repo):
    root, repo = root.resolve(), repo.resolve()
    if root == repo or repo in root.parents:
        raise BackupError("Choose a backup directory outside the source repository.")
    return root


@contextlib.contextmanager
def backup_lock(root):
    with (root / ".backup.lock").open("a") as lock:
        os.chmod(lock.name, 0o600)
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise BackupError("Another backup is running; retry later.") from None
        yield


class Database:
    def __init__(self, docker, container, snapshot=None):
        self.docker, self.container, self.snapshot = docker, container, snapshot

    def sql(self, query):
        start = "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='60s';"
        if self.snapshot:
            start += " SET TRANSACTION SNAPSHOT '" + self.snapshot + "';"
        return command([self.docker, "exec", "-i", self.container, "psql", "-XqAt",
                        "-v", "ON_ERROR_STOP=1", "-U", "taiji", "-d", "taiji"],
                       data=(start + query + "; COMMIT;").encode()).decode().strip()

    def inventory(self):
        tables = json.loads(self.sql("SELECT coalesce(json_agg(t),'[]') FROM (SELECT schemaname,tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2) t"))
        result = {}
        for table in tables:
            schema, name = table["schemaname"], table["tablename"]
            quoted = '.'.join('"' + p.replace('"', '""') + '"' for p in (schema, name))
            result[schema + '.' + name] = json.loads(self.sql(
                "SELECT json_build_object('rows',count(*),'content_md5',md5(coalesce(string_agg(h,'' ORDER BY h),''))) "
                "FROM (SELECT md5(row_to_json(t)::text) h FROM " + quoted + " t) r"))
        return result


def source_containers(docker, repo):
    ids = command([docker, "ps", "-q", "--filter", "label=com.docker.compose.service=db"]).decode().split()
    matches = []
    config = (repo / "infra/compose.yaml").resolve()
    for cid in ids:
        info = json.loads(command([docker, "inspect", cid]))[0]
        labels = info["Config"].get("Labels", {})
        configs = labels.get("com.docker.compose.project.config_files", "").split(',')
        if config in [Path(p).resolve() for p in configs if p]:
            matches.append(info)
    if len(matches) != 1:
        raise BackupError("Expected exactly one running Demo database for this repository.")
    source = matches[0]
    project = source["Config"]["Labels"]["com.docker.compose.project"]
    backend_ids = command([docker, "ps", "-q", "--filter", "label=com.docker.compose.service=backend",
                           "--filter", "label=com.docker.compose.project=" + project]).decode().split()
    if len(backend_ids) != 1:
        raise BackupError("Start the Demo backend before backing up.")
    backend = json.loads(command([docker, "inspect", backend_ids[0]]))[0]
    env = dict(e.split('=', 1) for e in backend["Config"]["Env"] if '=' in e)
    if env.get("APP_PROFILE") != "demo" or env.get("ALLOW_SYNTHETIC_ONLY") != "true" or env.get("APP_ENV") != "local":
        raise BackupError("Only local synthetic Demo is supported; Research is refused.")
    volumes = [m for m in source["Mounts"] if m["Destination"] == "/var/lib/postgresql/data" and m["Type"] == "volume"]
    if len(volumes) != 1:
        raise BackupError("Expected a persistent Demo PostgreSQL volume.")
    return source, volumes[0]["Name"]


def verify_inventory(expected, actual):
    if not expected or actual != expected:
        raise BackupError("Restored table counts or content hashes differ.")


def backup_once(docker, repo, root):
    with backup_lock(root):
        source, volume = source_containers(docker, repo)
        db = Database(docker, source["Id"])
        if db.sql("SELECT current_database()") != "taiji":
            raise BackupError("Unexpected database.")
        stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        out = root / (stamp + '-' + uuid.uuid4().hex[:8])
        out.mkdir(mode=0o700)
        temp = "taiji-backup-check-" + uuid.uuid4().hex[:16]
        report = {"status": "FAILED", "created_utc": stamp, "source_volume": volume,
                  "database": "taiji", "profile": "demo"}
        keeper = None
        created = False
        try:
            # Keep one read-only snapshot alive for pg_dump and all source hashes.
            # Source writes can continue; they belong to a later backup.
            keeper = subprocess.Popen([docker, "exec", "-i", source["Id"], "psql", "-XqAt",
                                       "-v", "ON_ERROR_STOP=1", "-U", "taiji", "-d", "taiji"],
                                      stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                      stderr=subprocess.DEVNULL, text=True)
            keeper.stdin.write("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSELECT pg_export_snapshot();\n")
            keeper.stdin.flush()
            # psql is local; avoid an unbounded readline if Docker stops responding.
            import select
            if not select.select([keeper.stdout], [], [], 30)[0]:
                raise BackupError("Database snapshot timed out.")
            snapshot = keeper.stdout.readline().strip()
            import re
            if not re.fullmatch(r"[0-9A-Fa-f-]+", snapshot):
                raise BackupError("Unable to establish a consistent snapshot.")
            db.snapshot = snapshot
            expected = db.inventory()
            archive = out / 'taiji-demo.dump'
            with archive.open('xb') as stream:
                command([docker, "exec", source["Id"], "pg_dump", "-U", "taiji", "-d", "taiji",
                         "--format=custom", "--create", "--snapshot=" + snapshot], output=stream)
            keeper.stdin.write("COMMIT;\n\\q\n")
            keeper.stdin.flush()
            keeper.wait(timeout=30)
            if keeper.returncode:
                raise BackupError("Snapshot session ended unexpectedly.")
            created = True  # Also clean up if Docker creates it but the client times out.
            command([docker, "run", "--detach", "--name", temp, "--network", "none",
                     "--label", LABEL + '=restore-check', "--tmpfs", "/var/lib/postgresql/data:rw",
                     "-e", "POSTGRES_USER=taiji", "-e", "POSTGRES_DB=taiji",
                     "-e", "POSTGRES_HOST_AUTH_METHOD=trust", source["Image"]])
            for attempt in range(60):
                try:
                    command([docker, "exec", temp, "pg_isready", "-U", "taiji", "-d", "taiji"], timeout=5)
                    break
                except BackupError:
                    time.sleep(0.5)
            else:
                raise BackupError("Temporary restore database did not become ready.")
            # stdin is binary and no source volume or network is available here.
            with archive.open('rb') as stream:
                result = subprocess.run([docker, "exec", "-i", temp, "pg_restore", "--exit-on-error",
                                         "-U", "taiji", "-d", "taiji"], stdin=stream,
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
            if result.returncode:
                raise BackupError("Restore failed; archive is not marked verified.")
            actual = Database(docker, temp).inventory()
            verify_inventory(expected, actual)
            with archive.open('rb') as stream:
                digest = hashlib.file_digest(stream, 'sha256').hexdigest()
            (out / 'taiji-demo.dump.sha256').write_text(digest + '  taiji-demo.dump\n')
            report.update(status="PASS", tables=actual, table_count=len(actual),
                          bytes=archive.stat().st_size, sha256=digest,
                          consistent_snapshot=True, restored_and_matched=True)
        except (BackupError, OSError, subprocess.TimeoutExpired):
            raise BackupError("Backup or restore verification failed; check verification.json. No source data was changed.") from None
        finally:
            if keeper:
                if keeper.poll() is None:
                    keeper.terminate()
                    try:
                        keeper.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        keeper.kill()
                        keeper.wait()
                for stream in (keeper.stdin, keeper.stdout):
                    if stream:
                        stream.close()
            if created:
                try:
                    found = command([docker, "ps", "-aq", "--filter", "name=^/" + temp + "$",
                                     "--filter", "label=" + LABEL + "=restore-check"], timeout=30).strip()
                    if found:
                        command([docker, "rm", "-f", temp], timeout=30)
                    report['temporary_container_removed'] = True
                except BackupError:
                    report.update(status="FAILED", temporary_container_removed=False)
            write_json(out / 'verification.json', report)
        if report['status'] != 'PASS':
            raise BackupError("Temporary cleanup failed; backup not marked successful.")
        write_json(root / 'last-success.json', {"completed_at": time.time(), "directory": out.name})
        write_json(root / 'last-run.json', {"status": "PASS", "checked_at": time.time(), "directory": out.name})
        return out, report


def watch(docker, repo, root, interval, retry):
    while True:
        try:
            state = json.loads((root / 'last-success.json').read_text())
            last = float(state['completed_at'])
        except (OSError, ValueError, KeyError, TypeError):
            last = None
        delay = remaining(last, time.time(), interval)
        if delay:
            time.sleep(min(delay, 60))
            continue
        try:
            out, _ = backup_once(docker, repo, root)
            print('PASS: verified backup ' + out.name, flush=True)
        except (BackupError, OSError, subprocess.TimeoutExpired) as error:
            message = str(error) if isinstance(error, BackupError) else "Local disk or command unavailable; check free space and permissions."
            try:
                write_json(root / 'last-run.json', {"status": "RETRY", "checked_at": time.time(), "message": message})
            except OSError:
                pass  # A full disk must still use the configured retry interval.
            print('RETRY: ' + message, flush=True)
            time.sleep(retry)


def install_macos(args, docker, repo, root):
    if sys.platform != 'darwin':
        raise BackupError('Automatic installation is supported on macOS only.')
    agents = Path.home() / 'Library/LaunchAgents'
    agents.mkdir(parents=True, exist_ok=True)
    plist = agents / (LABEL + '.plist')
    # Keep a safe, bounded last result; no stdout/stderr files grow indefinitely.
    value = {"Label": LABEL, "ProgramArguments": [sys.executable, str(Path(__file__).resolve()),
             '--repo', str(repo), '--output', str(root), '--docker', docker,
             '--interval', str(args.interval), '--retry', str(args.retry), '--watch'],
             "RunAtLoad": True, "KeepAlive": True, "ThrottleInterval": 60,
             "ProcessType": "Background", "Umask": 0o077,
             "StandardOutPath": '/dev/null', "StandardErrorPath": '/dev/null'}
    if plist.exists():
        existing = plistlib.loads(plist.read_bytes())
        if existing.get('Label') != LABEL:
            raise BackupError('Refusing to replace an unrelated launch agent.')
        subprocess.run(['launchctl', 'bootout', 'gui/' + str(os.getuid()), str(plist)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with plist.open('wb') as stream:
        plistlib.dump(value, stream)
    plist.chmod(0o600)
    command(['launchctl', 'bootstrap', 'gui/' + str(os.getuid()), str(plist)])
    print('Installed: ' + str(plist))


def main():
    os.umask(0o077)
    def stop(signum, frame):
        raise SystemExit(0)
    signal.signal(signal.SIGTERM, stop)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path, default=Path.home() / 'Library/Application Support/TaijiRehab/demo-backups')
    parser.add_argument('--docker', default=shutil.which('docker') or '/Applications/Docker.app/Contents/Resources/bin/docker')
    parser.add_argument('--interval', type=int, default=DEFAULT_INTERVAL)
    parser.add_argument('--retry', type=int, default=DEFAULT_RETRY)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--watch', action='store_true')
    modes.add_argument('--install-macos', action='store_true')
    args = parser.parse_args()
    if args.interval < 1 or args.retry < 1:
        parser.error('interval and retry must be positive seconds')
    repo = args.repo.resolve()
    root = check_destination(args.output, repo)
    private_directory(root)
    try:
        if args.install_macos:
            install_macos(args, args.docker, repo, root)
        elif args.watch:
            watch(args.docker, repo, root, args.interval, args.retry)
        else:
            out, report = backup_once(args.docker, repo, root)
            print(json.dumps({'status': report['status'], 'directory': str(out),
                              'tables': report['table_count'], 'sha256': report['sha256']}))
    except BackupError as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
