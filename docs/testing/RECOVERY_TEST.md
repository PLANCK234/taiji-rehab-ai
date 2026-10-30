# 新会话恢复演练

只使用仓库、Git 和实际命令，按 [continue.md](../prompts/continue.md) 开始。回答并核对：

1. 当前阶段、已证实通过与未完成项目：`STATUS.md`、`TASKS.md`、测试命令。
2. 下一 Task ID、预计文件、验收及测试：`HANDOFF.md`、`TASKS.md`。
3. 不可擅改的临床规则：`AGENTS.md`、`OPEN_QUESTIONS.md`、PRD。
4. 如何提交与交接：`CONTRIBUTING.md`、`prompts/handoff.md`。

运行 `uv run python scripts/check_handoff.py`（仓库根目录也可用任意 Python 3.12+）检查必需文件、状态字段、Task ID 引用和仓库内相对 Markdown 链接。脚本不能代替人工核对测试结果和 Git 状态。

## 2026-10-30 仓库内恢复核对结果

1. Sprint 0 完成，S1-01 合成认证/编码只读权限完成；证据在 `STATUS.md`。GitHub Actions 远端未运行。
2. FR-001 的登录与读取权限已实现；FR-002 至 FR-011 未实现。AT-05 导出部分仍待 S5-01。
3. 下一项 `S1-02`：仅合成数据建档、同意、筛查；预计改后端模型与迁移、权限服务和前端表单，详见 `HANDOFF.md`。
4. 需跑后端 Ruff/pytest、迁移升降级与权限/同意集成测试、前端 lint/typecheck/test/build；AT-03/14 必须通过。
5. 未获批准的量表计分、适配模板、禁忌/剂量、安全上报时限、真实数据与模型发布规则不能擅改；见 `OPEN_QUESTIONS.md`。
6. 用任务分支提交可验证单元，更新 TASKS/STATUS/TRACEABILITY/HANDOFF，追加 SESSION_LOG，按 PR 审核协作；完整指令见 `prompts/handoff.md`。
