# Этап 1.1: проект и ядро контракта — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать Android-проект `android/` — Gradle Wrapper, каталог версий, модули `core` и `app` — и ядро контракта v2 на Kotlin, проверенное на общих примерах `contract/`. Приложение-заглушка в цветах To-Round собирается в отладочном и релизном вариантах и открывается на эмуляторе.

**Architecture:** `core` — чистый Kotlin (JVM) без Android и Firebase: схема контракта (константы, лимиты, перечисления с их строковыми значениями), время на `java.time` (эталон контракта), проверка записей в форме бэкапа по правилам и с текстами ошибок `src/contract/validate.js`, модели задачи, категории и настроек. Тесты JUnit читают `contract/` так, как Firestore отдаёт данные Android: целые — `Long`, дробные — `Double`. `app` — Android-приложение на Compose и Material 3 с одним экраном: название берётся из `src/appName.js`, цвета — из дизайна «classic» веба, иконка — три пузыря веб-иконки вектором. Релизная сборка подписывается ключом, который хранится вне репозитория.

**Tech Stack:** Gradle 9.8.2 (Wrapper), Android Gradle Plugin 9.4.1 со встроенным Kotlin, Kotlin 2.4.21, Jetpack Compose (BOM 2026.09.00), Material 3, activity-compose 1.13.0, JUnit 6.1.3, kotlinx-serialization-json 1.12.0 (только в тестах), JDK — JBR 25 из Android Studio. SDK: `minSdk` 26, `compileSdk` и `targetSdk` 37.

**Spec:** [docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md](../specs/2026-10-22-stage-1-android-foundation-design.md) — разделы 2.2, 3, 4, 9, 10. Обзор подпланов — [2026-10-22-stage-1-overview.md](2026-10-22-stage-1-overview.md). Контракт данных — [2026-10-14-stage-0-data-contract-v2-design.md](../specs/2026-10-14-stage-0-data-contract-v2-design.md), разделы 3, 4.2, 10, 11. Весь код плана прогнан в черновой копии ветки: числа тестов и строки `Expected` — настоящие; обе сборки приложения проверены на эмуляторе.

## Global Constraints

- Ветка `stage-1-android-foundation`; спецификация и обзор уже в ней. В `main` не коммитить, ничего не пушить без слова владельца.
- Веб, `contract/`, правила Firestore, Cloud Functions и CI не меняются. Исключение — документация в задаче 6: `CLAUDE.md`, `docs/README.md`, `contract/README.md`.
- Все команды — из корня репозитория; Gradle — `android/gradlew -p android …`.
- Gradle работает на JBR из Android Studio: строка `org.gradle.java.home=/media/big_disk/android/android-studio/jbr` в `~/.gradle/gradle.properties` (задача 1, шаг 1). Файл вне репозитория; в нём же позже живут настройки релизного ключа.
- Сеть нужна: первая сборка скачивает Gradle и библиотеки, а недостающие пакеты SDK (платформа Android 37.0, Build-Tools 36) AGP ставит сам — лицензии SDK уже приняты.
- Памяти 14 ГБ. Эмулятор не запускать вместе с Android Studio и во время сборки: перед ним — `android/gradlew -p android --stop`, после проверки — `adb -e emu kill`. Приложение на эмулятор ставить через `adb -e install`: `:app:installDebug` при работающем эмуляторе шёл на этой машине больше 10 минут. Данные эмулятора сохраняются между запусками, поэтому перед установкой прежнее приложение удаляется.
- `adb` — всегда с выбором устройства: `adb -e` — эмулятор, `adb -d` — телефон на кабеле. Без этого при подключённом телефоне команды падают с `more than one device/emulator`.
- Долгие команды: первая сборка `app` и сборки R8 идут до 5 минут, загрузка эмулятора — около 2 минут. Тайм-аут таких команд — 10 минут. Ожидать загрузку циклом `until …; do sleep 5; done` в одной команде или инструментом ожидания, но не отдельной командой `sleep`.
- Версии библиотек и плагинов не менять. Если Lint вдруг сообщит только о вышедших новых версиях (`GradleDependency`, `AndroidGradlePluginVersion`), записать это в журнал исполнения и продолжать.
- `~/.gradle/gradle.properties` целиком не выводить (`cat`, `less`, `grep` без `^`): позже в нём будут пароли релизного ключа. Строки смотреть по одной.
- Код в плане взят из проверенной черновой копии без правок. Новые файлы даны полностью (перед блоком — строка с путём); изменения существующих — блоками `diff` относительно состояния после предыдущей задачи: блок можно сохранить во временный файл и применить `git apply <файл>` из корня репозитория. Блоки кода ограничены четырьмя обратными кавычками. Файлы Gradle Wrapper не набираются, а генерируются командой (задача 1).
- Kotlin — официальный стиль (`kotlin.code.style=official`): 4 пробела, запятые после последнего элемента многострочных списков. Комментарии — на английском, как в коде веба. Особые символы задаются кодом (`Char(0xA0)`, `0x2028`), а не escape-последовательностями `\u…`: инструменты могут подставить вместо них сам символ.
- Каждая задача заканчивается зелёным `android/gradlew -p android check`; с задачи 5 он включает Android Lint.
- Каждая сборка печатает `[Incubating] Problems report is available at: …/android/build/reports/problems/problems-report.html`. В отчёте одно предупреждение — `The Configuration.setVisible(boolean) method has been deprecated` — от плагина Kotlin, а не от скриптов проекта. Это не ошибка; строки `Expected` ниже его не упоминают.

## Review Focus

- **Тексты ошибок совпадают с вебом.** В черновике списки ошибок `validateTask`, `validateCategory` и `validateSettings` совпали с `src/contract/validate.js` построчно на всех 43 примерах `tasks.json`, `categories.json` и `settings.json` (временный тест-сравнение в план не входит). Самые тонкие места закреплены тестами задачи 3: «поля нет» ≠ `null`, целое `45.0`, пробелы JavaScript в названии.
- **Зона, которой нет в базе часовых поясов телефона.** `validateTask` её отклоняет, а с `acceptUnknownZone = true` принимает любую строку из 1–64 символов, как правила Firestore. Тест «a zone this device does not know passes when the caller accepts it, as the rules do» — в задаче 3; модель — в задаче 4.
- **Время с микро- и наносекундами** (так его пишет `Instant.toString()`) принимается и не теряется. Тесты — в задачах 3 и 4.
- **Название не задано литералом.** Сборка читает его из `src/appName.js`; без строки `APP_NAME = '…'` сборка падает с понятной ошибкой. Проверка — в задаче 5 (`aapt2 dump badging`).
- **Методы Java 21 на Android 12.** `core` компилируется против JDK 25; без `-Xjdk-release=17` вызов `removeFirst()` привязался бы к `java.util.List.removeFirst` (Java 21) и упал бы на Redmi 9. Флаг — в задаче 1, проверка байт-кодом — в черновике.
- **Релизный ключ не попадает в репозиторий.** Без свойств `toround.release.*` релизная сборка не подписана; `*.jks` и `*.keystore` в `android/` игнорируются. Проверка одноразовым ключом — в задаче 6.

## Структура файлов

| Файл | Ответственность |
|---|---|
| `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/gradle.properties` | сборка: репозитории, модули, общие плагины, память Gradle |
| `android/gradle/libs.versions.toml` | версии библиотек и плагинов |
| `android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/*` | Gradle Wrapper 9.8.2 (генерируется) |
| `android/.gitignore` | результаты сборки, `google-services.json`, ключи |
| `android/core/build.gradle.kts` | модуль `core`: Kotlin/JVM, JUnit; тесты получают путь к `contract/` |
| `android/core/src/main/kotlin/…/core/contract/Schema.kt` | константы, лимиты и перечисления контракта; `fromWire` |
| `android/core/src/main/kotlin/…/core/contract/Time.kt` | местное время и зоны, как раздел 4.2 контракта |
| `android/core/src/main/kotlin/…/core/contract/Validate.kt` | проверка записей задачи, категории и настроек |
| `android/core/src/main/kotlin/…/core/model/*.kt` | модели `Task`, `Category`, `Settings` и их построение из записей |
| `android/core/src/test/kotlin/…/core/Contract.kt` | примеры `contract/` в виде значений Kotlin |
| `android/core/src/test/kotlin/…/core/**/*Test.kt` | тесты ядра на примерах |
| `android/app/build.gradle.kts` | модуль `app`: SDK, название из `src/appName.js`, языки, R8, подпись релиза |
| `android/app/src/main/AndroidManifest.xml`, `res/xml/*` | приложение, иконка, тема окна; без бэкапа и переноса данных |
| `android/app/src/main/kotlin/…/MainActivity.kt` | экран-заглушка этапа 1.1 |
| `android/app/src/main/kotlin/…/ui/theme/Theme.kt` | Material 3 в цветах «classic», светлая и тёмная |
| `android/app/src/main/res/**` | строки en/uk, цвета, тема окна, иконка |
| `docs/android.md` | сборка, телефон, эмулятор, релизный ключ |
| `CLAUDE.md`, `docs/README.md`, `contract/README.md` | (изменение) ссылки на Android и его команды |

Пакеты: `…` — это `com/pmobile78/toround`.

---

### Task 1: Gradle-проект и схема контракта

**Files:**
- Create: `android/.gitignore`, `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/gradle.properties`, `android/gradle/libs.versions.toml`, `android/core/build.gradle.kts`
- Create (команда): `android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/gradle-wrapper.jar`, `android/gradle/wrapper/gradle-wrapper.properties`
- Create: `android/core/src/main/kotlin/com/pmobile78/toround/core/contract/Schema.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/toround/core/Contract.kt`, `android/core/src/test/kotlin/com/pmobile78/toround/core/contract/SchemaTest.kt`

**Interfaces:**
- Consumes: `contract/palette.json`.
- Produces (`com.pmobile78.toround.core.contract`): `SCHEMA_VERSION = 2`, `DEFAULT_RADIUS = 45`, `PALETTE: List<String>`; `object Limits` (`ID_MAX_LENGTH`, `TITLE_MAX_LENGTH`, `DESCRIPTION_MAX_LENGTH`, `CATEGORY_NAME_MAX_LENGTH`, `MAX_REMINDERS`, `REMINDER_STEP_MINUTES`, `REMINDER_MAX_MINUTES`, `REPEAT_EVERY_MAX`, `RADIUS_MIN`, `RADIUS_MAX`, `FONT_SIZE_MIN`, `FONT_SIZE_MAX`); `interface WireValue { val wire: String }`; `inline fun <reified E> fromWire(wire: Any?): E?` для перечислений `TaskStatus`, `RepeatUnit`, `ThemeMode`, `Design`, `Language`, `MainView`, `SortField`, `SortOrder`.
- Produces для тестов (`com.pmobile78.toround.core.Contract`): `read(path): Any?`, `group(path, key): List<Map<String, Any?>>`, `cases(path, key): List<Pair<String, Any?>>` — значения: `Map`, `List`, `String`, `Boolean`, `Long`, `Double`, `null`.

- [ ] **Step 1: Gradle на JBR Android Studio**

Строка добавляется, только если её ещё нет:

```bash
grep -qs '^org.gradle.java.home=' ~/.gradle/gradle.properties || printf '%s\n' '# Machine settings of Gradle for ToDo-Round (docs/android.md); kept out of the repository.' '# Gradle runs on the JDK of Android Studio, as Android Studio itself does.' 'org.gradle.java.home=/media/big_disk/android/android-studio/jbr' >> ~/.gradle/gradle.properties
grep '^org.gradle.java.home=' ~/.gradle/gradle.properties
```

Expected: `org.gradle.java.home=/media/big_disk/android/android-studio/jbr`.

- [ ] **Step 2: Gradle 9.8.2 для генерации Wrapper**

Скачивается один раз и проверяется по контрольной сумме с `services.gradle.org`:

```bash
Z=/media/big_disk/android/downloads/gradle-9.8.2-bin.zip
mkdir -p /media/big_disk/android/downloads && { [ -f $Z ] || curl -fL -o $Z https://services.gradle.org/distributions/gradle-9.8.2-bin.zip; } \
  && echo "21bd5da2de49b642904077f38c0efdc7778e92b3ed0889392dca61b97e389607  $Z" | sha256sum -c - \
  && { [ -d /media/big_disk/android/gradle-9.8.2 ] || unzip -q $Z -d /media/big_disk/android; } \
  && /media/big_disk/android/gradle-9.8.2/bin/gradle --version | grep '^Gradle'
```

Expected: `/media/big_disk/android/downloads/gradle-9.8.2-bin.zip: OK` и `Gradle 9.8.2`. Если сумма не сошлась (`FAILED`), команда останавливается: удалить zip и повторить; не распаковывать и не запускать такой Gradle.

- [ ] **Step 3: Файлы сборки**

Файл `android/.gitignore`:

````gitignore
# Gradle and Kotlin build state
.gradle/
.kotlin/
build/
local.properties

# Android Studio
.idea/
*.iml
captures/

# Firebase settings of this machine (docs/android.md)
app/google-services.json

# Signing keys live outside the repository (docs/android.md)
*.jks
*.keystore
````

Файл `android/settings.gradle.kts`:

````kotlin
pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "to-round-android"

include(":core")
````

Файл `android/build.gradle.kts`:

````kotlin
// Plugins are declared once here, so every module shares one Kotlin Gradle plugin.
plugins {
    alias(libs.plugins.kotlin.jvm) apply false
}
````

Файл `android/gradle.properties`:

````properties
# The machine has 14 GB of RAM: one Gradle daemon, Kotlin compiled inside it.
org.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8
kotlin.compiler.execution.strategy=in-process
kotlin.code.style=official
````

Файл `android/gradle/libs.versions.toml`:

````toml
[versions]
junit = "6.1.3"
kotlin = "2.4.21"
kotlinxSerialization = "1.12.0"

