// ════════════════════════════════════════════════════════════════════════════
//  FaAAD UDP — Notificación al Aprobador
//
//  Script SEPARADO del que sirve el formulario. Mira la hoja "Proyectos"
//  buscando filas con Estado = "Pendiente revisión", construye URL del
//  aprobador con datos + imágenes desde la carpeta de Drive, manda email,
//  y actualiza el Estado para no procesar dos veces.
// ════════════════════════════════════════════════════════════════════════════

// ─── CONFIGURACIÓN ─────────────────────────────────────────────────────────

var CONFIG = {
  SPREADSHEET_ID: '1Y_pmmK7_d_mQAK3xOXO9k0ADidAzcqXbBcZnTqEmdks',
  EMAIL_APROBADOR: 'felix.rodriguez@mail.udp.cl\n' + 'comunicaciones.diseno@mail.udp.cl', // <-- CAMBIAR
  APROBADOR_URL: 'https://felix-rg416.github.io/graficas-proyectos/aprobador.html',
  ESCUELA: 'Escuela de Diseño',
  HOJA_PROYECTOS: 'Proyectos',
  ESTADO_PENDIENTE: 'Pendiente revisión',
  ESTADO_ENVIADO: 'Enviado para aprobar publicación',
  CLOUDINARY_CLOUD_NAME: 'dm9tdsix6',
  CLOUDINARY_UPLOAD_PRESET: 'faad_proyectos',
  GEMINI_API_KEY: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
};

var SYSTEM_INSTRUCTION_CAPTION = `Actúa como un estratega de contenido senior para la Escuela de Diseño de la Universidad Diego Portales (UDP) y como un EXPERTO EN GRAMÁTICA Y ORTOGRAFÍA ESPAÑOLA.

TU MISIÓN ES CRÍTICA:
1. Sintetizar material visual o descripciones en propuestas de contenido de alto impacto.
2. REVISAR LA ORTOGRAFÍA DOS VECES: Realiza una corrección de estilo exhaustiva antes de finalizar.

REGLAS DE PRESERVACIÓN Y OBJETIVIDAD:
- NO ELIMINES NOMBRES PROPIOS: Mantén intactos nombres de profesores, estudiantes, talleres, cursos, menciones, convenios e instituciones. Intégalos fluidamente.
- FIDELIDAD TÉCNICA: Describe el proyecto de forma objetiva, sin omitir detalles relevantes del input, especialmente cuando se entrega texto descriptivo.
- INVESTIGACIÓN DE HASHTAGS: Utiliza exclusivamente los 3-5 hashtags más usados y con mayor tráfico actual para diseño en cada plataforma específica (ej. #DesignInspiration, #SocialDesign, #ChileanDesign).

REGLAS DE ESTILO Y FORMATEO (ESQUEMA SINTÁCTICO):
- PROHIBIDO el uso de negritas (**), cursivas (*) o Markdown.
- TÍTULOS: Siempre en MAYÚSCULAS COMPLETAS. Sigue el formato: "TÍTULO PRINCIPAL · SUBTÍTULO O TEMA".
- PÁRRAFOS: Estilo "TikTok": breves, dinámicos, de máximo 2-3 líneas cada uno.
- CTA ESTRICTO DE COMPARTIR: El CTA tiene prohibido decir "Síguenos en @disenoudp". DEBE ser obligatoriamente una invitación a compartir, usando la fórmula de contexto: "¿Conoces a alguien a quien le interese [TEMA DEL QUE TRATA LA PUBLICACIÓN]? Comparte esta publicación con esa persona." Personaliza esa frase de acuerdo al contenido exacto del que estés hablando.
- LARGO DEL CUERPO: Cuenta SOLO los párrafos descriptivos y el CTA. El título de arriba y los hashtags del final NO cuentan. Ese cuerpo no debe superar los 500 caracteres. Sé conciso y potente..

ESTRUCTURA DE SALIDA (EJEMPLO):
TITULO DEL PROYECTO · TEMA O CURSO
[Párrafo objetivo 1 sobre el contexto/institución]
[Párrafo objetivo 2 sobre el encargo/decisiones técnicas]
[CTA personalizado para invitar a compartir según el contexto]
#Hashtag1 #Hashtag2 #Hashtag3

ESTILO UDP:
Enfatiza diseño situado y contexto latinoamericano. Cada palabra debe estar justificada tras tu doble revisión gramatical.`;

