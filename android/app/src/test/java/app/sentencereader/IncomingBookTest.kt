package app.sentencereader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class IncomingBookTest {
    @Test fun keepsNormalNames() {
        assertEquals("三体.epub", IncomingBook.fileName("三体.epub", "application/epub+zip"))
        assertEquals("笔记.md", IncomingBook.fileName("笔记.md", "application/octet-stream"))
    }

    // 有的文件管理器传过来的名字不带扩展名，网页靠 .epub 后缀决定按压缩包解析
    @Test fun addsEpubSuffixFromMime() =
        assertEquals("书.epub", IncomingBook.fileName("书", "application/epub+zip"))

    @Test fun missingNameFallsBack() {
        assertEquals("未命名.epub", IncomingBook.fileName(null, "application/epub+zip"))
        assertEquals("未命名.txt", IncomingBook.fileName("", "text/plain"))
    }

    @Test fun supportedIsCaseInsensitive() {
        assertTrue(IncomingBook.isSupported("A.EPUB"))
        assertTrue(IncomingBook.isSupported("a.markdown"))
        assertTrue(IncomingBook.isSupported("a.md"))
        assertTrue(IncomingBook.isSupported("a.txt"))
        assertFalse(IncomingBook.isSupported("a.pdf"))
    }
}
