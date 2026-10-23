# Этап 1.3: список задач и проверка на Redmi 9 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить экран-заглушку 1.2 списком задач — теми же задачами в том же порядке, что во вкладке «Активные» веба, со сроками, категориями и состояниями экрана, — поправить мелочи формы входа из ревью 1.2 и закончить этап 1 проверкой владельца на Redmi 9 против свежей вкладки веба.

**Architecture:** Правила вкладки «Активные» — в `core` (`ActiveList.kt`): какие задачи показать (`status == active` и сохранённый в вебе `listFilter`), в каком порядке (`listSort`, как в `TaskList.jsx`), как показать срок (время телефона, отметка «Просрочено»; зона, которой телефон не знает, — как записана). `app`: `HomeScreen` становится списком — число задач, заметки о кэше и о документах, не прошедших проверку, строки задач; сбой потока данных показывается текстом, а не вечным индикатором (`signedInSession`). Тест на устройстве готовит аккаунт клиентом «веба» и сам делает снимки списка, которые `android/device-tests.sh` приносит в `android/app/build/device-screens/`.

**Tech Stack:** как в 1.2 — Kotlin 2.4.21, Compose BOM 2026.09.00 (Material 3), Firebase BoM 35.1.0, AppCompat 1.8.0, Lifecycle 2.11.0; тесты JVM — JUnit 6, на устройстве — Compose UI test, AndroidX Test, Espresso 3.7.0; эмуляторам Firebase нужны Firebase CLI 15 и Java 21+. Новых библиотек нет.

**Spec:** [docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md](../specs/2026-10-22-stage-1-android-foundation-design.md) — разделы 2.2 (№ 6), 4, 7, 9, 10 (№ 4), 11. Обзор — [2026-10-22-stage-1-overview.md](2026-10-22-stage-1-overview.md). Основа — исполненный подплан [1.2](2026-10-22-stage-1-2-firebase-sign-in-and-data.md) (раздел «Передача в 1.3») и правка ревью `ad7ecc9`. Эталон списка — `src/components/TaskList.jsx` веба. Весь код плана прогнан в черновой копии ветки: числа тестов и строки `Expected` — настоящие, тесты на устройстве — на эмуляторе `ToRound_API37` (Android 17).

## Global Constraints

- Ветка `stage-1-android-foundation` от `ad7ecc9`; спецификация (с уточнениями после черновика этого плана — отдельный коммит перед ним, как в 1.2), обзор и этот план — в ней. В `main` не коммитить, ничего не пушить без слова владельца.
- Веб, `contract/`, правила Firestore, Cloud Functions и CI не меняются. Исключение — документация в задаче 4: `docs/android.md` и `CLAUDE.md`. Новых общих примеров в `contract/` правила списка не требуют: спецификация (раздел 9) проверяет их тестами `core`, а совпадение с вебом проверено в черновике разовой сверкой — 400 случайных случаев через настоящий `TaskList.jsx` веба, 0 расхождений.
- Все команды — из корня репозитория; Gradle — `android/gradlew -p android …`, на JBR Android Studio, как в 1.1 и 1.2.
- `android/app/google-services.json` — вне git; в копии, где его нет, его скачивает шаг 1 задачи 2. Регистрацию приложения в Firebase не повторять, проект Firebase не менять.
- Эмуляторы Firebase — из `firebase.json`: Auth на 9099, Firestore на 8180, проект `demo-to-round`. Перед запуском порты свободны: `ss -ltn | grep -E ':(9099|8180)\b'` ничего не печатает; процессы других сессий не трогать.
- Памяти 14 ГБ: Gradle и эмулятор Android одновременно не работают. Порядок прогона на устройстве: сборка; `android/gradlew -p android --stop`; эмулятор в фоне (`run_in_background`); ожидание загрузки одной командой с тайм-аутом 10 минут; тесты; `adb -e emu kill`.
- Тесты на устройстве идут только на сборке с `-Ptodoround.emulators=true` и только на эмуляторе: `android/device-tests.sh` удаляет приложение до и после прогона, а на телефоне владельца это стёрло бы его вход. Итог печатает скрипт: `OK (N tests)` или список ошибок.
- `adb -e` — эмулятор. Телефон Redmi 9 — только по Wi-Fi (`adb -s <адрес>:<порт>`) и только после «да» владельца (задача 4): по кабелю от этого компьютера у телефона бывают фантомные касания. Телефон по Wi-Fi для adb — такое же сетевое устройство, как эмулятор, и `adb -e` его не отличит («more than one emulator», ложное `booted`): перед работой с эмулятором — `adb disconnect <адрес>:<порт>`. Ожидание загрузки и `android/device-tests.sh` сами останавливаются, если `adb -e` — не эмулятор.
- Приложение в прод ничего не пишет: документ пользователя у аккаунта владельца уже есть (спецификация, 2.2 № 7).
- Версии библиотек и плагинов не менять. Если Lint сообщит только о вышедших новых версиях (`GradleDependency`, `AndroidGradlePluginVersion`), записать это в журнал исполнения и продолжать.
- `~/.gradle/gradle.properties` целиком не выводить: там пароли релизного ключа. Строки смотреть по одной.
- Код в плане взят из проверенной черновой копии без правок. Новые и переписанные целиком файлы даны полностью (перед блоком — строка с путём); изменения существующих — блоками `diff` относительно состояния после предыдущей задачи: блок можно сохранить во временный файл и применить `git apply <файл>` из корня репозитория. Блоки кода ограничены четырьмя обратными кавычками.
- Kotlin — официальный стиль; комментарии в коде — на английском. Имена тестов на устройстве — camelCase (D8 и `minSdk` 26), тестов JVM — в обратных кавычках.
- Каждая сборка печатает `[Incubating] Problems report is available at: …` и `Consider enabling configuration cache …` — это не ошибки; строки `Expected` их не упоминают.

## Review Focus

- **Порядок равных.** Задачи с одинаковым ключом сортировки веб показывает в порядке id документов — так их отдаёт Firestore сразу после загрузки страницы, — и в обе стороны сортировки. Равных много: при сортировке по категории это все задачи одной категории. `ActiveListTest`, задача 1.
- **Сравнение как в JavaScript.** Названия и имена категорий — без учёта регистра (`toLowerCase`, в том числе кириллица), время — до миллисекунды, как `Date`, хотя Android читает из Firestore микросекунды. `ActiveListTest`, задача 1; вместе с порядком равных это сверено с настоящим `TaskList.jsx` на 400 случайных случаях.
- **Фильтр и удалённая категория.** `categoryIds: null` — все категории; задача, чья категория удалена (или не прошла проверку), считается «без категории», даже если её id есть в фильтре, и в строке показывается серым «No Tag», как в вебе. `ActiveListTest` (задача 1), `ListFlowTest` (задача 2).
- **Срок и часовой пояс.** Срок — во времени телефона; «Просрочено» — строго после момента срока; зона, которой нет в базе телефона, — как записана и без «Просрочено» (спецификация, раздел 7). `ActiveListTest` (задача 1), `ListFlowTest` (задача 2).
- **Пробел после адреса.** Клавиатура оставляет пробел после предложенного адреса; веб его отбрасывает (поле `type="email"`), а эмулятор Auth счёл бы `olena@example.com ` другим адресом — «User not found» при входе и новый пользователь с пробелом при регистрации. `AuthFlowTest`, задача 3.

## Мелочи ревью 1.2

Ревью исполненного подплана 1.2 отложило семь мелочей (журнал исполнения 1.2). В этот план вошли те, что касаются владельца на телефоне или правил спецификации:

| № | Мелочь | Решение |
|---|---|---|
| 2 | Нажатие на уже выбранную вкладку стирает форму | Да, задача 3: в вебе вкладка MUI зовёт `onChange` только для другой вкладки |
| 3 | `device-tests.sh` знает только `adb -e` и не убирает за собой при сбое | Уборка — да, задача 2 (`trap`); к тому же скрипт ничего не делает, если `adb -e` — не эмулятор. Выбор устройства — нет: скрипт удаляет приложение, на телефоне владельца тесты не запускают; телефон по Wi-Fi отключают (`docs/android.md`, задача 4) |
| 4 | Язык телефона не возвращается, когда Firebase сам завершил сессию | Да, задача 3 (спецификация, раздел 8) |
| 5 | Проверка языка в `AuthFlowTest` на телефоне с украинской системой | Нет: тесты на устройстве идут только на эмуляторе с английской системой |
| 7 | Снимок «ждёт» дерево интерфейса, а не кадр на экране | Да: снимки списка делает сам тест сразу после своих проверок, а план велит смотреть их глазами и переснимать чёрные; ожидание снимка релиза сужено до пакета приложения (задача 4) |
| 8 | Адрес почты не очищается от пробелов | Да, задача 3: так делает поле почты веба |
| 9 | Приведение `as FirebaseFirestoreException` в двух тестах | Нет: только текст падения теста, файлы иначе не меняются |

## Структура файлов

