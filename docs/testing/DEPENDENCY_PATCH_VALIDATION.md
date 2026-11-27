# Next修复补丁验证（DEMO-V2-16）

日期：2026-11-26。起始提交：`afd29c4`。直接依赖只改Next与对应eslint-config-next：16.4.3→固定16.4.5；pnpm重新解析其依赖子树并更新锁文件，没有强制overrides或改变安全开关。React、TypeScript、姿态SDK/模型版本保持原值。

升级依据：npm审计在16.4.3报告8项moderate（7项Next、1项开发工具链minimatch）；Next官方[GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h)列16.4.5为修复版本。其余Next公告的修复范围经本次audit输出核对一致。更新对应lint配置后，受影响minimatch也由正常依赖解析更新，不单独跨主版本强行覆盖。

执行命令：

```powershell
npm exec --yes --package=pnpm@10 -- pnpm --dir frontend up next@16.4.5 eslint-config-next@16.4.5
npm exec --yes --package=pnpm@10 -- pnpm --dir frontend audit --json
npm exec --yes --package=pnpm@10 -- pnpm --dir frontend audit --prod --json
npm exec --yes --package=pnpm@10 -- pnpm --dir frontend lint
npm exec --yes --package=pnpm@10 -- pnpm --dir frontend typecheck
npm exec --yes --package=pnpm@10 -- pnpm --dir frontend test
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
backend/.venv/Scripts/python.exe scripts/run_pose_browser.py
```

已核验全量/生产audit各级漏洞数均0（当时注册表快照，不是未来安全承诺）；原始输出在忽略目录`exports/pose-audit-before.json`、`pose-audit-after.json`、`pose-audit-prod-after.json`。lint/typecheck/25测试通过，Next16.4.5生产构建一次通过。最终真实模型浏览器证据见[STATUS](../STATUS.md)。

最终浏览器9通过(40.2秒)，runner退出0；`exports/pose-browser-2692906a8a/browser/`包含截图、`.last-run.json`为passed。覆盖实际姿态推理、固定采样、提交响应丢失/详情读取失败恢复、窄屏、摄像/模型失败与旧Demo训练。无后端源码改动，后端/迁移独立测试沿用任务15的59/6skip与7通过证据。

只验证现有合成流程回归，无新业务行为、API/数据结构、临床规则、生产发布或共享数据库迁移。回退用上一Git检查点恢复两版本文件并重建依赖；不要将旧版本用于正式发布。依赖审计不能替代应用权限、数据准入或临床验证。
