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

    @Test fun tipImageIsRelativePath() = assertTrue(html.contains("src=\"zanshang.png\""))
}
