package app.sentencereader

object IncomingBook {
    private val SUPPORTED = Regex("""\.(md|markdown|txt|epub)$""", RegexOption.IGNORE_CASE)
    private const val EPUB_MIME = "application/epub+zip"

    fun isSupported(name: String) = SUPPORTED.containsMatchIn(name)

    /** 网页靠后缀判断格式：.epub 按压缩包解析，其余按文本。名字缺失或缺后缀时用 MIME 补上。 */
    fun fileName(rawName: String?, mime: String?): String {
        val name = rawName?.takeIf { it.isNotBlank() } ?: "未命名"
        if (isSupported(name)) return name
        return name + if (mime == EPUB_MIME) ".epub" else ".txt"
    }
}
