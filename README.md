# 砚台泼墨 · 项目工作台

本地项目台账，支持项目背景、进展时间线、合同与报价、竞争分析、资料元数据、待办和数据图表。

## 运行

需要 Python 3.9 或更高版本。

```sh
python3 server.py --port 8765
```

访问 `http://127.0.0.1:8765/` 查看登录界面；工作台位于 `/workspace.html`。
数据库首次运行时在 `data/workspace.sqlite3` 自动创建，不附带项目数据。

## 当前能力边界

- 登录与微信授权为界面演示，尚未实现真实身份认证或接口权限隔离。
- 服务仅监听本机回环地址，不应直接暴露到公网。
- 附件仅保存元数据，不上传原件。
- Excel 导出使用 `export-xlsx.mjs` 和本机 Codex 表格运行时；其他电脑需要适配依赖路径。其他功能可独立运行。
- 合同金额按所选期间统计，合同总额、年费、月费分别展示，不跨口径相加。

## 文件

- `dist/index.html`：默认登录入口
- `dist/workspace.html`：工作台入口
- `server.py`：本地服务和 SQLite 数据保存
- `work/liquid-nav/`：图表组件源码及构建依赖

前端已附构建产物，无需额外构建即可启动。重建图表：

```sh
cd work/liquid-nav
npm ci
npx esbuild pie-entry.tsx --bundle --minify --format=iife --outfile=../../dist/rounded-pie.bundle.js
```

## 代码与业务数据

仓库只同步程序代码。数据库、备份、附件、依赖目录、密钥和本地预览不提交。
自动同步如遇远端冲突应停止并提示，禁止强制覆盖远端。
