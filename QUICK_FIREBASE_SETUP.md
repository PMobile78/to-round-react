# 🔥 БЫСТРАЯ НАСТРОЙКА FIREBASE

## ⚠️ ВАЖНО: Текущее состояние

**Конфигурация Firebase НЕ ПОЛНАЯ!** Приложение пока НЕ сохраняет в Firebase.

Вам нужно выполнить следующие шаги:

## 📋 ШАГ 1: Создать Web App в Firebase Console

1. Идите в [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект: **`todo-flutter-fb8bf`**
3. В разделе "Project Overview" нажмите ⚙️ **"Project settings"**
4. Прокрутите вниз до раздела **"Your apps"**
5. Нажмите **"Add app"** → выберите **Web** (</> иконка)
6. Дайте название приложению: `Interactive Bubbles Web`
7. Скопируйте **Web App ID** из конфигурации

## 📋 ШАГ 2: Включить Firestore

1. В боковом меню выберите **"Firestore Database"**
2. Нажмите **"Create database"**
3. Выберите **"Start in test mode"**
4. Выберите регион (например, `europe-west1`)
5. Нажмите **"Done"**

## 📋 ШАГ 3: Обновить конфигурацию

Откройте файл `src/firebase.js` и замените строку:

```javascript
appId: "1:699564548059:web:ЗАМЕНИТЕ_НА_ВАШ_WEB_APP_ID"
```

На ваш реальный Web App ID, например:

```javascript
appId: "1:699564548059:web:abc123def456..."
```

## 🚀 ШАГ 4: Проверить работу

После настройки:

1. Запустите приложение: `npm start`
2. Откройте DevTools (F12) → вкладка **Console**
3. Создайте пузырь в приложении
4. В консоли должно появиться: **"Bubbles saved to Firestore successfully"**
5. Перезагрузите страницу - пузыри должны остаться

## 📊 Как проверить данные в Firebase

1. Идите в Firebase Console → **Firestore Database**
2. Вы должны увидеть коллекции:
   - **`bubbles`** - содержит ваши пузыри
   - **`tags`** - содержит теги
3. Каждый документ имеет ID сессии (например: `session_abc123`)

## 🔧 Структура данных в Firestore

### Коллекция `bubbles`:
```
Document ID: session_abc123
{
  sessionId: "session_abc123",
  updatedAt: "2024-01-15T10:30:00Z",
  bubbles: [
    {
      id: "bubble_xyz",
      x: 100,
      y: 200, 
      radius: 30,
      title: "Мой пузырь",
      description: "Описание",
      strokeStyle: "#3B7DED",
      tagId: "tag_123"
    }
  ]
}
```

### Коллекция `tags`:
```
Document ID: session_abc123  
{
  sessionId: "session_abc123",
  updatedAt: "2024-01-15T10:30:00Z",
  tags: [
    {
      id: "tag_123",
      name: "Работа", 
      color: "#FF6B6B"
    }
  ]
}
```

## ❗ Текущая работа приложения

**До настройки Firebase:**
- ✅ Приложение работает
- ✅ Данные сохраняются в `localStorage`
- ❌ НЕ сохраняется в Firebase

**После настройки Firebase:**
- ✅ Приложение работает
- ✅ Данные сохраняются в Firebase Firestore
- ✅ Есть fallback на `localStorage` при ошибках
- ✅ Автосохранение каждые 10 секунд

## 🆘 Если что-то не работает

1. **Проверьте консоль браузера** на наличие ошибок
2. **Убедитесь, что Firestore включен** в Firebase Console
3. **Проверьте Web App ID** в конфигурации
4. **Временно используйте `localStorage`** - приложение работает и без Firebase

## 📞 Поддержка

Если возникли проблемы:
1. Откройте DevTools → Console
2. Посмотрите какие ошибки появляются
3. Проверьте, что все шаги выполнены правильно 