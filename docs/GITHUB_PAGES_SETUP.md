# Настройка GitHub Pages с переменными окружения

## 🚀 Быстрый старт

### 1. Настройка GitHub Secrets

1. Перейдите в ваш репозиторий на GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **"New repository secret"**
4. Добавьте следующие secrets:

```
FIREBASE_API_KEY=AIzaSyAat5vcOBIOeJXoGFfqkNybC9J-v0G8yA4
FIREBASE_AUTH_DOMAIN=todo-flutter-fb8bf.firebaseapp.com
FIREBASE_PROJECT_ID=todo-flutter-fb8bf
FIREBASE_STORAGE_BUCKET=todo-flutter-fb8bf.appspot.com
FIREBASE_MESSAGING_SENDER_ID=699564548059
FIREBASE_APP_ID=1:699564548059:web:0e45b2291da108955fd1fe
FIREBASE_MEASUREMENT_ID=G-94PRVB1G5L
FIREBASE_VAPID_KEY=BGuf9B4yPtX9L7RSGD9SnorV_6VlAZ4BWiQgSjD33XhfnGq75x3ev_pTxVj-0UUlc58qyv6_Xxt9hJDWOczgYQw
```

### 2. Включение GitHub Pages

1. **Settings** → **Pages**
2. **Source**: `GitHub Actions` (рекомендуется)
3. Нажмите **Save**

**Примечание**: Используется современный подход с GitHub Actions вместо ветки `gh-pages`.

### 3. Деплой

Просто запушьте изменения в ветку `main` или `master`:

```bash
git add .
git commit -m "Update with environment variables"
git push origin main
```

GitHub Actions автоматически:
- Создаст `.env.production` с вашими secrets
- Сгенерирует Service Worker
- Соберет приложение
- Загрузит артефакт
- Задеплоит на GitHub Pages через современный API

## 📁 Структура файлов

```
.github/
  workflows/
    deploy.yml          # GitHub Actions workflow
src/
  utils/
    config.js           # Конфигурация приложения
scripts/
  generate-sw.js        # Генерация Service Worker
.env.example            # Шаблон переменных
```

## 🔧 GitHub Actions Workflow

Workflow автоматически:

1. **Checkout** - клонирует репозиторий
2. **Setup Node.js** - устанавливает Node.js 18
3. **Clear npm cache** - очищает кэш npm
4. **Install dependencies** - устанавливает зависимости с `--legacy-peer-deps`
5. **Create .env.production** - создает файл с переменными из secrets
6. **Generate Service Worker** - генерирует SW с переменными
7. **Build** - собирает приложение
8. **Setup Pages** - настраивает GitHub Pages
9. **Upload artifact** - загружает собранные файлы
10. **Deploy** - деплоит на GitHub Pages через современный API

### Исправление проблем с зависимостями

Workflow использует флаг `--legacy-peer-deps` для решения конфликтов версий TypeScript и других зависимостей.

### Environment Configuration

Workflow настроен с environment `github-pages` для правильного деплоя через GitHub Pages API.

## 🔒 Безопасность

- ✅ Secrets хранятся в GitHub (не в коде)
- ✅ Переменные доступны только во время сборки
- ✅ `.env` файлы не коммитятся в репозиторий

## 🐛 Устранение неполадок

### Ошибка "Missing required Firebase configuration"
Проверьте, что все secrets добавлены в GitHub.

### Деплой не происходит
1. Проверьте, что workflow запустился в **Actions**
2. Убедитесь, что ветка называется `main` или `master`
3. Проверьте логи на ошибки
4. Убедитесь, что в **Settings** → **Pages** выбран источник `GitHub Actions`

### Service Worker не работает
1. Проверьте, что `generate-sw` выполнился успешно
2. Убедитесь, что VAPID ключ корректный

### Ошибка ERESOLVE (конфликт зависимостей)
Workflow уже настроен для решения этой проблемы:
- Используется `--legacy-peer-deps` флаг
- Очищается npm кэш перед установкой
- Используется `--prefer-offline --no-audit` для ускорения

### Ошибка "Missing environment"
Workflow настроен с environment `github-pages` для правильного деплоя через GitHub Pages API.

### Приложение не загружается
1. Проверьте homepage в `package.json`
2. Убедитесь, что GitHub Pages включены
3. Проверьте, что ветка `gh-pages` создалась

## 📊 Мониторинг

- **Actions** - статус деплоя
- **Pages** - статус GitHub Pages
- **Settings** → **Pages** - настройки деплоя

## 🔄 Обновление

Для обновления приложения:

1. Внесите изменения в код
2. Запушьте в `main`/`master`
3. GitHub Actions автоматически задеплоит

```bash
git add .
git commit -m "Update app"
git push origin main
```

## 📚 Дополнительные ссылки

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Environment Variables Setup](../ENVIRONMENT_SETUP.md)
