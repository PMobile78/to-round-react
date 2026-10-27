# Android-приложение

Нативное Android-приложение ToDo-Round: Kotlin, Jetpack Compose, Material 3. Работает с тем же проектом Firebase и теми же данными (контракт v2), что и веб. План работ — [дорожная карта](superpowers/specs/2026-10-14-android-roadmap.md); этап 1 — [спецификация](superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), этап 2 — [спецификация](superpowers/specs/2026-10-24-stage-2-tasks-design.md), этап 3 (уведомления) — [спецификация](superpowers/specs/2026-10-24-stage-3-notifications-design.md).

## Что где

| Путь | Что внутри |
|---|---|
| `android/core` | чистый Kotlin без Android и Firebase: схема контракта v2, время и часовые пояса, проверка записей, модели, правила списка задач веба (вкладки, поиск, фильтр, сортировка). Тесты (JUnit) читают общие примеры из `contract/` |
| `android/app` | Android-приложение: вход и регистрация (Firebase Auth), данные из Firestore, список задач (сортировка и фильтр пишутся в общие с вебом настройки), уведомления (Firebase Cloud Messaging), экраны на Compose, тема, строки en/uk, иконка. Тесты JVM — `app/src/test`, тесты на устройстве — `app/src/androidTest` |
| `android/device-tests.sh` | запуск тестов на устройстве против эмуляторов Firebase (ниже) |
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

## Firebase

Приложение зарегистрировано в проекте `todo-flutter-fb8bf`: `com.pmobile78.todoround`, App ID `1:699564548059:android:9246f56b0bf422d85fd1fe`, с отпечатком SHA-1 отладочного ключа этой машины. Его настройки — `android/app/google-services.json`. Файл вне git, как `.env` веба, и скачивается командой Firebase CLI:

```bash
firebase apps:sdkconfig ANDROID 1:699564548059:android:9246f56b0bf422d85fd1fe --project todo-flutter-fb8bf -o android/app/google-services.json
```

Без файла `app` не собирается (`File google-services.json is missing`). Отпечаток релизного ключа, когда ключ появится, добавляет команда `firebase apps:android:sha:create <App ID> <SHA-1> --project todo-flutter-fb8bf`; SHA-1 печатает `keytool -list -v -keystore <файл ключа>`.

## Команды

Из корня репозитория:

