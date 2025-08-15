# 🚀 Быстрый старт GitHub Pages

## Шаг 1: Добавьте Secrets в GitHub

1. Перейдите в ваш репозиторий: `https://github.com/pmobile78/to-round-react`
2. **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **"New repository secret"**
4. Добавьте эти secrets:

| Name | Value |
|------|-------|
| `FIREBASE_API_KEY` | `AIzaSyAat5vcOBIOeJXoGFfqkNybC9J-v0G8yA4` |
| `FIREBASE_AUTH_DOMAIN` | `todo-flutter-fb8bf.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `todo-flutter-fb8bf` |
| `FIREBASE_STORAGE_BUCKET` | `todo-flutter-fb8bf.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | `699564548059` |
| `FIREBASE_APP_ID` | `1:699564548059:web:0e45b2291da108955fd1fe` |
| `FIREBASE_MEASUREMENT_ID` | `G-94PRVB1G5L` |
| `FIREBASE_VAPID_KEY` | `BGuf9B4yPtX9L7RSGD9SnorV_6VlAZ4BWiQgSjD33XhfnGq75x3ev_pTxVj-0UUlc58qyv6_Xxt9hJDWOczgYQw` |

## Шаг 2: Включите GitHub Pages

1. **Settings** → **Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `gh-pages` (создается автоматически)
4. **Folder**: `/ (root)`
5. **Save**

## Шаг 3: Запушьте изменения

```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

## ✅ Готово!

GitHub Actions автоматически:
- Создаст `.env.production` с вашими secrets
- Сгенерирует Service Worker
- Соберет приложение
- Задеплоит на GitHub Pages

Ваше приложение будет доступно по адресу:
**https://pmobile78.github.io/to-round-react**

## 📊 Мониторинг

- **Actions** - статус деплоя
- **Settings** → **Pages** - статус GitHub Pages

## 🔄 Обновления

Просто пущите в `main` - деплой произойдет автоматически!

---

📚 Подробная документация: [docs/GITHUB_PAGES_SETUP.md](docs/GITHUB_PAGES_SETUP.md)