| Файл | Ответственность |
|---|---|
| `android/core/src/main/kotlin/…/core/model/ActiveList.kt` | правила вкладки «Активные»: набор, порядок, срок в строке, запись даты и времени |
| `android/core/src/test/kotlin/…/core/model/ActiveListTest.kt` | тесты этих правил |
| `android/app/src/main/kotlin/…/ui/HomeScreen.kt` | (целиком) экран списка: верхняя панель с «Выйти», число задач, заметки, строки задач, состояния |
| `android/app/src/main/kotlin/…/ui/AppViewModel.kt` | сбой потока данных — состояние экрана; язык телефона после любого выхода |
| `android/app/src/main/kotlin/…/ui/AuthScreen.kt` | выбранная вкладка не стирает форму; адрес без пробелов вокруг |
| `android/app/src/main/res/values/strings.xml`, `values-uk/strings.xml` | строки списка вместо строк заглушки |
| `android/app/src/test/kotlin/…/ui/SessionTest.kt` | тест JVM: загрузка, данные, сбой |
| `android/app/src/androidTest/kotlin/…/ListFlowTest.kt` | тесты списка на устройстве: данные «веба», порядок, строки, заметки, живое обновление, снимки |
| `android/app/src/androidTest/kotlin/…/Emulators.kt`, `AuthFlowTest.kt` | снимок экрана из теста; тесты задач 2 и 3 |
| `android/device-tests.sh` | (целиком) уборка и при сбое; снимки тестов — в `android/app/build/device-screens/` |
| `docs/android.md`, `CLAUDE.md` | (изменение) список, сверка с вебом, снимки тестов, телефон по Wi-Fi и `adb -e` |

Пакеты: `…` — это `com/pmobile78/todoround`.

---

### Task 1: Правила вкладки «Активные» в ядре

**Files:**
- Create: `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt`

**Interfaces:**
- Consumes: из 1.1 — модели `Task`, `Due`, `Category`, `ListFilter`, `ListSort`, перечисления `TaskStatus`, `SortField`, `SortOrder`, `Language`; время `isValidTimeZone`, `toInstant`, `toLocal`.
- Produces (`com.pmobile78.todoround.core.model`): `data class ActiveList(val tasks: List<Task>, val all: Int)` и `fun activeList(tasks: List<Task>, categories: List<Category>, filter: ListFilter, sort: ListSort): ActiveList` — показанные задачи по порядку и число всех активных; `data class DueView(val local: String, val overdue: Boolean)` и `fun dueView(due: Due, zone: String, now: Instant): DueView`; `fun listDateTime(local: String, language: Language): String`.

- [ ] **Step 1: Написать падающий тест**

Примеры повторяют правила `TaskList.jsx` веба (спецификация, раздел 7). Каждый тест сортировки различает правильное и наивное решение: регистр (`Cherry` перед `apple` при сравнении с регистром), микросекунды (у `a` и `b` одна миллисекунда), порядок равных при сортировке по убыванию (простое `reversed()` всего сравнения перевернуло бы и id).

Файл `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.TaskStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.Instant

/** The "Active" tab of the web's task list (src/components/TaskList.jsx), on its own examples. */
class ActiveListTest {
    private val home = Category("c1", "home", "#46a549", 1.0)
    private val work = Category("c2", "Work", "#da3833", 2.0)
    private val everything = ListFilter(categoryIds = null, showUncategorized = true)
    private val byTitle = ListSort(SortField.TITLE, SortOrder.ASC)

    private fun task(
        id: String,
        title: String = "Task $id",
        categoryId: String? = null,
        status: TaskStatus = TaskStatus.ACTIVE,
        due: Due? = null,
        createdAt: String = "2026-10-01T08:00:00Z",
        updatedAt: String = createdAt,
    ) = Task(
        id = id,
        title = title,
        description = "",
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

    private fun ids(tasks: List<Task>, filter: ListFilter = everything, sort: ListSort = byTitle): List<String> =
        activeList(tasks, listOf(home, work), filter, sort).tasks.map { it.id }

    @Test
    fun `only active tasks are listed, the planned ones too`() {
        val tasks = listOf(
            task("a"),
            task("b", status = TaskStatus.DONE),
            task("c", status = TaskStatus.DELETED),
            task("d", due = Due("2099-01-01T09:00", "UTC")),
        )
        assertEquals(ActiveList(listOf(tasks[0], tasks[3]), all = 2), activeList(tasks, listOf(home, work), everything, byTitle))
    }

    @Test
    fun `the filter shows the chosen categories and, when asked, the tasks without one`() {
        val tasks = listOf(task("a", categoryId = "c1"), task("b", categoryId = "c2"), task("c"), task("d", categoryId = "gone"))
        assertEquals(listOf("a", "b", "c", "d"), ids(tasks))
        assertEquals(listOf("a", "b"), ids(tasks, ListFilter(categoryIds = null, showUncategorized = false)))
        assertEquals(listOf("a"), ids(tasks, ListFilter(listOf("c1"), showUncategorized = false)))
        assertEquals(listOf("a", "c", "d"), ids(tasks, ListFilter(listOf("c1"), showUncategorized = true)))
        // A task whose category is gone counts as one without a category, even when the filter names it.
        assertEquals(emptyList<String>(), ids(tasks, ListFilter(listOf("gone"), showUncategorized = false)))
        assertEquals(emptyList<String>(), ids(tasks, ListFilter(emptyList(), showUncategorized = false)))
        assertEquals(4, activeList(tasks, listOf(home, work), ListFilter(emptyList(), showUncategorized = false), byTitle).all)
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
    fun `a due shows in the zone of the phone and is overdue once its moment has passed`() {
        // 09:30 in New York on 23 October 2026 (EDT, UTC−4) is 13:30 UTC.
        val due = Due("2026-10-23T09:30", "America/New_York")
        assertEquals(DueView("2026-10-23T13:30", overdue = false), dueView(due, "UTC", Instant.parse("2026-10-23T13:30:00Z")))
        assertEquals(DueView("2026-10-23T15:30", overdue = true), dueView(due, "Europe/Berlin", Instant.parse("2026-10-23T13:30:00.001Z")))
    }

    @Test
    fun `a due zone this phone does not know is shown as written and never overdue`() {
        val due = Due("2026-10-23T09:30", "Mars/Olympus_Mons")
        assertEquals(DueView("2026-10-23T09:30", overdue = false), dueView(due, "UTC", Instant.parse("2030-01-01T00:00:00Z")))
    }

    @Test
    fun `dates are written as the web's list writes them`() {
        assertEquals("10/23/2026, 09:30", listDateTime("2026-10-23T09:30", Language.EN))
        assertEquals("23.10.2026, 09:30", listDateTime("2026-10-23T09:30", Language.UK))
        assertEquals("01/02/2026, 00:05", listDateTime("2026-01-02T00:05", Language.EN))
    }
}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/ActiveListTest.kt:43:9 Unresolved reference 'activeList'.`

- [ ] **Step 3: `ActiveList.kt`**

Порядок равных — по id документа в обе стороны: веб сортирует устойчиво массив, который Firestore отдаёт после загрузки страницы в порядке id, и равные остаются в нём при любом направлении. Дата и время пишутся шаблонами, а не форматом языка Android: так их пишет веб (`toLocaleDateString` с `en-US` и `uk-UA`, 24 часа). Правило спецификации «`updatedAt` без значения заменяется на `createdAt`» здесь не нужно: ядро требует `updatedAt`, и документ без него в список не попадает, а считается не прошедшим проверку.

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt`:

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
 * The "Active" tab of the web's task list (spec, section 7; src/components/TaskList.jsx): which
 * tasks it shows, in which order, and how it writes a due.
 */

/** The [tasks] the list shows, in their order, and the number of [all] active tasks, those the filter hides included. */
data class ActiveList(val tasks: List<Task>, val all: Int)

/**
 * The active tasks, the planned ones too, that [filter] lets through, in the order of [sort]. A
 * task whose category is not among [categories] counts as one without a category.
 */
