# Этап 2.2: задача — просмотр, действия, повтор — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать телефону экран «Задача» — все поля, описание в Markdown таким, каким его показывает веб, с квадратиками чек-листа, которые отмечаются касанием, и действия по статусу: «Готово» (у повторяющейся задачи — шаг к следующему сроку), «Завершить серию», «Удалить», «Восстановить», «Удалить навсегда» с вопросом, — главную кнопку и меню «⋮» в строке списка, взять мелочи ревью 2.1 и закончить проверкой с вебом на эмуляторах.

**Architecture:** Правила — в `core`: следующий срок повторяющейся задачи (`Recurrence.kt`, перенос `src/contract/recurrence.js`); действия по статусу, их изменения и проверка записи ядром (`TaskChanges.kt`); разбор описания (`markdown/`: перенос marked 17.0.6 и токенизаторов @tiptap/markdown 3.32, в котором каждый символ помнит своё место в описании — так касание квадратика меняет ровно один символ); подписи напоминаний (`Reminders.kt`). `app`: `TasksRepository.update` и `delete` пишут как веб; `AppViewModel.act` и `toggle` проверяют запись ядром и отправляют её через `Writes` из 2.1 — запись, которую не пропустило ядро или отклонил сервер, экран показывает сообщением. `TaskScreen` открывается по id задачи и берёт её из живого списка; `MarkdownView` рисует блоки ядра; строка списка получает главную кнопку и меню «⋮», а их состояние хранит список — по id задачи.

**Tech Stack:** как в 2.1 — Kotlin 2.4.21, Compose BOM 2026.09.00 (Material 3), Firebase BoM 35.1.0, AppCompat 1.8.0, Lifecycle 2.11.0; тесты JVM — JUnit 6, на устройстве — Compose UI test (правила v2), AndroidX Test. Новых библиотек нет. Разбор Markdown написан в `core`, а не взят готовым (спецификация, раздел 15, оставляет выбор подплану): библиотеки Kotlin читают Markdown по CommonMark, а квадратик должен стоять там, где его ставит веб (раздел 8), — у веба свои правила (marked и токенизаторы TipTap: пункты с буквами, «Ok. Thanks» как нумерованный список и другие). Эмуляторам Firebase нужны Firebase CLI 15 и Java 21+.

**Spec:** [docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md](../specs/2026-10-24-stage-2-tasks-design.md) — разделы 2.2 (№ 1, 2, 9, 11–13, 16, 17, 21, 23), 3 (№ 5–10, 16), 4, 5, 7, 8, 11. Обзор — [2026-10-24-stage-2-overview.md](2026-10-24-stage-2-overview.md). Основа — подплан 2.1 (`main` b507ebf) и его план [2.1](2026-10-24-stage-2-1-list-tabs-search-sort-filter.md) (раздел «Итог подплана 2.1 и передача в 2.2»). Эталоны веба — `src/contract/recurrence.js`, `completionChanges` в `src/services/data/tasks.js`, показ описания — `src/utils/markdownEditor.js` (TipTap 3.32 с `@tiptap/markdown` поверх marked 17.0.6), диалог задачи — `src/components/BubbleEditDialog.jsx`. Весь код плана прогнан в черновой копии ветки: числа тестов и строки `Expected` — настоящие, тесты на устройстве — на эмуляторе `ToRound_API37` (Android 17), проверка с вебом на эмуляторах — тоже.

## Global Constraints

- Ветка `stage-2-tasks` от `b507ebf` (`main` после слияния 2.1 и версии 0.2.6); план — в ней. В `main` не коммитить, ничего не пушить без слова владельца.
- Веб, `contract/`, правила Firestore, Cloud Functions и CI не меняются. Исключение — документация в задаче 5: `docs/android.md` и `CLAUDE.md`. Новых общих примеров в `contract/` правила этого подплана не требуют: тесты `core` проверяют их на своих примерах и на 23 примерах `recurrence.json`, а совпадение с вебом проверено в черновике разовыми сверками через настоящий код веба. Следующий срок и «Готово» — 2000 случайных задач и «сейчас» в 14 зонах, треть — в дни перехода на летнее время и обратно, через `completionChanges` веба: 0 расхождений. Описание — 10 600 случайных описаний через редактор веба: квадратики и их места в тексте — 0 расхождений, 6416 отметок (описание после касания) — 0; показ 7300 описаний без HTML и таблиц совпал везде, кроме 7, которые веб целиком читает как HTML (решение 1, раздел 8: сырой HTML и таблицы телефон показывает текстом, такое описание — его текстом одним абзацем).
- Все команды — из корня репозитория; Gradle — `android/gradlew -p android --no-daemon …`, на JBR Android Studio, как в этапе 1. Без демона процесс сборки кончается вместе с ней и не держит память, которая нужна эмулятору; а `--stop`, которым это делали в 2.1, останавливает демоны Gradle всех сессий машины — и чужую сборку посреди работы.
- `android/app/google-services.json` — вне git; в копии, где его нет, его скачивает шаг 1 задачи 3 (задачам 1 и 2 он не нужен: они собирают только `core`). Регистрацию приложения в Firebase не повторять, проект Firebase не менять.
- Эмуляторы Firebase — из `firebase.json`: Auth на 9099, Firestore на 8180, проект `demo-to-round`; `emulators:exec` занимает ещё 4400, 4500 и 9150. Перед запуском порты свободны: `ss -ltn | grep -E ':(9099|8180|4400|4500|9150)\b'` ничего не печатает. Их может держать другая сессия: её процессы не трогать — подождать, пока порты освободятся. Если ждать долго, тесты можно прогнать на своих портах — вне репозитория: копия `firebase.json` с портами 19099, 18180, 14400, 14500, 19150 (`firebase emulators:exec --config <копия> …`) и копия `android/device-tests.sh` с `adb -e reverse tcp:9099 tcp:19099` и `adb -e reverse tcp:8180 tcp:18180`.
- Эмулятор Android `ToRound_API37` тоже бывает занят другой сессией. Перед каждым запуском эмулятора **и перед каждой командой Gradle** — блок «Свободны ли эмулятор и Gradle» (задача 3, шаг 6): если эмулятор работает, он чужой — ждать, не трогать и не ставить на него ничего. В черновике этого плана другая сессия запустила эмулятор посреди работы, между двумя сборками; другая сессия может и собирать — тогда эмулятор не запускать, пока её сборка не кончится. Если эмулятор нужен надолго, а сессия, с которой его делят, известна, — одно короткое сообщение ей. Свой эмулятор выключается блоком, который ждёт конца его процесса и трогает только его — по каталогу, из которого он запущен: `adb -e emu kill` бывает отвечает «bye bye», а процесс остаётся, и тогда сигнал получает только наш процесс.
- Длинные команды — сборка `check` или `assembleRelease`, тесты на устройстве — запускать в фоне (`run_in_background`) с выводом в журнал и ждать их конца: вызов инструмента на переднем плане обрывается через 10 минут, а в черновике релизная сборка шла 10,5 минуты, тесты на устройстве — около 9. Строки `Expected` ищут в журнале или в выводе, который печатает блок.
- Памяти 14 ГБ: Gradle и эмулятор Android одновременно не работают. Порядок прогона на устройстве: сборка; проверка, что эмулятор и Gradle свободны; эмулятор в фоне (`run_in_background`); ожидание загрузки одной командой с тайм-аутом 10 минут; тесты; выключение с ожиданием конца процесса.
- Тесты на устройстве идут только на сборке с `-Ptodoround.emulators=true` и только на эмуляторе: `android/device-tests.sh` удаляет приложение до и после прогона. Итог печатает скрипт: `OK (N tests)` или список ошибок. Ответ `INSTRUMENTATION_RESULT: shortMsg=Process crashed.` без единого теста — сбой запуска на только что загруженном эмуляторе: прогнать блок тестов ещё раз.
- Телефона в этом подплане нет. Сборки 2.2 пишут задачи, поэтому на Redmi 9 владельца их ставят только по его просьбе (спецификация, раздел 12, шаг 4) — отдельным шагом с его «да». `adb -e` — эмулятор; если к компьютеру подключён телефон по Wi-Fi, перед работой с эмулятором его отключают — `adb disconnect <адрес>:<порт>`.
- Записи этого подплана — задачи: статус, `deletedAt`, следующий срок, `pulseMuted: false`, описание, удаление документа. Исполнитель проверяет их только на эмуляторах Firebase; в прод ничего не пишется.
- Версии библиотек и плагинов не менять. Если Lint сообщит только о вышедших новых версиях (`GradleDependency`, `AndroidGradlePluginVersion`), записать это в журнал исполнения и продолжать.
- `~/.gradle/gradle.properties` целиком не выводить: там пароли релизного ключа. Строки смотреть по одной.
- Код в плане взят из проверенной черновой копии без правок. Новые и переписанные целиком файлы даны полностью (перед блоком — строка с путём); изменения существующих — блоками `diff` относительно состояния после предыдущей задачи: блок можно сохранить во временный файл и применить `git apply <файл>` из корня репозитория. Блоки кода ограничены четырьмя обратными кавычками. Переносить их скриптом из файла плана, а не перепечатывать: в коде `core/markdown` есть escape-последовательности Юникода (обратная косая черта, `u` и четыре цифры) для невидимых символов, а инструменты записи файлов превращают такие последовательности в сами символы — код тот же, но его не прочесть, и дерево не совпадёт с черновиком.
- Kotlin — официальный стиль; комментарии в коде — на английском. Имена тестов на устройстве — camelCase (D8 и `minSdk` 26), тестов JVM — в обратных кавычках.
- Каждая сборка печатает `[Incubating] Problems report is available at: …` и `Consider enabling configuration cache …` — это не ошибки; строки `Expected` их не упоминают.

## Review Focus

- **Отметка пункта и чужая правка.** Касание меняет один символ — тот, что между скобками этого пункта в описании, которое сейчас на экране; остальной текст не меняется ни на символ, в том числе переводы строк `\r\n`. Если описание тем временем изменилось и на этом месте уже нет той отметки, телефон не пишет ничего; если изменение другого устройства ещё в пути, побеждает последняя запись, как в вебе (раздел 8). `MarkdownTest` (задача 2: вложенные пункты, `[X]`, `\r\n`, сдвинутая отметка), `TaskFlowTest` (задача 4: веб отмечает второй пункт — открытый экран показывает это сам).
- **«Готово» у повторяющейся задачи.** Срок, прошедший давно (шаг `hours` перематывается — иначе предохранитель в 100 000 шагов), осенний час (второй проход пропускается), 31-е число и февраль, зона, которой телефон не знает (шаг — в зоне телефона, `tz` остаётся прежним), и `pulseMuted: true`, который сбрасывается. `RecurrenceTest` (23 примера `recurrence.json`), `TaskChangesTest` (задачи 1 и 3), `TaskFlowTest` (задача 4: записанный срок — тот, что ядро даёт до или после нажатия).
- **Описание, которое веб показывает по-своему.** Пункты с буквами и римскими числами, «Ok. Thanks» как нумерованный список, такой список и после пустых строк, пять переводов строки — один пустой абзац, блок кода с пробелами перед ```` ``` ```` пропадает, вложенный текст пункта чек-листа теряет символы отступа; сырой HTML и таблицы — текстом (решение 1); описание без единого блока веб читает как HTML. Регулярные выражения Android (ICU) не совпадают с JDK, на котором идут тесты JVM, поэтому правила блоков написаны без регулярных выражений, а в строчных классы JavaScript выписаны явно. `MarkdownTest` (задача 2), `MarkdownOnDeviceTest` (задача 4: те же описания дают те же блоки на устройстве).
- **Задача уходит из-под экрана и меню.** Задачу удалили навсегда на другом устройстве — экран закрывается с сообщением; запись в такую задачу правила отклоняют (`PERMISSION_DENIED`), и экран говорит «The change could not be saved.»; список сдвинулся, пока открыто меню строки, — меню остаётся у своей задачи; после действия на экране список возвращается на ту же вкладку. `RepositoriesTest` (задача 3), `TaskFlowTest` (задача 4).
- **Необратимое и отклонённое.** «Удалить навсегда» спрашивает и в меню строки, и на экране задачи; «Cancel» ничего не пишет. Запись, которую не пропустила проверка ядра (решение 16), не уходит, а экран говорит то же «The change could not be saved.»; незнакомая телефону зона срока, которую пользователь не менял, проверку проходит. `TaskChangesTest`, `WritesTest` (задача 3), `TaskFlowTest` (задача 4: «Готово» задачи со сроком 31.12.9999 ядро не пропускает, и список это говорит).

## Мелочи ревью 2.1

Итоговое ревью 2.1 отложило шесть мелочей и передало совет про строки без ключей. В этот план вошли:

| Мелочь | Где |
|---|---|
| Таймер «сейчас» без теста; он читает `Instant.now()` внутри, и тест не может сдвинуть время (№ 1) | Задача 4: часы — параметр `clock: java.time.Clock` у `HomeScreen` и `TaskScreen`; `HomeScreenTest` двигает их и `mainClock` |
| Таймер тикает и в остановленном приложении (№ 2) | Задача 4: `currentMinute` тикает внутри `repeatOnLifecycle(STARTED)` |
| Второй случай `WritesTest` мог пройти впустую (№ 4) | Задача 3: `Dispatchers.Unconfined + Job()` и отметка, что запись началась |
| Комментарий «a message for each» при канале `CONFLATED` (№ 6) | Задача 3 |
| Строки без ключей станут опасны, когда у строки появится меню (совет ревью) | Задача 4: состояние меню и вопроса «Удалить навсегда» хранит список — id задачи, а не строка. Открытое меню остаётся у своей задачи, когда список сдвигается; ключи строк не нужны, и якорь списка 2.1 не меняется (`anotherSortStartsTheListAtItsTopAndATaskAddedThereShows` зелёный). Тест — `theMenuOfARowStaysWithItsTaskWhenTheListMovesUnderIt` |
| Панель фильтра не видит изменения фильтра с другого устройства, пока открыта (№ 3) | Не в 2.2 — в 2.4: там новая категория добавляется в фильтры (решение 20), и чужие изменения фильтра станут частыми |
| `selected` у кнопки фильтра; TalkBack говорит «выбрано» (№ 5) | Не в 2.2: сверка на Redmi 9 (`docs/android.md`) читает именно `selected` — менять вместе со сверкой в 2.4 |

## Структура файлов

| Файл | Ответственность |
|---|---|
| `android/core/src/main/kotlin/…/core/model/Recurrence.kt` | (новый) шаг повтора и следующий срок после «сейчас» (`recurrence.js`) |
| `android/core/src/main/kotlin/…/core/model/TaskChanges.kt` | (новый) действия по статусу и их изменения, «Готово», запись описания, проверка записи ядром |
| `android/core/src/main/kotlin/…/core/model/Reminders.kt` | (новый) напоминание в самых крупных целых единицах и прошло ли оно |
| `android/core/src/main/kotlin/…/core/markdown/Src.kt` | (новый) текст, каждый символ которого помнит своё место в описании; пробелы и концы строк JavaScript |
| `android/core/src/main/kotlin/…/core/markdown/Blocks.kt` | (новый) блоки marked 17.0.6 и токенизаторы чек-листа и нумерованного списка TipTap |
| `android/core/src/main/kotlin/…/core/markdown/Inlines.kt` | (новый) строчная разметка marked: выделение, код, ссылки, адреса |
| `android/core/src/main/kotlin/…/core/markdown/Markdown.kt` | (новый) модель для экрана — как документ редактора веба; отметка пункта; ссылки, которые открываются |
| `android/core/src/test/kotlin/…/core/model/RecurrenceTest.kt`, `TaskChangesTest.kt`, `RemindersTest.kt`, `core/markdown/MarkdownTest.kt` | (новые) тесты ядра |
| `android/app/src/main/kotlin/…/data/Documents.kt`, `Repositories.kt` | (изменение) `taskUpdate`, `TasksRepository.update` и `delete` |
| `android/app/src/main/kotlin/…/ui/Writes.kt`, `AppViewModel.kt` | (изменение) отказ ядра — то же сообщение, что отказ сервера; `act`, `toggle` |
| `android/app/src/main/kotlin/…/ui/TaskScreen.kt` | (новый) экран «Задача» |
| `android/app/src/main/kotlin/…/ui/TaskParts.kt` | (новый) общие части строки и экрана: значок статуса, срок с «Просрочено», категория, даты (из `HomeScreen.kt`), тексты, значки и теги действий |
| `android/app/src/main/kotlin/…/ui/MarkdownView.kt` | (новый) блоки описания на Compose, квадратики, ссылки |
| `android/app/src/main/kotlin/…/ui/Clock.kt` | (новый) «сейчас» в начале каждой минуты по `java.time.Clock` (из `HomeScreen.kt`) |
| `android/app/src/main/kotlin/…/ui/HomeScreen.kt` | (изменение) касание строки открывает задачу; главная кнопка и меню «⋮»; вопрос «Удалить навсегда»; сообщение «задачи больше нет» |
| `android/app/src/main/kotlin/…/MainActivity.kt` | (изменение) экран задачи по id; список сохраняет вкладку, поиск и место, пока открыта задача |
| `android/app/src/main/res/drawable/ic_*.xml` | (новые) значки действий, «назад», напоминания и повтора |
| `android/app/src/main/res/values/strings.xml`, `values-uk/strings.xml` | (изменение) тексты экрана задачи и действий |
| `android/app/src/test/kotlin/…/data/DocumentsTest.kt`, `ui/WritesTest.kt` | (изменение) тесты JVM записей задачи и отказа ядра |
| `android/app/src/androidTest/kotlin/…/RepositoriesTest.kt` | (изменение) записи каждого действия под настоящими правилами |
| `android/app/src/androidTest/kotlin/…/TaskFlowTest.kt` | (новый) экран задачи и действия строки так, как их читает веб, живое обновление, язык и тема, снимки |
| `android/app/src/androidTest/kotlin/…/TaskScreenTest.kt` | (новый) экран задачи ждёт данных с сервера, когда в кэше задачи нет |
| `android/app/src/androidTest/kotlin/…/MarkdownOnDeviceTest.kt` | (новый) разбор описания на регулярных выражениях Android |
| `android/app/src/androidTest/kotlin/…/HomeScreenTest.kt` | (изменение) срок проходит, пока список открыт |
| `docs/android.md`, `CLAUDE.md` | (изменение) экран задачи, действия, описание как в вебе, проверка с вебом |

Пакеты: `…` — это `com/pmobile78/todoround`.

---

### Task 1: Следующий срок повторяющейся задачи и «Готово» в ядре

**Files:**
- Create: `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Recurrence.kt`, `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RecurrenceTest.kt`, `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskChangesTest.kt`

**Interfaces:**
- Consumes: из 1.1 — `Task`, `Due`, `Repeat`, `RepeatUnit`, `TaskStatus` (`wire`), `isValidTimeZone`, `toInstant`, `toLocal`; помощник тестов `Contract.read` (читает файлы `contract/`).
- Produces (`com.pmobile78.todoround.core.model`):
  - `fun stepOccurrence(local: String, tz: String, repeat: Repeat): String` — один шаг повтора от `local` («YYYY-MM-DDTHH:mm») в зоне `tz`; неверное время — `IllegalArgumentException`;
  - `fun nextFutureOccurrence(local: String, tz: String, repeat: Repeat, now: Instant): String` — первый шаг, чей момент позже `now`;
  - `fun completionChanges(task: Task, zone: String, now: Instant): Map<String, Any?>` — поля записи «Готово»: у разовой задачи `{status: "done"}`; у повторяющейся — `{due: {local: <следующий срок>, tz: <прежняя зона>}}` и `pulseMuted: false`, если был `true`; срок в зоне, которой телефон не знает, шагает в зоне телефона [zone].

- [ ] **Step 1: Написать падающие тесты**

`RecurrenceTest` проходит все 23 примера `contract/fixtures/recurrence.json` — каждый отдельным тестом с именем примера — и три случая сверх них: дни недели в любом порядке и с повторами работают как их множество, шаг часов сохраняет минуты срока, неверное время — исключение. `TaskChangesTest` повторяет `completionChanges` веба: разовая задача со сроком и без — `status: "done"`; повторяющаяся — первый срок после «сейчас» в зоне срока (09:00 по Берлину 20 октября при «сейчас» 24 октября 12:00 UTC — это 25 октября, день перехода на зимнее время); `pulseMuted: true` сбрасывается; срок в зоне, которой телефон не знает, шагает в зоне телефона, а записанная зона остаётся.

Файл `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RecurrenceTest.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.Contract
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.fromWire
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DynamicTest.dynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import org.junit.jupiter.api.assertThrows
import java.time.Instant

class RecurrenceTest {
    @Suppress("UNCHECKED_CAST")
    private fun repeatOf(record: Map<String, Any?>) = Repeat(
        every = (record["every"] as Long).toInt(),
        unit = fromWire<RepeatUnit>(record["unit"])!!,
        weekdays = (record["weekdays"] as List<Long>?)?.map { it.toInt() },
        monthDay = (record["monthDay"] as Long?)?.toInt(),
    )

    @Suppress("UNCHECKED_CAST")
    @TestFactory
    fun `nextFutureOccurrence on the contract examples`() = (Contract.read("fixtures/recurrence.json") as List<Map<String, Any?>>).map { case ->
        dynamicTest(case["name"] as String) {
            val due = case["due"] as Map<String, Any?>
            val next = nextFutureOccurrence(
                due["local"] as String,
                due["tz"] as String,
                repeatOf(case["repeat"] as Map<String, Any?>),
                Instant.parse(case["now"] as String),
            )
            assertEquals(case["expected"], next)
        }
    }

    @Test
    fun `weekdays in any order and repeated act as the set of them`() {
        // Wednesday 2026-10-14: the next of Monday and Friday is Friday, then Monday of the next week.
        val repeat = Repeat(every = 1, unit = RepeatUnit.WEEKS, weekdays = listOf(5, 1, 5))
        assertEquals("2026-10-16T09:00", stepOccurrence("2026-10-14T09:00", "Europe/Berlin", repeat))
        assertEquals("2026-10-19T09:00", stepOccurrence("2026-10-16T09:00", "Europe/Berlin", repeat))
    }

    @Test
    fun `a step of hours keeps the minutes of the due`() {
        assertEquals("2026-10-15T00:45", stepOccurrence("2026-10-14T23:45", "UTC", Repeat(every = 1, unit = RepeatUnit.HOURS)))
    }

    @Test
    fun `stepOccurrence refuses a malformed time`() {
        assertThrows<IllegalArgumentException> { stepOccurrence("2026-10-14T09:00:00", "UTC", Repeat(every = 1, unit = RepeatUnit.DAYS)) }
    }
}
````

Файл `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskChangesTest.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.Instant

/** The changes the phone writes, as the web's src/services/data/tasks.js writes them. */
class TaskChangesTest {
    private val now = Instant.parse("2026-10-24T12:00:00Z")

    private fun task(
        due: Due? = null,
        repeat: Repeat? = null,
        pulseMuted: Boolean = false,
        status: TaskStatus = TaskStatus.ACTIVE,
    ) = Task(
        id = "t1",
        title = "Water the plants",
        description = "",
        categoryId = null,
        status = status,
        due = due,
        reminders = emptyList(),
        repeat = repeat,
        radius = 45,
        pulseMuted = pulseMuted,
        createdAt = Instant.parse("2026-10-01T08:00:00Z"),
        updatedAt = Instant.parse("2026-10-01T08:00:00Z"),
        deletedAt = null,
    )

    private val daily = Repeat(every = 1, unit = RepeatUnit.DAYS)

    @Test
    fun `done of a one-off task, with a due or without, is the status done`() {
        assertEquals(mapOf("status" to "done"), completionChanges(task(), "UTC", now))
        assertEquals(mapOf("status" to "done"), completionChanges(task(due = Due("2026-10-20T09:00", "Europe/Berlin")), "UTC", now))
    }

    @Test
    fun `done of a repeating task moves its due to the first time after now, in the zone of the due`() {
        // 09:00 in Berlin is 07:00 UTC: on the 24th it has passed at 12:00 UTC, so the 25th.
        val overdue = task(due = Due("2026-10-20T09:00", "Europe/Berlin"), repeat = daily)
        assertEquals(mapOf("due" to mapOf("local" to "2026-10-25T09:00", "tz" to "Europe/Berlin")), completionChanges(overdue, "Asia/Tokyo", now))
        // A due still ahead moves one step.
        val ahead = task(due = Due("2026-10-30T09:00", "Europe/Berlin"), repeat = daily)
        assertEquals(mapOf("due" to mapOf("local" to "2026-10-31T09:00", "tz" to "Europe/Berlin")), completionChanges(ahead, "UTC", now))
    }

    @Test
    fun `done of a repeating task whose pulse was stopped lets it pulse again`() {
        val muted = task(due = Due("2026-10-20T09:00", "UTC"), repeat = daily, pulseMuted = true)
        assertEquals(
            mapOf("due" to mapOf("local" to "2026-10-25T09:00", "tz" to "UTC"), "pulseMuted" to false),
            completionChanges(muted, "UTC", now),
        )
    }

    @Test
    fun `a due zone this phone does not know steps in the zone of the phone and stays written`() {
        // 13:00 in Tokyo is 04:00 UTC: on the 24th it has passed at 12:00 UTC, so the 25th.
        val far = task(due = Due("2026-10-20T13:00", "Mars/Olympus_Mons"), repeat = Repeat(every = 1, unit = RepeatUnit.DAYS))
        assertEquals(mapOf("due" to mapOf("local" to "2026-10-25T13:00", "tz" to "Mars/Olympus_Mons")), completionChanges(far, "Asia/Tokyo", now))
        // 13:00 in Los Angeles is 20:00 UTC: on the 24th it is still ahead.
        assertEquals(mapOf("due" to mapOf("local" to "2026-10-24T13:00", "tz" to "Mars/Olympus_Mons")), completionChanges(far, "America/Los_Angeles", now))
    }
}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android --no-daemon :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/RecurrenceTest.kt:27:24 Unresolved reference 'nextFutureOccurrence'.`

- [ ] **Step 3: `Recurrence.kt` и `TaskChanges.kt`**

`Recurrence.kt` — перенос `src/contract/recurrence.js` (раздел 4 спецификации). Шаг `hours` идёт по реальному времени: сначала срок перематывается к последнему шагу не позже «сейчас» (иначе пример `hourly-overdue-for-twenty-years` не уложится в предохранитель 100 000 шагов), а местное время, которое осенью бывает дважды, второй раз пропускается. Шаги `days`, `weeks` и `months` идут по местному календарю: дни недели — по возрастанию, число месяца — от `monthDay` повтора, а в коротком месяце — последний день. `completionChanges` повторяет веб, но срок в незнакомой зоне не бросает ошибку, как в вебе, а шагает в зоне телефона (решение 4).

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Recurrence.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.formatLocal
import com.pmobile78.todoround.core.contract.parseLocal
import com.pmobile78.todoround.core.contract.toInstant
import com.pmobile78.todoround.core.contract.toLocal
import java.time.Instant
import java.time.LocalDateTime
import java.time.YearMonth

/*
 * The next due of a repeating task (data contract v2, spec 4.3), as the web's
 * src/contract/recurrence.js finds it. `hours` steps in real time and skips the second pass of an
 * autumn hour; `days`, `weeks` and `months` step on the local calendar, and the day of a month
 * comes from the repeat's monthDay, not from the due.
 */

private const val HOUR_MS = 3_600_000L
private const val MAX_STEPS = 100_000

/** One step of [repeat] from [local] in zone [tz]: the next wall-clock "YYYY-MM-DDTHH:mm". */
fun stepOccurrence(local: String, tz: String, repeat: Repeat): String {
    val at = parseLocal(local) ?: throw IllegalArgumentException("Invalid local date-time: $local")
    return when (repeat.unit) {
        RepeatUnit.HOURS -> stepHours(local, tz, repeat.every)
        RepeatUnit.DAYS -> formatLocal(at.plusDays(repeat.every.toLong()))
        RepeatUnit.WEEKS -> formatLocal(
            if (repeat.weekdays.isNullOrEmpty()) at.plusDays(7L * repeat.every) else stepWeekdays(at, repeat.every, repeat.weekdays),
        )
        RepeatUnit.MONTHS -> formatLocal(stepMonths(at, repeat.every, requireNotNull(repeat.monthDay) { "monthDay is required for months" }))
    }
}

/** The first occurrence after [local] whose moment in zone [tz] is later than [now]. */
fun nextFutureOccurrence(local: String, tz: String, repeat: Repeat, now: Instant): String {
    val nowMs = now.toEpochMilli()
    if (repeat.unit == RepeatUnit.HOURS) {
        val stepMs = repeat.every * HOUR_MS
        var t = toInstant(local, tz).toEpochMilli()
        // Fast-forward to the last step at or before now; the result is the same as stepping one by one.
        if (t < nowMs) t += (nowMs - t) / stepMs * stepMs
        for (step in 1..MAX_STEPS) {
            t += stepMs
            val candidate = toLocal(Instant.ofEpochMilli(t), tz)
            if (t > nowMs && toInstant(candidate, tz).toEpochMilli() == t) return candidate
        }
        throw IllegalStateException("Hourly recurrence did not advance")
    }
    var current = local
    for (step in 1..MAX_STEPS) {
        current = stepOccurrence(current, tz, repeat)
        if (toInstant(current, tz).toEpochMilli() > nowMs) return current
    }
    throw IllegalStateException("Recurrence did not reach the future")
}

private fun stepHours(local: String, tz: String, every: Int): String {
    var t = toInstant(local, tz).toEpochMilli()
    for (step in 1..MAX_STEPS) {
        t += every * HOUR_MS
        val candidate = toLocal(Instant.ofEpochMilli(t), tz)
        // Skip instants whose wall-clock is ambiguous (second pass of a fall-back hour).
        if (toInstant(candidate, tz).toEpochMilli() == t) return candidate
    }
    throw IllegalStateException("Hourly recurrence did not advance")
}

// The next chosen day later in the week of [at], else the earliest one [every] weeks on; ISO days, Monday first.
private fun stepWeekdays(at: LocalDateTime, every: Int, weekdays: List<Int>): LocalDateTime {
    val days = weekdays.distinct().sorted()
    val current = at.dayOfWeek.value
    val laterThisWeek = days.firstOrNull { it > current }
    if (laterThisWeek != null) return at.plusDays((laterThisWeek - current).toLong())
    val weekStart = at.plusDays((1 - current).toLong())
    return weekStart.plusDays(7L * every + (days.first() - 1))
}

private fun stepMonths(at: LocalDateTime, every: Int, monthDay: Int): LocalDateTime {
    val month = YearMonth.from(at).plusMonths(every.toLong())
    return month.atDay(minOf(monthDay, month.lengthOfMonth())).atTime(at.toLocalTime())
}
````

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.isValidTimeZone
import java.time.Instant

/*
 * The changes of a task that the phone writes (stage 2 spec, sections 4 and 5), as the fields of
 * its record: the web's src/services/data/tasks.js writes the same.
 */

/**
 * "Done" (contract 4.1; completionChanges of the web): a one-off task becomes done; a repeating one
 * stays active with its next due after [now], written in the zone of the due, and pulses again. A
 * due zone this phone does not know steps in [zone], the zone of the phone, where its due is read
 * (stage 2 spec, 2.2 №4); the web cannot step such a due at all.
 */
fun completionChanges(task: Task, zone: String, now: Instant): Map<String, Any?> {
    val due = task.due
    val repeat = task.repeat
    if (repeat == null || due == null) return mapOf("status" to TaskStatus.DONE.wire)
    val next = nextFutureOccurrence(due.local, if (isValidTimeZone(due.tz)) due.tz else zone, repeat, now)
    return buildMap {
        put("due", mapOf("local" to next, "tz" to due.tz))
        if (task.pulseMuted) put("pulseMuted", false)
    }
}
````

- [ ] **Step 4: Тесты проходят**

Run: `android/gradlew -p android --no-daemon :core:test`
Expected: `core tests: 136 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Recurrence.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RecurrenceTest.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskChangesTest.kt
git commit -F - <<'EOF'
feat(android): the next due of a repeating task and "Done", as on the web

Stage 2.2, task 1 (spec section 4). Recurrence.kt ports the web's
src/contract/recurrence.js: hours step in real time, fast-forwarded to
the last step before now and skipping the second pass of an autumn hour;
days, weeks and months step on the local calendar, the day of a month
from the repeat's monthDay. The core passes the 23 examples of
contract/fixtures/recurrence.json. completionChanges writes "Done" as the
web's tasks.js does: a one-off task is done, a repeating one gets its
next due after now in the zone of the due and pulses again; a due zone
the phone does not know steps in the zone of the phone (2.2 No. 4). On
2000 random tasks the result is the web's (a check of the draft, not
committed).
EOF
```

---

### Task 2: Описание в Markdown — как его показывает веб

**Files:**
- Create: `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Src.kt`, `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Blocks.kt`, `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Inlines.kt`, `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Markdown.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/MarkdownTest.kt`

**Interfaces:**
- Consumes: только стандартная библиотека Kotlin и `java.util.regex`.
- Produces (`com.pmobile78.todoround.core.markdown`):
  - `sealed interface Block`: `Paragraph(content: List<Inline>)`, `Heading(level: Int, content: List<Inline>)`, `Quote(blocks: List<Block>)`, `BulletList(items: List<List<Block>>)`, `OrderedList(start: Int, type: String?, items: List<List<Block>>)` (`type` — `"a"`, `"A"`, `"i"`, `"I"` или `null`), `TaskList(items: List<TaskItem>)`, `CodeBlock(language: String?, text: String)`, `Rule`;
  - `data class TaskItem(val checked: Boolean, val mark: Int, val blocks: List<Block>)` — `mark` — место в описании символа между скобками, `-1` — пункт нельзя отметить;
  - `sealed interface Inline`: `Text(text: String, bold: Boolean = false, italic: Boolean = false, strike: Boolean = false, code: Boolean = false, link: String? = null)`, `Break`;
  - `fun parseMarkdown(description: String): List<Block>` — блоки так, как их показывает веб;
  - `fun toggleTask(description: String, item: TaskItem): String?` — описание, где отметка пункта стала `x` или пробелом; `null`, если на месте отметки её больше нет;
  - `fun isSafeLink(href: String): Boolean` — `http`, `https` или `mailto`, без учёта регистра.

- [ ] **Step 1: Написать падающие тесты**

Каждый пример `MarkdownTest` — то, что показывает редактор веба (`src/utils/markdownEditor.js`): чек-листы и места их отметок, в том числе во вложенных списках, в цитатах и в нумерованных списках; касание меняет один символ, переводы строк `\r\n` и `[X]` остаются; квадратика нет там, где его нет у веба (блок кода, экранированные скобки, `- [ ]текст` без пробела, пустой `- [ ]`, сырой HTML, «ленивая» строка); блоки и выделение текста; сырой HTML и таблица — текстом; особенности веба — пункты с буквами и римскими числами, «Ok. Thanks», пять переводов строки, блок кода с пробелами перед ограждением, текст картинки; ссылки, которые открываются.

Файл `android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/MarkdownTest.kt`:

````kotlin
package com.pmobile78.todoround.core.markdown

import com.pmobile78.todoround.core.markdown.Block.BulletList
import com.pmobile78.todoround.core.markdown.Block.CodeBlock
import com.pmobile78.todoround.core.markdown.Block.Heading
import com.pmobile78.todoround.core.markdown.Block.OrderedList
import com.pmobile78.todoround.core.markdown.Block.Paragraph
import com.pmobile78.todoround.core.markdown.Block.Quote
import com.pmobile78.todoround.core.markdown.Block.Rule
import com.pmobile78.todoround.core.markdown.Block.TaskList
import com.pmobile78.todoround.core.markdown.Inline.Text
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * A description as the web's editor shows it (stage 2 spec, section 8). Each example below gives
 * what the web gives for it (TipTap 3.32 over marked 17.0.6): the draft of plan 2.2 checked them,
 * and random descriptions, on the web's editor.
 */
class MarkdownTest {
    private fun tasks(blocks: List<Block>): List<TaskItem> = blocks.flatMap { block ->
        when (block) {
            is TaskList -> block.items.flatMap { listOf(it) + tasks(it.blocks) }
            is BulletList -> block.items.flatMap(::tasks)
            is OrderedList -> block.items.flatMap(::tasks)
            is Quote -> tasks(block.blocks)
            else -> emptyList()
        }
    }

    private fun tasks(description: String) = tasks(parseMarkdown(description))

    private fun p(text: String) = Paragraph(listOf(Text(text)))

    @Test
    fun `a checklist is the task items of the web, each with the offset of its mark`() {
        val description = "- [ ] milk\n- [x] bread\n* [X] butter"
        assertEquals(
            listOf(TaskList(listOf(TaskItem(false, 3, listOf(p("milk"))), TaskItem(true, 14, listOf(p("bread"))), TaskItem(true, 26, listOf(p("butter")))))),
            parseMarkdown(description),
        )
    }

    @Test
    fun `a tap changes the mark of its item and nothing else`() {
        val description = "Купити:\r\n- [ ] молоко\r\n  - [X] хліб\r\n- [x] сир"
        val items = tasks(description)
        assertEquals(listOf(false, true, true), items.map { it.checked })
        assertEquals("Купити:\r\n- [x] молоко\r\n  - [X] хліб\r\n- [x] сир", toggleTask(description, items[0]))
        assertEquals("Купити:\r\n- [ ] молоко\r\n  - [ ] хліб\r\n- [x] сир", toggleTask(description, items[1]))
        assertEquals("Купити:\r\n- [ ] молоко\r\n  - [X] хліб\r\n- [ ] сир", toggleTask(description, items[2]))
    }

    @Test
    fun `nested checklists, checklists in quotes, in numbered lists and in lists of bullets each have their checkbox`() {
        assertEquals(listOf(false, true, false), tasks("- [ ] a\n  - [x] b\n- [ ] c").map { it.checked })
        assertEquals(listOf(13), tasks("> quote\n> - [ ] in it").map { it.mark })
        assertEquals(listOf(13), tasks("1. one\n   - [ ] sub").map { it.mark })
        // A list of bullets and tasks is cut into a list and a checklist, as on the web.
        assertEquals(
            listOf(BulletList(listOf(listOf(p("a")))), TaskList(listOf(TaskItem(false, 7, listOf(p("b")))))),
            parseMarkdown("- a\n- [ ] b"),
        )
    }

    @Test
    fun `no checkbox where the web shows none`() {
        // in a code block, with escaped brackets, in a numbered list, without the space after the
        // brackets, with nothing after them, in an html block, and under a paragraph line indented as code
        listOf(
            "```\n- [ ] code\n```",
            "- \\[ \\] escaped",
            "1. [ ] numbered",
            "- [ ]text",
            "- [ ]",
            "<div>\n- [ ] in html\n</div>",
            "para\n    - [ ] lazy",
        ).forEach { assertEquals(emptyList<TaskItem>(), tasks(it), it) }
    }

    @Test
    fun `toggleTask refuses a mark that is no longer there`() {
        val item = tasks("- [ ] milk").single()
        assertNull(toggleTask("milk", item))
        assertNull(toggleTask("- [x] milk", item))
        assertEquals("- [x] milk", toggleTask("- [ ] milk", item))
    }

