/* ============================================================
   CONFIG ÚNICA DEL EVENTO — XV Años Thaily Rodríguez
   Cambiar SOLO aquí. Todas las páginas leen de window.EVENT_CONFIG.
   ============================================================ */
window.EVENT_CONFIG = {
    // ── Identidad ─────────────────────────────────────────────
    slug:        'xv-thaily-rodriguez',
    nombre:      'Thaily Rodríguez',
    nombreCorto: 'Thaily',
    tipo:        'XV Años',

    // ── Fecha (mes en base 0: 9 = octubre) ────────────────────
    fechaEvento: new Date(2026, 9, 31, 19, 0, 0),
    fechaTexto:  'Sábado 31 de octubre de 2026',

    // ── Contacto ──────────────────────────────────────────────
    telefono:        '524779203776',   // WhatsApp FORO 7
    contactoTitular: 'Elizabeth Rodríguez', // mamá; su WhatsApp aparece como Óptica BZ

    // ── Paquete contratado ────────────────────────────────────
    // Paquete 1 modificado: se cambió la cobertura de la misa por
    // una ampliación más grande (20x24") y se incluyó la
    // invitación web sin costo.
    paquete: {
        nombre:          'Fotografía y Video · Paquete 1 modificado',
        fotosImpresas:   50,
        medidaImpresion: '5x7 pulgadas',
        ampliaciones:    1,
        videoHoras:      '2:00 hrs en 4K (original y copia)',
        incluye: [
            '50 fotos del evento impresas en 5x7 pulgadas',
            '1 película USB en 4K de 2:00 hrs, original y copia',
            '1 caja impresa para la USB',
            '1 caja impresa para las fotografías',
            '1 fotografía ampliada a 20x24 pulgadas',
            '1 sesión fotográfica antes del evento o el día del evento',
            '4 horas de recepción',
            'Invitación web (cortesía)'
        ]
    },

    // ── Límites del selector ──────────────────────────────────
    limiteImpresion:    50,
    limiteAmpliacion:   1,      // la ampliación 20x24 pulgadas
    limiteAlbum:        null,   // null = sin límite
    costoFotoAdicional: 15,     // MXN por foto impresa extra

    // ── Supabase ──────────────────────────────────────────────
    supabaseUrl:  'https://nzpujmlienzfetqcgsxz.supabase.co',
    supabaseAnon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVqbWxpZW56ZmV0cWNnc3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODYzMzYsImV4cCI6MjA5MDI2MjMzNn0.xl3lsb-KYj5tVLKTnzpbsdEGoV9ySnswH4eyRuyEH1s'
};

/* ============================================================
   HERRAMIENTAS DEL SELECTOR
   Este arreglo define TODO: tarjetas de conteo, botones de
   filtro, botones del modal, colores, textos de ayuda y los
   filtros válidos de album.html?filtro=…
   Thaily SÍ lleva "Ampliación": su paquete incluye una
   fotografía ampliada a 20x24 pulgadas.
   ============================================================ */
(function (C) {
window.HERRAMIENTAS = [
    {
        id:      'impresion',
        icono:   '📸',
        nombre:  'Impresión',
        textoBtn:'Impresión (' + C.paquete.medidaImpresion.replace(' pulgadas', '') + ')',
        limite:  C.limiteImpresion,
        fraseIncluida: C.paquete.fotosImpresas + ' fotos impresas en ' + C.paquete.medidaImpresion,
        columna: 'impresion',
        ayuda:   'Marca las fotos que quieres <strong>impresas en papel tamaño ' + C.paquete.medidaImpresion +
                 '</strong>. Tu paquete incluye ' + C.limiteImpresion + '. Si marcas más, abajo aparece un aviso naranja ' +
                 'con el costo extra ($' + C.costoFotoAdicional + ' MXN por foto adicional). Estas son las fotos que ' +
                 'recibes físicas en tu caja impresa.'
    },
    {
        id:      'ampliacion',
        icono:   '🖼️',
        nombre:  'Ampliación',
        textoBtn:'Ampliación 20x24',
        limite:  C.limiteAmpliacion,
        columna: 'ampliacion',
        ayuda:   'La foto que quieres <strong>ampliada a 20x24 pulgadas</strong> (unos 50x60 cm). Tu paquete incluye ' +
                 '<strong>1</strong>, así que elige la que más te guste: es la que va a colgarse en tu casa. ' +
                 'Si marcas más de una te decimos cuánto cuesta cada ampliación extra.'
    },
    {
        id:      'album',
        icono:   '📖',
        nombre:  'Álbum Digital',
        textoBtn:'Álbum Digital',
        limite:  null,
        columna: 'datos.album',
        ayuda:   'Las fotos que quieres en tu <strong>álbum digital</strong>: la galería en línea que puedes compartir por WhatsApp con familia y amigos. No tiene límite y no cuesta extra. Marca aquí tus favoritas aunque ya las hayas marcado para impresión.'
    },
    {
        id:      'descartada',
        icono:   '❌',
        nombre:  'Descartadas',
        textoBtn:'Descartar',
        limite:  null,
        columna: 'descartada',
        ayuda:   'Fotos que <strong>no quieres</strong> (saliste parpadeando, movida, repetida…). Al descartarlas <strong>desaparecen de la vista general</strong> para que no estorben mientras eliges. No se borran: siempre puedes verlas en el filtro «Descartadas» y quitarles la marca si te arrepientes.'
    }
];
})(window.EVENT_CONFIG);