fun activeList(tasks: List<Task>, categories: List<Category>, filter: ListFilter, sort: ListSort): ActiveList {
    val known = categories.associateBy { it.id }
    val chosen = filter.categoryIds?.toSet()
    val active = tasks.filter { it.status == TaskStatus.ACTIVE }
    val shown = active.filter { task ->
        val category = task.categoryId?.let(known::get)
        if (category == null) filter.showUncategorized else chosen == null || category.id in chosen
    }
    return ActiveList(shown.sortedWith(listOrder(sort, known)), all = active.size)
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

/** A due as the list shows it: the date and time on this phone ("YYYY-MM-DDTHH:mm"), and whether its moment has passed. */
data class DueView(val local: String, val overdue: Boolean)

/**
 * [due] in [zone], the zone of this phone, at [now]. A due zone this phone does not know is shown
 * as written and is never overdue (spec 7): its moment is unknown here.
 */
fun dueView(due: Due, zone: String, now: Instant): DueView {
    if (!isValidTimeZone(due.tz)) return DueView(due.local, overdue = false)
    val moment = toInstant(due.local, due.tz)
    return DueView(toLocal(moment, zone), overdue = moment < now)
}

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
````

- [ ] **Step 4: Тест проходит**

Run: `android/gradlew -p android :core:test`
Expected: `core tests: 96 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add android/core/src/main/kotlin/com/pmobile78/todoround/core/model/ActiveList.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/model/ActiveListTest.kt
git commit -F - <<'EOF'
feat(android): the rules of the web's Active tab in core

Stage 1.3, task 1. activeList gives the tasks of the web's Active tab
(src/components/TaskList.jsx): the active ones, the planned included, that
the saved listFilter lets through, in the order of listSort. Titles and
category names compare without case, times to the millisecond, and a tie
keeps the order of the document ids in both directions, as the web shows
the tasks after a page load; a task whose category is gone counts as one
without a category. dueView shows a due in the zone of the phone with the
overdue mark, or as written when the phone does not know its zone, and
listDateTime writes it as the web's list does.
EOF
```

---

### Task 2: Экран списка

**Files:**
- Create (команда, если файла нет): `android/app/google-services.json` (вне git)
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt` (целиком), `android/app/src/main/res/values/strings.xml`, `android/app/src/main/res/values-uk/strings.xml`, `android/device-tests.sh` (целиком)
- Test: `android/app/src/test/kotlin/com/pmobile78/todoround/ui/SessionTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt`; Modify: `android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt`

**Interfaces:**
- Consumes: `activeList`, `ActiveList`, `dueView`, `listDateTime` (задача 1); из 1.2 — `Session`, `UserData`, `Loaded<T>(items, invalid, fromCache)`, репозитории, `AppContent` (вызывает `HomeScreen(current, onSignOut = viewModel::signOut)` и не меняется), помощники тестов `emulatorBackend()`, `webBackend()`, `newEmail()`, `Backend.signUp(email)`, `SettingsRepository.createUserDoc`; из 1.1 — `deviceTimeZone()`, `defaultSettings`.
- Produces (`com.pmobile78.todoround.ui`): `Session.SignedIn(email: String, data: UserData?, failed: Boolean = false)` — `failed`: данные не прочитаны, поток закончился; `fun signedInSession(email: String, data: Flow<UserData?>): Flow<Session.SignedIn>`; `HomeScreen(session: Session.SignedIn, onSignOut: () -> Unit)` — список с метками `home`, `menu`, `logout`, `logout_confirm` (как в 1.2), `count`, `shown`, `invalid`, `offline`, `empty`, `failed`, `loading` и `task` — строка задачи, тексты которой (название, срок, «Overdue», категория) слиты в один узел; строки `list_*` (en, uk) вместо `home_*`.
- Produces для тестов на устройстве (`com.pmobile78.todoround`): `fun screenshot(name: String)` — снимок экрана в `/data/local/tmp/todoround-screens/<name>.png`; `android/device-tests.sh` приносит снимки в `android/app/build/device-screens/` и убирает за собой и после упавшего прогона.

- [ ] **Step 1: Настройки Firebase этой машины**

`app` не собирается без `google-services.json`. Файл вне git: в копии, где приложение уже собирали, он есть; иначе его скачивает Firebase CLI (вход в CLI — аккаунт владельца, как у веба):

```bash
test -f android/app/google-services.json || firebase apps:sdkconfig ANDROID 1:699564548059:android:9246f56b0bf422d85fd1fe --project todo-flutter-fb8bf -o android/app/google-services.json
git status --short --ignored android/app
```

Expected: в выводе `git status` есть строка `!! android/app/google-services.json` (в копии, где приложение уже собирали, есть и `!! android/app/build/`).

- [ ] **Step 2: Написать падающие тесты**

Тест JVM — поток сессии: сначала загрузка, затем данные; сбой потока заканчивается состоянием «не прочитано», а не вечной загрузкой (сейчас `AppViewModel` в этом случае только пишет в журнал).

Файл `android/app/src/test/kotlin/com/pmobile78/todoround/ui/SessionTest.kt`:

````kotlin
package com.pmobile78.todoround.ui

import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Loaded
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class SessionTest {
    private val email = "olena@example.com"
    private val data = UserData(defaultSettings("en"), Loaded(emptyList(), 0, false), Loaded(emptyList(), 0, false))

    @Test
    fun `the data of the account come after a loading state`() = runBlocking {
        assertEquals(
            listOf(Session.SignedIn(email, null), Session.SignedIn(email, data)),
            signedInSession(email, flowOf(data)).toList(),
        )
    }

    @Test
    fun `a failed data flow ends in a failure on the screen, not in loading for ever`() = runBlocking {
        val refused = flow<UserData?> {
            emit(data)
            throw IllegalStateException("PERMISSION_DENIED")
        }
        assertEquals(
            listOf(Session.SignedIn(email, null), Session.SignedIn(email, data), Session.SignedIn(email, null, failed = true)),
            signedInSession(email, refused).toList(),
        )
    }
}
````

Тест на устройстве готовит аккаунт так, как это сделал бы веб: клиент «веба» (второй клиент тех же эмуляторов, 1.2) регистрирует пользователя, пишет его настройки, категории и задачи — с фиксированным временем: правила принимают при создании время из прошлого. Приложение входит тем же пользователем и показывает список; тест сравнивает строки целиком и порядок, число задач и заметки, затем «веб» добавляет задачу, и она встаёт на своё место. Срок в зоне самого устройства показывается так, как записан, поэтому тексты не зависят от зоны эмулятора. Второй тест — аккаунт на украинском в тёмной теме: он ждёт, пока экран пересоздан тёмным (настройка AppCompat меняется раньше экрана), и только потом сверяет строки и снимает. Строки ждутся и тогда, когда в момент пересоздания на экране нет ни одного корня Compose. Оба теста делают снимок списка сразу после своих проверок: проверки видят дерево интерфейса, а снимок — то, что на экране.

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt`:

````kotlin
package com.pmobile78.todoround

import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ComposeTimeoutException
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.core.os.LocaleListCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListFilter
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Backend
import com.pmobile78.todoround.data.SettingsRepository
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
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
 * and the app, signed in as the same user, shows them as the web's "Active" tab (spec, section 7).
 */
@RunWith(AndroidJUnit4::class)
class ListFlowTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val backend = emulatorBackend()
    private val web = webBackend()

    // A due in the zone of this device shows as written.
    private val here = ZoneId.systemDefault().id

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
    private suspend fun Backend.category(uid: String, id: String, name: String, color: String) {
        val data = mapOf(
            "schemaVersion" to 2,
            "name" to name,
            "color" to color,
            "order" to 1,
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
    ) {
        val time = Timestamp(Instant.parse(updatedAt))
        val data = mapOf(
            "schemaVersion" to 2,
            "title" to title,
            "description" to "",
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
            "deletedAt" to null,
        )
        db.document("users/$uid/tasks/$id").set(data).await()
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
    fun theListIsTheActiveTabOfTheWebAndChangesLive() {
        val email = newEmail()
        val uid = runBlocking {
            // The web shows this account the category Home and the tasks without one, sorted by title.
            val settings = defaultSettings("en").copy(
                listFilter = ListFilter(categoryIds = listOf("home"), showUncategorized = true),
                listSort = ListSort(SortField.TITLE, SortOrder.ASC),
            )
            webAccount(email, settings).also { uid ->
                web.category(uid, "home", "Home", "#46a549")
                web.category(uid, "work", "Work", "#da3833")
                web.task(uid, "t1", "buy milk", "home", Due("2026-10-01T09:30", here))
                web.task(uid, "t2", "Call the bank", "home", Due("2099-12-31T08:00", here))
                web.task(uid, "t3", "Apples", null)
                web.task(uid, "t4", "Mars trip", "gone", Due("2026-10-23T09:30", "Mars/Olympus_Mons"))
                web.task(uid, "t5", "Report", "work")
                web.task(uid, "t6", "Done before", "home", status = "done")
                // The rules leave the elements of reminders to the clients; the core wants whole hours.
                // The web shows such a task, the app only counts it (spec 6).
                web.task(uid, "t7", "Odd", null, Due("2026-10-01T09:30", "UTC"), reminders = listOf(61))
            }
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }

        waitForRows(
            listOf(
                "Apples",
                "buy milk|Due date: 10/01/2026, 09:30|Overdue|Home",
                "Call the bank|Due date: 12/31/2099, 08:00|Home",
                "Mars trip|Due date: 10/23/2026, 09:30|No Tag",
            ),
        )
        compose.onNodeWithTag("count").assertTextEquals("Active Tasks (4)")
        compose.onNodeWithTag("shown").assertTextEquals("Showing 4 of 5")
        compose.onNodeWithTag("invalid").assertTextEquals("Documents that failed the check: 1")
        screenshot("list-en-light")

        // Another device adds a task: the list takes it in at its place.
        runBlocking { web.task(uid, "t8", "Aardvark", "home", updatedAt = "2026-10-02T08:00:00Z") }
        compose.waitUntil(60_000) { rows().firstOrNull() == "Aardvark|Home" }
        compose.onNodeWithTag("count").assertTextEquals("Active Tasks (5)")
        compose.onNodeWithTag("shown").assertTextEquals("Showing 5 of 6")
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
                "Купити хліб|Термін виконання: 01.10.2026, 09:30|Прострочено|Дім",
                "Зателефонувати|Термін виконання: 31.12.2099, 08:00",
            ),
        )
        compose.onNodeWithTag("count").assertTextEquals("Активні завдання (2)")
        compose.onAllNodesWithTag("shown").assertCountEquals(0)
        screenshot("list-uk-dark")
    }
}
````

