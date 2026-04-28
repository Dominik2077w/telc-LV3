# GitHub Pages + iOS PWA 部署

## 本地构建

```bash
npm run build
```

构建结果会输出到 `dist/`。GitHub Pages 工作流会自动发布这个目录。

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库，例如 `telc-LV3`。
2. 把本项目文件推送到仓库的 `main` 分支。
3. 打开仓库 `Settings` -> `Pages`。
4. `Source` 选择 `GitHub Actions`。
5. 回到 `Actions`，运行或等待 `Deploy GitHub Pages`。
6. 成功后会得到一个类似 `https://你的用户名.github.io/telc-LV3/` 的地址。

## 安装到 iPhone / iPad

1. 用 iOS Safari 打开 GitHub Pages 地址。
2. 点击 Safari 分享按钮。
3. 选择“添加到主屏幕”。
4. 打开主屏幕上的 `LV3 Trainer` 图标。

首次打开需要联网。打开成功后，service worker 会缓存应用 shell 和题库，之后可以离线使用。

## 更新题库

如果更新了 OCR Markdown：

```bash
npm run extract
npm run build
```

然后提交并推送到 GitHub。service worker 的缓存版本会在构建时自动更新，iOS 下一次打开会拉取新版本。