// Columnas (1-indexed) en hoja "Proyectos"
var COL = {
  FECHA: 1, NOMBRE: 2, AUTOR: 3, EMAIL: 4, TIPO: 5,
  COLECCION: 6, ETIQUETAS: 7, DESCRIPCION: 8, REDES: 9,
  PALABRAS: 10, VIDEO_YT: 11, CARPETA_DRIVE: 12, N_IMG: 13, ESTADO: 14
};

// ─── TRIGGER PRINCIPAL ─────────────────────────────────────────────────────

function alCambiarHoja(e) {
  procesarPendientes();
}

function procesarPendientes() {

  if (CONFIG.EMAIL_APROBADOR === 'TU_EMAIL@example.com') { // no cambiar
    Logger.log('ERROR: configurar EMAIL_APROBADOR en CONFIG antes de ejecutar');
    return;
  }

  // Lock para evitar que múltiples triggers concurrentes procesen la misma fila
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    Logger.log('No se pudo obtener lock, otro proceso está corriendo. Saliendo.');
    return;
  }

  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var hoja = ss.getSheetByName(CONFIG.HOJA_PROYECTOS);
    var datos = hoja.getDataRange().getValues();

    for (var i = 1; i < datos.length; i++) {  // Empezar en 1 para saltar header
      var fila = datos[i];
      var estado = fila[COL.ESTADO - 1];

      if (estado === CONFIG.ESTADO_PENDIENTE) {
        try {
          procesarFila(fila);
          hoja.getRange(i + 1, COL.ESTADO).setValue(CONFIG.ESTADO_ENVIADO);
          Logger.log('Procesado correctamente fila ' + (i + 1) + ': ' + fila[COL.NOMBRE - 1]);
        } catch (err) {
          Logger.log('Error fila ' + (i + 1) + ': ' + err.toString());
          hoja.getRange(i + 1, COL.ESTADO).setValue('Error: ' + err.message.substring(0, 60));
        }
      }
    }
  } finally {
    lock.releaseLock();
  }
}

// ─── PROCESAR UNA FILA ─────────────────────────────────────────────────────

