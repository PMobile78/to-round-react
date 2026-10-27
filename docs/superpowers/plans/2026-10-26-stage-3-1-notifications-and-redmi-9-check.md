# Этап 3.1: уведомления в приложении и проверка на Redmi 9 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Напоминания и «просрочено» приходят на телефон через приложение: оно регистрируется в FCM по id установки и записывает себя устройством аккаунта, показывает пуши сервера, убирает себя из устройств при выходе, подсказывает, что включить в MIUI, — и всё это проверено на Redmi 9 в худшем случае: приложение смахнуто, экран выключен.

**Architecture:** `core` проверяет запись устройства по правилам (`validateDevice`). `app`: `DevicesRepository` пишет `users/{uid}/devices/{FID}` (новое — целиком, известное — только адрес); `ThisDevice` регистрирует телефон в FCM (`FirebaseMessaging.register()`), а адрес, который FCM сообщает в `onRegistered` (FID, а на старых сервисах Google Play — токен), пишет по одной записи за раз. Служба `RemindersService` показывает пуши (`onPush`: одно уведомление на задачу, время отправки, нажатие открывает приложение) и передаёт адрес из `onRegistered`. После входа `RegisterThisDevice` регистрирует телефон при каждом открытии и спрашивает разрешение (Android 13+); «Выйти» сначала удаляет документ устройства. Пункт меню «Нагадування на цьому пристрої» открывает окно с состоянием уведомлений и шагами для MIUI. Сервер, контракт, правила и веб не меняются: FCM принимает FID в поле `token` сообщения.

**Tech Stack:** как в 2.1 — Kotlin 2.4.21, Compose BOM 2026.09.00 (Material 3), Firebase BoM 35.1.0, AppCompat 1.8.0, Lifecycle 2.11.0; тесты JVM — JUnit 6, на устройстве — Compose UI test, AndroidX Test, Espresso 3.7.0. Новые библиотеки: `firebase-messaging` 26.0.1 и `firebase-installations` 20.0.0 (версии даёт BoM 35.1.0) и, только для тестов на устройстве, `androidx.test.uiautomator:uiautomator` 2.4.0 — шторка уведомлений системы. Эмуляторам Firebase нужны Firebase CLI 15 и Java 21+; пробному пушу — Node 22 и вход Firebase CLI владельца.

**Spec:** [docs/superpowers/specs/2026-10-24-stage-3-notifications-design.md](../specs/2026-10-24-stage-3-notifications-design.md) — разделы 2.2, 2.3, 3–9, с уточнениями после черновика и ревью этого плана. Обзор — [2026-10-24-stage-3-overview.md](2026-10-24-stage-3-overview.md). Основа — `main` 3730b54 (этап 1 и подплан 2.1). Сервер — [docs/notifications.md](../../notifications.md), контракт — раздел 3.3 [контракта v2](../specs/2026-10-14-stage-0-data-contract-v2-design.md). Весь код плана прогнан в черновой копии ветки: числа тестов и строки `Expected` — настоящие, тесты на устройстве — на эмуляторе `ToRound_API37` (Android 17); там же пробный пуш показал, что FCM принимает FID в поле `token`.

## Global Constraints

- Ветка `stage-3-notifications`: спецификация одобрена в `fd525a6`, уточнена в `1c80ae8`; этот план — `docs/superpowers/plans/2026-10-26-stage-3-1-notifications-and-redmi-9-check.md` — следующим коммитом в ней. Исполнение — в этой ветке (или в рабочей копии от неё). В `main` не коммитить, ничего не пушить без слова владельца.
- Веб, `contract/`, правила Firestore, Cloud Functions и CI не меняются. Документация — в задаче 6: `docs/android.md`, `docs/notifications.md`, `CLAUDE.md` и одно уточнение раздела 3.3 спецификации контракта (на Android `fcmToken` — это FID). Если окажется, что без правки сервера или контракта не обойтись, работа останавливается до решения владельца (подплан 3.2).
- Все команды — из корня репозитория; Gradle — `android/gradlew -p android … --no-daemon`, на JBR Android Studio, как в этапе 1. `--no-daemon`, потому что машину делят несколько сессий: `--stop` остановил бы и их демоны.
- `android/app/google-services.json` — вне git; в копии, где его нет, его скачивает шаг 1 задачи 2. Регистрацию приложения в Firebase не повторять, проект Firebase не менять.
- Эмуляторы Firebase — из `firebase.json`: Auth на 9099, Firestore на 8180, проект `demo-to-round`; `emulators:exec` занимает ещё 4400, 4500 и 9150. Перед запуском порты свободны: `ss -ltn | grep -E ':(9099|8180|4400|4500|9150)\b'` ничего не печатает. Их может держать другая сессия: её процессы не трогать — подождать, пока порты освободятся. Если ждать долго, тесты можно прогнать на своих портах — вне репозитория: копия `firebase.json` с портами 19099, 18180, 14400, 14500, 19150 (`firebase emulators:exec --config <копия> …`) и копия `android/device-tests.sh` с `adb -e reverse tcp:9099 tcp:19099` и `adb -e reverse tcp:8180 tcp:18180`.
- Эмулятор Android `ToRound_API37` тоже бывает занят другой сессией. Перед каждым запуском — блок «Свободен ли эмулятор»: если эмулятор уже работает, он чужой — ждать, не трогать и не ставить на него ничего. Свой эмулятор выключается блоком, который ждёт конца его процесса: `adb -e emu kill` однажды ответил «bye bye», а процесс остался.
- Памяти 14 ГБ: Gradle и эмулятор Android одновременно не работают. Порядок прогона на устройстве: сборка; проверка, что эмулятор свободен; эмулятор в фоне (`run_in_background`); ожидание загрузки одной командой с тайм-аутом 10 минут — она ждёт ещё минуту после загрузки: в первую минуту система эмулятора под нагрузкой закрывает «зависшие» фоновые процессы (`bg anr`), и в прогоне черновика так закрыла приложение посреди первого теста; тесты в фоне или с тайм-аутом 40 минут (под нагрузкой 36 тестов идут 20–30 минут); выключение с ожиданием конца процесса.
- Тесты на устройстве идут только на сборке с `-Ptodoround.emulators=true` и только на эмуляторе: `android/device-tests.sh` удаляет приложение до и после прогона. Итог печатает скрипт: `OK (N tests)` или список ошибок; с задачи 4 — два итога: тест запроса разрешения отдельно, затем остальные. Сбой первого теста на только что загруженном эмуляторе — `INSTRUMENTATION_RESULT: shortMsg=Process crashed.` или ошибка Firebase `unexpected end of stream` (первое соединение с эмулятором Auth; так однажды упал `BackendTest` в прогоне этого плана), а также `Error: TIMEOUT: Port 8180 on 127.0.0.1 was not active within 60000ms` (эмулятор Firestore не успел запуститься на загруженной машине) — не ошибка кода: прогнать блок тестов ещё раз.
- Сборка для эмуляторов Firebase в FCM не регистрируется (задача 3): эмуляторы пушей не шлют, а тесты не зависят от сети Google. Пуши проверяются сборкой с проектом: пробным пушем на эмулятор (задача 6) и на Redmi 9.
- `adb -e` — эмулятор. Телефон Redmi 9 — только по Wi-Fi (`adb -s <адрес>:<порт>`) и только после «да» владельца (задача 6): по кабелю от этого компьютера у телефона бывают фантомные касания. Перед работой с эмулятором телефон отключают — `adb disconnect <адрес>:<порт>`.
- Запись в прод (спецификация, 2.3 № 16). Приложение пишет в Firestore только документ своего устройства. Пробные пуши и тестовая задача «ToDo-Round test» в аккаунте владельца — только с его «да» (задача 6). Настройки MIUI на телефоне меняет владелец сам.
- Личное не печатается. FID, адрес и токены не выводятся: скрипты пробного пуша и чтения прода печатают только «да/нет», числа и время. Файл `no_backup/PersistedInstallation.*.json` из данных приложения содержит токены установки: из него берётся только поле `Fid`, сам файл не печатается и не сохраняется.
- Версии библиотек и плагинов, кроме трёх новых, не менять. Если Lint сообщит только о вышедших новых версиях (`GradleDependency`, `AndroidGradlePluginVersion`), записать это в журнал исполнения и продолжать.
- `~/.gradle/gradle.properties` целиком не выводить: там пароли релизного ключа. Строки смотреть по одной.
- Код в плане взят из проверенной черновой копии без правок. Новые и переписанные целиком файлы даны полностью (перед блоком — строка с путём); изменения существующих — блоками `diff` относительно состояния после предыдущей задачи: блок можно сохранить во временный файл и применить `git apply <файл>` из корня репозитория. Блоки кода ограничены четырьмя обратными кавычками.
- Kotlin — официальный стиль; комментарии в коде — на английском. Имена тестов на устройстве — camelCase (D8 и `minSdk` 26), тестов JVM — в обратных кавычках.
- Каждая сборка печатает `[Incubating] Problems report is available at: …` и `Consider enabling configuration cache …` — это не ошибки; строки `Expected` их не упоминают.

## Review Focus

- **Регистрация без сети, на медленном старте и дважды сразу.** `DevicesRepository.register` ждёт копии документа с сервера, а не пишет по кэшу; регистрация в FCM, которая не удалась, не пишет ничего — следующее открытие попробует снова; регистрация с экрана и `onRegistered` пишут по одной (иначе обе создали бы документ, и правила отклонили бы вторую). `DevicesTest` (задача 2): `aFailedRegistrationWithFcmWritesNothing`, `twoRegistrationsAtOnceWriteOneDevice`.
- **Адрес — тот, что сообщил FCM.** На сервисах Google Play старше 26.12 библиотека регистрирует телефон не по FID, а токеном и сообщает в `onRegistered` его; документ при этом называется по FID. `DevicesTest` (задача 2): `thisPhoneHasTheAddressFcmReportsAndOnlyWithNotificationsOn`.
- **Разрешение Android 13+.** «Не разрешать» — адреса нет; разрешили позже в настройках Android — после возврата в приложение адрес есть. `PermissionTest` (задача 4), его `android/device-tests.sh` гоняет до выдачи разрешения.
- **Выход без сети.** Удаление документа ждёт не больше 2 секунд, потом выход всё равно; оставшийся на сервере документ шлёт пуши телефону, где никто не вошёл, — `onPush` их не показывает. `AuthFlowTest` (задача 4): документа нет сразу после выхода; `NotificationsTest` (задача 3): пуш при выходе не показан.
- **Переключатель другого устройства.** Новый адрес известного устройства никогда не пишет `notificationsEnabled`: его меняет веб (и будущий переключатель). `DevicesTest` (задача 2): выключенный «вебом» переключатель остаётся выключенным.
- **Несколько задач — нужное нажатие.** У задачи одно уведомление (тег — `taskId`); у разных задач — разные `PendingIntent` (код запроса от `taskId`), иначе нажатие одной открыло бы другую. `NotificationsTest` (задача 3): замена, две задачи, нажатие открывает `t1`.
- **Сборка для эмуляторов не ходит в FCM.** Иначе тесты зависят от сети Google, а поздний `onRegistered` мог бы записать устройство после выхода и сломать проверку выхода. `firebase_messaging_auto_init_enabled` — `false` в сборке с эмуляторами (проверка `aapt2` в задаче 3) и `true` в сборке с проектом (задача 6); вместо FCM сборка с эмуляторами сама сообщает FID как адрес.

## Структура файлов

| Файл | Ответственность |
|---|---|
| `android/core/src/main/kotlin/…/core/contract/Schema.kt`, `Validate.kt` | (изменение) `Platform`, предел адреса, `validateDevice` |
| `android/app/src/main/kotlin/…/data/Documents.kt`, `Repositories.kt` | (изменение) новый документ устройства, смена адреса; `DevicesRepository` |
| `android/app/src/main/kotlin/…/data/ThisDevice.kt` | (новый) этот телефон как устройство: FID, регистрация в FCM, адрес от FCM, записи по одной |
| `android/app/src/main/kotlin/…/notifications/Reminders.kt` | (новый) канал, разбор пуша, показ уведомления, нажатие |
| `android/app/src/main/kotlin/…/notifications/RemindersService.kt` | (новый) служба FCM: пуши и `onRegistered` |
| `android/app/src/main/kotlin/…/ToDoRoundApp.kt` | (изменение) `ThisDevice`, `registered(address)`, область работы приложения, канал при запуске |
| `android/app/src/main/kotlin/…/ui/Notifications.kt` | (новый) `RegisterThisDevice` (разрешение и регистрация), окно `RemindersWindow` |
| `android/app/src/main/kotlin/…/ui/AppViewModel.kt`, `MainActivity.kt`, `ui/HomeScreen.kt` | (изменение) регистрация после входа, удаление устройства при выходе, пункт меню |
| `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle.kts`, `android/gradle/libs.versions.toml` | (изменение) разрешение, служба, флаги FCM, умолчания уведомлений, `singleTop`; библиотеки |
| `android/app/src/main/res/drawable/ic_notification.xml`, `values/colors.xml`, `values*/strings.xml` | (новый/изменение) значок строки состояния, цвет, тексты |
| `android/device-tests.sh` | (изменение) тест запроса разрешения отдельно, затем выдаёт разрешение на уведомления и гоняет остальные |
| `android/core/src/test/…/ValidateTest.kt`, `android/app/src/test/…/DocumentsTest.kt`, `notifications/RemindersTest.kt` | тесты JVM |
| `android/app/src/androidTest/…/DevicesTest.kt`, `NotificationsTest.kt`, `PermissionTest.kt` | (новые) устройство под правилами; показ, замена, нажатие; запрос разрешения |
| `android/app/src/androidTest/…/AuthFlowTest.kt`, `Emulators.kt`, `HomeScreenTest.kt` | (изменение) устройство после входа и выхода; ожидание документа; окно и пункт меню |
| `docs/android.md`, `docs/notifications.md`, `CLAUDE.md`, спецификация контракта (3.3) | (изменение) уведомления на телефоне, MIUI, пробный пуш |

Пакеты: `…` — это `com/pmobile78/todoround`.

---

### Task 1: Запись устройства в ядре

**Files:**
- Modify: `android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Schema.kt`, `android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/ValidateTest.kt`

**Interfaces:**
- Consumes: из 1.1 — `fromWire`, `WireValue`, `isValidId`, `Limits`, валидаторы `Validate.kt` и `Contract.cases`.
- Produces (`com.pmobile78.todoround.core.contract`): `enum class Platform(wire) { WEB("web"), ANDROID("android") }`; `Limits.FCM_TOKEN_MAX_LENGTH = 4096`; `fun validateDevice(device: Any?): List<String>` — ошибки записи устройства в форме бэкапа (`id`, `platform`, `fcmToken`, `notificationsEnabled`, `createdAt`, `updatedAt`), те же проверки, что `validDevice` в `firestore.rules`.

- [ ] **Step 1: Написать падающие тесты**

Все примеры `contract/fixtures/devices.json` и то, чего в них нет: адрес — `null` или 1–4096 символов, как в правилах, и поле есть всегда.

Изменения в `android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/ValidateTest.kt`:

