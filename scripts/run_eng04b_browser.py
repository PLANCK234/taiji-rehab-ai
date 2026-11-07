"""Run real-browser synthetic workflow against disposable PostgreSQL and current images."""

import subprocess
import sys
import time
import uuid
from pathlib import Path

from run_eng02a_smoke import docker, free_port, wait_ready

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
PASSWORD = "synthetic-eng04b-browser-only"


def cleanup_resources(names: list[str], network: str | None, images: list[str]) -> None:
    """Remove and verify only the disposable resources created by this run."""
    errors: list[str] = []
    for name in reversed(names):
        subprocess.run(["docker", "stop", name], check=False, capture_output=True)
    if network is not None:
        subprocess.run(["docker", "network", "rm", network], check=False, capture_output=True)
    for image in reversed(images):
        subprocess.run(["docker", "image", "rm", image], check=False, capture_output=True)

    for kind, command, expected in (
        ("container", ["docker", "ps", "-a", "--format", "{{.Names}}"], names),
        ("network", ["docker", "network", "ls", "--format", "{{.Name}}"], [network] if network else []),
        ("image", ["docker", "image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], images),
    ):
        if not expected:
            continue
        result = subprocess.run(command, check=False, capture_output=True, text=True)
        if result.returncode:
            errors.append(f"{kind} verification failed: docker unavailable")
            continue
        remaining = set(result.stdout.splitlines()).intersection(expected)
        if remaining:
            errors.append(f"{kind} still exists: {', '.join(sorted(remaining))}")

    if errors:
        raise RuntimeError("ENG-04B cleanup failed: " + "; ".join(errors))
    print("ENG-04B cleanup OK: disposable containers, network and images absent")


def main() -> None:
    run_id = uuid.uuid4().hex[:12]
    network = f"taiji-eng04b-{run_id}"
    database = f"taiji-eng04b-db-{run_id}"
    backend = f"taiji-eng04b-api-{run_id}"
    frontend = f"taiji-eng04b-ui-{run_id}"
    backend_image = f"taiji-eng04b-backend:{run_id}"
    frontend_image = f"taiji-eng04b-frontend:{run_id}"
    runner_image = f"taiji-eng04b-runner:{run_id}"
    images: list[str] = []
    names: list[str] = []
    network_created = False
    backend_port, frontend_port = free_port(), free_port()
    while frontend_port == backend_port:
        frontend_port = free_port()
    database_url = f"postgresql+psycopg://taiji:{PASSWORD}@db:5432/taiji_eng04b"
    artifacts = ROOT / "exports" / f"eng04b-{run_id}"
    try:
        docker("build", "-t", backend_image, str(BACKEND))
        images.append(backend_image)
        docker("build", "-t", frontend_image, str(FRONTEND))
        images.append(frontend_image)
        docker(
            "build", "-f", str(FRONTEND / "Dockerfile.e2e-real"),
            "-t", runner_image, str(FRONTEND),
        )
        images.append(runner_image)
        docker("network", "create", network, capture=True)
        network_created = True
        docker(
            "run", "--rm", "-d", "--name", database, "--network", network,
            "--network-alias", "db", "--tmpfs", "/var/lib/postgresql/data",
            "-e", "POSTGRES_DB=taiji_eng04b", "-e", "POSTGRES_USER=taiji",
            "-e", f"POSTGRES_PASSWORD={PASSWORD}", "postgres:17-alpine", capture=True,
        )
        names.append(database)
        for _ in range(60):
            ready = subprocess.run(
                ["docker", "exec", database, "pg_isready", "-U", "taiji", "-d", "taiji_eng04b"],
                capture_output=True, check=False,
            )
            if ready.returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("disposable PostgreSQL did not become ready")
        common = [
            "run", "--rm", "--network", network,
            "-e", f"DATABASE_URL={database_url}", "-e", "APP_ENV=local",
            "-e", "ALLOW_SYNTHETIC_ONLY=true", "-e", f"DEMO_PASSWORD={PASSWORD}",
            "-e", "SEED_DEMO_ADMIN=true",
            backend_image,
        ]
        docker(*common, "uv", "run", "--no-dev", "alembic", "upgrade", "head")
        docker(*common, "uv", "run", "--no-dev", "python", "-m", "app.seed_demo")
        docker(*common, "uv", "run", "--no-dev", "python", "-m", "app.seed_demo_actions")
        docker(
            "run", "--rm", "-d", "--name", backend, "--network", network,
            "--network-alias", "backend", "-p", f"127.0.0.1:{backend_port}:8000",
            "-e", f"DATABASE_URL={database_url}", "-e", "APP_ENV=test",
            "-e", "ALLOW_SYNTHETIC_ONLY=true",
            "-e", "APP_PUBLIC_URL=http://localhost:3000",
            "-e", "SESSION_SECRET=synthetic-eng04b-browser-session-secret-32-characters",
            backend_image, capture=True,
        )
        names.append(backend)
        wait_ready(f"http://127.0.0.1:{backend_port}/ready")
        docker(
            "run", "--rm", "-d", "--name", frontend, "--network", network,
            "--network-alias", "frontend", "-p", f"127.0.0.1:{frontend_port}:3000",
            "-e", "API_INTERNAL_URL=http://backend:8000", "-e", "HOSTNAME=0.0.0.0",
            frontend_image, capture=True,
        )
        names.append(frontend)
        wait_ready(f"http://127.0.0.1:{frontend_port}/login")
        artifacts.mkdir(parents=True, exist_ok=False)
        docker(
            "run", "--rm", "--network", f"container:{frontend}",
            "--mount", f"type=bind,source={artifacts},target=/artifacts",
            "-e", "E2E_BASE_URL=http://localhost:3000",
            "-e", f"E2E_PASSWORD={PASSWORD}", "-e", "E2E_OUTPUT_DIR=/artifacts",
            runner_image,
        )
        print("ENG-04B browser OK: synthetic PostgreSQL → FastAPI → Next → Chromium")
    except (OSError, RuntimeError, subprocess.CalledProcessError):
        print(f"ENG-04B failure artifacts, if any: {artifacts}", file=sys.stderr)
        raise
    finally:
        pending = sys.exc_info()[1]
        try:
            cleanup_resources(names, network if network_created else None, images)
        except (OSError, RuntimeError) as cleanup_error:
            if pending is not None:
                pending.add_note(str(cleanup_error))
            else:
                raise


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"ENG-04B browser failed: {exc}", file=sys.stderr)
        sys.exit(1)
