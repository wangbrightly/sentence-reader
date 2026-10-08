package app.sentencereader

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BackHandlingTest {
    @Test fun pageClosedAnOverlayStays() = assertFalse(BackHandling.shouldLeave("true"))

    @Test fun nothingToCloseLeaves() = assertTrue(BackHandling.shouldLeave("false"))

    // 页面还没加载完或脚本出错时，evaluateJavascript 回调 "null"：按普通返回处理，不能卡住用户
    @Test fun brokenPageLeaves() {
        assertTrue(BackHandling.shouldLeave("null"))
        assertTrue(BackHandling.shouldLeave(null))
    }

    @Test fun scriptCallsPageFunction() = assertEquals("closeOverlay()", JsBridge.CLOSE_OVERLAY)
}
