import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// Data contract v2 in plain Kotlin: no Android, no Firebase (spec, section 4).
plugins {
    alias(libs.plugins.kotlin.jvm)
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        // Compile against the Java 17 API, not the JDK running Gradle: a newer JDK would bind calls
        // such as removeFirst() to Java 21 methods, which Android before 15 does not have.
        freeCompilerArgs.add("-Xjdk-release=17")
    }
}

dependencies {
    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.kotlinx.serialization.json)
    testRuntimeOnly(libs.junit.platform.launcher)
}

// The tests read the shared examples of the repository; a changed example reruns them.
val contractDir = rootDir.resolve("../contract").normalize()

tasks.test {
    systemProperty("todoround.contractDir", contractDir.path)
    inputs.dir(contractDir).withPathSensitivity(PathSensitivity.RELATIVE).withPropertyName("contract")
}
