// ------------------------------------------
// 1. ESTADO — datos del evento
// ------------------------------------------
const estado = {
    tipo: 'TIPO DE EVENTO',
    titulo: 'Título del evento o actividad',
    participantes: 'Nombre Participantes',
    descripcion: 'Descripción del evento o actividad.',
    fecha: '',
    desde: '',
    hasta: '',
    lugar: '',
    direccion: '',
    escuela: 'Escuela',
    imagenFondo: '',
    overlayColor: 'none',
    slideActivo: 1
};

// ------------------------------------------
// 2. ACTUALIZAR EL DOM con el estado
// ------------------------------------------
function renderizar() {
    // ---- SLIDE 1 ----
    // document.getElementById('s1-tipo').textContent = estado.tipo;
    // document.getElementById('s1-titulo').textContent = estado.titulo;
    // document.getElementById('s1-participantes').textContent = estado.participantes;
    // document.getElementById('s1-escuela').textContent = estado.escuela;

    document.getElementById('s1-tipo').textContent = estado.tipo;

    const tituloEl = document.getElementById('s1-titulo');
    tituloEl.textContent = estado.titulo;
    ajustarTamanoTitulo(tituloEl);

    document.getElementById('s1-participantes').textContent = estado.participantes;
    document.getElementById('s1-escuela').textContent = estado.escuela;

    // Imagen de fondo slide 1
    const fondo = document.getElementById('fondo-img');
    if (estado.imagenFondo) {
        fondo.style.backgroundImage = `url('${estado.imagenFondo}')`;
    } else {
        fondo.style.backgroundImage = 'none';
    }

    // Color overlay slide 1 — clase basada en estado
    const coloresPosibles = ['rojo', 'verde-osc', 'azul', 'verde-cla', 'amarillo', 'azul-gris'];
    coloresPosibles.forEach(c => fondo.classList.remove(`overlay-${c}`));
    if (estado.overlayColor && estado.overlayColor !== 'none') {
        fondo.classList.add(`overlay-${estado.overlayColor}`);
    }

    // ---- SLIDE 2 ----
    document.getElementById('s2-tipo').textContent = estado.tipo;
    document.getElementById('s2-descripcion').textContent = estado.descripcion;

    // Construir cada dato si tiene contenido; ocultar si no
    const fechaTxt = estado.fecha
        ? new Date(estado.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'long' })
        : '';
    const horarioTxt = (estado.desde || estado.hasta)
        ? `${estado.desde || '--:--'} A ${estado.hasta || '--:--'} HRS`
        : '';

    aplicarDato('s2-fecha', fechaTxt);
    aplicarDato('s2-horario', horarioTxt);
    aplicarDato('s2-lugar', estado.lugar);
    aplicarDato('s2-direccion', estado.direccion);
}

// Helper: setea contenido y oculta si está vacío
function aplicarDato(elId, valor) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = valor || '';
    el.classList.toggle('oculto', !valor);
}

// ------------------------------------------
// 3. BINDINGS — inputs → estado → render
// ------------------------------------------
function bindInputs() {
    const mapeo = {
        'tipo-evento': 'tipo',
        'titulo': 'titulo',
        'participantes': 'participantes',
        'descripcion': 'descripcion',
        'fecha': 'fecha',
        'desde': 'desde',
        'hasta': 'hasta',
        'lugar': 'lugar',
        'direccion': 'direccion',
        'escuela': 'escuela',
        'imagen-fondo': 'imagenFondo'
    };

    Object.entries(mapeo).forEach(([inputId, estadoKey]) => {
        const el = document.getElementById(inputId);
        if (!el) return;
        el.addEventListener('input', () => {
            estado[estadoKey] = el.value;
            renderizar();
        });
    });
}

// ------------------------------------------
// 4. COLOR PICKER — swatches → overlay
// ------------------------------------------
function bindColorPicker() {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            estado.overlayColor = swatch.dataset.color;
            swatches.forEach(s => s.classList.remove('activo'));
            swatch.classList.add('activo');
            renderizar();
        });
    });
}

// ------------------------------------------
// 5. NAVEGACIÓN ENTRE SLIDES
// ------------------------------------------
function mostrarSlide(n) {
    estado.slideActivo = n;

    document.querySelectorAll('.slide').forEach(s => s.classList.remove('visible'));
    document.getElementById(`slide-${n}`).classList.add('visible');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('activo', parseInt(btn.dataset.slide) === n);
    });
}

function bindNavSlides() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            mostrarSlide(parseInt(btn.dataset.slide));
        });
    });
}

// ------------------------------------------
// 6. EXPORTAR PNG del slide activo
//    Usa html-to-image; espera a que las fuentes
//    carguen antes de capturar para evitar fallbacks.
// ------------------------------------------
async function exportarSlide() {
    const btn = document.getElementById('btn-exportar');
    btn.disabled = true;

    try {
        // Esperar a que se carguen las fuentes custom
        await document.fonts.ready;

        const slide = document.getElementById(`slide-${estado.slideActivo}`);

        const dataUrl = await htmlToImage.toPng(slide, {
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
        link.download = `slide-${estado.slideActivo}.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error('Error al exportar PNG:', error);
        alert('Error al exportar PNG. Revisá la consola del navegador.');
    } finally {
        btn.disabled = false;
    }
}

// ------------------------------------------
// 7. LEER PARÁMETROS DE URL
//    Permite que Apps Script / htmlcsstoimage pasen
//    los datos así: index.html?titulo=...&desde=...
// ------------------------------------------
function cargarDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    const camposURL = {
        'tipo': 'tipo-evento',
        'titulo': 'titulo',
        'participantes': 'participantes',
        'descripcion': 'descripcion',
        'fecha': 'fecha',
        'desde': 'desde',
        'hasta': 'hasta',
        'lugar': 'lugar',
        'direccion': 'direccion',
        'escuela': 'escuela',
        'imagenFondo': 'imagen-fondo'
    };

    Object.entries(camposURL).forEach(([estadoKey, inputId]) => {
        if (params.has(estadoKey)) {
            const valor = params.get(estadoKey);
            estado[estadoKey] = valor;
            const el = document.getElementById(inputId);
            if (el) el.value = valor;
        }
    });

    // Color overlay desde URL
    if (params.has('overlayColor')) {
        estado.overlayColor = params.get('overlayColor');
        const swatch = document.querySelector(`.color-swatch[data-color="${estado.overlayColor}"]`);
        if (swatch) {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('activo'));
            swatch.classList.add('activo');
        }
    }

    // Slide a mostrar
    if (params.has('slide')) {
        mostrarSlide(parseInt(params.get('slide')));
    }
}

// ------------------------------------------
// Ajusta el font-size del título según largo del texto.
// Evita que títulos largos rebasen el canvas del slide.
// ------------------------------------------
function ajustarTamanoTitulo(tituloEl) {
    const longitud = (tituloEl.textContent || '').length;
    let tamano = 144;
    if (longitud > 80) tamano = 72;
    else if (longitud > 50) tamano = 88;
    else if (longitud > 30) tamano = 110;
    tituloEl.style.fontSize = tamano + 'px';
}

// ------------------------------------------
// INIT
// ------------------------------------------
cargarDesdeURL();
bindInputs();
bindColorPicker();
bindNavSlides();
document.getElementById('btn-exportar').addEventListener('click', exportarSlide);
renderizar();