```bash
android/gradlew -p android check                    # тесты JVM (core и app) и Android Lint
android/gradlew -p android :core:test               # только тесты контракта на примерах contract/
android/gradlew -p android :app:assembleDebug       # отладочная сборка
android/gradlew -p android :app:installDebug        # поставить отладочную сборку на подключённое устройство
android/gradlew -p android :app:assembleRelease     # релизная сборка (R8; подписана, если настроен ключ)
android/gradlew -p android --stop                   # остановить демон Gradle и освободить память
# тесты на устройстве — в разделе «Эмуляторы Firebase»
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

Без кабеля (Android 11+): «Для разработчиков → Отладка по Wi-Fi → Подключить устройство с помощью кода», затем на компьютере `adb pair <адрес>:<порт>` с кодом с экрана и `adb connect <адрес>:<порт>`; дальше команды `adb -s <адрес>:<порт> …`. Компьютер и телефон запоминают сопряжение: в следующий раз достаточно включить «Отладку по Wi-Fi» и `adb connect` к адресу с её главного экрана (`adb pair` иногда печатает `protocol fault … Success`, хотя сопряжение прошло).

С этим компьютером по кабелю у Redmi 9 бывают фантомные касания: от помех экран сам «нажимает» — закрывает приложения и отменяет окна, в том числе окно установки (`INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`). Проверка: `adb -d shell getevent -lt /dev/input/event3` при нетронутом телефоне ничего не печатает. Поэтому телефон подключают по Wi-Fi.

При установке через adb телефон сначала показывает окно Google Play Защиты, затем окно MIUI «Установка через USB». Оба нужно подтвердить; окно MIUI само закрывается с отменой примерно через 10 секунд.

Если MIUI не даёт ставить по USB: скопировать APK на телефон и открыть его в файловом менеджере (разрешить установку из этого источника).

## Сверка списка с вебом

Список задач приложения — список веба: те же вкладки «Активные», «Выполненные», «Удалённые», «Запланированные», тот же поиск, а фильтр и сортировка — общие настройки аккаунта: изменённые на телефоне, они меняются и в вебе. Как сравнить:

1. В вебе войти в тот же аккаунт, что на телефоне, и перезагрузить вкладку: задачи с одинаковым ключом сортировки веб показывает в порядке id документов только сразу после загрузки страницы, а пришедшие с сервера позже ставит в конец. Если порядок не сошёлся только у таких задач, перезагрузить вкладку ещё раз.
2. Открыть в вебе «Список завдань». Числа в названиях четырёх вкладок веба — те же, что в названиях вкладок приложения.
3. В каждой вкладке сравнить порядок и задачи: название, срок, «Прострочено», категорию, даты. Вкладку «Запланированные» сравнивать в одну и ту же минуту: задача уходит из неё, когда наступает её срок.

Срок приложение показывает во времени телефона, веб — во времени компьютера; при сверке часовой пояс у них один. Если телефон не знает часового пояса задачи (его база часовых поясов старее, чем у браузера), срок он понимает в своём поясе — так же, как веб в таком случае. Документы, которые не прошли проверку контракта, приложение не показывает, а считает в заметке над списком; веб их показывает, поэтому числа и порядок расходятся ровно на них. Если проверку не прошла категория, её задачи приложение показывает без категории. Почему документ не прошёл проверку, пишет журнал телефона: `adb -s <адрес>:<порт> logcat -d -s Loaded`.

## Уведомления

Напоминания и «просрочено» шлёт сервер ([notifications.md](notifications.md)), а приложение их показывает:

- После входа и при каждом открытии приложение регистрируется в FCM по id установки Firebase (FID) и записывает себя в `users/{uid}/devices/{FID}`: `platform: "android"`, `notificationsEnabled: true` у нового устройства, а адрес для пушей `fcmToken` — то, что FCM сообщил в `onRegistered`: сам FID (регистрация по FID, сервисы Google Play 26.12 и новее) или, на более старых сервисах Google Play, токен FCM. Android 13+ после входа спрашивает разрешение на уведомления. Если уведомления в настройках Android выключены (или выключен канал), пишется `fcmToken: null`, и сервер на телефон не шлёт.
- «Выйти» сначала удаляет документ устройства (ждёт не больше 2 секунд) и уведомления аккаунта из шторки, потом выходит из аккаунта.
- Канал — «Reminders» / «Нагадування», важность высокая. У задачи одно уведомление: следующее её событие заменяет прежнее; время на нём — время отправки сервером. Нажатие открывает приложение; `taskId` и `type` сообщения приходят в extras `MainActivity`.
- Меню → «Reminders on this device» / «Нагадування на цьому пристрої»: разрешены ли уведомления, а на Xiaomi — что включить в MIUI.
- Сборка для эмуляторов Firebase (`-Ptodoround.emulators=true`) в FCM не регистрируется (эмуляторы пушей не шлют) и сама пишет FID как адрес; id установки она при этом регистрирует в проекте — так работает Firebase Installations.

### MIUI

MIUI выгружает приложения в фоне. Смахнутое из недавних приложение без автозапуска «тихий» пуш не получает. Для ToDo-Round включить на телефоне:

1. «Автозапуск» — на экране «О приложении» (долгое нажатие на значок или кнопка «Налаштування застосунку» в окне «Нагадування на цьому пристрої»).
2. Там же «Контроль активности» — «Нет ограничений».
3. По желанию — закрепить карточку приложения в недавних (замок): тогда «Очистить всё» его не закрывает.

### Пробный пуш

Телефон можно проверить без задач: сообщение FCM HTTP v1 (`projects/todo-flutter-fb8bf/messages:send`) в поле `token` — адрес устройства (FID), от имени входа Firebase CLI. FID отладочной сборки — поле `Fid` файла `no_backup/PersistedInstallation.*.json` в её данных. В том же файле — токены установки, поэтому файл не печатают, а сразу берут из него только `Fid`:

```bash
adb -s <адрес>:<порт> shell "run-as com.pmobile78.todoround sh -c 'cat no_backup/PersistedInstallation.*.json'" | python3 -I -c "import json, sys; print(json.load(sys.stdin)['Fid'])" > fid.txt
```

Пока на телефоне никто не вошёл, приложение пуш не показывает. Журнал: `adb … logcat -d -s FirebaseMessaging ToDoRoundApp AppViewModel` (подробный журнал FCM — после `adb … shell setprop log.tag.FirebaseMessaging VERBOSE`).

## Эмулятор

Памяти 14 ГБ, поэтому эмулятор запускается без окна и без Android Studio, а демон Gradle перед этим останавливается. Команды `adb -e` обращаются к единственному эмулятору, если телефон подключён кабелем. Телефон по Wi-Fi для adb — такое же сетевое устройство, как эмулятор, и `adb -e` их не различит (`more than one emulator`, ложное `booted` при ожидании загрузки): перед работой с эмулятором телефон отключают — `adb disconnect <адрес>:<порт>`.

```bash
android/gradlew -p android :app:assembleDebug
android/gradlew -p android --stop
emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect &
adb -e wait-for-device; until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done
adb -e uninstall com.pmobile78.todoround
adb -e install android/app/build/outputs/apk/debug/app-debug.apk
adb -e shell am start -n com.pmobile78.todoround/.MainActivity
mkdir -p /media/big_disk/android/work && adb -e exec-out screencap -p > /media/big_disk/android/work/screen.png
adb -e emu kill
```

- Эмулятор загружается около двух минут. Под нагрузкой система эмулятора может показать окно «… isn't responding» (службы Google, лончер или интерфейс системы) — нажать «Wait»; к приложению это не относится.
- `-no-snapshot` означает полную загрузку, а не чистый эмулятор: поставленные приложения и настройки сохраняются между запусками. Поэтому перед установкой прежнее приложение удаляют — сборка с другим ключом поверх не встанет. Совсем чистый старт — флаг `-wipe-data`.
- Тёмная тема: `adb -e shell cmd uimode night yes` (вернуть — `night no`); украинский язык приложения: `adb -e shell cmd locale set-app-locales com.pmobile78.todoround --locales uk-UA`.
- `emu kill` выключает эмулятор мгновенно, и только что изменённая настройка (например, тема) теряется. Перед ним — 3 секунды и `adb -e shell sync`.

## Эмуляторы Firebase

Отладочная сборка с ключом `-Ptodoround.emulators=true` работает не с проектом, а с эмуляторами Auth и Firestore из `firebase.json` (порты 9099 и 8180) и проектом эмуляторов веба `demo-to-round`: в прод она не ходит, а правила — настоящие `firestore.rules`. Устройство обращается к эмуляторам по своему `127.0.0.1` через `adb reverse`: Android 17 не пускает приложения в локальную сеть, в том числе к `10.0.2.2`, без разрешения `ACCESS_LOCAL_NETWORK`. Открытый HTTP к `127.0.0.1` разрешён только отладочной сборке.

Тесты на устройстве (`app/src/androidTest`) проверяют Firebase, репозитории, вход и экраны. Gradle рядом с эмулятором не запускают, поэтому сначала сборка, потом эмулятор:

```bash
android/gradlew -p android :app:assembleDebug :app:assembleDebugAndroidTest -Ptodoround.emulators=true
android/gradlew -p android --stop
emulator -avd ToRound_API37 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect &
adb -e wait-for-device; until [ "$(adb -e shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 5; done
firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
adb -e emu kill
```

`android/device-tests.sh` ставит оба APK, включает `adb reverse`, запускает тесты, удаляет приложение и печатает итог: `OK (N tests)` или ошибки. Сборку без `-Ptodoround.emulators=true` тесты отвергают, чтобы не ходить в прод. Убирает за собой скрипт и после упавшего прогона. Приложение он удаляет до и после тестов, поэтому тесты идут только на эмуляторе: если `adb -e` видит не эмулятор (например, один телефон по Wi-Fi), скрипт ничего не трогает и просит отключить телефон.

Тесты списка снимают экран: список на английском в светлой теме и на украинском в тёмной. Скрипт приносит снимки в `android/app/build/device-screens/`. Проверки тестов видят дерево интерфейса, а не картинку на экране, поэтому снимки смотрят глазами; чисто чёрный снимок значит, что система эмулятора ещё не нарисовала окно, — прогон повторяют.

Попробовать приложение руками: в отдельном терминале `firebase emulators:start --only auth,firestore --project demo-to-round`, затем `adb -e reverse tcp:9099 tcp:9099`, `adb -e reverse tcp:8180 tcp:8180` и установка сборки с ключом. Писем эмулятор не отправляет: ссылку сброса пароля он печатает в своём журнале (`To reset the password for …, follow this link: …`).

## Релизный ключ

Отладочную сборку подписывает стандартный ключ Android (`~/.android/debug.keystore`; создаётся первой сборкой). Релизную — свой ключ, который хранится вне репозитория. Создаёт его владелец; пароль знает только он.

1. Создать ключ (команда спросит пароль и данные владельца):

   ```bash
   mkdir -p /media/big_disk/android/keys
   /media/big_disk/android/android-studio/jbr/bin/keytool -genkeypair -keystore /media/big_disk/android/keys/todoround-release.jks -storetype PKCS12 -alias todoround -keyalg RSA -keysize 4096 -validity 10000
   ```

2. Сохранить файл ключа и пароль в надёжном месте (например, бэкап на другом диске и менеджер паролей). Без ключа нельзя выпустить обновление приложения, подписанного им.
3. Дописать в `~/.gradle/gradle.properties` (после этого файл не показывать целиком — в нём пароли):

   ```properties
   todoround.release.storeFile=/media/big_disk/android/keys/todoround-release.jks
   todoround.release.storePassword=<пароль>
   todoround.release.keyAlias=todoround
   todoround.release.keyPassword=<пароль>
   ```

4. Проверить: `android/gradlew -p android :app:assembleRelease` даёт `app-release.apk`, а `apksigner verify --print-certs` (из `/media/big_disk/android/sdk/build-tools/<версия>/`) показывает сертификат ключа.

Без этих строк релизная сборка остаётся неподписанной (`app-release-unsigned.apk`). Файлы `*.jks` и `*.keystore` в `android/` игнорируются git.

Приложения с разными ключами не ставятся друг поверх друга: чтобы сменить отладочную сборку на релизную, приложение сначала удаляют. Данные при этом не теряются — они в Firestore.