    @Test
    fun `the blocks and the marks of text are those the web shows`() {
        assertEquals(
            listOf(
                Heading(1, listOf(Text("Title"))),
                Paragraph(
                    listOf(
                        Text("bold", bold = true), Text(" "), Text("it", italic = true), Text(" "), Text("gone", strike = true),
                        Text(" "), Text("code", code = true), Text(" "), Text("site", link = "https://example.com"),
                        Text(" "), Text("www.example.com", link = "http://www.example.com"),
                    ),
                ),
                Quote(listOf(p("said"))),
                OrderedList(2, null, listOf(listOf(p("two")), listOf(p("three")))),
                CodeBlock("kotlin", "val x = 1"),
                Rule,
                Paragraph(listOf(Text("line"), Inline.Break, Text("next"))),
            ),
            parseMarkdown(
                "# Title\n**bold** *it* ~~gone~~ `code` [site](https://example.com) www.example.com\n\n> said\n\n" +
                    "2. two\n3. three\n\n```kotlin\nval x = 1\n```\n---\nline  \nnext",
            ),
        )
    }

    @Test
    fun `raw html and a table show as the text they are`() {
        assertEquals(listOf(Paragraph(listOf(Text("a <b>b</b> c")))), parseMarkdown("a <b>b</b> c"))
        assertEquals(listOf(p("<div>\nx\n</div>")), parseMarkdown("<div>\nx\n</div>"))
        assertEquals(listOf(p("| a | b |\n|---|---|\n| 1 | 2 |")), parseMarkdown("| a | b |\n|---|---|\n| 1 | 2 |"))
    }

    @Test
    fun `the web's own ways stay`() {
        // Letters and roman numerals number a list too, and go on with it after a blank line; two
        // letters of any case and a dot start one; a line after a task is no part of it.
        assertEquals(
            listOf(OrderedList(1, "a", listOf(listOf(p("first")), listOf(p("second")))), Rule, OrderedList(4, "I", listOf(listOf(p("fourth"))))),
            parseMarkdown("a. first\nb. second\n\n- - -\n\nIV) fourth"),
        )
        assertEquals(listOf(OrderedList(2, null, listOf(listOf(p("two")), listOf(p("then letters"))))), parseMarkdown("2. two\n\nab. then letters"))
        assertEquals(listOf(OrderedList(1, null, listOf(listOf(p("Thanks\nNext"))))), parseMarkdown("Ok. Thanks\nNext"))
        assertEquals(listOf(TaskList(listOf(TaskItem(false, 3, listOf(p("a"))))), p("b")), parseMarkdown("- [ ] a\nb"))
        // Four blank lines are one empty paragraph; a fence with spaces before it shows nothing.
        assertEquals(listOf(p("a"), Paragraph(emptyList()), p("b")), parseMarkdown("a\n\n\n\n\nb"))
        assertEquals(listOf(p("text")), parseMarkdown("text\n\n  ```\ncode\n  ```"))
        // An image shows its text.
        assertEquals(listOf(p("cat")), parseMarkdown("![cat](https://example.com/cat.png)"))
    }

    @Test
    fun `only http, https and mailto links open`() {
        assertTrue(isSafeLink("https://example.com"))
        assertTrue(isSafeLink("HTTP://example.com"))
        assertTrue(isSafeLink("mailto:a@example.com"))
        assertFalse(isSafeLink("javascript:alert(1)"))
        assertFalse(isSafeLink("ftp://example.com"))
        assertFalse(isSafeLink("example.com"))
    }
}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android --no-daemon :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/MarkdownTest.kt:3:46 Unresolved reference 'Block'.`

- [ ] **Step 3: Разбор описания**

Это перенос того, что делает редактор веба, в четыре файла:

- `Src.kt` — текст как массив символов, где у каждого символа записано его место в описании: так квадратик, собранный из многих преобразований текста, знает, какой символ менять. Здесь же пробелы и концы строк JavaScript — `\s` и `.` регулярных выражений веба.
- `Blocks.kt` — блоки marked 17.0.6 (`Tokenizer` и `Lexer`, GFM, без `breaks`) в его порядке; первыми идут токенизаторы TipTap 3.32 — чек-лист (`- [ ] …` с вложенными пунктами) и нумерованный список с буквами и римскими числами; абзац обрывается там, где может начаться чек-лист TipTap. Правила написаны без регулярных выражений: регулярные выражения Android (ICU) понимают `\s`, `\b`, `\w` и регистр иначе, чем JDK, на котором идут тесты JVM, а marked полагается на правила JavaScript.
- `Inlines.kt` — строчная разметка marked: экранирование, код, `**`, `*`, `_`, `~~`, ссылки и ссылки по имени, адреса в `<…>`, `www.` и `https://` в тексте, почта. Регулярные выражения здесь есть, но классы JavaScript в них выписаны явно.
- `Markdown.kt` — модель для экрана так, как TipTap строит документ из токенов marked: смешанный список делится на список и чек-лист, пустые строки внутри списка становятся пустыми абзацами, выделение складывается в отметки текста. Нарочно не как в вебе (решение 1, раздел 8): сырой HTML — его текстом; таблица — текстом (веб её пропускает); описание, в котором нет ни одного блока, веб читает как HTML — телефон показывает его текст одним абзацем; ссылка не на `http`, `https` или `mailto` — простой текст.

Как и marked, разбор на некоторых нарочно странных текстах растёт с квадратом длины (`*a ` тысячи раз подряд): экран задачи разбирает описание не в главном потоке (задача 4).

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Src.kt`:

````kotlin
package com.pmobile78.todoround.core.markdown

/*
 * Text as the web's Markdown parser sees it, with the place of each character in the description.
 * The parser cuts lines, drops their indentation and the "> " of quotes, turns tabs into spaces and
 * adds characters of its own; a Src keeps for every character its offset in the description, or -1
 * for one the parser added, so that a checkbox found anywhere maps back to the bracket it toggles.
 */

/** A view of [length] characters of a text with their offsets in the description. */
internal class Src private constructor(
    private val chars: String,
    private val origins: IntArray,
    private val from: Int,
    override val length: Int,
) : CharSequence {
    override fun get(index: Int): Char = chars[from + index]

    override fun subSequence(startIndex: Int, endIndex: Int): Src {
        require(startIndex in 0..endIndex && endIndex <= length) { "bad range $startIndex..$endIndex of $length" }
        return Src(chars, origins, from + startIndex, endIndex - startIndex)
    }

    override fun toString(): String = chars.substring(from, from + length)

    /** The offset of character [index] in the description, or -1 when the parser added it. */
    fun origin(index: Int): Int = origins[from + index]

    /** From [start] to the end; past the end it is empty, as String.prototype.slice gives. */
    fun from(start: Int): Src = subSequence(minOf(start, length), length)

    /** The first [end] characters (all of them when [end] is past the end). */
    fun upTo(end: Int): Src = subSequence(0, minOf(end, length))

    operator fun plus(other: Src): Src = join(listOf(this, other), "")

    /** The lines, as String.prototype.split("\n") gives them. */
    fun lines(): List<Src> {
        val lines = mutableListOf<Src>()
        var start = 0
        for (i in 0 until length) {
            if (this[i] == '\n') {
                lines += subSequence(start, i)
                start = i + 1
            }
        }
        lines += subSequence(start, length)
        return lines
    }

    /** The first line, without its newline. */
    fun firstLine(): Src = upTo(indexOf('\n').let { if (it < 0) length else it })

    companion object {
        /** The description itself: every character is where it is. */
        fun of(text: String): Src = Src(text, IntArray(text.length) { it }, 0, text.length)

        /** Characters the parser adds, which are nowhere in the description. */
        fun added(text: String): Src = Src(text, IntArray(text.length) { -1 }, 0, text.length)

        /** [count] spaces that stand for the character at offset [origin] (a tab). */
        fun spaces(count: Int, origin: Int): Src = withOrigin(" ".repeat(count), origin)

        /** [text] standing for the character at offset [origin]. */
        fun withOrigin(text: String, origin: Int): Src = Src(text, IntArray(text.length) { origin }, 0, text.length)

        /** [parts] one after another with [separator] (added characters) between them. */
        fun join(parts: List<Src>, separator: String): Src {
            val total = parts.sumOf { it.length } + separator.length * maxOf(0, parts.size - 1)
            val chars = CharArray(total)
            val origins = IntArray(total)
            var at = 0
            parts.forEachIndexed { i, part ->
                if (i > 0) {
                    separator.toCharArray(chars, at)
                    origins.fill(-1, at, at + separator.length)
                    at += separator.length
                }
                part.chars.toCharArray(chars, at, part.from, part.from + part.length)
                System.arraycopy(part.origins, part.from, origins, at, part.length)
                at += part.length
            }
            return Src(String(chars), origins, 0, total)
        }
    }
}

// The white space of JavaScript: \s of its regular expressions and what trim() removes.
internal fun isJsSpace(c: Char): Boolean = when (c) {
    '\t', '\n', '\u000B', '\u000C', '\r', ' ', '\u00A0', '\u1680', '\u2028', '\u2029', '\u202F', '\u205F', '\u3000', '\uFEFF' -> true
    else -> c in '\u2000'..'\u200A'
}

/** The characters that "." of a JavaScript regular expression does not match. */
internal fun isJsLineEnd(c: Char): Boolean = c == '\n' || c == '\r' || c == '\u2028' || c == '\u2029'

/** Without the JavaScript white space around it (String.prototype.trim). */
internal fun Src.jsTrim(): Src = jsTrimEnd().jsTrimStart()

internal fun Src.jsTrimStart(): Src = from(jsIndent())

internal fun Src.jsTrimEnd(): Src {
    var end = length
    while (end > 0 && isJsSpace(this[end - 1])) end--
    return upTo(end)
}

internal fun String.jsTrim(): String = trim(::isJsSpace)

internal fun CharSequence.isJsBlank(): Boolean = all(::isJsSpace)

/** The number of JavaScript white space characters at the start (the length of `^\s*`). */
internal fun CharSequence.jsIndent(): Int {
    var n = 0
    while (n < length && isJsSpace(this[n])) n++
    return n
}

/** The index of the first character that is not a plain space, or -1 (search(/[^ ]/)). */
internal fun CharSequence.firstNonSpace(): Int {
    for (i in indices) if (this[i] != ' ') return i
    return -1
}

/** Every tab as four spaces (replace(/\t/g, '    ')): the four stand for the tab. */
internal fun Src.tabsToSpaces(): Src {
    if ('\t' !in this) return this
    val parts = mutableListOf<Src>()
    var start = 0
    for (i in 0 until length) {
        if (this[i] == '\t') {
            parts += subSequence(start, i)
            parts += Src.spaces(4, origin(i))
            start = i + 1
        }
    }
    parts += from(start)
    return Src.join(parts, "")
}

/** Tabs to the next stop of four columns, counted from column [column] (expandTabs of marked). */
internal fun Src.expandTabs(column: Int): Src {
    if ('\t' !in this) return this
    val parts = mutableListOf<Src>()
    var col = column
    var start = 0
    var i = 0
    while (i < length) {
        val c = this[i]
        if (c == '\t') {
            parts += subSequence(start, i)
            val added = 4 - col % 4
            parts += Src.spaces(added, origin(i))
            col += added
            start = i + 1
        } else {
            // A surrogate pair is one character for `for (const char of line)`.
            if (c.isHighSurrogate() && i + 1 < length && this[i + 1].isLowSurrogate()) i++
            col++
        }
        i++
    }
    parts += from(start)
    return Src.join(parts, "")
}
````

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Blocks.kt`:

````kotlin
package com.pmobile78.todoround.core.markdown

/*
 * The block level of the web's Markdown: the block lexer of marked 17.0.6 (src/Lexer.ts and
 * src/Tokenizer.ts, GFM on) with the two tokenizers TipTap 3.32 adds in front of it, task lists
 * (@tiptap/extension-list, task-list.ts) and ordered lists with numbers, letters or roman numerals
 * (ordered-list.ts). Each rule is written out by hand as the regular expression of marked reads:
 * Android runs java.util.regex on ICU and the tests run it on the JDK, and the two differ on \s,
 * \b and case folding, so the rules use none of them.
 */

/** A block token of marked or TipTap; [raw] is the text it took. */
internal sealed class Tok {
    abstract var raw: Src
}

internal class SpaceTok(override var raw: Src) : Tok()

internal class CodeTok(override var raw: Src, val text: String, val lang: String?, val indented: Boolean) : Tok()

internal class HeadingTok(override var raw: Src, val depth: Int, val inline: MutableList<Inl>) : Tok()

internal class HrTok(override var raw: Src) : Tok()

internal class QuoteTok(override var raw: Src, val tokens: MutableList<Tok>) : Tok()

internal class HtmlTok(override var raw: Src) : Tok()

internal class DefTok(override var raw: Src) : Tok()

internal class TableTok(override var raw: Src) : Tok()

/**
 * A paragraph or a line of text. marked joins the lines after it to it one by one, as strings of
 * JavaScript join cheaply: the raw and the text here grow in parts and join when read.
 */
internal sealed class TextBlockTok(raw: Src, text: String, val inline: MutableList<Inl>) : Tok() {
    private val rawParts = mutableListOf(raw)
    private val textPart = StringBuilder(text)

    override var raw: Src
        get() {
            if (rawParts.size > 1) {
                val joined = Src.join(rawParts, "")
                rawParts.clear()
                rawParts += joined
            }
            return rawParts[0]
        }
        set(value) {
            rawParts.clear()
            rawParts += value
        }

    var text: String
        get() = textPart.toString()
        set(value) {
            textPart.setLength(0)
            textPart.append(value)
        }

    /** The raw goes on with [raw] after a newline it does not end with, the text with a newline and [text]. */
    fun append(raw: Src, text: String) {
        if (!rawEndsWithNewline()) rawParts += Src.added("\n")
        rawParts += raw
        textPart.append('\n').append(text)
    }

    fun appendNewline() {
        rawParts += Src.added("\n")
    }

    private fun rawEndsWithNewline(): Boolean {
        for (part in rawParts.asReversed()) if (part.isNotEmpty()) return part[part.length - 1] == '\n'
        return false
    }
}

internal class ParagraphTok(raw: Src, text: String, inline: MutableList<Inl>) : TextBlockTok(raw, text, inline)

internal class TextTok(raw: Src, text: String, inline: MutableList<Inl>) : TextBlockTok(raw, text, inline)

/** marked's checkbox of a task item in its own list; TipTap shows nothing for it. */
internal class CheckboxTok(override var raw: Src) : Tok()

/** A list of marked, or an ordered list of TipTap ([typeMarker] "a", "A", "i" or "I" for letters and numerals). */
internal class ListTok(
    override var raw: Src,
    val ordered: Boolean,
    val start: Int,
    val typeMarker: String?,
    val items: List<ItemTok>,
) : Tok()

/** An item of a list; [text] is null for the items of TipTap's ordered lists. */
internal class ItemTok(override var raw: Src, var text: Src?, val tokens: MutableList<Tok>) : Tok()

internal class TaskListTok(override var raw: Src, val items: List<TaskItemTok>) : Tok()

/** A task item of TipTap; [mark] is the offset in the description of the character between its brackets. */
internal class TaskItemTok(
    val checked: Boolean,
    val mark: Int,
    val text: String,
    val inline: List<Inl>,
    val nested: List<Tok>?,
) : Tok() {
    override var raw: Src = Src.added("")
}

/** A link definition, `[label]: href "title"`. */
internal class LinkDef(val href: String, val title: String?)

/** The lexer of one parse: its state, link definitions and inline queue, as marked's _Lexer keeps them. */
internal class Lexer {
    var top = true
    var inLink = false
    var inRawBlock = false
    val links = mutableMapOf<String, LinkDef>()

    private class Queued(val src: StringBuilder, val target: MutableList<Inl>)

    private val queue = mutableListOf<Queued>()

    /** The tokens of [src], their inline content lexed at the end, as marked.lexer gives them. */
    fun lex(src: Src): MutableList<Tok> {
        val tokens = blockTokens(withoutCarriageReturns(src), mutableListOf())
        for (entry in queue) entry.target.addAll(inlineTokens(entry.src.toString()))
        queue.clear()
        return tokens
    }

    fun inlineTokens(src: String): List<Inl> = InlineLexer(this).tokens(src)

    private fun inline(src: String): MutableList<Inl> {
        val target = mutableListOf<Inl>()
        queue += Queued(StringBuilder(src), target)
        return target
    }

    fun blockTokens(start: Src, tokens: MutableList<Tok> = mutableListOf(), lastParagraphClippedAtStart: Boolean = false): MutableList<Tok> {
        var src = start
        var lastParagraphClipped = lastParagraphClippedAtStart
        while (src.isNotEmpty()) {
            // TipTap's tokenizers come first; marked tries the one added last first.
            val ext = taskList(src) ?: orderedList(src)
            if (ext != null) {
                src = src.from(ext.raw.length)
                tokens += ext
                continue
            }
            var n = space(src)
            if (n > 0) {
                val raw = src.upTo(n)
                src = src.from(n)
                val last = tokens.lastOrNull()
                if (n == 1 && last is TextBlockTok) {
                    last.appendNewline()
                } else if (n == 1 && last != null) {
                    last.raw = last.raw + Src.added("\n")
                } else {
                    tokens += SpaceTok(raw)
                }
                continue
            }
            val code = code(src)
            if (code != null) {
                src = src.from(code.raw.length)
                val last = tokens.lastOrNull()
                // An indented code block cannot interrupt a paragraph.
                if (last is TextBlockTok) {
                    mergeInto(last, code.raw, code.text)
                } else {
                    tokens += code
                }
                continue
            }
            val other = fences(src) ?: heading(src) ?: hr(src) ?: blockquote(src) ?: list(src) ?: html(src)
            if (other != null) {
                src = src.from(other.raw.length)
                tokens += other
                continue
            }
            val def = def(src)
            if (def != null) {
                src = src.from(def.first.raw.length)
                val last = tokens.lastOrNull()
                if (last is TextBlockTok) {
                    mergeInto(last, def.first.raw, def.first.raw.toString())
                } else if (def.second !in links) {
                    links[def.second] = def.third
                    tokens += def.first
                }
                continue
            }
            val more = table(src) ?: lheading(src)
            if (more != null) {
                src = src.from(more.raw.length)
                tokens += more
                continue
            }
            // A paragraph stops where a task list of TipTap starts (marked's startBlock).
            val cutSrc = if (taskListStartsAfterFirst(src)) src.upTo(1) else src
            if (top) {
                n = paragraph(cutSrc)
                if (n > 0) {
                    val raw = cutSrc.upTo(n)
                    val text = raw.toString()
                    val last = tokens.lastOrNull()
                    if (lastParagraphClipped && last is ParagraphTok) {
                        mergeInto(last, raw, text)
                    } else {
                        tokens += ParagraphTok(raw, text, inline(text))
                    }
                    lastParagraphClipped = cutSrc.length != src.length
                    src = src.from(n)
                    continue
                }
            }
            n = src.indexOf('\n').let { if (it < 0) src.length else it }
            if (n > 0) {
                val raw = src.upTo(n)
                val text = raw.toString()
                src = src.from(n)
                val last = tokens.lastOrNull()
                if (last is TextTok) {
                    mergeInto(last, raw, text)
                } else {
                    tokens += TextTok(raw, text, inline(text))
                }
                continue
            }
            error("Infinite loop on byte: ${src[0].code}")
        }
        top = true
        return tokens
    }

    // The raw and the text of [token] go on with [raw] and [text], and so does the source of its inline
    // content: the last entry of the queue is the token's own, which holds its text.
    private fun mergeInto(token: TextBlockTok, raw: Src, text: String) {
        token.append(raw, text)
        queue.last().src.append('\n').append(text)
    }

    // ---------- marked's block tokenizers ----------

    // newline: /^(?:[ \t]*(?:\n|$))+/
    private fun space(src: Src): Int {
        var pos = 0
        while (true) {
            var p = pos
            while (p < src.length && (src[p] == ' ' || src[p] == '\t')) p++
            if (p < src.length && src[p] == '\n') {
                pos = p + 1
                continue
            }
            if (p == src.length) pos = p
            return pos
        }
    }

    // code: /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/
    private fun code(src: Src): CodeTok? {
        var pos = 0
        while (true) {
            val content = codeIndent(src, pos)
            if (content < 0) break
            val end = lineEnd(src, content)
            if (end == content) break
            pos = end
            if (pos < src.length && src[pos] == '\n') {
                pos++
                while (true) {
                    var r = pos
                    while (r < src.length && (src[r] == ' ' || src[r] == '\t')) r++
                    if (r < src.length && src[r] == '\n') {
                        pos = r + 1
                    } else {
                        if (r == src.length) pos = r
                        break
                    }
                }
            }
            if (pos >= src.length) break
        }
        if (pos == 0) return null
        val raw = src.upTo(pos)
        // text: raw.replace(/^(?: {1,4}| {0,3}\t)/gm, '') without the newlines at its end
        val text = raw.toString().split('\n').joinToString("\n") { line ->
            val spaces = line.takeWhile { it == ' ' }.length
            when {
                spaces > 0 -> line.substring(minOf(spaces, 4))
                line.startsWith('\t') -> line.substring(1)
                else -> line
            }
        }.trimEnd('\n')
        return CodeTok(raw, text, lang = null, indented = true)
    }

    // The start of the code after the indentation of an indented code line at [at], or -1.
    private fun codeIndent(src: Src, at: Int): Int {
        var i = 0
        while (i < 4 && at + i < src.length && src[at + i] == ' ') i++
        if (i == 4) return at + 4
        if (at + i < src.length && src[at + i] == '\t') return at + i + 1
        return -1
    }

    // fences: /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/
    private fun fences(src: Src): CodeTok? {
        val p = spacesUpTo(src, 0, 3)
        if (p >= src.length || (src[p] != '`' && src[p] != '~')) return null
        val fence = src[p]
        var q = p
        while (q < src.length && src[q] == fence) q++
        if (q - p < 3) return null
        val infoEnd = lineEnd(src, q)
        if (fence == '`' && (q until infoEnd).any { src[it] == '`' }) return null
        val opening = src.subSequence(p, q).toString()
        val info = src.subSequence(q, infoEnd).toString()
        val contentStart = if (infoEnd < src.length) infoEnd + 1 else infoEnd
        var end = -1
        var content: String? = null
        val emptyClose = closingFence(src, contentStart, opening)
        if (emptyClose >= 0) {
            end = emptyClose
        } else if (contentStart == src.length) {
            end = contentStart
        } else {
            var at = contentStart
            while (end < 0) {
                if (at == src.length) {
                    content = src.subSequence(contentStart, at).toString()
                    end = at
                } else if (src[at] == '\n') {
                    val close = closingFence(src, at + 1, opening)
                    if (close >= 0) {
                        content = src.subSequence(contentStart, at).toString()
                        end = close
                    } else if (at + 1 == src.length) {
                        content = src.subSequence(contentStart, at).toString()
                        end = at + 1
                    }
                }
                at++
            }
        }
        val raw = src.upTo(end)
        val lang = if (info.isEmpty()) null else unescapePunctuation(info.jsTrim())
        return CodeTok(raw, indentCodeCompensation(raw.toString(), content ?: ""), lang, indented = false)
    }

    // The end of a closing fence ` {0,3}<opening>[~`]* *` that starts a line at [at] and fills it, or -1.
    private fun closingFence(src: Src, at: Int, opening: String): Int {
        if (at > src.length) return -1
        val p = spacesUpTo(src, at, 3)
        if (!src.startsWith(opening, p)) return -1
        var q = p + opening.length
        while (q < src.length && (src[q] == '~' || src[q] == '`')) q++
        while (q < src.length && src[q] == ' ') q++
        return if (q == src.length || src[q] == '\n') q else -1
    }

    // indentCodeCompensation of marked: the lines of a fenced code lose the indentation of its fence.
    private fun indentCodeCompensation(raw: String, text: String): String {
        val indent = raw.jsIndent()
        if (indent == 0 || !raw.startsWith("```", indent)) return text
        return text.split('\n').joinToString("\n") { line ->
            val own = line.jsIndent()
            if (own > 0 && own >= indent) line.substring(indent) else line
        }
    }

    // heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/
    private fun heading(src: Src): HeadingTok? {
        val p = spacesUpTo(src, 0, 3)
        var q = p
        while (q < src.length && src[q] == '#') q++
        val depth = q - p
        if (depth !in 1..6) return null
        if (q < src.length && !isJsSpace(src[q])) return null
        var end = q
        while (end < src.length && !isJsLineEnd(src[end])) end++
        if (end < src.length && src[end] != '\n') return null
        val textEnd = end
        while (end < src.length && src[end] == '\n') end++
        var text = src.subSequence(q, textEnd).toString().jsTrim()
        if (text.endsWith('#')) {
            val trimmed = text.trimEnd('#')
            if (trimmed.isEmpty() || trimmed.endsWith(' ')) text = trimmed.jsTrim()
        }
        return HeadingTok(src.upTo(end), depth, inline(text))
    }

    private fun hr(src: Src): HrTok? {
        val n = hrLength(src, 0, 3, tabs = true)
        if (n < 0) return null
        var end = n
        while (end > 0 && src[end - 1] == '\n') end--
        return HrTok(src.upTo(end))
    }

    // hr: /^ {0,maxSpaces}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/ at [at]: the length
    // of the match with its newlines, or -1. In list items marked allows spaces only between the marks.
    private fun hrLength(src: Src, at: Int, maxSpaces: Int, tabs: Boolean): Int {
        val p = spacesUpTo(src, at, maxSpaces)
        if (p >= src.length || src[p] !in "-_*") return -1
        val mark = src[p]
        var count = 0
        var q = p
        while (q < src.length) {
            val c = src[q]
            if (c == mark) count++ else if (c != ' ' && !(tabs && c == '\t')) break
            q++
        }
        if (count < 3) return -1
        if (q < src.length && src[q] != '\n') return -1
        while (q < src.length && src[q] == '\n') q++
        return q - at
    }

    // blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/, then the lines as Tokenizer.blockquote reads them.
    private fun blockquote(src: Src): QuoteTok? {
        val n = blockquoteLength(src)
        if (n == 0) return null
        var lines = src.upTo(n).jsTrimEndNewlines().lines()
        var raw: Src? = null
        val tokens = mutableListOf<Tok>()
        while (lines.isNotEmpty()) {
            var inBlockquote = false
            val currentLines = mutableListOf<Src>()
            var i = 0
            while (i < lines.size) {
                if (blockquoteStart(lines[i])) {
                    currentLines += lines[i]
                    inBlockquote = true
                } else if (!inBlockquote) {
                    currentLines += lines[i]
                } else {
                    break
                }
                i++
            }
            lines = lines.subList(i, lines.size)
            val currentRaw = Src.join(currentLines, "\n")
            val currentText = withoutQuoteMarks(setextInQuote(currentRaw))
            raw = if (raw == null) currentRaw else Src.join(listOf(raw, currentRaw), "\n")
            val wasTop = top
            top = true
            blockTokens(currentText, tokens, true)
            top = wasTop
            if (lines.isEmpty()) break
            val last = tokens.lastOrNull()
            if (last is CodeTok) {
                break
            } else if (last is QuoteTok) {
                val newText = Src.join(listOf(last.raw) + lines, "\n")
                val newToken = blockquote(newText)!!
                tokens[tokens.lastIndex] = newToken
                raw = raw.upTo(raw.length - last.raw.length) + newToken.raw
                break
            } else if (last is ListTok) {
                val newText = Src.join(listOf(last.raw) + lines, "\n")
                // marked's own list tokenizer reads the list again; one numbered by letters it cannot, and
                // the web stops there with an error (a TypeError of marked). The quote ends before the rest.
                val newToken = list(newText) ?: break
                tokens[tokens.lastIndex] = newToken
                raw = raw.upTo(raw.length - last.raw.length) + newToken.raw
                lines = newText.from(newToken.raw.length).lines()
                continue
            }
        }
        return QuoteTok(raw!!, tokens)
    }

    private fun blockquoteLength(src: Src): Int {
        var pos = 0
        while (pos < src.length) {
            var p = spacesUpTo(src, pos, 3)
            if (p >= src.length || src[p] != '>') break
            p++
            if (p < src.length && src[p] == ' ') p++
            // The blockquote of marked takes the paragraph of CommonMark, which a table does not end.
            if (p < src.length && src[p] != '\n') p = paragraphEnd(src, p, tables = false)
            pos = if (p < src.length) p + 1 else p
        }
        return pos
    }

    // The end of the paragraph `[^\n]+(?:\n(?!interrupters)[^\n]+)*` that starts at [at] (a non-empty line);
    // a table ends the paragraph of GFM only.
    private fun paragraphEnd(src: Src, at: Int, tables: Boolean): Int {
        var q = lineEnd(src, at)
        while (q < src.length && src[q] == '\n') {
            val next = q + 1
            if (interruptsParagraph(src, next, tables)) break
            val nextEnd = lineEnd(src, next)
            if (nextEnd == next) break
            q = nextEnd
        }
        return q
    }

    // paragraph: /^([^\n]+(?:\n(?!hr|heading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/ of GFM
    private fun paragraph(src: Src): Int = if (src.isNotEmpty() && src[0] != '\n') paragraphEnd(src, 0, tables = true) else 0

    // The lines that end a paragraph of GFM in marked, at the start of the line [at].
    private fun interruptsParagraph(src: Src, at: Int, tables: Boolean): Boolean {
        if (hrLength(src, at, 3, tabs = true) >= 0) return true
        // heading: / {0,3}#{1,6}(?:\s|$)/
        var p = spacesUpTo(src, at, 3)
        var q = p
        while (q < src.length && src[q] == '#') q++
        if (q - p in 1..6 && (q == src.length || isJsSpace(src[q]))) return true
        // blockquote: / {0,3}>/
        if (p < src.length && src[p] == '>') return true
        // fences: / {0,3}(?:`{3,}(?=[^`\n]*\n)|~{3,})[^\n]*\n/
        if (p < src.length && (src[p] == '`' || src[p] == '~')) {
            val fence = src[p]
            q = p
            while (q < src.length && src[q] == fence) q++
            val end = lineEnd(src, q)
            if (q - p >= 3 && end < src.length && (fence == '~' || (q until end).none { src[it] == '`' })) return true
        }
        // list: / {0,3}(?:[*+-]|1[.)])[ \t]/
        if (p < src.length) {
            val bulletEnd = when {
                src[p] in "*+-" -> p + 1
                src[p] == '1' && p + 1 < src.length && src[p + 1] in ".)" -> p + 2
                else -> -1
            }
            if (bulletEnd in 1 until src.length && (src[bulletEnd] == ' ' || src[bulletEnd] == '\t')) return true
        }
        // html: /<\/?(?:tag)(?: +|\n|\/?>)|<(?:script|pre|style|textarea|!--)/, at the very start, case as written
        if (htmlInterrupts(src, at)) return true
        if (tables && tableStarts(src, at)) return true
        // / +\n/
        q = at
        while (q < src.length && src[q] == ' ') q++
        return q > at && q < src.length && src[q] == '\n'
    }

    private fun htmlInterrupts(src: Src, at: Int): Boolean {
        if (at >= src.length || src[at] != '<') return false
        for (start in listOf("<script", "<pre", "<style", "<textarea", "<!--")) if (src.startsWith(start, at)) return true
        var p = at + 1
        if (p < src.length && src[p] == '/') p++
        var q = p
        while (q < src.length && (src[q] in 'a'..'z' || src[q] in '0'..'9')) q++
        if (src.subSequence(p, q).toString() !in BLOCK_TAGS) return false
        return q < src.length && (src[q] == ' ' || src[q] == '\n' || src[q] == '>' || src.startsWith("/>", q))
    }

    // The table of GFM at [at]: a header line, then a line of the delimiters, then a newline or the end.
    private fun tableStarts(src: Src, at: Int): Boolean {
        val header = tableHeaderEnd(src, at)
        if (header < 0) return false
        val delimiterEnd = lineEnd(src, header + 1)
        return delimiterRow(src.subSequence(header + 1, delimiterEnd).toString())
    }

    // The end of the header line ` *([^\n ].*)\n` at [at] (at its newline), or -1.
    private fun tableHeaderEnd(src: Src, at: Int): Int {
        var p = at
        while (p < src.length && src[p] == ' ') p++
        if (p >= src.length || src[p] == '\n') return -1
        val end = lineEnd(src, p)
        if ((p until end).any { isJsLineEnd(src[it]) }) return -1
        return if (end < src.length) end else -1
    }

    // ` {0,3}((?:\| *)?:?-+:? *(?:\| *:?-+:? *)*(?:\| *)?)` filling a line.
    private fun delimiterRow(line: String): Boolean {
        val p = line.takeWhile { it == ' ' }.length
        return p <= 3 && DELIMITER_ROW.matcher(line.substring(p)).matches()
    }

    private fun blockquoteStart(line: CharSequence): Boolean {
        val p = spacesUpTo(line, 0, 3)
        return p < line.length && line[p] == '>'
    }

    // blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g -> '\n    $1'
    private fun setextInQuote(text: Src): Src {
        val lines = text.lines()
        return Src.join(
            lines.mapIndexed { i, line ->
                if (i > 0 && setextLine(line)) Src.added("    ") + line.from(spacesUpTo(line, 0, 3)) else line
            },
            "\n",
        )
    }

    private fun setextLine(line: CharSequence): Boolean {
        val p = spacesUpTo(line, 0, 3)
        if (p >= line.length || (line[p] != '=' && line[p] != '-')) return false
        val mark = line[p]
        var q = p
        while (q < line.length && line[q] == mark) q++
        while (q < line.length && line[q] == ' ') q++
        return q == line.length
    }

    // blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm -> ''
    private fun withoutQuoteMarks(text: Src): Src = Src.join(
        text.lines().map { line ->
            val p = spacesUpTo(line, 0, 3)
            if (p < line.length && line[p] == '>') {
                val q = p + 1
                line.from(if (q < line.length && (line[q] == ' ' || line[q] == '\t')) q + 1 else q)
            } else {
                line
            }
        },
        "\n",
    )

    // list: Tokenizer.list of marked.
    fun list(start: Src): ListTok? {
        var src = start
        val first = listStart(src) ?: return null
        val bull = src.upTo(first).toString().jsTrim()
        val ordered = bull.length > 1
        val delimiter = bull.last()
        val items = mutableListOf<ItemTok>()
        var loose = false
        var endsWithBlankLine = false
        val listRaw = mutableListOf<Src>()
        while (src.isNotEmpty()) {
            var endEarly = false
            val bulletEnd = listItemBullet(src, ordered, delimiter)
            if (bulletEnd < 0) break
            if (hrLength(src, 0, 3, tabs = true) >= 0) break
            val firstLineEnd = lineEnd(src, bulletEnd)
            val itemLineEnd = if (firstLineEnd < src.length) firstLineEnd + 1 else firstLineEnd
            // The raw and the contents of the item grow line by line: they join at its end.
            val raw = mutableListOf(src.upTo(itemLineEnd))
            var line = src.subSequence(bulletEnd, firstLineEnd).expandTabs(bulletEnd)
            src = src.from(itemLineEnd)
            var nextLine = src.firstLine()
            var blankLine = line.isJsBlank()
            var indent: Int
            val contents = mutableListOf<Src>()
            if (blankLine) {
                indent = bulletEnd + 1
                contents += Src.added("")
            } else {
                indent = line.firstNonSpace()
                indent = if (indent > 4) 1 else indent
                contents += line.from(indent)
                indent += bulletEnd
            }
            if (blankLine && nextLine.all { it == ' ' || it == '\t' }) {
                raw += nextLine
                raw += Src.added("\n")
                src = src.from(nextLine.length + 1)
                endEarly = true
            }
            if (!endEarly) {
                val k = minOf(3, indent - 1)
                while (src.isNotEmpty()) {
                    val rawLine = src.firstLine()
                    nextLine = rawLine
                    val nextLineWithoutTabs = nextLine.tabsToSpaces()
                    if (fencesBegin(nextLine, k) || headingBegin(nextLine, k) || htmlBegin(nextLine, k) ||
                        blockquoteBegin(nextLine, k) || nextBullet(nextLine, k) || hrLength(nextLine, 0, k, tabs = false) >= 0
                    ) {
                        break
                    }
                    if (nextLineWithoutTabs.firstNonSpace() >= indent || nextLine.isJsBlank()) {
                        contents += nextLineWithoutTabs.from(indent)
                    } else {
                        if (blankLine) break
                        if (line.tabsToSpaces().firstNonSpace() >= 4) break
                        if (fencesBegin(line, k) || headingBegin(line, k) || hrLength(line, 0, k, tabs = false) >= 0) break
                        contents += nextLine
                    }
                    blankLine = nextLine.isJsBlank()
                    raw += rawLine
                    raw += Src.added("\n")
                    src = src.from(rawLine.length + 1)
                    line = nextLineWithoutTabs.from(indent)
                }
            }
            val itemRaw = Src.join(raw, "")
            if (!loose) {
                if (endsWithBlankLine) loose = true else if (endsWithBlank(itemRaw)) endsWithBlankLine = true
            }
            items += ItemTok(itemRaw, Src.join(contents, "\n"), mutableListOf())
            listRaw += itemRaw
        }
        if (items.isEmpty()) return null
        val lastItem = items.last()
        lastItem.raw = lastItem.raw.jsTrimEnd()
        lastItem.text = lastItem.text!!.jsTrimEnd()
        for (item in items) {
            top = false
            item.tokens.addAll(blockTokens(item.text!!, mutableListOf()))
            if (isTask(item.text!!)) {
                item.text = item.text!!.from(taskMark(item.text!!))
                val firstToken = item.tokens.firstOrNull()
                if (firstToken is TextBlockTok) {
                    firstToken.raw = firstToken.raw.from(taskMark(firstToken.raw))
                    firstToken.text = firstToken.text.substring(taskMark(firstToken.text))
                    for (entry in queue.asReversed()) {
                        if (isTask(entry.src)) {
                            entry.src.delete(0, taskMark(entry.src))
                            break
                        }
                    }
                }
                val bracket = (0..item.raw.length - 3).firstOrNull { item.raw[it] == '[' && item.raw[it + 1] in " xX" && item.raw[it + 2] == ']' }
                if (bracket != null) {
                    val checkbox = CheckboxTok(item.raw.subSequence(bracket, bracket + 3) + Src.added(" "))
                    if (loose) {
                        if (firstToken is TextBlockTok) {
                            firstToken.raw = checkbox.raw + firstToken.raw
                            firstToken.text = checkbox.raw.toString() + firstToken.text
                            firstToken.inline.add(0, CheckboxInl)
                        } else {
                            item.tokens.add(0, ParagraphTok(checkbox.raw, checkbox.raw.toString(), mutableListOf(CheckboxInl)))
                        }
                    } else {
                        item.tokens.add(0, checkbox)
                    }
                }
            }
            if (!loose) {
                loose = item.tokens.any { it is SpaceTok && hasTwoLineBreaks(it.raw) }
            }
        }
        if (loose) {
            for (item in items) {
                for (i in item.tokens.indices) {
                    val token = item.tokens[i]
                    if (token is TextTok) item.tokens[i] = ParagraphTok(token.raw, token.text, token.inline)
                }
            }
        }
        val startNumber = if (ordered) bull.dropLast(1).toInt() else 0
        return ListTok(Src.join(listRaw, "").jsTrimEnd(), ordered, startNumber, typeMarker = null, items)
    }