function procesarFila(fila) {
  var proyecto = {
    titulo: fila[COL.NOMBRE - 1] || '',
    autor: fila[COL.AUTOR - 1] || '',
    tipo: fila[COL.TIPO - 1] || '',
    descripcion: fila[COL.DESCRIPCION - 1] || '',
    carpetaUrl: fila[COL.CARPETA_DRIVE - 1] || '',
    escuela: CONFIG.ESCUELA
  };

  proyecto.credito = extraerCredito(proyecto.autor);
  proyecto.caption = generarCaptionConGemini(proyecto.descripcion);

  var imagenes = obtenerImagenesDeCarpeta(proyecto.carpetaUrl);
  var urlAprobador = construirUrlAprobador(proyecto, imagenes);

  enviarEmailAprobador(urlAprobador, proyecto, imagenes.length);
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

// Extrae el crédito principal del campo Autor.
// Para talleres: extrae el nombre del taller de la primera línea "Taller: X".
// Para proyectos normales: devuelve el nombre tal cual.
function extraerCredito(autorRaw) {
  if (!autorRaw) return '';

  // Formato estructurado del form (cuando esTaller=true)
  if (autorRaw.indexOf('Taller:') === 0) {
    return autorRaw.split('\n')[0].replace(/^Taller:\s*/, '').trim();
  }

  // Heurística temporal: convención "Nombre del Taller / Participantes"
  // Tomamos lo que está antes del slash.
  // Se puede simplificar cuando el formulario tenga un campo dedicado.
  if (autorRaw.indexOf('/') !== -1) {
    return autorRaw.split('/')[0].trim();
  }

  return autorRaw.trim();
}

// Lista las imágenes de la carpeta de Drive y las devuelve como URLs thumbnail
// compatibles con background-image en CSS.
// function obtenerImagenesDeCarpeta(carpetaValor) {
//   if (!carpetaValor) return [];

//   var folder = encontrarCarpeta(carpetaValor);
//   if (!folder) return [];

//   var files = folder.getFiles();
//   var urls = [];

//   while (files.hasNext() && urls.length < 10) {
//     var file = files.next();
//     if (file.getMimeType().indexOf('image/') === 0) {
//       try {
//         var url = subirACloudinary(file);
//         if (url) urls.push(url);
//       } catch (e) {
//         Logger.log('Error subiendo ' + file.getName() + ' a Cloudinary: ' + e.message);
//       }
//     }
//   }

//   return urls;
// }

function obtenerImagenesDeCarpeta(carpetaValor) {
  if (!carpetaValor) return [];

  var folder = encontrarCarpeta(carpetaValor);
  if (!folder) return [];

  var files = folder.getFiles();
  var imagenesConBlobs = [];

  // Levantamos hasta 30 imágenes de Drive; Gemini filtra y ordena después
  while (files.hasNext() && imagenesConBlobs.length < 30) {
    var file = files.next();
    if (file.getMimeType().indexOf('image/') === 0) {
      try {
        var url = subirACloudinary(file);
        if (url) {
          imagenesConBlobs.push({
            url: url,
            blob: file.getBlob()
          });
        }
      } catch (e) {
        Logger.log('Error subiendo ' + file.getName() + ' a Cloudinary: ' + e.message);
      }
    }
  }

  if (imagenesConBlobs.length === 0) return [];

  return evaluarImagenesConGemini(imagenesConBlobs);
}

// Envía todas las imágenes a Gemini para que filtre las malas y rankee el resto.
// Si falla la llamada por cualquier razón, devuelve las imágenes tal como vinieron.
function evaluarImagenesConGemini(imagenesConBlobs) {

  // Sin API key configurada, devolvemos sin filtrar (cap 20 por límite de IG)
  if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.indexOf('tu key') !== -1 || CONFIG.GEMINI_API_KEY.length < 20) {
    Logger.log('GEMINI_API_KEY no configurada correctamente. Devolviendo sin filtrar.');
    return imagenesConBlobs.map(function (i) { return i.url; }).slice(0, 20);
  }

  var promptTexto =
    'Estás evaluando fotos de un proyecto de diseño para publicarlas en un carrusel de Instagram.\n\n' +
    'Van ' + imagenesConBlobs.length + ' imágenes numeradas del 0 al ' + (imagenesConBlobs.length - 1) + '.\n\n' +
    'Para cada una, evaluá: nitidez, iluminación, composición (encuadre, sujeto centrado o compuesto de forma intencional), ' +
    'calidad general y adecuación para una publicación profesional en redes.\n\n' +
    'Clasificá cada imagen como:\n' +
    '- "descartar": duplicada o similar a otra, muy borrosa, muy mal iluminada, corrida, o de calidad muy baja para publicar\n' +
    '- "aceptable": funciona pero no es destacable\n' +
    '- "destacable": alta calidad, buen encuadre, iluminación cuidada\n\n' +
    'Devolvé un JSON con el índice, la clasificación, y un score de 1 a 10 para cada imagen.';

  var parts = [{ text: promptTexto }];

  imagenesConBlobs.forEach(function (img) {
    parts.push({
      inline_data: {
        mime_type: img.blob.getContentType(),
        data: Utilities.base64Encode(img.blob.getBytes())
      }
    });
  });

  var payload = {
    contents: [{ parts: parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          evaluaciones: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                indice: { type: 'INTEGER' },
                calidad: { type: 'STRING', enum: ['descartar', 'aceptable', 'destacable'] },
                score: { type: 'NUMBER' }
              },
              required: ['indice', 'calidad', 'score']
            }
          }
        },
        required: ['evaluaciones']
      },
      temperature: 0.2
    }
  };



  var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' +
    CONFIG.GEMINI_API_KEY;

  try {
    var response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var status = response.getResponseCode();
    if (status !== 200) {
      Logger.log('Gemini respondió ' + status + ': ' + response.getContentText().substring(0, 500));
      return imagenesConBlobs.map(function (i) { return i.url; }).slice(0, 20);
    }

    var data = JSON.parse(response.getContentText());
    var textoRespuesta = data.candidates[0].content.parts[0].text;
    var evaluacion = JSON.parse(textoRespuesta);

    // Filtrar "descartar" y ordenar por score descendente
    var aceptadas = evaluacion.evaluaciones
      .filter(function (e) { return e.calidad !== 'descartar'; })
      .sort(function (a, b) { return b.score - a.score; });

    // Fallback: si Gemini descartó casi todo, tomamos las 5 mejores igual
    if (aceptadas.length < 3) {
      Logger.log('Advertencia: Gemini descartó casi todo. Devolviendo top 5 por score.');
      aceptadas = evaluacion.evaluaciones
        .slice()
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 5);
    }

    var seleccionadas = aceptadas.slice(0, 20);
    var descartadas = evaluacion.evaluaciones.length - seleccionadas.length;
    Logger.log('Gemini: ' + evaluacion.evaluaciones.length + ' evaluadas, ' +
      descartadas + ' descartadas, ' + seleccionadas.length + ' aceptadas.');

    return seleccionadas.map(function (e) { return imagenesConBlobs[e.indice].url; });

  } catch (err) {
    Logger.log('Error evaluando con Gemini: ' + err.message);
    return imagenesConBlobs.map(function (i) { return i.url; }).slice(0, 20);
  }
}

