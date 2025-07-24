self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    // Можно добавить переход по ссылке, если нужно
}); 