    // block.list: /^( {0,3}(?:[*+-]|\d{1,9}[.)]))([ \t][^\n]+?)?(?:\n|$)/ — the length of its first group, or null.
    private fun listStart(src: Src): Int? {
        val bulletEnd = bulletAt(src, spacesUpTo(src, 0, 3)) ?: return null
        if (bulletEnd == src.length || src[bulletEnd] == '\n') return bulletEnd
        if ((src[bulletEnd] == ' ' || src[bulletEnd] == '\t') && bulletEnd + 1 < src.length && src[bulletEnd + 1] != '\n') return bulletEnd
        return null
    }

    // The end of a bullet `[*+-]` or `\d{1,9}[.)]` at [at], or null.
    private fun bulletAt(src: CharSequence, at: Int): Int? {
        if (at >= src.length) return null
        if (src[at] in "*+-") return at + 1
        var q = at
        while (q < src.length && src[q] in '0'..'9') q++
        return if (q - at in 1..9 && q < src.length && src[q] in ".)") q + 1 else null
    }

    // itemRegex: /^( {0,3}bull)((?:[\t ][^\n]*)?(?:\n|$))/ — the end of its first group, or -1.
    private fun listItemBullet(src: Src, ordered: Boolean, delimiter: Char): Int {
        val p = spacesUpTo(src, 0, 3)
        val end: Int
        if (ordered) {
            var q = p
            while (q < src.length && src[q] in '0'..'9') q++
            if (q - p !in 1..9 || q >= src.length || src[q] != delimiter) return -1
            end = q + 1
        } else {
            if (p >= src.length || src[p] != delimiter) return -1
            end = p + 1
        }
        return if (end == src.length || src[end] == '\n' || src[end] == ' ' || src[end] == '\t') end else -1
    }

    private fun spacesAtMost(line: CharSequence, max: Int): Int? {
        var p = 0
        while (p < line.length && line[p] == ' ') p++
        return if (p <= max) p else null
    }

    // fencesBeginRegex: /^ {0,k}(?:```|~~~)/
    private fun fencesBegin(line: CharSequence, k: Int): Boolean {
        val p = spacesAtMost(line, k) ?: return false
        return line.startsWith("```", p) || line.startsWith("~~~", p)
    }

    // headingBeginRegex: /^ {0,k}#/
    private fun headingBegin(line: CharSequence, k: Int): Boolean {
        val p = spacesAtMost(line, k) ?: return false
        return p < line.length && line[p] == '#'
    }

    // htmlBeginRegex: /^ {0,k}<(?:[a-z].*>|!--)/i
    private fun htmlBegin(line: CharSequence, k: Int): Boolean {
        val p = spacesAtMost(line, k) ?: return false
        if (p >= line.length || line[p] != '<') return false
        if (line.startsWith("!--", p + 1)) return true
        if (p + 1 >= line.length || !line[p + 1].isAsciiLetter()) return false
        var q = p + 2
        while (q < line.length && !isJsLineEnd(line[q])) {
            if (line[q] == '>') return true
            q++
        }
        return false
    }

    // blockquoteBeginRegex: /^ {0,k}>/
    private fun blockquoteBegin(line: CharSequence, k: Int): Boolean {
        val p = spacesAtMost(line, k) ?: return false
        return p < line.length && line[p] == '>'
    }

    // nextBulletRegex: /^ {0,k}(?:[*+-]|\d{1,9}[.)])((?:[ \t][^\n]*)?(?:\n|$))/
    private fun nextBullet(line: CharSequence, k: Int): Boolean {
        val p = spacesAtMost(line, k) ?: return false
        val end = bulletAt(line, p) ?: return false
        return end == line.length || line[end] == ' ' || line[end] == '\t'
    }

    // doubleBlankLine: /\n[ \t]*\n[ \t]*$/
    private fun endsWithBlank(raw: Src): Boolean {
        var i = raw.length
        while (i > 0 && (raw[i - 1] == ' ' || raw[i - 1] == '\t')) i--
        if (i == 0 || raw[i - 1] != '\n') return false
        i--
        while (i > 0 && (raw[i - 1] == ' ' || raw[i - 1] == '\t')) i--
        return i > 0 && raw[i - 1] == '\n'
    }

    // anyLine: /\n.*\n/
    private fun hasTwoLineBreaks(raw: Src): Boolean {
        val first = raw.indexOf('\n')
        if (first < 0) return false
        var i = first + 1
        while (i < raw.length) {
            if (raw[i] == '\n') return true
            if (isJsLineEnd(raw[i])) return false
            i++
        }
        return false
    }

    // listReplaceTask: /^\[[ xX]\] +/ — the length of the mark and its spaces, or 0.
    private fun taskMark(text: CharSequence): Int {
        if (text.length < 4 || text[0] != '[' || text[1] !in " xX" || text[2] != ']' || text[3] != ' ') return 0
        var n = 4
        while (n < text.length && text[n] == ' ') n++
        return n
    }

    // listIsTask: /^\[[ xX]\] +\S/
    private fun isTask(text: CharSequence): Boolean {
        val n = taskMark(text)
        return n > 0 && n < text.length && !isJsSpace(text[n])
    }

    // html: the block html of marked, its seven kinds.
    private fun html(src: Src): HtmlTok? {
        val p = spacesUpTo(src, 0, 3)
        if (p >= src.length || src[p] != '<') return null
        val end = rawBlockEnd(src, p) ?: commentEnd(src, p) ?: instructionEnd(src, p) ?: declarationEnd(src, p) ?: cdataEnd(src, p)
            ?: blockTagEnd(src, p) ?: lineTagEnd(src, p) ?: return null
        return HtmlTok(src.upTo(end))
    }

    // (1) <(script|pre|style|textarea)[\s>][\s\S]*?(?:</\1>[^\n]*\n+|$)
    private fun rawBlockEnd(src: Src, p: Int): Int? {
        val name = listOf("script", "pre", "style", "textarea").firstOrNull { src.startsWithIgnoreCase(it, p + 1) } ?: return null
        val after = p + 1 + name.length
        if (after >= src.length || !(isJsSpace(src[after]) || src[after] == '>')) return null
        var q = after + 1
        while (q < src.length) {
            if (src.startsWith("</", q) && src.startsWithIgnoreCase(name, q + 2) && q + 2 + name.length < src.length && src[q + 2 + name.length] == '>') {
                val end = lineEnd(src, q + 3 + name.length)
                if (end < src.length) return newlinesFrom(src, end)
            }
            q++
        }
        return src.length
    }

    // (2) <!--(?:-?>|[\s\S]*?(?:-->|$))[^\n]*(\n+|$)
    private fun commentEnd(src: Src, p: Int): Int? {
        if (!src.startsWith("<!--", p)) return null
        val q = p + 4
        val close = when {
            src.startsWith(">", q) -> q + 1
            src.startsWith("->", q) -> q + 2
            else -> src.indexOf("-->", q).let { if (it < 0) src.length else it + 3 }
        }
        return newlinesFrom(src, lineEnd(src, close))
    }

    // (3) <\?[\s\S]*?(?:\?>\n*|$)
    private fun instructionEnd(src: Src, p: Int): Int? {
        if (!src.startsWith("<?", p)) return null
        val close = src.indexOf("?>", p + 2)
        return if (close < 0) src.length else newlinesFrom(src, close + 2)
    }

    // (4) <![A-Z][\s\S]*?(?:>\n*|$) — case-insensitive
    private fun declarationEnd(src: Src, p: Int): Int? {
        if (!src.startsWith("<!", p) || p + 2 >= src.length || !src[p + 2].isAsciiLetter()) return null
        val close = src.indexOf('>', p + 3)
        return if (close < 0) src.length else newlinesFrom(src, close + 1)
    }

    // (5) <!\[CDATA\[[\s\S]*?(?:\]\]>\n*|$) — case-insensitive
    private fun cdataEnd(src: Src, p: Int): Int? {
        if (!src.startsWithIgnoreCase("<![CDATA[", p)) return null
        val close = src.indexOf("]]>", p + 9)
        return if (close < 0) src.length else newlinesFrom(src, close + 3)
    }

    // (6) </?(tag)(?: +|\n|/?>)[\s\S]*?(?:(?:\n[ \t]*)+\n|$) — case-insensitive
    private fun blockTagEnd(src: Src, p: Int): Int? {
        var q = p + 1
        if (q < src.length && src[q] == '/') q++
        var r = q
        while (r < src.length && (src[r].isAsciiLetter() || src[r] in '0'..'9')) r++
        if (src.subSequence(q, r).toString().lowercase() !in BLOCK_TAGS) return null
        if (!(r < src.length && (src[r] == ' ' || src[r] == '\n' || src[r] == '>' || src.startsWith("/>", r)))) return null
        val after = when (src[r]) {
            ' ' -> {
                var q2 = r
                while (q2 < src.length && src[q2] == ' ') q2++
                q2
            }
            '\n', '>' -> r + 1
            else -> r + 2
        }
        return blankLineEnd(src, after)
    }

    // (7) a whole line of one open or closing tag, not of script, pre, style or textarea — case-insensitive
    private fun lineTagEnd(src: Src, p: Int): Int? {
        var q = p + 1
        val closing = q < src.length && src[q] == '/'
        if (closing) q++
        for (name in listOf("script", "pre", "style", "textarea")) if (src.startsWithIgnoreCase(name, q)) return null
        if (q >= src.length || !src[q].isAsciiLetter()) return null
        q++
        while (q < src.length && (src[q].isAsciiLetter() || src[q] in '0'..'9' || src[q] == '_' || src[q] == '-')) q++
        if (closing) {
            while (q < src.length && isJsSpace(src[q])) q++
        } else {
            q = attributesEnd(src, q) ?: return null
        }
        if (q >= src.length || src[q] != '>') return null
        q++
        var r = q
        while (r < src.length && (src[r] == ' ' || src[r] == '\t')) r++
        if (r < src.length && src[r] != '\n') return null
        return blankLineEnd(src, q)
    }

    // (?:attribute)*? */? — attribute: / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/;
    // the end before ">", or null.
    private fun attributesEnd(src: Src, start: Int): Int? {
        var q = start
        while (true) {
            var r = q
            while (r < src.length && src[r] == ' ') r++
            if (r < src.length && src[r] == '/') r++
            if (r < src.length && src[r] == '>') return r
            r = q
            while (r < src.length && src[r] == ' ') r++
            if (r == q || r >= src.length || !(src[r].isAsciiLetter() || src[r] == ':' || src[r] == '_')) return null
            r++
            while (r < src.length && (src[r].isAsciiLetter() || src[r] in '0'..'9' || src[r] in "_.:-")) r++
            var v = r
            while (v < src.length && src[v] == ' ') v++
            if (v < src.length && src[v] == '=') {
                v++
                while (v < src.length && src[v] == ' ') v++
                val valueEnd = when {
                    v < src.length && (src[v] == '"' || src[v] == '\'') -> {
                        val quote = src[v]
                        var w = v + 1
                        while (w < src.length && src[w] != quote && src[w] != '\n') w++
                        if (w < src.length && src[w] == quote) w + 1 else -1
                    }
                    else -> {
                        var w = v
                        while (w < src.length && !isJsSpace(src[w]) && src[w] !in "\"'=<>`") w++
                        if (w > v) w else -1
                    }
                }
                if (valueEnd > 0) r = valueEnd
            }
            q = r
        }
    }

    // [\s\S]*?(?:(?:\n[ \t]*)+\n|$) from [at]: through the first blank line, or to the end.
    private fun blankLineEnd(src: Src, at: Int): Int {
        var q = at
        while (q < src.length) {
            if (src[q] == '\n') {
                var r = q + 1
                var last = -1
                while (true) {
                    while (r < src.length && (src[r] == ' ' || src[r] == '\t')) r++
                    if (r < src.length && src[r] == '\n') {
                        last = r
                        r++
                    } else {
                        break
                    }
                }
                if (last >= 0) return last + 1
            }
            q++
        }
        return src.length
    }

    // The end of the newlines (\n+ or \n*) that follow [at].
    private fun newlinesFrom(src: Src, at: Int): Int {
        var q = at
        while (q < src.length && src[q] == '\n') q++
        return q
    }

    // def: /^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/
    private fun def(src: Src): Triple<DefTok, String, LinkDef>? {
        val p = spacesUpTo(src, 0, 3)
        if (p >= src.length || src[p] != '[') return null
        val labelEnd = blockLabelEnd(src, p + 1)
        if (labelEnd < 0 || !src.startsWith("]:", labelEnd)) return null
        val label = src.subSequence(p + 1, labelEnd).toString()
        var q = labelEnd + 2
        while (q < src.length && src[q] == ' ') q++
        if (q < src.length && src[q] == '\n') {
            q++
            while (q < src.length && (src[q] == ' ' || src[q] == '\t')) q++
        }
        // the destination, then the title or none, then the end of the line
        val ends = mutableListOf<Int>()
        if (q < src.length && src[q] != '<' && !isJsSpace(src[q])) {
            var r = q + 1
            while (r < src.length && !isJsSpace(src[r])) r++
            ends += r
        } else if (q < src.length && src[q] == '<') {
            var r = q + 1
            while (r < src.length && !isJsLineEnd(src[r])) {
                if (src[r] == '>') ends += r + 1
                r++
            }
        }
        for (destinationEnd in ends) {
            var title: String? = null
            var end = -1
            for (titleEnd in titleEnds(src, destinationEnd)) {
                val rest = lineRestEnd(src, titleEnd.second) ?: continue
                title = src.subSequence(titleEnd.first, titleEnd.second).toString()
                end = rest
                break
            }
            if (end < 0) end = lineRestEnd(src, destinationEnd) ?: continue
            val destination = src.subSequence(q, destinationEnd).toString()
            val href = unescapePunctuation(if (destination.startsWith('<') && destination.endsWith('>')) destination.substring(1, destination.length - 1) else destination)
            val tag = label.lowercase().replace(JS_SPACES_RUN, " ")
            val titleText = title?.let { unescapePunctuation(it.substring(1, it.length - 1)) }
            return Triple(DefTok(src.upTo(end)), tag, LinkDef(href, titleText))
        }
        return null
    }

    // The label (?!\s*\])(?:\\[\s\S]|[^\[\]\\])+ from [at] to its "]" (the index of it), or -1.
    private fun blockLabelEnd(src: CharSequence, at: Int): Int {
        var q = at
        while (q < src.length) {
            when (src[q]) {
                '\\' -> q += 2
                '[' -> return -1
                ']' -> return if (q > at && !src.subSequence(at, q).isJsBlank()) q else -1
                else -> q++
            }
        }
        return -1
    }

    // (?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? after a destination that ends at [at]: the start and the
    // end of each title, in the order the regular expression tries them.
    private fun titleEnds(src: Src, at: Int): List<Pair<Int, Int>> {
        var q = at
        while (q < src.length && src[q] == ' ') q++
        val start = when {
            q < src.length && src[q] == '\n' -> {
                var r = q + 1
                while (r < src.length && (src[r] == ' ' || src[r] == '\t')) r++
                r
            }
            q > at -> q
            else -> return emptyList()
        }
        if (start >= src.length) return emptyList()
        return when (src[start]) {
            // "(?:\\"?|[^"\\])*": up to the first quote no backslash stands before, then back over the escaped ones
            '"' -> {
                val escaped = mutableListOf<Int>()
                var r = start + 1
                var closing = -1
                while (r < src.length) {
                    if (src[r] == '"') {
                        if (src[r - 1] == '\\' && r - 1 > start) {
                            escaped += r
                        } else {
                            closing = r
                            break
                        }
                    }
                    r++
                }
                (listOfNotNull(closing.takeIf { it >= 0 }) + escaped.reversed()).map { start to it + 1 }
            }
            // '[^'\n]*(?:\n[^'\n]+)*\n?': up to the first quote, with no empty line before it but the last
            '\'' -> {
                val closing = src.indexOf('\'', start + 1)
                if (closing < 0) return emptyList()
                val parts = src.subSequence(start + 1, closing).toString().split('\n')
                val inner = parts.subList(1, maxOf(1, parts.size - 1))
                val ok = inner.all { it.isNotEmpty() }
                if (ok) listOf(start to closing + 1) else emptyList()
            }
            // \([^()]*\)
            '(' -> {
                var r = start + 1
                while (r < src.length && src[r] != ')' && src[r] != '(') r++
                if (r < src.length && src[r] == ')') listOf(start to r + 1) else emptyList()
            }
            else -> emptyList()
        }
    }

    //  *(?:\n+|$) at [at]: the end of the match, or null.
    private fun lineRestEnd(src: Src, at: Int): Int? {
        var q = at
        while (q < src.length && src[q] == ' ') q++
        if (q == src.length) return q
        if (src[q] != '\n') return null
        return newlinesFrom(src, q)
    }

    // table: the table of GFM, with the checks of Tokenizer.table.
    private fun table(src: Src): TableTok? {
        val header = tableHeaderEnd(src, 0)
        if (header < 0) return null
        val delimiterEnd = lineEnd(src, header + 1)
        val delimiterLine = src.subSequence(header + 1, delimiterEnd).toString()
        if (!delimiterRow(delimiterLine)) return null
        var end = delimiterEnd
        if (end < src.length) {
            // rows: lines that start no other block, each to its newline or the end
            var q = end + 1
            var rowsEnd = q
            while (q < src.length) {
                if (tableRowEnds(src, q)) break
                val e = lineEnd(src, q)
                if ((q until e).any { isJsLineEnd(src[it]) }) break
                rowsEnd = if (e < src.length) e + 1 else e
                q = rowsEnd
                if (e == src.length) break
            }
            end = newlinesFrom(src, rowsEnd)
        }
        val delimiter = delimiterLine.trimStart(' ')
        if (':' !in delimiter && '|' !in delimiter) return null
        val headers = cellCount(src.upTo(header).toString().trimStart(' '))
        val aligns = delimiter.replace(TABLE_ALIGN_CHARS, "").split('|').size
        if (headers != aligns) return null
        return TableTok(src.upTo(end))
    }

    // The lines that end the rows of a table: (?! *\n|hr|heading|blockquote|code|fences|list|html).
    private fun tableRowEnds(src: Src, at: Int): Boolean {
        var q = at
        while (q < src.length && src[q] == ' ') q++
        if (q < src.length && src[q] == '\n') return true
        if (hrLength(src, at, 3, tabs = true) >= 0) return true
        val p = spacesUpTo(src, at, 3)
        var r = p
        while (r < src.length && src[r] == '#') r++
        if (r - p in 1..6 && (r == src.length || isJsSpace(src[r]))) return true
        if (p < src.length && src[p] == '>') return true
        val content = codeIndent(src, at)
        if (content in 0 until src.length && src[content] != '\n') return true
        if (p < src.length && (src[p] == '`' || src[p] == '~')) {
            val fence = src[p]
            r = p
            while (r < src.length && src[r] == fence) r++
            val end = lineEnd(src, r)
            if (r - p >= 3 && end < src.length && (fence == '~' || (r until end).none { src[it] == '`' })) return true
        }
        if (p < src.length) {
            val bulletEnd = when {
                src[p] in "*+-" -> p + 1
                src[p] == '1' && p + 1 < src.length && src[p + 1] in ".)" -> p + 2
                else -> -1
            }
            if (bulletEnd in 1 until src.length && (src[bulletEnd] == ' ' || src[bulletEnd] == '\t')) return true
        }
        return htmlInterrupts(src, at)
    }

    // The number of cells splitCells of marked finds in a header row.
    private fun cellCount(row: String): Int {
        val spaced = StringBuilder()
        for (i in row.indices) {
            if (row[i] == '|') {
                var slashes = 0
                var k = i - 1
                while (k >= 0 && row[k] == '\\') {
                    slashes++
                    k--
                }
                spaced.append(if (slashes % 2 == 1) "|" else " |")
            } else {
                spaced.append(row[i])
            }
        }
        val cells = spaced.toString().split(" |").toMutableList()
        if (cells.isNotEmpty() && cells.first().jsTrim().isEmpty()) cells.removeAt(0)
        if (cells.isNotEmpty() && cells.last().jsTrim().isEmpty()) cells.removeAt(cells.lastIndex)
        return cells.size
    }

    // lheading of GFM: a setext heading, its text not starting nor going on into another block.
    private fun lheading(src: Src): HeadingTok? {
        if (setextInterrupts(src, 0)) return null
        var pos = 0
        while (true) {
            if (pos >= 1 && pos < src.length && src[pos] == '\n') {
                val underline = setextUnderline(src, pos + 1)
                if (underline != null) {
                    val text = src.upTo(pos).toString().jsTrim()
                    return HeadingTok(src.upTo(underline.second), if (underline.first == '=') 1 else 2, inline(text))
                }
            }
            if (pos >= src.length) return null
            val c = src[pos]
            if (c == '\n') {
                if (nextLineBlank(src, pos + 1) || setextInterrupts(src, pos + 1)) return null
            } else if (isJsLineEnd(c)) {
                return null
            }
            pos++
        }
    }

    // \n {0,3}(=+|-+) *(?:\n+|$) after the text, from [at]: the mark and the end, or null.
    private fun setextUnderline(src: Src, at: Int): Pair<Char, Int>? {
        val p = spacesUpTo(src, at, 3)
        if (p >= src.length || (src[p] != '=' && src[p] != '-')) return null
        val mark = src[p]
        var q = p
        while (q < src.length && src[q] == mark) q++
        while (q < src.length && src[q] == ' ') q++
        if (q < src.length && src[q] != '\n') return null
        return mark to newlinesFrom(src, q)
    }

    // \s*?\n: the line at [at] holds only white space before its newline.
    private fun nextLineBlank(src: Src, at: Int): Boolean {
        var q = at
        while (q < src.length && isJsSpace(src[q]) && src[q] != '\n') q++
        return q < src.length && src[q] == '\n'
    }

    // The starts that a setext heading's text may not have: bull |blockCode|fences|blockquote|heading|html|table.
    private fun setextInterrupts(src: Src, at: Int): Boolean {
        val p = spacesUpTo(src, at, 3)
        val bulletEnd = bulletAt(src, p)
        if (bulletEnd != null && bulletEnd < src.length && src[bulletEnd] == ' ') return true
        if (codeIndent(src, at) >= 0) return true
        if (p < src.length && (src.startsWith("```", p) || src.startsWith("~~~", p))) return true
        if (p < src.length && (src[p] == '>' || src[p] == '#')) return true
        if (p < src.length && src[p] == '<') {
            var q = p + 1
            while (q < src.length && src[q] != '\n' && src[q] != '>') q++
            if (q > p + 1 && q + 1 < src.length && src[q] == '>' && src[q + 1] == '\n') return true
        }
        // table: / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/
        val end = lineEnd(src, p)
        return end < src.length && (p until end).all { src[it] in ":- |" } && (p until end).any { src[it] == '|' }
    }

    // ---------- TipTap's task list (task-list.ts, parseIndentedBlocks of @tiptap/core) ----------

    private fun taskList(src: Src): TaskListTok? {
        val result = indentedTaskItems(src) ?: return null
        return TaskListTok(result.second, result.first)
    }

    // parseIndentedBlocks with the item pattern /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/: the items and their raw.
    private fun indentedTaskItems(src: Src): Pair<List<TaskItemTok>, Src>? {
        // Most blocks are no task list: the first line that is not blank tells, before the lines are cut.
        var lineStart = 0
        while (true) {
            val end = lineEnd(src, lineStart)
            val line = src.subSequence(lineStart, end)
            if (!line.isJsBlank()) {
                if (taskLine(line) == null) return null
                break
            }
            if (end >= src.length) return null
            lineStart = end + 1
        }
        val lines = src.lines()
        val items = mutableListOf<TaskItemTok>()
        val raw = mutableListOf<Src>()
        var i = 0
        while (i < lines.size) {
            val line = lines[i]
            val match = taskLine(line)
            if (match == null) {
                if (items.isNotEmpty()) break
                if (line.isJsBlank()) {
                    i++
                    raw += line
                    continue
                }
                return null
            }
            raw += line
            val nested = mutableListOf<Src>()
            i++
            while (i < lines.size) {
                val next = lines[i]
                if (next.isJsBlank()) {
                    val following = (i + 1 until lines.size).firstOrNull { !lines[it].isJsBlank() } ?: break
                    if (lines[following].jsIndent() > match.indent) {
                        nested += next
                        raw += next
                        i++
                        continue
                    }
                    break
                }
                if (next.jsIndent() > match.indent) {
                    nested += next
                    raw += next
                    i++
                } else {
                    break
                }
            }
            var nestedTokens: List<Tok>? = null
            if (nested.isNotEmpty()) {
                val dedented = Src.join(nested.map { it.from(match.indent + 2) }, "\n")
                if (!dedented.isJsBlank()) nestedTokens = taskListContent(dedented)
            }
            items += TaskItemTok(match.checked, line.origin(match.bracket + 1), match.content.toString(), inlineTokens(match.content.toString()), nestedTokens)
        }
        if (items.isEmpty()) return null
        return items to Src.join(raw.map { it + Src.added("\n") }, "")
    }

    // parseTaskListContent of task-list.ts: nested task items, or the blocks of marked.
    private fun taskListContent(content: Src): List<Tok> {
        val nested = indentedTaskItems(content) ?: return blockTokens(content, mutableListOf())
        val token = TaskListTok(nested.second, nested.first)
        val remainder = content.from(nested.second.length)
        return if (!remainder.isJsBlank()) listOf(token) + blockTokens(remainder, mutableListOf()) else listOf(token)
    }

    // The start function of TipTap's task list on src.slice(1): /^\s*[-+*]\s+\[([ xX])\]\s+/.
    private fun taskListStartsAfterFirst(src: Src): Boolean {
        if (src.length < 2) return false
        return taskStartAt(src, 1) >= 0
    }

    // ---------- TipTap's ordered list (ordered-list.ts and its utils) ----------

    private class OrderedItem(val indent: Int, val number: Int, val type: String?, val contentLines: List<Src>, val raw: Src)

    private fun orderedList(src: Src): ListTok? {
        if (orderedLine(src.firstLine()) == null) return null
        val lines = src.lines()
        val listItems = mutableListOf<OrderedItem>()
        var current = 0
        var consumed = 0
        while (current < lines.size) {
            val line = lines[current]
            val match = orderedLine(line) ?: break
            val (indent, marker, content) = match
            val number = marker.toIntOrNull()
            val type = if (number == null) markerType(marker) else null
            val itemNumber = number ?: markerStart(marker)
            val contentLines = mutableListOf(content)
            val itemLines = mutableListOf(line)
            var next = current + 1
            var sawBlankLine = false
            while (next < lines.size) {
                val nextLine = lines[next]
                if (orderedLine(nextLine) != null) break
                if (nextLine.isJsBlank()) {
                    itemLines += nextLine
                    contentLines += Src.added("")
                    sawBlankLine = true
                    next++
                } else if (isJsSpace(nextLine[0])) {
                    val leading = nextLine.jsIndent()
                    val contentIndent = indent + marker.length + 1
                    itemLines += nextLine
                    contentLines += nextLine.from(minOf(leading, contentIndent))
                    next++
                } else {
                    if (sawBlankLine || interruptsLazyContinuation(nextLine)) break
                    itemLines += nextLine
                    contentLines += nextLine
                    next++
                }
            }
            listItems += OrderedItem(indent, itemNumber, type, contentLines, Src.join(itemLines, "\n"))
            consumed = next
            current = next
        }
        if (listItems.isEmpty()) return null
        val items = nestedOrderedItems(listItems, listItems[0].indent)
        if (items.isEmpty()) return null
        val first = listItems[0]
        return ListTok(Src.join(lines.subList(0, consumed), "\n"), ordered = true, start = first.number, typeMarker = first.type, items)
    }

    // buildNestedStructure: the items of [baseIndent], each with the deeper items after it as a nested list.
    private fun nestedOrderedItems(items: List<OrderedItem>, baseIndent: Int): List<ItemTok> {
        val result = mutableListOf<ItemTok>()
        var current = 0
        while (current < items.size) {
            val item = items[current]
            if (item.indent != baseIndent) {
                current++
                continue
            }
            val (paragraphLines, blockLines) = splitItemContent(item.contentLines)
            val mainText = Src.join(paragraphLines, "\n").jsTrim().toString()
            val tokens = mutableListOf<Tok>()
            if (mainText.isNotEmpty()) tokens += ParagraphTok(Src.added(mainText), mainText, inlineTokens(mainText).toMutableList())
            val additional = Src.join(blockLines, "\n").jsTrim()
            if (additional.isNotEmpty()) tokens += blockTokens(additional, mutableListOf())
            var lookAhead = current + 1
            val nestedItems = mutableListOf<OrderedItem>()
            while (lookAhead < items.size && items[lookAhead].indent > baseIndent) nestedItems += items[lookAhead++]
            if (nestedItems.isNotEmpty()) {
                tokens += ListTok(
                    Src.join(nestedItems.map { it.raw }, "\n"),
                    ordered = true,
                    start = nestedItems[0].number,
                    typeMarker = nestedItems[0].type,
                    items = nestedOrderedItems(nestedItems, nestedItems.minOf { it.indent }),
                )
            }
            result += ItemTok(item.raw, null, tokens)
            current = lookAhead
        }
        return result
    }

    // splitItemContent: the lines of the item's first paragraph, and the rest after a blank line or a block.
    private fun splitItemContent(lines: List<Src>): Pair<List<Src>, List<Src>> {
        val paragraph = mutableListOf<Src>()
        val blocks = mutableListOf<Src>()
        var reached = false
        for (line in lines) {
            if (reached) {
                blocks += line
            } else if (line.isJsBlank()) {
                reached = true
                blocks += line
            } else if (paragraph.isNotEmpty() && isBlockContentLine(line)) {
                reached = true
                blocks += line
            } else {
                paragraph += line
            }
        }
        return paragraph to blocks
    }
}

// ---------- the line patterns of TipTap ----------

internal class TaskLine(val indent: Int, val bracket: Int, val checked: Boolean, val content: Src)

// /^(\s*)([-+*])\s+\[([ xX])\]\s+(.*)$/ on one line.
internal fun taskLine(line: Src): TaskLine? {
    val indent = line.jsIndent()
    val bracket = taskBracket(line, indent) ?: return null
    var q = bracket + 3
    val spaceStart = q
    while (q < line.length && isJsSpace(line[q])) q++
    if (q == spaceStart) return null
    if ((q until line.length).any { isJsLineEnd(line[it]) }) return null
    return TaskLine(indent, bracket, line[bracket + 1] != ' ', line.from(q))
}

// [-+*]\s+\[[ xX]\] at [at]: the index of its "[", or null.
private fun taskBracket(text: CharSequence, at: Int): Int? {
    if (at >= text.length || text[at] !in "-+*") return null
    var q = at + 1
    val spaceStart = q
    while (q < text.length && isJsSpace(text[q])) q++
    if (q == spaceStart || q + 2 >= text.length) return null
    return if (text[q] == '[' && text[q + 1] in " xX" && text[q + 2] == ']') q else null
}

// /^\s*[-+*]\s+\[([ xX])\]\s+/ at [at]: the index of the "[", or -1 (the start of a task, which may go on to the next line).
internal fun taskStartAt(text: CharSequence, at: Int): Int {
    var p = at
    while (p < text.length && isJsSpace(text[p])) p++
    val bracket = taskBracket(text, p) ?: return -1
    return if (bracket + 3 < text.length && isJsSpace(text[bracket + 3])) bracket else -1
}

private val ROMAN_NUMERALS = listOf(
    1000 to "m", 900 to "cm", 500 to "d", 400 to "cd", 100 to "c", 90 to "xc",
    50 to "l", 40 to "xl", 10 to "x", 9 to "ix", 5 to "v", 4 to "iv", 1 to "i",
)

// ORDERED_LIST_ITEM_REGEX: /^(\s*)(\d+|[ivxlcdmIVXLCDM]+|[a-zA-Z]{1,2})([.)])\s+(.*)$/ — indent, marker, content.
private fun orderedLine(line: Src): Triple<Int, String, Src>? {
    val p = line.jsIndent()
    if (p >= line.length) return null
    val markerEnd = orderedMarkerEnd(line, p) ?: return null
    var q = markerEnd + 1
    val spaceStart = q
    while (q < line.length && isJsSpace(line[q])) q++
    if (q == spaceStart) return null
    if ((q until line.length).any { isJsLineEnd(line[it]) }) return null
    return Triple(p, line.subSequence(p, markerEnd).toString(), line.from(q))
}

// The end of the marker at [p] when a "." or ")" follows it, trying digits, then roman numerals, then one or two letters.
private fun orderedMarkerEnd(text: CharSequence, p: Int): Int? {
    fun closedAt(end: Int) = end < text.length && text[end] in ".)"
    var q = p
    while (q < text.length && text[q] in '0'..'9') q++
    if (q > p) return if (closedAt(q)) q else null
    q = p
    while (q < text.length && text[q] in "ivxlcdmIVXLCDM") q++
    if (q > p && closedAt(q)) return q
    if (p + 1 < text.length && text[p].isAsciiLetter() && text[p + 1].isAsciiLetter() && closedAt(p + 2)) return p + 2
    if (text[p].isAsciiLetter() && closedAt(p + 1)) return p + 1
    return null
}

private fun fromRoman(roman: String): Int {
    val lower = roman.lowercase()
    var index = 0
    var result = 0
    while (index < lower.length) {
        val numeral = ROMAN_NUMERALS.firstOrNull { lower.startsWith(it.second, index) } ?: return 0
        result += numeral.first
        index += numeral.second.length
    }
    return result
}

private fun toRoman(number: Int): String {
    var remaining = number
    val result = StringBuilder()
    for ((value, numeral) in ROMAN_NUMERALS) {
        while (remaining >= value) {
            result.append(numeral)
            remaining -= value
        }
    }
    return result.toString()
}

private fun isValidRoman(marker: String): Boolean {
    if (marker.isEmpty() || marker.any { it !in "ivxlcdmIVXLCDM" }) return false
    val value = fromRoman(marker)
    if (value <= 0) return false
    return (if (marker == marker.lowercase()) toRoman(value) else toRoman(value).uppercase()) == marker
}

// detectMarkerType: "i" or "I" for roman numerals, "a" or "A" for letters, null otherwise.
private fun markerType(marker: String): String? = when {
    marker.isEmpty() || marker.all { it in '0'..'9' } -> null
    isValidRoman(marker) -> if (marker == marker.lowercase()) "i" else "I"
    marker.length <= 2 && marker.all { it in 'a'..'z' } -> "a"
    marker.length <= 2 && marker.all { it in 'A'..'Z' } -> "A"
    else -> null
}

// markerToStart: the number a marker stands for.
private fun markerStart(marker: String): Int = when (markerType(marker)) {
    "i", "I" -> fromRoman(marker)
    "a", "A" -> {
        val lower = marker.lowercase()
        val value = when (lower.length) {
            1 -> lower[0] - 'a' + 1
            2 -> (lower[0] - 'a' + 1) * 26 + (lower[1] - 'a') + 1
            else -> 0
        }
        if (value > 0) value else 1
    }
    else -> 1
}

// PARAGRAPH_INTERRUPTERS of the ordered list's utils, on a line as written.
private fun interruptsLazyContinuation(line: CharSequence): Boolean {
    var q = 0
    while (q < line.length && line[q] == '#') q++
    if (q in 1..6 && (q == line.length || isJsSpace(line[q]))) return true
    if (line.isNotEmpty() && line[0] in "-+*" && line.length > 1 && isJsSpace(line[1])) return true
    if (line.startsWith("```") || line.startsWith("~~~") || line.startsWith("$$")) return true
    return thematicBreak(line)
}

// /^(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/
private fun thematicBreak(line: CharSequence): Boolean {
    if (line.isEmpty() || line[0] !in "-_*") return false
    val mark = line[0]
    var count = 0
    for (c in line) {
        if (c == mark) count++ else if (c != ' ' && c != '\t') return false
    }
    return count >= 3
}

// isBlockContentLine of the ordered list's utils.
private fun isBlockContentLine(line: Src): Boolean {
    val trimmed = line.jsTrimStart()
    if (trimmed.isNotEmpty() && trimmed[0] in "-+*" && trimmed.length > 1 && isJsSpace(trimmed[1])) return true
    if (orderedLine(trimmed) != null) return true
    var q = 0
    while (q < trimmed.length && trimmed[q] == '#') q++
    if (q in 1..6 && (q == trimmed.length || isJsSpace(trimmed[q]))) return true
    if (thematicBreak(trimmed) && !trimmed.startsWith("-")) return true
    if (trimmed.startsWith(">")) return true
    return trimmed.startsWith("```") || trimmed.startsWith("~~~") || trimmed.startsWith("$$")
}

// ---------- helpers ----------

// The index after up to [max] spaces at [at].
private fun spacesUpTo(text: CharSequence, at: Int, max: Int): Int {
    var p = at
    while (p < text.length && p - at < max && text[p] == ' ') p++
    return p
}

// The index of the newline that ends the line at [at], or the end.
private fun lineEnd(text: CharSequence, at: Int): Int {
    var q = at
    while (q < text.length && text[q] != '\n') q++
    return q
}

private fun Char.isAsciiLetter(): Boolean = this in 'a'..'z' || this in 'A'..'Z'

private fun CharSequence.startsWithIgnoreCase(prefix: String, at: Int): Boolean =
    at + prefix.length <= length && (prefix.indices).all { this[at + it].lowercaseChar() == prefix[it].lowercaseChar() && this[at + it].code < 128 }

// rtrim(cap[0], '\n') of the blockquote.
private fun Src.jsTrimEndNewlines(): Src {
    var end = length
    while (end > 0 && this[end - 1] == '\n') end--
    return upTo(end)
}

/** \r\n and \r as \n (marked's lex): the newline stands for the \r. */
internal fun withoutCarriageReturns(src: Src): Src {
    if ('\r' !in src) return src
    val parts = mutableListOf<Src>()
    var start = 0
    var i = 0
    while (i < src.length) {
        if (src[i] == '\r') {
            parts += src.subSequence(start, i)
            parts += Src.withOrigin("\n", src.origin(i))
            i += if (i + 1 < src.length && src[i + 1] == '\n') 2 else 1
            start = i
        } else {
            i++
        }
    }
    parts += src.from(start)
    return Src.join(parts, "")
}

private val BLOCK_TAGS = setOf(
    "address", "article", "aside", "base", "basefont", "blockquote", "body", "caption", "center", "col", "colgroup",
    "dd", "details", "dialog", "dir", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "frame",
    "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hr", "html", "iframe", "legend", "li", "link",
    "main", "menu", "menuitem", "meta", "nav", "noframes", "ol", "optgroup", "option", "p", "param", "search",
    "section", "summary", "table", "tbody", "td", "tfoot", "th", "thead", "title", "tr", "track", "ul",
)

private val DELIMITER_ROW = java.util.regex.Pattern.compile("(?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?")

private val TABLE_ALIGN_CHARS = Regex("^\\||\\| *$")

