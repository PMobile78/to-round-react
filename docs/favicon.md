# Иконки и web-манифест

В проекте используется современный минимальный набор иконок (вывод
[RealFaviconGenerator](https://realfavicongenerator.net/)). Файлы уже лежат в `public/`
и подключаются через `public/index.html` и `public/site.webmanifest`.

## Текущий набор (`public/`)

| Файл | Назначение |
|---|---|
| `favicon.ico` | Классический favicon |
| `favicon.svg` | Векторный favicon (масштабируемый) |
| `favicon-96x96.png` | Растровый favicon |
| `apple-touch-icon.png` | Иконка для iOS (180×180) |
| `web-app-manifest-192x192.png` | Иконка PWA |
| `web-app-manifest-512x512.png` | Иконка PWA (крупная / splash) |
| `site.webmanifest` | Web App Manifest (имя, цвета, иконки) |
| `bubbles.png` | Исходное брендовое изображение |

PWA-установка работает за счёт `site.webmanifest` и иконок `192/512`.

## Как обновить иконки

1. Подготовьте исходное изображение (бренд — пузырь 🫧, градиент `#667eea → #764ba2`).
2. Прогоните через [RealFaviconGenerator](https://realfavicongenerator.net/).
3. Положите полученные файлы в `public/`, сохранив имена выше.
4. Если имена/набор изменились — обновите ссылки в `public/index.html` и
   `public/site.webmanifest`.

> Для maskable-иконок оставляйте ~20% отступа от краёв (safe zone).
