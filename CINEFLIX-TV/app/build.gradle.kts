plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.cineflix.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.cineflix.tv"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
