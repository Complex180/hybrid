(function () {
  "use strict";
  // ponytail: DIAS_BASE es el respaldo de muestra — se usa solo si Gaby todavía no subió
  // la planilla real "Planificacion" a la carpeta del mes/nivel en Drive.

  var API_URL = "https://script.google.com/macros/s/AKfycby9c2jdl19l7tZBwxHG8Dpw6fz_bT_Chhc_WEydQAW1tiFPYtulxbaAk-MmYtMWlexrTw/exec";

  var DIAS_BASE = {
    OPEN: [
      { dia: "Día 1", foco: "Fuerza tren superior", ejercicios: [
        { nombre: "Press banca", series: 4, reps: 8 }, { nombre: "Remo con barra", series: 4, reps: 8 },
        { nombre: "Press militar", series: 3, reps: 10 }, { nombre: "Plancha", series: 3, reps: 30 }
      ]},
      { dia: "Día 2", foco: "Resistencia", ejercicios: [
        { nombre: "Bike ritmo moderado", series: 1, reps: 20 }, { nombre: "Circuito funcional", series: 3, reps: 1 }
      ]},
      { dia: "Día 3", foco: "Fuerza tren inferior", ejercicios: [
        { nombre: "Sentadilla", series: 4, reps: 8 }, { nombre: "Prensa", series: 4, reps: 10 },
        { nombre: "Zancadas", series: 3, reps: 12 }, { nombre: "Core", series: 3, reps: 30 }
      ]},
      { dia: "Día 4", foco: "Híbrido", ejercicios: [
        { nombre: "Kettlebell swings", series: 4, reps: 15 }, { nombre: "Burpees", series: 4, reps: 12 }
      ]},
      { dia: "Día 5", foco: "Resistencia + movilidad", ejercicios: [
        { nombre: "Running ritmo suave", series: 1, reps: 25 }, { nombre: "Movilidad general", series: 1, reps: 10 }
      ]}
    ],
    PRO: [
      { dia: "Día 1", foco: "Fuerza tren superior", ejercicios: [
        { nombre: "Press banca", series: 5, reps: 6 }, { nombre: "Remo con barra", series: 5, reps: 6 },
        { nombre: "Press militar", series: 4, reps: 8 }, { nombre: "Plancha", series: 4, reps: 45 }
      ]},
      { dia: "Día 2", foco: "Resistencia", ejercicios: [
        { nombre: "Bike series de ritmo", series: 1, reps: 30 }, { nombre: "Circuito funcional", series: 5, reps: 1 }
      ]},
      { dia: "Día 3", foco: "Fuerza tren inferior", ejercicios: [
        { nombre: "Sentadilla", series: 5, reps: 6 }, { nombre: "Prensa pesada", series: 4, reps: 10 },
        { nombre: "Peso muerto rumano", series: 4, reps: 8 }, { nombre: "Core", series: 4, reps: 45 }
      ]},
      { dia: "Día 4", foco: "Híbrido", ejercicios: [
        { nombre: "Clean & press", series: 5, reps: 5 }, { nombre: "Burpees", series: 5, reps: 15 }, { nombre: "Sprint 20m", series: 6, reps: 1 }
      ]},
      { dia: "Día 5", foco: "Resistencia + movilidad", ejercicios: [
        { nombre: "Running cambios de ritmo", series: 1, reps: 35 }, { nombre: "Movilidad general", series: 1, reps: 10 }
      ]}
    ]
  };

  var EJERCICIOS = [
    { nombre: "Press banca", grupo: "Tren superior" }, { nombre: "Remo con barra", grupo: "Tren superior" },
    { nombre: "Press militar", grupo: "Tren superior" }, { nombre: "Sentadilla", grupo: "Tren inferior" },
    { nombre: "Prensa", grupo: "Tren inferior" }, { nombre: "Zancadas", grupo: "Tren inferior" },
    { nombre: "Peso muerto rumano", grupo: "Tren inferior" }, { nombre: "Plancha", grupo: "Core" },
    { nombre: "Kettlebell swings", grupo: "Híbrido" }, { nombre: "Burpees", grupo: "Híbrido" },
    { nombre: "Clean & press", grupo: "Híbrido" }, { nombre: "Sprint 20m", grupo: "Híbrido" },
    { nombre: "Bike ritmo moderado", grupo: "Resistencia" }, { nombre: "Running ritmo suave", grupo: "Resistencia" },
    { nombre: "Circuito funcional", grupo: "Resistencia" }, { nombre: "Movilidad general", grupo: "Movilidad" }
  ];

  var KEYS = {
    profile: "complex180_profile", nivel: "complex180_nivel", log: "complex180_log",
    vencimiento: "complex180_vencimiento", email: "complex180_email", clave: "complex180_clave"
  };
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.from((scope || document).querySelectorAll(sel)); };

  function getJSON(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }
  function setJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // saca el id de archivo de un link de Drive ("/d/<id>/" o "?id=<id>")
  function driveId(url) {
    var m = /\/d\/([-\w]{20,})/.exec(url || "") || /[?&]id=([-\w]{20,})/.exec(url || "");
    return m ? m[1] : null;
  }

  // semana 1-4 del mes según el día de hoy (día 1-7 = semana 1, 8-14 = semana 2, …)
  function semanaActual() {
    return Math.min(4, Math.ceil(new Date().getDate() / 7));
  }

  function showView(id) {
    ["view-clave", "view-form", "view-dashboard"].forEach(function (v) { $("#" + v).hidden = (v !== id); });
  }

  // el pago habilita los DOS planes (OPEN y PRO) por 1 mes — el vencimiento lo calcula
  // el Apps Script a partir de "Fecha de pago" y viaja en la respuesta del login
  function vigente() {
    var v = localStorage.getItem(KEYS.vencimiento);
    return !!v && new Date(v) > new Date();
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  // manda el perfil y/o "mis registros" al servidor para que viajen con el alumno
  // a cualquier dispositivo — usa el mail+clave guardados al loguearse.
  function guardarEnServidor(datos) {
    var email = localStorage.getItem(KEYS.email);
    var clave = localStorage.getItem(KEYS.clave);
    if (!email || !clave) return;
    var body = new URLSearchParams({ action: "guardarDatos", email: email, clave: clave });
    if (datos.perfil) body.set("perfil", JSON.stringify(datos.perfil));
    if (datos.registros) body.set("registros", JSON.stringify(datos.registros));
    fetch(API_URL, { method: "POST", body: body }).catch(function () { /* sin conexión: queda solo local por ahora */ });
  }
  var guardarRegistrosServidor = debounce(function (log) { guardarEnServidor({ registros: log }); }, 900);

  var TAMANIO_MAX_ARCHIVO = 8 * 1024 * 1024; // 8MB — límite razonable para foto/apto físico

  function leerArchivoBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(",")[1] || ""); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // sube "Foto de perfil" o "Apto físico" — el server lo guarda en Drive > INFO ALUMNOS
  // y en el perfil (perfil.fotoPerfilUrl / perfil.fotoAptoUrl) para que quede asociado
  // al alumno para siempre, en cualquier dispositivo. Devuelve el link, o null si falló.
  function subirArchivoAlumno(campo, file) {
    var email = localStorage.getItem(KEYS.email);
    var clave = localStorage.getItem(KEYS.clave);
    if (!email || !clave) return Promise.resolve(null);
    return leerArchivoBase64(file).then(function (base64) {
      var body = new URLSearchParams({
        action: "guardarArchivo", email: email, clave: clave, campo: campo,
        nombreOriginal: file.name, tipo: file.type, base64: base64
      });
      return fetch(API_URL, { method: "POST", body: body }).then(function (r) { return r.json(); });
    }).then(function (data) { return (data && data.ok) ? data.url : null; })
      .catch(function () { return null; });
  }

  // ---- Acceso alumnos (mail + clave) — se valida contra la planilla de alumnos en Drive ----
  function initClave() {
    var form = $("[data-clave-form]");
    if (!form) return;

    var passInput = $("[data-pass-input]", form);
    var passToggle = $("[data-pass-toggle]", form);
    if (passInput && passToggle) {
      passToggle.addEventListener("click", function () {
        var visible = passInput.type === "text";
        passInput.type = visible ? "password" : "text";
        passToggle.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.elements.email.value.trim();
      var clave = form.elements.clave.value.trim();
      var msg = $("[data-clave-msg]");
      var btn = form.querySelector("button[type=submit]");
      msg.textContent = "Verificando…";
      btn.disabled = true;
      fetch(API_URL + "?action=login&email=" + encodeURIComponent(email) + "&clave=" + encodeURIComponent(clave))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          btn.disabled = false;
          if (data.ok) {
            localStorage.setItem(KEYS.vencimiento, data.vencimiento);
            localStorage.setItem(KEYS.email, email);
            localStorage.setItem(KEYS.clave, clave);
            if (data.nivel === "OPEN" || data.nivel === "PRO") setJSON(KEYS.nivel, data.nivel);
            // el servidor manda el perfil/registros guardados la última vez (en cualquier dispositivo)
            if (data.perfil) setJSON(KEYS.profile, data.perfil);
            if (data.registros) setJSON(KEYS.log, data.registros);
            if (getJSON(KEYS.profile)) { renderDashboard(); showView("view-dashboard"); }
            else { showView("view-form"); }
          } else if (data.error === "vencido") {
            msg.textContent = "Tu acceso venció. Pagá de nuevo y Gaby te lo renueva.";
          } else {
            msg.textContent = "Mail o clave incorrectos. Fijate con Gaby.";
          }
        })
        .catch(function () {
          btn.disabled = false;
          msg.textContent = "No se pudo verificar. Probá de nuevo en un rato.";
        });
    });
  }

  // ---- Planificación real (planilla de Drive) con la de muestra como respaldo ----
  var planCache = {}; // { OPEN: [ {semana, dias:[...]} , ... ] , PRO: [...] }

  function mockSemanas(nivel) {
    return [1, 2, 3, 4].map(function (n) { return { semana: n, dias: DIAS_BASE[nivel] }; });
  }

  function semanasFor(nivel) {
    var real = planCache[nivel];
    return (real && real.length) ? real : mockSemanas(nivel);
  }

  function diasDeSemana(nivel, n) {
    var semanas = semanasFor(nivel);
    var match = semanas.filter(function (s) { return s.semana === n; })[0];
    return (match || semanas[0] || { dias: [] }).dias;
  }

  // ---- Paso 1: formulario ----
  function fillForm(profile) {
    var form = $("[data-profile-form]");
    Object.keys(profile || {}).forEach(function (k) {
      var field = form.elements[k];
      if (field && field.type !== "file") field.value = profile[k];
    });
    ["fotoPerfil", "fotoApto"].forEach(function (campo) {
      var status = $('[data-file-status="' + campo + '"]', form);
      var url = profile && profile[campo + "Url"];
      if (status) status.innerHTML = url ? 'Ya subiste este archivo — <a href="' + url + '" target="_blank" rel="noopener">ver</a>' : "";
    });
  }

  function initForm() {
    var form = $("[data-profile-form]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var profile = {};
      var archivos = [];
      fd.forEach(function (v, k) {
        if (v instanceof File) { if (v.size) archivos.push({ campo: k, file: v }); }
        else profile[k] = v;
      });
      // si no se vuelve a subir un archivo, mantiene el link que ya tenía guardado
      var previo = getJSON(KEYS.profile) || {};
      ["fotoPerfilUrl", "fotoAptoUrl"].forEach(function (k) { if (previo[k]) profile[k] = previo[k]; });

      var grande = archivos.filter(function (a) { return a.file.size > TAMANIO_MAX_ARCHIVO; })[0];
      if (grande) { alert('El archivo "' + grande.file.name + '" pesa más de 8MB, subí uno más liviano.'); return; }

      var btn = form.querySelector("[data-form-submit]");
      var textoOriginal = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = archivos.length ? "Subiendo…" : "Guardando…"; }

      Promise.all(archivos.map(function (a) {
        return subirArchivoAlumno(a.campo, a.file).then(function (url) { if (url) profile[a.campo + "Url"] = url; });
      })).then(function () {
        setJSON(KEYS.profile, profile);
        guardarEnServidor({ perfil: profile });
        if (btn) { btn.disabled = false; btn.textContent = textoOriginal; }
        renderDashboard();
        showView("view-dashboard");
      });
    });
  }

  // ---- Dashboard: toolbar ----
  function initDashToolbar() {
    $$("[data-dash-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$("[data-dash-tab]").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        $$("[data-dash-panel]").forEach(function (p) { p.hidden = (p.dataset.dashPanel !== btn.dataset.dashTab); });
      });
    });
    $("[data-toggle-monthly]").addEventListener("click", function (e) {
      var box = $("[data-monthly-view]");
      box.hidden = !box.hidden;
      e.target.textContent = box.hidden ? "Ver planificación mensual" : "Ocultar planificación mensual";
    });
    $("[data-edit-profile]").addEventListener("click", function () {
      fillForm(getJSON(KEYS.profile));
      var nivel = getJSON(KEYS.nivel);
      $("[data-registros-card]").hidden = !nivel;
      if (nivel) renderRegistros(nivel);
      showView("view-form");
    });
    $("[data-logout]").addEventListener("click", cerrarSesion);
  }

  // borra todo lo guardado en este dispositivo (perfil, registros, mail/clave) y
  // vuelve a la pantalla de clave — así otro alumno puede entrar en el mismo celular
  // sin ver los datos del anterior.
  function cerrarSesion() {
    Object.keys(KEYS).forEach(function (k) { localStorage.removeItem(KEYS[k]); });
    planCache = {};
    videosCache = EJERCICIOS;
    var claveForm = $("[data-clave-form]");
    if (claveForm) claveForm.reset();
    var msg = $("[data-clave-msg]");
    if (msg) msg.textContent = "";
    showView("view-clave");
  }

  // ---- helpers de render de un día (solo lectura) ----
  function diaCardReadOnly(semana, dia, log) {
    var items = dia.ejercicios.map(function (ej) {
      var saved = (log[semana + "|" + dia.dia + "|" + ej.nombre] || {});
      var peso = saved.peso ? " · " + saved.peso + "kg registrado" : "";
      var series = saved.series != null ? saved.series : ej.series;
      var reps = saved.reps != null ? saved.reps : ej.reps;
      return ej.nombre + " — " + series + "x" + reps + peso;
    }).join(" · ");
    return '<div class="log-day"><div class="log-day-head"><h3>' + dia.dia + '</h3><span>' + dia.foco + '</span></div>' +
      '<p class="log-readonly">' + items + '</p></div>';
  }

  function renderWeekly(nivel) {
    var log = getJSON(KEYS.log) || {};
    var n = semanaActual();
    $("[data-week-label]").textContent = "Semana " + n + " de 4";
    $("[data-week-dias]").innerHTML = diasDeSemana(nivel, n).map(function (d) { return diaCardReadOnly(n, d, log); }).join("");
  }

  function renderMonthly(nivel) {
    var log = getJSON(KEYS.log) || {};
    var host = $("[data-monthly-view]");
    host.innerHTML = semanasFor(nivel).map(function (s) {
      return '<div class="week-group"><p>Semana ' + s.semana + '</p>' +
        s.dias.map(function (d) { return diaCardReadOnly(s.semana, d, log); }).join("") + '</div>';
    }).join("");
  }

  // ---- "Mis registros" (editable, dentro de Perfil — semana actual) ----
  function renderRegistros(nivel) {
    var log = getJSON(KEYS.log) || {};
    var host = $("[data-registros-dias]");
    $("[data-registros-card]").hidden = false;
    var n = semanaActual();
    host.innerHTML = diasDeSemana(nivel, n).map(function (dia) {
      var rows = dia.ejercicios.map(function (ej) {
        var key = n + "|" + dia.dia + "|" + ej.nombre;
        var saved = log[key] || {};
        return '<tr>' +
          '<td>' + ej.nombre + '</td>' +
          '<td><input type="number" min="0" data-log-input data-key="' + key + '" data-field="series" value="' + (saved.series != null ? saved.series : ej.series) + '"></td>' +
          '<td><input type="number" min="0" data-log-input data-key="' + key + '" data-field="reps" value="' + (saved.reps != null ? saved.reps : ej.reps) + '"></td>' +
          '<td><input type="number" min="0" step="0.5" data-log-input data-key="' + key + '" data-field="peso" placeholder="kg" value="' + (saved.peso != null ? saved.peso : "") + '"></td>' +
          '</tr>';
      }).join("");
      return '<div class="log-day"><div class="log-day-head"><h3>' + dia.dia + '</h3><span>' + dia.foco + '</span></div>' +
        '<table class="log-table"><thead><tr><th>Ejercicio</th><th>Series</th><th>Reps</th><th>Peso</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }).join("");

    $$("[data-log-input]", host).forEach(function (input) {
      input.addEventListener("input", function () {
        var log = getJSON(KEYS.log) || {};
        var key = input.dataset.key;
        log[key] = log[key] || {};
        log[key][input.dataset.field] = input.value;
        setJSON(KEYS.log, log);
        guardarRegistrosServidor(log);
      });
    });
  }

  // ---- Videos (lee la carpeta "Videos ejercicios" del Drive vía Apps Script) ----
  var videosCache = EJERCICIOS; // arranca con la lista de muestra hasta que llegue la real

  function renderVideoList(filter) {
    var f = (filter || "").toLowerCase();
    var items = videosCache.filter(function (e) {
      return !f || e.nombre.toLowerCase().indexOf(f) > -1 || e.grupo.toLowerCase().indexOf(f) > -1;
    });
    var list = $("[data-video-list]");
    list.className = "video-grid";
    list.innerHTML = items.map(function (e) {
      var id = e.id || driveId(e.url);
      var thumb = id
        ? '<span class="video-thumb"><img src="https://drive.google.com/thumbnail?id=' + id + '&sz=w480" alt="" loading="lazy"><span class="video-play">▶</span></span>'
        : '<span class="video-thumb"><span class="video-play">▶</span></span>';
      var body = '<span class="video-card-body"><strong>' + e.nombre + '</strong><small>' + e.grupo + '</small></span>';
      return id
        ? '<button type="button" class="video-card" data-play-id="' + id + '" data-play-nombre="' + e.nombre + '">' + thumb + body + '</button>'
        : '<div class="video-card">' + thumb + body + '</div>';
    }).join("") || '<p style="color:var(--mute);">No encontramos ejercicios con ese nombre.</p>';
  }

  function openVideo(id, nombre) {
    $("[data-video-modal-title]").textContent = nombre;
    $("[data-video-frame]").src = "https://drive.google.com/file/d/" + id + "/preview";
    $("[data-video-modal]").classList.add("is-open");
  }

  function closeVideo() {
    $("[data-video-modal]").classList.remove("is-open");
    $("[data-video-frame]").src = "about:blank"; // corta la reproducción al cerrar
  }

  function initVideos() {
    renderVideoList("");
    $("[data-video-search]").addEventListener("input", function (e) { renderVideoList(e.target.value); });

    $("[data-video-list]").addEventListener("click", function (e) {
      var card = e.target.closest("[data-play-id]");
      if (card) openVideo(card.dataset.playId, card.dataset.playNombre);
    });
    var modal = $("[data-video-modal]");
    $("[data-close-video]").addEventListener("click", closeVideo);
    modal.addEventListener("mousedown", function (e) { if (e.target === modal) closeVideo(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeVideo(); });

    fetch(API_URL + "?action=videos").then(function (r) { return r.json(); }).then(function (data) {
      if (data.ok && data.videos.length) {
        videosCache = data.videos;
        renderVideoList($("[data-video-search]").value);
      }
    }).catch(function () { /* sin conexión: se queda con la lista de muestra */ });
  }

  // ---- Planificación real: archivo subido + planilla estructurada ----
  function renderPlanArchivo(nivel, archivos, mes) {
    var box = $("[data-plan-archivo]");
    if (!box) return;
    if (!archivos || !archivos.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = "Tu coach subió la planificación de " + (mes || "").split(" ")[1] + ": " +
      archivos.map(function (a) { return '<a href="' + a.url + '" target="_blank" rel="noopener">' + a.nombre + '</a>'; }).join(", ");
  }

  // si hay un PDF en la carpeta del mes, lo muestra embebido en la página
  function renderPlanPdf(archivos) {
    var wrap = $("[data-plan-pdf]");
    if (!wrap) return false;
    var pdf = (archivos || []).filter(function (a) {
      return a.tipo === "application/pdf" && (a.id || driveId(a.url));
    })[0];
    if (!pdf) { wrap.hidden = true; wrap.innerHTML = ""; return false; }
    var id = pdf.id || driveId(pdf.url);
    wrap.hidden = false;
    wrap.innerHTML = '<iframe src="https://drive.google.com/file/d/' + id + '/preview" title="Planificación del mes"></iframe>';
    return true;
  }

  function fetchPlan(nivel) {
    fetch(API_URL + "?action=plan&nivel=" + nivel).then(function (r) { return r.json(); }).then(function (data) {
      if (!data.ok) return;
      renderPlanArchivo(nivel, data.archivos, data.mes);
      var hayPdf = renderPlanPdf(data.archivos);
      if (data.semanas && data.semanas.length) {
        planCache[nivel] = data.semanas;
        if (getJSON(KEYS.nivel) === nivel) {
          renderWeekly(nivel);
          renderMonthly(nivel);
          if (!$("#view-form").hidden) renderRegistros(nivel);
        }
      } else if (hayPdf && getJSON(KEYS.nivel) === nivel) {
        // el PDF es la planificación real del mes: no mostramos las tarjetas de muestra
        $("[data-week-dias]").innerHTML = "";
        $("[data-week-label]").textContent = "Planificación de " + ((data.mes || "").split(" ")[1] || "este mes");
        var monthly = document.querySelector(".monthly-card");
        if (monthly) monthly.hidden = true;
      }
    }).catch(function () { var box = $("[data-plan-archivo]"); if (box) box.hidden = true; });
  }

  // ---- Dashboard: el pago habilita los dos planes, este toggle cambia cuál se ve ----
  function setNivelActivo(nivel) {
    setJSON(KEYS.nivel, nivel);
    $$("[data-toggle-nivel]").forEach(function (b) { b.classList.toggle("is-active", b.dataset.toggleNivel === nivel); });
    var profile = getJSON(KEYS.profile) || {};
    $("[data-plan-nombre]").textContent = (profile.nombre || "") + " " + (profile.apellido || "");
    $("[data-plan-meta]").textContent = "Nivel " + nivel + (profile.ciudad ? " · " + profile.ciudad : "");
    renderWeekly(nivel);
    renderMonthly(nivel);
    $("[data-monthly-view]").hidden = true;
    $("[data-toggle-monthly]").textContent = "Ver planificación mensual";
    fetchPlan(nivel);
  }

  function initNivelToggle() {
    $$("[data-toggle-nivel]").forEach(function (btn) {
      btn.addEventListener("click", function () { setNivelActivo(btn.dataset.toggleNivel); });
    });
  }

  function renderDashboard() {
    setNivelActivo(getJSON(KEYS.nivel) || "OPEN");
  }

  function boot() {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
    initClave();
    initForm();
    initDashToolbar();
    initNivelToggle();
    initVideos();

    var fab = $("[data-whatsapp-fab]");
    var brand = window.__BRAND__ || {};
    if (fab && brand.whatsapp) {
      fab.href = "https://wa.me/" + brand.whatsapp + "?text=" + encodeURIComponent(brand.whatsappText || "Hola");
    }

    if (!vigente()) { showView("view-clave"); return; }
    if (!getJSON(KEYS.profile)) { showView("view-form"); return; }
    renderDashboard();
    showView("view-dashboard");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
