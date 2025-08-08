self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    // Можно добавить переход по ссылке, если нужно
});

// Простой fetch-обработчик (pass-through), чтобы удовлетворить критерии PWA
self.addEventListener('fetch', function () {
    // Ничего не кэшируем, просто даём браузеру обрабатывать запросы
});