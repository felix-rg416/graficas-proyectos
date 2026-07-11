// =============================================
// 1. PARSE URL PARAMS — datos del proyecto
//    URL esperada (en producción la genera Apps Script):
//    aprobador.html?tipo=...&titulo=...&participantes=...
//                  &escuela=...&img1=...&img2=...&img3=...
// =============================================
const params = new URLSearchParams(window.location.search);
const captionRaw = params.get('caption') || '';

const proyecto = {
    tipo: params.get('tipo') || 'EXPOSICIÓN',
    titulo: params.get('titulo') || 'Proyecto de ejemplo',
    participantes: params.get('participantes') || 'Participantes del proyecto',
    escuela: params.get('escuela') || 'Escuela de Diseño',
    imagenes: []
};

// Recolectar URLs de imágenes (hasta img10)
for (let i = 1; i <= 10; i++) {
    const url = params.get(`img${i}`);
    if (url) proyecto.imagenes.push(url);
}

// Modo demo: si no hay imágenes, generar 3 placeholders vacíos
// para que se pueda probar el layout sin construir URL completa
if (proyecto.imagenes.length === 0) {
    proyecto.imagenes = ['', '', ''];
}

// =============================================
// 2. CONSTANTES y estado de la selección
// =============================================
const COLORES = [
    { id: 'none', label: 'Sin color' },
    { id: 'rojo', label: 'Rojo' },
    { id: 'verde-osc', label: 'Verde oscuro' },
    { id: 'azul', label: 'Azul' },
    { id: 'verde-cla', label: 'Verde claro' },
    { id: 'amarillo', label: 'Amarillo' },
    { id: 'azul-gris', label: 'Azul gris' }
];

const seleccion = {
    imagenIdx: null,
    color: null
};

let etapaActual = 1;

// Estado para el preview overlay
let hideTimer = null;
let activeSelectCallback = null;

// =============================================
// 3. RENDERIZAR header del proyecto
// =============================================
document.getElementById('proj-tipo').textContent = proyecto.tipo;
document.getElementById('proj-titulo').textContent = proyecto.titulo;

// =============================================
// 4. HELPER — crear el contenido del cover thumb
//    a partir del <template>, con datos aplicados
// =============================================
function crearThumbContent(imagenURL, color) {
    const template = document.getElementById('cover-template');
    const fragmento = template.content.cloneNode(true);
    const thumb = fragmento.querySelector('.cover-thumb');

    const fondo = thumb.querySelector('.fondo');
    if (imagenURL) {
        fondo.style.backgroundImage = `url('${imagenURL}')`;
    }
    if (color && color !== 'none') {
        fondo.classList.add(`overlay-${color}`);
    }

    // thumb.querySelector('.tipo-evento').textContent = proyecto.tipo;
    // thumb.querySelector('.titulo').textContent = proyecto.titulo;
    // thumb.querySelector('.nombres').textContent = proyecto.participantes;
    // thumb.querySelector('.escuela').textContent = proyecto.escuela;

    thumb.querySelector('.tipo-evento').textContent = proyecto.tipo;

    const tituloEl = thumb.querySelector('.titulo');
    tituloEl.textContent = proyecto.titulo;
    ajustarTamanoTitulo(tituloEl);

    thumb.querySelector('.nombres').textContent = proyecto.participantes;
    thumb.querySelector('.escuela').textContent = proyecto.escuela;

    return fragmento;
}

// =============================================
// 5. HELPER — crear card clickeable
//    Envuelve el thumb en un botón con etiqueta
// =============================================
function crearCardClickeable(imagenURL, color, etiqueta, onSeleccionar) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'candidato-card';

    const wrapper = document.createElement('div');
    wrapper.className = 'thumb-wrapper';
    wrapper.appendChild(crearThumbContent(imagenURL, color));

    const labelEl = document.createElement('div');
    labelEl.className = 'label';
    labelEl.textContent = etiqueta;

    button.appendChild(wrapper);
    button.appendChild(labelEl);

    // Hover (desktop) y click (tap móvil) abren el preview ampliado.
    // La selección efectiva ocurre desde el botón "Seleccionar" del preview.
    const data = { imagenURL, color, etiqueta, onSeleccionar };
    // button.addEventListener('mouseenter', () => showPreview(data));
    // button.addEventListener('mouseleave', () => scheduleHide(200));
    button.addEventListener('click', () => showPreview(data));

    return button;
}

