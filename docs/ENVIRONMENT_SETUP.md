# Настройка переменных окружения

Этот документ описывает как настроить переменные окружения для приложения To-Round.

## Файлы конфигурации

### `.env` (разработка)
Основной файл конфигурации для локальной разработки.

### `.env.production` (продакшн)
Конфигурация для продакшн окружения.

### `.env.example` (шаблон)
Пример файла конфигурации для новых разработчиков.

## Переменные окружения

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

## Получение Firebase конфигурации

1. Перейдите в [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Перейдите в Project Settings (⚙️)
4. В разделе "Your apps" найдите веб-приложение или создайте новое
5. Скопируйте конфигурацию

## Получение VAPID ключа

1. В Firebase Console перейдите в Project Settings
2. Перейдите на вкладку "Cloud Messaging"
3. В разделе "Web configuration" найдите "Web Push certificates"
4. Скопируйте "Key pair" (VAPID key)

## Настройка для разработки

1. Скопируйте `.env.example` в `.env`
2. Заполните все необходимые переменные
3. Запустите приложение: `npm start`

## Настройка для продакшна

1. Создайте `.env.production` с продакшн значениями
2. При сборке: `npm run build` автоматически использует `.env.production`

## Безопасность

⚠️ **Важно:**
- Никогда не коммитьте `.env` файлы в git
- Все переменные с префиксом `REACT_APP_` будут доступны в браузере
- Для секретных данных используйте Firebase Functions

## Скрипты

- `npm start` - запуск с генерацией Service Worker
- `npm run build` - сборка с генерацией Service Worker
- `npm run generate-sw` - генерация Service Worker с переменными окружения

## Структура конфигурации

```javascript
// src/utils/config.js
export const config = {
    firebase: {
        // Все Firebase настройки
    },
    app: {
        // Настройки приложения
    }
};
```

## Валидация

При запуске приложения автоматически проверяется наличие всех необходимых переменных окружения. Если что-то отсутствует, приложение покажет ошибку в консоли.