private val JS_SPACES_RUN = Regex("[\\t\\n\\u000B\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+")
````

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Inlines.kt`:

````kotlin
package com.pmobile78.todoround.core.markdown

import java.util.regex.Matcher
import java.util.regex.Pattern

/*
 * The inline level of the web's Markdown: inlineTokens of marked 17.0.6 with GFM on (src/Lexer.ts,
 * src/Tokenizer.ts, src/rules.ts). The regular expressions keep marked's own, with \s, \S, \w, "."
 * and $ spelled out as JavaScript reads them, since java.util.regex (ICU on Android) reads those
 * differently; the plain text between them is found by hand.
 */

/** An inline token of marked. */
internal sealed interface Inl

internal class TextInl(raw: String, text: String = raw) : Inl {
    private val rawPart = StringBuilder(raw)
    private val textPart = StringBuilder(text)
    val raw: String get() = rawPart.toString()
    val text: String get() = textPart.toString()

    /** The text token goes on with the next one (marked joins neighbouring text tokens). */
    fun append(raw: String, text: String) {
        rawPart.append(raw)
        textPart.append(text)
    }
}

internal class EscapeInl(val raw: String, val text: String) : Inl

internal class HtmlInl(val raw: String) : Inl

internal class LinkInl(val raw: String, val href: String, val title: String?, val tokens: List<Inl>, val image: Boolean) : Inl

internal class StrongInl(val raw: String, val tokens: List<Inl>) : Inl

internal class EmInl(val raw: String, val tokens: List<Inl>) : Inl

internal class DelInl(val raw: String, val tokens: List<Inl>) : Inl

internal class CodespanInl(val raw: String, val text: String) : Inl

internal class BrInl(val raw: String) : Inl

/** marked's checkbox inside the first paragraph of a task item of a loose list; TipTap shows nothing for it. */
internal data object CheckboxInl : Inl

private fun Inl.rawText(): String = when (this) {
    is TextInl -> raw
    is EscapeInl -> raw
    is HtmlInl -> raw
    is LinkInl -> raw
    is StrongInl -> raw
    is EmInl -> raw
    is DelInl -> raw
    is CodespanInl -> raw
    is BrInl -> raw
    CheckboxInl -> ""
}

// JavaScript's \s and its complement, as classes of java.util.regex.
private const val S = "\\t\\n\\u000B\\f\\r \\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF"
private const val SPACE = "[${S}]"
private const val ANY = "[\\x{0}-\\x{10FFFF}]"
private const val DOT = "[^\\n\\r\\u2028\\u2029]"
private const val PUNCT = "[\\p{P}\\p{S}]"
private const val PUNCT_SPACE = "[${S}\\p{P}\\p{S}]"
private const val NOT_PUNCT_SPACE = "[^${S}\\p{P}\\p{S}]"
private const val GFM_PUNCT = "(?!~)[\\p{P}\\p{S}]"
private const val GFM_PUNCT_SPACE = "(?!~)[${S}\\p{P}\\p{S}]"
private const val GFM_NOT_PUNCT_SPACE = "(?:[^${S}\\p{P}\\p{S}]|~)"

private fun regex(source: String): Pattern = Pattern.compile(source)

private val ESCAPE = regex("^\\\\([!\"#$%&'()*+,\\-./:;<=>?@\\[\\]\\\\^_`{|}~])")

private const val TAG_ATTRIBUTE = "${SPACE}+[a-zA-Z:_][A-Za-z0-9_.:-]*(?:${SPACE}*=${SPACE}*\"[^\"]*\"|${SPACE}*=${SPACE}*'[^']*'|${SPACE}*=${SPACE}*[^${S}\"'=<>`]+)?"
private val TAG = regex(
    "^<!--(?:-?>|$ANY*?-->)" +
        "|^</[a-zA-Z][A-Za-z0-9_:-]*${SPACE}*>" +
        "|^<[a-zA-Z][A-Za-z0-9_-]*(?:$TAG_ATTRIBUTE)*?${SPACE}*/?>" +
        "|^<\\?$ANY*?\\?>" +
        "|^<![a-zA-Z]+${SPACE}$ANY*?>" +
        "|^<!\\[CDATA\\[$ANY*?\\]\\]>",
)

private const val INLINE_LABEL = "(?:\\[(?:\\\\$ANY|[^\\[\\]\\\\])*\\]|\\\\$ANY|`+(?!`)[^`]*?`+(?!`)|``+(?=\\])|[^\\[\\]\\\\`])*?"
private const val BLOCK_LABEL = "(?!${SPACE}*\\])(?:\\\\$ANY|[^\\[\\]\\\\])+"
private val LINK = regex(
    "^!?\\[($INLINE_LABEL)\\]\\(${SPACE}*(<(?:\\\\$DOT|[^\\n<>\\\\])+>|[^ \\t\\n\\x00-\\x1f]*)" +
        "(?:(?:[ \\t]+(?:\\n[ \\t]*)?|\\n[ \\t]*)(\"(?:\\\\\"?|[^\"\\\\])*\"|'(?:\\\\'?|[^'\\\\])*'|\\((?:\\\\\\)?|[^)\\\\])*\\)))?${SPACE}*\\)",
)
private val REFLINK = regex("^!?\\[($INLINE_LABEL)\\]\\[($BLOCK_LABEL)\\]")
private val NOLINK = regex("^!?\\[($BLOCK_LABEL)\\](?:\\[\\])?")
private val REFLINK_SEARCH = regex("!?\\[($INLINE_LABEL)\\]\\[($BLOCK_LABEL)\\]|!?\\[($BLOCK_LABEL)\\](?:\\[\\])?(?!\\()")

private val ANY_PUNCTUATION = regex("\\\\($PUNCT)")
private val BLOCK_SKIP = regex(
    "\\[(?:[^\\[\\]`]|(?<a>`+)[^`]+\\k<a>(?!`))*?\\]\\((?:\\\\$ANY|[^\\\\()]|\\((?:\\\\$ANY|[^\\\\()])*\\))*\\)" +
        "|(?<!`)()(?<b>`+)[^`]+\\k<b>(?!`)" +
        "|<(?! )[^<>]*?>",
)

private val EM_STRONG_L = regex("^(?:\\*+(?:((?!\\*)$GFM_PUNCT)|([^${S}*]))?)|^_+(?:((?!_)$GFM_PUNCT)|([^${S}_]))?")
private val EM_STRONG_R_AST = regex(
    "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)" +
        "|[^*]+(?=[^*])" +
        "|(?!\\*)$GFM_PUNCT(\\*+)(?=${SPACE}|\\z)" +
        "|$GFM_NOT_PUNCT_SPACE(\\*+)(?!\\*)(?=$GFM_PUNCT_SPACE|\\z)" +
        "|(?!\\*)$GFM_PUNCT_SPACE(\\*+)(?=$GFM_NOT_PUNCT_SPACE)" +
        "|${SPACE}(\\*+)(?!\\*)(?=$GFM_PUNCT)" +
        "|(?!\\*)$GFM_PUNCT(\\*+)(?!\\*)(?=$GFM_PUNCT)" +
        "|$GFM_NOT_PUNCT_SPACE(\\*+)(?=$GFM_NOT_PUNCT_SPACE)",
)
private val EM_STRONG_R_UND = regex(
    "^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)" +
        "|[^_]+(?=[^_])" +
        "|(?!_)$PUNCT(_+)(?=${SPACE}|\\z)" +
        "|$NOT_PUNCT_SPACE(_+)(?!_)(?=$PUNCT_SPACE|\\z)" +
        "|(?!_)$PUNCT_SPACE(_+)(?=$NOT_PUNCT_SPACE)" +
        "|${SPACE}(_+)(?!_)(?=$PUNCT)" +
        "|(?!_)$PUNCT(_+)(?!_)(?=$PUNCT)",
)
private val DEL_L = regex("^~~?(?:((?!~)$PUNCT)|[^${S}~])")
private val DEL_R = regex(
    "^[^~]+(?=[^~])" +
        "|(?!~)$PUNCT(~~?)(?=${SPACE}|\\z)" +
        "|$NOT_PUNCT_SPACE(~~?)(?!~)(?=$PUNCT_SPACE|\\z)" +
        "|(?!~)$PUNCT_SPACE(~~?)(?=$NOT_PUNCT_SPACE)" +
        "|${SPACE}(~~?)(?!~)(?=$PUNCT)" +
        "|(?!~)$PUNCT(~~?)(?!~)(?=$PUNCT)" +
        "|$NOT_PUNCT_SPACE(~~?)(?=$NOT_PUNCT_SPACE)",
)
private val PUNCTUATION = regex("^((?![*_])$PUNCT_SPACE)")
private val UNICODE_ALPHANUMERIC = regex("[\\p{L}\\p{N}]")

private val CODE = regex("^(`+)([^`]|[^`]$ANY*?[^`])\\1(?!`)")
private val BR = regex("^( {2,}|\\\\)\\n(?!${SPACE}*\\z)")
private const val EMAIL_AUTOLINK =
    "[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])"
private val AUTOLINK = regex("^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^${S}\\x00-\\x1f<>]*|$EMAIL_AUTOLINK)>")
private val URL = regex(
    "^((?:[hH][tT][tT][pP][sS]?|[fF][tT][pP]):\\/\\/|www\\.)(?:[a-zA-Z0-9\\-]+\\.?)+[^${S}<]*" +
        "|^[A-Za-z0-9._+-]+(@)[a-zA-Z0-9_\\-]+(?:\\.[a-zA-Z0-9_\\-]*[a-zA-Z0-9])+(?![-_])",
)

// startATag, endATag, startPreScriptTag and endPreScriptTag of marked, which take any case of ASCII letters.
private val START_A_TAG = regex("^<[aA] ")
private val END_A_TAG = regex("^</[aA]>")
private const val PRE_SCRIPT = "(?:[pP][rR][eE]|[cC][oO][dD][eE]|[kK][bB][dD]|[sS][cC][rR][iI][pP][tT])"
private val START_PRE_SCRIPT = regex("^<$PRE_SCRIPT(?:${SPACE}|>)")
private val END_PRE_SCRIPT = regex("^</$PRE_SCRIPT(?:${SPACE}|>)")

/** marked's anyPunctuation replace: a backslash before punctuation goes. */
internal fun unescapePunctuation(text: String): String = ANY_PUNCTUATION.matcher(text).replaceAll("$1")

/** The inline lexer of one call of inlineTokens; the link state lives in [lexer], as marked keeps it. */
internal class InlineLexer(private val lexer: Lexer) {
    // The text and its masked copy; the tokenizers read them from an index, where marked cuts a new string.
    private var source = ""
    private var masked = ""

    fun tokens(text: String): List<Inl> {
        source = text
        masked = mask(text)
        val tokens = mutableListOf<Inl>()
        var pos = 0
        var keepPrevChar = false
        var prevChar = ""
        while (pos < source.length) {
            if (!keepPrevChar) prevChar = ""
            keepPrevChar = false
            val token = escape(pos) ?: tag(pos) ?: link(pos)
            if (token != null) {
                pos += token.rawText().length
                tokens += token
                continue
            }
            val ref = reflink(pos)
            if (ref != null) {
                pos += ref.rawText().length
                val last = tokens.lastOrNull()
                if (ref is TextInl && last is TextInl) last.append(ref.raw, ref.text) else tokens += ref
                continue
            }
            val other = emStrong(pos, prevChar) ?: codespan(pos) ?: br(pos) ?: del(pos, prevChar) ?: autolink(pos)
                ?: if (!lexer.inLink) url(pos) else null
            if (other != null) {
                pos += other.rawText().length
                tokens += other
                continue
            }
            val end = inlineTextEnd(pos)
            val raw = source.substring(pos, end)
            pos = end
            if (!raw.endsWith("_")) prevChar = raw.substring(raw.length - 1)
            keepPrevChar = true
            val last = tokens.lastOrNull()
            if (last is TextInl) last.append(raw, raw) else tokens += TextInl(raw)
        }
        return tokens
    }

    private fun matcher(pattern: Pattern, at: Int): Matcher = pattern.matcher(source).region(at, source.length)

    // The source with links of known references, escapes, links, code and tags masked, so that their
    // marks are no delimiters of emphasis. A mask keeps the length, as marked's does, except for an escaped
    // character of two halves; the matching then goes on where it was, as in marked.
    private fun mask(text: String): String {
        val masked = StringBuilder(text)
        if (lexer.links.isNotEmpty()) {
            val m = REFLINK_SEARCH.matcher(masked)
            while (m.find()) {
                val found = m.group()
                if (found.substring(found.lastIndexOf('[') + 1, found.length - 1) in lexer.links) {
                    overwrite(masked, m.start(), m.end())
                }
            }
        }
        val escapes = ANY_PUNCTUATION.matcher(masked)
        while (escapes.find()) {
            val start = escapes.start()
            val end = escapes.end()
            masked.replace(start, end, "++")
            if (end - start != 2) {
                escapes.reset(masked)
                escapes.region(minOf(end, masked.length), masked.length)
            }
        }
        val skips = BLOCK_SKIP.matcher(masked)
        while (skips.find()) overwrite(masked, skips.start(), skips.end())
        return masked.toString()
    }

    // "[" + "a" * (length - 2) + "]" over [start, end).
    private fun overwrite(text: StringBuilder, start: Int, end: Int) {
        text.setCharAt(start, '[')
        for (i in start + 1 until end - 1) text.setCharAt(i, 'a')
        text.setCharAt(end - 1, ']')
    }

    private fun escape(pos: Int): Inl? {
        if (source[pos] != '\\') return null
        val m = matcher(ESCAPE, pos)
        return if (m.lookingAt()) EscapeInl(m.group(), m.group(1)) else null
    }

    private fun tag(pos: Int): Inl? {
        if (source[pos] != '<') return null
        val m = matcher(TAG, pos)
        if (!m.lookingAt()) return null
        val raw = m.group()
        if (!lexer.inLink && START_A_TAG.matcher(raw).lookingAt()) {
            lexer.inLink = true
        } else if (lexer.inLink && END_A_TAG.matcher(raw).lookingAt()) {
            lexer.inLink = false
        }
        if (!lexer.inRawBlock && START_PRE_SCRIPT.matcher(raw).lookingAt()) {
            lexer.inRawBlock = true
        } else if (lexer.inRawBlock && END_PRE_SCRIPT.matcher(raw).lookingAt()) {
            lexer.inRawBlock = false
        }
        return HtmlInl(raw)
    }

    private fun link(pos: Int): Inl? {
        if (!(source.startsWith("[", pos) || source.startsWith("![", pos))) return null
        if (source.indexOf("](", pos) < 0) return null
        val m = matcher(LINK, pos)
        if (!m.lookingAt()) return null
        var cap0 = m.group()
        val label = m.group(1)
        var href = m.group(2)
        var title: String? = m.group(3)
        val trimmedUrl = href.jsTrim()
        if (trimmedUrl.startsWith("<")) {
            if (!trimmedUrl.endsWith(">")) return null
            val rtrimSlash = trimmedUrl.substring(0, trimmedUrl.length - 1).trimEnd('\\')
            if ((trimmedUrl.length - rtrimSlash.length) % 2 == 0) return null
        } else {
            val lastParenIndex = findClosingBracket(href, '(', ')')
            if (lastParenIndex == -2) return null
            if (lastParenIndex > -1) {
                val start = if (cap0.startsWith("!")) 5 else 4
                val linkLen = start + label.length + lastParenIndex
                href = href.substring(0, lastParenIndex)
                cap0 = cap0.substring(0, linkLen).jsTrim()
                title = ""
            }
        }
        var titleText = if (title.isNullOrEmpty()) "" else title.substring(1, title.length - 1)
        href = href.jsTrim()
        if (href.startsWith("<")) href = href.substring(1, href.length - 1)
        href = if (href.isEmpty()) href else unescapePunctuation(href)
        titleText = if (titleText.isEmpty()) titleText else unescapePunctuation(titleText)
        return outputLink(cap0, label, href, titleText.ifEmpty { null })
    }

    private fun reflink(pos: Int): Inl? {
        if (!(source.startsWith("[", pos) || source.startsWith("![", pos))) return null
        var m = matcher(REFLINK, pos)
        val label: String
        if (m.lookingAt()) {
            label = m.group(2) ?: m.group(1)
        } else {
            m = matcher(NOLINK, pos)
            if (!m.lookingAt()) return null
            label = m.group(1)
        }
        val raw = m.group()
        val def = lexer.links[label.replace(JS_SPACE_RUN, " ").lowercase()]
        if (def == null) return TextInl(raw.substring(0, 1))
        return outputLink(raw, m.group(1), def.href, def.title)
    }

    private fun outputLink(raw: String, label: String, href: String, title: String?): Inl {
        val text = label.replace(OUTPUT_LINK_REPLACE, "$1")
        lexer.inLink = true
        val tokens = InlineLexer(lexer).tokens(text)
        lexer.inLink = false
        return LinkInl(raw, href, title, tokens, image = raw.startsWith("!"))
    }

    private fun emStrong(pos: Int, prevChar: String): Inl? {
        if (source[pos] != '*' && source[pos] != '_') return null
        val l = matcher(EM_STRONG_L, pos)
        if (!l.lookingAt()) return null
        if (l.group(1) == null && l.group(2) == null && l.group(3) == null && l.group(4) == null) return null
        if (l.group(4) != null && UNICODE_ALPHANUMERIC.matcher(prevChar).find()) return null
        val nextChar = l.group(1) ?: l.group(3) ?: ""
        if (!(nextChar.isEmpty() || prevChar.isEmpty() || PUNCTUATION.matcher(prevChar).find())) return null
        val lLength = l.group().codePointCount(0, l.group().length) - 1
        var delimTotal = lLength
        var midDelimTotal = 0
        val endReg = if (source[pos] == '*') EM_STRONG_R_AST else EM_STRONG_R_UND
        // maskedSrc.slice(-1 * src.length + lLength): the masked text after the left delimiter.
        val from = maxOf(0, masked.length - (source.length - pos) + lLength)
        val r = endReg.matcher(masked).region(from, masked.length)
        while (r.find()) {
            val rDelim = (1..6).firstNotNullOfOrNull { group(r, it) } ?: continue
            var rLength = rDelim.codePointCount(0, rDelim.length)
            if (group(r, 3) != null || group(r, 4) != null) {
                delimTotal += rLength
                continue
            } else if (group(r, 5) != null || group(r, 6) != null) {
                if (lLength % 3 != 0 && (lLength + rLength) % 3 == 0) {
                    midDelimTotal += rLength
                    continue
                }
            }
            delimTotal -= rLength
            if (delimTotal > 0) continue
            rLength = minOf(rLength, rLength + delimTotal + midDelimTotal)
            val lastCharLength = Character.charCount(r.group().codePointAt(0))
            val raw = source.substring(pos, minOf(source.length, pos + lLength + (r.start() - from) + lastCharLength + rLength))
            if (minOf(lLength, rLength) % 2 == 1) {
                return EmInl(raw, InlineLexer(lexer).tokens(raw.substring(1, raw.length - 1)))
            }
            return StrongInl(raw, InlineLexer(lexer).tokens(raw.substring(2, raw.length - 2)))
        }
        return null
    }

    // The group [n] of a match of the delimiter patterns, which the underscore one has only five of.
    private fun group(m: Matcher, n: Int): String? = if (n <= m.groupCount()) m.group(n) else null

    private fun codespan(pos: Int): Inl? {
        if (source[pos] != '`') return null
        val m = matcher(CODE, pos)
        if (!m.lookingAt()) return null
        var text = m.group(2).replace('\n', ' ')
        val hasNonSpace = text.any { it != ' ' }
        if (hasNonSpace && text.startsWith(" ") && text.endsWith(" ")) text = text.substring(1, text.length - 1)
        return CodespanInl(m.group(), text)
    }

    private fun br(pos: Int): Inl? {
        if (source[pos] != ' ' && source[pos] != '\\') return null
        val m = matcher(BR, pos)
        return if (m.lookingAt()) BrInl(m.group()) else null
    }

    private fun del(pos: Int, prevChar: String): Inl? {
        if (source[pos] != '~') return null
        val l = matcher(DEL_L, pos)
        if (!l.lookingAt()) return null
        val nextChar = l.group(1) ?: ""
        if (!(nextChar.isEmpty() || prevChar.isEmpty() || PUNCTUATION.matcher(prevChar).find())) return null
        val lLength = l.group().codePointCount(0, l.group().length) - 1
        var delimTotal = lLength
        val from = maxOf(0, masked.length - (source.length - pos) + lLength)
        val r = DEL_R.matcher(masked).region(from, masked.length)
        while (r.find()) {
            val rDelim = (1..6).firstNotNullOfOrNull { r.group(it) } ?: continue
            var rLength = rDelim.codePointCount(0, rDelim.length)
            if (rLength != lLength) continue
            if (r.group(3) != null || r.group(4) != null) {
                delimTotal += rLength
                continue
            }
            delimTotal -= rLength
            if (delimTotal > 0) continue
            rLength = minOf(rLength, rLength + delimTotal)
            val lastCharLength = Character.charCount(r.group().codePointAt(0))
            val raw = source.substring(pos, minOf(source.length, pos + lLength + (r.start() - from) + lastCharLength + rLength))
            return DelInl(raw, InlineLexer(lexer).tokens(raw.substring(lLength, raw.length - lLength)))
        }
        return null
    }

    private fun autolink(pos: Int): Inl? {
        if (source[pos] != '<') return null
        val m = matcher(AUTOLINK, pos)
        if (!m.lookingAt()) return null
        val text = m.group(1)
        val href = if (m.group(2) == "@") "mailto:$text" else text
        return LinkInl(m.group(), href, null, listOf(TextInl(text)), image = false)
    }

    private fun url(pos: Int): Inl? {
        val m = matcher(URL, pos)
        if (!m.lookingAt()) return null
        val text: String
        val href: String
        if (m.group(2) == "@") {
            text = m.group()
            href = "mailto:$text"
        } else {
            var cap0 = m.group()
            while (true) {
                val shorter = backpedal(cap0)
                if (shorter == cap0) break
                cap0 = shorter
            }
            text = cap0
            href = if (m.group(1) == "www.") "http://$cap0" else cap0
        }
        return LinkInl(text, href, null, listOf(TextInl(text)), image = false)
    }

    // _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, its match from the start:
    // the address without the punctuation that ends a sentence after it.
    private fun backpedal(text: String): String {
        var p = 0
        while (p < text.length) {
            val c = text[p]
            when {
                c !in URL_SPECIAL -> while (p < text.length && text[p] !in URL_SPECIAL) p++
                c == '(' -> {
                    val close = text.indexOf(')', p + 1)
                    if (close < 0) break
                    p = close + 1
                }
                c == '&' -> {
                    if (ENTITY_AT_END.matcher(text.substring(p + 1)).matches()) break
                    p++
                }
                else -> {
                    var q = p
                    while (q < text.length && text[q] in URL_TRAILING) q++
                    if (q == text.length) {
                        if (q - p == 1) break
                        q--
                    }
                    p = q
                }
            }
        }
        return text.substring(0, p)
    }

    // inlineText of GFM: from the first character (or run of ` and ~) up to where another token may start.
    private fun inlineTextEnd(pos: Int): Int {
        val src = source
        var i = pos + 1
        if (src[pos] == '`' || src[pos] == '~') {
            while (i < src.length && (src[i] == '`' || src[i] == '~')) i++
        }
        if (spacesThenNewline(src, i) || emailAhead(src, i)) return i
        var j = i
        while (true) {
            if (j >= src.length) return j
            val c = src[j]
            if (c in "\\<![`*~_" || startsProtocol(src, j) || src.startsWith("www.", j)) return j
            if (c != ' ' && spacesThenNewline(src, j + 1)) return j + 1
            if (!isEmailChar(c) && emailAhead(src, j + 1)) return j + 1
            j++
        }
    }

    private fun spacesThenNewline(src: String, at: Int): Boolean {
        var q = at
        while (q < src.length && src[q] == ' ') q++
        return q - at >= 2 && q < src.length && src[q] == '\n'
    }

    private fun emailAhead(src: String, at: Int): Boolean {
        var q = at
        while (q < src.length && isEmailChar(src[q])) q++
        return q > at && q < src.length && src[q] == '@'
    }

    private fun isEmailChar(c: Char): Boolean =
        c in 'a'..'z' || c in 'A'..'Z' || c in '0'..'9' || c in ".!#$%&'*+/=?_`{|}~-"

    private fun isWord(c: Char): Boolean = c in 'a'..'z' || c in 'A'..'Z' || c in '0'..'9' || c == '_'

    // protocol:\/\/ with protocol = [hH][tT][tT][pP][sS]?|[fF][tT][pP]
    private fun startsProtocol(src: String, at: Int): Boolean =
        startsAscii(src, "http://", at) || startsAscii(src, "https://", at) || startsAscii(src, "ftp://", at)

    // [prefix] at [at] in any case of its ASCII letters.
    private fun startsAscii(src: String, prefix: String, at: Int): Boolean =
        at + prefix.length <= src.length && prefix.indices.all { src[at + it] == prefix[it] || src[at + it] == prefix[it].uppercaseChar() }

    private fun findClosingBracket(text: String, open: Char, close: Char): Int {
        if (close !in text) return -1
        var level = 0
        var i = 0
        while (i < text.length) {
            when (text[i]) {
                '\\' -> i++
                open -> level++
                close -> {
                    level--
                    if (level < 0) return i
                }
            }
            i++
        }
        return if (level > 0) -2 else -1
    }
}

private val OUTPUT_LINK_REPLACE = Regex("\\\\([\\[\\]])")
private val JS_SPACE_RUN = Regex("${SPACE}+")
private val ENTITY_AT_END = Pattern.compile("[a-zA-Z0-9]+;")
private const val URL_SPECIAL = "?!.,:;*_'\"~()&"
private const val URL_TRAILING = "?!.,:;*_'\"~)"
````

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Markdown.kt`:

````kotlin
package com.pmobile78.todoround.core.markdown

/*
 * A description as the web shows it (stage 2 spec, section 8; data contract, section 5): the
 * document the web's editor builds from the Markdown (@tiptap/markdown 3.32 over marked 17.0.6,
 * src/utils/markdownEditor.js). Three things differ on purpose: raw HTML shows as the text it is
 * (2.2 №1) where the web reads it as formatting; a table of GFM shows as its text, which the web
 * leaves out; and a description that gives no block at all shows as one paragraph of its text,
 * which the web reads as HTML. Each checkbox knows where its mark is in the description, so a tap
 * changes that one character and nothing else (2.2 №2).
 */

/** A block of a description. */
sealed interface Block {
    data class Paragraph(val content: List<Inline>) : Block

    data class Heading(val level: Int, val content: List<Inline>) : Block

    data class Quote(val blocks: List<Block>) : Block

    /** A list of bullets; each item is its blocks. */
    data class BulletList(val items: List<List<Block>>) : Block

    /** A numbered list from [start]; [type] "a", "A", "i" or "I" numbers it with letters or roman numerals. */
    data class OrderedList(val start: Int, val type: String?, val items: List<List<Block>>) : Block

    data class TaskList(val items: List<TaskItem>) : Block

    data class CodeBlock(val language: String?, val text: String) : Block

    data object Rule : Block
}

/**
 * An item of a checklist. [mark] is the offset in the description of the character between its
 * brackets, the one a tap changes, or -1 when the item cannot be changed there.
 */
data class TaskItem(val checked: Boolean, val mark: Int, val blocks: List<Block>)

/** Text inside a block. */
sealed interface Inline {
    /** Text with its marks; [link] is the address of a link. */
    data class Text(
        val text: String,
        val bold: Boolean = false,
        val italic: Boolean = false,
        val strike: Boolean = false,
        val code: Boolean = false,
        val link: String? = null,
    ) : Inline

    data object Break : Inline
}

/** The blocks of [description] as the web shows them. */
fun parseMarkdown(description: String): List<Block> {
    val lexer = Lexer()
    val tokens = lexer.lex(Src.of(description))
    val nodes = Mapper(lexer, description).parseTokens(tokens, implicitEmpty = true)
    val blocks = asBlocks(nodes)
    if (blocks.isEmpty()) {
        // The web reads such a description as HTML: its white space runs in one, and nothing is an empty paragraph.
        val text = description.trim { it in " \t\n\u000C\r" }.replace(HTML_SPACE_RUN, " ")
        return listOf(Block.Paragraph(if (text.isEmpty()) emptyList() else listOf(Inline.Text(text))))
    }
    return blocks
}

/**
 * [description] with [item] ticked or unticked: its mark becomes "x" or " ", and nothing else
 * changes. Null when the mark is no longer there, after a change from another device, say.
 */
fun toggleTask(description: String, item: TaskItem): String? {
    val at = item.mark
    if (!isMark(description, at)) return null
    val ticked = description[at] != ' '
    if (ticked != item.checked) return null
    return description.substring(0, at) + (if (ticked) ' ' else 'x') + description.substring(at + 1)
}

/** Whether a link opens: only http, https and mailto, as on the web (2.2 №1). */
fun isSafeLink(href: String): Boolean = SAFE_LINK.containsMatchIn(href)

// SAFE_LINK of src/utils/markdownEditor.js: /^(https?:|mailto:)/i
private val SAFE_LINK = Regex("^(?:[hH][tT][tT][pP][sS]?:|[mM][aA][iI][lL][tT][oO]:)")

private val HTML_SPACE_RUN = Regex("[ \\t\\n\\u000C\\r]+")

// The character at [at] is the mark of a checkbox: "[", one of " xX", "]".
private fun isMark(description: String, at: Int): Boolean =
    at >= 1 && at + 1 < description.length && description[at - 1] == '[' && description[at] in " xX" && description[at + 1] == ']'

// A node of the web's document: a block, or text the web puts where a block goes.
private sealed interface Node

private class BlockNode(val block: Block) : Node

private class InlineNode(val inline: Inline) : Node

// The web keeps text where a block goes (an image alone, a list item of text); it shows as a paragraph.
private fun asBlocks(nodes: List<Node>): List<Block> {
    val blocks = mutableListOf<Block>()
    val run = mutableListOf<Inline>()
    for (node in nodes) {
        when (node) {
            is InlineNode -> run += node.inline
            is BlockNode -> {
                if (run.isNotEmpty()) {
                    blocks += Block.Paragraph(merged(run.toList()))
                    run.clear()
                }
                blocks += node.block
            }
        }
    }
    if (run.isNotEmpty()) blocks += Block.Paragraph(merged(run))
    return blocks
}

// Neighbouring texts with the same marks as one text, as the web's parseInlineTokens joins them.
private fun merged(inlines: List<Inline>): List<Inline> {
    val result = mutableListOf<Inline>()
    for (inline in inlines) {
        val last = result.lastOrNull()
        if (inline is Inline.Text && last is Inline.Text && inline.copy(text = "") == last.copy(text = "")) {
            result[result.lastIndex] = last.copy(text = last.text + inline.text)
        } else {
            result += inline
        }
    }
    return result
}

/** The tokens to the web's document, as the MarkdownManager of @tiptap/markdown and its extensions build it. */
private class Mapper(private val lexer: Lexer, private val description: String) {
    // parseTokens: with [implicitEmpty], runs of blank lines become empty paragraphs (parseBlockChildren).
    fun parseTokens(tokens: List<Tok>, implicitEmpty: Boolean): List<Node> {
        val normalized = if (implicitEmpty) extractAbsorbedBlankLines(tokens) else tokens
        val nonSpace = normalized.indices.filter { normalized[it] !is SpaceTok }
        val nodes = mutableListOf<Node>()
        for ((index, token) in normalized.withIndex()) {
            if (implicitEmpty && token is SpaceTok) {
                val previous = nonSpace.lastOrNull { it < index } ?: -1
                val next = nonSpace.firstOrNull { it > index } ?: -1
                val separators = countParagraphSeparators(token.raw.toString())
                val count = maxOf(separators - (if (previous == -1 || next == -1) 0 else 1), 0)
                repeat(count) { nodes += BlockNode(Block.Paragraph(emptyList())) }
                continue
            }
            nodes += parseToken(token, implicitEmpty)
        }
        return nodes
    }

    // extractAbsorbedBlankLines: blank lines at the end of a token's raw become a space token after it.
    private fun extractAbsorbedBlankLines(tokens: List<Tok>): List<Tok> = tokens.flatMapIndexed { index, token ->
        if (token is SpaceTok || tokens.getOrNull(index + 1) is SpaceTok) return@flatMapIndexed listOf(token)
        val raw = token.raw
        val trailing = trailingBlankLines(raw)
        if (trailing == 0) listOf(token) else listOf(token.withRaw(raw.upTo(raw.length - trailing)), SpaceTok(raw.from(raw.length - trailing)))
    }

    // TRAILING_BLANK_LINES: /\n[^\S\n]*(?:\n[^\S\n]*)+$/ — the length of the match, or 0.
    private fun trailingBlankLines(raw: CharSequence): Int {
        var i = raw.length
        var newlines = 0
        var first = -1
        while (i > 0 && isJsSpace(raw[i - 1])) {
            i--
            if (raw[i] == '\n') {
                newlines++
                first = i
            }
        }
        return if (newlines >= 2) raw.length - first else 0
    }

    // countParagraphSeparators: the "\n\n" in the raw, one after another.
    private fun countParagraphSeparators(raw: String): Int {
        var count = 0
        var i = 0
        val text = raw.replace("\r\n", "\n")
        while (true) {
            val at = text.indexOf("\n\n", i)
            if (at < 0) return count
            count++
            i = at + 2
        }
    }

    private fun parseToken(token: Tok, implicitEmpty: Boolean): List<Node> = when (token) {
        is ListTok -> parseList(token)
        is ParagraphTok -> paragraph(token.inline)
        is HeadingTok -> listOf(BlockNode(Block.Heading(token.depth, parseInline(token.inline))))
        is QuoteTok -> listOf(BlockNode(Block.Quote(asBlocks(parseTokens(token.tokens, implicitEmpty = true)))))
        is CodeTok -> code(token)
        is HrTok -> listOf(BlockNode(Block.Rule))
        is HtmlTok -> htmlAsText(token.raw.toString(), block = true)
        // The text extension of TipTap keeps the text as written.
        is TextTok -> listOf(InlineNode(Inline.Text(token.text)))
        is TaskListTok -> listOf(BlockNode(Block.TaskList(token.items.map(::taskItem))))
        is TableTok -> listOf(BlockNode(Block.Paragraph(listOf(Inline.Text(token.raw.toString().jsTrimEndString())))))
        is TaskItemTok, is ItemTok, is SpaceTok, is DefTok, is CheckboxTok -> emptyList()
    }

    // Paragraph.parseMarkdown: an image alone goes through parseChildren, the rest is inline.
    private fun paragraph(tokens: List<Inl>): List<Node> {
        if (tokens.size == 1 && tokens[0] is LinkInl && (tokens[0] as LinkInl).image) return inlineAsBlocks(tokens)
        val content = parseInline(tokens)
        val only = tokens.singleOrNull()
        if (only is TextInl && (only.raw in EMPTY_PARAGRAPH || only.text in EMPTY_PARAGRAPH) &&
            content.singleOrNull().let { it is Inline.Text && it.text in EMPTY_PARAGRAPH }
        ) {
            return listOf(BlockNode(Block.Paragraph(emptyList())))
        }
        return listOf(BlockNode(Block.Paragraph(content)))
    }

    // CodeBlock.parseMarkdown: a fence with spaces before it is no code block of TipTap, and shows nothing.
    private fun code(token: CodeTok): List<Node> {
        val raw = token.raw.toString()
        if (!raw.startsWith("```") && !raw.startsWith("~~~") && !token.indented) return emptyList()
        return listOf(BlockNode(Block.CodeBlock(token.lang?.ifEmpty { null }, token.text)))
    }

    private fun taskItem(token: TaskItemTok): TaskItem {
        val first = when {
            token.inline.isNotEmpty() -> Block.Paragraph(parseInline(token.inline))
            token.text.isNotEmpty() -> Block.Paragraph(listOf(Inline.Text(token.text)))
            else -> Block.Paragraph(emptyList())
        }
        val nested = token.nested?.let { asBlocks(parseTokens(it, implicitEmpty = false)) }.orEmpty()
        val mark = if (isMarkAt(token.mark)) token.mark else -1
        return TaskItem(token.checked, mark, listOf(first) + nested)
    }

    private fun isMarkAt(at: Int): Boolean =
        at >= 1 && at + 1 < description.length && description[at - 1] == '[' && description[at] in " xX" && description[at + 1] == ']'

    // parseListToken: a list of tasks and bullets is cut into a task list and lists, each task taken from its raw.
    private fun parseList(token: ListTok): List<Node> {
        if (token.items.isEmpty()) return listWithHandlers(token)
        val tasks = token.items.map { taskOf(it) }
        if (tasks.all { it == null } || tasks.all { it != null }) return listWithHandlers(token)
        val nodes = mutableListOf<Node>()
        var start = 0
        while (start < token.items.size) {
            val isTask = tasks[start] != null
            var end = start
            while (end < token.items.size && (tasks[end] != null) == isTask) end++
            if (isTask) {
                nodes += BlockNode(Block.TaskList((start until end).map { taskFromRaw(token.items[it], tasks[it]!!) }))
            } else {
                nodes += listWithHandlers(ListTok(token.raw, token.ordered, token.start, token.typeMarker, token.items.subList(start, end)))
            }
            start = end
        }
        return nodes
    }

    // isTaskItem: /^(\s*)[-+*]\s+\[([ xX])\]\s+/ on the raw of the item — its checkbox, or null.
    private fun taskOf(item: ItemTok): Pair<Boolean, Int>? {
        val raw = item.raw
        val bracket = taskStartAt(raw, 0)
        if (bracket < 0) return null
        return (raw[bracket + 1] != ' ') to raw.origin(bracket + 1)
    }

    private fun taskFromRaw(item: ItemTok, task: Pair<Boolean, Int>): TaskItem {
        val lines = item.raw.lines()
        val main = taskLine(lines[0])?.content?.toString() ?: ""
        var nested = emptyList<Node>()
        if (lines.size > 1 && !Src.join(lines.drop(1), "\n").isJsBlank()) {
            val nestedLines = lines.drop(1)
            val minIndent = nestedLines.filter { !it.isJsBlank() }.minOf { it.jsIndent() }
            val content = Src.join(nestedLines.map { if (it.isJsBlank()) Src.added("") else it.from(minIndent) }, "\n").jsTrim()
            if (content.isNotEmpty()) nested = parseTokens(Lexer().lex(content + Src.added("\n")), implicitEmpty = false)
        }
        val inline = lexer.inlineTokens(main)
        val first = when {
            inline.isNotEmpty() -> Block.Paragraph(parseInline(inline))
            main.isNotEmpty() -> Block.Paragraph(listOf(Inline.Text(main)))
            else -> Block.Paragraph(emptyList())
        }
        val mark = if (isMarkAt(task.second)) task.second else -1
        return TaskItem(task.first, mark, listOf(first) + asBlocks(nested))
    }

    // The handlers of a list token: BulletList, else OrderedList with parseListItems.
    private fun listWithHandlers(token: ListTok): List<Node> {
        if (!token.ordered) return listOf(BlockNode(Block.BulletList(token.items.map(::listItem))))
        val start = if (token.start == 0) 1 else token.start
        return listOf(BlockNode(Block.OrderedList(start, token.typeMarker, token.items.map(::orderedItem))))
    }

    // ListItem.parseMarkdown
    private fun listItem(item: ItemTok): List<Block> {
        val tokens = item.tokens
        var content = emptyList<Node>()
        if (tokens.isNotEmpty()) {
            val first = tokens[0]
            if (sameLineOrderedList(item)) {
                val text = item.text.toString()
                return listOf(Block.Paragraph(parseInline(lexer.inlineTokens(text))))
            }
            content = if (tokens.any { it is ParagraphTok }) {
                parseTokens(tokens, implicitEmpty = true)
            } else if (first is TextTok && first.inline.isNotEmpty()) {
                listOf<Node>(BlockNode(Block.Paragraph(parseInline(first.inline)))) +
                    if (tokens.size > 1) parseTokens(tokens.drop(1), implicitEmpty = true) else emptyList()
            } else {
                parseTokens(tokens, implicitEmpty = true)
            }
        }
        if (content.isEmpty()) return listOf(Block.Paragraph(emptyList()))
        return asBlocks(content)
    }

    // isSameLineOrderedListToken: "- 1. text" keeps "1. text" as the text of the item.
    private fun sameLineOrderedList(item: ItemTok): Boolean {
        val text = item.text?.toString() ?: return false
        val only = item.tokens.singleOrNull()
        return text.isNotEmpty() && only is ListTok && only.ordered && only.raw.toString() == text
    }

    // parseListItems of the ordered list.
    private fun orderedItem(item: ItemTok): List<Block> {
        val content = mutableListOf<Node>()
        for (token in item.tokens) {
            when (token) {
                is ParagraphTok, is ListTok, is QuoteTok, is CodeTok -> content += parseTokens(listOf(token), implicitEmpty = false)
                is TextTok -> content += BlockNode(Block.Paragraph(listOf(Inline.Text(token.text))))
                else -> content += parseTokens(listOf(token), implicitEmpty = false)
            }
        }
        return asBlocks(content)
    }

    // parseInlineTokens of the MarkdownManager.
    fun parseInline(tokens: List<Inl>): List<Inline> {
        val result = mutableListOf<Inline>()
        for (token in tokens) {
            when (token) {
                is TextInl -> result += Inline.Text(decodeHtmlEntities(token.text))
                is EscapeInl -> result += Inline.Text(token.text)
                is HtmlInl -> result += Inline.Text(token.raw)
                is StrongInl -> result += parseInline(token.tokens).map { it.marked { copy(bold = true) } }
                is EmInl -> result += parseInline(token.tokens).map { it.marked { copy(italic = true) } }
                is DelInl -> result += parseInline(token.tokens).map { it.marked { copy(strike = true) } }
                is CodespanInl -> result += Inline.Text(token.text, code = true)
                is LinkInl -> result += if (token.image) {
                    parseInline(token.tokens)
                } else {
                    parseInline(token.tokens).map { it.marked { if (link == null) copy(link = token.href) else this } }
                }
                is BrInl -> result += Inline.Break
                CheckboxInl -> Unit
            }
        }
        return merged(result)
    }

    // The tokens of an image alone in a paragraph go through parseTokens, as if they were blocks.
    private fun inlineAsBlocks(tokens: List<Inl>): List<Node> = tokens.flatMap { token ->
        when (token) {
            is TextInl -> listOf(InlineNode(Inline.Text(token.text)))
            is EscapeInl -> listOf(InlineNode(Inline.Text(token.text)))
            is HtmlInl -> htmlAsText(token.raw, block = false)
            is LinkInl -> if (token.image) inlineAsBlocks(token.tokens) else parseInline(listOf(token)).map(::InlineNode)
            is StrongInl, is EmInl, is DelInl, is CodespanInl -> parseInline(listOf(token)).map(::InlineNode)
            is BrInl -> listOf(InlineNode(Inline.Break))
            CheckboxInl -> emptyList()
        }
    }

    // htmlAsLiteralText: the HTML without the white space at its end, as a paragraph or as text.
    private fun htmlAsText(html: String, block: Boolean): List<Node> {
        val text = html.trimEnd(::isJsSpace)
        if (text.isEmpty()) return emptyList()
        return listOf(if (block) BlockNode(Block.Paragraph(listOf(Inline.Text(text)))) else InlineNode(Inline.Text(text)))
    }

    private fun Inline.marked(change: Inline.Text.() -> Inline.Text): Inline = if (this is Inline.Text) change() else this
}

