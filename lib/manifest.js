(function () {
  "use strict";
  window.__BRAND__ = {
    name: "Complex 180",
    tagline: "Entrenamiento híbrido — fuerza y resistencia",
    whatsapp: "5491132948395",
    whatsappText: "Hola Gaby, quiero info sobre Complex 180",
    // clave que Gaby le pasa a cada alumno para poder completar su perfil — cambiarla acá cuando haga falta
    claveAlumnos: "COMPLEX180",
    price: "30.000",
    stats: [
      { value: 5, suffix: "", label: "días de entreno / semana" },
      { value: 2, suffix: "", label: "niveles: OPEN y PRO" },
      { value: 100, suffix: "%", label: "planificado y con seguimiento" }
    ],
    niveles: [
      {
        id: "open",
        nombre: "OPEN",
        para: "Para arrancar fuerte o volver con orden.",
        detalle: "Ideal si estás iniciando el entrenamiento híbrido o venís de una pausa. Mismos 5 días, mismo método, cargas y progresión pensadas para construir base.",
        items: [
          "Planificación mensual, 5 días por semana",
          "Perfil personal con registro de datos y avances",
          "Videos explicativos de cada ejercicio",
          "Ajustes de nivel cuando estés listo"
        ]
      },
      {
        id: "pro",
        nombre: "PRO",
        para: "Para quien ya entrena y quiere más.",
        detalle: "Misma estructura de 5 días, mayor exigencia: más volumen, más intensidad, progresiones avanzadas de fuerza y resistencia combinadas.",
        items: [
          "Planificación mensual, 5 días por semana",
          "Perfil personal con registro de datos y avances",
          "Videos explicativos de cada ejercicio",
          "Cargas y series de nivel avanzado"
        ]
      }
    ],
    pasos: [
      { n: "01", t: "Elegís tu nivel", d: "OPEN si arrancás o volvés, PRO si ya entrenás y buscás más exigencia." },
      { n: "02", t: "Recibís tu plan del mes", d: "5 días de entrenamiento híbrido: fuerza y resistencia combinadas, listos en tu perfil." },
      { n: "03", t: "Registrás tus avances", d: "Tus datos, tus marcas, tu progreso — todo en un solo lugar, mes a mes." },
      { n: "04", t: "Entrenás con guía en video", d: "Cada ejercicio con su video explicativo, para ejecutar bien desde el primer día." }
    ],
    faqs: [
      { q: "¿Necesito equipamiento especial?", a: "El plan está pensado para gimnasio. Si entrenás en casa, contanos qué tenés disponible y lo adaptamos." },
      { q: "¿Es para principiantes?", a: "Sí. El nivel OPEN está pensado justo para eso: construir base con orden. El nivel PRO es para quien ya entrena." },
      { q: "¿Cómo recibo el plan cada mes?", a: "Entrás a tu perfil con tu clave personal y ahí está la planificación del mes, lista." },
      { q: "¿Puedo cambiar de nivel más adelante?", a: "Sí, cuando estés listo para pasar de OPEN a PRO (o al revés) lo vemos juntos." }
    ]
  };
})();
