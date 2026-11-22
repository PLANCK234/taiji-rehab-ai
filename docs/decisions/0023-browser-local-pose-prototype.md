# ADR-0023: browser-local pose feasibility prototype

- Date: 2026-11-14
- Status: proposed engineering decision; not clinical, ethics or institutional approval

## Context

S6-01/S6-02 intentionally proved only a no-image synthetic shell. The next requested step is to test pose landmarks and basic kinematics without inventing clinical scores or opening real-image persistence while Q-01/Q-10 remain unresolved.

## Options considered

1. Upload video to FastAPI and run a Python/OpenCV pipeline.
2. Add a separate ML service and persist results immediately.
3. Run a pinned pose model in the existing Next.js browser client and keep all pixels ephemeral.

## Decision

Choose option 3 for S6-03. Use a pinned MediaPipe Pose Landmarker Full model and WebAssembly runtime served from the same application. Gate the route with `POSE_PROTOTYPE_ENABLED`, reuse staff session and participant scope, require explicit local-use confirmation, and keep video/results out of API, PostgreSQL and browser storage. Export is an explicit user download only.

The prototype emits raw keypoints, descriptive joint angles/ranges, image-coordinate trajectories and timing metadata. It does not emit repetition counts, SPPB scores, Tai Chi scores, clinical grades, safety conclusions or prescriptions.

## Consequences

- Fast delivery inside the current architecture, no video egress, and no new backend route, migration or storage lifecycle.
- Device performance and browser/WASM compatibility affect runtime; results disappear on refresh and are not auditable research records.
- Local processing reduces transfer exposure but does not authorize use of real patient video. Operators still need approved purpose, consent, access and capture procedures.
- The Full model balances browser size and expected landmark quality; its estimates are not metric-accurate depth or validated clinical measurements.

## Revisit trigger

2026-11-21 合成患者端联调：仅在姿态原型开关开启、服务端读取有效本人绑定与当前合成发布卡片后显示同一浏览器组件。使用单独的摄像头授权确认，患者端不提供摘要下载；结果留在当前页面内，不写入患者自报或档案。本次范围仅覆盖合成流程。

Revisit before any real-video persistence, Research deployment, patient access, automated phase/repetition detection, clinical score, model replacement, or use as a medical decision aid.

## Approvers

Engineering prototype requested by the project owner; clinical, ethics, data-controller and institutional approval remain pending.
