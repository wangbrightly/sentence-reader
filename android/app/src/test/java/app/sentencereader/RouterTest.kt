package app.sentencereader

import org.junit.Assert.assertEquals
import org.junit.Test

class RouterTest {
    @Test fun rootServesIndexHtml() =
        assertEquals(Route.Asset("index.html", "text/html"), Router.route("/"))

    @Test fun indexHtmlServed() =
        assertEquals(Route.Asset("index.html", "text/html"), Router.route("/index.html"))

    @Test fun tipImageServed() =
        assertEquals(Route.Asset("zanshang.png", "image/png"), Router.route("/zanshang.png"))

    @Test fun fontServed() = assertEquals(
        Route.Asset("fonts/SourceSerif4-latin.woff2", "font/woff2"),
        Router.route("/fonts/SourceSerif4-latin.woff2"),
    )

    @Test fun incomingBookPath() =
        assertEquals(Route.Incoming, Router.route(Router.INCOMING_PATH))

    @Test fun unknownPathIsNotFound() =
        assertEquals(Route.NotFound, Router.route("/../secret"))

    @Test fun favicon404() =
        assertEquals(Route.NotFound, Router.route("/favicon.ico"))
}
