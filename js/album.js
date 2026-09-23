/* ============================================================
   ÁLBUM PARA COMPARTIR — XV Años Thaily Rodríguez

   album.html?filtro=album        → solo el álbum digital
   album.html?filtro=impresion    → solo las fotos de impresión
   album.html?filtro=descartada   → solo las descartadas
   album.html?filtro=todas        → todas menos las descartadas
        ↳ en todos estos casos: SOLO el álbum, sin herramientas.

   album.html  (sin ?filtro)      → modo completo: se ven las
        herramientas y los filtros normales del selector.
   ============================================================ */
(function () {
'use strict';

const CFG    = window.EVENT_CONFIG;
const TOOLS  = window.HERRAMIENTAS;
const IDS    = TOOLS.map(t => t.id);
const photos = window.PHOTOS || [];        // completa: lightbox
const thumbs = window.PHOTO_THUMBS || [];  // miniatura: rejilla
const files  = window.PHOTO_FILES || [];

const FILTROS_VALIDOS = IDS.concat(['todas']);

const TITULOS = {
    impresion:  { titulo: 'Fotos para impresión', sub: 'Las que se imprimen en 5x7 pulgadas' },
    album:      { titulo: 'Álbum Digital',        sub: 'Las favoritas de ' + CFG.nombreCorto },
    descartada: { titulo: 'Fotos descartadas',    sub: 'Las que no entraron a la selección' },
    todas:      { titulo: 'Álbum completo',       sub: 'Todas las fotos seleccionadas' }
};

let selecciones   = {};
let indicesVista  = [];
let currentPos    = null;   // posición dentro de indicesVista
let filtroActual  = null;   // null = modo completo
let vistaCompleta = null;   // filtro activo en modo completo
let touchStartX = 0, touchStartY = 0;

/* ============================================================
   LECTURA DEL PARÁMETRO GET
   ============================================================ */
function leerFiltroGet() {
    const p = new URLSearchParams(location.search);
    const v = (p.get('filtro') || p.get('f') || '').trim().toLowerCase();
    return FILTROS_VALIDOS.indexOf(v) !== -1 ? v : null;
}

/* ============================================================
   SELECCIÓN DE ÍNDICES SEGÚN FILTRO
   ============================================================ */
function calcularIndices(filtro) {
    const out = [];
    for (let i = 0; i < photos.length; i++) {
        const sel = selecciones[i] || {};
        let ok;
        if (filtro === 'todas')      ok = !sel.descartada && IDS.some(id => sel[id]);
        else if (filtro === 'sin')   ok = !IDS.some(id => sel[id]);
        else if (filtro === 'all')   ok = !sel.descartada;
        else                         ok = sel[filtro] === true;
        if (ok) out.push(i);
    }
    return out;
}

/* ============================================================
   RENDER
   ============================================================ */
function renderCabecera() {
    const info = TITULOS[filtroActual] || { titulo: 'Álbum de fotos', sub: '' };
    document.getElementById('albumNombre').textContent = CFG.nombre;
    document.getElementById('albumTipo').textContent   = CFG.tipo + ' · ' + CFG.fechaTexto;

    if (filtroActual) {
        document.getElementById('albumTitulo').textContent = info.titulo;
        document.getElementById('albumSub').textContent    = info.sub;
    } else {
        document.getElementById('albumTitulo').textContent = 'Álbum de fotos';
        document.getElementById('albumSub').textContent    = 'Explora por categoría o abre tu selector para elegir.';
    }
}

function renderConteo() {
    const el = document.getElementById('albumConteo');
    if (!el) return;
    const n = indicesVista.length;
    el.textContent = n === 0 ? 'Sin fotos en esta categoría todavía'
                             : `${n} ${n === 1 ? 'foto' : 'fotos'}`;
}

function renderGaleria() {
    const grid = document.getElementById('albumGrid');
    grid.innerHTML = '';

    if (!photos.length) {
        grid.innerHTML = `<div class="album-vacio">Las fotos se publican después del evento (${CFG.fechaTexto}).</div>`;
        return;
    }
    if (!indicesVista.length) {
        grid.innerHTML = filtroActual
            ? '<div class="album-vacio">Todavía no hay fotos marcadas en esta categoría.<br><small>Cuando ' +
              CFG.nombreCorto + ' las elija en su selector, aparecerán aquí solas.</small></div>'
            : '<div class="album-vacio">Todavía no hay fotos marcadas.</div>';
        return;
    }

    const frag = document.createDocumentFragment();
    indicesVista.forEach((idx, pos) => {
        const fig = document.createElement('figure');
        fig.className = 'album-item';
        fig.innerHTML =
            `<img data-src="${thumbs[idx] || photos[idx]}" alt="Foto ${idx + 1}" class="lazy-img"
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 3 2'/%3E">`;
        if (!filtroActual) {
            const sel = selecciones[idx] || {};
            const tags = TOOLS.filter(t => sel[t.id]);
            if (tags.length) {
                fig.insertAdjacentHTML('beforeend',
                    '<figcaption class="album-tags">' +
                    tags.map(t => `<span class="badge badge-${t.id}">${t.icono}</span>`).join('') +
                    '</figcaption>');
            }
        }
        fig.addEventListener('click', () => abrirLightbox(pos));
        frag.appendChild(fig);
    });
    grid.appendChild(frag);
    lazyInit();
}

/* ── Lazy load ────────────────────────────────────────────── */
let lazyObserver = null, lazyQueue = [], lazyActive = 0;
function lazyNext() {
    while (lazyActive < 4 && lazyQueue.length) {
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
    lazyObserver = new IntersectionObserver(es => {
        es.forEach(e => {
            if (!e.isIntersecting) return;
            lazyObserver.unobserve(e.target);
            if (!e.target.classList.contains('lazy-loaded')) { lazyQueue.push(e.target); lazyNext(); }
        });
    }, { rootMargin: '400px 0px' });
    document.querySelectorAll('#albumGrid img.lazy-img:not(.lazy-loaded)').forEach(i => lazyObserver.observe(i));
}

/* ============================================================
   LIGHTBOX (ver · navegar · descargar). Sin clasificar.
   ============================================================ */
function abrirLightbox(pos) {
    currentPos = pos;
    const idx = indicesVista[pos];
    const lb  = document.getElementById('lightbox');
    document.getElementById('lbImagen').src = photos[idx];
    document.getElementById('lbImagen').alt = 'Foto ' + (idx + 1);
    document.getElementById('lbContador').textContent = `${pos + 1} / ${indicesVista.length}`;
    lb.classList.add('activo');
    document.body.style.overflow = 'hidden';
    [pos + 1, pos - 1].forEach(p => {
        if (p >= 0 && p < indicesVista.length) { const im = new Image(); im.src = photos[indicesVista[p]]; }
    });
}

function cerrarLightbox() {
    document.getElementById('lightbox').classList.remove('activo');
    document.body.style.overflow = '';
    currentPos = null;
}

function moverLightbox(d) {
    if (currentPos === null) return;
    let p = currentPos + d;
    if (p < 0) p = indicesVista.length - 1;
    if (p >= indicesVista.length) p = 0;
    abrirLightbox(p);
}

async function descargarActual() {
    if (currentPos === null) return;
    const idx = indicesVista[currentPos];
    const url = photos[idx];
    const nombre = (files[idx] || ('foto-' + (idx + 1))).replace(/\.[^.]+$/, '') + '.jpg';
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
        SB.registrarVisita('album-descarga');
    } catch (e) {
        window.open(url, '_blank');
    }
}

function compartirEnlace() {
    const url = location.href;
    const texto = filtroActual
        ? `${(TITULOS[filtroActual] || {}).titulo} — ${CFG.tipo} de ${CFG.nombre} ✨`
        : `${CFG.tipo} de ${CFG.nombre} ✨`;
    if (navigator.share) {
        navigator.share({ title: texto, url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url)
            .then(() => alert('Enlace copiado ✓'))
            .catch(() => prompt('Copia este enlace:', url));
    }
}

/* ============================================================
   MODO COMPLETO (sin ?filtro): barra de herramientas
   ============================================================ */
function construirHerramientas() {
    const barra = document.getElementById('albumHerramientas');
    if (!barra) return;
    barra.hidden = false;

    barra.querySelector('#albumFiltros').innerHTML =
        `<button class="btn btn-filter active" data-vista="all">Todas</button>` +
        TOOLS.map(t => `<button class="btn btn-filter filter-${t.id}" data-vista="${t.id}">${t.icono} ${t.nombre}</button>`).join('') +
        `<button class="btn btn-filter filter-sin" data-vista="sin">Sin Clasificar</button>`;

    barra.querySelectorAll('[data-vista]').forEach(b => {
        b.addEventListener('click', () => {
            vistaCompleta = b.dataset.vista;
            barra.querySelectorAll('[data-vista]').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            indicesVista = calcularIndices(vistaCompleta);
            renderConteo();
            renderGaleria();
            actualizarConteosHerramientas();
        });
    });

    actualizarConteosHerramientas();
}

function actualizarConteosHerramientas() {
    const cont = document.getElementById('albumStats');
    if (!cont) return;
    const s = {};
    IDS.forEach(id => { s[id] = 0; });
    Object.values(selecciones).forEach(sel => IDS.forEach(id => { if (sel[id]) s[id]++; }));

    cont.innerHTML = TOOLS.map(t => `
        <div class="album-stat" data-cat="${t.id}">
            <span>${t.icono}</span>
            <strong>${s[t.id]}${t.limite ? '/' + t.limite : ''}</strong>
            <small>${t.nombre}</small>
        </div>`).join('');
}

/* ============================================================
   ARRANQUE
   ============================================================ */
async function iniciar() {
    filtroActual = leerFiltroGet();
    document.body.classList.toggle('modo-album', !!filtroActual);
    document.body.classList.toggle('modo-completo', !filtroActual);

    renderCabecera();

    try {
        selecciones = await SB.fetchSelecciones();
    } catch (e) {
        console.warn('[Supabase]', e.message);
        try { selecciones = JSON.parse(localStorage.getItem('thailyrodriguez_selecciones') || '{}'); }
        catch (e2) { selecciones = {}; }
    }

    if (filtroActual) {
        indicesVista = calcularIndices(filtroActual);
        SB.registrarVisita('album-' + filtroActual);
    } else {
        vistaCompleta = 'all';
        indicesVista = calcularIndices('all');
        construirHerramientas();
        SB.registrarVisita('album');
    }

    renderConteo();
    renderGaleria();

    // Enlaces a las otras vistas (solo en modo álbum)
    const otros = document.getElementById('albumOtros');
    if (otros && filtroActual) {
        otros.innerHTML = ['album', 'impresion', 'ampliacion', 'todas']
            .filter(f => f !== filtroActual)
            .map(f => `<a href="?filtro=${f}">${(TITULOS[f] || {}).titulo}</a>`)
            .join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    iniciar();

    document.getElementById('lbCerrar')?.addEventListener('click', cerrarLightbox);
    document.getElementById('lbPrev')?.addEventListener('click', () => moverLightbox(-1));
    document.getElementById('lbNext')?.addEventListener('click', () => moverLightbox(1));
    document.getElementById('lbDescargar')?.addEventListener('click', descargarActual);
    document.getElementById('btnCompartirAlbum')?.addEventListener('click', compartirEnlace);

    const lb = document.getElementById('lightbox');
    lb?.addEventListener('click', e => { if (e.target.id === 'lightbox') cerrarLightbox(); });
    lb?.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
    }, { passive: true });
    lb?.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) moverLightbox(dx > 0 ? -1 : 1);
    }, { passive: true });

    document.addEventListener('keydown', e => {
        if (currentPos === null) return;
        if (e.key === 'Escape')     cerrarLightbox();
        if (e.key === 'ArrowLeft')  moverLightbox(-1);
        if (e.key === 'ArrowRight') moverLightbox(1);
    });
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

})();
