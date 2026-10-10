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
        versionCode = 4
        versionName = "0.1.3"
    }

    // 正式签名：签名文件和密码都不进仓库，由 release.sh 从 Mac 钥匙串取出后通过环境变量传进来
    val releaseKeystore = System.getenv("READER_KEYSTORE")
    if (releaseKeystore != null) {
        signingConfigs.create("release") {
            storeFile = file(releaseKeystore)
            storePassword = System.getenv("READER_KEYSTORE_PASSWORD")
            keyAlias = "sentence-reader"
            keyPassword = System.getenv("READER_KEYSTORE_PASSWORD")
        }
        buildTypes.getByName("release").signingConfig = signingConfigs.getByName("release")
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
    @get:InputDirectory abstract val fontsDir: DirectoryProperty
    @get:OutputDirectory abstract val outputDir: DirectoryProperty
    @get:Inject abstract val fs: FileSystemOperations

    @TaskAction fun sync() {
        fs.sync {
            from(sources)
            from(fontsDir) { into("fonts") }   // 手机界面的 Source Serif 4 字体及其 OFL 许可证
            into(outputDir)
        }
    }
}

val syncWebAssets = tasks.register<SyncWebAssets>("syncWebAssets") {
    sources.from(rootProject.file("../index.html"), rootProject.file("../zanshang.png"))
    fontsDir.set(rootProject.layout.projectDirectory.dir("../fonts"))
}

androidComponents.onVariants { variant ->
    variant.sources.assets?.addGeneratedSourceDirectory(syncWebAssets, SyncWebAssets::outputDir)
}