// Ajusta el font-size del título según el largo del texto.
// Evita que títulos largos rebasen el canvas del slide.
function ajustarTamanoTitulo(tituloEl) {
    const longitud = (tituloEl.textContent || '').length;
    let tamano = 144;
    if (longitud > 80) tamano = 72;
    else if (longitud > 50) tamano = 88;
    else if (longitud > 30) tamano = 110;
    tituloEl.style.fontSize = tamano + 'px';
}

// =============================================
// 6. ETAPA 1 — render de imágenes candidatas
// =============================================
function renderEtapa1() {
    const grid = document.getElementById('grid-imagenes');
    grid.innerHTML = '';

    proyecto.imagenes.forEach((url, idx) => {
        const etiqueta = url
            ? `Opción ${idx + 1}`
            : `Opción ${idx + 1} (sin imagen)`;
        const card = crearCardClickeable(url, 'none', etiqueta, () => seleccionarImagen(idx));
        grid.appendChild(card);
    });
}

function seleccionarImagen(idx) {
    seleccion.imagenIdx = idx;
    seleccion.color = null;
    irAEtapa(2);
}

// =============================================
// 7. ETAPA 2 — render de variantes de color
// =============================================
function renderEtapa2() {
    const grid = document.getElementById('grid-colores');
    grid.innerHTML = '';

    const imagenURL = proyecto.imagenes[seleccion.imagenIdx];

    COLORES.forEach(({ id, label }) => {
        const card = crearCardClickeable(imagenURL, id, label, () => seleccionarColor(id));
        grid.appendChild(card);
    });
}

function seleccionarColor(color) {
    seleccion.color = color;
    irAEtapa(3);
}

// =============================================
// 8. ETAPA 3 — preview de la selección final
// =============================================
function renderEtapa3() {
    const preview = document.getElementById('preview-final');
    preview.innerHTML = '';

    const imagenURL = proyecto.imagenes[seleccion.imagenIdx];
    preview.appendChild(crearThumbContent(imagenURL, seleccion.color));

    // Resetear mensaje de confirmación si quedó visible
    document.getElementById('msg-confirmado').classList.add('oculto');
}

// Picker de alineación del título (etapa 3)
const claseAlineacionApr = ['align-sup-izq', 'align-inf-der', 'align-sup-der'];

document.querySelectorAll('.alineacion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Botón activo
        document.querySelectorAll('.alineacion-btn').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');

        // Aplicar al titulo del preview final
        const tituloFinal = document.querySelector('.preview-final-wrapper .titulo');
        if (!tituloFinal) return;

        claseAlineacionApr.forEach(c => tituloFinal.classList.remove(c));

        const claseNueva = btn.dataset.align;
        if (claseNueva) {
            tituloFinal.classList.add(claseNueva);
        }
    });
});

