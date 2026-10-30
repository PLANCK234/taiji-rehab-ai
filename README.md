# 太极拳康复分级评估与科研数据平台

[![Status](https://img.shields.io/badge/status-documentation--first-blue)](#项目状态)

**Researcher-facing Tai Chi Rehabilitation Assessment & Research Platform.**

> 当前仓库交付的是**完整工程文档与 Codex 开发脚手架**，不是已经运行的 Web 系统。README 中的启动命令属于未来实现后的目标，只有对应源码与配置落地后才可执行。

## 目标
医疗人员对研究对象建档、安全筛查、录入 SPPB 等客观评估，获取可解释的功能分级候选及太极训练适配建议并人工复核；每次训练后收集结构化反馈；周期末冻结数据并对照 V0 规则离线优化，审批通过的新版本才可发布。

## 不做什么
不提供患者端、实时动作纠错、自动诊断、自动调整临床处方或在线自学习；姿态照片模块当前仅为明确标注“识别算法未接入”的演示能力。

## 技术方案（拟采用）
| 层 | 选型 |
|---|---|
| 前端 | Next.js、React、TypeScript、组件库待团队确定 |
| 后端 | FastAPI、Pydantic、SQLAlchemy、Alembic |
| 数据库 | PostgreSQL |
| 分析 | Python、pandas、scikit-learn，离线训练 |
| 部署 | Docker Compose、TLS 反向代理、私有存储 |

## 目录规划
```text
AGENTS.md                  # 所有 Codex 任务的入口
README.md                  # 人类开发者入口
ARCHITECTURE.md            # 架构概览
docs/                      # 需求、数据、API、研究与运维文档
frontend/AGENTS.md         # 前端专用约束（源码后续创建）
backend/AGENTS.md          # 后端专用约束
ml/AGENTS.md               # ML 专用约束
infra/AGENTS.md            # 部署专用约束
```

## 开始开发
1. 先阅读 [`docs/README.md`](docs/README.md) 与 [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md)。
2. 确认所有阻断性医学、研究伦理与部署决策；未确认部分只使用合成数据及演示规则。
3. 依 [`docs/ROADMAP.md`](docs/ROADMAP.md) 的阶段顺序执行；每个阶段都以文档中的验收条件完成。
4. 在 Codex 中先提交 `docs/prompts/01-bootstrap.md` 这份任务卡，再逐阶段开发。

## 预期本地启动（尚未实现）
```bash
# 当 Sprint 0 创建这些文件后：
cp .env.example .env
# 填写仅用于本地演示的密钥，绝不可提交到 Git
docker compose -f infra/compose.yaml up --build
```

## 研究安全边界
- 数据是敏感研究数据；真实患者数据只进入获批准的环境。
- SPPB 分级规则仅作为 V0 可解释候选：10–12 Ⅰ，7–9 Ⅱ，4–6 Ⅲ，0–3 Ⅳ；缺失/不安全无法自动分级。
- 训练反馈是模型特征而非疗效真值；周期末客观测量和经审核的标签才可用于指定预测任务。
- AI 只提供候选，所有变更由授权医疗人员确认；保留完整审计链。

## 开发协作
- 每次 PR 写明需求编号、迁移影响、测试证据、隐私与安全影响。
- 新的医学规则或研究用途先更新文档并获批准，不得由 Codex 猜测。
- 当前项目状态见 [`docs/STATUS.md`](docs/STATUS.md)。

## 参考与来源
- 输入依据：用户提供的 PRD V0.9、剪枝版 PRD V1.1、技术实现路径 V1.1（2026-10-30）。
- Codex 官方说明：https://learn.chatgpt.com/docs/agent-configuration/agents-md
- 本仓库所有新增工程约定均是**建议方案**，不是医院已批准的研究协议。
