# Interactive Bubbles Usage Example

## Quick Integration into React Project

### Installing Dependencies

```bash
npm install @emotion/react @emotion/styled @mui/material @mui/icons-material matter-js react-i18next i18next i18next-browser-languagedetector firebase
```

### Basic Usage

```javascript
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import BubblesPage from './pages/BubblesPage';
import './i18n'; // Initialize translations

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BubblesPage />
    </ThemeProvider>
  );
}

export default App;
```

### 2. Копирование файлов

Скопируйте следующие файлы в ваш проект:
- `src/pages/BubblesPage.js`
- `src/components/LanguageSelector.js`
- `src/locales/` (папка целиком)
- `src/i18n.js`

### 3. Инициализация i18n

В файле `src/index.js` или главном файле приложения:

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Инициализация i18n
import './i18n';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

### 4. Использование в App.js

```javascript
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import BubblesPage from './pages/BubblesPage';

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BubblesPage />
    </ThemeProvider>
  );
}

export default App;
```

### 5. Интеграция в существующее приложение

Если у вас уже есть приложение с роутингом:

```javascript
import { Routes, Route } from 'react-router-dom';
import BubblesPage from './pages/BubblesPage';

function App() {
  return (
    <Routes>
      <Route path="/bubbles" element={<BubblesPage />} />
      {/* другие роуты */}
    </Routes>
  );
}
```

### 6. Кастомизация темы (опционально)

```javascript
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3B7DED', // Основной цвет для пузырей
    },
    secondary: {
      main: '#FF5757',
    },
  },
});
```

### 7. Добавление своих переводов

Создайте новый файл перевода `src/locales/ru/translation.json`:

```json
{
  "bubbles": {
    "title": "Интерактивные Пузыри",
    "addBubble": "Добавить пузырь",
    "clearAll": "Очистить все",
    // ... остальные переводы
  },
  "common": {
    "language": "Язык",
    "english": "English",
    "ukrainian": "Українська",
    "russian": "Русский"
  }
}
```

Обновите `src/i18n.js`:

```javascript
import ruTranslation from './locales/ru/translation.json';

const resources = {
  en: { translation: enTranslation },
  uk: { translation: ukTranslation },
  ru: { translation: ruTranslation } // добавить русский
};
```

## Настройка для конкретных случаев использования

### Встраивание в модальное окно

```javascript
import { Dialog, DialogContent } from '@mui/material';
import BubblesPage from './pages/BubblesPage';

function BubblesModal({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogContent sx={{ p: 0, height: '80vh' }}>
        <BubblesPage />
      </DialogContent>
    </Dialog>
  );
}
```

### Использование как компонента в разделе страницы

```javascript
import { Box } from '@mui/material';
import BubblesPage from './pages/BubblesPage';

function Dashboard() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
      <Box>
        {/* Другой контент */}
      </Box>
      <Box sx={{ height: 600, border: '1px solid #ddd', borderRadius: 2 }}>
        <BubblesPage />
      </Box>
    </Box>
  );
}
```

### Передача пропсов для кастомизации

Если хотите сделать компонент более конфигурируемым, можете модифицировать `BubblesPage.js`:

```javascript
const BubblesPage = ({ 
  initialBubbles = [], 
  theme = 'default',
  showLanguageSelector = true,
  readonly = false 
}) => {
  // ... код компонента
};
```

## Возможные проблемы и решения

### 1. Конфликт стилей
```javascript
// Используйте CSS-in-JS или изолируйте стили
import { styled } from '@mui/material/styles';

const BubblesContainer = styled(Box)({
  '& canvas': {
    borderRadius: 8,
  }
});
```

### 2. Производительность на слабых устройствах
```javascript
// В BubblesPage.js добавьте проверку производительности
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
const maxBubbles = isMobile ? 20 : 50;
```

### 3. Сохранение данных в базу данных вместо localStorage
```javascript
// Замените функции сохранения в BubblesPage.js
const saveBubblesToStorage = async (bubblesData) => {
  await fetch('/api/bubbles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bubblesData)
  });
};
```

## Firebase Setup

### Required Files to Copy

When integrating, make sure to copy these Firebase-related files:
- `src/firebase.js` - Firebase configuration
- `src/services/firestoreService.js` - Data storage functions

### Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Add a Web App to your Firebase project
4. Copy the configuration and update `src/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### Data Storage

- Data is automatically saved to Firestore every 10 seconds
- If Firestore is unavailable, it falls back to localStorage
- Each browser session gets a unique ID for data separation
- No authentication required for basic usage

## Поддержка

Если возникают проблемы при интеграции, проверьте:
1. Все ли зависимости установлены
2. Правильно ли инициализирован i18n
3. Подключена ли тема Material-UI
4. Настроен ли Firebase (если используете Firestore)
5. Нет ли конфликтов с CSS 