// =============================================
// 9. NAVEGACIÓN ENTRE ETAPAS
// =============================================
function irAEtapa(n) {
    etapaActual = n;

    document.querySelectorAll('.stage').forEach(s => s.classList.remove('visible'));
    document.getElementById(`stage-${n}`).classList.add('visible');

    document.querySelectorAll('.stage-dot').forEach(dot => {
        const stageNum = parseInt(dot.dataset.stage);
        dot.classList.remove('activo', 'completo');
        if (stageNum === n) dot.classList.add('activo');
        else if (stageNum < n) dot.classList.add('completo');
    });

    if (n === 1) renderEtapa1();
    if (n === 2) renderEtapa2();
    if (n === 3) renderEtapa3();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =============================================
// 10. BOTONES de navegación y acciones
// =============================================
document.getElementById('btn-volver-1').addEventListener('click', () => irAEtapa(1));
document.getElementById('btn-volver-2').addEventListener('click', () => irAEtapa(2));

document.getElementById('btn-confirmar').addEventListener('click', () => {
    document.getElementById('msg-confirmado').classList.remove('oculto');

    // EN PRODUCCIÓN: enviar la selección a Apps Script.
    // Ejemplo del payload que recibiría el endpoint:
    const payload = {
        proyecto,
        seleccion: {
            imagenURL: proyecto.imagenes[seleccion.imagenIdx],
            imagenIdx: seleccion.imagenIdx,
            color: seleccion.color
        }
    };
    console.log('Payload listo para Apps Script:', payload);

    // fetch('https://script.google.com/macros/s/.../exec', {
    //     method: 'POST',
    //     body: JSON.stringify(payload)
    // });
});

// // =============================================
// // 11. EXPORTAR PNG de la selección final
// // =============================================
// document.getElementById('btn-exportar-final').addEventListener('click', async () => {
//     const btn = document.getElementById('btn-exportar-final');
//     btn.disabled = true;

//     try {
//         await document.fonts.ready;

//         const thumb = document.querySelector('#preview-final .cover-thumb');

//         const dataUrl = await htmlToImage.toPng(thumb, {
//             width: 1020,
//             height: 1350,
//             pixelRatio: 1,
//             cacheBust: true,
//             style: {
//                 transform: 'none',
//                 width: '1020px',
//                 height: '1350px'
//             }
//         });

//         const link = document.createElement('a');
//         link.download = `portada-aprobada.png`;
//         link.href = dataUrl;
//         link.click();
//     } catch (error) {
//         console.error('Error al exportar PNG:', error);
//         alert('Error al exportar PNG. Revisá la consola del navegador.');
//     } finally {
//         btn.disabled = false;
//     }
// });

// =====================================================
// EXPORTAR CARRUSEL COMPLETO
// Descarga secuencialmente: cover + todas las imágenes + logo final
// =====================================================

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function slugify(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30) || 'proyecto';
}

function obtenerIndiceCover() {
    const activo = document.querySelector('.candidato-card.activo');
    if (!activo) return 0;
    const todas = Array.from(document.querySelectorAll('.candidato-card'));
    return Math.max(0, todas.indexOf(activo));
}

async function descargarCoverConTitulo(nombreArchivo) {
    const nodo = document.querySelector('.preview-final-wrapper .cover-thumb');
    if (!nodo) throw new Error('No se encontró .cover-thumb');

    await document.fonts.ready;

    const dataUrl = await htmlToImage.toPng(nodo, {
        width: 1020,
        height: 1350,
        pixelRatio: 1,
        cacheBust: true,
        style: {
            transform: 'scale(1)',
            transformOrigin: 'top left'
        }
    });

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = nombreArchivo;
    link.click();
}

