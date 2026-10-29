# Этап 2.3: создание и правка задачи — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать телефону форму задачи — экран «Правка» со всеми полями диалога веба (название, описание в Markdown с панелью кнопок, категория, срок в 24 часа с «Очистить», напоминания, повтор, размер пузыря) — для новой задачи по кнопке «+» в списке и для существующей по кнопке «Изменить» на экране задачи; «Сохранить» пишет только то, что пользователь изменил, после проверки ядром; выход с изменениями спрашивает, а форма переживает поворот и выгрузку приложения; взять мелочи итогового ревью 2.2 и закончить проверкой с вебом на эмуляторах.

**Architecture:** Правила формы — в `core`: значения формы, поля новой задачи и изменения правки — перенос `src/services/data/taskForm.js` (`TaskForm.kt`), готовые и свои напоминания (`Reminders.kt`), день календаря Material 3 в UTC, а кнопки панели описания — правка текста вокруг выделения (`core/markdown/Toolbar.kt`). `app`: документ новой задачи и `TasksRepository.create`; `AppViewModel.create` и `save` проверяют запись ядром и пишут её через `Writes` из 2.1–2.2; экран `EditScreen` держит форму как задачу на момент открытия, форму при открытии и форму сейчас — всё это сохраняется в состоянии экрана; `MainActivity` открывает форму поверх списка («+») или экрана задачи («Изменить») и закрывает её, когда запись отправлена: запись, которую не пропустило ядро, остаётся в форме, а отказ сервера показывает экран, на который форма вернулась.

**Tech Stack:** как в 2.2 — Kotlin 2.4.21, Compose BOM 2026.09.00 (Material 3 1.4.0: `DatePickerDialog`, `TimePickerDialog`, `ExposedDropdownMenuBox`), Firebase BoM 35.1.0, AppCompat 1.8.0, Lifecycle 2.11.0; тесты JVM — JUnit 6, на устройстве — Compose UI test (правила v2), AndroidX Test, Espresso. Новых библиотек нет. Эмуляторам Firebase нужны Firebase CLI 15 и Java 21+.

**Spec:** [docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md](../specs/2026-10-24-stage-2-tasks-design.md) — разделы 2.2 (№ 3, 5, 14–16, 23), 3 (№ 11, 12, 16), 4, 5, 7, 8, 10, 11, 15. Обзор — [2026-10-24-stage-2-overview.md](2026-10-24-stage-2-overview.md). Основа — подплан 2.2 и этап 3 в `main` 30cf5c2 (прод 0.2.8) и план [2.2](2026-10-26-stage-2-2-task-view-actions-repeat.md) (раздел «Итог подплана 2.2 и передача в 2.3»). Эталоны веба — `src/services/data/taskForm.js`, `src/utils/reminders.js`, `src/services/data/convert.js` (`newTaskData`), диалог задачи `src/components/BubbleDialog.jsx`, `BubbleDialogForm.jsx`, `ReminderEditor.jsx`, `RepeatEditor.jsx`, панель описания `MarkdownToolbar.jsx`. Весь код плана прогнан в черновой копии ветки: числа тестов и строки `Expected` — настоящие, тесты на устройстве — на эмуляторе `ToRound_API37` (Android 17), проверка с вебом на эмуляторах — тоже.

## Global Constraints

- Ветка `stage-2-tasks`: `main` 30cf5c2 (2.2 и этап 3 влиты, версия 0.2.8) и над ним коммит этого плана — его делает автор плана, а задачи начинаются с этого коммита. В `main` не коммитить, ничего не пушить без слова владельца.
- Веб, `contract/`, правила Firestore, Cloud Functions и CI не меняются. Исключение — документация в задаче 6: `docs/android.md` и `CLAUDE.md`. Новых общих примеров в `contract/` правила формы не требуют: тесты `core` проверяют их на своих примерах и на примерах `taskForm.test.js` и `reminders.test.js` веба, а совпадение с вебом проверено в черновике разовыми сверками через настоящий код веба: 4000 случайных форм (1000 новых задач и 3000 правок; телефон — в 10 поясах, среди них `GMT+03:00` и `GMT-05:30`, которых база не знает, — 823 формы; срок задачи — в 10 поясах, среди них `Mars/Olympus`, которого не знает никто, — 215 задач; 30 % сроков — в дни перехода на летнее время и обратно) через `taskFieldsFromForm` и `taskChangesFromForm` веба — 0 расхождений; `reminderMinutes` и `withReminder` — 525 случаев, 0 расхождений; что пишут кнопки панели описания, редактор веба показывает так, как ждут тесты `ToolbarTest`.
- Все команды — из корня репозитория; Gradle — `android/gradlew -p android --no-daemon …`, на JBR Android Studio, как в этапе 1. Без демона процесс сборки кончается вместе с ней и не держит память, которая нужна эмулятору; `--stop` не годится: он останавливает демоны Gradle всех сессий машины.
- `android/app/google-services.json` — вне git; в копии, где его нет, его скачивает шаг 1 задачи 3 (задачам 1 и 2 он не нужен: они собирают только `core`). Регистрацию приложения в Firebase не повторять, проект Firebase не менять.
- Эмуляторы Firebase — из `firebase.json`: Auth на 9099, Firestore на 8180, проект `demo-to-round`; `emulators:exec` занимает ещё 4400, 4500 и 9150. Перед запуском порты свободны: `ss -ltn | grep -E ':(9099|8180|4400|4500|9150)\b'` ничего не печатает. Их может держать другая сессия: её процессы не трогать — подождать, пока порты освободятся. Если ждать долго, тесты можно прогнать на своих портах — вне репозитория: копия `firebase.json` с портами 19099, 18180, 14400, 14500, 19150 (`firebase emulators:exec --config <копия> …`) и копия `android/device-tests.sh` с `adb -e reverse tcp:9099 tcp:19099` и `adb -e reverse tcp:8180 tcp:18180`.
- Эмулятор Android `ToRound_API37` тоже бывает занят другой сессией. Перед каждым запуском эмулятора **и перед каждой командой Gradle** — блок «Свободны ли эмулятор и Gradle» (задача 3, шаг 6): если эмулятор работает, он чужой — ждать, не трогать и не ставить на него ничего; если идёт чужая сборка — эмулятор не запускать, пока она не кончится. Если эмулятор нужен надолго, а сессия, с которой его делят, известна, — одно короткое сообщение ей. Свой эмулятор выключается блоком, который ждёт конца его процесса и трогает только его — по каталогу, из которого он запущен.
- Длинные команды — сборка `check`, `clean check` или `assembleRelease`, тесты на устройстве — запускать в фоне (`run_in_background`) с выводом в журнал и ждать их конца: вызов инструмента на переднем плане обрывается через 10 минут, а тесты на устройстве в черновике шли около 12 минут. Строки `Expected` ищут в журнале или в выводе, который печатает блок.
- Памяти 14 ГБ: Gradle и эмулятор Android одновременно не работают. Порядок прогона на устройстве: сборка; проверка, что эмулятор и Gradle свободны; эмулятор в фоне (`run_in_background`); ожидание загрузки одной командой с тайм-аутом 10 минут и минутой после неё; тесты; выключение с ожиданием конца процесса.
- Тесты на устройстве идут только на сборке с `-Ptodoround.emulators=true` и только на эмуляторе: `android/device-tests.sh` удаляет приложение до и после прогона. Итог печатает скрипт: `OK (N tests)` или список ошибок. Ответ `INSTRUMENTATION_RESULT: shortMsg=Process crashed.` без единого теста — сбой запуска на только что загруженном эмуляторе: прогнать блок тестов ещё раз.
- Телефона в этом подплане нет. Сборки 2.3 пишут задачи, поэтому на Redmi 9 владельца их ставят только по его просьбе (спецификация, раздел 12, шаг 4) — отдельным шагом с его «да». `adb -e` — эмулятор; если к компьютеру подключён телефон по Wi-Fi, перед работой с эмулятором его отключают — `adb disconnect <адрес>:<порт>`.
- Записи этого подплана — задачи: новый документ и изменения формы. Исполнитель проверяет их только на эмуляторах Firebase; в прод ничего не пишется.
- Версии библиотек и плагинов не менять. Lint в черновике сообщал одно предупреждение — `AndroidGradlePluginVersion`: вышла AGP 9.5.0. Такое предупреждение о вышедших версиях (`AndroidGradlePluginVersion`, `GradleDependency`) — не ошибка плана: записать его в журнал исполнения и продолжать; любое другое предупреждение или ошибка Lint — повод остановиться.
- `~/.gradle/gradle.properties` целиком не выводить: там пароли релизного ключа. Строки смотреть по одной.
- Код в плане взят из проверенной черновой копии без правок. Новые и переписанные целиком файлы даны полностью (перед блоком — строка с путём); изменения существующих — блоками `diff` относительно состояния после предыдущей задачи: блок можно сохранить во временный файл и применить `git apply <файл>` из корня репозитория. Блоки кода ограничены четырьмя обратными кавычками. Переносить их скриптом из файла плана, а не перепечатывать: в `TaskFormTest.kt` есть escape-последовательности Юникода (обратная косая черта, `u` и четыре цифры) для невидимых символов, а инструменты записи файлов превращают такие последовательности в сами символы — код тот же, но его не прочесть, и дерево не совпадёт с черновиком.
- Kotlin — официальный стиль; комментарии в коде — на английском. Имена тестов на устройстве — camelCase (D8 и `minSdk` 26), тестов JVM — в обратных кавычках.
- Каждая сборка печатает `[Incubating] Problems report is available at: …` и `Consider enabling configuration cache …` — это не ошибки; строки `Expected` их не упоминают.

## Review Focus

- **Задача меняется, пока открыта её форма.** Другое устройство переименовало задачу, убрало её срок или удалило категорию: форма показывает значения пользователя, «Сохранить» пишет только изменённое им по сравнению с задачей на момент открытия, удалённая категория видна как «No Tag» и остаётся, а запись, которая поверх нынешней задачи оставила бы напоминания без срока, ядро не отправляет: форма остаётся открытой с тем, что изменил пользователь, и говорит «The change could not be saved.». `TaskFormTest` (задача 1), `EditScreenTest.aSaveTheCoreRefusesLeavesTheFormAsTheUserHasItWithAMessage` (задача 4), `EditFlowTest` (задача 5: `whatTheWebChangesWhileTheFormIsOpenStays`, `aSaveTheCoreRefusesIsNotSentAndTheFormKeepsWhatTheUserChanged`).
- **MIUI выгрузила приложение посреди правки.** Форма возвращается со всеми значениями, выделением в описании и задачей на момент открытия — даже раньше, чем прочитаны данные; «Сохранить» после этого сравнивает с той же задачей. `EditSaverTest` (задача 4: значения, которые сохраняет экран), `EditScreenTest.theFormSurvivesAnUnloadingOfTheAppAndComesBackBeforeTheData` (задача 4), `EditFlowTest.theFormSurvivesATurnOfThePhoneAndAsksBeforeItsChangesAreLost` (задача 5).
- **Часовые пояса.** Срок в поясе, которого телефон не знает, остаётся как записан, пока его не трогали; телефон с поясом, заданным вручную (`GMT+03:00`), пишет новый срок в UTC с тем же моментом; день календаря Material 3 западнее Гринвича — тот, что выбран, а не накануне; время, которого весной нет, пишется моментом, который оно значит. `TaskFormTest` (задача 1), `RepositoriesTest` (задача 3: срок, не тронутый на телефоне в Токио, остаётся по Киеву).
- **Границы ввода.** Название обрезается на 1000 символах; описание длиннее 100 000 — ошибка, и сохранить нельзя; в число напоминания входят только цифры, а больше 52 недель (и больше, чем вмещает `Int`) — не напоминание; «Every» 1–999; не больше 10 напоминаний, а удалённое освобождает место. `RemindersTest`, `TaskFormTest` (задача 1), `EditScreenTest` (задача 4).
- **Выход без сохранения и запись после него.** «✕» и системное «Назад» спрашивают только при изменениях; возвращённая как была форма закрывается сразу; «Discard» ничего не пишет; запись, которую не пропустило ядро, оставляет форму открытой, а отказ сервера показывает экран, куда вернулась форма. `EditScreenTest.leavingAChangedFormAsksFirst` (задача 4), `EditFlowTest` (задача 5).

## Решения подплана

Спецификация оставила подплану вид экранов, навигацию, точные тексты и способ вставки разметки панелью (раздел 13). Решения ниже приняты при написании плана; любое можно поменять до исполнения.

| № | Тема | Решение | Почему |
|---|---|---|---|
| 1 | Где форма | «+» — круглая кнопка внизу справа в списке; «Изменить» — карандаш вверху экрана задачи, в любом статусе. Форма — отдельный экран: слева «✕», справа вверху «Создать» или «Сохранить». После «Создать» — снова список, после «Сохранить» — экран задачи с новыми значениями | Как закрывается диалог веба. Кнопка вверху не прячется под клавиатурой |
| 2 | Поля | В порядке диалога веба: название, описание с панелью, категория, срок, напоминания, повтор, размер. Тексты — веба, с «задачей» вместо «пузыря» (решение 23): «Create New Task», «Edit Task». Размер подписан, как в вебе, — «Bubble size: 45px»: это размер пузыря задачи в вебе | Прямое сравнение с вебом |
| 3 | Срок | Касание поля открывает календарь, затем часы — 24 часа, с переключателем на ввод цифрами. Срок записан так, как его пишет календарь веба: `11/02/2026 09:30`, `02.11.2026 09:30`. «✕» рядом убирает срок вместе с напоминаниями и повтором; прошедший срок — красный, с «Просрочено» под полем | Как в вебе; день календаря Material 3 читается в UTC (риск раздела 15) |
| 4 | Напоминания | Окно «Add notification» веба: «1 hour before», «1 day before» (уже добавленное недоступно) или «Custom…» — число и часы, дни или недели, до 52 недель. Без срока и при 10 напоминаниях кнопка «Remind me» недоступна, и строка под ней говорит почему | В вебе это подсказка при наведении, а на телефоне наведения нет |
| 5 | Повтор и числа | Переключатель «Repeat every» (при включении — каждый 1 день), «Every» 1–999, единица, дни недели у недель. В поля чисел входят только цифры; «Every» другого числа не принимает и, потеряв фокус, снова показывает число повтора — как в вебе | Клавиатура цифр телефона даёт и точку, и минус |
| 6 | Панель описания | «Жирный», «Курсив», «Зачёркнутый» оборачивают выделение (`**`, `*`, `~~`; пробелы по краям выделения остаются снаружи, без выделения — пустая пара и курсор в ней); списки добавляют «- », «1. », «2. »… или «- [ ] » в начало каждой непустой строки выделения; «Ссылка» — окно с адресом: «OK» только для `http`, `https` и `mailto`, вставляется `[текст](адрес)`, без выделения — `[адрес](адрес)`. Кнопки только добавляют разметку; убрать её можно правкой текста | Раздел 8. Веб показывает вставленное так, как ждут тесты |
| 7 | Чужие изменения при открытой форме | Форма показывает значения пользователя (веб в таком случае сбрасывает диалог). «Сохранить» пишет только поля, которые пользователь изменил по сравнению с задачей на момент открытия (решение 15), а ядро проверяет задачу, какой её оставит запись поверх нынешней (решение 16). Категория, удалённая на другом устройстве, показана серым «No Tag» и остаётся у задачи, пока пользователь не выберет другую | Правка с другого устройства не теряется, а запись, которая сломала бы задачу, не уходит |
| 8 | Выход без сохранения | «✕» или «Назад» при изменениях спрашивают «Discard the changes?» («Discard» / «Keep editing»); без изменений, в том числе возвращённых как было, форма закрывается сразу. Задачу удалили навсегда на другом устройстве — форма и экран задачи закрываются с сообщением «The task is no longer here.» | Решение 14 |
| 9 | Состояние формы | Сохраняются задача на момент открытия, форма при открытии и форма сейчас, с выделением в описании; описание, равное предыдущему, хранится один раз (два описания по 100 000 символов — около 400 КБ, меньше предела Android в 1 МБ). После выгрузки форма возвращается раньше данных | Решения 14 и 15: сравнение — с задачей на момент открытия, даже после выгрузки |
| 10 | Отказ записи | Ядро проверяет запись формы до того, как форма закроется. Запись, которую ядро не пропустило, не отправляется, а форма остаётся открытой со всем, что в ней изменено, и говорит «The change could not be saved.»: её можно поправить или отбросить. Отправленную запись, которую потом отклонил сервер, показывает экран, на который вернулась форма (задача или список), — как действия в 2.2 | Решение 14: изменения пользователя не пропадают без вопроса. Сервер отвечает, когда форма уже закрыта, — тогда сообщение показывает экран под ней |

## Мелочи итогового ревью 2.2

Итоговое ревью исполнения 2.2 отложило пять мелочей (журнал исполнения 2.2, строки «Final: minor (deferred)»). В этот план вошли те, что меняются вместе с его кодом:

| Мелочь | Где |
|---|---|
| `AppViewModel.toggle` молча ничего не делает, когда отметки на месте больше нет; «нажал — и ничего» не разобрать по журналу | Задача 5: одна строка `Log.i` — `AppViewModel` меняется там же |
| Нет теста на вложенный текст пункта чек-листа (`- [ ] a\n  nested text\n- [ ] b`) и на обрез абзаца из одного символа (`a\n    - [ ] b` — квадратик, `ab\n    - [ ] b` — один абзац) | Задача 2: два теста `MarkdownTest`; ответы веба проверены его редактором в черновике |
| Комментарий `Markdown.kt` неточен: веб убирает таблицу, только когда в описании есть другие блоки, а таблицу одну читает как HTML и сливает её строки | Задача 2: комментарий и тест таблицы рядом с другим блоком |
| Сверка ручного переноса с вебом не в репозитории, а `CLAUDE.md` не говорит, что `core/markdown` и `Recurrence.kt` — ручные переносы, которые надо сверять заново, когда веб меняется | Задача 6: строка в `CLAUDE.md` — для `core/markdown`, `Recurrence.kt` и нового `TaskForm.kt`. Сам стенд сверки в репозиторий не входит, как в 2.2: он запускает код веба под vitest (спецификация, раздел 11.1, — разовые сверки в черновике) |
| Разбор описания на экране задачи нельзя прервать: патологический текст держит поток `Dispatchers.Default` и после закрытия экрана | Не в 2.3: правка — внутри ручного переноса marked (`Lexer.blockTokens`), который этот план не трогает; та же сложность у веба, а такой текст пишет только владелец. Остаётся мелочью |

## Структура файлов

| Файл | Ответственность |
|---|---|
| `android/core/src/main/kotlin/…/core/model/TaskForm.kt` | (новый) форма задачи: значения, поля новой задачи и изменения правки (`taskForm.js`), пояс, в котором пишется срок, день календаря в UTC, срок в поле |
| `android/core/src/main/kotlin/…/core/model/Reminders.kt` | (изменение) готовые напоминания, своё напоминание из числа и единицы, ещё одно в списке |
| `android/core/src/main/kotlin/…/core/model/TaskChanges.kt` | (изменение) записи срока и повтора — общие с формой |
| `android/core/src/main/kotlin/…/core/contract/Validate.kt` | (изменение) `jsTrim` — `trim` JavaScript, общий с формой |
| `android/core/src/main/kotlin/…/core/markdown/Toolbar.kt` | (новый) кнопки панели описания |
| `android/core/src/main/kotlin/…/core/markdown/Markdown.kt` | (изменение) комментарий о таблицах |
| `android/core/src/test/kotlin/…/core/model/TaskFormTest.kt`, `core/markdown/ToolbarTest.kt` | (новые) тесты ядра |
| `android/core/src/test/kotlin/…/core/model/RemindersTest.kt`, `core/markdown/MarkdownTest.kt` | (изменение) тесты ядра |
| `android/app/src/main/kotlin/…/data/Documents.kt`, `Repositories.kt` | (изменение) документ новой задачи, `newId`, `create` |
| `android/app/src/main/kotlin/…/ui/EditScreen.kt` | (новый) экран «Правка»: состояние формы и его `Saver`, название, категория, размер, вопрос при выходе |
| `android/app/src/main/kotlin/…/ui/DescriptionField.kt` | (новый) описание с панелью кнопок и окном ссылки |
| `android/app/src/main/kotlin/…/ui/DueFields.kt` | (новый) срок с календарём и часами, напоминания с окном «Add notification», повтор |
| `android/app/src/main/kotlin/…/ui/TaskParts.kt` | (изменение) подпись напоминания, дни недели и «Overdue» — общие с формой |
| `android/app/src/main/kotlin/…/ui/TaskScreen.kt` | (изменение) карандаш «Изменить»; подпись напоминания и дни недели берёт из `TaskParts.kt` |
| `android/app/src/main/kotlin/…/ui/HomeScreen.kt` | (изменение) «+» |
| `android/app/src/main/kotlin/…/ui/AppViewModel.kt` | (изменение) `create`, `save`; журнал `toggle` |
| `android/app/src/main/kotlin/…/MainActivity.kt` | (изменение) форма поверх списка или экрана задачи |
| `android/app/src/main/res/drawable/ic_*.xml` | (новые) значки панели описания, срока, «+» и «Изменить» |
| `android/app/src/main/res/values/strings.xml`, `values-uk/strings.xml` | (изменение) тексты формы |
| `android/app/src/test/kotlin/…/data/DocumentsTest.kt` | (изменение) документ новой задачи |
| `android/app/src/test/kotlin/…/ui/EditSaverTest.kt` | (новый) состояние формы, которое хранит экран |
| `android/app/src/androidTest/kotlin/…/RepositoriesTest.kt` | (изменение) записи формы под настоящими правилами |
| `android/app/src/androidTest/kotlin/…/EditScreenTest.kt` | (новый) экран «Правка» сам по себе |
| `android/app/src/androidTest/kotlin/…/EditFlowTest.kt` | (новый) «+» и «Изменить» на эмуляторах так, как их читает веб |
| `android/app/src/androidTest/kotlin/…/HomeScreenTest.kt`, `TaskScreenTest.kt` | (изменение) «+» и карандаш |
| `docs/android.md`, `CLAUDE.md` | (изменение) форма задачи; ручные переносы кода веба |

Пакеты: `…` — это `com/pmobile78/todoround`.

---

### Task 1: Форма задачи в ядре

**Files:**
- Create: `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskForm.kt`
- Modify: `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Reminders.kt`, `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt`, `android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt`
- Test: `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskFormTest.kt` (новый), `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RemindersTest.kt` (изменение)

**Interfaces:**
- Consumes: из 1.1 — `Task`, `Due`, `Repeat`, `RepeatUnit`, `TaskStatus`, `Language`, `Limits`, `DEFAULT_RADIUS`, `validateTask`, `isValidTimeZone`, `parseLocal`, `formatLocal`, `toInstant`, `toLocal`; из 2.1 — `dueMoment`; из 2.2 — `Task.toRecord()`, `ReminderUnit`.
- Produces (`com.pmobile78.todoround.core.model`):
  - `data class TaskForm(val title: String, val description: String, val categoryId: String?, val due: String?, val reminders: List<Int>, val repeat: Repeat?, val radius: Int)` — значения формы; `due` — «YYYY-MM-DDTHH:mm», которые показывают выбор даты и времени на телефоне; `categoryId` `null` — «No category»; `val NEW_TASK_FORM` — форма новой задачи: без категории, без срока, размер 45; `val NEW_REPEAT = Repeat(every = 1, unit = RepeatUnit.DAYS)`;
  - `fun Task.toForm(zone: String): TaskForm` — форма задачи, как она открывается на телефоне в поясе [zone]; `fun TaskForm.canSave(): Boolean` — есть название (без пробелов по краям, как `trim` JavaScript) и описание не длиннее 100 000; `fun TaskForm.withoutDue(): TaskForm` — без срока, напоминаний и повтора;
  - `fun writeZone(zone: String): String` — пояс телефона, если его знает база `java.time`, иначе `"UTC"` (решение 5);
  - `fun newTaskFields(form: TaskForm, zone: String): Map<String, Any?>` — поля новой задачи `title`, `description`, `categoryId`, `due`, `reminders`, `repeat`, `radius` в виде записи (целые — `Long`, необязательных ключей повтора нет); `fun newTaskErrors(id: String, fields: Map<String, Any?>, now: Instant): List<String>` — ошибки `validateTask` записи новой задачи;
  - `fun formChanges(task: Task, opened: TaskForm, form: TaskForm, zone: String): Map<String, Any?>` — изменения задачи [task] (задачи на момент открытия формы), которые делает [form]; [opened] — форма при открытии;
  - `fun repeatEvery(text: String): Int?` — «Every» как набрано: целое 1–999 или `null`; `fun Repeat.toggledWeekday(day: Int): Repeat`;
  - `fun pickedDate(utcMillis: Long): LocalDate`, `fun pickerMillis(date: LocalDate): Long` — день календаря Material 3 и его миллисекунды, в UTC; `fun pickedDue(date: LocalDate, hour: Int, minute: Int): String`; `fun formDateTime(local: String, language: Language): String` — `10/23/2026 09:30` или `23.10.2026 09:30`;
  - в `Reminders.kt`: `val REMINDER_PRESETS: List<Int>` = `[60, 1440]`; `fun reminderMinutes(count: String, unit: ReminderUnit): Int?` — минуты числа [count] единиц или `null`, если это не целое от 1 часа до 52 недель; `fun withReminder(reminders: List<Int>, minutes: Int): List<Int>`;
  - `com.pmobile78.todoround.core.contract`: `internal fun jsTrim(value: String): String`; в `TaskChanges.kt` — `internal fun Due.toRecord()` и `internal fun Repeat.toRecord()`, которыми теперь пользуется и `Task.toRecord()`.

- [ ] **Step 1: Написать падающие тесты**

`TaskFormTest` повторяет `taskForm.test.js` веба на телефоне в Берлине и добавляет правила телефона: пояс, которого нет в базе (`GMT+03:00`), пишет срок в UTC с тем же моментом (решение 5); весеннее время, которого нет, пишется моментом, который оно значит; `trim` — как в JavaScript (`U+FEFF` и `U+00A0` убираются, `U+0085` — нет); день календаря Material 3 — его день в UTC, когда пояс телефона — Лос-Анджелес (риск раздела 15 спецификации). `RemindersTest` — готовые и свои напоминания, как `reminders.test.js` веба, и число, которое не помещается в `Int`.