Снимок делает оболочка устройства (`screencap`) — по команде теста через `UiAutomation`:

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
index c615273..c727c8e 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt
@@ -1,6 +1,8 @@
 package com.pmobile78.todoround
 
+import android.os.ParcelFileDescriptor
 import androidx.test.core.app.ApplicationProvider
+import androidx.test.platform.app.InstrumentationRegistry
 import com.google.firebase.firestore.DocumentReference
 import com.google.firebase.firestore.DocumentSnapshot
 import com.google.firebase.firestore.MetadataChanges
@@ -53,6 +55,22 @@ suspend fun DocumentReference.fromServer(): DocumentSnapshot {
     }
 }
 
+/**
+ * A screenshot of the device as /data/local/tmp/todoround-screens/[name].png, which
+ * android/device-tests.sh brings back to android/app/build/device-screens. The checks before it
+ * prove the tree of the screen, not the picture on the display: the screenshot is looked at.
+ */
+fun screenshot(name: String) {
+    shell("mkdir -p /data/local/tmp/todoround-screens")
+    shell("screencap -p /data/local/tmp/todoround-screens/$name.png")
+}
+
+/** Runs [command] as the shell of the device and waits for it to end. */
+private fun shell(command: String) {
+    val output = InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command)
+    ParcelFileDescriptor.AutoCloseInputStream(output).use { it.readBytes() }
+}
+
 /** The emails the Auth emulator would have sent: its emulator/v1/…/oobCodes, newest last. */
 suspend fun sentEmails(): List<JSONObject> = withContext(Dispatchers.IO) {
     val connection = URL("http://127.0.0.1:9099/emulator/v1/projects/demo-to-round/oobCodes").openConnection() as HttpURLConnection
````

Строки «Signed in as …» на новом экране нет — веб тоже не показывает адрес. `AuthFlowTest` после регистрации ждёт пустой список нового аккаунта:

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt
index 7ef30ec..3f081c3 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt
@@ -7,7 +7,6 @@ import androidx.compose.ui.test.assertTextEquals
 import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
 import androidx.compose.ui.test.onAllNodesWithTag
 import androidx.compose.ui.test.onNodeWithTag
-import androidx.compose.ui.test.onNodeWithText
 import androidx.compose.ui.test.performClick
 import androidx.compose.ui.test.performSemanticsAction
 import androidx.compose.ui.test.performTextInput
@@ -97,8 +96,8 @@ class AuthFlowTest {
         type("password", "secret-1")
         type("confirm", "secret-1")
         press("submit")
-        waitFor("home")
-        compose.onNodeWithText(text(R.string.home_signed_in_as, email)).assertExists()
+        // A new account has no tasks yet, and the list says so.
+        waitFor("empty")
 
         signOutOnScreen()
         signInOnScreen(email, "secret-1")
````

- [ ] **Step 3: Тест падает**

Run: `android/gradlew -p android :app:testDebugUnitTest`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugUnitTestKotlin'`; первая ошибка — `e: …/SessionTest.kt:20:13 Unresolved reference 'signedInSession'.`

- [ ] **Step 4: Сбой потока данных — состояние экрана**

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
index 3b0f2ca..a4fe896 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
@@ -22,6 +22,7 @@ import kotlinx.coroutines.flow.catch
 import kotlinx.coroutines.flow.combine
 import kotlinx.coroutines.flow.flatMapLatest
 import kotlinx.coroutines.flow.flowOf
+import kotlinx.coroutines.flow.map
 import kotlinx.coroutines.flow.onStart
 import kotlinx.coroutines.flow.stateIn
 
@@ -35,10 +36,26 @@ sealed interface Session {
 
     data object SignedOut : Session
 
-    /** [data] is null until the settings, the tasks and the categories have all been read. */
-    data class SignedIn(val email: String, val data: UserData?) : Session
+    /**
+     * [data] is null until the settings, the tasks and the categories have all been read, and
+     * when they could not be: then [failed], and they no longer change.
+     */
+    data class SignedIn(val email: String, val data: UserData?, val failed: Boolean = false) : Session
 }
 
+/**
+ * The session of the user [email] over the flow of their [data]: loading first, then the data.
+ * A failure of the flow, a refusal of the rules say, stays on the screen as one (spec 7) instead
+ * of loading for ever.
+ */
+fun signedInSession(email: String, data: Flow<UserData?>): Flow<Session.SignedIn> =
+    data.map { Session.SignedIn(email, it) }
+        .onStart { emit(Session.SignedIn(email, null)) }
+        .catch {
+            Log.w("AppViewModel", "the data of the account could not be read", it)
+            emit(Session.SignedIn(email, null, failed = true))
+        }
+
 /** The session of the app: who is signed in and their data, live (spec 6). */
 class AppViewModel(application: Application) : AndroidViewModel(application) {
     private val backend = (application as ToDoRoundApp).backend
@@ -62,13 +79,12 @@ class AppViewModel(application: Application) : AndroidViewModel(application) {
 
     // A new account gets the language of the sign-in screen (spec 8).
     private fun signedIn(user: FirebaseUser): Flow<Session> =
-        combine(
-            settings.settings(user.uid, appLanguage().wire),
-            tasks.tasks(user.uid),
-            categories.categories(user.uid),
-        ) { settings, tasks, categories ->
-            Session.SignedIn(user.email.orEmpty(), settings?.let { UserData(it, tasks, categories) })
-        }
-            .onStart { emit(Session.SignedIn(user.email.orEmpty(), null)) }
-            .catch { Log.w("AppViewModel", "the data of the account could not be read", it) }
+        signedInSession(
+            user.email.orEmpty(),
+            combine(
+                settings.settings(user.uid, appLanguage().wire),
+                tasks.tasks(user.uid),
+                categories.categories(user.uid),
+            ) { settings, tasks, categories -> settings?.let { UserData(it, tasks, categories) } },
+        )
 }
````

- [ ] **Step 5: Экран списка и его строки**

Экран — как вкладка «Активные» веба: над списком «Active Tasks (N)» — то же, что в названии вкладки веба, «Showing N of M», если фильтр веба скрывает часть задач, и заметки о документах, не прошедших проверку, и о данных только из кэша. Строка задачи: название; срок во времени телефона — синий, а после момента срока красный с отметкой «Overdue»; категория — её имя на её цвете, удалённая — серое «No Tag». Описание не показывается (спецификация, 2.2 № 6). Тексты строк — из `src/locales` веба (`bubbles.*`), где они там есть. Число задач и заметки прокручиваются вместе со списком.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.deviceTimeZone
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.activeList
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.dueView
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import java.time.Instant

/**
 * The screen of a signed-in user: the top bar with the menu "Logout" and the task list, the web's
 * "Active" tab with the saved filter and sort of the account (spec 7). It follows the data live.
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
        val data = session.data
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                session.failed -> Note(stringResource(R.string.list_failed), MaterialTheme.colorScheme.error, "failed", Modifier.padding(16.dp))
                data == null -> CircularProgressIndicator(Modifier.align(Alignment.Center).testTag("loading"))
                else -> TaskList(data)
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

/** The tasks of [data] as the web's "Active" tab, under their number and the notes about the data. */
@Composable
private fun TaskList(data: UserData) {
    val settings = data.settings
    val list = remember(data) { activeList(data.tasks.items, data.categories.items, settings.listFilter, settings.listSort) }
    val categories = remember(data) { data.categories.items.associateBy { it.id } }
    val invalid = data.tasks.invalid + data.categories.invalid
    val zone = deviceTimeZone()
    val now = Instant.now()
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = stringResource(R.string.list_count, list.tasks.size),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.testTag("count"),
                )
                val quiet = MaterialTheme.colorScheme.onSurfaceVariant
                if (list.tasks.size < list.all) Note(stringResource(R.string.list_shown, list.tasks.size, list.all), quiet, "shown")
                if (invalid > 0) Note(stringResource(R.string.list_invalid, invalid), MaterialTheme.colorScheme.error, "invalid")
                if (data.tasks.fromCache || data.categories.fromCache) Note(stringResource(R.string.list_offline), quiet, "offline")
            }
        }
        if (list.tasks.isEmpty()) {
            item { Note(stringResource(R.string.list_empty), MaterialTheme.colorScheme.onSurfaceVariant, "empty") }
        }
        items(list.tasks, key = { it.id }) { task ->
            TaskRow(task, task.categoryId?.let(categories::get), settings.language, zone, now)
        }
    }
}

