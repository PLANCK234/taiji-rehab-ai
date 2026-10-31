# 当前交接检查点

> 新 Agent 先运行 `git status --short --branch`、`git rev-parse HEAD`、`git log -3 --oneline`，核对本文件、任务台账和实际代码。HEAD 是本文件所在提交，哈希不能自写入同一提交。

| 项目 | 当前值 |
|---|---|
| Branch / HEAD | `feat/s6-01-synthetic-pose-demo`；HEAD = 包含本文件的本地检查点提交（运行 `git rev-parse HEAD`）；上一检查点 `2bf72360c94244995fe078a01f4b5cc61a3f7a0e` |
| 最近完成任务 | `S6-01` 仅纯合成姿态演示壳；S2-01 人工 SPPB 总分合成范围已完成。完整 Sprint 1/2、临床流程和真实影像均未完成 |
| 本次改动 | `frontend/app/participants/[id]/pose-demo/` 服务端范围校验、合成 SVG 与 DOM 交互测试；对象页入口、工作台文案、样式；`backend/tests/test_pose_demo_boundary.py` 核对图片 API 缺席；前端测试依赖、PRD/API/安全/验收/测试/ADR-0008/任务文档。没有后端业务 API 或数据库迁移 |
| 已通过验证 | 后端 Ruff/pytest 23；前端 Node 26/pnpm 10 容器 lint/typecheck/test 12/build；临时 PostgreSQL 17、FastAPI 与 Next HTTP 烟测：未登录 307、已分配页面 200、跨研究 API 403/页面 404、算法提示、无文件/视频控件、图片端点 404，合成 `photo_scope=true` 后仍 404；DOM 生成/切换/清除且无摄像、网络、存储调用；Compose config、交接脚本结果见 STATUS |
| 失败或未运行 | 首次 DOM 测试在 Node 26 下读取不可用的 `localStorage` 全局失败，注入存储监视器后通过。Windows 浏览器 UI 工具无法可靠判断当前 Chrome URL，本轮停止 UI 自动化；未执行浏览器手工 E2E。远端 CI、真实影像准入和临床人工验收未运行；Starlette TestClient 有上游弃用警告 1 条 |
| 已知问题 | Q-01/10 真实影像伦理、同意、权限、留存未签核；模拟照片范围不是授权。Q-02 未批准分项 SOP；Q-03/09 未批准适配规则和发布责任人，`S3-01` 阻断。无图片上传、姿态识别、分级、安全结论、处方、身份映射或导出 |
| 尚未完成 | S1 完整 CRUD/真实流程、AT-01 CSV/周期、AT-02 分级、AT-12 真实影像与浏览器手工 E2E、AT-14 真实数据准入、远端 PR/CI。临时 tmpfs 数据库及开发服务已停止；原合成数据库卷未操作 |
| 下一任务 | `S3-01` 仍 `BLOCKED`；当前台账**没有依赖已满足的下一 Task ID**。需 Q-03 的适配模板/禁忌/剂量与 Q-09 的审批/发布权限获得有权负责人签核和版本证据后再实施。S4/S5/S7/S8 另依赖前序阶段和审批，不得猜测临床规则 |
| 需阅读 | 审批后读 `AGENTS.md`, `docs/ROADMAP.md`, `docs/product/PRD.md`, `docs/product/ACCEPTANCE.md`, `docs/OPEN_QUESTIONS.md`, `docs/ml/RULE_BASELINE.md`, `docs/ml/MODEL_LIFECYCLE.md`, `docs/api/API_CONTRACT.md`, `docs/security/SECURITY.md`, `docs/prompts/03-assessments-grading.md`, `backend/AGENTS.md`, `frontend/AGENTS.md` |
| 下一任务验收 | `S3-01` 审批后按 FR-004/005、AT-02/04/10：只在已批准且版本化的规则和适配模板上生成候选，人工审核/修改/拒绝可追溯；未批准版本不可发布，旧结果不可静默改写 |
| 未提交修改 / 本地依赖 | 检查点提交时预计工作区干净；若不同以 `git status` 为准。本机无 pnpm，前端检查可用 Node 26/pnpm 10 容器；临时数据库、密码和测试图像不随 Git |

S6-01 的范围与证据见 [STATUS.md](STATUS.md)、[TRACEABILITY.md](TRACEABILITY.md)、[ADR-0008](decisions/0008-synthetic-pose-preview-no-images.md) 和 [AT-12 说明](product/ACCEPTANCE.md)。页面里的线条人物是合成图，不代表真实拍照、识别质量或临床判定。恢复核对见 [RECOVERY_TEST.md](testing/RECOVERY_TEST.md)。
