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
    else if (action === "login") out = getAlumnoLogin(e.parameter.email, e.parameter.clave);
    else out = { ok: false, error: "accion desconocida" };
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// guardarDatos/guardarArchivo: los dos casos de escritura. e.parameter viaja igual que en
// doGet cuando el POST llega form-urlencoded (así lo manda profile.js con URLSearchParams).
function doPost(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  var out;
  try {
    if (action === "guardarDatos") out = guardarDatosAlumno(e.parameter.email, e.parameter.clave, e.parameter.perfil, e.parameter.registros);
    else if (action === "guardarArchivo") out = guardarArchivoAlumno(e.parameter.email, e.parameter.clave, e.parameter.campo, e.parameter.nombreOriginal, e.parameter.tipo, e.parameter.base64);
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

var MESES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Planificaciones/OPEN y /PRO tienen UN solo archivo "Planificacion OPEN|PRO" con
// una hoja (tab) por mes (Enero..Diciembre) — no más subcarpetas por mes. Gaby edita
// la hoja del mes que corresponda, o sube un Excel con esas mismas 12 hojas.
function getPlan(nivel) {
  var vacio = { ok: true, nivel: nivel, mes: "", archivos: [], semanas: [] };
  var plan = subFolder(rootFolder(), "Planificaciones");
  var nivelFolder = plan ? subFolder(plan, nivel) : null;
  if (!nivelFolder) return vacio;

  var hoy = new Date();
  var mesNombre = MESES_ES[hoy.getMonth()];
  var mesEtiqueta = Utilities.formatDate(hoy, Session.getScriptTimeZone(), "yyyy-MM") + " " + mesNombre;

  var archivos = [], manual = null, auto = null, xlsx = null;
  var files = nivelFolder.getFiles();
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
      { name: "Planificacion (auto)", mimeType: MimeType.GOOGLE_SHEETS, parents: [nivelFolder.getId()] },
      xlsx.getId()
    );
    auto = DriveApp.getFileById(creado.id);
  }

  var libro = manual || auto;
  var semanas = [];
  if (libro) {
    try {
      var hojaMes = SpreadsheetApp.open(libro).getSheetByName(mesNombre);
      if (hojaMes) semanas = parsePlanificacion(hojaMes);
    } catch (err) { semanas = []; }
  }
  return { ok: true, nivel: nivel, mes: mesEtiqueta, archivos: archivos, semanas: semanas };
}

// columnas fijas: Semana | Dia | Foco | Ejercicio | Series | Reps (fila 1 = encabezado)
function parsePlanificacion(hoja) {
  var values = hoja.getDataRange().getValues();
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

var UN_MES_MS = 30 * 24 * 60 * 60 * 1000; // 30 días ≈ 1 mes de validez — sin líos de meses de 28/30/31 días

// busca la fila del alumno en "Alumnos - claves"
// (columnas Nombre | Email | Clave | Nivel | Fecha de pago | Perfil (JSON) | Registros (JSON))
// por mail+clave — lo usan getAlumnoLogin, guardarDatosAlumno y guardarArchivoAlumno, antes
// era la misma búsqueda copiada 2 veces.
// Devuelve { ok:true, hoja, fila (1-based), r (valores de la fila) } o { ok:false, error }.
function buscarFilaAlumno(email, clave) {
  var alumnosFolder = subFolder(rootFolder(), "Alumnos");
  var archivos = alumnosFolder ? alumnosFolder.getFilesByName("Alumnos - claves") : null;
  if (!archivos || !archivos.hasNext()) return { ok: false, error: "no configurado" };

  var emailNorm = String(email || "").trim().toLowerCase();
  var claveNorm = String(clave || "").trim();
  if (!emailNorm || !claveNorm) return { ok: false, error: "faltan datos" };

  var hoja = SpreadsheetApp.open(archivos.next()).getSheets()[0];
  var values = hoja.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (String(r[1] || "").trim().toLowerCase() !== emailNorm) continue;
    if (String(r[2] || "").trim() !== claveNorm) return { ok: false, error: "clave incorrecta" };
    return { ok: true, hoja: hoja, fila: i + 1, r: r };
  }
  return { ok: false, error: "mail no encontrado" };
}