// Genera el caption para Instagram a partir de la descripción del proyecto.
// Si falla la llamada, devuelve string vacío (el aprobador va a mostrar textarea vacío).
function generarCaptionConGemini(descripcion) {
  if (!descripcion || !descripcion.trim()) {
    Logger.log('Sin descripción, saltando generación de caption.');
    return '';
  }

  if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.indexOf('tu key') !== -1 || CONFIG.GEMINI_API_KEY.length < 20) {
    Logger.log('GEMINI_API_KEY no configurada. Saltando caption.');
    return '';
  }

  var payload = {
    contents: [{
      role: 'user',
      parts: [{ text: descripcion }]
    }],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION_CAPTION }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2500
    }
  };

  var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' +
    CONFIG.GEMINI_API_KEY;

try {
    var response;
    var status;
    var intentos = 0;
    var maxIntentos = 3;

    while (intentos < maxIntentos) {
      response = UrlFetchApp.fetch(endpoint, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      status = response.getResponseCode();

      // 503 y 429 son errores temporales — reintentar tiene sentido
      if (status === 503 || status === 429) {
        intentos++;
        Logger.log('Gemini caption respondió ' + status + '. Reintentando (' + intentos + '/' + maxIntentos + ')...');
        Utilities.sleep(5000);
        continue;
      }

      break;
    }

    if (status !== 200) {
      Logger.log('Gemini caption respondió ' + status + ' después de ' + intentos + ' reintentos: ' + response.getContentText().substring(0, 500));
      return '';
    }

    var data = JSON.parse(response.getContentText());
    var texto = data.candidates[0].content.parts[0].text;
    Logger.log('Caption generado (' + texto.length + ' chars).');
    return texto.trim();

  } catch (err) {
    Logger.log('Error generando caption con Gemini: ' + err.message);
    return '';
  }
}

// Resuelve la carpeta de Drive a partir del valor en la columna "Carpeta Drive".
// Acepta URL completo (caso normal) o solo el nombre (fallback para filas
// donde por algún motivo no quedó el URL guardado).
function encontrarCarpeta(valor) {
  // Caso normal: el valor es un URL con un folder ID
  var matchUrl = valor.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (matchUrl) {
    try {
      return DriveApp.getFolderById(matchUrl[1]);
    } catch (e) {
      Logger.log('URL parecía válido pero no se pudo abrir: ' + e.message);
      // Caemos al fallback
    }
  }

  // Fallback: buscar carpeta por nombre exacto
  var carpetas = DriveApp.getFoldersByName(valor);
  if (carpetas.hasNext()) {
    var primera = carpetas.next();
    if (carpetas.hasNext()) {
      Logger.log('Atención: hay varias carpetas con nombre "' + valor + '". Usando la primera.');
    }
    return primera;
  }

  Logger.log('No se pudo encontrar carpeta para: ' + valor);
  return null;
}

// Sube una imagen de Drive a Cloudinary y devuelve el URL público.
// Usa upload preset unsigned, no expone API secret.
function subirACloudinary(file) {
  var endpoint = 'https://api.cloudinary.com/v1_1/' +
    CONFIG.CLOUDINARY_CLOUD_NAME + '/image/upload';

  var response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    payload: {
      file: file.getBlob(),
      upload_preset: CONFIG.CLOUDINARY_UPLOAD_PRESET
    },
    muteHttpExceptions: true
  });

  var statusCode = response.getResponseCode();
  if (statusCode !== 200) {
    Logger.log('Cloudinary respondió ' + statusCode + ': ' + response.getContentText());
    return null;
  }

  var json = JSON.parse(response.getContentText());
  return json.secure_url;
}

