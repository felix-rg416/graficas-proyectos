// =============================================
// 1. PARSE URL PARAMS — datos del proyecto
//    URL esperada (en producción la genera Apps Script):
//    aprobador.html?tipo=...&titulo=...&participantes=...
//                  &escuela=...&img1=...&img2=...&img3=...
// =============================================
const params = new URLSearchParams(window.location.search);

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

    thumb.querySelector('.tipo-evento').textContent = proyecto.tipo;
    thumb.querySelector('.titulo').textContent = proyecto.titulo;
    thumb.querySelector('.nombres').textContent = proyecto.participantes;
    thumb.querySelector('.escuela').textContent = proyecto.escuela;

    return fragmento;
}

// =============================================
// 5. HELPER — crear card clickeable
//    Envuelve el thumb en un botón con etiqueta
// =============================================
function crearCardClickeable(imagenURL, color, etiqueta, onClick) {
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
    button.addEventListener('click', onClick);

    return button;
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
            width: 1080,
            height: 1350,
            pixelRatio: 1,
            cacheBust: true,
            style: {
                transform: 'none',
                width: '1080px',
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
// INIT
// =============================================
renderEtapa1();
