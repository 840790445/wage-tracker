@echo off
REM ============================================
REM  工资累积器 → APK 一键打包脚本 (Windows)
REM ============================================
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   工资累积器 Android APK 打包工具    ║
echo  ╚══════════════════════════════════════╝
echo.

REM --- 检查 Node.js ---
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装：https://nodejs.org/
    pause
    exit /b 1
)

REM --- 安装 Bubblewrap ---
echo [1/5] 安装 Bubblewrap CLI...
call npm install -g @bubblewrap/cli
if %ERRORLEVEL% neq 0 (
    echo [错误] Bubblewrap 安装失败
    pause
    exit /b 1
)

REM --- 安装 JDK (如果没装) ---
where java >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [2/5] 需要安装 JDK 17+，请下载：https://adoptium.net/
    echo        安装后重新运行此脚本
    pause
    exit /b 1
)

echo [2/5] JDK 已安装，跳过

REM --- 安装 Android SDK ---
echo [3/5] 检查 Android SDK...
if not exist "%ANDROID_HOME%" (
    echo.
    echo  Android SDK 未设置。请按以下步骤操作：
    echo  1. 下载 Android Studio: https://developer.android.com/studio
    echo  2. 安装时勾选 "Android SDK"
    echo  3. 安装完成后设置环境变量 ANDROID_HOME
    echo     （默认路径: C:\Users\%USERNAME%\AppData\Local\Android\Sdk）
    echo  4. 重新打开此脚本
    echo.
    echo  或者在 Android Studio 里：
    echo  Settings → Languages & Frameworks → Android SDK
    echo  → SDK Platforms 勾选 "Android 14 (API 34)"
    echo  → SDK Tools 勾选 "Android SDK Build-Tools 34"
    pause
    exit /b 1
)

echo [3/5] Android SDK 已配置

REM --- 生成签名密钥 ---
echo [4/5] 生成签名密钥...
if not exist "android-keystore.jks" (
    keytool -genkey -v -keystore android-keystore.jks -alias wagetracker -keyalg RSA -keysize 2048 -validity 10000 -storepass wagetracker123 -keypass wagetracker123 -dname "CN=WageTracker, OU=Personal, O=WageTracker, L=Unknown, S=Unknown, C=CN"
    echo  密钥已生成（请记住密码：wagetracker123）
) else (
    echo  密钥已存在，跳过
)

REM --- 初始化并构建 ---
echo [5/5] 初始化 Bubblewrap 并构建 APK...
call bubblewrap init --manifest=twa-manifest.json --directory=android
if %ERRORLEVEL% neq 0 (
    echo [错误] Bubblewrap 初始化失败，请检查 twa-manifest.json
    pause
    exit /b 1
)

cd android
call bubblewrap build
if %ERRORLEVEL% neq 0 (
    echo [错误] APK 构建失败
    pause
    exit /b 1
)

cd ..

echo.
echo  ╔══════════════════════════════════════╗
echo  ║  ✅ APK 构建成功！                    ║
echo  ║                                      ║
echo  ║  文件位置: android\app\build\outputs ║
echo  ║         \apk\release\app-release.apk ║
echo  ╚══════════════════════════════════════╝
echo.
echo  把 app-release.apk 传到手机即可安装！
echo.
pause