````diff
diff --git a/android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/ValidateTest.kt b/android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/ValidateTest.kt
index 95ef993..feb53a2 100644
--- a/android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/ValidateTest.kt
+++ b/android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/ValidateTest.kt
@@ -34,6 +34,12 @@ class ValidateTest {
     @TestFactory
     fun `invalid settings of the contract`() = rejects("fixtures/settings.json", ::validateSettings)
 
+    @TestFactory
+    fun `valid devices of the contract`() = accepts("fixtures/devices.json", ::validateDevice)
+
+    @TestFactory
+    fun `invalid devices of the contract`() = rejects("fixtures/devices.json", ::validateDevice)
+
     // "minimal-without-due": no due, no category, active.
     @Suppress("UNCHECKED_CAST")
     private val task = Contract.cases("fixtures/tasks.json", "valid").first().second as Map<String, Any?>
@@ -44,6 +50,7 @@ class ValidateTest {
         assertEquals(listOf("task: not an object"), validateTask(listOf(task)))
         assertEquals(listOf("category: not an object"), validateCategory("c1"))
         assertEquals(listOf("settings: not an object"), validateSettings(emptyList<Any>()))
+        assertEquals(listOf("device: not an object"), validateDevice(null))
     }
 
     @Test
@@ -85,6 +92,18 @@ class ValidateTest {
         assertEquals(listOf("createdAt: invalid"), validateTask(task + ("createdAt" to "2026-13-01T08:00:00.000Z")))
     }
 
+    // "android-without-permission": an Android device whose token is null.
+    @Suppress("UNCHECKED_CAST")
+    private val device = Contract.cases("fixtures/devices.json", "valid")[1].second as Map<String, Any?>
+
+    @Test
+    fun `a device token is null or 1 to 4096 characters, as the rules allow, and is always there`() {
+        assertEquals(emptyList<String>(), validateDevice(device + ("fcmToken" to "x".repeat(4096))))
+        assertEquals(listOf("fcmToken: invalid"), validateDevice(device + ("fcmToken" to "x".repeat(4097))))
+        assertEquals(listOf("fcmToken: invalid"), validateDevice(device - "fcmToken"))
+        assertEquals(listOf("updatedAt: invalid"), validateDevice(device + ("updatedAt" to "2026-10-02")))
+    }
+
     @Test
     fun `isValidId takes a Firestore document id`() {
         assertEquals(true, isValidId("k3j9x0abc"))
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :core:test --no-daemon`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/ValidateTest.kt:38:80 Unresolved reference 'validateDevice'.`

- [ ] **Step 3: `validateDevice`**

Веб записи устройств не проверяет — их проверяют только правила, и эти проверки здесь повторены (спецификация, 2.3 № 15).

Изменения в `android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Schema.kt`:

````diff
diff --git a/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Schema.kt b/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Schema.kt
index 9f2f646..f9cedef 100644
--- a/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Schema.kt
+++ b/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Schema.kt
@@ -31,6 +31,7 @@ object Limits {
     const val RADIUS_MAX = 80
     const val FONT_SIZE_MIN = 8
     const val FONT_SIZE_MAX = 20
+    const val FCM_TOKEN_MAX_LENGTH = 4096
 }
 
 /** A value of the contract kept as a string: [wire] is how Firestore and backups store it. */
@@ -73,3 +74,7 @@ enum class SortField(override val wire: String) : WireValue {
 enum class SortOrder(override val wire: String) : WireValue {
     ASC("asc"), DESC("desc"),
 }
+
+enum class Platform(override val wire: String) : WireValue {
+    WEB("web"), ANDROID("android"),
+}
````

Изменения в `android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt`:

````diff
diff --git a/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt b/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt
index 9856ea3..ced3f02 100644
--- a/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt
+++ b/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt
@@ -23,6 +23,7 @@ private val SETTINGS_KEYS = setOf(
     "themeMode", "design", "language", "mainView", "labelFontSize", "bubbleBackground",
     "showCategoriesPanel", "showInstructions", "bubbleFilter", "listFilter", "listSort",
 )
+private val DEVICE_KEYS = setOf("id", "platform", "fcmToken", "notificationsEnabled", "createdAt", "updatedAt")
 
 // The characters String.prototype.trim() removes in JavaScript: white space and line ends.
 private val JS_SPACES: Set<Int> =
@@ -203,3 +204,18 @@ fun validateSettings(settings: Any?): List<String> {
     }
     return errors
 }
+
+/** Errors of a device record: the checks of validDevice in firestore.rules (spec 3.3), which has no validate.js counterpart. */
+fun validateDevice(device: Any?): List<String> {
+    if (device !is Map<*, *>) return listOf("device: not an object")
+    val errors = unknownKeys(device, DEVICE_KEYS).map { "$it: unknown field" }.toMutableList()
+    if (!isValidId(device.field("id"))) errors += "id: invalid"
+    if (fromWire<Platform>(device.field("platform")) == null) errors += "platform: invalid"
+    val token = device.field("fcmToken")
+    if (!(token == null || (token is String && token.length in 1..Limits.FCM_TOKEN_MAX_LENGTH))) errors += "fcmToken: invalid"
+    if (device.field("notificationsEnabled") !is Boolean) errors += "notificationsEnabled: invalid"
+    listOf("createdAt", "updatedAt").forEach { key ->
+        if (!isIsoTimestamp(device.field(key))) errors += "$key: invalid"
+    }
+    return errors
+}
````

- [ ] **Step 4: Тесты проходят**

Run: `android/gradlew -p android :core:test --no-daemon`
Expected: `core tests: 114 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Schema.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/ValidateTest.kt
git commit -F - <<'EOF'
feat(android): the record of a device is checked in core, as the rules check it
EOF
```

---

### Task 2: Этот телефон — устройство аккаунта в Firestore

**Files:**
- Create (команда, если файла нет): `android/app/google-services.json` (вне git)
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt`
- Create: `android/app/src/main/kotlin/com/pmobile78/todoround/data/ThisDevice.kt`
- Test: `android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt`; Create: `android/app/src/androidTest/kotlin/com/pmobile78/todoround/DevicesTest.kt`

**Interfaces:**
- Consumes: `Platform`, `validateDevice` (задача 1); из 1.2 — `emulatorBackend()`, `signUpNewUser()`, `fromServer()`, `changes()` в `Repositories.kt`.
- Produces (`com.pmobile78.todoround.data`):
  - `fun newDeviceDoc(address: String?): Map<String, Any?>` — `platform: "android"`, `fcmToken`, `notificationsEnabled: true`, `createdAt` и `updatedAt` — время сервера; `fun deviceAddressUpdate(address: String?): Map<String, Any?>` — `fcmToken` и `updatedAt`;
  - `class DevicesRepository(db)`: `suspend fun register(uid: String, deviceId: String, address: String?): Boolean` — ждёт копию документа с сервера; нет документа — `set` нового, другой адрес — `update`, тот же — ничего (`false`); `suspend fun unregister(uid: String, deviceId: String)` — `delete`;
  - `class ThisDevice(devices, fid: suspend () -> String, registerWithFcm: suspend () -> Unit, notificationsOn: () -> Boolean)`: `suspend fun register(uid)` — с уведомлениями регистрируется в FCM (ошибка — исключение до записи; адрес FCM сообщит в `registered`), без них пишет адрес `null`; `suspend fun registered(uid, address)` — пишет адрес, который сообщил FCM (без уведомлений — `null`), в документ с id = текущий FID; `suspend fun unregister(uid)`. Записи и удаление идут по одной (`Mutex`).

- [ ] **Step 1: Настройки Firebase этой машины**

`app` не собирается без `google-services.json`. Файл вне git: в копии, где приложение уже собирали, он есть; иначе его скачивает Firebase CLI (вход в CLI — аккаунт владельца, как у веба):

```bash
test -f android/app/google-services.json || firebase apps:sdkconfig ANDROID 1:699564548059:android:9246f56b0bf422d85fd1fe --project todo-flutter-fb8bf -o android/app/google-services.json
git status --short --ignored android/app
```

Expected: в выводе `git status` есть строка `!! android/app/google-services.json` (в копии, где приложение уже собирали, есть и `!! android/app/build/`).

- [ ] **Step 2: Написать падающие тесты**

Тесты JVM: новый документ — запись, которую принимают контракт и правила (времена сервера подставлены); известное устройство меняет только адрес. Тесты на устройстве: те же записи под настоящими правилами на эмуляторе Firestore; адрес — тот, что сообщил FCM (FID, токен старых сервисов Google Play, новый FID), и только при включённых уведомлениях; две регистрации сразу пишут один документ; неудачная регистрация в FCM ничего не пишет.

Изменения в `android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt`:

````diff
diff --git a/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt b/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
index f604331..c5ecb6d 100644
--- a/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
+++ b/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
@@ -9,6 +9,7 @@ import com.pmobile78.todoround.core.contract.SortField
 import com.pmobile78.todoround.core.contract.SortOrder
 import com.pmobile78.todoround.core.contract.TaskStatus
 import com.pmobile78.todoround.core.contract.ThemeMode
+import com.pmobile78.todoround.core.contract.validateDevice
 import com.pmobile78.todoround.core.contract.validateTask
 import com.pmobile78.todoround.core.model.Category
 import com.pmobile78.todoround.core.model.Due
@@ -188,4 +189,30 @@ class DocumentsTest {
             listFilterUpdate(ListFilter(null, showUncategorized = true))["settings.listFilter"],
         )
     }
+
+    @Test
+    fun `a new device is this phone with notifications on, and the contract takes its record`() {
+        assertEquals(
+            mapOf(
+                "platform" to "android",
+                "fcmToken" to "fid-1",
+                "notificationsEnabled" to true,
+                "createdAt" to FieldValue.serverTimestamp(),
+                "updatedAt" to FieldValue.serverTimestamp(),
+            ),
+            newDeviceDoc("fid-1"),
+        )
+        // The record of the document once the server has put in its times.
+        for (address in listOf("fid-1", null)) {
+            val doc: Map<String, Any?> = newDeviceDoc(address)
+            val record = doc.mapValues { if (it.value is FieldValue) "2026-10-24T10:00:00Z" else it.value } + ("id" to "fid-1")
+            assertEquals(emptyList<String>(), validateDevice(record))
+        }
+    }
+
+    @Test
+    fun `a known device changes only its address, and the switch stays as it is`() {
+        assertEquals(mapOf("fcmToken" to "fid-2", "updatedAt" to FieldValue.serverTimestamp()), deviceAddressUpdate("fid-2"))
+        assertEquals(mapOf("fcmToken" to null, "updatedAt" to FieldValue.serverTimestamp()), deviceAddressUpdate(null))
+    }
 }
````

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/DevicesTest.kt`:

````kotlin
package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.data.DevicesRepository
import com.pmobile78.todoround.data.ThisDevice
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.IOException

/**
 * This phone as a device of its user on the Firestore emulator, under the rules of the repository
 * (stage 3 spec, section 5). The FID and the registration with FCM are the test's own.
 */
@RunWith(AndroidJUnit4::class)
class DevicesTest {
    private val backend = emulatorBackend()
    private val devices = DevicesRepository(backend.db)

    private fun device(uid: String, id: String) = backend.db.document("users/$uid/devices/$id")

    @Test
    fun aNewDeviceHasNotificationsOnAndAKnownOneGetsOnlyItsNewAddress() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            assertTrue(devices.register(uid, "fid-1", "fid-1"))
            val created = device(uid, "fid-1").fromServer()
            assertEquals("android", created.getString("platform"))
            assertEquals("fid-1", created.getString("fcmToken"))
            assertEquals(true, created.getBoolean("notificationsEnabled"))
            assertNotNull(created.getTimestamp("createdAt"))

            // The same address again writes nothing.
            assertFalse(devices.register(uid, "fid-1", "fid-1"))
            assertEquals(created.getTimestamp("updatedAt"), device(uid, "fid-1").fromServer().getTimestamp("updatedAt"))

            // Another client switched the reminders of this device off: a new address keeps that.
            device(uid, "fid-1").update(mapOf("notificationsEnabled" to false, "updatedAt" to FieldValue.serverTimestamp())).await()
            val switchedOff = device(uid, "fid-1").fromServer().getTimestamp("updatedAt")
            assertTrue(devices.register(uid, "fid-1", null))
            val known = device(uid, "fid-1").fromServer()
            assertTrue(known.contains("fcmToken"))
            assertNull(known.getString("fcmToken"))
            assertEquals(false, known.getBoolean("notificationsEnabled"))
            assertEquals(created.getTimestamp("createdAt"), known.getTimestamp("createdAt"))
            assertNotEquals(switchedOff, known.getTimestamp("updatedAt"))

            devices.unregister(uid, "fid-1")
            assertFalse(device(uid, "fid-1").fromServer().exists())
        }
    }

    @Test
    fun thisPhoneHasTheAddressFcmReportsAndOnlyWithNotificationsOn() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            var fid = "fid-2"
            var registrations = 0
            var notificationsOn = false
            // As FCM does: a registration is reported to onRegistered, here with the FID.
            lateinit var phone: ThisDevice
            phone = ThisDevice(
                devices,
                fid = { fid },
                registerWithFcm = {
                    registrations++
                    phone.registered(uid, fid)
                },
                notificationsOn = { notificationsOn },
            )

            phone.register(uid)
            assertEquals(0, registrations)
            val off = device(uid, "fid-2").fromServer()
            assertTrue(off.contains("fcmToken"))
            assertNull(off.getString("fcmToken"))

            notificationsOn = true
            phone.register(uid)
            assertEquals(1, registrations)
            assertEquals("fid-2", device(uid, "fid-2").fromServer().getString("fcmToken"))

            // Google Play services too old for the registration by FID: FCM reports a token.
            phone.registered(uid, "token-of-old-play-services")
            assertEquals("token-of-old-play-services", device(uid, "fid-2").fromServer().getString("fcmToken"))

            // FCM has given the app a new FID: the device is written under it.
            fid = "fid-3"
            phone.registered(uid, "fid-3")
            assertEquals("fid-3", device(uid, "fid-3").fromServer().getString("fcmToken"))

            phone.unregister(uid)
            assertFalse(device(uid, "fid-3").fromServer().exists())
        }
    }

    @Test
    fun twoRegistrationsAtOnceWriteOneDevice() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            val phone = ThisDevice(devices, fid = { "fid-5" }, registerWithFcm = {}, notificationsOn = { true })
            // The screen's registration and FCM's own at the start of the app report at the same moment.
            listOf(async { phone.registered(uid, "fid-5") }, async { phone.registered(uid, "fid-5") }).awaitAll()
            assertEquals("fid-5", device(uid, "fid-5").fromServer().getString("fcmToken"))
        }
    }

    @Test
    fun aFailedRegistrationWithFcmWritesNothing() = runBlocking {
        withTimeout(60_000) {
            val uid = backend.signUpNewUser()
            val phone = ThisDevice(devices, fid = { "fid-4" }, registerWithFcm = { throw IOException("no network") }, notificationsOn = { true })
            assertTrue(runCatching { phone.register(uid) }.exceptionOrNull() is IOException)
            assertFalse(device(uid, "fid-4").fromServer().exists())
        }
    }
}
````

- [ ] **Step 3: Тест падает**

Run: `android/gradlew -p android :app:testDebugUnitTest --no-daemon`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugUnitTestKotlin'`; первая ошибка — `e: …/DocumentsTest.kt:203:13 Unresolved reference 'newDeviceDoc'.`

- [ ] **Step 4: Документ устройства, `DevicesRepository` и `ThisDevice`**

Документ читается слушателем до копии с сервера, а не `get()`: тот без сети отвечает кэшем, где документа может не быть, и `set` поверх существующего правила бы отклонили. Если на телефоне ещё ждёт отправки удаление документа (выход без сети), слушатель уже видит его удалённым — новый `set` уйдёт после удаления и создаст документ заново.

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
index 5b88b6b..522697f 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
@@ -2,6 +2,7 @@ package com.pmobile78.todoround.data
 
 import com.google.firebase.Timestamp
 import com.google.firebase.firestore.FieldValue
+import com.pmobile78.todoround.core.contract.Platform
 import com.pmobile78.todoround.core.contract.SCHEMA_VERSION
 import com.pmobile78.todoround.core.contract.validateSettings
 import com.pmobile78.todoround.core.model.ListFilter
@@ -81,3 +82,19 @@ fun listFilterUpdate(filter: ListFilter): Map<String, Any?> = settingsUpdate("li
 // that two devices do not undo each other's changes of other settings.
 private fun settingsUpdate(key: String, value: Any?): Map<String, Any?> =
     mapOf("settings.$key" to value, "updatedAt" to FieldValue.serverTimestamp())
+
+/**
+ * A new users/{uid}/devices/{FID} for this phone (contract, 3.3): notifications on, [address] for
+ * the pushes (its FID once registered with FCM, or null) and the times of the server.
+ */
+fun newDeviceDoc(address: String?): Map<String, Any?> = mapOf(
+    "platform" to Platform.ANDROID.wire,
+    "fcmToken" to address,
+    "notificationsEnabled" to true,
+    "createdAt" to FieldValue.serverTimestamp(),
+    "updatedAt" to FieldValue.serverTimestamp(),
+)
+
+/** The change of a known device: its new [address] and the time of the server; the switch stays as it is (contract, 3.3). */
+fun deviceAddressUpdate(address: String?): Map<String, Any?> =
+    mapOf("fcmToken" to address, "updatedAt" to FieldValue.serverTimestamp())
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
index 192745e..ddc4e11 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
@@ -20,6 +20,7 @@ import kotlinx.coroutines.channels.awaitClose
 import kotlinx.coroutines.flow.Flow
 import kotlinx.coroutines.flow.callbackFlow
 import kotlinx.coroutines.flow.conflate
+import kotlinx.coroutines.flow.first
 import kotlinx.coroutines.flow.map
 import kotlinx.coroutines.flow.onEach
 import kotlinx.coroutines.tasks.await
@@ -89,6 +90,33 @@ class SettingsRepository(private val db: FirebaseFirestore) {
     }
 }
 
+/** The devices of a user, users/{uid}/devices/{deviceId} (contract, 3.3), as the web's devices.js. */
+class DevicesRepository(private val db: FirebaseFirestore) {
+    /**
+     * Writes this phone as the device [deviceId] of [uid] with [address]: a new device with
+     * notifications on, a known one only its new address (stage 3 spec, 2.3 №2). It waits for the
+     * server's copy of the document, so without a connection it waits. True when it wrote.
+     */
+    suspend fun register(uid: String, deviceId: String, address: String?): Boolean {
+        val device = device(uid, deviceId)
+        val known = device.changes().first { !it.metadata.isFromCache }
+        when {
+            !known.exists() -> device.set(newDeviceDoc(address)).await()
+            known.getString("fcmToken") != address -> device.update(deviceAddressUpdate(address)).await()
+            else -> return false
+        }
+        return true
+    }
+
+    /** Removes the device [deviceId] of [uid], as before the sign-out (contract, 3.3); returns once the server has it. */
+    suspend fun unregister(uid: String, deviceId: String) {
+        device(uid, deviceId).delete().await()
+    }
+
+    private fun device(uid: String, deviceId: String) =
+        db.collection("users").document(uid).collection("devices").document(deviceId)
+}
+
 // Only the latest snapshot matters: a slow collector skips the ones in between (conflate).
 
 /** Snapshots of the query, the changes of metadata included; a refusal ends the flow with its error. */
````

`ThisDevice` получает FID, регистрацию в FCM и состояние уведомлений снаружи: приложение даёт Firebase и Android (задача 3), тесты — свои. Адрес приходит не из `register()` (он возвращает `Task<Void>`), а из `onRegistered`: FCM вызывает его после каждой регистрации, даже уже известной. На сервисах Google Play старше 26.12 (`versionCode` 261200000) библиотека регистрирует телефон токеном и сообщает токен — поэтому адрес не приравнивается к FID. `Mutex` нужен, потому что регистрация с экрана и `onRegistered` приходят почти одновременно: обе прочли бы «документа нет», и второй `set` правила отклонили бы.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/data/ThisDevice.kt`:

````kotlin
package com.pmobile78.todoround.data

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * This phone as a device of the signed-in user (stage 3 spec, section 5). The document's id is the
 * FID of the app ([fid]). Its address for the pushes is what FCM reports once [registerWithFcm] has
 * registered the app ([registered]): the FID itself, or a token where Google Play services are too
 * old for FCM's registration by FID. While notifications are off on the phone ([notificationsOn])
 * the address is null. The app passes Firebase and Android here, the device tests their own.
 */
class ThisDevice(
    private val devices: DevicesRepository,
    private val fid: suspend () -> String,
    private val registerWithFcm: suspend () -> Unit,
    private val notificationsOn: () -> Boolean,
) {
    // One write at a time: a registration from the screen and one from FCM would otherwise both
    // create the document, and the rules refuse the second; a sign-out waits for a write under way.
    private val writing = Mutex()

    /**
     * After the sign-in and whenever the app opens (spec 2.3 №1): with notifications on, registers
     * with FCM, which then reports the address to [registered]; with them off, the device of [uid]
     * gets no address. A registration that fails (no network) throws, and nothing is written.
     */
    suspend fun register(uid: String) {
        if (notificationsOn()) registerWithFcm() else write(uid, null)
    }

    /** FCM has registered this phone with [address] (onRegistered): the device of [uid] gets it. */
    suspend fun registered(uid: String, address: String) {
        write(uid, address)
    }

    /** Before the sign-out (spec 2.3 №5): the device of [uid] is removed. */
    suspend fun unregister(uid: String) {
        writing.withLock { devices.unregister(uid, fid()) }
    }

    private suspend fun write(uid: String, address: String?) {
        writing.withLock { devices.register(uid, fid(), address.takeIf { notificationsOn() }) }
    }
}
````

- [ ] **Step 5: Сборка, тесты JVM и Lint**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true --no-daemon` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `app debug tests: 27 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.` Строки `core tests` нет: ядро не менялось, и Gradle берёт итог его тестов из задачи 1.

