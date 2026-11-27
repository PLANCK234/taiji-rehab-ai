# 临床AI范围与证据登记验收

2026-11-26，DEMO-V2-67，AT-CLIN-DOC-01；本轮仅文档/证据，不实现或上线临床规则。

- 已查看用户原PDF全部1页，核对文件标题、CKLL-20260904、“同意实施”、研究范围及会议/批准/盖章三个日期；扫描件无可提取正文，采用实际页面渲染阅读，没有将空文本误作无审批。
- 公开副本只遮盖负责人联系电话，页眉标识副本；原件未修改。副本重新打开、渲染并人工查看，电话完整遮盖，批号/研究内容/结论/日期/签章完整。原件与公开副本SHA-256经`Get-FileHash -Algorithm SHA256`核对，匹配[证据记录](../evidence/CKLL-20260904.md)。
- `backend/.venv/Scripts/python.exe scripts/check_handoff.py`：**handoff OK; 143 task IDs; local Markdown links OK**。
- `git diff --check`通过。AGENTS、PRD/SCOPE、OPEN_QUESTIONS、S3-01/ENG-03状态、68–71任务、模型生命周期、ROADMAP/STATUS/HANDOFF/TRACEABILITY及ADR-0028已同步。
- 已写明：研究批准及用户开发授权、具体专家参数、实际性能报告是不同记录；随机初始化可复现，临床配置与模型权重分开；自动方案及回归/评测是待实现目标，不误称已交付。
- 回归方案的工程依据为官方Ridge、GroupKFold、TimeSeriesSplit和数据泄漏文档，链接位于[待开发计划](../product/CLINICAL_AI_DEVELOPMENT_BACKLOG.md)，未引用它们证明临床疗效。
- 未运行应用单测、迁移或浏览器回归：本轮未改运行代码/API/数据库/开关。先前125/8skip、前端141及浏览器25仍为之前检查点，不是本轮新增证据。
- 所有本轮更新通过功能分支进入PR #11；用户原始PDF留在本地未跟踪，公开副本入PR，避免公开联系电话。
