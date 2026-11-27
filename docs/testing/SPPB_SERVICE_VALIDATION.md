# 坐站持久化与人工复核验收（DEMO-V2-64）

2026-11-26，AT-AI-MEASURE-02。合成关键点与临时数据库；无真实患者或原视频。

| 目标 | 执行证据 |
|---|---|
| SPPB-S-01 来源/原值/人工快照 | `tests/test_sppb_api.py`：来源不变；AI10.6s、人工零起点/10s分存；接受恢复AI值，重测/拒绝取消当前确认 |
| SPPB-S-02 未知与范围 | 未知不可接受、可明确人工修正；起止在录像内；零有效；非有限、负数、布尔、字符串、不完整修正拒绝 |
| SPPB-S-03 授权与重试 | 未登录401、对象/研究/角色403；撤回同意后写/重试403、历史保留；缺CSRF403、缺幂等键422；同键同内容原记录、变内容409；失败不留收据；分页、跨对象来源拒绝；不生成assessment/grade |
| SPPB-S-04 PostgreSQL | `tests/test_sppb_postgres.py`：两会话并发 `[201,409]`；重开连接保留候选及人工零起点；DB拒绝不完整修正 |
| SPPB-S-05 迁移 | 0001→0024升/check/空库降/升；带0023来源升级；空新表回退保留来源；有测量/复核拒绝回退、头保持0024；旧pose升级兼容 |
| SPPB-S-06 浏览器HTTP | `frontend/e2e/sppb.real.ts`：登录/建档/同意/保存骨架→测量；实际提交后丢响应、同键重试仅1条；修正、重试、409、刷新、旧值、重测及分页 |

实际执行：

- 后端Ruff通过；全量pytest **125 passed / 8 opt-in skipped**（18.15s）；接口测试15项，补充不产生评估/分级断言后单跑15项再次通过。
- `scripts/run_eng04_integration.py` **9 passed**（19.02s），returncode=0；日志 `exports/sppb-pg-final.log`。
- `E2E_SPECS=sppb.real.ts` + `scripts/run_pose_browser.py`：Next生产构建、FastAPI、临时PG、Chrome，**1 passed**（3.4s），returncode=0；附件 `exports/pose-browser-b754c99c7e/`、日志 `exports/sppb-browser.log`。是实际fetch与合成关键点测试，不是识别准确率。
- 前端lint/typecheck通过；本任务未改产品组件，未重复前端单测和旧全部浏览器用例。OpenAPI已生成。
- 共享数据库未迁移，临时容器由runner清理。

首轮修正：测试误用审计字段object_type，改resource_type；CSRF用例的幂等键过短先422，改合法键后403；Ruff行长修正。首轮PG旧测试硬编码0023的断言失败，改0024后整套9项通过。输出见工具记录及 `exports/sppb-pg.log`。

未验证：人体/老年人、辅具、标准站直/手撑真实性、实机、秒表对照与临床计分。当前仅确认计时观察，无量表分、阶段或方案。