- [ ] **Step 6: Тесты проходят на устройстве**

Свободен ли эмулятор — эмулятор Android может работать у другой сессии:

```bash
source /media/big_disk/android/android-env.sh && if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"; else echo "no emulator"; fi
```

Expected: `no emulator`. Иначе — ждать и проверять снова: чужой эмулятор не трогать.

Запустить эмулятор в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-3-1.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi):

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; sleep 60; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase (тайм-аут 40 минут):

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (29 tests)` и `Script exited successfully (code 0)`.

Эмулятор выключить и дождаться конца его процесса (если `emu kill` не сработал — сигнал завершения; эмулятор `ToRound_API37` один на машине, и он наш):

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' || pkill -TERM -f '[q]emu-system.*ToRound_API37'
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' && echo "emulator stopped"
```

Expected: `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 7: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/DevicesTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/ThisDevice.kt android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
git commit -F - <<'EOF'
feat(android): this phone as a device of its user in Firestore
EOF
```

---

### Task 3: Пуши сервера на телефоне

**Files:**
- Modify: `android/gradle/libs.versions.toml`, `android/app/build.gradle.kts`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/values/colors.xml`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/res/values-uk/strings.xml`, `android/app/src/main/kotlin/com/pmobile78/todoround/ToDoRoundApp.kt`, `android/device-tests.sh`
- Create: `android/app/src/main/res/drawable/ic_notification.xml`, `android/app/src/main/kotlin/com/pmobile78/todoround/notifications/Reminders.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/notifications/RemindersService.kt`
- Test: Create `android/app/src/test/kotlin/com/pmobile78/todoround/notifications/RemindersTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/NotificationsTest.kt`

**Interfaces:**
- Consumes: `ThisDevice`, `DevicesRepository` (задача 2); `Backend` (1.2).
- Produces:
  - `com.pmobile78.todoround.notifications`: `const val REMINDERS_CHANNEL = "reminders"`; `const val EXTRA_TASK_ID = "taskId"`, `const val EXTRA_TYPE = "type"` — extras нажатия, те же ключи, что `data` пуша; `data class Reminder(taskId, type, title, body)`; `fun reminderOf(data: Map<String, String>): Reminder?` — `type` `reminder` или `overdue`, непустые `taskId`, `title` и `body`, иначе `null`; `fun createRemindersChannel(context)`; `fun notificationsOn(context): Boolean` — уведомления приложения разрешены и его канал не выключен; `fun onPush(context, signedIn: Boolean, data: Map<String, String>, sentAt: Long)` — показ: тег `taskId`, время `sentAt`, нажатие — `MainActivity` с extras и задачей в данных намерения; `class RemindersService : FirebaseMessagingService`.
  - `ToDoRoundApp`: `lateinit var thisDevice: ThisDevice`; `val scope: CoroutineScope` — работа, которая переживает экран или пуш; `fun registered(address: String)` — адрес от FCM устройству вошедшего (ошибка — в журнал); сборка с эмуляторами вместо регистрации в FCM сама сообщает FID.
  - Манифест: `POST_NOTIFICATIONS`; служба с `com.google.firebase.MESSAGING_EVENT`; `firebase_messaging_installation_id_enabled = true`; `firebase_messaging_auto_init_enabled = ${fcmAutoInit}` (`false` только в сборке с эмуляторами); канал, значок и цвет по умолчанию для уведомлений, которые покажет сам FCM; `MainActivity` — `singleTop`.

- [ ] **Step 1: Написать падающие тесты**

Тест JVM — разбор пуша в том виде, в каком его шлёт `functions/lib/messages.js`, и пуши без задачи или текстов. Тесты на устройстве — показ со временем отправки, замена, пуш при выходе и нажатие в шторке системы (UI Automator). Время отправки в тесте — минуту назад: уведомление со временем далеко в прошлом Android отбрасывает (`Ignored enqueue for old … notification` в журнале системы), а пуш живёт не дольше суток. `notify()` только ставит уведомление в очередь: тест ждёт, пока Android его покажет; после каждого теста шторка закрывается, чтобы упавший тест не оставил её поверх следующих.

Файл `android/app/src/test/kotlin/com/pmobile78/todoround/notifications/RemindersTest.kt`:

````kotlin
package com.pmobile78.todoround.notifications

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class RemindersTest {
    // A reminder as functions/lib/messages.js sends it.
    private val reminder = mapOf(
        "type" to "reminder",
        "taskId" to "t1",
        "title" to "Task reminder",
        "body" to "1 hour before: Buy milk",
        "url" to "https://pmobile78.github.io/to-round-react/?taskId=t1",
        "minutesBefore" to "60",
    )

    @Test
    fun `a reminder and an overdue task are shown in the texts of the server`() {
        assertEquals(Reminder("t1", "reminder", "Task reminder", "1 hour before: Buy milk"), reminderOf(reminder))
        val overdue = mapOf(
            "type" to "overdue",
            "taskId" to "t1",
            "title" to "Прострочене завдання!",
            "body" to "Прострочено: Buy milk",
            "url" to "https://pmobile78.github.io/to-round-react/?taskId=t1",
        )
        assertEquals(Reminder("t1", "overdue", "Прострочене завдання!", "Прострочено: Buy milk"), reminderOf(overdue))
    }

    @Test
    fun `a push of another kind or without a task is not shown`() {
        assertNull(reminderOf(reminder + ("type" to "digest")))
        assertNull(reminderOf(reminder - "type"))
        assertNull(reminderOf(reminder - "taskId"))
        assertNull(reminderOf(reminder + ("taskId" to "")))
    }

    @Test
    fun `a push without its texts is not shown`() {
        assertNull(reminderOf(reminder - "title"))
        assertNull(reminderOf(reminder - "body"))
        assertNull(reminderOf(reminder + ("body" to "")))
    }
}
````

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/NotificationsTest.kt`:

````kotlin
package com.pmobile78.todoround

import android.accessibilityservice.AccessibilityService
import android.app.Activity
import android.app.Notification
import android.app.NotificationManager
import android.os.Build
import android.service.notification.StatusBarNotification
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry
import androidx.test.runner.lifecycle.Stage
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import com.pmobile78.todoround.notifications.REMINDERS_CHANNEL
import com.pmobile78.todoround.notifications.onPush
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The pushes of the server on this phone (stage 3 spec, section 6): what is shown, on which
 * channel and with which time, how a later event of a task replaces the earlier one, and where a
 * tap leads. android/device-tests.sh grants the permission to notify (Android 13+) before the tests.
 */
@RunWith(AndroidJUnit4::class)
class NotificationsTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = ApplicationProvider.getApplicationContext<ToDoRoundApp>()
    private val manager = context.getSystemService(NotificationManager::class.java)

    // A push as functions/lib/messages.js sends it.
    private fun push(type: String, taskId: String, title: String, body: String) = mapOf(
        "type" to type,
        "taskId" to taskId,
        "title" to title,
        "body" to body,
        "url" to "https://pmobile78.github.io/to-round-react/?taskId=$taskId",
    )

    // notify() only queues a notification: Android shows it a moment later.
    private fun shown(): List<StatusBarNotification> = manager.activeNotifications.toList()

    private fun Notification.title() = extras.getCharSequence(Notification.EXTRA_TITLE).toString()

    private fun Notification.text() = extras.getCharSequence(Notification.EXTRA_TEXT).toString()

    @Before
    fun clear() {
        manager.cancelAll()
    }

    // A test that failed with the shade open would leave it over the screens of the next tests.
    @After
    fun closeTheShade() {
        manager.cancelAll()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            instrumentation.uiAutomation.performGlobalAction(AccessibilityService.GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE)
        }
    }

    // The server sent the push a minute ago. Android drops a notification whose time is long past
    // ("Ignored enqueue for old … notification"); a push lives for a day at most (TTL).
    private val sentAt = System.currentTimeMillis() - 60_000

    @Test
    fun aReminderIsShownOnTheChannelOfRemindersAndALaterEventOfTheTaskReplacesIt() {
        onPush(context, signedIn = true, push("reminder", "t1", "Task reminder", "1 hour before: Buy milk"), sentAt)
        val reminder = waitFor("the reminder") { shown().singleOrNull() }
        assertEquals("t1", reminder.tag)
        assertEquals(REMINDERS_CHANNEL, reminder.notification.channelId)
        assertEquals("Task reminder", reminder.notification.title())
        assertEquals("1 hour before: Buy milk", reminder.notification.text())
        // The time of the server's message, not of its arrival.
        assertEquals(sentAt, reminder.notification.`when`)

        onPush(context, signedIn = true, push("overdue", "t1", "Overdue task!", "Overdue: Buy milk"), sentAt)
        val overdue = waitFor("the overdue task") { shown().singleOrNull()?.takeIf { it.notification.title() == "Overdue task!" } }
        assertEquals("t1", overdue.tag)
        assertEquals("Overdue: Buy milk", overdue.notification.text())

        onPush(context, signedIn = true, push("reminder", "t2", "Task reminder", "1 day before: Call the bank"), sentAt)
        assertEquals(setOf("t1", "t2"), waitFor("two tasks") { shown().takeIf { it.size == 2 } }.map { it.tag }.toSet())
    }

    @Test
    fun aPushOfAnotherKindOrWithNobodySignedInIsNotShown() {
        onPush(context, signedIn = true, push("digest", "t1", "Digest", "3 tasks today"), sentAt)
        onPush(context, signedIn = false, push("reminder", "t2", "Task reminder", "1 hour before: Buy milk"), sentAt)
        // Android shows notifications in the order they come: by the time this one is there, the
        // two before it would be too.
        onPush(context, signedIn = true, push("reminder", "t3", "Task reminder", "1 day before: Call the bank"), sentAt)
        assertEquals(listOf("t3"), waitFor("the control push") { shown().takeIf { it.isNotEmpty() } }.map { it.tag })
    }

    @Test
    fun aTapOpensTheAppWithTheTaskAndRemovesTheNotification() {
        onPush(context, signedIn = true, push("reminder", "t1", "Task reminder", "1 hour before: Buy milk"), sentAt)
        val device = UiDevice.getInstance(instrumentation)
        device.openNotification()
        waitFor("the notification in the shade") { device.wait(Until.findObject(By.text("1 hour before: Buy milk")), 1_000) }.click()

        val opened = waitFor("the app on the screen") { resumed() }
        try {
            assertEquals("t1", opened.intent.getStringExtra("taskId"))
            assertEquals("reminder", opened.intent.getStringExtra("type"))
            // The notification goes away by itself.
            waitFor("the notification gone") { shown().isEmpty().takeIf { it } }
        } finally {
            instrumentation.runOnMainSync { opened.finish() }
        }
    }

    // The activity of the app on the screen, or null while there is none.
    private fun resumed(): Activity? {
        var activity: Activity? = null
        instrumentation.runOnMainSync {
            activity = ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(Stage.RESUMED).firstOrNull()
        }
        return activity
    }

    // [look] until it gives a value, for 10 s at most; [what] names it when it does not come.
    private fun <T : Any> waitFor(what: String, look: () -> T?): T {
        val until = System.currentTimeMillis() + 10_000
        while (true) {
            look()?.let { return it }
            check(System.currentTimeMillis() < until) {
                "$what did not come in 10 s; shown: " + shown().map { "${it.tag}/${it.id}/${it.notification.group}/${it.notification.flags}" }
            }
            Thread.sleep(200)
        }
    }
}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :app:testDebugUnitTest --no-daemon`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugUnitTestKotlin'`; первая ошибка — `e: …/RemindersTest.kt:20:22 Unresolved reference 'Reminder'.`

- [ ] **Step 3: Библиотеки**

`firebase-messaging` и `firebase-installations` — версии из BoM 35.1.0 (26.0.1 и 20.0.0); UI Automator — только для тестов на устройстве.

Изменения в `android/gradle/libs.versions.toml`:

````diff
diff --git a/android/gradle/libs.versions.toml b/android/gradle/libs.versions.toml
index 4a522f6..73b03ca 100644
--- a/android/gradle/libs.versions.toml
+++ b/android/gradle/libs.versions.toml
@@ -13,6 +13,7 @@ junit = "6.1.3"
 kotlin = "2.4.21"
 kotlinxSerialization = "1.12.0"
 lifecycle = "2.11.0"
+uiautomator = "2.4.0"
 
 [libraries]
 androidx-activity-compose = { module = "androidx.activity:activity-compose", version.ref = "activityCompose" }