Файл `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskFormTest.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.LocalDate
import java.util.TimeZone

/** The form of a task as the web's src/services/data/taskForm.js reads its dialogs (taskForm.test.js). */
class TaskFormTest {
    private val berlin = "Europe/Berlin"

    private fun task(
        title: String = "Pay bills",
        categoryId: String? = "c1",
        due: Due? = Due("2026-10-15T09:00", "Europe/Kyiv"),
        reminders: List<Int> = listOf(60),
        repeat: Repeat? = null,
        pulseMuted: Boolean = false,
    ) = Task(
        id = "t1",
        title = title,
        description = "- [ ] power",
        categoryId = categoryId,
        status = TaskStatus.ACTIVE,
        due = due,
        reminders = reminders,
        repeat = repeat,
        radius = 45,
        pulseMuted = pulseMuted,
        createdAt = Instant.parse("2026-10-01T08:00:00Z"),
        updatedAt = Instant.parse("2026-10-01T08:00:00Z"),
        deletedAt = null,
    )

    // A form of a new task with a due on a phone in Berlin.
    private fun form(
        title: String = "Pay bills",
        description: String = "",
        categoryId: String? = null,
        due: String? = "2026-10-15T09:30",
        reminders: List<Int> = emptyList(),
        repeat: Repeat? = null,
    ) = TaskForm(title, description, categoryId, due, reminders, repeat, radius = 45)

    // The changes of the edit form of [task] on a phone in Berlin, the user having changed [edit].
    private fun changes(task: Task, edit: (TaskForm) -> TaskForm): Map<String, Any?> {
        val opened = task.toForm(berlin)
        return formChanges(task, opened, edit(opened), berlin)
    }

    @Test
    fun `the form of a task shows its due on this phone, the rest as it is`() {
        // 09:00 in Kyiv is 08:00 in Berlin.
        assertEquals(TaskForm("Pay bills", "- [ ] power", "c1", "2026-10-15T08:00", listOf(60), null, 45), task().toForm(berlin))
        assertNull(task(due = null, reminders = emptyList()).toForm(berlin).due)
        // A zone this phone does not know: the time as written, in the zone of the phone (2.2 №4).
        assertEquals("2026-10-15T09:00", task(due = Due("2026-10-15T09:00", "Mars/Olympus")).toForm(berlin).due)
    }

    @Test
    fun `a new task has no category, no due and the size 45`() {
        assertEquals(TaskForm("", "", null, null, emptyList(), null, 45), NEW_TASK_FORM)
    }

    @Test
    fun `a new task writes its due in the zone of this phone`() {
        assertEquals(
            mapOf(
                "title" to "Pay bills", "description" to "", "categoryId" to null, "due" to mapOf("local" to "2026-10-15T09:30", "tz" to berlin),
                "reminders" to emptyList<Long>(), "repeat" to null, "radius" to 45L,
            ),
            newTaskFields(form(), berlin),
        )
    }

    @Test
    fun `a zone the base does not know writes the due in UTC at the same moment`() {
        // Android gives a zone set by hand as GMT+03:00, which neither the web nor the functions know (2.2 №5).
        assertEquals("UTC", writeZone("GMT+03:00"))
        assertEquals(berlin, writeZone(berlin))
        assertEquals(mapOf("local" to "2026-10-15T06:30", "tz" to "UTC"), newTaskFields(form(), "GMT+03:00")["due"])
        val muted = task(due = Due("2026-10-15T09:00", berlin), pulseMuted = true)
        val opened = muted.toForm("GMT+03:00")
        assertEquals(
            mapOf("due" to mapOf("local" to "2026-10-16T07:00", "tz" to "UTC"), "pulseMuted" to false),
            formChanges(muted, opened, opened.copy(due = "2026-10-16T10:00"), "GMT+03:00"),
        )
    }

    @Test
    fun `a time that a spring night skips is written as the moment it means`() {
        // 02:30 on 29 March 2026 does not exist in Berlin: it is 03:30, as the web's picker gives it.
        assertEquals(mapOf("local" to "2026-03-29T03:30", "tz" to berlin), newTaskFields(form(due = "2026-03-29T02:30"), berlin)["due"])
    }

    @Test
    fun `the title loses the spaces around it, as JavaScript trims, and the description stays as typed`() {
        val fields = newTaskFields(form(title = "\uFEFF\u00A0 Pay bills \n", description = "**bold**\n"), berlin)
        assertEquals("Pay bills", fields["title"])
        assertEquals("**bold**\n", fields["description"])
        // U+0085 is not a space of JavaScript's trim.
        assertEquals("\u0085Pay", newTaskFields(form(title = "\u0085Pay "), berlin)["title"])
    }

    @Test
    fun `the category is the one picked, none is null`() {
        assertEquals("c1", newTaskFields(form(categoryId = "c1"), berlin)["categoryId"])
        assertNull(newTaskFields(form(categoryId = null), berlin)["categoryId"])
    }

    @Test
    fun `reminders are whole hours from 1 hour to 52 weeks, without repeats, ascending, at most 10`() {
        assertEquals(listOf(60L, 120L, 1440L), newTaskFields(form(reminders = listOf(1440, 60, 60, 90, 0, 524_220, 120)), berlin)["reminders"])
        val eleven = (1..11).map { it * 60 }
        assertEquals(eleven.take(10).map(Int::toLong), newTaskFields(form(reminders = eleven), berlin)["reminders"])
    }

    @Test
    fun `a repeat is every 1 to 999 units`() {
        assertEquals(mapOf("every" to 999L, "unit" to "days"), newTaskFields(form(repeat = Repeat(1500, RepeatUnit.DAYS)), berlin)["repeat"])
        assertEquals(mapOf("every" to 1L, "unit" to "hours"), newTaskFields(form(repeat = Repeat(0, RepeatUnit.HOURS)), berlin)["repeat"])
    }

    @Test
    fun `weekdays stay only with weeks, sorted and only when some are chosen`() {
        assertEquals(
            mapOf("every" to 2L, "unit" to "weeks", "weekdays" to listOf(1L, 7L)),
            newTaskFields(form(repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(7, 1, 1, 9))), berlin)["repeat"],
        )
        assertEquals(mapOf("every" to 1L, "unit" to "weeks"), newTaskFields(form(repeat = Repeat(1, RepeatUnit.WEEKS, weekdays = emptyList())), berlin)["repeat"])
        assertEquals(mapOf("every" to 1L, "unit" to "days"), newTaskFields(form(repeat = Repeat(1, RepeatUnit.DAYS, weekdays = listOf(1))), berlin)["repeat"])
    }

    @Test
    fun `a monthly repeat takes its day from the due`() {
        assertEquals(
            mapOf("every" to 1L, "unit" to "months", "monthDay" to 15L),
            newTaskFields(form(repeat = Repeat(1, RepeatUnit.MONTHS, monthDay = 3)), berlin)["repeat"],
        )
    }

    @Test
    fun `without a due there are no reminders and no repeat`() {
        val fields = newTaskFields(form(due = null, reminders = listOf(60), repeat = Repeat(1, RepeatUnit.DAYS)), berlin)
        assertNull(fields["due"])
        assertEquals(emptyList<Long>(), fields["reminders"])
        assertNull(fields["repeat"])
    }

    @Test
    fun `the record of a new task passes the check of the core, and a broken one does not`() {
        val now = Instant.parse("2026-10-14T10:00:00Z")
        val full = form(categoryId = "c1", reminders = listOf(60, 1440), repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5)))
        assertEquals(emptyList<String>(), newTaskErrors("t1", newTaskFields(full, berlin), now))
        assertEquals(listOf("title: invalid"), newTaskErrors("t1", newTaskFields(form(title = " "), berlin), now))
        assertEquals(listOf("description: invalid"), newTaskErrors("t1", newTaskFields(form(description = "x".repeat(100_001)), berlin), now))
    }

    @Test
    fun `an unchanged form changes nothing`() {
        val weekly = task(repeat = Repeat(1, RepeatUnit.WEEKS, weekdays = listOf(1, 7)), reminders = listOf(60, 1440))
        assertEquals(emptyMap<String, Any?>(), changes(weekly) { it })
    }

    @Test
    fun `only the fields the user changed are written`() {
        assertEquals(mapOf("title" to "Pay all bills", "categoryId" to null), changes(task()) { it.copy(title = "Pay all bills", categoryId = null) })
    }

    @Test
    fun `the due and its zone stay while the form shows the time it opened with`() {
        assertEquals(mapOf("radius" to 60L), changes(task()) { it.copy(radius = 60) })
        // A due in a zone this phone does not know stays as written too.
        assertEquals(mapOf("title" to "Pay all bills"), changes(task(due = Due("2026-10-15T09:00", "Mars/Olympus"))) { it.copy(title = "Pay all bills") })
    }

    @Test
    fun `a changed due is written in the zone of this phone and lets a muted task pulse again`() {
        assertEquals(
            mapOf("due" to mapOf("local" to "2026-10-16T09:00", "tz" to berlin), "pulseMuted" to false),
            changes(task(pulseMuted = true)) { it.copy(due = "2026-10-16T09:00") },
        )
    }

    @Test
    fun `clearing the due clears the reminders and the repeat with it`() {
        assertEquals(
            mapOf("due" to null, "reminders" to emptyList<Long>(), "repeat" to null),
            changes(task(repeat = Repeat(1, RepeatUnit.DAYS))) { it.withoutDue() },
        )
        // Even when the form still holds them, as the web's form would.
        assertEquals(
            mapOf("due" to null, "reminders" to emptyList<Long>(), "repeat" to null),
            changes(task(repeat = Repeat(1, RepeatUnit.DAYS))) { it.copy(due = null) },
        )
    }

    @Test
    fun `a monthly task that Done moved into a shorter month keeps its day while the due stays`() {
        val february = task(due = Due("2026-02-28T09:00", berlin), repeat = Repeat(1, RepeatUnit.MONTHS, monthDay = 31))
        assertEquals(mapOf("title" to "Rent"), changes(february) { it.copy(title = "Rent") })
        assertEquals(
            mapOf("repeat" to mapOf("every" to 2L, "unit" to "months", "monthDay" to 31L)),
            changes(february) { it.copy(repeat = Repeat(2, RepeatUnit.MONTHS)) },
        )
    }

    @Test
    fun `a new due gives a monthly repeat its day`() {
        val february = task(due = Due("2026-02-28T09:00", berlin), repeat = Repeat(1, RepeatUnit.MONTHS, monthDay = 31))
        assertEquals(
            mapOf("due" to mapOf("local" to "2026-03-15T09:00", "tz" to berlin), "repeat" to mapOf("every" to 1L, "unit" to "months", "monthDay" to 15L)),
            changes(february) { it.copy(due = "2026-03-15T09:00") },
        )
    }

    @Test
    fun `a repeat that becomes monthly takes the day of the due`() {
        val daily = task(due = Due("2026-01-31T09:00", berlin), repeat = Repeat(1, RepeatUnit.DAYS))
        assertEquals(
            mapOf("repeat" to mapOf("every" to 1L, "unit" to "months", "monthDay" to 31L)),
            changes(daily) { it.copy(repeat = Repeat(1, RepeatUnit.MONTHS)) },
        )
    }

    @Test
    fun `the form can be saved with a title and a description of at most 100 000 characters`() {
        assertTrue(form().canSave())
        assertFalse(form(title = " \u00A0\uFEFF\n").canSave())
        assertTrue(form(description = "x".repeat(100_000)).canSave())
        assertFalse(form(description = "x".repeat(100_001)).canSave())
    }

    @Test
    fun `clearing the due of the form takes its reminders and repeat`() {
        val full = form(reminders = listOf(60), repeat = Repeat(1, RepeatUnit.DAYS))
        assertEquals(full.copy(due = null, reminders = emptyList(), repeat = null), full.withoutDue())
    }

    @Test
    fun `Every takes a whole number from 1 to 999 and nothing else`() {
        assertEquals(1, repeatEvery("1"))
        assertEquals(999, repeatEvery("999"))
        assertEquals(12, repeatEvery("012"))
        assertNull(repeatEvery("0"))
        assertNull(repeatEvery("1000"))
        assertNull(repeatEvery(""))
        assertNull(repeatEvery("99999999999"))
        assertEquals(Repeat(1, RepeatUnit.DAYS), NEW_REPEAT)
    }

    @Test
    fun `a weekday is chosen in order and unchosen`() {
        val weekly = Repeat(1, RepeatUnit.WEEKS)
        assertEquals(listOf(5), weekly.toggledWeekday(5).weekdays)
        assertEquals(listOf(1, 5), weekly.toggledWeekday(5).toggledWeekday(1).weekdays)
        assertEquals(listOf(1), weekly.toggledWeekday(5).toggledWeekday(1).toggledWeekday(5).weekdays)
    }

    @Test
    fun `the day of a date picker is its day in UTC, west of Greenwich too`() {
        val zone = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone("America/Los_Angeles"))
        try {
            // Midnight UTC of 23 October is 17:00 of the 22nd in Los Angeles.
            assertEquals(LocalDate.of(2026, 10, 23), pickedDate(Instant.parse("2026-10-23T00:00:00Z").toEpochMilli()))
            assertEquals(Instant.parse("2026-10-23T00:00:00Z").toEpochMilli(), pickerMillis(LocalDate.of(2026, 10, 23)))
            assertEquals("2026-10-23T09:05", pickedDue(pickedDate(pickerMillis(LocalDate.of(2026, 10, 23))), 9, 5))
        } finally {
            TimeZone.setDefault(zone)
        }
    }

    @Test
    fun `the due shows as the web's date picker writes it`() {
        assertEquals("10/23/2026 09:30", formDateTime("2026-10-23T09:30", Language.EN))
        assertEquals("23.10.2026 09:30", formDateTime("2026-10-23T09:30", Language.UK))
    }
}
````

Изменения в `android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RemindersTest.kt`:

````diff
diff --git a/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RemindersTest.kt b/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RemindersTest.kt
index 3d9173c..9e3b4e0 100644
--- a/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RemindersTest.kt
+++ b/android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RemindersTest.kt
@@ -2,11 +2,13 @@ package com.pmobile78.todoround.core.model
 
 import org.junit.jupiter.api.Assertions.assertEquals
 import org.junit.jupiter.api.Assertions.assertFalse
+import org.junit.jupiter.api.Assertions.assertNull
+import org.junit.jupiter.api.Assertions.assertSame
 import org.junit.jupiter.api.Assertions.assertTrue
 import org.junit.jupiter.api.Test
 import java.time.Instant
 
