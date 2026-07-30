self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      // Încercăm să parsăm JSON-ul primit de la backend
      const data = event.data.json();
      
      const title = data.title || 'Ticket Nou! 🔧';
      const options = {
        body: data.body || 'A apărut o actualizare în ToolShop Pro.',
        icon: '/favicon.ico', // Folosește favicon-ul din rădăcină identificat în imagine
        badge: '/favicon.ico',
        vibrate: [200, 100, 200], // Face telefonul să vibreze la primirea tichetului
        data: { 
          // Dacă nu trimiți url de pe server, va redirecționa pe pagina principală
          url: data.url || '/' 
        }
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error("Eroare parsare JSON push, trimitem text simplu ca fallback:", e);
      
      // Fallback obligatoriu: Dacă serverul a trimis text simplu în loc de JSON, 
      // afișăm textul direct ca să nu blocheze sistemul de operare mobil
      const textFallback = event.data.text();
      const options = {
        body: textFallback,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { url: '/' }
      };
      event.waitUntil(self.registration.showNotification('ToolShop Pro Alertă', options));
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // Închide bulina de notificare de pe ecran
  
  // URL-ul absolut către care trebuie să trimitem tehnicianul (ex: /repairs sau /dashboard)
  const targetUrl = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    // includeUncontrolled: true este CRUCIAL pentru funcționarea pe mobil!
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Verificăm dacă aplicația este deja deschisă undeva în browserul telefonului
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus(); // Dacă e deschisă exact pe pagina aia, îi dăm focus
        }
      }
      
      // Dacă este deschisă dar pe altă pagină, o putem naviga direct pe URL-ul ticketului
      if (clientList.length > 0 && 'navigate' in clientList[0]) {
        return clientList[0].navigate(targetUrl).then(client => client.focus());
      }
      
      // Dacă aplicația era închisă complet pe telefon, o deschidem acum
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
