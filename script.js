// ------------------------------------------
// 1. ESTADO — datos del evento
// ------------------------------------------
const estado = {
    tipo: 'TIPO DE EVENTO',
    titulo: 'Título del evento o actividad',
    participantes: 'Nombre Participantes',
    descripcion: 'Descripción del evento o actividad.',
    horario: '00:00 A 00:00 HRS',
    lugar: 'LUGAR',
    direccion: 'DIRECCIÓN',
    escuela: 'Escuela',
    imagenFondo: '',
    slideActivo: 1
};

// ------------------------------------------
// 2. ACTUALIZAR EL DOM con el estado
// ------------------------------------------
function renderizar() {
    // Slide 1
    document.getElementById('s1-tipo').textContent = estado.tipo;
    document.getElementById('s1-titulo').textContent = estado.titulo;
    document.getElementById('s1-participantes').textContent = estado.participantes;
    document.getElementById('s1-escuela').textContent = estado.escuela;

    // Imagen de fondo slide 1
    const fondo = document.getElementById('fondo-img');
    if (estado.imagenFondo) {
        fondo.style.backgroundImage = `url('${estado.imagenFondo}')`;
    } else {
        fondo.style.backgroundImage = 'none';
    }

    const desde = estado.desde || '00:00';
    const hasta = estado.hasta || '00:00';

    // Slide 2
    document.getElementById('s2-tipo').textContent = estado.tipo;
    document.getElementById('s2-descripcion').textContent = estado.descripcion;
    document.getElementById('s2-fecha').textContent = estado.fecha ? new Date(estado.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'long' }) : 'FECHA';
    document.getElementById('s2-horario').textContent = `${desde} A ${hasta} HRS`;
    document.getElementById('s2-lugar').textContent = estado.lugar;
    document.getElementById('s2-direccion').textContent = estado.direccion;
}

// ------------------------------------------
// 3. LEER INPUTS y actualizar estado
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
// 4. NAVEGACIÓN ENTRE SLIDES
// ------------------------------------------
function mostrarSlide(n) {
    estado.slideActivo = n;

    document.querySelectorAll('.slide').forEach(s => s.classList.remove('visible'));
    document.getElementById(`slide-${n}`).classList.add('visible');

    document.querySelectorAll('.nav-slides button').forEach((btn, i) => {
        btn.classList.toggle('activo', i + 1 === n);
    });
}

// ------------------------------------------
// 5. EXPORTAR PNG (próximo paso: Puppeteer)
//    Por ahora abre el slide en pantalla completa
// ------------------------------------------
function exportarSlide() {
    alert(`Exportar slide ${estado.slideActivo} — esta función se implementa en el Paso 3 con Puppeteer.`);
}

// ------------------------------------------
// 6. LEER PARÁMETROS DE URL (Paso 2.3)
//    Permite que Puppeteer pase datos así:
//    index.html?titulo=...&participantes=...
// ------------------------------------------
function cargarDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    const campos = ['tipo', 'titulo', 'participantes', 'descripcion', 'desde', 'hasta', 'lugar', 'direccion', 'escuela', 'imagenFondo'];
    campos.forEach(c => {
        if (params.has(c)) {
            estado[c] = params.get(c);
            const inputId = c === 'imagenFondo' ? 'imagen-fondo'
                : c === 'tipo' ? 'tipo-evento'
                    : c === 'desde' ? 'desde'
                        : c === 'hasta' ? 'hasta'
                            : c;
            const el = document.getElementById(inputId);
            if (el) el.value = params.get(c);
        }
    });
    if (params.has('slide')) mostrarSlide(parseInt(params.get('slide')));
}

// ------------------------------------------
// INIT
// ------------------------------------------
cargarDesdeURL();
bindInputs();
renderizar();