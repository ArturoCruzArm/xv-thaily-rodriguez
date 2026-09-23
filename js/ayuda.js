/* ============================================================
   BOTÓN DE AYUDA — documenta cada herramienta del selector.
   Se auto-genera desde window.HERRAMIENTAS (js/config.js).
   Se usa en selector.html y en album.html.
   ============================================================ */
(function () {
    'use strict';

    const CFG   = window.EVENT_CONFIG || {};
    const TOOLS = window.HERRAMIENTAS || [];
    const KEY_VISTA = 'thailyrodriguez_ayuda_vista';

    /* ── Secciones que no dependen de las categorías ───────────── */
    /* Nombres de las categorías de ESTE evento, para los textos de abajo. */
    const NOMBRES = TOOLS.map(t => t.nombre);
    const TECLAS  = TOOLS.map((t, i) => i + 1).join(', ');

    const EXTRAS = [
        {
            icono: '🔍',
            nombre: 'Filtros de arriba',
            ayuda: 'Los botones <em>Todas · ' + NOMBRES.join(' · ') + ' · Sin Clasificar</em> cambian qué fotos ves. ' +
                   '<strong>«Todas» ya no muestra las descartadas</strong> a propósito, para que avances más rápido; para revisarlas entra al filtro «Descartadas». ' +
                   'El filtro que elijas se recuerda aunque cierres la página.'
        },
        {
            icono: '👆',
            nombre: 'Abrir y clasificar una foto',
            ayuda: 'Toca cualquier foto para abrirla en grande. Ahí marcas las categorías que quieras (una foto puede ir en varias a la vez: impresión <em>y</em> álbum, por ejemplo) y das <strong>Guardar</strong>. ' +
                   'Las flechas ‹ › pasan a la foto anterior/siguiente.'
        },
        {
            icono: '↔️',
            nombre: 'Deslizar en el celular',
            ayuda: 'Con la foto abierta: <strong>desliza a la derecha</strong> para guardar lo que marcaste y pasar a la siguiente; <strong>desliza a la izquierda</strong> para quitarle todas las marcas y avanzar. Es la forma más rápida de revisar cientos de fotos.'
        },
        {
            icono: '⌨️',
            nombre: 'Teclado (computadora)',
            ayuda: '<strong>← →</strong> cambian de foto · <strong>Enter</strong> guarda y cierra · <strong>Esc</strong> cierra sin guardar · ' +
                   '<strong>' + TECLAS + '</strong> marcan o desmarcan ' + NOMBRES.join(', ') + '.'
        },
        {
            icono: '⬇️',
            nombre: 'Descargar JPG',
            ayuda: 'Dentro de la foto abierta, <strong>⬇ JPG</strong> la baja a tu celular o computadora en calidad original. <strong>⬇ Descargar y Cerrar</strong> hace lo mismo y regresa a la galería.'
        },
        {
            icono: '📥',
            nombre: 'Descargar Reporte',
            ayuda: 'Genera un archivo de texto con el conteo por categoría, la lista de números de foto que elegiste y el costo extra si te pasaste del límite. Sirve para mandárnoslo o guardarlo como comprobante de tu selección.'
        },
        {
            icono: '📤',
            nombre: 'Copiar Resumen',
            ayuda: 'Copia ese mismo resumen al portapapeles para pegarlo directo en WhatsApp.'
        },
        {
            icono: '🔗',
            nombre: 'Compartir Álbum',
            ayuda: 'Crea un enlace de <strong>solo lectura</strong> de una categoría (por ejemplo tu álbum digital o tus fotos de impresión). Quien lo abra ve nada más esas fotos, bonitas y a pantalla completa, <strong>sin poder cambiar tu selección</strong>. Ideal para mandarlo a la familia.'
        },
        {
            icono: '🗑️',
            nombre: 'Limpiar Todo',
            ayuda: 'Borra <strong>todas</strong> tus marcas y empieza de cero. Pide confirmación porque no se puede deshacer.'
        },
        {
            icono: '☁️',
            nombre: 'Se guarda solo',
            ayuda: 'Cada marca se guarda al instante en tu navegador y en la nube. Puedes seguir desde el celular donde te quedaste en la computadora, y si eligen entre varias personas, todos ven lo mismo (se refresca cada 30 segundos). Sin internet también funciona: se sincroniza al reconectar.'
        }
    ];

    function construirHTML() {
        let secciones = '';

        secciones += '<h4 class="ayuda-grupo">Las ' + TOOLS.length + ' herramientas de tu selector</h4>';
        TOOLS.forEach(t => {
            const limite = t.limite
                ? `<span class="ayuda-limite">Incluidas: ${t.limite}</span>`
                : (t.id === 'descartada' ? '' : '<span class="ayuda-limite ok">Sin límite</span>');
            secciones += `
                <div class="ayuda-item">
                    <div class="ayuda-icono">${t.icono}</div>
                    <div class="ayuda-texto">
                        <h5>${t.nombre} ${limite}</h5>
                        <p>${t.ayuda}</p>
                    </div>
                </div>`;
        });

        secciones += '<h4 class="ayuda-grupo">Cómo se usa</h4>';
        EXTRAS.forEach(t => {
            secciones += `
                <div class="ayuda-item">
                    <div class="ayuda-icono">${t.icono}</div>
                    <div class="ayuda-texto">
                        <h5>${t.nombre}</h5>
                        <p>${t.ayuda}</p>
                    </div>
                </div>`;
        });

        return `
        <div class="ayuda-modal" id="ayudaModal" role="dialog" aria-modal="true" aria-label="Ayuda del selector">
            <div class="ayuda-caja">
                <header class="ayuda-header">
                    <h3>¿Cómo funciona tu selector?</h3>
                    <button class="ayuda-cerrar" id="ayudaCerrar" aria-label="Cerrar ayuda">&times;</button>
                </header>
                <div class="ayuda-cuerpo">
                    <p class="ayuda-intro">
                        Aquí eliges qué fotos quieres de tus ${CFG.tipo || 'XV Años'}.
                        Nada se pierde: puedes cambiar de opinión las veces que quieras hasta que nos mandes tu selección.
                    </p>
                    ${secciones}
                    <div class="ayuda-contacto">
                        ¿Se te atoró algo? Escríbenos por WhatsApp:
                        <a href="https://wa.me/${CFG.telefono || ''}" target="_blank" rel="noopener">FORO 7</a>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function abrir() {
        const m = document.getElementById('ayudaModal');
        if (!m) return;
        m.classList.add('activa');
        document.body.style.overflow = 'hidden';
        try { localStorage.setItem(KEY_VISTA, '1'); } catch (e) {}
        const b = document.getElementById('ayudaPulso');
        if (b) b.classList.remove('pulso');
    }

    function cerrar() {
        const m = document.getElementById('ayudaModal');
        if (!m) return;
        m.classList.remove('activa');
        document.body.style.overflow = '';
    }

    function montar() {
        // En album.html?filtro=… la página es solo álbum: sin herramientas, sin ayuda.
        if (window.MOSTRAR_AYUDA === false) return;
        if (document.getElementById('ayudaModal')) return;

        document.body.insertAdjacentHTML('beforeend', construirHTML());

        // Botón flotante
        const btn = document.createElement('button');
        btn.id = 'ayudaPulso';
        btn.className = 'ayuda-fab';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Ayuda: qué hace cada herramienta');
        btn.innerHTML = '<span>?</span>';
        btn.addEventListener('click', abrir);
        document.body.appendChild(btn);

        // Pulsa la primera vez que entran
        try {
            if (!localStorage.getItem(KEY_VISTA)) btn.classList.add('pulso');
        } catch (e) {}

        document.getElementById('ayudaCerrar').addEventListener('click', cerrar);
        document.getElementById('ayudaModal').addEventListener('click', e => {
            if (e.target.id === 'ayudaModal') cerrar();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') cerrar();
            if ((e.key === '?' || (e.key === 'h' && !e.ctrlKey && !e.metaKey)) &&
                !/^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) {
                const abierto = document.getElementById('ayudaModal').classList.contains('activa');
                if (!abierto && !document.querySelector('.modal.active')) abrir();
            }
        });

        // Cualquier botón con id/clase de ayuda abre el modal
        document.querySelectorAll('[data-abrir-ayuda]').forEach(el => el.addEventListener('click', abrir));
    }

    window.AyudaSelector = { abrir, cerrar };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
    else montar();
})();
