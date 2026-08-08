// Complex180 API — Apps Script en la cuenta de Gaby (fomiczfitness@gmail.com).
// Copia de referencia: el original vive en script.google.com, proyecto "Complex180 API".
// Si se cambia esto, hay que pegarlo en el editor y crear una implementación con "Nueva versión".
// Necesita el servicio avanzado "Drive API" (v3) habilitado para convertir Excel a Hoja de Google.

var ROOT_NAME = "Complex 180";

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  var out;
  try {
    if (action === "videos") out = getVideos();
    else if (action === "plan") out = getPlan(String((e.parameter.nivel || "OPEN")).toUpperCase());
    else out = { ok: false, error: "accion desconocida" };
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function rootFolder() {
  var it = DriveApp.getFoldersByName(ROOT_NAME);
  if (!it.hasNext()) throw new Error("No existe la carpeta " + ROOT_NAME);
  return it.next();
}

function subFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : null;
}

// ponytail: setSharing en cada request; si algún día hay muchos archivos y esto pesa,
// chequear getSharingAccess() antes o compartir la carpeta raíz una sola vez.
function linkShare(file) {
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) {}
}

function getVideos() {
  var carpeta = subFolder(rootFolder(), "Videos ejercicios");
  var videos = [];
  if (carpeta) {
    var grupos = carpeta.getFolders();
    while (grupos.hasNext()) {
      var g = grupos.next();
      var files = g.getFiles();
      while (files.hasNext()) {
        var f = files.next();
        linkShare(f);
        videos.push({
          id: f.getId(),
          nombre: f.getName().replace(/\.[^.]+$/, ""),
          url: f.getUrl(),
          tipo: f.getMimeType(),
          grupo: g.getName()
        });
      }
    }
  }
  return { ok: true, videos: videos };
}

function getPlan(nivel) {
  var vacio = { ok: true, nivel: nivel, mes: "", archivos: [], semanas: [] };
  var plan = subFolder(rootFolder(), "Planificaciones");
  var nivelFolder = plan ? subFolder(plan, nivel) : null;
  if (!nivelFolder) return vacio;

  // la carpeta del mes arranca con "AAAA-MM" (ej. "2026-08 Agosto")
  var prefijo = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM");
  var mesFolder = null;
  var carpetas = nivelFolder.getFolders();
  while (carpetas.hasNext()) {
    var c = carpetas.next();
    if (c.getName().indexOf(prefijo) === 0) { mesFolder = c; break; }
  }
  if (!mesFolder) return vacio;

  var archivos = [], manual = null, auto = null, xlsx = null;
  var files = mesFolder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var tipo = f.getMimeType();
    if (f.getName() === "Planificacion (auto)") { auto = f; continue; } // interna, no se lista
    linkShare(f);
    archivos.push({ id: f.getId(), nombre: f.getName(), url: f.getUrl(), tipo: tipo });
    if (tipo === MimeType.GOOGLE_SHEETS && !manual) manual = f;
    if (tipo === MimeType.MICROSOFT_EXCEL && !xlsx) xlsx = f;
  }

  // Excel subido por Gaby: se convierte una sola vez a "Planificacion (auto)" y se re-convierte si sube uno más nuevo
  if (!manual && xlsx && (!auto || xlsx.getLastUpdated() > auto.getLastUpdated())) {
    if (auto) auto.setTrashed(true);
    var creado = Drive.Files.copy(
      { name: "Planificacion (auto)", mimeType: MimeType.GOOGLE_SHEETS, parents: [mesFolder.getId()] },
      xlsx.getId()
    );
    auto = DriveApp.getFileById(creado.id);
  }

  var hoja = manual || auto;
  var semanas = [];
  if (hoja) {
    try { semanas = parsePlanificacion(hoja); } catch (err) { semanas = []; }
  }
  return { ok: true, nivel: nivel, mes: mesFolder.getName(), archivos: archivos, semanas: semanas };
}

// columnas fijas: Semana | Dia | Foco | Ejercicio | Series | Reps (fila 1 = encabezado)
function parsePlanificacion(file) {
  var values = SpreadsheetApp.open(file).getSheets()[0].getDataRange().getValues();
  var semanas = [], porSemana = {};
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var sem = parseInt(r[0], 10);
    var nombreEj = String(r[3] || "").trim();
    if (!sem || !nombreEj) continue;
    var diaRaw = String(r[1] || "").trim();
    var dia = /^\d+$/.test(diaRaw) ? "Día " + diaRaw : diaRaw;
    if (!porSemana[sem]) { porSemana[sem] = { semana: sem, dias: [], porDia: {} }; semanas.push(porSemana[sem]); }
    var s = porSemana[sem];
    if (!s.porDia[dia]) { s.porDia[dia] = { dia: dia, foco: String(r[2] || "").trim(), ejercicios: [] }; s.dias.push(s.porDia[dia]); }
    s.porDia[dia].ejercicios.push({ nombre: nombreEj, series: Number(r[4]) || 0, reps: Number(r[5]) || 0 });
  }
  semanas.forEach(function (s) { delete s.porDia; });
  return semanas;
}

// correr desde el editor para probar sin desplegar: Ver > Registro
function test() {
  Logger.log(JSON.stringify(getVideos()));
  Logger.log(JSON.stringify(getPlan("OPEN")));
}

// correr UNA VEZ desde el editor (seleccionar esta función y "Ejecutar") para crear
// la planilla de claves de alumnos en Drive > Complex 180 > Alumnos. No es pública
// (a diferencia de videos/planificación) porque tiene mails y claves — nadie la comparte.
// Si ya existe, no la duplica: devuelve el link de la que hay.
function crearHojaAlumnos() {
  var alumnosFolder = subFolder(rootFolder(), "Alumnos");
  if (!alumnosFolder) throw new Error('No existe la carpeta "Alumnos" dentro de Complex 180');

  var NOMBRE = "Alumnos - claves";
  var existentes = alumnosFolder.getFilesByName(NOMBRE);
  if (existentes.hasNext()) {
    var url = existentes.next().getUrl();
    Logger.log("Ya existía: " + url);
    return url;
  }

  var ss = SpreadsheetApp.create(NOMBRE);
  var file = DriveApp.getFileById(ss.getId());
  alumnosFolder.addFile(file);
  DriveApp.getRootFolder().removeFile(file); // saca la copia que Drive deja en "Mi unidad"

  var hoja = ss.getSheets()[0];
  hoja.setName("Alumnos");
  var encabezados = ["Nombre", "Email", "Clave", "Nivel", "Fecha de pago"];
  hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight("bold");
  hoja.setFrozenRows(1);
  hoja.autoResizeColumns(1, encabezados.length);

  Logger.log("Creada: " + ss.getUrl());
  return ss.getUrl();
}