private val EMPTY_PARAGRAPH = setOf("&nbsp;", "\u00A0")

private fun String.jsTrimEndString(): String = trimEnd(::isJsSpace)

private fun Tok.withRaw(raw: Src): Tok {
    this.raw = raw
    return this
}

private val ENTITY = Regex("&(?:#([0-9]{1,7})|#[xX]([0-9a-fA-F]{1,6})|(lt|gt|quot|amp));")

private val WINDOWS_1252 = mapOf(
    128 to 8364, 130 to 8218, 131 to 402, 132 to 8222, 133 to 8230, 134 to 8224, 135 to 8225, 136 to 710,
    137 to 8240, 138 to 352, 139 to 8249, 140 to 338, 142 to 381, 145 to 8216, 146 to 8217, 147 to 8220,
    148 to 8221, 149 to 8226, 150 to 8211, 151 to 8212, 152 to 732, 153 to 8482, 154 to 353, 155 to 8250,
    156 to 339, 158 to 382, 159 to 376,
)

// decodeHtmlEntities of @tiptap/core: the numeric entities and &lt; &gt; &quot; &amp;.
private fun decodeHtmlEntities(text: String): String {
    if ('&' !in text) return text
    return ENTITY.replace(text) { m ->
        val (dec, hex, name) = m.destructured
        when {
            dec.isNotEmpty() -> codePoint(dec.toInt())
            hex.isNotEmpty() -> codePoint(hex.toInt(16))
            else -> mapOf("lt" to "<", "gt" to ">", "quot" to "\"", "amp" to "&").getValue(name)
        }
    }
}

private fun codePoint(value: Int): String {
    if (value == 0 || value > 0x10FFFF || value in 0xD800..0xDFFF) return "\uFFFD"
    return String(Character.toChars(WINDOWS_1252[value] ?: value))
}
````

- [ ] **Step 4: Тесты проходят**

Run: `android/gradlew -p android --no-daemon :core:test`
Expected: `core tests: 145 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Blocks.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Inlines.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Markdown.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Src.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/MarkdownTest.kt
git commit -F - <<'EOF'
feat(android): the description as the web shows it, and a tap on its checkbox

Stage 2.2, task 2 (spec 2.2 No. 1, 2; section 8). core/markdown ports
what the web's editor shows: the block and inline lexers of marked
17.0.6 with the checklist and ordered-list tokenizers of @tiptap/markdown
3.32, and TipTap's mapping of tokens to its document. Every character
keeps its place in the description, so a checkbox knows the one
character a tap changes; toggleTask changes it and nothing else, or
nothing when the mark has moved. The block rules use no regular
expressions and the inline ones spell out the classes of JavaScript:
Android's ICU regex differs from the JDK's. Raw HTML and tables show as
their text, and only http, https and mailto links open. On 10600 random
descriptions the checkboxes, their places and 6416 taps are the web's (a
check of the draft, not committed).
EOF
```

---

### Task 3: Действия по статусу и отметка пункта: записи с проверкой ядра

**Files:**
- Create (команда, если файла нет): `android/app/google-services.json` (вне git)
- Modify: `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Writes.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskChangesTest.kt`, `android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt`, `android/app/src/test/kotlin/com/pmobile78/todoround/ui/WritesTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt` (все — изменения)

**Interfaces:**
- Consumes: `completionChanges` (задача 1); `TaskItem`, `toggleTask` (задача 2); из 1.1 — `validateTask(record, acceptUnknownZone)`, `deviceTimeZone()`; из 2.1 — `Writes`, `AppViewModel.write { uid -> … }`; помощники тестов `emulatorBackend()`, `signUpNewUser()`, `fromServer()`.
- Produces:
  - `com.pmobile78.todoround.core.model`: `data object ServerTime` — время сервера в изменении; `enum class TaskAction { DONE, FINISH_SERIES, DELETE, RESTORE, DELETE_FOREVER }`; `fun Task.actions(): List<TaskAction>` — кнопки веба по статусу, первая — кнопка строки: у активной `DONE`, `FINISH_SERIES` (только у повторяющейся), `DELETE`; у выполненной `RESTORE`, `DELETE`; у удалённой `RESTORE`, `DELETE_FOREVER`; `fun TaskAction.changes(task: Task, zone: String, now: Instant): Map<String, Any?>?` — поля записи действия, `null` у `DELETE_FOREVER`; `fun descriptionChanges(description: String): Map<String, Any?>`; `fun changeErrors(task: Task, changes: Map<String, Any?>, now: Instant): List<String>` — ошибки `validateTask` задачи, которую оставит запись; `fun Task.toRecord(): Map<String, Any?>`;
  - `com.pmobile78.todoround.data`: `fun taskUpdate(changes: Map<String, Any?>): Map<String, Any?>` — поля, `ServerTime` → `serverTimestamp()`, и `updatedAt` сервера; `TasksRepository.update(uid: String, id: String, changes: Map<String, Any?>)` и `TasksRepository.delete(uid: String, id: String)` — `suspend`, возвращаются, когда сервер принял запись, отказ бросают;
  - `com.pmobile78.todoround.ui`: `Writes.refuse()` — запись, которую не пропустило ядро, приходит в `failures` как отказ сервера; `AppViewModel.act(task: Task, action: TaskAction)`, `AppViewModel.toggle(task: Task, item: TaskItem)`.

- [ ] **Step 1: Настройки Firebase этой машины**

`app` не собирается без `google-services.json`. Файл вне git: в копии, где приложение уже собирали, он есть; иначе его скачивает Firebase CLI (вход в CLI — аккаунт владельца, как у веба):

```bash
test -f android/app/google-services.json || firebase apps:sdkconfig ANDROID 1:699564548059:android:9246f56b0bf422d85fd1fe --project todo-flutter-fb8bf -o android/app/google-services.json
git status --short --ignored android/app
```

Expected: в выводе `git status` есть строка `!! android/app/google-services.json` (в копии, где приложение уже собирали, есть и `!! android/app/build/`).

- [ ] **Step 2: Написать падающие тесты**

Каждое действие пишет то, что пишет для него веб (раздел 5 спецификации): «Готово» — изменения задачи 1; «Завершить серию» — `status: "done"`; «Удалить» — `status: "deleted"` и `deletedAt` сервера; «Восстановить» — `status: "active"` и `deletedAt: null`; отметка пункта — `description`; «Удалить навсегда» — удаление документа. Перед записью ядро проверяет задачу, которую она оставит (решение 16): удалённой задаче нужно время удаления, выполненной оно не положено; незнакомая телефону зона срока, которую запись не меняет, проверку проходит.

Изменения в `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskChangesTest.kt`:

````diff
diff --git a/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskChangesTest.kt b/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskChangesTest.kt
index 410aeac..95bbaad 100644
--- a/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskChangesTest.kt
+++ b/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskChangesTest.kt
@@ -3,6 +3,7 @@ package com.pmobile78.todoround.core.model
 import com.pmobile78.todoround.core.contract.RepeatUnit
 import com.pmobile78.todoround.core.contract.TaskStatus
 import org.junit.jupiter.api.Assertions.assertEquals
+import org.junit.jupiter.api.Assertions.assertNull
 import org.junit.jupiter.api.Test
 import java.time.Instant
 
@@ -28,7 +29,7 @@ class TaskChangesTest {
         pulseMuted = pulseMuted,
         createdAt = Instant.parse("2026-10-01T08:00:00Z"),
         updatedAt = Instant.parse("2026-10-01T08:00:00Z"),
-        deletedAt = null,
+        deletedAt = if (status == TaskStatus.DELETED) Instant.parse("2026-10-02T08:00:00Z") else null,
     )
 
     private val daily = Repeat(every = 1, unit = RepeatUnit.DAYS)
@@ -66,4 +67,50 @@ class TaskChangesTest {
         // 13:00 in Los Angeles is 20:00 UTC: on the 24th it is still ahead.
         assertEquals(mapOf("due" to mapOf("local" to "2026-10-24T13:00", "tz" to "Mars/Olympus_Mons")), completionChanges(far, "America/Los_Angeles", now))
     }
+
+    @Test
+    fun `the actions of a task are the web's buttons for its status, the first one its row's`() {
+        assertEquals(listOf(TaskAction.DONE, TaskAction.DELETE), task().actions())
+        assertEquals(listOf(TaskAction.DONE, TaskAction.FINISH_SERIES, TaskAction.DELETE), task(due = Due("2026-10-20T09:00", "UTC"), repeat = daily).actions())
+        assertEquals(listOf(TaskAction.RESTORE, TaskAction.DELETE), task(status = TaskStatus.DONE).actions())
+        assertEquals(listOf(TaskAction.RESTORE, TaskAction.DELETE_FOREVER), task(status = TaskStatus.DELETED).actions())
+    }
+
+    @Test
+    fun `each action writes the fields the web writes for it`() {
+        val repeating = task(due = Due("2026-10-20T09:00", "UTC"), repeat = daily)
+        assertEquals(mapOf("status" to "done"), TaskAction.FINISH_SERIES.changes(repeating, "UTC", now))
+        assertEquals(mapOf("status" to "deleted", "deletedAt" to ServerTime), TaskAction.DELETE.changes(task(), "UTC", now))
+        assertEquals(mapOf("status" to "active", "deletedAt" to null), TaskAction.RESTORE.changes(task(status = TaskStatus.DELETED), "UTC", now))
+        assertEquals(completionChanges(repeating, "UTC", now), TaskAction.DONE.changes(repeating, "UTC", now))
+        assertNull(TaskAction.DELETE_FOREVER.changes(task(), "UTC", now))
+    }
+
+    @Test
+    fun `the record of a task is the one it was read from`() {
+        val repeating = task(due = Due("2026-10-20T09:00", "Europe/Kyiv"), repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5)), pulseMuted = true)
+        assertEquals(repeating, taskFromRecord(repeating.toRecord()))
+        val deleted = task(status = TaskStatus.DELETED)
+        assertEquals(deleted, taskFromRecord(deleted.toRecord()))
+    }
+
+    @Test
+    fun `a change is written only when the task it leaves passes the check of the core`() {
+        val repeating = task(due = Due("2026-10-20T09:00", "UTC"), repeat = daily)
+        TaskAction.entries.filter { it != TaskAction.DELETE_FOREVER }.forEach { action ->
+            assertEquals(emptyList<String>(), changeErrors(repeating, action.changes(repeating, "UTC", now)!!, now), action.name)
+        }
+        assertEquals(emptyList<String>(), changeErrors(task(), descriptionChanges("- [x] water"), now))
+        assertEquals(listOf("description: invalid"), changeErrors(task(), descriptionChanges("x".repeat(100_001)), now))
+        // Deleted, a task needs its time of deletion; done, it may not keep one.
+        assertEquals(listOf("deletedAt: invalid"), changeErrors(task(), mapOf("status" to "deleted"), now))
+        assertEquals(listOf("deletedAt: invalid"), changeErrors(task(status = TaskStatus.DELETED), mapOf("status" to "active"), now))
+    }
+
+    @Test
+    fun `a due zone this phone does not know passes the check while a change keeps it`() {
+        val far = task(due = Due("2026-10-20T13:00", "Mars/Olympus_Mons"), repeat = daily)
+        assertEquals(emptyList<String>(), changeErrors(far, completionChanges(far, "Asia/Tokyo", now), now))
+        assertEquals(listOf("due.tz: invalid"), changeErrors(far, mapOf("due" to mapOf("local" to "2026-10-25T13:00", "tz" to "Mars/Valles")), now))
+    }
 }
````

`DocumentsTest` проверяет вид записи; второй случай `WritesTest` больше не проходит впустую (мелочь № 4 ревью 2.1): запись начинается на `Dispatchers.Unconfined` и ждёт, когда её отменяют.

Изменения в `android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt`:

````diff
diff --git a/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt b/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
index f604331..0424ec3 100644
--- a/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
+++ b/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
@@ -15,6 +15,7 @@ import com.pmobile78.todoround.core.model.Due
 import com.pmobile78.todoround.core.model.ListFilter
 import com.pmobile78.todoround.core.model.ListSort
 import com.pmobile78.todoround.core.model.Repeat
+import com.pmobile78.todoround.core.model.ServerTime
 import com.pmobile78.todoround.core.model.Task
 import com.pmobile78.todoround.core.model.categoryFromRecord
 import com.pmobile78.todoround.core.model.defaultSettings
@@ -188,4 +189,26 @@ class DocumentsTest {
             listFilterUpdate(ListFilter(null, showUncategorized = true))["settings.listFilter"],
         )
     }
+
+    @Test
+    fun `a change of a task is its fields, the time of the server for ServerTime, and updatedAt`() {
+        assertEquals(
+            mapOf("status" to "deleted", "deletedAt" to FieldValue.serverTimestamp(), "updatedAt" to FieldValue.serverTimestamp()),
+            taskUpdate(mapOf("status" to "deleted", "deletedAt" to ServerTime)),
+        )
+        assertEquals(
+            mapOf("status" to "active", "deletedAt" to null, "updatedAt" to FieldValue.serverTimestamp()),
+            taskUpdate(mapOf("status" to "active", "deletedAt" to null)),
+        )
+        // "Done" of a repeating task: the due as a map of the contract, and the pulse on again.
+        assertEquals(
+            mapOf(
+                "due" to mapOf("local" to "2026-10-25T09:00", "tz" to "Europe/Kyiv"),
+                "pulseMuted" to false,
+                "updatedAt" to FieldValue.serverTimestamp(),
+            ),
+            taskUpdate(mapOf("due" to mapOf("local" to "2026-10-25T09:00", "tz" to "Europe/Kyiv"), "pulseMuted" to false)),
+        )
+        assertEquals(mapOf("description" to "- [x] milk", "updatedAt" to FieldValue.serverTimestamp()), taskUpdate(mapOf("description" to "- [x] milk")))
+    }
 }
````

Изменения в `android/app/src/test/kotlin/com/pmobile78/todoround/ui/WritesTest.kt`:

````diff
diff --git a/android/app/src/test/kotlin/com/pmobile78/todoround/ui/WritesTest.kt b/android/app/src/test/kotlin/com/pmobile78/todoround/ui/WritesTest.kt
index acbdf72..abaa08d 100644
--- a/android/app/src/test/kotlin/com/pmobile78/todoround/ui/WritesTest.kt
+++ b/android/app/src/test/kotlin/com/pmobile78/todoround/ui/WritesTest.kt
@@ -1,6 +1,7 @@
 package com.pmobile78.todoround.ui
 
 import kotlinx.coroutines.CoroutineScope
+import kotlinx.coroutines.Dispatchers
 import kotlinx.coroutines.Job
 import kotlinx.coroutines.awaitCancellation
 import kotlinx.coroutines.cancel
@@ -28,11 +29,27 @@ class WritesTest {
 
     @Test
     fun `a write cancelled with its screen is not a failure`() = runBlocking {
-        val scope = CoroutineScope(Job())
+        // Unconfined: the write has started and waits when the scope is cancelled.
+        val scope = CoroutineScope(Dispatchers.Unconfined + Job())
         val writes = Writes(scope)
-        writes.launch { awaitCancellation() }
+        var started = false
+        writes.launch {
+            started = true
+            awaitCancellation()
+        }
+        assertTrue(started)
         scope.cancel()
 
         assertNull(withTimeoutOrNull(200) { writes.failures.first() })
     }
+
+    @Test
+    fun `a write the core refused comes out of the failures, and several are one`() = runBlocking {
+        val writes = Writes(this)
+        writes.refuse()
+        writes.refuse()
+
+        assertEquals(Unit, withTimeout(5_000) { writes.failures.first() })
+        assertNull(withTimeoutOrNull(200) { writes.failures.first() })
+    }
 }
````

`RepositoriesTest` пишет каждое действие под настоящими правилами и читает задачу так, как её читает ядро: она проходит проверку. Изменение задачи, удалённой навсегда, правила отклоняют (`PERMISSION_DENIED`: они проверяют документ, который оставит запись, а его нет).

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt
index 1b42312..c245173 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt
@@ -12,7 +12,12 @@ import com.pmobile78.todoround.core.model.Category
 import com.pmobile78.todoround.core.model.Due
 import com.pmobile78.todoround.core.model.ListFilter
 import com.pmobile78.todoround.core.model.ListSort
+import com.pmobile78.todoround.core.model.Task
+import com.pmobile78.todoround.core.model.TaskAction
+import com.pmobile78.todoround.core.model.changes
+import com.pmobile78.todoround.core.model.completionChanges
 import com.pmobile78.todoround.core.model.defaultSettings
+import com.pmobile78.todoround.core.model.descriptionChanges
 import com.pmobile78.todoround.core.model.toRecord
 import com.pmobile78.todoround.data.CategoriesRepository
 import com.pmobile78.todoround.data.SettingsRepository
@@ -27,6 +32,7 @@ import org.junit.Assert.assertEquals
 import org.junit.Assert.assertTrue
 import org.junit.Test
 import org.junit.runner.RunWith
+import java.time.Instant
 
 /** The repositories on the Firestore emulator, under the rules of the repository. */
 @RunWith(AndroidJUnit4::class)
