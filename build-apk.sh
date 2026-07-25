#!/bin/bash
# ============================================
#  工资累积器 → APK 一键打包脚本 (macOS / Linux)
# ============================================
set -e

echo ""
echo " ╔══════════════════════════════════════╗"
echo " ║   工资累积器 Android APK 打包工具    ║"
echo " ╚══════════════════════════════════════╝"
echo ""

# --- 检查 Node.js ---
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装：https://nodejs.org/"
    exit 1
fi

# --- 安装 Bubblewrap ---
echo "📦 [1/5] 安装 Bubblewrap CLI..."
sudo npm install -g @bubblewrap/cli

# --- 检查 JDK ---
if ! command -v java &> /dev/null; then
    echo "❌ 未检测到 Java，正在尝试安装 OpenJDK 17..."
    if command -v brew &> /dev/null; then
        brew install openjdk@17
    elif command -v apt &> /dev/null; then
        sudo apt install -y openjdk-17-jdk
    else
        echo "请手动安装 JDK 17+：https://adoptium.net/"
        exit 1
    fi
fi
echo "✅ [2/5] JDK 已就绪"

# --- 检查 Android SDK ---
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo ""
    echo "⚠️  未检测到 ANDROID_HOME 环境变量"
    echo "   请安装 Android Studio: https://developer.android.com/studio"
    echo "   并安装:"
    echo "   - Android SDK Platform 34"
    echo "   - Android SDK Build-Tools 34"
    echo "   - Android SDK Command-line Tools"
    echo ""
    echo "   安装后设置："
    echo '   export ANDROID_HOME="$HOME/Library/Android/sdk"  # macOS'
    echo '   export ANDROID_HOME="$HOME/Android/Sdk"          # Linux'
    echo '   export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"'
    echo ""
    exit 1
fi
echo "✅ [3/5] Android SDK 已配置 ($ANDROID_HOME)"

# --- 生成签名密钥 ---
echo "🔑 [4/5] 生成签名密钥..."
if [ ! -f "android-keystore.jks" ]; then
    keytool -genkey -v \
        -keystore android-keystore.jks \
        -alias wagetracker \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass wagetracker123 \
        -keypass wagetracker123 \
        -dname "CN=WageTracker, OU=Personal, O=WageTracker, L=Unknown, S=Unknown, C=CN"
    echo "   密钥已生成（密码：wagetracker123，请妥善保存）"
else
    echo "   密钥已存在，跳过"
fi

# --- 初始化并构建 ---
echo "🔨 [5/5] 构建 APK..."
bubblewrap init --manifest=twa-manifest.json --directory=android
cd android
bubblewrap build

cd ..

echo ""
echo " ╔══════════════════════════════════════╗"
echo " ║  ✅ APK 构建成功！                    ║"
echo " ║                                      ║"
echo " ║  文件: android/app/build/outputs/     ║"
echo " ║       apk/release/app-release.apk    ║"
echo " ╚══════════════════════════════════════╝"
echo ""
echo "  把 app-release.apk 传到手机即可安装！"
