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
adb -e uninstall com.pmobile78.todoround
adb -e install android/app/build/outputs/apk/debug/app-debug.apk
adb -e shell am start -n com.pmobile78.todoround/.MainActivity
mkdir -p /media/big_disk/android/work && adb -e exec-out screencap -p > /media/big_disk/android/work/screen.png
adb -e emu kill
```

- Эмулятор загружается около двух минут. Под нагрузкой система эмулятора может показать окно «… isn't responding» (службы Google, лончер или интерфейс системы) — нажать «Wait»; к приложению это не относится.
- `-no-snapshot` означает полную загрузку, а не чистый эмулятор: поставленные приложения и настройки сохраняются между запусками. Поэтому перед установкой прежнее приложение удаляют — сборка с другим ключом поверх не встанет. Совсем чистый старт — флаг `-wipe-data`.
- Тёмная тема: `adb -e shell cmd uimode night yes` (вернуть — `night no`); украинский язык приложения: `adb -e shell cmd locale set-app-locales com.pmobile78.todoround --locales uk-UA`.

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