@@ -34,7 +40,7 @@ class RepositoriesTest {
     private val backend = emulatorBackend()
 
     // A task as the web's newTaskData writes it (src/services/data/convert.js).
-    private fun webTask(title: String, due: Map<String, Any>?, reminders: List<Int>) = mapOf(
+    private fun webTask(title: String, due: Map<String, Any>?, reminders: List<Int>, repeat: Map<String, Any>? = null) = mapOf(
         "schemaVersion" to 2,
         "title" to title,
         "description" to "",
@@ -42,7 +48,7 @@ class RepositoriesTest {
         "status" to "active",
         "due" to due,
         "reminders" to reminders,
-        "repeat" to null,
+        "repeat" to repeat,
         "radius" to 45,
         "pulseMuted" to false,
         "overdueAt" to null,
@@ -211,4 +217,82 @@ class RepositoriesTest {
             web.auth.signOut()
         }
     }
+
+    // The task [id] as the core reads it from the server: it passed the check, or this fails.
+    private suspend fun readBack(uid: String, id: String, until: (Task) -> Boolean): Task {
+        val tasks = TasksRepository(backend.db).tasks(uid).first { loaded ->
+            !loaded.fromCache && loaded.items.any { it.id == id && until(it) }
+        }
+        assertEquals(0, tasks.invalid)
+        return tasks.items.single { it.id == id }
+    }
+
+    @Test
+    fun theChangesOfEachActionAreWrittenAsTheWebWritesThemAndPassTheRules() = runBlocking {
+        withTimeout(120_000) {
+            val uid = backend.signUpNewUser()
+            val repository = TasksRepository(backend.db)
+            // A daily task whose due has passed, its pulse stopped.
+            write(
+                "users/$uid/tasks/t1",
+                webTask("Water", mapOf("local" to "2026-10-01T09:30", "tz" to "Europe/Kyiv"), listOf(60), mapOf("every" to 1, "unit" to "days")) +
+                    ("pulseMuted" to true),
+            )
+            var task = readBack(uid, "t1") { true }
+            val created = backend.db.document("users/$uid/tasks/t1").fromServer().getTimestamp("createdAt")
+
+            // Done moves the due to the first time after now and lets the task pulse again.
+            val done = completionChanges(task, "Europe/Kyiv", Instant.now())
+            repository.update(uid, "t1", done)
+            task = readBack(uid, "t1") { it.due?.local == (done["due"] as Map<*, *>)["local"] }
+            assertEquals(TaskStatus.ACTIVE, task.status)
+            assertEquals(false, task.pulseMuted)
+            assertEquals("Europe/Kyiv", task.due?.tz)
+
+            repository.update(uid, "t1", TaskAction.FINISH_SERIES.changes(task, "UTC", Instant.now())!!)
+            task = readBack(uid, "t1") { it.status == TaskStatus.DONE }
+            repository.update(uid, "t1", TaskAction.RESTORE.changes(task, "UTC", Instant.now())!!)
+            task = readBack(uid, "t1") { it.status == TaskStatus.ACTIVE }
+            repository.update(uid, "t1", TaskAction.DELETE.changes(task, "UTC", Instant.now())!!)
+            task = readBack(uid, "t1") { it.status == TaskStatus.DELETED }
+            assertTrue(task.deletedAt != null)
+            repository.update(uid, "t1", TaskAction.RESTORE.changes(task, "UTC", Instant.now())!!)
+            task = readBack(uid, "t1") { it.status == TaskStatus.ACTIVE && it.deletedAt == null }
+            repository.update(uid, "t1", descriptionChanges("- [x] the big pot"))
+            task = readBack(uid, "t1") { it.description == "- [x] the big pot" }
+
+            // The document keeps its time of creation and the fields of the server; updatedAt is the server's.
+            val doc = backend.db.document("users/$uid/tasks/t1").fromServer()
+            assertEquals(2L, doc.getLong("schemaVersion"))
+            assertEquals(created, doc.getTimestamp("createdAt"))
+            assertEquals(null, doc.get("overdueAt"))
+            assertTrue(doc.getTimestamp("updatedAt")!! > created!!)
+            assertEquals("- [x] the big pot", task.description)
+        }
+    }
+
+    @Test
+    fun deleteForeverRemovesTheTask() = runBlocking {
+        withTimeout(60_000) {
+            val uid = backend.signUpNewUser()
+            write("users/$uid/tasks/t1", webTask("Old", null, emptyList()))
+            backend.db.document("users/$uid/tasks/t1").fromServer()
+
+            TasksRepository(backend.db).delete(uid, "t1")
+            assertEquals(false, backend.db.document("users/$uid/tasks/t1").fromServer().exists())
+        }
+    }
+
+    @Test
+    fun aChangeOfATaskDeletedForeverFailsForTheCaller() = runBlocking {
+        withTimeout(60_000) {
+            val uid = backend.signUpNewUser()
+            // The rules check the task the change would leave: with no document there is none.
+            val refused = runCatching { TasksRepository(backend.db).update(uid, "gone", mapOf("status" to "done")) }
+            assertEquals(
+                FirebaseFirestoreException.Code.PERMISSION_DENIED,
+                (refused.exceptionOrNull() as FirebaseFirestoreException).code,
+            )
+        }
+    }
 }
````

- [ ] **Step 3: Тест падает**

Run: `android/gradlew -p android --no-daemon :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/TaskChangesTest.kt:73:22 Cannot infer type for type parameter 'T'. Specify it explicitly.`, за ней — `e: …/TaskChangesTest.kt:73:29 Unresolved reference 'TaskAction'.`

- [ ] **Step 4: Изменения действий, записи и проверка**

`changeErrors` собирает запись задачи (`toRecord`), накладывает изменения (`ServerTime` — как «сейчас») и проверяет её `validateTask`; незнакомая зона допускается, если изменения не трогают `due`. `AppViewModel.act` берёт «сейчас» и зону телефона, `toggle` — описание с одним изменённым символом; изменения, которые ядро не пропустило, не отправляются, а `Writes.refuse()` показывает то же сообщение, что отказ сервера.

Изменения в `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt`:

````diff
diff --git a/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt b/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt
index ca2dd51..6fd8c88 100644
--- a/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt
+++ b/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt
@@ -2,13 +2,44 @@ package com.pmobile78.todoround.core.model
 
 import com.pmobile78.todoround.core.contract.TaskStatus
 import com.pmobile78.todoround.core.contract.isValidTimeZone
+import com.pmobile78.todoround.core.contract.validateTask
 import java.time.Instant
 
 /*
  * The changes of a task that the phone writes (stage 2 spec, sections 4 and 5), as the fields of
- * its record: the web's src/services/data/tasks.js writes the same.
+ * its record: the web's src/services/data/tasks.js writes the same. The app adds updatedAt with the
+ * time of the server and writes ServerTime as it.
  */
 
+/** Stands for the time of the server in a change; the app writes serverTimestamp() for it. */
+data object ServerTime
+
+/** What can be done to a task, as the web's buttons do it (stage 2 spec, 2.2 №12). */
+enum class TaskAction { DONE, FINISH_SERIES, DELETE, RESTORE, DELETE_FOREVER }
+
+/**
+ * The actions of this task by its status, in the order of the web's buttons (TaskActionButtons.jsx):
+ * the first is the button of its row, the others are in its menu (2.2 №10). "Finish series" is for a
+ * repeating task only.
+ */
+fun Task.actions(): List<TaskAction> = when (status) {
+    TaskStatus.ACTIVE -> listOfNotNull(TaskAction.DONE, TaskAction.FINISH_SERIES.takeIf { repeat != null }, TaskAction.DELETE)
+    TaskStatus.DONE -> listOf(TaskAction.RESTORE, TaskAction.DELETE)
+    TaskStatus.DELETED -> listOf(TaskAction.RESTORE, TaskAction.DELETE_FOREVER)
+}
+
+/**
+ * The changes [action] writes to [task] at [now], in [zone], the zone of the phone; null for
+ * "Delete forever", which removes the document instead.
+ */
+fun TaskAction.changes(task: Task, zone: String, now: Instant): Map<String, Any?>? = when (this) {
+    TaskAction.DONE -> completionChanges(task, zone, now)
+    TaskAction.FINISH_SERIES -> mapOf("status" to TaskStatus.DONE.wire)
+    TaskAction.DELETE -> mapOf("status" to TaskStatus.DELETED.wire, "deletedAt" to ServerTime)
+    TaskAction.RESTORE -> mapOf("status" to TaskStatus.ACTIVE.wire, "deletedAt" to null)
+    TaskAction.DELETE_FOREVER -> null
+}
+
 /**
  * "Done" (contract 4.1; completionChanges of the web): a one-off task becomes done; a repeating one
  * stays active with its next due after [now], written in the zone of the due, and pulses again. A
@@ -25,3 +56,43 @@ fun completionChanges(task: Task, zone: String, now: Instant): Map<String, Any?>
         if (task.pulseMuted) put("pulseMuted", false)
     }
 }
+
+/** The new [description] of a task: a checkbox ticked or unticked (2.2 №2). */
+fun descriptionChanges(description: String): Map<String, Any?> = mapOf("description" to description)
+
+/**
+ * The errors of the task that [changes] leave (stage 2 spec, 2.2 №16): validateTask of its record
+ * after them, with [now] for the times of the server. A due zone the changes keep passes even when
+ * this phone does not know it, as when the task was read.
+ */
+fun changeErrors(task: Task, changes: Map<String, Any?>, now: Instant): List<String> {
+    val record = task.toRecord() + changes.mapValues { (_, value) -> if (value == ServerTime) now.toString() else value } +
+        ("updatedAt" to now.toString())
+    @Suppress("UNCHECKED_CAST")
+    val zoneKept = (record["due"] as Map<String, Any?>?)?.get("tz") == task.due?.tz
+    return validateTask(record, acceptUnknownZone = zoneKept)
+}
+
+/** The record of this task, as backups keep it: the form validateTask checks. Whole numbers are Long. */
+fun Task.toRecord(): Map<String, Any?> = mapOf(
+    "id" to id,
+    "title" to title,
+    "description" to description,
+    "categoryId" to categoryId,
+    "status" to status.wire,
+    "due" to due?.let { mapOf("local" to it.local, "tz" to it.tz) },
+    "reminders" to reminders.map(Int::toLong),
+    "repeat" to repeat?.let { repeat ->
+        buildMap {
+            put("every", repeat.every.toLong())
+            put("unit", repeat.unit.wire)
+            repeat.weekdays?.let { put("weekdays", it.map(Int::toLong)) }
+            repeat.monthDay?.let { put("monthDay", it.toLong()) }
+        }
+    },
+    "radius" to radius.toLong(),
+    "pulseMuted" to pulseMuted,
+    "createdAt" to createdAt.toString(),
+    "updatedAt" to updatedAt.toString(),
+    "deletedAt" to deletedAt?.toString(),
+)
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
index 5b88b6b..bd62ad0 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
@@ -6,6 +6,7 @@ import com.pmobile78.todoround.core.contract.SCHEMA_VERSION
 import com.pmobile78.todoround.core.contract.validateSettings
 import com.pmobile78.todoround.core.model.ListFilter
 import com.pmobile78.todoround.core.model.ListSort
+import com.pmobile78.todoround.core.model.ServerTime
 import com.pmobile78.todoround.core.model.Settings
 import com.pmobile78.todoround.core.model.defaultSettings
 import com.pmobile78.todoround.core.model.settingsFromRecord
@@ -81,3 +82,12 @@ fun listFilterUpdate(filter: ListFilter): Map<String, Any?> = settingsUpdate("li
 // that two devices do not undo each other's changes of other settings.
 private fun settingsUpdate(key: String, value: Any?): Map<String, Any?> =
     mapOf("settings.$key" to value, "updatedAt" to FieldValue.serverTimestamp())
+
+/**
+ * The change of a task document that writes [changes] of the core (stage 2 spec, section 5), as
+ * the web's taskUpdateData: the fields themselves, ServerTime as the time of the server, and
+ * updatedAt with it; schemaVersion, createdAt and the fields of the server stay out.
+ */
+fun taskUpdate(changes: Map<String, Any?>): Map<String, Any?> =
+    changes.mapValues { (_, value) -> if (value == ServerTime) FieldValue.serverTimestamp() else value } +
+        ("updatedAt" to FieldValue.serverTimestamp())
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
index 192745e..db62447 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
@@ -36,6 +36,18 @@ class TasksRepository(private val db: FirebaseFirestore) {
     fun tasks(uid: String): Flow<Loaded<Task>> =
         db.collection("users").document(uid).collection("tasks")
             .loaded { id, data -> taskFromRecord(taskRecord(id, data), acceptUnknownZone = true) }
+
+    /** Writes [changes] of the core to the task [id] of [uid] (stage 2 spec, section 5); returns once the server has them. */
+    suspend fun update(uid: String, id: String, changes: Map<String, Any?>) {
+        task(uid, id).update(taskUpdate(changes)).await()
+    }
+
+    /** Deletes the task [id] of [uid] for good ("Delete forever"); returns once the server has done it. */
+    suspend fun delete(uid: String, id: String) {
+        task(uid, id).delete().await()
+    }
+
+    private fun task(uid: String, id: String) = db.collection("users").document(uid).collection("tasks").document(id)
 }
 
 /** The categories of a user, users/{uid}/categories. */
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Writes.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/Writes.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/Writes.kt
index 8bbecc0..232604a 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/Writes.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/Writes.kt
@@ -11,14 +11,20 @@ import kotlinx.coroutines.launch
 /**
  * The writes of the screens (stage 2 spec, 2.2 №17). A write runs in [scope] and does not hold the
  * screen up: Firestore shows the change at once from its cache and sends it when it can. A write
- * the server refuses comes out of [failures], which the screen shows as a short message; a
- * failure waits there until the screen takes it.
+ * the server refuses, or one the core refused before it went (2.2 №16), comes out of [failures],
+ * which the screen shows as a short message; a failure waits there until the screen takes it, and
+ * several at once are one message.
  */
 class Writes(private val scope: CoroutineScope) {
     private val failed = Channel<Unit>(Channel.CONFLATED)
 
     val failures: Flow<Unit> = failed.receiveAsFlow()
 
+    /** A write the core refused: it is not sent, and the screen says so as for a refusal of the server. */
+    fun refuse() {
+        failed.trySend(Unit)
+    }
+
     fun launch(write: suspend () -> Unit) {
         scope.launch {
             try {
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
index 52af008..6298c40 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
@@ -6,11 +6,18 @@ import androidx.lifecycle.AndroidViewModel
 import androidx.lifecycle.viewModelScope
 import com.google.firebase.auth.FirebaseUser
 import com.pmobile78.todoround.ToDoRoundApp
+import com.pmobile78.todoround.core.contract.deviceTimeZone
+import com.pmobile78.todoround.core.markdown.TaskItem
+import com.pmobile78.todoround.core.markdown.toggleTask
 import com.pmobile78.todoround.core.model.Category
 import com.pmobile78.todoround.core.model.ListFilter
 import com.pmobile78.todoround.core.model.ListSort
 import com.pmobile78.todoround.core.model.Settings
 import com.pmobile78.todoround.core.model.Task
+import com.pmobile78.todoround.core.model.TaskAction
+import com.pmobile78.todoround.core.model.changeErrors
+import com.pmobile78.todoround.core.model.changes
+import com.pmobile78.todoround.core.model.descriptionChanges
 import com.pmobile78.todoround.data.AccountRepository
 import com.pmobile78.todoround.data.CategoriesRepository
 import com.pmobile78.todoround.data.Loaded
@@ -28,6 +35,7 @@ import kotlinx.coroutines.flow.map
 import kotlinx.coroutines.flow.onEach
 import kotlinx.coroutines.flow.onStart
 import kotlinx.coroutines.flow.stateIn
+import java.time.Instant
 
 /** The data of the signed-in user that the screens show. */
 data class UserData(val settings: Settings, val tasks: Loaded<Task>, val categories: Loaded<Category>)
@@ -89,7 +97,7 @@ class AppViewModel(application: Application) : AndroidViewModel(application) {
 
     private val writes = Writes(viewModelScope)
 
-    /** Writes the server refused: the screen shows a message for each (stage 2 spec, 2.2 №17). */
+    /** Writes the server or the core refused: the screen shows a message (stage 2 spec, 2.2 №16, №17). */
     val writeFailures: Flow<Unit> = writes.failures
 
     /** The sort of the list, shared with the web (stage 2 spec, 2.2 №7). */
@@ -98,6 +106,41 @@ class AppViewModel(application: Application) : AndroidViewModel(application) {
     /** The filter of the list, shared with the web. */
     fun setListFilter(filter: ListFilter) = write { uid -> settings.setListFilter(uid, filter) }
 
+    /** [action] on [task] (stage 2 spec, 2.2 №12); the core checks the task it leaves first (2.2 №16). */
+    fun act(task: Task, action: TaskAction) {
+        if (action == TaskAction.DELETE_FOREVER) {
+            write { uid -> tasks.delete(uid, task.id) }
+            return
+        }
+        val now = Instant.now()
+        val changes = try {
+            action.changes(task, deviceTimeZone(), now)!!
+        } catch (e: RuntimeException) {
+            // A due the core cannot step, beyond the years of the contract say, writes nothing.
+            Log.w(TAG, "task ${task.id}: no changes for ${action.name}", e)
+            writes.refuse()
+            return
+        }
+        writeChanges(task, changes, now)
+    }
+
+    /** [item] of the description of [task] ticked or unticked (2.2 №2): the description is written whole. */
+    fun toggle(task: Task, item: TaskItem) {
+        val description = toggleTask(task.description, item) ?: return
+        writeChanges(task, descriptionChanges(description), Instant.now())
+    }
+
+    // Changes the core accepts are written; the others are not sent, and the screen says so.
+    private fun writeChanges(task: Task, changes: Map<String, Any?>, now: Instant) {
+        val errors = changeErrors(task, changes, now)
+        if (errors.isNotEmpty()) {
+            Log.w(TAG, "task ${task.id}: ${errors.joinToString("; ")}")
+            writes.refuse()
+            return
+        }
+        write { uid -> tasks.update(uid, task.id, changes) }
+    }
+
     // A write for the signed-in user; signed out, there is nothing to write.
     private fun write(change: suspend (uid: String) -> Unit) {
         val uid = backend.auth.currentUser?.uid ?: return
@@ -114,4 +157,8 @@ class AppViewModel(application: Application) : AndroidViewModel(application) {
                 categories.categories(user.uid),
             ) { settings, tasks, categories -> settings?.let { UserData(it, tasks, categories) } },
         )
+
+    private companion object {
+        const val TAG = "AppViewModel"
+    }
 }
````

- [ ] **Step 5: Сборка, тесты JVM и Lint**

Run: `android/gradlew -p android --no-daemon check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `core tests: 150 passed, 0 failed, 0 skipped`, `app debug tests: 27 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.`

- [ ] **Step 6: Тесты проходят на устройстве**

Свободны ли эмулятор и Gradle — их может занимать другая сессия:

```bash
source /media/big_disk/android/android-env.sh
if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"
elif pgrep -f '[G]radleDaemon|[G]radleWrapperMain' > /dev/null; then echo "Gradle is running: wait"
else echo "free"; fi
```

Expected: `free`. Иначе — ждать и проверять снова: чужой эмулятор и чужую сборку не трогать.

Эмулятор запустить в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-2-2.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi):

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase — в фоне (`run_in_background`), вывод в журнал. Экран ещё прежний; новые тесты — записи `RepositoriesTest`:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh > /media/big_disk/android/work/device-2-2.log 2>&1; grep -E '^OK \(|^Tests run|^FAILURES|Script exited|^[0-9]+\) |TIMEOUT' /media/big_disk/android/work/device-2-2.log
```

Expected: `OK (28 tests)` и `Script exited successfully (code 0)`. Ответ `Error: TIMEOUT: Port 8180 on 127.0.0.1 was not active within 60000ms` — эмулятору Firestore не хватило памяти, обычно из-за чужой сборки Gradle рядом с эмулятором (в черновике так и было): дождаться её конца и повторить блок.

Эмулятор выключить и дождаться конца его процесса — только своего: свой запущен из корня этой копии (`/proc/<pid>/cwd`). Другая сессия может запустить тот же эмулятор через секунды после того, как наш выключился, — её процесс этот блок не задевает. Если `emu kill` не сработал — сигнал завершения нашему процессу:

```bash
source /media/big_disk/android/android-env.sh
Q=$(for p in $(pgrep -f '[q]emu-system.*ToRound_API37'); do [ "$(readlink /proc/$p/cwd)" = "$PWD" ] && echo $p; done)
[ -n "$Q" ] || { echo "no emulator of this copy"; exit 1; }
adb -e emu kill
timeout 60 sh -c "while kill -0 $Q 2>/dev/null; do sleep 2; done" || kill -TERM $Q
timeout 60 sh -c "while kill -0 $Q 2>/dev/null; do sleep 2; done" && echo "emulator stopped"
```

Expected: `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 7: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/Writes.kt android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt android/app/src/test/kotlin/com/pmobile78/todoround/ui/WritesTest.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskChangesTest.kt
git commit -F - <<'EOF'
feat(android): the actions of a task and a ticked item are written as on the web

Stage 2.2, task 3 (spec 2.2 No. 12, 16, 17; section 5). TaskAction and
Task.actions give the web's buttons for each status, and the changes of
each action are what the web writes: "Done" from task 1, "Finish series"
the status done, delete the status deleted with the server's deletedAt,
restore the status active without it, a ticked item the description;
"Delete forever" deletes the document. changeErrors checks the task a
change leaves with validateTask before it goes; a refused change is not
sent and shows the message of a refused write (Writes.refuse).
TasksRepository updates with the server's updatedAt, and RepositoriesTest
proves each write under the real rules. The cancelled write of WritesTest
starts for real now (review 2.1, minor 4).
EOF
```

---

### Task 4: Экран «Задача» и действия в строке списка

**Files:**
- Create: `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Reminders.kt`; `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Clock.kt`, `ui/TaskParts.kt`, `ui/MarkdownView.kt`, `ui/TaskScreen.kt`; значки `android/app/src/main/res/drawable/ic_arrow_back.xml`, `ic_delete_forever.xml`, `ic_done_all.xml`, `ic_notifications.xml`, `ic_repeat.xml`, `ic_restore.xml`
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/res/values-uk/strings.xml`
- Test: `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RemindersTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskFlowTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskScreenTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/MarkdownOnDeviceTest.kt` (новые); `android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt` (изменение)

**Interfaces:**
- Consumes: `TaskAction`, `Task.actions()`, `AppViewModel.act`, `AppViewModel.toggle`, `writeFailures` (задача 3); `parseMarkdown`, `Block`, `Inline`, `TaskItem`, `isSafeLink` (задача 2); из 2.1 — `HomeScreen`, `Session.SignedIn`, `UserData`, `dueView`, `dueMoment`, `listDateTime`, `changedAfterCreation`, `ListTab`; помощники тестов `emulatorBackend()`, `webBackend()`, `newEmail()`, `signUp(email)`, `fromServer()`, `screenshot(name)`.
- Produces:
  - `com.pmobile78.todoround.core.model`: `enum class ReminderUnit { HOURS, DAYS, WEEKS }`, `data class ReminderParts(val count: Int, val unit: ReminderUnit)`, `fun reminderParts(minutes: Int): ReminderParts` — самые крупные целые единицы; `fun reminderPassed(minutes: Int, due: Due, zone: String, now: Instant): Boolean` — момент напоминания уже позади, как в `ReminderEditor.jsx` веба (`now >` момента);
  - `com.pmobile78.todoround.ui`: `@Composable fun currentMinute(clock: Clock): Instant`; `@Composable fun TaskScreen(taskId: String, session: Session.SignedIn, onBack: () -> Unit, onAction: (Task, TaskAction) -> Unit, onToggle: (Task, TaskItem) -> Unit, onGone: () -> Unit, writeFailures: Flow<Unit> = emptyFlow(), clock: Clock = Clock.systemUTC())`; `@Composable fun MarkdownView(blocks: List<Block>, onToggle: (TaskItem) -> Unit, modifier: Modifier = Modifier)`; у `HomeScreen` новые параметры `onOpen: (String) -> Unit = {}`, `onAction: (Task, TaskAction) -> Unit = { _, _ -> }`, `taskGone: Flow<Unit> = emptyFlow()`, `clock: Clock = Clock.systemUTC()`;
  - теги для тестов: `task_screen`, `back`, `status`, `title`, `reminder`, `repeat`, `repeat_hint`, `description`, `times`, `checkbox`, `action_<действие>` на экране (`action_done`, `action_finish_series`, `action_delete`, `action_restore`, `action_delete_forever`), `row_action_<действие>` — кнопка строки, `row_menu` и `menu_action_<действие>` — меню строки, `delete_forever_confirm` — «Delete Forever» в вопросе.

- [ ] **Step 1: Написать падающие тесты**

`RemindersTest` — подписи и прошедшие напоминания, как их показывает диалог веба.

Файл `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RemindersTest.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.Instant

/** The reminders as the web's src/utils/reminders.js and ReminderEditor.jsx show them. */
class RemindersTest {
    @Test
    fun `a reminder shows in its largest whole unit`() {
        assertEquals(ReminderParts(1, ReminderUnit.HOURS), reminderParts(60))
        assertEquals(ReminderParts(25, ReminderUnit.HOURS), reminderParts(1500))
        assertEquals(ReminderParts(2, ReminderUnit.DAYS), reminderParts(2880))
        assertEquals(ReminderParts(1, ReminderUnit.WEEKS), reminderParts(10080))
        assertEquals(ReminderParts(52, ReminderUnit.WEEKS), reminderParts(524_160))
    }

    @Test
    fun `a reminder has passed once its moment is behind now`() {
        // 09:30 in Berlin on 23 October 2026 is 07:30 UTC; an hour before is 06:30 UTC.
        val due = Due("2026-10-23T09:30", "Europe/Berlin")
        assertFalse(reminderPassed(60, due, "UTC", Instant.parse("2026-10-23T06:30:00Z")))
        assertTrue(reminderPassed(60, due, "UTC", Instant.parse("2026-10-23T06:30:00.001Z")))
        assertFalse(reminderPassed(1440, due, "UTC", Instant.parse("2026-10-22T07:00:00Z")))
    }
}
````

`TaskFlowTest` идёт на эмуляторах Firebase, как `ListFlowTest` 2.1: «веб» — второй клиент Firestore — заводит аккаунт и задачи, приложение показывает их, а записанное приложением тесты читают с сервера так, как его читает веб. Задача открывается из строки со всеми полями (снимок `task-en-light`). Каждое действие раздела 3 проходит через экран: «Готово» разовой задачи кнопкой строки, «Восстановить» среди выполненных, «Удалить» из меню строки; с экрана задачи — «Восстановить» из корзины, «Удалить», «Удалить навсегда» сначала с «Cancel», потом с подтверждением; «Удалить навсегда» из меню строки; «Готово» повторяющейся задачи (новый срок — тот, что даёт ядро в момент нажатия, `pulseMuted` снят) и «Завершить серию». После действия на экране список — на той же вкладке. Отмеченный пункт записан, а пункт, отмеченный «вебом», открытый экран показывает сам. Задача, которую «веб» удалил навсегда, закрывает свой экран сообщением. «Готово» задачи со сроком 31.12.9999 и повтором каждый день ядро не пропускает (следующий срок — в 10000 году, которого в контракте нет): экран закрывается, список говорит «The change could not be saved.», задача не меняется. Открытое меню строки остаётся у своей задачи, когда «веб» добавляет задачу выше, а меню задачи, которую «веб» убрал из вкладки и вернул, само не открывается. Последний тест — экран на украинском в тёмной теме (снимок `task-uk-dark`).

`TaskScreenTest` — состояние, которого не дают эмуляторы: в данных из кэша задачи нет — экран ждёт, а не закрывается; в данных с сервера её нет — закрывается.

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskScreenTest.kt`:

````kotlin
package com.pmobile78.todoround

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.Session
import com.pmobile78.todoround.ui.TaskScreen
import com.pmobile78.todoround.ui.UserData
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** The states of the screen of a task that the data of the emulators do not bring about. */
@RunWith(AndroidJUnit4::class)
class TaskScreenTest {
    @get:Rule
    val compose = createComposeRule()

    @Test
    fun aTaskTheCacheDoesNotHaveIsWaitedForUntilTheServerSaysItIsGone() {
        var fromCache by mutableStateOf(true)
        var gone = 0
        compose.setContent {
            val data = UserData(defaultSettings("en"), Loaded(emptyList(), 0, fromCache), Loaded(emptyList(), 0, fromCache))
            ToDoRoundTheme {
                TaskScreen(
                    "t1",
                    Session.SignedIn("olena@example.com", data),
                    onBack = {},
                    onAction = { _, _ -> },
                    onToggle = { _, _ -> },
                    onGone = { gone++ },
                )
            }
        }
        compose.onNodeWithTag("loading").assertExists()
        assertEquals(0, gone)

        fromCache = false
        compose.waitForIdle()
        assertEquals(1, gone)
    }
}
````

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskFlowTest.kt`:

````kotlin
package com.pmobile78.todoround

import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.ComposeTimeoutException
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.core.os.LocaleListCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.core.model.nextFutureOccurrence
import com.pmobile78.todoround.data.SettingsRepository
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant
import java.time.ZoneId

/**
 * The screen of a task and the actions of the list on the emulators (stage 2 spec, sections 3 and
 * 7): the web's client writes the account and its tasks, the app shows them, and what the app writes
 * is what the web reads.
 */
@RunWith(AndroidJUnit4::class)
class TaskFlowTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val backend = emulatorBackend()
    private val web = webBackend()
    private val here = ZoneId.systemDefault().id

    @Before
    fun startSignedOut() {
        backend.auth.signOut()
    }

    @After
    fun signOutAndForgetTheAppearance() {
        backend.auth.signOut()
        web.auth.signOut()
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.getEmptyLocaleList())
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        }
    }

    /** A new account set up on the web's client, which stays signed in; the app signs in to it. Returns its uid. */
    private fun account(settings: Settings = defaultSettings("en").copy(listSort = ListSort(SortField.TITLE, SortOrder.ASC)), seed: suspend (String) -> Unit): String {
        val email = newEmail()
        val uid = runBlocking {
            val uid = web.signUp(email)
            SettingsRepository(web.db).createUserDoc(uid, settings)
            seed(uid)
            uid
        }
        runBlocking { backend.auth.signInWithEmailAndPassword(email, "secret-1").await() }
        return uid
    }

    // A task as the web writes it (src/services/data/convert.js), with a fixed time.
    private suspend fun task(
        uid: String,
        id: String,
        title: String,
        due: Due? = null,
        status: String = "active",
        description: String = "",
        categoryId: String? = null,
        reminders: List<Int> = emptyList(),
        repeat: Map<String, Any>? = null,
        pulseMuted: Boolean = false,
    ) {
        val time = Timestamp(Instant.parse("2026-10-01T08:00:00Z"))
        val data = mapOf(
            "schemaVersion" to 2,
            "title" to title,
            "description" to description,
            "categoryId" to categoryId,
            "status" to status,
            "due" to due?.let { mapOf("local" to it.local, "tz" to it.tz) },
            "reminders" to reminders,
            "repeat" to repeat,
            "radius" to 45,
            "pulseMuted" to pulseMuted,
            "overdueAt" to null,
            "createdAt" to time,
            "updatedAt" to time,
            "deletedAt" to if (status == "deleted") time else null,
        )
        web.db.document("users/$uid/tasks/$id").set(data).await()
    }

    private suspend fun category(uid: String, id: String, name: String) {
        val data = mapOf(
            "schemaVersion" to 2,
            "name" to name,
            "color" to "#46a549",
            "order" to 1,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp(),
        )
        web.db.document("users/$uid/categories/$id").set(data).await()
    }

    /** The task as the server has it, as the web reads it. */
    private fun stored(uid: String, id: String): DocumentSnapshot = runBlocking {
        withTimeout(30_000) { web.db.document("users/$uid/tasks/$id").fromServer() }
    }

    private fun waitFor(tag: String) {
        compose.waitUntil(60_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    }

    private fun waitForText(text: String) {
        compose.waitUntil(60_000) { compose.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() }
    }

    // The row of the task [title]; its buttons are nodes of their own inside it.
    private fun row(title: String) = hasTestTag("task") and hasText(title, substring = true)

    // A tap through the action of the node, which a keyboard or a moving list cannot make miss.
    private fun press(matcher: SemanticsMatcher) {
        compose.waitUntil(60_000) { compose.onAllNodes(matcher).fetchSemanticsNodes().isNotEmpty() }
        compose.onNode(matcher).performSemanticsAction(SemanticsActions.OnClick)
    }

    private fun open(title: String) {
        press(row(title))
        waitFor("task_screen")
    }

    private fun tab(name: String) {
        waitFor("tab_$name")
        compose.onNodeWithTag("tab_$name").performScrollTo().performSemanticsAction(SemanticsActions.OnClick)
    }

    private fun checkboxes(): List<ToggleableState> =
        compose.onAllNodesWithTag("checkbox").fetchSemanticsNodes().map { it.config[SemanticsProperties.ToggleableState] }

    private fun waitForCheckboxes(expected: List<ToggleableState>) {
        try {
            compose.waitUntil(60_000) { runCatching { checkboxes() == expected }.getOrDefault(false) }
        } catch (e: ComposeTimeoutException) {
            // The assertion below shows what the screen has instead.
        }
        assertEquals(expected, checkboxes())
    }

    private fun darkScreen(): Boolean = runCatching {
        (compose.activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }.getOrDefault(false)

    @Test
    fun aTaskOpensFromItsRowWithAllItsFields() {
        account { uid ->
            category(uid, "home", "Home")
            task(
                uid, "t1", "Water the plants",
                due = Due("2099-12-31T08:00", here),
                categoryId = "home",
                reminders = listOf(60, 2880),
                repeat = mapOf("every" to 2, "unit" to "weeks", "weekdays" to listOf(1, 5)),
                description = "## Pots\n- [ ] the big one\n- [x] **the small one**\n\n> by the window\n\n[care](https://example.com)",
            )
        }
        open("Water the plants")

        compose.onNodeWithTag("status").assertTextEquals("Active")
        compose.onNodeWithTag("title").assertTextEquals("Water the plants")
        compose.onNodeWithText("Due date: 12/31/2099, 08:00").assertExists()
        compose.onNodeWithText("Home").assertExists()
        assertEquals(
            listOf("1 hour before", "2 days before"),
            compose.onAllNodesWithTag("reminder").fetchSemanticsNodes().map { it.config[SemanticsProperties.Text].joinToString() },
        )
        compose.onNodeWithTag("repeat").assertTextEquals("Every 2 weeks: MON, FRI")
        waitForCheckboxes(listOf(ToggleableState.Off, ToggleableState.On))
        compose.onNodeWithText("Pots").assertExists()
        compose.onNodeWithText("by the window").assertExists()
        compose.onNodeWithText("care").assertExists()
        compose.onNodeWithText("Created: ${listDateTime(Instant.parse("2026-10-01T08:00:00Z"), here, Language.EN)}").assertExists()
        compose.onNodeWithTag("action_done").assertTextEquals("Mark as Done")
        compose.onNodeWithTag("action_finish_series").assertTextEquals("Finish series")
        compose.onNodeWithTag("action_delete").assertTextEquals("Delete Task")
        compose.onNodeWithTag("repeat_hint").assertExists()
        screenshot("task-en-light")

        compose.onNodeWithTag("back").performSemanticsAction(SemanticsActions.OnClick)
        waitFor("home")
    }

    @Test
    fun theActionsOfTheRowsAndOfTheScreenAreWrittenAsTheWebReadsThem() {
        val uid = account { uid ->
            task(uid, "once", "Once")
            task(uid, "daily", "Daily", due = Due("2026-10-01T09:30", here), repeat = mapOf("every" to 1, "unit" to "days"), pulseMuted = true)
            task(uid, "trashed", "Trashed", status = "deleted")
        }
        // The row: "Done" of a one-off task, "Restore" among the done tasks, "Delete" from its menu.
        press(hasTestTag("row_action_done") and hasAnyAncestor(row("Once")))
        compose.waitUntil(60_000) { stored(uid, "once").getString("status") == "done" }
        tab("done")
        press(hasTestTag("row_action_restore") and hasAnyAncestor(row("Once")))
        compose.waitUntil(60_000) { stored(uid, "once").getString("status") == "active" }
        tab("active")
        press(hasTestTag("row_menu") and hasAnyAncestor(row("Once")))
        press(hasTestTag("menu_action_delete"))
        compose.waitUntil(60_000) { stored(uid, "once").let { it.getString("status") == "deleted" && it.getTimestamp("deletedAt") != null } }

        // The screen: out of the trash, back into it, and out of it for good after the question. Each
        // action closes the screen, and the list is back at the tab it was on.
        tab("deleted")
        open("Once")
        press(hasTestTag("action_restore"))
        waitFor("home")
        compose.onNodeWithTag("tab_deleted").assertIsSelected()
        compose.waitUntil(60_000) { stored(uid, "once").let { it.getString("status") == "active" && it.get("deletedAt") == null } }
        tab("active")
        open("Once")
        press(hasTestTag("action_delete"))
        waitFor("home")
        compose.waitUntil(60_000) { stored(uid, "once").getString("status") == "deleted" }
        tab("deleted")
        open("Once")
        press(hasTestTag("action_delete_forever"))
        press(hasText("Cancel"))
        assertTrue(stored(uid, "once").exists())
        press(hasTestTag("action_delete_forever"))
        press(hasTestTag("delete_forever_confirm"))
        waitFor("home")
        compose.waitUntil(60_000) { !stored(uid, "once").exists() }
        // The menu of a row asks too.
        press(hasTestTag("row_menu") and hasAnyAncestor(row("Trashed")))
        press(hasTestTag("menu_action_delete_forever"))
        press(hasTestTag("delete_forever_confirm"))
        compose.waitUntil(60_000) { !stored(uid, "trashed").exists() }

        // "Done" on the screen of a repeating task moves its due on and closes the screen.
        tab("active")
        open("Daily")
        val before = Instant.now()
        press(hasTestTag("action_done"))
        val after = Instant.now()
        waitFor("home")
        val expected = setOf(before, after).map { nextFutureOccurrence("2026-10-01T09:30", here, Repeat(1, RepeatUnit.DAYS), it) }
        compose.waitUntil(60_000) { (stored(uid, "daily").get("due") as Map<*, *>)["local"] != "2026-10-01T09:30" }
        val daily = stored(uid, "daily")
        assertTrue((daily.get("due") as Map<*, *>)["local"] in expected)
        assertEquals("active", daily.getString("status"))
        assertEquals(false, daily.getBoolean("pulseMuted"))
        // "Finish series" ends it.
        open("Daily")
        press(hasTestTag("action_finish_series"))
        waitFor("home")
        compose.waitUntil(60_000) { stored(uid, "daily").getString("status") == "done" }
    }

    @Test
    fun aTickedItemIsWrittenAndAChangeOfTheWebShowsLive() {
        val uid = account { uid -> task(uid, "t1", "Shopping", description = "Buy:\n- [ ] milk\n- [ ] bread") }
        open("Shopping")
        waitForCheckboxes(listOf(ToggleableState.Off, ToggleableState.Off))

        compose.onAllNodesWithTag("checkbox")[0].performSemanticsAction(SemanticsActions.OnClick)
        compose.waitUntil(60_000) { stored(uid, "t1").getString("description") == "Buy:\n- [x] milk\n- [ ] bread" }
        waitForCheckboxes(listOf(ToggleableState.On, ToggleableState.Off))

        // The web ticks the other one: the open screen follows.
        runBlocking { web.db.document("users/$uid/tasks/t1").update(mapOf("description" to "Buy:\n- [x] milk\n- [x] bread", "updatedAt" to FieldValue.serverTimestamp())).await() }
        waitForCheckboxes(listOf(ToggleableState.On, ToggleableState.On))
    }

    @Test
    fun aTaskDeletedForeverElsewhereClosesItsScreenWithAMessage() {
        val uid = account { uid -> task(uid, "t1", "Old note", status = "deleted") }
        tab("deleted")
        open("Old note")
        runBlocking { web.db.document("users/$uid/tasks/t1").delete().await() }
        waitFor("home")
        waitForText("The task is no longer here.")
    }

    @Test
    fun aChangeTheCoreRefusesIsNotSentAndTheListSaysSo() {
        // "Done" would move this daily task into the year 10000, which the contract has no room for.
        val uid = account { uid -> task(uid, "t1", "Last day", due = Due("9999-12-31T23:00", here), repeat = mapOf("every" to 1, "unit" to "days")) }
        open("Last day")
        press(hasTestTag("action_done"))
        waitFor("home")
        waitForText("The change could not be saved.")
        assertEquals("9999-12-31T23:00", (stored(uid, "t1").get("due") as Map<*, *>)["local"])
    }

    @Test
    fun theMenuOfARowStaysWithItsTaskWhenTheListMovesUnderIt() {
        val uid = account { uid ->
            task(uid, "b", "B task")
            task(uid, "c", "C task")
        }
        press(hasTestTag("row_menu") and hasAnyAncestor(row("C task")))
        waitFor("menu_action_delete")
        // Another device adds a task that comes first: the rows below move down one place.
        runBlocking { task(uid, "a", "A task") }
        compose.waitUntil(60_000) { compose.onAllNodes(row("A task")).fetchSemanticsNodes().isNotEmpty() }
        press(hasTestTag("menu_action_delete"))
        compose.waitUntil(60_000) { stored(uid, "c").getString("status") == "deleted" }
        assertEquals("active", stored(uid, "b").getString("status"))
        assertEquals("active", stored(uid, "a").getString("status"))

        // A menu whose task leaves the tab goes with it, and does not open again when the task comes back.
        press(hasTestTag("row_menu") and hasAnyAncestor(row("B task")))
        waitFor("menu_action_delete")
        val b = web.db.document("users/$uid/tasks/b")
        runBlocking { b.update(mapOf("status" to "done", "updatedAt" to FieldValue.serverTimestamp())).await() }
        compose.waitUntil(60_000) { compose.onAllNodes(row("B task")).fetchSemanticsNodes().isEmpty() }
        runBlocking { b.update(mapOf("status" to "active", "updatedAt" to FieldValue.serverTimestamp())).await() }
        compose.waitUntil(60_000) { compose.onAllNodes(row("B task")).fetchSemanticsNodes().isNotEmpty() }
        compose.onAllNodesWithTag("menu_action_delete").assertCountEquals(0)
    }

    @Test
    fun theTaskSpeaksTheLanguageOfTheAccountInItsTheme() {
        account(defaultSettings("uk").copy(themeMode = ThemeMode.DARK)) { uid ->
            task(
                uid, "t1", "Купити хліб",
                due = Due("2026-10-01T09:30", here),
                reminders = listOf(60, 10080),
                repeat = mapOf("every" to 3, "unit" to "days"),
                description = "- [x] житній\n- [ ] білий",
            )
        }
        compose.waitUntil(60_000) { darkScreen() }
        open("Купити хліб")
        compose.onNodeWithTag("status").assertTextEquals("Активне")
        compose.onNodeWithText("Прострочено").assertExists()
        assertEquals(
            listOf("За 1 годину", "За 1 тиждень"),
            compose.onAllNodesWithTag("reminder").fetchSemanticsNodes().map { it.config[SemanticsProperties.Text].joinToString() },
        )
        compose.onNodeWithTag("repeat").assertTextEquals("Кожні 3 дні")
        waitForCheckboxes(listOf(ToggleableState.On, ToggleableState.Off))
        compose.onNodeWithTag("action_done").assertTextEquals("Позначити як готове")
        screenshot("task-uk-dark")
    }
}
````

`MarkdownOnDeviceTest` разбирает на устройстве описания, на которых регулярные выражения Android могли бы разойтись с JDK (буквы других алфавитов, эмодзи, адреса в тексте, экранирование), и ждёт те же блоки, что дают тесты JVM и веб.

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/MarkdownOnDeviceTest.kt`:

````kotlin
package com.pmobile78.todoround

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.markdown.Block.Paragraph
import com.pmobile78.todoround.core.markdown.Block.TaskList
import com.pmobile78.todoround.core.markdown.Inline.Break
import com.pmobile78.todoround.core.markdown.Inline.Text
import com.pmobile78.todoround.core.markdown.TaskItem
import com.pmobile78.todoround.core.markdown.parseMarkdown
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The rules of the core with the regular expressions of Android, which are not those of the JDK the
 * JVM tests run on: the same descriptions give the blocks they give there and on the web.
 */
@RunWith(AndroidJUnit4::class)
class MarkdownOnDeviceTest {
    @Test
    fun emphasisFindsTheLettersAndSignsOfAnyAlphabet() {
        assertEquals(
            listOf(
                Paragraph(
                    listOf(
                        Text("«лапки»", bold = true), Text(", "), Text("é", italic = true), Text(" and "),
                        Text("x", italic = true), Text(" in snake_case_word, "), Text("both", bold = true, italic = true),
                        Text(" and "), Text("a ", bold = true), Text("b", bold = true, italic = true), Text(" c", bold = true),
                    ),
                ),
            ),
            parseMarkdown("**«лапки»**, *é* and _x_ in snake_case_word, ***both*** and **a *b* c**"),
        )
        assertEquals(
            listOf(
                Paragraph(
                    listOf(
                        Text("😀"), Text("a", italic = true), Text("😀 "), Text("é", italic = true), Text(" "),
                        Text("é", bold = true), Text("! a"), Text("b", bold = true), Text("c"),
                    ),
                ),
            ),
            parseMarkdown("😀*a*😀 _é_ **é**! a**b**c"),
        )
    }

    @Test
    fun escapesStrikesAndCode() {
        assertEquals(
            listOf(
                Paragraph(
                    listOf(
                        Text("foo"), Text("bar", italic = true), Text(" *escaped* "), Text("gone", strike = true), Text(" "),
                        Text("one", strike = true), Text(" "), Text("a ``b`` c", code = true), Text(" "), Text("a`b", code = true),
                    ),
                ),
            ),
            parseMarkdown("foo*bar* \\*escaped\\* ~~gone~~ ~one~ `a ``b`` c` ``a`b``"),
        )
    }

    @Test
    fun linksAndTheAddressesInText() {
        assertEquals(
            listOf(
                Paragraph(
                    listOf(
                        Text("x", link = "https://e.com/(y)"), Text(" "), Text("r", link = "https://ex.com/r"), Text(" "),
                        Text("https://a.b", link = "https://a.b"), Text(" "), Text("me@ex.org", link = "mailto:me@ex.org"), Text(" "),
                        Text("www.example.com/path", link = "http://www.example.com/path"), Text(". "),
                        Text("https://ex.com/q?a=1&b=2", link = "https://ex.com/q?a=1&b=2"), Text(") "),
                        Text("mail@ex.com", link = "mailto:mail@ex.com"),
                    ),
                ),
            ),
            parseMarkdown(
                "[x](https://e.com/(y)) [r][ref] <https://a.b> <me@ex.org> www.example.com/path. " +
                    "https://ex.com/q?a=1&b=2) mail@ex.com\n\n[ref]: https://ex.com/r \"title\"",
            ),
        )
    }

    @Test
    fun breaksAndRawHtmlAsItsText() {
        assertEquals(
            listOf(Paragraph(listOf(Text("line"), Break, Text("next"), Break, Text("last <b>raw</b> & # &copy;")))),
            parseMarkdown("line  \nnext\\\nlast <b>raw</b> &amp; &#35; &copy;"),
        )
    }

    @Test
    fun theMarksOfAChecklistAfterATableAndEmoji() {
        assertEquals(
            listOf(
                Paragraph(listOf(Text("| a | b |\n|---|:-:|\n| 1 | 2 |"))),
                TaskList(
                    listOf(
                        TaskItem(checked = false, mark = 34, blocks = listOf(Paragraph(listOf(Text("✅ emoji 😀"))))),
                        TaskItem(checked = true, mark = 51, blocks = listOf(Paragraph(listOf(Text("done", bold = true))))),
                    ),
                ),
            ),
            parseMarkdown("| a | b |\n|---|:-:|\n| 1 | 2 |\n\n- [ ] ✅ emoji 😀\n- [x] **done**"),
        )
    }
}
````

`HomeScreenTest` получает часы теста (мелочь № 1 ревью 2.1): срок через 30 секунд, часы переводятся за него, `mainClock` — на 31 секунду вперёд, и в начале минуты задача уходит из «Запланированных» с отметкой «Overdue».

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt
index fdeab46..badbd4b 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt
@@ -6,6 +6,10 @@ import androidx.compose.ui.test.onAllNodesWithText
 import androidx.compose.ui.test.onNodeWithTag
 import androidx.compose.ui.test.onNodeWithText
 import androidx.test.ext.junit.runners.AndroidJUnit4
+import com.pmobile78.todoround.core.contract.TaskStatus
+import com.pmobile78.todoround.core.contract.deviceTimeZone
+import com.pmobile78.todoround.core.model.Due
+import com.pmobile78.todoround.core.model.Task
 import com.pmobile78.todoround.core.model.defaultSettings
 import com.pmobile78.todoround.data.Loaded
 import com.pmobile78.todoround.ui.HomeScreen
@@ -16,6 +20,11 @@ import kotlinx.coroutines.flow.flowOf
 import org.junit.Rule
 import org.junit.Test
 import org.junit.runner.RunWith
+import java.time.Clock
+import java.time.Instant
+import java.time.LocalDateTime
+import java.time.ZoneId
+import java.time.ZoneOffset
 
 /** The states of the screen that the data of the emulators do not bring about. */
 @RunWith(AndroidJUnit4::class)
@@ -45,4 +54,42 @@ class HomeScreenTest {
         compose.waitUntil(10_000) { compose.onAllNodesWithText("The change could not be saved.").fetchSemanticsNodes().isNotEmpty() }
         compose.onNodeWithText("The change could not be saved.").assertExists()
     }
+
+    @Test
+    fun aDueThatPassesWhileTheListIsShownIsOverdueAtTheNextMinute() {
+        val due = Due("2026-10-24T12:01", deviceTimeZone())
+        val dueMoment = LocalDateTime.parse(due.local).atZone(ZoneId.of(due.tz)).toInstant()
+        val clock = TestClock(dueMoment.minusSeconds(30))
+        val created = Instant.parse("2026-10-24T09:00:00Z")
+        val task = Task(
+            id = "t1", title = "Call the bank", description = "", categoryId = null, status = TaskStatus.ACTIVE,
+            due = due, reminders = emptyList(), repeat = null, radius = 30, pulseMuted = false,
+            createdAt = created, updatedAt = created, deletedAt = null,
+        )
+        compose.setContent {
+            ToDoRoundTheme {
+                HomeScreen(
+                    Session.SignedIn("olena@example.com", data.copy(tasks = Loaded(listOf(task), 0, false))),
+                    onSignOut = {},
+                    clock = clock,
+                )
+            }
+        }
+        compose.onNodeWithTag("tab_planned").assertTextEquals("Planned Tasks (1)")
+        compose.onNodeWithText("Overdue").assertDoesNotExist()
+
+        clock.now = dueMoment.plusSeconds(1)
+        compose.mainClock.advanceTimeBy(31_000)
+        compose.onNodeWithTag("tab_planned").assertTextEquals("Planned Tasks (0)")
+        compose.onNodeWithText("Overdue").assertExists()
+    }
+
+    // The time the screen reads; the test moves it.
+    private class TestClock(var now: Instant) : Clock() {
+        override fun instant(): Instant = now
+
+        override fun getZone(): ZoneId = ZoneOffset.UTC
+
+        override fun withZone(zone: ZoneId): Clock = this
+    }
 }
````

- [ ] **Step 2: Тесты падают**

Run: `android/gradlew -p android --no-daemon :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/RemindersTest.kt:13:22 Unresolved reference 'ReminderParts'.`

Run: `android/gradlew -p android --no-daemon :app:compileDebugAndroidTestKotlin -Ptodoround.emulators=true`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugAndroidTestKotlin'`; первая ошибка — `e: …/HomeScreenTest.kt:74:21 No parameter with name 'clock' found.`

- [ ] **Step 3: Напоминания в ядре**

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Reminders.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import java.time.Duration
import java.time.Instant

/*
 * The reminders of a task as the web shows them (src/utils/reminders.js, ReminderEditor.jsx):
 * minutes before the due, in their largest whole unit, the past ones struck through.
 */

enum class ReminderUnit { HOURS, DAYS, WEEKS }

/** A reminder in its largest whole unit: 2880 minutes are 2 days (reminderParts of the web). */
data class ReminderParts(val count: Int, val unit: ReminderUnit)

fun reminderParts(minutes: Int): ReminderParts = when {
    minutes % WEEK_MINUTES == 0 -> ReminderParts(minutes / WEEK_MINUTES, ReminderUnit.WEEKS)
    minutes % DAY_MINUTES == 0 -> ReminderParts(minutes / DAY_MINUTES, ReminderUnit.DAYS)
    else -> ReminderParts(minutes / HOUR_MINUTES, ReminderUnit.HOURS)
}

/** Whether the moment of the reminder [minutes] before [due] has passed at [now]; [zone] is the zone of the phone. */
fun reminderPassed(minutes: Int, due: Due, zone: String, now: Instant): Boolean =
    now > dueMoment(due, zone).minus(Duration.ofMinutes(minutes.toLong()))

private const val HOUR_MINUTES = 60
private const val DAY_MINUTES = 1440
private const val WEEK_MINUTES = 10080
````

- [ ] **Step 4: Значки**

Значки Material (Apache License 2.0) — векторами, как значки 2.1.

