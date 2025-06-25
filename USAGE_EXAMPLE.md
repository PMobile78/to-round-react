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

### 2. Copying Files

Copy the following files to your project:
- `src/pages/BubblesPage.js`
- `src/components/LanguageSelector.js`
- `src/locales/` (entire folder)
- `src/i18n.js`

### 3. i18n Initialization

In the `src/index.js` file or main application file:

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize i18n
import './i18n';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

### 4. Using in App.js

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

### 5. Integration into Existing Application

If you already have an application with routing:

```javascript
import { Routes, Route } from 'react-router-dom';
import BubblesPage from './pages/BubblesPage';

function App() {
  return (
    <Routes>
      <Route path="/bubbles" element={<BubblesPage />} />
      {/* other routes */}
    </Routes>
  );
}
```

### 6. Theme Customization (optional)

```javascript
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3B7DED', // Main color for bubbles
    },
    secondary: {
      main: '#FF5757',
    },
  },
});
```

### 7. Adding Your Own Translations

Create a new translation file `src/locales/ru/translation.json`:

```json
{
  "bubbles": {
    "title": "Интерактивные Пузыри",
    "addBubble": "Добавить пузырь",
    "clearAll": "Очистить все",
    // ... other translations
  },
  "common": {
    "language": "Язык",
    "english": "English",
    "ukrainian": "Українська",
    "russian": "Русский"
  }
}
```

Update `src/i18n.js`:

```javascript
import ruTranslation from './locales/ru/translation.json';

const resources = {
  en: { translation: enTranslation },
  uk: { translation: ukTranslation },
  ru: { translation: ruTranslation } // add Russian
};
```

## Configuration for Specific Use Cases

### Embedding in Modal Window

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

### Using as Component in Page Section

```javascript
import { Box } from '@mui/material';
import BubblesPage from './pages/BubblesPage';

function Dashboard() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
      <Box>
        {/* Other content */}
      </Box>
      <Box sx={{ height: 600, border: '1px solid #ddd', borderRadius: 2 }}>
        <BubblesPage />
      </Box>
    </Box>
  );
}
```

### Passing Props for Customization

If you want to make the component more configurable, you can modify `BubblesPage.js`:

```javascript
const BubblesPage = ({ 
  initialBubbles = [], 
  theme = 'default',
  showLanguageSelector = true,
  readonly = false 
}) => {
  // ... component code
};
```

## Possible Issues and Solutions

### 1. Component Size Issues

If the component doesn't display correctly, make sure the parent container has a defined height:

```css
.bubbles-container {
  height: 100vh; /* or specific height */
  width: 100%;
}
```

### 2. Physics Not Working

Make sure Matter.js is installed correctly:

```bash
npm install matter-js
```

### 3. Translation Issues

Make sure all translation files are in the correct location and properly imported in `i18n.js`.

### 4. Mobile Responsiveness

The component automatically adapts to mobile devices, but you can override behavior:

```javascript
// In BubblesPage.js
const isMobile = window.innerWidth < 768; // custom breakpoint
```

## Performance Tips

### 1. Limiting Number of Bubbles

```javascript
const MAX_BUBBLES = 50; // add limitation

const addBubble = () => {
  if (bubbles.length >= MAX_BUBBLES) {
    alert('Maximum number of bubbles reached');
    return;
  }
  // ... add bubble logic
};
```

### 2. Optimization for Large Screens

```javascript
// Adjust physics for performance
engine.world.gravity.y = 0.3; // reduce gravity
render.options.showDebug = false; // disable debug mode
```

### 3. Memory Management

```javascript
// Clean up on component unmount
useEffect(() => {
  return () => {
    if (engineRef.current) {
      Engine.clear(engineRef.current);
    }
    if (renderRef.current) {
      Render.stop(renderRef.current);
    }
  };
}, []);
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

## Support

If there are issues with integration, check:
1. All dependencies are installed
2. i18n is initialized correctly
3. Material-UI theme is configured
4. Firebase is set up (if using Firestore)
5. No CSS conflicts 