-/** The reminders as the web's src/utils/reminders.js and ReminderEditor.jsx show them. */
+/** The reminders as the web's src/utils/reminders.js and ReminderEditor.jsx show and add them. */
 class RemindersTest {
     @Test
     fun `a reminder shows in its largest whole unit`() {
@@ -25,4 +27,40 @@ class RemindersTest {
         assertTrue(reminderPassed(60, due, "UTC", Instant.parse("2026-10-23T06:30:00.001Z")))
         assertFalse(reminderPassed(1440, due, "UTC", Instant.parse("2026-10-22T07:00:00Z")))
     }
+
+    @Test
+    fun `a number of hours, days or weeks is its minutes`() {
+        assertEquals(180, reminderMinutes("3", ReminderUnit.HOURS))
+        assertEquals(2880, reminderMinutes("2", ReminderUnit.DAYS))
+        assertEquals(524_160, reminderMinutes("52", ReminderUnit.WEEKS))
+        assertEquals(60, reminderMinutes("01", ReminderUnit.HOURS))
+    }
+
+    @Test
+    fun `a number below 1 or beyond 52 weeks is no reminder`() {
+        assertNull(reminderMinutes("0", ReminderUnit.DAYS))
+        assertNull(reminderMinutes("", ReminderUnit.DAYS))
+        assertNull(reminderMinutes("53", ReminderUnit.WEEKS))
+        assertNull(reminderMinutes("8737", ReminderUnit.HOURS))
+        // Too many weeks for an Int of minutes, too many digits for an Int at all.
+        assertNull(reminderMinutes("2147483647", ReminderUnit.WEEKS))
+        assertNull(reminderMinutes("99999999999", ReminderUnit.HOURS))
+    }
+
+    @Test
+    fun `one more reminder keeps the list in order and without repeats`() {
+        assertEquals(listOf(60, 1440, 10080), withReminder(listOf(60, 10080), 1440))
+        assertEquals(listOf(60, 1440), withReminder(listOf(60, 1440), 1440))
+    }
+
+    @Test
+    fun `a list of 10 takes no more`() {
+        val ten = (1..10).map { it * 60 }
+        assertSame(ten, withReminder(ten, 1440))
+    }
+
+    @Test
+    fun `1 hour and 1 day are the ready-made reminders`() {
+        assertEquals(listOf(60, 1440), REMINDER_PRESETS)
+    }
 }
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android --no-daemon :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/TaskFormTest.kt:50:9 Unresolved reference 'TaskForm'.` или `e: …/RemindersTest.kt:33:27 Unresolved reference 'reminderMinutes'.`: какой из двух файлов компилятор берёт первым, зависит от порядка файлов в каталоге копии (в черновике и при прогоне плана было по-разному); все ошибки — неизвестные имена этой задачи

- [ ] **Step 3: `TaskForm.kt`, напоминания и `trim` JavaScript**

`TaskForm.kt` — перенос `taskForm.js` (раздел 4 спецификации). Срок формы — местное время телефона; новый срок пишется моментом, который он значит, в `writeZone`: в поясе телефона или, если база его не знает, в UTC. Срок считается прежним, пока форма показывает то же время, что при открытии, — тогда остаются и `due`, и его `tz`, и число месяца у повтора по месяцам. Каждое поле сравнивается с задачей на момент открытия формы, и в изменения попадают только отличающиеся; новый срок сбрасывает `pulseMuted`. `jsTrim` убирает те же символы, что `String.prototype.trim()`: им уже пользовалась проверка названия в `Validate.kt`.

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskForm.kt`:

````kotlin
package com.pmobile78.todoround.core.model

import com.pmobile78.todoround.core.contract.DEFAULT_RADIUS
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.Limits
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.contract.formatLocal
import com.pmobile78.todoround.core.contract.isValidTimeZone
import com.pmobile78.todoround.core.contract.jsTrim
import com.pmobile78.todoround.core.contract.parseLocal
import com.pmobile78.todoround.core.contract.toInstant
import com.pmobile78.todoround.core.contract.toLocal
import com.pmobile78.todoround.core.contract.validateTask
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

/*
 * The form of a task (stage 2 spec, sections 4 and 7), as the web's src/services/data/taskForm.js
 * reads its dialogs: the values the screen shows, the fields of a new task and the changes of an
 * edited one. The due of the form is the date and time the pickers show on this phone, in its
 * zone; a new or changed due is written in that zone, or in UTC with the same moment when the base
 * of java.time does not know it (2.2 №5).
 */

/**
 * The values of the form. [due] is the "YYYY-MM-DDTHH:mm" the pickers show on this phone, or null;
 * [repeat] is as the repeat editor leaves it, its monthDay unused; [categoryId] null is "No category".
 */
data class TaskForm(
    val title: String,
    val description: String,
    val categoryId: String?,
    val due: String?,
    val reminders: List<Int>,
    val repeat: Repeat?,
    val radius: Int,
)

/** The form of a new task: no category, no due, the size 45 (spec, section 7). */
val NEW_TASK_FORM = TaskForm(
    title = "",
    description = "",
    categoryId = null,
    due = null,
    reminders = emptyList(),
    repeat = null,
    radius = DEFAULT_RADIUS,
)

/** The repeat a switched-on repeat starts with: every 1 day (RepeatEditor of the web). */
val NEW_REPEAT = Repeat(every = 1, unit = RepeatUnit.DAYS)

/** The form of this task as it opens on a phone in [zone]: its due as the phone shows it (dueForPicker of the web). */
fun Task.toForm(zone: String): TaskForm = TaskForm(
    title = title,
    description = description,
    categoryId = categoryId,
    due = due?.let { toLocal(dueMoment(it, zone), zone) },
    reminders = reminders,
    repeat = repeat,
    radius = radius,
)

/** Whether the form can be saved, as the web's dialog lets it: a title, and a description of at most 100 000 characters. */
fun TaskForm.canSave(): Boolean = jsTrim(title).isNotEmpty() && description.length <= Limits.DESCRIPTION_MAX_LENGTH

/** The form without its due: "Clear" takes the reminders and the repeat with it (spec, section 7). */
fun TaskForm.withoutDue(): TaskForm = copy(due = null, reminders = emptyList(), repeat = null)

/** The zone a new or changed due is written in (2.2 №5): [zone], the zone of the phone, or UTC when the base does not know it. */
fun writeZone(zone: String): String = if (isValidTimeZone(zone)) zone else UTC

/** The fields of a new task from [form] on a phone in [zone] (taskFieldsFromForm of the web), as its record keeps them. */
fun newTaskFields(form: TaskForm, zone: String): Map<String, Any?> {
    val due = form.due?.let { newDue(it, zone) }
    return mapOf(
        "title" to jsTrim(form.title),
        "description" to form.description,
        "categoryId" to form.categoryId,
        "due" to due?.toRecord(),
        "reminders" to storedReminders(form.reminders, due).map(Int::toLong),
        "repeat" to storedRepeat(form.repeat, due, monthDay = null)?.toRecord(),
        "radius" to form.radius.toLong(),
    )
}

/**
 * The errors of the record the new task [id] with [fields] would have, made at [now] (2.2 №16): a
 * new task is active, pulses and is not deleted (spec, section 5).
 */
fun newTaskErrors(id: String, fields: Map<String, Any?>, now: Instant): List<String> = validateTask(
    fields + mapOf(
        "id" to id,
        "status" to TaskStatus.ACTIVE.wire,
        "pulseMuted" to false,
        "createdAt" to now.toString(),
        "updatedAt" to now.toString(),
        "deletedAt" to null,
    ),
)

/**
 * The changes [form] makes to [task], the task as the form opened on it (taskChangesFromForm of the
 * web; 2.2 №15): only the fields that differ from it. The due stays, and its zone with it, while the
 * form shows the time it showed when it opened ([opened]), also on a phone in another zone or with
 * a zone this phone does not know; a changed due takes the zone of the phone (writeZone) and lets a
 * muted task pulse again.
 */
fun formChanges(task: Task, opened: TaskForm, form: TaskForm, zone: String): Map<String, Any?> {
    val dueChanged = form.due != opened.due
    val due = if (dueChanged) form.due?.let { newDue(it, zone) } else task.due
    // "Done" may have moved a day-31 task to the 28th: while the due stays, so does the month day.
    val keptMonthDay = if (!dueChanged && task.repeat?.unit == RepeatUnit.MONTHS) task.repeat.monthDay else null
    val title = jsTrim(form.title)
    val reminders = storedReminders(form.reminders, due)
    val repeat = storedRepeat(form.repeat, due, keptMonthDay)
    return buildMap {
        if (title != task.title) put("title", title)
        if (form.description != task.description) put("description", form.description)
        if (form.categoryId != task.categoryId) put("categoryId", form.categoryId)
        if (due != task.due) put("due", due?.toRecord())
        if (reminders != task.reminders) put("reminders", reminders.map(Int::toLong))
        if (repeat != task.repeat) put("repeat", repeat?.toRecord())
        if (form.radius != task.radius) put("radius", form.radius.toLong())
        if (dueChanged && task.pulseMuted) put("pulseMuted", false)
    }
}

/** "Every" as typed: a whole number from 1 to 999, else null, and the repeat keeps its number (RepeatEditor of the web). */
fun repeatEvery(text: String): Int? = text.toIntOrNull()?.takeIf { it in 1..Limits.REPEAT_EVERY_MAX }

/** This repeat with the ISO weekday [day] chosen, or no longer chosen; the days stay in order (RepeatEditor of the web). */
fun Repeat.toggledWeekday(day: Int): Repeat {
    val days = weekdays.orEmpty()
    return copy(weekdays = if (day in days) days.filter { it != day } else (days + day).sorted())
}

/**
 * The day a date picker of Material 3 means by [utcMillis], the start of that day in UTC: the day is
 * read in UTC, not in the zone of the phone, where it would be the day before west of Greenwich
 * (spec, section 15).
 */
fun pickedDate(utcMillis: Long): LocalDate = Instant.ofEpochMilli(utcMillis).atOffset(ZoneOffset.UTC).toLocalDate()

/** What a date picker of Material 3 takes for [date]: the start of that day in UTC. */
fun pickerMillis(date: LocalDate): Long = date.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()

/** The due of the form on [date] at [hour]:[minute]. */
fun pickedDue(date: LocalDate, hour: Int, minute: Int): String = formatLocal(LocalDateTime.of(date, LocalTime.of(hour, minute)))

/** [local] ("YYYY-MM-DDTHH:mm") as the web's date picker writes it: "10/23/2026 09:30" in English, "23.10.2026 09:30" in Ukrainian. */
fun formDateTime(local: String, language: Language): String =
    LocalDateTime.parse(local).format(
        when (language) {
            Language.EN -> ENGLISH_PICKER
            Language.UK -> UKRAINIAN_PICKER
        },
    )

private const val UTC = "UTC"

private val ENGLISH_PICKER = DateTimeFormatter.ofPattern("MM/dd/uuuu HH:mm", Locale.ROOT)
private val UKRAINIAN_PICKER = DateTimeFormatter.ofPattern("dd.MM.uuuu HH:mm", Locale.ROOT)

// The due of the form as it is written: the moment the pickers mean on this phone, in the zone of writeZone.
private fun newDue(local: String, zone: String): Due {
    val tz = writeZone(zone)
    return Due(toLocal(toInstant(local, zone), tz), tz)
}

// Whole hours from 1 hour to 52 weeks, without repeats, ascending, at most 10; none without a due.
private fun storedReminders(reminders: List<Int>, due: Due?): List<Int> =
    if (due == null) {
        emptyList()
    } else {
        reminders.distinct()
            .filter { it in Limits.REMINDER_STEP_MINUTES..Limits.REMINDER_MAX_MINUTES && it % Limits.REMINDER_STEP_MINUTES == 0 }
            .sorted()
            .take(Limits.MAX_REMINDERS)
    }

// Every 1–999; ISO weekdays only for weeks and only when some are chosen; the month day of a monthly
// repeat is [monthDay] (the task's, kept while its due stays) or the day of the due (spec 4.2).
private fun storedRepeat(repeat: Repeat?, due: Due?, monthDay: Int?): Repeat? {
    if (repeat == null || due == null) return null
    val weekdays = if (repeat.unit == RepeatUnit.WEEKS) repeat.weekdays?.distinct()?.filter { it in 1..7 }?.sorted()?.ifEmpty { null } else null
    val day = if (repeat.unit == RepeatUnit.MONTHS) monthDay ?: parseLocal(due.local)!!.dayOfMonth else null
    return Repeat(repeat.every.coerceIn(1, Limits.REPEAT_EVERY_MAX), repeat.unit, weekdays, day)
}
````

Изменения в `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Reminders.kt`:

````diff
diff --git a/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Reminders.kt b/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Reminders.kt
index 21769e6..9b25f90 100644
--- a/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Reminders.kt
+++ b/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Reminders.kt
@@ -1,11 +1,13 @@
 package com.pmobile78.todoround.core.model
 
+import com.pmobile78.todoround.core.contract.Limits
 import java.time.Duration
 import java.time.Instant
 
 /*
- * The reminders of a task as the web shows them (src/utils/reminders.js, ReminderEditor.jsx):
- * minutes before the due, in their largest whole unit, the past ones struck through.
+ * The reminders of a task as the web shows and adds them (src/utils/reminders.js,
+ * ReminderEditor.jsx): minutes before the due, in their largest whole unit, the past ones struck
+ * through; 1 hour, 1 day, or a number of hours, days or weeks of the user's own.
  */
 
 enum class ReminderUnit { HOURS, DAYS, WEEKS }
@@ -23,6 +25,30 @@ fun reminderParts(minutes: Int): ReminderParts = when {
 fun reminderPassed(minutes: Int, due: Due, zone: String, now: Instant): Boolean =
     now > dueMoment(due, zone).minus(Duration.ofMinutes(minutes.toLong()))
 
+/** The ready-made reminders of the form: 1 hour and 1 day before the due (REMINDER_PRESETS of the web). */
+val REMINDER_PRESETS: List<Int> = listOf(HOUR_MINUTES, DAY_MINUTES)
+
+/**
+ * [count] of [unit] before the due in minutes, or null when [count], the digits as typed, is not a
+ * whole number of them from 1 hour to 52 weeks (reminderMinutes of the web).
+ */
+fun reminderMinutes(count: String, unit: ReminderUnit): Int? {
+    val number = count.toIntOrNull()?.takeIf { it >= 1 } ?: return null
+    val minutes = number.toLong() * unit.minutes
+    return if (minutes <= Limits.REMINDER_MAX_MINUTES) minutes.toInt() else null
+}
+
+/** [reminders] with [minutes] too, in order and without repeats; a list of 10 stays as it is (withReminder of the web). */
+fun withReminder(reminders: List<Int>, minutes: Int): List<Int> =
+    if (minutes in reminders || reminders.size >= Limits.MAX_REMINDERS) reminders else (reminders + minutes).sorted()
+
+private val ReminderUnit.minutes: Int
+    get() = when (this) {
+        ReminderUnit.HOURS -> HOUR_MINUTES
+        ReminderUnit.DAYS -> DAY_MINUTES
+        ReminderUnit.WEEKS -> WEEK_MINUTES
+    }
+
 private const val HOUR_MINUTES = 60
 private const val DAY_MINUTES = 1440
 private const val WEEK_MINUTES = 10080
````

Изменения в `android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt`:

````diff
diff --git a/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt b/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt
index 6fd8c88..99d1144 100644
--- a/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt
+++ b/android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt
@@ -80,19 +80,23 @@ fun Task.toRecord(): Map<String, Any?> = mapOf(
     "description" to description,
     "categoryId" to categoryId,
     "status" to status.wire,
-    "due" to due?.let { mapOf("local" to it.local, "tz" to it.tz) },
+    "due" to due?.toRecord(),
     "reminders" to reminders.map(Int::toLong),
-    "repeat" to repeat?.let { repeat ->
-        buildMap {
-            put("every", repeat.every.toLong())
-            put("unit", repeat.unit.wire)
-            repeat.weekdays?.let { put("weekdays", it.map(Int::toLong)) }
-            repeat.monthDay?.let { put("monthDay", it.toLong()) }
-        }
-    },
+    "repeat" to repeat?.toRecord(),
     "radius" to radius.toLong(),
     "pulseMuted" to pulseMuted,
     "createdAt" to createdAt.toString(),
     "updatedAt" to updatedAt.toString(),
     "deletedAt" to deletedAt?.toString(),
 )
+
+/** The record of this due, as tasks keep it. */
+internal fun Due.toRecord(): Map<String, Any?> = mapOf("local" to local, "tz" to tz)
+
+/** The record of this repeat, as tasks keep it: weekdays and monthDay only when it has them. Whole numbers are Long. */
+internal fun Repeat.toRecord(): Map<String, Any?> = buildMap {
+    put("every", every.toLong())
+    put("unit", unit.wire)
+    weekdays?.let { put("weekdays", it.map(Int::toLong)) }
+    monthDay?.let { put("monthDay", it.toLong()) }
+}
````

Изменения в `android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt`:

````diff
diff --git a/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt b/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt
index ced3f02..56c867d 100644
--- a/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt
+++ b/android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt
@@ -62,10 +62,12 @@ private fun isIsoTimestamp(value: Any?): Boolean {
 
 private fun trimmedLengthIn(value: Any?, max: Int): Boolean {
     if (value !is String) return false
-    val length = value.trim { it.code in JS_SPACES }.length
-    return length in 1..max
+    return jsTrim(value).length in 1..max
 }
 
+/** [value] without the white space and line ends around it, as String.prototype.trim() of JavaScript leaves it. */
+internal fun jsTrim(value: String): String = value.trim { it.code in JS_SPACES }
+
 /** Firestore-safe document id: 1..128 characters, no "/". */
 fun isValidId(value: Any?): Boolean =
     value is String && value.isNotEmpty() && value.length <= Limits.ID_MAX_LENGTH && '/' !in value
````

- [ ] **Step 4: Тесты проходят**

Run: `android/gradlew -p android --no-daemon :core:test`
Expected: `core tests: 192 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add android/core/src/main/kotlin/com/pmobile78/todoround/core/contract/Validate.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/model/Reminders.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskChanges.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/model/TaskForm.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/model/RemindersTest.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/model/TaskFormTest.kt
git commit -F - <<'EOF'
feat(android): the form of a task in the core, as the web reads its dialogs

Stage 2.3, task 1 (spec sections 4 and 7; 2.2 No. 5, 15). TaskForm.kt
ports the web's src/services/data/taskForm.js: the form of a task with
its due as the phone shows it, the fields of a new task, and the changes
of an edited one: only the fields that differ from the task as the form
opened, the due and its zone kept while the form shows the time it
opened with, a changed due written in the zone of the phone (in UTC at
the same moment when the base of java.time does not know that zone) and
letting a muted task pulse again, the month day of a monthly repeat kept
while the due stays. Reminders.kt gets the ready-made reminders,
reminderMinutes and withReminder of src/utils/reminders.js. The day of
a Material 3 date picker is read in UTC (spec section 15). On 4000
random forms the result is the web's (a check of the draft, not
committed).
EOF
```

---

### Task 2: Кнопки панели описания в ядре и мелочи ревью 2.2 в `core/markdown`

**Files:**
- Create: `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Toolbar.kt`
- Modify: `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Markdown.kt` (комментарий)
- Test: `android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/ToolbarTest.kt` (новый), `android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/MarkdownTest.kt` (изменение)

**Interfaces:**
- Consumes: из 2.2 — `parseMarkdown`, `Block`, `Inline`, `TaskItem`, `isSafeLink`.
- Produces (`com.pmobile78.todoround.core.markdown`): `data class Selected(val text: String, val start: Int, val end: Int)` — текст и выделение (`start` после `end`, если выделяли назад); `enum class Emphasis(val marker: String) { BOLD("**"), ITALIC("*"), STRIKE("~~") }`; `enum class LineStart { BULLET, NUMBER, TASK }`; `fun Selected.emphasized(emphasis: Emphasis): Selected`; `fun Selected.listed(lineStart: LineStart): Selected`; `fun Selected.linked(url: String): Selected?` — `null`, если адрес не `http`, `https` или `mailto`.

- [ ] **Step 1: Написать падающие тесты**

`ToolbarTest` проверяет, что пишет каждая кнопка и куда встаёт выделение, а ещё — что `parseMarkdown` (тот, что показывает описание так же, как веб) читает вставленное как жирный текст, чек-лист, нумерованный список и ссылку. Черновик этого плана проверил те же тексты в редакторе веба (TipTap 3.32 поверх marked 17.0.6): веб показывает их так же. Там же нашлось, что пара `****` одна в строке — для веба горизонтальная черта; поэтому кнопка без выделения ставит курсор между `**` и `**`, а текст пользователь набирает сам.

Файл `android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/ToolbarTest.kt`:

````kotlin
package com.pmobile78.todoround.core.markdown

import com.pmobile78.todoround.core.markdown.Block.OrderedList
import com.pmobile78.todoround.core.markdown.Block.Paragraph
import com.pmobile78.todoround.core.markdown.Block.TaskList
import com.pmobile78.todoround.core.markdown.Inline.Text
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** The buttons over the description field: the Markdown they put in, and how the web then shows it. */
class ToolbarTest {
    private fun p(text: String) = Paragraph(listOf(Text(text)))

    @Test
    fun `bold, italic and strikethrough go around the selection, which stays on its text`() {
        val hello = Selected("say hello world", 4, 9)
        assertEquals(Selected("say **hello** world", 6, 11), hello.emphasized(Emphasis.BOLD))
        assertEquals(Selected("say *hello* world", 5, 10), hello.emphasized(Emphasis.ITALIC))
        assertEquals(Selected("say ~~hello~~ world", 6, 11), hello.emphasized(Emphasis.STRIKE))
        // A selection made backwards is the same selection.
        assertEquals(Selected("say **hello** world", 6, 11), Selected("say hello world", 9, 4).emphasized(Emphasis.BOLD))
        assertEquals(
            listOf(Paragraph(listOf(Text("say "), Text("hello", bold = true), Text(" world")))),
            parseMarkdown(hello.emphasized(Emphasis.BOLD).text),
        )
    }

    @Test
    fun `the spaces at the ends of the selection stay outside the marks`() {
        assertEquals(Selected("say **hello** world", 6, 11), Selected("say hello world", 3, 10).emphasized(Emphasis.BOLD))
    }

    @Test
    fun `without a selection an empty pair goes in with the cursor between`() {
        assertEquals(Selected("say ****world", 6, 6), Selected("say world", 4, 4).emphasized(Emphasis.BOLD))
        assertEquals(Selected("say  ~~~~world", 7, 7), Selected("say  world", 4, 5).emphasized(Emphasis.STRIKE))
    }

    @Test
    fun `bold and then italic make both`() {
        val both = Selected("hello", 0, 5).emphasized(Emphasis.BOLD).emphasized(Emphasis.ITALIC)
        assertEquals(Selected("***hello***", 3, 8), both)
        assertEquals(listOf(Paragraph(listOf(Text("hello", bold = true, italic = true)))), parseMarkdown(both.text))
    }

    @Test
    fun `a list start goes at the start of every line of the selection`() {
        val shopping = Selected("Buy:\nmilk\nbread", 5, 15)
        assertEquals(Selected("Buy:\n- [ ] milk\n- [ ] bread", 11, 27), shopping.listed(LineStart.TASK))
        assertEquals(Selected("Buy:\n- milk\n- bread", 7, 19), shopping.listed(LineStart.BULLET))
        assertEquals(
            listOf(p("Buy:"), TaskList(listOf(TaskItem(false, 8, listOf(p("milk"))), TaskItem(false, 19, listOf(p("bread")))))),
            parseMarkdown(shopping.listed(LineStart.TASK).text),
        )
    }

    @Test
    fun `numbers count the lines, and blank lines stay as they are`() {
        val numbered = Selected("milk\n\nbread\neggs", 0, 16).listed(LineStart.NUMBER)
        assertEquals(Selected("1. milk\n\n2. bread\n3. eggs", 3, 25), numbered)
        assertEquals(listOf(OrderedList(1, null, listOf(listOf(p("milk")), listOf(p("bread")), listOf(p("eggs"))))), parseMarkdown(numbered.text))
    }

    @Test
    fun `at a cursor the start goes at its line, an empty one too, and the cursor moves with the text`() {
        assertEquals(Selected("Buy:\n- milk", 9, 9), Selected("Buy:\nmilk", 7, 7).listed(LineStart.BULLET))
        assertEquals(Selected("Buy:\n- [ ] ", 11, 11), Selected("Buy:\n", 5, 5).listed(LineStart.TASK))
        assertEquals(Selected("1. ", 3, 3), Selected("", 0, 0).listed(LineStart.NUMBER))
    }

    @Test
    fun `a selection that ends at the start of a line leaves that line`() {
        assertEquals(Selected("- a\n- b\nc", 2, 8), Selected("a\nb\nc", 0, 4).listed(LineStart.BULLET))
    }

    @Test
    fun `a link goes on the selection, or shows its address without one`() {
        assertEquals(Selected("see [site](https://example.com) now", 31, 31), Selected("see site now", 4, 8).linked("https://example.com"))
        assertEquals(Selected("see [https://example.com](https://example.com)", 46, 46), Selected("see ", 4, 4).linked(" https://example.com "))
        assertEquals(
            listOf(Paragraph(listOf(Text("see "), Text("site", link = "https://example.com"), Text(" now")))),
            parseMarkdown(Selected("see site now", 4, 8).linked("https://example.com")!!.text),
        )
        assertEquals("[mail me](mailto:a@example.com)", Selected("mail me", 0, 7).linked("mailto:a@example.com")!!.text)
    }

    @Test
    fun `an address the web would not take makes no link`() {
        assertNull(Selected("x", 0, 1).linked("javascript:alert(1)"))
        assertNull(Selected("x", 0, 1).linked("example.com"))
        assertNull(Selected("x", 0, 1).linked(""))
    }
}
````

Мелочи итогового ревью 2.2 (раздел «Мелочи итогового ревью 2.2» выше): `MarkdownTest` закрепляет случаи, которые ревьюер проверил на вебе, а тест таблицы — то, что веб делает с таблицей рядом с другими блоками. Эти тесты проходят и до правок: они закрепляют уже верное поведение.

Изменения в `android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/MarkdownTest.kt`:

````diff
diff --git a/android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/MarkdownTest.kt b/android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/MarkdownTest.kt
index c8152e1..03cec75 100644
--- a/android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/MarkdownTest.kt
+++ b/android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/MarkdownTest.kt
@@ -115,10 +115,12 @@ class MarkdownTest {
     }
 
     @Test
-    fun `raw html and a table show as the text they are`() {
+    fun `raw html and a table show as the text they are, line by line`() {
         assertEquals(listOf(Paragraph(listOf(Text("a <b>b</b> c")))), parseMarkdown("a <b>b</b> c"))
         assertEquals(listOf(p("<div>\nx\n</div>")), parseMarkdown("<div>\nx\n</div>"))
+        // The web runs the lines of a table together when it is all the description, and leaves it out beside other blocks.
         assertEquals(listOf(p("| a | b |\n|---|---|\n| 1 | 2 |")), parseMarkdown("| a | b |\n|---|---|\n| 1 | 2 |"))
+        assertEquals(listOf(p("x"), p("| a | b |\n|---|---|\n| 1 | 2 |")), parseMarkdown("x\n\n| a | b |\n|---|---|\n| 1 | 2 |"))
     }
 
     @Test
@@ -142,6 +144,21 @@ class MarkdownTest {
         assertEquals(listOf(p("cat")), parseMarkdown("![cat](https://example.com/cat.png)"))
     }
 
+    @Test
+    fun `an indented line under a task is a second paragraph of it`() {
+        assertEquals(
+            listOf(TaskList(listOf(TaskItem(false, 3, listOf(p("a"), p("nested text"))), TaskItem(false, 25, listOf(p("b")))))),
+            parseMarkdown("- [ ] a\n  nested text\n- [ ] b"),
+        )
+    }
+
+    @Test
+    fun `a checklist indented as code ends a paragraph of one character, as on the web`() {
+        // marked cuts a paragraph where a block starts after its first character, and TipTap's checklist starts there.
+        assertEquals(listOf(p("a"), TaskList(listOf(TaskItem(false, 9, listOf(p("b")))))), parseMarkdown("a\n    - [ ] b"))
+        assertEquals(listOf(p("ab\n    - [ ] b")), parseMarkdown("ab\n    - [ ] b"))
+    }
+
     @Test
     fun `only http, https and mailto links open`() {
         assertTrue(isSafeLink("https://example.com"))
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android --no-daemon :core:test`
Expected: `BUILD FAILED`, `Execution failed for task ':core:compileTestKotlin'`; первая ошибка — `e: …/ToolbarTest.kt:17:21 Unresolved reference 'Selected'.`

- [ ] **Step 3: `Toolbar.kt` и комментарий `Markdown.kt`**

Кнопки меняют текст только вокруг выделения: отметки выделения ставятся вокруг текста без пробелов по краям; начало строки — у каждой строки, которой касается выделение (пустые строки из нескольких пропускаются, а строка, у самого начала которой кончается выделение, не входит), нумерация — по порядку; ссылка — только с безопасным адресом (`isSafeLink`). Выделение после кнопки сдвигается вместе со своим текстом.

Файл `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Toolbar.kt`:

````kotlin
package com.pmobile78.todoround.core.markdown

/*
 * The buttons over the description field (stage 2 spec, 2.2 №3 and section 8): they put the
 * Markdown of the web's toolbar around the selection or at the starts of its lines, and leave the
 * rest of the text as it is.
 */

/** A text and its selection from [start] to [end]; a selection made backwards has [start] after [end]. */
data class Selected(val text: String, val start: Int, val end: Int)

/** The marks a button puts around the selection: bold, italic, struck through. */
enum class Emphasis(val marker: String) { BOLD("**"), ITALIC("*"), STRIKE("~~") }

/** What a button puts at the start of the lines of the selection: a bullet, a number, a checkbox. */
enum class LineStart { BULLET, NUMBER, TASK }

/**
 * The marks of [emphasis] around the selection, the spaces at its ends left outside, where the web
 * reads them; the selection stays on its text, now inside the marks. Without a selection, an empty
 * pair with the cursor between.
 */
fun Selected.emphasized(emphasis: Emphasis): Selected {
    val from = minOf(start, end)
    val to = maxOf(start, end)
    val marker = emphasis.marker
    var first = from
    var last = to
    while (first < last && text[first].isWhitespace()) first++
    while (last > first && text[last - 1].isWhitespace()) last--
    if (first == last) {
        val cursor = to + marker.length
        return Selected(text.substring(0, to) + marker + marker + text.substring(to), cursor, cursor)
    }
    val result = text.substring(0, first) + marker + text.substring(first, last) + marker + text.substring(last)
    return Selected(result, first + marker.length, last + marker.length)
}

/**
 * [lineStart] at the start of every line the selection touches: "- ", "1. ", "2. " … or "- [ ] ".
 * Of several lines the blank ones stay as they are, and a selection that ends at the start of a
 * line leaves that line; the selection moves with its text.
 */
fun Selected.listed(lineStart: LineStart): Selected {
    val from = minOf(start, end)
    val to = maxOf(start, end)
    val last = if (to > from && text[to - 1] == '\n') to - 1 else to
    val starts = mutableListOf(text.lastIndexOf('\n', from - 1) + 1)
    var newline = text.indexOf('\n', starts.first())
    while (newline != -1 && newline < last) {
        starts += newline + 1
        newline = text.indexOf('\n', newline + 1)
    }
    val lines = if (starts.size > 1) starts.filter { lineOf(it).isNotBlank() } else starts
    val inserted = lines.mapIndexed { index, at ->
        at to when (lineStart) {
            LineStart.BULLET -> "- "
            LineStart.NUMBER -> "${index + 1}. "
            LineStart.TASK -> "- [ ] "
        }
    }
    val result = StringBuilder(text)
    inserted.asReversed().forEach { (at, prefix) -> result.insert(at, prefix) }
    fun moved(position: Int) = position + inserted.filter { it.first <= position }.sumOf { it.second.length }
    return Selected(result.toString(), moved(from), moved(to))
}

/**
 * A link to [url] on the selection, "[text](url)", or "[url](url)" without one, and the cursor
 * after it; null when the web would not take the address: only http, https and mailto (spec 8).
 */
fun Selected.linked(url: String): Selected? {
    val href = url.trim()
    if (!isSafeLink(href)) return null
    val from = minOf(start, end)
    val to = maxOf(start, end)
    val link = "[" + text.substring(from, to).ifBlank { href } + "](" + href + ")"
    val cursor = from + link.length
    return Selected(text.substring(0, from) + link + text.substring(to), cursor, cursor)
}

// The line that starts at [at], without its end.
private fun Selected.lineOf(at: Int): String = text.substring(at, text.indexOf('\n', at).let { if (it == -1) text.length else it })
````

Изменения в `android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Markdown.kt`:

````diff
diff --git a/android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Markdown.kt b/android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Markdown.kt
index 742b95f..5a947fc 100644
--- a/android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Markdown.kt
+++ b/android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Markdown.kt
@@ -4,8 +4,9 @@ package com.pmobile78.todoround.core.markdown
  * A description as the web shows it (stage 2 spec, section 8; data contract, section 5): the
  * document the web's editor builds from the Markdown (@tiptap/markdown 3.32 over marked 17.0.6,
  * src/utils/markdownEditor.js). Three things differ on purpose: raw HTML shows as the text it is
- * (2.2 №1) where the web reads it as formatting; a table of GFM shows as its text, which the web
- * leaves out; and a description that gives no block at all shows as one paragraph of its text,
+ * (2.2 №1) where the web reads it as formatting; a table of GFM shows as its text, line by line,
+ * where the web leaves it out beside other blocks and runs its lines together when it is all the
+ * description; and a description that gives no block at all shows as one paragraph of its text,
  * which the web reads as HTML. Each checkbox knows where its mark is in the description, so a tap
  * changes that one character and nothing else (2.2 №2).
  */
````

- [ ] **Step 4: Тесты проходят**

Run: `android/gradlew -p android --no-daemon :core:test`
Expected: `core tests: 204 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Markdown.kt android/core/src/main/kotlin/com/pmobile78/todoround/core/markdown/Toolbar.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/MarkdownTest.kt android/core/src/test/kotlin/com/pmobile78/todoround/core/markdown/ToolbarTest.kt
git commit -F - <<'EOF'
feat(android): the buttons of the description field, in the core

Stage 2.3, task 2 (spec 2.2 No. 3, section 8). Toolbar.kt puts the
Markdown of the web's toolbar into the text: bold, italic and
strikethrough around the selection (the spaces at its ends left outside;
without a selection, an empty pair with the cursor between), a bullet, a
number or a checkbox at the start of every line it touches, and a link
on it for http, https and mailto only. The web shows what the buttons
write as the tests expect it. From the final review of 2.2: MarkdownTest
pins a second paragraph under a task and the cut after a paragraph of
one character as the web shows them, and the comment of Markdown.kt
says what the web does with a table.
EOF
```

---

### Task 3: Новая задача и изменения формы: записи как в вебе

**Files:**
- Create (команда, если файла нет): `android/app/google-services.json` (вне git)
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt`
- Test: `android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt` (изменения)

**Interfaces:**
- Consumes: `NEW_TASK_FORM`, `newTaskFields`, `newTaskErrors`, `formChanges`, `Task.toForm`, `TaskForm.withoutDue` (задача 1); из 2.2 — `TasksRepository.update`, `changeErrors`; помощники тестов `emulatorBackend()`, `signUpNewUser()`, `fromServer()`, `readBack(uid, id, until)` и `webTask(...)` в `RepositoriesTest`.
- Produces (`com.pmobile78.todoround.data`): `fun newTaskDoc(fields: Map<String, Any?>): Map<String, Any?>` — документ новой задачи, как `newTaskData` веба: поля формы, `schemaVersion: 2`, `status: "active"`, `pulseMuted: false`, `overdueAt: null`, `deletedAt: null`, `createdAt` и `updatedAt` — `serverTimestamp()`, без `nextNotifyAt`; `TasksRepository.newId(uid: String): String` — автоматический id до записи; `suspend fun TasksRepository.create(uid: String, id: String, fields: Map<String, Any?>)` — возвращается, когда сервер принял запись, отказ бросает.

- [ ] **Step 1: Настройки Firebase этой машины**

`app` не собирается без `google-services.json`. Файл вне git: в копии, где приложение уже собирали, он есть; иначе его скачивает Firebase CLI (вход в CLI — аккаунт владельца, как у веба):

```bash
test -f android/app/google-services.json || firebase apps:sdkconfig ANDROID 1:699564548059:android:9246f56b0bf422d85fd1fe --project todo-flutter-fb8bf -o android/app/google-services.json
git status --short --ignored android/app
```

Expected: в выводе `git status` есть строка `!! android/app/google-services.json` (в копии, где приложение уже собирали, есть и `!! android/app/build/`).

- [ ] **Step 2: Написать падающие тесты**

`DocumentsTest` проверяет вид документа новой задачи — тот же, что у `newTaskData` веба (раздел 5 спецификации). `RepositoriesTest` пишет под настоящими правилами новую задачу со всеми полями и задачу из одного названия, а потом изменения формы: все поля, кроме срока, на телефоне в Токио (срок по Киеву, число месяца у повтора и остановленная пульсация остаются), новый срок (пояс телефона, число месяца от нового срока, пульсация снова) и без срока (напоминания и повтор уходят с ним). Ядро читает каждую задачу с сервера, и она проходит проверку.

Изменения в `android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt`:

````diff
diff --git a/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt b/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
index 9a5b44d..b1f15ef 100644
--- a/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
+++ b/android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
@@ -213,6 +213,33 @@ class DocumentsTest {
         assertEquals(mapOf("description" to "- [x] milk", "updatedAt" to FieldValue.serverTimestamp()), taskUpdate(mapOf("description" to "- [x] milk")))
     }
 
+    @Test
+    fun `a new task is its fields and the rest of the contract with the times of the server, as the web writes it`() {
+        val fields = mapOf<String, Any?>(
+            "title" to "Water",
+            "description" to "",
+            "categoryId" to null,
+            "due" to mapOf("local" to "2026-11-02T09:30", "tz" to "Europe/Kyiv"),
+            "reminders" to listOf(60L),
+            "repeat" to mapOf("every" to 1L, "unit" to "days"),
+            "radius" to 45L,
+        )
+        assertEquals(
+            fields + mapOf(
+                "schemaVersion" to 2,
+                "status" to "active",
+                "pulseMuted" to false,
+                "overdueAt" to null,
+                "createdAt" to FieldValue.serverTimestamp(),
+                "updatedAt" to FieldValue.serverTimestamp(),
+                "deletedAt" to null,
+            ),
+            newTaskDoc(fields),
+        )
+        // The server writes nextNotifyAt.
+        assertFalse("nextNotifyAt" in newTaskDoc(fields))
+    }
+
     @Test
     fun `a new device is this phone with notifications on, and the contract takes its record`() {
         assertEquals(
````

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt
index c245173..fb619fe 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt
@@ -5,6 +5,7 @@ import com.google.firebase.Timestamp
 import com.google.firebase.firestore.FieldValue
 import com.google.firebase.firestore.FirebaseFirestoreException
 import com.pmobile78.todoround.core.contract.Language
+import com.pmobile78.todoround.core.contract.RepeatUnit
 import com.pmobile78.todoround.core.contract.SortField
 import com.pmobile78.todoround.core.contract.SortOrder
 import com.pmobile78.todoround.core.contract.TaskStatus
@@ -12,13 +13,21 @@ import com.pmobile78.todoround.core.model.Category
 import com.pmobile78.todoround.core.model.Due
 import com.pmobile78.todoround.core.model.ListFilter
 import com.pmobile78.todoround.core.model.ListSort
+import com.pmobile78.todoround.core.model.NEW_TASK_FORM
+import com.pmobile78.todoround.core.model.Repeat
 import com.pmobile78.todoround.core.model.Task
 import com.pmobile78.todoround.core.model.TaskAction
+import com.pmobile78.todoround.core.model.changeErrors
 import com.pmobile78.todoround.core.model.changes
 import com.pmobile78.todoround.core.model.completionChanges
 import com.pmobile78.todoround.core.model.defaultSettings
 import com.pmobile78.todoround.core.model.descriptionChanges
+import com.pmobile78.todoround.core.model.formChanges
+import com.pmobile78.todoround.core.model.newTaskErrors
+import com.pmobile78.todoround.core.model.newTaskFields
+import com.pmobile78.todoround.core.model.toForm
 import com.pmobile78.todoround.core.model.toRecord
+import com.pmobile78.todoround.core.model.withoutDue
 import com.pmobile78.todoround.data.CategoriesRepository
 import com.pmobile78.todoround.data.SettingsRepository
 import com.pmobile78.todoround.data.TasksRepository
@@ -29,6 +38,7 @@ import kotlinx.coroutines.runBlocking
 import kotlinx.coroutines.tasks.await
 import kotlinx.coroutines.withTimeout
 import org.junit.Assert.assertEquals
+import org.junit.Assert.assertFalse
 import org.junit.Assert.assertTrue
 import org.junit.Test
 import org.junit.runner.RunWith
@@ -271,6 +281,108 @@ class RepositoriesTest {
         }
     }
 
+    @Test
+    fun aNewTaskIsWrittenAsTheWebWritesItAndPassesTheRules() = runBlocking {
+        withTimeout(60_000) {
+            val uid = backend.signUpNewUser()
+            val repository = TasksRepository(backend.db)
+            val form = NEW_TASK_FORM.copy(
+                title = " Water the plants ",
+                description = "- [ ] the big pot",
+                categoryId = "c1",
+                due = "2026-11-02T09:30",
+                reminders = listOf(1440, 60),
+                repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(5, 1)),
+                radius = 60,
+            )
+            val fields = newTaskFields(form, "Europe/Kyiv")
+            val id = repository.newId(uid)
+            assertEquals(emptyList<String>(), newTaskErrors(id, fields, Instant.now()))
+            repository.create(uid, id, fields)
+
+            val task = readBack(uid, id) { true }
+            assertEquals(
+                Task(
+                    id = id,
+                    title = "Water the plants",
+                    description = "- [ ] the big pot",
+                    categoryId = "c1",
+                    status = TaskStatus.ACTIVE,
+                    due = Due("2026-11-02T09:30", "Europe/Kyiv"),
+                    reminders = listOf(60, 1440),
+                    repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5)),
+                    radius = 60,
+                    pulseMuted = false,
+                    createdAt = task.createdAt,
+                    updatedAt = task.updatedAt,
+                    deletedAt = null,
+                ),
+                task,
+            )
+            // The fields of the server: overdueAt is null, nextNotifyAt is for Cloud Functions, both times are the server's.
+            val doc = backend.db.document("users/$uid/tasks/$id").fromServer()
+            assertEquals(2L, doc.getLong("schemaVersion"))
+            assertTrue(doc.contains("overdueAt") && doc.get("overdueAt") == null)
+            assertFalse(doc.contains("nextNotifyAt"))
+            assertEquals(doc.getTimestamp("createdAt"), doc.getTimestamp("updatedAt"))
+
+            // A title alone, as a new form gives it: no due, reminders, repeat or category, and the size 45.
+            val plain = repository.newId(uid)
+            repository.create(uid, plain, newTaskFields(NEW_TASK_FORM.copy(title = "Call mum"), "Europe/Kyiv"))
+            val called = readBack(uid, plain) { true }
+            assertEquals(listOf(null, emptyList<Int>(), null, null, 45), listOf(called.due, called.reminders, called.repeat, called.categoryId, called.radius))
+        }
+    }
+
+    @Test
+    fun theChangesOfTheFormAreWrittenAsTheWebWritesThemAndPassTheRules() = runBlocking {
+        withTimeout(120_000) {
+            val uid = backend.signUpNewUser()
+            val repository = TasksRepository(backend.db)
+            // A monthly task of the 31st that "Done" moved to the 30th, its pulse stopped.
+            write(
+                "users/$uid/tasks/t1",
+                webTask("Rent", mapOf("local" to "2026-11-30T09:00", "tz" to "Europe/Kyiv"), listOf(60), mapOf("every" to 1, "unit" to "months", "monthDay" to 31)) +
+                    ("pulseMuted" to true),
+            )
+            var task = readBack(uid, "t1") { true }
+
+            // Every field but the due, on a phone in Tokyo: the due and its zone, the month day and the stopped pulse stay.
+            var opened = task.toForm("Asia/Tokyo")
+            val edited = opened.copy(
+                title = "Pay rent",
+                description = "**soon**",
+                categoryId = null,
+                reminders = listOf(2880, 60),
+                repeat = Repeat(2, RepeatUnit.MONTHS),
+                radius = 70,
+            )
+            val changes = formChanges(task, opened, edited, "Asia/Tokyo")
+            assertEquals(emptyList<String>(), changeErrors(task, changes, Instant.now()))
+            repository.update(uid, "t1", changes)
+            task = readBack(uid, "t1") { it.title == "Pay rent" }
+            assertEquals(
+                listOf("**soon**", null, Due("2026-11-30T09:00", "Europe/Kyiv"), listOf(60, 2880), Repeat(2, RepeatUnit.MONTHS, monthDay = 31), 70, true),
+                listOf(task.description, task.categoryId, task.due, task.reminders, task.repeat, task.radius, task.pulseMuted),
+            )
+
+            // A new due: the zone of the phone, the day of the monthly repeat from it, and the pulse again.
+            opened = task.toForm("Asia/Tokyo")
+            repository.update(uid, "t1", formChanges(task, opened, opened.copy(due = "2026-12-15T10:00"), "Asia/Tokyo"))
+            task = readBack(uid, "t1") { it.due?.tz == "Asia/Tokyo" }
+            assertEquals(
+                listOf(Due("2026-12-15T10:00", "Asia/Tokyo"), Repeat(2, RepeatUnit.MONTHS, monthDay = 15), false),
+                listOf(task.due, task.repeat, task.pulseMuted),
+            )
+
+            // No due: the reminders and the repeat go with it.
+            opened = task.toForm("Asia/Tokyo")
+            repository.update(uid, "t1", formChanges(task, opened, opened.withoutDue(), "Asia/Tokyo"))
+            task = readBack(uid, "t1") { it.due == null }
+            assertEquals(listOf(emptyList<Int>(), null), listOf(task.reminders, task.repeat))
+        }
+    }
+
     @Test
     fun deleteForeverRemovesTheTask() = runBlocking {
         withTimeout(60_000) {
````

- [ ] **Step 3: Тест падает**

Run: `android/gradlew -p android --no-daemon :app:testDebugUnitTest`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugUnitTestKotlin'`; первая ошибка — `e: …/DocumentsTest.kt:237:13 Unresolved reference 'newTaskDoc'.`

- [ ] **Step 4: Документ новой задачи и `create`**

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
index a9c8736..c771bf2 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt
@@ -4,6 +4,7 @@ import com.google.firebase.Timestamp
 import com.google.firebase.firestore.FieldValue
 import com.pmobile78.todoround.core.contract.Platform
 import com.pmobile78.todoround.core.contract.SCHEMA_VERSION
+import com.pmobile78.todoround.core.contract.TaskStatus
 import com.pmobile78.todoround.core.contract.validateSettings
 import com.pmobile78.todoround.core.model.ListFilter
 import com.pmobile78.todoround.core.model.ListSort
@@ -93,6 +94,21 @@ fun taskUpdate(changes: Map<String, Any?>): Map<String, Any?> =
     changes.mapValues { (_, value) -> if (value == ServerTime) FieldValue.serverTimestamp() else value } +
         ("updatedAt" to FieldValue.serverTimestamp())
 
+/**
+ * A new task document with [fields] of the core (newTaskFields; stage 2 spec, section 5), as the
+ * web's newTaskData writes it: schema 2, active, pulsing, not overdue, not deleted, and the times of
+ * the server; nextNotifyAt is for the server to write.
+ */
+fun newTaskDoc(fields: Map<String, Any?>): Map<String, Any?> = fields + mapOf(
+    "schemaVersion" to SCHEMA_VERSION,
+    "status" to TaskStatus.ACTIVE.wire,
+    "pulseMuted" to false,
+    "overdueAt" to null,
+    "createdAt" to FieldValue.serverTimestamp(),
+    "updatedAt" to FieldValue.serverTimestamp(),
+    "deletedAt" to null,
+)
+
 /**
  * A new users/{uid}/devices/{FID} for this phone (contract, 3.3): notifications on, [address] for
  * the pushes (its FID once registered with FCM, or null) and the times of the server.
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
index 4b5b160..400d327 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt
@@ -38,6 +38,14 @@ class TasksRepository(private val db: FirebaseFirestore) {
         db.collection("users").document(uid).collection("tasks")
             .loaded { id, data -> taskFromRecord(taskRecord(id, data), acceptUnknownZone = true) }
 
+    /** A new automatic id for a task of [uid], known before the task is written (stage 2 spec, section 5). */
+    fun newId(uid: String): String = db.collection("users").document(uid).collection("tasks").document().id
+
+    /** Writes the new task [id] of [uid] with [fields] of the core (newTaskFields); returns once the server has it. */
+    suspend fun create(uid: String, id: String, fields: Map<String, Any?>) {
+        task(uid, id).set(newTaskDoc(fields)).await()
+    }
+
     /** Writes [changes] of the core to the task [id] of [uid] (stage 2 spec, section 5); returns once the server has them. */
     suspend fun update(uid: String, id: String, changes: Map<String, Any?>) {
         task(uid, id).update(taskUpdate(changes)).await()
````

- [ ] **Step 5: Сборка, тесты JVM и Lint**

Run: `android/gradlew -p android --no-daemon :core:cleanTest :app:cleanTestDebugUnitTest check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt` (задачи cleanTest — чтобы тесты шли заново и печатали свою строку и тогда, когда код модуля в задаче не менялся)
Expected: `core tests: 204 passed, 0 failed, 0 skipped`, `app debug tests: 33 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `0 errors, 1 warning` — единственное предупреждение `AndroidGradlePluginVersion` («A newer version of com.android.application than 9.4.1 is available»): вышла AGP 9.5.0, а версии плана не меняются (Global Constraints). Отчёт без предупреждений — `No issues found.` — тоже годится

- [ ] **Step 6: Тесты проходят на устройстве**

Свободны ли эмулятор и Gradle — их может занимать другая сессия:

```bash
source /media/big_disk/android/android-env.sh
OURS=$(for p in $(pgrep -f '[q]emu-system'); do [ "$(readlink /proc/$p/cwd)" = "$PWD" ] && echo $p; done)
if [ -n "$OURS" ]; then echo "our emulator is still running: stop it with the last block of this step"
elif adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"
elif pgrep -f '[G]radleDaemon|[G]radleWrapperMain' > /dev/null; then echo "Gradle is running: wait"
else echo "free"; fi
```

Expected: `free`. Свой эмулятор (запущен из корня этой копии, например после прерванного шага) — выключить последним блоком этого шага и проверить снова; иначе — ждать и проверять снова: чужой эмулятор и чужую сборку не трогать.

Эмулятор запустить в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-2-3.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi), а после загрузки ждёт ещё минуту: в первую минуту под нагрузкой система эмулятора закрывает «зависшие» фоновые процессы, и первый тест падал с `Process crashed`:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; sleep 60; echo booted
```

Expected: `booted`.

Тесты на устройстве под эмуляторами Firebase — в фоне (`run_in_background`), вывод в журнал. Экраны ещё прежние; новые тесты — записи `RepositoriesTest`:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh > /media/big_disk/android/work/device-2-3.log 2>&1; grep -E '^OK \(|^Tests run|^FAILURES|Script exited|^[0-9]+\) |TIMEOUT' /media/big_disk/android/work/device-2-3.log
ls android/app/build/device-screens
```

Expected: `OK (1 test)` (это `PermissionTest`: он идёт первым и один), затем `OK (55 tests)` и `Script exited successfully (code 0)`; снимки прежние — `list-en-light.png`, `list-uk-dark.png`, `reminders-en.png`, `reminders-xiaomi-off-en.png`, `task-en-light.png`, `task-uk-dark.png`. Ответ `Error: TIMEOUT: Port 8180 on 127.0.0.1 was not active within 60000ms` — эмулятору Firestore не хватило памяти, обычно из-за чужой сборки Gradle рядом с эмулятором: дождаться её конца и повторить блок. Падение одного теста этапа 3 `NotificationsTest` с `… did not come in 10 s` (уведомления в шторке под нагрузкой не успевают за 10 секунд; в черновике и при прогоне плана так было по разу с разными тестами этого класса, в заметках этапа 3 — тоже) к этому плану не относится: повторить блок тестов. Блок тестов идёт обычно 5–15 минут; дольше 25 минут — тест завис (при прогоне плана так встал тест 2.2 `AuthFlowTest`, когда системные приложения эмулятора перестали отвечать): `adb -e logcat -d | grep TestRunner` покажет `started:` без `finished:`. Тогда остановить приложение — `adb -e shell am force-stop com.pmobile78.todoround`, блок тестов закончится с ошибкой, — выключить эмулятор блоком ниже и повторить шаг с проверки, свободны ли эмулятор и Gradle.

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
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/RepositoriesTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Documents.kt android/app/src/main/kotlin/com/pmobile78/todoround/data/Repositories.kt android/app/src/test/kotlin/com/pmobile78/todoround/data/DocumentsTest.kt
git commit -F - <<'EOF'
feat(android): a new task and the changes of its form are written as on the web

Stage 2.3, task 3 (spec section 5). newTaskDoc writes a new task as the
web's newTaskData does: the fields of the form with schema 2, active,
pulsing, not overdue, not deleted, and the times of the server;
nextNotifyAt stays for the server to write. TasksRepository.newId gives
the automatic id before the write, and create sets the document.
RepositoriesTest proves under the real rules that a new task with every
field, and the changes of a form (a due kept on a phone in another zone,
a new due giving its day to a monthly repeat, no due at all), are
written as the web writes them and read back by the core.
EOF
```

---

### Task 4: Экран «Правка»

**Files:**
- Create: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/EditScreen.kt`, `ui/DescriptionField.kt`, `ui/DueFields.kt`; значки `android/app/src/main/res/drawable/ic_format_bold.xml`, `ic_format_italic.xml`, `ic_format_strikethrough.xml`, `ic_format_list_bulleted.xml`, `ic_format_list_numbered.xml`, `ic_check_box.xml`, `ic_link.xml`, `ic_event.xml`
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskParts.kt`, `ui/TaskScreen.kt` (подпись напоминания и дни недели переходят в общие части), `android/app/src/main/res/values/strings.xml`, `android/app/src/main/res/values-uk/strings.xml`
- Test: `android/app/src/test/kotlin/com/pmobile78/todoround/ui/EditSaverTest.kt`, `android/app/src/androidTest/kotlin/com/pmobile78/todoround/EditScreenTest.kt` (новые)

**Interfaces:**
- Consumes: всё ядро формы (задача 1); `Selected`, `Emphasis`, `LineStart`, `emphasized`, `listed`, `linked`, `isSafeLink` (задача 2); из 2.1–2.2 — `Session.SignedIn`, `UserData`, `currentMinute(clock)`, `appLanguage()`, `paletteColor`, `inOrder`, `dueView`, `reminderPassed`, `taskFromRecord`, `Task.toRecord()`; помощник тестов `screenshot(name)`.
- Produces (`com.pmobile78.todoround.ui`):
  - `@Immutable data class Edit(val task: Task?, val opened: TaskForm, val form: TaskForm, val selection: TextRange = TextRange(form.description.length))` — форма задачи [task] (`null` — новая): при открытии и сейчас, с выделением в описании; `val changed: Boolean`; `Edit.of(task: Task?, zone: String): Edit`;
  - `internal val EditSaver: Saver<Edit?, Any>` — значения, которые хранит состояние экрана;
  - `@Composable fun EditScreen(taskId: String?, session: Session.SignedIn, onSave: (Edit) -> Boolean, onClose: () -> Unit, onGone: () -> Unit = {}, clock: Clock = Clock.systemUTC())` — «Сохранить» отдаёт форму [onSave] и экран не закрывает: это делает тот, кто его открыл, когда запись отправлена (или писать нечего) и [onSave] вернул `true`; `false` — ядро запись не пропустило, и форма остаётся как есть с сообщением «The change could not be saved.» (решение 10);
  - в `TaskParts.kt`: `@Composable internal fun reminderLabel(minutes: Int): String`, `internal val WEEKDAYS`, `@Composable internal fun OverdueMark()`;
  - теги для тестов: `edit_screen`, `edit_close`, `edit_save`, `edit_title`, `edit_description`, `description_too_long`, `md_bold`, `md_italic`, `md_strike`, `md_bullets`, `md_numbers`, `md_tasks`, `md_link`, `link_url`, `link_ok`, `edit_category`, `category_none`, `category_<id>`, `edit_due`, `due_clear`, `date_ok`, `time_ok`, `form_reminder`, `reminder_delete_<минуты>`, `remind_me`, `remind_me_hint`, `preset_60`, `preset_1440`, `preset_custom`, `custom_count`, `reminder_unit_<hours|days|weeks>`, `reminder_save`, `repeat_switch`, `repeat_every`, `repeat_unit`, `repeat_unit_<hours|days|weeks|months>`, `weekday_<1–7>`, `edit_size`, `discard_confirm`, `discard_keep`, `loading`, `failed`.

- [ ] **Step 1: Написать падающие тесты**

`EditSaverTest` (JVM) — форма возвращается из сохранённого состояния целиком: задача с незнакомым поясом и повтором по месяцам, форма при открытии и сейчас, выделение; описание, равное предыдущему, хранится один раз (решение 9 этого плана).

Файл `android/app/src/test/kotlin/com/pmobile78/todoround/ui/EditSaverTest.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.compose.runtime.saveable.SaverScope
import androidx.compose.ui.text.TextRange
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.toForm
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.time.Instant

/** The form as the saved state of its screen keeps it over a turn of the phone and an unloading of the app (2.2 №14). */
class EditSaverTest {
    private val task = Task(
        id = "t1",
        title = "Rent",
        description = "- [ ] pay",
        categoryId = "c1",
        status = TaskStatus.DONE,
        due = Due("2026-11-30T09:00", "Mars/Olympus"),
        reminders = listOf(60, 2880),
        repeat = Repeat(1, RepeatUnit.MONTHS, monthDay = 31),
        radius = 60,
        pulseMuted = true,
        createdAt = Instant.parse("2026-10-01T08:00:00.123456Z"),
        updatedAt = Instant.parse("2026-10-02T08:00:00Z"),
        deletedAt = null,
    )

    private fun saved(edit: Edit?): Any? = with(EditSaver) { SaverScope { true }.save(edit) }

    private fun again(edit: Edit?): Edit? = saved(edit)?.let { EditSaver.restore(it) }

    @Test
    fun `the form of a task comes back whole`() {
        val opened = task.toForm("Europe/Kyiv")
        val edit = Edit(
            task,
            opened,
            opened.copy(title = "Pay rent", description = "**soon**", reminders = listOf(60), repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5))),
            TextRange(2, 6),
        )
        assertEquals(edit, again(edit))
    }

    @Test
    fun `the form of a new task comes back whole, and no form is none`() {
        val new = Edit.of(null, "UTC")
        val edit = new.copy(form = new.form.copy(title = "Call mum", due = "2026-11-02T09:30", repeat = Repeat(1, RepeatUnit.DAYS)))
        assertEquals(edit, again(edit))
        assertNull(saved(null))
    }

    @Test
    fun `a description the one before it has is kept once`() {
        val opened = task.toForm("UTC")
        val values = saved(Edit(task, opened, opened)) as List<*>
        assertEquals(listOf(null, null), listOf((values[1] as List<*>)[1], (values[2] as List<*>)[1]))
    }
}
````

`EditScreenTest` (на устройстве, без Firebase) проходит каждое поле формы так, как его проходит пользователь: календарь и часы — в режиме ввода цифрами (тест печатает дату `11022026` и время `09` и `30`; день календаря — его день в UTC, в каком бы поясе ни был эмулятор), напоминания — до десяти, повтор — с числом вне 1–999 и с потерей фокуса, кнопки описания и ссылка, пределы названия и описания, вопрос при выходе (кнопкой «✕» и «Назад» через диспетчер активности), «Сохранить», которое ядро не пропустило (форма остаётся как есть, с сообщением), сохранение формы при выгрузке (`StateRestorationTester`) — когда данные после неё ещё не прочитаны — и задача, которой больше нет. Нажатия — действиями узлов (`SemanticsActions.OnClick`), а не касанием: в черновике касание по полю «Unit» пришлось на миг, когда открывалась клавиатура и форма сдвигалась (`imePadding`), и ушло мимо; «Назад» — через `OnBackPressedDispatcher`, а не Espresso: окно «System UI isn't responding» нагруженного эмулятора забирало фокус, и Espresso ждал его 10 секунд. Тест снимает экран формы: `edit-en-light`.

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/EditScreenTest.kt`:

````kotlin
package com.pmobile78.todoround

import androidx.activity.OnBackPressedDispatcher
import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertContentDescriptionEquals
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsOff
import androidx.compose.ui.test.assertIsOn
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.junit4.StateRestorationTester
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextInputSelection
import androidx.compose.ui.test.performTextReplacement
import androidx.compose.ui.text.TextRange
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.TaskStatus
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskForm
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.core.model.toForm
import com.pmobile78.todoround.data.Loaded
import com.pmobile78.todoround.ui.Edit
import com.pmobile78.todoround.ui.EditScreen
import com.pmobile78.todoround.ui.Session
import com.pmobile78.todoround.ui.UserData
import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

/** The form of a task on its own (stage 2 spec, section 7): every field as the web's dialog has it. */
@RunWith(AndroidJUnit4::class)
class EditScreenTest {
    @get:Rule
    val compose = createComposeRule()

    private val here = ZoneId.systemDefault().id
    private val categories = listOf(Category("home", "Home", "#46a549", 1.0), Category("work", "Work", "#da3833", 2.0))

    // Now, for the screen: 20 October 2026, 10:00 UTC.
    private val clock = Clock.fixed(Instant.parse("2026-10-20T10:00:00Z"), ZoneOffset.UTC)
    private val saved = mutableListOf<Edit>()

    // What the caller tells of a save: its write is sent, or the core refused it.
    private var sent = true
    private var closed = 0
    private var gone = 0
    private lateinit var back: OnBackPressedDispatcher

    private fun task(
        due: Due? = Due("2026-11-02T09:30", ZoneId.systemDefault().id),
        reminders: List<Int> = listOf(60),
        repeat: Repeat? = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5)),
    ) = Task(
        id = "t1",
        title = "Water the plants",
        description = "- [ ] pots",
        categoryId = "home",
        status = TaskStatus.ACTIVE,
        due = due,
        reminders = reminders,
        repeat = repeat,
        radius = 60,
        pulseMuted = false,
        createdAt = Instant.parse("2026-10-01T08:00:00Z"),
        updatedAt = Instant.parse("2026-10-01T08:00:00Z"),
        deletedAt = null,
    )

    private fun session(tasks: List<Task>, fromCache: Boolean = false) =
        Session.SignedIn("olena@example.com", UserData(defaultSettings("en"), Loaded(tasks, 0, fromCache), Loaded(categories, 0, false)))

    private fun open(taskId: String?, session: Session.SignedIn) {
        compose.setContent {
            back = LocalOnBackPressedDispatcherOwner.current!!.onBackPressedDispatcher
            ToDoRoundTheme {
                EditScreen(taskId, session, onSave = { saved += it; sent }, onClose = { closed++ }, onGone = { gone++ }, clock = clock)
            }
        }
    }

    // A node of the form, which may be below the fold.
    private fun field(tag: String): SemanticsNodeInteraction = compose.onNodeWithTag(tag).performScrollTo()

    // A tap through the action of the node: a keyboard that opens moves the form under a touch, and a node
    // below the fold needs no scrolling.
    private fun press(tag: String) {
        compose.onNodeWithTag(tag).performSemanticsAction(SemanticsActions.OnClick)
    }

    private fun press(matcher: SemanticsMatcher) {
        compose.onNode(matcher).performSemanticsAction(SemanticsActions.OnClick)
    }

    private fun text(tag: String): String = compose.onNodeWithTag(tag).fetchSemanticsNode().config[SemanticsProperties.EditableText].text

    private fun reminders(): List<String> =
        compose.onAllNodesWithTag("form_reminder").fetchSemanticsNodes().map { it.config[SemanticsProperties.Text].joinToString() }

    // The pickers in their keyboard modes: the date as typed in English ("MMDDYYYY"), then the hour and the minute.
    private fun pickDue(date: String, hour: String, minute: String) {
        press("edit_due")
        press(hasContentDescription("Switch to text input mode"))
        compose.onNode(hasSetTextAction() and hasAnyAncestor(isDialog())).performTextReplacement(date)
        press("date_ok")
        // Material 3 1.4 names this button after one mode or the other: "… for the time input".
        press(hasContentDescription("for the time input", substring = true))
        val time = compose.onAllNodes(hasSetTextAction() and hasAnyAncestor(isDialog()))
        time[0].performTextReplacement(hour)
        time[1].performTextReplacement(minute)
        press("time_ok")
    }

    @Test
    fun aNewTaskTakesEveryFieldOfTheForm() {
        open(null, session(emptyList()))
        compose.onNodeWithText("Create New Task").assertExists()
        compose.onNodeWithTag("edit_save").assertIsNotEnabled()

        field("edit_title").performTextReplacement(" Water the plants ")
        compose.onNodeWithTag("edit_save").assertIsEnabled()
        field("edit_description").performTextReplacement("pots")
        press("md_tasks")
        assertEquals("- [ ] pots", text("edit_description"))
        press("edit_category")
        press("category_home")
        pickDue("11022026", "09", "30")
        compose.onNodeWithText("11/02/2026 09:30").assertExists()
        press("remind_me")
        press("preset_60")
        press("reminder_save")
        press("remind_me")
        press("preset_custom")
        compose.onNodeWithTag("custom_count").performTextReplacement("2")
        press("reminder_unit_days")
        press("reminder_save")
        assertEquals(listOf("1 hour before", "2 days before"), reminders())
        press("repeat_switch")
        field("repeat_every").performTextReplacement("2")
        press("repeat_unit")
        press("repeat_unit_weeks")
        press("weekday_5")
        press("weekday_1")
        field("edit_size").performSemanticsAction(SemanticsActions.SetProgress) { it(60f) }
        compose.onNodeWithText("Bubble size: 60px").assertExists()
        screenshot("edit-en-light")

        press("edit_save")
        val form = TaskForm(
            title = " Water the plants ",
            description = "- [ ] pots",
            categoryId = "home",
            due = "2026-11-02T09:30",
            reminders = listOf(60, 2880),
            repeat = Repeat(2, RepeatUnit.WEEKS, weekdays = listOf(1, 5)),
            radius = 60,
        )
        assertEquals(listOf(Edit(null, Edit.of(null, here).opened, form, TextRange(10))), saved)
    }

    @Test
    fun aTaskOpensWithItsFieldsAndTheFormHoldsWhatTheUserChanges() {
        val task = task()
        open("t1", session(listOf(task)))
        compose.onNodeWithText("Edit Task").assertExists()
        assertEquals("Water the plants", text("edit_title"))
        assertEquals("- [ ] pots", text("edit_description"))
        compose.onNodeWithText("Home").assertExists()
        compose.onNodeWithText("11/02/2026 09:30").assertExists()
        // TalkBack does not reach the covered field: the button over it says the due.
        compose.onNodeWithTag("edit_due").assertContentDescriptionEquals("Due date: 11/02/2026 09:30")
        assertEquals(listOf("1 hour before"), reminders())
        field("repeat_switch").assertIsOn()
        assertEquals("2", text("repeat_every"))
        compose.onNodeWithText("Weeks").assertExists()
        field("weekday_1").assertIsSelected()
        field("weekday_2").assertIsNotSelected()
        field("weekday_5").assertIsSelected()
        compose.onNodeWithText("Bubble size: 60px").assertExists()

        press("edit_category")
        press("category_work")
        press("edit_save")
        val opened = task.toForm(here)
        assertEquals(listOf(Edit(task, opened, opened.copy(categoryId = "work"))), saved)
    }

    @Test
    fun clearingTheDueTakesItsRemindersAndRepeatAndAPassedDueIsOverdue() {
        open("t1", session(listOf(task(due = Due("2026-10-15T09:00", ZoneId.systemDefault().id), reminders = listOf(60, 1440)))))
        compose.onNodeWithText("Overdue").assertExists()
        press("due_clear")
        compose.onNodeWithText("Overdue").assertDoesNotExist()
        compose.onNodeWithTag("due_clear").assertDoesNotExist()
        compose.onNodeWithTag("edit_due").assertContentDescriptionEquals("Due date")
        assertEquals(emptyList<String>(), reminders())
        field("repeat_switch").assertIsOff().assertIsNotEnabled()
        field("remind_me").assertIsNotEnabled()
        compose.onNodeWithText("Set due date to add reminders").assertExists()
    }

    @Test
    fun remindersAreAddedAsOnTheWebUpToTen() {
        open("t1", session(listOf(task(reminders = listOf(60), repeat = null))))
        press("remind_me")
        compose.onNodeWithTag("preset_60").assertIsNotEnabled()
        compose.onNodeWithTag("reminder_save").assertIsNotEnabled()
        press("preset_custom")
        val count = compose.onNodeWithTag("custom_count")
        count.performTextReplacement("0")
        compose.onNodeWithTag("reminder_save").assertIsNotEnabled()
        count.performTextReplacement("53")
        press("reminder_unit_weeks")
        compose.onNodeWithTag("reminder_save").assertIsNotEnabled()
        // The keyboard of numbers has other keys too: only digits go in.
        count.performTextReplacement("5.2")
        assertEquals("52", text("custom_count"))
        compose.onNodeWithTag("reminder_save").assertIsEnabled()
        count.performTextReplacement("1")
        press("reminder_unit_hours")
        compose.onNodeWithTag("reminder_save").assertIsNotEnabled()
        count.performTextReplacement("3")
        press("reminder_save")
        assertEquals(listOf("1 hour before", "3 hours before"), reminders())

        // Ten at most: then the button is off and says why; a removed one makes room again.
        listOf("4", "5", "6", "7", "8", "9", "10", "11").forEach { hours ->
            press("remind_me")
            press("preset_custom")
            compose.onNodeWithTag("custom_count").performTextReplacement(hours)
            press("reminder_save")
        }
        assertEquals(10, reminders().size)
        field("remind_me").assertIsNotEnabled()
        compose.onNodeWithText("At most 10 reminders").assertExists()
        press("reminder_delete_180")
        field("remind_me").assertIsEnabled()
        compose.onNodeWithTag("remind_me_hint").assertDoesNotExist()
    }

    @Test
    fun theRepeatTakesEveryFrom1To999AndTheDaysOfAWeek() {
        val task = task(repeat = null)
        open("t1", session(listOf(task)))
        field("repeat_every").assertIsNotEnabled()
        press("repeat_switch")
        assertEquals("1", text("repeat_every"))
        compose.onNodeWithText("Days").assertExists()
        field("repeat_every").performTextReplacement("12")
        field("repeat_every").performTextReplacement("0")
        field("repeat_every").performTextReplacement("1000")
        // Another field takes the focus: "Every" shows the number of the repeat again.
        compose.onNodeWithTag("edit_title").performSemanticsAction(SemanticsActions.RequestFocus)
        assertEquals("12", text("repeat_every"))
        press("repeat_unit")
        press("repeat_unit_weeks")
        press("weekday_5")
        press("weekday_1")
        press("weekday_1")
        press("edit_save")
        assertEquals(Repeat(12, RepeatUnit.WEEKS, weekdays = listOf(5)), saved.single().form.repeat)
    }

    @Test
    fun theButtonsOfTheDescriptionWriteTheMarkdownOfTheWeb() {
        open(null, session(emptyList()))
        val description = field("edit_description")
        description.performTextReplacement("milk and bread")
        description.performTextInputSelection(TextRange(0, 4))
        press("md_bold")
        assertEquals("**milk** and bread", text("edit_description"))
        description.performTextInputSelection(TextRange(13, 18))
        press("md_link")
        val url = compose.onNodeWithTag("link_url")
        url.performTextReplacement("javascript:alert(1)")
        compose.onNodeWithTag("link_ok").assertIsNotEnabled()
        url.performTextReplacement("https://example.com")
        press("link_ok")
        assertEquals("**milk** and [bread](https://example.com)", text("edit_description"))
        description.performTextReplacement("milk\nbread")
        description.performTextInputSelection(TextRange(0, 10))
        press("md_numbers")
        assertEquals("1. milk\n2. bread", text("edit_description"))
    }

    @Test
    fun aDescriptionOver100000CharactersCannotBeSavedAndATitleStopsAt1000() {
        open(null, session(emptyList()))
        field("edit_title").performTextReplacement("t".repeat(1001))
        assertEquals(1000, text("edit_title").length)
        field("edit_description").performTextReplacement("x".repeat(100_001))
        // The line under the field is part of the field for TalkBack: it is in the unmerged tree.
        compose.onNodeWithTag("description_too_long", useUnmergedTree = true).assertExists()
        compose.onNodeWithTag("edit_save").assertIsNotEnabled()
        field("edit_description").performTextReplacement("x".repeat(100_000))
        compose.onNodeWithTag("description_too_long", useUnmergedTree = true).assertDoesNotExist()
        compose.onNodeWithTag("edit_save").assertIsEnabled()
    }

    @Test
    fun leavingAChangedFormAsksFirst() {
        open("t1", session(listOf(task())))
        press("edit_close")
        assertEquals(1, closed)
        compose.onNodeWithTag("discard_confirm").assertDoesNotExist()

        field("edit_title").performTextReplacement("Water the garden")
        press("edit_close")
        press("discard_keep")
        assertEquals(1, closed)
        // Back as it was: nothing to ask.
        field("edit_title").performTextReplacement("Water the plants")
        press("edit_close")
        assertEquals(2, closed)
        field("edit_title").performTextReplacement("Water the garden")
        // Back as the system sends it, through the dispatcher of the activity: a window of the system over the
        // app ("System UI isn't responding" on a loaded emulator) would keep Espresso waiting for the focus.
        compose.runOnUiThread { back.onBackPressed() }
        press("discard_confirm")
        assertEquals(3, closed)
        assertEquals(emptyList<Edit>(), saved)
    }

    @Test
    fun aSaveTheCoreRefusesLeavesTheFormAsTheUserHasItWithAMessage() {
        sent = false
        open("t1", session(listOf(task())))
        field("edit_title").performTextReplacement("Water the garden")
        press("edit_save")
        compose.waitUntil(10_000) { compose.onAllNodesWithText("The change could not be saved.").fetchSemanticsNodes().isNotEmpty() }
        assertEquals("Water the garden", text("edit_title"))
        assertEquals(1, saved.size)
        assertEquals(0, closed)
    }

    @Test
    fun theFormSurvivesAnUnloadingOfTheAppAndComesBackBeforeTheData() {
        val task = task()
        var shown by mutableStateOf(session(listOf(task)))
        val restoration = StateRestorationTester(compose)
        restoration.setContent {
            ToDoRoundTheme {
                EditScreen("t1", shown, onSave = { saved += it; true }, onClose = { closed++ }, clock = clock)
            }
        }
        field("edit_title").performTextReplacement("Water the garden")
        field("edit_description").performTextInputSelection(TextRange(2, 5))
        press("due_clear")

        // The app comes back from an unloading before its data are read again.
        shown = Session.SignedIn("olena@example.com", null)
        restoration.emulateSavedInstanceStateRestore()
        assertEquals("Water the garden", text("edit_title"))
        compose.onNodeWithTag("due_clear").assertDoesNotExist()
        shown = session(listOf(task))
        press("edit_save")
        val opened = task.toForm(here)
        assertEquals(listOf(Edit(task, opened, opened.copy(title = "Water the garden", due = null, reminders = emptyList(), repeat = null), TextRange(2, 5))), saved)
    }

    @Test
    fun aTaskTheCacheDoesNotHaveIsWaitedForUntilTheServerSaysItIsGone() {
        var shown by mutableStateOf(session(emptyList(), fromCache = true))
        compose.setContent {
            ToDoRoundTheme {
                EditScreen("t1", shown, onSave = { saved += it; true }, onClose = { closed++ }, onGone = { gone++ }, clock = clock)
            }
        }
        compose.onNodeWithTag("loading").assertExists()
        assertEquals(0, gone)
        shown = session(emptyList(), fromCache = false)
        compose.waitForIdle()
        assertEquals(1, gone)
        compose.onAllNodesWithTag("edit_title").assertCountEquals(0)
    }
}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android --no-daemon :app:testDebugUnitTest`
Expected: `BUILD FAILED`, `Execution failed for task ':app:compileDebugUnitTestKotlin'`; первая ошибка — `e: …/EditSaverTest.kt:34:29 Unresolved reference 'Edit'.`

Run: `android/gradlew -p android --no-daemon :app:compileDebugAndroidTestKotlin -Ptodoround.emulators=true`
Expected: `BUILD FAILED`; первая ошибка — `e: …/EditScreenTest.kt:46:35 Unresolved reference 'Edit'.`

- [ ] **Step 3: Тексты, значки и общие части**

Тексты формы — веба (`bubbles.*` и `categories.richTextEditor.*` в `src/locales`), с «задачей» вместо «пузыря» (решение 23); размер пузыря подписан, как в вебе (решение 2 этого плана). Новые тексты, которых в вебе нет: «Clear the due date», «Delete the reminder» (подписи кнопок для TalkBack), вопрос при выходе и «OK» выбора даты и времени.

Изменения в `android/app/src/main/res/values/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values/strings.xml b/android/app/src/main/res/values/strings.xml
index 4b7e3aa..d7104de 100644
--- a/android/app/src/main/res/values/strings.xml
+++ b/android/app/src/main/res/values/strings.xml
@@ -121,6 +121,51 @@
     <string name="task_saturday">SAT</string>
     <string name="task_sunday">SUN</string>
 
+    <!-- The form of a task (stage 2 spec, section 7): the web's texts with "task" for "bubble" (the
+         size keeps "bubble": it is the size of the task's bubble on the web) and an ellipsis for "...". -->
+    <string name="edit_new_title">Create New Task</string>
+    <string name="edit_title">Edit Task</string>
+    <string name="edit_create">Create</string>
+    <string name="edit_save">Save</string>
+    <string name="edit_task_title">Title</string>
+    <string name="edit_description">Description</string>
+    <string name="edit_description_placeholder">Enter description…</string>
+    <string name="edit_description_too_long">The description is longer than 100 000 characters. Shorten it to save the task.</string>
+    <string name="edit_bold">Bold</string>
+    <string name="edit_italic">Italic</string>
+    <string name="edit_strikethrough">Strikethrough</string>
+    <string name="edit_bullet_list">Bullet List</string>
+    <string name="edit_numbered_list">Numbered List</string>
+    <string name="edit_task_list">Task List</string>
+    <string name="edit_link">Link</string>
+    <string name="edit_enter_url">Enter URL:</string>
+    <string name="edit_category">Category (tag)</string>
+    <string name="edit_no_category">No category</string>
+    <string name="edit_due">Due date</string>
+    <string name="edit_due_clear">Clear the due date</string>
+    <string name="edit_remind_me">Remind me</string>
+    <string name="edit_remind_me_disabled">Set due date to add reminders</string>
+    <string name="edit_reminders_max">At most 10 reminders</string>
+    <string name="edit_reminder_delete">Delete the reminder</string>
+    <string name="edit_add_notification">Add notification</string>
+    <string name="edit_custom">Custom…</string>
+    <string name="edit_value">Value</string>
+    <string name="edit_hours">Hours</string>
+    <string name="edit_days">Days</string>
+    <string name="edit_weeks">Weeks</string>
+    <string name="edit_months">Months</string>
+    <string name="edit_reminder_range">From 1 hour to 52 weeks</string>
+    <string name="edit_repeat_every">Repeat every</string>
+    <string name="edit_every">Every</string>
+    <string name="edit_unit">Unit</string>
+    <string name="edit_select_week_days">Select days of the week</string>
+    <string name="edit_size">Bubble size: %1$dpx</string>
+    <string name="edit_discard_confirm">Discard the changes?</string>
+    <string name="edit_discard_message">The changes you made will not be saved.</string>
+    <string name="edit_discard">Discard</string>
+    <string name="edit_keep_editing">Keep editing</string>
+    <string name="ok">OK</string>
+
     <!-- Notifications (stage 3 spec): the texts of the pushes come from the server; the menu item
          is the one of the web's main menu (deviceReminders). -->
     <string name="reminders_channel">Reminders</string>
````

Изменения в `android/app/src/main/res/values-uk/strings.xml`:

````diff
diff --git a/android/app/src/main/res/values-uk/strings.xml b/android/app/src/main/res/values-uk/strings.xml
index ed50ab7..3aee562 100644
--- a/android/app/src/main/res/values-uk/strings.xml
+++ b/android/app/src/main/res/values-uk/strings.xml
@@ -131,6 +131,49 @@
     <string name="task_saturday">СБ</string>
     <string name="task_sunday">НД</string>
 
+    <string name="edit_new_title">Створити нове завдання</string>
+    <string name="edit_title">Редагувати завдання</string>
+    <string name="edit_create">Створити</string>
+    <string name="edit_save">Зберегти</string>
+    <string name="edit_task_title">Заголовок</string>
+    <string name="edit_description">Опис</string>
+    <string name="edit_description_placeholder">Введіть опис…</string>
+    <string name="edit_description_too_long">Опис довший за 100 000 символів. Скоротіть його, щоб зберегти завдання.</string>
+    <string name="edit_bold">Жирний</string>
+    <string name="edit_italic">Курсив</string>
+    <string name="edit_strikethrough">Закреслений</string>
+    <string name="edit_bullet_list">Маркований список</string>
+    <string name="edit_numbered_list">Нумерований список</string>
+    <string name="edit_task_list">Список з галочками</string>
+    <string name="edit_link">Посилання</string>
+    <string name="edit_enter_url">Введіть URL:</string>
+    <string name="edit_category">Категорія (тег)</string>
+    <string name="edit_no_category">Без категорії</string>
+    <string name="edit_due">Термін виконання</string>
+    <string name="edit_due_clear">Очистити термін</string>
+    <string name="edit_remind_me">Нагадати мені</string>
+    <string name="edit_remind_me_disabled">Встановіть дату виконання для додавання нагадувань</string>
+    <string name="edit_reminders_max">Не більше 10 нагадувань</string>
+    <string name="edit_reminder_delete">Видалити нагадування</string>
+    <string name="edit_add_notification">Додати сповіщення</string>
+    <string name="edit_custom">Власне…</string>
+    <string name="edit_value">Значення</string>
+    <string name="edit_hours">Годин</string>
+    <string name="edit_days">Днів</string>
+    <string name="edit_weeks">Тижнів</string>
+    <string name="edit_months">Місяців</string>
+    <string name="edit_reminder_range">Від 1 години до 52 тижнів</string>
+    <string name="edit_repeat_every">Повторювати кожні</string>
+    <string name="edit_every">Кожні</string>
+    <string name="edit_unit">Одиниця</string>
+    <string name="edit_select_week_days">Оберіть дні тижня</string>
+    <string name="edit_size">Розмір бульбашки: %1$dpx</string>
+    <string name="edit_discard_confirm">Відкинути зміни?</string>
+    <string name="edit_discard_message">Зроблені зміни не буде збережено.</string>
+    <string name="edit_discard">Відкинути</string>
+    <string name="edit_keep_editing">Редагувати далі</string>
+    <string name="ok">OK</string>
+
     <string name="reminders_channel">Нагадування</string>
     <string name="reminders_title">Нагадування на цьому пристрої</string>
     <string name="reminders_on">Сповіщення увімкнено: нагадування й прострочені завдання приходять на цей телефон.</string>
````

Значки — пути Material Icons из `@mui/icons-material` веба (лицензия Apache 2.0), как у прежних значков приложения.

Файл `android/app/src/main/res/drawable/ic_format_bold.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Format bold" of the Material icons (Apache License 2.0): the button that makes the selection bold. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42M10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_format_italic.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Format italic" of the Material icons (Apache License 2.0): the button that makes the selection italic. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_format_strikethrough.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Format strikethrough" of the Material icons (Apache License 2.0): the button that strikes the selection through. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M10 19h4v-3h-4zM5 4v3h5v3h4V7h5V4zM3 14h18v-2H3z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_format_list_bulleted.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Format list bulleted" of the Material icons (Apache License 2.0): the button that starts lines with bullets. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5m0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5m0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5M7 19h14v-2H7zm0-6h14v-2H7zm0-8v2h14V5z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_format_list_numbered.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Format list numbered" of the Material icons (Apache License 2.0): the button that numbers lines. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2zm1-9h1V4H2v1h1zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2zm5-6v2h14V5zm0 14h14v-2H7zm0-6h14v-2H7z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_check_box.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Check box" of the Material icons (Apache License 2.0): the button that starts lines with checkboxes. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2m-9 14-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_link.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Link" of the Material icons (Apache License 2.0): the button that puts a link on the selection. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1M8 13h8v-2H8zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_event.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Event" of the Material icons (Apache License 2.0): the field of the due. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M17 12h-5v5h5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1zm3 18H5V8h14z" />
</vector>
````

Подпись напоминания и дни недели теперь нужны и форме: они переходят из `TaskScreen.kt` в `TaskParts.kt`, а красная пометка «Overdue» становится общей.

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskParts.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskParts.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskParts.kt
index 8d6ee55..d494923 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskParts.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskParts.kt
@@ -16,6 +16,7 @@ import androidx.compose.ui.Alignment
 import androidx.compose.ui.Modifier
 import androidx.compose.ui.graphics.Color
 import androidx.compose.ui.res.painterResource
+import androidx.compose.ui.res.pluralStringResource
 import androidx.compose.ui.res.stringResource
 import androidx.compose.ui.text.font.FontWeight
 import androidx.compose.ui.unit.dp
@@ -24,15 +25,18 @@ import com.pmobile78.todoround.core.contract.Language
 import com.pmobile78.todoround.core.contract.TaskStatus
 import com.pmobile78.todoround.core.model.Category
 import com.pmobile78.todoround.core.model.Due
+import com.pmobile78.todoround.core.model.ReminderUnit
 import com.pmobile78.todoround.core.model.TaskAction
 import com.pmobile78.todoround.core.model.dueView
 import com.pmobile78.todoround.core.model.listDateTime
+import com.pmobile78.todoround.core.model.reminderParts
 import com.pmobile78.todoround.ui.theme.DoneGreen
 import java.time.Instant
 
 /*
- * The parts the row of the list and the screen of a task show alike: the icon of the status, the
- * due with "Overdue", the category, the times, and the actions with their texts and icons.
+ * The parts the row of the list, the screen of a task and its form show alike: the icon of the
+ * status, the due with "Overdue", the category, the times, the reminders and the days of the week,
+ * and the actions with their texts and icons.
  */
 
 @Composable
@@ -85,8 +89,9 @@ internal fun Time(text: String) {
     Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
 }
 
+/** The red "Overdue" of the web, beside a due or under it. */
 @Composable
-private fun OverdueMark() {
+internal fun OverdueMark() {
     val red = MaterialTheme.colorScheme.error
     Text(
         text = stringResource(R.string.list_overdue),
@@ -112,6 +117,24 @@ private fun Chip(text: String, background: Color, content: Color) {
     )
 }
 
+/** A reminder as the web writes it: "1 hour before", "2 days before", in its largest whole unit. */
+@Composable
+internal fun reminderLabel(minutes: Int): String {
+    val parts = reminderParts(minutes)
+    val plural = when (parts.unit) {
+        ReminderUnit.HOURS -> R.plurals.task_reminder_hours
+        ReminderUnit.DAYS -> R.plurals.task_reminder_days
+        ReminderUnit.WEEKS -> R.plurals.task_reminder_weeks
+    }
+    return pluralStringResource(plural, parts.count, parts.count)
+}
+
+/** The short names of the days of the week, Monday first, as the ISO days 1 to 7 count them. */
+internal val WEEKDAYS = listOf(
+    R.string.task_monday, R.string.task_tuesday, R.string.task_wednesday, R.string.task_thursday,
+    R.string.task_friday, R.string.task_saturday, R.string.task_sunday,
+)
+
 /** A colour of the palette, "#rrggbb". */
 internal fun paletteColor(hex: String): Color = Color(0xFF000000 or hex.removePrefix("#").toLong(16))
 
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt
index 3d71bf9..bd01838 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt
@@ -54,13 +54,11 @@ import com.pmobile78.todoround.core.markdown.Inline
 import com.pmobile78.todoround.core.markdown.TaskItem
 import com.pmobile78.todoround.core.markdown.parseMarkdown
 import com.pmobile78.todoround.core.model.Repeat
-import com.pmobile78.todoround.core.model.ReminderUnit
 import com.pmobile78.todoround.core.model.Task
 import com.pmobile78.todoround.core.model.TaskAction
 import com.pmobile78.todoround.core.model.actions
 import com.pmobile78.todoround.core.model.changedAfterCreation
 import com.pmobile78.todoround.core.model.listDateTime
-import com.pmobile78.todoround.core.model.reminderParts
 import com.pmobile78.todoround.core.model.reminderPassed
 import kotlinx.coroutines.Dispatchers
 import kotlinx.coroutines.flow.Flow
@@ -273,18 +271,6 @@ private val TaskStatus.label: Int
         TaskStatus.DELETED -> R.string.task_status_deleted
     }
 
-// "1 hour before", "2 days before": the largest whole unit, as the web writes it.
-@Composable
-private fun reminderLabel(minutes: Int): String {
-    val parts = reminderParts(minutes)
-    val plural = when (parts.unit) {
-        ReminderUnit.HOURS -> R.plurals.task_reminder_hours
-        ReminderUnit.DAYS -> R.plurals.task_reminder_days
-        ReminderUnit.WEEKS -> R.plurals.task_reminder_weeks
-    }
-    return pluralStringResource(plural, parts.count, parts.count)
-}
-
 // "Every 2 weeks: MON, FRI".
 @Composable
 private fun repeatText(repeat: Repeat): String {
@@ -300,8 +286,3 @@ private fun repeatText(repeat: Repeat): String {
     val names = weekdays.map { stringResource(WEEKDAYS[it - 1]) }
     return stringResource(R.string.task_repeat_on, every, names.joinToString(", "))
 }
-
-private val WEEKDAYS = listOf(
-    R.string.task_monday, R.string.task_tuesday, R.string.task_wednesday, R.string.task_thursday,
-    R.string.task_friday, R.string.task_saturday, R.string.task_sunday,
-)
````

- [ ] **Step 4: Экран и его поля**

`EditScreen` держит форму в одном состоянии `Edit` с собственным `Saver`: задача на момент открытия хранится своей записью (`toRecord` и обратно `taskFromRecord`), формы — значениями. Форма задачи открывается, когда в данных есть задача; после выгрузки форма возвращается из состояния раньше данных. «Сохранить» доступно, пока `canSave()`; если запись не ушла, форма показывает «The change could not be saved.» — над клавиатурой, которая может быть ещё открыта. Поле описания держит `TextFieldValue` из текста формы, выделения и части клавиатуры (`composition`), которую форма не хранит; кнопка панели заменяет текст и выделение. Срок — два окна: календарь, затем часы; оба открываются на сроке или на «сейчас». Поле срока накрыто кнопкой, которая открывает выбор; накрытый узел Compose не отдаёт TalkBack (в черновике его не увидел и `uiautomator`), поэтому кнопка сама говорит «Due date: 11/02/2026 09:30».

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/EditScreen.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Limits
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.deviceTimeZone
import com.pmobile78.todoround.core.contract.fromWire
import com.pmobile78.todoround.core.model.Category
import com.pmobile78.todoround.core.model.NEW_TASK_FORM
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.Task
import com.pmobile78.todoround.core.model.TaskForm
import com.pmobile78.todoround.core.model.canSave
import com.pmobile78.todoround.core.model.inOrder
import com.pmobile78.todoround.core.model.taskFromRecord
import com.pmobile78.todoround.core.model.toForm
import com.pmobile78.todoround.core.model.toRecord
import com.pmobile78.todoround.core.model.withoutDue
import kotlinx.coroutines.launch
import java.time.Clock
import kotlin.math.roundToInt

/**
 * The form of [task], null for a new task (stage 2 spec, section 7): as it opened ([opened]) and as
 * the user has it now ([form]), with the selection of its description.
 */
@Immutable
data class Edit(
    val task: Task?,
    val opened: TaskForm,
    val form: TaskForm,
    val selection: TextRange = TextRange(form.description.length),
) {
    /** Whether the user changed the form since it opened: leaving it then asks first (2.2 №14). */
    val changed: Boolean get() = form != opened

    companion object {
        /** The form of [task], or of a new task, as it opens on a phone in [zone]. */
        fun of(task: Task?, zone: String): Edit {
            val form = task?.toForm(zone) ?: NEW_TASK_FORM
            return Edit(task, form, form)
        }
    }
}

/**
 * The form as the saved state of the screen keeps it, in plain values (2.2 №14): the task it opened
 * on as its record, the form as it opened and as it is, and the selection. A description that is the
 * one before it is kept once.
 */
internal val EditSaver: Saver<Edit?, Any> = Saver(
    save = { edit ->
        edit?.let {
            arrayListOf(
                it.task?.let { task -> HashMap(task.toRecord().mapValues { (_, value) -> if (value is Map<*, *>) HashMap(value) else value }) },
                formValues(it.opened, keepDescription = it.opened.description != it.task?.description),
                formValues(it.form, keepDescription = it.form.description != it.opened.description),
                it.selection.start,
                it.selection.end,
            )
        }
    },
    restore = { saved ->
        val values = saved as List<*>
        @Suppress("UNCHECKED_CAST")
        val task = (values[0] as Map<String, Any?>?)?.let { taskFromRecord(it, acceptUnknownZone = true) }
        val opened = formOf(values[1] as List<*>, task?.description.orEmpty())
        Edit(task, opened, formOf(values[2] as List<*>, opened.description), TextRange(values[3] as Int, values[4] as Int))
    },
)

private fun formValues(form: TaskForm, keepDescription: Boolean): ArrayList<Any?> = arrayListOf(
    form.title,
    form.description.takeIf { keepDescription },
    form.categoryId,
    form.due,
    ArrayList(form.reminders),
    form.repeat?.every,
    form.repeat?.unit?.wire,
    form.repeat?.weekdays?.let { ArrayList(it) },
    form.repeat?.monthDay,
    form.radius,
)

@Suppress("UNCHECKED_CAST")
private fun formOf(values: List<*>, description: String) = TaskForm(
    title = values[0] as String,
    description = values[1] as String? ?: description,
    categoryId = values[2] as String?,
    due = values[3] as String?,
    reminders = values[4] as List<Int>,
    repeat = (values[5] as Int?)?.let { every ->
        Repeat(every, fromWire<RepeatUnit>(values[6])!!, values[7] as List<Int>?, values[8] as Int?)
    },
    radius = values[9] as Int,
)

/**
 * The screen «Правка» (stage 2 spec, section 7): every field of the web's dialog of a task — title,
 * description with the web's buttons, category, due, reminders, repeat and the size of its bubble on
 * the web. [taskId] null is a new task. "Save" hands the form to [onSave] (decisions 15 and 16 are
 * the caller's), which tells whether its write is sent: a write the core refused leaves the form as
 * the user has it, with a message (2.2 №16). Leaving a changed form asks first, and [onClose] closes
 * it (2.2 №14); the form keeps its state over a turn of the phone and an unloading of the app. A
 * task that is no longer there, deleted forever on another device say, closes it through [onGone].
 * [clock] tells the time.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditScreen(
    taskId: String?,
    session: Session.SignedIn,
    onSave: (Edit) -> Boolean,
    onClose: () -> Unit,
    onGone: () -> Unit = {},
    clock: Clock = Clock.systemUTC(),
) {
    val zone = deviceTimeZone()
    val data = session.data
    val task = taskId?.let { id -> data?.tasks?.items?.firstOrNull { it.id == id } }
    var edit by rememberSaveable(stateSaver = EditSaver) { mutableStateOf(if (taskId == null) Edit.of(null, zone) else task?.let { Edit.of(it, zone) }) }
    // The form of a task opens on the task once its data are there: after an unloading of the app they come later.
    LaunchedEffect(task != null) {
        if (edit == null && task != null) edit = Edit.of(task, zone)
    }
    // Only the server's data tell that the task is gone.
    if (taskId != null && data != null && task == null && !data.tasks.fromCache) {
        LaunchedEffect(Unit) { onGone() }
    }
    var leaving by rememberSaveable { mutableStateOf(false) }
    val leave = { if (edit?.changed == true) leaving = true else onClose() }
    BackHandler(onBack = leave)
    val snackbars = remember { SnackbarHostState() }
    val notSaved = stringResource(R.string.write_failed)
    val scope = rememberCoroutineScope()
    Scaffold(
        modifier = Modifier.testTag("edit_screen"),
        topBar = {
            TopAppBar(
                title = { Text(stringResource(if (taskId == null) R.string.edit_new_title else R.string.edit_title)) },
                navigationIcon = {
                    IconButton(onClick = leave, modifier = Modifier.testTag("edit_close")) {
                        Icon(painterResource(R.drawable.ic_close), contentDescription = stringResource(R.string.close))
                    }
                },
                actions = {
                    val current = edit
                    TextButton(
                        onClick = { if (current != null && !onSave(current)) scope.launch { snackbars.showSnackbar(notSaved) } },
                        enabled = current?.form?.canSave() == true,
                        modifier = Modifier.testTag("edit_save"),
                    ) {
                        Text(stringResource(if (taskId == null) R.string.edit_create else R.string.edit_save))
                    }
                },
            )
        },
        // Above the keyboard, which may still be open when "Save" is pressed.
        snackbarHost = { SnackbarHost(snackbars, Modifier.imePadding()) },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .consumeWindowInsets(padding)
                .imePadding(),
        ) {
            val current = edit
            when {
                session.failed -> Text(
                    stringResource(R.string.list_failed),
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp).testTag("failed"),
                )
                current == null -> CircularProgressIndicator(Modifier.align(Alignment.Center).testTag("loading"))
                else -> EditForm(current, data, clock, onChange = { edit = it })
            }
        }
    }
    if (leaving) {
        AlertDialog(
            onDismissRequest = { leaving = false },
            title = { Text(stringResource(R.string.edit_discard_confirm)) },
            text = { Text(stringResource(R.string.edit_discard_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        leaving = false
                        onClose()
                    },
                    modifier = Modifier.testTag("discard_confirm"),
                ) {
                    Text(stringResource(R.string.edit_discard), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { leaving = false }, modifier = Modifier.testTag("discard_keep")) {
                    Text(stringResource(R.string.edit_keep_editing))
                }
            },
        )
    }
}

// The fields in the order of the web's dialog. Until the data are read the categories are unknown.
@Composable
private fun EditForm(edit: Edit, data: UserData?, clock: Clock, onChange: (Edit) -> Unit) {
    val form = edit.form
    val set = { next: TaskForm -> onChange(edit.copy(form = next)) }
    val zone = deviceTimeZone()
    val now = currentMinute(clock)
    val language = data?.settings?.language ?: appLanguage()
    val categories = remember(data) { inOrder(data?.categories?.items.orEmpty()) }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        OutlinedTextField(
            value = form.title,
            // At most 1000 characters, as the web's field takes them.
            onValueChange = { set(form.copy(title = it.take(Limits.TITLE_MAX_LENGTH))) },
            label = { Text(stringResource(R.string.edit_task_title)) },
            minLines = 2,
            maxLines = 4,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("edit_title"),
        )
        DescriptionField(edit, onChange)
        CategoryField(form.categoryId, categories, onPick = { set(form.copy(categoryId = it)) })
        DueField(form.due, language, zone, now, onPick = { set(form.copy(due = it)) }, onClear = { set(form.withoutDue()) })
        ReminderField(form.reminders, form.due, zone, now, onChange = { set(form.copy(reminders = it)) })
        RepeatField(form.repeat, enabled = form.due != null, onChange = { set(form.copy(repeat = it)) })
        SizeField(form.radius, onChange = { set(form.copy(radius = it)) })
    }
}

/**
 * The category: "No category" or one of [categories] with its colour. A category deleted on another
 * device stays the task's until another is picked, and shows as the list shows it ("No Tag").
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryField(categoryId: String?, categories: List<Category>, onPick: (String?) -> Unit) {
    var open by remember { mutableStateOf(false) }
    val category = categoryId?.let { id -> categories.firstOrNull { it.id == id } }
    val name = when {
        categoryId == null -> stringResource(R.string.edit_no_category)
        category == null -> stringResource(R.string.list_no_category)
        else -> category.name
    }
    ExposedDropdownMenuBox(expanded = open, onExpandedChange = { open = it }) {
        OutlinedTextField(
            value = name,
            onValueChange = {},
            readOnly = true,
            singleLine = true,
            label = { Text(stringResource(R.string.edit_category)) },
            leadingIcon = category?.let { { Dot(paletteColor(it.color)) } },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = open) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable)
                .testTag("edit_category"),
        )
        ExposedDropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            DropdownMenuItem(
                text = { Text(stringResource(R.string.edit_no_category), fontStyle = FontStyle.Italic) },
                onClick = {
                    open = false
                    onPick(null)
                },
                modifier = Modifier.testTag("category_none"),
            )
            categories.forEach { each ->
                DropdownMenuItem(
                    text = { Text(each.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    leadingIcon = { Dot(paletteColor(each.color)) },
                    onClick = {
                        open = false
                        onPick(each.id)
                    },
                    modifier = Modifier.testTag("category_${each.id}"),
                )
            }
        }
    }
}

/** The size of the task's bubble on the web, from 30 to 80 in steps of 5: the phone keeps it for the web (spec 7). */
@Composable
private fun SizeField(radius: Int, onChange: (Int) -> Unit) {
    Column {
        Text(
            stringResource(R.string.edit_size, radius),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Slider(
            value = radius.toFloat(),
            onValueChange = { onChange(it.roundToInt()) },
            valueRange = Limits.RADIUS_MIN.toFloat()..Limits.RADIUS_MAX.toFloat(),
            steps = (Limits.RADIUS_MAX - Limits.RADIUS_MIN) / 5 - 1,
            modifier = Modifier.testTag("edit_size"),
        )
    }
}

@Composable
private fun Dot(color: Color) {
    Box(
        Modifier
            .size(16.dp)
            .background(color, CircleShape),
    )
}
````

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/DescriptionField.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Limits
import com.pmobile78.todoround.core.markdown.Emphasis
import com.pmobile78.todoround.core.markdown.LineStart
import com.pmobile78.todoround.core.markdown.Selected
import com.pmobile78.todoround.core.markdown.emphasized
import com.pmobile78.todoround.core.markdown.isSafeLink
import com.pmobile78.todoround.core.markdown.linked
import com.pmobile78.todoround.core.markdown.listed

/**
 * The description: its Markdown as text under the buttons of the web's toolbar (2.2 №3). A button
 * changes the text around the selection; a description longer than 100 000 characters is an error,
 * and the form cannot be saved then (spec 7).
 */
@Composable
internal fun DescriptionField(edit: Edit, onChange: (Edit) -> Unit) {
    // The keyboard's own part of the field, which the form does not keep.
    var composition by remember { mutableStateOf<TextRange?>(null) }
    val value = TextFieldValue(edit.form.description, edit.selection, composition)
    val change = { next: TextFieldValue ->
        composition = next.composition
        onChange(edit.copy(form = edit.form.copy(description = next.text), selection = next.selection))
    }
    val selected = Selected(value.text, value.selection.start, value.selection.end)
    val apply = { next: Selected -> change(TextFieldValue(next.text, TextRange(next.start, next.end))) }
    var linking by rememberSaveable { mutableStateOf(false) }
    val tooLong = edit.form.description.length > Limits.DESCRIPTION_MAX_LENGTH
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            stringResource(R.string.edit_description),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        FlowRow {
            Tool(R.drawable.ic_format_bold, R.string.edit_bold, "md_bold") { apply(selected.emphasized(Emphasis.BOLD)) }
            Tool(R.drawable.ic_format_italic, R.string.edit_italic, "md_italic") { apply(selected.emphasized(Emphasis.ITALIC)) }
            Tool(R.drawable.ic_format_strikethrough, R.string.edit_strikethrough, "md_strike") { apply(selected.emphasized(Emphasis.STRIKE)) }
            Tool(R.drawable.ic_format_list_bulleted, R.string.edit_bullet_list, "md_bullets") { apply(selected.listed(LineStart.BULLET)) }
            Tool(R.drawable.ic_format_list_numbered, R.string.edit_numbered_list, "md_numbers") { apply(selected.listed(LineStart.NUMBER)) }
            Tool(R.drawable.ic_check_box, R.string.edit_task_list, "md_tasks") { apply(selected.listed(LineStart.TASK)) }
            Tool(R.drawable.ic_link, R.string.edit_link, "md_link") { linking = true }
        }
        OutlinedTextField(
            value = value,
            onValueChange = change,
            placeholder = { Text(stringResource(R.string.edit_description_placeholder)) },
            isError = tooLong,
            supportingText = if (tooLong) {
                { Text(stringResource(R.string.edit_description_too_long), modifier = Modifier.testTag("description_too_long")) }
            } else {
                null
            },
            // A long description scrolls inside the field, as in the web's editor.
            minLines = 6,
            maxLines = 12,
            modifier = Modifier
                .fillMaxWidth()
                .testTag("edit_description"),
        )
    }
    if (linking) {
        LinkDialog(
            onLink = { url ->
                linking = false
                selected.linked(url)?.let(apply)
            },
            onDismiss = { linking = false },
        )
    }
}

@Composable
private fun Tool(@DrawableRes icon: Int, @StringRes label: Int, tag: String, onClick: () -> Unit) {
    IconButton(onClick = onClick, modifier = Modifier.testTag(tag)) {
        Icon(painterResource(icon), contentDescription = stringResource(label))
    }
}

/** The address of a link, as the web asks for it; only http, https and mailto are taken (spec 8). */
@Composable
private fun LinkDialog(onLink: (String) -> Unit, onDismiss: () -> Unit) {
    var url by rememberSaveable { mutableStateOf("https://") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.edit_link)) },
        text = {
            OutlinedTextField(
                value = url,
                onValueChange = { url = it },
                label = { Text(stringResource(R.string.edit_enter_url)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                modifier = Modifier.testTag("link_url"),
            )
        },
        confirmButton = {
            TextButton(onClick = { onLink(url) }, enabled = isSafeLink(url.trim()), modifier = Modifier.testTag("link_ok")) {
                Text(stringResource(R.string.ok))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        },
    )
}
````

Файл `android/app/src/main/kotlin/com/pmobile78/todoround/ui/DueFields.kt`:

````kotlin
package com.pmobile78.todoround.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimeInput
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TimePickerDialog
import androidx.compose.material3.TimePickerDialogDefaults
import androidx.compose.material3.TimePickerDisplayMode
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.pmobile78.todoround.R
import com.pmobile78.todoround.core.contract.Language
import com.pmobile78.todoround.core.contract.Limits
import com.pmobile78.todoround.core.contract.RepeatUnit
import com.pmobile78.todoround.core.contract.parseLocal
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.NEW_REPEAT
import com.pmobile78.todoround.core.model.REMINDER_PRESETS
import com.pmobile78.todoround.core.model.ReminderUnit
import com.pmobile78.todoround.core.model.Repeat
import com.pmobile78.todoround.core.model.dueView
import com.pmobile78.todoround.core.model.formDateTime
import com.pmobile78.todoround.core.model.pickedDate
import com.pmobile78.todoround.core.model.pickedDue
import com.pmobile78.todoround.core.model.pickerMillis
import com.pmobile78.todoround.core.model.reminderMinutes
import com.pmobile78.todoround.core.model.reminderPassed
import com.pmobile78.todoround.core.model.repeatEvery
import com.pmobile78.todoround.core.model.toggledWeekday
import com.pmobile78.todoround.core.model.withReminder
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

/*
 * The fields of the form that hang on the due (stage 2 spec, section 7): the due itself, its
 * reminders and the repeat, as the web's dialog has them (BubbleDialogForm.jsx, ReminderEditor.jsx,
 * RepeatEditor.jsx). Without a due neither reminders nor a repeat can be set.
 */

/**
 * The due: the date and then the time of the pickers on this phone, in 24 hours, written as the
 * web's date picker writes them; "Clear" takes the reminders and the repeat with it ([onClear]), and
 * a due that has passed at [now] is overdue.
 */
@Composable
internal fun DueField(due: String?, language: Language, zone: String, now: Instant, onPick: (String) -> Unit, onClear: () -> Unit) {
    var picking by rememberSaveable { mutableStateOf(false) }
    val overdue = due != null && dueView(Due(due, zone), zone, now).overdue
    val label = stringResource(R.string.edit_due)
    val shown = due?.let { formDateTime(it, language) }.orEmpty()
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f)) {
                OutlinedTextField(
                    value = shown,
                    onValueChange = {},
                    readOnly = true,
                    singleLine = true,
                    isError = overdue,
                    label = { Text(label) },
                    trailingIcon = { Icon(painterResource(R.drawable.ic_event), contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                )
                // A touch anywhere on the field opens the pickers. The field under it is covered, and TalkBack
                // does not reach a covered node: this one says the label and the due instead.
                Box(
                    Modifier
                        .matchParentSize()
                        .clickable { picking = true }
                        .semantics { contentDescription = if (due == null) label else "$label: $shown" }
                        .testTag("edit_due"),
                )
            }
            if (due != null) {
                IconButton(onClick = onClear, modifier = Modifier.testTag("due_clear")) {
                    Icon(painterResource(R.drawable.ic_close), contentDescription = stringResource(R.string.edit_due_clear))
                }
            }
        }
        if (overdue) OverdueMark()
    }
    if (picking) {
        DuePickers(
            due = due,
            zone = zone,
            now = now,
            onPick = {
                picking = false
                onPick(it)
            },
            onDismiss = { picking = false },
        )
    }
}

// The date picker, then the time picker; both open on the due, or on now. The day of a date picker
// of Material 3 is read in UTC (spec, section 15).
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DuePickers(due: String?, zone: String, now: Instant, onPick: (String) -> Unit, onDismiss: () -> Unit) {
    val start = parseLocal(due) ?: LocalDateTime.ofInstant(now, ZoneId.of(zone))
    var day by rememberSaveable { mutableStateOf<Long?>(null) }
    val picked = day
    if (picked == null) {
        val state = rememberDatePickerState(initialSelectedDateMillis = pickerMillis(start.toLocalDate()))
        DatePickerDialog(
            onDismissRequest = onDismiss,
            confirmButton = {
                TextButton(onClick = { day = state.selectedDateMillis }, enabled = state.selectedDateMillis != null, modifier = Modifier.testTag("date_ok")) {
                    Text(stringResource(R.string.ok))
                }
            },
            dismissButton = {
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.cancel))
                }
            },
        ) {
            DatePicker(state)
        }
    } else {
        val state = rememberTimePickerState(initialHour = start.hour, initialMinute = start.minute, is24Hour = true)
        // The mode is no value a saved state can keep: the screen keeps whether the keyboard is chosen.
        var keyboard by rememberSaveable { mutableStateOf(false) }
        val mode = if (keyboard) TimePickerDisplayMode.Input else TimePickerDisplayMode.Picker
        TimePickerDialog(
            onDismissRequest = onDismiss,
            confirmButton = {
                TextButton(onClick = { onPick(pickedDue(pickedDate(picked), state.hour, state.minute)) }, modifier = Modifier.testTag("time_ok")) {
                    Text(stringResource(R.string.ok))
                }
            },
            title = { TimePickerDialogDefaults.Title(displayMode = mode) },
            modeToggleButton = {
                TimePickerDialogDefaults.DisplayModeToggle(onDisplayModeChange = { keyboard = !keyboard }, displayMode = mode)
            },
            dismissButton = {
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.cancel))
                }
            },
        ) {
            if (keyboard) TimeInput(state) else TimePicker(state)
        }
    }
}

/**
 * The reminders of the form, each with its time before the due — struck through once passed — and
 * a button that removes it. "Remind me" adds 1 hour, 1 day or a number of hours, days or weeks of
 * one's own; without a due, or with 10 reminders, it is off, and a line under it says why (the web
 * says it in a tooltip, which a phone does not have).
 */
@Composable
internal fun ReminderField(reminders: List<Int>, due: String?, zone: String, now: Instant, onChange: (List<Int>) -> Unit) {
    var adding by rememberSaveable { mutableStateOf(false) }
    val full = reminders.size >= Limits.MAX_REMINDERS
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        reminders.forEach { minutes ->
            val passed = due != null && reminderPassed(minutes, Due(due, zone), zone, now)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(painterResource(R.drawable.ic_notifications), contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    reminderLabel(minutes),
                    style = MaterialTheme.typography.bodyMedium,
                    textDecoration = if (passed) TextDecoration.LineThrough else null,
                    color = if (passed) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier
                        .weight(1f)
                        .testTag("form_reminder"),
                )
                IconButton(onClick = { onChange(reminders.filter { it != minutes }) }, modifier = Modifier.testTag("reminder_delete_$minutes")) {
                    Icon(painterResource(R.drawable.ic_delete_outline), contentDescription = stringResource(R.string.edit_reminder_delete))
                }
            }
        }
        OutlinedButton(onClick = { adding = true }, enabled = due != null && !full, modifier = Modifier.testTag("remind_me")) {
            Text(stringResource(R.string.edit_remind_me))
        }
        if (due == null || full) {
            Text(
                stringResource(if (due == null) R.string.edit_remind_me_disabled else R.string.edit_reminders_max),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.testTag("remind_me_hint"),
            )
        }
    }
    if (adding) {
        ReminderDialog(
            reminders = reminders,
            onAdd = {
                adding = false
                onChange(withReminder(reminders, it))
            },
            onDismiss = { adding = false },
        )
    }
}

// "Add notification" of the web: 1 hour, 1 day — unless the task has it — or "Custom…", a number of
// hours, days or weeks from 1 hour to 52 weeks.
@Composable
private fun ReminderDialog(reminders: List<Int>, onAdd: (Int) -> Unit, onDismiss: () -> Unit) {
    var preset by rememberSaveable { mutableStateOf<Int?>(null) }
    var custom by rememberSaveable { mutableStateOf(false) }
    var count by rememberSaveable { mutableStateOf("") }
    var unit by rememberSaveable { mutableStateOf(ReminderUnit.HOURS) }
    val chosen = if (custom) reminderMinutes(count, unit) else preset
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.edit_add_notification)) },
        text = {
            Column(Modifier.selectableGroup()) {
                REMINDER_PRESETS.forEach { minutes ->
                    Choice(reminderLabel(minutes), selected = !custom && preset == minutes, enabled = minutes !in reminders, tag = "preset_$minutes") {
                        custom = false
                        preset = minutes
                    }
                }
                Choice(stringResource(R.string.edit_custom), selected = custom, enabled = true, tag = "preset_custom") { custom = true }
                if (custom) {
                    OutlinedTextField(
                        value = count,
                        // Digits only: the number keyboard of a phone has other keys too.
                        onValueChange = { text -> count = text.filter(Char::isDigit).take(6) },
                        label = { Text(stringResource(R.string.edit_value)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier
                            .padding(top = 8.dp)
                            .width(120.dp)
                            .testTag("custom_count"),
                    )
                    FlowRow(Modifier.selectableGroup()) {
                        ReminderUnit.entries.forEach { each ->
                            Choice(stringResource(each.label), selected = unit == each, enabled = true, tag = "reminder_unit_${each.name.lowercase()}") { unit = each }
                        }
                    }
                    Text(stringResource(R.string.edit_reminder_range), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { chosen?.let(onAdd) }, enabled = chosen != null && chosen !in reminders, modifier = Modifier.testTag("reminder_save")) {
                Text(stringResource(R.string.edit_save))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        },
    )
}

@Composable
private fun Choice(text: String, selected: Boolean, enabled: Boolean, tag: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .selectable(selected = selected, enabled = enabled, role = Role.RadioButton, onClick = onClick)
            .padding(vertical = 4.dp, horizontal = 4.dp)
            .testTag(tag),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = null, enabled = enabled)
        Spacer(Modifier.width(8.dp))
        Text(text, color = if (enabled) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private val ReminderUnit.label: Int
    get() = when (this) {
        ReminderUnit.HOURS -> R.string.edit_hours
        ReminderUnit.DAYS -> R.string.edit_days
        ReminderUnit.WEEKS -> R.string.edit_weeks
    }

/**
 * The repeat: a switch that starts it at every 1 day, "Every" from 1 to 999 — another number is not
 * taken, and the field shows the number of the repeat again when it loses focus —, the unit, and the
 * days of a weekly repeat. Without a due ([enabled] false) it is off and locked.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RepeatField(repeat: Repeat?, enabled: Boolean, onChange: (Repeat?) -> Unit) {
    val on = repeat != null && enabled
    var every by remember(repeat?.every) { mutableStateOf((repeat?.every ?: 1).toString()) }
    var choosing by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier
                .toggleable(value = on, enabled = enabled, role = Role.Switch) { onChange(if (it) NEW_REPEAT else null) }
                .testTag("repeat_switch"),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Switch(checked = on, onCheckedChange = null, enabled = enabled)
            Spacer(Modifier.width(12.dp))
            Text(stringResource(R.string.edit_repeat_every))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedTextField(
                value = every,
                onValueChange = { text ->
                    every = text.filter(Char::isDigit).take(4)
                    val number = repeatEvery(every)
                    if (repeat != null && number != null) onChange(repeat.copy(every = number))
                },
                enabled = on,
                singleLine = true,
                label = { Text(stringResource(R.string.edit_every)) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier
                    .width(120.dp)
                    .onFocusChanged { if (!it.isFocused) every = (repeat?.every ?: 1).toString() }
                    .testTag("repeat_every"),
            )
            ExposedDropdownMenuBox(expanded = choosing, onExpandedChange = { choosing = it && on }, modifier = Modifier.weight(1f)) {
                OutlinedTextField(
                    value = stringResource((repeat?.unit ?: RepeatUnit.DAYS).label),
                    onValueChange = {},
                    readOnly = true,
                    enabled = on,
                    singleLine = true,
                    label = { Text(stringResource(R.string.edit_unit)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = choosing) },
                    modifier = Modifier
                        .menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable, enabled = on)
                        .testTag("repeat_unit"),
                )
                ExposedDropdownMenu(expanded = choosing, onDismissRequest = { choosing = false }) {
                    RepeatUnit.entries.forEach { unit ->
                        DropdownMenuItem(
                            text = { Text(stringResource(unit.label)) },
                            onClick = {
                                choosing = false
                                if (repeat != null) onChange(repeat.copy(unit = unit))
                            },
                            modifier = Modifier.testTag("repeat_unit_${unit.wire}"),
                        )
                    }
                }
            }
        }
        if (on && repeat.unit == RepeatUnit.WEEKS) {
            Text(
                stringResource(R.string.edit_select_week_days),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                WEEKDAYS.forEachIndexed { index, name ->
                    val day = index + 1
                    FilterChip(
                        selected = day in repeat.weekdays.orEmpty(),
                        onClick = { onChange(repeat.toggledWeekday(day)) },
                        label = { Text(stringResource(name)) },
                        modifier = Modifier.testTag("weekday_$day"),
                    )
                }
            }
        }
    }
}

private val RepeatUnit.label: Int
    get() = when (this) {
        RepeatUnit.HOURS -> R.string.edit_hours
        RepeatUnit.DAYS -> R.string.edit_days
        RepeatUnit.WEEKS -> R.string.edit_weeks
        RepeatUnit.MONTHS -> R.string.edit_months
    }
````

- [ ] **Step 5: Сборка, тесты JVM и Lint**

Run: `android/gradlew -p android --no-daemon :core:cleanTest :app:cleanTestDebugUnitTest check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt` (задачи cleanTest — чтобы тесты шли заново и печатали свою строку и тогда, когда код модуля в задаче не менялся)
Expected: `core tests: 204 passed, 0 failed, 0 skipped`, `app debug tests: 36 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `0 errors, 1 warning` — единственное предупреждение `AndroidGradlePluginVersion` («A newer version of com.android.application than 9.4.1 is available»): вышла AGP 9.5.0, а версии плана не меняются (Global Constraints). Отчёт без предупреждений — `No issues found.` — тоже годится

- [ ] **Step 6: Тесты проходят на устройстве**

Свободны ли эмулятор и Gradle — их может занимать другая сессия:

```bash
source /media/big_disk/android/android-env.sh
OURS=$(for p in $(pgrep -f '[q]emu-system'); do [ "$(readlink /proc/$p/cwd)" = "$PWD" ] && echo $p; done)
if [ -n "$OURS" ]; then echo "our emulator is still running: stop it with the last block of this step"
elif adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"
elif pgrep -f '[G]radleDaemon|[G]radleWrapperMain' > /dev/null; then echo "Gradle is running: wait"
else echo "free"; fi
```

Expected: `free`. Свой эмулятор (запущен из корня этой копии, например после прерванного шага) — выключить последним блоком этого шага и проверить снова; иначе — ждать и проверять снова: чужой эмулятор и чужую сборку не трогать.

Эмулятор запустить в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-2-3.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi), а после загрузки ждёт ещё минуту: в первую минуту под нагрузкой система эмулятора закрывает «зависшие» фоновые процессы, и первый тест падал с `Process crashed`:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; sleep 60; echo booted
```

Expected: `booted`.

Тесты на устройстве — в фоне (`run_in_background`), вывод в журнал; новые — `EditScreenTest`:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh > /media/big_disk/android/work/device-2-3.log 2>&1; grep -E '^OK \(|^Tests run|^FAILURES|Script exited|^[0-9]+\) |TIMEOUT' /media/big_disk/android/work/device-2-3.log
ls android/app/build/device-screens
```

Expected: `OK (1 test)`, затем `OK (66 tests)` и `Script exited successfully (code 0)`; к прежним снимкам добавился `edit-en-light.png`. Снимок `edit-en-light.png` открыть и посмотреть: форма новой задачи внизу — категория «Home» с зелёным кружком, срок `11/02/2026 09:30` с календарём и «✕», «1 hour before» и «2 days before» с корзинами, «Remind me», включённый «Repeat every», «Every» 2, «Weeks», выбранные MON и FRI, «Bubble size: 60px» и ползунок. Ответ `Error: TIMEOUT: Port 8180 on 127.0.0.1 was not active within 60000ms` — эмулятору Firestore не хватило памяти, обычно из-за чужой сборки Gradle рядом с эмулятором: дождаться её конца и повторить блок. Падение одного теста этапа 3 `NotificationsTest` с `… did not come in 10 s` (уведомления в шторке под нагрузкой не успевают за 10 секунд; в черновике и при прогоне плана так было по разу с разными тестами этого класса, в заметках этапа 3 — тоже) к этому плану не относится: повторить блок тестов. Блок тестов идёт обычно 5–15 минут; дольше 25 минут — тест завис (при прогоне плана так встал тест 2.2 `AuthFlowTest`, когда системные приложения эмулятора перестали отвечать): `adb -e logcat -d | grep TestRunner` покажет `started:` без `finished:`. Тогда остановить приложение — `adb -e shell am force-stop com.pmobile78.todoround`, блок тестов закончится с ошибкой, — выключить эмулятор блоком ниже и повторить шаг с проверки, свободны ли эмулятор и Gradle.

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
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/EditScreenTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/DescriptionField.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/DueFields.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/EditScreen.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskParts.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt android/app/src/main/res/drawable/ic_check_box.xml android/app/src/main/res/drawable/ic_event.xml android/app/src/main/res/drawable/ic_format_bold.xml android/app/src/main/res/drawable/ic_format_italic.xml android/app/src/main/res/drawable/ic_format_list_bulleted.xml android/app/src/main/res/drawable/ic_format_list_numbered.xml android/app/src/main/res/drawable/ic_format_strikethrough.xml android/app/src/main/res/drawable/ic_link.xml android/app/src/main/res/values-uk/strings.xml android/app/src/main/res/values/strings.xml android/app/src/test/kotlin/com/pmobile78/todoround/ui/EditSaverTest.kt
git commit -F - <<'EOF'
feat(android): the form of a task, every field of the web's dialog

Stage 2.3, task 4 (spec 2.2 No. 3, 14, 16, 23; section 7). EditScreen is
the form of a new task or of a task: the title (at most 1000
characters), the description as Markdown under the buttons of the web's
toolbar (an error above 100 000 characters), the category, the due from
a date and a 24-hour time picker with "Clear" taking the reminders and
the repeat along, the reminders of the web's "Add notification" (1 hour,
1 day or a number of hours, days or weeks, at most 10), the repeat
(every 1-999 hours, days, weeks or months, the days of a week) and the
size of the task's bubble on the web. The form keeps the task as it
opened, its values then and now, and the selection of the description
in the saved state of the screen (EditSaver), so it comes back after a
turn of the phone or an unloading of the app, before the data if need
be; leaving a changed form asks first. Save hands the form to its
caller, which tells whether the write is sent: one the core refused
leaves the form as the user has it, with a message. EditScreenTest
walks every field as a user does; the reminder label and the weekdays
move to TaskParts.kt.
EOF
```

---

### Task 5: «+», «Изменить» и запись формы

**Files:**
- Create: значки `android/app/src/main/res/drawable/ic_add.xml`, `ic_edit.xml`
- Modify: `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`, `ui/HomeScreen.kt`, `ui/TaskScreen.kt`, `android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt`
- Test: `android/app/src/androidTest/kotlin/com/pmobile78/todoround/EditFlowTest.kt` (новый); `android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt`, `TaskScreenTest.kt` (изменения)

**Interfaces:**
- Consumes: `TaskForm`, `newTaskFields`, `newTaskErrors`, `formChanges` (задача 1); `TasksRepository.newId`, `TasksRepository.create` (задача 3); `Edit`, `EditScreen` и теги формы (задача 4); из 2.2 — `AppViewModel.writeChanges`, `Writes`, `TaskScreen`, `HomeScreen`, `SaveableStateProvider("list")`; помощники тестов `emulatorBackend()`, `webBackend()`, `newEmail()`, `signUp(email)`, `fromServer()`, `screenshot(name)`.
- Produces:
  - `com.pmobile78.todoround.ui`: `AppViewModel.create(form: TaskForm): Boolean` и `AppViewModel.save(task: Task, opened: TaskForm, form: TaskForm): Boolean` — проверка ядром и запись через `Writes`; `false` — ядро запись не пропустило, и ничего не отправлено (в `writeFailures` такой отказ не идёт: его показывает форма); без изменений `save` не пишет ничего и возвращает `true`; `AppViewModel.toggle` пишет в журнал, если отметки на месте больше нет; у `HomeScreen` новый параметр `onNew: () -> Unit = {}`, у `TaskScreen` — `onEdit: () -> Unit = {}`;
  - теги: `new_task` — «+» списка, `edit` — карандаш экрана задачи.

- [ ] **Step 1: Написать падающие тесты**

`HomeScreenTest` и `TaskScreenTest` — кнопки: «+» появляется, когда данные прочитаны, карандаш — когда есть задача, в любом статусе.

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt
index 7e88198..d2fe753 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt
@@ -1,5 +1,9 @@
 package com.pmobile78.todoround
 
+import androidx.compose.runtime.getValue
+import androidx.compose.runtime.mutableStateOf
+import androidx.compose.runtime.setValue
+import androidx.compose.ui.test.assertContentDescriptionEquals
 import androidx.compose.ui.test.assertTextContains
 import androidx.compose.ui.test.assertTextEquals
 import androidx.compose.ui.test.junit4.v2.createComposeRule
@@ -20,6 +24,7 @@ import com.pmobile78.todoround.ui.Session
 import com.pmobile78.todoround.ui.UserData
 import com.pmobile78.todoround.ui.theme.ToDoRoundTheme
 import kotlinx.coroutines.flow.flowOf
+import org.junit.Assert.assertEquals
 import org.junit.Rule
 import org.junit.Test
 import org.junit.runner.RunWith
@@ -58,6 +63,21 @@ class HomeScreenTest {
         compose.onNodeWithText("The change could not be saved.").assertExists()
     }
 
+    @Test
+    fun thePlusShowsOnceTheDataAreReadAndOpensTheFormOfANewTask() {
+        var session by mutableStateOf(Session.SignedIn("olena@example.com", data = null))
+        var opened = 0
+        compose.setContent {
+            ToDoRoundTheme {
+                HomeScreen(session, onSignOut = {}, onNew = { opened++ })
+            }
+        }
+        compose.onNodeWithTag("new_task").assertDoesNotExist()
+        session = Session.SignedIn("olena@example.com", data)
+        compose.onNodeWithTag("new_task").assertContentDescriptionEquals("Create New Task").performClick()
+        assertEquals(1, opened)
+    }
+
     @Test
     fun theMenuOpensTheRemindersOfThisPhone() {
         compose.setContent {
````

Изменения в `android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskScreenTest.kt`:

````diff
diff --git a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskScreenTest.kt b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskScreenTest.kt
index e13a226..8da1c80 100644
--- a/android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskScreenTest.kt
+++ b/android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskScreenTest.kt
@@ -3,6 +3,7 @@ package com.pmobile78.todoround
 import androidx.compose.runtime.getValue
 import androidx.compose.runtime.mutableStateOf
 import androidx.compose.runtime.setValue
+import androidx.compose.ui.test.assertContentDescriptionEquals
 import androidx.compose.ui.test.junit4.v2.createComposeRule
 import androidx.compose.ui.test.onNodeWithTag
 import androidx.compose.ui.test.performClick
@@ -87,4 +88,34 @@ class TaskScreenTest {
         compose.onNodeWithTag("delete_forever_confirm").assertDoesNotExist()
         assertEquals(0, actions)
     }
+
+    @Test
+    fun theFormOfTheTaskOpensFromItsScreenInAnyStatus() {
+        val deleted = Instant.parse("2026-10-24T09:00:00Z")
+        val inTrash = Task(
+            id = "t1", title = "Old note", description = "", categoryId = null, status = TaskStatus.DELETED,
+            due = null, reminders = emptyList(), repeat = null, radius = 45, pulseMuted = false,
+            createdAt = deleted, updatedAt = deleted, deletedAt = deleted,
+        )
+        var tasks by mutableStateOf(Loaded(emptyList<Task>(), 0, true))
+        var edited = 0
+        compose.setContent {
+            ToDoRoundTheme {
+                TaskScreen(
+                    "t1",
+                    Session.SignedIn("olena@example.com", UserData(defaultSettings("en"), tasks, Loaded(emptyList(), 0, false))),
+                    onBack = {},
+                    onAction = { _, _ -> },
+                    onToggle = { _, _ -> },
+                    onGone = {},
+                    onEdit = { edited++ },
+                )
+            }
+        }
+        // No form before the task is there.
+        compose.onNodeWithTag("edit").assertDoesNotExist()
+        tasks = Loaded(listOf(inTrash), 0, false)
+        compose.onNodeWithTag("edit").assertContentDescriptionEquals("Edit Task").performClick()
+        assertEquals(1, edited)
+    }
 }
````

`EditFlowTest` — приложение на эмуляторах Firebase, второй клиент — веб: новая задача со всеми полями через «+», правка каждого поля через «Изменить» — документы такие же, какие пишет веб; правка веба при открытой форме остаётся, а категория, удалённая вебом, — у задачи; запись, которую ядро не пропускает поверх нынешней задачи, не уходит, а форма остаётся с изменениями пользователя и говорит об этом (тест ждёт, пока правку веба увидит `AppViewModel.session`: задачу для проверки ядро берёт оттуда); форма переживает поворот телефона и спрашивает перед выходом; задача, удалённая навсегда, закрывает форму с сообщением; форма на украинском в тёмной теме (снимок `edit-uk-dark`).

Файл `android/app/src/androidTest/kotlin/com/pmobile78/todoround/EditFlowTest.kt`:

````kotlin
package com.pmobile78.todoround

import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextReplacement
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.ViewModelProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.pmobile78.todoround.core.contract.SortField
import com.pmobile78.todoround.core.contract.SortOrder
import com.pmobile78.todoround.core.contract.ThemeMode
import com.pmobile78.todoround.core.model.Due
import com.pmobile78.todoround.core.model.ListSort
import com.pmobile78.todoround.core.model.Settings
import com.pmobile78.todoround.core.model.defaultSettings
import com.pmobile78.todoround.data.SettingsRepository
import com.pmobile78.todoround.ui.AppViewModel
import com.pmobile78.todoround.ui.Session
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant
import java.time.ZoneId

/**
 * The form of a task in the app on the emulators (stage 2 spec, sections 3 and 7): "+" and "Edit"
 * write a task as the web reads it, a change of the web while the form is open stays, and the form
 * keeps its state and asks before its changes are lost.
 */
@RunWith(AndroidJUnit4::class)
class EditFlowTest {
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
            "status" to "active",
            "due" to due?.let { mapOf("local" to it.local, "tz" to it.tz) },
            "reminders" to reminders,
            "repeat" to repeat,
            "radius" to 45,
            "pulseMuted" to pulseMuted,
            "overdueAt" to null,
            "createdAt" to time,
            "updatedAt" to time,
            "deletedAt" to null,
        )
        web.db.document("users/$uid/tasks/$id").set(data).await()
    }

    private suspend fun category(uid: String, id: String, name: String, order: Int) {
        val data = mapOf(
            "schemaVersion" to 2,
            "name" to name,
            "color" to "#46a549",
            "order" to order,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp(),
        )
        web.db.document("users/$uid/categories/$id").set(data).await()
    }

    /** The task as the server has it, as the web reads it. */
    private fun stored(uid: String, id: String): DocumentSnapshot = runBlocking {
        withTimeout(30_000) { web.db.document("users/$uid/tasks/$id").fromServer() }
    }

    /** The only task of [uid] on the server, once there is one. */
    private fun onlyTask(uid: String): DocumentSnapshot = runBlocking {
        withTimeout(30_000) {
            var tasks = web.db.collection("users/$uid/tasks").get().await().documents
            while (tasks.isEmpty()) {
                delay(500)
                tasks = web.db.collection("users/$uid/tasks").get().await().documents
            }
            tasks.single()
        }
    }

    private fun waitFor(tag: String) {
        compose.waitUntil(60_000) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    }

    private fun waitForText(text: String) {
        compose.waitUntil(60_000) { compose.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() }
    }

    // A tap through the action of the node, which a keyboard or a moving list cannot make miss.
    private fun press(matcher: SemanticsMatcher) {
        compose.waitUntil(60_000) { compose.onAllNodes(matcher).fetchSemanticsNodes().isNotEmpty() }
        compose.onNode(matcher).performSemanticsAction(SemanticsActions.OnClick)
    }

    private fun press(tag: String) = press(hasTestTag(tag))

    // A node of the form, which may be below the fold.
    private fun field(tag: String) = compose.onNodeWithTag(tag).performScrollTo()

    private fun text(tag: String): String = compose.onNodeWithTag(tag).fetchSemanticsNode().config[SemanticsProperties.EditableText].text

    private fun open(title: String) {
        press(hasTestTag("task") and hasText(title, substring = true))
        waitFor("task_screen")
    }

    // The pickers in their keyboard modes: the date as typed in English ("MMDDYYYY"), then the hour and the minute.
    private fun pickDue(date: String, hour: String, minute: String) {
        press("edit_due")
        press(hasContentDescription("Switch to text input mode"))
        compose.onNode(hasSetTextAction() and hasAnyAncestor(isDialog())).performTextReplacement(date)
        press("date_ok")
        // Material 3 1.4 names this button after one mode or the other: "… for the time input".
        press(hasContentDescription("for the time input", substring = true))
        val time = compose.onAllNodes(hasSetTextAction() and hasAnyAncestor(isDialog()))
        time[0].performTextReplacement(hour)
        time[1].performTextReplacement(minute)
        press("time_ok")
    }

    private fun darkScreen(): Boolean = runCatching {
        (compose.activity.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }.getOrDefault(false)

    @Test
    fun aNewTaskFromThePlusIsWrittenAsTheWebReadsIt() {
        val uid = account { uid -> category(uid, "home", "Home", 1) }
        press("new_task")
        waitFor("edit_screen")
        field("edit_title").performTextReplacement("Water the plants")
        field("edit_description").performTextReplacement("the big pot")
        press("md_tasks")
        press("edit_category")
        press("category_home")
        pickDue("11022026", "09", "30")
        press("remind_me")
        press("preset_60")
        press("reminder_save")
        press("repeat_switch")
        field("repeat_every").performTextReplacement("2")
        press("repeat_unit")
        press("repeat_unit_weeks")
        press("weekday_1")
        press("weekday_5")
        field("edit_size").performSemanticsAction(SemanticsActions.SetProgress) { it(60f) }
        press("edit_save")

        waitFor("home")
        waitForText("Water the plants")
        val doc = onlyTask(uid)
        assertEquals("Water the plants", doc.getString("title"))
        assertEquals("- [ ] the big pot", doc.getString("description"))
        assertEquals("home", doc.getString("categoryId"))
        assertEquals(mapOf("local" to "2026-11-02T09:30", "tz" to here), doc.get("due"))
        assertEquals(listOf(60L), doc.get("reminders"))
        assertEquals(mapOf("every" to 2L, "unit" to "weeks", "weekdays" to listOf(1L, 5L)), doc.get("repeat"))
        assertEquals(60L, doc.getLong("radius"))
        assertEquals("active", doc.getString("status"))
        assertEquals(false, doc.getBoolean("pulseMuted"))
        assertEquals(2L, doc.getLong("schemaVersion"))
        assertTrue(doc.contains("overdueAt") && doc.get("overdueAt") == null && doc.contains("deletedAt") && doc.get("deletedAt") == null)
        assertFalse(doc.contains("nextNotifyAt"))
        assertEquals(doc.getTimestamp("createdAt"), doc.getTimestamp("updatedAt"))
    }

    @Test
    fun everyFieldOfATaskIsChangedFromItsScreenAsTheWebReadsIt() {
        val uid = account { uid ->
            category(uid, "home", "Home", 1)
            task(
                uid, "t1", "Rent",
                due = Due("2026-11-30T09:00", here),
                description = "pay",
                categoryId = "home",
                reminders = listOf(60, 1440),
                repeat = mapOf("every" to 1, "unit" to "weeks", "weekdays" to listOf(1)),
                pulseMuted = true,
            )
        }
        open("Rent")
        press("edit")
        waitFor("edit_screen")
        field("edit_title").performTextReplacement("Pay rent")
        field("edit_description").performTextReplacement("pay **soon**")
        press("edit_category")
        press("category_none")
        pickDue("12152026", "10", "00")
        press("reminder_delete_1440")
        press("repeat_unit")
        press("repeat_unit_months")
        field("edit_size").performSemanticsAction(SemanticsActions.SetProgress) { it(70f) }
        press("edit_save")

        // The screen of the task is back and shows the new values.
        waitFor("task_screen")
        waitForText("Pay rent")
        compose.waitUntil(60_000) { stored(uid, "t1").getString("title") == "Pay rent" }
        val doc = stored(uid, "t1")
        assertEquals("pay **soon**", doc.getString("description"))
        assertEquals(null, doc.getString("categoryId"))
        assertEquals(mapOf("local" to "2026-12-15T10:00", "tz" to here), doc.get("due"))
        assertEquals(listOf(60L), doc.get("reminders"))
        // A monthly repeat takes the day of the new due; the weekdays stay with weeks.
        assertEquals(mapOf("every" to 1L, "unit" to "months", "monthDay" to 15L), doc.get("repeat"))
        assertEquals(70L, doc.getLong("radius"))
        // A new due lets the task pulse again.
        assertEquals(false, doc.getBoolean("pulseMuted"))
    }

    @Test
    fun whatTheWebChangesWhileTheFormIsOpenStays() {
        val uid = account { uid ->
            category(uid, "home", "Home", 1)
            task(uid, "t1", "Rent", description = "pay", categoryId = "home")
        }
        open("Rent")
        press("edit")
        waitFor("edit_screen")
        field("edit_description").performTextReplacement("pay today")
        // Meanwhile the web renames the task and deletes its category.
        runBlocking {
            web.db.document("users/$uid/tasks/t1").update(mapOf("title" to "Rent of November", "updatedAt" to FieldValue.serverTimestamp())).await()
            web.db.document("users/$uid/categories/home").delete().await()
        }
        // The form keeps what the user typed and shows the category as gone.
        waitForText("No Tag")
        assertEquals("Rent", text("edit_title"))
        press("edit_save")
        compose.waitUntil(60_000) { stored(uid, "t1").getString("description") == "pay today" }
        val doc = stored(uid, "t1")
        assertEquals("Rent of November", doc.getString("title"))
        // Without Cloud Functions on the emulators the id of the deleted category stays, as the form left it.
        assertEquals("home", doc.getString("categoryId"))
    }

    @Test
    fun aSaveTheCoreRefusesIsNotSentAndTheFormKeepsWhatTheUserChanged() {
        val uid = account { uid -> task(uid, "t1", "Gym", due = Due("2099-12-31T18:00", here), reminders = listOf(60)) }
        open("Gym")
        press("edit")
        waitFor("edit_screen")
        press("remind_me")
        press("preset_1440")
        press("reminder_save")
        // Meanwhile the web takes the due away, and the reminders with it.
        runBlocking {
            web.db.document("users/$uid/tasks/t1")
                .update(mapOf("due" to null, "reminders" to emptyList<Int>(), "updatedAt" to FieldValue.serverTimestamp())).await()
        }
        // The app has the change too: the task its core checks has no due.
        val app = compose.runOnUiThread { ViewModelProvider(compose.activity)[AppViewModel::class.java] }
        compose.waitUntil(60_000) {
            val signedIn = app.session.value as? Session.SignedIn
            signedIn?.data?.tasks?.items?.firstOrNull { it.id == "t1" }?.due == null
        }
        // Reminders without a due: the core does not send them, and the form stays with them and says so.
        press("edit_save")
        waitForText("The change could not be saved.")
        compose.onNodeWithTag("edit_screen").assertExists()
        compose.onNodeWithTag("reminder_delete_1440").assertExists()
        assertEquals(emptyList<Long>(), stored(uid, "t1").get("reminders"))
    }

    @Test
    fun theFormSurvivesATurnOfThePhoneAndAsksBeforeItsChangesAreLost() {
        account { }
        press("new_task")
        waitFor("edit_screen")
        field("edit_title").performTextReplacement("Call mum")
        compose.activityRule.scenario.recreate()
        waitFor("edit_screen")
        assertEquals("Call mum", text("edit_title"))
        // Back as the system sends it, through the dispatcher of the activity: a window of the system over the
        // app ("System UI isn't responding" on a loaded emulator) would keep Espresso waiting for the focus.
        compose.runOnUiThread { compose.activity.onBackPressedDispatcher.onBackPressed() }
        press("discard_confirm")
        waitFor("home")
        waitForText("No active tasks")
    }

    @Test
    fun aTaskDeletedForeverWhileItsFormIsOpenClosesItWithAMessage() {
        val uid = account { uid -> task(uid, "t1", "Old note") }
        open("Old note")
        press("edit")
        waitFor("edit_screen")
        runBlocking { web.db.document("users/$uid/tasks/t1").delete().await() }
        waitFor("home")
        waitForText("The task is no longer here.")
    }

    @Test
    fun theFormSpeaksTheLanguageOfTheAccountInItsTheme() {
        account(defaultSettings("uk").copy(themeMode = ThemeMode.DARK)) { uid ->
            task(
                uid, "t1", "Купити хліб",
                due = Due("2026-10-01T09:30", here),
                description = "- [ ] житній",
                reminders = listOf(60),
                repeat = mapOf("every" to 3, "unit" to "days"),
            )
        }
        compose.waitUntil(60_000) { darkScreen() }
        open("Купити хліб")
        press("edit")
        waitFor("edit_screen")
        compose.onNodeWithText("Редагувати завдання").assertExists()
        compose.onNodeWithText("Заголовок").assertExists()
        compose.onNodeWithText("Прострочено").assertExists()
        compose.onNodeWithText("За 1 годину").assertExists()
        compose.onNodeWithText("Розмір бульбашки: 45px").assertExists()
        compose.onNodeWithTag("edit_save").assertExists()
        screenshot("edit-uk-dark")
    }
}
````

- [ ] **Step 2: Тест падает**

Run: `android/gradlew -p android --no-daemon :app:compileDebugAndroidTestKotlin -Ptodoround.emulators=true`
Expected: `BUILD FAILED`; ошибки — `e: …/HomeScreenTest.kt:72:53 No parameter with name 'onNew' found.` и `e: …/TaskScreenTest.kt:111:21 No parameter with name 'onEdit' found.` — в каком порядке, зависит от порядка файлов в каталоге копии

- [ ] **Step 3: Запись формы, «+», «Изменить» и форма в `MainActivity`**

`AppViewModel.create` берёт поля новой задачи у ядра, id — до записи, и проверяет запись (решение 16); `save` берёт изменения формы по задаче на момент открытия (решение 15), а проверяет их поверх нынешней задачи из данных сессии — другое устройство могло изменить её, пока форма была открыта. `MainActivity` открывает форму новой задачи поверх списка, форму задачи — поверх её экрана; форма закрывается, когда запись отправлена, а запись, которую ядро не пропустило, остаётся в форме (решение 10 этого плана). Проверка ядром и запись изменений из 2.2 становятся `sent`, которая говорит, ушла ли запись: `writeChanges` действий по-прежнему шлёт отказ в `writeFailures`, а `save` отдаёт его форме. Мелочь итогового ревью 2.2: `toggle` пишет в журнал, когда отметки на месте больше нет.

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
index 2e6ca80..21d4e03 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt
@@ -16,9 +16,13 @@ import com.pmobile78.todoround.core.model.ListSort
 import com.pmobile78.todoround.core.model.Settings
 import com.pmobile78.todoround.core.model.Task
 import com.pmobile78.todoround.core.model.TaskAction
+import com.pmobile78.todoround.core.model.TaskForm
 import com.pmobile78.todoround.core.model.changeErrors
 import com.pmobile78.todoround.core.model.changes
 import com.pmobile78.todoround.core.model.descriptionChanges
+import com.pmobile78.todoround.core.model.formChanges
+import com.pmobile78.todoround.core.model.newTaskErrors
+import com.pmobile78.todoround.core.model.newTaskFields
 import com.pmobile78.todoround.data.AccountRepository
 import com.pmobile78.todoround.data.CategoriesRepository
 import com.pmobile78.todoround.data.Loaded
@@ -157,19 +161,59 @@ class AppViewModel(application: Application) : AndroidViewModel(application) {
 
     /** [item] of the description of [task] ticked or unticked (2.2 №2): the description is written whole. */
     fun toggle(task: Task, item: TaskItem) {
-        val description = toggleTask(task.description, item) ?: return
+        val description = toggleTask(task.description, item)
+        if (description == null) {
+            // The description changed under the screen and the mark is not where it was: nothing is written.
+            Log.i(TAG, "task ${task.id}: no mark at ${item.mark} any more")
+            return
+        }
         writeChanges(task, descriptionChanges(description), Instant.now())
     }
 
+    /**
+     * A new task from [form] (stage 2 spec, section 5): its document with an id known before the
+     * write. The core checks its record first (2.2 №16): false if it refused, and nothing is sent.
+     */
+    fun create(form: TaskForm): Boolean {
+        val uid = backend.auth.currentUser?.uid ?: return true
+        val fields = newTaskFields(form, deviceTimeZone())
+        val id = tasks.newId(uid)
+        val errors = newTaskErrors(id, fields, Instant.now())
+        if (errors.isNotEmpty()) {
+            Log.w(TAG, "new task: ${errors.joinToString("; ")}")
+            return false
+        }
+        writes.launch { tasks.create(uid, id, fields) }
+        return true
+    }
+
+    /**
+     * The changes [form] makes to [task], the task as the form opened on it, [opened] the form as it
+     * opened (2.2 №15): only those are written, after the core has checked the task they leave as it
+     * is now — another device may have changed it meanwhile (2.2 №16). False if the core refused
+     * them, and nothing is sent; no change, no write.
+     */
+    fun save(task: Task, opened: TaskForm, form: TaskForm): Boolean {
+        val changes = formChanges(task, opened, form, deviceTimeZone())
+        if (changes.isEmpty()) return true
+        val current = (session.value as? Session.SignedIn)?.data?.tasks?.items?.firstOrNull { it.id == task.id }
+        return sent(current ?: task, changes, Instant.now())
+    }
+
     // Changes the core accepts are written; the others are not sent, and the screen says so.
     private fun writeChanges(task: Task, changes: Map<String, Any?>, now: Instant) {
+        if (!sent(task, changes, now)) writes.refuse()
+    }
+
+    // Whether the core accepted the task [changes] leave of [task], and they were sent.
+    private fun sent(task: Task, changes: Map<String, Any?>, now: Instant): Boolean {
         val errors = changeErrors(task, changes, now)
         if (errors.isNotEmpty()) {
             Log.w(TAG, "task ${task.id}: ${errors.joinToString("; ")}")
-            writes.refuse()
-            return
+            return false
         }
         write { uid -> tasks.update(uid, task.id, changes) }
+        return true
     }
 
     // A write for the signed-in user; signed out, there is nothing to write.
````

«+» — внизу справа, пока данные прочитаны; у списка внизу запас, чтобы «+» не закрывал кнопки последней строки.

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
index 32659ea..c4b1455 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt
@@ -33,6 +33,7 @@ import androidx.compose.material3.CircularProgressIndicator
 import androidx.compose.material3.DropdownMenu
 import androidx.compose.material3.DropdownMenuItem
 import androidx.compose.material3.ExperimentalMaterial3Api
+import androidx.compose.material3.FloatingActionButton
 import androidx.compose.material3.Icon
 import androidx.compose.material3.IconButton
 import androidx.compose.material3.MaterialTheme
@@ -113,8 +114,8 @@ import java.time.Instant
  * section 6). It follows the data live. The sort and the filter are settings of the account,
  * shared with the web: [onSort] and [onFilter] write them, and a write the server refused comes
  * out of [writeFailures]. A row opens its task ([onOpen]) and does the actions of its status
- * ([onAction]); [taskGone] tells that the screen of a task closed because the task is no longer
- * there. [clock] tells the time.
+ * ([onAction]); "+" opens the form of a new task ([onNew]); [taskGone] tells that the screen of a
+ * task closed because the task is no longer there. [clock] tells the time.
  */
 @OptIn(ExperimentalMaterial3Api::class)
 @Composable
@@ -127,6 +128,7 @@ fun HomeScreen(
     onOpen: (String) -> Unit = {},
     onAction: (Task, TaskAction) -> Unit = { _, _ -> },
     taskGone: Flow<Unit> = emptyFlow(),
+    onNew: () -> Unit = {},
     clock: Clock = Clock.systemUTC(),
 ) {
     var menu by remember { mutableStateOf(false) }
@@ -172,6 +174,13 @@ fun HomeScreen(
             )
         },
         snackbarHost = { SnackbarHost(snackbars) },
+        floatingActionButton = {
+            if (session.data != null) {
+                FloatingActionButton(onClick = onNew, modifier = Modifier.testTag("new_task")) {
+                    Icon(painterResource(R.drawable.ic_add), contentDescription = stringResource(R.string.edit_new_title))
+                }
+            }
+        },
     ) { padding ->
         val data = session.data
         Box(
@@ -307,7 +316,8 @@ private fun TaskRows(
     LazyColumn(
         state = rememberLazyListState(),
         modifier = Modifier.fillMaxSize(),
-        contentPadding = PaddingValues(16.dp),
+        // Room at the end, so that "+" covers no row's buttons there.
+        contentPadding = PaddingValues(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 88.dp),
         verticalArrangement = Arrangement.spacedBy(8.dp),
     ) {
         if (invalid > 0 || offline) {
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt
index bd01838..88238b5 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt
@@ -70,8 +70,9 @@ import java.time.Clock
  * The screen of the task [taskId] (stage 2 spec, section 7): its status, title, due, category,
  * reminders, repeat, description with the formatting and the checkboxes of the web, its times, and
  * the actions of its status (2.2 №12). It follows the data live. An action closes it ([onBack]), as
- * it closes the web's dialog; a task that is no longer there, deleted forever on another device
- * say, closes it through [onGone]. A write the server or the core refused comes out of [writeFailures].
+ * it closes the web's dialog; "Edit" opens its form ([onEdit]); a task that is no longer there,
+ * deleted forever on another device say, closes it through [onGone]. A write the server or the core
+ * refused comes out of [writeFailures].
  */
 @OptIn(ExperimentalMaterial3Api::class)
 @Composable
@@ -83,6 +84,7 @@ fun TaskScreen(
     onToggle: (Task, TaskItem) -> Unit,
     onGone: () -> Unit,
     writeFailures: Flow<Unit> = emptyFlow(),
+    onEdit: () -> Unit = {},
     clock: Clock = Clock.systemUTC(),
 ) {
     BackHandler(onBack = onBack)
@@ -108,6 +110,14 @@ fun TaskScreen(
                         Icon(painterResource(R.drawable.ic_arrow_back), contentDescription = stringResource(R.string.task_back))
                     }
                 },
+                actions = {
+                    // Any task can be edited, whatever its status (2.2 №12).
+                    if (task != null) {
+                        IconButton(onClick = onEdit, modifier = Modifier.testTag("edit")) {
+                            Icon(painterResource(R.drawable.ic_edit), contentDescription = stringResource(R.string.edit_title))
+                        }
+                    }
+                },
             )
         },
         snackbarHost = { SnackbarHost(snackbars) },
````

Изменения в `android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt`:

````diff
diff --git a/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt b/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
index bf76575..eef09e4 100644
--- a/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
+++ b/android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt
@@ -18,6 +18,7 @@ import com.pmobile78.todoround.core.model.Task
 import com.pmobile78.todoround.core.model.TaskAction
 import com.pmobile78.todoround.ui.AppViewModel
 import com.pmobile78.todoround.ui.AuthScreen
+import com.pmobile78.todoround.ui.EditScreen
 import com.pmobile78.todoround.ui.HomeScreen
 import com.pmobile78.todoround.ui.RegisterThisDevice
 import com.pmobile78.todoround.ui.Session
@@ -42,8 +43,8 @@ class MainActivity : AppCompatActivity() {
 }
 
 /**
- * The sign-in screen, or for the signed-in user the list and the screen of the task it opens, in
- * the language and the theme of the session (spec 8).
+ * The sign-in screen, or for the signed-in user the list, the screen of the task it opens and the
+ * form of a task, in the language and the theme of the session (spec 8).
  */
 @Composable
 fun AppContent(viewModel: AppViewModel = viewModel()) {
@@ -62,8 +63,11 @@ fun AppContent(viewModel: AppViewModel = viewModel()) {
         Session.Starting -> Unit
         Session.SignedOut -> AuthScreen(viewModel.accounts)
         is Session.SignedIn -> {
-            // The task open on its screen, by its id: kept over a turn of the phone and an unloading of the app.
+            // The task open on its screen, by its id, and the form open over it or, for a new task, over
+            // the list: kept over a turn of the phone and an unloading of the app.
             var openTask by rememberSaveable { mutableStateOf<String?>(null) }
+            var editing by rememberSaveable { mutableStateOf(false) }
+            var creating by rememberSaveable { mutableStateOf(false) }
             // The list keeps its tab, search and place while a task is open.
             val screens = rememberSaveableStateHolder()
             val gone = remember { Channel<Unit>(Channel.CONFLATED) }
@@ -71,7 +75,36 @@ fun AppContent(viewModel: AppViewModel = viewModel()) {
             // refuses at once is then said by the list, not by the screen that is going away.
             var pending by remember { mutableStateOf<Pair<Task, TaskAction>?>(null) }
             val taskId = openTask
-            if (taskId != null) {
+            // The form closes once its write is sent: a write the core refuses stays in the form, which says
+            // so, and a write the server refuses later is said by the screen the form went back to.
+            if (creating) {
+                EditScreen(
+                    taskId = null,
+                    session = current,
+                    onSave = { edit ->
+                        val sent = viewModel.create(edit.form)
+                        if (sent) creating = false
+                        sent
+                    },
+                    onClose = { creating = false },
+                )
+            } else if (taskId != null && editing) {
+                EditScreen(
+                    taskId = taskId,
+                    session = current,
+                    onSave = { edit ->
+                        val sent = edit.task?.let { viewModel.save(it, edit.opened, edit.form) } != false
+                        if (sent) editing = false
+                        sent
+                    },
+                    onClose = { editing = false },
+                    onGone = {
+                        editing = false
+                        openTask = null
+                        gone.trySend(Unit)
+                    },
+                )
+            } else if (taskId != null) {
                 TaskScreen(
                     taskId,
                     current,
@@ -83,6 +116,7 @@ fun AppContent(viewModel: AppViewModel = viewModel()) {
                         gone.trySend(Unit)
                     },
                     writeFailures = viewModel.writeFailures,
+                    onEdit = { editing = true },
                 )
             } else {
                 screens.SaveableStateProvider("list") {
@@ -95,6 +129,7 @@ fun AppContent(viewModel: AppViewModel = viewModel()) {
                         onOpen = { openTask = it },
                         onAction = viewModel::act,
                         taskGone = remember(gone) { gone.receiveAsFlow() },
+                        onNew = { creating = true },
                     )
                 }
                 LaunchedEffect(pending) {
````

Значки «+» и «Изменить» — тоже Material Icons из `@mui/icons-material` веба.

Файл `android/app/src/main/res/drawable/ic_add.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Add" of the Material icons (Apache License 2.0): a new task. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
</vector>
````

Файл `android/app/src/main/res/drawable/ic_edit.xml`:

````xml
<?xml version="1.0" encoding="utf-8"?>
<!-- "Edit" of the Material icons (Apache License 2.0): the form of the task. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z" />
</vector>
````

- [ ] **Step 4: Сборка, тесты JVM и Lint**

Run: `android/gradlew -p android --no-daemon :core:cleanTest :app:cleanTestDebugUnitTest check :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true` и `tail -1 android/app/build/reports/lint-results-debug.txt` (задачи cleanTest — чтобы тесты шли заново и печатали свою строку и тогда, когда код модуля в задаче не менялся)
Expected: `core tests: 204 passed, 0 failed, 0 skipped`, `app debug tests: 36 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `0 errors, 1 warning` — единственное предупреждение `AndroidGradlePluginVersion` («A newer version of com.android.application than 9.4.1 is available»): вышла AGP 9.5.0, а версии плана не меняются (Global Constraints). Отчёт без предупреждений — `No issues found.` — тоже годится

- [ ] **Step 5: Тесты проходят на устройстве**

Свободны ли эмулятор и Gradle — их может занимать другая сессия:

```bash
source /media/big_disk/android/android-env.sh
OURS=$(for p in $(pgrep -f '[q]emu-system'); do [ "$(readlink /proc/$p/cwd)" = "$PWD" ] && echo $p; done)
if [ -n "$OURS" ]; then echo "our emulator is still running: stop it with the last block of this step"
elif adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"
elif pgrep -f '[G]radleDaemon|[G]radleWrapperMain' > /dev/null; then echo "Gradle is running: wait"
else echo "free"; fi
```

Expected: `free`. Свой эмулятор (запущен из корня этой копии, например после прерванного шага) — выключить последним блоком этого шага и проверить снова; иначе — ждать и проверять снова: чужой эмулятор и чужую сборку не трогать.

Эмулятор запустить в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-2-3.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi), а после загрузки ждёт ещё минуту: в первую минуту под нагрузкой система эмулятора закрывает «зависшие» фоновые процессы, и первый тест падал с `Process crashed`:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; sleep 60; echo booted
```

Expected: `booted`.

Тесты на устройстве — в фоне (`run_in_background`), вывод в журнал; новые — `EditFlowTest`, «+» в `HomeScreenTest`, карандаш в `TaskScreenTest`:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh > /media/big_disk/android/work/device-2-3.log 2>&1; grep -E '^OK \(|^Tests run|^FAILURES|Script exited|^[0-9]+\) |TIMEOUT' /media/big_disk/android/work/device-2-3.log
ls android/app/build/device-screens
```

Expected: `OK (1 test)`, затем `OK (75 tests)` и `Script exited successfully (code 0)`; к снимкам добавился `edit-uk-dark.png`. `edit-uk-dark.png` — форма задачи «Купити хліб» в тёмной теме: «Редагувати завдання», «Зберегти», срок красный с «Прострочено», «За 1 годину», повтор «Кожні» 3 «Днів». Ответ `Error: TIMEOUT: Port 8180 on 127.0.0.1 was not active within 60000ms` — эмулятору Firestore не хватило памяти, обычно из-за чужой сборки Gradle рядом с эмулятором: дождаться её конца и повторить блок. Падение одного теста этапа 3 `NotificationsTest` с `… did not come in 10 s` (уведомления в шторке под нагрузкой не успевают за 10 секунд; в черновике и при прогоне плана так было по разу с разными тестами этого класса, в заметках этапа 3 — тоже) к этому плану не относится: повторить блок тестов. Блок тестов идёт обычно 5–15 минут; дольше 25 минут — тест завис (при прогоне плана так встал тест 2.2 `AuthFlowTest`, когда системные приложения эмулятора перестали отвечать): `adb -e logcat -d | grep TestRunner` покажет `started:` без `finished:`. Тогда остановить приложение — `adb -e shell am force-stop com.pmobile78.todoround`, блок тестов закончится с ошибкой, — выключить эмулятор блоком ниже и повторить шаг с проверки, свободны ли эмулятор и Gradle.

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

- [ ] **Step 6: Commit**

```bash
git add android/app/src/androidTest/kotlin/com/pmobile78/todoround/EditFlowTest.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/HomeScreenTest.kt android/app/src/androidTest/kotlin/com/pmobile78/todoround/TaskScreenTest.kt android/app/src/main/kotlin/com/pmobile78/todoround/MainActivity.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/AppViewModel.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/HomeScreen.kt android/app/src/main/kotlin/com/pmobile78/todoround/ui/TaskScreen.kt android/app/src/main/res/drawable/ic_add.xml android/app/src/main/res/drawable/ic_edit.xml
git commit -F - <<'EOF'
feat(android): "+" and "Edit" open the form, and what it holds is written

Stage 2.3, task 5 (spec 2.2 No. 14-16; sections 3, 5, 7). "+" on the
list opens the form of a new task, the pencil of a task's screen the
form of that task, in any status. AppViewModel.create writes a new task
with an id known before the write; save writes only what the form
changed against the task as it opened (2.2 No. 15), once the core has
checked the task those changes leave over the task as it is now (2.2
No. 16). Both tell the form whether the write is sent: a write the core
refuses stays in the form with what the user changed, and a write the
server refuses later shows on the screen the form went back to.
EditFlowTest proves on the emulators that the web reads what the app
writes: a new task with every field, a change of each field, a change of
the web kept while the form is open, a save the core refuses; the form
survives a turn of the phone and asks before its changes are lost. From
the final review of 2.2: toggle logs a mark that moved.
EOF
```

---

### Task 6: Документация, полная проверка и проверка с вебом на эмуляторах

**Files:**
- Modify: `docs/android.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: всё из задач 1–5.
- Produces: в `docs/android.md` — форма задачи, что пишет «Сохранить» и что делает телефон с часовым поясом; в `CLAUDE.md` — что `core` держит форму задачи, и мелочь итогового ревью 2.2: `core/markdown`, `Recurrence.kt` и `TaskForm.kt` — ручные переносы кода веба, их сверяют заново, когда веб меняется. Проверка с вебом на эмуляторах — запись в журнале исполнения.

- [ ] **Step 1: Документация**

Изменения в `docs/android.md`:

````diff
diff --git a/docs/android.md b/docs/android.md
index 6e0522c..3c78f0b 100644
--- a/docs/android.md
+++ b/docs/android.md
@@ -6,8 +6,8 @@
 
 | Путь | Что внутри |
 |---|---|
-| `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели, правила списка задач веба (вкладки, поиск, фильтр, сортировка), следующий срок повторяющейся задачи, действия по статусу и описание в Markdown так, как его показывает веб (`core/markdown`). Тесты (JUnit) читают общие примеры из `contract/` |
-| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, список задач (сортировка и фильтр пишутся в общие с вебом настройки), экран задачи (действия по статусу и отметка пунктов пишутся в задачи), уведомления (Firebase Cloud Messaging), экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
+| `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели, правила списка задач веба (вкладки, поиск, фильтр, сортировка), следующий срок повторяющейся задачи, действия по статусу, описание в Markdown так, как его показывает веб (`core/markdown`), форма задачи — поля новой задачи и изменения правки, как их пишет веб, — и кнопки панели описания. Тесты (JUnit) читают общие примеры из `contract/` |
+| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, список задач (сортировка и фильтр пишутся в общие с вебом настройки), экран задачи (действия по статусу и отметка пунктов пишутся в задачи), форма задачи («+» в списке и «Изменить» на экране задачи), уведомления (Firebase Cloud Messaging), экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
 | `android/device-tests.sh` | запуск тестов на устройстве против эмуляторов Firebase (ниже) |
 | `android/gradle/libs.versions.toml` | версии библиотек и плагинов |
 | `contract/` | общие примеры данных для веба, функций и Android ([README](../contract/README.md)) |
@@ -95,12 +95,18 @@ android/gradlew -p android --stop                   # остановить де
 
 ## Экран задачи
 
-Касание строки списка открывает задачу: статус, название, срок с «Прострочено», категория, напоминания (прошедшие зачёркнуты), повтор словами, описание с форматированием, даты и действия по статусу — те же, что в диалоге веба: у активной задачи «Готово», «Завершить серию» (у повторяющейся) и «Удалить»; у выполненной — «Восстановить» и «Удалить»; у удалённой — «Восстановить» и «Удалить навсегда». В строке списка — кнопка первого из них, остальные — в меню «⋮». «Удалить навсегда» спрашивает подтверждение (в вебе его нет): задача исчезает совсем. После действия экран закрывается, а список остаётся на той же вкладке. «Готово» у повторяющейся задачи переносит срок на первый повтор после «сейчас», как веб. Если телефон не знает часового пояса задачи, шаг он делает в своём поясе, а пояс задачи оставляет (веб такую задачу не шагает вовсе); веб и сервер читают новый срок в поясе задачи, поэтому там он может сразу оказаться прошедшим — с «Просрочено». Изменения с другого устройства экран показывает сразу; если задачу удалили навсегда, он закрывается с сообщением. Правка задачи придёт в подплане 2.3.
+Касание строки списка открывает задачу: статус, название, срок с «Прострочено», категория, напоминания (прошедшие зачёркнуты), повтор словами, описание с форматированием, даты и действия по статусу — те же, что в диалоге веба: у активной задачи «Готово», «Завершить серию» (у повторяющейся) и «Удалить»; у выполненной — «Восстановить» и «Удалить»; у удалённой — «Восстановить» и «Удалить навсегда». В строке списка — кнопка первого из них, остальные — в меню «⋮». «Удалить навсегда» спрашивает подтверждение (в вебе его нет): задача исчезает совсем. После действия экран закрывается, а список остаётся на той же вкладке. «Готово» у повторяющейся задачи переносит срок на первый повтор после «сейчас», как веб. Если телефон не знает часового пояса задачи, шаг он делает в своём поясе, а пояс задачи оставляет (веб такую задачу не шагает вовсе); веб и сервер читают новый срок в поясе задачи, поэтому там он может сразу оказаться прошедшим — с «Просрочено». Изменения с другого устройства экран показывает сразу; если задачу удалили навсегда, он закрывается с сообщением. Карандаш вверху открывает форму задачи (ниже) — в любом статусе.
 
 Описание приложение показывает так же, как веб: правила Markdown веба (marked 17.0.6 и токенизаторы TipTap 3.32) перенесены в `core/markdown` вместе с особенностями веба — пункты с буквами и римскими числами, «Ok. Thanks» как нумерованный список, пять переводов строки как один пустой абзац. Нарочно иначе: сырой HTML и таблицы видны текстом, а ссылка открывается в браузере, только если её адрес начинается с `http`, `https` или `mailto`. Касание квадратика меняет в описании один символ — отметку этого пункта — и сразу записывает описание. Если описание тем временем изменили на другом устройстве и на этом месте отметки больше нет, приложение ничего не пишет; если изменение другого устройства ещё в пути, побеждает последняя запись — как в вебе.
 
 Запись, которую не пропустила проверка ядра или отклонил сервер, не пропадает молча: приложение показывает «The change could not be saved.». Что не пропустило ядро, пишет журнал: `adb logcat -d -s AppViewModel`.
 
+## Форма задачи
+
+«+» в списке открывает форму новой задачи, карандаш на экране задачи — форму этой задачи. В форме все поля диалога веба в его порядке: название (до 1000 символов), описание в Markdown под кнопками панели веба, категория, срок, напоминания, повтор и размер пузыря задачи — телефон пузырей не показывает, но хранит размер для веба. Кнопки панели пишут разметку в текст: «жирный», «курсив» и «зачёркнутый» обрамляют выделение, списки добавляют «- », «1. » или «- [ ] » в начало строк, «ссылка» вставляет `[текст](адрес)` — только для `http`, `https` и `mailto`. Кнопки только добавляют разметку, а убирают её правкой текста; пустая пара `****`, оставленная одна в строке, — и в вебе, и на телефоне горизонтальная черта. Описание длиннее 100 000 символов сохранить нельзя. Срок выбирается календарём, затем часами (24 часа); «✕» рядом убирает его вместе с напоминаниями и повтором: без срока их нет. Напоминаний — не больше 10.
+
+«Сохранить» пишет только поля, которые пользователь изменил по сравнению с задачей на момент, когда открылась форма, — как веб. Изменения с другого устройства в открытую форму не попадают, но и не теряются: остальных полей «Сохранить» не трогает. Срок, которого пользователь не менял, остаётся как был, вместе с часовым поясом; новый срок пишется в поясе телефона, а если пояс задан вручную смещением (`GMT+03:00` — такого пояса не знают ни веб, ни функции) — в UTC с тем же моментом. Перед записью ядро проверяет задачу, какой её оставит запись поверх нынешней: если, например, другое устройство тем временем убрало срок, а в форме добавлено напоминание, приложение ничего не пишет, говорит «The change could not be saved.», а форма остаётся открытой со всем, что в ней изменено. Выход из формы с изменениями спрашивает, отбросить ли их; форма переживает поворот телефона и выгрузку приложения системой.
+
 ## Уведомления
 
 Напоминания и «просрочено» шлёт сервер ([notifications.md](notifications.md)), а приложение их показывает:
@@ -167,7 +173,7 @@ adb -e emu kill
 
 `Error: TIMEOUT: Port 8180 on 127.0.0.1 was not active within 60000ms` значит, что эмулятору Firestore не хватило памяти рядом с эмулятором Android — например, когда идёт чья-то сборка Gradle: дождаться её конца и повторить.
 
-Тесты снимают экран: список и экран задачи на английском в светлой теме и на украинском в тёмной. Скрипт приносит снимки в `android/app/build/device-screens/`. Проверки тестов видят дерево интерфейса, а не картинку на экране, поэтому снимки смотрят глазами; чисто чёрный снимок значит, что система эмулятора ещё не нарисовала окно, — прогон повторяют.
+Тесты снимают экран: список, экран задачи и её форму на английском в светлой теме и на украинском в тёмной. Скрипт приносит снимки в `android/app/build/device-screens/`. Проверки тестов видят дерево интерфейса, а не картинку на экране, поэтому снимки смотрят глазами; чисто чёрный снимок значит, что система эмулятора ещё не нарисовала окно, — прогон повторяют.
 
 Попробовать приложение руками: в отдельном терминале `firebase emulators:start --only auth,firestore --project demo-to-round`, затем `adb -e reverse tcp:9099 tcp:9099`, `adb -e reverse tcp:8180 tcp:8180` и установка сборки с ключом. Писем эмулятор не отправляет: ссылку сброса пароля он печатает в своём журнале (`To reset the password for …, follow this link: …`).
 
````

Изменения в `CLAUDE.md`:

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index 6bf82ae..e6d2960 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -93,13 +93,14 @@ functions/
 
 ### Android app
 
-`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), stage 2 [spec](docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md), stage 3 [spec](docs/superpowers/specs/2026-10-24-stage-3-notifications-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, the web's list rules, the next due of a repeating task and the Markdown of descriptions as the web shows it (`core/markdown`), with JUnit tests on `contract/`; `app` — the Android application: Firebase Auth, Firestore and Cloud Messaging (the phone registers with FCM by its installation id, the id of its device document; its `fcmToken` is what FCM reports, the same id on Play services 26.12+) with `android/app/google-services.json` (out of git; `firebase apps:sdkconfig`), screens on Compose. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
+`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), stage 2 [spec](docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md), stage 3 [spec](docs/superpowers/specs/2026-10-24-stage-3-notifications-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, the web's list rules, the next due of a repeating task, the form of a task and the Markdown of descriptions as the web shows it (`core/markdown`), with JUnit tests on `contract/`; `app` — the Android application: Firebase Auth, Firestore and Cloud Messaging (the phone registers with FCM by its installation id, the id of its device document; its `fcmToken` is what FCM reports, the same id on Play services 26.12+) with `android/app/google-services.json` (out of git; `firebase apps:sdkconfig`), screens on Compose. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).
 
 - Never print `~/.gradle/gradle.properties` whole (`cat`, `less`, an unanchored `grep`): it holds the release key passwords. Read one non-secret line at a time, e.g. `grep '^org.gradle.java.home' ~/.gradle/gradle.properties`.
 - `core` compiles against the JDK but runs on Android 8+: `-Xjdk-release=17` keeps out Java 18+ methods, not the Java 9–17 ones Android 8 lacks (`List.of` …). Use `java.time` and the Kotlin standard library there.
 - With a phone and the emulator both connected, address one: `adb -e` (the emulator), `adb -d` (the USB phone). A phone on Wi-Fi debugging is a TCP device like the emulator, and `adb -e` cannot tell them apart: `adb disconnect` it before emulator work.
 - A debug build with `-Ptodoround.emulators=true` works with the Auth and Firestore emulators of `firebase.json` (project `demo-to-round`), reached at the device's own 127.0.0.1 through `adb reverse`: Android 17 keeps apps out of the local network, 10.0.2.2 included. The device tests (`app/src/androidTest`) run that way through `android/device-tests.sh`, on the emulator only (the script removes the app before and after a run), and bring their screenshots back to `android/app/build/device-screens/`: look at them, the checks see the UI tree, not the picture. Never run Gradle while the Android emulator is up (14 GB of RAM): build with `--no-daemon`, then boot it. Not `--stop`: it stops the Gradle daemons of every session on the machine, another session's build too. Another session may hold the emulator or run Gradle: check `pgrep -f '[q]emu-system'` and `pgrep -f '[G]radleDaemon|[G]radleWrapperMain'` before a build or a boot, and never touch its processes.
 - Device test names are camelCase: D8 refuses spaces in method names before DEX 040 (minSdk 26). JVM tests may keep backtick names.
+- `core/markdown`, `core/model/Recurrence.kt` and `core/model/TaskForm.kt` port by hand the web's marked 17.0.6 with the tokenizers of @tiptap/markdown 3.32, `src/contract/recurrence.js` and `src/services/data/taskForm.js`. When the web changes those files or bumps those libraries, compare the two again on random inputs, as the drafts of plans 2.2 and 2.3 did: the web's code under vitest against a JUnit test of the core on the same cases.
 
 ### Firestore data model
 
````

- [ ] **Step 2: Полная проверка и неизменный веб**

Блок — в фоне (`run_in_background`): сборка с нуля идёт несколько минут.

```bash
android/gradlew -p android --no-daemon clean check
tail -1 android/app/build/reports/lint-results-debug.txt
git diff --stat main...HEAD -- . ':!android' ':!docs' ':!CLAUDE.md'
```

Expected: `core tests: 204 passed, 0 failed, 0 skipped`, `app debug tests: 36 passed, 0 failed, 0 skipped`, `BUILD SUCCESSFUL`; отчёт Lint — `0 errors, 1 warning` — единственное предупреждение `AndroidGradlePluginVersion` («A newer version of com.android.application than 9.4.1 is available»): вышла AGP 9.5.0, а версии плана не меняются (Global Constraints). Отчёт без предупреждений — `No issues found.` — тоже годится; `git diff --stat` ничего не выводит: кроме `android/` и документации, ветка ничего не меняет. В копии без локальной ветки `main` — `origin/main...HEAD`.

- [ ] **Step 3: Сборки для эмулятора: релиз с R8 и тесты**

Релиз (R8) подписывается одноразовым ключом, как в этапе 1 — это не ключ владельца. Блок — в фоне (`run_in_background`): в черновике 2.2 сборка шла 10,5 минуты.

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
OURS=$(for p in $(pgrep -f '[q]emu-system'); do [ "$(readlink /proc/$p/cwd)" = "$PWD" ] && echo $p; done)
if [ -n "$OURS" ]; then echo "our emulator is still running: stop it with the last block of this step"
elif adb devices | grep -q '^emulator-' || pgrep -f '[q]emu-system' > /dev/null; then echo "an emulator is already running: not ours, wait"
elif pgrep -f '[G]radleDaemon|[G]radleWrapperMain' > /dev/null; then echo "Gradle is running: wait"
else echo "free"; fi
```

Expected: `free`. Свой эмулятор (запущен из корня этой копии, например после прерванного шага) — выключить последним блоком этого шага и проверить снова; иначе — ждать и проверять снова: чужой эмулятор и чужую сборку не трогать.

Эмулятор запустить в фоне (`run_in_background`):

```bash
mkdir -p /media/big_disk/android/work && source /media/big_disk/android/android-env.sh && emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect > /media/big_disk/android/work/emulator-2-3.log 2>&1
```

Дождаться загрузки — одна команда с тайм-аутом 10 минут; она останавливается, если `adb -e` нашёл не эмулятор (телефон по Wi-Fi), а после загрузки ждёт ещё минуту: в первую минуту под нагрузкой система эмулятора закрывает «зависшие» фоновые процессы, и первый тест падал с `Process crashed`:

```bash
source /media/big_disk/android/android-env.sh && adb -e wait-for-device && case "$(adb -e get-serialno)" in emulator-*) ;; *) echo "adb -e is not the emulator: adb disconnect the phone"; exit 1 ;; esac && until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done; sleep 60; echo booted
```

Expected: `booted`.

Сначала тесты на устройстве — в фоне (`run_in_background`), вывод в журнал, — и снимки, которые они принесли:

```bash
source /media/big_disk/android/android-env.sh && firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh > /media/big_disk/android/work/device-2-3.log 2>&1; grep -E '^OK \(|^Tests run|^FAILURES|Script exited|^[0-9]+\) |TIMEOUT' /media/big_disk/android/work/device-2-3.log
ls android/app/build/device-screens
```

Expected: `OK (1 test)`, затем `OK (75 tests)` и `Script exited successfully (code 0)`; восемь снимков — `list-en-light.png`, `list-uk-dark.png`, `reminders-en.png`, `reminders-xiaomi-off-en.png`, `task-en-light.png`, `task-uk-dark.png`, `edit-en-light.png`, `edit-uk-dark.png`; формы посмотреть, как в задачах 4 и 5. Ответ `Error: TIMEOUT: Port 8180 on 127.0.0.1 was not active within 60000ms` — эмулятору Firestore не хватило памяти, обычно из-за чужой сборки Gradle рядом с эмулятором: дождаться её конца и повторить блок. Падение одного теста этапа 3 `NotificationsTest` с `… did not come in 10 s` (уведомления в шторке под нагрузкой не успевают за 10 секунд; в черновике и при прогоне плана так было по разу с разными тестами этого класса, в заметках этапа 3 — тоже) к этому плану не относится: повторить блок тестов. Блок тестов идёт обычно 5–15 минут; дольше 25 минут — тест завис (при прогоне плана так встал тест 2.2 `AuthFlowTest`, когда системные приложения эмулятора перестали отвечать): `adb -e logcat -d | grep TestRunner` покажет `started:` без `finished:`. Тогда остановить приложение — `adb -e shell am force-stop com.pmobile78.todoround`, блок тестов закончится с ошибкой, — выключить эмулятор блоком ниже и повторить шаг с проверки, свободны ли эмулятор и Gradle.

Релиз после R8 запускается (вход он не делает: релиз работает с настоящим проектом). Он идёт после тестов: в первую минуту после загрузки система эмулятора бывает ещё не готова рисовать. Снимок делается, когда в дереве экрана появилось название именно этого приложения:

```bash
source /media/big_disk/android/android-env.sh
adb -e uninstall com.pmobile78.todoround
adb -e install android/app/build/outputs/apk/release/app-release.apk
adb -e logcat -c
adb -e shell am start -W -n com.pmobile78.todoround/.MainActivity | grep Status
timeout 120 sh -c 'until adb -e exec-out uiautomator dump /dev/tty | grep -q "text=\"ToDo-Round\"[^>]*package=\"com.pmobile78.todoround\""; do sleep 1; done'
adb -e exec-out screencap -p > /media/big_disk/android/work/stage-2-3-release.png
adb -e logcat -d | grep -c 'FATAL EXCEPTION'
adb -e uninstall com.pmobile78.todoround
```

Expected: `Failure […]` (приложения не было) или `Success`, затем `Success`, `Status: ok`, `0` и `Success`. Снимок открыть: экран входа — три пузыря, «ToDo-Round», вкладки «Login» и «Register», переключатель EN/UK. Если снимок всё же чёрный, через минуту повторить этот блок.

Эмулятор остаётся чистым — приложения нет, тема светлая:

```bash
source /media/big_disk/android/android-env.sh
adb -e shell pm list packages | grep -c todoround || true
adb -e shell cmd uimode night
```

Expected: `0`, `Night mode: no`.

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

- [ ] **Step 5: Commit**

Коммит документации не ждёт проверки с вебом: в репозитории она ничего не меняет.

```bash
git add CLAUDE.md docs/android.md
git commit -F - <<'EOF'
docs(android): the form of a task, and which code ports the web's

