"""Run ENG-04A against a fresh tmpfs PostgreSQL container, never a shared volume."""

import os
import socket
import subprocess
import sys
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def run(*args: str, env: dict[str, str] | None = None) -> None:
    subprocess.run(args, cwd=BACKEND, env=env, check=True)


def main() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    name = f"taiji-eng04-{uuid.uuid4().hex[:12]}"
    database_url = (
        f"postgresql+psycopg://taiji:synthetic-eng04-only@127.0.0.1:{port}/taiji_eng04"
    )
    env = {
        **os.environ,
        "DATABASE_URL": database_url,
        "ENG04_INTEGRATION": "1",
        "APP_ENV": "test",
        "ALLOW_SYNTHETIC_ONLY": "true",
        "APP_PUBLIC_URL": "http://localhost:3000",
        "SESSION_SECRET": "synthetic-eng04-integration-secret-32-characters",
    }
    started = False
    try:
        run(
            "docker", "run", "--rm", "-d", "--name", name,
            "--tmpfs", "/var/lib/postgresql/data",
            "-e", "POSTGRES_DB=taiji_eng04",
            "-e", "POSTGRES_USER=taiji",
            "-e", "POSTGRES_PASSWORD=synthetic-eng04-only",
            "-p", f"127.0.0.1:{port}:5432", "postgres:17-alpine",
        )
        started = True
        for _ in range(60):
            ready = subprocess.run(
                ["docker", "exec", name, "pg_isready", "-U", "taiji", "-d", "taiji_eng04"],
                cwd=BACKEND, capture_output=True, check=False,
            )
            if ready.returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("temporary PostgreSQL did not become ready")
        run("uv", "run", "alembic", "upgrade", "head", env=env)
        run("uv", "run", "alembic", "check", env=env)
        run("uv", "run", "alembic", "downgrade", "base", env=env)
        run("uv", "run", "alembic", "upgrade", "head", env=env)
        run("uv", "run", "pytest", "-q", "tests/test_postgres_workflow.py", env=env)
        return 0
    finally:
        if started:
            subprocess.run(["docker", "stop", name], cwd=BACKEND, check=False)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"ENG-04A integration failed: {exc}", file=sys.stderr)
        sys.exit(1)
