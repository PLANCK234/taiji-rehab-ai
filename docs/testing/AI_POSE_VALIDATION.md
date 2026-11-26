# AI姿态识别可执行验证目标

任务：`DEMO-V2-10/11`，2026-11-26。验证对象为真实姿态模型、几何算法和数据库闭环；不是临床评分效度或老年人群准确率认证。

## 预设通过条件

| ID | 目标与通过条件 | 可执行证据 |
|---|---|---|
| AI-GEOM-01 | 已知90°/180°角正确；宽高比改变和镜像后不变；误差≤0.01° | `backend/tests/test_pose_analysis.py` |
| AI-GEOM-02 | 0.5秒间隔的90→94°慢速小幅序列仍有指标，P5–P95幅度3.6°；坐位不自动失败 | 同上；这只是合成关节序列，不是视频识别精度 |
| AI-MISS-01 | 遮挡、缺失、零向量不转为正常值；大于1秒缺口不累计观察时长；无人体时全部角度为null | 几何单测与空画面真实模型浏览器测试 |
| AI-MODEL-01 | 固定版本模型在合成年长人物静态视频中实际推理；至少3帧有33关键点，单人检测帧占采样≥90%，肘角非空 | `frontend/e2e/pose.real.ts`，无模型/关键点mock；门限仅为该固定工程样例验收 |
| AI-DATA-01 | 真实关键点经FastAPI生成报告写入PostgreSQL；刷新可重读骨架证据和人工复核；AI原值不覆盖 | 同上与`backend/tests/test_pose_postgres.py` |
| AI-AUTH-01 | 无登录/无同意/越对象/分析员拒绝；缺CSRF拒绝；重放幂等、冲突审核409 | `backend/tests/test_pose_api.py` |
| AI-FAIL-01 | 摄像拒绝/模型缺失明确显示错误；空视频不准确认有效观察；合成摄像流停止后轨道结束并保存 | 浏览器失败分支及合成摄像流测试，模型不mock |

模型为`@mediapipe/tasks-vision@0.10.32`、`pose_landmarker_lite/float16/1`，SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`。准备脚本核验模型哈希；SDK完整性由pnpm锁文件固定。浏览器运行时从本站加载，无外部推理API调用。

## 执行

```powershell
# 在仓库根目录，使用已安装的backend虚拟环境
backend/.venv/Scripts/python.exe scripts/run_eng04_integration.py
# 先安装Playwright Chromium，或明确指定本机Chrome
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
backend/.venv/Scripts/python.exe scripts/run_pose_browser.py
```

浏览器脚本使用独立tmpfs PostgreSQL、生成的合成测试账号和本机FastAPI/Next生产构建；结束后停止测试服务与容器。日志、截图和测试附件在忽略目录`exports/pose-browser-*/`。它不迁移原有数据库卷。

## 结果与适用范围

本轮最终结果在[STATUS](../STATUS.md)和[TRACEABILITY](../TRACEABILITY.md)记录。必须如实保留加载/环境/业务失败及修复记录。

最终执行：后端52通过/5跳过，独立PostgreSQL迁移与API6通过，前端lint/typecheck/21单测/生产构建通过，真实模型与业务浏览器8通过（37.6秒），runner退出0。证据为本地忽略目录`exports/pose-browser-23fa682926/browser/`；截图已目视核查骨架与报告，`.last-run.json`为passed。回归涵盖已有分级/动作库/训练/反馈。实体手机与连续太极评分未验证。

模型测试素材是**合成静态人物图重复编码的视频**，用来证明推理和数据闭环真实运行。它不能证明连续太极动作识别准确、老年人不同体型/服装/辅具表现、疾病阶段判定或康复疗效。手机实体机性能、多人/转身/遮挡视频、真实慢动作片段与专家配对标注仍需后续验证；当前不训练阶段预测器、不产生临床总分或治疗剂量。

静态样例也测得约0.69–3.28°的P5–P95变化，说明模型存在时间抖动。几何单测中能保留4°变化，并不意味着模型可准确分辨同等幅度的真实微小动作。当前不做去噪后精度声明；后续要用人工标注/测量参考分别量化噪声、慢动作误差和重复性。

## 合成素材来源

文件：`frontend/public/pose-fixtures/synthetic-elderly.png`。2026-11-26通过内置imagegen生成，非真实人物、非患者、不对应标准太极动作；已人工查看全身完整性。未使用外部真人影像。生成提示原文：

> Use case: scientific-educational. Asset type: synthetic computer vision test fixture. Generate a photorealistic but entirely fictional elderly East Asian adult, full body including shoes, centered in a plain well lit empty studio. They are performing a slow small-amplitude Tai Chi pose: feet apart, knees slightly bent, both elbows bent, arms held forward and apart at chest height, palms open. Fitted neutral athletic clothes with visible limb outlines; no baggy robe. Camera frontal at waist height, head and both hands and feet completely visible, no occlusion. One person only. No text, no labels, no skeleton overlay, no medical equipment. This is a synthetic image for testing pose landmark detection, not a real patient or clinical evidence.
