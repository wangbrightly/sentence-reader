package app.sentencereader

sealed interface Route {
    data class Asset(val name: String, val mime: String) : Route
    /** 从文件管理器「用…打开」传进来的那本书的原始字节。 */
    data object Incoming : Route
    data object NotFound : Route
}

/** 把 WebView 请求的路径映射到 App 内资源。只放行白名单，其余一律 404。 */
object Router {
    const val HOST = "appassets.androidplatform.net"
    const val INCOMING_PATH = "/__incoming__"

    fun route(path: String): Route = when (path) {
        "/", "/index.html" -> Route.Asset("index.html", "text/html")
        "/zanshang.png" -> Route.Asset("zanshang.png", "image/png")
        INCOMING_PATH -> Route.Incoming
        else -> Route.NotFound
    }
}
