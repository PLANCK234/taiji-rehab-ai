"""Export the checked-in API contract for CI drift detection."""

import json
from pathlib import Path

from app.main import app


def main() -> None:
    target = Path(__file__).resolve().parents[1] / "openapi.json"
    target.write_text(
        json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {target.name}")


if __name__ == "__main__":
    main()