[libraries]
junit-bom = { module = "org.junit:junit-bom", version.ref = "junit" }
junit-jupiter = { module = "org.junit.jupiter:junit-jupiter" }
junit-platform-launcher = { module = "org.junit.platform:junit-platform-launcher" }
kotlinx-serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "kotlinxSerialization" }

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
````

Файл `android/core/build.gradle.kts`. Тесты получают путь к `contract/`, перезапускаются, когда меняется пример, и в конце печатают одну строку с итогом. `-Xjdk-release=17` нужен потому, что `core` компилируется против JDK 25: без флага Kotlin привязал бы, например, `removeFirst()` к методу Java 21 `java.util.List.removeFirst`, которого нет на Android до 15 (в черновике проверено байт-кодом: с флагом вызов идёт в `kotlin.collections.CollectionsKt.removeFirst`):

````kotlin
import org.gradle.api.tasks.testing.logging.TestExceptionFormat
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
    useJUnitPlatform()
    systemProperty("toround.contractDir", contractDir.path)
    inputs.dir(contractDir).withPathSensitivity(PathSensitivity.RELATIVE).withPropertyName("contract")
    testLogging {
        events("failed")
        exceptionFormat = TestExceptionFormat.FULL
    }
    // One summary line per run, e.g. "core tests: 3 passed, 0 failed, 0 skipped".
    addTestListener(object : TestListener {
        override fun beforeSuite(suite: TestDescriptor) {}

        override fun afterSuite(suite: TestDescriptor, result: TestResult) {
            if (suite.parent == null) {
                println(
                    "core tests: ${result.successfulTestCount} passed, ${result.failedTestCount} failed, " +
                        "${result.skippedTestCount} skipped",
                )
            }
        }

        override fun beforeTest(testDescriptor: TestDescriptor) {}

        override fun afterTest(testDescriptor: TestDescriptor, result: TestResult) {}
    })
}
````

- [ ] **Step 4: Сгенерировать Gradle Wrapper**

```bash
JAVA_HOME=/media/big_disk/android/android-studio/jbr /media/big_disk/android/gradle-9.8.2/bin/gradle -p android wrapper --gradle-version 9.8.2 --distribution-type bin --gradle-distribution-sha256-sum 21bd5da2de49b642904077f38c0efdc7778e92b3ed0889392dca61b97e389607 --no-daemon -q
sha256sum android/gradle/wrapper/gradle-wrapper.jar
cat android/gradle/wrapper/gradle-wrapper.properties
```

