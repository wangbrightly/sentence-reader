# 逐句阅读器

一句一屏地读 Markdown / EPUB / TXT。当前句大字居中，前后句淡色提示，按空格翻页——像看字幕一样读书。

**在线使用：** https://wangbrightly.github.io/sentence-reader/

## 用法

打开页面，把 `.md`、`.epub` 或 `.txt` 文件拖进窗口（或点「打开文件」）。

| 操作 | 按键 |
|---|---|
| 下一句 / 上一句 | `空格` `→` / `←`，或点屏幕右半边 / 左半边 |
| 下一章 / 上一章 | `]` / `[`，或用顶部章节下拉框 |
| 开头 / 结尾 | `Home` / `End` |
| 自动播放 | `P`（停留时间按字数计算，速度可调） |

会记住上次读的书和读到哪一句，下次打开直接续读。

## 隐私

整个阅读器只有一个 HTML 文件，没有服务器，也不联网。书的内容只在你自己的浏览器里解析和保存，不会上传到任何地方。也可以下载 `index.html` 到本地双击使用。

## 局限

- 只显示文字：插图只保留图片说明，公式和注释链接会丢失
- 按标点断句，`Dr.` 这类英文缩写偶尔会被误切
- 不支持带 DRM 加密的 EPUB

## 许可证

MIT

## 赞赏

觉得好用的话，可以微信扫码请作者喝杯咖啡 ☕

<img src="zanshang.png" alt="微信赞赏码" width="260">

## 安卓版

`android/` 目录是安卓 App：WebView 直接显示本仓库的 `index.html`（每次编译自动复制进去），支持 App 内打开文件和文件管理器「用…打开」md/epub/txt，阅读进度跨重启保留。

**下载安装：** 到 [Releases](https://github.com/wangbrightly/sentence-reader/releases) 下载最新的 `sentence-reader-v*.apk`，在手机上打开安装（需允许「安装未知来源应用」）。

自己编译：

```sh
cd android
JAVA_HOME=/usr/local/opt/openjdk@21 gradle testDebugUnitTest assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

网页端手机界面测试：`node --test tests/*.test.mjs`（需要本机装有 Puppeteer）。

## 开发统计

截至 v0.1.2（2026-10-09），数字均由 `git` 记录统计得出。

| 项目 | 数据 |
|---|---|
| 开发跨度 | 2026-10-08 13:18 首次提交 → 2026-10-09 16:42 发布 v0.1.2，共 2 天 |
| 提交次数 | 15 次（10-08：6 次，10-09：9 次） |
| 网页版 | 单文件 `index.html`，564 行（不含空行），41 KB，零第三方依赖 |
| 安卓版 | Kotlin 6 个文件，220 行；除测试框架外零第三方依赖 |
| 自动化测试 | 共 54 个：网页 29 个（Puppeteer，含电脑版逐像素比对）、安卓 25 个（JUnit） |
| 发布版本 | 3 个：v0.1.0 首发、v0.1.1 新图标、v0.1.2 修复转义字符乱码 |
| 安装包大小 | 约 0.8 MB |
| 真机验证 | Redmi K60（Android 15） |

**开发过程**

| 时间 | 里程碑 |
|---|---|
| 10-08 13:18 | 网页版：一句一屏阅读 Markdown / EPUB / TXT |
| 10-08 21:47 | 安卓版：WebView 套壳复用同一份网页，支持「用…打开」 |
| 10-08 22:50 | 修复手机上点屏幕整片闪蓝 |
| 10-08 23:55 | 手机界面：按 Claude Design 设计稿实现底栏、菜单、深浅色 |
| 10-09 10:51 | 文件选择器只显示 Markdown / EPUB / TXT |
| 10-09 11:03 | 发布 v0.1.0（正式签名） |
| 10-09 12:52 | 发布 v0.1.1：App 图标 |
| 10-09 16:42 | 发布 v0.1.2：转义字符（如 `&#xA;`）不再显示成乱码 |

开发方式：由 [Claude Code](https://claude.com/claude-code) 编写代码与测试，界面设计稿出自 Claude Design，每个版本都在真机上验收。
