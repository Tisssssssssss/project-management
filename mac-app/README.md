# 砚台泼墨 · Mac 本机正式版 1.0.0

运行产物：`out/砚台泼墨.app`。本机安装目录：`~/Applications/砚台泼墨.app`。

## 构建

需要 macOS、Node.js 22.12+ 和 Xcode Command Line Tools（图标构建使用 Swift、sips、iconutil）。

```sh
cd mac-app
npm ci
npm test
npm run build
```

若本机尚未安装 Electron 二进制，先运行 `node node_modules/electron/install.js`。本仓库工作机也可复用 `mac-demo/node_modules/electron`。按构建机架构生成；当前产物为本机架构，未做跨架构验收。

App 运行不需要外部 Python、Node 或本地 Codex 运行时。使用 Electron 内置 Node HTTP 与 SQLite；仅绑定随机 loopback 端口，初始启动令牌交换 HttpOnly 会话 Cookie，同源写入检查，页面无 Node 权限，外部导航/新窗口拒绝。

## 数据与恢复

- 数据库：`~/Library/Application Support/YantaiInk/data/workspace.sqlite3`。
- 每次启动先自动备份，保留最近14份启动备份；菜单“文件 → 备份数据库…”可另存完整 SQLite。
- 原有“设置与备份”支持完整 JSON 导出与恢复。SQLite 备份须在 App 退出后人工恢复，恢复前保留当前副本。
- 本次从原网页数据库以 SQLite backup API 做一致性备份后导入；迁移脚本校验完整性、版本与载荷，目标存在即拒绝覆盖。
- 网页数据库、Demo 数据库与 App 数据库相互独立。导入后不会双向同步，请主要在 App 登记，避免两份数据分叉。正式金额和原始业务数据不随代码或 App 安装包分发。
- 首次在没有数据库的机器启动为空工作空间，不生成演示项目。

显式迁移命令（先退出 App，目标必须不存在）：

```sh
node migrate.cjs /absolute/path/source.sqlite3 /absolute/path/destination.sqlite3
```

## 界面与操作

36px Mac 标题区、紧凑侧栏、统一字号、图表填充剩余高度；按屏幕工作区决定默认窗口大小，退出时保存尺寸和比例。标准比例 ⌘0，放大/缩小可在“显示”菜单调整。

⌘N 新建、⌘F 搜索项目、⌘S 保存表单。Excel 导出使用内置 OOXML 引擎，冻结表头、提供筛选、数字金额保持数字类型；文本以 inline string 存储，不作为公式执行。与网页高级排版不完全相同。

## 本轮验证及限制

验证本机启动、原生窗口/菜单、迁移记录对账、会话与跨源拒绝、修订冲突、数据库持久化、备份、目标覆盖保护及 Excel ZIP/XML 完整性。原网页8765保留。

这是本机可用版，使用 ad-hoc 签名，未具备 Apple Developer ID 签名、公证、App Store 分发或自动更新。未声称跨机开箱即用或真实微信认证；本地 App 直接进入工作台，登录/微信仍不是身份认证。