Файл `android/app/src/main/res/drawable/ic_arrow_back.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Arrow back" of the Material icons (Apache License 2.0): back from the screen of a task. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M20,11H7.83l5.59,-5.59L12,4l-8,8 8,8 1.41,-1.41L7.83,13H20v-2z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_delete_forever.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Delete forever" of the Material icons (Apache License 2.0): a task out of the trash for good. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2L18,7L6,7v12zM8.46,11.88l1.41,-1.41L12,12.59l2.12,-2.12 1.41,1.41L13.41,14l2.12,2.12 -1.41,1.41L12,15.41l-2.12,2.12 -1.41,-1.41L10.59,14l-2.13,-2.12zM15.5,4l-1,-1h-5l-1,1L5,4v2h14L19,4z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_done_all.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Done all" of the Material icons (Apache License 2.0): the end of a series of repeats. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M18,7l-1.41,-1.41 -6.34,6.34 1.41,1.41L18,7zM22.24,5.59L11.66,16.17 7.48,12l-1.41,1.41L11.66,19l12,-12 -1.42,-1.41zM0.41,13.41L6,19l1.41,-1.41L1.83,12 0.41,13.41z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_notifications.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Notifications" of the Material icons (Apache License 2.0): a reminder of a task. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.89,2 2,2zM18,16v-5c0,-3.07 -1.64,-5.64 -4.5,-6.32L13.5,4c0,-0.83 -0.67,-1.5 -1.5,-1.5s-1.5,0.67 -1.5,1.5v0.68C7.63,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_repeat.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Repeat" of the Material icons (Apache License 2.0): the repeat of a task. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M7,7h10v3l4,-4 -4,-4v3L5,5v6h2L7,7zM17,17L7,17v-3l-4,4 4,4v-3h12v-6h-2v4z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_restore.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Restore" of the Material icons (Apache License 2.0): a task back from done or from the trash. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M13,3c-4.97,0 -9,4.03 -9,9L1,12l3.89,3.89 0.07,0.14L9,12L6,12c0,-3.87 3.13,-7 7,-7s7,3.13 7,7 -3.13,7 -7,7c-1.93,0 -3.68,-0.79 -4.94,-2.06l-1.42,1.42C8.27,19.99 10.51,21 13,21c4.97,0 9,-4.03 9,-9s-4.03,-9 -9,-9zM12,8v5l4.28,2.54 0.72,-1.21 -3.5,-2.08L13.5,8L12,8z" />
</vector>
````

- [ ] **Step 5: Тексты**

Тексты — веба (`src/locales/*/translation.json`), со словом «задача» вместо «пузыря» (решение 23): «Mark as Done», «Finish series», «Delete Task», «Restore Task», «Delete Forever», подсказка повторяющейся задачи под кнопками, напоминания «1 hour before», повтор «Every 2 weeks: MON, FRI». Вопроса «Удалить навсегда?» в вебе нет — его текст свой. Множественные числа украинского — `one`, `few`, `many`, `other`.

Изменения в `android/app/src/main/res/values/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values/strings.xml b/android/app/src/main/res/values/strings.xml
index f7df7e1..0994a07 100644
--- a/android/app/src/main/res/values/strings.xml
+++ b/android/app/src/main/res/values/strings.xml
@@ -67,4 +67,57 @@
     <string name="list_offline">No connection to the server: these are the data saved on this device.</string>
     <string name="list_failed">The data could not be read. Sign out and sign in again.</string>
     <string name="write_failed">The change could not be saved.</string>
+
+    <!-- The screen of a task and the actions of its status (stage 2 spec, section 7), the web's texts with "task" for "bubble". -->
+    <string name="task_title">Task</string>
+    <string name="task_back">Back</string>
+    <string name="task_status_active">Active</string>
+    <string name="task_status_done">Completed</string>
+    <string name="task_status_deleted">Deleted</string>
+    <string name="task_done">Mark as Done</string>
+    <string name="task_finish_series">Finish series</string>
+    <string name="task_delete">Delete Task</string>
+    <string name="task_restore">Restore Task</string>
+    <string name="task_delete_forever">Delete Forever</string>
+    <string name="task_delete_forever_confirm">Delete forever?</string>
+    <string name="task_delete_forever_message">The task will be deleted, and it cannot be restored.</string>
+    <string name="task_repeat_actions_hint">“Mark as Done” moves the due date to the next time; “Finish series” ends the repeats.</string>
+    <string name="task_actions">Actions</string>
+    <string name="task_gone">The task is no longer here.</string>
+    <plurals name="task_reminder_hours">
+        <item quantity="one">%d hour before</item>
+        <item quantity="other">%d hours before</item>
+    </plurals>
+    <plurals name="task_reminder_days">
+        <item quantity="one">%d day before</item>
+        <item quantity="other">%d days before</item>
+    </plurals>
+    <plurals name="task_reminder_weeks">
+        <item quantity="one">%d week before</item>
+        <item quantity="other">%d weeks before</item>
+    </plurals>
+    <plurals name="task_repeat_hours">
+        <item quantity="one">Every %d hour</item>
+        <item quantity="other">Every %d hours</item>
+    </plurals>
+    <plurals name="task_repeat_days">
+        <item quantity="one">Every %d day</item>
+        <item quantity="other">Every %d days</item>
+    </plurals>
+    <plurals name="task_repeat_weeks">
+        <item quantity="one">Every %d week</item>
+        <item quantity="other">Every %d weeks</item>
+    </plurals>
+    <plurals name="task_repeat_months">
+        <item quantity="one">Every %d month</item>
+        <item quantity="other">Every %d months</item>
+    </plurals>
+    <string name="task_repeat_on">%1$s: %2$s</string>
+    <string name="task_monday">MON</string>
+    <string name="task_tuesday">TUE</string>
+    <string name="task_wednesday">WED</string>
+    <string name="task_thursday">THU</string>
+    <string name="task_friday">FRI</string>
+    <string name="task_saturday">SAT</string>
+    <string name="task_sunday">SUN</string>
 </resources>
````

Изменения в `android/app/src/main/res/values-uk/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values-uk/strings.xml b/android/app/src/main/res/values-uk/strings.xml
index 76fd415..edfc2ba 100644
--- a/android/app/src/main/res/values-uk/strings.xml
+++ b/android/app/src/main/res/values-uk/strings.xml
@@ -64,4 +64,70 @@
     <string name="list_offline">Немає зв’язку із сервером: це дані, збережені на цьому пристрої.</string>
     <string name="list_failed">Не вдалося прочитати дані. Вийдіть і увійдіть знову.</string>
     <string name="write_failed">Не вдалося зберегти зміну.</string>
+
+    <string name="task_title">Завдання</string>
+    <string name="task_back">Назад</string>
+    <string name="task_status_active">Активне</string>
+    <string name="task_status_done">Завершене</string>
+    <string name="task_status_deleted">Видалене</string>
+    <string name="task_done">Позначити як готове</string>
+    <string name="task_finish_series">Завершити серію</string>
+    <string name="task_delete">Видалити завдання</string>
+    <string name="task_restore">Відновити завдання</string>
+    <string name="task_delete_forever">Видалити назавжди</string>
+    <string name="task_delete_forever_confirm">Видалити назавжди?</string>
+    <string name="task_delete_forever_message">Завдання буде видалено, і відновити його не можна.</string>
+    <string name="task_repeat_actions_hint">«Позначити як готове» переносить термін на наступний раз, «Завершити серію» зупиняє повтори.</string>
+    <string name="task_actions">Дії</string>
+    <string name="task_gone">Цього завдання більше немає.</string>
+    <plurals name="task_reminder_hours">
+        <item quantity="one">За %d годину</item>
+        <item quantity="few">За %d години</item>
+        <item quantity="many">За %d годин</item>
+        <item quantity="other">За %d години</item>
+    </plurals>
+    <plurals name="task_reminder_days">
+        <item quantity="one">За %d день</item>
+        <item quantity="few">За %d дні</item>
+        <item quantity="many">За %d днів</item>
+        <item quantity="other">За %d дня</item>
+    </plurals>
+    <plurals name="task_reminder_weeks">
+        <item quantity="one">За %d тиждень</item>
+        <item quantity="few">За %d тижні</item>
+        <item quantity="many">За %d тижнів</item>
+        <item quantity="other">За %d тижня</item>
+    </plurals>
+    <plurals name="task_repeat_hours">
+        <item quantity="one">Кожну %d годину</item>
+        <item quantity="few">Кожні %d години</item>
+        <item quantity="many">Кожні %d годин</item>
+        <item quantity="other">Кожні %d години</item>
+    </plurals>
+    <plurals name="task_repeat_days">
+        <item quantity="one">Кожен %d день</item>
+        <item quantity="few">Кожні %d дні</item>
+        <item quantity="many">Кожні %d днів</item>
+        <item quantity="other">Кожні %d дня</item>
+    </plurals>
+    <plurals name="task_repeat_weeks">
+        <item quantity="one">Кожен %d тиждень</item>
+        <item quantity="few">Кожні %d тижні</item>
+        <item quantity="many">Кожні %d тижнів</item>
+        <item quantity="other">Кожні %d тижня</item>
+    </plurals>
+    <plurals name="task_repeat_months">
+        <item quantity="one">Кожен %d місяць</item>
+        <item quantity="few">Кожні %d місяці</item>
+        <item quantity="many">Кожні %d місяців</item>
+        <item quantity="other">Кожні %d місяця</item>
+    </plurals>
+    <string name="task_repeat_on">%1$s: %2$s</string>
+    <string name="task_monday">ПН</string>
+    <string name="task_tuesday">ВТ</string>
+    <string name="task_wednesday">СР</string>
+    <string name="task_thursday">ЧТ</string>
+    <string name="task_friday">ПТ</string>
+    <string name="task_saturday">СБ</string>
+    <string name="task_sunday">НД</string>
 </resources>
````

- [ ] **Step 6: Экран задачи, строка и переход**

- `Clock.kt` — «сейчас» из `HomeScreen.kt` 2.1, но по часам `java.time.Clock` и только пока экран запущен (`repeatOnLifecycle(STARTED)`: `delay` не считает время сна, а остановленный экран не тикает); при возвращении «сейчас» берётся заново. `repeatOnLifecycle` запускает работу в контексте вызова, поэтому в тестах её задержки двигает `mainClock`.
- `TaskParts.kt` — части, которые строка и экран показывают одинаково: значок статуса, срок с «Overdue», категория (у удалённой — серое «No Tag»), даты (из `HomeScreen.kt`), а также тексты, значки и теги действий.
- `MarkdownView.kt` — блоки ядра на Compose: заголовки, абзацы, цитаты, списки с маркерами веба (буквы и римские числа — по `type`), чек-листы с квадратиками, код с прокруткой, разделитель; ссылка открывается в браузере, если `isSafeLink`. Квадратик пункта, которого нельзя отметить (`mark < 0`), виден, но не нажимается.
- `TaskScreen.kt` — задача из живого списка по id. Если её нет в данных с сервера — `onGone`; в данных из кэша её может ещё не быть (этап 3 откроет экран по уведомлению сразу после запуска приложения) — тогда экран ждёт данных с сервера. Описание разбирается на `Dispatchers.Default` (на некоторых текстах разбор долог, раздел «Задача 2»), исключение разбора показывает описание текстом. Кнопки — действия по статусу: первая — заполненная, «Удалить» и «Удалить навсегда» — красные; «Удалить навсегда» спрашивает; после действия экран закрывается. «Изменить» придёт с формой в 2.3.
- `HomeScreen.kt` — касание строки открывает задачу, кнопка строки — первое действие статуса, «⋮» — меню с остальными (решение 10). Какое меню открыто и о какой задаче вопрос «Удалить навсегда», хранит список — по id задачи (`rememberSaveable` внутри `key(tab, sort, query)` 2.1): строки по-прежнему без ключей, и открытое меню при сдвиге списка остаётся у своей задачи; меню и вопрос задачи, которая ушла из вкладки, закрываются и не открываются снова, когда она вернётся. Сообщение «The task is no longer here.» приходит из `taskGone`.
- `MainActivity.kt` — id открытой задачи в `rememberSaveable` (переживает поворот и выгрузку приложения), экран задачи вместо списка, канал «задачи больше нет» с `CONFLATED`; список — внутри `rememberSaveableStateHolder().SaveableStateProvider("list")`, поэтому после экрана задачи у него та же вкладка, тот же поиск и то же место. Действие экрана задачи выполняется, когда список уже вернулся: отказ ядра приходит сразу, и его сообщение иначе забрал бы экран, который в тот же миг закрывается.

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/Clock.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay
import java.time.Clock
import java.time.Instant

/**
 * Now, as [clock] tells it, taken again at every full minute while the screen is shown and each
 * time it comes back (stage 2 spec, 2.2 №9): delay does not count the time the phone sleeps, and a
 * stopped screen does not tick. The tests give a clock of their own.
 */
@Composable
fun currentMinute(clock: Clock): Instant {
    var now by remember(clock) { mutableStateOf(clock.instant()) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(lifecycle, clock) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) {
                now = clock.instant()
                delay(MINUTE_MS - clock.millis() % MINUTE_MS)
            }
        }
    }
    return now
}

private const val MINUTE_MS = 60_000L
````

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskParts.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.TaskAction
import com.pmobile78.todoround.core.model.dueView
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.ui.theme.DoneGreen
import java.time.Instant

/*
 * The parts the row of the list and the screen of a task show alike: the icon of the status, the
 * due with "Overdue", the category, the times, and the actions with their texts and icons.
 */

@Composable
internal fun StatusIcon(status: TaskStatus) {
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

/** The due in [zone], the zone of the phone, red and with "Overdue" once passed at [now]. */
@Composable
internal fun DueLine(due: Due, language: Language, zone: String, now: Instant) {
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

/** The category of a task, or the grey "No Tag" of the web when its category is gone. */
@Composable
internal fun CategoryChip(categoryId: String?, category: Category?) {
    when {
        category != null -> Chip(category.name, paletteColor(category.color), Color.White)
        categoryId != null -> Chip(
            stringResource(R.string.list_no_category),
            MaterialTheme.colorScheme.surfaceVariant,
            MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
internal fun Time(text: String) {
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

/** A colour of the palette, "#rrggbb". */
internal fun paletteColor(hex: String): Color = Color(0xFF000000 or hex.removePrefix("#").toLong(16))

/** The text of an action: the web's, with "task" for its "bubble" (stage 2 spec, 2.2 №23). */
@get:StringRes
internal val TaskAction.label: Int
    get() = when (this) {
        TaskAction.DONE -> R.string.task_done
        TaskAction.FINISH_SERIES -> R.string.task_finish_series
        TaskAction.DELETE -> R.string.task_delete
        TaskAction.RESTORE -> R.string.task_restore
        TaskAction.DELETE_FOREVER -> R.string.task_delete_forever
    }

@get:DrawableRes
internal val TaskAction.icon: Int
    get() = when (this) {
        TaskAction.DONE -> R.drawable.ic_check_circle
        TaskAction.FINISH_SERIES -> R.drawable.ic_done_all
        TaskAction.DELETE -> R.drawable.ic_delete_outline
        TaskAction.RESTORE -> R.drawable.ic_restore
        TaskAction.DELETE_FOREVER -> R.drawable.ic_delete_forever
    }

/** The test tag of an action: "action_done", "action_finish_series" … */
internal val TaskAction.tag: String
    get() = "action_" + name.lowercase()
````

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/MarkdownView.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.core.markdown.Block
import com.pmobile78.todoround.core.markdown.Inline
import com.pmobile78.todoround.core.markdown.TaskItem
import com.pmobile78.todoround.core.markdown.isSafeLink

/**
 * A description as the web shows it (stage 2 spec, 2.2 №1): the blocks of the core with the styles
 * of Material 3. A checkbox changes its item through [onToggle] (2.2 №2); a link opens in the
 * browser when its address is http, https or mailto, and is plain text otherwise.
 */
@Composable
fun MarkdownView(blocks: List<Block>, onToggle: (TaskItem) -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        blocks.forEach { MarkdownBlock(it, onToggle) }
    }
}

@Composable
private fun MarkdownBlock(block: Block, onToggle: (TaskItem) -> Unit) {
    when (block) {
        is Block.Paragraph -> if (block.content.isEmpty()) {
            // An empty paragraph of the web: a line of space.
            Spacer(Modifier.height(16.dp))
        } else {
            Text(annotated(block.content), style = MaterialTheme.typography.bodyLarge)
        }
        is Block.Heading -> Text(annotated(block.content), style = headingStyle(block.level))
        is Block.Quote -> Row(Modifier.height(IntrinsicSize.Min)) {
            Box(
                Modifier
                    .width(3.dp)
                    .fillMaxHeight()
                    .background(MaterialTheme.colorScheme.outlineVariant),
            )
            MarkdownView(block.blocks, onToggle, Modifier.padding(start = 12.dp))
        }
        is Block.BulletList -> ListItems(block.items.map { "•" to it }, onToggle)
        is Block.OrderedList -> ListItems(block.items.mapIndexed { i, item -> "${listMarker(block.type, block.start + i)}." to item }, onToggle)
        is Block.TaskList -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            block.items.forEach { item ->
                Row(verticalAlignment = Alignment.Top) {
                    // A mark the description no longer has at its place shows, and does not change.
                    Checkbox(
                        checked = item.checked,
                        onCheckedChange = if (item.mark >= 0) ({ onToggle(item) }) else null,
                        enabled = item.mark >= 0,
                        modifier = Modifier.testTag("checkbox"),
                    )
                    MarkdownView(item.blocks, onToggle, Modifier.padding(top = 12.dp))
                }
            }
        }
        is Block.CodeBlock -> Text(
            text = block.text,
            style = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
            softWrap = false,
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(4.dp))
                .horizontalScroll(rememberScrollState())
                .padding(8.dp),
        )
        Block.Rule -> HorizontalDivider(Modifier.padding(vertical = 8.dp))
    }
}

// The items of a list, each after its [marker], their blocks lined up.
@Composable
private fun ListItems(items: List<Pair<String, List<Block>>>, onToggle: (TaskItem) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        items.forEach { (marker, blocks) ->
            Row {
                Text(marker, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.width(32.dp))
                MarkdownView(blocks, onToggle)
            }
        }
    }
}

@Composable
private fun headingStyle(level: Int): TextStyle = when (level) {
    1 -> MaterialTheme.typography.headlineSmall
    2 -> MaterialTheme.typography.titleLarge
    3 -> MaterialTheme.typography.titleMedium
    4 -> MaterialTheme.typography.titleSmall
    else -> MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold)
}

// The marker of an ordered list as the browser writes it for the type of the web's <ol>.
private fun listMarker(type: String?, number: Int): String = when (type) {
    "a" -> alpha(number)
    "A" -> alpha(number).uppercase()
    "i" -> roman(number)
    "I" -> roman(number).uppercase()
    else -> number.toString()
}

private fun alpha(number: Int): String {
    var n = number
    val letters = StringBuilder()
    while (n > 0) {
        n--
        letters.insert(0, 'a' + n % 26)
        n /= 26
    }
    return letters.toString()
}

private fun roman(number: Int): String {
    var n = number
    val result = StringBuilder()
    for ((value, numeral) in ROMAN) {
        while (n >= value) {
            result.append(numeral)
            n -= value
        }
    }
    return result.toString()
}

private val ROMAN = listOf(
    1000 to "m", 900 to "cm", 500 to "d", 400 to "cd", 100 to "c", 90 to "xc",
    50 to "l", 40 to "xl", 10 to "x", 9 to "ix", 5 to "v", 4 to "iv", 1 to "i",
)

@Composable
private fun annotated(content: List<Inline>): AnnotatedString {
    val linkStyles = TextLinkStyles(SpanStyle(color = MaterialTheme.colorScheme.primary, textDecoration = TextDecoration.Underline))
    val codeBackground = MaterialTheme.colorScheme.surfaceVariant
    return buildAnnotatedString {
        content.forEach { inline ->
            when (inline) {
                Inline.Break -> append('\n')
                is Inline.Text -> {
                    val style = SpanStyle(
                        fontWeight = if (inline.bold) FontWeight.Bold else null,
                        fontStyle = if (inline.italic) FontStyle.Italic else null,
                        textDecoration = if (inline.strike) TextDecoration.LineThrough else null,
                        fontFamily = if (inline.code) FontFamily.Monospace else null,
                        background = if (inline.code) codeBackground else Color.Unspecified,
                    )
                    val link = inline.link
                    if (link != null && isSafeLink(link)) {
                        withLink(LinkAnnotation.Url(link, linkStyles)) { withStyle(style) { append(inline.text) } }
                    } else {
                        withStyle(style) { append(inline.text) }
                    }
                }
            }
        }
    }
}
````

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.deviceTimeZone
import com.pmobile78.todoround.core.markdown.Block
import com.pmobile78.todoround.core.markdown.Inline
import com.pmobile78.todoround.core.markdown.TaskItem
import com.pmobile78.todoround.core.markdown.parseMarkdown
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.ReminderUnit
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskAction
import com.pmobile78.todoround.core.model.actions
import com.pmobile78.todoround.core.model.changedAfterCreation
import com.pmobile78.todoround.core.model.listDateTime
import com.pmobile78.todoround.core.model.reminderParts
import com.pmobile78.todoround.core.model.reminderPassed
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.withContext
import java.time.Clock

/**
 * The screen of the task [taskId] (stage 2 spec, section 7): its status, title, due, category,
 * reminders, repeat, description with the formatting and the checkboxes of the web, its times, and
 * the actions of its status (2.2 №12). It follows the data live. An action closes it ([onBack]), as
 * it closes the web's dialog; a task that is no longer there, deleted forever on another device
 * say, closes it through [onGone]. A write the server or the core refused comes out of [writeFailures].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskScreen(
    taskId: String,
    session: Session.SignedIn,
    onBack: () -> Unit,
    onAction: (Task, TaskAction) -> Unit,
    onToggle: (Task, TaskItem) -> Unit,
    onGone: () -> Unit,
    writeFailures: Flow<Unit> = emptyFlow(),
    clock: Clock = Clock.systemUTC(),
) {
    BackHandler(onBack = onBack)
    val snackbars = remember { SnackbarHostState() }
    val notSaved = stringResource(R.string.write_failed)
    LaunchedEffect(writeFailures) {
        writeFailures.collect { snackbars.showSnackbar(notSaved) }
    }
    val data = session.data
    val task = data?.tasks?.items?.firstOrNull { it.id == taskId }
    // Data from the cache may not have the task yet (stage 3 opens it from a notification): only the
    // server's data tell that it is gone.
    if (data != null && task == null && !data.tasks.fromCache) {
        LaunchedEffect(Unit) { onGone() }
    }
    Scaffold(
        modifier = Modifier.testTag("task_screen"),
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.task_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("back")) {
                        Icon(painterResource(R.drawable.ic_arrow_back), contentDescription = stringResource(R.string.task_back))
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbars) },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding),
        ) {
            when {
                session.failed -> Text(
                    stringResource(R.string.list_failed),
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp).testTag("failed"),
                )
                task == null -> CircularProgressIndicator(Modifier.align(Alignment.Center).testTag("loading"))
                else -> TaskDetails(
                    task = task,
                    data = data,
                    clock = clock,
                    onAction = { action ->
                        onAction(task, action)
                        onBack()
                    },
                    onToggle = { item -> onToggle(task, item) },
                )
            }
        }
    }
}

@Composable
private fun TaskDetails(task: Task, data: UserData, clock: Clock, onAction: (TaskAction) -> Unit, onToggle: (TaskItem) -> Unit) {
    val zone = deviceTimeZone()
    val now = currentMinute(clock)
    val language = data.settings.language
    val category = task.categoryId?.let { id -> data.categories.items.firstOrNull { it.id == id } }
    var confirmForever by rememberSaveable { mutableStateOf(false) }
    // The description is read away from the main thread: the web's Markdown takes long on a few
    // pathological texts. A parse that fails shows the text as it is.
    val blocks by produceState<List<Block>?>(null, task.description) {
        value = withContext(Dispatchers.Default) {
            runCatching { parseMarkdown(task.description) }.getOrElse { listOf(Block.Paragraph(listOf(Inline.Text(task.description)))) }
        }
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            StatusIcon(task.status)
            Spacer(Modifier.width(8.dp))
            Text(stringResource(task.status.label), style = MaterialTheme.typography.labelLarge, modifier = Modifier.testTag("status"))
        }
        Text(task.title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.testTag("title"))
        task.due?.let { due -> DueLine(due, language, zone, now) }
        CategoryChip(task.categoryId, category)
        val due = task.due
        if (due != null && task.reminders.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                task.reminders.forEach { minutes ->
                    val passed = reminderPassed(minutes, due, zone, now)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(painterResource(R.drawable.ic_notifications), contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            reminderLabel(minutes),
                            style = MaterialTheme.typography.bodyMedium,
                            textDecoration = if (passed) TextDecoration.LineThrough else null,
                            color = if (passed) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.testTag("reminder"),
                        )
                    }
                }
            }
        }
        task.repeat?.let { repeat ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(painterResource(R.drawable.ic_repeat), contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(repeatText(repeat), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.testTag("repeat"))
            }
        }
        blocks?.let { if (task.description.isNotEmpty()) MarkdownView(it, onToggle, Modifier.testTag("description")) }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.testTag("times")) {
            Time(stringResource(R.string.list_created, listDateTime(task.createdAt, zone, language)))
            if (task.changedAfterCreation()) Time(stringResource(R.string.list_updated, listDateTime(task.updatedAt, zone, language)))
            task.deletedAt?.let { Time(stringResource(R.string.list_deleted, listDateTime(it, zone, language))) }
        }
        val actions = task.actions()
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            actions.forEachIndexed { index, action ->
                val click = { if (action == TaskAction.DELETE_FOREVER) confirmForever = true else onAction(action) }
                val content: @Composable () -> Unit = {
                    Icon(painterResource(action.icon), contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(action.label))
                }
                val danger = action == TaskAction.DELETE || action == TaskAction.DELETE_FOREVER
                if (index == 0) {
                    Button(onClick = click, modifier = Modifier.testTag(action.tag)) { content() }
                } else {
                    OutlinedButton(
                        onClick = click,
                        colors = if (danger) ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error) else ButtonDefaults.outlinedButtonColors(),
                        modifier = Modifier.testTag(action.tag),
                    ) { content() }
                }
            }
        }
        // The line of the web's dialog under the buttons of a repeating task.
        if (TaskAction.FINISH_SERIES in actions) {
            Text(
                stringResource(R.string.task_repeat_actions_hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.testTag("repeat_hint"),
            )
        }
    }
    if (confirmForever) {
        DeleteForeverDialog(onConfirm = {
            confirmForever = false
            onAction(TaskAction.DELETE_FOREVER)
        }, onDismiss = { confirmForever = false })
    }
}

/** The question before "Delete forever" (stage 2 spec, 2.2 №12): the web asks none, but the step cannot be undone. */
@Composable
internal fun DeleteForeverDialog(onConfirm: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.task_delete_forever_confirm)) },
        text = { Text(stringResource(R.string.task_delete_forever_message)) },
        confirmButton = {
            TextButton(onClick = onConfirm, modifier = Modifier.testTag("delete_forever_confirm")) {
                Text(stringResource(R.string.task_delete_forever), color = MaterialTheme.colorScheme.error)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        },
    )
}

private val TaskStatus.label: Int
    get() = when (this) {
        TaskStatus.ACTIVE -> R.string.task_status_active
        TaskStatus.DONE -> R.string.task_status_done
        TaskStatus.DELETED -> R.string.task_status_deleted
    }

// "1 hour before", "2 days before": the largest whole unit, as the web writes it.
@Composable
private fun reminderLabel(minutes: Int): String {
    val parts = reminderParts(minutes)
    val plural = when (parts.unit) {
        ReminderUnit.HOURS -> R.plurals.task_reminder_hours
        ReminderUnit.DAYS -> R.plurals.task_reminder_days
        ReminderUnit.WEEKS -> R.plurals.task_reminder_weeks
    }
    return pluralStringResource(plural, parts.count, parts.count)
}

// "Every 2 weeks: MON, FRI".
@Composable
private fun repeatText(repeat: Repeat): String {
    val plural = when (repeat.unit) {
        RepeatUnit.HOURS -> R.plurals.task_repeat_hours
        RepeatUnit.DAYS -> R.plurals.task_repeat_days
        RepeatUnit.WEEKS -> R.plurals.task_repeat_weeks
        RepeatUnit.MONTHS -> R.plurals.task_repeat_months
    }
    val every = pluralStringResource(plural, repeat.every, repeat.every)
    val weekdays = repeat.weekdays.orEmpty()
    if (weekdays.isEmpty()) return every
    val names = weekdays.map { stringResource(WEEKDAYS[it - 1]) }
    return stringResource(R.string.task_repeat_on, every, names.joinToString(", "))
}

private val WEEKDAYS = listOf(
    R.string.task_monday, R.string.task_tuesday, R.string.task_wednesday, R.string.task_thursday,
    R.string.task_friday, R.string.task_saturday, R.string.task_sunday,
)
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
index 0cab23e..55b47b1 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
@@ -3,11 +3,9 @@ package com.pmobile78.todoround.ui
 import androidx.annotation.StringRes
 import androidx.compose.foundation.BorderStroke
 import androidx.compose.foundation.background
-import androidx.compose.foundation.border
 import androidx.compose.foundation.layout.Arrangement
 import androidx.compose.foundation.layout.Box
 import androidx.compose.foundation.layout.Column
-import androidx.compose.foundation.layout.FlowRow
 import androidx.compose.foundation.layout.PaddingValues
 import androidx.compose.foundation.layout.Row
 import androidx.compose.foundation.layout.Spacer
@@ -24,7 +22,6 @@ import androidx.compose.foundation.lazy.rememberLazyListState
 import androidx.compose.foundation.rememberScrollState
 import androidx.compose.foundation.selection.toggleable
 import androidx.compose.foundation.shape.CircleShape
-import androidx.compose.foundation.shape.RoundedCornerShape
 import androidx.compose.foundation.text.KeyboardActions
 import androidx.compose.foundation.text.KeyboardOptions
 import androidx.compose.foundation.verticalScroll
@@ -71,11 +68,9 @@ import androidx.compose.ui.res.stringResource
 import androidx.compose.ui.semantics.Role
 import androidx.compose.ui.semantics.selected
 import androidx.compose.ui.semantics.semantics
-import androidx.compose.ui.text.font.FontWeight
 import androidx.compose.ui.text.input.ImeAction
 import androidx.compose.ui.tooling.preview.Preview
 import androidx.compose.ui.unit.dp
-import androidx.lifecycle.compose.LifecycleStartEffect
 import com.pmobile78.todoround.R
 import com.pmobile78.todoround.core.contract.Language
 import com.pmobile78.todoround.core.contract.SortField
@@ -90,10 +85,11 @@ import com.pmobile78.todoround.core.model.ListTab
 import com.pmobile78.todoround.core.model.SHOW_ALL
 import com.pmobile78.todoround.core.model.SHOW_NONE
 import com.pmobile78.todoround.core.model.Task
+import com.pmobile78.todoround.core.model.TaskAction
+import com.pmobile78.todoround.core.model.actions
 import com.pmobile78.todoround.core.model.changedAfterCreation
 import com.pmobile78.todoround.core.model.chosen
 import com.pmobile78.todoround.core.model.defaultSettings
-import com.pmobile78.todoround.core.model.dueView
 import com.pmobile78.todoround.core.model.filterCounts
 import com.pmobile78.todoround.core.model.hidesSome
 import com.pmobile78.todoround.core.model.inOrder
@@ -108,13 +104,16 @@ import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
 import kotlinx.coroutines.delay
 import kotlinx.coroutines.flow.Flow
 import kotlinx.coroutines.flow.emptyFlow
+import java.time.Clock
 import java.time.Instant
 
 /**
  * The screen of a signed-in user: the top bar with the menu "Logout" and the task list of the web
  * with its tabs, search, sort and category filter (stage 2 spec, section 6). It follows the data
  * live. The sort and the filter are settings of the account, shared with the web: [onSort] and
- * [onFilter] write them, and a write the server refused comes out of [writeFailures].
+ * [onFilter] write them, and a write the server refused comes out of [writeFailures]. A row opens
+ * its task ([onOpen]) and does the actions of its status ([onAction]); [taskGone] tells that the
+ * screen of a task closed because the task is no longer there. [clock] tells the time.
  */
 @OptIn(ExperimentalMaterial3Api::class)
 @Composable
