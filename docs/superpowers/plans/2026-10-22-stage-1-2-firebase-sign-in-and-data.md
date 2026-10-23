# Этап 1.2: Firebase — вход и данные — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подключить Android-приложение к Firebase: вход, регистрация, сброс пароля и выход через Firebase Auth; живые задачи, категории и настройки из Firestore по контракту v2; документ нового пользователя; язык и тема аккаунта. Всё проверено тестами на устройстве против эмуляторов Firebase с настоящими `firestore.rules`.

**Architecture:** `app` берёт Firebase Auth и Firestore из Firebase BoM; настройки проекта — `google-services.json` вне git. Отладочная сборка с ключом Gradle `-Ptodoround.emulators=true` работает с эмуляторами Auth и Firestore из `firebase.json` (проект `demo-to-round`), до которых устройство доходит по своему `127.0.0.1` через `adb reverse`. Слой данных (`data/`): документ Firestore → запись формы бэкапа (`Documents.kt`) → проверка и модель ядра; репозитории — живые потоки (`Flow`) поверх слушателей Firestore; `AccountRepository` — вход и тексты ошибок Firebase Auth на en/uk. Экраны (`ui/`): вход и регистрация с переключателем EN/UK; после входа — заглушка до списка 1.3 с меню «Выйти». Язык и ночная тема — через AppCompat, поэтому `MainActivity` становится `AppCompatActivity`.

**Tech Stack:** Firebase BoM 35.1.0 (Auth 25.0.0, Firestore 27.1.0), плагин google-services 4.5.0, kotlinx-coroutines-play-services 1.11.0, AppCompat 1.8.0, Lifecycle 2.11.0 (ViewModel и Compose), Compose UI test (BOM 2026.09.00), Espresso 3.7.0, AndroidX Test runner 1.7.0 и ext-junit 1.3.0 (JUnit 4 на устройстве); тесты JVM — JUnit 6, как в 1.1. Эмуляторам Firebase нужны Firebase CLI 15 и Java 21+, как вебу.

**Spec:** [docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md](../specs/2026-10-22-stage-1-android-foundation-design.md) — разделы 2.2, 5, 6, 8, 9, 10. Обзор — [2026-10-22-stage-1-overview.md](2026-10-22-stage-1-overview.md). Основа — исполненный подплан [1.1](2026-10-22-stage-1-1-project-and-contract-core.md) и смена идентификатора на `com.pmobile78.todoround` (`09aeca7`). Контракт данных — [2026-10-14-stage-0-data-contract-v2-design.md](../specs/2026-10-14-stage-0-data-contract-v2-design.md), разделы 3.4, 3.5, 10. Весь код плана прогнан в черновой копии ветки: числа тестов и строки `Expected` — настоящие, тесты на устройстве — на эмуляторе `ToRound_API37` (Android 17).

## Global Constraints

- Ветка `stage-1-android-foundation` от `09aeca7`; спецификация, обзор и этот план — в ней. В `main` не коммитить, ничего не пушить без слова владельца.
- Веб, `contract/`, правила Firestore, Cloud Functions и CI не меняются. Исключение — документация в задаче 6: `docs/android.md` и `CLAUDE.md`.
- Все команды — из корня репозитория; Gradle — `android/gradlew -p android …`, на JBR Android Studio, как в 1.1.
- Приложение уже зарегистрировано в проекте Firebase `todo-flutter-fb8bf` (2026-10-22, с «да» владельца): `com.pmobile78.todoround`, App ID `1:699564548059:android:9246f56b0bf422d85fd1fe`, SHA-1 отладочного ключа добавлен. Регистрацию не повторять, проект Firebase не менять; `google-services.json` только скачивается (задача 1).
- Эмуляторы Firebase — из `firebase.json`: Auth на 9099, Firestore на 8180, проект `demo-to-round`. Перед запуском порты должны быть свободны: `ss -ltn | grep -E ':(9099|8180)\b'` ничего не печатает; процессы других сессий не трогать.
- Памяти 14 ГБ: Gradle и эмулятор Android одновременно не работают — сборка при работающем эмуляторе уводит машину в своп. Порядок прогона на устройстве: сборка; `android/gradlew -p android --stop`; эмулятор в фоне (`run_in_background`); ожидание загрузки одной командой с тайм-аутом 10 минут; тесты; `adb -e emu kill`.
- Тесты на устройстве идут только на сборке с `-Ptodoround.emulators=true` и сами отказываются от другой: в прод они не ходят. Итог печатает `android/device-tests.sh`: `OK (N tests)` или список ошибок.
- `adb -e` — эмулятор. Телефон Redmi 9 — только по Wi-Fi (`adb -s <адрес>:<порт>`): по кабелю от этого компьютера на телефоне бывают фантомные касания (`docs/android.md`).
- Перед `adb -e emu kill` после смены настройки эмулятора (тема) — 3 секунды и `adb -e shell sync`: эмулятор выключается мгновенно, и несохранённая настройка теряется.
- Версии библиотек и плагинов не менять. Если Lint сообщит только о вышедших новых версиях (`GradleDependency`, `AndroidGradlePluginVersion`), записать это в журнал исполнения и продолжать.
- `~/.gradle/gradle.properties` целиком не выводить: там будут пароли релизного ключа. Строки смотреть по одной.
- Код в плане взят из проверенной черновой копии без правок. Новые и переписанные целиком файлы даны полностью (перед блоком — строка с путём); изменения существующих — блоками `diff` относительно состояния после предыдущей задачи: блок можно сохранить во временный файл и применить `git apply <файл>` из корня репозитория. Блоки кода ограничены четырьмя обратными кавычками.
- Kotlin — официальный стиль; комментарии в коде — на английском. Имена тестов на устройстве — camelCase: D8 не принимает пробелы в именах методов до DEX 040, а `minSdk` — 26. Тесты JVM — с именами в обратных кавычках, как в 1.1.
- Каждая сборка печатает `[Incubating] Problems report is available at: …` и `Consider enabling configuration cache …` — это не ошибки; строки `Expected` их не упоминают.

## Review Focus

- **Прод не трогается из тестов.** Режим эмуляторов есть только в отладочной сборке с ключом; релиз всегда работает с проектом. Тесты на устройстве проверяют `BuildConfig.EMULATORS` и без ключа падают, а `BackendTest` проверяет, что правила эмулятора — настоящие: чужой документ закрыт (`PERMISSION_DENIED`). Задача 1.
- **Документ Firestore → запись.** Служебные поля (`schemaVersion`, `overdueAt`, `nextNotifyAt`; у категории — время) отброшены, иначе ядро отвергло бы каждый документ; «поля нет» ≠ `null`; `Timestamp` → ISO до микросекунд. `DocumentsTest`, задача 2.
- **Документ пользователя.** Создаётся, только когда сервер подтвердил, что его нет, и никогда не перезаписывается: повторную запись отвергают правила. `RepositoriesTest`, задача 3.
- **Настройки по полям.** Значение, которого эта версия не знает (дизайн будущего веба), получает значение по умолчанию, остальные читаются как есть; изменения веба приходят сразу. Задачи 2 и 3.
- **Язык и тема.** До входа — язык переключателя (сначала — телефона) и системная тема; после входа — язык и тема аккаунта, без лишнего пересоздания экрана; после выхода — снова язык телефона и системная тема, как в вебе. `AuthFlowTest` и `AppearanceTest`, задача 5.
- **Ошибки входа.** Тексты на обоих языках для случаев `authService.js` веба и для `ERROR_INVALID_CREDENTIAL`: так настоящий проект с защитой от перебора почт отвечает на неверную почту или пароль. Задача 4.

## Структура файлов

| Файл | Ответственность |
|---|---|
| `android/gradle/libs.versions.toml`, `android/build.gradle.kts` | версии Firebase, AppCompat, Lifecycle, тестов на устройстве; плагин google-services; строка-сводка тестов JVM для всех модулей |
| `android/app/build.gradle.kts` | Firebase, режим эмуляторов (`BuildConfig.EMULATORS`), тесты JVM и на устройстве |
| `android/app/google-services.json` | настройки Firebase этой машины, вне git (скачивается командой) |
| `android/app/src/main/kotlin/…/ToDoRoundApp.kt` | класс приложения: Firebase проекта или эмуляторов |
| `android/app/src/main/kotlin/…/data/Backend.kt` | Auth и Firestore одного приложения Firebase; режим эмуляторов |
| `android/app/src/main/kotlin/…/data/Documents.kt` | документ Firestore → запись контракта; настройки по полям; новый документ пользователя |
| `android/app/src/main/kotlin/…/data/Repositories.kt` | живые задачи, категории и настройки; создание документа пользователя |
| `android/app/src/main/kotlin/…/data/Accounts.kt` | вход, регистрация, сброс пароля, выход; тексты ошибок |
| `android/app/src/main/kotlin/…/ui/*.kt` | сессия (`AppViewModel`), язык и тема (`Appearance`), экран входа, экран после входа |
| `android/app/src/main/kotlin/…/MainActivity.kt` | `AppCompatActivity`; экран по состоянию сессии |
| `android/app/src/main/res/**` | строки en/uk, тема окна AppCompat, значок меню |
| `android/app/src/debug/**` | открытый HTTP к `127.0.0.1` — только для эмуляторов Firebase |
| `android/app/src/test/kotlin/…` | тесты JVM: документы, ошибки входа, проверки формы, язык и тема |
| `android/app/src/androidTest/kotlin/…` | тесты на устройстве против эмуляторов Firebase |
| `android/device-tests.sh` | установка APK, `adb reverse`, запуск тестов на устройстве |
| `docs/android.md`, `CLAUDE.md` | (изменение) Firebase, эмуляторы, тесты на устройстве, телефон |

Пакеты: `…` — это `com/pmobile78/todoround`.

---

### Task 1: Firebase в приложении и режим эмуляторов

**Files:**
- Create (команда): `android/app/google-services.json` (вне git)
- Modify: `android/gradle/libs.versions.toml`, `android/build.gradle.kts`, `android/.gitignore`, `android/app/build.gradle.kts`, `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/kotlin/com/pmobile78/todoround/data/Backend.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/ToDoRoundApp.kt`, `android/app/src/debug/AndroidManifest.xml`, `android/app/src/debug/res/xml/network_security_config.xml`, `android/device-tests.sh`
- Test: `android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/BackendTest.kt`

**Interfaces:**
- Consumes: исполненный подплан 1.1 (модули `core` и `app`); порты эмуляторов из `firebase.json`.
- Produces (`com.pmobile78.todoround.data`): `class Backend(val auth: FirebaseAuth, val db: FirebaseFirestore)` с `Backend.project()` и `Backend.emulators(context: Context, name: String = "emulators")` (другое `name` — второй клиент тех же эмуляторов, задача 3). (`com.pmobile78.todoround`): `class ToDoRoundApp : Application` с `val backend: Backend`; `BuildConfig.EMULATORS: Boolean` — `true` только у отладочной сборки с `-Ptodoround.emulators=true`; скрипт `android/device-tests.sh`.
- Produces для тестов на устройстве (`com.pmobile78.todoround`): `emulatorBackend(): Backend` (падает на сборке без ключа), `suspend fun Backend.signUpNewUser(): String` (uid нового аккаунта, он же становится текущим), `suspend fun DocumentReference.fromServer(): DocumentSnapshot` (ответ сервера через слушателя; отказ правил — исключение).

- [ ] **Step 1: Настройки Firebase этой машины**

Файл настроек скачивается командой Firebase CLI (вход в CLI — аккаунт владельца, как у веба) и остаётся вне git:

```bash
firebase apps:sdkconfig ANDROID 1:699564548059:android:9246f56b0bf422d85fd1fe --project todo-flutter-fb8bf -o android/app/google-services.json
git status --short --ignored android/app
```

Expected: `App configuration is written in android/app/google-services.json`; в выводе `git status` есть строка `!! android/app/google-services.json` (в копии, где приложение уже собирали, есть и `!! android/app/build/`).

- [ ] **Step 2: Firebase в сборке**

Изменения в `android/gradle/libs.versions.toml`:

````diff
diff --git a/android/gradle/libs.versions.toml b/android/gradle/libs.versions.toml
index 7a5e12a..07b723a 100644
--- a/android/gradle/libs.versions.toml
+++ b/android/gradle/libs.versions.toml
@@ -1,7 +1,12 @@
 [versions]
 activityCompose = "1.13.0"
 agp = "9.4.1"
+androidxTestExtJunit = "1.3.0"
+androidxTestRunner = "1.7.0"
 composeBom = "2026.09.00"
+coroutines = "1.11.0"
+firebaseBom = "35.1.0"
+googleServices = "4.5.0"
 junit = "6.1.3"
 kotlin = "2.4.21"
 kotlinxSerialization = "1.12.0"
@@ -12,12 +17,19 @@ androidx-compose-bom = { module = "androidx.compose:compose-bom", version.ref =
 androidx-compose-material3 = { module = "androidx.compose.material3:material3" }
 androidx-compose-ui-tooling = { module = "androidx.compose.ui:ui-tooling" }
 androidx-compose-ui-tooling-preview = { module = "androidx.compose.ui:ui-tooling-preview" }
+androidx-test-ext-junit = { module = "androidx.test.ext:junit", version.ref = "androidxTestExtJunit" }
+androidx-test-runner = { module = "androidx.test:runner", version.ref = "androidxTestRunner" }
+firebase-auth = { module = "com.google.firebase:firebase-auth" }
+firebase-bom = { module = "com.google.firebase:firebase-bom", version.ref = "firebaseBom" }
+firebase-firestore = { module = "com.google.firebase:firebase-firestore" }
 junit-bom = { module = "org.junit:junit-bom", version.ref = "junit" }
 junit-jupiter = { module = "org.junit.jupiter:junit-jupiter" }
 junit-platform-launcher = { module = "org.junit.platform:junit-platform-launcher" }
+kotlinx-coroutines-play-services = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-play-services", version.ref = "coroutines" }
 kotlinx-serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "kotlinxSerialization" }
 
 [plugins]
 android-application = { id = "com.android.application", version.ref = "agp" }
+google-services = { id = "com.google.gms.google-services", version.ref = "googleServices" }
 kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
 kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
````

Изменения в `android/build.gradle.kts`:

````diff
diff --git a/android/build.gradle.kts b/android/build.gradle.kts
index f3619c5..8b9ba3e 100644
--- a/android/build.gradle.kts
+++ b/android/build.gradle.kts
@@ -1,6 +1,7 @@
 // Plugins are declared once here, so every module shares one Kotlin Gradle plugin.
 plugins {
     alias(libs.plugins.android.application) apply false
+    alias(libs.plugins.google.services) apply false
     alias(libs.plugins.kotlin.compose) apply false
     alias(libs.plugins.kotlin.jvm) apply false
 }
````

`google-services.json` в `.gitignore` теперь без привязки к папке: файл в `app/src/<тип сборки>/` тоже не попадёт в git.

Изменения в `android/.gitignore`:

````diff
diff --git a/android/.gitignore b/android/.gitignore
index 18cf14c..ae94adf 100644
--- a/android/.gitignore
+++ b/android/.gitignore
@@ -10,7 +10,7 @@ local.properties
 captures/
 
 # Firebase settings of this machine (docs/android.md)
-app/google-services.json
+google-services.json
 
 # Signing keys live outside the repository (docs/android.md)
 *.jks
````

Отладочная сборка с ключом `-Ptodoround.emulators=true` получает `BuildConfig.EMULATORS = true`; у релиза он всегда `false`.

Изменения в `android/app/build.gradle.kts`:

````diff
diff --git a/android/app/build.gradle.kts b/android/app/build.gradle.kts
index 80c2be3..91d151b 100644
--- a/android/app/build.gradle.kts
+++ b/android/app/build.gradle.kts
@@ -1,5 +1,6 @@
 plugins {
     alias(libs.plugins.android.application)
+    alias(libs.plugins.google.services)
     alias(libs.plugins.kotlin.compose)
 }
 
@@ -14,6 +15,10 @@ val appName: String = rootDir.resolve("../src/appName.js").readText()
 // build is left unsigned.
 val releaseStoreFile: String? = providers.gradleProperty("todoround.release.storeFile").orNull
 
