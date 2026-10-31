# ADR-0011: Demo 与 Research 数据边界先关闭后开放

日期：2026-10-31。状态：已采纳（工程准备；Research 上线未批准）。

## 背景

REAL-01 要求共用业务代码而隔离演示和未来研究数据库。仓库只有 `ALLOW_SYNTHETIC_ONLY` 与 `APP_ENV`，不能用改变一个布尔值作为真实患者数据准入。伦理、知情同意范围、机构部署、安全与临床发布证据尚未在仓库中完成。

## 决定

- 增加 `APP_PROFILE=demo|research`。现有 API 仅在 `demo`、本地/测试环境且 `ALLOW_SYNTHETIC_ONLY=true` 时工作；未知配置关闭。Research 的业务 API、ready、演示种子及迁移均先拒绝。
- Demo 继续使用 `infra/compose.yaml` 的 `db`/`pgdata`。Research 准备配置使用独立 Compose 项目、私网、PostgreSQL 用户/数据库/卷与密钥模板，不执行种子或迁移；可共享同一后端镜像/业务代码。
- Research 激活须另有可审阅任务：机构批准的部署和身份提供方式、伦理/同意与数据最小化、密钥/TLS/存储保护、备份恢复与回滚、审计/范围隔离、保留/撤回/删除流程及测试证据。不能只改环境变量；须在代码和部署门禁中显式验收。
- 真实身份映射、真实影像和第三方 AI 数据传输继续关闭。S3-01 及 Q-03/Q-09 保持阻断。

## 后果

Demo 可继续迭代数据库驱动业务功能并用合成数据验证。Research 准备环境当前不是可处理患者数据的系统，也没有面向 Research 的前端入口。业务代码对 Research 的开放、已有数据库迁移及生产部署均待独立批准。

## 验证

`backend/tests/test_runtime_profiles.py` 检查 Research/未知 profile 的拒绝、布尔开关无法绕过与种子拒绝；临时 PostgreSQL 集成确保 Demo 旧流程正常；双 Compose 配置检查分离资源。任何真实数据或 Research 数据库迁移均未执行。
