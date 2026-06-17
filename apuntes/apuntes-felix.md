# graficas-proyectos

Herramienta de automatización de gráficas para proyectos.

1. Persona rellena un formulario de una página web para inscribir su proyecto
2. La herramienta recibe la información y genera una gráfica con esa información usando un visualizador de datos externo
3. La herramienta genera las gráficas
4. La herramienta envía un enlace a quien aprueba las gráficas
5. Una persona aprueba las imágenes
6. La herramienta publica las gráficas en Instagram

## Índice

- [Fases](#fases)
    - [Fase 1: Datos de entrada](#fase-1-datos-de-entrada)
    - [Fase 2: Visualizador de datos externos](#fase-2-visualizador-de-datos-externos)
    - [Fase 3: Captura de Puppeteer](#fase-3-captura-de-puppeteer)
    - [Fase 4: Google Drive](#fase-4-google-drive)
    - [Fase 5: Revisión y publicación](#fase-5-revisión-y-publicación)
- [Preguntas](#preguntas)
- [Herramientas y recomendaciones](#herramientas-y-recomendaciones)
    - [Imágenes](#imágenes)
        - [Desde Drive a Cloudinary](#desde-drive-a-cloudinary)
        - [Filtro de imágenes](#filtro-de-imágenes)
- [Preguntas, comentarios y recomendaciones](#preguntas-comentarios-y-recomendaciones)
    - [01](#01)
    - [02](#02)
- [Enlaces](#enlaces)

## Fases:

[Índice](#índice)

Claude AI me ayudará a aprender y crear la herramienta.

Como nunca he hecho algo así, le pedí que me haga un plan para ir paso a paso.

### Fase 1: Datos de entrada

- Conseguir acceso al formulario, google sheets o a los campos que se deben rellenar.
- Decidir qué campo mapea a qué elemento de la gráfica.

|Datos de entrada|Elemento gráfico|
|----------------|----------------|
|Nombre del proyecto|Título de la gráfica|
|Nombre de la pesona o equipo|Subtítulo de la gráfica|
|Descripción|Bloque de texto|

### Fase 2: Visualizador de datos externos

- Modificar el app.js de Mateo para recibir datos vía parámetros en la URL.
- Crear una función qeu tome un JASON (proyecto) y configure el estado.
- Probar localmente pasando datos manualmente.

1. Ertructura base: index.html + style.css
2. Canvas con p5.js: inicializar p5l, definir tamaño, fondo y grilla
3. Leer parámetros de la URL: función ```loadFromURL()``` para parsear JSON
4. Renderizar texto: nombre del proyecto, nombre de la persona o equipo, descripción
5. Aplicar gráfica UDP: incluir colores, fuentes y layout según la identidad de UDP
6. Prueba con datos ficticios: abrir el visualizador con URL como ```?proyecto=...&autor=...&descripcion=...``` para verificar que se renderiza correctamente.

### Fase 3: Captura de Puppeteer

- Script Node.js que abra el visualizador de datos en la URL
- Esperar a que el DOM carque.
- Tomar una captura de pantalla de la gráfica y guarda el PNG

### Fase 4: Google Drive

- Google Apps Script lee el Sheet con los proyectos nuevos.
- Llama al script de Puppeteer y le passa los datos del proyecto.
- Sube las imágenes generadas a una Carpeta de Google Drive.
- Marca la fila como "generado" para no repetirla.
- Notifica a la persona revisora por correo.

### Fase 5: Revisión y publicación

- La persona revisora aprueba o rechaza desde Google Drive.
- Si aprueba: se publica en Instagram.
- Si rechaza: regenerar otra gráfica o ajustar parámetros. 
- Documentar para que otros puedan usar la herramienta.

## Herramientas y recomendaciones

- <https://github.com/matbutom/PCD-graficas-2026>
    - Referencia de herramienta similar hecha por Mateo para el PCD.
- Google apps script
    - Para lograr ineracción con Google Drive
- Claude AI
    - Para ayudarme a aprender y crear la herramienta
- Pupeteer
    - Para capturar las gráficas generadas en el visualizador de datos y guardarlas como imágenes
    - (https://pptr.dev/guides/what-is-puppeteer)

### Imágenes

#### Desde Drive a Cloudinary

Para las imágenes, al usar un correo de la UDP, los archivos tienen acceso restringido y el Apps Script no puede sacar las imágenes. Por lo tanto, Claude me recomendó usar <https://cloudinary.com> que es una plataforma de gestión de imágenes que ofrece una API para manipular y optimizar imágenes en la nube.

Cloud Name: dm9tdsix6

Entonces el Apps Script envía las imágenes de Drive a Cloudinary, y desde ahí se pueden obtener los enlaces públicos para hacer las gráficas.

Hice la cuenta con mi correo insitucional. Luego se puede cambiar a otro correo para que gestione eso.

#### Filtro de imágenes

En Gemini hay una función que permite evaluar imágenes según criterios específicos: Gemini Vision. Se le pueden pasar varias imágenes y un prompt con los criterios que se quieren evaluar (colores, brillo, calidad, composición, etc). Gemini devuelve una puntuación para cada imagen y las ordena según esos criterios.

Entonces, en vez de mostrar todas las imágenes a quien aprueba, se pueden filtrar y mostrar sólo las mejores candidatas.

1. Apps Script descarga las N imágenes del autor desde Drive
2. Llama a Gemini Vision con todas las imágenes + prompt evaluativo con tus criterios
3. Gemini devuelve top 3-5 candidatas con razones
4. Apps Script genera 3-5 portadas (una con cada candidata de fondo)
5. El aprobador ve las 3-5 portadas en la Web App, elige una y reordena los slides

### Publicación en Instagram

Para publicar en Instagram, se puede usar la API de Instagram Graph, pero tiene limitaciones y requiere una cuenta de empresa.

Se necesita una cuenta de empresa de Instagram, que esté vinculada a una página de Facebook. Además, para usar la API de Instagram Graph, se necesita un código de acceso que se obtiene a través del proceso de autenticación de Facebook.

## Preguntas, comentarios y recomendaciones

### 01

**Preguntas para Emi y Simón**

- ¿La gente rellenará un formulario web, un google forms o mandarán un correo?
- ¿Puedo acceder a los datos o al menos a los campos que pide?
- ¿Qué información deben ir en las gráficas?
- ¿La idea es que sea una publicación tipo carrusel o sólo una imagen?

**Comentarios y recomendaciones**

- Tamaño: 1020x1350px (tamaño recomendado para Instagram) 
- A veces puede ser sólo una imagen, sin el título ni el logo
- Criterios para la imagen:
        - Colores
        - Brillo
        - Calidad
        - Composición (minimalista y monocompuesta)
        - Objeto en el centro
- En el formulario se envían más de una imagen (con IA se podría elegir la mejor)
- Qué pasa con los videos. Muy bonito sería en la portada. Al recibir el video, la herramienta lo transforma a formato instagram y lo exporta en .mp3 en la carpeta de Google Drive
- Enviar las fotos a wsp con un bot puede ser un enlace para ver las imagenes, selecionar el orden y las suba automáticamente
- Para revisión y aprobación rápida que envíe un link a wsp donde se selecciona la imagen de portada y las demás imágenes del carrusel, y luego se suba automáticamente a Instagram.
- Si el texto estaba alineado a la izquierda en la publicación anterior, el siguiente debe estar a la derecha o dependiendo del contexto

### 02

**Preguntas para Emi y Simón**

- Hay títulos demasiado largos. Propongo que se ponga un límite de caracteres para que no se rompa la composición.

**Comentarios y recomendaciones**

- No es un filtro de color, es un gradiante
- Primero título ajustado a la visualidad de la imagen de fondo, luego un carrusel de fotos y al final el logo de la faaad
- Es posible que se tenga que agregan un logo a extra a la última imagen junto al de la faaad
- Ver diagramaciones de texto de instagram
- Filtro de image: pueden haber 2 muy parecidas

### 03

Para poder subir a instagram se necesita una cuenta de empresa, y esa cuenta tiene que estar vinculada a una página de Facebook. Además, para usar la API de Instagram Graph, se necesita un codigo de acceso que se obtiene a través del proceso de autenticación de Facebook.


## Enlaces

- [linktree udp](https://linktr.ee/comunicaciones.disenoudp)
- [forms con datos de proyectos](https://docs.google.com/forms/d/e/1FAIpQLSfvkAMkUHfUSpBAncOZ2KhZuPwKaHQy2pEJXSa1ISl-iL5amA/viewform)
- [Cloudinary](https://cloudinary.com)
- [Creador de COPYS RRSS udp](https://aistudio.google.com/apps/56cb9cef-959d-4bfe-b902-62c47a34039a?showPreview=true&showAssistant=true)