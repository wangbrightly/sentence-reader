package app.sentencereader

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** App 依赖网页里的这几处约定；网页版改动破坏它们时，这里先报错。 */
class IndexHtmlContractTest {
    private val html = File("../../index.html").readText()

    @Test fun openFileIsGlobalFunction() {
        assertTrue(html.contains("\nasync function openFile(f)"))
        assertFalse(html.contains("type=\"module\""))
    }

    // 安卓 WebView/手机浏览器默认给可点元素盖一层 40% 蓝色高亮，整块阅读区可点，翻句时整屏闪一下
    @Test fun tapHighlightDisabled() =
        assertTrue(Regex("""-webkit-tap-highlight-color:\s*transparent""").containsMatchIn(html))

    // 返回键先让网页收起菜单/赞赏码；网页没有弹层可收时才退到后台
    @Test fun closeOverlayIsGlobalFunction() = assertTrue(html.contains("\nfunction closeOverlay()"))

    // 自动播放时网页通过这个名字通知 App 保持屏幕常亮
    @Test fun appInterfaceNameMatches() =
        assertTrue(html.contains("window.${JsBridge.APP_INTERFACE}") && html.contains("${JsBridge.APP_INTERFACE}.keepScreenOn("))

    // App 只放行 Router 白名单里的路径，网页引用的字体必须在白名单里
    @Test fun fontPathIsWhitelisted() {
        val url = Regex("""url\((fonts/[^)]+\.woff2)\)""").find(html)?.groupValues?.get(1)
        assertTrue("index.html 里没找到字体引用", url != null)
        assertTrue(Router.route("/$url") is Route.Asset)
        assertTrue(File("../../$url").isFile)
    }

    @Test fun tipImageIsRelativePath() = assertTrue(html.contains("src=\"zanshang.png\""))
}
