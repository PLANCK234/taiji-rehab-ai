"""Actual local model -> browser -> FastAPI -> disposable PostgreSQL -> review.

Uses generated credentials and temporary DB only. No shared volume is migrated.
"""

import os
import subprocess
import sys
import time
import uuid
from pathlib import Path

from run_eng02a_smoke import free_port, wait_ready

ROOT = Path(__file__).resolve().parents[1]
FRONTEND, BACKEND = ROOT / "frontend", ROOT / "backend"


def main() -> None:
    run_id = uuid.uuid4().hex[:10]
    name = f"taiji-pose-browser-{run_id}"
    artifacts = ROOT / "exports" / f"pose-browser-{run_id}"
    artifacts.mkdir(parents=True)
    pg_port, api_port, ui_port = free_port(), free_port(), free_port()
    password = "synthetic-pose-browser-only"
    env = {
        **os.environ, "APP_PROFILE": "demo", "APP_ENV": "test",
        "ALLOW_SYNTHETIC_ONLY": "true", "DEMO_PASSWORD": password,
        "DATABASE_URL": f"postgresql+psycopg://taiji:{password}@127.0.0.1:{pg_port}/taiji_pose",
        "SESSION_SECRET": "synthetic-pose-browser-session-secret-32-chars",
        "APP_PUBLIC_URL": f"http://127.0.0.1:{ui_port}",
        "API_INTERNAL_URL": f"http://127.0.0.1:{api_port}",
        "E2E_BASE_URL": f"http://127.0.0.1:{ui_port}", "E2E_PASSWORD": password,
        "E2E_OUTPUT_DIR": str(artifacts / "browser"),
    }
    processes, logs = [], []

    def run(args, cwd=BACKEND):
        subprocess.run(args, cwd=cwd, env=env, check=True)

    def background(args, cwd, label):
        log = (artifacts / f"{label}.log").open("w", encoding="utf-8")
        logs.append(log)
        options = {"creationflags": subprocess.CREATE_NO_WINDOW} if os.name == "nt" else {}
        process = subprocess.Popen(args, cwd=cwd, env=env, stdout=log, stderr=log, **options)
        processes.append(process)

    started = False
    try:
        run(["docker", "run", "--rm", "-d", "--name", name, "--tmpfs",
             "/var/lib/postgresql/data", "-e", "POSTGRES_DB=taiji_pose",
             "-e", "POSTGRES_USER=taiji", "-e", f"POSTGRES_PASSWORD={password}",
             "-p", f"127.0.0.1:{pg_port}:5432", "postgres:17-alpine"])
        started = True
        for _ in range(60):
            if subprocess.run(["docker", "exec", name, "pg_isready", "-U", "taiji"],
                              capture_output=True, check=False).returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("PostgreSQL startup failed")
        run([sys.executable, "-m", "alembic", "upgrade", "head"])
        env["APP_ENV"] = "local"
        env["SEED_DEMO_ADMIN"] = "true"
        run([sys.executable, "-m", "app.seed_demo"])
        run([sys.executable, "-m", "app.seed_demo_actions"])
        env["APP_ENV"] = "test"
        background([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1",
                    "--port", str(api_port)], BACKEND, "api")
        wait_ready(f"http://127.0.0.1:{api_port}/ready")
        env["POSE_PROTOTYPE_ENABLED"] = "true"
        run(["node", "scripts/copy-pose-assets.mjs"], FRONTEND)
        run(["node", "scripts/prepare-pose.mjs"], FRONTEND)
        run(["node", "node_modules/next/dist/bin/next", "build"], FRONTEND)
        background(["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1",
                    "--port", str(ui_port)], FRONTEND, "ui")
        wait_ready(f"http://127.0.0.1:{ui_port}/login")
        # E2E_SPECS overrides the default suite, e.g. E2E_SPECS="demo-v2.real.ts".
        specs = os.environ.get("E2E_SPECS", "").split() or [
            "--grep-invert", "127.0.0.1 browser origin",
        ]
        run(["node", "node_modules/@playwright/test/cli.js", "test", "--config",
             "playwright.real.config.ts", *specs], FRONTEND)
        print(f"Pose browser evidence: {artifacts.relative_to(ROOT)}")
    finally:
        for process in reversed(processes):
            process.terminate()
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        for log in logs:
            log.close()
        if started:
            subprocess.run(["docker", "stop", name], check=False)


if __name__ == "__main__":
    main()
