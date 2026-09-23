/* ============================================================
   SELECTOR DE FOTOS — XV Años Thaily Rodríguez
   Requiere, en este orden:
     js/config.js  ·  js/photos.js  ·  js/supabase-api.js  ·  js/selector.js
   ============================================================ */
(function () {
'use strict';

const CFG    = window.EVENT_CONFIG;
const TOOLS  = window.HERRAMIENTAS;
const IDS    = TOOLS.map(t => t.id);                       // ['impresion','ampliacion','album','descartada']
const photos = window.PHOTOS || [];        // completa: modal
const thumbs = window.PHOTO_THUMBS || [];  // miniatura: rejilla
const files  = window.PHOTO_FILES || [];

const STORAGE_KEY = 'thailyrodriguez_selecciones';
const KEY_FILTER  = 'thailyrodriguez_filtro';
const KEY_SCROLL  = 'thailyrodriguez_scroll';
const KEY_LAST    = 'thailyrodriguez_ultima_foto';

const LIMITES = {};
TOOLS.forEach(t => { LIMITES[t.id] = t.limite; });
const COSTO_EXTRA = CFG.costoFotoAdicional;

let selections       = {};
let currentIndex     = null;
let currentFilter    = 'all';
let sbDisponible     = true;
let modalOpen        = false;
let touchStartX = 0, touchStartY = 0;
let scrollSaveTimer  = null;

/* ============================================================
   ESTADO / PERSISTENCIA
   ============================================================ */
function vacio(sel) {
    return !IDS.some(id => sel && sel[id] === true);
}

function guardarLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selections)); }
    catch (e) { toast('No se pudo guardar en este navegador.', 'error'); }
}

function nombresPorIndice() {
    const map = {};
    Object.keys(selections).forEach(idx => { if (files[idx]) map[idx] = files[idx]; });
    return map;
}

/* Sincroniza UNA foto. La tabla exige reloj lógico por foto
   (ver js/supabase-api.js), por eso no hay envío en bloque. */
function sincronizarFoto(index) {
    if (!sbDisponible) return;
    const sel = selections[index];
    const p = (sel && !vacio(sel))
        ? SB.guardarFoto(index, sel, files[index])
        : SB.borrarFoto(index);

    p.then(r => {
        if (r === 'desactualizado') {
            toast('Otro dispositivo iba más adelantado; actualizando…', 'error');
            cargar(true);
        }
    }).catch(e => console.warn('[Supabase] foto ' + index + ':', e.message));
}

async function cargar(esPolling) {
    if (!esPolling) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) selections = JSON.parse(raw);
        } catch (e) { selections = {}; }
        pintarTodo();
    }

    if (!sbDisponible) return;
    try {
        const remotas = await SB.fetchSelecciones();

        if (!esPolling) {
            // Primera carga: lo local que no esté en la nube se sube.
            const mezcla = Object.assign({}, remotas);
            Object.entries(selections).forEach(([idx, sel]) => {
                if (!vacio(sel)) mezcla[idx] = sel;
            });
            selections = mezcla;
            const pendientes = {};
            Object.entries(selections).forEach(([idx, sel]) => {
                if (!remotas[idx] && !vacio(sel)) pendientes[idx] = sel;
            });
            if (Object.keys(pendientes).length) {
                SB.subirTodas(pendientes, nombresPorIndice())
                  .catch(e => console.warn('[Supabase] migración:', e.message));
            }
            SB.registrarVisita('selector');
            avisoSinSeleccion();
        } else {
            // Polling: la nube manda (varias personas eligiendo a la vez).
            selections = remotas;
        }

        guardarLocal();
        pintarTodo();
    } catch (e) {
        console.warn('[Supabase] usando solo este dispositivo:', e.message);
        sbDisponible = false;
        const av = document.getElementById('avisoOffline');
        if (av) av.style.display = 'block';
    }
}

function avisoSinSeleccion() {
    if (document.getElementById('bannerSinSel')) return;
    if (Object.keys(selections).length > 0) return;
    if (!photos.length) return;
    if (CFG.fechaEvento > new Date()) return;
    const b = document.createElement('div');
    b.id = 'bannerSinSel';
    b.className = 'banner-aviso';
    b.innerHTML = '📸 <strong>¡Tus fotos ya están listas!</strong> Todavía no eliges ninguna. ' +
                  '<button type="button" data-abrir-ayuda>¿Cómo funciona?</button>' +
                  '<button type="button" class="cerrar-banner">&times;</button>';
    document.body.insertBefore(b, document.body.firstChild);
    b.querySelector('.cerrar-banner').addEventListener('click', () => b.remove());
    b.querySelector('[data-abrir-ayuda]').addEventListener('click', () => window.AyudaSelector.abrir());
}

