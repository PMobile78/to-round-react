# Этап 2.1: список — вкладки, поиск, сортировка и фильтр — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать из списка этапа 1 список веба — вкладки «Активные», «Выполненные», «Удалённые», «Запланированные» с числами, поиск, сортировку и фильтр по категориям, записанные в общие с вебом настройки, — взять мелочи этапа 1 про часовой пояс, таймер «Просрочено» и состояние «данные не прочитаны» и закончить проверкой с вебом на эмуляторах и сверкой четырёх вкладок на Redmi 9.

**Architecture:** Правила списка — в `core` (`TaskList.kt` вместо `ActiveList.kt` из 1.3): вкладки, поиск, числа во вкладках и в панели фильтра, выбор панели в том виде, в каком его пишет веб, категории по порядку; срок в зоне, которой телефон не знает, понимается в зоне телефона (`dueMoment`). `app`: `SettingsRepository` пишет `settings.listSort` и `settings.listFilter` так же, как `updateSettings` веба; записи идут через `Writes` — экран их не ждёт, а запись, которую отклонил сервер, показывается сообщением. `HomeScreen` — поле поиска, кнопка фильтра с панелью, сортировка, вкладки и строки с датами; «сейчас» обновляется раз в минуту.

**Tech Stack:** как в 1.3 — Kotlin 2.4.21, Compose BOM 2026.09.00 (Material 3), Firebase BoM 35.1.0, AppCompat 1.8.0, Lifecycle 2.11.0; тесты JVM — JUnit 6, на устройстве — Compose UI test, AndroidX Test, Espresso 3.7.0. Новая библиотека одна, только для тестов на устройстве: `androidx.compose.ui:ui-test-manifest` (версию даёт Compose BOM, в сборку debug). Эмуляторам Firebase нужны Firebase CLI 15 и Java 21+.

**Spec:** [docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md](../specs/2026-10-24-stage-2-tasks-design.md) — разделы 2.2 (№ 4–10, 17, 22–24), 3 (№ 1–4, 16), 4, 5, 6, 10, 11. Обзор — [2026-10-24-stage-2-overview.md](2026-10-24-stage-2-overview.md). Основа — этап 1 (`main` 67df63e) и план [1.3](2026-10-23-stage-1-3-task-list-and-redmi-9-check.md) (раздел «Итог этапа 1 и передача дальше»). Эталон списка — `src/components/TaskList.jsx` веба. Весь код плана прогнан в черновой копии ветки: числа тестов и строки `Expected` — настоящие, тесты на устройстве — на эмуляторе `ToRound_API37` (Android 17), проверка с вебом на эмуляторах — тоже.

## Global Constraints

- Ветка `stage-2-tasks` от `abe2902` (спецификация одобрена); уточнения спецификации после черновика этого плана (отдельный коммит перед ним) и сам план — в ней. В `main` не коммитить, ничего не пушить без слова владельца.
- Веб, `contract/`, правила Firestore, Cloud Functions и CI не меняются. Исключение — документация в задаче 5: `docs/android.md` и `CLAUDE.md`. Новых общих примеров в `contract/` правила списка не требуют: тесты `core` проверяют их на своих примерах, а совпадение с вебом проверено в черновике разовой сверкой — 400 случайных случаев через настоящий `TaskList.jsx` (строки вкладки, числа вкладок и панели фильтра, выбор панели), 0 расхождений.
- Все команды — из корня репозитория; Gradle — `android/gradlew -p android …`, на JBR Android Studio, как в этапе 1.
- `android/app/google-services.json` — вне git; в копии, где его нет, его скачивает шаг 1 задачи 2. Регистрацию приложения в Firebase не повторять, проект Firebase не менять.
- Эмуляторы Firebase — из `firebase.json`: Auth на 9099, Firestore на 8180, проект `demo-to-round`; `emulators:exec` занимает ещё 4400, 4500 и 9150. Перед запуском порты свободны: `ss -ltn | grep -E ':(9099|8180|4400|4500|9150)\b'` ничего не печатает. Их может держать другая сессия (например, веб на эмуляторах): её процессы не трогать — подождать, пока порты освободятся. Если ждать долго, черновик этого плана прогонял тесты на своих портах — вне репозитория: копия `firebase.json` с портами 19099, 18180, 14400, 14500, 19150 (`firebase emulators:exec --config <копия> …`) и копия `android/device-tests.sh` с `adb -e reverse tcp:9099 tcp:19099` и `adb -e reverse tcp:8180 tcp:18180`.
- Эмулятор Android `ToRound_API37` тоже бывает занят другой сессией. Перед каждым запуском — проверка блока «Свободен ли эмулятор»: если эмулятор уже работает, он чужой — ждать, не трогать и не ставить на него ничего. Свой эмулятор выключается блоком, который ждёт конца его процесса: в прогоне этого плана `adb -e emu kill` однажды ответил «bye bye», а процесс остался.
- Памяти 14 ГБ: Gradle и эмулятор Android одновременно не работают. Порядок прогона на устройстве: сборка; `android/gradlew -p android --stop`; проверка, что эмулятор свободен; эмулятор в фоне (`run_in_background`); ожидание загрузки одной командой с тайм-аутом 10 минут; тесты; выключение с ожиданием конца процесса.
- Тесты на устройстве идут только на сборке с `-Ptodoround.emulators=true` и только на эмуляторе: `android/device-tests.sh` удаляет приложение до и после прогона. Итог печатает скрипт: `OK (N tests)` или список ошибок. Ответ `INSTRUMENTATION_RESULT: shortMsg=Process crashed.` без единого теста — сбой запуска на только что загруженном эмуляторе (один раз в прогоне этого плана, в задаче 5; повтор того же блока прошёл): прогнать блок тестов ещё раз.
- `adb -e` — эмулятор. Телефон Redmi 9 — только по Wi-Fi (`adb -s <адрес>:<порт>`) и только после «да» владельца (задача 5): по кабелю от этого компьютера у телефона бывают фантомные касания. Перед работой с эмулятором телефон отключают — `adb disconnect <адрес>:<порт>`.
- Запись в прод (спецификация, 2.2 № 7, 24). Приложение пишет `settings.listSort` и `settings.listFilter`, когда пользователь меняет сортировку или фильтр, — это общие настройки, веб меняется вместе с ними. Исполнитель на настоящем аккаунте владельца только читает: сортировку и фильтр там не меняет.
- Версии библиотек и плагинов не менять. Если Lint сообщит только о вышедших новых версиях (`GradleDependency`, `AndroidGradlePluginVersion`), записать это в журнал исполнения и продолжать.
- `~/.gradle/gradle.properties` целиком не выводить: там пароли релизного ключа. Строки смотреть по одной.
- Код в плане взят из проверенной черновой копии без правок. Новые и переписанные целиком файлы даны полностью (перед блоком — строка с путём); изменения существующих — блоками `diff` относительно состояния после предыдущей задачи: блок можно сохранить во временный файл и применить `git apply <файл>` из корня репозитория. Блоки кода ограничены четырьмя обратными кавычками.
- Kotlin — официальный стиль; комментарии в коде — на английском. Имена тестов на устройстве — camelCase (D8 и `minSdk` 26), тестов JVM — в обратных кавычках.
- Каждая сборка печатает `[Incubating] Problems report is available at: …` и `Consider enabling configuration cache …` — это не ошибки; строки `Expected` их не упоминают.

## Review Focus

- **«Запланированные» и «сейчас».** Срок ровно в «сейчас» уже не впереди; срок в зоне, которой телефон не знает, читается в зоне телефона; «сейчас» берётся заново в начале каждой минуты, пока список открыт, и при возвращении к экрану (`delay` не считает время, пока телефон спит) — иначе прошедший срок не уходит из вкладки. `TaskListTest` (задача 2), `currentMinute` в `HomeScreen` (задача 4).
- **Поиск как в вебе.** Запрос без пробелов по краям и без учёта регистра (кириллица тоже); описание — как записано, вместе с разметкой Markdown; имя удалённой категории не ищется. Веб, когда в описании есть `<` или `&`, сначала разбирает его как HTML — это расхождение принято (спецификация, раздел 4). `TaskListTest` (задача 2), `ListFlowTest` (задача 4).
- **«Все категории» — это `null`.** Фильтр, в котором выбраны все существующие категории, пишется как `categoryIds: null` — иначе категории, созданные позже, были бы скрыты; удалённая категория выпадает из явного списка при следующем выборе. Панель фильтра строит каждое изменение на своём последнем, как веб: второе быстрое нажатие не отменяет первое, пока то едет через Firestore. `TaskListTest` (задача 2), `ListFlowTest` (задача 4) читает записанное тем же путём, что веб.
- **Место в длинном списке.** У владельца в «Активных» десятки задач — несколько экранов. `LazyColumn` с ключами строк держит на месте ту строку, что была первой: после смены сортировки список открылся бы с её нового места (при обратном порядке — с конца), а задача, которую другое устройство подняло наверх, оказалась бы выше экрана. Поэтому другая вкладка, сортировка или поиск начинают список сверху, а строки без ключей держат место по позиции, как список веба. `ListFlowTest` (задача 4): 15 задач, смена порядка, задача от «веба» наверху; без этой правки тест падает (проверено в черновике).
- **Отклонённая запись не теряется молча.** Экран записи не ждёт, поэтому отказ сервера приходит позже: `Writes` хранит его, пока экран не покажет сообщение. `WritesTest`, `RepositoriesTest` (задача 3: фильтр из 101 id правила отклоняют), `HomeScreenTest` (задача 4).

## Мелочи этапа 1

Спецификация (раздел 10) берёт в этап те мелочи этапа 1, что меняются вместе с его экранами и записями. В этот план вошли:

| Мелочь | Где |
|---|---|
| Срок в зоне, которой телефон не знает, — как записан и без «Просрочено» (ревью 1.3) | Задача 1: как в вебе — в зоне телефона (спецификация, 2.2 № 4) |
| `isValidTimeZone` принимает зоны-смещения (ревью 1.1) | Задача 1: только зоны базы (2.2 № 5). Зона для записи срока — в подплане 2.3, где телефон начинает писать `due.tz` |
| Дата «Mars trip» в `ListFlowTest` выглядит зависящей от часов (ревью 1.3) | Задача 1: срок явно в прошлом и комментарий |
| Нет таймера «Просрочено» (итог 1.3) | Задача 4: «сейчас» раз в минуту (2.2 № 9) |
| Состояние «данные не прочитаны» не рисует ни один тест (ревью 1.3) | Задача 4: `HomeScreenTest` |

## Структура файлов

| Файл | Ответственность |
|---|---|
| `android/core/src/main/kotlin/…/core/contract/Time.kt` | (изменение) `isValidTimeZone` — только зоны базы |
| `android/core/src/main/kotlin/…/core/model/TaskList.kt` | (новый, вместо `ActiveList.kt`) вкладки, поиск, фильтр, сортировка, числа, выбор панели фильтра, категории по порядку, срок и даты строки |
| `android/core/src/main/kotlin/…/core/model/Settings.kt` | (изменение) записи `ListFilter` и `ListSort` |
| `android/core/src/test/kotlin/…/core/model/TaskListTest.kt` | (новый, вместо `ActiveListTest.kt`) тесты правил списка |
| `android/app/src/main/kotlin/…/data/Documents.kt`, `Repositories.kt` | (изменение) запись сортировки и фильтра в `users/{uid}` |
| `android/app/src/main/kotlin/…/ui/Writes.kt` | (новый) записи экрана: не ждут сервера, отказ — в `failures` |
| `android/app/src/main/kotlin/…/ui/AppViewModel.kt` | (изменение) `setListSort`, `setListFilter`, `writeFailures` |
| `android/app/src/main/kotlin/…/ui/HomeScreen.kt` | (целиком) поиск, фильтр с панелью, сортировка, вкладки, строки с датами, сообщение об отказе записи |
| `android/app/src/main/kotlin/…/MainActivity.kt`, `ui/theme/Theme.kt` | (изменение) экран получает записи модели; зелёный цвет выполненной задачи |
| `android/app/src/main/res/drawable/ic_*.xml` | (новые) значки поиска, очистки, фильтра, стрелок сортировки и статусов |
| `android/app/src/main/res/values/strings.xml`, `values-uk/strings.xml` | (изменение) тексты вкладок, поиска, фильтра, сортировки, дат |
| `android/gradle/libs.versions.toml`, `android/app/build.gradle.kts` | (изменение) `ui-test-manifest` для тестов экрана |
| `android/app/src/test/kotlin/…/data/DocumentsTest.kt`, `ui/WritesTest.kt` | тесты JVM записи настроек и `Writes` |
| `android/app/src/androidTest/kotlin/…/RepositoriesTest.kt` | (изменение) запись сортировки и фильтра под настоящими правилами |
| `android/app/src/androidTest/kotlin/…/ListFlowTest.kt` | (целиком) вкладки, поиск, сортировка и фильтр как их читает веб, живое обновление, язык и тема, снимки |
| `android/app/src/androidTest/kotlin/…/HomeScreenTest.kt` | (новый) состояния экрана, которых не дают данные эмуляторов |
| `docs/android.md`, `CLAUDE.md` | (изменение) список с вкладками, сверка с вебом, ссылка на спецификацию этапа 2 |

Пакеты: `…` — это `com/pmobile78/todoround`.

---

### Task 1: Срок в зоне, которой телефон не знает

**Files:**
- Modify: `android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Time.kt`, `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/TimeTest.kt`, `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt`; Modify: `android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt` (тест на устройстве идёт в задаче 3)

**Interfaces:**
- Consumes: из 1.1 — `isValidTimeZone`, `toInstant`, `toLocal`, `Due`; из 1.3 — `DueView`, `dueView(due, zone, now)`.
- Produces (`com.pmobile78.todoround.core.model`): `fun dueMoment(due: Due, zone: String): Instant` — момент срока: `local` в его зоне, а в зоне, которой телефон не знает, — в зоне телефона [zone]; `dueView` берёт момент из неё. `isValidTimeZone(tz)` — `true` только для зон базы `ZoneId.getAvailableZoneIds()` длиной 1–64.

- [ ] **Step 1: Написать падающие тесты**

Зона-смещение (`+05:00`, `GMT+03:00`) — не зона базы, хотя `ZoneId.of` её принимает. Срок в незнакомой зоне теперь читается в зоне телефона: 09:30 по Берлину 23 октября 2026 года (CEST) — это 07:30 UTC, и ровно в этот момент срок ещё не прошёл.

Изменения в `android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/TimeTest.kt`:

````diff
diff --git a/android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/TimeTest.kt b/android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/TimeTest.kt
index c884527..9a3abfc 100644
--- a/android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/TimeTest.kt
+++ b/android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/TimeTest.kt
@@ -56,6 +56,14 @@ class TimeTest {
         assertFalse(isValidTimeZone(null))
     }
 
