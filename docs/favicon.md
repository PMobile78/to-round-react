# Иконки и web-манифест

В проекте используется современный минимальный набор иконок (вывод
[RealFaviconGenerator](https://realfavicongenerator.net/)). Файлы уже лежат в `public/`
и подключаются через корневой `index.html` и `site.webmanifest` (манифест не лежит в `public/`:
его генерирует плагин `app-name` в `vite.config.js`).

## Текущий набор (`public/`)

| Файл | Назначение |
|---|---|
| `favicon.ico` | Классический favicon |
| `favicon.svg` | Векторный favicon (масштабируемый) |
| `favicon-96x96.png` | Растровый favicon |
| `apple-touch-icon.png` | Иконка для iOS (180×180) |
| `web-app-manifest-192x192.png` | Иконка PWA |
| `web-app-manifest-512x512.png` | Иконка PWA (крупная / splash) |
| `bubbles.png` | Исходное брендовое изображение |

PWA-установка работает за счёт `site.webmanifest` и иконок `192/512`. Манифест (имя, цвета,
иконки) при сборке генерирует `appNamePlugin` в `vite.config.js`, а имя берёт из `APP_NAME` в
`src/appName.js`; пути иконок в нём относительные (`./…`) — так они работают под `base` проекта.

## Как обновить иконки

1. Подготовьте исходное изображение (бренд — пузырь 🫧, градиент `#667eea → #764ba2`).
2. Прогоните через [RealFaviconGenerator](https://realfavicongenerator.net/).
3. Положите полученные файлы в `public/`, сохранив имена выше. `site.webmanifest` из архива
   генератора **не копируйте**: манифест генерирует `vite.config.js`, а тест `src/appName.test.js`
   падает, если `public/site.webmanifest` существует.
4. Если имена/набор изменились — обновите ссылки в корневом `index.html` и список `icons` в
   `appNamePlugin` (`vite.config.js`).

> Для maskable-иконок оставляйте ~20% отступа от краёв (safe zone).