// Lucas carga una fila por alumno cuando paga; esta función es lo único que lee esa planilla.
// El pago habilita LOS DOS planes por 1 mes desde "Fecha de pago" — "Nivel" ya no
// restringe el acceso, solo decide qué plan se muestra primero en el dashboard.
// Cuando el alumno vuelve a pagar, Lucas solo actualiza "Fecha de pago" y el
// vencimiento se recalcula solo, sin tocar nada más. Devuelve también el perfil y
// "mis registros" guardados la última vez (en cualquier dispositivo) para que el
// alumno no tenga que completar todo de nuevo si entra desde otro celular.
function getAlumnoLogin(email, clave) {
  var res = buscarFilaAlumno(email, clave);
  if (!res.ok) return res;
  var r = res.r;

  var fechaPago = parseFecha(r[4]);
  if (!fechaPago) return { ok: false, error: "sin fecha de pago registrada" };
  var vencimiento = new Date(fechaPago.getTime() + UN_MES_MS);
  if (new Date() > vencimiento) return { ok: false, error: "vencido" };

  var nivel = String(r[3] || "").trim().toUpperCase();
  return {
    ok: true,
    nombre: String(r[0] || "").trim(),
    nivel: (nivel === "OPEN" || nivel === "PRO") ? nivel : "",
    vencimiento: vencimiento.toISOString(),
    perfil: parseJSONSeguro(r[5]),
    registros: parseJSONSeguro(r[6])
  };
}

// "Fecha de pago" puede llegar como Date (si Sheets la detectó como fecha) o como texto.
// Si es texto "dd/mm/aaaa" hay que parsearlo a mano: new Date(string) interpreta
// mm/dd/aaaa (formato EEUU), así que con día > 12 tira Invalid Date o, peor,
// calcula una fecha equivocada sin avisar (ej. "05/08/2026" leído como 8 de mayo).
function parseFecha(valor) {
  if (valor instanceof Date && !isNaN(valor)) return valor;
  if (!valor) return null;
  var s = String(valor).trim();
  var m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(s); // dd/mm/aaaa o dd-mm-aaaa
  if (m) {
    var d1 = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return isNaN(d1) ? null : d1;
  }
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s); // aaaa-mm-dd (ISO, sin ambigüedad)
  if (m) {
    var d2 = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d2) ? null : d2;
  }
  var d3 = new Date(s);
  return isNaN(d3) ? null : d3;
}

function parseJSONSeguro(valor) {
  if (!valor) return null;
  try { return JSON.parse(String(valor)); } catch (err) { return null; }
}

// guarda el perfil y/o "mis registros" del alumno en su fila de "Alumnos - claves"
// (columnas F y G) — así viajan con el mail del alumno a cualquier dispositivo.
// Solo escribe si mail+clave matchean (misma validación que el login).
function guardarDatosAlumno(email, clave, perfilJson, registrosJson) {
  var res = buscarFilaAlumno(email, clave);
  if (!res.ok) return res;
  if (perfilJson != null) res.hoja.getRange(res.fila, 6).setValue(perfilJson);
  if (registrosJson != null) res.hoja.getRange(res.fila, 7).setValue(registrosJson);
  return { ok: true };
}

var CAMPOS_ARCHIVO = { fotoPerfil: "Foto de perfil", fotoApto: "Apto fisico" };

// guarda un archivo (foto de perfil / apto físico) que sube el alumno: valida mail+clave
// igual que el login, y lo deja en Drive > Complex 180 > INFO ALUMNOS > <carpeta del
// alumno>, una carpeta por alumno para tener todo junto. Devuelve el link del archivo —
// profile.js lo guarda en el perfil (perfil.fotoPerfilUrl / perfil.fotoAptoUrl), así queda
// asociado al alumno para siempre y viaja a cualquier dispositivo con su mail+clave, igual
// que el resto del perfil. Si el alumno vuelve a subir el mismo campo, reemplaza el archivo
// anterior en vez de acumular versiones viejas.
function guardarArchivoAlumno(email, clave, campo, nombreOriginal, tipo, base64) {
  var res = buscarFilaAlumno(email, clave);
  if (!res.ok) return res;

  var etiqueta = CAMPOS_ARCHIVO[campo];
  if (!etiqueta) return { ok: false, error: "campo desconocido" };
  if (!base64) return { ok: false, error: "falta el archivo" };

  var nombreAlumno = String(res.r[0] || "").trim();
  var infoAlumnos = subFolder(rootFolder(), "INFO ALUMNOS") || rootFolder().createFolder("INFO ALUMNOS");
  var nombreCarpeta = (nombreAlumno ? nombreAlumno + " — " : "") + String(email).trim().toLowerCase();
  var carpeta = subFolder(infoAlumnos, nombreCarpeta) || infoAlumnos.createFolder(nombreCarpeta);

  // saca cualquier versión anterior de este mismo campo (puede tener otra extensión si
  // cambió de jpg a png entre subidas)
  var previos = carpeta.getFiles();
  while (previos.hasNext()) {
    var f = previos.next();
    if (f.getName().indexOf(etiqueta) === 0) f.setTrashed(true);
  }

  var ext = (String(nombreOriginal || "").match(/\.[^.]+$/) || [""])[0];
  var bytes = Utilities.base64Decode(String(base64));
  var blob = Utilities.newBlob(bytes, tipo || "application/octet-stream", etiqueta + ext);
  var file = carpeta.createFile(blob);
  linkShare(file);
  return { ok: true, url: file.getUrl() };
}

