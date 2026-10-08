# 开发工作流进度（安卓版）

当前阶段：完成（2026-10-08）
上次更新：2026-10-08

## 阶段一：需求/边界确认
- [x] 边界清单已产出，每条都有一手信息源
  - WebView 支持 DecompressionStream：MDN 表显示 Chrome/WebView Android 80 起支持该 API；`deflate-raw` 格式的具体起始版本未查到 → 2026-10-08 真机实测 WebView 149 支持
  - 手机：Redmi K60，Android 15（SDK 35），WebView com.google.android.webview 149.0.7827.91（adb 实测）

## 阶段二：技术选型
- [x] 方案（2026-10-08 用户确认）：WebView 套壳，index.html 构建时复制进 assets，WebViewAssetLoader 加载，零第三方依赖。实际实现没用 androidx.webkit，自己在 shouldInterceptRequest 里按白名单路由（Router.kt）

## 阶段三：环境工具链验证
- [x] 一次性实测编译通过（JAVA_HOME=/usr/local/opt/openjdk@21，系统 gradle 9.7.1，AGP 9.3.1）
- 新增依赖记录（每条都要重新核实兼容性）：
  - 无（只有 junit 测试依赖）

## 阶段四：TDD 循环
- 当前增量：Router / IncomingBook / JsBridge / index.html 约定测试，共 14 个
- [x] red → green
- [x] git status 干净

## 阶段五：真机验证收尾
- [x] 已在设备可及时间窗口完成（2026-10-08）
  - 电脑经 WebView 调试接口实测：md/txt/epub 解析、杀进程重启后进度保留
  - 用户手动实测：文件管理「用…打开」md/epub、App 内「打开文件」选 txt，全部正常
  - 注意：adb screencap 截 WebView 会出现大片白屏，是截图假象（用户确认屏幕实际正常）；看画面改用 CDP Page.captureScreenshot
  - USB 偶发断线，adb 命令前先 wait-for-device
