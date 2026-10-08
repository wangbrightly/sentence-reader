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

    @Test fun tipImageIsRelativePath() = assertTrue(html.contains("src=\"zanshang.png\""))
}