// Construye el URL del aprobador con los datos del proyecto como query params.
function construirUrlAprobador(proyecto, imagenes) {
  var params = [
    'tipo=' + encodeURIComponent(proyecto.tipo),
    'titulo=' + encodeURIComponent(proyecto.titulo),
    'participantes=' + encodeURIComponent(proyecto.credito),
    'escuela=' + encodeURIComponent(proyecto.escuela),
    'caption=' + encodeURIComponent(proyecto.caption || '')
    // descripcion removida — el cover no la necesita y hacía los URLs muy largos
  ];

  imagenes.forEach(function (url, idx) {
    params.push('img' + (idx + 1) + '=' + encodeURIComponent(url));
  });

  return CONFIG.APROBADOR_URL + '?' + params.join('&');
}

// Envía el email al aprobador con el link al aprobador.html ya con datos cargados.
function enviarEmailAprobador(url, proyecto, cantidadImagenes) {
  var subject = 'Nuevo proyecto para aprobar: ' + proyecto.titulo;

  var body = 'Hay un nuevo proyecto esperando aprobación para publicar en Instagram.\n\n' +
    '- Proyecto: ' + proyecto.titulo + '\n' +
    '- Autor: ' + proyecto.credito + '\n' +
    '- Tipo: ' + proyecto.tipo + '\n' +
    '- Imágenes detectadas: ' + cantidadImagenes + '\n\n' +
    'Haz click para elegir la portada y confirmar:\n\n' +
    url + '\n\n' +
    '---\nSistema automático FaAAD UDP';

  GmailApp.sendEmail(CONFIG.EMAIL_APROBADOR, subject, body);
}

// ─── SETUP DEL TRIGGER ─────────────────────────────────────────────────────

// Corré esta función UNA VEZ para instalar el trigger automático.
// Se va a disparar cada vez que el spreadsheet cambie (incluyendo cuando el
// otro script agrega filas vía appendRow).
function crearTrigger() {
  // Borrar triggers anteriores para evitar duplicados si la corrés más de una vez
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === 'alCambiarHoja') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Crear el nuevo trigger
  ScriptApp.newTrigger('alCambiarHoja')
    .forSpreadsheet(CONFIG.SPREADSHEET_ID)
    .onChange()
    .create();

  Logger.log('Trigger instalado correctamente.');
}

// ─── UTILIDADES DE PRUEBA / MANTENIMIENTO ──────────────────────────────────

// Resetea el Estado de una fila a "Pendiente revisión" para reprocessarla.
// Útil para testing — pasale el número de fila (1-indexed, sin contar header).
function resetearEstadoFila(numFila) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var hoja = ss.getSheetByName(CONFIG.HOJA_PROYECTOS);
  hoja.getRange(numFila, COL.ESTADO).setValue(CONFIG.ESTADO_PENDIENTE);
  Logger.log('Fila ' + numFila + ' reseteada a "' + CONFIG.ESTADO_PENDIENTE + '"');
}

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

/**
 * Maneja POST requests del frontend del aprobador
 * Recibe imagen y caption, publica en Instagram
 */
function doPost(e) {
  try {
    // Parsear el payload JSON del frontend
    var payload = JSON.parse(e.postData.contents);
    
    if (!payload.imagenUrl || !payload.caption) {
      return ContentService.createTextOutput(JSON.stringify({
        exito: false,
        mensaje: 'Faltan datos: imagenUrl o caption'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    Logger.log('Recibido POST para publicar en Instagram');
    Logger.log('Imagen: ' + payload.imagenUrl);
    Logger.log('Caption: ' + payload.caption.substring(0, 100) + '...');
    
    // Llamar función de publicación en Instagram
    var resultado = publicarEnInstagram(payload.imagenUrl, payload.caption);
    
    Logger.log('Resultado: ' + JSON.stringify(resultado));
    
    // Devolver respuesta al frontend
    return ContentService.createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    Logger.log('ERROR doPost: ' + e.message + '\n' + e.stack);
    return ContentService.createTextOutput(JSON.stringify({
      exito: false,
      mensaje: 'Error técnico: ' + e.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}