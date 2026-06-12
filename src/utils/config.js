import packageJson from '../../package.json';
import logger from './logger';

// Конфигурация приложения из переменных окружения
export const config = {
    // Firebase Configuration
    firebase: {
        apiKey: import.meta.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: import.meta.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.REACT_APP_FIREBASE_APP_ID,
        measurementId: import.meta.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
        vapidKey: import.meta.env.REACT_APP_FIREBASE_VAPID_KEY
    },

    // App Configuration
    app: {
        name: import.meta.env.REACT_APP_NAME || 'To-Round',
        version: import.meta.env.REACT_APP_VERSION || packageJson.version || '0.0.2',
        environment: import.meta.env.REACT_APP_ENVIRONMENT || 'development'
    }
};

// Валидация конфигурации
export const validateConfig = () => {
    const requiredFirebaseKeys = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId'
    ];

    const missingKeys = requiredFirebaseKeys.filter(key => !config.firebase[key]);

    if (missingKeys.length > 0) {
        logger.error('Missing required Firebase configuration keys:', missingKeys);
        return false;
    }

    return true;
};

// Получение конфигурации для определенного окружения
export const getConfigForEnvironment = (env) => {
    const envConfig = {
        development: {
            ...config,
            debug: true
        },
        production: {
            ...config,
            debug: false
        }
    };

    return envConfig[env] || envConfig.development;
};

export default config;
