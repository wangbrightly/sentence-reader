#!/bin/zsh
# 打正式签名的安装包：./release.sh  →  build/sentence-reader-v<版本号>.apk
# 签名文件在 ~/.android-keys/（不在仓库里，务必另行备份），密码在 Mac 钥匙串 sentence-reader-release-keystore
set -e
cd "${0:A:h}"
export JAVA_HOME=/usr/local/opt/openjdk@21
export READER_KEYSTORE=~/.android-keys/sentence-reader-release.jks
export READER_KEYSTORE_PASSWORD=$(security find-generic-password -s sentence-reader-release-keystore -w)
gradle testDebugUnitTest assembleRelease -q
VERSION=$(sed -n 's/.*versionName = "\(.*\)".*/\1/p' app/build.gradle.kts)
mkdir -p build && cp app/build/outputs/apk/release/app-release.apk "build/sentence-reader-v$VERSION.apk"
~/Library/Android/sdk/build-tools/36.1.0/apksigner verify --print-certs "build/sentence-reader-v$VERSION.apk" | grep -E "SHA-256|DN"
echo "build/sentence-reader-v$VERSION.apk"
