"""Safety and scheduling regression tests; no real Docker or patient data."""
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import demo_backup as backup


class BackupTests(unittest.TestCase):
    def test_first_run_restart_due_and_clock_rollback(self):
        self.assertEqual(backup.remaining(None, 100, 86400), 0)
        self.assertEqual(backup.remaining(100, 130, 86400), 86370)
        self.assertEqual(backup.remaining(100, 86500, 86400), 0)
        self.assertEqual(backup.remaining(100, 50, 86400), 0)

    def test_reject_repo_or_nested_output(self):
        repo = Path('/tmp/backup-test-repo')
        for output in (repo, repo / 'exports/backups'):
            with self.assertRaises(backup.BackupError):
                backup.check_destination(output, repo)
        self.assertEqual(backup.check_destination(Path('/tmp/other'), repo), Path('/tmp/other').resolve())

    def test_private_reports_and_exclusive_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            backup.private_directory(root)
            # Exercise without relying on main() having already set umask.
            old = os.umask(0o077)
            try:
                backup.write_json(root / 'report.json', {'status': 'PASS'})
            finally:
                os.umask(old)
            self.assertEqual(root.stat().st_mode & 0o777, 0o700)
            self.assertEqual((root / 'report.json').stat().st_mode & 0o777, 0o600)
            with backup.backup_lock(root):
                with self.assertRaises(backup.BackupError):
                    with backup.backup_lock(root):
                        self.fail('Overlapping backup was allowed')
            with backup.backup_lock(root):
                pass

    def test_command_errors_never_expose_stderr(self):
        secret = b'password=DO-NOT-LOG raw-patient-row'
        result = subprocess.CompletedProcess([], 1, b'', secret)
        with patch.object(backup.subprocess, 'run', return_value=result):
            with self.assertRaises(backup.BackupError) as raised:
                backup.command(['docker', 'exec'])
        self.assertNotIn('DO-NOT-LOG', str(raised.exception))
        self.assertNotIn('patient', str(raised.exception))

    def test_timeout_is_redacted(self):
        with patch.object(backup.subprocess, 'run', side_effect=subprocess.TimeoutExpired('private', 1)):
            with self.assertRaises(backup.BackupError) as raised:
                backup.command(['docker'])
        self.assertNotIn('private', str(raised.exception))

    def test_research_and_non_synthetic_are_refused(self):
        repo = Path('/tmp/example-repo')
        db = {'Id': 'db-id', 'Config': {'Labels': {
            'com.docker.compose.project': 'example',
            'com.docker.compose.project.config_files': str(repo / 'infra/compose.yaml')}},
            'Mounts': [{'Destination': '/var/lib/postgresql/data', 'Type': 'volume', 'Name': 'original'}]}
        for env in (['APP_PROFILE=research', 'ALLOW_SYNTHETIC_ONLY=true', 'APP_ENV=local'],
                    ['APP_PROFILE=demo', 'ALLOW_SYNTHETIC_ONLY=false', 'APP_ENV=local']):
            with patch.object(backup, 'command', side_effect=[b'db-id', json.dumps([db]).encode(),
                              b'backend-id', json.dumps([{'Config': {'Env': env}}]).encode()]):
                with self.assertRaises(backup.BackupError):
                    backup.source_containers('docker', repo)

    def test_no_matching_repository_database_is_refused(self):
        with patch.object(backup, 'command', return_value=b''):
            with self.assertRaises(backup.BackupError):
                backup.source_containers('docker', Path('/tmp/repo'))

    def test_failure_retries_without_advancing_success(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(backup, 'backup_once', side_effect=backup.BackupError('Docker unavailable')), \
                 patch.object(backup.time, 'sleep', side_effect=KeyboardInterrupt) as sleep, \
                 contextlib.redirect_stdout(io.StringIO()):
                with self.assertRaises(KeyboardInterrupt):
                    backup.watch('docker', Path('/tmp/repo'), root, 86400, 300)
            sleep.assert_called_once_with(300)
            self.assertFalse((root / 'last-success.json').exists())
            self.assertEqual(json.loads((root / 'last-run.json').read_text())['status'], 'RETRY')

    def test_full_disk_still_uses_retry_interval_without_raw_errors(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            stdout = io.StringIO()
            with patch.object(backup, 'backup_once', side_effect=OSError('sensitive-path')), \
                 patch.object(backup, 'write_json', side_effect=OSError('disk full')), \
                 patch.object(backup.time, 'sleep', side_effect=KeyboardInterrupt) as sleep, \
                 contextlib.redirect_stdout(stdout):
                with self.assertRaises(KeyboardInterrupt):
                    backup.watch('docker', Path('/tmp/repo'), root, 86400, 300)
            sleep.assert_called_once_with(300)
            self.assertNotIn('sensitive-path', stdout.getvalue())

    def test_restart_does_not_duplicate_a_recent_success(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'last-success.json').write_text(json.dumps({'completed_at': 1000}))
            with patch.object(backup.time, 'time', return_value=1020), \
                 patch.object(backup.time, 'sleep', side_effect=KeyboardInterrupt), \
                 patch.object(backup, 'backup_once') as once:
                with self.assertRaises(KeyboardInterrupt):
                    backup.watch('docker', Path('/tmp/repo'), root, 86400, 300)
            once.assert_not_called()

    def test_same_count_with_modified_content_fails_verification(self):
        expected = {'public.assessments': {'rows': 1, 'content_md5': 'original'}}
        changed = {'public.assessments': {'rows': 1, 'content_md5': 'changed'}}
        for actual in (changed, {}, {'other.table': {'rows': 1}}):
            with self.assertRaises(backup.BackupError):
                backup.verify_inventory(expected, actual)
        backup.verify_inventory(expected, expected.copy())
        with self.assertRaises(backup.BackupError):
            backup.verify_inventory({}, {})

    def test_snapshot_import_precedes_data_query(self):
        with patch.object(backup, 'command', return_value=b'4') as cmd:
            db = backup.Database('docker', 'source', '00000001-00000002-1')
            self.assertEqual(db.sql('SELECT count(*) FROM participants'), '4')
            query = cmd.call_args.kwargs['data'].decode()
            self.assertIn('READ ONLY', query)
            self.assertLess(query.index('SET TRANSACTION SNAPSHOT'), query.index('SELECT count'))


if __name__ == '__main__':
    unittest.main()
