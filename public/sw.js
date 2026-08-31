self.addEventListener('push', function (event) {
  var data = event.data ? event.data.json() : { title: 'Kapije Vračara', body: 'Novo obaveštenje', url: '/' };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, data: { url: data.url } }));
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
    for (var i = 0; i < windows.length; i++) { if ('focus' in windows[i]) { windows[i].navigate(url); return windows[i].focus(); } }
    return clients.openWindow(url);
  }));
});
