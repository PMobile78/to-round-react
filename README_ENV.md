# Настройка переменных окружения для To-Round

## 🚀 Быстрый старт

1. **Скопируйте файл конфигурации:**
   ```bash
   cp .env.example .env
   ```

2. **Заполните переменные в `.env`:**
   - Получите Firebase конфигурацию из [Firebase Console](https://console.firebase.google.com/)
   - Добавьте все необходимые ключи

3. **Запустите приложение:**
   ```bash
   npm start
   ```

## 📁 Файлы конфигурации

| Файл | Назначение |
|------|------------|
| `.env` | Локальная разработка |
| `.env.production` | Продакшн сборка |
| `.env.example` | Шаблон для новых разработчиков |

## 🔧 Переменные окружения

### Firebase Configuration
```bash
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
REACT_APP_FIREBASE_VAPID_KEY=your_vapid_key
```

### App Configuration
```bash
REACT_APP_NAME=To-Round
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=development
```

## 🔐 Получение Firebase конфигурации

### 1. Firebase Console
1. Перейдите в [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Нажмите ⚙️ (Project Settings)
4. В разделе "Your apps" найдите веб-приложение
5. Скопируйте конфигурацию

### 2. VAPID Key для уведомлений
1. В Project Settings перейдите на вкладку "Cloud Messaging"
2. В разделе "Web configuration" найдите "Web Push certificates"
3. Скопируйте "Key pair"

## 🛠️ Скрипты

```bash
# Запуск с генерацией Service Worker
npm start

# Сборка с генерацией Service Worker
npm run build

# Только генерация Service Worker
npm run generate-sw
```

## 🏗️ Архитектура

### Конфигурация
```javascript
// src/utils/config.js
export const config = {
    firebase: { /* Firebase настройки */ },
    app: { /* Настройки приложения */ }
};
```

### Валидация
При запуске автоматически проверяется наличие всех необходимых переменных.

### Service Worker
Автоматически генерируется с переменными окружения при каждом запуске/сборке.

## 🔒 Безопасность

- ✅ `.env` файлы в `.gitignore`
- ✅ Только переменные с префиксом `REACT_APP_` доступны в браузере
- ⚠️ Для секретных данных используйте Firebase Functions

## 📚 Документация

Подробная документация: [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md)

## 🐛 Устранение неполадок

### Ошибка "Invalid Firebase configuration"
Проверьте, что все переменные в `.env` заполнены корректно.

### Service Worker не работает
Убедитесь, что скрипт `generate-sw` выполнился успешно.

### Уведомления не приходят
Проверьте VAPID ключ в переменной `REACT_APP_FIREBASE_VAPID_KEY`.