/* ============================================================
   CONTEOS
   ============================================================ */
function stats() {
    const s = {};
    IDS.forEach(id => { s[id] = 0; });
    Object.values(selections).forEach(sel => {
        IDS.forEach(id => { if (sel[id]) s[id]++; });
    });
    s.sinClasificar = Math.max(0, photos.length - Object.keys(selections).length);
    s.visibles      = Math.max(0, photos.length - s.descartada);
    return s;
}

function pintarConteos() {
    const s = stats();

    TOOLS.forEach(t => {
        const el = document.getElementById('count_' + t.id);
        if (el) el.textContent = t.limite ? `${s[t.id]}/${t.limite}` : s[t.id];

        const card = document.querySelector('.stat-card[data-cat="' + t.id + '"]');
        if (card && t.limite) {
            card.classList.toggle('excedido', s[t.id] > t.limite);
            card.classList.toggle('completo', s[t.id] === t.limite);
        }
    });

    const elSin = document.getElementById('count_sinClasificar');
    if (elSin) elSin.textContent = s.sinClasificar;

    // Aviso de costo extra por impresión
    const extras = Math.max(0, s.impresion - LIMITES.impresion);
    const box    = document.getElementById('avisoExtra');
    if (box) {
        if (extras > 0) {
            box.style.display = 'block';
            box.innerHTML = `⚠️ Llevas <strong>${extras} foto${extras > 1 ? 's' : ''} de impresión adicional${extras > 1 ? 'es' : ''}</strong> ` +
                            `sobre las ${LIMITES.impresion} incluidas — costo extra: <strong>$${extras * COSTO_EXTRA} MXN</strong> ` +
                            `($${COSTO_EXTRA} c/u).`;
        } else {
            box.style.display = 'none';
        }
    }

    // Aviso de ampliaciones extra (solo si el paquete lleva ampliacion)
    const ampExtra = LIMITES.ampliacion ? Math.max(0, s.ampliacion - LIMITES.ampliacion) : 0;
    const boxAmp   = document.getElementById('avisoAmpliacion');
    if (boxAmp) {
        if (ampExtra > 0) {
            boxAmp.style.display = 'block';
            boxAmp.innerHTML = `🖼️ Marcaste <strong>${s.ampliacion} ampliaciones</strong> y tu paquete incluye ` +
                               `<strong>${LIMITES.ampliacion}</strong>. Déjanos saber cuál es la principal o te cotizamos las demás.`;
        } else {
            boxAmp.style.display = 'none';
        }
    }

    // Textos de los botones de filtro
    const setTxt = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
    setTxt('btnFilter_all', `Todas (${s.visibles})`);
    TOOLS.forEach(t => setTxt('btnFilter_' + t.id, `${t.nombre} (${s[t.id]})`));
    setTxt('btnFilter_sin', `Sin Clasificar (${s.sinClasificar})`);
}

/* ============================================================
   GALERÍA
   ============================================================ */
function claseTarjeta(sel) {
    if (sel.descartada) return 'has-descartada';
    const cats = IDS.filter(id => id !== 'descartada' && sel[id]);
    if (cats.length > 1) return 'has-multiple';
    if (cats.length === 1) return 'has-' + cats[0];
    return '';
}

function badges(sel) {
    const activos = TOOLS.filter(t => sel[t.id]);
    if (!activos.length) return '';
    return '<div class="photo-badges">' +
        activos.map(t => `<span class="badge badge-${t.id}">${t.icono} ${t.nombre}</span>`).join('') +
        '</div>';
}

function renderGaleria() {
    const grid = document.getElementById('photosGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!photos.length) {
        const falta = CFG.fechaEvento > new Date();
        grid.innerHTML = '<div class="no-photos">' +
            (falta
                ? `Tus fotos aparecerán aquí después de la sesión y del evento (${CFG.fechaTexto}).`
                : 'Estamos subiendo tus fotos. Vuelve en un momento.') +
            '</div>';
        return;
    }

    const frag = document.createDocumentFragment();
    photos.forEach((src, index) => {
        const sel  = selections[index] || {};
        const card = document.createElement('div');
        card.className = 'photo-card ' + claseTarjeta(sel);
        card.dataset.index = index;
        card.innerHTML =
            `<div class="photo-image-container">
                <img data-src="${thumbs[index] || src}" alt="Foto ${index + 1}" class="lazy-img"
                     src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 2'/%3E">
             </div>
             <div class="photo-number">Foto ${index + 1}</div>
             ${badges(sel)}`;
        card.addEventListener('click', () => abrirModal(index));
        frag.appendChild(card);
    });
    grid.appendChild(frag);
    aplicarFiltro();
}

