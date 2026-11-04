# 砚台泼墨 · 独立 Mac Demo

本地审核版本；正式网站和数据库不参与运行、不迁移。

## 构建与启动

```sh
cd mac-demo
npm ci
npm run build
open 'out/砚台泼墨 Demo.app'
```

构建需要 Node.js 22.12 或更高版本，产物对应当前 Mac 的 CPU 架构。需要本机 `/usr/bin/python3`（此机器已核验 Python 3.9.6）；Python 尚未随包分发，不能宣称其他 Mac 开箱即用。

- 应用启动自动运行自己的 loopback 服务，随机端口，不占用正式 8765 端口；退出时停止该子服务。
- 数据：`~/Library/Application Support/YantaiInk-Mac-Demo/data/workspace.sqlite3`。
- 首次使用仅生成三条虚构项目；再次启动保留演示数据。
- 独立 Chromium 存储分区；不读取正式浏览器缓存或数据库。
- 原生菜单支持新建、搜索、保存、备份、窗口缩放和全屏。
- 资料仍仅元数据；Excel 引擎未打包，界面会明确提示。可用原生菜单备份 SQLite，以及原有完整 JSON 备份。
- 仅本地 ad-hoc 签名，尚无 Apple Developer ID 签名、公证、DMG、自动更新或真实账号认证。
- 不安装到 Applications，不覆盖正式程序；不自动导入正式数据。
