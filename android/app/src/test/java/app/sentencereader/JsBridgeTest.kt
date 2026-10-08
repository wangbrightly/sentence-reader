package app.sentencereader

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class JsBridgeTest {
    @Test fun callsPageOpenFileWithIncomingBytes() {
        val js = JsBridge.openIncoming("书.epub")
        assertTrue(js.contains("fetch('${Router.INCOMING_PATH}')"))
        assertTrue(js.contains("openFile(new File("))
        assertTrue(js.contains("\"书.epub\""))
    }

    // 文件名是外部输入，必须不能跳出字符串字面量
    @Test fun escapesHostileNames() {
        val js = JsBridge.openIncoming("a\"b\\c'd\n</script> .md")
        assertTrue(js.contains("\"a\\\"b\\\\c'd\\n<\\/script>\\u2028.md\""))
        assertFalse(js.contains("\n</script>"))
    }
}