@@ -124,14 +123,22 @@ fun HomeScreen(
     onSort: (ListSort) -> Unit = {},
     onFilter: (ListFilter) -> Unit = {},
     writeFailures: Flow<Unit> = emptyFlow(),
+    onOpen: (String) -> Unit = {},
+    onAction: (Task, TaskAction) -> Unit = { _, _ -> },
+    taskGone: Flow<Unit> = emptyFlow(),
+    clock: Clock = Clock.systemUTC(),
 ) {
     var menu by remember { mutableStateOf(false) }
     var confirmSignOut by rememberSaveable { mutableStateOf(false) }
     val snackbars = remember { SnackbarHostState() }
     val notSaved = stringResource(R.string.write_failed)
+    val gone = stringResource(R.string.task_gone)
     LaunchedEffect(writeFailures) {
         writeFailures.collect { snackbars.showSnackbar(notSaved) }
     }
+    LaunchedEffect(taskGone) {
+        taskGone.collect { snackbars.showSnackbar(gone) }
+    }
     Scaffold(
         modifier = Modifier.testTag("home"),
         topBar = {
@@ -167,7 +174,7 @@ fun HomeScreen(
             when {
                 session.failed -> Note(stringResource(R.string.list_failed), MaterialTheme.colorScheme.error, "failed", Modifier.padding(16.dp))
                 data == null -> CircularProgressIndicator(Modifier.align(Alignment.Center).testTag("loading"))
-                else -> TaskList(data, onSort, onFilter)
+                else -> TaskList(data, onSort, onFilter, onOpen, onAction, clock)
             }
         }
     }
@@ -202,7 +209,14 @@ fun HomeScreen(
  * search follows the field 300 ms after the last key, as on the web (stage 2 spec, 2.2 №6, №8).
  */
 @Composable
-private fun TaskList(data: UserData, onSort: (ListSort) -> Unit, onFilter: (ListFilter) -> Unit) {
+private fun TaskList(
+    data: UserData,
+    onSort: (ListSort) -> Unit,
+    onFilter: (ListFilter) -> Unit,
+    onOpen: (String) -> Unit,
+    onAction: (Task, TaskAction) -> Unit,
+    clock: Clock,
+) {
     val settings = data.settings
     var tab by rememberSaveable { mutableStateOf(ListTab.ACTIVE) }
     var typed by rememberSaveable { mutableStateOf("") }
@@ -213,7 +227,7 @@ private fun TaskList(data: UserData, onSort: (ListSort) -> Unit, onFilter: (List
     }
     var filtering by rememberSaveable { mutableStateOf(false) }
     val zone = deviceTimeZone()
-    val now = currentMinute()
+    val now = currentMinute(clock)
     val categories = remember(data) { inOrder(data.categories.items) }
     val known = remember(categories) { categories.associateBy { it.id } }
     val options = ListOptions(tab, settings.listFilter, settings.listSort, query)
@@ -245,7 +259,7 @@ private fun TaskList(data: UserData, onSort: (ListSort) -> Unit, onFilter: (List
         // change of the data the list keeps its place by position, as the web's list does, and does
         // not follow the row that was first to wherever it moved.
         key(tab, settings.listSort, query) {
-            TaskRows(data, tasks, tab, known, zone, now)
+            TaskRows(data, tasks, tab, known, zone, now, onOpen, onAction)
         }
     }
     if (filtering) {
@@ -254,11 +268,31 @@ private fun TaskList(data: UserData, onSort: (ListSort) -> Unit, onFilter: (List
     }
 }
 
-/** The rows of [tasks] under the notes about the data, the note of the trash and the text of an empty tab. */
+/**
+ * The rows of [tasks] under the notes about the data, the note of the trash and the text of an empty
+ * tab. The rows hold no state of their own: the open menu and the question before "Delete forever"
+ * belong to a task by its id, so neither moves to another task when the data change under them.
+ */
 @Composable
-private fun TaskRows(data: UserData, tasks: List<Task>, tab: ListTab, categories: Map<String, Category>, zone: String, now: Instant) {
+private fun TaskRows(
+    data: UserData,
+    tasks: List<Task>,
+    tab: ListTab,
+    categories: Map<String, Category>,
+    zone: String,
+    now: Instant,
+    onOpen: (String) -> Unit,
+    onAction: (Task, TaskAction) -> Unit,
+) {
     val invalid = data.tasks.invalid + data.categories.invalid
     val offline = data.tasks.fromCache || data.categories.fromCache
+    var menuOf by rememberSaveable { mutableStateOf<String?>(null) }
+    var confirmForeverOf by rememberSaveable { mutableStateOf<String?>(null) }
+    // A menu or a question whose task left the tab goes with it, and does not open again when the task comes back.
+    LaunchedEffect(tasks) {
+        if (tasks.none { it.id == menuOf }) menuOf = null
+        if (tasks.none { it.id == confirmForeverOf }) confirmForeverOf = null
+    }
     LazyColumn(
         state = rememberLazyListState(),
         modifier = Modifier.fillMaxSize(),
@@ -280,33 +314,31 @@ private fun TaskRows(data: UserData, tasks: List<Task>, tab: ListTab, categories
             item { Note(stringResource(tab.empty), MaterialTheme.colorScheme.onSurfaceVariant, "empty") }
         }
         items(tasks) { task ->
-            TaskRow(task, task.categoryId?.let(categories::get), data.settings.language, zone, now)
+            TaskRow(
+                task = task,
+                category = task.categoryId?.let(categories::get),
+                language = data.settings.language,
+                zone = zone,
+                now = now,
+                menuOpen = menuOf == task.id,
+                onMenu = { open -> menuOf = if (open) task.id else null },
+                onOpen = { onOpen(task.id) },
+                onAction = { action -> if (action == TaskAction.DELETE_FOREVER) confirmForeverOf = task.id else onAction(task, action) },
+            )
         }
     }
-}
-
-/**
- * Now, taken again at every full minute while the list is shown (stage 2 spec, 2.2 №9), and when
- * the screen comes back: delay does not count the time the phone sleeps.
- */
-@Composable
-private fun currentMinute(): Instant {
-    var now by remember { mutableStateOf(Instant.now()) }
-    LifecycleStartEffect(Unit) {
-        now = Instant.now()
-        onStopOrDispose {}
-    }
-    LaunchedEffect(Unit) {
-        while (true) {
-            delay(MINUTE_MS - System.currentTimeMillis() % MINUTE_MS)
-            now = Instant.now()
-        }
+    val confirming = confirmForeverOf?.let { id -> tasks.firstOrNull { it.id == id } }
+    if (confirming != null) {
+        DeleteForeverDialog(
+            onConfirm = {
+                confirmForeverOf = null
+                onAction(confirming, TaskAction.DELETE_FOREVER)
+            },
+            onDismiss = { confirmForeverOf = null },
+        )
     }
-    return now
 }
 
-private const val MINUTE_MS = 60_000L
-
 @get:StringRes
 private val ListTab.label: Int
     get() = when (this) {
@@ -498,115 +530,89 @@ private fun FilterRow(checked: Boolean, color: Color, name: String, number: Int,
 /**
  * A task as the web's list shows it: the icon of its status, the title, the due (red and "Overdue"
  * once passed, whatever the status, as on the web), the category, and the times of creation,
- * change and deletion. A done or deleted task is tinted as on the web.
+ * change and deletion. A done or deleted task is tinted as on the web. A tap opens the task; the
+ * button of the row does the first action of its status, and the menu the others (2.2 №10).
  */
 @Composable
-private fun TaskRow(task: Task, category: Category?, language: Language, zone: String, now: Instant) {
+private fun TaskRow(
+    task: Task,
+    category: Category?,
+    language: Language,
+    zone: String,
+    now: Instant,
+    menuOpen: Boolean,
+    onMenu: (Boolean) -> Unit,
+    onOpen: () -> Unit,
+    onAction: (TaskAction) -> Unit,
+) {
     val surface = MaterialTheme.colorScheme.surface
     val tint = when (task.status) {
         TaskStatus.ACTIVE -> surface
         TaskStatus.DONE -> DoneGreen.copy(alpha = 0.12f).compositeOver(surface)
         TaskStatus.DELETED -> MaterialTheme.colorScheme.error.copy(alpha = 0.12f).compositeOver(surface)
     }
+    val actions = task.actions()
     OutlinedCard(
+        onClick = onOpen,
         colors = CardDefaults.outlinedCardColors(containerColor = tint),
         modifier = Modifier
             .fillMaxWidth()
-            .testTag("task")
-            .semantics(mergeDescendants = true) {},
+            .testTag("task"),
     ) {
-        Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
-            StatusIcon(task.status)
-            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
+        Row(modifier = Modifier.padding(start = 16.dp, top = 4.dp, bottom = 16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
+            Box(Modifier.padding(top = 12.dp)) { StatusIcon(task.status) }
+            Column(
+                modifier = Modifier
+                    .weight(1f)
+                    .padding(top = 12.dp),
+                verticalArrangement = Arrangement.spacedBy(8.dp),
+            ) {
                 Text(task.title, style = MaterialTheme.typography.titleMedium)
-                task.due?.let { due ->
-                    val view = dueView(due, zone, now)
-                    // A mark that does not fit beside the due goes whole to the next line.
-                    FlowRow(
-                        horizontalArrangement = Arrangement.spacedBy(8.dp),
-                        verticalArrangement = Arrangement.spacedBy(4.dp),
-                        itemVerticalAlignment = Alignment.CenterVertically,
-                    ) {
-                        Text(
-                            text = stringResource(R.string.list_due, listDateTime(view.local, language)),
-                            style = MaterialTheme.typography.bodyMedium,
-                            color = if (view.overdue) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
-                        )
-                        if (view.overdue) OverdueMark()
-                    }
-                }
-                when {
-                    category != null -> Chip(category.name, paletteColor(category.color), Color.White)
-                    // The category is gone: the web shows "No Tag" in grey.
-                    task.categoryId != null -> Chip(
-                        stringResource(R.string.list_no_category),
-                        MaterialTheme.colorScheme.surfaceVariant,
-                        MaterialTheme.colorScheme.onSurfaceVariant,
-                    )
-                }
+                task.due?.let { DueLine(it, language, zone, now) }
+                CategoryChip(task.categoryId, category)
                 Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                     Time(stringResource(R.string.list_created, listDateTime(task.createdAt, zone, language)))
                     if (task.changedAfterCreation()) Time(stringResource(R.string.list_updated, listDateTime(task.updatedAt, zone, language)))
                     task.deletedAt?.let { Time(stringResource(R.string.list_deleted, listDateTime(it, zone, language))) }
                 }
             }
+            Row {
+                val first = actions.first()
+                IconButton(onClick = { onAction(first) }, modifier = Modifier.testTag("row_${first.tag}")) {
+                    Icon(
+                        painterResource(first.icon),
+                        contentDescription = stringResource(first.label),
+                        tint = if (first == TaskAction.DONE) DoneGreen else MaterialTheme.colorScheme.primary,
+                    )
+                }
+                Box {
+                    IconButton(onClick = { onMenu(true) }, modifier = Modifier.testTag("row_menu")) {
+                        Icon(painterResource(R.drawable.ic_more_vert), contentDescription = stringResource(R.string.task_actions))
+                    }
+                    DropdownMenu(expanded = menuOpen, onDismissRequest = { onMenu(false) }) {
+                        actions.drop(1).forEach { action ->
+                            DropdownMenuItem(
+                                text = { Text(stringResource(action.label)) },
+                                leadingIcon = { Icon(painterResource(action.icon), contentDescription = null) },
+                                onClick = {
+                                    onMenu(false)
+                                    onAction(action)
+                                },
+                                modifier = Modifier.testTag("menu_${action.tag}"),
+                            )
+                        }
+                    }
+                }
+            }
         }
     }
 }
 
-@Composable
-private fun StatusIcon(status: TaskStatus) {
-    Icon(
-        painter = painterResource(if (status == TaskStatus.DELETED) R.drawable.ic_delete_outline else R.drawable.ic_check_circle),
-        contentDescription = null,
-        tint = when (status) {
-            TaskStatus.ACTIVE -> MaterialTheme.colorScheme.primary
-            TaskStatus.DONE -> DoneGreen
-            TaskStatus.DELETED -> MaterialTheme.colorScheme.error
-        },
-    )
-}
-
-@Composable
-private fun Time(text: String) {
-    Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
-}
-
-@Composable
-private fun OverdueMark() {
-    val red = MaterialTheme.colorScheme.error
-    Text(
-        text = stringResource(R.string.list_overdue),
-        color = red,
-        fontWeight = FontWeight.Bold,
-        style = MaterialTheme.typography.labelSmall,
-        modifier = Modifier
-            .background(red.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
-            .border(1.dp, red.copy(alpha = 0.3f), RoundedCornerShape(4.dp))
-            .padding(horizontal = 6.dp, vertical = 2.dp),
-    )
-}
-
-@Composable
-private fun Chip(text: String, background: Color, content: Color) {
-    Text(
-        text = text,
-        color = content,
-        style = MaterialTheme.typography.labelMedium,
-        modifier = Modifier
-            .background(background, RoundedCornerShape(16.dp))
-            .padding(horizontal = 10.dp, vertical = 4.dp),
-    )
-}
-
 @Composable
 private fun Note(text: String, color: Color, tag: String, modifier: Modifier = Modifier) {
     Text(text = text, color = color, style = MaterialTheme.typography.bodyMedium, modifier = modifier.testTag(tag))
 }
 
-/** A colour of the palette, "#rrggbb". */
-private fun paletteColor(hex: String): Color = Color(0xFF000000 or hex.removePrefix("#").toLong(16))
-
 @Preview(showBackground = true)
 @Composable
 private fun HomeScreenPreview() {
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
index 7eae4e4..b39b5e7 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
@@ -7,15 +7,25 @@ import androidx.appcompat.app.AppCompatActivity
 import androidx.compose.runtime.Composable
 import androidx.compose.runtime.LaunchedEffect
 import androidx.compose.runtime.getValue
+import androidx.compose.runtime.mutableStateOf
+import androidx.compose.runtime.remember
+import androidx.compose.runtime.saveable.rememberSaveable
+import androidx.compose.runtime.saveable.rememberSaveableStateHolder
+import androidx.compose.runtime.setValue
 import androidx.lifecycle.compose.collectAsStateWithLifecycle
 import androidx.lifecycle.viewmodel.compose.viewModel
+import com.pmobile78.todoround.core.model.Task
+import com.pmobile78.todoround.core.model.TaskAction
 import com.pmobile78.todoround.ui.AppViewModel
 import com.pmobile78.todoround.ui.AuthScreen
 import com.pmobile78.todoround.ui.HomeScreen
 import com.pmobile78.todoround.ui.Session
+import com.pmobile78.todoround.ui.TaskScreen
 import com.pmobile78.todoround.ui.appearanceOf
 import com.pmobile78.todoround.ui.apply
 import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
+import kotlinx.coroutines.channels.Channel
+import kotlinx.coroutines.flow.receiveAsFlow
 
 // AppCompat switches the language of the app on Android before 13 too (spec 8).
 class MainActivity : AppCompatActivity() {
@@ -30,7 +40,10 @@ class MainActivity : AppCompatActivity() {
     }
 }
 
-/** The sign-in screen or the screen of the signed-in user, in the language and the theme of the session (spec 8). */
+/**
+ * The sign-in screen, or for the signed-in user the list and the screen of the task it opens, in
+ * the language and the theme of the session (spec 8).
+ */
 @Composable
 fun AppContent(viewModel: AppViewModel = viewModel()) {
     val session by viewModel.session.collectAsStateWithLifecycle()
@@ -45,12 +58,47 @@ fun AppContent(viewModel: AppViewModel = viewModel()) {
     when (val current = session) {
         Session.Starting -> Unit
         Session.SignedOut -> AuthScreen(viewModel.accounts)
-        is Session.SignedIn -> HomeScreen(
-            current,
-            onSignOut = viewModel::signOut,
-            onSort = viewModel::setListSort,
-            onFilter = viewModel::setListFilter,
-            writeFailures = viewModel.writeFailures,
-        )
+        is Session.SignedIn -> {
+            // The task open on its screen, by its id: kept over a turn of the phone and an unloading of the app.
+            var openTask by rememberSaveable { mutableStateOf<String?>(null) }
+            // The list keeps its tab, search and place while a task is open.
+            val screens = rememberSaveableStateHolder()
+            val gone = remember { Channel<Unit>(Channel.CONFLATED) }
+            // An action of the task screen closes it and runs once the list is back: a write the core
+            // refuses at once is then said by the list, not by the screen that is going away.
+            var pending by remember { mutableStateOf<Pair<Task, TaskAction>?>(null) }
+            val taskId = openTask
+            if (taskId != null) {
+                TaskScreen(
+                    taskId,
+                    current,
+                    onBack = { openTask = null },
+                    onAction = { task, action -> pending = task to action },
+                    onToggle = viewModel::toggle,
+                    onGone = {
+                        openTask = null
+                        gone.trySend(Unit)
+                    },
+                    writeFailures = viewModel.writeFailures,
+                )
+            } else {
+                screens.SaveableStateProvider("list") {
+                    HomeScreen(
+                        current,
+                        onSignOut = viewModel::signOut,
+                        onSort = viewModel::setListSort,
+                        onFilter = viewModel::setListFilter,
+                        writeFailures = viewModel.writeFailures,
+                        onOpen = { openTask = it },
+                        onAction = viewModel::act,
+                        taskGone = remember(gone) { gone.receiveAsFlow() },
+                    )
+                }
+                LaunchedEffect(pending) {
+                    pending?.let { (task, action) -> viewModel.act(task, action) }
+                    pending = null
+                }
+            }
+        }
     }
 }
````

- [ ] **Step 7: Сборка и Lint**

Run: `android/gradlew -p android --no-daemon check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt`
Expected: `core tests: 152 passed, 0 failed, 0 skipped`, `app debug tests: 27 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `No issues found.`

- [ ] **Step 8: Тесты проходят на устройстве**

Свободны ли эмулятор и Gradle — их может занимать другая сессия:

```bash
source /media/big_disk/android/android-env.sh
if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"
elif pgrep -f '[G]radleDaemon|[G]radleWrapperMain' > /dev/null; then echo "Gradle is running: wait"
else echo "free"; fi
```

Expected: `free`. Иначе — ждать и проверять снова: чужой эмулятор и чужую сборку не трогать.

Эмулятор запустить в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-2-2.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi):

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Тесты на устройстве — в фоне (`run_in_background`; около 9 минут), вывод в журнал — и снимки, которые они принесли:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh > /media/big_disk/android/work/device-2-2.log 2>&1; grep -E '^OK \(|^Tests run|^FAILURES|Script exited|^[0-9]+\) |TIMEOUT' /media/big_disk/android/work/device-2-2.log
ls android/app/build/device-screens
```

Expected: `OK (42 tests)` и `Script exited successfully (code 0)`; `list-en-light.png`, `list-uk-dark.png`, `task-en-light.png`, `task-uk-dark.png`. Снимки открыть и посмотреть:

- `task-en-light.png` — светлый экран «Task» со стрелкой назад: синяя отметка и «Active», «Water the plants», синий «Due date: 12/31/2099, 08:00», зелёная «Home», колокольчики «1 hour before» и «2 days before», значок повтора и «Every 2 weeks: MON, FRI», заголовок «Pots», два пункта с квадратиками (второй отмечен, текст жирный), цитата «by the window» с полосой слева, подчёркнутая ссылка «care», «Created: …», кнопки «Mark as Done» (заполненная), «Finish series» и красная «Delete Task», под ними серая строка подсказки;
- `task-uk-dark.png` — тёмный экран «Завдання»: «Активне», «Купити хліб», красный «Термін виконання: 01.10.2026, 09:30» и «Прострочено», зачёркнутые «За 1 годину» и «За 1 тиждень», «Кожні 3 дні», отмеченный «житній» и пустой «білий», кнопки «Позначити як готове», «Завершити серію», красная «Видалити завдання» и подсказка;
- `list-en-light.png`, `list-uk-dark.png` — списки 2.1, у каждой строки справа зелёная кнопка «Готово» и «⋮».

Окно «… isn't responding» поверх экрана (в черновике — «Pixel Launcher») — это система эмулятора под нагрузкой (`docs/android.md`); чисто чёрный снимок значит, что система эмулятора ещё не нарисовала окно: прогнать тесты ещё раз.

Эмулятор выключить и дождаться конца его процесса — только своего: свой запущен из корня этой копии (`/proc/<pid>/cwd`). Другая сессия может запустить тот же эмулятор через секунды после того, как наш выключился, — её процесс этот блок не задевает. Если `emu kill` не сработал — сигнал завершения нашему процессу:

```bash
source /media/big_disk/android/android-env.sh
Q=$(for p in $(pgrep -f '[q]emu-system.*ToRound_API37'); do [ "$(readlink /proc/$p/cwd)" = "$PWD" ] && echo $p; done)
[ -n "$Q" ] || { echo "no emulator of this copy"; exit 1; }
adb -e emu kill
timeout 60 sh -c "while kill -0 $Q 2>/dev/null; do sleep 2; done" || kill -TERM $Q
timeout 60 sh -c "while kill -0 $Q 2>/dev/null; do sleep 2; done" && echo "emulator stopped"
```

Expected: `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 9: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/MarkdownOnDeviceTest.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskFlowTest.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskScreenTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/Clock.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/MarkdownView.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskParts.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt android/app/src/main/res/drawable/ic_arrow_back.xml android/app/src/main/res/drawable/ic_delete_forever.xml android/app/src/main/res/drawable/ic_done_all.xml android/app/src/main/res/drawable/ic_notifications.xml android/app/src/main/res/drawable/ic_repeat.xml android/app/src/main/res/drawable/ic_restore.xml android/app/src/main/res/values-uk/strings.xml android/app/src/main/res/values/strings.xml android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Reminders.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RemindersTest.kt
git commit -F - <<'EOF'
feat(android): the task screen and the actions of the list's rows

Stage 2.2, task 4 (spec 2.2 No. 9-13, 23; section 7). TaskScreen opens a
task by its id from the live list: its status, title, due with
"Overdue", category, reminders (struck through once passed), repeat in
words, the description with the web's formatting and its checkboxes, the
times, and the actions of its status. "Delete forever" asks first; an
action closes the screen and runs once the list is back, so the list
says when the core refuses it; a task deleted forever elsewhere closes
the screen with a message, but only once the server's data have no such
task. A row opens its task and has the button of its first action and a
menu with the others; the list keeps the open menu and the question by
task id, so a menu stays with its task when the list moves and closes
for good when its task leaves the tab, and the list keeps its tab,
search and place while a task is open. "Now" comes from a
java.time.Clock and ticks at each minute only while the screen is
started (review 2.1, minors 1 and 2); HomeScreenTest moves it.
MarkdownOnDeviceTest checks the parse on Android's regular expressions.
EOF
```

---

### Task 5: Документация, полная проверка и проверка с вебом на эмуляторах

**Files:**
- Modify: `docs/android.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: всё из задач 1–4.
- Produces: в `docs/android.md` — экран задачи, действия, описание как в вебе, сборка без демона Gradle; в `CLAUDE.md` — то же коротко. Проверка с вебом на эмуляторах — запись в журнале исполнения.

- [ ] **Step 1: Документация**

Изменения в `docs/android.md`:

````diff
diff --git a/docs/android.md b/docs/android.md
index d6d1b47..d9fe9a7 100644
--- a/docs/android.md
+++ b/docs/android.md
@@ -6,8 +6,8 @@
 
 | Путь | Что внутри |
 |---|---|
-| `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели, правила списка задач веба (вкладки, поиск, фильтр, сортировка). Тесты (JUnit) читают общие примеры из `contract/` |
-| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, список задач (сортировка и фильтр пишутся в общие с вебом настройки), экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
+| `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели, правила списка задач веба (вкладки, поиск, фильтр, сортировка), следующий срок повторяющейся задачи, действия по статусу и описание в Markdown так, как его показывает веб (`core/markdown`). Тесты (JUnit) читают общие примеры из `contract/` |
+| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, список задач (сортировка и фильтр пишутся в общие с вебом настройки), экран задачи (действия по статусу и отметка пунктов пишутся в задачи), экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
 | `android/device-tests.sh` | запуск тестов на устройстве против эмуляторов Firebase (ниже) |
 | `android/gradle/libs.versions.toml` | версии библиотек и плагинов |
 | `contract/` | общие примеры данных для веба, функций и Android ([README](../contract/README.md)) |
@@ -93,13 +93,20 @@ android/gradlew -p android --stop                   # остановить де
 
 Срок приложение показывает во времени телефона, веб — во времени компьютера; при сверке часовой пояс у них один. Если телефон не знает часового пояса задачи (его база часовых поясов старее, чем у браузера), срок он понимает в своём поясе — так же, как веб в таком случае. Документы, которые не прошли проверку контракта, приложение не показывает, а считает в заметке над списком; веб их показывает, поэтому числа и порядок расходятся ровно на них. Если проверку не прошла категория, её задачи приложение показывает без категории. Почему документ не прошёл проверку, пишет журнал телефона: `adb -s <адрес>:<порт> logcat -d -s Loaded`.
 
+## Экран задачи
+
+Касание строки списка открывает задачу: статус, название, срок с «Прострочено», категория, напоминания (прошедшие зачёркнуты), повтор словами, описание с форматированием, даты и действия по статусу — те же, что в диалоге веба: у активной задачи «Готово», «Завершить серию» (у повторяющейся) и «Удалить»; у выполненной — «Восстановить» и «Удалить»; у удалённой — «Восстановить» и «Удалить навсегда». В строке списка — кнопка первого из них, остальные — в меню «⋮». «Удалить навсегда» спрашивает подтверждение (в вебе его нет): задача исчезает совсем. После действия экран закрывается, а список остаётся на той же вкладке. «Готово» у повторяющейся задачи переносит срок на первый повтор после «сейчас», как веб. Если телефон не знает часового пояса задачи, шаг он делает в своём поясе, а пояс задачи оставляет (веб такую задачу не шагает вовсе); веб и сервер читают новый срок в поясе задачи, поэтому там он может сразу оказаться прошедшим — с «Просрочено». Изменения с другого устройства экран показывает сразу; если задачу удалили навсегда, он закрывается с сообщением. Правка задачи придёт в подплане 2.3.
+
+Описание приложение показывает так же, как веб: правила Markdown веба (marked 17.0.6 и токенизаторы TipTap 3.32) перенесены в `core/markdown` вместе с особенностями веба — пункты с буквами и римскими числами, «Ok. Thanks» как нумерованный список, пять переводов строки как один пустой абзац. Нарочно иначе: сырой HTML и таблицы видны текстом, а ссылка открывается в браузере, только если её адрес начинается с `http`, `https` или `mailto`. Касание квадратика меняет в описании один символ — отметку этого пункта — и сразу записывает описание. Если описание тем временем изменили на другом устройстве и на этом месте отметки больше нет, приложение ничего не пишет; если изменение другого устройства ещё в пути, побеждает последняя запись — как в вебе.
+
+Запись, которую не пропустила проверка ядра или отклонил сервер, не пропадает молча: приложение показывает «The change could not be saved.». Что не пропустило ядро, пишет журнал: `adb logcat -d -s AppViewModel`.
+
 ## Эмулятор
 
-Памяти 14 ГБ, поэтому эмулятор запускается без окна и без Android Studio, а демон Gradle перед этим останавливается. Команды `adb -e` обращаются к единственному эмулятору, если телефон подключён кабелем. Телефон по Wi-Fi для adb — такое же сетевое устройство, как эмулятор, и `adb -e` их не различит (`more than one emulator`, ложное `booted` при ожидании загрузки): перед работой с эмулятором телефон отключают — `adb disconnect <адрес>:<порт>`.
+Памяти 14 ГБ, поэтому эмулятор запускается без окна и без Android Studio, а сборка перед ним идёт без демона Gradle (`--no-daemon`): процесс сборки кончается вместе с ней и не держит память. `--stop` для этого не годится: он останавливает демоны Gradle всех сессий на машине, в том числе чужую сборку посреди работы. Эмулятор и сборки бывают у другой сессии: перед сборкой и перед запуском эмулятора проверяют, что не работают ни эмулятор (`pgrep -f '[q]emu-system'`), ни Gradle (`pgrep -f '[G]radleDaemon|[G]radleWrapperMain'`), и чужие процессы не трогают. Команды `adb -e` обращаются к единственному эмулятору, если телефон подключён кабелем. Телефон по Wi-Fi для adb — такое же сетевое устройство, как эмулятор, и `adb -e` их не различит (`more than one emulator`, ложное `booted` при ожидании загрузки): перед работой с эмулятором телефон отключают — `adb disconnect <адрес>:<порт>`.
 
 ```bash
-android/gradlew -p android :app:assembleDebug
-android/gradlew -p android --stop
+android/gradlew -p android --no-daemon :app:assembleDebug
 emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect &
 adb -e wait-for-device; until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done
 adb -e uninstall com.pmobile78.todoround
@@ -121,8 +128,7 @@ adb -e emu kill
 Тесты на устройстве (`app/src/androidTest`) проверяют Firebase, репозитории, вход и экраны. Gradle рядом с эмулятором не запускают, поэтому сначала сборка, потом эмулятор:
 
 ```bash
-android/gradlew -p android :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true
-android/gradlew -p android --stop
+android/gradlew -p android --no-daemon :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true
 emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect &
 adb -e wait-for-device; until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done
 firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
@@ -131,7 +137,9 @@ adb -e emu kill
 
 `android/device-tests.sh` ставит оба APK, включает `adb reverse`, запускает тесты, удаляет приложение и печатает итог: `OK (N tests)` или ошибки. Сборку без `-Ptodoround.emulators=true` тесты отвергают, чтобы не ходить в прод. Убирает за собой скрипт и после упавшего прогона. Приложение он удаляет до и после тестов, поэтому тесты идут только на эмуляторе: если `adb -e` видит не эмулятор (например, один телефон по Wi-Fi), скрипт ничего не трогает и просит отключить телефон.
 
-Тесты списка снимают экран: список на английском в светлой теме и на украинском в тёмной. Скрипт приносит снимки в `android/app/build/device-screens/`. Проверки тестов видят дерево интерфейса, а не картинку на экране, поэтому снимки смотрят глазами; чисто чёрный снимок значит, что система эмулятора ещё не нарисовала окно, — прогон повторяют.
+`Error: TIMEOUT: Port 8180 on 127.0.0.1 was not active within 60000ms` значит, что эмулятору Firestore не хватило памяти рядом с эмулятором Android — например, когда идёт чья-то сборка Gradle: дождаться её конца и повторить.
+
+Тесты снимают экран: список и экран задачи на английском в светлой теме и на украинском в тёмной. Скрипт приносит снимки в `android/app/build/device-screens/`. Проверки тестов видят дерево интерфейса, а не картинку на экране, поэтому снимки смотрят глазами; чисто чёрный снимок значит, что система эмулятора ещё не нарисовала окно, — прогон повторяют.
 
 Попробовать приложение руками: в отдельном терминале `firebase emulators:start --only auth,firestore --project demo-to-round`, затем `adb -e reverse tcp:9099 tcp:9099`, `adb -e reverse tcp:8180 tcp:8180` и установка сборки с ключом. Писем эмулятор не отправляет: ссылку сброса пароля он печатает в своём журнале (`To reset the password for …, follow this link: …`).
 
````

Изменения в `CLAUDE.md`:

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index ed358d8..3513375 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -93,12 +93,12 @@ functions/
 
 ### Android app
 
-`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), stage 2 [spec](docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, with JUnit tests on `contract/`; `app` — the Android application: Firebase Auth and Firestore with `android/app/google-services.json` (out of git; `firebase apps:sdkconfig`), screens on Compose. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
+`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), stage 2 [spec](docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, the web's list rules, the next due of a repeating task and the Markdown of descriptions as the web shows it (`core/markdown`), with JUnit tests on `contract/`; `app` — the Android application: Firebase Auth and Firestore with `android/app/google-services.json` (out of git; `firebase apps:sdkconfig`), screens on Compose. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
 
 - Never print `~/.gradle/gradle.properties` whole (`cat`, `less`, an unanchored `grep`): it holds the release key passwords. Read one non-secret line at a time, e.g. `grep '^org.gradle.java.home' ~/.gradle/gradle.properties`.
 - `core` compiles against the JDK but runs on Android 8+: `-Xjdk-release=17` keeps out Java 18+ methods, not the Java 9–17 ones Android 8 lacks (`List.of` …). Use `java.time` and the Kotlin standard library there.
 - With a phone and the emulator both connected, address one: `adb -e` (the emulator), `adb -d` (the USB phone). A phone on Wi-Fi debugging is a TCP device like the emulator, and `adb -e` cannot tell them apart: `adb disconnect` it before emulator work.
-- A debug build with `-Ptodoround.emulators=true` works with the Auth and Firestore emulators of `firebase.json` (project `demo-to-round`), reached at the device's own 127.0.0.1 through `adb reverse`: Android 17 keeps apps out of the local network, 10.0.2.2 included. The device tests (`app/src/androidTest`) run that way through `android/device-tests.sh`, on the emulator only (the script removes the app before and after a run), and bring their screenshots back to `android/app/build/device-screens/`: look at them, the checks see the UI tree, not the picture. Never run Gradle while the Android emulator is up (14 GB of RAM): build, `--stop`, then boot it.
+- A debug build with `-Ptodoround.emulators=true` works with the Auth and Firestore emulators of `firebase.json` (project `demo-to-round`), reached at the device's own 127.0.0.1 through `adb reverse`: Android 17 keeps apps out of the local network, 10.0.2.2 included. The device tests (`app/src/androidTest`) run that way through `android/device-tests.sh`, on the emulator only (the script removes the app before and after a run), and bring their screenshots back to `android/app/build/device-screens/`: look at them, the checks see the UI tree, not the picture. Never run Gradle while the Android emulator is up (14 GB of RAM): build with `--no-daemon`, then boot it. Not `--stop`: it stops the Gradle daemons of every session on the machine, another session's build too. Another session may hold the emulator or run Gradle: check `pgrep -f '[q]emu-system'` and `pgrep -f '[G]radleDaemon|[G]radleWrapperMain'` before a build or a boot, and never touch its processes.
 - Device test names are camelCase: D8 refuses spaces in method names before DEX 040 (minSdk 26). JVM tests may keep backtick names.
 
 ### Firestore data model
````

- [ ] **Step 2: Полная проверка и неизменный веб**

```bash
android/gradlew -p android --no-daemon clean check
tail -1 android/app/build/reports/lint-results-debug.txt
git diff --stat main...HEAD -- . ':!android' ':!docs' ':!CLAUDE.md'
```

Expected: `core tests: 152 passed, 0 failed, 0 skipped`, `app debug tests: 27 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`, `No issues found.`; `git diff --stat` ничего не выводит: кроме `android/` и документации, ветка ничего не меняет. В копии без локальной ветки `main` — `origin/main...HEAD`.

- [ ] **Step 3: Сборки для эмулятора: релиз с R8 и тесты**

Релиз (R8) подписывается одноразовым ключом, как в этапе 1 — это не ключ владельца. Блок — в фоне (`run_in_background`): в черновике сборка шла 10,5 минуты.

```bash
K=/media/big_disk/android/work/throwaway-release.jks
mkdir -p /media/big_disk/android/work && rm -f $K
/media/big_disk/android/android-studio/jbr/bin/keytool -genkeypair -keystore $K -storetype PKCS12 -storepass throwaway-test -keypass throwaway-test -alias throwaway -keyalg RSA -keysize 2048 -validity 2 -dname "CN=ToDo-Round throwaway test"
android/gradlew -p android --no-daemon :app:assembleDebug :app:assembleDebugAndroidTest :app:assembleRelease -Ptodoround.emulators=true -Ptodoround.release.storeFile=$K -Ptodoround.release.storePassword=throwaway-test -Ptodoround.release.keyAlias=throwaway -Ptodoround.release.keyPassword=throwaway-test
/media/big_disk/android/sdk/build-tools/37.0.0/apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk 2>/dev/null | grep 'certificate DN'
rm -f $K
```

Expected: `BUILD SUCCESSFUL`; `V2 Signer: certificate DN: CN=ToDo-Round throwaway test`.

- [ ] **Step 4: Проверка на эмуляторе**

Свободны ли эмулятор и Gradle — их может занимать другая сессия:

```bash
source /media/big_disk/android/android-env.sh
if adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"
elif pgrep -f '[G]radleDaemon|[G]radleWrapperMain' > /dev/null; then echo "Gradle is running: wait"
else echo "free"; fi
```

Expected: `free`. Иначе — ждать и проверять снова: чужой эмулятор и чужую сборку не трогать.

Эмулятор запустить в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-2-2.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi):

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; echo booted
```

Expected: `booted`.

Сначала тесты на устройстве — в фоне (`run_in_background`), вывод в журнал — и снимки, которые они принесли:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh > /media/big_disk/android/work/device-2-2.log 2>&1; grep -E '^OK \(|^Tests run|^FAILURES|Script exited|^[0-9]+\) |TIMEOUT' /media/big_disk/android/work/device-2-2.log
ls android/app/build/device-screens
```

Expected: `OK (42 tests)` и `Script exited successfully (code 0)`; четыре снимка задачи 4. Снимки открыть и посмотреть, как в задаче 4 (шаг 8).

Релиз после R8 запускается (вход он не делает: релиз работает с настоящим проектом). Он идёт после тестов: в первую минуту после загрузки система эмулятора бывает ещё не готова рисовать. Снимок делается, когда в дереве экрана появилось название именно этого приложения:

```bash
source /media/big_disk/android/android-env.sh
adb -e uninstall com.pmobile78.todoround
adb -e install android/app/build/outputs/apk/release/app-release.apk
adb -e logcat -c
adb -e shell am start -W -n com.pmobile78.todoround/.MainActivity | grep Status
timeout 120 sh -c 'until adb -e exec-out uiautomator dump /dev/tty | grep -q "text=\"ToDo-Round\"[^>]*package=\"com.pmobile78.todoround\""; do sleep 1; done'
adb -e exec-out screencap -p > /media/big_disk/android/work/stage-2-2-release.png
adb -e logcat -d | grep -c 'FATAL EXCEPTION'
adb -e uninstall com.pmobile78.todoround
```

Expected: `Failure […]` (приложения не было) или `Success`, затем `Success`, `Status: ok`, `0` и `Success`. Снимок открыть: экран входа — три пузыря, «ToDo-Round», вкладки «Login» и «Register», переключатель EN/UK. Если снимок всё же чёрный, через минуту повторить этот блок.

Эмулятор остаётся чистым — приложения нет, тема светлая — и выключается с ожиданием конца процесса:

```bash
source /media/big_disk/android/android-env.sh
adb -e shell pm list packages | grep -c todoround || true
adb -e shell cmd uimode night
Q=$(for p in $(pgrep -f '[q]emu-system.*ToRound_API37'); do [ "$(readlink /proc/$p/cwd)" = "$PWD" ] && echo $p; done)
[ -n "$Q" ] || { echo "no emulator of this copy"; exit 1; }
adb -e emu kill
timeout 60 sh -c "while kill -0 $Q 2>/dev/null; do sleep 2; done" || kill -TERM $Q
timeout 60 sh -c "while kill -0 $Q 2>/dev/null; do sleep 2; done" && echo "emulator stopped"
```

Expected: `0`, `Night mode: no`, `OK: killing emulator, bye bye`, `emulator stopped`.

- [ ] **Step 5: Commit**

Коммит документации не ждёт проверки с вебом: в репозитории она ничего не меняет.

```bash
git add CLAUDE.md docs/android.md
git commit -F - <<'EOF'
docs(android): the task screen, its actions and the description as the web shows it

Stage 2.2, task 5. docs/android.md: the task screen and the actions of
the rows, the description as the web shows it with its deliberate
differences, the message of a refused write, builds without the Gradle
daemon (--stop stops the daemons of other sessions too) and the timeout
of the Firestore emulator when memory runs short. CLAUDE.md: what core
holds now, and the same rule for builds beside the emulator.
EOF
```

- [ ] **Step 6: Проверка с вебом на эмуляторах**

Это проверка спецификации (раздел 11.2): каждое действие подплана на одной стороне видно на другой без перезагрузки. Её делает исполнитель: веб — во встроенном браузере, приложение — на эмуляторе Android, оба — на одних эмуляторах Firebase (проект `demo-to-round`, в прод ничего не уходит). В черновике плана эта проверка прошла так, как описано ниже.

1. Отладочная сборка с ключом эмуляторов уже есть (шаг 3). Эмулятор и Gradle свободны, эмулятор запущен и загружен — блоками шага 4. Если эмулятор нужен, а его держит другая сессия, — подождать; проверка занимает около 30 минут, и всё это время рядом не должно идти сборок Gradle.
2. Порты Firebase и 3000 свободны (`ss -ltn | grep -E ':(9099|8180|4400|4500|9150|3000)\b'` ничего не печатает). В фоне (`run_in_background`) запустить веб на эмуляторах Firebase: `npm run start:emulator` (если в копии нет `node_modules` — сначала `npm ci --legacy-peer-deps`). Веб готов, когда в его выводе есть строка `Local:` — адрес из неё (обычно `http://localhost:3000/to-round-react/`). `TIMEOUT: Port 8180 …` — как в задаче 3: эмулятору Firestore не хватило памяти.
3. Тестовый аккаунт и его данные — скриптом ниже: пользователь `live-22@example.com` с паролем тестов на устройстве (`secret-1`) и задачи для каждого действия — «Gym» (повтор по неделям, срок прошёл), «Pay rent» (разовая, категория «Home»), «Shopping» (чек-лист из двух пунктов), «Water the plants» (каждый день, срок прошёл, `pulseMuted: true`), выполненная «Read a book», удалённая «Old note». Как в 2.1, документы пишутся через REST эмулятора Firestore с заголовком `Authorization: Bearer owner`, все поля — тех типов, что пишет веб. Сохранить скрипт в `/media/big_disk/android/work/seed-2-2.mjs` и выполнить `node /media/big_disk/android/work/seed-2-2.mjs` (если хук не даёт `node` обращаться к `localhost` из командной строки — тем же кодом в песочнице `ctx_execute`). Expected: `seeded`.

```js
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key';
const FS = 'http://127.0.0.1:8180/v1/projects/demo-to-round/databases/(default)/documents';
const user = await (await fetch(AUTH, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'live-22@example.com', password: 'secret-1', returnSecureToken: true }) })).json();
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
  listFilter: { categoryIds: null, showUncategorized: true }, listSort: { by: 'title', order: 'asc' } } });
await put(`users/${uid}/categories/home`, { schemaVersion: 2, name: 'Home', color: '#46a549', order: 1, createdAt: now, updatedAt: now });
const task = (title, at, extra = {}) => ({ schemaVersion: 2, title, description: '', categoryId: null, status: 'active', due: null,
  reminders: [], repeat: null, radius: 45, pulseMuted: false, overdueAt: null, createdAt: new Date(at), updatedAt: new Date(at), deletedAt: null, ...extra });
await put(`users/${uid}/tasks/a`, task('Pay rent', '2026-10-01T08:00:00Z', { categoryId: 'home' }));
await put(`users/${uid}/tasks/b`, task('Water the plants', '2026-10-02T08:00:00Z', {
  due: { local: '2026-10-20T09:00', tz: 'Europe/Kyiv' }, reminders: [60], repeat: { every: 1, unit: 'days' }, pulseMuted: true }));
await put(`users/${uid}/tasks/c`, task('Shopping', '2026-10-03T08:00:00Z', { description: 'Buy:\n- [ ] milk\n- [ ] bread\n\n**Before** noon' }));
await put(`users/${uid}/tasks/d`, task('Gym', '2026-10-04T08:00:00Z', {
  due: { local: '2026-10-19T18:00', tz: 'Europe/Kyiv' }, repeat: { every: 1, unit: 'weeks', weekdays: [1, 4] } }));
await put(`users/${uid}/tasks/e`, task('Read a book', '2026-10-05T08:00:00Z', { status: 'done' }));
await put(`users/${uid}/tasks/f`, task('Old note', '2026-10-06T08:00:00Z', { status: 'deleted', deletedAt: new Date('2026-10-06T08:00:00Z') }));
console.log('seeded');
```

4. Приложение: поставить сборку (`adb -e install -t android/app/build/outputs/apk/debug/app-debug.apk`), включить `adb -e reverse tcp:9099 tcp:9099` и `adb -e reverse tcp:8180 tcp:8180`, открыть и войти этим аккаунтом — касаниями `adb -e shell input tap` по координатам из `uiautomator dump` и `adb -e shell input text`. Текст вводить через 2 секунды после касания поля, когда открылась клавиатура: иначе поле получает лишь часть символов (в черновике почта превратилась в «li»). Список: «Gym», «Pay rent», «Shopping», «Water the plants» и «Active Tasks (4)», «Completed Tasks (1)», «Deleted Tasks (1)».
5. Веб: открыть во встроенном браузере адрес из шага 2 и войти тем же аккаунтом (поля формы заполнить в странице). Веб сразу показывает список (`mainView: "list"`): те же строки и числа.
6. Телефон → веб; после каждого действия веб без перезагрузки показывает то же, что телефон:
   - кнопка «Mark as Done» строки «Pay rent» — «Active Tasks (3)», «Completed Tasks (2)»;
   - экран «Water the plants» (поля: «Active», срок с «Overdue», «1 hour before», «Every 1 day», подсказка под кнопками) → «Mark as Done» — экран закрывается, срок — первые 09:00 по Киеву, которые ещё впереди, без «Overdue» (в черновике, 26 октября вечером, — «10/27/2026, 09:00»; телефон показывает срок в своём часовом поясе); в вебе тот же срок и «Planned Tasks (1)»;
   - меню «⋮» строки «Gym» → «Finish series» — «Gym» среди выполненных;
   - вкладка выполненных, кнопка «Restore Task» строки «Read a book» — снова активная;
   - меню «⋮» строки «Shopping» → «Delete Task» — в корзине; во вкладке удалённых меню «⋮» строки «Old note» → «Delete Forever» → вопрос «Delete forever?» → «Delete Forever» — задачи нет нигде, «Deleted Tasks (1)»;
   - экран «Shopping» из корзины → «Restore Task» — экран закрывается, список остаётся на вкладке удалённых, «Shopping» — снова активная;
   - экран «Shopping»: квадратик «milk» — в вебе диалог этой задачи (кнопка «Edit Bubble») показывает «milk» отмеченным.
7. Веб → телефон:
   - в диалоге веба отметить «bread» и нажать «Save» — открытый на телефоне экран «Shopping» сам показывает оба пункта отмеченными. Веб при сохранении переписывает описание по-своему (в черновике — пустая строка после «Buy:»), поэтому затем снять на телефоне «bread»: веб показывает «milk» отмеченным, а «bread» — нет;
   - «Mark as Done» строки «Read a book» в вебе — телефон показывает её среди выполненных; «Delete Bubble» строки «Water the plants» — телефон показывает её в корзине.
8. Убрать за собой: приложение удалить (`adb -e uninstall com.pmobile78.todoround`), `adb -e reverse --remove-all`, эмулятор выключить блоком шага 4. `npm run start:emulator` остановить сигналом `INT` своему процессу `firebase emulators:exec`, затем своему `vite` — тем, чей каталог (`readlink /proc/<pid>/cwd`) — эта копия; затем `ss -ltn | grep -E ':(9099|8180|4400|4500|9150|3000)\b'` ничего не печатает. Вкладку встроенного браузера закрыть.

Итог — в журнал исполнения. Если сторона не видит изменения другой без перезагрузки — остановиться и разобрать причину (superpowers:systematic-debugging) до правок.

---

## Итог подплана 2.2 и передача в 2.3

После этого плана подплан 2.2 готов (обзор подпланов), когда проверка с вебом на эмуляторах прошла (задача 5, шаг 6) и `android/gradlew -p android --no-daemon check` зелёный. Ветку `stage-2-tasks` можно влить в `main` — с согласия владельца. Сборку 2.2 на Redmi 9 владельца ставят только по его просьбе: она пишет в его задачи.

- **Ядро.** `Recurrence.kt` — `stepOccurrence`, `nextFutureOccurrence`; `TaskChanges.kt` — `ServerTime`, `TaskAction`, `Task.actions()`, `TaskAction.changes`, `completionChanges`, `descriptionChanges`, `changeErrors`, `Task.toRecord()`; `Reminders.kt` — `reminderParts`, `reminderPassed`; `core/markdown` — `parseMarkdown`, `toggleTask`, `isSafeLink` и модель `Block`, `Inline`, `TaskItem`.
- **Записи.** Изменение задачи — `TasksRepository.update` (`taskUpdate`: поля, `ServerTime` как время сервера и `updatedAt` сервера), удаление — `delete`; перед каждой записью — `changeErrors`, отказ ядра или сервера — `Writes` и сообщение. Подплан 2.3 пишет правку тем же путём (изменения формы → `changeErrors` → `update`), а создание — `set` нового документа (спецификация, раздел 5).
- **Экраны.** `TaskScreen` открывается по id задачи и ждёт данных с сервера, если в кэше её нет — этап 3 откроет его по нажатию на уведомление. Кнопка «Изменить», экран «Правка» и кнопка «+» — в 2.3. Список хранит вкладку, поиск и место, пока открыт другой экран (`SaveableStateProvider("list")` в `MainActivity`): экран «Правка» встанет туда же.
- **Сборки.** Gradle — с `--no-daemon`, без `--stop`: на машине работают и другие сессии, их эмулятор и сборки не трогают (`docs/android.md`, раздел «Эмулятор»).
- **Находки в вебе, не для этого подплана** (кандидаты в задачи веба): редактор веба не открывает описание, где цитата кончается списком с буквами или римскими числами и за ней идут строки без пустой строки (`TypeError` в marked: «Cannot read properties of undefined (reading 'raw')»); блок кода с пробелами перед ограждением ```` ``` ```` веб не показывает вовсе. Телефон в первом случае показывает описание, во втором — так же, как веб.
- **Мелочи ревью этого плана, оставленные как есть:** номер нумерованного списка больше 2 147 483 647 телефон начинает с 1, а веб — с этого числа; касание квадратика в те миллисекунды, пока описание после изменения с другого устройства ещё разбирается, проверяет отметку только по месту в тексте; у квадратика и строки нет подписей для TalkBack (вместе с `selected` кнопки фильтра); пока длинное описание разбирается в первый раз, на его месте пусто, без индикатора; длинная цепочка `theActionsOfTheRowsAndOfTheScreenAreWrittenAsTheWebReadsThem` — первый кандидат на разделение, если начнёт падать; остановку таймера в остановленном приложении проверяет устройство `repeatOnLifecycle`, а не тест.
- **Мелочи ревью 2.1, оставленные дальше:** панель фильтра не видит чужих изменений, пока открыта (№ 3, → 2.4); `selected` у кнопки фильтра (№ 5, вместе со сверкой на Redmi 9).
- **Остаются из прежних ревью:** високосная секунда и 29 февраля в `isIsoTimestamp`, годы 0000–0099 в `parseLocal` (этап 5, импорт бэкапа); поток данных после сбоя не перезапускается — помогают выход и вход; `addTestListener` и кэш конфигурации Gradle; копия списка в `Records.stringsOrNull`; приведение `as FirebaseFirestoreException` в тестах; кэш Firestore после выхода остаётся на устройстве, как в вебе.
