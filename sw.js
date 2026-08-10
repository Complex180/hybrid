// Service worker mínimo: no cachea nada, solo existe para que el navegador
// ofrezca "Instalar app" / "Agregar a pantalla de inicio" (Chrome exige un
// fetch handler registrado para considerar el sitio instalable).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