/** A task as the web's list shows it: the title, the due (red and "Overdue" once passed), the category. */
@Composable
private fun TaskRow(task: Task, category: Category?, language: Language, zone: String, now: Instant) {
    OutlinedCard(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("task")
            .semantics(mergeDescendants = true) {},
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(task.title, style = MaterialTheme.typography.titleMedium)
            task.due?.let { due ->
                val view = dueView(due, zone, now)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
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
        }
    }
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
````

Изменения в `android/app/src/main/res/values/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values/strings.xml b/android/app/src/main/res/values/strings.xml
index 55f124d..c75fbc2 100644
--- a/android/app/src/main/res/values/strings.xml
+++ b/android/app/src/main/res/values/strings.xml
@@ -34,11 +34,14 @@
     <string name="auth_error_network">Network error. Please check your connection.</string>
     <string name="auth_error_unexpected">An unexpected error occurred.</string>
 
-    <!-- The screen after sign-in until the task list of sub-plan 1.3. -->
-    <string name="home_signed_in_as">Signed in as %1$s</string>
-    <string name="home_tasks">Tasks: %1$d</string>
-    <string name="home_categories">Categories: %1$d</string>
-    <string name="home_invalid">Documents that failed the check: %1$d</string>
-    <string name="home_offline">No connection to the server: these are the data saved on this device.</string>
-    <string name="home_list_next">The task list comes in the next update.</string>
+    <!-- The task list: the web's "Active" tab (spec 7), with the texts of the web's bubbles.* where it has them. -->
+    <string name="list_count">Active Tasks (%1$d)</string>
+    <string name="list_shown">Showing %1$d of %2$d</string>
+    <string name="list_empty">No active tasks</string>
+    <string name="list_due">Due date: %1$s</string>
+    <string name="list_overdue">Overdue</string>
+    <string name="list_no_category">No Tag</string>
+    <string name="list_invalid">Documents that failed the check: %1$d</string>
+    <string name="list_offline">No connection to the server: these are the data saved on this device.</string>
+    <string name="list_failed">The data could not be read. Sign out and sign in again.</string>
 </resources>
````

Изменения в `android/app/src/main/res/values-uk/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values-uk/strings.xml b/android/app/src/main/res/values-uk/strings.xml
index c30e2b9..d2c2505 100644
--- a/android/app/src/main/res/values-uk/strings.xml
+++ b/android/app/src/main/res/values-uk/strings.xml
@@ -32,10 +32,13 @@
     <string name="auth_error_network">Помилка мережі. Перевірте з’єднання.</string>
     <string name="auth_error_unexpected">Сталася неочікувана помилка.</string>
 
-    <string name="home_signed_in_as">Ви увійшли як %1$s</string>
-    <string name="home_tasks">Задач: %1$d</string>
-    <string name="home_categories">Категорій: %1$d</string>
-    <string name="home_invalid">Документів, що не пройшли перевірку: %1$d</string>
-    <string name="home_offline">Немає зв’язку із сервером: це дані, збережені на цьому пристрої.</string>
-    <string name="home_list_next">Список задач з’явиться в наступному оновленні.</string>
+    <string name="list_count">Активні завдання (%1$d)</string>
+    <string name="list_shown">Показано %1$d з %2$d</string>
+    <string name="list_empty">Немає активних завдань</string>
+    <string name="list_due">Термін виконання: %1$s</string>
+    <string name="list_overdue">Прострочено</string>
+    <string name="list_no_category">Без Тега</string>
+    <string name="list_invalid">Документів, що не пройшли перевірку: %1$d</string>
+    <string name="list_offline">Немає зв’язку із сервером: це дані, збережені на цьому пристрої.</string>
+    <string name="list_failed">Не вдалося прочитати дані. Вийдіть і увійдіть знову.</string>
 </resources>
````

- [ ] **Step 6: Скрипт тестов: уборка и снимки**

Сначала скрипт проверяет, что `adb -e` — эмулятор: телефон по Wi-Fi для adb тоже сетевое устройство, а скрипт удаляет приложение. Он убирает за собой и тогда, когда прогон упал (`trap … EXIT`): на эмуляторе не остаются приложение, тесты, снимки и `adb reverse`. Снимки тестов он приносит в `android/app/build/device-screens/` (в каталоге сборки, вне git) — и тогда, когда упало само инструментирование: его вывод тоже печатается.

Файл `android/device-tests.sh`:

````bash
#!/usr/bin/env bash
# The device tests (app/src/androidTest) on the Android emulator against the local Firebase
# emulators. Run from the repository root by firebase emulators:exec (docs/android.md), with the
# APKs built before: Gradle does not run beside the Android emulator on this machine. The
# screenshots the tests take come back to android/app/build/device-screens.
set -euo pipefail

apks=android/app/build/outputs/apk
screens=/data/local/tmp/todoround-screens

# adb -e is "the only TCP/IP device", and a phone on Wi-Fi debugging is one too. The tests remove
# the app, so they run on the emulator only.
serial=$(adb -e get-serialno 2> /dev/null || true)
case $serial in
    emulator-*) ;;
    *)
        echo "device-tests.sh: adb -e finds '${serial:-no single device}', not the emulator: start it, or adb disconnect the phone" >&2
        exit 2
        ;;
esac

# Before the tests and after them, a failed run too: no app, no tests, no screenshots, no ports.
clean() {
    adb -e uninstall com.pmobile78.todoround.test > /dev/null 2>&1 || true
    adb -e uninstall com.pmobile78.todoround > /dev/null 2>&1 || true
    adb -e shell rm -rf "$screens" > /dev/null 2>&1 || true
    adb -e reverse --remove-all > /dev/null 2>&1 || true
}
clean
trap clean EXIT

adb -e install -t "$apks/debug/app-debug.apk" > /dev/null
adb -e install -t "$apks/androidTest/debug/app-debug-androidTest.apk" > /dev/null
# The app reaches the Firebase emulators of this computer at its own 127.0.0.1 (data/Backend.kt).
adb -e reverse tcp:9099 tcp:9099 > /dev/null
adb -e reverse tcp:8180 tcp:8180 > /dev/null
# A crash of the instrumentation itself still prints what it said and brings the screenshots back.
status=0
result=$(adb -e shell am instrument -w com.pmobile78.todoround.test/androidx.test.runner.AndroidJUnitRunner) || status=$?
rm -rf android/app/build/device-screens
adb -e pull "$screens" android/app/build/device-screens > /dev/null 2>&1 || true
printf '%s\n' "$result"
[ "$status" = 0 ] || exit "$status"
grep -q '^OK (' <<< "$result"
````

- [ ] **Step 7: Сборка и Lint**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `app debug tests: 22 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.` (тесты ядра не менялись с задачи 1, Gradle их не повторяет.)

- [ ] **Step 8: Тесты проходят на устройстве**

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator.log 2>&1
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

Expected: `OK (16 tests)` и `Script exited successfully (code 0)`; сразу после загрузки — три-четыре минуты; `list-en-light.png`, `list-uk-dark.png`. Снимки открыть и посмотреть: на первом — светлый экран «Active Tasks (4)», «Showing 4 of 5», красная заметка «Documents that failed the check: 1» и четыре задачи: «Apples»; «buy milk» с красным сроком, отметкой «Overdue» и зелёной категорией «Home»; «Call the bank» с синим сроком и «Home»; «Mars trip» с синим сроком и серым «No Tag». На втором — тёмный экран «Активні завдання (2)»: «Купити хліб» с красным сроком, «Прострочено» и «Дім», затем «Зателефонувати». Веб показал бы первому аккаунту пять задач: «Odd» с напоминанием за 61 минуту он при чтении не проверяет, а приложение только считает (спецификация, раздел 6). Сразу после загрузки поверх списка бывает окно «System UI isn't responding» — это система эмулятора под нагрузкой (`docs/android.md`), список под ним виден; тесты нажимают кнопки через дерево интерфейса, и окно им не мешает. Чисто чёрный снимок значит, что система эмулятора ещё не нарисовала окно: прогнать тесты ещё раз.

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
```

Expected: `OK: killing emulator, bye bye`.

- [ ] **Step 9: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/Emulators.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/ListFlowTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt android/app/src/main/res/values-uk/strings.xml android/app/src/main/res/values/strings.xml android/app/src/test/kotlin/com/pmobile78/todoround/ui/SessionTest.kt android/device-tests.sh
git commit -F - <<'EOF'
feat(android): the task list, as the web's Active tab

Stage 1.3, task 2. The screen after sign-in is the task list: the tasks of
the web's Active tab with the account's saved filter and sort, under their
number ("Showing N of M" when the filter hides some) and the notes about
documents that failed the check and data only from the cache. A row has the
title, the due in the phone's time, red with "Overdue" once passed, and the
category; a category that is gone shows "No Tag", as on the web. A data
flow that fails now says so instead of loading for ever. The device tests
seed an account through the web's client and take screenshots, which
android/device-tests.sh brings back to android/app/build/device-screens; it
also cleans the emulator up when a run fails.
EOF
```

---

### Task 3: Форма входа и выход — мелочи ревью 1.2

