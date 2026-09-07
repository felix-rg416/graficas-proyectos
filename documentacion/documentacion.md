# Documentación — Sistema de Automatización de Publicaciones FaAAD UDP

Septiembre 2026  

---

## ¿Qué es esta herramienta?

Un sistema **end-to-end** que automatiza la publicación de proyectos y actividades en Instagram desde la Escuela de Diseño (FaAAD) de la Universidad Diego Portales.

**Flujo general:**
```
Formulario (entrada)
    ↓
Google Sheet (almacenamiento)
    ↓
Google Apps Script (procesamiento + Gemini + Cloudinary)
    ↓
GitHub Pages (interfaz de aprobación)
    ↓
Instagram (publicación) [en desarrollo]
```

---

## Arquitectura del Sistema

### 1. **ENTRADA: Formulario + Spreadsheets**

**Tres tipos de solicitudes:**
- **Extensión** (proyectos de extensión organizados por UDP)
- **Externa** (participación en instancias externas)
- **Investigación** (proyectos de investigación, creación e innovación)
- **VCM** (Registro de Actividades — Sistema de Vinculación con el Medio)
- **Publicación** (publicación de proyecto en redes)

**Sheets asociados:**
- `Respuestas de Formulario 1` — Spreadsheet general (ID: `1zuFTho0-2zNFo2zzrFC3w_5hehucmAgJzHeWb1y6uRU`)
- `Solicitudes-Extensión` — Extensión VCM duplicada
- `Registro-VcM` — Spreadsheet VCM (ID: `1mssLeTJuhg49QZPdkB7zQZO78p5AuA6J71hX302aciw`)
- `Proyectos` — Proyectos para publicación (ID: `1Y_pmmK7_d_mQAK3xOXO9k0ADidAzcqXbBcZnTqEmdks`)

### 2. **PROCESAMIENTO: Google Apps Script**

Dos scripts separados:

#### **A. `Código.gs` — Receptor del formulario**
- **Función principal:** `enviarProyecto(payload)`
- **Qué hace:**
  - Recibe datos del formulario HTML
  - Crea carpeta en Drive (`DRIVE_FOLDER_ID`, `DRIVE_FOLDER_ID_PUBLICACION`, `DRIVE_FOLDER_ID_VCM`)
  - Sube archivos/imágenes subidas por el usuario
  - Agrega una fila al spreadsheet correspondiente
  - Guarda URL de la carpeta en la columna de apoyo gráfico (si aplica)
  - Envía email de confirmación al responsable
  - Busca "Destinatarios" en el sheet y notifica coordinadores
- **Carpetas Drive usadas:**
  - `DRIVE_FOLDER_ID` = `1Qd9rSijCviNjZU6j7IeekKv-L56TWTm5` (general)
  - `DRIVE_FOLDER_ID_PUBLICACION` = `1_QqPOgXPq5u2xjR3NdJql7as17hcLyFj` (publicaciones)
  - `DRIVE_FOLDER_ID_VCM` = `1fuYLDH2Vhsix5i0fEAMFzLydDd6E-Y_b` (VCM)

#### **B. `FaAAD-publicaciones.gs` — Procesador de publicaciones**

- **Función principal:** `procesarPendientes()` (trigger cada 5 minutos)
- **Qué hace:**
  1. Lee el sheet `Proyectos`
  2. Busca filas con `ESTADO = "Pendiente revisión"`
  3. **Valida:** Solo procesa si `APOYO_GRAFICO = "Sí (mínimo 3 semanas de anticipación)"`
  4. Por cada fila pendiente:
     - Obtiene imágenes de carpeta Drive
     - **Usa Gemini para filtrar/rankear imágenes** (descarta malas, ordena las mejores)
     - Genera caption con **Gemini** (con system instruction FaAAD editorial)
     - Sube imágenes a **Cloudinary** (transformación: `w_1020,h_1350,c_fill,g_auto,f_png`)
     - Construye URL del aprobador con parámetros (tipo, título, participantes, imágenes, caption)
     - Envía email al aprobador con link
     - Marca fila como "Enviado para aprobar publicación"
  5. Maneja reintentos automáticos (429, 503 de Gemini)

