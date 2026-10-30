# 文档索引 / Documentation map

**权威层级**：经批准的临床/伦理研究方案（尚待核对） > 本项目 `docs/product/PRD.md` 的产品基线 > 领域设计与 API 合同 > 任务卡。任何冲突先登记 `OPEN_QUESTIONS.md`，不默认实施。

| 阅读顺序 | 文档 | 用途 |
|---|---|---|
| 1 | [PRD](product/PRD.md) / [范围](product/SCOPE.md) | 用户、关键流程、做与不做 |
| 2 | [验收矩阵](product/ACCEPTANCE.md) / [需求追踪](TRACEABILITY.md) | 可交付标准 |
| 3 | [系统设计](architecture/SYSTEM_DESIGN.md) / [数据流](architecture/DATA_FLOW.md) | 模块边界 |
| 4 | [数据模型](data/DATA_MODEL.md) / [字典](data/DATA_DICTIONARY.md) | 结构与完整性 |
| 5 | [API](api/API_CONTRACT.md) / [错误规范](api/ERRORS.md) | 前后端接口 |
| 6 | [规则引擎](ml/RULE_BASELINE.md) / [优化](ml/MODEL_LIFECYCLE.md) | 分级与模型版本 |
| 7 | [实验设计](research/PROTOCOL_INTERFACE.md) / [数据集](research/DATASET_SPEC.md) | 临床依赖与标签 |
| 8 | [安全](security/SECURITY.md) / [威胁模型](security/THREAT_MODEL.md) | 数据及权限边界 |
| 9 | [测试策略](testing/TEST_STRATEGY.md) / [手工验收](testing/UAT.md) | 质量保障 |
| 10 | [部署](operations/DEPLOYMENT.md) / [运维](operations/RUNBOOK.md) | 上线与恢复 |
| 11 | [路线图](ROADMAP.md) / [状态](STATUS.md) / [问题清单](OPEN_QUESTIONS.md) | 项目执行 |
| 12 | [ADR](decisions/README.md) / [开发提示卡](prompts/README.md) | 长期维护 |
| 13 | [交接](HANDOFF.md) / [任务台账](TASKS.md) / [会话日志](SESSION_LOG.md) | 跨会话开发与恢复 |

**更新要求**：每次涉及公开行为/数据变更同步改 PRD、API、数据字典、验收与追踪；规则优化改模型文档与研究标签定义。所有文档均为实施设计草案，未代表获批医学方案。
