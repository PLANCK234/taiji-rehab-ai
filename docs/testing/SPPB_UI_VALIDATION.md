# 坐站网页操作验收（DEMO-V2-65）

2026-11-26，AT-AI-MEASURE-03。页面 `/participants/{id}/ai-assessment`。

操作：打开已保存骨架报告→“生成坐站候选测量”（自动起点或指定人工起点）→查看AI候选与未知原因→核对骨架→接受/修正起止/重测/拒绝→保存人工复核。历史支持分页、独立打开和刷新，刷新页面后可重新打开原记录。AI与人工用时分栏，人工版本和人员/时间保留；不输出SPPB分或康复阶段。

实现与验证目标：

| 目标 | 验证 |
|---|---|
| SPPB-U-01 零与未知 | `lib/sppb.test.ts`：空白不是零；起止时刻在录像范围内且有序；0ms有效；不完整/无理由拒绝；重测不带替换时间 |
| SPPB-U-02 读取故障与只读角色 | `sppb-panel.test.tsx`：历史失败保持未知，有重新读取入口；只读用户看独立AI/人工值，无编辑按钮；刷新失败保留已知历史 |
| SPPB-U-03 保存恢复与冲突 | 组件测试：失败保留人工零起点、同内容同键重试；409保留理由和修正值，提示刷新；未知候选禁用直接接受 |
| SPPB-U-04 实际网页闭环 | `e2e/sppb.real.ts`：真实DB提交后丢响应，界面重试仅1条；人工0ms/10s修正、刷新恢复、另一复核者导致409、人工刷新后显示重测；真实6条记录的1–5/6–6分页 |
| SPPB-U-05 布局 | 桌面1366px、手机390px截图；断言无页面横向溢出，所有本面板按钮≥44px，按钮和表单在处理时禁用 |

全部HTTP通过既有`lib/api.ts`，客户端读/写设置15秒中止上限；不加新的临床判断或确认弹窗。来源切换仅重置新测量表单，既有计时记录标明其来源且可打开原骨架；复核使用自身来源时长，避免把其他录像的范围用于修正。时间展示复用北京时间格式，数据库仍UTC。

已运行前端 lint/typecheck、**141 tests / 36 files**（8项新增纯逻辑/组件测试）；定向真实浏览器1项与生产构建通过。最终全套真实模型/Next生产构建/FastAPI/临时PG浏览器 **25 passed (1.8m)**，returncode=0；仅排除需要固定3000端口的127登录用例，该项已在A0 Docker验收通过。日志`exports/sppb-ui-full-browser-final.log`，附件`exports/pose-browser-eedb576b49/browser/`；其中`sppb-desktop.png`（1366px）和`sppb-mobile.png`（390px）已亲自查看，对比度、折行、禁用态和布局无横向溢出。浏览器同时断言本面板全部按钮≥44px。后端/PG接口验证见 [DEMO-V2-64](SPPB_SERVICE_VALIDATION.md)，该任务后未改后端。

首轮全套浏览器 **24 passed / 1 failed**：新用例的`page.screenshot`裁剪框在屏幕外被拒绝；业务断言此前通过。改为从页面顶部截完整页面，避免sticky导航压到局部截图，也避免越界裁剪。失败日志保留`exports/sppb-ui-full-browser.log`、附件`exports/pose-browser-0b2977d4d0/`；最终全套结果另列，不将该轮记为通过。

React质量检查采用`vercel:react-best-practices`：提交保留在事件处理器，独立表单使用稳定key；无订阅effect写入；服务端并行读姿态/同意/测量；不向SSR列表传关键点；原生label、fieldset、状态/错误区域及键盘可用按钮；没有新增依赖。

最后仅补充复选框标签44px触控区后，定向网页/生产构建再次 **1 passed (5.3s)**，returncode=0，同时断言按钮与标签高度。最新桌面/手机截图在`exports/pose-browser-f7f483e660/browser/sppb-desktop.png`和`sppb-mobile.png`，两张均已查看；其余逻辑沿用前述全套25项证据，无新增后端改动。日志`exports/sppb-ui-touch-browser.log`。

未验证：真实患者、实体手机摄像头、人体精度和临床量表评分；390px Chrome布局不替代实体手机取景测试。
