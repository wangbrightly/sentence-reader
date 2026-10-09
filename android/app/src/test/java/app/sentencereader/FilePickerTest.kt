package app.sentencereader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class FilePickerTest {
    // Redmi K60（Android 15）实测媒体库给的类型：.md/.markdown → text/markdown，.txt → text/plain，.epub → application/epub+zip
    @Test fun onlyBookTypes() = assertEquals(
        setOf("text/plain", "text/markdown", "text/x-markdown", "application/epub+zip"),
        FilePicker.MIME_TYPES.toSet(),
    )

    // octet-stream 是"未知类型"兜底，放进来就会让 zip、apk 等任意文件都能选
    @Test fun noCatchAll() {
        assertFalse(FilePicker.MIME_TYPES.any { it.endsWith("/*") || it == "application/octet-stream" })
    }
}