function actualizarTarjeta(index) {
    const card = document.querySelector('.photo-card[data-index="' + index + '"]');
    if (!card) return;
    const sel = selections[index] || {};
    card.className = 'photo-card ' + claseTarjeta(sel);
    const viejo = card.querySelector('.photo-badges');
    if (viejo) viejo.remove();
    if (badges(sel)) card.insertAdjacentHTML('beforeend', badges(sel));
    card.classList.toggle('hidden', !visibleEnFiltro(index));
}

function pintarTodo() {
    renderGaleria();
    lazyInit();
    pintarConteos();
}

/* ============================================================
   LAZY LOAD (máx 4 descargas simultáneas)
   ============================================================ */
let lazyObserver = null, lazyQueue = [], lazyActive = 0;
const LAZY_MAX = 4;

function lazyNext() {
    while (lazyActive < LAZY_MAX && lazyQueue.length) {
        const img = lazyQueue.shift();
        if (!img.dataset.src || img.classList.contains('lazy-loaded')) continue;
        lazyActive++;
        img.onload = img.onerror = () => { lazyActive--; lazyNext(); };
        img.src = img.dataset.src;
        img.classList.add('lazy-loaded');
    }
}

function lazyInit() {
    if (lazyObserver) lazyObserver.disconnect();
    lazyQueue = []; lazyActive = 0;
    lazyObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            lazyObserver.unobserve(e.target);
            if (!e.target.classList.contains('lazy-loaded')) { lazyQueue.push(e.target); lazyNext(); }
        });
    }, { rootMargin: '400px 0px' });
    document.querySelectorAll('img.lazy-img:not(.lazy-loaded)').forEach(i => lazyObserver.observe(i));
}

/* ============================================================
   FILTROS
   Regla del evento: "Todas" OCULTA las descartadas.
   ============================================================ */
function visibleEnFiltro(index) {
    const sel = selections[index] || {};
    if (currentFilter === 'all')  return sel.descartada !== true;
    if (currentFilter === 'sin')  return !IDS.some(id => sel[id]);
    return sel[currentFilter] === true;
}

function aplicarFiltro() {
    document.querySelectorAll('.photo-card').forEach(card => {
        card.classList.toggle('hidden', !visibleEnFiltro(parseInt(card.dataset.index, 10)));
    });
    const nota = document.getElementById('notaFiltro');
    if (nota) {
        if (currentFilter === 'all') {
            const n = stats().descartada;
            nota.innerHTML = n
                ? `Se están ocultando <strong>${n}</strong> foto${n > 1 ? 's' : ''} descartada${n > 1 ? 's' : ''}. Míralas en el filtro «Descartadas».`
                : '';
        } else if (currentFilter === 'descartada') {
            nota.innerHTML = 'Estas son tus fotos descartadas. Ábrelas y quita la marca ❌ si quieres recuperarlas.';
        } else {
            nota.innerHTML = '';
        }
    }
}

function setFiltro(f) {
    currentFilter = f;
    aplicarFiltro();
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('[data-filter="' + f + '"]');
    if (btn) btn.classList.add('active');
    try { localStorage.setItem(KEY_FILTER, f); } catch (e) {}
}

/* ============================================================
   MODAL
   ============================================================ */
