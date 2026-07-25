# 💰 工资累积器 — Android APK 打包指南

## 快速开始（推荐：在线工具，5 分钟）

### 方法一：PWABuilder（最简单，免费）

1. **先托管 PWA 文件到公网**（3 分钟）
   - 打开 https://app.netlify.com/drop （无需注册，拖拽上传）
   - 把本目录下的所有文件拖进去
   - 等待 10 秒，拿到一个 `https://xxx.netlify.app` 的网址

2. **生成 APK**（2 分钟）
   - 打开 https://www.pwabuilder.com
   - 粘贴你的网址，点 "Build My PWA"
   - 选 "Android"，下载 APK

3. **安装到手机**
   - 把 APK 传到安卓手机，点击安装

---

### 方法二：PWA2APK

1. 同样先把文件托管到公网（GitHub Pages / Netlify / Vercel 任选）
2. 打开 https://pwa2apk.com
3. 粘贴网址 → Generate APK → 下载

---

## 本地编译（进阶，需要开发环境）

### 前置条件
- Node.js 18+
- JDK 17+
- Android Studio + SDK (API 34)
- 设置环境变量 `ANDROID_HOME`

### Windows 用户
双击运行 `build-apk-windows.bat`

### macOS / Linux 用户
```bash
chmod +x build-apk.sh
./build-apk.sh
```

### 手动使用 Bubblewrap
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=twa-manifest.json --directory=android
bubblewrap build
```

---

## 文件说明

| 文件 | 用途 |
|---|---|
| `index.html` | PWA 主文件（工资累积器） |
| `manifest.json` | PWA 配置文件 |
| `sw.js` | Service Worker（离线缓存） |
| `icon-192.png` | 小图标 |
| `icon-512.png` | 大图标 |
| `icon.svg` | SVG 矢量图标 |
| `twa-manifest.json` | Bubblewrap TWA 配置 |
| `build-apk-windows.bat` | Windows 一键打包脚本 |
| `build-apk.sh` | macOS/Linux 一键打包脚本 |

---

## 关于 GitHub Pages 托管（免费）

1. 注册 GitHub 账号
2. 新建仓库 `wage-tracker`
3. 上传本目录所有文件
4. Settings → Pages → Source: main 分支
5. 访问 `https://你的用户名.github.io/wage-tracker/`
6. 把这个网址贴到 PWABuilder 或 PWA2APK

---

## 常见问题

**Q: 安装后打开有浏览器地址栏？**
A: 签名密钥的 SHA-256 指纹需要配到网站 `.well-known/assetlinks.json`，
   用 Bubblewrap 构建时会自动处理。

**Q: 可以上架 Google Play 吗？**
A: 可以。用 Bubblewrap 生成 AAB 格式，上传 Play Console 即可。
   需要 Google Play 开发者账号（$25 一次性）。

**Q: 应用更新怎么办？**
A: 更新 HTML 文件 → 重新构建 APK → 版本号 +1 → 安装覆盖即可。

---

## 密钥安全提醒 ⚠️

签名密钥（`android-keystore.jks`）**丢了就无法更新应用**！
请备份到安全的地方。默认密码是 `wagetracker123`，建议改成自己的。