**Files:**
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AuthScreen.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`
- Test: `android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt`

**Interfaces:**
- Consumes: `AuthScreen`, `AppViewModel`, `followPhoneLanguage()` из 1.2; `AuthFlowTest` после задачи 2.
- Produces: поведение без новых имён — выбранная вкладка не стирает введённое; адрес почты уходит в Firebase без пробелов вокруг (вход, регистрация, письмо сброса); после любого выхода, в том числе когда Firebase сам завершил сессию, приложение снова говорит на языке телефона. `AppViewModel.signOut()` только выходит: язык возвращает `session`.

- [ ] **Step 1: Написать падающие тесты**

Все адреса в `AuthFlowTest` вводятся с пробелом в конце, как их оставляет клавиатура после подсказки, а после регистрации тест сверяет адрес аккаунта: эмулятор Auth не отвергает адрес с пробелом, а заводит пользователя `olena@example.com ` — без этой проверки регистрация и вход с одинаковым пробелом прошли бы и без правки. Новые тесты: сессия, которую завершил сам Firebase (`backend.auth.signOut()` мимо меню), и нажатие на уже выбранную вкладку.

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt
index 3f081c3..dc03f5e 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt
@@ -2,8 +2,10 @@ package com.pmobile78.todoround
 
 import androidx.appcompat.app.AppCompatDelegate
 import androidx.compose.ui.semantics.SemanticsActions
+import androidx.compose.ui.test.assert
 import androidx.compose.ui.test.assertIsEnabled
 import androidx.compose.ui.test.assertTextEquals
+import androidx.compose.ui.test.hasText
 import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
 import androidx.compose.ui.test.onAllNodesWithTag
 import androidx.compose.ui.test.onNodeWithTag
@@ -19,6 +21,7 @@ import com.pmobile78.todoround.core.model.defaultSettings
 import com.pmobile78.todoround.data.SettingsRepository
 import kotlinx.coroutines.runBlocking
 import org.junit.After
+import org.junit.Assert.assertEquals
 import org.junit.Assert.assertNotEquals
 import org.junit.Before
 import org.junit.Rule
@@ -51,9 +54,11 @@ class AuthFlowTest {
     private fun press(tag: String) =
         compose.onNodeWithTag(tag).assertIsEnabled().performSemanticsAction(SemanticsActions.OnClick)
 
+    // A keyboard leaves a space after an address it suggests; the app drops it, as the web's email
+    // field does, so every address here is typed with one.
     private fun signInOnScreen(email: String, password: String) {
         waitFor("auth")
-        type("email", email)
+        type("email", "$email ")
         type("password", password)
         press("submit")
     }
@@ -92,12 +97,13 @@ class AuthFlowTest {
         waitFor("auth")
         compose.onNodeWithTag("tab_register").performClick()
         type("name", "Olena")
-        type("email", email)
+        type("email", "$email ")
         type("password", "secret-1")
         type("confirm", "secret-1")
         press("submit")
         // A new account has no tasks yet, and the list says so.
         waitFor("empty")
+        assertEquals(email, backend.auth.currentUser?.email)
 
         signOutOnScreen()
         signInOnScreen(email, "secret-1")
@@ -141,4 +147,27 @@ class AuthFlowTest {
                 AppCompatDelegate.getApplicationLocales().isEmpty
         }
     }
+
+    @Test
+    fun aSessionThatEndsByItselfTakesThePhoneLanguageAgain() {
+        val email = newEmail()
+        webAccount(email, defaultSettings("uk"))
+        signInOnScreen(email, "secret-1")
+        compose.waitUntil(60_000) { AppCompatDelegate.getApplicationLocales().toLanguageTags() == "uk" }
+        waitFor("home")
+
+        // Firebase ends the session without the menu, as when the password is changed elsewhere.
+        backend.auth.signOut()
+        waitFor("auth")
+        compose.waitUntil(60_000) { AppCompatDelegate.getApplicationLocales().isEmpty }
+    }
+
+    @Test
+    fun theTabShownKeepsWhatIsTyped() {
+        waitFor("auth")
+        type("email", "olena@example.com")
+        // As on the web, only another tab starts with empty fields.
+        compose.onNodeWithTag("tab_sign_in").performClick()
+        compose.onNodeWithTag("email").assert(hasText("olena@example.com"))
+    }
 }
````

- [ ] **Step 2: Тесты падают на устройстве**

Новые тесты собираются на прежнем коде, поэтому падают только на устройстве. Сборка, затем эмулятор:

```bash
android/gradlew -p android :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true
android/gradlew -p android --stop
```

Expected: `BUILD SUCCESSFUL`.

Эмулятор в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi):

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Тесты на устройстве (тайм-аут 10 минут; упавшие тесты ждут по минуте, прогон — около четырёх минут):

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `Tests run: 18,  Failures: 5` — `theLanguageAndTheThemeOfTheAccountApplyAfterSignIn`, `theTabShownKeepsWhatIsTyped`, `aSessionThatEndsByItselfTakesThePhoneLanguageAgain`, `aNewAccountSignsUpOutAndInAgain`, `aWrongPasswordAndAResetEmailAreShown` (порядок может быть другим), и `Script exited unsuccessfully (code 1)`. Причины в выводе: вход с пробелом после адреса — «User not found.» вместо «Incorrect password.» и тайм-аут ожидания языка аккаунта; регистрация — `expected:<…@example.com[]> but was:<…@example.com[ ]>`; поле почты пустое после нажатия на выбранную вкладку; язык не вернулся после выхода мимо меню (тайм-аут). Остальные 13 тестов проходят.

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
```

Expected: `OK: killing emulator, bye bye`.

- [ ] **Step 3: Правка формы и выхода**