---

## Estructura de Datos — Google Sheets

### Proyecto/Publicación (Hoja: "Proyectos")

**Estructura ACTUAL** (14 columnas):
```
1.  Fecha envío
2.  Nombre del proyecto
3.  Autor
4.  Email
5.  Tipo
6.  Colección
7.  Etiquetas
8.  Descripción
9.  Redes y enlaces
10. Palabras clave
11. Video YouTube
12. Carpeta Drive
13. N° imágenes
14. Estado
```

**Estados:**
- `Pendiente revisión` → `Enviado para aprobar publicación` → (aprobador decide)

---

### VCM (Hoja: "Registro-VcM") — NUEVO SCHEMA

**Estructura NUEVA** (17 columnas):
```
1.  ESTADO PLATAFORMA VCM
2.  Unidad FaAAD asociada
3.  Marca temporal
4.  Email
5.  Tipo iniciativa
6.  Organiza(n)
7.  Título de la actividad
8.  Ciclo/proyecto
9.  Descripción
10. Participan
11. Reseña participantes
12. Fecha y Hora
13. Lugar
14. Formato
15. Público objetivo
16. Cantidad asistentes
17. Solicitud apoyo gráfico
```

**Estados:**
- `Pendiente` → `Aprobado` (cuando se procesa)

**Apoyo gráfico:**
- ✅ `"Sí (mínimo 3 semanas de anticipación)"` → Sistema activo, crea carpeta y procesa
- ❌ `"No"` → Sistema ignora la fila

---

## Integraciones Externas

### Google Gemini API

**Uso 1: Filtrado y Ranking de imágenes** (`evaluarImagenesConGemini()`)
- Levanta hasta 30 imágenes de Drive
- Envía a Gemini para que evalúe calidad (basada en criterios FaAAD)
- Devuelve top 20 ordenadas por relevancia
- **Si falla:** Devuelve las 20 primeras sin filtrado
- **Clave API en:** `CONFIG.GEMINI_API_KEY`

**Uso 2: Generación de caption** (`generarCaptionConGemini()`)
- Recibe descripción + contexto (título, organizan, participan, fecha, lugar, etc.)
- Genera caption optimizado para Instagram
- **System Instruction:** Formato FaAAD (título mayúsculas, párrafos TikTok, CTA personalizado, hashtags)
- **Modelo:** `gemini-3.5-flash` (considerar cambio si no estpa disponible)
- **Tokens:** 2500 máximo
- **Si falla:** Devuelve caption vacío, aprobador rellena manualmente

**⚠️ Configuración importante:**
```javascript
GEMINI_API_KEY: 'xxxxxxxxxxxxxxxx...'
// Formato actual: AQ.Ab... (nuevo)
// Validación: length >= 20
```

### Cloudinary

**Función:** Almacenar y transformar imágenes para Instagram
- **Upload preset:** `faad_proyectos` (unsigned)
- **Transformación:** `w_1020,h_1350,c_fill,g_auto,f_png`
  - Ancho: 1020px
  - Alto: 1350px (ratio Instagram vertical)
  - Relleno automático + recorte inteligente
  - Formato: PNG
- **Dónde se usa:** En URL del aprobador (`construirUrlAprobador()`)

### Meta/Instagram API (EN PAUSA)

**Estado:** Setup iniciado pero pausado en Facebook Developer access
**Requerimientos pending:**
- Phone verification en cuenta personal Facebook ✅
- Two-factor authentication ✅
- Full Meta App Review (o permanecer en developer mode)
**Siguiente paso:** Completar setup cuando esté desbloqueado el acceso Facebook

---

## Frontend: GitHub Pages (Aprobador)

**URL:** `https://felix-rg416.github.io/graficas-proyectos/aprobador.html`

**Función:** Interfaz donde el aprobador:
1. Ve proyecto + imágenes
2. Selecciona portada (primera imagen del carousel)
3. Revisa/edita caption generado
4. Confirma para publicar en Instagram
5. Exporta slide como PNG (html-to-image)

**Cómo recibe datos:**
- Query params en URL (construidos por `construirUrlAprobador()`)
- `?tipo=...&titulo=...&participantes=...&img1=...&img2=...&caption=...`

