# Complex 180 — Guía de traspaso del proyecto

Este documento es para que Gaby pueda seguir trabajando esta web con su propio Claude, sin depender de Lucas. Explica qué es el proyecto, cómo está armado, dónde vive cada cosa y qué hay pendiente. Está escrito a fecha **15 de agosto de 2026**.

---

## 1. Qué es esto

La web de **Complex 180 — Hybrid Training**, el proyecto de coaching de fitness de Gaby. Tiene dos partes:

- **Landing pública** (`index.html`): presentación, planes, precios, botón de WhatsApp.
- **Zona de alumnos** (`perfil.html`): login con mail + clave, perfil personal, planificación de entrenamiento (semanal y mensual) y videos explicativos de ejercicios.

Es un sitio **estático** (HTML/CSS/JS puro, sin frameworks) que vive en GitHub Pages, con un **backend liviano en Google Apps Script** que lee y escribe directamente en el Google Drive de Gaby. No hay base de datos: todo el "backend" es una combinación de carpetas de Drive y Google Sheets.

---

## 2. Dónde vive todo

| Qué | Dónde |
|---|---|
| Sitio público | https://complex180.github.io/hybrid/ (landing) y `/perfil.html` (alumno) |
| Repositorio de código | GitHub, `Complex180/hybrid` (público) |
| Apps Script (backend) | Proyecto **"Complex180 API"**, en el Drive de Gaby (cuenta `fomiczfitness@gmail.com`) |
| URL del backend (fija, no cambia al redesplegar) | `https://script.google.com/macros/s/AKfycby9c2jdl19l7tZBwxHG8Dpw6fz_bT_Chhc_WEydQAW1tiFPYtulxbaAk-MmYtMWlexrTw/exec` |
| Datos reales (videos, planificaciones, alumnos) | Google Drive de Gaby, carpeta raíz **"Complex 180"** |

**Importante:** el backend corre en la cuenta de Google de Gaby, no en la de Lucas. Para entrar al editor de Apps Script hay que estar logueado en el navegador con `fomiczfitness@gmail.com`.

---

## 3. Estructura de carpetas en el Drive de Gaby

```
Complex 180/
├── Videos ejercicios/
│   ├── Tren superior/
│   ├── Tren inferior/
│   ├── Core/
│   ├── Híbrido/
│   ├── Resistencia/
│   └── Movilidad/
│       ├── Movilidad Tren Superior/
│       ├── Movilidad Tren Inferior/
│       └── Movilidad Zona Media/
├── Planificaciones/
│   ├── OPEN/
│   │   └── "Planificacion OPEN"  (1 Google Sheet, 1 hoja por mes: Enero..Diciembre)
│   ├── PRO/
│   │   └── "Planificacion PRO"   (mismo esquema que OPEN)
│   └── PERSONALIZADO/
│       └── "Planificacion Personalizada"  (1 Google Sheet, 1 hoja POR ALUMNO)
├── Alumnos/
│   └── "Alumnos - claves"  (Google Sheet con mail/clave/nivel/pagos de cada alumno)
└── INFO ALUMNOS/
    └── <Nombre alumno> — <email>/   (una carpeta por alumno, foto de perfil + apto físico)
```

Todo el backend busca estas carpetas **por nombre exacto**. Si alguien las renombra (a mano, o sin querer con alguna función de IA de Drive), el sitio entero deja de funcionar con el error "No existe la carpeta...". Ya pasó una vez (ver sección de incidentes conocidos más abajo) — si vuelve a pasar, lo primero es comparar los nombres de carpeta en Drive contra lo que espera el código.

---

## 4. Cómo funciona el acceso de alumnos

- Gaby **no** carga nada de esto — lo hace Lucas manualmente hoy. Si Gaby quiere hacerlo él mismo, es la misma planilla, cualquiera con acceso puede editarla.
- Cuando un alumno paga, se le carga una fila en **"Alumnos - claves"**: Nombre, Email, Clave (inventada), Nivel (`OPEN`, `PRO` o `PERSONALIZADO`) y Fecha de pago (hoy).
- Un pago habilita el acceso por **30 días** desde la fecha de pago. Pasado ese plazo, el login rechaza con "vencido" aunque el mail/clave sean correctos.
- **Para renovar a un alumno:** solo hay que actualizar la celda "Fecha de pago" a la fecha del nuevo pago. Todo lo demás (columna H, "Fecha de vencimiento", con semáforo de color amarillo/rojo) se recalcula solo.
- Cada nivel (OPEN, PRO, PERSONALIZADO) da acceso **solo a ese nivel** — no es como antes que un pago desbloqueaba OPEN y PRO juntos. Hay que cargar la columna "Nivel" siempre con el valor correcto.
- El perfil del alumno (datos personales, "Mis registros" de la semana, foto de perfil, apto físico) se guarda en la misma planilla, en columnas JSON — así el alumno puede entrar desde cualquier dispositivo con su mail y clave y ve lo mismo.