function abrirModal(index) {
    currentIndex = index;
    try { localStorage.setItem(KEY_LAST, index); } catch (e) {}

    const img = document.getElementById('modalImage');
    img.src = photos[index];
    img.alt = 'Foto ' + (index + 1);
    document.getElementById('modalPhotoNumber').textContent = `Foto ${index + 1} de ${photos.length}`;

    const sel = selections[index] || {};
    document.querySelectorAll('.option-btn').forEach(b => {
        b.classList.toggle('selected', sel[b.dataset.category] === true);
    });

    document.getElementById('photoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    modalOpen = true;
    precargar(index + 1); precargar(index - 1);
}

function precargar(i) {
    if (i < 0 || i >= photos.length) return;
    const im = new Image(); im.src = photos[i];
}

function cerrarModal() {
    document.getElementById('photoModal').classList.remove('active');
    document.body.style.overflow = '';
    modalOpen = false;
    currentIndex = null;
}

function leerModal() {
    const sel = {};
    document.querySelectorAll('.option-btn').forEach(b => {
        sel[b.dataset.category] = b.classList.contains('selected');
    });
    return sel;
}

function aplicarSeleccion(index, sel) {
    const previo = JSON.stringify(selections[index] || null);
    if (vacio(sel)) delete selections[index];
    else            selections[index] = sel;

    guardarLocal();
    actualizarTarjeta(index);
    pintarConteos();

    // Solo tocamos la nube si algo cambió de verdad
    if (previo !== JSON.stringify(selections[index] || null)) sincronizarFoto(index);
}

function guardarYCerrar() {
    if (currentIndex === null) return;
    aplicarSeleccion(currentIndex, leerModal());
    cerrarModal();
    toast('Selección guardada ✓', 'success');
}

function navegar(dir) {
    if (currentIndex === null) return;
    aplicarSeleccion(currentIndex, leerModal());
    let n = currentIndex + (dir === 'next' ? 1 : -1);
    if (n >= photos.length) n = 0;
    if (n < 0) n = photos.length - 1;
    abrirModal(n);
}

function swipeGuardarYSiguiente() {
    if (currentIndex === null) return;
    aplicarSeleccion(currentIndex, leerModal());
    toast('Guardado ✓', 'success');
    navegar('next');
}

function swipeLimpiarYSiguiente() {
    if (currentIndex === null) return;
    aplicarSeleccion(currentIndex, {});
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    toast('Marcas quitadas', 'success');
    navegar('next');
}

/* ============================================================
   DESCARGA DE UNA FOTO
   ============================================================ */
async function descargarFoto(cerrar) {
    if (currentIndex === null) return;
    const url = photos[currentIndex];
    if (!url) return;
    const nombre = (files[currentIndex] || ('foto-' + (currentIndex + 1))).replace(/\.[^.]+$/, '') + '.jpg';
    toast('Descargando…', 'success');
    try {
        const resp = await fetch(url, { mode: 'cors' });
        let blob = await resp.blob();
        if (!/jpe?g/.test(blob.type)) {
            const bmp = await createImageBitmap(blob);
            const c = document.createElement('canvas');
            c.width = bmp.width; c.height = bmp.height;
            c.getContext('2d').drawImage(bmp, 0, 0);
            blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.95));
        }
        const a = document.createElement('a');
        const obj = URL.createObjectURL(blob);
        a.href = obj; a.download = nombre;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(obj), 2000);
        SB.registrarVisita('descarga');
    } catch (e) {
        window.open(url, '_blank');
    }
    if (cerrar) cerrarModal();
}

/* ============================================================
   REPORTE / COMPARTIR
   ============================================================ */
function resumenTexto() {
    const s = stats();
    const extras = Math.max(0, s.impresion - LIMITES.impresion);
    let t = `SELECCION DE FOTOS - ${CFG.tipo.toUpperCase()} ${CFG.nombre.toUpperCase()}\n`;
    t += '='.repeat(56) + '\n\n';
    t += `Evento: ${CFG.fechaTexto}\n`;
    t += `Paquete: ${CFG.paquete.nombre}\n\n`;
    t += `RESUMEN\n`;
    t += `  Fotos disponibles: ${photos.length}\n`;
    TOOLS.forEach(t2 => {
        const lim = t2.limite ? `/${t2.limite}` : '';
        t += `  ${t2.icono} ${t2.nombre}: ${s[t2.id]}${lim}\n`;
    });
    t += `  Sin clasificar: ${s.sinClasificar}\n\n`;

    if (extras > 0) {
        t += `COSTO ADICIONAL\n`;
        t += `  Fotos de impresion extra: ${extras} x $${COSTO_EXTRA} = $${extras * COSTO_EXTRA} MXN\n\n`;
    }

    TOOLS.forEach(t2 => {
        const lista = Object.keys(selections)
            .filter(i => selections[i][t2.id])
            .map(i => parseInt(i, 10) + 1)
            .sort((a, b) => a - b);
        if (!lista.length) return;
        t += `${t2.icono} ${t2.nombre.toUpperCase()} (${lista.length})\n`;
        t += '  ' + lista.join(', ') + '\n\n';
    });

    t += `Generado: ${new Date().toLocaleString('es-MX')}\n`;
    t += `FORO 7 - Fotografia y Video\n`;
    return t;
}

