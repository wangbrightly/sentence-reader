plugins {
    id("com.android.application")
}

android {
    namespace = "app.sentencereader"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.sentencereader"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
}

// 网页版的 index.html 和赞赏码图片只有一份，放在仓库根目录；每次构建前复制进 App，两边永远一致。
abstract class SyncWebAssets : DefaultTask() {
    @get:InputFiles abstract val sources: ConfigurableFileCollection
    @get:OutputDirectory abstract val outputDir: DirectoryProperty
    @get:Inject abstract val fs: FileSystemOperations

    @TaskAction fun sync() {
        fs.sync { from(sources); into(outputDir) }
    }
}

val syncWebAssets = tasks.register<SyncWebAssets>("syncWebAssets") {
    sources.from(rootProject.file("../index.html"), rootProject.file("../zanshang.png"))
}

androidComponents.onVariants { variant ->
    variant.sources.assets?.addGeneratedSourceDirectory(syncWebAssets, SyncWebAssets::outputDir)
}
