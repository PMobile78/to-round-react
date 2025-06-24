import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en/translation.json';
import ukTranslation from './locales/uk/translation.json';

const resources = {
    en: {
        translation: enTranslation
    },
    uk: {
        translation: ukTranslation
    }
};

i18n
    // Detect user language
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18next
    .init({
        resources,
        fallbackLng: 'en', // Default language if detection fails
        debug: process.env.NODE_ENV === 'development',

        interpolation: {
            escapeValue: false // React already does escaping
        },

        // Language detection options
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng'
        }
    });

export default i18n; 