+    @Test
+    fun `isValidTimeZone takes the zones of the base, not offsets that ZoneId takes too`() {
+        assertTrue(isValidTimeZone("Etc/GMT-3"))
+        assertFalse(isValidTimeZone("+05:00"))
+        assertFalse(isValidTimeZone("GMT+03:00"))
+        assertFalse(isValidTimeZone("UTC+3"))
+    }
+
     @Test
     fun `toInstant refuses a malformed time and an unknown zone`() {
         assertThrows<IllegalArgumentException> { toInstant("2026-10-14 09:00", "UTC") }
````

Изменения в `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt`:

````diff
diff --git a/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt b/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt
index 7700124..8d87e8a 100644
--- a/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt
+++ b/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt
@@ -109,9 +109,13 @@ class ActiveListTest {
     }
 
     @Test
-    fun `a due zone this phone does not know is shown as written and never overdue`() {
+    fun `a due zone this phone does not know is read in the zone of the phone, as the web reads it`() {
+        // 09:30 in Berlin on 23 October 2026 (CEST, UTC+2) is 07:30 UTC.
         val due = Due("2026-10-23T09:30", "Mars/Olympus_Mons")
-        assertEquals(DueView("2026-10-23T09:30", overdue = false), dueView(due, "UTC", Instant.parse("2030-01-01T00:00:00Z")))
+        assertEquals(DueView("2026-10-23T09:30", overdue = false), dueView(due, "Europe/Berlin", Instant.parse("2026-10-23T07:30:00Z")))
+        assertEquals(DueView("2026-10-23T09:30", overdue = true), dueView(due, "Europe/Berlin", Instant.parse("2026-10-23T07:30:00.001Z")))
+        // An offset is not a zone of the base either.
+        assertEquals(Instant.parse("2026-10-23T09:30:00Z"), dueMoment(Due("2026-10-23T09:30", "+05:00"), "UTC"))
     }
 
     @Test
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/ActiveListTest.kt:118:61 Unresolved reference 'dueMoment'.`

- [ ] **Step 3: Зоны базы и срок в зоне телефона**

`ZoneId.getAvailableZoneIds()` строит новое множество при каждом вызове, поэтому оно читается один раз.

Изменения в `android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Time.kt`:

````diff
diff --git a/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Time.kt b/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Time.kt
index a0ffa17..2a72a34 100644
--- a/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Time.kt
+++ b/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Time.kt
@@ -32,16 +32,16 @@ fun parseLocal(local: Any?): LocalDateTime? {
 /** "YYYY-MM-DDTHH:mm" of a date and time; seconds are dropped. */
 fun formatLocal(dateTime: LocalDateTime): String = dateTime.truncatedTo(ChronoUnit.MINUTES).format(LOCAL_FORMAT)
 
-/** True when [tz] is a zone java.time knows, at most 64 characters long. */
-fun isValidTimeZone(tz: Any?): Boolean {
-    if (tz !is String || tz.isEmpty() || tz.length > 64) return false
-    return try {
-        ZoneId.of(tz)
-        true
-    } catch (e: DateTimeException) {
-        false
-    }
-}
+// The zones of the base, read once: getAvailableZoneIds() builds a new set on every call.
+private val KNOWN_ZONES: Set<String> by lazy { ZoneId.getAvailableZoneIds() }
+
+/**
+ * True when [tz] is a zone of the base of java.time, at most 64 characters long. Ids such as
+ * "GMT+03:00", which Android gives a zone set by hand and ZoneId.of takes too, are not: the web
+ * and the functions do not know them (stage 2 spec, 2.2 №5). Nor are "+05:00" and a name in
+ * another case, which the web's Intl does know; no client writes such zones.
+ */
+fun isValidTimeZone(tz: Any?): Boolean = tz is String && tz.length in 1..64 && tz in KNOWN_ZONES
 
 /** The instant of [local] in zone [tz]; throws on a malformed time or an unknown zone. */
 fun toInstant(local: String, tz: String): Instant {
````

Так читает срок веб (`bubbleModel.js`): `isValidTimeZone(due.tz) ? due.tz : deviceZone`. В вероятном случае — у телефона старая база, где есть `Europe/Kiev`, но нет `Europe/Kyiv`, — ответ точный (спецификация, 2.2 № 4).

Изменения в `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt`:

````diff
diff --git a/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt b/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt
index 03469d6..c528aaa 100644
--- a/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt
+++ b/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt
@@ -52,16 +52,19 @@ private fun listOrder(sort: ListSort, categories: Map<String, Category>): Compar
 /** A due as the list shows it: the date and time on this phone ("YYYY-MM-DDTHH:mm"), and whether its moment has passed. */
 data class DueView(val local: String, val overdue: Boolean)
 
-/**
- * [due] in [zone], the zone of this phone, at [now]. A due zone this phone does not know is shown
- * as written and is never overdue (spec 7): its moment is unknown here.
- */
+/** [due] in [zone], the zone of this phone, at [now]. */
 fun dueView(due: Due, zone: String, now: Instant): DueView {
-    if (!isValidTimeZone(due.tz)) return DueView(due.local, overdue = false)
-    val moment = toInstant(due.local, due.tz)
+    val moment = dueMoment(due, zone)
     return DueView(toLocal(moment, zone), overdue = moment < now)
 }
 
+/**
+ * The moment of [due]: its local time in its zone. A zone this phone does not know reads the time
+ * in [zone], the zone of this phone, as the web does (src/services/data/bubbleModel.js; stage 2
+ * spec, 2.2 №4).
+ */
+fun dueMoment(due: Due, zone: String): Instant = toInstant(due.local, if (isValidTimeZone(due.tz)) due.tz else zone)
+
 private val ENGLISH_DATE_TIME = DateTimeFormatter.ofPattern("MM/dd/uuuu, HH:mm", Locale.ROOT)
 private val UKRAINIAN_DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.uuuu, HH:mm", Locale.ROOT)
 
````

- [ ] **Step 4: Тесты проходят**

Run: `android/gradlew -p android :core:test`
Expected: `core tests: 97 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: «Mars trip» в тесте на устройстве**

Задача «Mars trip» в незнакомой зоне теперь просрочена, как в вебе. Её срок — явно в прошлом, чтобы строка не зависела от дня прогона; тест на устройстве проходит в задаче 3.

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt
index 413244c..d31a47e 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt
@@ -154,7 +154,8 @@ class ListFlowTest {
                 web.task(uid, "t1", "buy milk", "home", Due("2026-10-01T09:30", here))
                 web.task(uid, "t2", "Call the bank", "home", Due("2099-12-31T08:00", here))
                 web.task(uid, "t3", "Apples", null)
-                web.task(uid, "t4", "Mars trip", "gone", Due("2026-10-23T09:30", "Mars/Olympus_Mons"))
+                // A zone this phone does not know: the due is read in the zone of the phone, as the web reads it.
+                web.task(uid, "t4", "Mars trip", "gone", Due("2026-10-01T09:30", "Mars/Olympus_Mons"))
                 web.task(uid, "t5", "Report", "work")
                 web.task(uid, "t6", "Done before", "home", status = "done")
                 // The rules leave the elements of reminders to the clients; the core wants whole hours.
@@ -169,7 +170,7 @@ class ListFlowTest {
                 "Apples",
                 "buy milk|Due date: 10/01/2026, 09:30|Overdue|Home",
                 "Call the bank|Due date: 12/31/2099, 08:00|Home",
-                "Mars trip|Due date: 10/23/2026, 09:30|No Tag",
+                "Mars trip|Due date: 10/01/2026, 09:30|Overdue|No Tag",
             ),
         )
         compose.onNodeWithTag("count").assertTextEquals("Active Tasks (4)")
````

- [ ] **Step 6: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Time.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/contract/TimeTest.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt
git commit -F - <<'EOF'
feat(android): a due zone the phone does not know is read in its own zone, as on the web

Stage 2.1, task 1 (spec 2.2 No. 4, 5). dueMoment reads due.local in the
zone of the due, or in the zone of the phone when the phone does not know
it, as the web's bubbleModel.js does; dueView takes the moment from it, so
such a due shows in the phone's time and turns overdue. isValidTimeZone
takes only the zones of the base of java.time: GMT+03:00, the id Android
gives a zone set by hand, which ZoneId.of takes too, is unknown to the web
and the functions. ListFlowTest dates the Mars trip plainly in the past.
EOF
```

---

### Task 2: Вкладки, поиск, числа и фильтр в ядре

**Files:**
- Create (команда, если файла нет): `android/app/google-services.json` (вне git)
- Create: `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskList.kt`; Delete: `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskListTest.kt`; Delete: `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt`
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt` (новые функции вместо `activeList` до задачи 4)

**Interfaces:**
- Consumes: из 1.1 — `Task`, `Category`, `Due`, `ListFilter`, `ListSort`, `TaskStatus`, `SortField`, `SortOrder`, `Language`; `dueMoment`, `isValidTimeZone`, `toInstant`, `toLocal` (задача 1).
- Produces (`com.pmobile78.todoround.core.model`):
  - `enum class ListTab { ACTIVE, DONE, DELETED, PLANNED }` — порядок вкладок веба; `fun ListTab.holds(task: Task, zone: String, now: Instant): Boolean`;
  - `data class ListOptions(val tab: ListTab, val filter: ListFilter, val sort: ListSort, val query: String)`;
  - `fun matches(task: Task, category: Category?, query: String): Boolean`; `fun ListFilter.passes(category: Category?): Boolean`;
  - `fun tabTasks(tasks: List<Task>, categories: List<Category>, options: ListOptions, zone: String, now: Instant): List<Task>`;
  - `fun tabCounts(tasks, categories, filter: ListFilter, query: String, zone: String, now: Instant): Map<ListTab, Int>`;
  - `fun filterCounts(tasks, categories, tab: ListTab, query: String, zone: String, now: Instant): Map<String?, Int>` — по id категории, `null` — без категории или с удалённой;
  - `val SHOW_ALL`, `val SHOW_NONE` («Выбрать все», «Очистить»); `fun ListFilter.chosen(categories): List<String>`; `fun ListFilter.toggled(categoryId: String, categories): ListFilter`; `fun ListFilter.toggledUncategorized(): ListFilter`; `fun ListFilter.hidesSome(categories): Boolean`;
  - `fun inOrder(categories: List<Category>): List<Category>` — по `order`, при равенстве по id;
  - `DueView`, `dueView`, `dueMoment` (из `ActiveList.kt`); `fun Task.changedAfterCreation(): Boolean`; `fun listDateTime(local: String, language: Language): String` и `fun listDateTime(moment: Instant, zone: String, language: Language): String`.

- [ ] **Step 1: Настройки Firebase этой машины**

`app` не собирается без `google-services.json`. Файл вне git: в копии, где приложение уже собирали, он есть; иначе его скачивает Firebase CLI (вход в CLI — аккаунт владельца, как у веба):

```bash
test -f android/app/google-services.json || firebase apps:sdkconfig ANDROID 1:699564548059:android:9246f56b0bf422d85fd1fe --project todo-flutter-fb8bf -o android/app/google-services.json
git status --short --ignored android/app
```

Expected: в выводе `git status` есть строка `!! android/app/google-services.json` (в копии, где приложение уже собирали, есть и `!! android/app/build/`).

- [ ] **Step 2: Написать падающие тесты**

`TaskListTest` заменяет `ActiveListTest`: его примеры сортировки, фильтра и срока остаются, к ним добавлены вкладки, поиск, числа и выбор панели фильтра. Каждый пример повторяет правило веба: «Запланированные» — `isPlannedTask` (`bubbleStatus.js`), поиск — `useSearch.js`, числа вкладок — `getTasksCountByStatus` (`TaskList.jsx`), числа панели — `countBubblesByTagForListView` (`listVisibility.js`), выбор панели — `selectedTagIds`, `toggleTagInFilter` и `categoryIdsFor` (`settingsView.js`, `useBubbleFilters.js`), порядок категорий — `sortCategories` (`categories.js`).

Файл `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskListTest.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.Instant

/** The task list of the web (src/components/TaskList.jsx), on its own examples. */
class TaskListTest {
    private val home = Category("c1", "home", "#46a549", 1.0)
    private val work = Category("c2", "Work", "#da3833", 2.0)
    private val categories = listOf(home, work)
    private val byTitle = ListSort(SortField.TITLE, SortOrder.ASC)
    private val now = Instant.parse("2026-10-24T12:00:00Z")

    private fun task(
        id: String,
        title: String = "Task $id",
        categoryId: String? = null,
        status: TaskStatus = TaskStatus.ACTIVE,
        due: Due? = null,
        description: String = "",
        createdAt: String = "2026-10-01T08:00:00Z",
        updatedAt: String = createdAt,
    ) = Task(
        id = id,
        title = title,
        description = description,
        categoryId = categoryId,
        status = status,
        due = due,
        reminders = emptyList(),
        repeat = null,
        radius = 45,
        pulseMuted = false,
        createdAt = Instant.parse(createdAt),
        updatedAt = Instant.parse(updatedAt),
        deletedAt = if (status == TaskStatus.DELETED) Instant.parse(updatedAt) else null,
    )

    private fun ids(
        tasks: List<Task>,
        tab: ListTab = ListTab.ACTIVE,
        filter: ListFilter = SHOW_ALL,
        sort: ListSort = byTitle,
        query: String = "",
    ): List<String> = tabTasks(tasks, categories, ListOptions(tab, filter, sort, query), "UTC", now).map { it.id }

    @Test
    fun `each tab holds the tasks of its status, the planned one the active tasks whose due is still ahead`() {
        val tasks = listOf(
            task("a"),
            task("b", status = TaskStatus.DONE),
            task("c", status = TaskStatus.DELETED),
            task("d", due = Due("2026-10-24T12:01", "UTC")),
            task("e", due = Due("2026-10-24T12:00", "UTC")),
            task("f", status = TaskStatus.DONE, due = Due("2099-01-01T09:00", "UTC")),
        )
        assertEquals(listOf("a", "d", "e"), ids(tasks))
        assertEquals(listOf("b", "f"), ids(tasks, ListTab.DONE))
        assertEquals(listOf("c"), ids(tasks, ListTab.DELETED))
        // A due at this very moment is no longer ahead.
        assertEquals(listOf("d"), ids(tasks, ListTab.PLANNED))
    }

    @Test
    fun `a planned due in a zone the phone does not know is read in the zone of the phone`() {
        // 12:30 in an unknown zone reads as 12:30 in Berlin, 10:30 UTC: already passed at 12:00 UTC.
        val tasks = listOf(task("a", due = Due("2026-10-24T12:30", "Mars/Olympus_Mons")))
        assertEquals(emptyList<String>(), tabTasks(tasks, categories, ListOptions(ListTab.PLANNED, SHOW_ALL, byTitle, ""), "Europe/Berlin", now))
        assertEquals(tasks, tabTasks(tasks, categories, ListOptions(ListTab.PLANNED, SHOW_ALL, byTitle, ""), "UTC", now))
    }

    @Test
    fun `the filter shows the chosen categories and, when asked, the tasks without one`() {
        val tasks = listOf(task("a", categoryId = "c1"), task("b", categoryId = "c2"), task("c"), task("d", categoryId = "gone"))
        assertEquals(listOf("a", "b", "c", "d"), ids(tasks))
        assertEquals(listOf("a", "b"), ids(tasks, filter = ListFilter(categoryIds = null, showUncategorized = false)))
        assertEquals(listOf("a"), ids(tasks, filter = ListFilter(listOf("c1"), showUncategorized = false)))
        assertEquals(listOf("a", "c", "d"), ids(tasks, filter = ListFilter(listOf("c1"), showUncategorized = true)))
        // A task whose category is gone counts as one without a category, even when the filter names it.
        assertEquals(emptyList<String>(), ids(tasks, filter = ListFilter(listOf("gone"), showUncategorized = false)))
        assertEquals(emptyList<String>(), ids(tasks, filter = SHOW_NONE))
    }

    @Test
    fun `the search looks without case in the title, the description and the name of an existing category`() {
        val tasks = listOf(
            task("a", "Buy MILK"),
            task("b", description = "- [ ] milk\n- [x] bread"),
            task("c", categoryId = "c1"),
            task("d", categoryId = "gone", description = "home made"),
            task("e", "Яблука"),
        )
        assertEquals(listOf("a", "b"), ids(tasks, query = "  Milk "))
        assertEquals(listOf("c", "d"), ids(tasks, query = "HOME"))
        assertEquals(listOf("e"), ids(tasks, query = "яблук"))
        // The description is searched as written, its Markdown included.
        assertEquals(listOf("b"), ids(tasks, query = "[x] bread"))
        assertEquals(listOf("a", "b", "c", "d", "e"), ids(tasks, query = "   "))
        assertEquals(emptyList<String>(), ids(tasks, query = "work"))
    }

    @Test
    fun `titles are compared without case`() {
        val tasks = listOf(task("1", "banana"), task("2", "Cherry"), task("3", "apple"), task("4", "Яблуко"), task("5", "вишня"))
        assertEquals(listOf("3", "1", "2", "5", "4"), ids(tasks))
        assertEquals(listOf("4", "5", "2", "1", "3"), ids(tasks, sort = ListSort(SortField.TITLE, SortOrder.DESC)))
    }

    @Test
    fun `categories are compared by name without case, a task without one first`() {
        val tasks = listOf(task("w", categoryId = "c2"), task("h", categoryId = "c1"), task("n"), task("g", categoryId = "gone"))
        assertEquals(listOf("g", "n", "h", "w"), ids(tasks, sort = ListSort(SortField.CATEGORY, SortOrder.ASC)))
        assertEquals(listOf("w", "h", "g", "n"), ids(tasks, sort = ListSort(SortField.CATEGORY, SortOrder.DESC)))
    }

    @Test
    fun `times are compared to the millisecond, as the web's Date`() {
        val tasks = listOf(
            task("b", updatedAt = "2026-10-01T08:00:00.123999Z"),
            task("a", updatedAt = "2026-10-01T08:00:00.123001Z"),
            task("c", updatedAt = "2026-10-01T08:00:00.124Z"),
            task("d", createdAt = "2026-09-01T08:00:00Z", updatedAt = "2026-10-02T08:00:00Z"),
        )
        // a and b fall on the same millisecond: a tie, which the ids decide.
        assertEquals(listOf("d", "c", "a", "b"), ids(tasks, sort = ListSort(SortField.UPDATED_AT, SortOrder.DESC)))
        assertEquals(listOf("d", "a", "b", "c"), ids(tasks, sort = ListSort(SortField.CREATED_AT, SortOrder.ASC)))
    }

    @Test
    fun `a tie keeps the order of the document ids in both directions`() {
        val tasks = listOf(task("b", "Same"), task("c", "same"), task("a", "SAME"))
        assertEquals(listOf("a", "b", "c"), ids(tasks, sort = ListSort(SortField.TITLE, SortOrder.ASC)))
        assertEquals(listOf("a", "b", "c"), ids(tasks, sort = ListSort(SortField.TITLE, SortOrder.DESC)))
    }

    @Test
    fun `the number of a tab counts its tasks that the filter and the search let through`() {
        val tasks = listOf(
            task("a", "milk", categoryId = "c1"),
            task("b", "milk", categoryId = "c2"),
            task("c", "bread"),
            task("d", "milk", status = TaskStatus.DONE),
            task("e", "milk", status = TaskStatus.DELETED, categoryId = "c1"),
            task("f", "milk", due = Due("2099-01-01T09:00", "UTC")),
        )
        val all = mapOf(ListTab.ACTIVE to 4, ListTab.DONE to 1, ListTab.DELETED to 1, ListTab.PLANNED to 1)
        assertEquals(all, tabCounts(tasks, categories, SHOW_ALL, "", "UTC", now))
        val milkAtHomeOrWithout = mapOf(ListTab.ACTIVE to 2, ListTab.DONE to 1, ListTab.DELETED to 1, ListTab.PLANNED to 1)
        assertEquals(milkAtHomeOrWithout, tabCounts(tasks, categories, ListFilter(listOf("c1"), true), "MILK", "UTC", now))
    }

    @Test
    fun `the filter panel counts the tasks of the tab and the search by category, a gone one among those without`() {
        val tasks = listOf(
            task("a", "milk", categoryId = "c1"),
            task("b", "bread", categoryId = "c1"),
            task("c", "milk"),
            task("d", "milk", categoryId = "gone"),
            task("e", "milk", categoryId = "c2", status = TaskStatus.DONE),
        )
        assertEquals(mapOf("c1" to 2, null to 2), filterCounts(tasks, categories, ListTab.ACTIVE, "", "UTC", now))
        assertEquals(mapOf("c1" to 1, null to 2), filterCounts(tasks, categories, ListTab.ACTIVE, "milk", "UTC", now))
        assertEquals(mapOf("c2" to 1), filterCounts(tasks, categories, ListTab.DONE, "milk", "UTC", now))
    }

    @Test
    fun `the panel shows every category chosen for null and drops a gone one from a list`() {
        assertEquals(listOf("c1", "c2"), SHOW_ALL.chosen(categories))
        assertEquals(listOf("c2", "c1"), ListFilter(listOf("c2", "gone", "c1"), true).chosen(categories))
        assertEquals(emptyList<String>(), SHOW_NONE.chosen(categories))
    }

    @Test
    fun `a category is chosen and unchosen, and every category chosen is null again`() {
        val withoutWork = SHOW_ALL.toggled("c2", categories)
        assertEquals(ListFilter(listOf("c1"), true), withoutWork)
        assertEquals(SHOW_ALL, withoutWork.toggled("c2", categories))
        // A gone category drops out of the list when another one is toggled.
        assertEquals(ListFilter(listOf("c1"), false), ListFilter(listOf("gone"), false).toggled("c1", categories))
        assertEquals(ListFilter(null, false), ListFilter(listOf("gone", "c1"), false).toggled("c2", categories))
        assertEquals(ListFilter(listOf("c1"), true), ListFilter(listOf("c1"), false).toggledUncategorized())
    }

    @Test
    fun `the filter hides some tasks when a category or the tasks without one are not chosen`() {
        assertFalse(SHOW_ALL.hidesSome(categories))
        assertFalse(ListFilter(listOf("c2", "c1", "gone"), true).hidesSome(categories))
        assertTrue(ListFilter(listOf("c1"), true).hidesSome(categories))
        assertTrue(ListFilter(null, false).hidesSome(categories))
        assertFalse(ListFilter(emptyList(), true).hidesSome(emptyList()))
    }

    @Test
    fun `categories go by their order, a tie by id`() {
        val a = Category("b", "B", "#46a549", 2.0)
        val b = Category("a", "A", "#da3833", 2.0)
        val c = Category("c", "C", "#fd8b2b", 1.5)
        assertEquals(listOf(c, b, a), inOrder(listOf(a, b, c)))
    }

    @Test
    fun `a due shows in the zone of the phone and is overdue once its moment has passed`() {
        // 09:30 in New York on 23 October 2026 (EDT, UTC−4) is 13:30 UTC.
        val due = Due("2026-10-23T09:30", "America/New_York")
        assertEquals(DueView("2026-10-23T13:30", overdue = false), dueView(due, "UTC", Instant.parse("2026-10-23T13:30:00Z")))
        assertEquals(DueView("2026-10-23T15:30", overdue = true), dueView(due, "Europe/Berlin", Instant.parse("2026-10-23T13:30:00.001Z")))
    }

    @Test
    fun `a due zone this phone does not know is read in the zone of the phone, as the web reads it`() {
        // 09:30 in Berlin on 23 October 2026 (CEST, UTC+2) is 07:30 UTC.
        val due = Due("2026-10-23T09:30", "Mars/Olympus_Mons")
        assertEquals(DueView("2026-10-23T09:30", overdue = false), dueView(due, "Europe/Berlin", Instant.parse("2026-10-23T07:30:00Z")))
        assertEquals(DueView("2026-10-23T09:30", overdue = true), dueView(due, "Europe/Berlin", Instant.parse("2026-10-23T07:30:00.001Z")))
        // An offset is not a zone of the base either.
        assertEquals(Instant.parse("2026-10-23T09:30:00Z"), dueMoment(Due("2026-10-23T09:30", "+05:00"), "UTC"))
    }

    @Test
    fun `dates are written as the web's list writes them`() {
        assertEquals("10/23/2026, 09:30", listDateTime("2026-10-23T09:30", Language.EN))
        assertEquals("23.10.2026, 09:30", listDateTime("2026-10-23T09:30", Language.UK))
        assertEquals("01/02/2026, 00:05", listDateTime("2026-01-02T00:05", Language.EN))
        assertEquals("23.10.2026, 11:30", listDateTime(Instant.parse("2026-10-23T09:30:59Z"), "Europe/Berlin", Language.UK))
    }

    @Test
    fun `a task counts as changed when its times differ by a millisecond or more`() {
        assertFalse(task("a", updatedAt = "2026-10-01T08:00:00.000999Z").changedAfterCreation())
        assertTrue(task("a", updatedAt = "2026-10-01T08:00:00.001Z").changedAfterCreation())
    }
}
````