**Problemas resueltos:**
- ✅ SVG rendering inestable → Switch a PNG logo
- ✅ Export button ID mismatch (`btn-exportar` vs `btn-exportar-final`) → Sincronizar IDs
- ✅ Folder names in Cloudinary cells → Fallback con `encontrarCarpeta(nombre)`

---

## Configuración — `CONFIG` Object

```javascript
var CONFIG = {
  SPREADSHEET_ID: '1Y_pmmK7_d_mQAK3xOXO9k0ADidAzcqXbBcZnTqEmdks',
  EMAIL_APROBADOR: 'felix.rodriguez@mail.udp.cl\ncomuncaciones.diseno@mail.udp.cl',
  APROBADOR_URL: 'https://felix-rg416.github.io/graficas-proyectos/aprobador.html',
  ESCUELA: 'Escuela de Diseño',
  HOJA_PROYECTOS: 'Proyectos',
  ESTADO_PENDIENTE: 'Pendiente revisión',
  ESTADO_ENVIADO: 'Enviado para aprobar publicación',
  CLOUDINARY_CLOUD_NAME: 'dm9tdsix6',
  CLOUDINARY_UPLOAD_PRESET: 'faad_proyectos',
  GEMINI_API_KEY: 'AQ.xxxxxxxxxxxxxxxx...'
};
```

**⚠️ CUIDADO:** Agregar propiedades sin comas finales causa errores silenciosos.

---

## Flujo Completo — Paso a Paso

### 1️. Envío de Proyecto

```
Usuario completa el Formulario HTML
           ↓
javascript: google.script.run.enviarProyecto(payload)
           ↓
Código.gs: enviarProyecto()
  ├─ Crea carpeta en Drive (fecha + título)
  ├─ Sube imágenes/archivos
  ├─ Crea fila en sheet "Proyectos"
  ├─ Si APOYO_GRAFICO = "Sí" → guarda folderUrl
  └─ Envía emails (confirmación + notificación coordinadores)
           ↓
Sheet actualizado, Estado = "Pendiente revisión"
```

### 2️. Procesamiento (Trigger automático, cada 5 min)

```
procesarPendientes() ejecuta
           ↓
Lee todas las filas con Estado = "Pendiente revisión"
           ↓
Para cada fila:
  ├─ obtenerImagenesDeCarpeta() → Levanta hasta 30 imgs de Drive
  ├─ evaluarImagenesConGemini() → Filtra + rankea
  ├─ generarCaptionConGemini() → Caption con Gemini
  ├─ subirACloudinary() → Transforma y sube cada imagen
  ├─ construirUrlAprobador() → Construye URL con params
  └─ enviarEmailAprobador() → Notifica al aprobador
           ↓
Estado actualizado → "Enviado para aprobar publicación"
```

### 3️. Aprobación (Manual en GitHub Pages)

```
Aprobador abre link en email
           ↓
aprobador.html carga con query params
           ↓
Aprobador:
  ├─ Ve proyecto + carousel de imágenes
  ├─ Elige portada (click en imagen)
  ├─ Revisa caption
  ├─ Click "Exportar" → html-to-image → PNG descargado
  └─ Click "Publicar" → (próxima fase: Meta API)
```

### 4️. Publicación en Instagram (PENDIENTE)

```
Aprobador confirma publicación
           ↓
Llamada a Meta/Instagram Graph API
           ↓
Imagen sube a @diseno_udp
```

---

## Estados Posibles de una Fila

| Estado | Significado | Acción siguiente |
|--------|------------|------------------|
| `Pendiente revisión` | Recién enviada, esperando procesamiento | Sistema activa en próximo trigger |
| `Enviado para aprobar publicación` | Ya procesada, email enviado | Aprobador revisa en GitHub Pages |
| `Error: [mensaje]` | Falló en procesamiento (Gemini, Cloudinary, etc.) | Revisar logs, resetear con `resetearEstadoFila()` |

---

## Funciones Útiles para Mantenimiento

### Resetear una fila para reprocesar
```javascript
resetearEstadoFila(numFila); // 1-indexed, sin contar header
```