Stage 2.3, task 6. docs/android.md: "+" and the pencil open the form of
a task with every field of the web's dialog, whose buttons only add
Markdown; Save writes only what the user changed against the task as
the form opened, a new due in the zone of the phone (UTC at the same
moment for a zone set by hand), and the core checks the task the change
leaves: a write it refuses stays in the form; leaving a changed form
asks first. CLAUDE.md: core holds the form of a task; core/markdown,
Recurrence.kt and TaskForm.kt port the web's code by hand and are
compared again when the web changes it (final review of 2.2).
EOF
```

- [ ] **Step 6: Проверка с вебом на эмуляторах**

Это проверка спецификации (раздел 11.2): каждое поле создаётся и меняется на телефоне, веб показывает задачу телефона так же, а телефон — правки веба, без перезагрузки. Её делает исполнитель: веб — во встроенном браузере, приложение — на эмуляторе Android, оба — на одних эмуляторах Firebase (проект `demo-to-round`, в прод ничего не уходит). В черновике плана эта проверка прошла так, как описано ниже.

1. Отладочная сборка с ключом эмуляторов уже есть (шаг 3). Эмулятор и Gradle свободны, эмулятор запущен и загружен — блоками шага 4 (свободны ли, запуск, загрузка). Если эмулятор нужен, а его держит другая сессия, — подождать; проверка занимает около 40 минут, и всё это время рядом не должно идти сборок Gradle.
2. Порты Firebase и 3000 свободны (`ss -ltn | grep -E ':(9099|8180|4400|4500|9150|3000)\b'` ничего не печатает). В фоне (`run_in_background`) запустить веб на эмуляторах Firebase: `npm run start:emulator` (если в копии нет `node_modules` — сначала `npm ci --legacy-peer-deps`). Веб готов, когда в его выводе есть строка `Local:` — адрес из неё (обычно `http://localhost:3000/to-round-react/`). `TIMEOUT: Port 8180 …` — эмулятору Firestore не хватило памяти (задача 3, шаг 6).
3. Тестовый аккаунт и его данные — скриптом ниже: пользователь `live-23@example.com` с паролем тестов на устройстве (`secret-1`), категории «Home» и «Work» и задача «Pay rent» — каждый месяц 5-го числа, срок 05.12.2026 10:00 по Киеву, за 1 час, категория «Home». Как в 2.2, документы пишутся через REST эмулятора Firestore с заголовком `Authorization: Bearer owner`, все поля — тех типов, что пишет веб. Сохранить скрипт в `/media/big_disk/android/work/seed-2-3.mjs` и выполнить `node /media/big_disk/android/work/seed-2-3.mjs` (если хук не даёт `node` обращаться к `localhost` из командной строки — тем же кодом в песочнице `ctx_execute`). Expected: `seeded`.

