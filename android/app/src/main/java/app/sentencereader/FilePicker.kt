package app.sentencereader

/** 系统文件选择器只显示这几种类型（安卓按 MIME 过滤，不看扩展名）。 */
object FilePicker {
    val MIME_TYPES = arrayOf("text/plain", "text/markdown", "text/x-markdown", "application/epub+zip")
}
