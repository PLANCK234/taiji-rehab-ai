"""Check durable handoff structure and local Markdown references."""

import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "AGENTS.md", "README.md", "docs/STATUS.md", "docs/TASKS.md", "docs/HANDOFF.md",
    "docs/SESSION_LOG.md", "docs/prompts/continue.md", "docs/prompts/handoff.md",
]
HANDOFF_FIELDS = [
    "Branch / HEAD", "最近完成任务", "本次改动", "已通过验证", "失败或未运行",
    "已知问题", "尚未完成", "下一任务", "需阅读", "下一任务验收", "未提交修改",
]


def main() -> int:
    errors: list[str] = []
    for name in REQUIRED:
        if not (ROOT / name).is_file():
            errors.append(f"missing: {name}")
    if errors:
        print("\n".join(errors))
        return 1

    handoff = (ROOT / "docs/HANDOFF.md").read_text(encoding="utf-8")
    tasks = (ROOT / "docs/TASKS.md").read_text(encoding="utf-8")
    for field in HANDOFF_FIELDS:
        if field not in handoff:
            errors.append(f"handoff field missing: {field}")
    ids = set(re.findall(r"\bS\d+-\d+\b", tasks))
    next_match = re.search(r"\| 下一任务 \|[^\n]*?\b(S\d+-\d+)\b", handoff)
    if not next_match or next_match.group(1) not in ids:
        errors.append("next Task ID is missing from TASKS.md")
    for name in ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE"]:
        if name not in tasks:
            errors.append(f"status vocabulary missing: {name}")

    link_pattern = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
    for markdown in ROOT.rglob("*.md"):
        if any(part in {"node_modules", ".next", ".venv"} for part in markdown.parts):
            continue
        content = markdown.read_text(encoding="utf-8")
        for target in link_pattern.findall(content):
            target = unquote(target.split("#", 1)[0])
            if not target or "://" in target or target.startswith("mailto:"):
                continue
            if not (markdown.parent / target).exists():
                errors.append(f"broken link: {markdown.relative_to(ROOT)} -> {target}")

    if errors:
        print("\n".join(errors))
        return 1
    print(f"handoff OK; {len(ids)} task IDs; local Markdown links OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