```js
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key';
const FS = 'http://127.0.0.1:8180/v1/projects/demo-to-round/databases/(default)/documents';
const user = await (await fetch(AUTH, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'live-23@example.com', password: 'secret-1', returnSecureToken: true }) })).json();
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
await put(`users/${uid}/categories/work`, { schemaVersion: 2, name: 'Work', color: '#da3833', order: 2, createdAt: now, updatedAt: now });
await put(`users/${uid}/tasks/rent`, { schemaVersion: 2, title: 'Pay rent', description: 'Before the 5th', categoryId: 'home', status: 'active',
  due: { local: '2026-12-05T10:00', tz: 'Europe/Kyiv' }, reminders: [60], repeat: { every: 1, unit: 'months', monthDay: 5 }, radius: 45,
  pulseMuted: false, overdueAt: null, createdAt: new Date('2026-10-01T08:00:00Z'), updatedAt: new Date('2026-10-01T08:00:00Z'), deletedAt: null });
console.log('seeded');
```

4. Приложение: поставить сборку (`adb -e install -t android/app/build/outputs/apk/debug/app-debug.apk`), включить `adb -e reverse tcp:9099 tcp:9099` и `adb -e reverse tcp:8180 tcp:8180`, открыть и войти этим аккаунтом — касаниями `adb -e shell input tap` по координатам из `uiautomator dump` и `adb -e shell input text`, текст — через 2 секунды после касания поля, когда открылась клавиатура. Пробел в тексте — `%s` (`adb -e shell input text 'Water%sthe%splants'`: иначе `input text` берёт только первое слово); адрес почты — частями по нескольку символов: целиком часть символов теряется. Набранное проверять по `uiautomator dump`. Если система спросит разрешение на уведомления — «Don't allow». Список: «Pay rent» и «Active Tasks (1)». Пояс эмулятора — `adb -e shell getprop persist.sys.timezone` (в черновике — `Europe/Kyiv`, как у компьютера); веб показывает сроки в поясе компьютера, поэтому, если пояса разные, сроки ниже сравниваются по моменту, а не по цифрам.
5. Веб: открыть во встроенном браузере адрес из шага 2 и войти тем же аккаунтом (поля формы заполнить в странице). Веб сразу показывает список (`mainView: "list"`): «Pay rent».
6. Телефон → веб; после каждого шага веб без перезагрузки показывает то же, что телефон:
   - «+» → форма новой задачи: название «Water the plants»; в описании набрать «the big pot» и нажать «Task List» — в поле `- [ ] the big pot`; категория «Work»; касание срока — календарь: «Change to next month», 2 ноября 2026, «OK»; затем часы: 9, 30, «OK» — в поле `11/02/2026 09:30`; «Remind me» → «1 hour before» → «Save», ещё раз «Remind me» → «Custom…», «Value» 2, «Days» → «Save»; «Repeat every», «Every» 2, «Unit» → «Weeks», MON и FRI; ползунок размера — на 60 → «Create». Список телефона: «Water the plants», `Due date: 11/02/2026, 09:30`, «Work», «Active Tasks (2)». Веб без перезагрузки — та же строка и «Active Tasks (2)»; диалог этой задачи (кнопка «Edit Bubble» её строки) показывает то же: заголовок, квадратик «the big pot» без отметки, «Category (tag)» — «Work», срок `11/02/2026 09:30`, «1 hour before» и «2 days before», «Repeat every» включён, 2, «Weeks», выделены MON и FRI, «Bubble size: 60px». Закрыть его «Cancel»;
   - экран «Pay rent» → карандаш «Edit Task»: название «Pay the rent»; в описании курсор в конец, пробел, «Bold» и набрать «soon» — в поле `Before the 5th **soon**`; категория «No category»; срок — календарь, 6 декабря 2026, затем часы 11:00 — `12/06/2026 11:00`; у «1 hour before» — корзина, «Remind me» → «1 day before» → «Save»; «Every» 2; размер 70 → «Save». Экран задачи: «Pay the rent», `Due date: 12/06/2026, 11:00`, «1 day before», «Every 2 months», «Before the 5th soon» с жирным «soon». Веб без перезагрузки: строка «Pay the rent» без категории, `12/06/2026, 11:00`, «Updated: …»; диалог — `Before the 5th` и жирное «soon», категории нет, `12/06/2026 11:00`, «1 day before», «Every» 2, «Months», «Bubble size: 70px».