// correr desde el editor si hace falta (crea la planilla si no existe, o le agrega
// las columnas Perfil/Registros si ya existía de una versión anterior — idempotente,
// no pisa filas con datos). Drive > Complex 180 > Alumnos > "Alumnos - claves". No es
// pública (a diferencia de videos/planificación) porque tiene mails y claves.
function crearHojaAlumnos() {
  var alumnosFolder = subFolder(rootFolder(), "Alumnos");
  if (!alumnosFolder) throw new Error('No existe la carpeta "Alumnos" dentro de Complex 180');

  var NOMBRE = "Alumnos - claves";
  var encabezados = ["Nombre", "Email", "Clave", "Nivel", "Fecha de pago", "Perfil (JSON)", "Registros (JSON)"];
  var existentes = alumnosFolder.getFilesByName(NOMBRE);
  var ss;
  if (existentes.hasNext()) {
    ss = SpreadsheetApp.open(existentes.next());
  } else {
    ss = SpreadsheetApp.create(NOMBRE);
    var file = DriveApp.getFileById(ss.getId());
    alumnosFolder.addFile(file);
    DriveApp.getRootFolder().removeFile(file); // saca la copia que Drive deja en "Mi unidad"
    ss.getSheets()[0].setName("Alumnos");
  }

  var hoja = ss.getSheets()[0];
  var actuales = hoja.getRange(1, 1, 1, encabezados.length).getValues()[0];
  var faltaAlguno = encabezados.some(function (h, i) { return actuales[i] !== h; });
  if (faltaAlguno) {
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight("bold");
    hoja.setFrozenRows(1);
    hoja.autoResizeColumns(1, encabezados.length);
  }

  Logger.log(ss.getUrl());
  return ss.getUrl();
}

// correr desde el editor si hace falta rearmar la estructura (idempotente: no duplica
// nada si ya está armada). Deja en Planificaciones/OPEN y /PRO un solo archivo
// "Planificacion OPEN"/"Planificacion PRO" con una hoja por mes (Enero..Diciembre,
// encabezado Semana|Dia|Foco|Ejercicio|Series|Reps). Si encuentra carpetas viejas
// de meses (formato "AAAA-MM ..." con una Hoja "Planificacion" adentro), migra esos
// datos a la hoja del mes que corresponda y borra la carpeta vieja.
function reorganizarPlanificaciones() {
  var headers = ["Semana", "Dia", "Foco", "Ejercicio", "Series", "Reps"];
  ["OPEN", "PRO"].forEach(function (nivel) {
    var plan = subFolder(rootFolder(), "Planificaciones");
    var nivelFolder = plan ? subFolder(plan, nivel) : null;
    if (!nivelFolder) return;

    var nombreArchivo = "Planificacion " + nivel;
    var existentes = nivelFolder.getFilesByName(nombreArchivo);
    var ss;
    if (existentes.hasNext()) {
      ss = SpreadsheetApp.open(existentes.next());
    } else {
      ss = SpreadsheetApp.create(nombreArchivo);
      var file = DriveApp.getFileById(ss.getId());
      nivelFolder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }

    // la primera hoja que trae el archivo nuevo pasa a ser "Enero" en vez de quedar sin usar
    var hojaInicial = ss.getSheets()[0];
    if (MESES_ES.indexOf(hojaInicial.getName()) === -1) hojaInicial.setName(MESES_ES[0]);

    MESES_ES.forEach(function (mes) {
      var hoja = ss.getSheetByName(mes) || ss.insertSheet(mes);
      if (String(hoja.getRange(1, 1).getValue()) !== "Semana") {
        hoja.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
        hoja.setFrozenRows(1);
      }
    });

    // migrar las carpetas de mes viejas ("2026-08 Agosto", etc.) si quedaron de la versión anterior
    var carpetas = nivelFolder.getFolders();
    var aBorrar = [];
    while (carpetas.hasNext()) {
      var c = carpetas.next();
      var m = /^(\d{4})-(\d{2})/.exec(c.getName());
      if (!m) continue;
      var mesNombre = MESES_ES[parseInt(m[2], 10) - 1];
      if (!mesNombre) continue;

      var archivosViejos = c.getFiles();
      var origen = null;
      while (archivosViejos.hasNext()) {
        var f = archivosViejos.next();
        if (f.getMimeType() === MimeType.GOOGLE_SHEETS) { origen = f; break; }
      }
      if (origen) {
        var valores = SpreadsheetApp.open(origen).getSheets()[0].getDataRange().getValues();
        if (valores.length > 1) {
          var destino = ss.getSheetByName(mesNombre);
          destino.getRange(2, 1, valores.length - 1, valores[0].length).setValues(valores.slice(1));
        }
      }
      aBorrar.push(c);
    }
    aBorrar.forEach(function (c) { c.setTrashed(true); });
  });
  return "listo";
}