@@ -28,9 +29,12 @@ androidx-lifecycle-viewmodel-compose = { module = "androidx.lifecycle:lifecycle-
 androidx-test-espresso-core = { module = "androidx.test.espresso:espresso-core", version.ref = "espresso" }
 androidx-test-ext-junit = { module = "androidx.test.ext:junit", version.ref = "androidxTestExtJunit" }
 androidx-test-runner = { module = "androidx.test:runner", version.ref = "androidxTestRunner" }
+androidx-test-uiautomator = { module = "androidx.test.uiautomator:uiautomator", version.ref = "uiautomator" }
 firebase-auth = { module = "com.google.firebase:firebase-auth" }
 firebase-bom = { module = "com.google.firebase:firebase-bom", version.ref = "firebaseBom" }
 firebase-firestore = { module = "com.google.firebase:firebase-firestore" }
+firebase-installations = { module = "com.google.firebase:firebase-installations" }
+firebase-messaging = { module = "com.google.firebase:firebase-messaging" }
 junit-bom = { module = "org.junit:junit-bom", version.ref = "junit" }
 junit-jupiter = { module = "org.junit.jupiter:junit-jupiter" }
 junit-platform-launcher = { module = "org.junit.platform:junit-platform-launcher" }
````

`fcmAutoInit` — флаг манифеста: сборка для эмуляторов в FCM не регистрируется.

Изменения в `android/app/build.gradle.kts`:

````diff
diff --git a/android/app/build.gradle.kts b/android/app/build.gradle.kts
index 0dcd0da..59eb066 100644
--- a/android/app/build.gradle.kts
+++ b/android/app/build.gradle.kts
@@ -47,6 +47,8 @@ android {
     buildTypes {
         debug {
             buildConfigField("boolean", "EMULATORS", emulators.toString())
+            // A build for the emulators never registers with FCM: the emulators send no pushes.
+            manifestPlaceholders["fcmAutoInit"] = (!emulators).toString()
         }
         release {
             isMinifyEnabled = true
@@ -54,6 +56,7 @@ android {
             proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
             signingConfig = signingConfigs.findByName("release")
             buildConfigField("boolean", "EMULATORS", "false")
+            manifestPlaceholders["fcmAutoInit"] = "true"
         }
     }
 
@@ -92,6 +95,8 @@ dependencies {
     implementation(libs.androidx.lifecycle.viewmodel.compose)
     implementation(libs.firebase.auth)
     implementation(libs.firebase.firestore)
+    implementation(libs.firebase.installations)
+    implementation(libs.firebase.messaging)
     implementation(libs.kotlinx.coroutines.play.services)
     debugImplementation(libs.androidx.compose.ui.tooling)
     // The activity in which the device tests show one screen on its own (createComposeRule).
@@ -105,4 +110,6 @@ dependencies {
     androidTestImplementation(libs.androidx.test.espresso.core)
     androidTestImplementation(libs.androidx.test.ext.junit)
     androidTestImplementation(libs.androidx.test.runner)
+    // The notification shade of the system, where a test taps a notification.
+    androidTestImplementation(libs.androidx.test.uiautomator)
 }
````

- [ ] **Step 4: Манифест, значок, цвет и тексты**

`firebase_messaging_installation_id_enabled` включает регистрацию по FID (firebase-messaging 25.1+): с ним FCM вызывает `onRegistered`, а устаревшие `getToken()` и `onNewToken` не работают. Умолчания `default_notification_*` нужны уведомлению, которое покажет сам FCM, если сервер когда-нибудь начнёт класть в сообщение готовое уведомление («вариант 2», подплан 3.2).

Изменения в `android/app/src/main/AndroidManifest.xml`:

````diff
diff --git a/android/app/src/main/AndroidManifest.xml b/android/app/src/main/AndroidManifest.xml
index 4cfe517..433ba01 100644
--- a/android/app/src/main/AndroidManifest.xml
+++ b/android/app/src/main/AndroidManifest.xml
@@ -1,6 +1,9 @@
 <?xml version="1.0" encoding="utf-8"?>
 <manifest xmlns:android="http://schemas.android.com/apk/res/android">
 
+    <!-- Reminders and overdue tasks (stage 3 spec); Android 13+ asks the user after the sign-in. -->
+    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
+
     <!-- Everything lives in Firestore; a restored copy of the app's files would only be stale. -->
     <application
         android:name=".ToDoRoundApp"
@@ -11,15 +14,46 @@
         android:label="@string/app_name"
         android:supportsRtl="true"
         android:theme="@style/Theme.ToDoRound">
+        <!-- singleTop: a tap on a notification brings the open screen back instead of a new one. -->
         <activity
             android:name=".MainActivity"
-            android:exported="true">
+            android:exported="true"
+            android:launchMode="singleTop">
             <intent-filter>
                 <action android:name="android.intent.action.MAIN" />
                 <category android:name="android.intent.category.LAUNCHER" />
             </intent-filter>
         </activity>
 
+        <!-- The pushes of the server and the registrations of FCM (stage 3 spec, sections 5 and 6). -->
+        <service
+            android:name=".notifications.RemindersService"
+            android:exported="false">
+            <intent-filter>
+                <action android:name="com.google.firebase.MESSAGING_EVENT" />
+            </intent-filter>
+        </service>
+
+        <!-- FCM registers the app by its Firebase installation id, the id of its device (spec 2.2),
+             by itself at the start of the app, except in a build for the emulators (app/build.gradle.kts). -->
+        <meta-data
+            android:name="firebase_messaging_installation_id_enabled"
+            android:value="true" />
+        <meta-data
+            android:name="firebase_messaging_auto_init_enabled"
+            android:value="${fcmAutoInit}" />
+
+        <!-- A notification that FCM would show itself looks like the app's own (spec 2.3, 13). -->
+        <meta-data
+            android:name="com.google.firebase.messaging.default_notification_channel_id"
+            android:value="reminders" />
+        <meta-data
+            android:name="com.google.firebase.messaging.default_notification_icon"
+            android:resource="@drawable/ic_notification" />
+        <meta-data
+            android:name="com.google.firebase.messaging.default_notification_color"
+            android:resource="@color/notification" />
+
         <!-- AppCompat keeps the language chosen in the app on Android before 13 too (spec 8). -->
         <service
             android:name="androidx.appcompat.app.AppLocalesMetadataHolderService"
````

Значок строки состояния — пузыри `ic_launcher_monochrome`, вырезанные из холста 108 и с линиями толще, чтобы читались в 24 dp.

Файл `android/app/src/main/res/drawable/ic_notification.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- The status bar icon of the notifications: the bubbles of ic_launcher_monochrome cut out of its
     108-unit canvas, with lines thick enough for 24 dp. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="68"
    android:viewportHeight="68">
    <group
        android:translateX="-21.85"
        android:translateY="-22.15">
        <path
            android:pathData="M58,52.5a13.7,13.7 0,1 0,27.4 0a13.7,13.7 0,1 0,-27.4 0"
            android:strokeWidth="5.3"
            android:strokeColor="#FFFFFFFF" />
        <path
            android:pathData="M26.3,44.9a18.1,18.1 0,1 0,36.2 0a18.1,18.1 0,1 0,-36.2 0"
            android:strokeWidth="5.3"
            android:strokeColor="#FFFFFFFF" />
        <path
            android:pathData="M41.2,72.8a12.7,12.7 0,1 0,25.4 0a12.7,12.7 0,1 0,-25.4 0"
            android:strokeWidth="5.3"
            android:strokeColor="#FFFFFFFF" />
    </group>
</vector>
````

Изменения в `android/app/src/main/res/values/colors.xml`:

````diff
diff --git a/android/app/src/main/res/values/colors.xml b/android/app/src/main/res/values/colors.xml
index 5eae3fc..1a887d3 100644
--- a/android/app/src/main/res/values/colors.xml
+++ b/android/app/src/main/res/values/colors.xml
@@ -2,4 +2,6 @@
 <resources>
     <color name="window_background">#FFF5F5F5</color>
     <color name="ic_launcher_background">#FFFFFFFF</color>
+    <!-- The blue of the "classic" design, as ToDoRoundTheme has it. -->
+    <color name="notification">#FF3B7DED</color>
 </resources>
````

Изменения в `android/app/src/main/res/values/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values/strings.xml b/android/app/src/main/res/values/strings.xml
index f7df7e1..61eb40e 100644
--- a/android/app/src/main/res/values/strings.xml
+++ b/android/app/src/main/res/values/strings.xml
@@ -67,4 +67,7 @@
     <string name="list_offline">No connection to the server: these are the data saved on this device.</string>
     <string name="list_failed">The data could not be read. Sign out and sign in again.</string>
     <string name="write_failed">The change could not be saved.</string>
+
+    <!-- Notifications (stage 3 spec): the texts of the pushes come from the server. -->
+    <string name="reminders_channel">Reminders</string>
 </resources>
````

Изменения в `android/app/src/main/res/values-uk/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values-uk/strings.xml b/android/app/src/main/res/values-uk/strings.xml
index 76fd415..4f4a2e8 100644
--- a/android/app/src/main/res/values-uk/strings.xml
+++ b/android/app/src/main/res/values-uk/strings.xml
@@ -64,4 +64,6 @@
     <string name="list_offline">Немає зв’язку із сервером: це дані, збережені на цьому пристрої.</string>
     <string name="list_failed">Не вдалося прочитати дані. Вийдіть і увійдіть знову.</string>
     <string name="write_failed">Не вдалося зберегти зміну.</string>
+
+    <string name="reminders_channel">Нагадування</string>
 </resources>
````

- [ ] **Step 5: Канал, показ и служба**

Lint требует `checkSelfPermission` рядом с `notify()`, поэтому разрешение Android 13+ проверяется явно. Задача — ещё и в данных намерения (`todoround://task/<id>`): намерения, которые различаются только extras, делят один `PendingIntent`, и нажатие одной задачи открыло бы другую. `notificationsOn` учитывает и канал: выключенный канал — то же, что выключенные уведомления.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/notifications/Reminders.kt`:

````kotlin
package com.pmobile78.todoround.notifications

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.pmobile78.todoround.MainActivity
import com.pmobile78.todoround.R

/** The one channel of the app's notifications (stage 3 spec, 2.3 №7); the manifest names it for FCM too. */
const val REMINDERS_CHANNEL = "reminders"

/**
 * The extras of the tap that opens the app: the keys of the push's data, the same as FCM gives the
 * app for a notification it shows itself (spec, section 6).
 */
const val EXTRA_TASK_ID = "taskId"
const val EXTRA_TYPE = "type"

/** What a push of the server (contract, 4.4) asks to show: a reminder or an overdue task, in the texts of the server. */
data class Reminder(val taskId: String, val type: String, val title: String, val body: String)

private val TYPES = setOf("reminder", "overdue")

/**
 * The reminder in the data of a push, or null for a push of another kind, without a task or
 * without its texts (spec 2.3 №11): the server always sends both texts.
 */
fun reminderOf(data: Map<String, String>): Reminder? {
    val type = data["type"]?.takeIf { it in TYPES } ?: return null
    val taskId = data["taskId"]?.takeIf { it.isNotEmpty() } ?: return null
    val title = data["title"]?.takeIf { it.isNotEmpty() } ?: return null
    val body = data["body"]?.takeIf { it.isNotEmpty() } ?: return null
    return Reminder(taskId, type, title, body)
}

/** The channel of the reminders, in the language of the phone; it is there before the first push comes. */
fun createRemindersChannel(context: Context) {
    val channel = NotificationChannelCompat.Builder(REMINDERS_CHANNEL, NotificationManagerCompat.IMPORTANCE_HIGH)
        .setName(context.getString(R.string.reminders_channel))
        .build()
    NotificationManagerCompat.from(context).createNotificationChannel(channel)
}

/**
 * Whether this phone shows the app's reminders: notifications of the app are allowed (on Android
 * 13+ the user gives the permission) and its channel is not switched off.
 */
fun notificationsOn(context: Context): Boolean {
    val manager = NotificationManagerCompat.from(context)
    return manager.areNotificationsEnabled() &&
        manager.getNotificationChannelCompat(REMINDERS_CHANNEL)?.importance != NotificationManagerCompat.IMPORTANCE_NONE
}

/**
 * A push on this phone, sent by the server at [sentAt]: a reminder or an overdue task is shown
 * while someone is signed in (spec 2.3 №12). A task has one notification, so a later event of it
 * replaces the earlier one (№8), and a tap opens the app with the task (№10).
 */
fun onPush(context: Context, signedIn: Boolean, data: Map<String, String>, sentAt: Long) {
    if (!signedIn) return
    val reminder = reminderOf(data) ?: return
    // Without the permission (Android 13+) nothing could be shown.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
        return
    }
    // The task in the data of the intent keeps one task's tap apart from another's: intents that
    // differ only in their extras would share one PendingIntent.
    val open = Intent(context, MainActivity::class.java)
        .setData(Uri.Builder().scheme("todoround").authority("task").appendPath(reminder.taskId).build())
        .putExtra(EXTRA_TASK_ID, reminder.taskId)
        .putExtra(EXTRA_TYPE, reminder.type)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val notification = NotificationCompat.Builder(context, REMINDERS_CHANNEL)
        .setSmallIcon(R.drawable.ic_notification)
        .setColor(ContextCompat.getColor(context, R.color.notification))
        .setContentTitle(reminder.title)
        .setContentText(reminder.body)
        .setStyle(NotificationCompat.BigTextStyle().bigText(reminder.body))
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setWhen(sentAt)
        .setShowWhen(true)
        .setAutoCancel(true)
        .setContentIntent(tap)
        .build()
    NotificationManagerCompat.from(context).notify(reminder.taskId, 0, notification)
}
````

Lint по старой памяти требует `onNewToken`; при регистрации по FID FCM его не вызывает — предупреждение снято аннотацией с объяснением. Адрес из `onRegistered` служба отдаёт приложению (`ToDoRoundApp.registered`).

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/notifications/RemindersService.kt`:

````kotlin
package com.pmobile78.todoround.notifications

import android.annotation.SuppressLint
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.pmobile78.todoround.ToDoRoundApp

/**
 * The pushes of the server and the registrations of FCM on this phone (stage 3 spec, sections 5
 * and 6). FCM calls both on a thread of its own, also when the app is not open. The app registers
 * by its installation id, so FCM calls onRegistered and never the deprecated onNewToken that Lint
 * still asks for.
 */
@SuppressLint("MissingFirebaseInstanceTokenRefresh")
class RemindersService : FirebaseMessagingService() {
    private val app: ToDoRoundApp
        get() = application as ToDoRoundApp

    override fun onMessageReceived(message: RemoteMessage) {
        onPush(this, signedIn = app.backend.auth.currentUser != null, message.data, message.sentTime)
    }

    /** FCM has registered this phone, after register() or by itself, with [installationId] as the address. */
    override fun onRegistered(installationId: String) {
        app.registered(installationId)
    }
}
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ToDoRoundApp.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ToDoRoundApp.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ToDoRoundApp.kt
index 3631ed2..6e28714 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ToDoRoundApp.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ToDoRoundApp.kt
@@ -1,15 +1,61 @@
 package com.pmobile78.todoround
 
 import android.app.Application
+import android.util.Log
+import com.google.firebase.installations.FirebaseInstallations
+import com.google.firebase.messaging.FirebaseMessaging
 import com.pmobile78.todoround.data.Backend
+import com.pmobile78.todoround.data.DevicesRepository
+import com.pmobile78.todoround.data.ThisDevice
+import com.pmobile78.todoround.notifications.createRemindersChannel
+import com.pmobile78.todoround.notifications.notificationsOn
+import kotlinx.coroutines.CancellationException
+import kotlinx.coroutines.CoroutineScope
+import kotlinx.coroutines.SupervisorJob
+import kotlinx.coroutines.launch
+import kotlinx.coroutines.tasks.await
 
 class ToDoRoundApp : Application() {
     /** Firebase of this run: the project, or the local emulators when a debug build asks for them. */
     lateinit var backend: Backend
         private set
 
+    /** This phone as a device of the signed-in user (stage 3 spec, section 5). */
+    lateinit var thisDevice: ThisDevice
+        private set
+
+    /** Work that outlives a screen or a push, such as a write of this phone's device. */
+    val scope = CoroutineScope(SupervisorJob())
+
     override fun onCreate() {
         super.onCreate()
         backend = if (BuildConfig.EMULATORS) Backend.emulators(this) else Backend.project()
+        thisDevice = ThisDevice(
+            DevicesRepository(backend.db),
+            fid = { FirebaseInstallations.getInstance().id.await() },
+            // The emulators send no pushes, and the device tests do not wait for the network of
+            // Google: a build for them reports its FID as FCM does after a registration.
+            registerWithFcm = if (BuildConfig.EMULATORS) {
+                { registered(FirebaseInstallations.getInstance().id.await()) }
+            } else {
+                { FirebaseMessaging.getInstance().register().await() }
+            },
+            notificationsOn = { notificationsOn(this) },
+        )
+        createRemindersChannel(this)
+    }
+
+    /** FCM has registered this phone with [address]: the device of the signed-in user gets it; a failure is only logged. */
+    fun registered(address: String) {
+        val uid = backend.auth.currentUser?.uid ?: return
+        scope.launch {
+            try {
+                thisDevice.registered(uid, address)
+            } catch (e: CancellationException) {
+                throw e
+            } catch (e: Exception) {
+                Log.w("ToDoRoundApp", "the device was not written", e)
+            }
+        }
     }
 }
````

- [ ] **Step 6: Разрешение в тестах на устройстве**

На Android 17 после входа приложение спросит разрешение (задача 4), и окно системы закрыло бы экран во всех тестах со входом.

Изменения в `android/device-tests.sh`:

````diff
diff --git a/android/device-tests.sh b/android/device-tests.sh
index 74e7a45..ec0669f 100755
--- a/android/device-tests.sh
+++ b/android/device-tests.sh
@@ -31,6 +31,8 @@ trap clean EXIT
 
 adb -e install -t "$apks/debug/app-debug.apk" > /dev/null
 adb -e install -t "$apks/androidTest/debug/app-debug-androidTest.apk" > /dev/null
+# Android 13+ asks for the permission to notify after a sign-in, and its window would cover the app.
+adb -e shell pm grant com.pmobile78.todoround android.permission.POST_NOTIFICATIONS
 # The app reaches the Firebase emulators of this computer at its own 127.0.0.1 (data/Backend.kt).
 adb -e reverse tcp:9099 tcp:9099 > /dev/null
 adb -e reverse tcp:8180 tcp:8180 > /dev/null
````

- [ ] **Step 7: Сборка, тесты JVM, Lint и флаг FCM**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true --no-daemon` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `app debug tests: 30 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.`

Сборка для эмуляторов в FCM не регистрируется:

```bash
/media/big_disk/android/sdk/build-tools/37.0.0/aapt2 dump xmltree --file AndroidManifest.xml android/app/build/outputs/apk/debug/app-debug.apk | grep -A1 'firebase_messaging_auto_init_enabled' | grep -o 'value(0x01010024)=[a-z]*'
```

Expected: `value(0x01010024)=false`.

- [ ] **Step 8: Тесты проходят на устройстве**

Свободен ли эмулятор — эмулятор Android может работать у другой сессии:

```bash
source /media/big_disk/android/android-env.sh && if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"; else echo "no emulator"; fi
```

Expected: `no emulator`. Иначе — ждать и проверять снова: чужой эмулятор не трогать.

Запустить эмулятор в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-3-1.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; sleep 60; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase (тайм-аут 40 минут):

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (32 tests)` и `Script exited successfully (code 0)`.

Эмулятор выключить и дождаться конца его процесса:

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' || pkill -TERM -f '[q]emu-system.*ToRound_API37'
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' && echo "emulator stopped"
```

Expected: `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 9: Commit**

```bash
git add android/app/build.gradle.kts android/app/src/androidTest/kotlin/com/pmobile78/todoround/NotificationsTest.kt android/app/src/main/AndroidManifest.xml android/app/src/main/kotlin/com/pmobile78/todoround/ToDoRoundApp.kt android/app/src/main/kotlin/com/pmobile78/todoround/notifications/Reminders.kt android/app/src/main/kotlin/com/pmobile78/todoround/notifications/RemindersService.kt android/app/src/main/res/drawable/ic_notification.xml android/app/src/main/res/values-uk/strings.xml android/app/src/main/res/values/colors.xml android/app/src/main/res/values/strings.xml android/app/src/test/kotlin/com/pmobile78/todoround/notifications/RemindersTest.kt android/device-tests.sh android/gradle/libs.versions.toml
git commit -F - <<'EOF'
feat(android): reminders and overdue tasks from the pushes of the server
EOF
```

---

### Task 4: Регистрация после входа и выход без устройства

**Files:**
- Create: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Notifications.kt`
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt`
- Test: Modify `android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt`, `android/device-tests.sh`; Create `android/app/src/androidTest/kotlin/com/pmobile78/todoround/PermissionTest.kt`

**Interfaces:**
- Consumes: `ToDoRoundApp.thisDevice`, `ToDoRoundApp.scope`, `notificationsOn` (задача 3); `ThisDevice.register`, `ThisDevice.unregister` (задача 2).
- Produces:
  - `com.pmobile78.todoround.ui`: `@Composable fun RegisterThisDevice(register: () -> Unit)` — пока кто-то вошёл: `register` при каждом появлении экрана (и после перезапуска приложения), запрос разрешения на Android 13+ (один раз за открытие экрана, переживает поворот), снова `register` после ответа и когда приложение вернулось с другим состоянием уведомлений.
  - `AppViewModel.registerDevice()` — регистрация вошедшего; `AppViewModel.signOut()` — удаление устройства (не дольше 2 с) и уведомлений из шторки в области приложения, затем выход.
  - Тестам: `suspend fun DocumentReference.fromServer(until: (DocumentSnapshot) -> Boolean = { true })`; `android/device-tests.sh` печатает два итога.

- [ ] **Step 1: Написать падающий тест входа**

Вход через экран — и «веб» видит устройство телефона: `platform: "android"`, адрес = FID, уведомления включены; «Выйти» — и документа нет. `fromServer` учится ждать нужного состояния документа.

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
index c727c8e..5b536f1 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
@@ -39,14 +39,15 @@ suspend fun Backend.signUp(email: String): String =
 suspend fun Backend.signUpNewUser(): String = signUp(newEmail())
 
 /**
- * The document as the server has it. A listener waits for the server, where a one-off read gives
- * up after 10 s of a slow start ("the client is offline"); a refusal of the rules is thrown.
+ * The document as the server has it, once it is [until] that. A listener waits for the server,
+ * where a one-off read gives up after 10 s of a slow start ("the client is offline"); a refusal of
+ * the rules is thrown.
  */
-suspend fun DocumentReference.fromServer(): DocumentSnapshot {
+suspend fun DocumentReference.fromServer(until: (DocumentSnapshot) -> Boolean = { true }): DocumentSnapshot {
     val result = CompletableDeferred<DocumentSnapshot>()
     val registration = addSnapshotListener(MetadataChanges.INCLUDE) { snapshot, error ->
         if (error != null) result.completeExceptionally(error)
-        else if (snapshot != null && !snapshot.metadata.isFromCache) result.complete(snapshot)
+        else if (snapshot != null && !snapshot.metadata.isFromCache && until(snapshot)) result.complete(snapshot)
     }
     try {
         return result.await()
````

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt
index dc03f5e..aaa853a 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt
@@ -15,13 +15,17 @@ import androidx.compose.ui.test.performTextInput
 import androidx.core.os.LocaleListCompat
 import androidx.test.ext.junit.runners.AndroidJUnit4
 import androidx.test.platform.app.InstrumentationRegistry
+import com.google.firebase.installations.FirebaseInstallations
 import com.pmobile78.todoround.core.contract.ThemeMode
 import com.pmobile78.todoround.core.model.Settings
 import com.pmobile78.todoround.core.model.defaultSettings
 import com.pmobile78.todoround.data.SettingsRepository
 import kotlinx.coroutines.runBlocking
+import kotlinx.coroutines.tasks.await
+import kotlinx.coroutines.withTimeout
 import org.junit.After
 import org.junit.Assert.assertEquals
+import org.junit.Assert.assertFalse
 import org.junit.Assert.assertNotEquals
 import org.junit.Before
 import org.junit.Rule
@@ -162,6 +166,30 @@ class AuthFlowTest {
         compose.waitUntil(60_000) { AppCompatDelegate.getApplicationLocales().isEmpty }
     }
 
+    @Test
+    fun thisPhoneIsADeviceOfTheAccountUntilItSignsOut() = runBlocking {
+        val email = newEmail()
+        webAccount(email, defaultSettings("en"))
+        signInOnScreen(email, "secret-1")
+        waitFor("home")
+        val uid = backend.auth.currentUser!!.uid
+        val fid = FirebaseInstallations.getInstance().id.await()
+
+        // The web's client sees the device the app wrote after the sign-in (stage 3 spec, section 5).
+        val web = webBackend()
+        web.auth.signInWithEmailAndPassword(email, "secret-1").await()
+        val device = web.db.document("users/$uid/devices/$fid")
+        val written = withTimeout(60_000) { device.fromServer { it.exists() } }
+        assertEquals("android", written.getString("platform"))
+        assertEquals(fid, written.getString("fcmToken"))
+        assertEquals(true, written.getBoolean("notificationsEnabled"))
+
+        // The sign-out removes it; a slow server may still be deleting it when the session ends.
+        signOutOnScreen()
+        assertFalse(withTimeout(60_000) { device.fromServer { !it.exists() } }.exists())
+        web.auth.signOut()
+    }
+
     @Test
     fun theTabShownKeepsWhatIsTyped() {
         waitFor("auth")
````

- [ ] **Step 2: Тест падает на устройстве**

Run: `android/gradlew -p android :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true --no-daemon`
Expected: `BUILD SUCCESSFUL`.

Свободен ли эмулятор:

```bash
source /media/big_disk/android/android-env.sh && if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"; else echo "no emulator"; fi
```

Expected: `no emulator`. Иначе — ждать и проверять снова.

Запустить эмулятор в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-3-1.log 2>&1
```

Дождаться загрузки:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; sleep 60; echo booted
```

Expected: `booted`.

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `Tests run: 33,  Failures: 1`, ошибка `1) thisPhoneIsADeviceOfTheAccountUntilItSignsOut(com.pmobile78.todoround.AuthFlowTest)` с `kotlinx.coroutines.TimeoutCancellationException: Timed out waiting for 60000 ms`: без регистрации документ устройства не появляется. `Script exited unsuccessfully (code 1)`.

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' || pkill -TERM -f '[q]emu-system.*ToRound_API37'
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' && echo "emulator stopped"
```

Expected: `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 3: Написать падающий тест запроса разрешения**

`PermissionTest` проверяет `RegisterThisDevice` на пустом экране: приложение регистрирует телефон и просит разрешение; «Не разрешать» ничего не меняет, возврат в приложение без перемен — тоже; разрешение выдано позже (как в настройках Android), приложение вернулось — телефон регистрируется снова. Ответ на запрос даёт реестр результатов теста, а уход из приложения и возврат — `ActivityScenario`. Окно разрешения самого Android тест не трогает: во втором прогоне плана тест с этим окном падал по-разному — окно ставит приложение на паузу, и Compose не видит его экрана (`No compose hierarchies found`); окно изредка не принимает нажатие; «Домой» и сразу `am start` не всегда останавливают приложение. Тест должен застать приложение без разрешения, а остальным тестам окно разрешения закрыло бы приложение после входа: поэтому `device-tests.sh` гоняет этот тест отдельно и первым, а потом выдаёт разрешение.

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/PermissionTest.kt`:

````kotlin
package com.pmobile78.todoround

import android.Manifest
import android.os.Build
import androidx.activity.ComponentActivity
import androidx.activity.compose.LocalActivityResultRegistryOwner
import androidx.activity.result.ActivityResultRegistry
import androidx.activity.result.ActivityResultRegistryOwner
import androidx.activity.result.contract.ActivityResultContract
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.core.app.ActivityOptionsCompat
import androidx.lifecycle.Lifecycle
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.pmobile78.todoround.ui.RegisterThisDevice
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.atomic.AtomicInteger

/**
 * The permission to notify on Android 13+ (stage 3 spec, 2.3 №6): the app asks for it, and
 * registers this phone again once notifications come on in the settings of Android. The answer
 * comes from a registry of the test, not from the dialog of Android: the dialog pauses the app,
 * which Compose then cannot see, and now and then it misses a tap. android/device-tests.sh runs
 * this class on its own, before it gives the app the permission for the other tests.
 */
@RunWith(AndroidJUnit4::class)
class PermissionTest {
    @get:Rule
    val compose = createAndroidComposeRule<ComponentActivity>()

    private val instrumentation = InstrumentationRegistry.getInstrumentation()

    // The app leaves the screen and comes back to it, as from the settings of Android.
    private fun backInTheApp() {
        compose.activityRule.scenario.moveToState(Lifecycle.State.CREATED)
        compose.activityRule.scenario.moveToState(Lifecycle.State.RESUMED)
    }

    @Test
    fun theAppAsksAndRegistersAgainWhenNotificationsComeOn() {
        assumeTrue(Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
        val asked = mutableListOf<Any?>()
        val registrations = AtomicInteger()
        // Every request gets "Don't allow".
        val answers = object : ActivityResultRegistry() {
            override fun <I, O> onLaunch(requestCode: Int, contract: ActivityResultContract<I, O>, input: I, options: ActivityOptionsCompat?) {
                asked += input
                dispatchResult(requestCode, false)
            }
        }
        compose.setContent {
            CompositionLocalProvider(
                LocalActivityResultRegistryOwner provides object : ActivityResultRegistryOwner {
                    override val activityResultRegistry = answers
                },
            ) {
                RegisterThisDevice { registrations.incrementAndGet() }
            }
        }
        compose.waitForIdle()

        // Registered with notifications off and asked once; "Don't allow" changes nothing.
        assertEquals(listOf(Manifest.permission.POST_NOTIFICATIONS), asked)
        assertEquals(1, registrations.get())
        // Back in the app with nothing changed: no new registration.
        backInTheApp()
        assertEquals(1, registrations.get())

        // Allowed later in the settings of Android: back in the app, it registers again.
        instrumentation.uiAutomation.grantRuntimePermission(instrumentation.targetContext.packageName, Manifest.permission.POST_NOTIFICATIONS)
        backInTheApp()
        assertEquals(2, registrations.get())
        assertEquals(1, asked.size)
    }
}
````

Изменения в `android/device-tests.sh`:

````diff
diff --git a/android/device-tests.sh b/android/device-tests.sh
index ec0669f..a53b015 100755
--- a/android/device-tests.sh
+++ b/android/device-tests.sh
@@ -31,16 +31,19 @@ trap clean EXIT
 
 adb -e install -t "$apks/debug/app-debug.apk" > /dev/null
 adb -e install -t "$apks/androidTest/debug/app-debug-androidTest.apk" > /dev/null
-# Android 13+ asks for the permission to notify after a sign-in, and its window would cover the app.
-adb -e shell pm grant com.pmobile78.todoround android.permission.POST_NOTIFICATIONS
 # The app reaches the Firebase emulators of this computer at its own 127.0.0.1 (data/Backend.kt).
 adb -e reverse tcp:9099 tcp:9099 > /dev/null
 adb -e reverse tcp:8180 tcp:8180 > /dev/null
+# Android 13+ asks for the permission to notify after a sign-in. The test of that runs first, on its
+# own; then the app gets the permission, else its window would cover the app in the other tests.
 # A crash of the instrumentation itself still prints what it said and brings the screenshots back.
+runner=com.pmobile78.todoround.test/androidx.test.runner.AndroidJUnitRunner
 status=0
-result=$(adb -e shell am instrument -w com.pmobile78.todoround.test/androidx.test.runner.AndroidJUnitRunner) || status=$?
+asked=$(adb -e shell am instrument -w -e class com.pmobile78.todoround.PermissionTest $runner) || status=$?
+adb -e shell pm grant com.pmobile78.todoround android.permission.POST_NOTIFICATIONS
+result=$(adb -e shell am instrument -w -e notClass com.pmobile78.todoround.PermissionTest $runner) || status=$?
 rm -rf android/app/build/device-screens
 adb -e pull "$screens" android/app/build/device-screens > /dev/null 2>&1 || true
-printf '%s\n' "$result"
+printf '%s\n' "$asked" "$result"
 [ "$status" = 0 ] || exit "$status"
-grep -q '^OK (' <<< "$result"
+grep -q '^OK (' <<< "$asked" && grep -q '^OK (' <<< "$result"
````

- [ ] **Step 4: Тест падает**

Run: `android/gradlew -p android :app:compileDebugAndroidTestKotlin -Ptodoround.emulators=true --no-daemon`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugAndroidTestKotlin'`; первая ошибка — `e: …/PermissionTest.kt:16:35 Unresolved reference 'RegisterThisDevice'.`: экрана регистрации ещё нет.

- [ ] **Step 5: Регистрация после входа и выход**

`RegisterThisDevice` живёт, пока кто-то вошёл. Регистрация — при каждом появлении экрана: «с чем регистрировались» не сохраняется, и после того как MIUI выгрузила приложение, оно регистрируется снова. «Уже спросили» переживает поворот экрана: иначе окно разрешения появилось бы дважды. `LifecycleStartEffect` замечает возврат из настроек Android с другим состоянием уведомлений.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Notifications.kt`:

````kotlin
package com.pmobile78.todoround.ui

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LifecycleStartEffect
import com.pmobile78.todoround.notifications.notificationsOn

/**
 * While someone is signed in (stage 3 spec, 2.3 №1 and №6): [register]s this phone as a device of
 * the account whenever the screen comes up, asks for the permission to notify on Android 13+ if it
 * is not granted, and registers again after the answer and whenever the app comes back with
 * notifications switched on or off in the settings of Android.
 */
@Composable
fun RegisterThisDevice(register: () -> Unit) {
    val context = LocalContext.current
    // Whether notifications were on at the last registration; null before the first one. Not kept
    // over a restart of the app (MIUI often unloads it), so every opening registers again.
    var registeredWith by remember { mutableStateOf<Boolean?>(null) }
    // Kept over a turn of the screen, so that the dialog is not asked for twice.
    var asked by rememberSaveable { mutableStateOf(false) }
    fun registerNow() {
        registeredWith = notificationsOn(context)
        register()
    }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        if (registeredWith != notificationsOn(context)) registerNow()
    }
    LaunchedEffect(Unit) {
        registerNow()
        if (needsPermission(context) && !asked) {
            asked = true
            ask.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
    LifecycleStartEffect(Unit) {
        val last = registeredWith
        if (last != null && last != notificationsOn(context)) registerNow()
        onStopOrDispose {}
    }
}

private fun needsPermission(context: Context): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
````

Выход идёт в области приложения: экран, закрытый посреди выхода, его не прервёт. Уведомления прежнего аккаунта уходят из шторки вместе с ним. Ошибки записи устройства только пишутся в журнал (спецификация, 2.3 № 4, № 5).

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
index 52af008..b1b684d 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
@@ -2,6 +2,7 @@ package com.pmobile78.todoround.ui
 
 import android.app.Application
 import android.util.Log
+import androidx.core.app.NotificationManagerCompat
 import androidx.lifecycle.AndroidViewModel
 import androidx.lifecycle.viewModelScope
 import com.google.firebase.auth.FirebaseUser
@@ -16,6 +17,7 @@ import com.pmobile78.todoround.data.CategoriesRepository
 import com.pmobile78.todoround.data.Loaded
 import com.pmobile78.todoround.data.SettingsRepository
 import com.pmobile78.todoround.data.TasksRepository
+import kotlinx.coroutines.CancellationException
 import kotlinx.coroutines.ExperimentalCoroutinesApi
 import kotlinx.coroutines.flow.Flow
 import kotlinx.coroutines.flow.SharingStarted
@@ -28,6 +30,8 @@ import kotlinx.coroutines.flow.map
 import kotlinx.coroutines.flow.onEach
 import kotlinx.coroutines.flow.onStart
 import kotlinx.coroutines.flow.stateIn
+import kotlinx.coroutines.launch
+import kotlinx.coroutines.withTimeoutOrNull
 
 /** The data of the signed-in user that the screens show. */
 data class UserData(val settings: Settings, val tasks: Loaded<Task>, val categories: Loaded<Category>)
@@ -61,7 +65,8 @@ fun signedInSession(email: String, data: Flow<UserData?>): Flow<Session.SignedIn
 
 /** The session of the app: who is signed in and their data, live (spec 6). */
 class AppViewModel(application: Application) : AndroidViewModel(application) {
-    private val backend = (application as ToDoRoundApp).backend
+    private val app = application as ToDoRoundApp
+    private val backend = app.backend
     val accounts = AccountRepository(backend.auth)
     private val tasks = TasksRepository(backend.db)
     private val categories = CategoriesRepository(backend.db)
@@ -82,9 +87,35 @@ class AppViewModel(application: Application) : AndroidViewModel(application) {
         .flatMapLatest { user -> if (user == null) flowOf(Session.SignedOut) else signedIn(user) }
         .stateIn(viewModelScope, SharingStarted.Lazily, Session.Starting)
 
-    /** Signs out; [session] then takes the language of the phone again. */
+    /**
+     * Removes this phone from the devices of the account, waiting for it 2 s at most (stage 3
+     * spec, 2.3 №5), and the account's reminders from the shade, then signs out; [session] then
+     * takes the language of the phone again. It runs in the scope of the app, so leaving the screen
+     * does not stop it halfway.
+     */
     fun signOut() {
-        accounts.signOut()
+        val uid = backend.auth.currentUser?.uid
+        app.scope.launch {
+            if (uid != null) withTimeoutOrNull(2_000) { quietly("the device was not removed") { app.thisDevice.unregister(uid) } }
+            NotificationManagerCompat.from(app).cancelAll()
+            accounts.signOut()
+        }
+    }
+
+    /** Writes this phone as a device of the signed-in user (stage 3 spec, 2.3 №1); a failure waits for the next time. */
+    fun registerDevice() {
+        val uid = backend.auth.currentUser?.uid ?: return
+        viewModelScope.launch { quietly("the device was not written") { app.thisDevice.register(uid) } }
+    }
+
+    private suspend fun quietly(failure: String, write: suspend () -> Unit) {
+        try {
+            write()
+        } catch (e: CancellationException) {
+            throw e
+        } catch (e: Exception) {
+            Log.w("AppViewModel", failure, e)
+        }
     }
 
     private val writes = Writes(viewModelScope)
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
index 7eae4e4..f25c479 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
@@ -12,6 +12,7 @@ import androidx.lifecycle.viewmodel.compose.viewModel
 import com.pmobile78.todoround.ui.AppViewModel
 import com.pmobile78.todoround.ui.AuthScreen
 import com.pmobile78.todoround.ui.HomeScreen
+import com.pmobile78.todoround.ui.RegisterThisDevice
 import com.pmobile78.todoround.ui.Session
 import com.pmobile78.todoround.ui.appearanceOf
 import com.pmobile78.todoround.ui.apply
@@ -42,6 +43,8 @@ fun AppContent(viewModel: AppViewModel = viewModel()) {
     LaunchedEffect(appearance) {
         appearance?.apply()
     }
+    // After the sign-in: the permission to notify, then this phone as a device (stage 3 spec, 2.3 №1).
+    if (session is Session.SignedIn) RegisterThisDevice(viewModel::registerDevice)
     when (val current = session) {
         Session.Starting -> Unit
         Session.SignedOut -> AuthScreen(viewModel.accounts)
````

- [ ] **Step 6: Сборка и Lint**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true --no-daemon` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `app debug tests: 30 passed, 0 failed, 0 skipped` (тесты JVM те же, но код приложения изменился, и Gradle прогоняет их снова), `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.`

- [ ] **Step 7: Тесты проходят на устройстве**

Свободен ли эмулятор:

```bash
source /media/big_disk/android/android-env.sh && if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"; else echo "no emulator"; fi
```

Expected: `no emulator`. Иначе — ждать и проверять снова.

Запустить эмулятор в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-3-1.log 2>&1
```

Дождаться загрузки:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; sleep 60; echo booted
```

Expected: `booted`.

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (1 test)` (тест разрешения), `OK (33 tests)` и `Script exited successfully (code 0)`.

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' || pkill -TERM -f '[q]emu-system.*ToRound_API37'
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' && echo "emulator stopped"
```

Expected: `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 8: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/PermissionTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/Notifications.kt android/device-tests.sh
git commit -F - <<'EOF'
feat(android): the phone registers after the sign-in and leaves the account before the sign-out
EOF
```

---

### Task 5: Пункт меню «Нагадування на цьому пристрої»

**Files:**
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Notifications.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/res/values-uk/strings.xml`
- Test: Modify `android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt`

**Interfaces:**
- Consumes: `screenshot(name)` (1.3), `HomeScreen` (2.1).
- Produces (`com.pmobile78.todoround.ui`): `@Composable fun RemindersWindow(onClose: () -> Unit, xiaomi: Boolean = isXiaomi(), allowed: (Context) -> Boolean = ::notificationsOn)` (`notificationsOn` — из задачи 3); в меню `HomeScreen` — пункт с тегом `reminders` перед «Выйти». Теги окна: `reminders_on`, `reminders_off`, `notification_settings`, `reminders_xiaomi`, `reminders_battery`, `app_settings`, `reminders_close`.

- [ ] **Step 1: Написать падающие тесты**

Пункт меню открывает окно: уведомления включены (`device-tests.sh` выдал разрешение), эмулятор не Xiaomi — совет про батарею. Окно на Xiaomi с выключенными уведомлениями — предупреждение, кнопка «Open notification settings» и шаги MIUI. Снимки обоих окон смотрятся глазами.

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt
index fdeab46..7fa8514 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt
@@ -1,14 +1,17 @@
 package com.pmobile78.todoround
 
+import androidx.compose.ui.test.assertTextContains
 import androidx.compose.ui.test.assertTextEquals
 import androidx.compose.ui.test.junit4.v2.createComposeRule
 import androidx.compose.ui.test.onAllNodesWithText
 import androidx.compose.ui.test.onNodeWithTag
 import androidx.compose.ui.test.onNodeWithText
+import androidx.compose.ui.test.performClick
 import androidx.test.ext.junit.runners.AndroidJUnit4
 import com.pmobile78.todoround.core.model.defaultSettings
 import com.pmobile78.todoround.data.Loaded
 import com.pmobile78.todoround.ui.HomeScreen
+import com.pmobile78.todoround.ui.RemindersWindow
 import com.pmobile78.todoround.ui.Session
 import com.pmobile78.todoround.ui.UserData
 import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
@@ -45,4 +48,36 @@ class HomeScreenTest {
         compose.waitUntil(10_000) { compose.onAllNodesWithText("The change could not be saved.").fetchSemanticsNodes().isNotEmpty() }
         compose.onNodeWithText("The change could not be saved.").assertExists()
     }
+
+    @Test
+    fun theMenuOpensTheRemindersOfThisPhone() {
+        compose.setContent {
+            ToDoRoundTheme {
+                HomeScreen(Session.SignedIn("olena@example.com", data), onSignOut = {})
+            }
+        }
+        compose.onNodeWithTag("menu").performClick()
+        compose.onNodeWithTag("reminders").performClick()
+        // android/device-tests.sh grants the permission to notify, and the emulator is no phone of Xiaomi.
+        compose.onNodeWithTag("reminders_on").assertTextEquals("Notifications are on: reminders and overdue tasks come to this phone.")
+        compose.onNodeWithTag("reminders_battery").assertExists()
+        screenshot("reminders-en")
+        compose.onNodeWithTag("reminders_close").performClick()
+        compose.onNodeWithTag("reminders_on").assertDoesNotExist()
+    }
+
+    @Test
+    fun theWindowSaysWhatMiuiNeedsAndThatNotificationsAreOff() {
+        compose.setContent {
+            ToDoRoundTheme {
+                RemindersWindow(onClose = {}, xiaomi = true, allowed = { false })
+            }
+        }
+        compose.onNodeWithTag("reminders_off")
+            .assertTextEquals("Notifications are not allowed for this app, so reminders cannot reach this phone.")
+        compose.onNodeWithTag("notification_settings").assertExists()
+        compose.onNodeWithTag("reminders_xiaomi").assertTextContains("1. Autostart: on.", substring = true)
+        compose.onNodeWithTag("reminders_battery").assertDoesNotExist()
+        screenshot("reminders-xiaomi-off-en")
+    }
 }
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :app:compileDebugAndroidTestKotlin -Ptodoround.emulators=true --no-daemon`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugAndroidTestKotlin'`; первая ошибка — `e: …/HomeScreenTest.kt:14:35 Unresolved reference 'RemindersWindow'.`

- [ ] **Step 3: Тексты**

Пункт меню назван, как пункт главного меню веба (`deviceReminders`), а «не дозволені» — по образцу веба `deviceRemindersNoPermission`. Кнопка при выключенных уведомлениях открывает их настройки в Android, поэтому и названа «Open notification settings» / «Відкрити налаштування сповіщень». Названия пунктов MIUI («Автозапуск», «Контроль активності» — «Без обмежень») сверяются на Redmi 9 в задаче 6.

Изменения в `android/app/src/main/res/values/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values/strings.xml b/android/app/src/main/res/values/strings.xml
index 61eb40e..c7c5984 100644
--- a/android/app/src/main/res/values/strings.xml
+++ b/android/app/src/main/res/values/strings.xml
@@ -68,6 +68,15 @@
     <string name="list_failed">The data could not be read. Sign out and sign in again.</string>
     <string name="write_failed">The change could not be saved.</string>
 
-    <!-- Notifications (stage 3 spec): the texts of the pushes come from the server. -->
+    <!-- Notifications (stage 3 spec): the texts of the pushes come from the server; the menu item
+         is the one of the web's main menu (deviceReminders). -->
     <string name="reminders_channel">Reminders</string>
+    <string name="reminders_title">Reminders on this device</string>
+    <string name="reminders_on">Notifications are on: reminders and overdue tasks come to this phone.</string>
+    <string name="reminders_off">Notifications are not allowed for this app, so reminders cannot reach this phone.</string>
+    <string name="reminders_notification_settings">Open notification settings</string>
+    <string name="reminders_xiaomi">So that reminders come while the app is closed, MIUI needs three settings:\n1. Autostart: on.\n2. Battery saver: No restrictions.\n3. In the recent apps, lock the card of the app.\nThe first two are in the settings of the app.</string>
+    <string name="reminders_battery">If reminders come late, remove the battery restrictions of the app in its settings.</string>
+    <string name="reminders_app_settings">App settings</string>
+    <string name="close">Close</string>
 </resources>
````

Изменения в `android/app/src/main/res/values-uk/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values-uk/strings.xml b/android/app/src/main/res/values-uk/strings.xml
index 4f4a2e8..5094469 100644
--- a/android/app/src/main/res/values-uk/strings.xml
+++ b/android/app/src/main/res/values-uk/strings.xml
@@ -66,4 +66,12 @@
     <string name="write_failed">Не вдалося зберегти зміну.</string>
 
     <string name="reminders_channel">Нагадування</string>
+    <string name="reminders_title">Нагадування на цьому пристрої</string>
+    <string name="reminders_on">Сповіщення увімкнено: нагадування й прострочені завдання приходять на цей телефон.</string>
+    <string name="reminders_off">Сповіщення для цього застосунку не дозволені, тож нагадування сюди не прийдуть.</string>
+    <string name="reminders_notification_settings">Відкрити налаштування сповіщень</string>
+    <string name="reminders_xiaomi">Щоб нагадування приходили, коли застосунок закрито, у MIUI потрібні три налаштування:\n1. «Автозапуск» — увімкнути.\n2. «Контроль активності» — «Без обмежень».\n3. У недавніх застосунках закріпити картку застосунку.\nПерші два — у налаштуваннях застосунку.</string>
+    <string name="reminders_battery">Якщо нагадування запізнюються, зніміть для застосунку обмеження батареї в його налаштуваннях.</string>
+    <string name="reminders_app_settings">Налаштування застосунку</string>
+    <string name="close">Закрити</string>
 </resources>
````

- [ ] **Step 4: Окно и пункт меню**

Кнопка «Налаштування застосунку» открывает «О приложении» Android: на MIUI там и «Автозапуск», и батарея приложения, а скрытые экраны MIUI меняются от версии к версии (спецификация, 2.3 № 14). Окно перечитывает состояние уведомлений, когда приложение возвращается из настроек.

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Notifications.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/Notifications.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/Notifications.kt
index 121679e..e806826 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/Notifications.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/Notifications.kt
@@ -2,10 +2,21 @@ package com.pmobile78.todoround.ui
 
 import android.Manifest
 import android.content.Context
+import android.content.Intent
 import android.content.pm.PackageManager
+import android.net.Uri
 import android.os.Build
+import android.provider.Settings
 import androidx.activity.compose.rememberLauncherForActivityResult
 import androidx.activity.result.contract.ActivityResultContracts
+import androidx.compose.foundation.layout.Arrangement
+import androidx.compose.foundation.layout.Column
+import androidx.compose.foundation.rememberScrollState
+import androidx.compose.foundation.verticalScroll
+import androidx.compose.material3.AlertDialog
+import androidx.compose.material3.MaterialTheme
+import androidx.compose.material3.Text
+import androidx.compose.material3.TextButton
 import androidx.compose.runtime.Composable
 import androidx.compose.runtime.LaunchedEffect
 import androidx.compose.runtime.getValue
@@ -13,9 +24,14 @@ import androidx.compose.runtime.mutableStateOf
 import androidx.compose.runtime.remember
 import androidx.compose.runtime.saveable.rememberSaveable
 import androidx.compose.runtime.setValue
+import androidx.compose.ui.Modifier
 import androidx.compose.ui.platform.LocalContext
+import androidx.compose.ui.platform.testTag
+import androidx.compose.ui.res.stringResource
+import androidx.compose.ui.unit.dp
 import androidx.core.content.ContextCompat
 import androidx.lifecycle.compose.LifecycleStartEffect
+import com.pmobile78.todoround.R
 import com.pmobile78.todoround.notifications.notificationsOn
 
 /**
@@ -53,6 +69,69 @@ fun RegisterThisDevice(register: () -> Unit) {
     }
 }
 
+/**
+ * The window of the menu item "Reminders on this device" (stage 3 spec, section 7): whether this
+ * phone may show the reminders, and what a phone of Xiaomi needs so that they reach the app while
+ * it is closed. [xiaomi] and [allowed] are the phone's own unless a test gives them.
+ */
+@Composable
+fun RemindersWindow(
+    onClose: () -> Unit,
+    xiaomi: Boolean = isXiaomi(),
+    allowed: (Context) -> Boolean = ::notificationsOn,
+) {
+    val context = LocalContext.current
+    // Read again when the app comes back from the settings of Android.
+    var on by remember { mutableStateOf(allowed(context)) }
+    LifecycleStartEffect(Unit) {
+        on = allowed(context)
+        onStopOrDispose {}
+    }
+    AlertDialog(
+        onDismissRequest = onClose,
+        title = { Text(stringResource(R.string.reminders_title)) },
+        text = {
+            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
+                if (on) {
+                    Text(stringResource(R.string.reminders_on), modifier = Modifier.testTag("reminders_on"))
+                } else {
+                    Text(
+                        stringResource(R.string.reminders_off),
+                        color = MaterialTheme.colorScheme.error,
+                        modifier = Modifier.testTag("reminders_off"),
+                    )
+                    TextButton(onClick = { context.startActivity(notificationSettings(context)) }, modifier = Modifier.testTag("notification_settings")) {
+                        Text(stringResource(R.string.reminders_notification_settings))
+                    }
+                }
+                val advice = if (xiaomi) R.string.reminders_xiaomi else R.string.reminders_battery
+                Text(stringResource(advice), modifier = Modifier.testTag(if (xiaomi) "reminders_xiaomi" else "reminders_battery"))
+            }
+        },
+        confirmButton = {
+            TextButton(onClick = { context.startActivity(appSettings(context)) }, modifier = Modifier.testTag("app_settings")) {
+                Text(stringResource(R.string.reminders_app_settings))
+            }
+        },
+        dismissButton = {
+            TextButton(onClick = onClose, modifier = Modifier.testTag("reminders_close")) {
+                Text(stringResource(R.string.close))
+            }
+        },
+    )
+}
+
+// MIUI and HyperOS run on the phones of Xiaomi, Redmi and POCO, which all name Xiaomi as their maker.
+private fun isXiaomi(): Boolean = Build.MANUFACTURER.equals("Xiaomi", ignoreCase = true)
+
+// "App info" of Android; on MIUI it holds "Autostart" and the battery saver of the app.
+private fun appSettings(context: Context): Intent =
+    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
+
+// The notification settings of the app, where its channel is too.
+private fun notificationSettings(context: Context): Intent =
+    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
+
 private fun needsPermission(context: Context): Boolean =
     Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
         ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
index 0cab23e..b29fe33 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
@@ -111,10 +111,11 @@ import kotlinx.coroutines.flow.emptyFlow
 import java.time.Instant
 
 /**
- * The screen of a signed-in user: the top bar with the menu "Logout" and the task list of the web
- * with its tabs, search, sort and category filter (stage 2 spec, section 6). It follows the data
- * live. The sort and the filter are settings of the account, shared with the web: [onSort] and
- * [onFilter] write them, and a write the server refused comes out of [writeFailures].
+ * The screen of a signed-in user: the top bar with the menu ("Reminders on this device", "Logout")
+ * and the task list of the web with its tabs, search, sort and category filter (stage 2 spec,
+ * section 6). It follows the data live. The sort and the filter are settings of the account,
+ * shared with the web: [onSort] and [onFilter] write them, and a write the server refused comes
+ * out of [writeFailures].
  */
 @OptIn(ExperimentalMaterial3Api::class)
 @Composable
@@ -127,6 +128,7 @@ fun HomeScreen(
 ) {
     var menu by remember { mutableStateOf(false) }
     var confirmSignOut by rememberSaveable { mutableStateOf(false) }
+    var reminders by rememberSaveable { mutableStateOf(false) }
     val snackbars = remember { SnackbarHostState() }
     val notSaved = stringResource(R.string.write_failed)
     LaunchedEffect(writeFailures) {
@@ -142,6 +144,14 @@ fun HomeScreen(
                         Icon(painterResource(R.drawable.ic_more_vert), contentDescription = stringResource(R.string.menu))
                     }
                     DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
+                        DropdownMenuItem(
+                            text = { Text(stringResource(R.string.reminders_title)) },
+                            onClick = {
+                                menu = false
+                                reminders = true
+                            },
+                            modifier = Modifier.testTag("reminders"),
+                        )
                         DropdownMenuItem(
                             text = { Text(stringResource(R.string.auth_logout)) },
                             onClick = {
@@ -194,6 +204,7 @@ fun HomeScreen(
             },
         )
     }
+    if (reminders) RemindersWindow(onClose = { reminders = false })
 }
 
 /**
````

- [ ] **Step 5: Сборка и Lint**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true --no-daemon` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `app debug tests: 30 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.`

- [ ] **Step 6: Тесты проходят на устройстве**

Свободен ли эмулятор:

```bash
source /media/big_disk/android/android-env.sh && if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"; else echo "no emulator"; fi
```

Expected: `no emulator`. Иначе — ждать и проверять снова.

Запустить эмулятор в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-3-1.log 2>&1
```

Дождаться загрузки:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; sleep 60; echo booted
```

Expected: `booted`.

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
ls android/app/build/device-screens
```

Expected: `OK (1 test)` (тест разрешения), `OK (35 tests)` и `Script exited successfully (code 0)`; снимки `list-en-light.png`, `list-uk-dark.png`, `reminders-en.png`, `reminders-xiaomi-off-en.png`. Открыть два последних: `reminders-en` — окно «Reminders on this device» над списком: «Notifications are on…», совет про батарею, кнопки «Close» и «App settings»; `reminders-xiaomi-off-en` — красное «Notifications are not allowed…», кнопка «Open notification settings», три шага MIUI и строка «The first two are in the settings of the app.». Чисто чёрный снимок — система эмулятора ещё не рисовала: прогнать блок тестов ещё раз.

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' || pkill -TERM -f '[q]emu-system.*ToRound_API37'
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' && echo "emulator stopped"
```

Expected: `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 7: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/Notifications.kt android/app/src/main/res/values-uk/strings.xml android/app/src/main/res/values/strings.xml
git commit -F - <<'EOF'
feat(android): the reminders of this phone in the menu, with what MIUI needs
EOF
```

---

### Task 6: Документация, полная проверка, пробный пуш и проверка на Redmi 9

**Files:**
- Modify: `docs/android.md`, `docs/notifications.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md`
- Вне репозитория: `/media/big_disk/android/work/push-test/push.js`, `devq.js` — пробный пуш и чтение прода.

**Interfaces:**
- Consumes: всё из задач 1–5.
- Produces: документация уведомлений на телефоне; итоги пробного пуша и проверки на Redmi 9 — записи в журнале исполнения (таблица «дошло / не дошло»).

- [ ] **Step 1: Документация**

Изменения в `docs/android.md`:

````diff
diff --git a/docs/android.md b/docs/android.md
index d6d1b47..109a178 100644
--- a/docs/android.md
+++ b/docs/android.md
@@ -1,13 +1,13 @@
 # Android-приложение
 
-Нативное Android-приложение ToDo-Round: Kotlin, Jetpack Compose, Material 3. Работает с тем же проектом Firebase и теми же данными (контракт v2), что и веб. План работ — [дорожная карта](superpowers/specs/2026-10-14-android-roadmap.md); этап 1 — [спецификация](superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), этап 2 — [спецификация](superpowers/specs/2026-10-24-stage-2-tasks-design.md).
+Нативное Android-приложение ToDo-Round: Kotlin, Jetpack Compose, Material 3. Работает с тем же проектом Firebase и теми же данными (контракт v2), что и веб. План работ — [дорожная карта](superpowers/specs/2026-10-14-android-roadmap.md); этап 1 — [спецификация](superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), этап 2 — [спецификация](superpowers/specs/2026-10-24-stage-2-tasks-design.md), этап 3 (уведомления) — [спецификация](superpowers/specs/2026-10-24-stage-3-notifications-design.md).
 
 ## Что где
 
 | Путь | Что внутри |
 |---|---|
 | `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели, правила списка задач веба (вкладки, поиск, фильтр, сортировка). Тесты (JUnit) читают общие примеры из `contract/` |
-| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, список задач (сортировка и фильтр пишутся в общие с вебом настройки), экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
+| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, список задач (сортировка и фильтр пишутся в общие с вебом настройки), уведомления (Firebase Cloud Messaging), экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
 | `android/device-tests.sh` | запуск тестов на устройстве против эмуляторов Firebase (ниже) |
 | `android/gradle/libs.versions.toml` | версии библиотек и плагинов |
 | `contract/` | общие примеры данных для веба, функций и Android ([README](../contract/README.md)) |
@@ -93,6 +93,34 @@ android/gradlew -p android --stop                   # остановить де
 
 Срок приложение показывает во времени телефона, веб — во времени компьютера; при сверке часовой пояс у них один. Если телефон не знает часового пояса задачи (его база часовых поясов старее, чем у браузера), срок он понимает в своём поясе — так же, как веб в таком случае. Документы, которые не прошли проверку контракта, приложение не показывает, а считает в заметке над списком; веб их показывает, поэтому числа и порядок расходятся ровно на них. Если проверку не прошла категория, её задачи приложение показывает без категории. Почему документ не прошёл проверку, пишет журнал телефона: `adb -s <адрес>:<порт> logcat -d -s Loaded`.
 
+## Уведомления
+
+Напоминания и «просрочено» шлёт сервер ([notifications.md](notifications.md)), а приложение их показывает:
+
+- После входа и при каждом открытии приложение регистрируется в FCM по id установки Firebase (FID) и записывает себя в `users/{uid}/devices/{FID}`: `platform: "android"`, `notificationsEnabled: true` у нового устройства, а адрес для пушей `fcmToken` — то, что FCM сообщил в `onRegistered`: сам FID (регистрация по FID, сервисы Google Play 26.12 и новее) или, на более старых сервисах Google Play, токен FCM. Android 13+ после входа спрашивает разрешение на уведомления. Если уведомления в настройках Android выключены (или выключен канал), пишется `fcmToken: null`, и сервер на телефон не шлёт.
+- «Выйти» сначала удаляет документ устройства (ждёт не больше 2 секунд) и уведомления аккаунта из шторки, потом выходит из аккаунта.
+- Канал — «Reminders» / «Нагадування», важность высокая. У задачи одно уведомление: следующее её событие заменяет прежнее; время на нём — время отправки сервером. Нажатие открывает приложение; `taskId` и `type` сообщения приходят в extras `MainActivity`.
+- Меню → «Reminders on this device» / «Нагадування на цьому пристрої»: разрешены ли уведомления, а на Xiaomi — что включить в MIUI.
+- Сборка для эмуляторов Firebase (`-Ptodoround.emulators=true`) в FCM не регистрируется (эмуляторы пушей не шлют) и сама пишет FID как адрес; id установки она при этом регистрирует в проекте — так работает Firebase Installations.
+
+### MIUI
+
+MIUI выгружает приложения в фоне. Смахнутое из недавних приложение без автозапуска «тихий» пуш не получает. Для ToDo-Round включить на телефоне:
+
+1. «Автозапуск» — на экране «О приложении» (долгое нажатие на значок или кнопка «Налаштування застосунку» в окне «Нагадування на цьому пристрої»).
+2. Там же «Контроль активности» — «Нет ограничений».
+3. По желанию — закрепить карточку приложения в недавних (замок): тогда «Очистить всё» его не закрывает.
+
+### Пробный пуш
+
+Телефон можно проверить без задач: сообщение FCM HTTP v1 (`projects/todo-flutter-fb8bf/messages:send`) в поле `token` — адрес устройства (FID), от имени входа Firebase CLI. FID отладочной сборки — поле `Fid` файла `no_backup/PersistedInstallation.*.json` в её данных. В том же файле — токены установки, поэтому файл не печатают, а сразу берут из него только `Fid`:
+
+```bash
+adb -s <адрес>:<порт> shell "run-as com.pmobile78.todoround sh -c 'cat no_backup/PersistedInstallation.*.json'" | python3 -I -c "import json, sys; print(json.load(sys.stdin)['Fid'])" > fid.txt
+```
+
+Пока на телефоне никто не вошёл, приложение пуш не показывает. Журнал: `adb … logcat -d -s FirebaseMessaging ToDoRoundApp AppViewModel` (подробный журнал FCM — после `adb … shell setprop log.tag.FirebaseMessaging VERBOSE`).
+
 ## Эмулятор
 
 Памяти 14 ГБ, поэтому эмулятор запускается без окна и без Android Studio, а демон Gradle перед этим останавливается. Команды `adb -e` обращаются к единственному эмулятору, если телефон подключён кабелем. Телефон по Wi-Fi для adb — такое же сетевое устройство, как эмулятор, и `adb -e` их не различит (`more than one emulator`, ложное `booted` при ожидании загрузки): перед работой с эмулятором телефон отключают — `adb disconnect <адрес>:<порт>`.
````

Изменения в `docs/notifications.md`:

````diff
diff --git a/docs/notifications.md b/docs/notifications.md
index a9989ff..d6cf86e 100644
--- a/docs/notifications.md
+++ b/docs/notifications.md
@@ -147,6 +147,14 @@
 (`scripts/generate-sw.js`), на открытой вкладке — `onMessage` в `src/firebaseMessaging.js`;
 клик открывает `url`, и приложение открывает задачу по `?taskId=` (и по старому `?bubbleId=`).
 
+Android-приложение показывает его в своей службе FCM (`RemindersService`, [android.md](android.md)):
+заголовок и текст как есть, у задачи одно уведомление (следующее событие заменяет прежнее),
+нажатие открывает приложение. Адрес Android-устройства в `fcmToken` — то, что FCM сообщил
+приложению после регистрации (`FirebaseMessaging.register()` и `onRegistered`, firebase-messaging
+25.1+): с сервисами Google Play 26.12 и новее это id установки (FID), с более старыми — токен FCM.
+Поле `token` сообщения на время перехода FCM принимает и FID. Когда FCM уберёт поле `token`,
+сервер должен будет слать FID полем `fid` (Admin SDK 14.1+); срока Google пока не назвал.
+
 Ошибки FCM `messaging/registration-token-not-registered` и
 `messaging/invalid-registration-token` означают мёртвый токен: устройству ставится
 `fcmToken = null` — в транзакции и только если у устройства всё ещё этот токен (оно могло
````

Изменения в `docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md`:

````diff
diff --git a/docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md b/docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md
index 3db36e7..fbc5ca4 100644
--- a/docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md
+++ b/docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md
@@ -88,7 +88,7 @@ notification-sent/{key}              служебная, только серве
 | `notificationsEnabled` | bool | переключатель «получать напоминания здесь» |
 | `createdAt`, `updatedAt` | Timestamp | время создания и изменения |
 
-`deviceId` — id установки Firebase: `getId()` в вебе, `FirebaseInstallations.getInstance().id` на Android. Новое устройство регистрируется с включённым переключателем, разрешение на уведомления запрашивается после входа, как сейчас. При выходе из аккаунта клиент удаляет документ своего устройства до вызова `signOut`. Регистрация при входе: если документ устройства уже есть — `updateDoc` с новым `fcmToken` и `updatedAt` (переключатель не трогается); если нет — `setDoc` со всеми полями и `createdAt`/`updatedAt` = `serverTimestamp()`.
+`deviceId` — id установки Firebase: `getId()` в вебе, `FirebaseInstallations.getInstance().id` на Android. На Android `fcmToken` — адрес, который FCM сообщил приложению после регистрации по id установки: сам id установки (сервисы Google Play 26.12 и новее) или токен FCM на более старых; FCM принимает оба в поле `token` сообщения (уточнено в этапе 3, [спецификация](2026-10-24-stage-3-notifications-design.md)). Новое устройство регистрируется с включённым переключателем, разрешение на уведомления запрашивается после входа, как сейчас. При выходе из аккаунта клиент удаляет документ своего устройства до вызова `signOut`. Регистрация при входе: если документ устройства уже есть — `updateDoc` с новым `fcmToken` и `updatedAt` (переключатель не трогается); если нет — `setDoc` со всеми полями и `createdAt`/`updatedAt` = `serverTimestamp()`.
 
 ### 3.4 Документ пользователя — `users/{uid}`
 
````

Изменения в `CLAUDE.md`:

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index ed358d8..64ab920 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -93,7 +93,7 @@ functions/
 
 ### Android app
 
-`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), stage 2 [spec](docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, with JUnit tests on `contract/`; `app` — the Android application: Firebase Auth and Firestore with `android/app/google-services.json` (out of git; `firebase apps:sdkconfig`), screens on Compose. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
+`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), stage 2 [spec](docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md), stage 3 [spec](docs/superpowers/specs/2026-10-24-stage-3-notifications-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, with JUnit tests on `contract/`; `app` — the Android application: Firebase Auth, Firestore and Cloud Messaging (the phone registers with FCM by its installation id, the id of its device document; its `fcmToken` is what FCM reports, the same id on Play services 26.12+) with `android/app/google-services.json` (out of git; `firebase apps:sdkconfig`), screens on Compose. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
 
 - Never print `~/.gradle/gradle.properties` whole (`cat`, `less`, an unanchored `grep`): it holds the release key passwords. Read one non-secret line at a time, e.g. `grep '^org.gradle.java.home' ~/.gradle/gradle.properties`.
 - `core` compiles against the JDK but runs on Android 8+: `-Xjdk-release=17` keeps out Java 18+ methods, not the Java 9–17 ones Android 8 lacks (`List.of` …). Use `java.time` and the Kotlin standard library there.
````

- [ ] **Step 2: Полная проверка и неизменные веб и сервер**

```bash
android/gradlew -p android clean check --no-daemon
tail -1 android/app/build/reports/lint-results-debug.txt
git diff --stat fd525a6 HEAD -- . ':!android' ':!docs' ':!CLAUDE.md'
```

Expected: `core tests: 114 passed, 0 failed, 0 skipped`, `app debug tests: 30 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`, `No issues found.`; `git diff --stat` ничего не выводит: кроме `android/` и документации, ветка от одобренной спецификации (`fd525a6`) ничего не меняет.

- [ ] **Step 3: Сборки: с проектом, для эмуляторов и релиз с R8**

Сборка с проектом нужна пробному пушу: она регистрируется в FCM. Её APK откладывается в сторону — следующая сборка в тот же путь кладёт сборку для эмуляторов. Релиз (R8) подписывается одноразовым ключом, как в этапе 1, — это не ключ владельца:

```bash
android/gradlew -p android :app:assembleDebug --no-daemon
mkdir -p /media/big_disk/android/work/push-test && cp android/app/build/outputs/apk/debug/app-debug.apk /media/big_disk/android/work/push-test/app-project-debug.apk
/media/big_disk/android/sdk/build-tools/37.0.0/aapt2 dump xmltree --file AndroidManifest.xml /media/big_disk/android/work/push-test/app-project-debug.apk | grep -A1 'firebase_messaging_auto_init_enabled' | grep -o 'value(0x01010024)=[a-z]*'
K=/media/big_disk/android/work/throwaway-release.jks
rm -f $K
/media/big_disk/android/android-studio/jbr/bin/keytool -genkeypair -keystore $K -storetype PKCS12 -storepass throwaway-test -keypass throwaway-test -alias throwaway -keyalg RSA -keysize 2048 -validity 2 -dname "CN=ToDo-Round throwaway test"
android/gradlew -p android :app:assembleDebug :app:assembleDebugAndroidTest :app:assembleRelease -Ptodoround.emulators=true -Ptodoround.release.storeFile=$K -Ptodoround.release.storePassword=throwaway-test -Ptodoround.release.keyAlias=throwaway -Ptodoround.release.keyPassword=throwaway-test --no-daemon
/media/big_disk/android/sdk/build-tools/37.0.0/apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk 2>/dev/null | grep 'certificate DN'
rm -f $K
```

Expected: `BUILD SUCCESSFUL` дважды; `value(0x01010024)=true` (сборка с проектом регистрируется в FCM); `V2 Signer: certificate DN: CN=ToDo-Round throwaway test`.

- [ ] **Step 4: Проверка на эмуляторе: тесты, релиз и пробный пуш**

Скрипт пробного пуша — вне репозитория: он шлёт сообщение FCM HTTP v1 от имени входа Firebase CLI владельца (библиотека `firebase-tools` из Node 22 этой машины) и печатает только итог. `silent` — как шлёт сервер (`data`, `android.priority: HIGH`); `shown` — ещё и готовое уведомление («вариант 2»); `shown-allow` — с `proxy: ALLOW`. Третий аргумент — метка: тег уведомления `push-test-<вид>-<метка>`, чтобы каждая проверка нашла своё:

```bash
mkdir -p /media/big_disk/android/work/push-test && cat > /media/big_disk/android/work/push-test/push.js <<'EOF'
#!/usr/bin/env node
// A test push to one installation of the Android app (stage 3 spec, 8.2 and 8.3), sent through
// FCM HTTP v1 with the owner's Firebase CLI login. It prints what happened, never the address.
//   node push.js <silent|shown|shown-allow> <file with the FID> <label> [--validate]
// silent: as functions/lib/messages.js sends it (data, android priority high);
// shown: plus android.notification ("variant 2"); shown-allow: plus proxy ALLOW.
// The notification's tag is push-test-<kind>-<label>, so each check finds its own.
const fs = require('fs');
const path = require('path');

const TOOLS = path.join(process.env.HOME, '.nvm/versions/node/v22.22.2/lib/node_modules/firebase-tools/lib');
const auth = require(path.join(TOOLS, 'auth'));
const { requireAuth } = require(path.join(TOOLS, 'requireAuth'));
const { Client } = require(path.join(TOOLS, 'apiv2'));

const PROJECT = 'todo-flutter-fb8bf';
const ROOT = '/media/big_disk/PhpstormProjects/to-round-react';
const KINDS = ['silent', 'shown', 'shown-allow'];

async function main() {
    const [kind, fidFile, label, flag] = process.argv.slice(2);
    if (!KINDS.includes(kind) || !fidFile || !/^[a-z0-9]+$/.test(label || '')) {
        throw new Error('usage: push.js <silent|shown|shown-allow> <fid file> <label: a-z, 0-9> [--validate]');
    }
    const fid = fs.readFileSync(fidFile, 'utf8').trim();
    const options = { projectRoot: ROOT };
    const account = auth.selectAccount(undefined, ROOT);
    if (account) auth.setActiveAccount(options, account);
    await requireAuth(options);
    const client = new Client({ urlPrefix: 'https://fcm.googleapis.com', apiVersion: 'v1' });

    const stamp = new Date().toISOString().slice(11, 19);
    const taskId = `push-test-${kind}-${label}`;
    const title = 'ToDo-Round test';
    const body = `${kind} ${stamp}`;
    const data = {
        type: 'reminder', taskId, title, body, minutesBefore: '60',
        url: `https://pmobile78.github.io/to-round-react/?taskId=${taskId}`,
    };
    const message = { token: fid, data, android: { priority: 'HIGH', ttl: '86400s' } };
    if (kind !== 'silent') {
        // Channel, icon and colour are left to the defaults of the app's manifest, which this checks.
        message.android.notification = { title, body, tag: taskId };
        if (kind === 'shown-allow') message.android.notification.proxy = 'ALLOW';
    }
    const validate = flag === '--validate';
    const res = await client.post(`projects/${PROJECT}/messages:send`, { message, validate_only: validate });
    const named = res.body && typeof res.body.name === 'string';
    console.log(`${taskId}: ${validate ? 'validated' : 'sent'} at ${stamp} UTC, ${named ? 'FCM gave a message id' : 'no message id'}`);
}

main().catch((e) => {
    console.log(`failed: ${e.status || ''} ${String(e.message).split('\n')[0].slice(0, 300)}`);
    process.exit(1);
});
EOF
echo written
```

Expected: `written`.

Свободен ли эмулятор:

```bash
source /media/big_disk/android/android-env.sh && if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"; else echo "no emulator"; fi
```

Expected: `no emulator`. Иначе — ждать и проверять снова.

Запустить эмулятор в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-3-1.log 2>&1
```

Дождаться загрузки:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; sleep 60; echo booted
```

Expected: `booted`.

Сначала тесты на устройстве:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (1 test)` (тест разрешения), `OK (35 tests)` и `Script exited successfully (code 0)`.

Релиз после R8 запускается (вход он не делает: релиз работает с настоящим проектом). Снимок — когда в дереве экрана появилось название приложения:

```bash
source /media/big_disk/android/android-env.sh
adb -e uninstall com.pmobile78.todoround
adb -e install android/app/build/outputs/apk/release/app-release.apk
adb -e logcat -c
adb -e shell am start -W -n com.pmobile78.todoround/.MainActivity | grep Status
timeout 120 sh -c 'until adb -e exec-out uiautomator dump /dev/tty | grep -q "text=\"ToDo-Round\"[^>]*package=\"com.pmobile78.todoround\""; do sleep 1; done'
adb -e exec-out screencap -p > /media/big_disk/android/work/stage-3-1-release.png
adb -e logcat -d | grep -c 'FATAL EXCEPTION'
adb -e uninstall com.pmobile78.todoround
```

Expected: `Failure […]` (приложения не было) или `Success`, затем `Success`, `Status: ok`, `0` и `Success`. Снимок открыть: экран входа — три пузыря, «ToDo-Round», вкладки «Login» и «Register». Если снимок чёрный, через минуту повторить этот блок.

Пробный пуш (спецификация, 8.2) на сборку с проектом. Приложение регистрируется в FCM при запуске; FID берётся из его данных — только поле `Fid`, файл с токенами установки не печатается:

```bash
source /media/big_disk/android/android-env.sh
adb -e install -t /media/big_disk/android/work/push-test/app-project-debug.apk
adb -e shell pm grant com.pmobile78.todoround android.permission.POST_NOTIFICATIONS
adb -e shell setprop log.tag.FirebaseMessaging VERBOSE
adb -e shell am start -W -n com.pmobile78.todoround/.MainActivity | grep Status
timeout 120 sh -c 'until adb -e shell run-as com.pmobile78.todoround ls no_backup 2>/dev/null | grep -q PersistedInstallation; do sleep 2; done'
sleep 10
adb -e shell "run-as com.pmobile78.todoround sh -c 'cat no_backup/PersistedInstallation.*.json'" | python3 -I -c "import json, sys; print(json.load(sys.stdin)['Fid'])" > /media/big_disk/android/work/push-test/emulator-fid.txt
wc -c < /media/big_disk/android/work/push-test/emulator-fid.txt
adb -e shell input keyevent KEYCODE_HOME
```

Expected: `Success`, `Status: ok`, `23` (FID из 22 символов и перевод строки).

Готовое уведомление: его показывает сам FCM — канал, значок и цвет из умолчаний манифеста. Пока регистрация в FCM не закончилась, FCM отвечает `404 NotRegistered` — тогда отправка повторяется через 10 секунд:

```bash
source /media/big_disk/android/android-env.sh
for i in 1 2 3 4 5 6; do NODE_NO_WARNINGS=1 PATH=$HOME/.nvm/versions/node/v22.22.2/bin:$PATH node /media/big_disk/android/work/push-test/push.js shown /media/big_disk/android/work/push-test/emulator-fid.txt emu && break; sleep 10; done
sleep 10
adb -e shell dumpsys notification --noredact | grep -m1 -o 'tag=push-test-shown-emu importance=[0-9]'
adb -e shell dumpsys notification --noredact | grep -A30 'tag=push-test-shown-emu' | grep -m1 -o 'channel=reminders'
adb -e shell dumpsys notification --noredact | grep -A30 'tag=push-test-shown-emu' | grep -m1 -o 'color=0xff3b7ded'
```

Expected: `push-test-shown-emu: sent at <время> UTC, FCM gave a message id` (перед ним, возможно, одна-две строки `failed: 404 … NotRegistered`) — FCM принял FID в поле `token`; `tag=push-test-shown-emu importance=4`, `channel=reminders`, `color=0xff3b7ded`.

«Тихий» пуш — как шлёт сервер. На сборке, где никто не вошёл, приложение его получает, но не показывает (спецификация, 2.3 № 12):

```bash
source /media/big_disk/android/android-env.sh
adb -e logcat -c
NODE_NO_WARNINGS=1 PATH=$HOME/.nvm/versions/node/v22.22.2/bin:$PATH node /media/big_disk/android/work/push-test/push.js silent /media/big_disk/android/work/push-test/emulator-fid.txt emu
sleep 10
adb -e logcat -d -s FirebaseMessaging | grep -c 'notifications.RemindersService'
adb -e shell dumpsys notification --noredact | grep -c 'tag=push-test-silent-emu'
```

Expected: `push-test-silent-emu: sent at <время> UTC, FCM gave a message id`; число больше нуля (сообщение пришло в службу приложения); `0`.

Нажатие на уведомление FCM открывает приложение и убирает уведомление:

```bash
source /media/big_disk/android/android-env.sh
adb -e shell cmd statusbar expand-notifications
sleep 2
b=$(adb -e exec-out uiautomator dump /dev/tty | grep -o 'text="ToDo-Round test"[^>]*bounds="[^"]*"' | grep -o 'bounds="[^"]*"' | head -1 | tr -c '0-9\n' ' ')
adb -e shell input tap $(echo $b | awk '{print int(($1+$3)/2), int(($2+$4)/2)}')
sleep 3
adb -e shell dumpsys activity activities | grep -m1 -o 'topResumedActivity=.*todoround/.MainActivity'
adb -e shell dumpsys notification --noredact | grep -c 'tag=push-test-shown-emu'
```

Expected: `topResumedActivity=ActivityRecord{… com.pmobile78.todoround/.MainActivity`, затем `0`.

Эмулятор остаётся чистым и выключается:

```bash
source /media/big_disk/android/android-env.sh
adb -e uninstall com.pmobile78.todoround
adb -e shell pm list packages | grep -c todoround || true
adb -e emu kill
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' || pkill -TERM -f '[q]emu-system.*ToRound_API37'
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' && echo "emulator stopped"
rm -f /media/big_disk/android/work/push-test/emulator-fid.txt
```

Expected: `Success`, `0`, `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 5: Commit**

Коммит документации не ждёт проверки на телефоне: в репозитории она ничего не меняет.

```bash
git add CLAUDE.md docs/android.md docs/notifications.md docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md
git commit -F - <<'EOF'
docs(android): notifications on the phone, what MIUI needs and a test push
EOF
```

- [ ] **Step 6: Проверка на Redmi 9 (спецификация, 8.3)**

Эта проверка идёт на телефоне владельца и в его аккаунте, поэтому каждый её шаг — с его «да». Перед ней владельцу объясняется, что будет: установка сборки — она запишет в его аккаунт документ устройства телефона, и напоминания будут приходить на телефон и после проверки; пробные пуши на телефон (задачи не меняются); настройки MIUI (их включает он сам); тестовая задача «ToDo-Round test» в его аккаунте. Снимков экрана телефона нет: на них были бы его задачи и чужие уведомления. Исполнитель печатает только «да/нет», числа и время. Эмулятор выключен (задача 6, шаг 4).

**6.1. Телефон по Wi-Fi.** Владелец включает «Отладку по Wi-Fi»; компьютер с телефоном уже сопряжены. Адрес находит `adb mdns services`, иначе его присылает владелец. Если связь пропадёт (экран выключен долго), владелец снова включает отладку по Wi-Fi — порт будет новым:

```bash
source /media/big_disk/android/android-env.sh
adb mdns services
adb connect <адрес>:<порт>
adb -s <адрес>:<порт> shell getprop ro.product.model
adb -s <адрес>:<порт> shell dumpsys package com.google.android.gms | grep -m1 -o 'versionCode=[0-9]*'
```

Expected: `connected to <адрес>:<порт>`, `M2004J19C`, `versionCode=<число>`. Число записать: от 261200000 FCM регистрирует телефон по FID, ниже — токеном (адрес в 6.3 тогда — токен, и `fcmToken is the id` будет `false`).

**6.2. Сборка с проектом.** Та же сборка, что прошла пробный пуш на эмуляторе. Она подписана тем же отладочным ключом, что и сборка на телефоне, поэтому ставится поверх, и вход сохраняется. Сначала Google Play Защита, затем окно MIUI «Установка через USB» — владелец подтверждает оба за 10 секунд:

```bash
source /media/big_disk/android/android-env.sh
adb -s <адрес>:<порт> install -r /media/big_disk/android/work/push-test/app-project-debug.apk
adb -s <адрес>:<порт> shell am start -W -n com.pmobile78.todoround/.MainActivity | grep Status
sleep 10
adb -s <адрес>:<порт> exec-out uiautomator dump /dev/tty | grep -c 'Forgot Password\|Забули пароль'
```

Expected: `Success`, `Status: ok`, `0` (экрана входа нет — вход сохранился). Иначе входит владелец.

**6.3. Документ устройства в проде.** Скрипт только читает и печатает «да/нет». Регистрация в FCM занимает секунды: если документов `0`, подождать 30 секунд и повторить последнюю команду:

```bash
cat > /media/big_disk/android/work/push-test/devq.js <<'EOF'
#!/usr/bin/env node
// Read-only look at the devices in prod (users/{uid}/devices, contract 3.3) with the owner's
// Firebase CLI login. It prints yes/no and numbers only: never an id, a token or an account.
//   node devq.js              — devices by platform
//   node devq.js <fid file>   — the device whose id is that FID
const fs = require('fs');
const path = require('path');

const TOOLS = path.join(process.env.HOME, '.nvm/versions/node/v22.22.2/lib/node_modules/firebase-tools/lib');
const auth = require(path.join(TOOLS, 'auth'));
const { requireAuth } = require(path.join(TOOLS, 'requireAuth'));
const { Client } = require(path.join(TOOLS, 'apiv2'));

const ROOT = '/media/big_disk/PhpstormProjects/to-round-react';
const DOCS = 'projects/todo-flutter-fb8bf/databases/(default)/documents';

const value = (field) => (field === undefined ? undefined
    : 'stringValue' in field ? field.stringValue
        : 'booleanValue' in field ? field.booleanValue
            : 'timestampValue' in field ? field.timestampValue
                : 'nullValue' in field ? null : '?');

async function main() {
    const fidFile = process.argv[2];
    const options = { projectRoot: ROOT };
    const account = auth.selectAccount(undefined, ROOT);
    if (account) auth.setActiveAccount(options, account);
    await requireAuth(options);
    const client = new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1' });
    const res = await client.post(`${DOCS}:runQuery`, { structuredQuery: { from: [{ collectionId: 'devices', allDescendants: true }] } });
    const devices = res.body.filter((r) => r.document && /^users\/[^/]+\/devices\/[^/]+$/.test(r.document.name.split('/documents/')[1]))
        .map((r) => ({ id: r.document.name.split('/').pop(), ...Object.fromEntries(Object.entries(r.document.fields || {}).map(([k, v]) => [k, value(v)])) }));
    if (!fidFile) {
        const count = (keep) => devices.filter(keep).length;
        console.log(`devices: ${devices.length}; web: ${count((d) => d.platform === 'web')}, android: ${count((d) => d.platform === 'android')}; ` +
            `with an address: ${count((d) => typeof d.fcmToken === 'string')}; reminders on: ${count((d) => d.notificationsEnabled === true)}`);
        return;
    }
    const fid = fs.readFileSync(fidFile, 'utf8').trim();
    const mine = devices.filter((d) => d.id === fid);
    console.log(`documents of this device: ${mine.length}`);
    for (const d of mine) {
        console.log(`platform android: ${d.platform === 'android'}; notificationsEnabled: ${d.notificationsEnabled}; ` +
            `fcmToken is the id: ${d.fcmToken === d.id}; fcmToken null: ${d.fcmToken === null}; updated: ${String(d.updatedAt).slice(0, 16)}`);
    }
}

main().catch((e) => {
    console.log(`failed: ${e.status || ''} ${String(e.message).split('\n')[0].slice(0, 300)}`);
    process.exit(1);
});
EOF
source /media/big_disk/android/android-env.sh
adb -s <адрес>:<порт> shell "run-as com.pmobile78.todoround sh -c 'cat no_backup/PersistedInstallation.*.json'" | python3 -I -c "import json, sys; print(json.load(sys.stdin)['Fid'])" > /media/big_disk/android/work/push-test/phone-fid.txt
wc -c < /media/big_disk/android/work/push-test/phone-fid.txt
NODE_NO_WARNINGS=1 PATH=$HOME/.nvm/versions/node/v22.22.2/bin:$PATH node /media/big_disk/android/work/push-test/devq.js /media/big_disk/android/work/push-test/phone-fid.txt
```

Expected: `23`; `documents of this device: 1`; `platform android: true; notificationsEnabled: true; fcmToken is the id: true; fcmToken null: false; updated: <дата и время>`. `fcmToken is the id: false` — только при сервисах Google Play ниже 261200000 (6.1): тогда адрес — токен, а пробные пуши ниже шлются на FID и не дойдут; 6.4 откладывается до обновления сервисов Google Play, настоящий сервер (6.6) проверяется и так.

**6.4. Пробные пуши: худший случай.** Перед первым прогоном владелец говорит, что сейчас включено у ToDo-Round в MIUI: «Автозапуск» и батарея (после предварительной проверки 26 октября включено и то и другое). На первую половину проверки он выключает автозапуск и возвращает батарее режим по умолчанию. Виды пуша: `silent` (как шлёт сервер), `shown` (готовое уведомление, «вариант 2»), `shown-allow` (то же, и сервисам Google разрешено показать его самим, `proxy: ALLOW`). Состояния (метка в теге — буква): `a` — приложение открыто; `b` — свёрнуто (`input keyevent KEYCODE_HOME`); `c` — смахнуто из недавних (`input keyevent KEYCODE_APP_SWITCH`, затем быстрый `input swipe <x> <y> 10 <y> 150` по карточке ToDo-Round — медленный, за 250 мс, карточку не убрал; координаты карточки — из `uiautomator dump`, печатать только их; в новом дампе узла `content-desc="ToDo-Round,…"` больше нет); `d` — смахнуто, экран выключен (`input keyevent KEYCODE_SLEEP`) 15 минут, телефон не на зарядке (на зарядке Android не засыпает), в эти 15 минут adb не трогать; пуш — при выключенном экране, проверка — через минуту после него и ещё раз после `KEYCODE_WAKEUP`. Каждый вид шлётся из свежего состояния: если пуш разбудил приложение (процесс появился), перед следующим видом его снова смахивают. Смахивает и выключает экран исполнитель через `adb … shell input`, если включена «Отладка по USB (настройки безопасности)», иначе — владелец.

Перед каждым пушем — состояние телефона (только числа и слова):

```bash
source /media/big_disk/android/android-env.sh
P=<адрес>:<порт>
adb -s $P shell pidof com.pmobile78.todoround || echo "no process"
adb -s $P shell dumpsys package com.pmobile78.todoround | grep -m1 -o 'stopped=[a-z]*'
adb -s $P shell dumpsys deviceidle get deep
adb -s $P shell dumpsys deviceidle get light
adb -s $P shell dumpsys battery | grep -E 'AC powered|USB powered|Wireless powered'
```

Пуш вида `<вид>` в состоянии `<метка>` и проверка своего тега:

```bash
source /media/big_disk/android/android-env.sh
P=<адрес>:<порт>; F=/media/big_disk/android/work/push-test/phone-fid.txt; K=<вид>; S=<метка состояния>
NODE_NO_WARNINGS=1 PATH=$HOME/.nvm/versions/node/v22.22.2/bin:$PATH node /media/big_disk/android/work/push-test/push.js $K $F $S
sleep 60
adb -s $P shell dumpsys notification --noredact | grep -c "tag=push-test-$K-$S "
adb -s $P shell pidof com.pmobile78.todoround || echo "no process"
```

Число больше нуля — уведомление показано («дошло»); `0` — нет. Если оно появится позже (например, когда приложение откроют), записать «опоздало», а не «не дошло». У каждой проверки свой тег, поэтому уведомления прошлых проверок ей не мешают. Сначала все четыре состояния без настроек MIUI. Затем владелец по окну «Нагадування на цьому пристрої» включает «Автозапуск» и батарею «Без обмежень» (карточку в недавних не закрепляет: закреплённую не смахнуть), и состояния `c` и `d` повторяются с метками `c2` и `d2`. Названия пунктов MIUI на его телефоне записать. Читает их исполнитель сам, пока телефон разблокирован: открывает настройки приложения (`adb -s $P shell am start -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:com.pmobile78.todoround`), берёт из `uiautomator dump` только тексты пунктов автозапуска и батареи с их значениями (у батареи под названием пункта — выбранный режим), ничего не нажимает, снимков не делает, затем `input keyevent KEYCODE_HOME`. Заблокированный телефон исполнитель не разблокирует. если они не совпадают с текстами окна, поправить `reminders_xiaomi` (en и uk) и `docs/android.md` отдельным коммитом и прогнать `android/gradlew -p android check --no-daemon` и тесты на устройстве ещё раз. Итог — таблица «состояние × вид пуша × настройки → дошло / опоздало / не дошло» с записанными состояниями — в журнале исполнения.

**6.5. Нажатие.** На уведомлении `silent` состояния `b` (его показывает само приложение): шторка (`cmd statusbar expand-notifications`), координаты узла с текстом `silent b` из `uiautomator dump` (печатать только координаты), `input tap` по их середине — приложение открывается, уведомление пропадает (`topResumedActivity` и `dumpsys`, как на эмуляторе).

**6.6. Настоящий сервер.** С «да» владельца исполнитель во встроенном браузере (веб, аккаунт владельца) создаёт задачу «ToDo-Round test»: срок через 70 минут, напоминание за 1 час. Сразу после этого приложение на телефоне смахивается, экран выключается, телефон не на зарядке. Примерно через 10 минут должно прийти напоминание: `dumpsys notification` показывает уведомление пакета `com.pmobile78.todoround`, текст которого содержит «ToDo-Round test» (на языке аккаунта: «За 1 годину до строку: ToDo-Round test» или «1 hour before: ToDo-Round test»); печатать только это совпадение. Затем срок меняется на «через 10 минут», приложение снова смахнуто, экран выключен — через 10 минут приходит «Прострочено: ToDo-Round test» («Overdue: ToDo-Round test»), оно заменяет напоминание. После этого исполнитель кладёт задачу в корзину; навсегда её удаляет владелец (или сервер через 30 дней) — необратимое удаление исполнитель не делает. Всё время — только эта задача: остальные задачи, категории и настройки не трогаются.

**6.7. Итог.** Если в 6.4 `silent` в каком-то состоянии не дошёл, а `shown` или `shown-allow` дошёл, — владельцу предлагается подплан 3.2 (готовое уведомление от сервера) с этой таблицей и с его ценой: готовое уведомление показывается и тогда, когда на телефоне никто не вошёл (решение 12 спецификации не действует); серверу нужен тег `taskId`, иначе уведомления приложения и FCM об одной задаче не заменяют друг друга; категории «напоминание» у него нет; нажатие открывает приложение, но extras такого нажатия тестами не проверены. Телефон отключить: `adb disconnect <адрес>:<порт>`; `rm -f /media/big_disk/android/work/push-test/phone-fid.txt`. Настройки MIUI остаются, как их поставил владелец.

---

## Итог подплана 3.1 и передача дальше

- **Этап 3 готов**, если на Redmi 9 в шаге 6.6 пришли напоминание и «просрочено» в худшем случае с настройками MIUI, нажатие открыло приложение (6.5), а после выхода документа устройства нет (тест `AuthFlowTest` на эмуляторе; на телефоне выход не проверяется, чтобы владельцу не входить заново).
- **Подплан 3.2** пишется, только если шаг 6.4 показал, что без готового уведомления от сервера пуши пропадают, и владелец согласился, зная цену из 6.7.
- **Подплан 2.2:** нажатие открывает `MainActivity` с `taskId` и `type` в extras — и для уведомления приложения (задача ещё и в данных намерения: `todoround://task/<id>`), и для уведомления FCM; приложение пока их не читает (`singleTop`: при открытом приложении они придут в `onNewIntent`). Экран задачи 2.2 открывается по ним. Пункт меню «Нагадування на цьому пристрої» стоит перед «Выйти».
- **Слияние с `stage-2-tasks`:** пересекаются меню и конец `HomeScreen`, `AppViewModel` (`signOut`, новые функции после него), `MainActivity` (вызов `RegisterThisDevice` перед `when`), строки en/uk, `libs.versions.toml`, `app/build.gradle.kts` и `android/device-tests.sh` (два прогона: `PermissionTest` отдельно и первым). Новые тесты на устройстве 2.2 со входом через экран работают и так: разрешение выдаётся перед ними.
- **Сервер:** когда FCM уберёт поле `token`, функции должны слать Android-устройствам полем `fid` (Admin SDK 14.1+) — правка сервера и контракта, решение владельца. На сервисах Google Play старше 26.12 адрес Android-устройства — токен, а не FID; поле `token` его принимает и после перехода.