async function descargarImagenRaw(urlCloudinary, nombreArchivo) {
    // Pedimos a Cloudinary la imagen ya recortada a 1020x1350 en PNG.
    // c_fill = fill con crop, g_auto = gravedad automática (elige el mejor recorte)
    const urlPng = urlCloudinary.replace(
        '/image/upload/',
        '/image/upload/w_1020,h_1350,c_fill,g_auto,f_png/'
    );

    const response = await fetch(urlPng);
    if (!response.ok) throw new Error('No se pudo bajar la imagen: ' + urlPng);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = nombreArchivo;
    link.click();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

async function descargarSlideLogo(nombreArchivo) {
    const nodo = document.getElementById('export-logo-slide');
    if (!nodo) throw new Error('No se encontró el template del slide final');

    await document.fonts.ready;

    const dataUrl = await htmlToImage.toPng(nodo, {
        width: 1020,
        height: 1350,
        pixelRatio: 1,
        cacheBust: true
    });

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = nombreArchivo;
    link.click();
}

async function exportarCarruselCompleto() {
    const btn = document.getElementById('btn-exportar-final');
    if (!btn) return;

    const textoOriginal = btn.textContent;
    btn.disabled = true;

    try {
        const titulo = params.get('titulo') || 'proyecto';
        const prefijo = slugify(titulo);

        // Recolectar URLs de imágenes del URL
        const imgs = [];
        let i = 1;
        while (params.get('img' + i)) {
            imgs.push(params.get('img' + i));
            i++;
        }

        if (imgs.length === 0) {
            alert('No hay imágenes para exportar.');
            btn.textContent = textoOriginal;
            btn.disabled = false;
            return;
        }

        const coverIdx = obtenerIndiceCover();
        const coverUrl = imgs[coverIdx];
        const otras = imgs.filter((_, idx) => idx !== coverIdx);

        const pad = n => String(n).padStart(2, '0');
        let contador = 1;

        // 1. Cover con título
        btn.textContent = `Descargando ${contador}...`;
        await descargarCoverConTitulo(`${pad(contador)}_${prefijo}_portada.png`);
        contador++;
        await esperar(400);

        // 2. Imagen de la portada (raw, sin overlay ni título)
        btn.textContent = `Descargando ${contador}...`;
        await descargarImagenRaw(coverUrl, `${pad(contador)}_${prefijo}_imagen.png`);
        contador++;
        await esperar(400);

        // 3. Resto de imágenes en orden de Drive
        for (const url of otras) {
            btn.textContent = `Descargando ${contador}...`;
            await descargarImagenRaw(url, `${pad(contador)}_${prefijo}_imagen.png`);
            contador++;
            await esperar(400);
        }

        // 4. Slide final con logo
        btn.textContent = `Descargando ${contador}...`;
        await descargarSlideLogo(`${pad(contador)}_${prefijo}_final.png`);

        btn.textContent = '✓ Descargado';
        setTimeout(() => {
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }, 2500);

    } catch (err) {
        console.error('Error exportando:', err);
        alert('Hubo un error al exportar el carrusel. Revisá la consola para detalles.');
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
}

// Registro del listener (reemplazá el que tengas actualmente)
document.getElementById('btn-exportar-final').addEventListener('click', exportarCarruselCompleto);

// =============================================
// 12. PREVIEW OVERLAY — show / hide / select
// =============================================
function showPreview(data) {
    cancelHide();

    const overlay = document.getElementById('preview-overlay');
    const container = document.getElementById('preview-grande-content');

    container.innerHTML = '';
    container.appendChild(crearThumbContent(data.imagenURL, data.color));

    document.getElementById('preview-label').textContent = data.etiqueta;
    activeSelectCallback = data.onSeleccionar;

    overlay.classList.add('visible');
}

function hidePreview() {
    document.getElementById('preview-overlay').classList.remove('visible');
    activeSelectCallback = null;
}

function scheduleHide(delay) {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        hidePreview();
        hideTimer = null;
    }, delay);
}

function cancelHide() {
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
}

// Mantener el preview abierto mientras el cursor esté sobre él
const previewContent = document.getElementById('preview-content');
// previewContent.addEventListener('mouseenter', cancelHide);
// previewContent.addEventListener('mouseleave', () => scheduleHide(200));

// Botón "Seleccionar" dentro del preview confirma la elección
document.getElementById('btn-seleccionar-preview').addEventListener('click', () => {
    const cb = activeSelectCallback;
    hidePreview();
    if (cb) cb();
});

// Botón cerrar (×) y tecla Escape
document.getElementById('btn-cerrar-preview').addEventListener('click', hidePreview);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePreview();
});

document.addEventListener('click', (e) => {
    const overlay = document.getElementById('preview-overlay');
    if (!overlay.classList.contains('visible')) return;
    if (e.target.closest('#preview-content')) return;
    if (e.target.closest('.candidato-card')) return;
    hidePreview();
});

// Poblar y manejar el caption en la etapa 3
const captionTextarea = document.getElementById('caption-textarea');
const btnCopiarCaption = document.getElementById('btn-copiar-caption');

if (captionTextarea) {
    captionTextarea.value = captionRaw;
}

if (btnCopiarCaption) {
    btnCopiarCaption.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(captionTextarea.value);
            btnCopiarCaption.textContent = 'Copiado ✓';
            btnCopiarCaption.classList.add('copiado');
            setTimeout(() => {
                btnCopiarCaption.textContent = 'Copiar caption';
                btnCopiarCaption.classList.remove('copiado');
            }, 2000);
        } catch (err) {
            console.error('Error copiando caption:', err);
            alert('No se pudo copiar. Seleccioná el texto manualmente.');
        }
    });
}

// =============================================
// INIT
// =============================================
renderEtapa1();