Expected: появились `android/gradlew`, `android/gradlew.bat`, `android/gradle/wrapper/gradle-wrapper.jar`; сумма jar — `3b8a25775a69158b5ad2b1d17a80a88dc7b40a352a73eb27d06c612a7ce68e98` (совпадает с https://services.gradle.org/distributions/gradle-9.8.2-wrapper.jar.sha256); в `gradle-wrapper.properties` — `distributionSha256Sum=21bd5da2de49b642904077f38c0efdc7778e92b3ed0889392dca61b97e389607` и `distributionUrl=https\://services.gradle.org/distributions/gradle-9.8.2-bin.zip`.

- [ ] **Step 5: Написать падающий тест**

Палитра совпадает с `contract/palette.json`; перечисления хранят значения раздела 3 контракта; `fromWire` читает только сохранённое значение — не имя константы, не `null` и не число.

Файл `android/core/src/test/kotlin/com/pmobile78/toround/core/Contract.kt`:

````kotlin
package com.pmobile78.toround.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.longOrNull
import java.io.File

/**
 * The shared examples of the repository (contract/) as plain values, the way Firestore gives them
 * to Android: maps, lists, String, Boolean, Long for whole numbers, Double otherwise, and null.
 */
object Contract {
    private val dir = File(System.getProperty("toround.contractDir") ?: error("toround.contractDir is not set"))

    /** The whole file, e.g. read("palette.json"). */
    fun read(path: String): Any? = plain(Json.parseToJsonElement(File(dir, path).readText()))

    /** The entries of one list of a fixture file, e.g. group("fixtures/time.json", "toInstant"). */
    @Suppress("UNCHECKED_CAST")
    fun group(path: String, key: String): List<Map<String, Any?>> =
        (read(path) as Map<String, Any?>)[key] as List<Map<String, Any?>>

    /** The named examples of a fixture group: [{ "name": …, "value": … }] → name to value. */
    fun cases(path: String, key: String): List<Pair<String, Any?>> =
        group(path, key).map { it["name"] as String to it["value"] }

    private fun plain(element: JsonElement): Any? = when (element) {
        JsonNull -> null
        is JsonObject -> element.mapValues { plain(it.value) }
        is JsonArray -> element.map { plain(it) }
        is JsonPrimitive -> when {
            element.isString -> element.content
            element.booleanOrNull != null -> element.booleanOrNull
            element.longOrNull != null -> element.longOrNull
            else -> element.double
        }
    }
}
````

Файл `android/core/src/test/kotlin/com/pmobile78/toround/core/contract/SchemaTest.kt`:

````kotlin
package com.pmobile78.toround.core.contract

import com.pmobile78.toround.core.Contract
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class SchemaTest {
    @Test
    fun `the palette is the one of contract palette json`() {
        assertEquals(Contract.read("palette.json"), PALETTE)
    }

    @Test
    fun `the enumerations hold the values of spec section 3`() {
        assertEquals(listOf("active", "done", "deleted"), TaskStatus.entries.map { it.wire })
        assertEquals(listOf("hours", "days", "weeks", "months"), RepeatUnit.entries.map { it.wire })
        assertEquals(listOf("light", "dark", "system"), ThemeMode.entries.map { it.wire })
        assertEquals(listOf("classic", "modern", "aurora", "brutalist", "clay"), Design.entries.map { it.wire })
        assertEquals(listOf("en", "uk"), Language.entries.map { it.wire })
        assertEquals(listOf("bubbles", "list"), MainView.entries.map { it.wire })
        assertEquals(listOf("createdAt", "updatedAt", "title", "category"), SortField.entries.map { it.wire })
        assertEquals(listOf("asc", "desc"), SortOrder.entries.map { it.wire })
    }

    @Test
    fun `fromWire reads a stored value and nothing else`() {
        assertEquals(TaskStatus.DELETED, fromWire<TaskStatus>("deleted"))
        assertEquals(SortField.CATEGORY, fromWire<SortField>("category"))
        assertNull(fromWire<TaskStatus>("postpone"))
        assertNull(fromWire<SortField>("tag"))
        assertNull(fromWire<TaskStatus>("ACTIVE"))
        assertNull(fromWire<TaskStatus>(null))
        assertNull(fromWire<TaskStatus>(1L))
    }
}
````

- [ ] **Step 6: Тест падает**

Run: `android/gradlew -p android :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/android/core/src/test/kotlin/com/pmobile78/toround/core/contract/SchemaTest.kt:11:53 Unresolved reference 'PALETTE'.` Первый запуск скачивает дистрибутив Gradle и библиотеки.

- [ ] **Step 7: `Schema.kt`**

Файл `android/core/src/main/kotlin/com/pmobile78/toround/core/contract/Schema.kt`:

````kotlin
package com.pmobile78.toround.core.contract

/*
 * Data contract v2: shared constants, limits and the values of its enumerations.
 * Spec: docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md, section 3;
 * the web keeps the same in src/contract/schema.js.
 */

const val SCHEMA_VERSION = 2

const val DEFAULT_RADIUS = 45

/** The 20 category colours of contract/palette.json; a category's colour must be one of these. */
val PALETTE: List<String> = listOf(
    "#da3833", "#ee603c", "#fd8b2b", "#e9be00", "#b7be00",
    "#7db44e", "#46a549", "#00a47a", "#34c09d", "#007771",
    "#00a5cf", "#0089b5", "#005ea4", "#6179cf", "#434d82",
    "#b14dd1", "#c04097", "#f25e6a", "#4d697e", "#86a49c",
)

object Limits {
    const val ID_MAX_LENGTH = 128
    const val TITLE_MAX_LENGTH = 1000
    const val DESCRIPTION_MAX_LENGTH = 100_000
    const val CATEGORY_NAME_MAX_LENGTH = 100
    const val MAX_REMINDERS = 10
    const val REMINDER_STEP_MINUTES = 60
    const val REMINDER_MAX_MINUTES = 524_160
    const val REPEAT_EVERY_MAX = 999
    const val RADIUS_MIN = 30
    const val RADIUS_MAX = 80
    const val FONT_SIZE_MIN = 8
    const val FONT_SIZE_MAX = 20
}

/** A value of the contract kept as a string: [wire] is how Firestore and backups store it. */
interface WireValue {
    val wire: String
}

/** The constant of [E] stored as [wire], or null when there is none. */
inline fun <reified E> fromWire(wire: Any?): E? where E : Enum<E>, E : WireValue =
    enumValues<E>().firstOrNull { it.wire == wire }

enum class TaskStatus(override val wire: String) : WireValue {
    ACTIVE("active"), DONE("done"), DELETED("deleted"),
}

enum class RepeatUnit(override val wire: String) : WireValue {
    HOURS("hours"), DAYS("days"), WEEKS("weeks"), MONTHS("months"),
}

enum class ThemeMode(override val wire: String) : WireValue {
    LIGHT("light"), DARK("dark"), SYSTEM("system"),
}

enum class Design(override val wire: String) : WireValue {
    CLASSIC("classic"), MODERN("modern"), AURORA("aurora"), BRUTALIST("brutalist"), CLAY("clay"),
}

enum class Language(override val wire: String) : WireValue {
    EN("en"), UK("uk"),
}

enum class MainView(override val wire: String) : WireValue {
    BUBBLES("bubbles"), LIST("list"),
}

enum class SortField(override val wire: String) : WireValue {
    CREATED_AT("createdAt"), UPDATED_AT("updatedAt"), TITLE("title"), CATEGORY("category"),
}

enum class SortOrder(override val wire: String) : WireValue {
    ASC("asc"), DESC("desc"),
}
````

- [ ] **Step 8: Тест проходит**

Run: `android/gradlew -p android check`
Expected: `core tests: 3 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 9: Commit**

Run: `git status --short --ignored android`
Expected: `?? android/` (новые файлы задачи) и `!! android/.gradle/`, `!! android/build/`, `!! android/core/build/` — папки сборки игнорируются.

```bash
git add android/.gitignore android/build.gradle.kts android/core/build.gradle.kts android/core/src/main/kotlin/com/pmobile78/toround/core/contract/Schema.kt android/core/src/test/kotlin/com/pmobile78/toround/core/Contract.kt android/core/src/test/kotlin/com/pmobile78/toround/core/contract/SchemaTest.kt android/gradle.properties android/gradle/libs.versions.toml android/gradle/wrapper/gradle-wrapper.jar android/gradle/wrapper/gradle-wrapper.properties android/gradlew android/gradlew.bat android/settings.gradle.kts
git commit -F - <<'EOF'
feat(android): the Gradle project android/ with the contract module core

Stage 1.1, task 1. android/ is a Gradle build (wrapper 9.8.2, versions in
gradle/libs.versions.toml) with one module so far: core, plain Kotlin on the
JVM, no Android and no Firebase. Its first part is the schema of contract v2:
the palette, the limits and the stored values of the enumerations, with
fromWire to read them back. The tests read the shared examples of contract/
and print one summary line.
EOF
```

---

### Task 2: Время и часовые пояса

**Files:**
- Create: `android/core/src/main/kotlin/com/pmobile78/toround/core/contract/Time.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/toround/core/contract/TimeTest.kt`

**Interfaces:**
- Consumes: `contract/fixtures/time.json`; `Contract.group` (задача 1).
- Produces (`com.pmobile78.toround.core.contract`): `parseLocal(local: Any?): LocalDateTime?` — `null` для неверного формата и несуществующей даты; `formatLocal(dateTime: LocalDateTime): String` — `YYYY-MM-DDTHH:mm`, секунды отбрасываются; `isValidTimeZone(tz: Any?): Boolean`; `toInstant(local: String, tz: String): Instant` — бросает `IllegalArgumentException` на неверное время и `DateTimeException` на незнакомую зону; `toLocal(instant: Instant, tz: String): String`; `deviceTimeZone(): String` (при сбое — `"UTC"`).

- [ ] **Step 1: Написать падающий тест**

Примеры `time.json` проходят как есть, включая весенний разрыв и осеннее перекрытие; разбор местного времени строгий; незнакомая зона и неверное время дают исключение.

Файл `android/core/src/test/kotlin/com/pmobile78/toround/core/contract/TimeTest.kt`:

````kotlin
package com.pmobile78.toround.core.contract

import com.pmobile78.toround.core.Contract
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DynamicTest.dynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import org.junit.jupiter.api.assertThrows
import java.time.DateTimeException
import java.time.Instant
import java.time.LocalDateTime

class TimeTest {
    @TestFactory
    fun `toInstant on the contract examples`() = Contract.group("fixtures/time.json", "toInstant").map { case ->
        dynamicTest(case["name"] as String) {
            val expected = Instant.parse(case["instant"] as String)
            assertEquals(expected, toInstant(case["local"] as String, case["tz"] as String))
        }
    }

    @TestFactory
    fun `toLocal on the contract examples`() = Contract.group("fixtures/time.json", "toLocal").map { case ->
        dynamicTest(case["name"] as String) {
            assertEquals(case["local"], toLocal(Instant.parse(case["instant"] as String), case["tz"] as String))
        }
    }

    @Test
    fun `parseLocal takes YYYY-MM-DDTHH mm of a real date only`() {
        assertEquals(LocalDateTime.of(2026, 10, 14, 9, 5), parseLocal("2026-10-14T09:05"))
        assertNull(parseLocal("2026-10-14T09:05:00"))
        assertNull(parseLocal("2026-10-14 09:05"))
        assertNull(parseLocal("2026-02-30T09:00"))
        assertNull(parseLocal("2026-10-14T24:00"))
        assertNull(parseLocal(""))
        assertNull(parseLocal(null))
        assertNull(parseLocal(202610140905L))
    }

    @Test
    fun `formatLocal writes minutes and drops seconds`() {
        assertEquals("2026-01-05T07:03", formatLocal(LocalDateTime.of(2026, 1, 5, 7, 3, 59)))
    }

    @Test
    fun `isValidTimeZone knows the zones of java time`() {
        assertTrue(isValidTimeZone("Europe/Kyiv"))
        assertTrue(isValidTimeZone("UTC"))
        assertFalse(isValidTimeZone("Mars/Olympus"))
        assertFalse(isValidTimeZone(""))
        assertFalse(isValidTimeZone("Europe/" + "x".repeat(60)))
        assertFalse(isValidTimeZone(null))
    }

    @Test
    fun `toInstant refuses a malformed time and an unknown zone`() {
        assertThrows<IllegalArgumentException> { toInstant("2026-10-14 09:00", "UTC") }
        assertThrows<DateTimeException> { toInstant("2026-10-14T09:00", "Mars/Olympus") }
    }
}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/TimeTest.kt:21:36 Unresolved reference 'toInstant'.`

- [ ] **Step 3: `Time.kt`**

`ZonedDateTime` из `LocalDateTime.atZone` — это и есть правило контракта: несуществующее время сдвигается вперёд на длину перехода, неоднозначное берётся с более ранним смещением.

Файл `android/core/src/main/kotlin/com/pmobile78/toround/core/contract/Time.kt`:

````kotlin
package com.pmobile78.toround.core.contract

import java.time.DateTimeException
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.time.format.ResolverStyle
import java.time.temporal.ChronoUnit

/*
 * Wall-clock ("local") time <-> instant (spec 4.2). `local` is "YYYY-MM-DDTHH:mm" without an
 * offset; `tz` is an IANA zone. java.time is the reference of the contract: a nonexistent local
 * time (spring gap) moves forward by the length of the gap, an ambiguous one (autumn overlap)
 * takes the earlier offset. The web gives the same results (src/contract/time.js).
 */

private val LOCAL_RE = Regex("""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}""")
private val LOCAL_FORMAT = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm").withResolverStyle(ResolverStyle.STRICT)

/** The date and time of "YYYY-MM-DDTHH:mm", or null when it is malformed or not a real date. */
fun parseLocal(local: Any?): LocalDateTime? {
    if (local !is String || !LOCAL_RE.matches(local)) return null
    return try {
        LocalDateTime.parse(local, LOCAL_FORMAT)
    } catch (e: DateTimeParseException) {
        null
    }
}

/** "YYYY-MM-DDTHH:mm" of a date and time; seconds are dropped. */
fun formatLocal(dateTime: LocalDateTime): String = dateTime.truncatedTo(ChronoUnit.MINUTES).format(LOCAL_FORMAT)

/** True when [tz] is a zone java.time knows, at most 64 characters long. */
fun isValidTimeZone(tz: Any?): Boolean {
    if (tz !is String || tz.isEmpty() || tz.length > 64) return false
    return try {
        ZoneId.of(tz)
        true
    } catch (e: DateTimeException) {
        false
    }
}

/** The instant of [local] in zone [tz]; throws on a malformed time or an unknown zone. */
fun toInstant(local: String, tz: String): Instant {
    val dateTime = parseLocal(local) ?: throw IllegalArgumentException("Invalid local date-time: $local")
    return dateTime.atZone(ZoneId.of(tz)).toInstant()
}

/** "YYYY-MM-DDTHH:mm" of [instant] in zone [tz]. */
fun toLocal(instant: Instant, tz: String): String = formatLocal(LocalDateTime.ofInstant(instant, ZoneId.of(tz)))

/** The zone of this device, or "UTC" when it cannot be read. */
fun deviceTimeZone(): String = try {
    ZoneId.systemDefault().id
} catch (e: DateTimeException) {
    "UTC"
}
````

- [ ] **Step 4: Тест проходит**

Run: `android/gradlew -p android check`
Expected: `core tests: 21 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add android/core/src/main/kotlin/com/pmobile78/toround/core/contract/Time.kt android/core/src/test/kotlin/com/pmobile78/toround/core/contract/TimeTest.kt
git commit -F - <<'EOF'
feat(android): local time and zones of the contract on java.time

Stage 1.1, task 2. core reads and writes "YYYY-MM-DDTHH:mm", checks a zone and
turns a local time in a zone into an instant and back (spec 4.2). java.time is
the reference the contract was checked against, so the examples of
contract/fixtures/time.json pass as they are, including the spring gap and
the autumn overlap.
EOF
```

---

### Task 3: Проверка записей

**Files:**
- Create: `android/core/src/main/kotlin/com/pmobile78/toround/core/contract/Validate.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/toround/core/contract/ValidateTest.kt`

**Interfaces:**
- Consumes: `contract/fixtures/{tasks,categories,settings}.json`; `PALETTE`, `Limits`, перечисления и `fromWire` (задача 1); `parseLocal`, `isValidTimeZone` (задача 2).
- Produces (`com.pmobile78.toround.core.contract`): `validateTask(task: Any?, acceptUnknownZone: Boolean = false): List<String>`, `validateCategory(category: Any?): List<String>`, `validateSettings(settings: Any?): List<String>` — пустой список означает правильную запись; тексты ошибок — как в `src/contract/validate.js`; `isValidId(value: Any?): Boolean`.

- [ ] **Step 1: Написать падающий тест**

Правильные примеры трёх файлов принимаются, неправильные — отклоняются. Отдельные тесты закрепляют поведение JavaScript: отсутствующее поле ≠ `null`; число без дробной части — целое; название из одних пробелов JavaScript (включая `0xA0`, `0x2007`, `0x3000`, `0xFEFF`) пустое. Зона, которой нет в базе, проходит только с `acceptUnknownZone = true` и только длиной 1–64.

Файл `android/core/src/test/kotlin/com/pmobile78/toround/core/contract/ValidateTest.kt`:

````kotlin
package com.pmobile78.toround.core.contract

import com.pmobile78.toround.core.Contract
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.DynamicTest.dynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory

class ValidateTest {
    private fun accepts(path: String, validate: (Any?) -> List<String>) = Contract.cases(path, "valid").map { (name, value) ->
        dynamicTest(name) { assertEquals(emptyList<String>(), validate(value)) }
    }

    private fun rejects(path: String, validate: (Any?) -> List<String>) = Contract.cases(path, "invalid").map { (name, value) ->
        dynamicTest(name) { assertNotEquals(emptyList<String>(), validate(value)) }
    }

    @TestFactory
    fun `valid tasks of the contract`() = accepts("fixtures/tasks.json") { validateTask(it) }

    @TestFactory
    fun `invalid tasks of the contract`() = rejects("fixtures/tasks.json") { validateTask(it) }

    @TestFactory
    fun `valid categories of the contract`() = accepts("fixtures/categories.json", ::validateCategory)

    @TestFactory
    fun `invalid categories of the contract`() = rejects("fixtures/categories.json", ::validateCategory)

    @TestFactory
    fun `valid settings of the contract`() = accepts("fixtures/settings.json", ::validateSettings)

    @TestFactory
    fun `invalid settings of the contract`() = rejects("fixtures/settings.json", ::validateSettings)

    // "minimal-without-due": no due, no category, active.
    @Suppress("UNCHECKED_CAST")
    private val task = Contract.cases("fixtures/tasks.json", "valid").first().second as Map<String, Any?>

    @Test
    fun `rejects what is not a record`() {
        assertEquals(listOf("task: not an object"), validateTask(null))
        assertEquals(listOf("task: not an object"), validateTask(listOf(task)))
        assertEquals(listOf("category: not an object"), validateCategory("c1"))
        assertEquals(listOf("settings: not an object"), validateSettings(emptyList<Any>()))
    }

    @Test
    fun `a missing field is not a field set to null`() {
        assertEquals(emptyList<String>(), validateTask(task + ("categoryId" to null)))
        assertEquals(listOf("categoryId: invalid"), validateTask(task - "categoryId"))
        assertEquals(listOf("repeat: invalid shape", "repeat: requires due"), validateTask(task - "repeat"))
    }

    @Test
    fun `a whole number written as a Double is an integer, a fraction is not`() {
        assertEquals(emptyList<String>(), validateTask(task + ("radius" to 45.0)))
        assertEquals(listOf("radius: invalid"), validateTask(task + ("radius" to 45.5)))
        assertEquals(listOf("radius: invalid"), validateTask(task + ("radius" to "45")))
    }

    @Test
    fun `a title of JavaScript white space only is blank`() {
        val spaces = listOf(0x20, 0x09, 0xA0, 0x2007, 0x3000, 0xFEFF).joinToString("") { Char(it).toString() }
        assertEquals(listOf("title: invalid"), validateTask(task + ("title" to spaces)))
        assertEquals(emptyList<String>(), validateTask(task + ("title" to spaces + "A" + spaces)))
    }

    @Test
    fun `a zone this device does not know passes when the caller accepts it, as the rules do`() {
        val due = mapOf("local" to "2026-10-15T09:00", "tz" to "Mars/Olympus")
        assertEquals(listOf("due.tz: invalid"), validateTask(task + ("due" to due)))
        assertEquals(emptyList<String>(), validateTask(task + ("due" to due), acceptUnknownZone = true))
        assertEquals(listOf("due.tz: invalid"), validateTask(task + ("due" to due + ("tz" to "")), acceptUnknownZone = true))
        val longZone = "x".repeat(65)
        assertEquals(listOf("due.tz: invalid"), validateTask(task + ("due" to due + ("tz" to longZone)), acceptUnknownZone = true))
    }

    @Test
    fun `times may carry micro and nanoseconds but must be UTC with Z`() {
        assertEquals(emptyList<String>(), validateTask(task + ("createdAt" to "2026-10-01T08:00:00.123456789Z")))
        assertEquals(emptyList<String>(), validateTask(task + ("createdAt" to "2026-10-01T08:00:00Z")))
        assertEquals(listOf("createdAt: invalid"), validateTask(task + ("createdAt" to "2026-10-01T08:00:00.000+02:00")))
        assertEquals(listOf("createdAt: invalid"), validateTask(task + ("createdAt" to "2026-13-01T08:00:00.000Z")))
    }

    @Test
    fun `isValidId takes a Firestore document id`() {
        assertEquals(true, isValidId("k3j9x0abc"))
        assertEquals(false, isValidId(""))
        assertEquals(false, isValidId("a/b"))
        assertEquals(false, isValidId("x".repeat(129)))
        assertEquals(false, isValidId(7L))
    }
}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/ValidateTest.kt:20:76 Unresolved reference 'validateTask'.`

- [ ] **Step 3: `Validate.kt`**

Перенос `validate.js` один к одному. Отсутствующее поле читается как частный объект `Missing`, поэтому `due == null` для него ложно — как `undefined === null` в JavaScript.

Файл `android/core/src/main/kotlin/com/pmobile78/toround/core/contract/Validate.kt`:

````kotlin
package com.pmobile78.toround.core.contract

import java.time.Instant
import java.time.format.DateTimeParseException

/*
 * Validation of plain (backup-form) v2 records with the rules and messages of the web's
 * src/contract/validate.js (spec, sections 3 and 10). A record is a map of plain values: String,
 * Boolean, Long or Double, lists, maps and null; times are ISO strings and the id is a field.
 * As in JavaScript, a missing field differs from a field set to null, and a number without a
 * fraction is an integer. Each validator returns the errors; an empty list means a valid record.
 */

// 0-9 fraction digits: java.time Instant.toString() writes 6 or 9 when the value has micro/nanoseconds.
private val ISO_RE = Regex("""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z""")

private val TASK_KEYS = setOf(
    "id", "title", "description", "categoryId", "status", "due", "reminders", "repeat",
    "radius", "pulseMuted", "createdAt", "updatedAt", "deletedAt",
)
private val CATEGORY_KEYS = setOf("id", "name", "color", "order")
private val SETTINGS_KEYS = setOf(
    "themeMode", "design", "language", "mainView", "labelFontSize", "bubbleBackground",
    "showCategoriesPanel", "showInstructions", "bubbleFilter", "listFilter", "listSort",
)

// The characters String.prototype.trim() removes in JavaScript: white space and line ends.
private val JS_SPACES: Set<Int> =
    setOf(0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF) +
        (0x2000..0x200A)

/** What a missing field reads as, so that it differs from a field set to null. */
private object Missing

private fun Map<*, *>.field(key: String): Any? = if (containsKey(key)) get(key) else Missing

private fun unknownKeys(record: Map<*, *>, allowed: Set<String>): List<Any?> = record.keys.filter { it !in allowed }

/** The value of a whole number (Long, Int, or a Double without a fraction), or null. */
private fun wholeNumber(value: Any?): Long? = when (value) {
    is Long -> value
    is Int -> value.toLong()
    is Double -> if (value % 1.0 == 0.0) value.toLong() else null
    else -> null
}

private fun isIntIn(value: Any?, min: Int, max: Int): Boolean = wholeNumber(value)?.let { it in min..max } ?: false

private fun isStrictlyAscending(numbers: List<*>): Boolean =
    numbers.zipWithNext().all { (a, b) -> (b as Number).toDouble() > (a as Number).toDouble() }

private fun isIsoTimestamp(value: Any?): Boolean {
    if (value !is String || !ISO_RE.matches(value)) return false
    return try {
        Instant.parse(value)
        true
    } catch (e: DateTimeParseException) {
        false
    }
}

private fun trimmedLengthIn(value: Any?, max: Int): Boolean {
    if (value !is String) return false
    val length = value.trim { it.code in JS_SPACES }.length
    return length in 1..max
}

/** Firestore-safe document id: 1..128 characters, no "/". */
fun isValidId(value: Any?): Boolean =
    value is String && value.isNotEmpty() && value.length <= Limits.ID_MAX_LENGTH && '/' !in value

private fun isIdListOrNull(value: Any?): Boolean = value == null || (value is List<*> && value.all(::isValidId))

private fun validateDue(due: Any?, acceptUnknownZone: Boolean, errors: MutableList<String>) {
    if (due == null) return
    if (due !is Map<*, *> || unknownKeys(due, setOf("local", "tz")).isNotEmpty()) {
        errors += "due: invalid shape"
        return
    }
    if (parseLocal(due.field("local")) == null) errors += "due.local: invalid"
    val tz = due.field("tz")
    val zoneOk = if (acceptUnknownZone) tz is String && tz.length in 1..64 else isValidTimeZone(tz)
    if (!zoneOk) errors += "due.tz: invalid"
}

private fun validateReminders(reminders: Any?, errors: MutableList<String>) {
    val ok = reminders is List<*> &&
        reminders.size <= Limits.MAX_REMINDERS &&
        reminders.all {
            isIntIn(it, Limits.REMINDER_STEP_MINUTES, Limits.REMINDER_MAX_MINUTES) &&
                wholeNumber(it)!! % Limits.REMINDER_STEP_MINUTES == 0L
        } &&
        isStrictlyAscending(reminders)
    if (!ok) errors += "reminders: invalid"
}

private fun validateRepeat(repeat: Any?, errors: MutableList<String>) {
    if (repeat == null) return
    if (repeat !is Map<*, *> || unknownKeys(repeat, setOf("every", "unit", "weekdays", "monthDay")).isNotEmpty()) {
        errors += "repeat: invalid shape"
        return
    }
    if (!isIntIn(repeat.field("every"), 1, Limits.REPEAT_EVERY_MAX)) errors += "repeat.every: invalid"
    val unit = fromWire<RepeatUnit>(repeat.field("unit"))
    if (unit == null) errors += "repeat.unit: invalid"
    if (repeat.containsKey("weekdays")) {
        val weekdays = repeat.field("weekdays")
        val ok = unit == RepeatUnit.WEEKS &&
            weekdays is List<*> &&
            weekdays.all { isIntIn(it, 1, 7) } &&
            isStrictlyAscending(weekdays)
        if (!ok) errors += "repeat.weekdays: invalid"
    }
    if (unit == RepeatUnit.MONTHS) {
        if (!isIntIn(repeat.field("monthDay"), 1, 31)) errors += "repeat.monthDay: required for months"
    } else if (repeat.containsKey("monthDay")) {
        errors += "repeat.monthDay: only for months"
    }
}

/**
 * Errors of a task record. A due zone this device does not know is an error unless
 * [acceptUnknownZone]: then any 1–64 characters pass, as the Firestore rules let them.
 */
fun validateTask(task: Any?, acceptUnknownZone: Boolean = false): List<String> {
    if (task !is Map<*, *>) return listOf("task: not an object")
    val errors = unknownKeys(task, TASK_KEYS).map { "$it: unknown field" }.toMutableList()
    if (!isValidId(task.field("id"))) errors += "id: invalid"
    if (!trimmedLengthIn(task.field("title"), Limits.TITLE_MAX_LENGTH)) errors += "title: invalid"
    val description = task.field("description")
    if (description !is String || description.length > Limits.DESCRIPTION_MAX_LENGTH) errors += "description: invalid"
    val categoryId = task.field("categoryId")
    if (categoryId != null && !isValidId(categoryId)) errors += "categoryId: invalid"
    val status = fromWire<TaskStatus>(task.field("status"))
    if (status == null) errors += "status: invalid"
    val due = task.field("due")
    val reminders = task.field("reminders")
    val repeat = task.field("repeat")
    validateDue(due, acceptUnknownZone, errors)
    validateReminders(reminders, errors)
    validateRepeat(repeat, errors)
    if (due == null && reminders is List<*> && reminders.isNotEmpty()) errors += "reminders: require due"
    if (due == null && repeat != null) errors += "repeat: requires due"
    if (!isIntIn(task.field("radius"), Limits.RADIUS_MIN, Limits.RADIUS_MAX)) errors += "radius: invalid"
    if (task.field("pulseMuted") !is Boolean) errors += "pulseMuted: invalid"
    if (!isIsoTimestamp(task.field("createdAt"))) errors += "createdAt: invalid"
    if (!isIsoTimestamp(task.field("updatedAt"))) errors += "updatedAt: invalid"
    val deletedAt = task.field("deletedAt")
    val deletedOk = if (status == TaskStatus.DELETED) isIsoTimestamp(deletedAt) else deletedAt == null
    if (!deletedOk) errors += "deletedAt: invalid"
    return errors
}

fun validateCategory(category: Any?): List<String> {
    if (category !is Map<*, *>) return listOf("category: not an object")
    val errors = unknownKeys(category, CATEGORY_KEYS).map { "$it: unknown field" }.toMutableList()
    if (!isValidId(category.field("id"))) errors += "id: invalid"
    if (!trimmedLengthIn(category.field("name"), Limits.CATEGORY_NAME_MAX_LENGTH)) errors += "name: invalid"
    if (category.field("color") !in PALETTE) errors += "color: not in palette"
    val order = category.field("order")
    val orderOk = order is Long || order is Int || (order is Double && order.isFinite())
    if (!orderOk) errors += "order: invalid"
    return errors
}

fun validateSettings(settings: Any?): List<String> {
    if (settings !is Map<*, *>) return listOf("settings: not an object")
    val errors = unknownKeys(settings, SETTINGS_KEYS).map { "$it: unknown field" }.toMutableList()
    if (fromWire<ThemeMode>(settings.field("themeMode")) == null) errors += "themeMode: invalid"
    if (fromWire<Design>(settings.field("design")) == null) errors += "design: invalid"
    if (fromWire<Language>(settings.field("language")) == null) errors += "language: invalid"
    if (fromWire<MainView>(settings.field("mainView")) == null) errors += "mainView: invalid"
    if (!isIntIn(settings.field("labelFontSize"), Limits.FONT_SIZE_MIN, Limits.FONT_SIZE_MAX)) {
        errors += "labelFontSize: invalid"
    }
    listOf("bubbleBackground", "showCategoriesPanel", "showInstructions").forEach { key ->
        if (settings.field(key) !is Boolean) errors += "$key: invalid"
    }
    val bubbleFilter = settings.field("bubbleFilter")
    if (bubbleFilter !is Map<*, *> ||
        unknownKeys(bubbleFilter, setOf("categoryIds", "showUncategorized", "plannedOnly")).isNotEmpty() ||
        !isIdListOrNull(bubbleFilter.field("categoryIds")) ||
        bubbleFilter.field("showUncategorized") !is Boolean ||
        bubbleFilter.field("plannedOnly") !is Boolean
    ) {
        errors += "bubbleFilter: invalid"
    }
    val listFilter = settings.field("listFilter")
    if (listFilter !is Map<*, *> ||
        unknownKeys(listFilter, setOf("categoryIds", "showUncategorized")).isNotEmpty() ||
        !isIdListOrNull(listFilter.field("categoryIds")) ||
        listFilter.field("showUncategorized") !is Boolean
    ) {
        errors += "listFilter: invalid"
    }
    val listSort = settings.field("listSort")
    if (listSort !is Map<*, *> ||
        unknownKeys(listSort, setOf("by", "order")).isNotEmpty() ||
        fromWire<SortField>(listSort.field("by")) == null ||
        fromWire<SortOrder>(listSort.field("order")) == null
    ) {
        errors += "listSort: invalid"
    }
    return errors
}
````

- [ ] **Step 4: Тест проходит**

Run: `android/gradlew -p android check`
Expected: `core tests: 71 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add android/core/src/main/kotlin/com/pmobile78/toround/core/contract/Validate.kt android/core/src/test/kotlin/com/pmobile78/toround/core/contract/ValidateTest.kt
git commit -F - <<'EOF'
feat(android): validation of task, category and settings records

Stage 1.1, task 3. core checks backup-form records with the rules and the
messages of the web's src/contract/validate.js: the valid examples of
contract/fixtures/{tasks,categories,settings}.json pass and the invalid ones
do not, with the same errors as the web on every example. As in JavaScript, a
missing field differs from null, a whole Double is an integer and titles are
trimmed of JavaScript white space. Reading from Firestore may accept a due
zone this device does not know, as the rules do (acceptUnknownZone).
EOF
```

---

### Task 4: Модели задачи, категории и настроек

**Files:**
- Create: `android/core/src/main/kotlin/com/pmobile78/toround/core/model/Records.kt`, `Task.kt`, `Category.kt`, `Settings.kt` (в той же папке)
- Test: `android/core/src/test/kotlin/com/pmobile78/toround/core/model/ModelsTest.kt`

**Interfaces:**
- Consumes: `validateTask`, `validateCategory`, `validateSettings` (задача 3); перечисления и `fromWire` (задача 1).
- Produces (`com.pmobile78.toround.core.model`):
  - `data class Due(local: String, tz: String)`; `data class Repeat(every: Int, unit: RepeatUnit, weekdays: List<Int>? = null, monthDay: Int? = null)`; `data class Task(id, title, description, categoryId: String?, status: TaskStatus, due: Due?, reminders: List<Int>, repeat: Repeat?, radius: Int, pulseMuted: Boolean, createdAt: Instant, updatedAt: Instant, deletedAt: Instant?)`; `taskFromRecord(record: Map<String, Any?>, acceptUnknownZone: Boolean = false): Task`;
  - `data class Category(id, name, color, order: Double)`; `categoryFromRecord(record): Category`;
  - `data class BubbleFilter(categoryIds: List<String>?, showUncategorized, plannedOnly)`, `data class ListFilter(categoryIds: List<String>?, showUncategorized)`, `data class ListSort(by: SortField, order: SortOrder)`, `data class Settings(themeMode, design, language, mainView, labelFontSize: Int, bubbleBackground, showCategoriesPanel, showInstructions, bubbleFilter, listFilter, listSort)`; `settingsFromRecord(record): Settings`; `Settings.toRecord(): Map<String, Any?>` (числа — `Long`); `normalizeLanguage(tag: String?): Language`; `defaultSettings(deviceLanguage: String?): Settings`.
  - Неправильная запись: `IllegalArgumentException` с текстом `task <id>: <ошибки через "; ">` (у категории — `category <id>: …`, у настроек — `settings: …`).

- [ ] **Step 1: Написать падающий тест**

Каждая правильная задача контракта становится моделью; модель хранит все поля записи (месячный повтор, дни недели, наносекунды); неправильная запись отклоняется с ошибками проверки; порядок категории бывает дробным; настройки возвращаются из `toRecord` без изменений; настройки по умолчанию совпадают с примером `defaults`.

Файл `android/core/src/test/kotlin/com/pmobile78/toround/core/model/ModelsTest.kt`:

````kotlin
package com.pmobile78.toround.core.model

import com.pmobile78.toround.core.Contract
import com.pmobile78.toround.core.contract.Design
import com.pmobile78.toround.core.contract.Language
import com.pmobile78.toround.core.contract.MainView
import com.pmobile78.toround.core.contract.RepeatUnit
import com.pmobile78.toround.core.contract.SortField
import com.pmobile78.toround.core.contract.SortOrder
import com.pmobile78.toround.core.contract.TaskStatus
import com.pmobile78.toround.core.contract.ThemeMode
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DynamicTest.dynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import org.junit.jupiter.api.assertThrows
import java.time.Instant

class ModelsTest {
    @Suppress("UNCHECKED_CAST")
    private fun valid(path: String, name: String): Map<String, Any?> =
        Contract.cases(path, "valid").first { it.first == name }.second as Map<String, Any?>

    @TestFactory
    fun `every valid task of the contract becomes a task`() = Contract.cases("fixtures/tasks.json", "valid").map { (name, value) ->
        dynamicTest(name) {
            @Suppress("UNCHECKED_CAST")
            val record = value as Map<String, Any?>
            assertEquals(record["id"], taskFromRecord(record).id)
        }
    }

    @Test
    fun `a task keeps every field of its record`() {
        assertEquals(
            Task(
                id = "p0q8r7stu",
                title = "Оплатить счета",
                description = "- [ ] свет\n- [ ] вода",
                categoryId = "k3j9x0abc",
                status = TaskStatus.ACTIVE,
                due = Due(local = "2026-10-15T09:00", tz = "Europe/Kyiv"),
                reminders = listOf(60, 1440),
                repeat = Repeat(every = 1, unit = RepeatUnit.MONTHS, monthDay = 15),
                radius = 45,
                pulseMuted = false,
                createdAt = Instant.parse("2026-10-01T08:00:00Z"),
                updatedAt = Instant.parse("2026-10-10T19:30:00Z"),
                deletedAt = null,
            ),
            taskFromRecord(valid("fixtures/tasks.json", "monthly-with-reminders")),
        )
        val weekly = taskFromRecord(valid("fixtures/tasks.json", "weekly-with-weekdays"))
        assertEquals(Repeat(every = 1, unit = RepeatUnit.WEEKS, weekdays = listOf(1, 3, 5)), weekly.repeat)
        assertEquals(true, weekly.pulseMuted)
        val android = taskFromRecord(valid("fixtures/tasks.json", "timestamps-with-micro-and-nanoseconds"))
        assertEquals(TaskStatus.DELETED, android.status)
        assertEquals(Instant.parse("2026-10-01T08:00:00.123456789Z"), android.updatedAt)
        assertEquals(Instant.parse("2026-10-02T08:00:00.500Z"), android.deletedAt)
    }

    @Test
    fun `a task with a zone this device does not know is read when the caller accepts it`() {
        val record = valid("fixtures/tasks.json", "minimal-without-due") +
            ("due" to mapOf("local" to "2026-10-15T09:00", "tz" to "Mars/Olympus"))
        assertThrows<IllegalArgumentException> { taskFromRecord(record) }
        assertEquals(Due("2026-10-15T09:00", "Mars/Olympus"), taskFromRecord(record, acceptUnknownZone = true).due)
    }

    @Test
    fun `an invalid record is refused with its errors`() {
        val record = valid("fixtures/tasks.json", "minimal-without-due") + ("radius" to 100L)
        val error = assertThrows<IllegalArgumentException> { taskFromRecord(record) }
        assertEquals("task t1: radius: invalid", error.message)
        assertThrows<IllegalArgumentException> { categoryFromRecord(valid("fixtures/categories.json", "basic") - "id") }
        assertThrows<IllegalArgumentException> { settingsFromRecord(valid("fixtures/settings.json", "defaults") - "design") }
    }

    @Test
    fun `a category keeps a fractional order`() {
        assertEquals(Category("k3j9x0abc", "Дом", "#da3833", 1.0), categoryFromRecord(valid("fixtures/categories.json", "basic")))
        assertEquals(1.5, categoryFromRecord(valid("fixtures/categories.json", "fractional-order")).order)
    }

    @Test
    fun `settings keep every field of their record`() {
        assertEquals(
            Settings(
                themeMode = ThemeMode.DARK,
                design = Design.AURORA,
                language = Language.UK,
                mainView = MainView.LIST,
                labelFontSize = 20,
                bubbleBackground = false,
                showCategoriesPanel = true,
                showInstructions = false,
                bubbleFilter = BubbleFilter(categoryIds = listOf("c1", "c2"), showUncategorized = false, plannedOnly = true),
                listFilter = ListFilter(categoryIds = emptyList(), showUncategorized = true),
                listSort = ListSort(by = SortField.CATEGORY, order = SortOrder.ASC),
            ),
            settingsFromRecord(valid("fixtures/settings.json", "customised")),
        )
    }

    @TestFactory
    fun `valid settings come back unchanged from toRecord`() = Contract.cases("fixtures/settings.json", "valid").map { (name, value) ->
        dynamicTest(name) {
            @Suppress("UNCHECKED_CAST")
            val record = value as Map<String, Any?>
            assertEquals(record, settingsFromRecord(record).toRecord())
        }
    }

    @Test
    fun `default settings are the defaults of the contract, in the language of the device`() {
        assertEquals(settingsFromRecord(valid("fixtures/settings.json", "defaults")), defaultSettings("en-US"))
        assertEquals(Language.UK, defaultSettings("uk-UA").language)
        assertEquals(Language.EN, defaultSettings(null).language)
    }

    @Test
    fun `normalizeLanguage takes uk for Ukrainian and en for anything else`() {
        assertEquals(Language.UK, normalizeLanguage("uk"))
        assertEquals(Language.UK, normalizeLanguage("UK-ua"))
        assertEquals(Language.EN, normalizeLanguage("ru-UA"))
        assertEquals(Language.EN, normalizeLanguage("en"))
        assertEquals(Language.EN, normalizeLanguage(""))
        assertEquals(Language.EN, normalizeLanguage(null))
    }
}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/ModelsTest.kt:29:40 Unresolved reference 'taskFromRecord'.`

- [ ] **Step 3: Модели**

`Records.kt` читает значения проверенной записи: целые приходят `Long` (Firestore) или `Double` без дробной части (JavaScript).

Файл `android/core/src/main/kotlin/com/pmobile78/toround/core/model/Records.kt`:

````kotlin
package com.pmobile78.toround.core.model

import java.time.Instant

/*
 * Reading values of a record that a validator has accepted: whole numbers come as Long (Firestore)
 * or as a Double without a fraction (JavaScript), times as ISO strings.
 */

internal fun Map<String, Any?>.int(key: String): Int = when (val value = get(key)) {
    is Long -> value.toInt()
    is Int -> value
    is Double -> value.toInt()
    else -> throw IllegalArgumentException("$key: not a number")
}

internal fun Map<String, Any?>.double(key: String): Double = (get(key) as Number).toDouble()

internal fun Map<String, Any?>.string(key: String): String = get(key) as String

internal fun Map<String, Any?>.stringOrNull(key: String): String? = get(key) as String?

internal fun Map<String, Any?>.boolean(key: String): Boolean = get(key) as Boolean

internal fun Map<String, Any?>.instant(key: String): Instant = Instant.parse(string(key))

internal fun Map<String, Any?>.instantOrNull(key: String): Instant? = stringOrNull(key)?.let(Instant::parse)

@Suppress("UNCHECKED_CAST")
internal fun Map<String, Any?>.map(key: String): Map<String, Any?> = get(key) as Map<String, Any?>

@Suppress("UNCHECKED_CAST")
internal fun Map<String, Any?>.mapOrNull(key: String): Map<String, Any?>? = get(key) as Map<String, Any?>?

internal fun Map<String, Any?>.ints(key: String): List<Int> = (get(key) as List<*>).map { (it as Number).toInt() }

@Suppress("UNCHECKED_CAST")
internal fun Map<String, Any?>.stringsOrNull(key: String): List<String>? = get(key) as List<String>?
````

Файл `android/core/src/main/kotlin/com/pmobile78/toround/core/model/Task.kt`:

````kotlin
package com.pmobile78.toround.core.model

import com.pmobile78.toround.core.contract.RepeatUnit
import com.pmobile78.toround.core.contract.TaskStatus
import com.pmobile78.toround.core.contract.fromWire
import com.pmobile78.toround.core.contract.validateTask
import java.time.Instant

/** The due of a task: wall-clock [local] ("YYYY-MM-DDTHH:mm") understood in zone [tz] (spec 4.2). */
data class Due(val local: String, val tz: String)

/** How a task repeats (spec 3.1, 4.3); [weekdays] are ISO days, 1 = Monday … 7 = Sunday. */
data class Repeat(
    val every: Int,
    val unit: RepeatUnit,
    val weekdays: List<Int>? = null,
    val monthDay: Int? = null,
)

/** A task of users/{uid}/tasks (spec 3.1) without the fields only the server writes. */
data class Task(
    val id: String,
    val title: String,
    val description: String,
    val categoryId: String?,
    val status: TaskStatus,
    val due: Due?,
    val reminders: List<Int>,
    val repeat: Repeat?,
    val radius: Int,
    val pulseMuted: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val deletedAt: Instant?,
)

/**
 * The task of a backup-form record; throws IllegalArgumentException with the errors of
 * validateTask when the record is not valid. [acceptUnknownZone] as in validateTask.
 */
fun taskFromRecord(record: Map<String, Any?>, acceptUnknownZone: Boolean = false): Task {
    val errors = validateTask(record, acceptUnknownZone)
    require(errors.isEmpty()) { "task ${record["id"]}: ${errors.joinToString("; ")}" }
    return Task(
        id = record.string("id"),
        title = record.string("title"),
        description = record.string("description"),
        categoryId = record.stringOrNull("categoryId"),
        status = fromWire<TaskStatus>(record["status"])!!,
        due = record.mapOrNull("due")?.let { Due(local = it.string("local"), tz = it.string("tz")) },
        reminders = record.ints("reminders"),
        repeat = record.mapOrNull("repeat")?.let {
            Repeat(
                every = it.int("every"),
                unit = fromWire<RepeatUnit>(it["unit"])!!,
                weekdays = if (it.containsKey("weekdays")) it.ints("weekdays") else null,
                monthDay = if (it.containsKey("monthDay")) it.int("monthDay") else null,
            )
        },
        radius = record.int("radius"),
        pulseMuted = record.boolean("pulseMuted"),
        createdAt = record.instant("createdAt"),
        updatedAt = record.instant("updatedAt"),
        deletedAt = record.instantOrNull("deletedAt"),
    )
}
````

Файл `android/core/src/main/kotlin/com/pmobile78/toround/core/model/Category.kt`:

````kotlin
package com.pmobile78.toround.core.model

import com.pmobile78.toround.core.contract.validateCategory

/** A category of users/{uid}/categories (spec 3.2): [color] is one of the palette, [order] ascends. */
data class Category(val id: String, val name: String, val color: String, val order: Double)

/** The category of a backup-form record; throws IllegalArgumentException when it is not valid. */
fun categoryFromRecord(record: Map<String, Any?>): Category {
    val errors = validateCategory(record)
    require(errors.isEmpty()) { "category ${record["id"]}: ${errors.joinToString("; ")}" }
    return Category(
        id = record.string("id"),
        name = record.string("name"),
        color = record.string("color"),
        order = record.double("order"),
    )
}
````

Файл `android/core/src/main/kotlin/com/pmobile78/toround/core/model/Settings.kt`:

````kotlin
package com.pmobile78.toround.core.model

import com.pmobile78.toround.core.contract.Design
import com.pmobile78.toround.core.contract.Language
import com.pmobile78.toround.core.contract.MainView
import com.pmobile78.toround.core.contract.SortField
import com.pmobile78.toround.core.contract.SortOrder
import com.pmobile78.toround.core.contract.ThemeMode
import com.pmobile78.toround.core.contract.fromWire
import com.pmobile78.toround.core.contract.validateSettings

/** Which tasks the bubbles show; categoryIds null means every category. */
data class BubbleFilter(val categoryIds: List<String>?, val showUncategorized: Boolean, val plannedOnly: Boolean)

/** Which tasks the list shows; categoryIds null means every category. */
data class ListFilter(val categoryIds: List<String>?, val showUncategorized: Boolean)

data class ListSort(val by: SortField, val order: SortOrder)

/** The settings of users/{uid}.settings, shared by every device of the user (spec 3.5). */
data class Settings(
    val themeMode: ThemeMode,
    val design: Design,
    val language: Language,
    val mainView: MainView,
    val labelFontSize: Int,
    val bubbleBackground: Boolean,
    val showCategoriesPanel: Boolean,
    val showInstructions: Boolean,
    val bubbleFilter: BubbleFilter,
    val listFilter: ListFilter,
    val listSort: ListSort,
)

/** "uk*" → Ukrainian, anything else → English (spec 3.5). */
fun normalizeLanguage(tag: String?): Language =
    if (tag != null && tag.lowercase().startsWith("uk")) Language.UK else Language.EN

/** Fresh default settings (spec 3.5); the language comes from the device. */
fun defaultSettings(deviceLanguage: String?): Settings = Settings(
    themeMode = ThemeMode.SYSTEM,
    design = Design.CLASSIC,
    language = normalizeLanguage(deviceLanguage),
    mainView = MainView.BUBBLES,
    labelFontSize = 8,
    bubbleBackground = true,
    showCategoriesPanel = false,
    showInstructions = true,
    bubbleFilter = BubbleFilter(categoryIds = null, showUncategorized = true, plannedOnly = false),
    listFilter = ListFilter(categoryIds = null, showUncategorized = true),
    listSort = ListSort(by = SortField.UPDATED_AT, order = SortOrder.DESC),
)

/** The settings of a backup-form record; throws IllegalArgumentException when it is not valid. */
fun settingsFromRecord(record: Map<String, Any?>): Settings {
    val errors = validateSettings(record)
    require(errors.isEmpty()) { "settings: ${errors.joinToString("; ")}" }
    val bubbleFilter = record.map("bubbleFilter")
    val listFilter = record.map("listFilter")
    val listSort = record.map("listSort")
    return Settings(
        themeMode = fromWire<ThemeMode>(record["themeMode"])!!,
        design = fromWire<Design>(record["design"])!!,
        language = fromWire<Language>(record["language"])!!,
        mainView = fromWire<MainView>(record["mainView"])!!,
        labelFontSize = record.int("labelFontSize"),
        bubbleBackground = record.boolean("bubbleBackground"),
        showCategoriesPanel = record.boolean("showCategoriesPanel"),
        showInstructions = record.boolean("showInstructions"),
        bubbleFilter = BubbleFilter(
            categoryIds = bubbleFilter.stringsOrNull("categoryIds"),
            showUncategorized = bubbleFilter.boolean("showUncategorized"),
            plannedOnly = bubbleFilter.boolean("plannedOnly"),
        ),
        listFilter = ListFilter(
            categoryIds = listFilter.stringsOrNull("categoryIds"),
            showUncategorized = listFilter.boolean("showUncategorized"),
        ),
        listSort = ListSort(
            by = fromWire<SortField>(listSort["by"])!!,
            order = fromWire<SortOrder>(listSort["order"])!!,
        ),
    )
}

/** The record of these settings, as users/{uid}.settings and backups keep it; numbers are Long. */
fun Settings.toRecord(): Map<String, Any?> = mapOf(
    "themeMode" to themeMode.wire,
    "design" to design.wire,
    "language" to language.wire,
    "mainView" to mainView.wire,
    "labelFontSize" to labelFontSize.toLong(),
    "bubbleBackground" to bubbleBackground,
    "showCategoriesPanel" to showCategoriesPanel,
    "showInstructions" to showInstructions,
    "bubbleFilter" to mapOf(
        "categoryIds" to bubbleFilter.categoryIds,
        "showUncategorized" to bubbleFilter.showUncategorized,
        "plannedOnly" to bubbleFilter.plannedOnly,
    ),
    "listFilter" to mapOf(
        "categoryIds" to listFilter.categoryIds,
        "showUncategorized" to listFilter.showUncategorized,
    ),
    "listSort" to mapOf("by" to listSort.by.wire, "order" to listSort.order.wire),
)
````

- [ ] **Step 4: Тест проходит**

Run: `android/gradlew -p android check`
Expected: `core tests: 87 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add android/core/src/main/kotlin/com/pmobile78/toround/core/model/Category.kt android/core/src/main/kotlin/com/pmobile78/toround/core/model/Records.kt android/core/src/main/kotlin/com/pmobile78/toround/core/model/Settings.kt android/core/src/main/kotlin/com/pmobile78/toround/core/model/Task.kt android/core/src/test/kotlin/com/pmobile78/toround/core/model/ModelsTest.kt
git commit -F - <<'EOF'
feat(android): models of tasks, categories and settings

Stage 1.1, task 4. core builds a Task (with its due and repeat), a Category and
the Settings from a record only after the validator accepts it, and refuses
any other with its errors. Settings go back to a record unchanged, so the app
can write users/{uid}.settings. defaultSettings and normalizeLanguage give the
defaults of spec 3.5 in the language of the device, the same as the example
"defaults" of contract/fixtures/settings.json.
EOF
```

---

### Task 5: Модуль `app` — тема, языки, иконка

**Files:**
- Modify: `android/gradle/libs.versions.toml`, `android/build.gradle.kts`, `android/settings.gradle.kts`
- Create: `android/app/build.gradle.kts`, `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/kotlin/com/pmobile78/toround/MainActivity.kt`, `android/app/src/main/kotlin/com/pmobile78/toround/ui/theme/Theme.kt`
- Create: `android/app/src/main/res/values/strings.xml`, `values-uk/strings.xml`, `values/colors.xml`, `values-night/colors.xml`, `values/themes.xml`, `values-night/themes.xml`, `drawable/ic_launcher_foreground.xml`, `drawable/ic_launcher_monochrome.xml`, `mipmap-anydpi/ic_launcher.xml`, `xml/data_extraction_rules.xml`, `xml/backup_rules.xml` (все — в `android/app/src/main/res/`)

**Interfaces:**
- Consumes: `src/appName.js` (`APP_NAME`); модуль `:core` подключён зависимостью, но в этой задаче не используется.
- Produces: `com.pmobile78.toround.MainActivity` (`ComponentActivity`, экран `FoundationScreen`); `com.pmobile78.toround.ui.theme.ToRoundTheme(darkTheme: Boolean = isSystemInDarkTheme(), content)`; строка `app_name` (из сборки) и `foundation_ready` (en, uk); тема окна `Theme.ToRound`; иконка `@mipmap/ic_launcher`.

- [ ] **Step 1: Плагины Android и Compose**

Изменения в `android/gradle/libs.versions.toml`:

````diff
diff --git a/android/gradle/libs.versions.toml b/android/gradle/libs.versions.toml
index bad49ca..7a5e12a 100644
--- a/android/gradle/libs.versions.toml
+++ b/android/gradle/libs.versions.toml
@@ -1,13 +1,23 @@
 [versions]
+activityCompose = "1.13.0"
+agp = "9.4.1"
+composeBom = "2026.09.00"
 junit = "6.1.3"
 kotlin = "2.4.21"
 kotlinxSerialization = "1.12.0"
 
 [libraries]
+androidx-activity-compose = { module = "androidx.activity:activity-compose", version.ref = "activityCompose" }
+androidx-compose-bom = { module = "androidx.compose:compose-bom", version.ref = "composeBom" }
+androidx-compose-material3 = { module = "androidx.compose.material3:material3" }
+androidx-compose-ui-tooling = { module = "androidx.compose.ui:ui-tooling" }
+androidx-compose-ui-tooling-preview = { module = "androidx.compose.ui:ui-tooling-preview" }
 junit-bom = { module = "org.junit:junit-bom", version.ref = "junit" }
 junit-jupiter = { module = "org.junit.jupiter:junit-jupiter" }
 junit-platform-launcher = { module = "org.junit.platform:junit-platform-launcher" }
 kotlinx-serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "kotlinxSerialization" }
 
 [plugins]
