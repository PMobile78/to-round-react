// Отображаемое имя приложения — единственное место, где оно задаётся.
// UI импортирует APP_NAME, а vite.config.js при сборке подставляет его в index.html
// (плейсхолдеры %APP_NAME%) и генерирует из него site.webmanifest.
// Имя в письмах Firebase Auth берётся не отсюда, а из Firebase Console →
// Project settings → General → Public-facing name; его меняют там вручную.
export const APP_NAME = 'ToDo-Round';
