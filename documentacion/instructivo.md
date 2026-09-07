# Instructivo: Automatizar Publicación en Instagram — FaAAD UDP

Septiembre 2026  

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Fase 1: Meta Developer Setup🟡](#fase-1-meta-developer-setup)
4. [Fase 2: Crear App en Meta✅](#fase-2-crear-app-en-meta)
5. [Fase 3: Obtener Tokens](#fase-3-obtener-tokens)
6. [Fase 4: Implementar en Código🟡](#fase-4-implementar-en-código)
7. [Fase 5: Testing](#fase-5-testing)
8. [Troubleshooting](#troubleshooting)

---

## Introducción

Actualmente, el sistema **genera la publicación hasta el punto de aprobación en GitHub Pages**. El aprobador descarga la imagen y la sube manualmente a Instagram.

Con esta integración:
- Aprobador da click en "Publicar"
- Sistema **automaticamente** sube a `@diseno_udp`
- ✅ Done

**Tecnología:** Meta Instagram Graph API v18.0+ (requiere verificación de cuenta)

---

## Requisitos Previos

### Antes de empezar, necesitas:

1. **Cuenta personal de Facebook** (con teléfono verificado y 2FA activo) ✅
2. **Admin/Editor en la página Facebook** de `@diseno_udp` (o la cuenta que corresponda) ✅
3. **Acceso a Instagram business** (conectada a la página Facebook) ✅
4. **Apps Script** con permisos de UrlFetchApp ✅
5. **Paciencia** — Meta puede tardar horas/días en responder verificaciones

### Credenciales que usaremos:

```
Account ID (tuyo personal)  → Para verificar en Meta
Page ID (@diseno_udp)       → Para publicar
Instagram ID (bot)          → Business account linked a Page
Access Token                → Para autenticar requests
```

---

## Fase 1: Meta Developer Setup

### Paso 1.1: Crear/Acceder a Meta Developers ✅

**URL:** https://developers.facebook.com

1. Logueate con tu **cuenta personal de Facebook**
2. Haz click en tu perfil (arriba derecha) → **Mis apps**
3. Si es tu primera vez, verás "Crear una app"

### Paso 1.2: Habilitar 2FA en tu Cuenta Facebook ✅

**⚠️ CRÍTICO — Meta lo requiere:**

1. Ve a https://www.facebook.com/settings/security
2. **Autenticación de dos factores** → Habilitar
3. Elige método:
   - **Aplicación de autenticación** (recomendado: Google Authenticator, Authy)
   - SMS (menos seguro)
4. Completa el proceso y guarda los códigos de recuperación **en un lugar seguro**

### Paso 1.3: Verificar tu Identidad en Meta

1. Ve a https://www.facebook.com/id/hub/
2. Completa los pasos de verificación:
   - Subir documento de identidad (foto clara)
   - Verificar teléfono (SMS)
3. **Espera 24-48 horas** (Meta revisa manualmente)

**Status:** Checks en Meta Developers → Verifica que dice ✅ "Verificado"

--- 

## Fase 2: Crear App en Meta

### Paso 2.1: Crear la App ✅ 

1. En https://developers.facebook.com → Mis apps → **Crear una app**
2. Tipo de app: **Otro**
3. Nombre: `FaAAD Publicaciones` (o similar)
4. Propósito: `Desarrollo` (selecciona)
5. Haz click → **Crear app**

### Paso 2.2: Agregar Productos ✅ 

Una vez creada la app:

1. Dashboard de la app → **Agregar producto**
2. Busca: `Instagram`
3. Agrega: **Instagram Graph API**
4. Repite el proceso para:
   - **Facebook Login** (opcional, para flow más robusto)
   - **Webhooks** (para futuros eventos)

### Paso 2.3: Configurar Aplicación ✅ 

1. Settings → Basic
   - **App ID:** `XXXXXXXXXXXXXXX` (cópialo, lo necesitarás)
   - **App Secret:** `XXXXXXXXXXXXXXX` (guárdalo seguro, no lo copies por ahora)
2. Settings → Básico → App Roles
   - Agrega tu cuenta de correo como **Administrador**

---

## Fase 3: Obtener Tokens

### Paso 3.1: Obtener Page Access Token

[🔗Paso a paso Meta](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started)

**Esto es lo que se usará para publicar en Instagram.**

1. Ve a Instagram Graph API → Herramientas
2. En la sección **Obtener Page Access Token:**
   - Selecciona tu página Facebook (`@diseno_udp`)
   - Haz click en el botón 🔑
3. Verás una lista de permisos:
   - ✅ `pages_manage_metadata`
   - ✅ `pages_read_engagement`
   - ✅ `instagram_manage_messages` (opcional)
   - ✅ `instagram_manage_insights` (opcional)
   - ✅ `pages_manage_posts` (CRÍTICO)

4. Haz click → **Generar token**
5. **Cópialo inmediatamente** (solo aparece una vez):

```
EAAFpMKbYJasBO[...]Z79zC1d8fXxUa6t
```

**IMPORTANTE:** Este token expira en ~60 días. Guardar en un lugar seguro.

### Paso 3.2: Obtener Instagram Business Account ID

1. **Graph API Explorer:** https://developers.facebook.com/tools/explorer
2. Selecciona tu app en el dropdown (arriba)
3. En el campo de búsqueda, escribe:
   ```
   me/accounts
   ```
4. Haz click → **Enviar**
5. Verás:
   ```json
   {
     "data": [
       {
         "access_token": "EAAF...",
         "id": "XXXXXXXXXXXXXXXXX",
         "name": "Escuela de Diseño UDP"
       }
     ]
   }
   ```
   
   Ese `id` es tu **PAGE_ID**.

6. Ahora obtén el **INSTAGRAM_BUSINESS_ACCOUNT_ID**:
   ```
   [PAGE_ID]/instagram_business_account
   ```
   
   En el explorer:
   - Field: `[PAGE_ID]/instagram_business_account`
   - Haz click → **Enviar**
   
   Resultado:
   ```json
   {
     "instagram_business_account": {
       "id": "1234567890123456789"
     }
   }
   ```
   
   Ese es tu **INSTAGRAM_BUSINESS_ACCOUNT_ID**.

### Paso 3.3: Guardar Credenciales

En un archivo seguro (por ejemplo, en Google Drive privado), guarda:

```
PAGE_ID                      = xxxxxxxxxx
INSTAGRAM_BUSINESS_ACCOUNT_ID = xxxxxxxxxxxxxxx
PAGE_ACCESS_TOKEN            = EAAFpMKbYJasBO[...]Z79zC1d8fXxUa6t
```

**NUNCA** hagas push de estos valores a GitHub. Usa `CONFIG` en Apps Script.

---

## Fase 4: Implementar en Código

### Paso 4.1: Actualizar `FaAAD-publicaciones.gs` — CONFIG 🟡

En el `CONFIG` object agregar:

```javascript
var CONFIG = {
  // ... código existente ...
  
  // META/INSTAGRAM API
  META_PAGE_ID: 'xxxxxxxxxx',
  META_INSTAGRAM_BUSINESS_ACCOUNT_ID: 'xxxxxxxxxxxxxxxxx',
  META_PAGE_ACCESS_TOKEN: 'EAAFpMKbYJasBO[...]Z79zC1d8fXxUa6t',
  META_API_VERSION: 'v18.0'
};
```
Falta completar con los ID

**SEGURIDAD:** Estos tokens son secretos. Si alguna vez ves un token en un commit, **invalídalo inmediatamente** en Meta Developers.

### Paso 4.2: Crear Función `publicarEnInstagram()` ✅

Agrega esta nueva función al final de `FaAAD-publicaciones.gs`:

```javascript
/**
 * Publica una imagen en Instagram
 * @param {string} imagenUrlCloudinary - URL de la imagen en Cloudinary
 * @param {string} caption - Caption de la publicación
 * @return {Object} { exito: true/false, postId: string, mensaje: string }
 */
function publicarEnInstagram(imagenUrlCloudinary, caption) {
  try {
    if (!imagenUrlCloudinary || !caption) {
      return {
        exito: false,
        mensaje: 'Faltan datos: imagen o caption'
      };
    }

    if (!CONFIG.META_PAGE_ACCESS_TOKEN || 
        CONFIG.META_PAGE_ACCESS_TOKEN.indexOf('EAA') === -1 ||
        CONFIG.META_PAGE_ACCESS_TOKEN.length < 50) {
      Logger.log('META_PAGE_ACCESS_TOKEN no configurado o inválido');
      return {
        exito: false,
        mensaje: 'Token Meta no configurado'
      };
    }

    // 1. Crear un media object en Instagram
    var urlCrearMedia = 'https://graph.instagram.com/' + 
      CONFIG.META_API_VERSION + '/' +
      CONFIG.META_INSTAGRAM_BUSINESS_ACCOUNT_ID + '/media';

    var payloadMedia = {
      image_url: imagenUrlCloudinary,
      caption: caption,
      access_token: CONFIG.META_PAGE_ACCESS_TOKEN
    };

    var optionsMedia = {
      method: 'post',
      payload: JSON.stringify(payloadMedia),
      headers: {
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true,
      timeout: 30
    };

    Logger.log('Creando media en Instagram...');
    var respuestaMedia = UrlFetchApp.fetch(urlCrearMedia, optionsMedia);
    var codigoMedia = respuestaMedia.getResponseCode();
    var dataMedia = JSON.parse(respuestaMedia.getContentText());

    if (codigoMedia !== 200) {
      Logger.log('Error al crear media: ' + codigoMedia + ' — ' + JSON.stringify(dataMedia));
      return {
        exito: false,
        mensaje: 'Error Meta: ' + (dataMedia.error?.message || 'Error desconocido')
      };
    }

    var mediaId = dataMedia.id;
    Logger.log('Media creada con ID: ' + mediaId);

    // 2. Publicar el media
    var urlPublicar = 'https://graph.instagram.com/' + 
      CONFIG.META_API_VERSION + '/' +
      CONFIG.META_INSTAGRAM_BUSINESS_ACCOUNT_ID + '/media_publish';

    var payloadPublicar = {
      creation_id: mediaId,
      access_token: CONFIG.META_PAGE_ACCESS_TOKEN
    };

    var optionsPublicar = {
      method: 'post',
      payload: JSON.stringify(payloadPublicar),
      headers: {
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true,
      timeout: 30
    };

    Logger.log('Publicando media...');
    var respuestaPublicar = UrlFetchApp.fetch(urlPublicar, optionsPublicar);
    var codigoPublicar = respuestaPublicar.getResponseCode();
    var dataPublicar = JSON.parse(respuestaPublicar.getContentText());

    if (codigoPublicar !== 200) {
      Logger.log('Error al publicar: ' + codigoPublicar + ' — ' + JSON.stringify(dataPublicar));
      return {
        exito: false,
        mensaje: 'Error al publicar: ' + (dataPublicar.error?.message || 'Error desconocido')
      };
    }

    var postId = dataPublicar.id;
    Logger.log('Publicado en Instagram: ' + postId);

    return {
      exito: true,
      postId: postId,
      mensaje: 'Publicado en Instagram: https://instagram.com/p/' + postId
    };

  } catch (e) {
    Logger.log('ERROR publicarEnInstagram: ' + e.message + '\n' + e.stack);
    return {
      exito: false,
      mensaje: 'Error técnico: ' + e.message
    };
  }
}
```

### Paso 4.3: Crear Endpoint Web App ✅

Para que el aprobador (desde GitHub Pages) pueda llamar esta función, necesitas exponer `publicarEnInstagram()` como una **Web App**.

En Apps Script → Deploy → New deployment:

1. Tipo: **Web app**
2. Ejecutar como: **Tu cuenta**
3. Acceso: **Cualquiera**
4. Deploy

Esra es la URL de deployment:
```
https://script.google.com/a/macros/mail.udp.cl/s/AKfycbxC_q5RG42hjtL7jWudRkEMXEkfoKtaLxfbiAikiyyJYJK2Bodg8HUvu8C1X6go0m1_/exec
```
ID
```
AKfycbxC_q5RG42hjtL7jWudRkEMXEkfoKtaLxfbiAikiyyJYJK2Bodg8HUvu8C1X6go0m1_
```

### Paso 4.4: Actualizar `aprobador.html` ✅

En el archivo `aprobador.html` que está en GitHub Pages, necesitas:

1. Agregar botón "Publicar en Instagram" (si no existe)
2. Conectarlo a la función `publicarEnInstagram()`

**Busca la sección de botones** (cerca de `btn-exportar-final`):

```html
<!-- Agregar este botón si no existe -->
<button id="btn-publicar-instagram" class="btn-primary">
Publicar en Instagram
</button>
```

**CSS** (en el archivo `.css` correspondiente):

```css
#btn-publicar-instagram {
    background: var(--color-blanco);
    color: var(--color-negro);
    border: none;
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 12px 28px;
    cursor: pointer;
    transition: opacity 0.2s;
}

#btn-publicar-instagram:hover {
    opacity: 0.8;
}

#btn-publicar-instagram:disabled {
    opacity: 0.5;
    cursor: wait;
}

#btn-publicar-instagram.loading::after {
  content: ' ⏳';
}
```

### Paso 4.5: Agregar JavaScript para Publicar ✅

En el archivo `.js` de aprobador (o en un `<script>` en HTML):

```javascript
// URL del Web App de Apps Script
const URL_WEB_APP = 'https://script.google.com/a/macros/mail.udp.cl/s/AKfycbxC_q5RG42hjtL7jWudRkEMXEkfoKtaLxfbiAikiyyJYJK2Bodg8HUvu8C1X6go0m1_/exec';

/**
 * Obtiene la imagen seleccionada en su forma final
 * (con el color overlay aplicado)
 */
function obtenerImagenSeleccionada() {
    // La imagen seleccionada está en el preview final
    const nodo = document.querySelector('.preview-final-wrapper .cover-thumb');
    if (!nodo) return null;
    
    // Obtener la URL de fondo del div
    const fondoDiv = nodo.querySelector('.fondo');
    if (!fondoDiv) return null;
    
    const backgroundImage = window.getComputedStyle(fondoDiv).backgroundImage;
    // backgroundImage es algo como: url("https://...")
    const match = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    return match ? match[1] : null;
}

/**
 * Obtiene el caption del textarea (etapa 3)
 */
function obtenerCaption() {
    const textarea = document.getElementById('caption-textarea');
    return textarea ? textarea.value : '';
}

/**
 * Publica en Instagram
 */
async function publicarEnInstagram() {
    const btn = document.getElementById('btn-publicar-instagram');
    
    // Validar datos
    const imagenUrl = obtenerImagenSeleccionada();
    const caption = obtenerCaption();
    
    if (!imagenUrl) {
        alert('Selecciona una imagen antes de publicar');
        return;
    }
    
    if (!caption || !caption.trim()) {
        alert('Completa el caption antes de publicar');
        return;
    }
    
    // Deshabilitar botón y mostrar estado
    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = 'Publicando...';
    btn.classList.add('loading');
    
    try {
        // Payload a Apps Script
        const payload = {
            imagenUrl: imagenUrl,
            caption: caption
        };
        
        // Llamar Web App de Apps Script
        const response = await fetch(URL_WEB_APP, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.exito) {
            alert('¡Publicado en Instagram!\n\nID: ' + data.postId);
            btn.textContent = 'Publicado ✓';
            btn.style.backgroundColor = '#90EE90'; // Verde
            
            // Después de 3 segundos, volver a normal
            setTimeout(() => {
                btn.textContent = textoOriginal;
                btn.style.backgroundColor = '';
                btn.disabled = false;
                btn.classList.remove('loading');
            }, 3000);
        } else {
            alert('Error: ' + data.mensaje);
            btn.textContent = textoOriginal;
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    } catch (error) {
        btn.textContent = textoOriginal;
        btn.disabled = false;
        btn.classList.remove('loading');
        alert('Error de red: ' + error.message);
        console.error('Error publicando:', error);
    }
}

// Listener para botón publicar
const btnPublicar = document.getElementById('btn-publicar-instagram');
if (btnPublicar) {
    btnPublicar.addEventListener('click', publicarEnInstagram);
}
```

### Paso 4.6: Configurar Web App en Apps Script ✅

El Web App necesita manejar POST requests. En `FaAAD-publicaciones.gs`, actualiza la función `doGet()`:

```javascript
function doGet(e) {
  // ... código existente ...
}

/**
 * Maneja POST requests del frontend
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    
    if (!payload.imagenUrl || !payload.caption) {
      return ContentService.createTextOutput(JSON.stringify({
        exito: false,
        mensaje: 'Faltan datos'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Llamar función de publicación
    var resultado = publicarEnInstagram(payload.imagenUrl, payload.caption);
    
    return ContentService.createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    Logger.log('ERROR doPost: ' + e.message);
    return ContentService.createTextOutput(JSON.stringify({
      exito: false,
      mensaje: 'Error técnico: ' + e.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## Fase 5: Testing

### Test 1: Verificar Credenciales

En Apps Script, crea una función de test:

```javascript
function testMetaCredenciales() {
  var url = 'https://graph.instagram.com/me?access_token=' + CONFIG.META_PAGE_ACCESS_TOKEN;
  
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var codigo = response.getResponseCode();
  var data = JSON.parse(response.getContentText());
  
  Logger.log('Código: ' + codigo);
  Logger.log('Respuesta: ' + JSON.stringify(data, null, 2));
  
  if (codigo === 200) {
    Logger.log('Token válido');
  } else {
    Logger.log('Token inválido o expirado');
  }
}
```

Ejecuta desde Apps Script → Run → Ver logs.

### Test 2: Publicar Imagen de Test

```javascript
function testPublicarEnInstagram() {
  var imagenTest = 'https://images.unsplash.com/photo-1500595046891-59824a61eae0?w=1020&h=1350&fit=crop';
  var captionTest = 'Test de publicación automatizada\n\n#FaAAD #UDP #Diseño';
  
  var resultado = publicarEnInstagram(imagenTest, captionTest);
  Logger.log(JSON.stringify(resultado, null, 2));
}
```

Resultado esperado:
```json
{
  "exito": true,
  "postId": "17950123456789012",
  "mensaje": "Publicado en Instagram: https://instagram.com/p/17950123456789012"
}
```

**Revisa Instagram** → `@diseno_udp` debe tener la nueva publicación (puede estar en borrador).

### Test 3: Frontend

1. Abre el GitHub Pages del aprobador
2. Sube query params con imagen y caption
3. Haz click en "Publicar en Instagram"
4. Verifica que se publica

---

## Troubleshooting

### Problema: "Token inválido"

**Síntoma:** Error 400 al publicar, mensaje "Invalid access token"

**Solución:**
1. Verifica que el token en CONFIG es exacto (sin espacios)
2. El token expira cada 60 días — genera uno nuevo en Meta Developers
3. Verifica que la cuenta que generó el token tiene permisos de admin en la página

---

### Problema: "Media not found"

**Síntoma:** Error al publicar, "Media with ID X not found"

**Solución:**
1. Verifica que Instagram Business Account ID es correcto
2. Verifica que Page ID corresponde a la página correcta
3. Espera 30 segundos entre crear media y publicar (el código ya lo hace)

---

### Problema: "Image URL invalid"

**Síntoma:** Error 400, "Image URL could not be downloaded"

**Solución:**
1. Verifica que la imagen en Cloudinary existe y es accesible
2. Prueba abriendo la URL en el navegador
3. Verifica que no tiene restricciones de CORS

---

### Problema: "Permissions denied"

**Síntoma:** Error 403, "User does not have permission"

**Solución:**
1. Verifica que tu cuenta es Admin de la página Facebook
2. Verifica que Instagram está conectado a la página Facebook
3. Verifica que la app tiene permiso `pages_manage_posts`
4. Revisa que no hay restricciones de rango de edad en la cuenta Instagram

---

### Problema: Web App no responde

**Síntoma:** Frontend dice "Error de red"

**Solución:**
1. Verifica que el Web App está desplegado (Deploy → Deployments)
2. Verifica que la URL en el código HTML es exacta
3. Verifica que Apps Script no tiene errores de sintaxis
4. Abre la URL del Web App en el navegador — debe mostrar algo

---