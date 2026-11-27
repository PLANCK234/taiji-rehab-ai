# 设计系统 · 新中式

Web 端与后续微信小程序共用同一套视觉语言。实现位于 `frontend/app/style.css`（CSS 变量）与 `frontend/components/`。

## 设计原则

1. **宣纸与玉**：暖白纸色背景、墨色文字、玉绿为主色；朱砂红只用于“等级印章”和危险操作，少即是多。
2. **永远告诉用户下一步**：对象页顶部有流程进度条和“下一步”卡片；空状态写明该做什么。
3. **未知就是未知**：缺失、未记录、不可评估用中性灰/琥珀色徽标显示，绝不显示为 0 或“正常”。
4. **触屏优先**：所有可点区域 ≥ 44px；720px 以下单列布局，按钮铺满宽度——这正是小程序的布局。
5. **Demo 标识常驻但不打扰**：顶部一条墨色细横幅，不在每个卡片重复免责声明。

## 设计令牌

| 令牌 | 值 | 用途 |
|---|---|---|
| `--paper` | `#f5f3ee` | 页面背景（宣纸） |
| `--surface` | `#ffffff` | 卡片 |
| `--surface-2` | `#faf8f4` | 次级块、列表项 |
| `--line` / `--line-strong` | `#e6e0d5` / `#d4ccbe` | 分隔线 / 输入框边框 |
| `--ink` / `--ink-2` / `--ink-3` | `#1c2420` / `#48514c` / `#7a817c` | 正文 / 次要 / 辅助文字 |
| `--jade` / `--jade-strong` / `--jade-soft` | `#1f6b5a` / `#165445` / `#e6f1ec` | 主按钮、链接、成功状态 |
| `--vermilion` / `--vermilion-soft` | `#b4442d` / `#fbece8` | 等级印章、错误、危险操作 |
| `--amber` / `--amber-soft` | `#9a6410` / `#fbf2df` | 待处理、草稿、警告 |
| `--blue` / `--blue-soft` | `#2d5c8a` / `#e8eff7` | 信息、进行中 |
| 圆角 | 10 / 14 / 20 px | 小控件 / 输入与列表 / 卡片 |
| 阴影 | `0 1px 2px rgb(28 36 32/4%), 0 6px 20px rgb(28 36 32/6%)` | 卡片 |
| 字体 | 正文 PingFang SC / 微软雅黑；标题 Noto Serif SC / 宋体 | 标题用衬线体营造书卷感 |
| 触控高度 | 44 px | 按钮、输入框 |

**小程序换算**：以 375 px 设计宽度为基准，`1px = 2rpx`（例：卡片圆角 20px → `40rpx`，触控高度 44px → `88rpx`）。

## 组件清单（Web → 小程序对应）

| Web 组件 | 位置 | 小程序建议 |
|---|---|---|
| `AppShell`（顶栏 + Demo 横幅） | `components/app-shell.tsx` | 自定义导航栏 + 顶部提示条；底部 TabBar：工作台 / 我的 |
| `PageHeader` / `Crumbs` | `components/ui.tsx` | 页面标题区（小程序无面包屑，靠返回键） |
| `Card` | `components/ui.tsx` | `view.card` |
| `Badge` | `components/ui.tsx` | `text.badge`，同色调 |
| `FlowSteps` + 下一步卡片 | `components/ui.tsx` | 同样的横向 5 步条，置顶 |
| `.grade-seal` 等级印章 | `style.css` | 朱砂方印，显示 Ⅰ–Ⅳ |
| `.action-card` + 对话框 | 方案页 | 两列卡片网格 + 底部弹出层（`page-container`） |
| `.hero` 当前训练卡 | 训练页 | 全宽玉绿卡片，大字动作名 + 步骤 |
| `TaijiMark` | `components/taiji-mark.tsx` | 导出为 SVG/PNG 用作小程序图标 |

## 文案规范

- 用动词开头的按钮文案：“创建编号对象”“开始训练”“确认当前记录”。
- 错误提示说明**怎么办**，例如“录入 SPPB 总分前，请先勾选‘明确记录模拟同意’”。
- 只在必须的地方说明合规边界（顶部横幅、方案卡、导出卡、AI 报告各一处）。
