# 开发工作流进度（安卓版）

当前阶段：手机界面二期完成（2026-10-09），待用户决定是否推送 GitHub
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

## 优化一期（2026-10-08）
- [x] 点屏幕闪烁：根因 = WebView 默认 -webkit-tap-highlight-color rgba(51,181,229,0.4) 盖在可点的 #stage 上；CDP 运行时置透明后用户真机确认不闪；index.html body 加 transparent，IndexHtmlContractTest.tapHighlightDisabled 锁住；电脑 Chrome 修改前后截图逐像素一致
- [x] 手机界面放哪：用户选 (a) 共享 index.html，用 @media (pointer: coarse) 切换，不判断"是否在 App 里"
- [ ] 二期：等 Claude design 设计稿

## 优化二期：按设计稿实现手机界面（2026-10-08 起）
- 设计稿：Claude Design「Reader Mobile Spec」v1，导出在 ~/Downloads/逐句阅读器 手机界面设计稿.html（打包格式，要解包才能读）
- 用户拍板：字体用单独文件（fonts/，实际是 1 个可变字体 woff2 + OFL.txt）；建议新增只做 ①返回键收起弹层 ④自动播放常亮
- [x] 网页：手机界面全部写在 @media (pointer: coarse) 里，tests/mobile.test.mjs 20 个（含电脑版 3 状态逐像素比对基准 0b58bd7）
- [x] App：返回键（closeOverlay）、常亮（window.ReaderApp.keepScreenOn）、DayNight 主题跟随系统、字体打包；单元测试 23 个
- [x] 电脑渲染与设计稿 8 屏逐屏对照：布局/尺寸/颜色一致；差异：图标按稿面文字换成真 Phosphor duotone（箭头是三角、×±有底块），待用户看真机定
- [x] 真机（2026-10-09）：4 状态×深浅截图与设计稿对照一致；返回键先收弹层再退后台；自动播放时窗口带 KEEP_SCREEN_ON、停止后去掉；cmd uimode night no 切浅色后 Activity 重建、书和位置保留（已恢复用户原设置 auto）
- [x] 中文 600 字重在真机不粗：K60 只有 NotoSerifCJKsc-Regular、Chrome 不合成粗体、小米宋体(miclock-miserif-sc-vf)网页里调不到；用户选描边模拟：.android 类下 -webkit-text-stroke:0.025em，网页测试 22 个
- 图标：用户选保持 Phosphor duotone 现状
- 坑：手机熄屏(Dozing)时 CDP Page.captureScreenshot 会卡住；USB 抖动时 CDP 连接会中途断，脚本要检测「没做完就断开」并重试

## 发布 v0.1.0（2026-10-09）
- 正式签名：~/.android-keys/sentence-reader-release.jks（别名 sentence-reader），密码在钥匙串 sentence-reader-release-keystore；证书 SHA-256 CC:1A:6F:91:…:D6:69；打包用 android/release.sh
- 文件选择器只认 text/plain、text/markdown、text/x-markdown、application/epub+zip（K60 实测 .md→text/markdown），不放 octet-stream
- Release：https://github.com/wangbrightly/sentence-reader/releases/tag/v0.1.0 ，APK sha256 06762558…c6fb，下载回来核对一致
- v0.1.1（2026-10-09）：App 图标。书本从 pdf-reader 图标前景 PNG 原样剪下（原 HTML 源文件已随旧 scratchpad 丢失），上方换成蓝色渐变横条 + 琥珀色句号；APK sha256 bc168628…，下载核对一致
- v0.1.2（2026-10-09）：HTML 字符引用还原（decodeEntities，tests/parse.test.mjs）；APK sha256 794a18e4…
