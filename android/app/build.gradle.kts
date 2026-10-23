plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.google.services)
    alias(libs.plugins.kotlin.compose)
}

// The display name is set only in src/appName.js (CLAUDE.md); the build takes it from there.
val appName: String = rootDir.resolve("../src/appName.js").readText()
    .let { Regex("""APP_NAME = '([^']+)'""").find(it) }
    ?.groupValues?.get(1)
    ?: error("APP_NAME not found in src/appName.js")

// The release key stays outside the repository: its path and passwords come from Gradle
// properties, normally ~/.gradle/gradle.properties (docs/android.md). Without them the release
// build is left unsigned.
val releaseStoreFile: String? = providers.gradleProperty("todoround.release.storeFile").orNull

// A debug build works with the local Firebase emulators instead of the project when asked:
// -Ptodoround.emulators=true (docs/android.md).
val emulators: Boolean = providers.gradleProperty("todoround.emulators").orNull == "true"

android {
    namespace = "com.pmobile78.todoround"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.pmobile78.todoround"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0"
        resValue("string", "app_name", appName)
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (releaseStoreFile != null) {
            create("release") {
                storeFile = file(releaseStoreFile)
                storePassword = providers.gradleProperty("todoround.release.storePassword").get()
                keyAlias = providers.gradleProperty("todoround.release.keyAlias").get()
                keyPassword = providers.gradleProperty("todoround.release.keyPassword").get()
            }
        }
    }

    buildTypes {
        debug {
            buildConfigField("boolean", "EMULATORS", emulators.toString())
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
            signingConfig = signingConfigs.findByName("release")
            buildConfigField("boolean", "EMULATORS", "false")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
        compose = true
        resValues = true
    }

    // Firebase's exceptions check their message with android.text.TextUtils, which plain JVM tests
    // only have as a stub: let the stubs answer with default values instead of throwing.
    testOptions {
        unitTests.isReturnDefaultValues = true
    }

    // The app speaks English and Ukrainian only, also in the texts of its libraries.
    androidResources {
        localeFilters += listOf("en", "uk")
    }
}

dependencies {
    implementation(project(":core"))
    implementation(platform(libs.androidx.compose.bom))
    implementation(platform(libs.firebase.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.firebase.auth)
    implementation(libs.firebase.firestore)
    implementation(libs.kotlinx.coroutines.play.services)
    debugImplementation(libs.androidx.compose.ui.tooling)
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.runner)
}