function descargarReporte() {
    const blob = new Blob([resumenTexto()], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `seleccion-paula-victoria-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Reporte descargado', 'success');
}

function copiarResumen() {
    navigator.clipboard.writeText(resumenTexto())
        .then(() => toast('Resumen copiado — pégalo en WhatsApp', 'success'))
        .catch(() => toast('No se pudo copiar. Usa «Descargar Reporte».', 'error'));
}

/* ── Compartir álbum: genera album.html?filtro=… ───────────── */
function abrirCompartir() {
    document.getElementById('compartirModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    pintarEnlaceCompartir();
}

function cerrarCompartir() {
    document.getElementById('compartirModal').classList.remove('active');
    document.body.style.overflow = '';
}

function enlaceCompartir() {
    const f = document.querySelector('input[name="catCompartir"]:checked');
    const base = location.href.replace(/[^/]*$/, '') + 'album.html';
    return f && f.value !== 'todas' ? `${base}?filtro=${f.value}` : `${base}?filtro=todas`;
}

function pintarEnlaceCompartir() {
    const inp = document.getElementById('compartirUrl');
    if (inp) inp.value = enlaceCompartir();
}

/* ============================================================
   LIMPIAR
   ============================================================ */
async function limpiarTodo() {
    if (!confirm('¿Seguro que quieres borrar TODAS tus marcas? No se puede deshacer.')) return;
    if (sbDisponible) {
        try { await SB.borrarTodas(); }
        catch (e) { console.warn('[Supabase] borrar:', e.message); }
    }
    selections = {};
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    pintarTodo();
    toast('Se borraron todas las marcas', 'success');
}

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer = null;
function toast(msg, tipo) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (tipo || 'success') + ' show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ============================================================
   CONSTRUCCIÓN DEL PANEL (desde HERRAMIENTAS)
   ============================================================ */
function construirPanel() {
    const fila = document.getElementById('statsRow');
    if (fila) {
        fila.innerHTML = TOOLS.map(t => `
            <div class="stat-card" data-cat="${t.id}">
                <span class="stat-icon">${t.icono}</span>
                <div class="stat-info">
                    <h3>${t.nombre}</h3>
                    <span class="stat-count" id="count_${t.id}">0</span>
                </div>
            </div>`).join('') + `
            <div class="stat-card" data-cat="sin">
                <span class="stat-icon">⭕</span>
                <div class="stat-info">
                    <h3>Sin Clasificar</h3>
                    <span class="stat-count" id="count_sinClasificar">0</span>
                </div>
            </div>`;
    }

    const filtros = document.getElementById('filterRow');
    if (filtros) {
        filtros.innerHTML =
            `<button class="btn btn-filter active" id="btnFilter_all" data-filter="all">Todas</button>` +
            TOOLS.map(t =>
                `<button class="btn btn-filter filter-${t.id}" id="btnFilter_${t.id}" data-filter="${t.id}">${t.nombre}</button>`
            ).join('') +
            `<button class="btn btn-filter filter-sin" id="btnFilter_sin" data-filter="sin">Sin Clasificar</button>`;
        filtros.querySelectorAll('.btn-filter').forEach(b => {
            b.addEventListener('click', () => setFiltro(b.dataset.filter));
        });
    }

    const opciones = document.getElementById('optionButtons');
    if (opciones) {
        opciones.innerHTML = TOOLS.map((t, i) => `
            <button class="option-btn ${t.id}" data-category="${t.id}" title="Atajo: tecla ${i + 1}">
                <span class="option-icon">${t.icono}</span>
                <span class="option-text">${t.textoBtn}</span>
                <span class="option-check">✓</span>
            </button>`).join('');
        opciones.querySelectorAll('.option-btn').forEach(b => {
            b.addEventListener('click', () => b.classList.toggle('selected'));
        });
    }

    const radios = document.getElementById('compartirOpciones');
    if (radios) {
        radios.innerHTML =
            TOOLS.filter(t => t.id !== 'descartada').map((t, i) => `
                <label class="compartir-op">
                    <input type="radio" name="catCompartir" value="${t.id}" ${i === 0 ? 'checked' : ''}>
                    <span>${t.icono} ${t.nombre}</span>
                </label>`).join('') +
            `<label class="compartir-op">
                <input type="radio" name="catCompartir" value="todas">
                <span>🖼️ Todas (sin descartadas)</span>
             </label>`;
        radios.querySelectorAll('input').forEach(r => r.addEventListener('change', pintarEnlaceCompartir));
    }
}

/* ============================================================
   ARRANQUE
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    // Encabezado dinámico
    const h = document.getElementById('tituloEvento');
    if (h) h.textContent = CFG.nombre;
    const st = document.getElementById('subtituloEvento');
    if (st) st.textContent = CFG.tipo + ' · ' + CFG.fechaTexto;
    const ins = document.getElementById('instrucciones');
    if (ins) {
        const incluidas = TOOLS
            .filter(t => t.limite)
            .map(t => `<strong>${t.fraseIncluida || (t.limite + ' ' + t.nombre.toLowerCase())}</strong>`)
            .join(' y ');
        ins.innerHTML = incluidas
            ? `Elige tus fotos: tu paquete incluye ${incluidas}.`
            : 'Elige las fotos que quieres de tu evento.';
    }

    construirPanel();
    pintarTodo();
    cargar(false);

    const f = localStorage.getItem(KEY_FILTER);
    if (f) setFiltro(f);
    const sc = parseInt(localStorage.getItem(KEY_SCROLL) || '0', 10);
    if (sc > 0) requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, sc)));

    // Acciones
    document.getElementById('btnExport')?.addEventListener('click', descargarReporte);
    document.getElementById('btnCopy')?.addEventListener('click', copiarResumen);
    document.getElementById('btnClear')?.addEventListener('click', limpiarTodo);
    document.getElementById('btnShareAlbum')?.addEventListener('click', abrirCompartir);

    document.getElementById('compartirCerrar')?.addEventListener('click', cerrarCompartir);
    document.getElementById('compartirModal')?.addEventListener('click', e => {
        if (e.target.id === 'compartirModal') cerrarCompartir();
    });
    document.getElementById('compartirCopiar')?.addEventListener('click', () => {
        navigator.clipboard.writeText(enlaceCompartir())
            .then(() => toast('Enlace copiado ✓', 'success'))
            .catch(() => toast('Copia el enlace manualmente', 'error'));
    });
    document.getElementById('compartirWhatsapp')?.addEventListener('click', () => {
        const url = enlaceCompartir();
        window.open('https://wa.me/?text=' + encodeURIComponent('Mira mi álbum de XV años ✨ ' + url), '_blank');
    });
    document.getElementById('compartirAbrir')?.addEventListener('click', () => window.open(enlaceCompartir(), '_blank'));

    // Modal de foto
    document.querySelector('.modal-close')?.addEventListener('click', cerrarModal);
    document.getElementById('btnCancel')?.addEventListener('click', cerrarModal);
    document.getElementById('btnSave')?.addEventListener('click', guardarYCerrar);
    document.getElementById('btnPrev')?.addEventListener('click', () => navegar('prev'));
    document.getElementById('btnNext')?.addEventListener('click', () => navegar('next'));
    document.getElementById('btnDownload')?.addEventListener('click', () => descargarFoto(false));
    document.getElementById('btnDownloadClose')?.addEventListener('click', () => descargarFoto(true));

    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.addEventListener('click', e => { if (e.target.id === 'photoModal') cerrarModal(); });
        modal.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        modal.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
                dx > 0 ? swipeGuardarYSiguiente() : swipeLimpiarYSiguiente();
            }
        }, { passive: true });
    }

    // Teclado
    document.addEventListener('keydown', e => {
        if (!modalOpen) return;
        if (e.key === 'Escape')      { cerrarModal(); return; }
        if (e.key === 'Enter')       { guardarYCerrar(); return; }
        if (e.key === 'ArrowLeft')   { navegar('prev'); return; }
        if (e.key === 'ArrowRight')  { navegar('next'); return; }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= TOOLS.length) {
            const btn = document.querySelector('.option-btn[data-category="' + TOOLS[n - 1].id + '"]');
            if (btn) { btn.classList.toggle('selected'); e.preventDefault(); }
        }
    });

    // Sincronización periódica entre dispositivos
    setInterval(() => { if (!modalOpen && sbDisponible) cargar(true); }, 30000);
});

window.addEventListener('scroll', () => {
    if (modalOpen) return;
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => {
        try { localStorage.setItem(KEY_SCROLL, window.scrollY); } catch (e) {}
    }, 300);
}, { passive: true });

document.addEventListener('visibilitychange', () => { if (document.hidden) guardarLocal(); });
window.addEventListener('beforeunload', guardarLocal);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

})();
