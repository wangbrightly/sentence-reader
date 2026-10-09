package app.sentencereader

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.WindowInsets
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.window.OnBackInvokedDispatcher
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import java.io.ByteArrayInputStream

/**
 * 整个 App 就是一个 WebView，显示和网页版同一份 index.html（构建时从仓库根目录复制进来）。
 * 页面从 https://appassets.androidplatform.net/ 这个固定地址加载，网页的 localStorage/IndexedDB
 * （阅读进度、上次那本书）因此能跨重启保留。
 * 系统切换深浅色时 Activity 会重建（manifest 不声明 uiMode），WebView 重新读主题，网页的
 * prefers-color-scheme 随之切换；进度和那本书由网页自己从本地存储恢复。
 */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private var incoming: Uri? = null
    private var pageReady = false
    private var pendingScript: String? = null
    private var chooserCallback: ValueCallback<Array<Uri>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val bg = getColor(R.color.reader_bg)
        val root = FrameLayout(this).apply { setBackgroundColor(bg) }
        web = WebView(this).apply { setBackgroundColor(bg) }
        root.addView(web)
        setContentView(root)
        // targetSdk 35+ 强制全面屏，页面会钻到状态栏底下，这里把系统栏的位置空出来
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            root.setOnApplyWindowInsetsListener { v, insets ->
                val b = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
                v.setPadding(b.left, b.top, b.right, b.bottom)
                WindowInsets.CONSUMED
            }
        }

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
        }
        web.webViewClient = Client()
        web.webChromeClient = Chrome()
        web.addJavascriptInterface(AppBridge(), JsBridge.APP_INTERFACE)
        web.loadUrl("https://${Router.HOST}/")
        // 重建（如切换深浅色）时不重复打开传进来的文件：网页会自己恢复上次那本书
        if (savedInstanceState == null) handleIntent(intent)
        if (Build.VERSION.SDK_INT >= 33) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { onBack() }
        }
    }

    @Deprecated("Android 13 以下才会走到这里")
    override fun onBackPressed() = onBack()

    /** 返回键：先让网页收起赞赏码/菜单；没有弹层可收时退到后台（和系统默认的返回效果一致）。 */
    private fun onBack() {
        web.evaluateJavascript(JsBridge.CLOSE_OVERLAY) { result ->
            if (BackHandling.shouldLeave(result)) moveTaskToBack(true)
        }
    }

    /** 网页调用：自动播放开着时保持屏幕常亮。JavascriptInterface 在后台线程被调用，切回主线程改窗口。 */
    private inner class AppBridge {
        @JavascriptInterface
        fun keepScreenOn(on: Boolean) = runOnUiThread {
            if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    /** 文件管理器「用…打开」或「分享」过来的书。 */
    private fun handleIntent(intent: Intent) {
        val uri = when (intent.action) {
            Intent.ACTION_VIEW -> intent.data
            Intent.ACTION_SEND ->
                if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
                else @Suppress("DEPRECATION") intent.getParcelableExtra(Intent.EXTRA_STREAM)
            else -> null
        } ?: return
        incoming = uri
        val mime = intent.type ?: contentResolver.getType(uri)
        val script = JsBridge.openIncoming(IncomingBook.fileName(displayName(uri), mime))
        if (pageReady) web.evaluateJavascript(script, null) else pendingScript = script
    }

    private fun displayName(uri: Uri): String? = runCatching {
        contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
            if (it.moveToFirst()) it.getString(0) else null
        }
    }.getOrNull() ?: uri.lastPathSegment

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != PICK_FILE) return
        // 取消时也必须回调 null，否则网页的文件选择框下次点不开
        chooserCallback?.onReceiveValue(data?.data?.takeIf { resultCode == RESULT_OK }?.let { arrayOf(it) })
        chooserCallback = null
    }

    private inner class Client : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            if (request.url.host != Router.HOST) return null
            return when (val r = Router.route(request.url.path ?: "/")) {
                is Route.Asset -> WebResourceResponse(r.mime, "utf-8", assets.open(r.name))
                Route.Incoming -> incoming?.let { uri ->
                    runCatching { contentResolver.openInputStream(uri) }.getOrNull()
                        ?.let { WebResourceResponse("application/octet-stream", null, it) }
                } ?: notFound()
                Route.NotFound -> notFound()
            }
        }

        override fun onPageFinished(view: WebView, url: String) {
            pageReady = true
            pendingScript?.let { view.evaluateJavascript(it, null) }
            pendingScript = null
        }

        // 页面里万一有外部链接，交给系统浏览器，不在 App 里打开
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (request.url.host == Router.HOST) return false
            runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
            return true
        }

        private fun notFound() =
            WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0)))
    }

    private inner class Chrome : WebChromeClient() {
        override fun onShowFileChooser(
            view: WebView,
            callback: ValueCallback<Array<Uri>>,
            params: FileChooserParams,
        ): Boolean {
            chooserCallback?.onReceiveValue(null)
            chooserCallback = callback
            // 不直接用网页的 accept=".md,.epub…"：安卓按 MIME 过滤，扩展名要换成类型列表
            val pick = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")
                .putExtra(Intent.EXTRA_MIME_TYPES, FilePicker.MIME_TYPES)
            startActivityForResult(pick, PICK_FILE)
            return true
        }
    }

    private companion object {
        const val PICK_FILE = 1
    }
}
