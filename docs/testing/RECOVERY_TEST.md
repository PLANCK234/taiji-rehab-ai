# 新会话恢复演练

只使用仓库、Git 和实际命令，按 [continue.md](../prompts/continue.md) 开始。回答并核对：

1. 当前阶段、已证实通过与未完成项目：`STATUS.md`、`TASKS.md`、测试命令。
2. 下一 Task ID、预计文件、验收及测试：`HANDOFF.md`、`TASKS.md`。
3. 不可擅改的临床规则：`AGENTS.md`、`OPEN_QUESTIONS.md`、PRD。
4. 如何提交与交接：`CONTRIBUTING.md`、`prompts/handoff.md`。

运行 `uv run python scripts/check_handoff.py`（仓库根目录也可用任意 Python 3.12+）检查必需文件、状态字段、Task ID 引用和仓库内相对 Markdown 链接。脚本不能代替人工核对测试结果和 Git 状态。

## 2026-10-30 仓库内恢复核对结果

1. 当前 Sprint 0 本地验收完成；证据在 `STATUS.md`，实际构建、单测、Compose/迁移及 HTTP 冒烟通过。GitHub Actions 远端未运行。
2. FR-001 至 FR-011 没有业务实现；Sprint 1 未开始。
3. 下一项 `S1-01`：身份/会话/RBAC/研究分配；预计改后端模型与迁移、权限服务及前端登录，详见 `HANDOFF.md`。
4. 需跑后端 Ruff/pytest 与权限集成测试、迁移升降级、前端 lint/typecheck/test/build；AT-05 越权用例必须通过。
5. 未获批准的量表计分、适配模板、禁忌/剂量、安全上报时限、真实数据与模型发布规则不能擅改；见 `OPEN_QUESTIONS.md`。
6. 用任务分支提交可验证单元，更新 TASKS/STATUS/TRACEABILITY/HANDOFF，追加 SESSION_LOG，按 PR 审核协作；完整指令见 `prompts/handoff.md`。
