// Конфигурация приложения из переменных окружения
export const config = {
    // Firebase Configuration
    firebase: {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
        measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
    },

    // App Configuration
    app: {
        name: process.env.REACT_APP_NAME || 'To-Round',
        version: process.env.REACT_APP_VERSION || '1.0.0',
        environment: process.env.REACT_APP_ENVIRONMENT || 'development'
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
        console.error('Missing required Firebase configuration keys:', missingKeys);
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