Старый тест удалить (`git add` в шаге 6 запишет удаление):

```bash
rm android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt
```

- [ ] **Step 3: Тест падает**

Run: `android/gradlew -p android :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/TaskListTest.kt:48:14 Unresolved reference 'ListTab'.`

- [ ] **Step 4: `TaskList.kt` и список этапа 1 на новых функциях**

`TaskList.kt` вбирает `ActiveList.kt`: порядок задач (`listOrder`), срок и даты строки — те же, что в 1.3 и задаче 1. Числа вкладок считают задачи, которые пропускают фильтр и поиск, каждой вкладки; числа панели — задачи выбранной вкладки и поиска по категориям. Выбор панели повторяет веб: для `null` выбраны все существующие категории по порядку; из явного списка удалённая категория выпадает; выбранные все — снова `null`. «Фильтр что-то скрывает» — по смыслу (спецификация, 2.2 № 7): веб без категорий подсвечивает кнопку всегда, приложение — нет.

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskList.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.isValidTimeZone
import com.pmobile78.todoround.core.contract.toInstant
import com.pmobile78.todoround.core.contract.toLocal
import java.time.Instant
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/*
 * The task list of the web (src/components/TaskList.jsx; stage 2 spec, section 4): its tabs, the
 * saved filter and sort, the search, the numbers of the tabs and of the filter panel, and how the
 * list writes a due and a date.
 */

/** The tabs of the web's list, in its order. */
enum class ListTab { ACTIVE, DONE, DELETED, PLANNED }

/** What the list shows: a [tab], the saved [filter] and [sort], and the search [query] as typed. */
data class ListOptions(val tab: ListTab, val filter: ListFilter, val sort: ListSort, val query: String)

/**
 * Whether [task] belongs to this tab at [now]; [zone] is the zone of the phone. "Planned" holds
 * the active tasks whose due is still ahead (src/utils/bubbleStatus.js).
 */
fun ListTab.holds(task: Task, zone: String, now: Instant): Boolean = when (this) {
    ListTab.ACTIVE -> task.status == TaskStatus.ACTIVE
    ListTab.DONE -> task.status == TaskStatus.DONE
    ListTab.DELETED -> task.status == TaskStatus.DELETED
    ListTab.PLANNED -> task.status == TaskStatus.ACTIVE && task.due != null && dueMoment(task.due, zone) > now
}

/**
 * Whether [task] matches the search [query] as in the web's useSearch.js: the query without the
 * spaces around it and without case, in the title, in the description or in the name of its
 * [category]; an empty query matches every task. The web reads a description with "<" or "&" as
 * HTML first, the phone reads it as written (stage 2 spec, section 4).
 */
fun matches(task: Task, category: Category?, query: String): Boolean {
    val text = query.trim().lowercase()
    return text.isEmpty() ||
        text in task.title.lowercase() ||
        text in task.description.lowercase() ||
        category != null && text in category.name.lowercase()
}

/** Whether this filter lets through a task of [category]: null when it has none or it is gone. */
fun ListFilter.passes(category: Category?): Boolean =
    if (category == null) showUncategorized else categoryIds == null || category.id in categoryIds

/**
 * The tasks of the tab of [options] that its filter and search let through, in the order of its
 * sort. A task whose category is not among [categories] counts as one without a category.
 */
fun tabTasks(tasks: List<Task>, categories: List<Category>, options: ListOptions, zone: String, now: Instant): List<Task> {
    val known = categories.associateBy { it.id }
    return tasks
        .filter { task ->
            val category = task.categoryId?.let(known::get)
            options.tab.holds(task, zone, now) && options.filter.passes(category) && matches(task, category, options.query)
        }
        .sortedWith(listOrder(options.sort, known))
}

/** The number in the name of each tab: its tasks that [filter] and [query] let through (getTasksCountByStatus). */
fun tabCounts(
    tasks: List<Task>,
    categories: List<Category>,
    filter: ListFilter,
    query: String,
    zone: String,
    now: Instant,
): Map<ListTab, Int> {
    val known = categories.associateBy { it.id }
    val shown = tasks.filter { task ->
        val category = task.categoryId?.let(known::get)
        filter.passes(category) && matches(task, category, query)
    }
    return ListTab.entries.associateWith { tab -> shown.count { tab.holds(it, zone, now) } }
}

/**
 * The numbers of the filter panel: the tasks of [tab] that [query] lets through, by the id of
 * their category, and under null those without a category or with one that is gone
 * (countBubblesByTagForListView of src/utils/listVisibility.js).
 */
fun filterCounts(
    tasks: List<Task>,
    categories: List<Category>,
    tab: ListTab,
    query: String,
    zone: String,
    now: Instant,
): Map<String?, Int> {
    val known = categories.associateBy { it.id }
    return tasks
        .filter { task -> tab.holds(task, zone, now) && matches(task, task.categoryId?.let(known::get), query) }
        .groupingBy { task -> task.categoryId?.takeIf { it in known } }
        .eachCount()
}

// As the web compares: names without case (toLowerCase of JavaScript), times to the millisecond
// (Date). A tie keeps the order of the document ids, in which the web lists the tasks after a page
// load, whichever the direction. Ids compare as UTF-16 here and as UTF-8 in Firestore: the same
// order for ASCII ids, as the automatic ones and those of v1 are.
private fun listOrder(sort: ListSort, categories: Map<String, Category>): Comparator<Task> {
    val by: Comparator<Task> = when (sort.by) {
        SortField.TITLE -> compareBy { it.title.lowercase() }
        SortField.CATEGORY -> compareBy { task -> task.categoryId?.let(categories::get)?.name?.lowercase().orEmpty() }
        SortField.UPDATED_AT -> compareBy { it.updatedAt.toEpochMilli() }
        SortField.CREATED_AT -> compareBy { it.createdAt.toEpochMilli() }
    }
    return (if (sort.order == SortOrder.ASC) by else by.reversed()).thenBy { it.id }
}

/** The filter that shows every task: every category and the tasks without one ("Select All"). */
val SHOW_ALL = ListFilter(categoryIds = null, showUncategorized = true)

/** The filter that shows no task ("Clear All"). */
val SHOW_NONE = ListFilter(categoryIds = emptyList(), showUncategorized = false)

/**
 * The categories the filter panel shows as chosen: every one of [categories] for null, in their
 * order; of a list, those that still exist, in its order (selectedTagIds of src/state/settingsView.js).
 */
fun ListFilter.chosen(categories: List<Category>): List<String> {
    val ids = categories.map { it.id }
    return categoryIds?.filter { it in ids } ?: ids
}

/**
 * This filter with [categoryId] chosen or not. With every category chosen, the filter keeps null,
 * so that categories made later show too (toggleTagInFilter and categoryIdsFor of the web).
 */
fun ListFilter.toggled(categoryId: String, categories: List<Category>): ListFilter {
    val current = chosen(categories)
    val next = if (categoryId in current) current.filter { it != categoryId } else current + categoryId
    return copy(categoryIds = if (categories.isNotEmpty() && categories.all { it.id in next }) null else next)
}

/** This filter with the tasks without a category shown or not. */
fun ListFilter.toggledUncategorized(): ListFilter = copy(showUncategorized = !showUncategorized)

/** Whether this filter hides some tasks: those of a category not chosen, or those without one. */
fun ListFilter.hidesSome(categories: List<Category>): Boolean =
    !showUncategorized || categoryIds != null && categories.any { it.id !in categoryIds }

/** [categories] by their order, a tie by id, as every device shows them (sortCategories of the web). */
fun inOrder(categories: List<Category>): List<Category> = categories.sortedWith(compareBy<Category> { it.order }.thenBy { it.id })

/** A due as the list shows it: the date and time on this phone ("YYYY-MM-DDTHH:mm"), and whether its moment has passed. */
data class DueView(val local: String, val overdue: Boolean)

/** [due] in [zone], the zone of this phone, at [now]. */
fun dueView(due: Due, zone: String, now: Instant): DueView {
    val moment = dueMoment(due, zone)
    return DueView(toLocal(moment, zone), overdue = moment < now)
}

/**
 * The moment of [due]: its local time in its zone. A zone this phone does not know reads the time
 * in [zone], the zone of this phone, as the web does (src/services/data/bubbleModel.js; stage 2
 * spec, 2.2 №4).
 */
fun dueMoment(due: Due, zone: String): Instant = toInstant(due.local, if (isValidTimeZone(due.tz)) due.tz else zone)

/** Whether the task was changed after it was made: the web shows "Updated" then, comparing the times to the millisecond. */
fun Task.changedAfterCreation(): Boolean = updatedAt.toEpochMilli() != createdAt.toEpochMilli()

private val ENGLISH_DATE_TIME = DateTimeFormatter.ofPattern("MM/dd/uuuu, HH:mm", Locale.ROOT)
private val UKRAINIAN_DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.uuuu, HH:mm", Locale.ROOT)

/** [local] ("YYYY-MM-DDTHH:mm") as the web's list writes it: "10/23/2026, 09:30" in English, "23.10.2026, 09:30" in Ukrainian. */
fun listDateTime(local: String, language: Language): String =
    LocalDateTime.parse(local).format(
        when (language) {
            Language.EN -> ENGLISH_DATE_TIME
            Language.UK -> UKRAINIAN_DATE_TIME
        },
    )

/** A time of a record, such as createdAt, as the list writes it in [zone], the zone of this phone. */
fun listDateTime(moment: Instant, zone: String, language: Language): String = listDateTime(toLocal(moment, zone), language)
````

```bash
rm android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt
```

`HomeScreen` до задачи 4 показывает ту же вкладку «Активные» через новые функции:

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
index 1c30908..959ee3a 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
@@ -46,11 +46,14 @@ import com.pmobile78.todoround.R
 import com.pmobile78.todoround.core.contract.Language
 import com.pmobile78.todoround.core.contract.deviceTimeZone
 import com.pmobile78.todoround.core.model.Category
+import com.pmobile78.todoround.core.model.ListOptions
+import com.pmobile78.todoround.core.model.ListTab
 import com.pmobile78.todoround.core.model.Task
-import com.pmobile78.todoround.core.model.activeList
 import com.pmobile78.todoround.core.model.defaultSettings
 import com.pmobile78.todoround.core.model.dueView
+import com.pmobile78.todoround.core.model.holds
 import com.pmobile78.todoround.core.model.listDateTime
+import com.pmobile78.todoround.core.model.tabTasks
 import com.pmobile78.todoround.data.Loaded
 import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
 import java.time.Instant
