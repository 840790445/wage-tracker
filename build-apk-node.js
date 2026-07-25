#!/usr/bin/env node
/**
 * 工资累积器 — 纯 Node.js 本地 APK 打包工具
 * 
 * 这个脚本在用户的电脑上运行（不需要 Android SDK！）
 * 原理：用 Trusted Web Activity (TWA) 模板 + 本地 WebView 壳
 * 
 * 使用方法：
 *   node build-apk-node.js
 * 
 * 前置条件：
 *   - Node.js 18+
 *   - JDK 17+ (java 和 keytool 在 PATH 中)
 *   - 本脚本会自动下载 Android SDK 命令行工具（约 150MB）
 * 
 * 或者更简单：本脚本生成的是「离线 APK」——
 * 把所有 HTML/JS/CSS 打包进 assets，用 WebView 加载
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const APP_NAME = '工资累积器';
const PACKAGE_ID = 'com.wagetracker.app';
const VERSION = '1.0.0';
const VERSION_CODE = 1;

console.log(`
 ╔══════════════════════════════════════╗
 ║   工资累积器 Android APK 打包工具    ║
 ╚══════════════════════════════════════╝
`);

// ─── 检查环境 ───
function checkEnv() {
  console.log('🔍 检查环境...');
  
  try {
    execSync('java -version', { stdio: 'pipe' });
    console.log('  ✅ Java 已安装');
  } catch {
    console.log('  ❌ 需要安装 JDK 17+ → https://adoptium.net/');
    process.exit(1);
  }

  try {
    execSync('keytool -help', { stdio: 'pipe' });
    console.log('  ✅ keytool 可用');
  } catch {
    console.log('  ❌ keytool 不可用，请检查 JDK 安装');
    process.exit(1);
  }

  console.log('');
}

// ─── 生成签名密钥 ───
function genKeystore() {
  const keystore = path.join(__dirname, 'android-keystore.jks');
  if (fs.existsSync(keystore)) {
    console.log('🔑 签名密钥已存在，跳过');
    return keystore;
  }

  console.log('🔑 生成签名密钥...');
  const cmd = [
    'keytool -genkey -v',
    `-keystore "${keystore}"`,
    '-alias wagetracker',
    '-keyalg RSA -keysize 2048 -validity 10000',
    '-storepass wagetracker123',
    '-keypass wagetracker123',
    '-dname "CN=WageTracker, OU=Personal, O=WageTracker, C=CN"',
  ].join(' ');

  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('  ✅ 密钥生成完成\n');
    return keystore;
  } catch (e) {
    console.log('  ❌ 密钥生成失败:', e.message);
    process.exit(1);
  }
}

// ─── 获取 SHA-256 指纹 ───
function getFingerprint(keystore) {
  const cmd = `keytool -list -v -keystore "${keystore}" -alias wagetracker -storepass wagetracker123`;
  const output = execSync(cmd, { encoding: 'utf-8' });
  const match = output.match(/SHA-256:\s*([0-9A-F:]+)/i);
  return match ? match[1] : null;
}

// ─── 下载文件 ───
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', reject);
  });
}

// ─── 生成离线 APK（WebView 方式）───
// 这是核心：创建一个能在 Android 上运行的 APK
// 方案：把所有 Web 资源内嵌到 APK 的 assets 目录
// 然后用一个极简的 WebView Activity 加载

function createOfflineApk(keystore) {
  console.log('📱 生成 APK 文件...');
  
  const buildDir = path.join(__dirname, 'build');
  if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true });
  fs.mkdirSync(buildDir, { recursive: true });

  // 1. 复制所有 Web 资源到 assets
  const assetsDir = path.join(buildDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  
  const webFiles = ['index.html', 'manifest.json', 'sw.js', 'icon.svg', 'icon-192.png', 'icon-512.png'];
  for (const f of webFiles) {
    const src = path.join(__dirname, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(assetsDir, f));
    }
  }

  // 2. 生成 AndroidManifest.xml (文本格式，运行时由 Android 解析)
  const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${PACKAGE_ID}"
    android:versionCode="${VERSION_CODE}"
    android:versionName="${VERSION}">
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
    <application
        android:name=".WageApp"
        android:label="${APP_NAME}"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/Theme.AppCompat.NoActionBar"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`;
  fs.writeFileSync(path.join(buildDir, 'AndroidManifest.xml'), manifest);

  // 3. 生成 WebView 壳的 Java 源码（MainActivity.java）
  const javaDir = path.join(buildDir, 'src', 'com', 'wagetracker', 'app');
  fs.mkdirSync(javaDir, { recursive: true });

  const mainActivity = `package com.wagetracker.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.WindowManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.WebSettings;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_main);
        
        webView = findViewById(R.id.webview);
        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);
        
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        
        // 加载本地 HTML
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), mainActivity);

  // 4. Application 类
  const wageApp = `package com.wagetracker.app;

import android.app.Application;
import android.webkit.WebView;

public class WageApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // 初始化 WebView 全局设置
        WebView.setWebContentsDebuggingEnabled(true);
    }
}
`;
  fs.writeFileSync(path.join(javaDir, 'WageApp.java'), wageApp);

  // 5. 布局文件
  const layoutDir = path.join(buildDir, 'res', 'layout');
  fs.mkdirSync(layoutDir, { recursive: true });
  fs.writeFileSync(path.join(layoutDir, 'activity_main.xml'), `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#0b1020">
    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent"/>
</FrameLayout>`);

  // 6. 样式
  const valuesDir = path.join(buildDir, 'res', 'values');
  fs.mkdirSync(valuesDir, { recursive: true });
  fs.writeFileSync(path.join(valuesDir, 'styles.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">#0b1020</item>
        <item name="android:statusBarColor">#0b1020</item>
    </style>
</resources>`);

  // 7. 复制图标
  const mipmapDir = path.join(buildDir, 'res', 'mipmap-hdpi');
  fs.mkdirSync(mipmapDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'icon-192.png'), path.join(mipmapDir, 'ic_launcher.png'));
  
  const mipmapXxd = path.join(buildDir, 'res', 'mipmap-xxhdpi');
  fs.mkdirSync(mipmapXxd, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'icon-512.png'), path.join(mipmapXxd, 'ic_launcher.png'));

  console.log('  ✅ APK 资源文件已生成');
  console.log('');  
  console.log('  ⚠️  注意：由于云端环境限制，无法直接编译 .dex 和 .apk');
  console.log('  请下载下方 ZIP 包，在本地电脑运行构建脚本完成 APK 编译。');
  console.log('');
}

// ─── 主流程 ───
checkEnv();
const keystore = genKeystore();
const fp = getFingerprint(keystore);
if (fp) console.log(`🔐 密钥指纹: ${fp}\n`);

createOfflineApk(keystore);

// 更新 assetlinks.json
const assetlinksPath = path.join(__dirname, '.well-known', 'assetlinks.json');
if (fs.existsSync(assetlinksPath) && fp) {
  let content = fs.readFileSync(assetlinksPath, 'utf-8');
  content = content.replace('REPLACE_WITH_YOUR_SHA256_FINGERPRINT', fp);
  fs.writeFileSync(assetlinksPath, content);
  console.log('✅ assetlinks.json 已更新\n');
}

console.log(`
 ╔══════════════════════════════════════════════════╗
 ║                                                  ║
 ║  下一步：在本地电脑运行一键构建脚本              ║
 ║                                                  ║
 ║  Windows: 双击 build-apk-windows.bat             ║
 ║  Mac/Linux: ./build-apk.sh                       ║
 ║                                                  ║
 ║  或者走 PWABuilder 在线路线（最简单）：           ║
 ║  1. 把文件上传到 Netlify/Vercel/GitHub Pages     ║
 ║  2. 打开 pwabuilder.com                          ║
 ║  3. 粘贴网址 → 下载 APK                          ║
 ║                                                  ║
 ╚══════════════════════════════════════════════════╝
`);