// Único dato que realmente usa el sitio: main.js arma los links de WhatsApp
// (data-whatsapp) con whatsapp/whatsappText. Todo el resto del contenido
// (precio, niveles, pasos, FAQ) está escrito directamente en el HTML de
// cada página — para cambiarlo hay que editar ahí, no acá.
(function () {
  "use strict";
  window.__BRAND__ = {
    name: "Complex 180",
    tagline: "Entrenamiento híbrido — fuerza y resistencia",
    whatsapp: "5491132948395",
    whatsappText: "Hola Gaby, quiero info sobre Complex 180"
  };
})();