Адрес очищается от пробелов вокруг перед проверками формы и запросом — так его отдаёт поле `type="email"` веба. Другая вкладка, как и в вебе, начинается с пустых полей, а выбранная их не трогает.

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AuthScreen.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AuthScreen.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AuthScreen.kt
index 383d3d8..765bd9b 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AuthScreen.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AuthScreen.kt
@@ -80,9 +80,13 @@ fun AuthScreen(accounts: AccountRepository) {
     var notice by rememberSaveable { mutableStateOf<Int?>(null) }
     var busy by remember { mutableStateOf(false) }
     val scope = rememberCoroutineScope()
+    // The address without the spaces around it, as the web's email field gives it: a keyboard
+    // leaves a space after an address it suggests.
+    val address = email.trim()
 
-    // As on the web, another tab starts with empty fields.
+    // As on the web, another tab starts with empty fields; the tab shown keeps them.
     fun switchTo(registerTab: Boolean) {
+        if (registerTab == register) return
         register = registerTab
         name = ""
         email = ""
@@ -165,9 +169,9 @@ fun AuthScreen(accounts: AccountRepository) {
             Button(
                 onClick = {
                     if (register) {
-                        submit(signUpProblem(email, password, confirm)) { accounts.signUp(name, email, password) }
+                        submit(signUpProblem(address, password, confirm)) { accounts.signUp(name, address, password) }
                     } else {
-                        submit(signInProblem(email, password)) { accounts.signIn(email, password) }
+                        submit(signInProblem(address, password)) { accounts.signIn(address, password) }
                     }
                 },
                 enabled = !busy,
@@ -185,8 +189,8 @@ fun AuthScreen(accounts: AccountRepository) {
             if (!register) {
                 TextButton(
                     onClick = {
-                        submit(resetProblem(email), R.string.auth_reset_email_sent) {
-                            accounts.sendPasswordReset(email, appLanguage())
+                        submit(resetProblem(address), R.string.auth_reset_email_sent) {
+                            accounts.sendPasswordReset(address, appLanguage())
                         }
                     },
                     enabled = !busy,
````

Язык телефона возвращается при переходе «вошёл → не вошёл», откуда бы он ни пришёл: из меню или от самого Firebase (сессия отозвана, пароль сменили на другом устройстве). Запуск приложения без входа язык не трогает: выбранный на экране входа язык сохраняется.

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
index a4fe896..e2eb596 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
@@ -23,6 +23,7 @@ import kotlinx.coroutines.flow.combine
 import kotlinx.coroutines.flow.flatMapLatest
 import kotlinx.coroutines.flow.flowOf
 import kotlinx.coroutines.flow.map
+import kotlinx.coroutines.flow.onEach
 import kotlinx.coroutines.flow.onStart
 import kotlinx.coroutines.flow.stateIn
 
@@ -64,17 +65,24 @@ class AppViewModel(application: Application) : AndroidViewModel(application) {
     private val categories = CategoriesRepository(backend.db)
     private val settings = SettingsRepository(backend.db)
 
-    // Lazily: the listeners stay while the app is in the background, so a return to the app
-    // keeps the screen instead of loading it again from the cache.
+    private var wasSignedIn = false
+
+    // Signed out, the app speaks the language of the phone again, as the web does (spec 8): after
+    // the menu's Logout and also when Firebase ends the session by itself. Lazily: the listeners
+    // stay while the app is in the background, so a return to the app keeps the screen instead of
+    // loading it again from the cache.
     @OptIn(ExperimentalCoroutinesApi::class)
     val session: StateFlow<Session> = accounts.user
+        .onEach { user ->
+            if (user == null && wasSignedIn) followPhoneLanguage()
+            wasSignedIn = user != null
+        }
         .flatMapLatest { user -> if (user == null) flowOf(Session.SignedOut) else signedIn(user) }
         .stateIn(viewModelScope, SharingStarted.Lazily, Session.Starting)
 
-    /** Signs out; the app takes the language of the phone again, as the web does (spec 8). */
+    /** Signs out; [session] then takes the language of the phone again. */
     fun signOut() {
         accounts.signOut()
-        followPhoneLanguage()
     }
 
     // A new account gets the language of the sign-in screen (spec 8).
````

- [ ] **Step 4: Сборка и Lint**

Run: `android/gradlew -p android check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `app debug tests: 22 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.`

- [ ] **Step 5: Тесты проходят на устройстве**

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi):

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase (тайм-аут 10 минут):

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
```

Expected: `OK (18 tests)` и `Script exited successfully (code 0)`.

```bash
source /media/big_disk/android/android-env.sh && adb -e emu kill
```

Expected: `OK: killing emulator, bye bye`.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/AuthFlowTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/AuthScreen.kt
git commit -F - <<'EOF'
fix(android): the sign-in form and the sign-out as on the web

Stage 1.3, task 3, three minors of the review of 1.2. The address goes to
Firebase without the spaces around it, as the web's email field gives it:
a keyboard leaves a space after an address it suggests, and the Auth
emulator took "olena@example.com " for another user. A tap on the tab
already shown keeps what is typed; only another tab starts empty, as on the
web. The phone's language comes back after any sign-out, also when Firebase
ends the session by itself, not only after the menu's Logout.
EOF
```

---

### Task 4: Документация, полная проверка и проверка вживую

**Files:**
- Modify: `docs/android.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: всё из задач 1–3.
- Produces: в `docs/android.md` — раздел «Сверка списка с вебом», снимки тестов и уборка `device-tests.sh`, телефон по Wi-Fi и `adb -e`; в `CLAUDE.md` — правила для телефона по Wi-Fi и для тестов на устройстве. Проверка владельца на Redmi 9 — запись в журнале исполнения.

- [ ] **Step 1: Документация**

Изменения в `docs/android.md`:

````diff
diff --git a/docs/android.md b/docs/android.md
index be6d090..29799c8 100644
--- a/docs/android.md
+++ b/docs/android.md
@@ -6,8 +6,8 @@
 
 | Путь | Что внутри |
 |---|---|
-| `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели. Тесты (JUnit) читают общие примеры из `contract/` |
-| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
+| `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели, правила списка задач (вкладка «Активные» веба). Тесты (JUnit) читают общие примеры из `contract/` |
+| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, список задач, экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
 | `android/device-tests.sh` | запуск тестов на устройстве против эмуляторов Firebase (ниже) |
 | `android/gradle/libs.versions.toml` | версии библиотек и плагинов |
 | `contract/` | общие примеры данных для веба, функций и Android ([README](../contract/README.md)) |
@@ -83,9 +83,19 @@ android/gradlew -p android --stop                   # остановить де
 
 Если MIUI не даёт ставить по USB: скопировать APK на телефон и открыть его в файловом менеджере (разрешить установку из этого источника).
 
+## Сверка списка с вебом
+
+Список задач приложения — вкладка «Активные» веба: те же активные задачи, в том числе запланированные, с фильтром и сортировкой, сохранёнными в вебе. Как сравнить:
+
+1. В вебе войти в тот же аккаунт, что на телефоне, и перезагрузить вкладку: задачи с одинаковым ключом сортировки веб показывает в порядке id документов только сразу после загрузки страницы, а пришедшие с сервера позже ставит в конец. Если порядок не сошёлся только у таких задач, перезагрузить вкладку ещё раз.
+2. Открыть в вебе «Список завдань», вкладку «Активні завдання». Число в её названии — то же, что «Активні завдання (N)» над списком приложения. Если фильтр веба скрывает часть задач, приложение пишет и «Показано N з M».
+3. Сравнить порядок и несколько задач: название, категорию, срок.
+
+Срок приложение показывает во времени телефона, веб — во времени компьютера; при сверке часовой пояс у них один. Если телефон не знает часового пояса задачи (его база часовых поясов старее, чем у браузера), срок показан так, как записан, и без «Прострочено». Документы, которые не прошли проверку контракта, приложение не показывает, а считает в заметке над списком; веб их показывает, поэтому число задач и порядок расходятся ровно на них. Почему документ не прошёл проверку, пишет журнал телефона: `adb -s <адрес>:<порт> logcat -d -s Loaded`.
+
 ## Эмулятор
 
-Памяти 14 ГБ, поэтому эмулятор запускается без окна и без Android Studio, а демон Gradle перед этим останавливается. Команды `adb -e` обращаются к единственному эмулятору, даже если подключён и телефон:
+Памяти 14 ГБ, поэтому эмулятор запускается без окна и без Android Studio, а демон Gradle перед этим останавливается. Команды `adb -e` обращаются к единственному эмулятору, если телефон подключён кабелем. Телефон по Wi-Fi для adb — такое же сетевое устройство, как эмулятор, и `adb -e` их не различит (`more than one emulator`, ложное `booted` при ожидании загрузки): перед работой с эмулятором телефон отключают — `adb disconnect <адрес>:<порт>`.
 
 ```bash
 android/gradlew -p android :app:assembleDebug
@@ -119,7 +129,9 @@ firebase emulators:exec --only auth,firestore --project demo-to-round android/de
 adb -e emu kill
 ```
 
-`android/device-tests.sh` ставит оба APK, включает `adb reverse`, запускает тесты, удаляет приложение и печатает итог: `OK (N tests)` или ошибки. Сборку без `-Ptodoround.emulators=true` тесты отвергают, чтобы не ходить в прод.
+`android/device-tests.sh` ставит оба APK, включает `adb reverse`, запускает тесты, удаляет приложение и печатает итог: `OK (N tests)` или ошибки. Сборку без `-Ptodoround.emulators=true` тесты отвергают, чтобы не ходить в прод. Убирает за собой скрипт и после упавшего прогона. Приложение он удаляет до и после тестов, поэтому тесты идут только на эмуляторе: если `adb -e` видит не эмулятор (например, один телефон по Wi-Fi), скрипт ничего не трогает и просит отключить телефон.
+
+Тесты списка снимают экран: список на английском в светлой теме и на украинском в тёмной. Скрипт приносит снимки в `android/app/build/device-screens/`. Проверки тестов видят дерево интерфейса, а не картинку на экране, поэтому снимки смотрят глазами; чисто чёрный снимок значит, что система эмулятора ещё не нарисовала окно, — прогон повторяют.
 
 Попробовать приложение руками: в отдельном терминале `firebase emulators:start --only auth,firestore --project demo-to-round`, затем `adb -e reverse tcp:9099 tcp:9099`, `adb -e reverse tcp:8180 tcp:8180` и установка сборки с ключом. Писем эмулятор не отправляет: ссылку сброса пароля он печатает в своём журнале (`To reset the password for …, follow this link: …`).
 
````

Изменения в `CLAUDE.md`:

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index cda3397..5994ce9 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -97,8 +97,8 @@ functions/
 
 - Never print `~/.gradle/gradle.properties` whole (`cat`, `less`, an unanchored `grep`): it holds the release key passwords. Read one non-secret line at a time, e.g. `grep '^org.gradle.java.home' ~/.gradle/gradle.properties`.
 - `core` compiles against the JDK but runs on Android 8+: `-Xjdk-release=17` keeps out Java 18+ methods, not the Java 9–17 ones Android 8 lacks (`List.of` …). Use `java.time` and the Kotlin standard library there.
-- With a phone and the emulator both connected, address one: `adb -e` (the emulator), `adb -d` (the USB phone).
-- A debug build with `-Ptodoround.emulators=true` works with the Auth and Firestore emulators of `firebase.json` (project `demo-to-round`), reached at the device's own 127.0.0.1 through `adb reverse`: Android 17 keeps apps out of the local network, 10.0.2.2 included. The device tests (`app/src/androidTest`) run that way through `android/device-tests.sh`. Never run Gradle while the Android emulator is up (14 GB of RAM): build, `--stop`, then boot it.
+- With a phone and the emulator both connected, address one: `adb -e` (the emulator), `adb -d` (the USB phone). A phone on Wi-Fi debugging is a TCP device like the emulator, and `adb -e` cannot tell them apart: `adb disconnect` it before emulator work.
+- A debug build with `-Ptodoround.emulators=true` works with the Auth and Firestore emulators of `firebase.json` (project `demo-to-round`), reached at the device's own 127.0.0.1 through `adb reverse`: Android 17 keeps apps out of the local network, 10.0.2.2 included. The device tests (`app/src/androidTest`) run that way through `android/device-tests.sh`, on the emulator only (the script removes the app before and after a run), and bring their screenshots back to `android/app/build/device-screens/`: look at them, the checks see the UI tree, not the picture. Never run Gradle while the Android emulator is up (14 GB of RAM): build, `--stop`, then boot it.
 - Device test names are camelCase: D8 refuses spaces in method names before DEX 040 (minSdk 26). JVM tests may keep backtick names.
 
 ### Firestore data model
````

- [ ] **Step 2: Полная проверка и неизменный веб**

```bash
android/gradlew -p android clean check
tail -1 android/app/build/reports/lint-results-debug.txt
git diff --stat main...HEAD -- . ':!android' ':!docs' ':!CLAUDE.md' ':!contract/README.md'
```

Expected: `core tests: 96 passed, 0 failed, 0 skipped`, `app debug tests: 22 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`, `No issues found.`; `git diff --stat` ничего не выводит: кроме `android/`, документации и `contract/README.md` (подплан 1.1), ветка ничего не меняет. В копии без локальной ветки `main` — `origin/main...HEAD`.

- [ ] **Step 3: Сборки для эмулятора: релиз с R8 и тесты**

Релиз (R8) подписывается одноразовым ключом, как в 1.1 и 1.2 — это не ключ владельца:

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

Демон Gradle остановить и запустить эмулятор в фоне (`run_in_background`):

```bash
android/gradlew -p android --stop
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator.log 2>&1
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

Expected: `OK (18 tests)` и `Script exited successfully (code 0)`; `list-en-light.png`, `list-uk-dark.png`. Снимки открыть и посмотреть, как в задаче 2 (шаг 8).

Релиз после R8 запускается (вход он не делает: релиз работает с настоящим проектом). Он идёт после тестов: в первую минуту после загрузки система эмулятора бывает ещё не готова рисовать, и снимок выходит чисто чёрным, хотя приложение уже на экране (в черновиках 1.2 и 1.3 — через 20–30 секунд после загрузки; тот же APK через минуту снялся верно). Снимок делается, когда в дереве экрана появилось название именно этого приложения (`package="com.pmobile78.todoround"`), а не любого окна:

```bash
source /media/big_disk/android/android-env.sh
adb -e uninstall com.pmobile78.todoround
adb -e install android/app/build/outputs/apk/release/app-release.apk
adb -e logcat -c
adb -e shell am start -W -n com.pmobile78.todoround/.MainActivity | grep Status
timeout 120 sh -c 'until adb -e exec-out uiautomator dump /dev/tty | grep -q "text=\"ToDo-Round\"[^>]*package=\"com.pmobile78.todoround\""; do sleep 1; done'
adb -e exec-out screencap -p > /media/big_disk/android/work/stage-1-3-release.png
adb -e logcat -d | grep -c 'FATAL EXCEPTION'
adb -e uninstall com.pmobile78.todoround
```

Expected: `Failure […]` (приложения не было) или `Success`, затем `Success`, `Status: ok`, `0` и `Success`. Снимок открыть: экран входа — три пузыря, «ToDo-Round», вкладки «Login» и «Register», переключатель EN/UK. Дерево интерфейса ещё не значит, что окно нарисовано: если снимок всё же чёрный, через минуту повторить этот блок. Окно «… isn't responding» поверх экрана — это система эмулятора под нагрузкой (`docs/android.md`).

Эмулятор остаётся чистым — приложения нет, тема светлая — и выключается:

```bash
source /media/big_disk/android/android-env.sh
adb -e shell pm list packages | grep -c todoround || true
adb -e shell cmd uimode night
adb -e emu kill
```

Expected: `0`, `Night mode: no`, `OK: killing emulator, bye bye`.

- [ ] **Step 5: Commit**

Коммит документации не ждёт владельца: его проверка — следующий шаг, и в репозитории она ничего не меняет.

```bash
git add CLAUDE.md docs/android.md
git commit -F - <<'EOF'
docs(android): the task list, how to compare it with the web, the phone on Wi-Fi

Stage 1.3, task 4. docs/android.md tells how the list compares with the
web's Active tab (reload the web tab first, the counts, the due in the
phone's time, a zone the phone does not know), that device-tests.sh cleans
up after a failed run, runs on the emulator only and brings the screenshots
of the list back to android/app/build/device-screens, and that adb -e
cannot tell the emulator from a phone on Wi-Fi debugging. CLAUDE.md gets
the same rules.
EOF
```

- [ ] **Step 6: Проверка владельцем на Redmi 9**

Это проверка этапа 1 (спецификация, разделы 1 и 9; шаг владельца 10 № 4): владелец сравнивает список на телефоне под своим аккаунтом со свежей вкладкой веба. Отладочная сборка без ключа эмуляторов работает с настоящим проектом и в прод ничего не пишет. Спросить владельца, готов ли он, и попросить включить на телефоне «Отладку по Wi-Fi» и прислать адрес и порт с её главного экрана (компьютер и телефон уже сопряжены, код не нужен):

```bash
android/gradlew -p android :app:assembleDebug
android/gradlew -p android --stop
source /media/big_disk/android/android-env.sh
adb connect <адрес>:<порт>
adb -s <адрес>:<порт> install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Expected: `BUILD SUCCESSFUL`, `connected to <адрес>:<порт>`, `Success`. При установке телефон спрашивает Play Защиту и MIUI — владелец подтверждает оба окна; окно MIUI само закрывается с отменой примерно через 10 секунд. Сборка 1.2 стоит на телефоне с тем же ключом, поэтому `install -r` ставит поверх, и вход владельца сохраняется.

Владелец открывает ToDo-Round на телефоне и сравнивает список с вебом по разделу «Сверка списка с вебом» `docs/android.md`:

1. в вебе — тот же аккаунт, что на телефоне: перезагрузить вкладку и открыть «Список завдань», вкладку «Активні завдання»;
2. число: «Активні завдання (N)» над списком телефона и число в названии вкладки веба; если телефон пишет «Показано N з M», фильтр веба подсвечен;
3. порядок: первые пять задач и последняя; если не совпал только порядок задач с одинаковым ключом сортировки — перезагрузить вкладку веба ещё раз;
4. три-пять задач: название, категория (имя и цвет), срок (дата, время, «Прострочено»); часовой пояс у телефона и компьютера один;
5. заметки над списком телефона: нет «Документів, що не пройшли перевірку» и через несколько секунд нет «Немає зв’язку із сервером». Если документы, не прошедшие проверку, есть, число и порядок с вебом расходятся ровно на них: веб такие задачи показывает. Почему документ не прошёл, пишет журнал телефона: `adb -s <адрес>:<порт> logcat -d -s Loaded`.

Ответ владельца записать в журнал исполнения. Если что-то не совпадает — остановиться и разобрать причину (superpowers:systematic-debugging) до правок: какое правило списка, какая задача, что видит веб. Отсутствие «Прострочено» у задач в зоне, которой телефон не знает, — не ошибка (спецификация, раздел 7): записать зону. Владелец не готов или телефона нет — шаг откладывается с отметкой в журнале; этап 1 закрывается после него.

Затем телефон отключить от adb (приложение остаётся на телефоне):

```bash
source /media/big_disk/android/android-env.sh && adb disconnect <адрес>:<порт>
```

---

## Итог этапа 1 и передача дальше

После этого плана этап 1 готов (спецификация, раздел 1), когда владелец подтвердил совпадение на Redmi 9 (задача 4, шаг 6) и `android/gradlew -p android check` зелёный. Ветку `stage-1-android-foundation` можно влить в `main` — с согласия владельца: веб, функции, правила и прод она не меняет.

- **Список.** `HomeScreen` — список только для просмотра: нажатие на задачу ничего не делает, вкладок, поиска, описаний и правки нет (этап 2). Правила набора и порядка — `activeList` в `core`, срок — `dueView` и `listDateTime`; «сейчас» для отметки «Просрочено» берётся при каждой перерисовке списка, отдельного таймера нет: срок, прошедший при открытом списке, краснеет при следующем изменении данных (как и в вебе — при следующей перерисовке).
- **Данные.** Сбой потока данных показывается текстом «The data could not be read …»; поток после сбоя не перезапускается — помогает выход и вход. Бесконечная загрузка остаётся в одном случае, и так задумано: у нового аккаунта без связи документ пользователя создаётся только по ответу сервера, а до него экран ждёт. Задача с зоной, которой телефон не знает, — без «Просрочено»; сузить `deviceTimeZone()` и `isValidTimeZone` до `ZoneId.getAvailableZoneIds()` — до того, как Android начнёт писать `due.tz` (этап 2, отложено из ревью 1.1).
- **Тесты на устройстве** — 18, через `android/device-tests.sh` только на эмуляторе; снимки списка — в `android/app/build/device-screens/`. Проверка языка в `AuthFlowTest` рассчитана на эмулятор с английской системой (мелочь 5 ревью 1.2).
- **Остаются из прежних ревью:** високосная секунда и 29 февраля в `isIsoTimestamp`, годы 0000–0099 в `parseLocal` (этап 5, импорт бэкапа); `addTestListener` и кэш конфигурации Gradle; копия списка в `Records.stringsOrNull`; приведение `as FirebaseFirestoreException` в `BackendTest` и `RepositoriesTest` (мелочь 9 ревью 1.2); кэш Firestore после выхода остаётся на устройстве, как в вебе.
