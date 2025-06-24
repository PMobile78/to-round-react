# Internationalization (i18n) Setup for Application

## What Was Installed

The following dependencies were installed to support internationalization:

```bash
npm install react-i18next i18next i18next-browser-languagedetector --legacy-peer-deps
```

## File Structure

### 1. Translation Files

Translation folders and files were created:
- `src/locales/en/translation.json` - English translations
- `src/locales/uk/translation.json` - Ukrainian translations

### 2. i18n Configuration

- `src/i18n.js` - i18next configuration file

### 3. Language Selector Component

- `src/components/LanguageSelector.js` - component for switching languages

## Supported Languages

Currently supported:
- 🇺🇸 **English** (`en`)
- 🇺🇦 **Українська** (`uk`)

## How to Add a New Language

1. Create a new folder in `src/locales/` with the language code (e.g., `de` for German)
2. Create a `translation.json` file in this folder
3. Copy the structure from an existing translation file
4. Translate all strings to the new language
5. Add the new language to `src/i18n.js` in the `resources` object
6. Add the new language to the `languages` array in `src/components/LanguageSelector.js`

Example of adding German language:

### In `src/i18n.js`:
```javascript
import deTranslation from './locales/de/translation.json';

const resources = {
  en: { translation: enTranslation },
  uk: { translation: ukTranslation },
  de: { translation: deTranslation } // add this line
};
```

### In `src/components/LanguageSelector.js`:
```javascript
const languages = [
    {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flag: '🇺🇸'
    },
    {
        code: 'uk',
        name: 'Ukrainian',
        nativeName: 'Українська',
        flag: '🇺🇦'
    },
    {
        code: 'de', // add new language
        name: 'German',
        nativeName: 'Deutsch',
        flag: '🇩🇪'
    }
];
```

## How to Use Translations in Components

1. Import the `useTranslation` hook:
```javascript
import { useTranslation } from 'react-i18next';
```

2. Use the hook in the component:
```javascript
const { t } = useTranslation();
```

3. Use the `t()` function to get translations:
```javascript
<Typography>{t('bubbles.title')}</Typography>
```

## Translation Keys Structure

All translations are organized by categories:

- `bubbles.*` - translations for the bubbles page
- `common.*` - common translations (language, buttons, etc.)

## Automatic Language Detection

The system automatically detects the user's language in the following order:
1. Saved language in localStorage
2. Browser language
3. HTML tag language
4. English (default)

The selected language is saved in localStorage and will be restored on the next visit.

## LanguageSelector Component

The `LanguageSelector` component provides a beautiful menu for switching languages:
- Responsive design for mobile and desktop devices
- Display of country flags
- Display of language name in native language
- Indication of currently selected language
- Semi-transparent background with blur effect

## What Was Updated

In the `src/pages/BubblesPage.js` file, all strings were replaced with translation function calls:
- Headings
- Button names
- Tooltips
- Form field labels
- Dialog texts
- User instructions

The `LanguageSelector` component was added to the top right corner for desktop and mobile devices. 