7. Веб → телефон:
   - на телефоне открыт экран «Pay the rent»; в вебе в диалоге этой задачи заголовок «Pay the rent today», «Remind me» → «1 hour before» → «Save», размер 45 → «Save». Экран телефона сам показывает «Pay the rent today», «1 hour before» и «1 day before»; карандаш → форма показывает те же значения и «Bubble size: 45px»; «✕» закрывает её без вопроса — ничего не менялось;
   - на телефоне открыт экран «Water the plants»; в вебе в диалоге этой задачи — крестик срока → «Save». Экран телефона сам остаётся без срока, напоминаний и повтора — только название и описание; карандаш → форма: срок пустой, «Remind me» недоступна и под ней «Set due date to add reminders», «Repeat every» выключен и недоступен.
8. Убрать за собой: приложение удалить (`adb -e uninstall com.pmobile78.todoround`), `adb -e reverse --remove-all`, эмулятор выключить блоком шага 4. `npm run start:emulator` остановить сигналом `INT` своему процессу `firebase emulators:exec`, затем своему `vite` — тем, чей каталог (`readlink /proc/<pid>/cwd`) — эта копия; затем `ss -ltn | grep -E ':(9099|8180|4400|4500|9150|3000)\b'` ничего не печатает. Вкладку встроенного браузера закрыть.

