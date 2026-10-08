# 开发工作流进度（安卓版）

当前阶段：阶段五（等手机 adb 连上做真机验证）
上次更新：2026-10-08

## 阶段一：需求/边界确认
- [ ] 边界清单已产出，每条都有一手信息源
  - WebView 支持 DecompressionStream：MDN 表显示 Chrome/WebView Android 80 起支持该 API；`deflate-raw` 格式的具体起始版本未查到 → 阶段三在真机运行时检测
  - 手机型号 / Android / WebView 版本：待手机接上 adb 后读取

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
- [ ] 已在设备可及时间窗口完成