### Instalar trigger automático
```javascript
crearTrigger();
// Crea onChange() trigger que ejecuta alCambiarHoja()
// Borra triggers anteriores para evitar duplicados
```

### Crear trigger manual (si Apps Script lo permite)
```
Apps Script → Triggers → + (crear nuevo)
Seleccionar: alCambiarHoja
Evento: On change
Guardar
```

---

## Problemas Conocidos y Soluciones

| Problema | Síntoma | Solución |
|----------|---------|----------|
| `CONFIG` sin comas finales | Script no corre, error silencioso | Revisar todas las propiedades, agregar comas |
| Gemini API key inválida | Caption vacío, logs dicen "GEMINI_API_KEY no configurada" | Verificar formato (`AQ.Ab...`), length >= 20 |
| SVG logo no renderiza en export | PNG descargado sin logo | Usar PNG en lugar de SVG |
| Export button no funciona | Click no hace nada | Sincronizar ID en HTML (`btn-exportar-final`) con JS |
| Carpeta Drive no encontrada | `obtenerImagenesDeCarpeta` devuelve [] | Fallback busca por nombre, verificar que carpeta existe |
| Cloudinary sube lento | Timeout en UrlFetch | Aumentar timeout en `UrlFetchApp.fetch()` options |

---

## Notas para Futuras Modificaciones

### Cambio de Columnas en Sheet
1. Actualizar `COL = {}` object (líneas 54-58 en FaAAD-publicaciones.gs)
2. Actualizar `procesarFila()` para extraer nuevos campos
3. Actualizar `generarCaptionConGemini()` si hay nuevos datos para el prompt
4. **Importante:** Mapeo de índices es 0-based en JS, pero columnas en Sheets son 1-based → Usar `fila[COL.ALGO - 1]`

### Cambio de Aprobadores
1. Actualizar `CONFIG.EMAIL_APROBADOR` (línea 14)
  - Se debe agregar `\n` al final del correo para evitar errores.
  - Ejemplo:```  EMAIL_APROBADOR: 'felix.rodriguez@mail.udp.cl\n' + 'comunicaciones.diseno@mail.udp.cl',```
  - Recordar la coma `,` al final de la línea.
2. Correr `crearTrigger()` para reinstalar si es necesario

### Cambio de Gemini Prompt
1. Editar `SYSTEM_INSTRUCTION_CAPTION` (líneas 25-51)
2. Considerar impacto en longitud de caption (máx 500 chars body)

### Cambio de Imágenes a Otro Servicio (no Cloudinary)
1. Reemplazar `subirACloudinary()` función
2. Actualizar transformación si el nuevo servicio la aplica diferente
3. Verificar que URLs devueltos funcionen en HTML img tags

### Activar Meta/Instagram API
1. Completar Facebook Developer access (phone verification, 2FA)
2. Decidir: Full App Review vs permanecer en developer mode
3. Crear función `publicarEnInstagram()` que llame Graph API
4. Conectar con aprobador.html (botón "Publicar")

---

## Referencias y URLs

| Recurso | URL/ID |
|---------|--------|
| Spreadsheet Proyectos | `1Y_pmmK7_d_mQAK3xOXO9k0ADidAzcqXbBcZnTqEmdks` |
| Spreadsheet VCM | `1mssLeTJuhg49QZPdkB7zQZO78p5AuA6J71hX302aciw` |
| Folder Drive Publicación | `1_QqPOgXPq5u2xjR3NdJql7as17hcLyFj` |
| Aprobador Frontend | `https://felix-rg416.github.io/graficas-proyectos/aprobador.html` |
| Gemini API | `generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent` |
| Cloudinary Upload | `api.cloudinary.com/v1_1/dm9tdsix6/image/upload` |

---

## Checklist — Antes de Tocar Código

- [ ] Hago backup del Apps Script actual
- [ ] Entiendo cuál `CONFIG` estoy editando (proyectos, VCM, etc.)
- [ ] Reviso si el cambio afecta otros scripts o el frontend
- [ ] Pruebo con una fila de test antes de hacer cambios en producción
- [ ] Verifico que las comas finales están correctas en objetos
- [ ] Actualizo esta documentación si cambio arquitectura

---