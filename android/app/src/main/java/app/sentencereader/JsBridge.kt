package app.sentencereader

object JsBridge {
    /** 让网页取回传进来的书，交给网页自己的 openFile()（index.html 里的全局函数）。 */
    fun openIncoming(fileName: String): String =
        "fetch('${Router.INCOMING_PATH}').then(r => r.blob())" +
            ".then(b => openFile(new File([b], ${jsString(fileName)})));"

    private fun jsString(s: String) = buildString {
        append('"')
        for (c in s) when (c) {
            '"' -> append("\\\"")
            '\\' -> append("\\\\")
            '\n' -> append("\\n")
            '\r' -> append("\\r")
            '/' -> append("\\/")
            ' ' -> append("\\u2028")
            ' ' -> append("\\u2029")
            else -> if (c < ' ') append("\\u%04x".format(c.code)) else append(c)
        }
        append('"')
    }
}