@@ -129,11 +132,13 @@ fun HomeScreen(session: Session.SignedIn, onSignOut: () -> Unit) {
 @Composable
 private fun TaskList(data: UserData) {
     val settings = data.settings
-    val list = remember(data) { activeList(data.tasks.items, data.categories.items, settings.listFilter, settings.listSort) }
-    val categories = remember(data) { data.categories.items.associateBy { it.id } }
-    val invalid = data.tasks.invalid + data.categories.invalid
     val zone = deviceTimeZone()
     val now = Instant.now()
+    val options = ListOptions(ListTab.ACTIVE, settings.listFilter, settings.listSort, query = "")
+    val tasks = remember(data) { tabTasks(data.tasks.items, data.categories.items, options, zone, now) }
+    val all = remember(data) { data.tasks.items.count { ListTab.ACTIVE.holds(it, zone, now) } }
+    val categories = remember(data) { data.categories.items.associateBy { it.id } }
+    val invalid = data.tasks.invalid + data.categories.invalid
     LazyColumn(
         modifier = Modifier.fillMaxSize(),
         contentPadding = PaddingValues(16.dp),
@@ -142,20 +147,20 @@ private fun TaskList(data: UserData) {
         item {
             Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                 Text(
-                    text = stringResource(R.string.list_count, list.tasks.size),
+                    text = stringResource(R.string.list_count, tasks.size),
                     style = MaterialTheme.typography.titleMedium,
                     modifier = Modifier.testTag("count"),
                 )
                 val quiet = MaterialTheme.colorScheme.onSurfaceVariant
-                if (list.tasks.size < list.all) Note(stringResource(R.string.list_shown, list.tasks.size, list.all), quiet, "shown")
+                if (tasks.size < all) Note(stringResource(R.string.list_shown, tasks.size, all), quiet, "shown")
                 if (invalid > 0) Note(stringResource(R.string.list_invalid, invalid), MaterialTheme.colorScheme.error, "invalid")
                 if (data.tasks.fromCache || data.categories.fromCache) Note(stringResource(R.string.list_offline), quiet, "offline")
             }
         }
-        if (list.tasks.isEmpty()) {
+        if (tasks.isEmpty()) {
             item { Note(stringResource(R.string.list_empty), MaterialTheme.colorScheme.onSurfaceVariant, "empty") }
         }
-        items(list.tasks, key = { it.id }) { task ->
+        items(tasks, key = { it.id }) { task ->
             TaskRow(task, task.categoryId?.let(categories::get), settings.language, zone, now)
         }
     }
````

- [ ] **Step 5: Тесты и Lint**

Run: `android/gradlew -p android check` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `core tests: 106 passed, 0 failed, 0 skipped`, `app debug tests: 22 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.`

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskList.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskListTest.kt
git commit -F - <<'EOF'
feat(android): the tabs, the search, the numbers and the filter of the web's list in core

Stage 2.1, task 2 (spec section 4). TaskList.kt replaces ActiveList.kt:
the tabs Active, Done, Deleted and Planned (an active task whose due is
still ahead), the search in the title, the description and the name of
the category, the numbers of the tabs and of the filter panel, the choice
of the panel kept as the web keeps it (every category chosen is null),
and the categories in their order. On 400 random cases the rules give
what the web's TaskList.jsx gives (a check of the draft, not committed).
HomeScreen shows the Active tab with the new functions until task 4.
EOF
```

---

### Task 3: Запись сортировки и фильтра

**Files:**
- Modify: `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Settings.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`
- Create: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Writes.kt`
- Test: `android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt` (изменение), `android/app/src/test/kotlin/com/pmobile78/todoround/ui/WritesTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt` (изменение)

**Interfaces:**
- Consumes: `ListFilter`, `ListSort`, `Settings.toRecord()` из 1.1; `SettingsRepository`, `AppViewModel` из 1.2; помощники тестов `emulatorBackend()`, `signUpNewUser()`, `fromServer()`.
- Produces:
  - `com.pmobile78.todoround.core.model`: `fun ListFilter.toRecord(): Map<String, Any?>`, `fun ListSort.toRecord(): Map<String, Any?>`;
  - `com.pmobile78.todoround.data`: `fun listSortUpdate(sort: ListSort): Map<String, Any?>`, `fun listFilterUpdate(filter: ListFilter): Map<String, Any?>` — `{ "settings.<ключ>": значение, "updatedAt": время сервера }`; `SettingsRepository.setListSort(uid: String, sort: ListSort)` и `setListFilter(uid: String, filter: ListFilter)` — `suspend`, возвращаются, когда сервер принял запись, отказ бросают;
  - `com.pmobile78.todoround.ui`: `class Writes(scope: CoroutineScope)` с `val failures: Flow<Unit>` и `fun launch(write: suspend () -> Unit)`; `AppViewModel.setListSort(sort: ListSort)`, `setListFilter(filter: ListFilter)`, `val writeFailures: Flow<Unit>`.

- [ ] **Step 1: Написать падающие тесты**

Запись повторяет `settingsUpdateData` веба: одна настройка по пути поля и `updatedAt` сервера — так два устройства не затирают чужие изменения других настроек (контракт, 3.5). Все категории — `null`, а не список.

Изменения в `android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt`:

````diff
diff --git a/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt b/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
index e05128f..f604331 100644
--- a/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
+++ b/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
@@ -12,6 +12,7 @@ import com.pmobile78.todoround.core.contract.ThemeMode
 import com.pmobile78.todoround.core.contract.validateTask
 import com.pmobile78.todoround.core.model.Category
 import com.pmobile78.todoround.core.model.Due
+import com.pmobile78.todoround.core.model.ListFilter
 import com.pmobile78.todoround.core.model.ListSort
 import com.pmobile78.todoround.core.model.Repeat
 import com.pmobile78.todoround.core.model.Task
@@ -167,4 +168,24 @@ class DocumentsTest {
             newUserDoc(settings),
         )
     }
+
+    @Test
+    fun `the list's sort and filter are written as the web's updateSettings writes them`() {
+        assertEquals(
+            mapOf("settings.listSort" to mapOf("by" to "category", "order" to "asc"), "updatedAt" to FieldValue.serverTimestamp()),
+            listSortUpdate(ListSort(SortField.CATEGORY, SortOrder.ASC)),
+        )
+        assertEquals(
+            mapOf(
+                "settings.listFilter" to mapOf("categoryIds" to listOf("c2", "c1"), "showUncategorized" to false),
+                "updatedAt" to FieldValue.serverTimestamp(),
+            ),
+            listFilterUpdate(ListFilter(listOf("c2", "c1"), showUncategorized = false)),
+        )
+        // Every category is null, not a list.
+        assertEquals(
+            mapOf("categoryIds" to null, "showUncategorized" to true),
+            listFilterUpdate(ListFilter(null, showUncategorized = true))["settings.listFilter"],
+        )
+    }
 }
````

`Writes`: запись, которую отклонил сервер, приходит в `failures`; удачная — нет; запись, отменённая вместе с экраном, — не отказ.

Файл `android/app/src/test/kotlin/com/pmobile78/todoround/ui/WritesTest.kt`:

````kotlin
package com.pmobile78.todoround.ui

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class WritesTest {
    @Test
    fun `a write the server refuses comes out of the failures, a done write does not`() = runBlocking {
        val writes = Writes(this)
        var done = false
        writes.launch { done = true }
        writes.launch { throw IllegalStateException("PERMISSION_DENIED") }

        assertEquals(Unit, withTimeout(5_000) { writes.failures.first() })
        assertTrue(done)
        assertNull(withTimeoutOrNull(200) { writes.failures.first() })
    }

    @Test
    fun `a write cancelled with its screen is not a failure`() = runBlocking {
        val scope = CoroutineScope(Job())
        val writes = Writes(scope)
        writes.launch { awaitCancellation() }
        scope.cancel()

        assertNull(withTimeoutOrNull(200) { writes.failures.first() })
    }
}
````

На устройстве — под настоящими правилами: записанное читается с сервера в том виде, в каком его пишет веб, остальные настройки не меняются, а фильтр из 101 id правила отклоняют (`categoryIds.size() <= 100`) — отказ доходит до вызывающего.

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt
index e63a947..1b42312 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt
@@ -5,9 +5,13 @@ import com.google.firebase.Timestamp
 import com.google.firebase.firestore.FieldValue
 import com.google.firebase.firestore.FirebaseFirestoreException
 import com.pmobile78.todoround.core.contract.Language
+import com.pmobile78.todoround.core.contract.SortField
+import com.pmobile78.todoround.core.contract.SortOrder
 import com.pmobile78.todoround.core.contract.TaskStatus
 import com.pmobile78.todoround.core.model.Category
 import com.pmobile78.todoround.core.model.Due
+import com.pmobile78.todoround.core.model.ListFilter
+import com.pmobile78.todoround.core.model.ListSort
 import com.pmobile78.todoround.core.model.defaultSettings
 import com.pmobile78.todoround.core.model.toRecord
 import com.pmobile78.todoround.data.CategoriesRepository
@@ -137,6 +141,51 @@ class RepositoriesTest {
         }
     }
 
+    @Test
+    fun theSortAndTheFilterOfTheListAreWrittenAsTheWebWritesThem() = runBlocking {
+        withTimeout(60_000) {
+            val uid = backend.signUpNewUser()
+            val settings = SettingsRepository(backend.db)
+            settings.settings(uid, "en").filterNotNull().first()
+            backend.db.document("users/$uid").fromServer()
+
+            settings.setListSort(uid, ListSort(SortField.CATEGORY, SortOrder.ASC))
+            settings.setListFilter(uid, ListFilter(listOf("c2", "c1"), showUncategorized = false))
+            val written = backend.db.document("users/$uid").fromServer()
+            assertEquals(mapOf("by" to "category", "order" to "asc"), written.get("settings.listSort"))
+            assertEquals(mapOf("categoryIds" to listOf("c2", "c1"), "showUncategorized" to false), written.get("settings.listFilter"))
+            // The other settings stay as they were.
+            val expected = defaultSettings("en").copy(
+                listSort = ListSort(SortField.CATEGORY, SortOrder.ASC),
+                listFilter = ListFilter(listOf("c2", "c1"), showUncategorized = false),
+            )
+            assertEquals(expected.toRecord(), written.get("settings"))
+
+            settings.setListFilter(uid, ListFilter(null, showUncategorized = true))
+            assertEquals(
+                mapOf("categoryIds" to null, "showUncategorized" to true),
+                backend.db.document("users/$uid").fromServer().get("settings.listFilter"),
+            )
+        }
+    }
+
+    @Test
+    fun aWriteTheRulesRefuseFailsForTheCaller() = runBlocking {
+        withTimeout(60_000) {
+            val uid = backend.signUpNewUser()
+            val settings = SettingsRepository(backend.db)
+            settings.settings(uid, "en").filterNotNull().first()
+            backend.db.document("users/$uid").fromServer()
+
+            // The rules take at most 100 ids in a filter.
+            val refused = runCatching { settings.setListFilter(uid, ListFilter(List(101) { "c$it" }, showUncategorized = true)) }
+            assertEquals(
+                FirebaseFirestoreException.Code.PERMISSION_DENIED,
+                (refused.exceptionOrNull() as FirebaseFirestoreException).code,
+            )
+        }
+    }
+
     @Test
     fun aSettingChangedByTheWebArrivesLive() = runBlocking {
         withTimeout(60_000) {
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :app:testDebugUnitTest`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugUnitTestKotlin'`; первая ошибка — `e: …/DocumentsTest.kt:176:13 Unresolved reference 'listSortUpdate'.`

- [ ] **Step 3: Запись настроек и `Writes`**

Изменения в `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Settings.kt`:

````diff
diff --git a/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Settings.kt b/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Settings.kt
index 1034254..6887c5b 100644
--- a/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Settings.kt
+++ b/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Settings.kt
@@ -98,9 +98,12 @@ fun Settings.toRecord(): Map<String, Any?> = mapOf(
         "showUncategorized" to bubbleFilter.showUncategorized,
         "plannedOnly" to bubbleFilter.plannedOnly,
     ),
-    "listFilter" to mapOf(
-        "categoryIds" to listFilter.categoryIds,
-        "showUncategorized" to listFilter.showUncategorized,
-    ),
-    "listSort" to mapOf("by" to listSort.by.wire, "order" to listSort.order.wire),
+    "listFilter" to listFilter.toRecord(),
+    "listSort" to listSort.toRecord(),
 )
+
+/** The record of this filter, as settings.listFilter keeps it. */
+fun ListFilter.toRecord(): Map<String, Any?> = mapOf("categoryIds" to categoryIds, "showUncategorized" to showUncategorized)
+
+/** The record of this sort, as settings.listSort keeps it. */
+fun ListSort.toRecord(): Map<String, Any?> = mapOf("by" to by.wire, "order" to order.wire)
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
index 0f9053a..5b88b6b 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
@@ -4,6 +4,8 @@ import com.google.firebase.Timestamp
 import com.google.firebase.firestore.FieldValue
 import com.pmobile78.todoround.core.contract.SCHEMA_VERSION
 import com.pmobile78.todoround.core.contract.validateSettings
+import com.pmobile78.todoround.core.model.ListFilter
+import com.pmobile78.todoround.core.model.ListSort
 import com.pmobile78.todoround.core.model.Settings
 import com.pmobile78.todoround.core.model.defaultSettings
 import com.pmobile78.todoround.core.model.settingsFromRecord
@@ -68,3 +70,14 @@ fun newUserDoc(settings: Settings): Map<String, Any?> = mapOf(
     "createdAt" to FieldValue.serverTimestamp(),
     "updatedAt" to FieldValue.serverTimestamp(),
 )
+
+/** The change of users/{uid} that writes [sort] as the list's sort (contract, 3.5). */
+fun listSortUpdate(sort: ListSort): Map<String, Any?> = settingsUpdate("listSort", sort.toRecord())
+
+/** The change of users/{uid} that writes [filter] as the list's filter (contract, 3.5). */
+fun listFilterUpdate(filter: ListFilter): Map<String, Any?> = settingsUpdate("listFilter", filter.toRecord())
+
+// As the web's settingsUpdateData: one setting by its field path, and the time of the server, so
+// that two devices do not undo each other's changes of other settings.
+private fun settingsUpdate(key: String, value: Any?): Map<String, Any?> =
+    mapOf("settings.$key" to value, "updatedAt" to FieldValue.serverTimestamp())
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
index 32beae0..192745e 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
@@ -9,6 +9,8 @@ import com.google.firebase.firestore.MetadataChanges
 import com.google.firebase.firestore.Query
 import com.google.firebase.firestore.QuerySnapshot
 import com.pmobile78.todoround.core.model.Category
+import com.pmobile78.todoround.core.model.ListFilter
+import com.pmobile78.todoround.core.model.ListSort
 import com.pmobile78.todoround.core.model.Settings
 import com.pmobile78.todoround.core.model.Task
 import com.pmobile78.todoround.core.model.categoryFromRecord
@@ -64,6 +66,16 @@ class SettingsRepository(private val db: FirebaseFirestore) {
         db.collection("users").document(uid).set(newUserDoc(settings)).await()
     }
 
+    /** Writes the sort of the list of [uid], shared with the web (stage 2 spec, 2.2 №7); returns once the server has it. */
+    suspend fun setListSort(uid: String, sort: ListSort) {
+        db.collection("users").document(uid).update(listSortUpdate(sort)).await()
+    }
+
+    /** Writes the filter of the list of [uid], shared with the web; returns once the server has it. */
+    suspend fun setListFilter(uid: String, filter: ListFilter) {
+        db.collection("users").document(uid).update(listFilterUpdate(filter)).await()
+    }
+
     private suspend fun createQuietly(uid: String, settings: Settings) {
         try {
             createUserDoc(uid, settings)
````

Экран записи не ждёт: Firestore показывает изменение сразу из кэша и отправляет его, когда может (спецификация, 2.2 № 17). Отказ сервера приходит позже — `Channel` с `CONFLATED` хранит его, пока экран его не возьмёт.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Writes.kt`:

````kotlin
package com.pmobile78.todoround.ui

import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

/**
 * The writes of the screens (stage 2 spec, 2.2 №17). A write runs in [scope] and does not hold the
 * screen up: Firestore shows the change at once from its cache and sends it when it can. A write
 * the server refuses comes out of [failures], which the screen shows as a short message; a
 * failure waits there until the screen takes it.
 */
class Writes(private val scope: CoroutineScope) {
    private val failed = Channel<Unit>(Channel.CONFLATED)

    val failures: Flow<Unit> = failed.receiveAsFlow()

    fun launch(write: suspend () -> Unit) {
        scope.launch {
            try {
                write()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.w("Writes", "a write failed", e)
                failed.trySend(Unit)
            }
        }
    }
}
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
index e2eb596..52af008 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
@@ -7,6 +7,8 @@ import androidx.lifecycle.viewModelScope
 import com.google.firebase.auth.FirebaseUser
 import com.pmobile78.todoround.ToDoRoundApp
 import com.pmobile78.todoround.core.model.Category
+import com.pmobile78.todoround.core.model.ListFilter
+import com.pmobile78.todoround.core.model.ListSort
 import com.pmobile78.todoround.core.model.Settings
 import com.pmobile78.todoround.core.model.Task
 import com.pmobile78.todoround.data.AccountRepository
@@ -85,6 +87,23 @@ class AppViewModel(application: Application) : AndroidViewModel(application) {
         accounts.signOut()
     }
 
+    private val writes = Writes(viewModelScope)
+
+    /** Writes the server refused: the screen shows a message for each (stage 2 spec, 2.2 №17). */
+    val writeFailures: Flow<Unit> = writes.failures
+
+    /** The sort of the list, shared with the web (stage 2 spec, 2.2 №7). */
+    fun setListSort(sort: ListSort) = write { uid -> settings.setListSort(uid, sort) }
+
+    /** The filter of the list, shared with the web. */
+    fun setListFilter(filter: ListFilter) = write { uid -> settings.setListFilter(uid, filter) }
+
+    // A write for the signed-in user; signed out, there is nothing to write.
+    private fun write(change: suspend (uid: String) -> Unit) {
+        val uid = backend.auth.currentUser?.uid ?: return
+        writes.launch { change(uid) }
+    }
+
     // A new account gets the language of the sign-in screen (spec 8).
     private fun signedIn(user: FirebaseUser): Flow<Session> =
         signedInSession(
````

- [ ] **Step 4: Сборка, тесты JVM и Lint**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `core tests: 106 passed, 0 failed, 0 skipped`, `app debug tests: 25 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.`

- [ ] **Step 5: Тесты проходят на устройстве**

Свободен ли эмулятор — эмулятор Android может работать у другой сессии:

```bash
source /media/big_disk/android/android-env.sh && if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"; else echo "no emulator"; fi
```

Expected: `no emulator`. Иначе — ждать и проверять снова: чужой эмулятор не трогать.

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-2-1.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi):

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase (тайм-аут 10 минут). Список ещё прежний — вкладка «Активные» этапа 1 на новых функциях; «Mars trip» в нём теперь просрочена (задача 1):

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (20 tests)` и `Script exited successfully (code 0)`.

Эмулятор выключить и дождаться конца его процесса (если `emu kill` не сработал — сигнал завершения; эмулятор `ToRound_API37` один на машине, и он наш):

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' || pkill -TERM -f '[q]emu-system.*ToRound_API37'
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' && echo "emulator stopped"
```

Expected: `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/Writes.kt android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt android/app/src/test/kotlin/com/pmobile78/todoround/ui/WritesTest.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Settings.kt
git commit -F - <<'EOF'
feat(android): the list's sort and filter are written to the settings shared with the web

Stage 2.1, task 3 (spec 2.2 No. 7, 17; section 5). SettingsRepository
writes settings.listSort and settings.listFilter as the web's
updateSettings does: the setting by its field path and the updatedAt of
the server. AppViewModel sends the writes through Writes, which does not
hold the screen up and passes a write the server refused on to
writeFailures. RepositoriesTest proves the writes under the real rules
and the refusal of a filter of 101 ids.
EOF
```

---

### Task 4: Экран списка

**Files:**
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt` (целиком), `android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/ui/theme/Theme.kt`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/res/values-uk/strings.xml`, `android/gradle/libs.versions.toml`, `android/app/build.gradle.kts`
- Create: `android/app/src/main/res/drawable/ic_search.xml`, `ic_close.xml`, `ic_filter_list.xml`, `ic_arrow_upward.xml`, `ic_arrow_downward.xml`, `ic_check_circle.xml`, `ic_delete_outline.xml`
- Test: `android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt` (целиком), `android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt`

**Interfaces:**
- Consumes: всё из задач 2 и 3; из 1.3 — `Session.SignedIn(email, data, failed)`, `UserData`, `Loaded`, `screenshot(name)`, помощники тестов `emulatorBackend()`, `webBackend()`, `newEmail()`, `Backend.signUp(email)`, `fromServer()`.
- Produces (`com.pmobile78.todoround.ui`): `HomeScreen(session: Session.SignedIn, onSignOut: () -> Unit, onSort: (ListSort) -> Unit = {}, onFilter: (ListFilter) -> Unit = {}, writeFailures: Flow<Unit> = emptyFlow())` с метками `home`, `menu`, `logout`, `logout_confirm`, `loading`, `failed` (как в 1.3), `search`, `search_clear`, `filter` (выделена — `selected`), `sort`, `sort_<поле контракта>` (`sort_title` …), `sort_order`, `tab_active`, `tab_done`, `tab_deleted`, `tab_planned`, `invalid`, `offline`, `trash_note`, `empty` и `task` — строка, тексты которой (название, срок, «Overdue», категория, даты) слиты в один узел; в панели фильтра — `filter_all`, `filter_clear`, `filter_none`, `filter_<id категории>` (переключатели). `val DoneGreen` в `ui.theme`. Строки `list_tab_*`, `list_empty_*` и другие (en, uk) вместо `list_count`, `list_shown`, `list_empty`.

- [ ] **Step 1: Написать падающие тесты**

`ListFlowTest` готовит аккаунты клиентом «веба», как в 1.3. Тест вкладок: четыре вкладки с числами, строки каждой вкладки целиком (с датами создания, изменения, удаления — во времени устройства), предупреждение корзины, выделенная кнопка фильтра (фильтр веба скрывает категорию Work) и задача, которую добавил «веб», на своём месте. Тест поиска: подстрока без учёта регистра в названии, в тексте описания (чек-лист) и в имени категории, числа вкладок с поиском, сохранённые вкладка и поиск после пересоздания экрана (как после поворота телефона), очистка поля. Клавиша поиска закрывает клавиатуру: под ней в списке помещается меньше строк, и три первые строки списка без поиска совпали бы с ожидаемыми — поэтому тест сначала ждёт числа во вкладке. Тест сортировки и фильтра: каждое изменение на телефоне меняет строки и записывается в настройки, а «веб» читает записанное с сервера — `{ title, asc }`, `{ [home], true }`, `{ [], false }` и снова `{ null, true }`. Тест длинного списка: 15 задач, после смены порядка первая строка — бывшая последняя, а задача, которую «веб» добавил в начало порядка, видна первой. Строка вкладок прокручивается, поэтому тест сначала прокручивает вкладку на экран, иначе нажатие уходит мимо. Язык и тема аккаунта — как в 1.3.

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt`:

````kotlin
package com.pmobile78.todoround

import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ComposeTimeoutException
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.core.os.LocaleListCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.data.Backend
import com.pmobile78.todoround.data.SettingsRepository
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant
import java.time.ZoneId

/**
 * The task list on the emulators: the web's client writes an account, its categories and tasks,
 * and the app, signed in as the same user, shows them as the web's list with its tabs, search,
 * sort and filter (stage 2 spec, section 6); the sort and the filter the app writes are the ones
 * the web reads.
 */
@RunWith(AndroidJUnit4::class)
class ListFlowTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val backend = emulatorBackend()
    private val web = webBackend()

    // A due in the zone of this device shows as written; the times of a record show in it too.
    private val here = ZoneId.systemDefault().id

    private fun created(at: String = "2026-10-01T08:00:00Z", language: Language = Language.EN): String {
        val label = if (language == Language.EN) "Created" else "Створено"
        return "$label: ${listDateTime(Instant.parse(at), here, language)}"
    }

    /**
     * Each row of the list as its texts, joined by "|". LazyColumn composes only the rows on the
     * screen: the rows a test checks must fit it.
     */
    private fun rows(): List<String> =
        compose.onAllNodesWithTag("task").fetchSemanticsNodes().map { it.config[SemanticsProperties.Text].joinToString("|") }

    // A look at the rows can meet the moment AppCompat recreates the screen, when there is no
    // Compose root at all: that look only means "not yet".
    private fun waitForRows(expected: List<String>) {
        try {
            compose.waitUntil(60_000) { runCatching { rows() == expected }.getOrDefault(false) }
        } catch (e: ComposeTimeoutException) {
            // The assertion below shows what the list has instead.
        }
        assertEquals(expected, rows())
    }

    /** The text of the node [tag], or null while there is none (the screen being recreated, say). */
    private fun label(tag: String): String? =
        runCatching { compose.onNodeWithTag(tag).fetchSemanticsNode().config[SemanticsProperties.Text].joinToString() }.getOrNull()

    // The row of tabs scrolls: a tab off the screen is brought onto it before the tap.
    private fun tab(name: String) {
        compose.onNodeWithTag("tab_$name").performScrollTo().performClick()
    }

    /** The screen itself is dark: the setting of AppCompat changes first, the screen is recreated after it. */
    private fun darkScreen(): Boolean = runCatching {
        (compose.activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }.getOrDefault(false)

    /** A new account set up on the web's client, which stays signed in; returns its uid. */
    private suspend fun webAccount(email: String, settings: Settings): String {
        val uid = web.signUp(email)
        SettingsRepository(web.db).createUserDoc(uid, settings)
        return uid
    }

    // A category and a task as the web writes them (src/services/data/convert.js), the task with a fixed time.
    private suspend fun Backend.category(uid: String, id: String, name: String, color: String, order: Int = 1) {
        val data = mapOf(
            "schemaVersion" to 2,
            "name" to name,
            "color" to color,
            "order" to order,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp(),
        )
        db.document("users/$uid/categories/$id").set(data).await()
    }

    private suspend fun Backend.task(
        uid: String,
        id: String,
        title: String,
        categoryId: String?,
        due: Due? = null,
        status: String = "active",
        updatedAt: String = "2026-10-01T08:00:00Z",
        reminders: List<Int> = emptyList(),
        description: String = "",
    ) {
        val time = Timestamp(Instant.parse(updatedAt))
        val data = mapOf(
            "schemaVersion" to 2,
            "title" to title,
            "description" to description,
            "categoryId" to categoryId,
            "status" to status,
            "due" to due?.let { mapOf("local" to it.local, "tz" to it.tz) },
            "reminders" to reminders,
            "repeat" to null,
            "radius" to 45,
            "pulseMuted" to false,
            "overdueAt" to null,
            "createdAt" to time,
            "updatedAt" to time,
            "deletedAt" to if (status == "deleted") time else null,
        )
        db.document("users/$uid/tasks/$id").set(data).await()
    }

    /** The settings as the server has them, as the web reads them. */
    private fun storedSettings(uid: String): Map<*, *> = runBlocking {
        withTimeout(30_000) { web.db.document("users/$uid").fromServer().get("settings") as Map<*, *> }
    }

    @Before
    fun startSignedOut() {
        backend.auth.signOut()
    }

    // Signed out here, the next test does not start in this account's language and theme.
    @After
    fun signOutAndForgetTheAppearance() {
        backend.auth.signOut()
        web.auth.signOut()
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        }
    }

    @Test
    fun theTabsAreTheTabsOfTheWebAndChangeLive() {
        val email = newEmail()
        val uid = runBlocking {
            // The web shows this account the category Home and the tasks without one, sorted by title.
            val settings = defaultSettings("en").copy(
                listFilter = ListFilter(categoryIds = listOf("home"), showUncategorized = true),
                listSort = ListSort(SortField.TITLE, SortOrder.ASC),
            )
            webAccount(email, settings).also { uid ->
                web.category(uid, "home", "Home", "#46a549")
                web.category(uid, "work", "Work", "#da3833", order = 2)
                web.task(uid, "t1", "buy milk", "home", Due("2026-10-01T09:30", here))
                web.task(uid, "t2", "Call the bank", "home", Due("2099-12-31T08:00", here))
                web.task(uid, "t3", "Apples", null)
                // A zone this phone does not know: the due is read in the zone of the phone, as the web reads it.
                web.task(uid, "t4", "Mars trip", "gone", Due("2026-10-01T09:30", "Mars/Olympus_Mons"))
                web.task(uid, "t5", "Report", "work")
                web.task(uid, "t6", "Done before", "home", status = "done")
                web.task(uid, "t7", "Old note", null, status = "deleted", updatedAt = "2026-10-02T08:00:00Z")
                // The rules leave the elements of reminders to the clients; the core wants whole hours.
                // The web shows such a task, the app only counts it (spec 6).
                web.task(uid, "t8", "Odd", null, Due("2026-10-01T09:30", "UTC"), reminders = listOf(61))
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }

        waitForRows(
            listOf(
                "Apples|${created()}",
                "buy milk|Due date: 10/01/2026, 09:30|Overdue|Home|${created()}",
                "Call the bank|Due date: 12/31/2099, 08:00|Home|${created()}",
                "Mars trip|Due date: 10/01/2026, 09:30|Overdue|No Tag|${created()}",
            ),
        )
        compose.onNodeWithTag("tab_active").assertTextEquals("Active Tasks (4)")
        compose.onNodeWithTag("tab_done").assertTextEquals("Completed Tasks (1)")
        compose.onNodeWithTag("tab_deleted").assertTextEquals("Deleted Tasks (1)")
        compose.onNodeWithTag("tab_planned").assertTextEquals("Planned Tasks (1)")
        compose.onNodeWithTag("invalid").assertTextEquals("Documents that failed the check: 1")
        // The filter of the web hides the category Work.
        compose.onNodeWithTag("filter").assertIsSelected()
        screenshot("list-en-light")

        tab("done")
        waitForRows(listOf("Done before|Home|${created()}"))
        tab("deleted")
        waitForRows(listOf("Old note|${created("2026-10-02T08:00:00Z")}|Deleted: ${listDateTime(Instant.parse("2026-10-02T08:00:00Z"), here, Language.EN)}"))
        compose.onNodeWithTag("trash_note").assertTextEquals("⚠️ Deleted tasks will be permanently removed after 30 days")
        tab("planned")
        waitForRows(listOf("Call the bank|Due date: 12/31/2099, 08:00|Home|${created()}"))

        // Another device adds a task: the list takes it in at its place.
        tab("active")
        runBlocking { web.task(uid, "t9", "Aardvark", "home", updatedAt = "2026-10-02T08:00:00Z") }
        compose.waitUntil(60_000) { rows().firstOrNull() == "Aardvark|Home|${created("2026-10-02T08:00:00Z")}" }
        compose.onNodeWithTag("tab_active").assertTextEquals("Active Tasks (5)")
    }

    @Test
    fun theSearchNarrowsTheListAndTheNumbersOfTheTabs() {
        val email = newEmail()
        runBlocking {
            webAccount(email, defaultSettings("en").copy(listSort = ListSort(SortField.TITLE, SortOrder.ASC))).also { uid ->
                web.category(uid, "farm", "Milk farm", "#46a549")
                web.task(uid, "t1", "Buy bread", null, description = "- [ ] milk\n- [x] butter")
                web.task(uid, "t2", "MILK the cow", null)
                web.task(uid, "t3", "Call the vet", "farm")
                web.task(uid, "t4", "Walk", null)
                web.task(uid, "t5", "Milkshake", null, status = "done")
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }
        compose.waitUntil(60_000) { rows().size == 4 }

        compose.onNodeWithTag("search").performTextInput(" milk ")
        // The search key closes the keyboard: under it, the list has room for fewer rows. The
        // number of the tab tells that the search has been applied.
        compose.onNodeWithTag("search").performImeAction()
        compose.waitUntil(60_000) { label("tab_active") == "Active Tasks (3)" }
        waitForRows(listOf("Buy bread|${created()}", "Call the vet|Milk farm|${created()}", "MILK the cow|${created()}"))
        compose.onNodeWithTag("tab_done").assertTextEquals("Completed Tasks (1)")

        // The tab and the search stay when the screen is made again, as after a turn of the phone.
        tab("done")
        waitForRows(listOf("Milkshake|${created()}"))
        compose.activityRule.scenario.recreate()
        waitForRows(listOf("Milkshake|${created()}"))
        compose.onNodeWithTag("search").assertTextContains(" milk ")

        tab("active")
        compose.onNodeWithTag("search_clear").performClick()
        compose.waitUntil(60_000) { rows().size == 4 }
        compose.onNodeWithTag("tab_active").assertTextEquals("Active Tasks (4)")
    }

    @Test
    fun theSortAndTheFilterAreTheSettingsTheWebReads() {
        val email = newEmail()
        val uid = runBlocking {
            // As the web keeps it by default: the latest change first, every category.
            webAccount(email, defaultSettings("en")).also { uid ->
                web.category(uid, "home", "Home", "#46a549")
                web.category(uid, "work", "Work", "#da3833", order = 2)
                web.task(uid, "a", "Alpha", "home", updatedAt = "2026-10-01T08:00:00Z")
                web.task(uid, "b", "Beta", "work", updatedAt = "2026-10-03T08:00:00Z")
                web.task(uid, "c", "Gamma", null, updatedAt = "2026-10-02T08:00:00Z")
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }
        val alpha = "Alpha|Home|${created()}"
        val beta = "Beta|Work|${created("2026-10-03T08:00:00Z")}"
        val gamma = "Gamma|${created("2026-10-02T08:00:00Z")}"
        waitForRows(listOf(beta, gamma, alpha))
        compose.onNodeWithTag("filter").assertIsNotSelected()

        compose.onNodeWithTag("sort").performClick()
        compose.onNodeWithTag("sort_title").performClick()
        waitForRows(listOf(gamma, beta, alpha))
        compose.onNodeWithTag("sort_order").performClick()
        waitForRows(listOf(alpha, beta, gamma))
        compose.waitUntil(60_000) { storedSettings(uid)["listSort"] == mapOf("by" to "title", "order" to "asc") }

        compose.onNodeWithTag("filter").performClick()
        compose.onNodeWithTag("filter_work").assertIsOn().assertTextContains("1", substring = true)
        compose.onNodeWithTag("filter_work").performClick()
        waitForRows(listOf(alpha, gamma))
        compose.onNodeWithTag("filter_work").assertIsOff()
        compose.waitUntil(60_000) {
            storedSettings(uid)["listFilter"] == mapOf("categoryIds" to listOf("home"), "showUncategorized" to true)
        }
        compose.onNodeWithTag("filter_none").performClick()
        waitForRows(listOf(alpha))
        compose.onNodeWithTag("filter_clear").performClick()
        waitForRows(emptyList())
        compose.onNodeWithTag("empty").assertTextEquals("No active tasks")
        compose.waitUntil(60_000) {
            storedSettings(uid)["listFilter"] == mapOf("categoryIds" to emptyList<String>(), "showUncategorized" to false)
        }
        compose.onNodeWithTag("filter_all").performClick()
        waitForRows(listOf(alpha, beta, gamma))
        // Every category chosen is null again, so the categories made later show too.
        compose.waitUntil(60_000) { storedSettings(uid)["listFilter"] == mapOf("categoryIds" to null, "showUncategorized" to true) }
    }

    @Test
    fun anotherSortStartsTheListAtItsTopAndATaskAddedThereShows() {
        val email = newEmail()
        val uid = runBlocking {
            webAccount(email, defaultSettings("en").copy(listSort = ListSort(SortField.TITLE, SortOrder.ASC))).also { uid ->
                // More tasks than the screen holds.
                (1..15).forEach { web.task(uid, "t$it", "Task %02d".format(it), null) }
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }
        compose.waitUntil(60_000) { rows().firstOrNull() == "Task 01|${created()}" }

        // The list shows the new order from its top, not the row that was first, now at the end.
        compose.onNodeWithTag("sort_order").performClick()
        compose.waitUntil(60_000) { rows().firstOrNull() == "Task 15|${created()}" }

        // A task another device adds at the top of the order shows at the top of the list.
        runBlocking { web.task(uid, "t16", "Task 99", null) }
        compose.waitUntil(60_000) { rows().firstOrNull() == "Task 99|${created()}" }
    }

    @Test
    fun theListSpeaksTheLanguageOfTheAccountInItsTheme() {
        val email = newEmail()
        runBlocking {
            // As the web keeps it by default: the latest change first.
            webAccount(email, defaultSettings("uk").copy(themeMode = ThemeMode.DARK)).also { uid ->
                web.category(uid, "home", "Дім", "#46a549")
                web.task(uid, "t1", "Купити хліб", "home", Due("2026-10-01T09:30", here), updatedAt = "2026-10-02T08:00:00Z")
                web.task(uid, "t2", "Зателефонувати", null, Due("2099-12-31T08:00", here), updatedAt = "2026-10-01T08:00:00Z")
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }

        // The account's theme and language recreate the screen: the rows are checked, and shot, on the new one.
        compose.waitUntil(60_000) { darkScreen() }
        waitForRows(
            listOf(
                "Купити хліб|Термін виконання: 01.10.2026, 09:30|Прострочено|Дім|${created("2026-10-02T08:00:00Z", Language.UK)}",
                "Зателефонувати|Термін виконання: 31.12.2099, 08:00|${created(language = Language.UK)}",
            ),
        )
        compose.onNodeWithTag("tab_active").assertTextEquals("Активні завдання (2)")
        compose.onNodeWithTag("tab_planned").assertTextEquals("Відкладені завдання (1)")
        screenshot("list-uk-dark")
    }
}
````

`HomeScreenTest` показывает экран отдельно от приложения (`createComposeRule`) — так видны состояния, которых данные эмуляторов не дают: данные не прочитаны (мелочь ревью 1.3) и запись, которую отклонил сервер.

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt`:

````kotlin
package com.pmobile78.todoround

import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.HomeScreen
import com.pmobile78.todoround.ui.Session
import com.pmobile78.todoround.ui.UserData
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import kotlinx.coroutines.flow.flowOf
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** The states of the screen that the data of the emulators do not bring about. */
@RunWith(AndroidJUnit4::class)
class HomeScreenTest {
    @get:Rule
    val compose = createComposeRule()

    private val data = UserData(defaultSettings("en"), Loaded(emptyList(), 0, false), Loaded(emptyList(), 0, false))

    @Test
    fun dataThatCouldNotBeReadAreSaid() {
        compose.setContent {
            ToDoRoundTheme {
                HomeScreen(Session.SignedIn("olena@example.com", data = null, failed = true), onSignOut = {})
            }
        }
        compose.onNodeWithTag("failed").assertTextEquals("The data could not be read. Sign out and sign in again.")
    }

    @Test
    fun aWriteTheServerRefusedIsSaid() {
        compose.setContent {
            ToDoRoundTheme {
                HomeScreen(Session.SignedIn("olena@example.com", data), onSignOut = {}, writeFailures = flowOf(Unit))
            }
        }
        compose.waitUntil(10_000) { compose.onAllNodesWithText("The change could not be saved.").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("The change could not be saved.").assertExists()
    }
}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :app:compileDebugAndroidTestKotlin -Ptodoround.emulators=true`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugAndroidTestKotlin'`; первая ошибка — `e: …/HomeScreenTest.kt:42:89 No parameter with name 'writeFailures' found.`

- [ ] **Step 3: Активность для тестов экрана**

`createComposeRule` показывает экран в пустой активности из `ui-test-manifest`; библиотека попадает только в сборку debug, версию даёт Compose BOM.

Изменения в `android/gradle/libs.versions.toml`:

````diff
diff --git a/android/gradle/libs.versions.toml b/android/gradle/libs.versions.toml
index 817567c..4a522f6 100644
--- a/android/gradle/libs.versions.toml
+++ b/android/gradle/libs.versions.toml
@@ -20,6 +20,7 @@ androidx-appcompat = { module = "androidx.appcompat:appcompat", version.ref = "a
 androidx-compose-bom = { module = "androidx.compose:compose-bom", version.ref = "composeBom" }
 androidx-compose-material3 = { module = "androidx.compose.material3:material3" }
 androidx-compose-ui-test-junit4 = { module = "androidx.compose.ui:ui-test-junit4" }
+androidx-compose-ui-test-manifest = { module = "androidx.compose.ui:ui-test-manifest" }
 androidx-compose-ui-tooling = { module = "androidx.compose.ui:ui-tooling" }
 androidx-compose-ui-tooling-preview = { module = "androidx.compose.ui:ui-tooling-preview" }
 androidx-lifecycle-runtime-compose = { module = "androidx.lifecycle:lifecycle-runtime-compose", version.ref = "lifecycle" }
````

Изменения в `android/app/build.gradle.kts`:

````diff
diff --git a/android/app/build.gradle.kts b/android/app/build.gradle.kts
index e415bff..0dcd0da 100644
--- a/android/app/build.gradle.kts
+++ b/android/app/build.gradle.kts
@@ -94,6 +94,8 @@ dependencies {
     implementation(libs.firebase.firestore)
     implementation(libs.kotlinx.coroutines.play.services)
     debugImplementation(libs.androidx.compose.ui.tooling)
+    // The activity in which the device tests show one screen on its own (createComposeRule).
+    debugImplementation(libs.androidx.compose.ui.test.manifest)
     testImplementation(platform(libs.junit.bom))
     testImplementation(libs.junit.jupiter)
     testRuntimeOnly(libs.junit.platform.launcher)
````

- [ ] **Step 4: Значки**

Значки Material (Apache License 2.0) — векторами, как `ic_more_vert.xml` этапа 1: библиотека значков Compose слишком велика ради семи штук.

Файл `android/app/src/main/res/drawable/ic_search.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Search" of the Material icons (Apache License 2.0): the search field of the list. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M15.5,14h-0.79l-0.28,-0.27C15.41,12.59 16,11.11 16,9.5 16,5.91 13.09,3 9.5,3S3,5.91 3,9.5 5.91,16 9.5,16c1.61,0 3.09,-0.59 4.23,-1.57l0.27,0.28v0.79l5,4.99L20.49,19l-4.99,-5zM9.5,14C7.01,14 5,11.99 5,9.5S7.01,5 9.5,5 14,7.01 14,9.5 11.99,14 9.5,14z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_close.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Clear" of the Material icons (Apache License 2.0): empties the search field. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_filter_list.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Filter list" of the Material icons (Apache License 2.0): the category filter of the list. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M10,18h4v-2h-4v2zM3,6v2h18L21,6L3,6zM6,13h12v-2L6,11v2z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_arrow_upward.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Arrow upward" of the Material icons (Apache License 2.0): the list sorted in ascending order. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M4,12l1.41,1.41L11,7.83V20h2V7.83l5.58,5.59L20,12l-8,-8 -8,8z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_arrow_downward.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Arrow downward" of the Material icons (Apache License 2.0): the list sorted in descending order. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M20,12l-1.41,-1.41L13,16.17V4h-2v12.17l-5.58,-5.59L4,12l8,8 8,-8z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_check_circle.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Check circle" of the Material icons (Apache License 2.0): the status of an active or a done task. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM10,17l-5,-5 1.41,-1.41L10,14.17l7.59,-7.59L19,8l-9,9z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_delete_outline.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Delete outline" of the Material icons (Apache License 2.0): the status of a deleted task. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2V7H6v12zM8,9h8v10H8V9zM15.5,4l-1,-1h-5l-1,1H5v2h14V4z" />
</vector>
````

- [ ] **Step 5: Тексты**

Тексты — из `src/locales` веба (`bubbles.*`), где они там есть: названия вкладок, пустые вкладки (у «Запланированных» веб пишет «No postponed tasks»), предупреждение корзины, «Search tasks», «Filter», «Categories», «Select All», «Clear All», поля сортировки, «Created», «Updated», «Deleted». Новые — «Sort by: %1$s», «Clear the search» и сообщение об отклонённой записи.

Изменения в `android/app/src/main/res/values/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values/strings.xml b/android/app/src/main/res/values/strings.xml
index c75fbc2..f7df7e1 100644
--- a/android/app/src/main/res/values/strings.xml
+++ b/android/app/src/main/res/values/strings.xml
@@ -34,14 +34,37 @@
     <string name="auth_error_network">Network error. Please check your connection.</string>
     <string name="auth_error_unexpected">An unexpected error occurred.</string>
 
-    <!-- The task list: the web's "Active" tab (spec 7), with the texts of the web's bubbles.* where it has them. -->
-    <string name="list_count">Active Tasks (%1$d)</string>
-    <string name="list_shown">Showing %1$d of %2$d</string>
-    <string name="list_empty">No active tasks</string>
+    <!-- The task list of the web (stage 2 spec, section 6), with the texts of the web's bubbles.* where it has them. -->
+    <string name="list_tab_active">Active Tasks (%1$d)</string>
+    <string name="list_tab_done">Completed Tasks (%1$d)</string>
+    <string name="list_tab_deleted">Deleted Tasks (%1$d)</string>
+    <string name="list_tab_planned">Planned Tasks (%1$d)</string>
+    <string name="list_empty_active">No active tasks</string>
+    <string name="list_empty_done">No completed tasks</string>
+    <string name="list_empty_deleted">No deleted tasks</string>
+    <string name="list_empty_planned">No postponed tasks</string>
+    <string name="list_trash_note">⚠️ Deleted tasks will be permanently removed after 30 days</string>
+    <string name="list_search">Search tasks</string>
+    <string name="list_search_clear">Clear the search</string>
+    <string name="list_filter">Filter</string>
+    <string name="list_categories">Categories</string>
+    <string name="list_select_all">Select All</string>
+    <string name="list_clear_all">Clear All</string>
+    <string name="list_sort_by">Sort by: %1$s</string>
+    <string name="list_sort_created">Created</string>
+    <string name="list_sort_updated">Updated</string>
+    <string name="list_sort_title">Title</string>
+    <string name="list_sort_category">Category</string>
+    <string name="list_sort_ascending">Sort ascending</string>
+    <string name="list_sort_descending">Sort descending</string>
+    <string name="list_created">Created: %1$s</string>
+    <string name="list_updated">Updated: %1$s</string>
+    <string name="list_deleted">Deleted: %1$s</string>
     <string name="list_due">Due date: %1$s</string>
     <string name="list_overdue">Overdue</string>
     <string name="list_no_category">No Tag</string>
     <string name="list_invalid">Documents that failed the check: %1$d</string>
     <string name="list_offline">No connection to the server: these are the data saved on this device.</string>
     <string name="list_failed">The data could not be read. Sign out and sign in again.</string>
+    <string name="write_failed">The change could not be saved.</string>
 </resources>
````

Изменения в `android/app/src/main/res/values-uk/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values-uk/strings.xml b/android/app/src/main/res/values-uk/strings.xml
index d2c2505..76fd415 100644
--- a/android/app/src/main/res/values-uk/strings.xml
+++ b/android/app/src/main/res/values-uk/strings.xml
@@ -32,13 +32,36 @@
     <string name="auth_error_network">Помилка мережі. Перевірте з’єднання.</string>
     <string name="auth_error_unexpected">Сталася неочікувана помилка.</string>
 
-    <string name="list_count">Активні завдання (%1$d)</string>
-    <string name="list_shown">Показано %1$d з %2$d</string>
-    <string name="list_empty">Немає активних завдань</string>
+    <string name="list_tab_active">Активні завдання (%1$d)</string>
+    <string name="list_tab_done">Завершені завдання (%1$d)</string>
+    <string name="list_tab_deleted">Видалені завдання (%1$d)</string>
+    <string name="list_tab_planned">Відкладені завдання (%1$d)</string>
+    <string name="list_empty_active">Немає активних завдань</string>
+    <string name="list_empty_done">Немає завершених завдань</string>
+    <string name="list_empty_deleted">Немає видалених завдань</string>
+    <string name="list_empty_planned">Немає відкладених завдань</string>
+    <string name="list_trash_note">⚠️ Видалені завдання будуть остаточно знищені через 30 днів</string>
+    <string name="list_search">Пошук завдань</string>
+    <string name="list_search_clear">Очистити пошук</string>
+    <string name="list_filter">Фільтр</string>
+    <string name="list_categories">Категорії</string>
+    <string name="list_select_all">Вибрати все</string>
+    <string name="list_clear_all">Очистити все</string>
+    <string name="list_sort_by">Сортувати за: %1$s</string>
+    <string name="list_sort_created">Створено</string>
+    <string name="list_sort_updated">Оновлено</string>
+    <string name="list_sort_title">Заголовок</string>
+    <string name="list_sort_category">Категорія</string>
+    <string name="list_sort_ascending">Сортувати за зростанням</string>
+    <string name="list_sort_descending">Сортувати за спаданням</string>
+    <string name="list_created">Створено: %1$s</string>
+    <string name="list_updated">Оновлено: %1$s</string>
+    <string name="list_deleted">Видалено: %1$s</string>
     <string name="list_due">Термін виконання: %1$s</string>
     <string name="list_overdue">Прострочено</string>
     <string name="list_no_category">Без Тега</string>
     <string name="list_invalid">Документів, що не пройшли перевірку: %1$d</string>
     <string name="list_offline">Немає зв’язку із сервером: це дані, збережені на цьому пристрої.</string>
     <string name="list_failed">Не вдалося прочитати дані. Вийдіть і увійдіть знову.</string>
+    <string name="write_failed">Не вдалося зберегти зміну.</string>
 </resources>
````

- [ ] **Step 6: Экран списка**

Экран — список веба (спецификация, раздел 6): поле поиска (запрос — через 300 мс после последней клавиши; клавиша «Поиск» закрывает клавиатуру), кнопка фильтра, выделенная, пока фильтр что-то скрывает, поле и направление сортировки, прокручиваемая строка вкладок с числами, заметки о данных, предупреждение корзины, строки. Другая вкладка, сортировка или поиск начинают список сверху (`key` вокруг `LazyColumn`), а строки без ключей: изменение данных не уводит список за строкой, которая была первой (Review Focus). Клавиатура не закрывает конец списка (`imePadding`). Строка — значок статуса (синий у активной, зелёный у выполненной, красная корзина у удалённой; фон выполненной и удалённой подкрашен, как в вебе), название, срок с «Overdue» у любой задачи с прошедшим сроком, категория, даты создания, изменения (если отличается от создания на миллисекунду и больше) и удаления. Отметка «Overdue», которой не хватает места рядом со сроком, переносится целиком (`FlowRow`). Панель фильтра — `ModalBottomSheet`: «Выбрать все», «Очистить», «Без категории» и категории по порядку с числами задач вкладки и поиска; изменение сразу уходит в `onFilter`, а панель строит следующее изменение на своём последнем. Панель прокручивается: в альбомной ориентации Redmi 9 восемь категорий владельца в неё не помещаются (проверено в черновике на эмуляторе). Вкладка и поиск хранятся на телефоне и переживают поворот экрана; «сейчас» берётся заново в начале каждой минуты и при возвращении к экрану. Нажатие на строку пока ничего не делает (подплан 2.2).

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/theme/Theme.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/theme/Theme.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/theme/Theme.kt
index c59c6e1..3cb9e2a 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/theme/Theme.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/theme/Theme.kt
@@ -14,6 +14,9 @@ private val Blue = Color(0xFF3B7DED)
 private val Coral = Color(0xFFFF6B6B)
 private val Red = Color(0xFFF44336)
 
+/** The green of a done task in the list, where the web uses its theme's success colour; Material 3 has no such role. */
+val DoneGreen = Color(0xFF4CAF50)
+
 private val LightColors = lightColorScheme(
     primary = Blue,
     onPrimary = Color.White,
````

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryScrollableTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleStartEffect
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.deviceTimeZone
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListOptions
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.ListTab
import com.pmobile78.todoround.core.model.SHOW_ALL
import com.pmobile78.todoround.core.model.SHOW_NONE
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.changedAfterCreation
import com.pmobile78.todoround.core.model.chosen
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.dueView
import com.pmobile78.todoround.core.model.filterCounts
import com.pmobile78.todoround.core.model.hidesSome
import com.pmobile78.todoround.core.model.inOrder
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.core.model.tabCounts
import com.pmobile78.todoround.core.model.tabTasks
import com.pmobile78.todoround.core.model.toggled
import com.pmobile78.todoround.core.model.toggledUncategorized
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.theme.DoneGreen
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import java.time.Instant

/**
 * The screen of a signed-in user: the top bar with the menu "Logout" and the task list of the web
 * with its tabs, search, sort and category filter (stage 2 spec, section 6). It follows the data
 * live. The sort and the filter are settings of the account, shared with the web: [onSort] and
 * [onFilter] write them, and a write the server refused comes out of [writeFailures].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    session: Session.SignedIn,
    onSignOut: () -> Unit,
    onSort: (ListSort) -> Unit = {},
    onFilter: (ListFilter) -> Unit = {},
    writeFailures: Flow<Unit> = emptyFlow(),
) {
    var menu by remember { mutableStateOf(false) }
    var confirmSignOut by rememberSaveable { mutableStateOf(false) }
    val snackbars = remember { SnackbarHostState() }
    val notSaved = stringResource(R.string.write_failed)
    LaunchedEffect(writeFailures) {
        writeFailures.collect { snackbars.showSnackbar(notSaved) }
    }
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
        snackbarHost = { SnackbarHost(snackbars) },
    ) { padding ->
        val data = session.data
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding)
                .imePadding(),
        ) {
            when {
                session.failed -> Note(stringResource(R.string.list_failed), MaterialTheme.colorScheme.error, "failed", Modifier.padding(16.dp))
                data == null -> CircularProgressIndicator(Modifier.align(Alignment.Center).testTag("loading"))
                else -> TaskList(data, onSort, onFilter)
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

/**
 * The list of the web: the search, the filter and the sort over the tabs, then the tasks of the
 * chosen tab with the notes about the data. The tab and the search stay on this phone; the
 * search follows the field 300 ms after the last key, as on the web (stage 2 spec, 2.2 №6, №8).
 */
@Composable
private fun TaskList(data: UserData, onSort: (ListSort) -> Unit, onFilter: (ListFilter) -> Unit) {
    val settings = data.settings
    var tab by rememberSaveable { mutableStateOf(ListTab.ACTIVE) }
    var typed by rememberSaveable { mutableStateOf("") }
    var query by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(typed) {
        delay(300)
        query = typed
    }
    var filtering by rememberSaveable { mutableStateOf(false) }
    val zone = deviceTimeZone()
    val now = currentMinute()
    val categories = remember(data) { inOrder(data.categories.items) }
    val known = remember(categories) { categories.associateBy { it.id } }
    val options = ListOptions(tab, settings.listFilter, settings.listSort, query)
    val tasks = remember(data, options, now) { tabTasks(data.tasks.items, categories, options, zone, now) }
    val counts = remember(data, query, now) { tabCounts(data.tasks.items, categories, settings.listFilter, query, zone, now) }
    Column(modifier = Modifier.fillMaxSize()) {
        SearchField(typed, onChange = { typed = it })
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            FilterButton(hidesSome = settings.listFilter.hidesSome(categories), onClick = { filtering = true })
            Spacer(Modifier.weight(1f))
            SortControls(settings.listSort, onSort)
        }
        PrimaryScrollableTabRow(selectedTabIndex = tab.ordinal, edgePadding = 16.dp) {
            ListTab.entries.forEach { each ->
                Tab(
                    selected = each == tab,
                    onClick = { tab = each },
                    text = { Text(stringResource(each.label, counts[each] ?: 0)) },
                    modifier = Modifier.testTag("tab_${each.name.lowercase()}"),
                )
            }
        }
        // Another tab, sort or search starts the list at its top. The rows have no keys: after a
        // change of the data the list keeps its place by position, as the web's list does, and does
        // not follow the row that was first to wherever it moved.
        key(tab, settings.listSort, query) {
            TaskRows(data, tasks, tab, known, zone, now)
        }
    }
    if (filtering) {
        val numbers = remember(data, tab, query, now) { filterCounts(data.tasks.items, categories, tab, query, zone, now) }
        FilterSheet(categories, settings.listFilter, numbers, onFilter, onDismiss = { filtering = false })
    }
}

/** The rows of [tasks] under the notes about the data, the note of the trash and the text of an empty tab. */
@Composable
private fun TaskRows(data: UserData, tasks: List<Task>, tab: ListTab, categories: Map<String, Category>, zone: String, now: Instant) {
    val invalid = data.tasks.invalid + data.categories.invalid
    val offline = data.tasks.fromCache || data.categories.fromCache
    LazyColumn(
        state = rememberLazyListState(),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (invalid > 0 || offline) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (invalid > 0) Note(stringResource(R.string.list_invalid, invalid), MaterialTheme.colorScheme.error, "invalid")
                    if (offline) Note(stringResource(R.string.list_offline), MaterialTheme.colorScheme.onSurfaceVariant, "offline")
                }
            }
        }
        if (tab == ListTab.DELETED) {
            item { Note(stringResource(R.string.list_trash_note), MaterialTheme.colorScheme.onSurfaceVariant, "trash_note") }
        }
        if (tasks.isEmpty()) {
            item { Note(stringResource(tab.empty), MaterialTheme.colorScheme.onSurfaceVariant, "empty") }
        }
        items(tasks) { task ->
            TaskRow(task, task.categoryId?.let(categories::get), data.settings.language, zone, now)
        }
    }
}

/**
 * Now, taken again at every full minute while the list is shown (stage 2 spec, 2.2 №9), and when
 * the screen comes back: delay does not count the time the phone sleeps.
 */
@Composable
private fun currentMinute(): Instant {
    var now by remember { mutableStateOf(Instant.now()) }
    LifecycleStartEffect(Unit) {
        now = Instant.now()
        onStopOrDispose {}
    }
    LaunchedEffect(Unit) {
        while (true) {
            delay(MINUTE_MS - System.currentTimeMillis() % MINUTE_MS)
            now = Instant.now()
        }
    }
    return now
}

private const val MINUTE_MS = 60_000L

@get:StringRes
private val ListTab.label: Int
    get() = when (this) {
        ListTab.ACTIVE -> R.string.list_tab_active
        ListTab.DONE -> R.string.list_tab_done
        ListTab.DELETED -> R.string.list_tab_deleted
        ListTab.PLANNED -> R.string.list_tab_planned
    }

@get:StringRes
private val ListTab.empty: Int
    get() = when (this) {
        ListTab.ACTIVE -> R.string.list_empty_active
        ListTab.DONE -> R.string.list_empty_done
        ListTab.DELETED -> R.string.list_empty_deleted
        ListTab.PLANNED -> R.string.list_empty_planned
    }

@get:StringRes
private val SortField.label: Int
    get() = when (this) {
        SortField.CREATED_AT -> R.string.list_sort_created
        SortField.UPDATED_AT -> R.string.list_sort_updated
        SortField.TITLE -> R.string.list_sort_title
        SortField.CATEGORY -> R.string.list_sort_category
    }

@Composable
private fun SearchField(typed: String, onChange: (String) -> Unit) {
    val focus = LocalFocusManager.current
    OutlinedTextField(
        value = typed,
        onValueChange = onChange,
        singleLine = true,
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = { focus.clearFocus() }),
        placeholder = { Text(stringResource(R.string.list_search)) },
        leadingIcon = { Icon(painterResource(R.drawable.ic_search), contentDescription = null) },
        trailingIcon = {
            if (typed.isNotEmpty()) {
                IconButton(onClick = { onChange("") }, modifier = Modifier.testTag("search_clear")) {
                    Icon(painterResource(R.drawable.ic_close), contentDescription = stringResource(R.string.list_search_clear))
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .testTag("search"),
    )
}

/** The button of the filter panel, marked as the web marks it when the filter hides some tasks. */
@Composable
private fun FilterButton(hidesSome: Boolean, onClick: () -> Unit) {
    val primary = MaterialTheme.colorScheme.primary
    OutlinedButton(
        onClick = onClick,
        colors = if (hidesSome) {
            ButtonDefaults.outlinedButtonColors(containerColor = primary.copy(alpha = 0.15f), contentColor = primary)
        } else {
            ButtonDefaults.outlinedButtonColors()
        },
        border = BorderStroke(1.dp, if (hidesSome) primary else MaterialTheme.colorScheme.outline),
        modifier = Modifier
            .testTag("filter")
            .semantics { selected = hidesSome },
    ) {
        Icon(painterResource(R.drawable.ic_filter_list), contentDescription = null)
        Spacer(Modifier.width(8.dp))
        Text(stringResource(R.string.list_filter))
    }
}

/** The field and the direction of the sort; a change goes to [onSort]. */
@Composable
private fun SortControls(sort: ListSort, onSort: (ListSort) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        TextButton(onClick = { open = true }, modifier = Modifier.testTag("sort")) {
            Text(stringResource(R.string.list_sort_by, stringResource(sort.by.label)))
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            SortField.entries.forEach { field ->
                DropdownMenuItem(
                    text = { Text(stringResource(field.label)) },
                    onClick = {
                        open = false
                        if (field != sort.by) onSort(sort.copy(by = field))
                    },
                    modifier = Modifier.testTag("sort_${field.wire}"),
                )
            }
        }
    }
    val ascending = sort.order == SortOrder.ASC
    IconButton(
        onClick = { onSort(sort.copy(order = if (ascending) SortOrder.DESC else SortOrder.ASC)) },
        modifier = Modifier.testTag("sort_order"),
    ) {
        Icon(
            painterResource(if (ascending) R.drawable.ic_arrow_upward else R.drawable.ic_arrow_downward),
            contentDescription = stringResource(if (ascending) R.string.list_sort_ascending else R.string.list_sort_descending),
        )
    }
}

/**
 * The filter panel of the web: "Select All", "Clear All", the tasks without a category and every
 * category, each with its number of tasks in the tab and the search. A change goes to [onFilter]
 * at once. The panel builds each change on its own last one, as the web does: a second tap that
 * comes before the first change is back from Firestore would otherwise undo it.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterSheet(
    categories: List<Category>,
    filter: ListFilter,
    numbers: Map<String?, Int>,
    onFilter: (ListFilter) -> Unit,
    onDismiss: () -> Unit,
) {
    var shown by remember { mutableStateOf(filter) }
    val change = { next: ListFilter ->
        shown = next
        onFilter(next)
    }
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        // The panel scrolls when its categories do not fit: in landscape, say, or with many of them.
        Column(
            modifier = Modifier
                .verticalScroll(rememberScrollState())
                .padding(bottom = 24.dp),
        ) {
            Row(modifier = Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.list_categories), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                TextButton(onClick = { change(SHOW_ALL) }, modifier = Modifier.testTag("filter_all")) {
                    Text(stringResource(R.string.list_select_all))
                }
                TextButton(onClick = { change(SHOW_NONE) }, modifier = Modifier.testTag("filter_clear")) {
                    Text(stringResource(R.string.list_clear_all))
                }
            }
            FilterRow(
                checked = shown.showUncategorized,
                color = MaterialTheme.colorScheme.surfaceVariant,
                name = stringResource(R.string.list_no_category),
                number = numbers[null] ?: 0,
                tag = "filter_none",
                onToggle = { change(shown.toggledUncategorized()) },
            )
            val chosen = shown.chosen(categories)
            categories.forEach { category ->
                FilterRow(
                    checked = category.id in chosen,
                    color = paletteColor(category.color),
                    name = category.name,
                    number = numbers[category.id] ?: 0,
                    tag = "filter_${category.id}",
                    onToggle = { change(shown.toggled(category.id, categories)) },
                )
            }
        }
    }
}

@Composable
private fun FilterRow(checked: Boolean, color: Color, name: String, number: Int, tag: String, onToggle: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .toggleable(value = checked, role = Role.Checkbox, onValueChange = { onToggle() })
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .testTag(tag),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Checkbox(checked = checked, onCheckedChange = null)
        Box(
            Modifier
                .size(16.dp)
                .background(color, CircleShape),
        )
        Text(name, modifier = Modifier.weight(1f))
        Text(number.toString(), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/**
 * A task as the web's list shows it: the icon of its status, the title, the due (red and "Overdue"
 * once passed, whatever the status, as on the web), the category, and the times of creation,
 * change and deletion. A done or deleted task is tinted as on the web.
 */
@Composable
private fun TaskRow(task: Task, category: Category?, language: Language, zone: String, now: Instant) {
    val surface = MaterialTheme.colorScheme.surface
    val tint = when (task.status) {
        TaskStatus.ACTIVE -> surface
        TaskStatus.DONE -> DoneGreen.copy(alpha = 0.12f).compositeOver(surface)
        TaskStatus.DELETED -> MaterialTheme.colorScheme.error.copy(alpha = 0.12f).compositeOver(surface)
    }
    OutlinedCard(
        colors = CardDefaults.outlinedCardColors(containerColor = tint),
        modifier = Modifier
            .fillMaxWidth()
            .testTag("task")
            .semantics(mergeDescendants = true) {},
    ) {
        Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            StatusIcon(task.status)
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(task.title, style = MaterialTheme.typography.titleMedium)
                task.due?.let { due ->
                    val view = dueView(due, zone, now)
                    // A mark that does not fit beside the due goes whole to the next line.
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                        itemVerticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = stringResource(R.string.list_due, listDateTime(view.local, language)),
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (view.overdue) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                        )
                        if (view.overdue) OverdueMark()
                    }
                }
                when {
                    category != null -> Chip(category.name, paletteColor(category.color), Color.White)
                    // The category is gone: the web shows "No Tag" in grey.
                    task.categoryId != null -> Chip(
                        stringResource(R.string.list_no_category),
                        MaterialTheme.colorScheme.surfaceVariant,
                        MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Time(stringResource(R.string.list_created, listDateTime(task.createdAt, zone, language)))
                    if (task.changedAfterCreation()) Time(stringResource(R.string.list_updated, listDateTime(task.updatedAt, zone, language)))
                    task.deletedAt?.let { Time(stringResource(R.string.list_deleted, listDateTime(it, zone, language))) }
                }
            }
        }
    }
}

@Composable
private fun StatusIcon(status: TaskStatus) {
    Icon(
        painter = painterResource(if (status == TaskStatus.DELETED) R.drawable.ic_delete_outline else R.drawable.ic_check_circle),
        contentDescription = null,
        tint = when (status) {
            TaskStatus.ACTIVE -> MaterialTheme.colorScheme.primary
            TaskStatus.DONE -> DoneGreen
            TaskStatus.DELETED -> MaterialTheme.colorScheme.error
        },
    )
}

@Composable
private fun Time(text: String) {
    Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun OverdueMark() {
    val red = MaterialTheme.colorScheme.error
    Text(
        text = stringResource(R.string.list_overdue),
        color = red,
        fontWeight = FontWeight.Bold,
        style = MaterialTheme.typography.labelSmall,
        modifier = Modifier
            .background(red.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
            .border(1.dp, red.copy(alpha = 0.3f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    )
}

@Composable
private fun Chip(text: String, background: Color, content: Color) {
    Text(
        text = text,
        color = content,
        style = MaterialTheme.typography.labelMedium,
        modifier = Modifier
            .background(background, RoundedCornerShape(16.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

@Composable
private fun Note(text: String, color: Color, tag: String, modifier: Modifier = Modifier) {
    Text(text = text, color = color, style = MaterialTheme.typography.bodyMedium, modifier = modifier.testTag(tag))
}

/** A colour of the palette, "#rrggbb". */
private fun paletteColor(hex: String): Color = Color(0xFF000000 or hex.removePrefix("#").toLong(16))

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

@Preview(showBackground = true)
@Composable
private fun HomeScreenFailedPreview() {
    ToDoRoundTheme {
        HomeScreen(Session.SignedIn(email = "olena@example.com", data = null, failed = true), onSignOut = {})
    }
}
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
index 5d86c76..7eae4e4 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
@@ -45,6 +45,12 @@ fun AppContent(viewModel: AppViewModel = viewModel()) {
     when (val current = session) {
         Session.Starting -> Unit
         Session.SignedOut -> AuthScreen(viewModel.accounts)
-        is Session.SignedIn -> HomeScreen(current, onSignOut = viewModel::signOut)
+        is Session.SignedIn -> HomeScreen(
+            current,
+            onSignOut = viewModel::signOut,
+            onSort = viewModel::setListSort,
+            onFilter = viewModel::setListFilter,
+            writeFailures = viewModel.writeFailures,
+        )
     }
 }
````

- [ ] **Step 7: Сборка и Lint**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `app debug tests: 25 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.` (`core` не менялся с задачи 3, Gradle тесты ядра не повторяет.)

- [ ] **Step 8: Тесты проходят на устройстве**

Свободен ли эмулятор — эмулятор Android может работать у другой сессии:

```bash
source /media/big_disk/android/android-env.sh && if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"; else echo "no emulator"; fi
```

Expected: `no emulator`. Иначе — ждать и проверять снова: чужой эмулятор не трогать.

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-2-1.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi):

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase (тайм-аут 10 минут) и снимки, которые они принесли:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
ls android/app/build/device-screens
```

Expected: `OK (25 tests)` и `Script exited successfully (code 0)`; `list-en-light.png`, `list-uk-dark.png`. Снимки открыть и посмотреть. На первом — светлый экран: поле «Search tasks», выделенная кнопка «Filter», «Sort by: Title» со стрелкой вверх, вкладки «Active Tasks (4)», «Completed Tasks (1)», начало «Deleted Tasks», красная заметка «Documents that failed the check: 1» и четыре задачи с синими значками: «Apples»; «buy milk» с красным сроком, отметкой «Overdue» и зелёной категорией «Home»; «Call the bank» с синим сроком и «Home»; «Mars trip» с красным сроком, «Overdue» и серым «No Tag» — у каждой серая строка «Created: …». На втором — тёмный экран на украинском: «Сортувати за: Оновлено» со стрелкой вниз, «Активні завдання (2)», «Купити хліб» с красным сроком, «Прострочено» строкой ниже и «Дім», затем «Зателефонувати». Окно «System UI isn't responding» поверх экрана — это система эмулятора под нагрузкой (`docs/android.md`); чисто чёрный снимок значит, что система эмулятора ещё не нарисовала окно: прогнать тесты ещё раз.

Эмулятор выключить и дождаться конца его процесса (если `emu kill` не сработал — сигнал завершения; эмулятор `ToRound_API37` один на машине, и он наш):

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' || pkill -TERM -f '[q]emu-system.*ToRound_API37'
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' && echo "emulator stopped"
```

Expected: `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 9: Commit**

```bash
git add android/app/build.gradle.kts android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/theme/Theme.kt android/app/src/main/res/drawable/ic_arrow_downward.xml android/app/src/main/res/drawable/ic_arrow_upward.xml android/app/src/main/res/drawable/ic_check_circle.xml android/app/src/main/res/drawable/ic_close.xml android/app/src/main/res/drawable/ic_delete_outline.xml android/app/src/main/res/drawable/ic_filter_list.xml android/app/src/main/res/drawable/ic_search.xml android/app/src/main/res/values-uk/strings.xml android/app/src/main/res/values/strings.xml android/gradle/libs.versions.toml
git commit -F - <<'EOF'
feat(android): the list with the web's tabs, search, sort and category filter

Stage 2.1, task 4 (spec section 6). HomeScreen: the search field (300 ms
after the last key), the filter button, marked while the filter hides
tasks, the field and the direction of the sort, the four tabs with their
numbers, the note of the trash, and rows with the icon of the status and
the times of creation, change and deletion. The filter panel lists the
categories in their order with their numbers, Select All and Clear All.
"Now" is taken again at every full minute and when the screen comes back.
Another tab, sort or search starts the list at its top, and the rows have
no keys, so a change of the data does not carry the view after the row
that was first. The filter panel scrolls and builds each change on its own
last one; the keyboard leaves room for the list. A write the server
refused shows a snackbar. The device tests cover the tabs, the search, the
sort and the filter as the web reads them, the top of a long list, the
screen made again, and the states of the screen the emulators do not
bring about (ui-test-manifest, debug builds only).
EOF
```

---

### Task 5: Документация, полная проверка, проверка с вебом и на Redmi 9

**Files:**
- Modify: `docs/android.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: всё из задач 1–4.
- Produces: в `docs/android.md` — список с вкладками и сверка четырёх вкладок с вебом; в `CLAUDE.md` — ссылка на спецификацию этапа 2. Проверка с вебом на эмуляторах и сверка на Redmi 9 — записи в журнале исполнения.

- [ ] **Step 1: Документация**

Изменения в `docs/android.md`:

````diff
diff --git a/docs/android.md b/docs/android.md
index 29799c8..d6d1b47 100644
--- a/docs/android.md
+++ b/docs/android.md
@@ -1,13 +1,13 @@
 # Android-приложение
 
-Нативное Android-приложение ToDo-Round: Kotlin, Jetpack Compose, Material 3. Работает с тем же проектом Firebase и теми же данными (контракт v2), что и веб. План работ — [дорожная карта](superpowers/specs/2026-10-14-android-roadmap.md); этап 1 — [спецификация](superpowers/specs/2026-10-22-stage-1-android-foundation-design.md).
+Нативное Android-приложение ToDo-Round: Kotlin, Jetpack Compose, Material 3. Работает с тем же проектом Firebase и теми же данными (контракт v2), что и веб. План работ — [дорожная карта](superpowers/specs/2026-10-14-android-roadmap.md); этап 1 — [спецификация](superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), этап 2 — [спецификация](superpowers/specs/2026-10-24-stage-2-tasks-design.md).
 
 ## Что где
 
 | Путь | Что внутри |
 |---|---|
-| `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели, правила списка задач (вкладка «Активные» веба). Тесты (JUnit) читают общие примеры из `contract/` |
-| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, список задач, экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
+| `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели, правила списка задач веба (вкладки, поиск, фильтр, сортировка). Тесты (JUnit) читают общие примеры из `contract/` |
+| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, список задач (сортировка и фильтр пишутся в общие с вебом настройки), экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
 | `android/device-tests.sh` | запуск тестов на устройстве против эмуляторов Firebase (ниже) |
 | `android/gradle/libs.versions.toml` | версии библиотек и плагинов |
 | `contract/` | общие примеры данных для веба, функций и Android ([README](../contract/README.md)) |
@@ -85,13 +85,13 @@ android/gradlew -p android --stop                   # остановить де
 
 ## Сверка списка с вебом
 
-Список задач приложения — вкладка «Активные» веба: те же активные задачи, в том числе запланированные, с фильтром и сортировкой, сохранёнными в вебе. Как сравнить:
+Список задач приложения — список веба: те же вкладки «Активные», «Выполненные», «Удалённые», «Запланированные», тот же поиск, а фильтр и сортировка — общие настройки аккаунта: изменённые на телефоне, они меняются и в вебе. Как сравнить:
 
 1. В вебе войти в тот же аккаунт, что на телефоне, и перезагрузить вкладку: задачи с одинаковым ключом сортировки веб показывает в порядке id документов только сразу после загрузки страницы, а пришедшие с сервера позже ставит в конец. Если порядок не сошёлся только у таких задач, перезагрузить вкладку ещё раз.
-2. Открыть в вебе «Список завдань», вкладку «Активні завдання». Число в её названии — то же, что «Активні завдання (N)» над списком приложения. Если фильтр веба скрывает часть задач, приложение пишет и «Показано N з M».
-3. Сравнить порядок и несколько задач: название, категорию, срок.
+2. Открыть в вебе «Список завдань». Числа в названиях четырёх вкладок веба — те же, что в названиях вкладок приложения.
+3. В каждой вкладке сравнить порядок и задачи: название, срок, «Прострочено», категорию, даты. Вкладку «Запланированные» сравнивать в одну и ту же минуту: задача уходит из неё, когда наступает её срок.
 
-Срок приложение показывает во времени телефона, веб — во времени компьютера; при сверке часовой пояс у них один. Если телефон не знает часового пояса задачи (его база часовых поясов старее, чем у браузера), срок показан так, как записан, и без «Прострочено». Документы, которые не прошли проверку контракта, приложение не показывает, а считает в заметке над списком; веб их показывает, поэтому число задач и порядок расходятся ровно на них. Почему документ не прошёл проверку, пишет журнал телефона: `adb -s <адрес>:<порт> logcat -d -s Loaded`.
+Срок приложение показывает во времени телефона, веб — во времени компьютера; при сверке часовой пояс у них один. Если телефон не знает часового пояса задачи (его база часовых поясов старее, чем у браузера), срок он понимает в своём поясе — так же, как веб в таком случае. Документы, которые не прошли проверку контракта, приложение не показывает, а считает в заметке над списком; веб их показывает, поэтому числа и порядок расходятся ровно на них. Если проверку не прошла категория, её задачи приложение показывает без категории. Почему документ не прошёл проверку, пишет журнал телефона: `adb -s <адрес>:<порт> logcat -d -s Loaded`.
 
 ## Эмулятор
 
````

Изменения в `CLAUDE.md`:

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index 5994ce9..ed358d8 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -93,7 +93,7 @@ functions/
 
 ### Android app
 
-`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, with JUnit tests on `contract/`; `app` — the Android application: Firebase Auth and Firestore with `android/app/google-services.json` (out of git; `firebase apps:sdkconfig`), screens on Compose. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
+`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), stage 2 [spec](docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, with JUnit tests on `contract/`; `app` — the Android application: Firebase Auth and Firestore with `android/app/google-services.json` (out of git; `firebase apps:sdkconfig`), screens on Compose. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
 
 - Never print `~/.gradle/gradle.properties` whole (`cat`, `less`, an unanchored `grep`): it holds the release key passwords. Read one non-secret line at a time, e.g. `grep '^org.gradle.java.home' ~/.gradle/gradle.properties`.
 - `core` compiles against the JDK but runs on Android 8+: `-Xjdk-release=17` keeps out Java 18+ methods, not the Java 9–17 ones Android 8 lacks (`List.of` …). Use `java.time` and the Kotlin standard library there.
````

- [ ] **Step 2: Полная проверка и неизменный веб**

```bash
android/gradlew -p android clean check
tail -1 android/app/build/reports/lint-results-debug.txt
git diff --stat main...HEAD -- . ':!android' ':!docs' ':!CLAUDE.md'
```

Expected: `core tests: 106 passed, 0 failed, 0 skipped`, `app debug tests: 25 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`, `No issues found.`; `git diff --stat` ничего не выводит: кроме `android/` и документации, ветка ничего не меняет. В копии без локальной ветки `main` — `origin/main...HEAD`.

- [ ] **Step 3: Сборки для эмулятора: релиз с R8 и тесты**

Релиз (R8) подписывается одноразовым ключом, как в этапе 1 — это не ключ владельца:

```bash
K=/media/big_disk/android/work/throwaway-release.jks
mkdir -p /media/big_disk/android/work && rm -f $K
/media/big_disk/android/android-studio/jbr/bin/keytool -genkeypair -keystore $K -storetype PKCS12 -storepass throwaway-test -keypass throwaway-test -alias throwaway -keyalg RSA -keysize 2048 -validity 2 -dname "CN=ToDo-Round throwaway test"
android/gradlew -p android :app:assembleDebug :app:assembleDebugAndroidTest :app:assembleRelease -Ptodoround.emulators=true -Ptodoround.release.storeFile=$K -Ptodoround.release.storePassword=throwaway-test -Ptodoround.release.keyAlias=throwaway -Ptodoround.release.keyPassword=throwaway-test
/media/big_disk/android/sdk/build-tools/37.0.0/apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk 2>/dev/null | grep 'certificate DN'
rm -f $K
```

Expected: `BUILD SUCCESSFUL`; `V2 Signer: certificate DN: CN=ToDo-Round throwaway test`.

- [ ] **Step 4: Проверка на эмуляторе**

Свободен ли эмулятор — эмулятор Android может работать у другой сессии:

```bash
source /media/big_disk/android/android-env.sh && if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"; else echo "no emulator"; fi
```

Expected: `no emulator`. Иначе — ждать и проверять снова: чужой эмулятор не трогать.

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-2-1.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi):

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Сначала тесты на устройстве и снимки списка, которые они принесли:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
ls android/app/build/device-screens
```

Expected: `OK (25 tests)` и `Script exited successfully (code 0)`; `list-en-light.png`, `list-uk-dark.png`. Снимки открыть и посмотреть, как в задаче 4 (шаг 8).

Релиз после R8 запускается (вход он не делает: релиз работает с настоящим проектом). Он идёт после тестов: в первую минуту после загрузки система эмулятора бывает ещё не готова рисовать, и снимок выходит чисто чёрным, хотя приложение уже на экране. Снимок делается, когда в дереве экрана появилось название именно этого приложения:

```bash
source /media/big_disk/android/android-env.sh
adb -e uninstall com.pmobile78.todoround
adb -e install android/app/build/outputs/apk/release/app-release.apk
adb -e logcat -c
adb -e shell am start -W -n com.pmobile78.todoround/.MainActivity | grep Status
timeout 120 sh -c 'until adb -e exec-out uiautomator dump /dev/tty | grep -q "text=\"ToDo-Round\"[^>]*package=\"com.pmobile78.todoround\""; do sleep 1; done'
adb -e exec-out screencap -p > /media/big_disk/android/work/stage-2-1-release.png
adb -e logcat -d | grep -c 'FATAL EXCEPTION'
adb -e uninstall com.pmobile78.todoround
```

Expected: `Failure […]` (приложения не было) или `Success`, затем `Success`, `Status: ok`, `0` и `Success`. Снимок открыть: экран входа — три пузыря, «ToDo-Round», вкладки «Login» и «Register», переключатель EN/UK. Если снимок всё же чёрный, через минуту повторить этот блок.

Эмулятор остаётся чистым — приложения нет, тема светлая — и выключается с ожиданием конца процесса:

```bash
source /media/big_disk/android/android-env.sh
adb -e shell pm list packages | grep -c todoround || true
adb -e shell cmd uimode night
adb -e emu kill
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' || pkill -TERM -f '[q]emu-system.*ToRound_API37'
timeout 60 sh -c 'while pgrep -f "[q]emu-system.*ToRound_API37" > /dev/null; do sleep 2; done' && echo "emulator stopped"
```

Expected: `0`, `Night mode: no`, `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 5: Commit**

Коммит документации не ждёт проверок с вебом и на телефоне: в репозитории они ничего не меняют.

```bash
git add CLAUDE.md docs/android.md
git commit -F - <<'EOF'
docs(android): the list with the web's tabs, how to compare it with the web

Stage 2.1, task 5. docs/android.md: the list is the web's list with its
tabs, the filter and the sort are settings shared with the web, how to
compare the four tabs, and a due zone the phone does not know is read in
its own zone. CLAUDE.md links the stage 2 spec.
EOF
```

- [ ] **Step 6: Проверка с вебом на эмуляторах**

Это проверка спецификации (раздел 11.2): сортировка и фильтр, изменённые на одной стороне, видны на другой без перезагрузки. Её делает исполнитель: веб — во встроенном браузере, приложение — на эмуляторе Android, оба — на одних эмуляторах Firebase (проект `demo-to-round`, в прод ничего не уходит). В черновике плана эта проверка прошла так, как описано ниже.

1. Отладочная сборка с ключом эмуляторов: `android/gradlew -p android :app:assembleDebug -Ptodoround.emulators=true`, затем `--stop`. Эмулятор Android свободен, запущен и загружен — блоками шага 4.
2. Порты Firebase и 3000 свободны (`ss -ltn | grep -E ':(9099|8180|4400|4500|9150|3000)\b'` ничего не печатает). В фоне (`run_in_background`) запустить веб на эмуляторах Firebase: `npm run start:emulator` (если в копии нет `node_modules` — сначала `npm ci --legacy-peer-deps`). Веб готов, когда в его выводе есть строка `Local:` — адрес из неё (обычно `http://localhost:3000/to-round-react/`; если порт 3000 занят, Vite берёт следующий).
3. Тестовый аккаунт и его данные — скриптом ниже: он заводит пользователя `live-21@example.com` с паролем тестов на устройстве (`secret-1`) на эмуляторе Auth и пишет документы через REST эмулятора Firestore с заголовком `Authorization: Bearer owner` (правила для него не действуют). Поэтому типы важны: целые числа — `integerValue`, время — `timestampValue`, у `settings` все 11 полей — иначе правила потом отклонят каждую запись телефона в этот документ, и проверка покажет «The change could not be saved.». Сохранить скрипт в `/media/big_disk/android/work/seed-2-1.mjs` и выполнить `node /media/big_disk/android/work/seed-2-1.mjs` (если хук не даёт `node` обращаться к `localhost` из командной строки — тем же кодом в песочнице `ctx_execute`). Expected: `seeded`.

```js
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key';
const FS = 'http://127.0.0.1:8180/v1/projects/demo-to-round/databases/(default)/documents';
const user = await (await fetch(AUTH, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'live-21@example.com', password: 'secret-1', returnSecureToken: true }) })).json();
const uid = user.localId;
// A value of Firestore's REST API: whole numbers as integers, Dates as timestamps.
const v = (x) => {
  if (x === null) return { nullValue: null };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'string') return { stringValue: x };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } };
};
const put = async (path, data) => {
  const res = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: { 'content-type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: v(data).mapValue.fields }) });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
};
const now = new Date();
await put(`users/${uid}`, { schemaVersion: 2, createdAt: now, updatedAt: now, settings: {
  themeMode: 'system', design: 'classic', language: 'en', mainView: 'list', labelFontSize: 8, bubbleBackground: true,
  showCategoriesPanel: false, showInstructions: false,
  bubbleFilter: { categoryIds: null, showUncategorized: true, plannedOnly: false },
  listFilter: { categoryIds: null, showUncategorized: true }, listSort: { by: 'updatedAt', order: 'desc' } } });
await put(`users/${uid}/categories/home`, { schemaVersion: 2, name: 'Home', color: '#46a549', order: 1, createdAt: now, updatedAt: now });
await put(`users/${uid}/categories/work`, { schemaVersion: 2, name: 'Work', color: '#da3833', order: 2, createdAt: now, updatedAt: now });
const task = (title, categoryId, at, extra = {}) => ({ schemaVersion: 2, title, description: '', categoryId, status: 'active', due: null,
  reminders: [], repeat: null, radius: 45, pulseMuted: false, overdueAt: null, createdAt: new Date(at), updatedAt: new Date(at), deletedAt: null, ...extra });
await put(`users/${uid}/tasks/a`, task('Alpha', 'home', '2026-10-01T08:00:00Z'));
await put(`users/${uid}/tasks/b`, task('Beta', 'work', '2026-10-03T08:00:00Z'));
await put(`users/${uid}/tasks/c`, task('Gamma', null, '2026-10-02T08:00:00Z'));
await put(`users/${uid}/tasks/d`, task('Done one', 'home', '2026-10-04T08:00:00Z', { status: 'done' }));
await put(`users/${uid}/tasks/e`, task('Trashed', null, '2026-10-05T08:00:00Z', { status: 'deleted', deletedAt: new Date('2026-10-05T08:00:00Z') }));
await put(`users/${uid}/tasks/f`, task('Later', 'work', '2026-10-06T08:00:00Z', { due: { local: '2099-12-31T08:00', tz: 'Europe/Kyiv' } }));
console.log('seeded');
```

4. Приложение: поставить сборку (`adb -e install -t android/app/build/outputs/apk/debug/app-debug.apk`), включить `adb -e reverse tcp:9099 tcp:9099` и `adb -e reverse tcp:8180 tcp:8180`, открыть и войти этим аккаунтом — касаниями `adb -e shell input tap` по координатам из `uiautomator dump` и `adb -e shell input text`. Список: «Later», «Beta», «Gamma», «Alpha», «Active Tasks (4)».
5. Веб: открыть во встроенном браузере адрес из шага 2 и войти тем же аккаунтом (поля формы заполнить в странице). Веб сразу показывает список (`mainView: "list"`): те же четыре строки и «Active Tasks (4)».
6. Телефон → веб: на телефоне выбрать сортировку «Title» — список веба перестраивается без перезагрузки («Later», «Gamma», «Beta», «Alpha»), его поле сортировки показывает «Title». На телефоне снять в панели фильтра категорию Work — веб показывает «Alpha», «Gamma» и «Active Tasks (2)».
7. Веб → телефон: в вебе сменить направление сортировки (кнопка со стрелкой) — телефон показывает обратный порядок и стрелку вверх («Sort ascending»); в вебе в фильтре нажать «Select All» — телефон снова показывает четыре задачи.
8. Убрать за собой: приложение удалить (`adb -e uninstall com.pmobile78.todoround`), `adb -e reverse --remove-all`, эмулятор выключить блоком шага 4. `npm run start:emulator` остановить сигналом `INT` своим процессам `firebase emulators:exec` и `vite` — тем, чей каталог (`readlink /proc/<pid>/cwd`) — эта копия; затем `ss -ltn | grep -E ':(9099|8180|4400|4500|9150|3000)\b'` ничего не печатает.

Итог — в журнал исполнения. Если сторона не видит изменения другой без перезагрузки — остановиться и разобрать причину (superpowers:systematic-debugging) до правок.

- [ ] **Step 7: Сверка вкладок на Redmi 9**

Это проверка подплана 2.1 (спецификация, разделы 11.3 и 13): четыре вкладки телефона под аккаунтом владельца совпадают с вебом. Исполнитель здесь только читает: сортировку и фильтр на настоящем аккаунте не меняет, задачи не трогает. Владелец:

- говорит «да». Сборку 2.1 он потом оставляет себе, а она уже пишет: сортировка и фильтр, изменённые на телефоне, меняются и в вебе — это общие настройки (спецификация, 2.2 № 7). В отладочной сборке есть ещё пустая служебная активность тестов экрана (`ui-test-manifest`) — она ничего не делает;
- включает на телефоне «Отладку по Wi-Fi» и присылает адрес и порт с её главного экрана (компьютер и телефон сопряжены, код не нужен);
- держит включённой в MIUI «Отладку по USB (настройки безопасности)» — без неё adb не может листать.

```bash
android/gradlew -p android :app:assembleDebug
android/gradlew -p android --stop
source /media/big_disk/android/android-env.sh
adb connect <адрес>:<порт>
adb -s <адрес>:<порт> install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Expected: `BUILD SUCCESSFUL`, `connected to <адрес>:<порт>`, `Success`. При установке телефон спрашивает Play Защиту и MIUI — владелец подтверждает оба окна; окно MIUI само закрывается с отменой примерно через 10 секунд. Сборка этапа 1 стоит на телефоне с тем же ключом, поэтому `install -r` ставит поверх, и вход владельца сохраняется.

Сверка — по разделу «Сверка списка с вебом» `docs/android.md`:

1. До сверки записать с телефона (`uiautomator dump`) подпись сортировки («Сортувати за: …»), описание стрелки («Сортувати за зростанням» или «… спаданням») и выделена ли кнопка «Фільтр» (`selected`). После сверки — то же; совпадение значит, что случайное касание у вкладок ничего не записало. Кнопки сортировки и фильтра стоят прямо над вкладками: касаться их не нужно.
2. Веб — во встроенном браузере, где владелец вошёл в свой аккаунт; перезагрузить вкладку и открыть список кнопкой панели «Список завдань» (значок списка). Не пунктом меню «Список завдань як головний екран»: он пишет `settings.mainView` в прод.
3. Для каждой из четырёх вкладок: число в названии вкладки у телефона и у веба; строки по порядку — название, срок, «Прострочено» и категория. Строки телефона — `uiautomator dump` с прокруткой (`adb -s <адрес>:<порт> shell input swipe …` по списку, ниже вкладок), строки веба — из страницы (`javascript_tool`). Личное сравнивается хешами: SHA-256 названий и имён категорий с обеих сторон; печатаются только числа, даты и «совпало / не совпало», не названия. «Запланированные» сравниваются в одну и ту же минуту.
4. Заметки над списком телефона: нет «Документів, що не пройшли перевірку» и через несколько секунд нет «Немає зв’язку із сервером».

Итог записать в журнал исполнения и сообщить владельцу. Если что-то не совпадает — остановиться и разобрать причину (superpowers:systematic-debugging) до правок: какое правило, какая задача, что видит веб. Расхождение ровно на документы, не прошедшие проверку, — не ошибка: веб их показывает, приложение считает в заметке. Владелец не готов — шаг откладывается с отметкой в журнале; подплан 2.1 закрывается после него.

Затем телефон отключить от adb (приложение остаётся на телефоне):

```bash
source /media/big_disk/android/android-env.sh && adb disconnect <адрес>:<порт>
```

---

## Итог подплана 2.1 и передача в 2.2

После этого плана подплан 2.1 готов (обзор подпланов), когда сверка на Redmi 9 совпала (задача 5, шаг 7) и `android/gradlew -p android check` зелёный. Ветку `stage-2-tasks` можно влить в `main` — с согласия владельца.

- **Список.** `HomeScreen` — список веба с вкладками, поиском, сортировкой и фильтром; нажатие на строку пока ничего не делает. Правила — `TaskList.kt` в `core`: `tabTasks`, `tabCounts`, `filterCounts`, выбор панели (`chosen`, `toggled`, `toggledUncategorized`, `hidesSome`, `SHOW_ALL`, `SHOW_NONE`), `inOrder`, `dueMoment`, `dueView`, `listDateTime`, `changedAfterCreation`.
- **Записи.** Первая запись этапа — настройки списка: `SettingsRepository.setListSort` и `setListFilter`. Подплан 2.2 пишет задачи тем же путём: функция репозитория `suspend` → `AppViewModel.write { uid -> … }` → `Writes`; отказ сервера экран показывает сообщением «The change could not be saved.».
- **Для 2.2.** Строка задачи (`TaskRow` в `HomeScreen.kt`) получает кнопку главного действия и меню «⋮», а нажатие — экран «Задача»; `ListTab` и `holds` говорят, какие действия у задачи в какой вкладке. Зона для записи срока (`deviceTimeZone` по базе, иначе `UTC`) — в 2.3.
- **Мелочи ревью этого плана, оставленные на потом:**
  - сообщение об отклонённой записи фильтра играет под открытой панелью фильтра (отказ записи фильтра на деле невозможен: категорий не больше 20, правила берут до 100 id);
  - канал отказов записи живёт в `AppViewModel`, а не в аккаунте: отказ, пришедший после выхода, покажется следующему аккаунту; путь `AppViewModel` → `Writes` → сообщение целиком ни один тест не проходит;
  - в альбомной ориентации поиск, фильтр, сортировка и вкладки занимают большую часть экрана и, в отличие от веба, не уезжают вместе со списком;
  - расхождения с вебом на данных, которых клиенты не пишут: повтор id в `categoryIds` (веб тогда показывает всё), категория, не прошедшая проверку ядра (телефон показывает её задачи без категории, а выбор на телефоне выкидывает её id из фильтра), зоны вида `+05:00` и имена зон в другом регистре (веб их понимает, телефон читает срок в своей зоне).
- **Остаются из прежних ревью:** високосная секунда и 29 февраля в `isIsoTimestamp`, годы 0000–0099 в `parseLocal` (этап 5, импорт бэкапа); поток данных после сбоя не перезапускается — помогают выход и вход; `addTestListener` и кэш конфигурации Gradle; копия списка в `Records.stringsOrNull`; приведение `as FirebaseFirestoreException` в тестах; кэш Firestore после выхода остаётся на устройстве, как в вебе.
