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

// =============================================
// 11. EXPORTAR PNG de la selección final
// =============================================
document.getElementById('btn-exportar-final').addEventListener('click', async () => {
    const btn = document.getElementById('btn-exportar-final');
    btn.disabled = true;

    try {
        await document.fonts.ready;

        const thumb = document.querySelector('#preview-final .cover-thumb');

        const dataUrl = await htmlToImage.toPng(thumb, {
            width: 1020,
            height: 1350,
            pixelRatio: 1,
            cacheBust: true,
            style: {
                transform: 'none',
                width: '1020px',
                height: '1350px'
            }
        });

        const link = document.createElement('a');
        link.download = `portada-aprobada.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error('Error al exportar PNG:', error);
        alert('Error al exportar PNG. Revisá la consola del navegador.');
    } finally {
        btn.disabled = false;
    }
});

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