**Esto es solo fricción del lado del cliente, no autenticación real** (no hay tokens ni sesiones). Es una decisión consciente para mantener el sitio simple — coherente en todo el proyecto, no es un descuido.

---

## 5. Los 3 planes y cómo consiguen su contenido

### Plan Híbrido — Nivel Open / Nivel Pro
- Cada nivel tiene **un solo archivo de Google Sheets** (`Planificacion OPEN` / `Planificacion PRO`) con **una hoja por mes** (Enero a Diciembre).
- Cada hoja tiene las columnas: `Semana | Dia | Foco | Ejercicio | Series | Reps` (fila 1 = encabezado).
- El sitio automáticamente muestra la hoja del **mes actual** al alumno.
- Gaby también puede subir un Excel (.xlsx) con esas mismas 12 hojas en vez de editar el Google Sheet directo — el sistema lo convierte solo.

### Plan Personalizado (armado el 15 ago 2026, lo último que se hizo)
- Un solo archivo, **"Planificacion Personalizada"**, con **una hoja por alumno** en vez de por mes.
- **Cómo cargar un alumno nuevo:** duplicar la hoja **"Plantilla"** (clic derecho en la solapa de abajo → Duplicar) y renombrar la copia con el **nombre EXACTO** que está cargado en "Alumnos - claves" (columna Nombre). Completar esa hoja con las mismas columnas de siempre.
- El sistema busca automáticamente la hoja que coincide con el nombre del alumno logueado. Si no la encuentra, no rompe nada, simplemente no muestra plan.
- **Por privacidad:** a diferencia de OPEN/PRO, el link al archivo completo nunca se le manda al alumno (ese archivo tiene los planes de TODOS los personalizados juntos) — el alumno solo recibe su propia semana ya procesada.

### Videos
- Se leen recursivamente de "Videos ejercicios" (entra en subcarpetas a cualquier profundidad), se muestran con miniatura y se reproducen en un modal embebido sin salir del sitio.

---

## 6. El código, en dos partes

### Frontend (repo `Complex180/hybrid`)
- `index.html` / `main.js`: landing pública.
- `perfil.html` / `profile.js`: zona de alumno — login, formulario de datos, dashboard con planificación y videos.
- `styles.css`: todo el diseño (estilo "brutalista deportivo", blanco + azul marca).
- `manifest.json` / `sw.js`: hacen que el sitio se pueda "instalar" como app (PWA) con el logo de ícono.
- `apps-script/Codigo.gs`: **copia de referencia** del código del backend — hay que mantenerla sincronizada a mano con lo que está pegado en el editor de Apps Script (ver más abajo por qué).

### Backend (Apps Script, vive en Drive, no en GitHub)
El código real corre en `script.google.com`, en el proyecto "Complex180 API". Los endpoints (todo por `GET` a la URL fija de arriba, con parámetro `action`):
- `?action=videos` — devuelve la lista de videos.
- `?action=plan&nivel=OPEN|PRO` — devuelve la planificación del mes actual de ese nivel.
- `?action=plan&nivel=PERSONALIZADO&nombre=...` — devuelve la hoja de ese alumno.
- `?action=login&email=...&clave=...` — valida acceso y devuelve nivel, vencimiento, perfil y registros guardados.
- (por `POST`) `guardarDatos` / `guardarArchivo` — el alumno guarda su perfil, registros o archivos (foto de perfil, apto físico).

