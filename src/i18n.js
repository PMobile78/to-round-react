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
        debug: import.meta.env.DEV,

        interpolation: {
            escapeValue: false // React already does escaping
        },

        // Before sign-in the device language; after it App applies the user's
        // settings.language (spec 3.5). Nothing is cached in localStorage.
        detection: {
            order: ['navigator'],
            caches: []
        }
    });

export default i18n; 