+// A debug build works with the local Firebase emulators instead of the project when asked:
+// -Ptodoround.emulators=true (docs/android.md).
+val emulators: Boolean = providers.gradleProperty("todoround.emulators").orNull == "true"
+
 android {
     namespace = "com.pmobile78.todoround"
     compileSdk = 37
@@ -25,6 +30,7 @@ android {
         versionCode = 1
         versionName = "0.1.0"
         resValue("string", "app_name", appName)
+        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
     }
 
     signingConfigs {
@@ -39,11 +45,15 @@ android {
     }
 
     buildTypes {
+        debug {
+            buildConfigField("boolean", "EMULATORS", emulators.toString())
+        }
         release {
             isMinifyEnabled = true
             isShrinkResources = true
             proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
             signingConfig = signingConfigs.findByName("release")
+            buildConfigField("boolean", "EMULATORS", "false")
         }
     }
 
@@ -53,6 +63,7 @@ android {
     }
 
     buildFeatures {
+        buildConfig = true
         compose = true
         resValues = true
     }
@@ -66,8 +77,14 @@ android {
 dependencies {
     implementation(project(":core"))
     implementation(platform(libs.androidx.compose.bom))
+    implementation(platform(libs.firebase.bom))
     implementation(libs.androidx.activity.compose)
     implementation(libs.androidx.compose.material3)
     implementation(libs.androidx.compose.ui.tooling.preview)
+    implementation(libs.firebase.auth)
+    implementation(libs.firebase.firestore)
+    implementation(libs.kotlinx.coroutines.play.services)
     debugImplementation(libs.androidx.compose.ui.tooling)
+    androidTestImplementation(libs.androidx.test.ext.junit)
+    androidTestImplementation(libs.androidx.test.runner)
 }
````

- [ ] **Step 3: Написать падающий тест**

Тест на устройстве: эмуляторы отвечают, и это эмуляторы с правилами репозитория — чужой документ закрыт; у клиента приложения — имя `emulators` и проект `demo-to-round`, а не проект из `google-services.json`. Чтение — через слушателя, а не разовым запросом: сразу после загрузки эмулятор медленный, а разовое чтение сдаётся через 10 секунд («the client is offline»). На весь тест — не больше трёх минут: сразу после загрузки эмулятора первый ответ сервера бывает дольше минуты, а зависший запрос не должен держать прогон.

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt`:

````kotlin
package com.pmobile78.todoround

import androidx.test.core.app.ApplicationProvider
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.MetadataChanges
import com.pmobile78.todoround.data.Backend
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.tasks.await
import java.util.UUID

/** The app's Firebase for the device tests, which may only ever be the local emulators (docs/android.md). */
fun emulatorBackend(): Backend {
    check(BuildConfig.EMULATORS) { "the device tests need a debug build with -Ptodoround.emulators=true" }
    return ApplicationProvider.getApplicationContext<ToDoRoundApp>().backend
}

/** A fresh account on the Auth emulator, signed in; returns its uid. */
suspend fun Backend.signUpNewUser(): String =
    auth.createUserWithEmailAndPassword("user-${UUID.randomUUID()}@example.com", "secret-1").await().user!!.uid

/**
 * The document as the server has it. A listener waits for the server, where a one-off read gives
 * up after 10 s of a slow start ("the client is offline"); a refusal of the rules is thrown.
 */
suspend fun DocumentReference.fromServer(): DocumentSnapshot {
    val result = CompletableDeferred<DocumentSnapshot>()
    val registration = addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
        if (error != null) result.completeExceptionally(error)
        else if (snapshot != null && !snapshot.metadata.isFromCache) result.complete(snapshot)
    }
    try {
        return result.await()
    } finally {
        registration.remove()
    }
}
````

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/BackendTest.kt`:

````kotlin
package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith

// Device tests run on Android, whose method names before DEX 040 may not contain spaces: camelCase here.
@RunWith(AndroidJUnit4::class)
class BackendTest {
    @Test
    fun theEmulatorsAnswerWithTheRulesOfTheRepository() = runBlocking {
        // Right after the Android emulator has booted, the first answer of the server can take over a minute.
        withTimeout(180_000) {
            val backend = emulatorBackend()
            // The app's own client of the emulators, not the project of google-services.json.
            assertEquals("emulators", backend.db.app.name)
            assertEquals("demo-to-round", backend.db.app.options.projectId)
            val uid = backend.signUpNewUser()

            assertFalse(backend.db.document("users/$uid").fromServer().exists())
            val refused = runCatching { backend.db.document("users/someone-else").fromServer() }
            assertEquals(
                FirebaseFirestoreException.Code.PERMISSION_DENIED,
                (refused.exceptionOrNull() as FirebaseFirestoreException).code,
            )
        }
    }
}
````

- [ ] **Step 4: Тест падает**

Run: `android/gradlew -p android :app:assembleDebugAndroidTest -Ptodoround.emulators=true`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugAndroidTestKotlin'`; первая ошибка — `e: …/BackendTest.kt:21:47 Unresolved reference 'db'.` Первый запуск скачивает Firebase и библиотеки тестов.

- [ ] **Step 5: Firebase проекта и эмуляторов**

Эмуляторы — отдельное приложение Firebase с проектом `demo-to-round`, поэтому `google-services.json` проекта им не мешает. Устройство доходит до них по своему `127.0.0.1` через `adb reverse`: Android 17 не пускает приложения с `targetSdk` 37 в локальную сеть, в том числе к `10.0.2.2`, без разрешения `ACCESS_LOCAL_NETWORK` — запрос просто зависает на 10 секунд (`FirebaseNetworkException`).

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/data/Backend.kt`:

````kotlin
package com.pmobile78.todoround.data

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

/** Firebase Auth and Firestore of the one Firebase app this run works with. */
class Backend(val auth: FirebaseAuth, val db: FirebaseFirestore) {
    companion object {
        /** The project of google-services.json, todo-flutter-fb8bf (docs/android.md). */
        fun project(): Backend = Backend(FirebaseAuth.getInstance(), FirebaseFirestore.getInstance())

        /**
         * The local Auth and Firestore emulators of firebase.json with the web's emulator project
         * demo-to-round (spec 5), never the real project. The device reaches them at its own
         * 127.0.0.1 through adb reverse: Android 17 keeps apps out of the local network, 10.0.2.2
         * included, unless they hold ACCESS_LOCAL_NETWORK. Another [name] gives a second client of the
         * same emulators: the device tests use one as the web.
         */
        fun emulators(context: Context, name: String = "emulators"): Backend {
            val app = FirebaseApp.initializeApp(context, EMULATOR_OPTIONS, name)
            val auth = FirebaseAuth.getInstance(app).apply { useEmulator(EMULATOR_HOST, AUTH_EMULATOR_PORT) }
            val db = FirebaseFirestore.getInstance(app).apply { useEmulator(EMULATOR_HOST, FIRESTORE_EMULATOR_PORT) }
            return Backend(auth, db)
        }

        // The ports of firebase.json; the project and the made-up keys of .env.emulator.
        private const val EMULATOR_HOST = "127.0.0.1"
        private const val AUTH_EMULATOR_PORT = 9099
        private const val FIRESTORE_EMULATOR_PORT = 8180
        private val EMULATOR_OPTIONS = FirebaseOptions.Builder()
            .setProjectId("demo-to-round")
            .setApplicationId("1:000000000000:android:0000000000000000")
            .setApiKey("demo-api-key")
            .build()
    }
}
````

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ToDoRoundApp.kt`:

````kotlin
package com.pmobile78.todoround

import android.app.Application
import com.pmobile78.todoround.data.Backend

class ToDoRoundApp : Application() {
    /** Firebase of this run: the project, or the local emulators when a debug build asks for them. */
    lateinit var backend: Backend
        private set

    override fun onCreate() {
        super.onCreate()
        backend = if (BuildConfig.EMULATORS) Backend.emulators(this) else Backend.project()
    }
}
````

Изменения в `android/app/src/main/AndroidManifest.xml`:

````diff
diff --git a/android/app/src/main/AndroidManifest.xml b/android/app/src/main/AndroidManifest.xml
index 61086b5..becfbc5 100644
--- a/android/app/src/main/AndroidManifest.xml
+++ b/android/app/src/main/AndroidManifest.xml
@@ -3,6 +3,7 @@
 
     <!-- Everything lives in Firestore; a restored copy of the app's files would only be stale. -->
     <application
+        android:name=".ToDoRoundApp"
         android:allowBackup="false"
         android:dataExtractionRules="@xml/data_extraction_rules"
         android:fullBackupContent="@xml/backup_rules"
````

Эмуляторы Firebase говорят по открытому HTTP; разрешение — только у отладочной сборки и только для `127.0.0.1`.

Файл `android/app/src/debug/AndroidManifest.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Debug builds only: plain HTTP to the local Firebase emulators (docs/android.md). -->
    <application android:networkSecurityConfig="@xml/network_security_config" />

</manifest>
````

Файл `android/app/src/debug/res/xml/network_security_config.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- The Firebase emulators speak plain HTTP; the device reaches them at 127.0.0.1 through
     adb reverse. Everything else stays HTTPS only. -->
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">127.0.0.1</domain>
    </domain-config>
</network-security-config>
````

Скрипт тестов на устройстве. Он ставит готовые APK, включает `adb reverse`, запускает тесты, удаляет приложение и печатает итог; запускает его `firebase emulators:exec`, который на это время поднимает эмуляторы Firebase.

Файл `android/device-tests.sh`:

````bash
#!/usr/bin/env bash
# The device tests (app/src/androidTest) on the Android emulator against the local Firebase
# emulators. Run from the repository root by firebase emulators:exec (docs/android.md), with the
# APKs built before: Gradle does not run beside the Android emulator on this machine.
set -euo pipefail

apks=android/app/build/outputs/apk
adb -e uninstall com.pmobile78.todoround.test > /dev/null 2>&1 || true
adb -e uninstall com.pmobile78.todoround > /dev/null 2>&1 || true
adb -e install -t "$apks/debug/app-debug.apk" > /dev/null
adb -e install -t "$apks/androidTest/debug/app-debug-androidTest.apk" > /dev/null
# The app reaches the Firebase emulators of this computer at its own 127.0.0.1 (data/Backend.kt).
adb -e reverse tcp:9099 tcp:9099 > /dev/null
adb -e reverse tcp:8180 tcp:8180 > /dev/null
result=$(adb -e shell am instrument -w com.pmobile78.todoround.test/androidx.test.runner.AndroidJUnitRunner)
adb -e uninstall com.pmobile78.todoround.test > /dev/null
adb -e uninstall com.pmobile78.todoround > /dev/null
adb -e reverse --remove-all
printf '%s\n' "$result"
grep -q '^OK (' <<< "$result"
````

```bash
chmod +x android/device-tests.sh
```

- [ ] **Step 6: Сборка, проверки и Lint**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `core tests: 87 passed, 0 failed, 0 skipped` (в копии, где тесты `core` уже проходили, строки нет: они не менялись), `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.`

- [ ] **Step 7: Тест проходит на устройстве**

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase (тайм-аут 10 минут):

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (1 test)` и `Script exited successfully (code 0)`. Сразу после загрузки эмулятора тест идёт от полуминуты до двух минут — слушатель ждёт сервер.

Выключить эмулятор:

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
```

Expected: `OK: killing emulator, bye bye`.

- [ ] **Step 8: Commit**

```bash
git add android/.gitignore android/app/build.gradle.kts android/app/src/androidTest/kotlin/com/pmobile78/todoround/BackendTest.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt android/app/src/debug/AndroidManifest.xml android/app/src/debug/res/xml/network_security_config.xml android/app/src/main/AndroidManifest.xml android/app/src/main/kotlin/com/pmobile78/todoround/ToDoRoundApp.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Backend.kt android/build.gradle.kts android/device-tests.sh android/gradle/libs.versions.toml
git commit -F - <<'EOF'
feat(android): Firebase in the app, and a debug mode on the local emulators

Stage 1.2, task 1. app takes Auth and Firestore from the Firebase BoM, with
the project's google-services.json, which stays out of git. A debug build
with -Ptodoround.emulators=true works with the Auth and Firestore emulators
of firebase.json and the web's emulator project demo-to-round instead. The
device reaches them at its own 127.0.0.1 through adb reverse: Android 17
keeps apps out of the local network, 10.0.2.2 included. The device tests
run by android/device-tests.sh under firebase emulators:exec; the first one
checks that the emulators answer with the rules of the repository.
EOF
```

---

### Task 2: Документы Firestore как записи контракта

**Files:**
- Modify: `android/build.gradle.kts`, `android/core/build.gradle.kts`, `android/app/build.gradle.kts`
- Create: `android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt`
- Test: `android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt`

**Interfaces:**
- Consumes: из 1.1 — `taskFromRecord`, `categoryFromRecord`, `settingsFromRecord`, `defaultSettings`, `Settings.toRecord()`, `validateSettings`, `SCHEMA_VERSION`.
- Produces (`com.pmobile78.todoround.data`): `taskRecord(id: String, data: Map<String, Any?>): Map<String, Any?>`; `categoryRecord(id: String, data: Map<String, Any?>): Map<String, Any?>`; `settingsFromUserDoc(data: Map<String, Any?>?, screenLanguage: String?): Settings`; `newUserDoc(settings: Settings): Map<String, Any?>` — `schemaVersion`, `settings`, `createdAt` и `updatedAt` = `FieldValue.serverTimestamp()`.

- [ ] **Step 1: Тесты JVM у модуля `app`**

Строка-сводка тестов переезжает из `core` в корневой скрипт и печатается для каждого модуля: `core tests: …`, `app debug tests: …`. Модульные тесты AGP 9 по умолчанию идут только для `debug`.

Изменения в `android/build.gradle.kts`:

````diff
diff --git a/android/build.gradle.kts b/android/build.gradle.kts
index 8b9ba3e..e629d39 100644
--- a/android/build.gradle.kts
+++ b/android/build.gradle.kts
@@ -1,3 +1,5 @@
+import org.gradle.api.tasks.testing.logging.TestExceptionFormat
+
 // Plugins are declared once here, so every module shares one Kotlin Gradle plugin.
 plugins {
     alias(libs.plugins.android.application) apply false
@@ -5,3 +7,33 @@ plugins {
     alias(libs.plugins.kotlin.compose) apply false
     alias(libs.plugins.kotlin.jvm) apply false
 }
+
+// The JVM tests of every module run on JUnit 6 and print one summary line per run, e.g.
+// "core tests: 87 passed, 0 failed, 0 skipped" or "app debug tests: 3 passed, 0 failed, 0 skipped".
+subprojects {
+    tasks.withType<Test>().configureEach {
+        useJUnitPlatform()
+        testLogging {
+            events("failed")
+            exceptionFormat = TestExceptionFormat.FULL
+        }
+        val variant = name.removePrefix("test").removeSuffix("UnitTest").lowercase()
+        val label = listOf(project.name, variant, "tests").filter { it.isNotEmpty() }.joinToString(" ")
+        addTestListener(object : TestListener {
+            override fun beforeSuite(suite: TestDescriptor) {}
+
+            override fun afterSuite(suite: TestDescriptor, result: TestResult) {
+                if (suite.parent == null) {
+                    println(
+                        "$label: ${result.successfulTestCount} passed, ${result.failedTestCount} failed, " +
+                            "${result.skippedTestCount} skipped",
+                    )
+                }
+            }
+
+            override fun beforeTest(testDescriptor: TestDescriptor) {}
+
+            override fun afterTest(testDescriptor: TestDescriptor, result: TestResult) {}
+        })
+    }
+}
````

Изменения в `android/core/build.gradle.kts`:

````diff
diff --git a/android/core/build.gradle.kts b/android/core/build.gradle.kts
index 0f8957a..1bb615c 100644
--- a/android/core/build.gradle.kts
+++ b/android/core/build.gradle.kts
@@ -1,4 +1,3 @@
-import org.gradle.api.tasks.testing.logging.TestExceptionFormat
 import org.jetbrains.kotlin.gradle.dsl.JvmTarget
 
 // Data contract v2 in plain Kotlin: no Android, no Firebase (spec, section 4).
@@ -31,28 +30,6 @@ dependencies {
 val contractDir = rootDir.resolve("../contract").normalize()
 
 tasks.test {
-    useJUnitPlatform()
     systemProperty("todoround.contractDir", contractDir.path)
     inputs.dir(contractDir).withPathSensitivity(PathSensitivity.RELATIVE).withPropertyName("contract")
-    testLogging {
-        events("failed")
-        exceptionFormat = TestExceptionFormat.FULL
-    }
-    // One summary line per run, e.g. "core tests: 3 passed, 0 failed, 0 skipped".
-    addTestListener(object : TestListener {
-        override fun beforeSuite(suite: TestDescriptor) {}
-
-        override fun afterSuite(suite: TestDescriptor, result: TestResult) {
-            if (suite.parent == null) {
-                println(
-                    "core tests: ${result.successfulTestCount} passed, ${result.failedTestCount} failed, " +
-                        "${result.skippedTestCount} skipped",
-                )
-            }
-        }
-
-        override fun beforeTest(testDescriptor: TestDescriptor) {}
-
-        override fun afterTest(testDescriptor: TestDescriptor, result: TestResult) {}
-    })
 }
````

Изменения в `android/app/build.gradle.kts`:

````diff
diff --git a/android/app/build.gradle.kts b/android/app/build.gradle.kts
index 91d151b..c2fc87e 100644
--- a/android/app/build.gradle.kts
+++ b/android/app/build.gradle.kts
@@ -85,6 +85,9 @@ dependencies {
     implementation(libs.firebase.firestore)
     implementation(libs.kotlinx.coroutines.play.services)
     debugImplementation(libs.androidx.compose.ui.tooling)
+    testImplementation(platform(libs.junit.bom))
+    testImplementation(libs.junit.jupiter)
+    testRuntimeOnly(libs.junit.platform.launcher)
     androidTestImplementation(libs.androidx.test.ext.junit)
     androidTestImplementation(libs.androidx.test.runner)
 }
````

- [ ] **Step 2: Написать падающий тест**

Документ задачи — такой, каким его отдаёт Firestore после записи веба: целые — `Long`, время — `Timestamp`, служебные поля на месте. Настройки читаются по полям; новый документ пользователя — как у веба.

Файл `android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt`:

````kotlin
package com.pmobile78.todoround.data

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.Design
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.contract.validateTask
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.categoryFromRecord
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.taskFromRecord
import com.pmobile78.todoround.core.model.toRecord
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.Instant

class DocumentsTest {
    private val created = Instant.parse("2026-10-20T08:00:00.123456Z")
    private val updated = Instant.parse("2026-10-21T09:30:00Z")

    // A task as Firestore gives it to Android after the web wrote it: whole numbers are Long,
    // times are Timestamps, and the fields of the server are there too.
    private val webTask = mapOf<String, Any?>(
        "schemaVersion" to 2L,
        "title" to "Buy milk",
        "description" to "",
        "categoryId" to "c1",
        "status" to "active",
        "due" to mapOf("local" to "2026-10-23T09:30", "tz" to "Europe/Kyiv"),
        "reminders" to listOf(60L, 1440L),
        "repeat" to mapOf("every" to 2L, "unit" to "weeks", "weekdays" to listOf(1L, 3L)),
        "radius" to 45L,
        "pulseMuted" to false,
        "overdueAt" to null,
        "nextNotifyAt" to Timestamp(Instant.parse("2026-10-23T05:30:00Z")),
        "createdAt" to Timestamp(created),
        "updatedAt" to Timestamp(updated),
        "deletedAt" to null,
    )

    @Test
    fun `a task document of the web becomes the task`() {
        assertEquals(
            Task(
                id = "t1",
                title = "Buy milk",
                description = "",
                categoryId = "c1",
                status = TaskStatus.ACTIVE,
                due = Due("2026-10-23T09:30", "Europe/Kyiv"),
                reminders = listOf(60, 1440),
                repeat = Repeat(every = 2, unit = RepeatUnit.WEEKS, weekdays = listOf(1, 3)),
                radius = 45,
                pulseMuted = false,
                createdAt = created,
                updatedAt = updated,
                deletedAt = null,
            ),
            taskFromRecord(taskRecord("t1", webTask), acceptUnknownZone = true),
        )
    }

    @Test
    fun `the fields of the server stay out of the record`() {
        assertEquals(
            setOf(
                "id", "title", "description", "categoryId", "status", "due", "reminders", "repeat", "radius",
                "pulseMuted", "createdAt", "updatedAt", "deletedAt",
            ),
            taskRecord("t1", webTask).keys,
        )
    }

    @Test
    fun `server times become ISO strings to the microsecond`() {
        val record = taskRecord("t1", webTask)
        assertEquals("2026-10-20T08:00:00.123456Z", record["createdAt"])
        assertEquals("2026-10-21T09:30:00Z", record["updatedAt"])
        assertNull(record["deletedAt"])
    }

    @Test
    fun `a field the document lacks stays missing, unlike a null`() {
        val withoutCategory = taskRecord("t1", webTask - "categoryId")
        assertFalse(withoutCategory.containsKey("categoryId"))
        assertEquals(listOf("categoryId: invalid"), validateTask(withoutCategory))

        val uncategorized = taskRecord("t1", webTask + ("categoryId" to null))
        assertTrue(uncategorized.containsKey("categoryId"))
        assertEquals(emptyList<String>(), validateTask(uncategorized))
    }

    @Test
    fun `a value of a wrong type is left for the core to refuse`() {
        assertEquals(listOf("createdAt: invalid"), validateTask(taskRecord("t1", webTask + ("createdAt" to "yesterday"))))
    }

    @Test
    fun `a category keeps its name, colour and order, whole or not`() {
        val serverFields = mapOf("schemaVersion" to 2L, "createdAt" to Timestamp(created), "updatedAt" to Timestamp(updated))
        val home = categoryRecord("c1", serverFields + mapOf("name" to "Home", "color" to "#46a549", "order" to 1.5))
        assertEquals(setOf("id", "name", "color", "order"), home.keys)
        assertEquals(Category("c1", "Home", "#46a549", 1.5), categoryFromRecord(home))

        val work = categoryRecord("c2", serverFields + mapOf("name" to "Work", "color" to "#da3833", "order" to 3L))
        assertEquals(3.0, categoryFromRecord(work).order)
    }

    @Test
    fun `settings of the user document are read as they are`() {
        val stored = defaultSettings("uk").copy(
            themeMode = ThemeMode.DARK,
            design = Design.AURORA,
            labelFontSize = 12,
            listSort = ListSort(SortField.TITLE, SortOrder.ASC),
        )
        assertEquals(stored, settingsFromUserDoc(mapOf("settings" to stored.toRecord()), screenLanguage = "en"))
    }

    @Test
    fun `without a user document the settings are the defaults in the language of the screen`() {
        assertEquals(defaultSettings("uk"), settingsFromUserDoc(null, screenLanguage = "uk"))
    }

    @Test
    fun `a value this version does not know takes its default and the others stay`() {
        val record = defaultSettings("uk").copy(themeMode = ThemeMode.DARK).toRecord() +
            mapOf("design" to "neon", "labelFontSize" to "12")
        val settings = settingsFromUserDoc(mapOf("settings" to record), screenLanguage = "en")
        assertEquals(Design.CLASSIC, settings.design)
        assertEquals(8, settings.labelFontSize)
        assertEquals(ThemeMode.DARK, settings.themeMode)
        assertEquals(Language.UK, settings.language)
    }

    @Test
    fun `a missing setting takes its default`() {
        val record = defaultSettings("uk").copy(listSort = ListSort(SortField.TITLE, SortOrder.ASC)).toRecord() - "listSort"
        assertEquals(
            ListSort(SortField.UPDATED_AT, SortOrder.DESC),
            settingsFromUserDoc(mapOf("settings" to record), screenLanguage = "en").listSort,
        )
    }

    @Test
    fun `a new user document has schema 2, the settings and server times`() {
        val settings = defaultSettings("uk")
        assertEquals(
            mapOf(
                "schemaVersion" to 2,
                "settings" to settings.toRecord(),
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp(),
            ),
            newUserDoc(settings),
        )
    }
}
````

- [ ] **Step 3: Тест падает**

Run: `android/gradlew -p android :app:testDebugUnitTest`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugUnitTestKotlin'`; первая ошибка — `e: …/DocumentsTest.kt:71:28 Unresolved reference 'taskRecord'.`

- [ ] **Step 4: `Documents.kt`**

Значение настройки проверяется самим ядром: его подставляют в настройки по умолчанию и смотрят, принимает ли их `validateSettings`.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt`:

````kotlin
package com.pmobile78.todoround.data

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.SCHEMA_VERSION
import com.pmobile78.todoround.core.contract.validateSettings
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.settingsFromRecord
import com.pmobile78.todoround.core.model.toRecord

/*
 * Firestore documents and backup-form records of data contract v2 (spec, section 6), as the web's
 * src/services/data/convert.js: the id becomes a field, Timestamps become ISO strings, and the
 * fields only the server writes (schemaVersion, overdueAt, nextNotifyAt; the times of a category)
 * stay out, else the core would refuse every document for an unknown field. A field the document
 * lacks stays missing: the core tells it from a field set to null.
 */

private val TASK_FIELDS = listOf(
    "title", "description", "categoryId", "status", "due", "reminders", "repeat", "radius", "pulseMuted",
)
private val TASK_TIMES = listOf("createdAt", "updatedAt", "deletedAt")
private val CATEGORY_FIELDS = listOf("name", "color", "order")

/** The record of the task document [id]; [data] is read with the server times estimated. */
fun taskRecord(id: String, data: Map<String, Any?>): Map<String, Any?> = buildMap {
    put("id", id)
    for (key in TASK_FIELDS) {
        if (key in data) put(key, data[key])
    }
    for (key in TASK_TIMES) {
        if (key in data) put(key, isoTime(data[key]))
    }
}

/** The record of the category document [id]. */
fun categoryRecord(id: String, data: Map<String, Any?>): Map<String, Any?> = buildMap {
    put("id", id)
    for (key in CATEGORY_FIELDS) {
        if (key in data) put(key, data[key])
    }
}

/** A Firestore time as an ISO string in UTC; anything else is left for the core to refuse. */
private fun isoTime(value: Any?): Any? = if (value is Timestamp) value.toInstant().toString() else value

/**
 * The settings of the user document [data] field by field, like the web's settingsFromUserDoc
 * (spec 6): a field without a value, or with one this version does not know (a design of a later
 * web, say), takes its default; the other fields are read as they are.
 */
fun settingsFromUserDoc(data: Map<String, Any?>?, screenLanguage: String?): Settings {
    val defaults = defaultSettings(screenLanguage).toRecord()
    @Suppress("UNCHECKED_CAST")
    val stored = data?.get("settings") as? Map<String, Any?> ?: emptyMap()
    val record = defaults.mapValues { (key, default) ->
        val value = stored[key]
        if (key in stored && validateSettings(defaults + (key to value)).isEmpty()) value else default
    }
    return settingsFromRecord(record)
}

/** A new users/{uid} (contract, section 3.4): schema 2, [settings] and the times of the server. */
fun newUserDoc(settings: Settings): Map<String, Any?> = mapOf(
    "schemaVersion" to SCHEMA_VERSION,
    "settings" to settings.toRecord(),
    "createdAt" to FieldValue.serverTimestamp(),
    "updatedAt" to FieldValue.serverTimestamp(),
)
````

- [ ] **Step 5: Тест проходит**

Run: `android/gradlew -p android check`
Expected: `app debug tests: 11 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 6: Commit**

```bash
git add android/app/build.gradle.kts android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt android/build.gradle.kts android/core/build.gradle.kts
git commit -F - <<'EOF'
feat(android): Firestore documents as records of the contract, settings field by field

Stage 1.2, task 2. app turns a task or category document into the
backup-form record that the core checks, as the web's convert.js does: the
id becomes a field, Timestamps become ISO strings to the microsecond, the
fields only the server writes stay out and a missing field stays missing.
Settings are read field by field: a value this version does not know takes
its default. A new user document gets schema 2, the settings and server
times. The JVM tests of every module print one summary line, set once in
the root build script.
EOF
```

---

### Task 3: Живые задачи, категории и настройки

**Files:**
- Create: `android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt`
- Modify: `android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt`
- Test: `android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt`

**Interfaces:**
- Consumes: `Backend` и помощники тестов (задача 1); `taskRecord`, `categoryRecord`, `settingsFromUserDoc`, `newUserDoc` (задача 2).
- Produces (`com.pmobile78.todoround.data`): `data class Loaded<T>(val items: List<T>, val invalid: Int, val fromCache: Boolean)`; `class TasksRepository(db: FirebaseFirestore)` — `fun tasks(uid: String): Flow<Loaded<Task>>` (зона срока, которой нет в базе устройства, задачу не прячет); `class CategoriesRepository(db: FirebaseFirestore)` — `fun categories(uid: String): Flow<Loaded<Category>>`; `class SettingsRepository(db: FirebaseFirestore)` — `fun settings(uid: String, screenLanguage: String): Flow<Settings?>` (null, пока документа нет; создаёт его, когда сервер подтвердил, что документа нет) и `suspend fun createUserDoc(uid: String, settings: Settings)` (поверх существующего — `PERMISSION_DENIED` от правил). Отказ слушателя завершает поток этой `FirebaseFirestoreException`.
- Produces для тестов на устройстве (`com.pmobile78.todoround`): `webBackend(): Backend` — второй клиент тех же эмуляторов (приложение Firebase `web`), за веб; `newEmail(): String` — новый адрес для аккаунта; `suspend fun Backend.signUp(email: String): String` — аккаунт с паролем `secret-1`, uid.

- [ ] **Step 1: Написать падающий тест**

Документы пишутся так, как их пишет веб (`newTaskData` в `src/services/data/convert.js`). Задача с напоминанием в 61 минуту правилам годится — элементы `reminders` они оставляют клиентам, — а ядро её отвергает: она считается, но не показывается. Настройку меняет «веб» — второй клиент тех же эмуляторов, вошедший тем же пользователем: изменение приходит в приложение через сервер, как с другого устройства.

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt`:

````kotlin
package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestoreException
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.toRecord
import com.pmobile78.todoround.data.CategoriesRepository
import com.pmobile78.todoround.data.SettingsRepository
import com.pmobile78.todoround.data.TasksRepository
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** The repositories on the Firestore emulator, under the rules of the repository. */
@RunWith(AndroidJUnit4::class)
class RepositoriesTest {
    private val backend = emulatorBackend()

    // A task as the web's newTaskData writes it (src/services/data/convert.js).
    private fun webTask(title: String, due: Map<String, Any>?, reminders: List<Int>) = mapOf(
        "schemaVersion" to 2,
        "title" to title,
        "description" to "",
        "categoryId" to "c1",
        "status" to "active",
        "due" to due,
        "reminders" to reminders,
        "repeat" to null,
        "radius" to 45,
        "pulseMuted" to false,
        "overdueAt" to null,
        "createdAt" to FieldValue.serverTimestamp(),
        "updatedAt" to FieldValue.serverTimestamp(),
        "deletedAt" to null,
    )

    private suspend fun write(path: String, data: Map<String, Any?>) {
        backend.db.document(path).set(data).await()
    }

    @Test
    fun aTaskAndACategoryWrittenByTheWebAreRead() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            write(
                "users/$uid/categories/c1",
                mapOf(
                    "schemaVersion" to 2,
                    "name" to "Home",
                    "color" to "#46a549",
                    "order" to 1.5,
                    "createdAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp(),
                ),
            )
            write("users/$uid/tasks/t1", webTask("Buy milk", mapOf("local" to "2026-10-23T09:30", "tz" to "Europe/Kyiv"), listOf(60)))

            val tasks = TasksRepository(backend.db).tasks(uid).first { !it.fromCache && it.items.isNotEmpty() }
            val task = tasks.items.single()
            assertEquals(0, tasks.invalid)
            assertEquals("t1", task.id)
            assertEquals("Buy milk", task.title)
            assertEquals(TaskStatus.ACTIVE, task.status)
            assertEquals(Due("2026-10-23T09:30", "Europe/Kyiv"), task.due)
            assertEquals(listOf(60), task.reminders)
            assertEquals(task.createdAt, task.updatedAt)

            val categories = CategoriesRepository(backend.db).categories(uid).first { !it.fromCache && it.items.isNotEmpty() }
            assertEquals(listOf(Category("c1", "Home", "#46a549", 1.5)), categories.items)
        }
    }

    @Test
    fun aDocumentTheCoreRefusesIsCountedNotShown() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            write("users/$uid/tasks/good", webTask("Good", null, emptyList()))
            // The rules leave the elements of reminders to the clients; the core wants whole hours.
            write("users/$uid/tasks/odd", webTask("Odd", mapOf("local" to "2026-10-23T09:30", "tz" to "UTC"), listOf(61)))

            val tasks = TasksRepository(backend.db).tasks(uid).first { !it.fromCache && it.items.size + it.invalid == 2 }
            assertEquals(listOf("good"), tasks.items.map { it.id })
            assertEquals(1, tasks.invalid)
        }
    }

    @Test
    fun aDueZoneThisPhoneDoesNotKnowKeepsTheTask() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            write("users/$uid/tasks/t1", webTask("Far away", mapOf("local" to "2026-10-23T09:30", "tz" to "Mars/Olympus_Mons"), emptyList()))

            val tasks = TasksRepository(backend.db).tasks(uid).first { !it.fromCache && it.items.isNotEmpty() }
            assertEquals(Due("2026-10-23T09:30", "Mars/Olympus_Mons"), tasks.items.single().due)
        }
    }

    @Test
    fun aNewAccountGetsItsUserDocumentInTheLanguageOfTheScreen() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()

            assertEquals(defaultSettings("uk"), SettingsRepository(backend.db).settings(uid, "uk").filterNotNull().first())
            val doc = backend.db.document("users/$uid").fromServer()
            assertEquals(2L, doc.getLong("schemaVersion"))
            assertEquals(defaultSettings("uk").toRecord(), doc.get("settings"))
            assertTrue(doc.get("createdAt") is Timestamp)
            assertEquals(doc.get("createdAt"), doc.get("updatedAt"))
        }
    }

    @Test
    fun theRulesRefuseToReplaceAnExistingUserDocument() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            val settings = SettingsRepository(backend.db)
            settings.settings(uid, "en").filterNotNull().first()

            val refused = runCatching { settings.createUserDoc(uid, defaultSettings("uk")) }
            assertEquals(
                FirebaseFirestoreException.Code.PERMISSION_DENIED,
                (refused.exceptionOrNull() as FirebaseFirestoreException).code,
            )
        }
    }

    @Test
    fun aSettingChangedByTheWebArrivesLive() = runBlocking {
        withTimeout(60_000) {
            val email = newEmail()
            val uid = backend.signUp(email)
            val settings = SettingsRepository(backend.db)
            settings.settings(uid, "uk").filterNotNull().first()
            backend.db.document("users/$uid").fromServer()
            // The web is another client signed in as the same user: its change comes through the server.
            val web = webBackend()
            web.auth.signInWithEmailAndPassword(email, "secret-1").await()

            val changed = settings.settings(uid, "uk").filterNotNull()
                .onEach {
                    // As the web's updateSettings writes it: one field path and the server time.
                    if (it.language == Language.UK) {
                        web.db.document("users/$uid")
                            .update(mapOf("settings.language" to "en", "updatedAt" to FieldValue.serverTimestamp())).await()
                    }
                }
                .first { it.language == Language.EN }
            assertEquals(defaultSettings("en"), changed)
            web.auth.signOut()
        }
    }
}
````

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
index b2ce0e9..23ee4f8 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
@@ -15,9 +15,20 @@ fun emulatorBackend(): Backend {
     return ApplicationProvider.getApplicationContext<ToDoRoundApp>().backend
 }
 
+/** A second client of the same emulators, which the tests use as the web: its changes reach the app through the server. */
+fun webBackend(): Backend = web
+
+private val web: Backend by lazy { Backend.emulators(ApplicationProvider.getApplicationContext(), name = "web") }
+
+/** A fresh address for an account on the Auth emulator. */
+fun newEmail(): String = "user-${UUID.randomUUID()}@example.com"
+
+/** A new account [email] with the password "secret-1", signed in on this client; returns its uid. */
+suspend fun Backend.signUp(email: String): String =
+    auth.createUserWithEmailAndPassword(email, "secret-1").await().user!!.uid
+
 /** A fresh account on the Auth emulator, signed in; returns its uid. */
-suspend fun Backend.signUpNewUser(): String =
-    auth.createUserWithEmailAndPassword("user-${UUID.randomUUID()}@example.com", "secret-1").await().user!!.uid
+suspend fun Backend.signUpNewUser(): String = signUp(newEmail())
 
 /**
  * The document as the server has it. A listener waits for the server, where a one-off read gives
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :app:assembleDebugAndroidTest -Ptodoround.emulators=true`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugAndroidTestKotlin'`; первая ошибка — `e: …/RepositoriesTest.kt:13:37 Unresolved reference 'CategoriesRepository'.`

- [ ] **Step 3: `Repositories.kt`**

Слушатель Firestore оборачивается в `callbackFlow` с `close(error)`: `snapshots()` из библиотеки Firebase сообщает об отказе отменой потока (`CancellationException`), и настоящая ошибка теряется. Поток снимков — с `conflate()`: нужен только последний снимок, и медленный получатель пропускает промежуточные.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt`:

````kotlin
package com.pmobile78.todoround.data

import android.util.Log
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.MetadataChanges
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.QuerySnapshot
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.categoryFromRecord
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.taskFromRecord
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.conflate
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.tasks.await

/**
 * A live list of documents (spec 6): the [items] that passed the check of the core, how many
 * documents did not ([invalid]), and whether the data come only from this device's cache.
 */
data class Loaded<T>(val items: List<T>, val invalid: Int, val fromCache: Boolean)

/** The tasks of a user, users/{uid}/tasks. */
class TasksRepository(private val db: FirebaseFirestore) {
    /** Every task of [uid], live; a due zone this device does not know keeps the task (spec 6). */
    fun tasks(uid: String): Flow<Loaded<Task>> =
        db.collection("users").document(uid).collection("tasks")
            .loaded { id, data -> taskFromRecord(taskRecord(id, data), acceptUnknownZone = true) }
}

/** The categories of a user, users/{uid}/categories. */
class CategoriesRepository(private val db: FirebaseFirestore) {
    /** Every category of [uid], live. */
    fun categories(uid: String): Flow<Loaded<Category>> =
        db.collection("users").document(uid).collection("categories")
            .loaded { id, data -> categoryFromRecord(categoryRecord(id, data)) }
}

/** The settings of a user, users/{uid}.settings, and the creation of that document. */
class SettingsRepository(private val db: FirebaseFirestore) {
    /**
     * The settings of [uid], live, or null while users/{uid} cannot be read yet. When the server
     * confirms that the document does not exist, it is created with the defaults in
     * [screenLanguage] (contract, section 3.4), as the web does after a sign-up.
     */
    fun settings(uid: String, screenLanguage: String): Flow<Settings?> =
        db.collection("users").document(uid).changes()
            .onEach { if (!it.exists() && !it.metadata.isFromCache) createQuietly(uid, defaultSettings(screenLanguage)) }
            .map { if (it.exists()) settingsFromUserDoc(it.data, screenLanguage) else null }

    /**
     * Creates users/{uid} with [settings]. Never over an existing document: the rules refuse that
     * write (PERMISSION_DENIED), so the account another device has just set up keeps its settings.
     */
    suspend fun createUserDoc(uid: String, settings: Settings) {
        db.collection("users").document(uid).set(newUserDoc(settings)).await()
    }

    private suspend fun createQuietly(uid: String, settings: Settings) {
        try {
            createUserDoc(uid, settings)
        } catch (e: FirebaseFirestoreException) {
            Log.w(TAG, "users/{uid} was not created", e)
        }
    }

    private companion object {
        const val TAG = "SettingsRepository"
    }
}

// Only the latest snapshot matters: a slow collector skips the ones in between (conflate).

/** Snapshots of the query, the changes of metadata included; a refusal ends the flow with its error. */
private fun Query.changes(): Flow<QuerySnapshot> = callbackFlow {
    val registration = addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
        if (error != null) close(error) else if (snapshot != null) trySend(snapshot)
    }
    awaitClose { registration.remove() }
}.conflate()

/** Snapshots of the document, the changes of metadata included; a refusal ends the flow with its error. */
private fun DocumentReference.changes(): Flow<DocumentSnapshot> = callbackFlow {
    val registration = addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
        if (error != null) close(error) else if (snapshot != null) trySend(snapshot)
    }
    awaitClose { registration.remove() }
}.conflate()

/** The documents of the query as [read] builds them; one the core refuses is counted instead. */
private fun <T> Query.loaded(read: (id: String, data: Map<String, Any?>) -> T): Flow<Loaded<T>> =
    changes().map { snapshot ->
        val items = snapshot.documents.mapNotNull { document ->
            val data = document.getData(DocumentSnapshot.ServerTimestampBehavior.ESTIMATE) ?: emptyMap()
            try {
                read(document.id, data)
            } catch (e: IllegalArgumentException) {
                Log.w("Loaded", e.message.orEmpty())
                null
            }
        }
        Loaded(items, invalid = snapshot.size() - items.size, fromCache = snapshot.metadata.isFromCache)
    }
````

- [ ] **Step 4: Сборка**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true`
Expected: `app debug tests: 11 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Тесты проходят на устройстве**

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase (тайм-аут 10 минут):

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (7 tests)` и `Script exited successfully (code 0)`.

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
```

Expected: `OK: killing emulator, bye bye`.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
git commit -F - <<'EOF'
feat(android): live tasks, categories and settings from Firestore

Stage 1.2, task 3. The repositories read users/{uid}/tasks and categories
as live lists of the core's models: a document the core refuses is counted,
not shown, and a due zone this device does not know keeps its task. The
settings come from users/{uid} field by field; when the server confirms that
the document does not exist, it is created with the defaults in the
language of the screen, and the rules refuse to replace an existing one. The
device tests write the documents the way the web writes them.
EOF
```

---

### Task 4: Вход, регистрация, сброс пароля и выход

**Files:**
- Create: `android/app/src/main/kotlin/com/pmobile78/todoround/data/Accounts.kt`
- Modify: `android/app/build.gradle.kts`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/res/values-uk/strings.xml`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt`
- Test: `android/app/src/test/kotlin/com/pmobile78/todoround/data/AuthErrorsTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/AccountsTest.kt`

**Interfaces:**
- Consumes: `Backend` и помощники тестов (задачи 1 и 3, в том числе `newEmail()`); `Language` из ядра.
- Produces (`com.pmobile78.todoround.data`): `sealed interface AuthResult` — `AuthResult.Done` и `data class AuthResult.Failed(@StringRes val message: Int)`; `class AccountRepository(auth: FirebaseAuth)` — `val user: Flow<FirebaseUser?>`, `suspend fun signIn(email: String, password: String): AuthResult`, `suspend fun signUp(name: String, email: String, password: String): AuthResult` (имя — в профиль, если не пустое), `suspend fun sendPasswordReset(email: String, language: Language): AuthResult` (без ссылки «Продолжить», спецификация, раздел 5), `fun signOut()`; `@StringRes fun authErrorMessage(error: Exception): Int`; строки `auth_error_*` (en, uk).
- Produces для тестов на устройстве: `suspend fun sentEmails(): List<JSONObject>` — письма, которые «отправил» эмулятор Auth.

- [ ] **Step 1: Написать падающие тесты**

Тест JVM: у каждого случая `authService.js` веба — свой текст. Тест на устройстве — каждый случай на эмуляторе Auth. Язык письма сброса эмулятор не проверяет — он пишет `lang=en` в любую ссылку (`firebase-tools`, `operations.js`), — поэтому тест смотрит язык самого Firebase Auth: по нему настоящий проект выбирает шаблон письма.

Файл `android/app/src/test/kotlin/com/pmobile78/todoround/data/AuthErrorsTest.kt`:

````kotlin
package com.pmobile78.todoround.data

import com.google.firebase.FirebaseNetworkException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuthException
import com.pmobile78.todoround.R
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class AuthErrorsTest {
    @Test
    fun `the cases of the web's authService have their own texts`() {
        mapOf<String, Int>(
            "ERROR_USER_NOT_FOUND" to R.string.auth_error_user_not_found,
            "ERROR_WRONG_PASSWORD" to R.string.auth_error_wrong_password,
            "ERROR_EMAIL_ALREADY_IN_USE" to R.string.auth_error_email_in_use,
            "ERROR_WEAK_PASSWORD" to R.string.auth_error_weak_password,
            "ERROR_INVALID_EMAIL" to R.string.auth_error_invalid_email,
            "ERROR_TOO_MANY_REQUESTS" to R.string.auth_error_too_many_requests,
        ).forEach { (code, message) ->
            assertEquals(message, authErrorMessage(FirebaseAuthException(code, "detail")), code)
        }
    }

    @Test
    fun `a wrong email or password under email enumeration protection says so`() {
        assertEquals(
            R.string.auth_error_invalid_credential,
            authErrorMessage(FirebaseAuthException("ERROR_INVALID_CREDENTIAL", "detail")),
        )
    }

    @Test
    fun `no network and too many requests have their texts`() {
        assertEquals(R.string.auth_error_network, authErrorMessage(FirebaseNetworkException("offline")))
        assertEquals(R.string.auth_error_too_many_requests, authErrorMessage(FirebaseTooManyRequestsException("later")))
    }

    @Test
    fun `anything else is an unexpected error`() {
        assertEquals(
            R.string.auth_error_unexpected,
            authErrorMessage(FirebaseAuthException("ERROR_OPERATION_NOT_ALLOWED", "detail")),
        )
        assertEquals(R.string.auth_error_unexpected, authErrorMessage(IllegalStateException("?")))
    }
}
````

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/AccountsTest.kt`:

````kotlin
package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.data.AccountRepository
import com.pmobile78.todoround.data.AuthResult
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

/** Sign-in, sign-up, password reset and sign-out on the Auth emulator. */
@RunWith(AndroidJUnit4::class)
class AccountsTest {
    private val backend = emulatorBackend()
    private val accounts = AccountRepository(backend.auth)

    @Test
    fun signUpSignOutAndSignInAgain() = runBlocking {
        withTimeout(60_000) {
            val email = newEmail()
            assertEquals(AuthResult.Done, accounts.signUp("Olena", email, "secret-1"))
            val user = accounts.user.filterNotNull().first()
            assertEquals(email, user.email)
            assertEquals("Olena", user.displayName)

            accounts.signOut()
            assertNull(accounts.user.first())

            assertEquals(AuthResult.Done, accounts.signIn(email, "secret-1"))
            assertEquals(email, accounts.user.filterNotNull().first().email)
        }
    }

    @Test
    fun aWrongPasswordAndAnUnknownEmailHaveTheirTexts() = runBlocking {
        withTimeout(60_000) {
            val email = newEmail()
            accounts.signUp("", email, "secret-1")
            accounts.signOut()

            assertEquals(AuthResult.Failed(R.string.auth_error_wrong_password), accounts.signIn(email, "wrong-1"))
            assertEquals(AuthResult.Failed(R.string.auth_error_user_not_found), accounts.signIn(newEmail(), "secret-1"))
        }
    }

    @Test
    fun aTakenEmailAWeakPasswordAndABadEmailHaveTheirTexts() = runBlocking {
        withTimeout(60_000) {
            val email = newEmail()
            accounts.signUp("", email, "secret-1")
            accounts.signOut()

            assertEquals(AuthResult.Failed(R.string.auth_error_email_in_use), accounts.signUp("", email, "secret-1"))
            assertEquals(AuthResult.Failed(R.string.auth_error_weak_password), accounts.signUp("", newEmail(), "12345"))
            assertEquals(AuthResult.Failed(R.string.auth_error_invalid_email), accounts.signUp("", "not-an-email", "secret-1"))
        }
    }

    @Test
    fun aResetEmailGoesOutWithTheLanguageOfTheApp() = runBlocking {
        withTimeout(60_000) {
            val email = newEmail()
            accounts.signUp("", email, "secret-1")
            accounts.signOut()

            assertEquals(AuthResult.Done, accounts.sendPasswordReset(email, Language.UK))
            // Firebase writes the email in this language; the emulator puts lang=en in every link.
            assertEquals("uk", backend.auth.languageCode)
            val sent = sentEmails().filter { it.getString("email") == email }
            assertEquals(listOf("PASSWORD_RESET"), sent.map { it.getString("requestType") })
        }
    }
}
````

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
index 23ee4f8..c615273 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
@@ -6,7 +6,13 @@ import com.google.firebase.firestore.DocumentSnapshot
 import com.google.firebase.firestore.MetadataChanges
 import com.pmobile78.todoround.data.Backend
 import kotlinx.coroutines.CompletableDeferred
+import kotlinx.coroutines.Dispatchers
 import kotlinx.coroutines.tasks.await
+import kotlinx.coroutines.withContext
+import org.json.JSONArray
+import org.json.JSONObject
+import java.net.HttpURLConnection
+import java.net.URL
 import java.util.UUID
 
 /** The app's Firebase for the device tests, which may only ever be the local emulators (docs/android.md). */
@@ -46,3 +52,15 @@ suspend fun DocumentReference.fromServer(): DocumentSnapshot {
         registration.remove()
     }
 }
+
+/** The emails the Auth emulator would have sent: its emulator/v1/…/oobCodes, newest last. */
+suspend fun sentEmails(): List<JSONObject> = withContext(Dispatchers.IO) {
+    val connection = URL("http://127.0.0.1:9099/emulator/v1/projects/demo-to-round/oobCodes").openConnection() as HttpURLConnection
+    val body = try {
+        connection.inputStream.bufferedReader().readText()
+    } finally {
+        connection.disconnect()
+    }
+    val codes = JSONObject(body).optJSONArray("oobCodes") ?: JSONArray()
+    List(codes.length()) { codes.getJSONObject(it) }
+}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :app:testDebugUnitTest`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugUnitTestKotlin'`; первая ошибка — `e: …/AuthErrorsTest.kt:14:48 Unresolved reference 'auth_error_user_not_found'.`

- [ ] **Step 3: `Accounts.kt` и тексты ошибок**

Тексты на английском — из `authService.js` веба; украинских там нет, они новые. `ERROR_INVALID_CREDENTIAL` веб не называет (показывает «An unexpected error occurred.»), а настоящий проект с защитой от перебора почт отвечает так на неверную почту или пароль — у него свой текст.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/data/Accounts.kt`:

````kotlin
package com.pmobile78.todoround.data

import androidx.annotation.StringRes
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.userProfileChangeRequest
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/** What came of a sign-in, a sign-up or a reset email: done, or the text that says why not. */
sealed interface AuthResult {
    data object Done : AuthResult

    data class Failed(@StringRes val message: Int) : AuthResult
}

/** Sign-in, sign-up, password reset and sign-out with Firebase Auth (spec 5), as the web's authService.js. */
class AccountRepository(private val auth: FirebaseAuth) {
    /** The signed-in user, live; null while signed out. */
    val user: Flow<FirebaseUser?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { trySend(it.currentUser) }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    suspend fun signIn(email: String, password: String): AuthResult = attempt {
        auth.signInWithEmailAndPassword(email, password).await()
    }

    /** A new account, signed in; a [name] goes to the Firebase Auth profile, as on the web. */
    suspend fun signUp(name: String, email: String, password: String): AuthResult = attempt {
        val user = auth.createUserWithEmailAndPassword(email, password).await().user!!
        if (name.isNotBlank()) user.updateProfile(userProfileChangeRequest { displayName = name }).await()
    }

    /**
     * The password reset email in [language], without the web's "Continue" link: that link could
     * not lead back into the app (spec 5).
     */
    suspend fun sendPasswordReset(email: String, language: Language): AuthResult = attempt {
        auth.setLanguageCode(language.wire)
        auth.sendPasswordResetEmail(email).await()
    }

    fun signOut() {
        auth.signOut()
    }

    private suspend fun attempt(action: suspend () -> Unit): AuthResult = try {
        action()
        AuthResult.Done
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        AuthResult.Failed(authErrorMessage(e))
    }
}

/**
 * The text for a failure of Firebase Auth: the cases of the web's authService.js (spec 5), and a
 * wrong email or password as Firebase reports it under email enumeration protection.
 */
@StringRes
fun authErrorMessage(error: Exception): Int = when (error) {
    is FirebaseNetworkException -> R.string.auth_error_network
    is FirebaseTooManyRequestsException -> R.string.auth_error_too_many_requests
    is FirebaseAuthException -> when (error.errorCode) {
        "ERROR_USER_NOT_FOUND" -> R.string.auth_error_user_not_found
        "ERROR_WRONG_PASSWORD" -> R.string.auth_error_wrong_password
        "ERROR_INVALID_CREDENTIAL" -> R.string.auth_error_invalid_credential
        "ERROR_EMAIL_ALREADY_IN_USE" -> R.string.auth_error_email_in_use
        "ERROR_WEAK_PASSWORD" -> R.string.auth_error_weak_password
        "ERROR_INVALID_EMAIL" -> R.string.auth_error_invalid_email
        "ERROR_TOO_MANY_REQUESTS" -> R.string.auth_error_too_many_requests
        else -> R.string.auth_error_unexpected
    }
    else -> R.string.auth_error_unexpected
}
````

Изменения в `android/app/src/main/res/values/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values/strings.xml b/android/app/src/main/res/values/strings.xml
index c24ef6f..e6545fa 100644
--- a/android/app/src/main/res/values/strings.xml
+++ b/android/app/src/main/res/values/strings.xml
@@ -2,4 +2,15 @@
 <!-- app_name comes from src/appName.js (app/build.gradle.kts). -->
 <resources>
     <string name="foundation_ready">The app foundation is ready. Sign-in comes in the next update.</string>
+
+    <!-- Failures of Firebase Auth: the texts of the web's authService.js (spec 5). -->
+    <string name="auth_error_user_not_found">User not found.</string>
+    <string name="auth_error_wrong_password">Incorrect password.</string>
+    <string name="auth_error_invalid_credential">Incorrect email or password.</string>
+    <string name="auth_error_email_in_use">Email is already registered.</string>
+    <string name="auth_error_weak_password">Password is too weak.</string>
+    <string name="auth_error_invalid_email">Invalid email address.</string>
+    <string name="auth_error_too_many_requests">Too many attempts. Please try again later.</string>
+    <string name="auth_error_network">Network error. Please check your connection.</string>
+    <string name="auth_error_unexpected">An unexpected error occurred.</string>
 </resources>
````

Изменения в `android/app/src/main/res/values-uk/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values-uk/strings.xml b/android/app/src/main/res/values-uk/strings.xml
index ee7d913..7c78d7b 100644
--- a/android/app/src/main/res/values-uk/strings.xml
+++ b/android/app/src/main/res/values-uk/strings.xml
@@ -1,4 +1,14 @@
 <?xml version="1.0" encoding="utf-8"?>
 <resources>
     <string name="foundation_ready">Основу застосунку готово. Вхід з’явиться в наступному оновленні.</string>
+
+    <string name="auth_error_user_not_found">Користувача не знайдено.</string>
+    <string name="auth_error_wrong_password">Неправильний пароль.</string>
+    <string name="auth_error_invalid_credential">Неправильна електронна пошта або пароль.</string>
+    <string name="auth_error_email_in_use">Ця електронна пошта вже зареєстрована.</string>
+    <string name="auth_error_weak_password">Пароль занадто простий.</string>
+    <string name="auth_error_invalid_email">Неправильна адреса електронної пошти.</string>
+    <string name="auth_error_too_many_requests">Забагато спроб. Спробуйте пізніше.</string>
+    <string name="auth_error_network">Помилка мережі. Перевірте з’єднання.</string>
+    <string name="auth_error_unexpected">Сталася неочікувана помилка.</string>
 </resources>
````

Конструкторы исключений Firebase проверяют сообщение через `android.text.TextUtils`, а в тестах JVM от Android есть только заглушки, которые бросают исключение. Заглушки отвечают значениями по умолчанию:

Изменения в `android/app/build.gradle.kts`:

````diff
diff --git a/android/app/build.gradle.kts b/android/app/build.gradle.kts
index c2fc87e..5388093 100644
--- a/android/app/build.gradle.kts
+++ b/android/app/build.gradle.kts
@@ -68,6 +68,12 @@ android {
         resValues = true
     }
 
+    // Firebase's exceptions check their message with android.text.TextUtils, which plain JVM tests
+    // only have as a stub: let the stubs answer with default values instead of throwing.
+    testOptions {
+        unitTests.isReturnDefaultValues = true
+    }
+
     // The app speaks English and Ukrainian only, also in the texts of its libraries.
     androidResources {
         localeFilters += listOf("en", "uk")
````

- [ ] **Step 4: Сборка**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true`
Expected: `app debug tests: 15 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Тесты проходят на устройстве**

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase (тайм-аут 10 минут):

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (11 tests)` и `Script exited successfully (code 0)`.

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
```

Expected: `OK: killing emulator, bye bye`.

- [ ] **Step 6: Commit**

```bash
git add android/app/build.gradle.kts android/app/src/androidTest/kotlin/com/pmobile78/todoround/AccountsTest.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Accounts.kt android/app/src/main/res/values-uk/strings.xml android/app/src/main/res/values/strings.xml android/app/src/test/kotlin/com/pmobile78/todoround/data/AuthErrorsTest.kt
git commit -F - <<'EOF'
feat(android): sign-in, sign-up, password reset and sign-out with Firebase Auth

Stage 1.2, task 4. AccountRepository signs in and up (a name goes to the
profile), sends the reset email in the language of the app without the
web's "Continue" link, signs out and tells the signed-in user live. A
failure becomes a text in English or Ukrainian for the cases of the web's
authService.js, plus a wrong email or password as Firebase reports it
under email enumeration protection. The device tests run each case on the
Auth emulator; the JVM tests let the Android stubs return default values,
as Firebase's exceptions call TextUtils.
EOF
```

---

### Task 5: Экраны — вход, после входа, язык и тема

**Files:**
- Modify: `android/gradle/libs.versions.toml`, `android/app/build.gradle.kts`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt` (целиком), `android/app/src/main/res/values/strings.xml` (целиком), `android/app/src/main/res/values-uk/strings.xml` (целиком), `android/app/src/main/res/values/themes.xml` (целиком)
- Delete: `android/app/src/main/res/values-night/themes.xml`
- Create: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Appearance.kt`, `ui/AppViewModel.kt`, `ui/AuthScreen.kt`, `ui/HomeScreen.kt` (в той же папке), `android/app/src/main/res/drawable/ic_more_vert.xml`
- Test: `android/app/src/test/kotlin/com/pmobile78/todoround/ui/AuthFormTest.kt`, `android/app/src/test/kotlin/com/pmobile78/todoround/ui/AppearanceTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt`

**Interfaces:**
- Consumes: `AccountRepository`, `AuthResult` (задача 4); репозитории и `Loaded` (задача 3); `Backend`, `ToDoRoundApp` (задача 1); `Settings`, `Language`, `ThemeMode`, `normalizeLanguage` из ядра.
- Produces (`com.pmobile78.todoround.ui`): `data class Appearance(val language: Language?, val nightMode: Int)`, `appearanceOf(settings: Settings?): Appearance`, `Appearance.apply()` (меняет только то, что отличается от экрана), `showLanguage(language: Language)`, `followPhoneLanguage()` (снова язык телефона), `appLanguage(): Language`; `sealed interface Session` — `Starting`, `SignedOut`, `SignedIn(email: String, data: UserData?)`; `data class UserData(val settings: Settings, val tasks: Loaded<Task>, val categories: Loaded<Category>)`; `class AppViewModel(application: Application)` — `val accounts: AccountRepository`, `val session: StateFlow<Session>`, `fun signOut()` (выход и язык телефона); `signInProblem(email, password): Int?`, `signUpProblem(email, password, confirm): Int?`, `resetProblem(email): Int?`; `@Composable AuthScreen(accounts: AccountRepository)`, `@Composable HomeScreen(session: Session.SignedIn, onSignOut: () -> Unit)`; (`com.pmobile78.todoround`) `@Composable AppContent(viewModel: AppViewModel = viewModel())`. Метки для тестов: `auth`, `home`, `tab_sign_in`, `tab_register`, `name`, `email`, `password`, `confirm`, `submit`, `forgot`, `error`, `notice`, `menu`, `logout`, `logout_confirm`, `language_en`, `language_uk`.

- [ ] **Step 1: Библиотеки экранов и тестов**

AppCompat нужен для языка приложения на Android 12 телефона (спецификация, раздел 8). Compose UI test приносит Espresso 3.5, которая на Android 17 падает (`NoSuchMethodException: android.hardware.input.InputManager.getInstance`), поэтому Espresso 3.7.0 указана явно. Тесты запускают сам `MainActivity` (`createAndroidComposeRule<MainActivity>()`), поэтому `ui-test-manifest` с пустой активностью для тестов не нужен.

Изменения в `android/gradle/libs.versions.toml`:

````diff
diff --git a/android/gradle/libs.versions.toml b/android/gradle/libs.versions.toml
index 07b723a..817567c 100644
--- a/android/gradle/libs.versions.toml
+++ b/android/gradle/libs.versions.toml
@@ -3,20 +3,28 @@ activityCompose = "1.13.0"
 agp = "9.4.1"
 androidxTestExtJunit = "1.3.0"
 androidxTestRunner = "1.7.0"
+appcompat = "1.8.0"
 composeBom = "2026.09.00"
 coroutines = "1.11.0"
+espresso = "3.7.0"
 firebaseBom = "35.1.0"
 googleServices = "4.5.0"
 junit = "6.1.3"
 kotlin = "2.4.21"
 kotlinxSerialization = "1.12.0"
+lifecycle = "2.11.0"
 
 [libraries]
 androidx-activity-compose = { module = "androidx.activity:activity-compose", version.ref = "activityCompose" }
+androidx-appcompat = { module = "androidx.appcompat:appcompat", version.ref = "appcompat" }
 androidx-compose-bom = { module = "androidx.compose:compose-bom", version.ref = "composeBom" }
 androidx-compose-material3 = { module = "androidx.compose.material3:material3" }
+androidx-compose-ui-test-junit4 = { module = "androidx.compose.ui:ui-test-junit4" }
 androidx-compose-ui-tooling = { module = "androidx.compose.ui:ui-tooling" }
 androidx-compose-ui-tooling-preview = { module = "androidx.compose.ui:ui-tooling-preview" }
+androidx-lifecycle-runtime-compose = { module = "androidx.lifecycle:lifecycle-runtime-compose", version.ref = "lifecycle" }
+androidx-lifecycle-viewmodel-compose = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version.ref = "lifecycle" }
+androidx-test-espresso-core = { module = "androidx.test.espresso:espresso-core", version.ref = "espresso" }
 androidx-test-ext-junit = { module = "androidx.test.ext:junit", version.ref = "androidxTestExtJunit" }
 androidx-test-runner = { module = "androidx.test:runner", version.ref = "androidxTestRunner" }
 firebase-auth = { module = "com.google.firebase:firebase-auth" }
````

Изменения в `android/app/build.gradle.kts`:

````diff
diff --git a/android/app/build.gradle.kts b/android/app/build.gradle.kts
index 5388093..e415bff 100644
--- a/android/app/build.gradle.kts
+++ b/android/app/build.gradle.kts
@@ -85,8 +85,11 @@ dependencies {
     implementation(platform(libs.androidx.compose.bom))
     implementation(platform(libs.firebase.bom))
     implementation(libs.androidx.activity.compose)
+    implementation(libs.androidx.appcompat)
     implementation(libs.androidx.compose.material3)
     implementation(libs.androidx.compose.ui.tooling.preview)
+    implementation(libs.androidx.lifecycle.runtime.compose)
+    implementation(libs.androidx.lifecycle.viewmodel.compose)
     implementation(libs.firebase.auth)
     implementation(libs.firebase.firestore)
     implementation(libs.kotlinx.coroutines.play.services)
@@ -94,6 +97,10 @@ dependencies {
     testImplementation(platform(libs.junit.bom))
     testImplementation(libs.junit.jupiter)
     testRuntimeOnly(libs.junit.platform.launcher)
+    androidTestImplementation(platform(libs.androidx.compose.bom))
+    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
+    // Compose brings Espresso 3.5, which looks for InputManager.getInstance, gone in Android 17.
+    androidTestImplementation(libs.androidx.test.espresso.core)
     androidTestImplementation(libs.androidx.test.ext.junit)
     androidTestImplementation(libs.androidx.test.runner)
 }
````

- [ ] **Step 2: Написать падающие тесты**

Тесты JVM — проверки формы (как в `AuthForm.jsx` веба) и язык с темой по настройкам (спецификация, раздел 9). Тест на устройстве проходит экраны так, как это сделал бы человек: регистрация, выход через меню с подтверждением, вход; неверный пароль и письмо сброса; язык и тема аккаунта после входа, язык телефона и системная тема после выхода. Аккаунты, которые тест готовит заранее, создаёт клиент «веба» (задача 3): приложение узнаёт о них только при входе на экране.

Экран входа сжимается над клавиатурой, а клавиатура меняет высоту ещё и после того, как открылась: на поле пароля Gboard переходит на раскладку выше на 89 пикселей. Касание, нацеленное мгновением раньше, попадает в часть кнопки, которую экран уже обрезал, и пропадает — так на эмуляторе изредка не начинался вход. Поэтому кнопки формы тест нажимает их действием нажатия (`SemanticsActions.OnClick`, как служба специальных возможностей), а не касанием по координатам.

Файл `android/app/src/test/kotlin/com/pmobile78/todoround/ui/AuthFormTest.kt`:

````kotlin
package com.pmobile78.todoround.ui

import com.pmobile78.todoround.R
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class AuthFormTest {
    @Test
    fun `a sign-in needs an email and a password`() {
        assertEquals(R.string.auth_fill_all_fields, signInProblem("", "secret-1"))
        assertEquals(R.string.auth_fill_all_fields, signInProblem("olena@example.com", ""))
        assertNull(signInProblem("olena@example.com", "secret-1"))
    }

    @Test
    fun `a sign-up needs all but the name, the password twice and six characters`() {
        assertEquals(R.string.auth_fill_all_fields, signUpProblem("", "secret-1", "secret-1"))
        assertEquals(R.string.auth_fill_all_fields, signUpProblem("olena@example.com", "secret-1", ""))
        assertEquals(R.string.auth_password_mismatch, signUpProblem("olena@example.com", "secret-1", "secret-2"))
        assertEquals(R.string.auth_password_too_short, signUpProblem("olena@example.com", "12345", "12345"))
        assertNull(signUpProblem("olena@example.com", "123456", "123456"))
    }

    @Test
    fun `a reset email needs the email`() {
        assertEquals(R.string.auth_enter_email, resetProblem(""))
        assertNull(resetProblem("olena@example.com"))
    }
}
````

Файл `android/app/src/test/kotlin/com/pmobile78/todoround/ui/AppearanceTest.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.appcompat.app.AppCompatDelegate
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.defaultSettings
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class AppearanceTest {
    @Test
    fun `signed out the app keeps its language and follows the theme of the system`() {
        assertEquals(Appearance(language = null, nightMode = AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM), appearanceOf(null))
    }

    @Test
    fun `signed in the app takes the language and the theme of the account`() {
        assertEquals(
            Appearance(Language.UK, AppCompatDelegate.MODE_NIGHT_YES),
            appearanceOf(defaultSettings("uk").copy(themeMode = ThemeMode.DARK)),
        )
        assertEquals(
            Appearance(Language.EN, AppCompatDelegate.MODE_NIGHT_NO),
            appearanceOf(defaultSettings("en").copy(themeMode = ThemeMode.LIGHT)),
        )
        assertEquals(Appearance(Language.EN, AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM), appearanceOf(defaultSettings("en")))
    }
}
````

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt`:

````kotlin
package com.pmobile78.todoround

import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextInput
import androidx.core.os.LocaleListCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.SettingsRepository
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertNotEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The screens on the emulators: what the owner does by hand, done by the test (spec, section 9).
 * The accounts a test prepares come from the web's client, so the app sees them only after the
 * sign-in on the screen.
 */
@RunWith(AndroidJUnit4::class)
class AuthFlowTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val backend = emulatorBackend()

    private fun text(id: Int, vararg args: Any): String = compose.activity.getString(id, *args)

    private fun waitFor(tag: String) =
        compose.waitUntil(60_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }

    private fun type(tag: String, value: String) = compose.onNodeWithTag(tag).performTextInput(value)

    // The screen shrinks above the keyboard, which changes its height even after it has opened (the
    // password layout is taller): a tap aimed a moment earlier can hit the part of the button the
    // screen has just cut off. The buttons of the form are pressed through their click action.
    private fun press(tag: String) = compose.onNodeWithTag(tag).performSemanticsAction(SemanticsActions.OnClick)

    private fun signInOnScreen(email: String, password: String) {
        waitFor("auth")
        type("email", email)
        type("password", password)
        press("submit")
    }

    private fun signOutOnScreen() {
        compose.onNodeWithTag("menu").performClick()
        compose.onNodeWithTag("logout").performClick()
        compose.onNodeWithTag("logout_confirm").performClick()
        waitFor("auth")
    }

    /** An account created on the web's client, with the settings the web gave it. */
    private fun webAccount(email: String, settings: Settings) = runBlocking {
        val web = webBackend()
        val uid = web.signUp(email)
        SettingsRepository(web.db).createUserDoc(uid, settings)
        web.auth.signOut()
    }

    @Before
    fun startSignedOut() {
        backend.auth.signOut()
    }

    @After
    fun forgetTheAppearance() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        }
    }

    @Test
    fun aNewAccountSignsUpOutAndInAgain() {
        val email = newEmail()
        waitFor("auth")
        compose.onNodeWithTag("tab_register").performClick()
        type("name", "Olena")
        type("email", email)
        type("password", "secret-1")
        type("confirm", "secret-1")
        press("submit")
        waitFor("home")
        compose.onNodeWithText(text(R.string.home_signed_in_as, email)).assertExists()

        signOutOnScreen()
        signInOnScreen(email, "secret-1")
        waitFor("home")
    }

    @Test
    fun aWrongPasswordAndAResetEmailAreShown() {
        val email = newEmail()
        webAccount(email, defaultSettings("en"))

        signInOnScreen(email, "wrong-1")
        waitFor("error")
        compose.onNodeWithTag("error").assertTextEquals(text(R.string.auth_error_wrong_password))

        press("forgot")
        waitFor("notice")
        compose.onNodeWithTag("notice").assertTextEquals(text(R.string.auth_reset_email_sent))
    }

    @Test
    fun theLanguageAndTheThemeOfTheAccountApplyAfterSignIn() {
        val email = newEmail()
        // The web has set this account to Ukrainian and the dark theme.
        webAccount(email, defaultSettings("uk").copy(themeMode = ThemeMode.DARK))
        waitFor("auth")
        compose.waitUntil(60_000) { AppCompatDelegate.getDefaultNightMode() == AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM }
        assertNotEquals("uk", AppCompatDelegate.getApplicationLocales().toLanguageTags())

        signInOnScreen(email, "secret-1")
        compose.waitUntil(60_000) {
            AppCompatDelegate.getDefaultNightMode() == AppCompatDelegate.MODE_NIGHT_YES &&
                AppCompatDelegate.getApplicationLocales().toLanguageTags() == "uk"
        }
        waitFor("home")

        // Signed out, the app takes the theme and the language of the phone again, as the web does.
        signOutOnScreen()
        compose.waitUntil(60_000) {
            AppCompatDelegate.getDefaultNightMode() == AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM &&
                AppCompatDelegate.getApplicationLocales().isEmpty
        }
    }
}
````

- [ ] **Step 3: Тесты падают**

Run: `android/gradlew -p android :app:testDebugUnitTest`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugUnitTestKotlin'`; первая ошибка — `e: …/AppearanceTest.kt:13:22 Unresolved reference 'Appearance'.`

- [ ] **Step 4: Сессия, язык и тема, экраны**

Язык ставится, только если отличается от показанного: AppCompat пересоздаёт экран при каждой смене, и лишняя смена после входа — это мигание экрана и закрытое на полпути меню. После выхода приложение снова говорит на языке телефона, как веб (`followPhoneLanguage`).

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Appearance.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.normalizeLanguage

/** How the app looks (spec 8): its [language], where null keeps the current one, and the night mode of AppCompat. */
data class Appearance(val language: Language?, val nightMode: Int)

/**
 * The appearance for the settings of the signed-in account. Signed out ([settings] null), the app
 * keeps the language chosen on the sign-in screen and follows the theme of the system.
 */
fun appearanceOf(settings: Settings?): Appearance = when (settings) {
    null -> Appearance(language = null, nightMode = AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
    else -> Appearance(
        language = settings.language,
        nightMode = when (settings.themeMode) {
            ThemeMode.LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
            ThemeMode.DARK -> AppCompatDelegate.MODE_NIGHT_YES
            ThemeMode.SYSTEM -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        },
    )
}

/**
 * Applies the appearance through AppCompat, which recreates the screen on a change: only what
 * differs from the screen now is set, so the screen does not flicker after every sign-in.
 */
fun Appearance.apply() {
    if (AppCompatDelegate.getDefaultNightMode() != nightMode) AppCompatDelegate.setDefaultNightMode(nightMode)
    if (language != null && language != appLanguage()) showLanguage(language)
}

/** Switches the app to [language]; AppCompat keeps the choice, also on Android 12 (autoStoreLocales). */
fun showLanguage(language: Language) {
    AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(language.wire))
}

/** Lets the app speak the language of the phone again, as before the first choice. */
fun followPhoneLanguage() {
    AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
}

/** The language the app shows now: the one chosen in the app, else the phone's ("uk*" → Ukrainian, else English). */
fun appLanguage(): Language {
    val chosen = AppCompatDelegate.getApplicationLocales()
    val locales = if (chosen.isEmpty) LocaleListCompat.getAdjustedDefault() else chosen
    return normalizeLanguage(locales[0]?.language)
}
````

Сессия держит слушателей и тогда, когда приложение в фоне (`SharingStarted.Lazily`): возврат в приложение не показывает снова загрузку и заметку о кэше.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`:

````kotlin
package com.pmobile78.todoround.ui

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseUser
import com.pmobile78.todoround.ToDoRoundApp
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.data.AccountRepository
import com.pmobile78.todoround.data.CategoriesRepository
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.data.SettingsRepository
import com.pmobile78.todoround.data.TasksRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn

/** The data of the signed-in user that the screens show. */
data class UserData(val settings: Settings, val tasks: Loaded<Task>, val categories: Loaded<Category>)

/** What the app shows. */
sealed interface Session {
    /** Firebase Auth has not told yet whether someone is signed in. */
    data object Starting : Session

    data object SignedOut : Session

    /** [data] is null until the settings, the tasks and the categories have all been read. */
    data class SignedIn(val email: String, val data: UserData?) : Session
}

/** The session of the app: who is signed in and their data, live (spec 6). */
class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val backend = (application as ToDoRoundApp).backend
    val accounts = AccountRepository(backend.auth)
    private val tasks = TasksRepository(backend.db)
    private val categories = CategoriesRepository(backend.db)
    private val settings = SettingsRepository(backend.db)

    // Lazily: the listeners stay while the app is in the background, so a return to the app
    // keeps the screen instead of loading it again from the cache.
    @OptIn(ExperimentalCoroutinesApi::class)
    val session: StateFlow<Session> = accounts.user
        .flatMapLatest { user -> if (user == null) flowOf(Session.SignedOut) else signedIn(user) }
        .stateIn(viewModelScope, SharingStarted.Lazily, Session.Starting)

    /** Signs out; the app takes the language of the phone again, as the web does (spec 8). */
    fun signOut() {
        accounts.signOut()
        followPhoneLanguage()
    }

    // A new account gets the language of the sign-in screen (spec 8).
    private fun signedIn(user: FirebaseUser): Flow<Session> =
        combine(
            settings.settings(user.uid, appLanguage().wire),
            tasks.tasks(user.uid),
            categories.categories(user.uid),
        ) { settings, tasks, categories ->
            Session.SignedIn(user.email.orEmpty(), settings?.let { UserData(it, tasks, categories) })
        }
            .onStart { emit(Session.SignedIn(user.email.orEmpty(), null)) }
            .catch { Log.w("AppViewModel", "the data of the account could not be read", it) }
}
````

Экран входа — как `AuthForm.jsx` веба: вкладки, поля, проверки, «Забыли пароль?», переключатель EN/UK. Переключатель темы веба сюда не переносится: до входа тема системная (раздел 8). Клавиатура сжимает экран (`imePadding`), а не закрывает поля и кнопки.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AuthScreen.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.data.AccountRepository
import com.pmobile78.todoround.data.AuthResult
import kotlinx.coroutines.launch

/** What stops a sign-in before Firebase is asked, as on the web's AuthForm; null when nothing does. */
@StringRes
fun signInProblem(email: String, password: String): Int? =
    if (email.isEmpty() || password.isEmpty()) R.string.auth_fill_all_fields else null

/** What stops a sign-up: every field but the name is needed, the same password twice, 6 characters at least. */
@StringRes
fun signUpProblem(email: String, password: String, confirm: String): Int? = when {
    email.isEmpty() || password.isEmpty() || confirm.isEmpty() -> R.string.auth_fill_all_fields
    password != confirm -> R.string.auth_password_mismatch
    password.length < 6 -> R.string.auth_password_too_short
    else -> null
}

/** What stops a password reset email: it needs the email. */
@StringRes
fun resetProblem(email: String): Int? = if (email.isEmpty()) R.string.auth_enter_email else null

/** Sign-in and sign-up (spec 5) with the language switch of the web's sign-in screen (spec 8). */
@Composable
fun AuthScreen(accounts: AccountRepository) {
    var register by rememberSaveable { mutableStateOf(false) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirm by rememberSaveable { mutableStateOf("") }
    var failure by rememberSaveable { mutableStateOf<Int?>(null) }
    var notice by rememberSaveable { mutableStateOf<Int?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // As on the web, another tab starts with empty fields.
    fun switchTo(registerTab: Boolean) {
        register = registerTab
        name = ""
        email = ""
        password = ""
        confirm = ""
        failure = null
        notice = null
    }

    // Asks Firebase unless [problem] stops it; a failure shows its text, a success [done] if given.
    fun submit(@StringRes problem: Int?, @StringRes done: Int? = null, request: suspend () -> AuthResult) {
        failure = problem
        notice = null
        if (problem != null) return
        busy = true
        scope.launch {
            when (val result = request()) {
                AuthResult.Done -> notice = done
                is AuthResult.Failed -> failure = result.message
            }
            busy = false
        }
    }

    Scaffold(modifier = Modifier.testTag("auth")) { padding ->
        // The keyboard shrinks the screen instead of covering the fields and the buttons.
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            LanguageSwitch(Modifier.align(Alignment.End))
            Image(
                painter = painterResource(R.drawable.ic_launcher_foreground),
                contentDescription = null,
                modifier = Modifier.size(120.dp),
            )
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = stringResource(R.string.auth_welcome),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(16.dp))
            PrimaryTabRow(selectedTabIndex = if (register) 1 else 0) {
                Tab(
                    selected = !register,
                    onClick = { switchTo(registerTab = false) },
                    text = { Text(stringResource(R.string.auth_login)) },
                    modifier = Modifier.testTag("tab_sign_in"),
                )
                Tab(
                    selected = register,
                    onClick = { switchTo(registerTab = true) },
                    text = { Text(stringResource(R.string.auth_register)) },
                    modifier = Modifier.testTag("tab_register"),
                )
            }
            if (register) Field(name, { name = it }, R.string.auth_display_name, "name")
            Field(email, { email = it }, R.string.auth_email, "email", KeyboardType.Email)
            Field(password, { password = it }, R.string.auth_password, "password", KeyboardType.Password, hidden = true)
            if (register) {
                Field(confirm, { confirm = it }, R.string.auth_confirm_password, "confirm", KeyboardType.Password, hidden = true)
            }
            failure?.let {
                Message(stringResource(it), MaterialTheme.colorScheme.error, "error")
            }
            notice?.let {
                Message(stringResource(it), MaterialTheme.colorScheme.primary, "notice")
            }
            Button(
                onClick = {
                    if (register) {
                        submit(signUpProblem(email, password, confirm)) { accounts.signUp(name, email, password) }
                    } else {
                        submit(signInProblem(email, password)) { accounts.signIn(email, password) }
                    }
                },
                enabled = !busy,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
                    .testTag("submit"),
            ) {
                if (busy) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text(stringResource(if (register) R.string.auth_register_button else R.string.auth_login_button))
                }
            }
            if (!register) {
                TextButton(
                    onClick = {
                        submit(resetProblem(email), R.string.auth_reset_email_sent) {
                            accounts.sendPasswordReset(email, appLanguage())
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier.testTag("forgot"),
                ) {
                    Text(stringResource(R.string.auth_forgot_password))
                }
            }
        }
    }
}

@Composable
private fun Field(
    value: String,
    onValueChange: (String) -> Unit,
    @StringRes label: Int,
    tag: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    hidden: Boolean = false,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(stringResource(label)) },
        singleLine = true,
        visualTransformation = if (hidden) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp)
            .testTag(tag),
    )
}

@Composable
private fun Message(text: String, color: Color, tag: String) {
    Text(
        text = text,
        color = color,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
            .testTag(tag),
    )
}

/** EN | UK, as on the web; until one is chosen, the app speaks the language of the phone (spec 8). */
@Composable
private fun LanguageSwitch(modifier: Modifier = Modifier) {
    val current = appLanguage()
    SingleChoiceSegmentedButtonRow(modifier) {
        Language.entries.forEachIndexed { index, language ->
            SegmentedButton(
                selected = language == current,
                onClick = { showLanguage(language) },
                shape = SegmentedButtonDefaults.itemShape(index, Language.entries.size),
                // The blue of the tabs and buttons, not the coral accent of the theme.
                colors = SegmentedButtonDefaults.colors(
                    activeContainerColor = MaterialTheme.colorScheme.primaryContainer,
                    activeContentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                ),
                modifier = Modifier.testTag("language_${language.wire}"),
            ) {
                Text(language.wire.uppercase())
            }
        }
    }
}
````

Экран после входа — заглушка до списка задач подплана 1.3: верхняя панель с меню «Выйти» (раздел 7) и что прочитано из Firestore.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme

/**
 * The screen of a signed-in user until the task list of sub-plan 1.3: the top bar with the menu
 * "Logout" (spec 7) and what has been read from Firestore.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(session: Session.SignedIn, onSignOut: () -> Unit) {
    var menu by remember { mutableStateOf(false) }
    var confirmSignOut by rememberSaveable { mutableStateOf(false) }
    Scaffold(
        modifier = Modifier.testTag("home"),
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.app_name)) },
                actions = {
                    IconButton(onClick = { menu = true }, modifier = Modifier.testTag("menu")) {
                        Icon(painterResource(R.drawable.ic_more_vert), contentDescription = stringResource(R.string.menu))
                    }
                    DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.auth_logout)) },
                            onClick = {
                                menu = false
                                confirmSignOut = true
                            },
                            modifier = Modifier.testTag("logout"),
                        )
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(stringResource(R.string.home_signed_in_as, session.email), style = MaterialTheme.typography.titleMedium)
            val data = session.data
            if (data == null) {
                CircularProgressIndicator()
            } else {
                Text(stringResource(R.string.home_tasks, data.tasks.items.size))
                Text(stringResource(R.string.home_categories, data.categories.items.size))
                val invalid = data.tasks.invalid + data.categories.invalid
                if (invalid > 0) {
                    Text(stringResource(R.string.home_invalid, invalid), color = MaterialTheme.colorScheme.error)
                }
                if (data.tasks.fromCache || data.categories.fromCache) {
                    Text(stringResource(R.string.home_offline), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(stringResource(R.string.home_list_next), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text(stringResource(R.string.auth_logout_confirm)) },
            text = { Text(stringResource(R.string.auth_logout_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        confirmSignOut = false
                        onSignOut()
                    },
                    modifier = Modifier.testTag("logout_confirm"),
                ) {
                    Text(stringResource(R.string.auth_approve_logout))
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmSignOut = false }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun HomeScreenPreview() {
    ToDoRoundTheme {
        HomeScreen(
            Session.SignedIn(
                email = "olena@example.com",
                data = UserData(defaultSettings("en"), Loaded(emptyList(), 0, false), Loaded(emptyList(), 0, false)),
            ),
            onSignOut = {},
        )
    }
}
````

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt`:

````kotlin
package com.pmobile78.todoround

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.pmobile78.todoround.ui.AppViewModel
import com.pmobile78.todoround.ui.AuthScreen
import com.pmobile78.todoround.ui.HomeScreen
import com.pmobile78.todoround.ui.Session
import com.pmobile78.todoround.ui.appearanceOf
import com.pmobile78.todoround.ui.apply
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme

// AppCompat switches the language of the app on Android before 13 too (spec 8).
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ToDoRoundTheme {
                AppContent()
            }
        }
    }
}

/** The sign-in screen or the screen of the signed-in user, in the language and the theme of the session (spec 8). */
@Composable
fun AppContent(viewModel: AppViewModel = viewModel()) {
    val session by viewModel.session.collectAsStateWithLifecycle()
    val appearance = when (val current = session) {
        Session.Starting -> null
        Session.SignedOut -> appearanceOf(null)
        is Session.SignedIn -> current.data?.let { appearanceOf(it.settings) }
    }
    LaunchedEffect(appearance) {
        appearance?.apply()
    }
    when (val current = session) {
        Session.Starting -> Unit
        Session.SignedOut -> AuthScreen(viewModel.accounts)
        is Session.SignedIn -> HomeScreen(current, onSignOut = viewModel::signOut)
    }
}
````

- [ ] **Step 5: Ресурсы: строки, тема окна, меню**

Строки — из `src/locales` веба (`auth.*`); заглушка 1.1 `foundation_ready` уходит. Тема окна — `Theme.AppCompat.DayNight.NoActionBar`: ночной режим AppCompat сам выбирает цвета `values-night`, поэтому `values-night/themes.xml` больше не нужен.

Файл `android/app/src/main/res/values/strings.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- app_name comes from src/appName.js (app/build.gradle.kts). The texts follow src/locales of the web. -->
<resources>
    <string name="auth_welcome">Welcome</string>
    <string name="auth_login">Login</string>
    <string name="auth_register">Register</string>
    <string name="auth_email">Email</string>
    <string name="auth_password">Password</string>
    <string name="auth_confirm_password">Confirm Password</string>
    <string name="auth_display_name">Name (optional)</string>
    <string name="auth_login_button">Sign In</string>
    <string name="auth_register_button">Sign Up</string>
    <string name="auth_forgot_password">Forgot Password?</string>
    <string name="auth_fill_all_fields">Please fill in all fields</string>
    <string name="auth_password_mismatch">Passwords do not match</string>
    <string name="auth_password_too_short">Password must be at least 6 characters</string>
    <string name="auth_enter_email">Please enter your email</string>
    <string name="auth_reset_email_sent">Password reset email sent</string>
    <string name="auth_logout">Logout</string>
    <string name="auth_logout_confirm">Confirm Logout</string>
    <string name="auth_logout_message">Are you sure you want to log out from your account?</string>
    <string name="auth_approve_logout">Logout</string>
    <string name="cancel">Cancel</string>
    <string name="menu">Menu</string>

    <!-- Failures of Firebase Auth: the texts of the web's authService.js (spec 5). -->
    <string name="auth_error_user_not_found">User not found.</string>
    <string name="auth_error_wrong_password">Incorrect password.</string>
    <string name="auth_error_invalid_credential">Incorrect email or password.</string>
    <string name="auth_error_email_in_use">Email is already registered.</string>
    <string name="auth_error_weak_password">Password is too weak.</string>
    <string name="auth_error_invalid_email">Invalid email address.</string>
    <string name="auth_error_too_many_requests">Too many attempts. Please try again later.</string>
    <string name="auth_error_network">Network error. Please check your connection.</string>
    <string name="auth_error_unexpected">An unexpected error occurred.</string>

    <!-- The screen after sign-in until the task list of sub-plan 1.3. -->
    <string name="home_signed_in_as">Signed in as %1$s</string>
    <string name="home_tasks">Tasks: %1$d</string>
    <string name="home_categories">Categories: %1$d</string>
    <string name="home_invalid">Documents that failed the check: %1$d</string>
    <string name="home_offline">No connection to the server: these are the data saved on this device.</string>
    <string name="home_list_next">The task list comes in the next update.</string>
</resources>
````

Файл `android/app/src/main/res/values-uk/strings.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="auth_welcome">Ласкаво просимо</string>
    <string name="auth_login">Увійти</string>
    <string name="auth_register">Реєстрація</string>
    <string name="auth_email">Електронна пошта</string>
    <string name="auth_password">Пароль</string>
    <string name="auth_confirm_password">Підтвердити пароль</string>
    <string name="auth_display_name">Ім’я (опціонально)</string>
    <string name="auth_login_button">Увійти</string>
    <string name="auth_register_button">Зареєструватися</string>
    <string name="auth_forgot_password">Забули пароль?</string>
    <string name="auth_fill_all_fields">Будь ласка, заповніть всі поля</string>
    <string name="auth_password_mismatch">Паролі не співпадають</string>
    <string name="auth_password_too_short">Пароль повинен містити мінімум 6 символів</string>
    <string name="auth_enter_email">Будь ласка, введіть вашу електронну пошту</string>
    <string name="auth_reset_email_sent">Лист для скидання пароля надіслано</string>
    <string name="auth_logout">Вийти</string>
    <string name="auth_logout_confirm">Підтвердження виходу</string>
    <string name="auth_logout_message">Ви впевнені, що хочете вийти з вашого облікового запису?</string>
    <string name="auth_approve_logout">Вийти</string>
    <string name="cancel">Скасувати</string>
    <string name="menu">Меню</string>

    <string name="auth_error_user_not_found">Користувача не знайдено.</string>
    <string name="auth_error_wrong_password">Неправильний пароль.</string>
    <string name="auth_error_invalid_credential">Неправильна електронна пошта або пароль.</string>
    <string name="auth_error_email_in_use">Ця електронна пошта вже зареєстрована.</string>
    <string name="auth_error_weak_password">Пароль занадто простий.</string>
    <string name="auth_error_invalid_email">Неправильна адреса електронної пошти.</string>
    <string name="auth_error_too_many_requests">Забагато спроб. Спробуйте пізніше.</string>
    <string name="auth_error_network">Помилка мережі. Перевірте з’єднання.</string>
    <string name="auth_error_unexpected">Сталася неочікувана помилка.</string>

    <string name="home_signed_in_as">Ви увійшли як %1$s</string>
    <string name="home_tasks">Задач: %1$d</string>
    <string name="home_categories">Категорій: %1$d</string>
    <string name="home_invalid">Документів, що не пройшли перевірку: %1$d</string>
    <string name="home_offline">Немає зв’язку із сервером: це дані, збережені на цьому пристрої.</string>
    <string name="home_list_next">Список задач з’явиться в наступному оновленні.</string>
</resources>
````

Файл `android/app/src/main/res/values/themes.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- The window behind Compose; the screens take their colours from ToDoRoundTheme. AppCompat
         switches the language and the night mode of the app (spec 8). -->
    <style name="Theme.ToDoRound" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowBackground">@color/window_background</item>
    </style>
</resources>
````

Изменения в `android/app/src/main/res/values-night/themes.xml` (файл удаляется):

````diff
diff --git a/android/app/src/main/res/values-night/themes.xml b/android/app/src/main/res/values-night/themes.xml
deleted file mode 100644
index 4d9024f..0000000
--- a/android/app/src/main/res/values-night/themes.xml
+++ /dev/null
@@ -1,6 +0,0 @@
-<?xml version="1.0" encoding="utf-8"?>
-<resources>
-    <style name="Theme.ToDoRound" parent="android:Theme.Material.NoActionBar">
-        <item name="android:windowBackground">@color/window_background</item>
-    </style>
-</resources>
````

Файл `android/app/src/main/res/drawable/ic_more_vert.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "More" of the Material icons (Apache License 2.0): the menu of the top bar. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M12,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,10c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2 -0.9,-2 -2,-2zM12,16c-1.1,0 -2,0.9 -2,2s0.9,2 2,2 2,-0.9 2,-2 -0.9,-2 -2,-2z" />
</vector>
````

На Android до 13 язык, выбранный в приложении, хранит сам AppCompat (`autoStoreLocales`):

Изменения в `android/app/src/main/AndroidManifest.xml`:

````diff
diff --git a/android/app/src/main/AndroidManifest.xml b/android/app/src/main/AndroidManifest.xml
index becfbc5..4cfe517 100644
--- a/android/app/src/main/AndroidManifest.xml
+++ b/android/app/src/main/AndroidManifest.xml
@@ -19,6 +19,16 @@
                 <category android:name="android.intent.category.LAUNCHER" />
             </intent-filter>
         </activity>
+
+        <!-- AppCompat keeps the language chosen in the app on Android before 13 too (spec 8). -->
+        <service
+            android:name="androidx.appcompat.app.AppLocalesMetadataHolderService"
+            android:enabled="false"
+            android:exported="false">
+            <meta-data
+                android:name="autoStoreLocales"
+                android:value="true" />
+        </service>
     </application>
 
 </manifest>
````

- [ ] **Step 6: Сборка и Lint**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `app debug tests: 20 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.`

- [ ] **Step 7: Тесты проходят на устройстве**

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase (тайм-аут 10 минут):

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (14 tests)` и `Script exited successfully (code 0)`; сразу после загрузки — полторы-две минуты.

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
```

Expected: `OK: killing emulator, bye bye`.

- [ ] **Step 8: Commit**

```bash
git add android/app/build.gradle.kts android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt android/app/src/main/AndroidManifest.xml android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/Appearance.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/AuthScreen.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt android/app/src/main/res/drawable/ic_more_vert.xml android/app/src/main/res/values-night/themes.xml android/app/src/main/res/values-uk/strings.xml android/app/src/main/res/values/strings.xml android/app/src/main/res/values/themes.xml android/app/src/test/kotlin/com/pmobile78/todoround/ui/AppearanceTest.kt android/app/src/test/kotlin/com/pmobile78/todoround/ui/AuthFormTest.kt android/gradle/libs.versions.toml
git commit -F - <<'EOF'
feat(android): sign-in screen, Logout, and the language and theme of the account

Stage 1.2, task 5. The app opens on the sign-in screen of the web: tabs to
sign in and up, the checks of its fields, the reset email and an EN | UK
switch; until a choice it speaks the language of the phone, in the theme
of the system. After sign-in a placeholder for the list of 1.3 shows who is
signed in and what has been read, with Logout in the menu behind a
confirmation. The language and the theme of the account apply at once, and
the theme falls back to the system's after sign-out. MainActivity is an
AppCompatActivity, so the language works on Android 12, and the device
tests pin Espresso 3.7: the one Compose brings fails on Android 17.
EOF
```

---

### Task 6: Документация, полная проверка и проверка вживую

**Files:**
- Modify: `docs/android.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: всё из задач 1–5.
- Produces: разделы `docs/android.md` «Firebase» и «Эмуляторы Firebase», заметки о телефоне и эмуляторе; команды тестов на устройстве в `CLAUDE.md`.

- [ ] **Step 1: Документация**

Изменения в `docs/android.md`:

````diff
diff --git a/docs/android.md b/docs/android.md
index 11244d8..be6d090 100644
--- a/docs/android.md
+++ b/docs/android.md
@@ -7,7 +7,8 @@
 | Путь | Что внутри |
 |---|---|
 | `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели. Тесты (JUnit) читают общие примеры из `contract/` |
-| `android/app` | Android-приложение: экраны на Compose, тема, строки en/uk, иконка |
+| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
+| `android/device-tests.sh` | запуск тестов на устройстве против эмуляторов Firebase (ниже) |
 | `android/gradle/libs.versions.toml` | версии библиотек и плагинов |
 | `contract/` | общие примеры данных для веба, функций и Android ([README](../contract/README.md)) |
 
@@ -31,17 +32,28 @@ org.gradle.java.home=/media/big_disk/android/android-studio/jbr
 
 Первая сборка скачивает Gradle и библиотеки, а недостающие пакеты SDK (Build-Tools, платформу Android) ставит сама — лицензии SDK уже приняты.
 
+## Firebase
+
+Приложение зарегистрировано в проекте `todo-flutter-fb8bf`: `com.pmobile78.todoround`, App ID `1:699564548059:android:9246f56b0bf422d85fd1fe`, с отпечатком SHA-1 отладочного ключа этой машины. Его настройки — `android/app/google-services.json`. Файл вне git, как `.env` веба, и скачивается командой Firebase CLI:
+
+```bash
+firebase apps:sdkconfig ANDROID 1:699564548059:android:9246f56b0bf422d85fd1fe --project todo-flutter-fb8bf -o android/app/google-services.json
+```
+
+Без файла `app` не собирается (`File google-services.json is missing`). Отпечаток релизного ключа, когда ключ появится, добавляет команда `firebase apps:android:sha:create <App ID> <SHA-1> --project todo-flutter-fb8bf`; SHA-1 печатает `keytool -list -v -keystore <файл ключа>`.
+
 ## Команды
 
 Из корня репозитория:
 
 ```bash
-android/gradlew -p android check                    # все тесты и Android Lint
+android/gradlew -p android check                    # тесты JVM (core и app) и Android Lint
 android/gradlew -p android :core:test               # только тесты контракта на примерах contract/
 android/gradlew -p android :app:assembleDebug       # отладочная сборка
 android/gradlew -p android :app:installDebug        # поставить отладочную сборку на подключённое устройство
 android/gradlew -p android :app:assembleRelease     # релизная сборка (R8; подписана, если настроен ключ)
 android/gradlew -p android --stop                   # остановить демон Gradle и освободить память
+# тесты на устройстве — в разделе «Эмуляторы Firebase»
 ```
 
 - Отладочный APK — `android/app/build/outputs/apk/debug/app-debug.apk`, релизный — `android/app/build/outputs/apk/release/`.
@@ -63,7 +75,11 @@ android/gradlew -p android --stop                   # остановить де
 
 Проверка: `adb devices` показывает телефон со словом `device`. Затем `adb -d install -r android/app/build/outputs/apk/debug/app-debug.apk` (`-d` — единственное устройство на кабеле; так команда не спутает телефон с эмулятором).
 
-Без кабеля (Android 11+): «Для разработчиков → Отладка по Wi-Fi → Подключить устройство с помощью кода», затем на компьютере `adb pair <адрес>:<порт>` с кодом с экрана и `adb connect <адрес>:<порт>`; дальше команды `adb -s <адрес>:<порт> …`.
+Без кабеля (Android 11+): «Для разработчиков → Отладка по Wi-Fi → Подключить устройство с помощью кода», затем на компьютере `adb pair <адрес>:<порт>` с кодом с экрана и `adb connect <адрес>:<порт>`; дальше команды `adb -s <адрес>:<порт> …`. Компьютер и телефон запоминают сопряжение: в следующий раз достаточно включить «Отладку по Wi-Fi» и `adb connect` к адресу с её главного экрана (`adb pair` иногда печатает `protocol fault … Success`, хотя сопряжение прошло).
+
+С этим компьютером по кабелю у Redmi 9 бывают фантомные касания: от помех экран сам «нажимает» — закрывает приложения и отменяет окна, в том числе окно установки (`INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`). Проверка: `adb -d shell getevent -lt /dev/input/event3` при нетронутом телефоне ничего не печатает. Поэтому телефон подключают по Wi-Fi.
+
+При установке через adb телефон сначала показывает окно Google Play Защиты, затем окно MIUI «Установка через USB». Оба нужно подтвердить; окно MIUI само закрывается с отменой примерно через 10 секунд.
 
 Если MIUI не даёт ставить по USB: скопировать APK на телефон и открыть его в файловом менеджере (разрешить установку из этого источника).
 
@@ -86,6 +102,26 @@ adb -e emu kill
 - Эмулятор загружается около двух минут. Под нагрузкой система эмулятора может показать окно «… isn't responding» (службы Google, лончер или интерфейс системы) — нажать «Wait»; к приложению это не относится.
 - `-no-snapshot` означает полную загрузку, а не чистый эмулятор: поставленные приложения и настройки сохраняются между запусками. Поэтому перед установкой прежнее приложение удаляют — сборка с другим ключом поверх не встанет. Совсем чистый старт — флаг `-wipe-data`.
 - Тёмная тема: `adb -e shell cmd uimode night yes` (вернуть — `night no`); украинский язык приложения: `adb -e shell cmd locale set-app-locales com.pmobile78.todoround --locales uk-UA`.
+- `emu kill` выключает эмулятор мгновенно, и только что изменённая настройка (например, тема) теряется. Перед ним — 3 секунды и `adb -e shell sync`.
+
+## Эмуляторы Firebase
+
+Отладочная сборка с ключом `-Ptodoround.emulators=true` работает не с проектом, а с эмуляторами Auth и Firestore из `firebase.json` (порты 9099 и 8180) и проектом эмуляторов веба `demo-to-round`: в прод она не ходит, а правила — настоящие `firestore.rules`. Устройство обращается к эмуляторам по своему `127.0.0.1` через `adb reverse`: Android 17 не пускает приложения в локальную сеть, в том числе к `10.0.2.2`, без разрешения `ACCESS_LOCAL_NETWORK`. Открытый HTTP к `127.0.0.1` разрешён только отладочной сборке.
+
+Тесты на устройстве (`app/src/androidTest`) проверяют Firebase, репозитории, вход и экраны. Gradle рядом с эмулятором не запускают, поэтому сначала сборка, потом эмулятор:
+
+```bash
+android/gradlew -p android :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true
+android/gradlew -p android --stop
+emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect &
+adb -e wait-for-device; until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done
+firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
+adb -e emu kill
+```
+
+`android/device-tests.sh` ставит оба APK, включает `adb reverse`, запускает тесты, удаляет приложение и печатает итог: `OK (N tests)` или ошибки. Сборку без `-Ptodoround.emulators=true` тесты отвергают, чтобы не ходить в прод.
+
+Попробовать приложение руками: в отдельном терминале `firebase emulators:start --only auth,firestore --project demo-to-round`, затем `adb -e reverse tcp:9099 tcp:9099`, `adb -e reverse tcp:8180 tcp:8180` и установка сборки с ключом. Писем эмулятор не отправляет: ссылку сброса пароля он печатает в своём журнале (`To reset the password for …, follow this link: …`).
 
 ## Релизный ключ
 
````

Изменения в `CLAUDE.md`:

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index fc78104..cda3397 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -24,9 +24,11 @@ npm run version:minor
 npm run version:major
 
 # Android app (android/; Gradle runs on Android Studio's JBR, see docs/android.md)
-android/gradlew -p android check              # core contract tests on contract/ + Android Lint
+android/gradlew -p android check              # JVM tests of core (on contract/) and app + Android Lint
 android/gradlew -p android :core:test         # contract tests only
 android/gradlew -p android :app:assembleDebug # debug APK
+# device tests: APKs built with -Ptodoround.emulators=true, Android emulator booted (docs/android.md), then
+firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
 ```
 
 **Install:** always use `npm ci --legacy-peer-deps` — there are peer dependency conflicts between packages.
@@ -91,11 +93,13 @@ functions/
 
 ### Android app
 
-`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, with JUnit tests on `contract/`; `app` — the Android application. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
+`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, with JUnit tests on `contract/`; `app` — the Android application: Firebase Auth and Firestore with `android/app/google-services.json` (out of git; `firebase apps:sdkconfig`), screens on Compose. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
 
 - Never print `~/.gradle/gradle.properties` whole (`cat`, `less`, an unanchored `grep`): it holds the release key passwords. Read one non-secret line at a time, e.g. `grep '^org.gradle.java.home' ~/.gradle/gradle.properties`.
 - `core` compiles against the JDK but runs on Android 8+: `-Xjdk-release=17` keeps out Java 18+ methods, not the Java 9–17 ones Android 8 lacks (`List.of` …). Use `java.time` and the Kotlin standard library there.
 - With a phone and the emulator both connected, address one: `adb -e` (the emulator), `adb -d` (the USB phone).
+- A debug build with `-Ptodoround.emulators=true` works with the Auth and Firestore emulators of `firebase.json` (project `demo-to-round`), reached at the device's own 127.0.0.1 through `adb reverse`: Android 17 keeps apps out of the local network, 10.0.2.2 included. The device tests (`app/src/androidTest`) run that way through `android/device-tests.sh`. Never run Gradle while the Android emulator is up (14 GB of RAM): build, `--stop`, then boot it.
+- Device test names are camelCase: D8 refuses spaces in method names before DEX 040 (minSdk 26). JVM tests may keep backtick names.
 
 ### Firestore data model
 
````

- [ ] **Step 2: Полная проверка и неизменный веб**

```bash
android/gradlew -p android clean check
tail -1 android/app/build/reports/lint-results-debug.txt
git diff --stat main...HEAD -- . ':!android' ':!docs' ':!CLAUDE.md' ':!contract/README.md'
```

Expected: `core tests: 87 passed, 0 failed, 0 skipped`, `app debug tests: 20 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`, `No issues found.`; `git diff --stat` ничего не выводит: кроме `android/`, документации и `contract/README.md` (подплан 1.1), ветка ничего не меняет.

- [ ] **Step 3: Сборки для эмулятора: релиз с R8 и тесты**

Релиз (R8) подписывается одноразовым ключом, как в 1.1 — это не ключ владельца:

```bash
K=/media/big_disk/android/work/throwaway-release.jks
mkdir -p /media/big_disk/android/work && rm -f $K
/media/big_disk/android/android-studio/jbr/bin/keytool -genkeypair -keystore $K -storetype PKCS12 -storepass throwaway-test -keypass throwaway-test -alias throwaway -keyalg RSA -keysize 2048 -validity 2 -dname "CN=ToDo-Round throwaway test"
android/gradlew -p android :app:assembleDebug :app:assembleDebugAndroidTest :app:assembleRelease -Ptodoround.emulators=true -Ptodoround.release.storeFile=$K -Ptodoround.release.storePassword=throwaway-test -Ptodoround.release.keyAlias=throwaway -Ptodoround.release.keyPassword=throwaway-test
/media/big_disk/android/sdk/build-tools/37.0.0/apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk 2>/dev/null | grep 'certificate DN'
rm -f $K
```

Expected: `BUILD SUCCESSFUL`; `V2 Signer: certificate DN: CN=ToDo-Round throwaway test`. Ключ эмуляторов на релиз не действует: у релиза `BuildConfig.EMULATORS` всегда `false`.

- [ ] **Step 4: Проверка на эмуляторе**

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Релиз после R8 запускается (вход он не делает: релиз работает с настоящим проектом):

```bash
source /media/big_disk/android/android-env.sh
adb -e uninstall com.pmobile78.todoround
adb -e install android/app/build/outputs/apk/release/app-release.apk
adb -e logcat -c
adb -e shell am start -W -n com.pmobile78.todoround/.MainActivity | grep Status
timeout 120 sh -c 'until adb -e exec-out uiautomator dump /dev/tty | grep -q ToDo-Round; do sleep 1; done'
adb -e exec-out screencap -p > /media/big_disk/android/work/stage-1-2-release.png
adb -e logcat -d | grep -c 'FATAL EXCEPTION'
adb -e uninstall com.pmobile78.todoround
```

Expected: `Failure […]` (приложения не было) или `Success`, затем `Success`, `Status: ok`, `0` и `Success`. На снимке — экран входа: три пузыря, «ToDo-Round», вкладки «Login» и «Register», переключатель EN/UK. На этом и следующих снимках может быть окно «… isn't responding» — это система эмулятора под нагрузкой (`docs/android.md`); экран входа под ним виден, к приложению окно не относится.

Тесты на устройстве:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (14 tests)` и `Script exited successfully (code 0)`. Вход, регистрацию, сброс пароля и выход вживую проходит `AuthFlowTest` — по экранам, как человек (спецификация, раздел 9); глазами смотрятся снимки экрана входа.

Экран входа вживую — на языке телефона в светлой теме, затем украинский в тёмной. Экран рисуется, когда Firebase Auth сообщит, что входа нет, а под нагрузкой это бывает и через несколько секунд после запуска, — поэтому снимок делается, когда на экране появилось название приложения (`uiautomator dump`, до 2 минут):

```bash
source /media/big_disk/android/android-env.sh
adb -e install android/app/build/outputs/apk/debug/app-debug.apk
adb -e shell am start -W -n com.pmobile78.todoround/.MainActivity | grep Status
timeout 120 sh -c 'until adb -e exec-out uiautomator dump /dev/tty | grep -q ToDo-Round; do sleep 1; done'
adb -e exec-out screencap -p > /media/big_disk/android/work/stage-1-2-auth-en.png
adb -e shell cmd uimode night yes
adb -e shell cmd locale set-app-locales com.pmobile78.todoround --locales uk-UA
adb -e shell am force-stop com.pmobile78.todoround
adb -e shell am start -W -n com.pmobile78.todoround/.MainActivity | grep Status
timeout 120 sh -c 'until adb -e exec-out uiautomator dump /dev/tty | grep -q ToDo-Round; do sleep 1; done'
adb -e exec-out screencap -p > /media/big_disk/android/work/stage-1-2-auth-uk-dark.png
```

Expected: `Success`, `Status: ok`, `Night mode: yes`, `Status: ok`. На первом снимке — экран входа на английском в светлой теме, на втором — на украинском («Увійти», «Реєстрація», «Забули пароль?») в тёмной; выбранный язык подсвечен синим.

Оставить эмулятор чистым и выключить:

```bash
source /media/big_disk/android/android-env.sh
adb -e uninstall com.pmobile78.todoround
adb -e shell cmd uimode night no
sleep 3; adb -e shell sync; adb -e emu kill
```

Expected: `Success`, `Night mode: no`, `OK: killing emulator, bye bye`.

- [ ] **Step 5: Телефон — по желанию владельца**

Отладочная сборка без ключа эмуляторов работает с настоящим проектом: владелец может войти на Redmi 9 в свой аккаунт и увидеть, сколько задач и категорий прочитано, — это первая проверка чтения прода перед подпланом 1.3. Приложение в прод ничего не пишет: документ пользователя у аккаунта владельца уже есть. Если владелец согласен и включил на телефоне «Отладку по Wi-Fi» (`docs/android.md`, раздел «Телефон»):

```bash
android/gradlew -p android :app:assembleDebug
android/gradlew -p android --stop
source /media/big_disk/android/android-env.sh
adb connect <адрес>:<порт>
adb -s <адрес>:<порт> uninstall com.pmobile78.toround
adb -s <адрес>:<порт> install -r android/app/build/outputs/apk/debug/app-debug.apk
```

`com.pmobile78.toround` — сборка 1.1 со старым идентификатором; `Failure […]` значит, что её уже нет. При установке телефон спрашивает Play Защиту и MIUI — владелец подтверждает оба окна; окно MIUI закрывается само примерно через 10 секунд. Не согласен или телефона нет — шаг пропускается с отметкой в журнале исполнения.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md docs/android.md
git commit -F - <<'EOF'
docs(android): Firebase, the emulators and the device tests in docs/android.md

Stage 1.2, task 6. docs/android.md tells where google-services.json comes
from (the app is registered in todo-flutter-fb8bf), how a debug build works
with the Firebase emulators through adb reverse and how to run the device
tests. The phone part adds the phantom touches over the cable of this
computer and the install dialogs, the emulator part the setting a quick
emu kill loses. CLAUDE.md gets the commands and the rules of the emulator
mode.
EOF
```

---

## Передача в 1.3

Подплан 1.3 «Список задач и проверка на Redmi 9» опирается на этот код.

- **Сессия:** `AppViewModel.session` — `Session.Starting`, `SignedOut`, `SignedIn(email, data)`; `data` — `UserData(settings, tasks, categories)` или `null`, пока не прочитаны все три. `HomeScreen` — заглушка: 1.3 заменяет её тело списком, а верхнюю панель с меню «Выйти» и строки `home_*` (сводка, заметки о кэше и о непрошедших документах) использует или заменяет.
- **Данные:** `Loaded<T>(items, invalid, fromCache)` у задач и категорий; задача с зоной, которой нет в базе устройства, в списке есть — её срок 1.3 показывает как `due.local`, без пересчёта и без отметки просрочки (`toInstant` бросает `DateTimeException` на такую зону). Документы с ошибками — в `invalid` (их ошибки — в журнале устройства, `adb logcat -s Loaded`).
- **Правила списка** (фильтр `listFilter`, сортировка `listSort`, раздел 7 спецификации) — в `core`, как задумано обзором; репозитории отдают все задачи пользователя, включая `done` и `deleted`.
- **Язык и тема** применяются в `AppContent` по `appearanceOf(settings)`; новый экран ничего для этого не делает.
- **Тесты на устройстве** — `android/device-tests.sh` под `firebase emulators:exec`; 14 тестов; помощники — `Emulators.kt` (`emulatorBackend`, `webBackend` — второй клиент за веб, `newEmail`, `signUp`, `signUpNewUser`, `fromServer`, `sentEmails`). Данные веба в тестах пишутся через Android SDK в форме `newTaskData` веба (см. `RepositoriesTest`).
- **Известные мелочи:** если поток данных аккаунта упадёт (например, правила откажут), `AppViewModel` только пишет в журнал, и экран остаётся с индикатором загрузки — 1.3 показывает это состояние в списке; первые секунды после запуска, пока Firebase Auth не ответил, экран пуст (только фон окна). Холодный запуск аккаунта с тёмной темой на светлом телефоне сначала показывает светлый экран, затем пересоздаёт его тёмным — можно помнить последнюю тему у себя на устройстве; заметка «из кэша» мелькает при запуске, пока не ответил сервер. Экран входа хранит введённый пароль в сохранённом состоянии (`rememberSaveable`); признак «идёт запрос» (`busy`) при пересоздании экрана теряется. Если после создания аккаунта не удалось записать имя в профиль (`updateProfile`), экран показывает ошибку, но вход уже выполнен.
- **Отложено из ревью 1.1:** `deviceTimeZone()` и `isValidTimeZone` сузить до `ZoneId.getAvailableZoneIds()` до того, как Android начнёт писать `due.tz` (этап 2); `isIsoTimestamp` и високосная секунда / 29 февраля против веба, годы 0000–0099 в `parseLocal` (этап 5, импорт бэкапа); слушатель сводки тестов (`addTestListener` с анонимным объектом, теперь в корневом `build.gradle.kts`) несовместим с кэшем конфигурации Gradle; копия списка в `Records.stringsOrNull`. Сообщение Gradle при неполном релизном ключе уже называет недостающее свойство (`Cannot query the value of Gradle property 'todoround.release.storePassword' …`) — менять не нужно.
- **Телефон:** по Wi-Fi (`adb connect` к адресу с экрана «Отладка по Wi-Fi»; компьютер и телефон уже сопряжены); проверка 1.3 — вход владельца на Redmi 9 в отладочной сборке без ключа эмуляторов.
