// Plugins are declared once here, so every module shares one Kotlin Gradle plugin.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.jvm) apply false
}