+android-application = { id = "com.android.application", version.ref = "agp" }
+kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
 kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
````

Изменения в `android/build.gradle.kts`:

````diff
diff --git a/android/build.gradle.kts b/android/build.gradle.kts
index cfed2ec..f3619c5 100644
--- a/android/build.gradle.kts
+++ b/android/build.gradle.kts
@@ -1,4 +1,6 @@
 // Plugins are declared once here, so every module shares one Kotlin Gradle plugin.
 plugins {
+    alias(libs.plugins.android.application) apply false
+    alias(libs.plugins.kotlin.compose) apply false
     alias(libs.plugins.kotlin.jvm) apply false
 }
````

Изменения в `android/settings.gradle.kts`:

````diff
diff --git a/android/settings.gradle.kts b/android/settings.gradle.kts
index 27356dd..d943286 100644
--- a/android/settings.gradle.kts
+++ b/android/settings.gradle.kts
@@ -22,4 +22,5 @@ dependencyResolutionManagement {
 
 rootProject.name = "to-round-android"
 
+include(":app")
 include(":core")
````

- [ ] **Step 2: Сборка модуля и манифест**

`resValues = true` нужен явно: в AGP 9 он по умолчанию выключен. `localeFilters` оставляет в приложении только английские и украинские тексты, в том числе у библиотек.

Файл `android/app/build.gradle.kts`:

````kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

// The display name is set only in src/appName.js (CLAUDE.md); the build takes it from there.
val appName: String = rootDir.resolve("../src/appName.js").readText()
    .let { Regex("""APP_NAME = '([^']+)'""").find(it) }
    ?.groupValues?.get(1)
    ?: error("APP_NAME not found in src/appName.js")

android {
    namespace = "com.pmobile78.toround"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.pmobile78.toround"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0"
        resValue("string", "app_name", appName)
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        resValues = true
    }

    // The app speaks English and Ukrainian only, also in the texts of its libraries.
    androidResources {
        localeFilters += listOf("en", "uk")
    }
}