**Cómo desplegar un cambio en el backend (importante, es un poco delicado):**
1. Editar `apps-script/Codigo.gs` en el repo (con Git normal).
2. Pegar ese código en el editor de `script.google.com` (proyecto Complex180 API), reemplazando todo.
3. Guardar (Ctrl+S).
4. Probar la función que cambiaste corriéndola desde el mismo editor (botón Ejecutar), revisando el "Registro de ejecución".
5. Ir a **Implementar → Administrar las implementaciones → ícono de lápiz**, y en el desplegable "Versión" elegir **"Nueva versión"** (no cualquier otra) → Implementar.
6. **Verificar con una prueba real** (por ejemplo, abrir la URL del endpoint en el navegador o con curl) que el cambio nuevo esté vivo antes de dar por hecho que funcionó — alguna vez el botón "Implementar" dijo que todo salió bien pero en realidad había re-publicado la versión vieja sin el cambio.

La URL del backend **nunca cambia** entre despliegues, así que el frontend no necesita tocarse cuando se actualiza el backend.

---

## 7. Cosas a tener en cuenta (aprendidas a los golpes)

- **Nunca renombrar las carpetas de Drive** listadas en la sección 3 — el código las busca por nombre exacto. Una vez una función de "Preguntarle a Gemini" de Drive le agregó "CX" a todas las carpetas y tumbó el sitio entero; se arregló renombrándolas de vuelta.
- Cuando se agrega un servicio nuevo al Apps Script (por ejemplo, `SpreadsheetApp` si no se usaba antes), Google pide una reautorización manual con un popup que hay que clickear a mano (3 clics: Configuración avanzada → Ir a [app] → Continuar). No hay forma de automatizar ese paso.
- El sitio cachea `styles.css`, `main.js` y `profile.js` con un `?v=AAAAMMDDx` en el link — si se edita alguno de esos archivos y no se sube la letra/fecha de la versión, el navegador puede seguir sirviendo la versión vieja.
- El acceso de alumnos es fricción de cliente (localStorage), no autenticación real — es una decisión de diseño, no un descuido, pero hay que tenerlo presente si en algún momento se maneja información más sensible.

---

## 8. Estado actual (15 ago 2026)

**Ya está en producción y probado:**
- Landing con los 2 planes (Híbrido con Nivel Open/Pro, y Personalizado) y sus 4 botones/CTAs.
- Login con mail+clave, vencimiento automático a 30 días, semáforo de color en la planilla.
- Perfil + "Mis registros" + fotos, todo persistente entre dispositivos.
- Planificación de OPEN, PRO y ahora también Personalizado (recién armado).
- Videos con miniaturas y modal, organizados en subcarpetas.
- App instalable (PWA) con el logo como ícono.

**Pendiente / a criterio de Gaby:**
- Cargar contenido real en las hojas de Plan Personalizado para cada alumno de ese plan (duplicar "Plantilla" y completar).
- Subir videos reales a las categorías que todavía están vacías (Tren superior, Tren inferior, Resistencia, Híbrido, Core) — hoy el sitio muestra una lista de ejemplo hasta que haya al menos 1 video real en "Videos ejercicios".
- Confirmar en un celular real que aparece la opción "Instalar app" / "Agregar a pantalla de inicio".
- Cualquier otra idea nueva que Gaby quiera sumar — a partir de acá el desarrollo lo puede seguir él con su propio Claude.

---

## 9. Prompt para que Gaby le pase a su Claude

Gaby necesita clonar o abrir este repo (`Complex180/hybrid`) en una carpeta local, y tener Claude Code (o el asistente que use) trabajando sobre esa carpeta. Después, puede pegar esto como primer mensaje:

> Estoy retomando el desarrollo de mi web de coaching, Complex 180 (complex180.github.io/hybrid). Todo el contexto del proyecto — qué es, cómo está armado, dónde vive cada cosa (Drive, Apps Script, GitHub Pages), cómo funcionan los planes y el login de alumnos, y qué falta — está en el archivo `HANDOFF.md` en la raíz de este repo. Leelo completo antes de arrancar.
>
> El backend (Apps Script) vive en mi cuenta de Google (`fomiczfitness@gmail.com`), tengo que estar logueado con esa cuenta en el navegador para poder editarlo.
>
> Lo que quiero hacer ahora es: **[acá Gaby describe lo que necesita — por ejemplo: "cargar el plan personalizado de un alumno nuevo", "cambiar el diseño de la landing", "agregar una sección nueva", etc.]**

Con eso, su Claude va a tener el mismo nivel de contexto que tenía yo al terminar esta sesión.
