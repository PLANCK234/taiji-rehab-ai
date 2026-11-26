# 本地 Demo 自动备份（macOS）

仅用于现有本地合成 Demo。Python 3.11+（含 fcntl）、Docker Desktop 和正在运行的本项目 db/backend 容器是前提。不支持 Windows 自动安装；不读取或改变 Research。

## 一次备份与恢复验证

在项目目录运行：

```bash
python3 scripts/demo_backup.py
```

默认保存在 `~/Library/Application Support/TaijiRehab/demo-backups/`，也可用 `--output /绝对路径` 指定仓库以外的目录。脚本自动识别该仓库 Compose 的数据库与原有数据卷，严格检查 local/demo/synthetic 标记。

每次创建 UTC 时间戳目录，生成 `taiji-demo.dump`、SHA-256 文件和 `verification.json`。整个目录权限 700，文件 600。导出与源表数量/内容摘要共享同一只读事务快照，允许备份期间继续录入；备份只包含快照时刻的数据。用同一个本地 PostgreSQL 镜像，在无网络、无宿主机端口、独立 tmpfs 的临时容器恢复。`pg_restore --exit-on-error` 成功后逐表比较数量和内容摘要；包括账号权限、审计、评估和反馈全部修订历史。不硬编码某个练习对象或要求先造一条记录。

只有完整恢复、比对和临时容器移除都成功，才写入 `last-success.json`。失败目录保留为 FAILED，不能当作已验证备份使用。不会输出数据库行、原始错误、密码或密钥；不会改源数据库、种子或迁移。容器/进程被强制杀死时可能留下带 `org.taiji-rehab.demo-backup=restore-check` 标签的临时容器，需人工确认后处理，绝不能删原卷。

## 安装自动执行

```bash
python3 scripts/demo_backup.py --install-macos
```

安装当前用户的 `~/Library/LaunchAgents/org.taiji-rehab.demo-backup.plist`。首次启用（尚无成功记录）立即备份；成功后每24小时备份；失败每5分钟重试。重启任务会读取上次成功时间，不重复生成尚未到期的备份；已到期则补做一次，不堆积错过的任务。后台每分钟检查到期状态，时间以完成验证后计算，可能因休眠或执行耗时延后。

电脑关机、休眠、用户未登录或 Docker/项目关闭时无法执行。Docker/项目恢复运行后会重试，不会擅自启动或初始化它们。`KeepAlive` 用于进程退出后重启，不是电脑关机时仍在备份。安装使用当前 Python 的绝对路径和脚本路径；移动项目、删除此分支脚本、卸载 Python 后需重新安装/修复任务。无需打开 VS Code 或保持终端窗口。

可自定义 `--interval`（秒，默认86400）、`--retry`（默认300）、`--output` 和 `--docker`。`--watch` 是前台调度模式，Ctrl+C 停止；后台安装会传入这些参数。不要把验收用的1秒频率作为长期设置。

## 查看结果与停止

```bash
launchctl print gui/$(id -u)/org.taiji-rehab.demo-backup
```

`state = running` 只证明调度进程运行，不等于备份成功。在备份目录检查 `last-run.json`（PASS 或 RETRY）和 `last-success.json` 指向的目录，再看 `verification.json`。后台不生成无限增长日志；失败状态保存在有权限保护的 JSON 文件中，未安装通知推送。

停止后台任务（保留已有备份）：

```bash
launchctl bootout gui/$(id -u) "$HOME/Library/LaunchAgents/org.taiji-rehab.demo-backup.plist"
```

如需彻底取消下次登录加载，再由用户删除这个 plist；重新启用执行安装命令。

## 保护与范围

- 不上传、不同步到 GitHub、不自动删除或设置保留期；磁盘满时失败并重试，用户需检查剩余空间。
- 权限控制不是加密。当前仅合成 Demo；真实研究需另行批准加密、存储和保留策略。
- 另存一份到受保护的独立设备；U盘复制仍需手动，不会自动同步。
- 这是单个 PostgreSQL 数据库的完整逻辑备份，不含 `.env`、源码、镜像、集群全局角色和外部文件。跨电脑恢复还需兼容角色、应用版本和安全配置。
- 验证的是数据库恢复和表内容一致，不是临床验收或恢复系统的浏览器登录验收。真实患者数据、正式临床分级和 Research 准入保持关闭。
- 源库仅只读快照；唯一删除是本次创建的临时恢复容器，绝不使用 `down -v`、不挂载原卷到测试容器、不自动覆盖源库。

## 验收

`python3 -m unittest discover -s scripts -p test_demo_backup.py -v` 验证调度、重试、重启不重复、目录隔离、并发锁、Research拒绝和日志脱敏。合成库实测另见 [测试证据](../testing/ENG-05-BACKUP.md)。CI不连接用户电脑数据库、不上传备份。