dependencies {
    implementation(project(":core"))
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
````

Файл `android/app/src/main/AndroidManifest.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Everything lives in Firestore; a restored copy of the app's files would only be stale. -->
    <application
        android:allowBackup="false"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.ToRound">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
````

Файл `android/app/src/main/res/xml/data_extraction_rules.xml` (Android 12+):

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- Nothing to back up or move to a new phone: tasks and settings live in Firestore. -->
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="root" path="." />
    </cloud-backup>
    <device-transfer>
        <exclude domain="root" path="." />
    </device-transfer>
</data-extraction-rules>
````

Файл `android/app/src/main/res/xml/backup_rules.xml` (Android 8–11):

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- Android 8–11: nothing to back up, tasks and settings live in Firestore. -->
<full-backup-content>
    <exclude domain="root" path="." />
</full-backup-content>
````

- [ ] **Step 3: Тема в цветах To-Round и экран**

Все роли цветовой схемы Material 3 заданы явно: иначе в контейнерах и панелях проступил бы фиолетовый цвет схемы по умолчанию.

Файл `android/app/src/main/kotlin/com/pmobile78/toround/ui/theme/Theme.kt`:

````kotlin
package com.pmobile78.toround.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// The colours of the web's "classic" design (src/theme/designs/classic.js): blue #3B7DED, accent
// #FF6B6B, error #f44336, background #f5f5f5 / #121212, panels #ffffff / #1e1e1e. The other roles
// are neutral greys and tints of the blue, so Material 3 adds none of its default purple.
private val Blue = Color(0xFF3B7DED)
private val Coral = Color(0xFFFF6B6B)
private val Red = Color(0xFFF44336)

private val LightColors = lightColorScheme(
    primary = Blue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD8E2FF),
    onPrimaryContainer = Color(0xFF001A41),
    inversePrimary = Color(0xFFADC6FF),
    secondary = Coral,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFFFDAD7),
    onSecondaryContainer = Color(0xFF410004),
    tertiary = Blue,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFD8E2FF),
    onTertiaryContainer = Color(0xFF001A41),
    background = Color(0xFFF5F5F5),
    onBackground = Color.Black,
    surface = Color.White,
    onSurface = Color.Black,
    surfaceVariant = Color(0xFFEEEEEE),
    onSurfaceVariant = Color(0xFF666666),
    surfaceTint = Blue,
    inverseSurface = Color(0xFF303030),
    inverseOnSurface = Color(0xFFF5F5F5),
    error = Red,
    onError = Color.White,
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
    outline = Color(0xFF9E9E9E),
    outlineVariant = Color(0xFFE0E0E0),
    surfaceBright = Color.White,
    surfaceDim = Color(0xFFE0E0E0),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFFAFAFA),
    surfaceContainer = Color(0xFFF5F5F5),
    surfaceContainerHigh = Color(0xFFEEEEEE),
    surfaceContainerHighest = Color(0xFFE8E8E8),
)

private val DarkColors = darkColorScheme(
    primary = Blue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF1F4E9E),
    onPrimaryContainer = Color(0xFFD8E2FF),
    inversePrimary = Blue,
    secondary = Coral,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFF8C1D1D),
    onSecondaryContainer = Color(0xFFFFDAD7),
    tertiary = Blue,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFF1F4E9E),
    onTertiaryContainer = Color(0xFFD8E2FF),
    background = Color(0xFF121212),
    onBackground = Color.White,
    surface = Color(0xFF1E1E1E),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF2C2C2C),
    onSurfaceVariant = Color(0xFFAAAAAA),
    surfaceTint = Blue,
    inverseSurface = Color(0xFFE0E0E0),
    inverseOnSurface = Color(0xFF1E1E1E),
    error = Red,
    onError = Color.White,
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    outline = Color(0xFF757575),
    outlineVariant = Color(0xFF333333),
    surfaceBright = Color(0xFF383838),
    surfaceDim = Color(0xFF121212),
    surfaceContainerLowest = Color(0xFF0E0E0E),
    surfaceContainerLow = Color(0xFF1A1A1A),
    surfaceContainer = Color(0xFF1E1E1E),
    surfaceContainerHigh = Color(0xFF262626),
    surfaceContainerHighest = Color(0xFF303030),
)

/** Material 3 in the colours of To-Round; Android's wallpaper colours (Material You) are not used. */
@Composable
fun ToRoundTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (darkTheme) DarkColors else LightColors, content = content)
}
````

Файл `android/app/src/main/kotlin/com/pmobile78/toround/MainActivity.kt`:

````kotlin
package com.pmobile78.toround

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.pmobile78.toround.ui.theme.ToRoundTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ToRoundTheme {
                FoundationScreen()
            }
        }
    }
}

/** The only screen of sub-plan 1.1: the name and the promise of sign-in (sub-plan 1.2). */
@Composable
fun FoundationScreen() {
    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Image(
                painter = painterResource(R.drawable.ic_launcher_foreground),
                contentDescription = null,
                modifier = Modifier.size(160.dp),
            )
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.foundation_ready),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun FoundationScreenPreview() {
    ToRoundTheme {
        FoundationScreen()
    }
}
````

- [ ] **Step 4: Ресурсы: строки, цвета окна, иконка**

Файл `android/app/src/main/res/values/strings.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- app_name comes from src/appName.js (app/build.gradle.kts). -->
<resources>
    <string name="foundation_ready">The app foundation is ready. Sign-in comes in the next update.</string>
</resources>
````

Файл `android/app/src/main/res/values-uk/strings.xml` (апостроф — типографский `’`, его не нужно экранировать):

````xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="foundation_ready">Основу застосунку готово. Вхід з’явиться в наступному оновленні.</string>
</resources>
````

Файл `android/app/src/main/res/values/colors.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="window_background">#FFF5F5F5</color>
    <color name="ic_launcher_background">#FFFFFFFF</color>
</resources>
````

Файл `android/app/src/main/res/values-night/colors.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="window_background">#FF121212</color>
</resources>
````

Файл `android/app/src/main/res/values/themes.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- The window behind Compose; the screens take their colours from ToRoundTheme. -->
    <style name="Theme.ToRound" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:windowBackground">@color/window_background</item>
    </style>
</resources>
````

Файл `android/app/src/main/res/values-night/themes.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.ToRound" parent="android:Theme.Material.NoActionBar">
        <item name="android:windowBackground">@color/window_background</item>
    </style>
</resources>
````

Иконка: круги сняты с `public/web-app-manifest-512x512.png` (центры, радиусы, цвета заливки и обводки) и вписаны в безопасную зону адаптивной иконки (радиус 32 из 33 dp); порядок слоёв — как на веб-иконке: бирюзовый, жёлтый, оранжевый.

Файл `android/app/src/main/res/drawable/ic_launcher_foreground.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- The three bubbles of the web icon (public/web-app-manifest-512x512.png), within the safe zone of an adaptive icon. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#4FAD90"
        android:pathData="M58,52.5a13.7,13.7 0,1 0,27.4 0a13.7,13.7 0,1 0,-27.4 0"
        android:strokeWidth="1"
        android:strokeColor="#378E7A" />
    <path
        android:fillColor="#FCBE3B"
        android:pathData="M26.3,44.9a18.1,18.1 0,1 0,36.2 0a18.1,18.1 0,1 0,-36.2 0"
        android:strokeWidth="1.2"
        android:strokeColor="#DA9413" />
    <path
        android:fillColor="#F5803A"
        android:pathData="M41.2,72.8a12.7,12.7 0,1 0,25.4 0a12.7,12.7 0,1 0,-25.4 0"
        android:strokeWidth="1"
        android:strokeColor="#CF6025" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_launcher_monochrome.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- The bubbles of ic_launcher_foreground as outlines, for icons tinted by the system theme. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:pathData="M58,52.5a13.7,13.7 0,1 0,27.4 0a13.7,13.7 0,1 0,-27.4 0"
        android:strokeWidth="2.5"
        android:strokeColor="#FF000000" />
    <path
        android:pathData="M26.3,44.9a18.1,18.1 0,1 0,36.2 0a18.1,18.1 0,1 0,-36.2 0"
        android:strokeWidth="2.5"
        android:strokeColor="#FF000000" />
    <path
        android:pathData="M41.2,72.8a12.7,12.7 0,1 0,25.4 0a12.7,12.7 0,1 0,-25.4 0"
        android:strokeWidth="2.5"
        android:strokeColor="#FF000000" />
</vector>
````

Файл `android/app/src/main/res/mipmap-anydpi/ic_launcher.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>
````

- [ ] **Step 5: Отладочная сборка**

```bash
android/gradlew -p android :app:assembleDebug
/media/big_disk/android/sdk/build-tools/37.0.0/aapt2 dump badging android/app/build/outputs/apk/debug/app-debug.apk | grep -E "^package|^targetSdkVersion|^application-label|^launchable-activity|^locales"
```

Expected: `BUILD SUCCESSFUL` (первая сборка `app` — несколько минут: AGP скачивает библиотеки и, если их нет, ставит платформу Android 37.0 и Build-Tools 36); затем
`package: name='com.pmobile78.toround' versionCode='1' versionName='0.1.0' …`, `targetSdkVersion:'37'`, ровно две подписи — `application-label:'ToDo-Round'` и `application-label-uk:'ToDo-Round'`, `launchable-activity: name='com.pmobile78.toround.MainActivity'` и `locales: '--_--' 'uk'` (без фильтра языков библиотеки добавили бы ещё около 80).

- [ ] **Step 6: Тесты и Lint**

Run: `android/gradlew -p android check` и `cat android/app/build/reports/lint-results-debug.txt`
Expected: `BUILD SUCCESSFUL` (тесты `core` не менялись и не перезапускаются); отчёт Lint — `No issues found.`

- [ ] **Step 7: Commit**

```bash
git add android/app/build.gradle.kts android/app/src/main/AndroidManifest.xml android/app/src/main/kotlin/com/pmobile78/toround/MainActivity.kt android/app/src/main/kotlin/com/pmobile78/toround/ui/theme/Theme.kt android/app/src/main/res/drawable/ic_launcher_foreground.xml android/app/src/main/res/drawable/ic_launcher_monochrome.xml android/app/src/main/res/mipmap-anydpi/ic_launcher.xml android/app/src/main/res/values-night/colors.xml android/app/src/main/res/values-night/themes.xml android/app/src/main/res/values-uk/strings.xml android/app/src/main/res/values/colors.xml android/app/src/main/res/values/strings.xml android/app/src/main/res/values/themes.xml android/app/src/main/res/xml/backup_rules.xml android/app/src/main/res/xml/data_extraction_rules.xml android/build.gradle.kts android/gradle/libs.versions.toml android/settings.gradle.kts
git commit -F - <<'EOF'
feat(android): the app module: To-Round theme, English and Ukrainian, icon

Stage 1.1, task 5. app is an Android application (AGP 9.4.1, Compose, Material 3)
with one screen: the name and the promise of sign-in. The name comes from
src/appName.js at build time, the colours are those of the web's "classic"
design in light and dark (no wallpaper colours), the texts are English and
Ukrainian and the libraries' other languages are left out. The launcher icon
draws the three bubbles of the web icon as a vector, with a monochrome layer.
Nothing is backed up or moved to a new phone: the data lives in Firestore.
EOF
```

---

### Task 6: Подпись релиза, документация, проверка на эмуляторе

**Files:**
- Modify: `android/app/build.gradle.kts`, `CLAUDE.md`, `docs/README.md`, `contract/README.md`
- Create: `docs/android.md`

**Interfaces:**
- Consumes: всё из задач 1–5.
- Produces: свойства Gradle `toround.release.storeFile`, `toround.release.storePassword`, `toround.release.keyAlias`, `toround.release.keyPassword` — без них релизная сборка не подписана; `docs/android.md`.

- [ ] **Step 1: Подпись релиза из свойств Gradle**

Изменения в `android/app/build.gradle.kts`:

````diff
diff --git a/android/app/build.gradle.kts b/android/app/build.gradle.kts
index db8283e..5da61fd 100644
--- a/android/app/build.gradle.kts
+++ b/android/app/build.gradle.kts
@@ -9,6 +9,11 @@ val appName: String = rootDir.resolve("../src/appName.js").readText()
     ?.groupValues?.get(1)
     ?: error("APP_NAME not found in src/appName.js")
 
+// The release key stays outside the repository: its path and passwords come from Gradle
+// properties, normally ~/.gradle/gradle.properties (docs/android.md). Without them the release
+// build is left unsigned.
+val releaseStoreFile: String? = providers.gradleProperty("toround.release.storeFile").orNull
+
 android {
     namespace = "com.pmobile78.toround"
     compileSdk = 37
@@ -22,11 +27,23 @@ android {
         resValue("string", "app_name", appName)
     }
 
+    signingConfigs {
+        if (releaseStoreFile != null) {
+            create("release") {
+                storeFile = file(releaseStoreFile)
+                storePassword = providers.gradleProperty("toround.release.storePassword").get()
+                keyAlias = providers.gradleProperty("toround.release.keyAlias").get()
+                keyPassword = providers.gradleProperty("toround.release.keyPassword").get()
+            }
+        }
+    }
+
     buildTypes {
         release {
             isMinifyEnabled = true
             isShrinkResources = true
             proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
+            signingConfig = signingConfigs.findByName("release")
         }
     }
 
````

- [ ] **Step 2: Релиз без ключа не подписан**

Run: `android/gradlew -p android :app:assembleRelease` и `ls android/app/build/outputs/apk/release/`
Expected: `BUILD SUCCESSFUL` (R8 — несколько минут); в папке — `app-release-unsigned.apk` (около 770 КБ) и `output-metadata.json`.

- [ ] **Step 3: Документация**

Файл `docs/android.md`:

````markdown
# Android-приложение

Нативное Android-приложение ToDo-Round: Kotlin, Jetpack Compose, Material 3. Работает с тем же проектом Firebase и теми же данными (контракт v2), что и веб. План работ — [дорожная карта](superpowers/specs/2026-10-14-android-roadmap.md); этап 1 — [спецификация](superpowers/specs/2026-10-22-stage-1-android-foundation-design.md).

## Что где

| Путь | Что внутри |
|---|---|
| `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели. Тесты (JUnit) читают общие примеры из `contract/` |
| `android/app` | Android-приложение: экраны на Compose, тема, строки en/uk, иконка |
| `android/gradle/libs.versions.toml` | версии библиотек и плагинов |
| `contract/` | общие примеры данных для веба, функций и Android ([README](../contract/README.md)) |

Название приложения сборка берёт из `src/appName.js` — как и веб.

## Окружение

Всё стоит на `/media/big_disk/android/` (системный диск почти заполнен):

- Android Studio — `/media/big_disk/android/android-studio`, запуск командой `studio`; SDK — `/media/big_disk/android/sdk`;
- переменные окружения — `/media/big_disk/android/android-env.sh` (подключён из `~/.bashrc` и `~/.profile`);
- `~/.gradle` и `~/.android` — ссылки на `/media/big_disk/android/home/…`.

Gradle работает на JDK из Android Studio (JBR), как и сама Android Studio. Это задаёт строка в `~/.gradle/gradle.properties`:

```properties
org.gradle.java.home=/media/big_disk/android/android-studio/jbr
```

В том же файле живут настройки релизного ключа с паролями (ниже). Файл вне репозитория. Целиком его не выводить — ни в терминал, ни в чат с ассистентом: нужную строку смотреть по одной, например `grep '^org.gradle.java.home' ~/.gradle/gradle.properties`.

Первая сборка скачивает Gradle и библиотеки, а недостающие пакеты SDK (Build-Tools, платформу Android) ставит сама — лицензии SDK уже приняты.

## Команды

Из корня репозитория:

```bash
android/gradlew -p android check                    # все тесты и Android Lint
android/gradlew -p android :core:test               # только тесты контракта на примерах contract/
android/gradlew -p android :app:assembleDebug       # отладочная сборка
android/gradlew -p android :app:installDebug        # поставить отладочную сборку на подключённое устройство
android/gradlew -p android :app:assembleRelease     # релизная сборка (R8; подписана, если настроен ключ)
android/gradlew -p android --stop                   # остановить демон Gradle и освободить память
```

- Отладочный APK — `android/app/build/outputs/apk/debug/app-debug.apk`, релизный — `android/app/build/outputs/apk/release/`.
- Отчёт Lint — `android/app/build/reports/lint-results-debug.txt`.
- Изменили пример в `contract/` — прогоните и тесты Android: `android/gradlew -p android :core:test`.
- `core` собирается против JDK, а работает на Android 8+. Флаг `-Xjdk-release=17` не даёт привязаться к методам Java 18+ (например, `removeFirst()` из Java 21), но методы Java 9–17, которых нет в Android 8 (`List.of` и т. п.), компилятор не поймает. В `core` пользоваться `java.time` и стандартной библиотекой Kotlin.
- `:app:installDebug` ставит сборку на все подключённые устройства сразу; одно выбирают переменной `ANDROID_SERIAL=<серийный номер из adb devices>`.

## Телефон (Redmi 9, MIUI)

Один раз включить на телефоне:

1. «Настройки → О телефоне» — 7 раз нажать на «Версия MIUI»: появится режим разработчика.
2. «Настройки → Расширенные настройки → Для разработчиков»:
   - «Отладка по USB»;
   - «Установка через USB» — MIUI просит войти в Mi-аккаунт;
   - «Отладка по USB (настройки безопасности)».
3. Подключить телефон кабелем и разрешить отладку для этого компьютера в окне на телефоне.

Проверка: `adb devices` показывает телефон со словом `device`. Затем `adb -d install -r android/app/build/outputs/apk/debug/app-debug.apk` (`-d` — единственное устройство на кабеле; так команда не спутает телефон с эмулятором).

Без кабеля (Android 11+): «Для разработчиков → Отладка по Wi-Fi → Подключить устройство с помощью кода», затем на компьютере `adb pair <адрес>:<порт>` с кодом с экрана и `adb connect <адрес>:<порт>`; дальше команды `adb -s <адрес>:<порт> …`.

Если MIUI не даёт ставить по USB: скопировать APK на телефон и открыть его в файловом менеджере (разрешить установку из этого источника).

## Эмулятор

Памяти 14 ГБ, поэтому эмулятор запускается без окна и без Android Studio, а демон Gradle перед этим останавливается. Команды `adb -e` обращаются к единственному эмулятору, даже если подключён и телефон:

```bash
android/gradlew -p android :app:assembleDebug
android/gradlew -p android --stop
emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect &
adb -e wait-for-device; until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done
adb -e uninstall com.pmobile78.toround
adb -e install android/app/build/outputs/apk/debug/app-debug.apk
adb -e shell am start -n com.pmobile78.toround/.MainActivity
mkdir -p /media/big_disk/android/work && adb -e exec-out screencap -p > /media/big_disk/android/work/screen.png
adb -e emu kill
```

- Эмулятор загружается около двух минут. Под нагрузкой система эмулятора может показать окно «… isn't responding» (службы Google, лончер или интерфейс системы) — нажать «Wait»; к приложению это не относится.
- `-no-snapshot` означает полную загрузку, а не чистый эмулятор: поставленные приложения и настройки сохраняются между запусками. Поэтому перед установкой прежнее приложение удаляют — сборка с другим ключом поверх не встанет. Совсем чистый старт — флаг `-wipe-data`.
- Тёмная тема: `adb -e shell cmd uimode night yes` (вернуть — `night no`); украинский язык приложения: `adb -e shell cmd locale set-app-locales com.pmobile78.toround --locales uk-UA`.

## Релизный ключ

Отладочную сборку подписывает стандартный ключ Android (`~/.android/debug.keystore`; создаётся первой сборкой). Релизную — свой ключ, который хранится вне репозитория. Создаёт его владелец; пароль знает только он.

1. Создать ключ (команда спросит пароль и данные владельца):

   ```bash
   mkdir -p /media/big_disk/android/keys
   /media/big_disk/android/android-studio/jbr/bin/keytool -genkeypair -keystore /media/big_disk/android/keys/toround-release.jks -storetype PKCS12 -alias toround -keyalg RSA -keysize 4096 -validity 10000
   ```

2. Сохранить файл ключа и пароль в надёжном месте (например, бэкап на другом диске и менеджер паролей). Без ключа нельзя выпустить обновление приложения, подписанного им.
3. Дописать в `~/.gradle/gradle.properties` (после этого файл не показывать целиком — в нём пароли):

   ```properties
   toround.release.storeFile=/media/big_disk/android/keys/toround-release.jks
   toround.release.storePassword=<пароль>
   toround.release.keyAlias=toround
   toround.release.keyPassword=<пароль>
   ```

4. Проверить: `android/gradlew -p android :app:assembleRelease` даёт `app-release.apk`, а `apksigner verify --print-certs` (из `/media/big_disk/android/sdk/build-tools/<версия>/`) показывает сертификат ключа.

Без этих строк релизная сборка остаётся неподписанной (`app-release-unsigned.apk`). Файлы `*.jks` и `*.keystore` в `android/` игнорируются git.

Приложения с разными ключами не ставятся друг поверх друга: чтобы сменить отладочную сборку на релизную, приложение сначала удаляют. Данные при этом не теряются — они в Firestore.
````

Изменения в `docs/README.md`:

````diff
diff --git a/docs/README.md b/docs/README.md
index 5cce372..1632e5c 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -10,6 +10,7 @@
 | [firebase.md](firebase.md) | Firebase: аутентификация, модель данных Firestore, правила доступа |
 | [deployment.md](deployment.md) | Ручной деплой на GitHub Pages через GitHub Actions и управление версиями |
 | [favicon.md](favicon.md) | Набор иконок и web-манифест |
+| [android.md](android.md) | Android-приложение: сборка, телефон и эмулятор, релизный ключ |
 
 ## Как устроены фичи
 
````

Изменения в `CLAUDE.md`:

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index e56aa9c..fc78104 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -2,7 +2,7 @@
 
 This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
 
-Human-facing documentation lives in [`docs/`](docs/README.md) (setup, Firebase, notifications, deployment, i18n, migration and backup).
+Human-facing documentation lives in [`docs/`](docs/README.md) (setup, Firebase, notifications, deployment, i18n, migration and backup, the Android app).
 
 ## Commands
 
@@ -22,6 +22,11 @@ npm run deploy         # build + push to gh-pages branch
 npm run version:patch
 npm run version:minor
 npm run version:major
+
+# Android app (android/; Gradle runs on Android Studio's JBR, see docs/android.md)
+android/gradlew -p android check              # core contract tests on contract/ + Android Lint
+android/gradlew -p android :core:test         # contract tests only
+android/gradlew -p android :app:assembleDebug # debug APK
 ```
 
 **Install:** always use `npm ci --legacy-peer-deps` — there are peer dependency conflicts between packages.
@@ -84,6 +89,14 @@ functions/
   locales/                   # notification text: notifications.en.json, notifications.uk.json
 ```
 
+### Android app
+
+`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, with JUnit tests on `contract/`; `app` — the Android application. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
+
+- Never print `~/.gradle/gradle.properties` whole (`cat`, `less`, an unanchored `grep`): it holds the release key passwords. Read one non-secret line at a time, e.g. `grep '^org.gradle.java.home' ~/.gradle/gradle.properties`.
+- `core` compiles against the JDK but runs on Android 8+: `-Xjdk-release=17` keeps out Java 18+ methods, not the Java 9–17 ones Android 8 lacks (`List.of` …). Use `java.time` and the Kotlin standard library there.
+- With a phone and the emulator both connected, address one: `adb -e` (the emulator), `adb -d` (the USB phone).
+
 ### Firestore data model
 
 Data contract v2 ([spec](docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md), section 3); the rules check every document's shape (`firestore.rules`).
@@ -131,4 +144,4 @@ Project work is tracked in [GitHub Issues](https://github.com/PMobile78/to-round
 - `HtmlRenderer.jsx` uses DOMPurify — any HTML rendering must go through it
 - `firestore.rules` is now in the repo and must be kept in sync with `firebase.json` (`"firestore": { "rules": "firestore.rules" }`)
 - Window/panel/header backgrounds come from the MUI theme (`hooks/useThemeMode.js`), never hardcoded hex/rgba. Wrap a standalone panel in `<Paper>` with no explicit `backgroundColor` (e.g. `TasksCategoriesPanel`, list-as-main-screen `Paper elevation={16}`); a window header (`DialogTitle` / header `Box`) must **not** set its own `backgroundColor` — it inherits the window's Paper background. Header text uses `text.primary`, not `'white'`. Dialog body bg comes from `getDialogPaperStyles()` (`rgba(...,0.95)`).
-- The app's display name lives only in `src/appName.js` (`APP_NAME`): the UI imports it, and `appNamePlugin` in `vite.config.js` fills the `%APP_NAME%` placeholders in `index.html` and generates `site.webmanifest` (there is no static `public/site.webmanifest`). Never hardcode the name — `src/appName.test.js` fails on a literal. The name in Firebase Auth emails is the Firebase Console *Public-facing name* (Project settings → General) and is changed there by hand.
+- The app's display name lives only in `src/appName.js` (`APP_NAME`): the UI imports it, and `appNamePlugin` in `vite.config.js` fills the `%APP_NAME%` placeholders in `index.html` and generates `site.webmanifest` (there is no static `public/site.webmanifest`); the Android build reads it too (`android/app/build.gradle.kts`). Never hardcode the name — `src/appName.test.js` fails on a literal. The name in Firebase Auth emails is the Firebase Console *Public-facing name* (Project settings → General) and is changed there by hand.
````

Изменения в `contract/README.md`:

````diff
diff --git a/contract/README.md b/contract/README.md
index 87b124d..32daa01 100644
--- a/contract/README.md
+++ b/contract/README.md
@@ -20,4 +20,4 @@
 - Эталон правил часовых поясов — `java.time.ZonedDateTime.of`: несуществующее время сдвигается вперёд на длину перехода, неоднозначное берётся с более ранним смещением.
 - В примерах с переходом на летнее время используются зоны со стабильными правилами (`America/New_York`, `Europe/Berlin`), а не `Europe/Kyiv`: правила Украины могут измениться в базе tzdata.
 - Тесты правил Firestore (`firestore-tests/`) переводят записи в форму Firestore: время → `Timestamp`, плюс `schemaVersion` и служебные поля. Правила принимают каждую правильную запись. Неправильные записи, которые правила проверить не могут (значения внутри списков, база часовых поясов), перечислены в тестах явно.
-- Изменили пример — прогоните тесты всех клиентов, которые его читают.
+- Изменили пример — прогоните тесты всех клиентов, которые его читают: `npm run test:all` (веб, функции, правила) и `android/gradlew -p android :core:test` (Android, [docs/android.md](../docs/android.md)).
````

- [ ] **Step 4: Полная проверка и неизменный веб**

```bash
android/gradlew -p android clean check
tail -1 android/app/build/reports/lint-results-debug.txt
git diff --stat main...HEAD -- . ':!android' ':!docs' ':!CLAUDE.md' ':!contract/README.md'
```

Expected: `core tests: 87 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`, `No issues found.`; `git diff --stat` ничего не выводит — кроме `android/`, документации и `contract/README.md`, ветка ничего не меняла: веб, примеры контракта, правила, функции, CI и настройки Firebase прежние.

- [ ] **Step 5: Релиз с ключом подписан — проверка одноразовым ключом**

Ключ ниже — только для проверки, это не ключ владельца. Обе сборки остаются в `android/app/build/outputs/apk/` для шага 6:

```bash
K=/media/big_disk/android/work/throwaway-release.jks
mkdir -p /media/big_disk/android/work && rm -f $K
/media/big_disk/android/android-studio/jbr/bin/keytool -genkeypair -keystore $K -storetype PKCS12 -storepass throwaway-test -keypass throwaway-test -alias throwaway -keyalg RSA -keysize 2048 -validity 2 -dname "CN=ToDo-Round throwaway test"
android/gradlew -p android :app:assembleDebug :app:assembleRelease -Ptoround.release.storeFile=$K -Ptoround.release.storePassword=throwaway-test -Ptoround.release.keyAlias=throwaway -Ptoround.release.keyPassword=throwaway-test
/media/big_disk/android/sdk/build-tools/37.0.0/apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk 2>/dev/null | grep 'certificate DN'
rm -f $K
```

Expected: `BUILD SUCCESSFUL`; `V2 Signer: certificate DN: CN=ToDo-Round throwaway test`.

- [ ] **Step 6: Проверка вживую на эмуляторе**

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Поставить обе сборки по очереди. Данные эмулятора сохраняются между запусками, поэтому сначала удаляется то, что там осталось: `Success` — приложение было и удалено, `Failure […]` — его не было:

```bash
source /media/big_disk/android/android-env.sh
adb -e uninstall com.pmobile78.toround
adb -e install android/app/build/outputs/apk/debug/app-debug.apk
adb -e shell am start -W -n com.pmobile78.toround/.MainActivity | grep Status
adb -e exec-out screencap -p > /media/big_disk/android/work/stage-1-1-debug.png
adb -e uninstall com.pmobile78.toround
adb -e install android/app/build/outputs/apk/release/app-release.apk
adb -e shell am start -W -n com.pmobile78.toround/.MainActivity | grep Status
adb -e exec-out screencap -p > /media/big_disk/android/work/stage-1-1-release.png
```

Expected: оба раза `Success` после `install` и `Status: ok`; на обоих снимках — три пузыря, «ToDo-Round» синим `#3B7DED` и строка «The app foundation is ready. Sign-in comes in the next update.». Холодный старт релизной сборки заметно быстрее отладочной (в черновике — 2,2 с против 6 с). Если поверх приложения окно «… isn't responding» (службы Google, лончер или интерфейс системы перегруженного эмулятора) — `adb -e shell input tap 322 1364` (кнопка «Wait») и снимок заново.

По желанию: `adb -e shell cmd uimode night yes` и `adb -e shell cmd locale set-app-locales com.pmobile78.toround --locales uk-UA`, затем снова `am start` — тёмная тема и строка «Основу застосунку готово. Вхід з’явиться в наступному оновленні.».

Оставить эмулятор чистым для подплана 1.2 и выключить:

```bash
source /media/big_disk/android/android-env.sh
adb -e uninstall com.pmobile78.toround
adb -e shell cmd uimode night no
adb -e emu kill
```

Expected: `Success`, `Night mode: no`, `OK: killing emulator, bye bye`.

- [ ] **Step 7: Телефон — по желанию владельца**

Если владелец подключил Redmi 9 кабелем (`docs/android.md`, раздел «Телефон»): `adb devices` показывает его со словом `device`, затем `adb -d install -r android/app/build/outputs/apk/debug/app-debug.apk`; владелец открывает «ToDo-Round» и смотрит иконку, название и цвета. Если на телефоне уже стоит сборка с другим ключом, сначала `adb -d uninstall com.pmobile78.toround`. Телефон не подключён — шаг пропускается с отметкой в журнале исполнения.

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md android/app/build.gradle.kts contract/README.md docs/README.md docs/android.md
git commit -F - <<'EOF'
feat(android): release signing from outside the repository, docs/android.md

Stage 1.1, task 6. The release build (R8) is signed when Gradle properties name
the key, normally in ~/.gradle/gradle.properties; without them it stays
unsigned, and no key or password is in the repository. docs/android.md tells
how to build, how to put the app on the Redmi 9 (MIUI developer settings, adb
over USB or Wi-Fi), how to run the emulator on this machine, whose data
survives a restart, and how the owner creates the release key. CLAUDE.md,
docs/README.md and contract/README.md point to it; CLAUDE.md also says never
to print ~/.gradle/gradle.properties whole, as it holds the key's passwords,
and contract/README.md adds the Android tests to the rule for a changed
example.
EOF
```

---

## Передача в 1.2

Подплан 1.2 «Firebase: вход и данные» опирается на этот код.

- **Ядро (`com.pmobile78.toround.core`):** `contract.validateTask(record, acceptUnknownZone)`, `validateCategory`, `validateSettings`, `isValidId`, `SCHEMA_VERSION`; `contract.toInstant`, `toLocal`, `parseLocal`, `formatLocal`, `isValidTimeZone`, `deviceTimeZone`; `model.taskFromRecord(record, acceptUnknownZone)`, `categoryFromRecord`, `settingsFromRecord`, `Settings.toRecord()`, `defaultSettings(deviceLanguage)`, `normalizeLanguage`. Запись — `Map<String, Any?>` в форме бэкапа: время — ISO-строки, id — поле.
- **Документ Firestore → запись** (раздел 6 спецификации), как `taskFromDoc` и `categoryFromDoc` в `src/services/data/convert.js`: берутся только поля формы бэкапа, а служебные отбрасываются — у задачи `schemaVersion`, `overdueAt`, `nextNotifyAt`, у категории `schemaVersion`, `createdAt`, `updatedAt`. Иначе проверка отвергнет каждый документ как `unknown field`. Затем `Timestamp` → ISO-строка (`Instant.toString()`), id документа → поле `id` и `taskFromRecord(record, acceptUnknownZone = true)` / `categoryFromRecord(record)`; целые Firestore уже `Long`.
- **Настройки из `users/{uid}`:** `settingsFromRecord` строгий — одно незнакомое значение отвергает все настройки. Поэтому 1.2 собирает их по полям, как `settingsFromUserDoc` веба: значение по умолчанию (`defaultSettings(язык экрана).toRecord()`), поверх него — поле из документа, если оно проходит проверку, иначе остаётся значение по умолчанию (например, дизайн, который появится в будущей версии веба).
- **Документ пользователя:** `schemaVersion = SCHEMA_VERSION`, `settings = defaultSettings(язык экрана).toRecord()` как есть (числа — `Long`, списки — `null` или `List<String>`), время создания и изменения — серверное.
- **Язык приложения:** сейчас `MainActivity` — `ComponentActivity`, а тема окна `Theme.ToRound` наследует `android:Theme.Material…`. Для языка через AppCompat (раздел 8 спецификации) 1.2 переводит экран на `AppCompatActivity`, тему окна — на `Theme.AppCompat.DayNight.NoActionBar`, добавляет `androidx.appcompat` и `AppLocalesMetadataHolderService` с `autoStoreLocales` (для Android 12 телефона). `localeFilters` (en, uk) уже заданы.
- **Зона срока:** строгая `isValidTimeZone` принимает всё, что знает `ZoneId.of`, — и смещения вроде `+05:00`, `GMT+3`, `Z`, которые проверка веба (`Intl`) не берёт, а `europe/kyiv` в нижнем регистре, наоборот, отвергает. Для чтения это не важно (`acceptUnknownZone = true`), а до того, как Android начнёт писать `due.tz` (этап 2), проверку стоит сузить до `ZoneId.getAvailableZoneIds()`.
- **API Java в `core`:** `-Xjdk-release=17` не пускает методы Java 18+, но методы Java 9–17, которых нет в Android 8 (`List.of` и т. п.), компилятор не ловит, и Lint модуль на чистом Kotlin не проверяет (проверено в черновике). В `core` — только `java.time` и стандартная библиотека Kotlin.
- **Тесты `app`:** в 1.1 у `app` нет тестов (`testDebugUnitTest NO-SOURCE`). Каркас JUnit для `app` и тестов на устройстве выбирает 1.2.
- **Документация:** 1.2 дописывает в `docs/android.md` разделы про `google-services.json` и эмуляторы Firebase (разделы 3 и 5 спецификации).
- **SHA-1 отладочного ключа** для регистрации в Firebase появляется после первой отладочной сборки: `/media/big_disk/android/android-studio/jbr/bin/keytool -list -v -keystore ~/.android/debug.keystore -storepass android | grep SHA1`.
- **Эмулятор** после шага 6 задачи 6 чистый: приложения нет, тема светлая.
- **Экран-заглушка** `FoundationScreen` и строка `foundation_ready` — временные: 1.2 заменяет их экраном входа.
