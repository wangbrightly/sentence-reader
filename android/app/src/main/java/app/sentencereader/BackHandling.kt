package app.sentencereader

object BackHandling {
    /** [jsResult] 是 evaluateJavascript(CLOSE_OVERLAY) 的返回值；只有网页明确说"收起了弹层"才留在 App 里。 */
    fun shouldLeave(jsResult: String?) = jsResult != "true"
}
