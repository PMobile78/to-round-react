import org.gradle.api.tasks.testing.logging.TestExceptionFormat

// Plugins are declared once here, so every module shares one Kotlin Gradle plugin.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.google.services) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.jvm) apply false
}

// The JVM tests of every module run on JUnit 6 and print one summary line per run, e.g.
// "core tests: 87 passed, 0 failed, 0 skipped" or "app debug tests: 3 passed, 0 failed, 0 skipped".
subprojects {
    tasks.withType<Test>().configureEach {
        useJUnitPlatform()
        testLogging {
            events("failed")
            exceptionFormat = TestExceptionFormat.FULL
        }
        val variant = name.removePrefix("test").removeSuffix("UnitTest").lowercase()
        val label = listOf(project.name, variant, "tests").filter { it.isNotEmpty() }.joinToString(" ")
        addTestListener(object : TestListener {
            override fun beforeSuite(suite: TestDescriptor) {}

            override fun afterSuite(suite: TestDescriptor, result: TestResult) {
                if (suite.parent == null) {
                    println(
                        "$label: ${result.successfulTestCount} passed, ${result.failedTestCount} failed, " +
                            "${result.skippedTestCount} skipped",
                    )
                }
            }

            override fun beforeTest(testDescriptor: TestDescriptor) {}

            override fun afterTest(testDescriptor: TestDescriptor, result: TestResult) {}
        })
    }
}