Итог — в журнал исполнения. Если сторона не видит изменения другой без перезагрузки — остановиться и разобрать причину (superpowers:systematic-debugging) до правок.

---

## Итог подплана 2.3 и передача в 2.4

После этого плана подплан 2.3 готов (обзор подпланов): каждое поле создаётся и меняется на телефоне, а на эмуляторах веб показывает задачу телефона так же, и телефон — правки веба (задача 6, шаг 6); `android/gradlew -p android --no-daemon check` зелёный. Ветку `stage-2-tasks` можно влить в `main` — с согласия владельца. Сборку 2.3 на Redmi 9 владельца ставят только по его просьбе: она пишет в его задачи.

- **Ядро.** `TaskForm.kt` — `TaskForm`, `NEW_TASK_FORM`, `NEW_REPEAT`, `Task.toForm`, `canSave`, `withoutDue`, `writeZone`, `newTaskFields`, `newTaskErrors`, `formChanges`, `repeatEvery`, `toggledWeekday`, `pickedDate`, `pickerMillis`, `pickedDue`, `formDateTime`; `Reminders.kt` — `REMINDER_PRESETS`, `reminderMinutes`, `withReminder`; `core/markdown/Toolbar.kt` — `Selected`, `Emphasis`, `LineStart`, `emphasized`, `listed`, `linked`.
- **Записи.** Новая задача — `newTaskDoc` и `TasksRepository.create` с id из `newId`; правка — `formChanges` → `changeErrors` поверх нынешней задачи → `TasksRepository.update`. Всё через `AppViewModel.create` и `save`: они говорят форме, ушла ли запись, и отказ ядра остаётся в форме (решение 10).
- **Экраны.** `EditScreen(taskId, session, onSave, onClose, onGone, clock)` с состоянием `Edit` и его `EditSaver`; «+» списка (`HomeScreen(onNew)`), карандаш экрана задачи (`TaskScreen(onEdit)`); `MainActivity` хранит `openTask`, `editing` и `creating`. Для 2.4 (обзор подпланов, «2.3 → 2.4»): в форме проверяются новые и изменённые категории — её список берёт `inOrder(data.categories.items)` из живых данных, а категория, удалённая на другом устройстве, видна как «No Tag» и остаётся у задачи.
- **Мелочи итогового ревью 2.2.** Взяты журнал `toggle`, тесты `MarkdownTest`, комментарий `Markdown.kt` и строка о ручных переносах в `CLAUDE.md`; разбор описания, который нельзя прервать, остаётся мелочью (раздел «Мелочи итогового ревью 2.2»).
- **Мелочи ревью этого плана, оставленные как есть:** поле срока для TalkBack — кнопка с описанием «Due date: …», но без роли кнопки (накрытое поле TalkBack не видит — это и нашла живая проверка черновика); вопрос «Discard the changes?» задаётся и тогда, когда «Сохранить» ничего бы не записало: пробел в конце названия, день недели, включённый и снова выключенный (`changed` сравнивает форму как есть, а `formChanges` — приведённую); в «Every» набранное «05» сразу становится «5»; экран задачи после закрытия формы открывается сверху, а не там, где его прокрутили; кнопки панели только добавляют разметку (решение 6): «жирный» без текста оставляет `****` — горизонтальную черту, повторный список ставит второе начало строки (сказано в `docs/android.md`); заголовки на украинском — как предложение («Редагувати завдання»), а у веба каждое слово с большой буквы («Редагувати Бульбашку»); «No category» и серое «No Tag» удалённой категории стоят в одном поле (решение 7).
- **Мелочи ревью 2.1, оставленные дальше:** панель фильтра не видит чужих изменений, пока открыта (№ 3, → 2.4); `selected` у кнопки фильтра (№ 5, вместе со сверкой на Redmi 9).
- **Остаются из прежних ревью:** номер нумерованного списка больше 2 147 483 647 телефон начинает с 1; касание квадратика, пока описание после изменения с другого устройства ещё разбирается, проверяет отметку только по месту; у квадратика и строки нет подписей для TalkBack; пока длинное описание разбирается в первый раз, на его месте пусто; високосная секунда и 29 февраля в `isIsoTimestamp`, годы 0000–0099 в `parseLocal` (этап 5, импорт бэкапа); поток данных после сбоя не перезапускается — помогают выход и вход; `addTestListener` и кэш конфигурации Gradle; копия списка в `Records.stringsOrNull`; приведение `as FirebaseFirestoreException` в тестах; кэш Firestore после выхода остаётся на устройстве, как в вебе.
