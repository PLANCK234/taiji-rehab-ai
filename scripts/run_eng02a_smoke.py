"""Read the trend page through Next and FastAPI backed by disposable synthetic PostgreSQL."""

import http.cookiejar
import json
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
PASSWORD = "synthetic-eng02a-smoke-only"


def docker(*args: str, capture: bool = False) -> str:
    result = subprocess.run(
        ["docker", *args], check=True, text=True,
        capture_output=capture,
    )
    return result.stdout.strip() if capture else ""


def free_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return listener.getsockname()[1]


def request(opener: urllib.request.OpenerDirector, url: str, body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Origin": "http://localhost:3000", "Content-Type": "application/json"}
    with opener.open(urllib.request.Request(url, data=data, headers=headers), timeout=10) as response:
        return response.status, response.read().decode("utf-8")


def wait_ready(url: str) -> None:
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for _ in range(120):
        try:
            status, _ = request(opener, url)
            if status == 200:
                return
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(1)
    raise RuntimeError(f"service did not become ready: {url}")


def logged_in(base: str, email: str) -> urllib.request.OpenerDirector:
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}),
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
    )
    status, _ = request(
        opener, f"{base}/api/v1/auth/login", {"email": email, "password": PASSWORD}
    )
    if status != 200:
        raise RuntimeError("synthetic staff login failed")
    return opener


def main() -> None:
    run_id = uuid.uuid4().hex[:12]
    network = f"taiji-eng02a-{run_id}"
    database = f"taiji-eng02a-db-{run_id}"
    backend = f"taiji-eng02a-api-{run_id}"
    frontend = f"taiji-eng02a-ui-{run_id}"
    backend_port, frontend_port = free_port(), free_port()
    while frontend_port == backend_port:
        frontend_port = free_port()
    backend_base = f"http://127.0.0.1:{backend_port}"
    frontend_base = f"http://127.0.0.1:{frontend_port}"
    database_url = f"postgresql+psycopg://taiji:{PASSWORD}@db:5432/taiji_eng02a"
    names: list[str] = []
    network_created = False
    try:
        docker("build", "-t", "taiji-eng02a-smoke-backend", str(BACKEND))
        docker("build", "-t", "taiji-eng02a-smoke-frontend", str(FRONTEND))
        docker("network", "create", network, capture=True)
        network_created = True
        docker(
            "run", "--rm", "-d", "--name", database, "--network", network,
            "--network-alias", "db", "--tmpfs", "/var/lib/postgresql/data",
            "-e", "POSTGRES_DB=taiji_eng02a", "-e", "POSTGRES_USER=taiji",
            "-e", f"POSTGRES_PASSWORD={PASSWORD}", "postgres:17-alpine", capture=True,
        )
        names.append(database)
        for _ in range(60):
            ready = subprocess.run(
                ["docker", "exec", database, "pg_isready", "-U", "taiji", "-d", "taiji_eng02a"],
                capture_output=True, check=False,
            )
            if ready.returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("temporary PostgreSQL did not become ready")
        common = [
            "run", "--rm", "--network", network,
            "-e", f"DATABASE_URL={database_url}", "-e", "APP_ENV=local",
            "-e", "ALLOW_SYNTHETIC_ONLY=true", "-e", f"DEMO_PASSWORD={PASSWORD}",
            "taiji-eng02a-smoke-backend",
        ]
        docker(*common, "uv", "run", "--no-dev", "alembic", "upgrade", "head")
        docker(*common, "uv", "run", "--no-dev", "python", "-m", "app.seed_reassessment_demo")
        docker(
            "run", "--rm", "-d", "--name", backend, "--network", network,
            "--network-alias", "backend", "-p", f"127.0.0.1:{backend_port}:8000",
            "-e", f"DATABASE_URL={database_url}", "-e", "APP_ENV=test",
            "-e", "ALLOW_SYNTHETIC_ONLY=true", "-e", "APP_PUBLIC_URL=http://localhost:3000",
            "-e", "SESSION_SECRET=synthetic-eng02a-smoke-session-secret-32-characters",
            "taiji-eng02a-smoke-backend", capture=True,
        )
        names.append(backend)
        wait_ready(f"{backend_base}/health")
        docker(
            "run", "--rm", "-d", "--name", frontend, "--network", network,
            "-p", f"127.0.0.1:{frontend_port}:3000",
            "-e", "API_INTERNAL_URL=http://backend:8000",
            "taiji-eng02a-smoke-frontend", capture=True,
        )
        names.append(frontend)
        wait_ready(frontend_base)

        clinician = logged_in(backend_base, "demo-clinician-a@example.org")
        _, participant_json = request(clinician, f"{backend_base}/api/v1/participants")
        participants = {row["study_code"]: row["id"] for row in json.loads(participant_json)}
        for code, expected in (
            ("SYN-ENG01A-001", ("5 分", "缺失（拒测）")),
            ("SYN-ENG01A-002", ("8 分", "缺失（未尝试）")),
        ):
            _, html = request(clinician, f"{frontend_base}/participants/{participants[code]}")
            if (
                "人工总分记录趋势" not in html
                or "趋势记录暂不可用" in html
                or "<meter" not in html
                or any(value not in html for value in expected)
            ):
                raise RuntimeError(f"trend page did not show database values for {code}")

        other = logged_in(backend_base, "demo-clinician-b@example.org")
        _, other_json = request(other, f"{backend_base}/api/v1/participants")
        cross_id = next(row["id"] for row in json.loads(other_json) if row["study_code"] == "SYN-002")
        try:
            request(clinician, f"{frontend_base}/participants/{cross_id}")
        except urllib.error.HTTPError as exc:
            if exc.code != 404:
                raise RuntimeError(f"out-of-scope page returned {exc.code}, expected 404") from exc
        else:
            raise RuntimeError("out-of-scope page was accessible")
        print("ENG-02A smoke OK: PostgreSQL → FastAPI → Next trend pages; cross-study page 404")
    finally:
        for name in reversed(names):
            subprocess.run(["docker", "stop", name], check=False, capture_output=True)
        if network_created:
            subprocess.run(["docker", "network", "rm", network], check=False, capture_output=True)


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.CalledProcessError, urllib.error.URLError) as exc:
        print(f"ENG-02A smoke failed: {exc}", file=sys.stderr)
        sys.exit(1)
