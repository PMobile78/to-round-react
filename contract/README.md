# contract/ — общий контракт данных v2

Спецификация: [docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md](../docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md).

Папка общая для всех клиентов: веба (реализация — `src/contract/`), Cloud Functions и Android-приложения. Кода здесь нет — только данные, по которым каждый клиент проверяет свою реализацию.

| Файл | Что внутри | Кто читает |
|---|---|---|
| `palette.json` | 20 цветов категорий | веб, правила Firestore (тест сверки), Android |
| `fixtures/time.json` | «местное время + зона → момент» и обратно, включая переходы на летнее время | веб, функции, Android |
| `fixtures/recurrence.json` | «срок, повтор, now → следующий срок» | веб, Android |
| `fixtures/tasks.json`, `fixtures/categories.json`, `fixtures/settings.json` | правильные и неправильные записи в форме бэкапа | веб, правила Firestore, Android |
| `fixtures/devices.json` | правильные и неправильные записи устройств | правила Firestore, Android |
| `fixtures/markdown-v1.json` | старые описания (HTML TipTap и простой текст) → Markdown | веб |
| `fixtures/migration-v1.json` | старые записи v1 → v2 | веб |

Правила:

- Момент времени — ISO 8601 в UTC с `Z`. Местное время — `YYYY-MM-DDTHH:mm`.
- Эталон правил часовых поясов — `java.time.ZonedDateTime.of`: несуществующее время сдвигается вперёд на длину перехода, неоднозначное берётся с более ранним смещением.
- В примерах с переходом на летнее время используются зоны со стабильными правилами (`America/New_York`, `Europe/Berlin`), а не `Europe/Kyiv`: правила Украины могут измениться в базе tzdata.
- Тесты правил Firestore (`firestore-tests/`) переводят записи в форму Firestore: время → `Timestamp`, плюс `schemaVersion` и служебные поля. Правила принимают каждую правильную запись. Неправильные записи, которые правила проверить не могут (значения внутри списков, база часовых поясов), перечислены в тестах явно.
- Изменили пример — прогоните тесты всех клиентов, которые его читают: `npm run test:all` (веб, функции, правила) и `android/gradlew -p android :core:test` (Android, [docs/android.md](../docs/android.md)).
