# 微信小程序方案（准备稿）

目标：让研究人员在手机上完成**现场**操作——查看对象、录入评估、带练太极训练、拍摄动作视频。Web 端继续承担数据管理、导出与复核。小程序仍是**研究人员端**，不是患者端。

## 页面映射

| 小程序页面 | 对应 Web 页面 | 首期 | 说明 |
|---|---|---|---|
| 登录 | `/login` | ✓ | 账号密码；后续可接企业微信 |
| 工作台 | `/workspace` | ✓ | 统计卡 + 对象列表 + 搜索；右上角“+”快速建档 |
| 对象详情 | `/participants/[id]` | ✓ | 流程进度 + 下一步卡片 + 评估/训练列表；表单折叠为二级页 |
| 录入评估 | `/assessments/[id]` | ✓ | 数字键盘输入 SPPB；确认按钮置底 |
| 训练方案 / 动作库 | `/participants/[id]/demo` | ✓ | 两列动作卡；底部弹层看要领 |
| 训练进行中 | `/demo/run/[runId]` | ✓ | 全屏大字当前动作，底部固定“暂停 / 下一动作”；可配合 `wx.setKeepScreenOn` |
| 训练反馈 | 训练页反馈表单 | ✓ | RPE 用 6–20 滑块 + 文字锚点 |
| AI 动作采集 | `/ai-assessment` | 二期 | 见下“AI 采集” |
| 复核、导出 | 复核面板、CSV | ✗ | 留在 Web 端 |

## 后端需要的改动（开工前）

1. **鉴权**：小程序无浏览器 Cookie/CSRF 语义。新增 `POST /api/v1/auth/token`（返回短期 Bearer token + 刷新机制），`current_auth` 同时接受 `Authorization: Bearer`；Bearer 请求免 CSRF（无 Cookie 自动携带风险），仍保留幂等键、RBAC 与对象范围检查。须写 ADR 并补测试。
2. **域名与传输**：小程序只允许已备案 HTTPS 合法域名；需要正式部署环境，属于部署审批范围（Q-01/Q-10）。
3. **聚合接口**（可选）：对象详情页目前 7 次请求，可加一个只读汇总接口减少手机端往返。
4. 现有 OpenAPI（`backend/openapi.json`）可直接生成 TypeScript 客户端供小程序使用。

## AI 采集（二期）

- 方案 A（推荐先做）：小程序 `camera` 组件录制短视频 → 在端上抽帧，使用 **VisionKit 人体关键点** 或 WebAssembly 版 MediaPipe 推理，只上传关键点 JSON，沿用 `POST /participants/{id}/pose-analyses` 的现有输入格式（33 点、时间戳从 0 递增）。
- 方案 B：web-view 内嵌现有 Web AI 页面（需同域 HTTPS 与摄像权限配置）。
- 无论哪种方案，原视频默认不上传；真实人员影像需先完成伦理与同意审批。

## 视觉

完全沿用 [设计系统](DESIGN_SYSTEM.md) 的令牌（`1px = 2rpx`）。建议首期用原生组件 + 自写样式，不引入重型 UI 库，保证与 Web 一致。

## 建议工程结构

```
miniprogram/
  app.json            # 页面、TabBar、导航栏颜色 #f5f3ee / 文字 #1c2420
  app.wxss            # 由 style.css 令牌翻译而来
  api/                # 由 openapi.json 生成的客户端 + Bearer 拦截器
  pages/login, workspace, participant, assessment, plan, run, feedback
  components/card, badge, flow-steps, grade-seal, action-card
```
