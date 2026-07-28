import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    {
        files: ['src/**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                process: 'readonly',
                localStorage: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                Notification: 'readonly',
                FileReader: 'readonly',
                URLSearchParams: 'readonly',
                CustomEvent: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                DOMParser: 'readonly',
                ResizeObserver: 'readonly',
                prompt: 'readonly',
                crypto: 'readonly',
                console: 'readonly',
            },
        },
        plugins: { 'react-hooks': reactHooks },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': 'off',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'off',
        },
    },
    {
        files: ['functions/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'readonly',
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': 'off',
        },
    },
];
