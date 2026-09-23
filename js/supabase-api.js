/* ============================================================
   CAPA DE DATOS SUPABASE — XV Años Thaily Rodríguez
   Compartida por selector.js y album.js.

   PROTOCOLO (obligatorio, no cambiar a la ligera)
   -----------------------------------------------
   La tabla `selecciones` tiene el trigger BEFORE INSERT/UPDATE
   `reject_old_code_version`, que DESCARTA EN SILENCIO (devuelve
   201 pero no guarda nada) cualquier fila que no cumpla:

     1. code_version >= 3            → mandamos CODE_VERSION = 6
     2. datos._sync.clock > 0        → reloj lógico por foto
     3. clock entrante > clock guardado para (evento_id, foto_index)

   Por eso cada escritura lee primero la fila remota, calcula el
   siguiente reloj y recién entonces escribe. Los relojes vividos
   se guardan en localStorage para sobrevivir recargas.

   Borrar una foto = escribir la fila con todo en false y
   _sync.deleted = true (borrado suave), igual que el resto de
   los selectores de FORO 7.
   ============================================================ */
(function (global) {
'use strict';

const CFG      = global.EVENT_CONFIG || {};
const URL_BASE = CFG.supabaseUrl;
const ANON     = CFG.supabaseAnon;
const SLUG     = CFG.slug;
const HEADERS  = {
    'apikey':        ANON,
    'Authorization': 'Bearer ' + ANON,
    'Content-Type':  'application/json'
};

const CODE_VERSION = 6;
const CATS         = (global.HERRAMIENTAS || []).map(t => t.id);   // impresion, ampliacion, album, descartada
const CLOCK_KEY    = 'thailyrodriguez_relojes_v1';

/* ── Sesión ───────────────────────────────────────────────── */
function getSessionId() {
    const KEY = 'foro7_sid';
    let s = localStorage.getItem(KEY);
    if (!s) {
        s = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
        localStorage.setItem(KEY, s);
    }
    return s;
}
const SESSION_ID = getSessionId();

/* ── Relojes lógicos por foto ─────────────────────────────── */
function leerRelojes() {
    try { return JSON.parse(localStorage.getItem(CLOCK_KEY) || '{}'); }
    catch (e) { return {}; }
}
function guardarRelojes(r) {
    try { localStorage.setItem(CLOCK_KEY, JSON.stringify(r)); } catch (e) {}
}
function recordarReloj(idx, clock) {
    if (!clock) return;
    const r = leerRelojes();
    r[String(idx)] = Math.max(Number(r[String(idx)] || 0), Number(clock));
    guardarRelojes(r);
}
function siguienteReloj(idx, relojRemoto) {
    const r = leerRelojes();
    const n = Math.max(Number(r[String(idx)] || 0), Number(relojRemoto || 0)) + 1;
    r[String(idx)] = n;
    guardarRelojes(r);
    return n;
}

/* ── Normalización ────────────────────────────────────────── */
function normalizar(sel) {
    const limpio = {};
    CATS.forEach(c => { limpio[c] = !!(sel && sel[c]); });
    limpio.notes = (sel && typeof sel.notes === 'string') ? sel.notes.trim() : '';
    return limpio;
}

function tieneAlgo(sel) {
    const s = normalizar(sel);
    return CATS.some(c => s[c]) || !!s.notes;
}

function metaDe(row) {
    const datos = (row && row.datos) ? row.datos : row;
    const m = (datos && datos._sync) ? datos._sync : {};
    return {
        clock:   Number(m.clock || 0),
        sid:     m.sid || '',
        deleted: !!m.deleted
    };
}

/* Fila de Supabase → selección. `datos` manda; si viene vacía
   (filas viejas) se reconstruye desde las columnas booleanas. */
function filaASeleccion(row) {
    const base = (row.datos && Object.keys(row.datos).length)
        ? row.datos
        : { impresion: row.impresion, ampliacion: row.ampliacion, descartada: row.descartada, album: false };
    return normalizar(base);
}

/* ── Evento ───────────────────────────────────────────────── */
let eventoIdCache = null;
async function getEventoId() {
    if (eventoIdCache) return eventoIdCache;
    const r = await fetch(
        `${URL_BASE}/rest/v1/eventos?slug=eq.${SLUG}&select=id&limit=1`,
        { headers: HEADERS }
    );
    if (!r.ok) throw new Error('eventos ' + r.status);
    const [ev] = await r.json();
    if (!ev || !ev.id) throw new Error('Evento "' + SLUG + '" no existe en Supabase');
    eventoIdCache = ev.id;
    return eventoIdCache;
}

const SELECT_COLS = 'foto_index,datos,impresion,ampliacion,invitacion,descartada';

async function filaRemota(eid, idx) {
    const r = await fetch(
        `${URL_BASE}/rest/v1/selecciones?evento_id=eq.${eid}&foto_index=eq.${idx}&select=${SELECT_COLS}&limit=1`,
        { headers: HEADERS }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return rows[0] || null;
}

async function escribir(row) {
    const r = await fetch(`${URL_BASE}/rest/v1/selecciones?on_conflict=evento_id,foto_index`, {
        method:  'POST',
        headers: Object.assign({}, HEADERS, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
        body:    JSON.stringify([row])
    });
    if (!r.ok) throw new Error('upsert ' + r.status);
}

function armarFila(eid, idx, sel, clock, borrada, filename) {
    const datos = normalizar(sel);
    datos._sync = {
        clock:     clock,
        sid:       SESSION_ID,
        updatedAt: new Date().toISOString(),
        deleted:   !!borrada
    };
    if (filename) datos.filename = filename;
    return {
        evento_id:    eid,
        session_id:   SESSION_ID,
        foto_index:   idx,
        impresion:    datos.impresion,
        ampliacion:   !!datos.ampliacion,   // la columna existe aunque este evento no la use
        invitacion:   false,               // este evento no contrató invitación web
        descartada:   datos.descartada,
        datos:        datos,
        code_version: CODE_VERSION
    };
}

/* ============================================================
   API PÚBLICA
   ============================================================ */

/* Devuelve { "12": {impresion:true, ampliacion:false, album:true, descartada:false, notes:''}, … } */
async function fetchSelecciones() {
    const eid = await getEventoId();
    const r = await fetch(
        `${URL_BASE}/rest/v1/selecciones?evento_id=eq.${eid}&select=${SELECT_COLS}`,
        { headers: HEADERS }
    );
    if (!r.ok) throw new Error('selecciones ' + r.status);
    const rows = await r.json();

    const out = {};
    const relojes = leerRelojes();
    rows.forEach(row => {
        const meta = metaDe(row);
        if (meta.clock) {
            relojes[String(row.foto_index)] = Math.max(Number(relojes[String(row.foto_index)] || 0), meta.clock);
        }
        if (meta.deleted) return;
        const sel = filaASeleccion(row);
        if (tieneAlgo(sel)) out[row.foto_index] = sel;
    });
    guardarRelojes(relojes);
    return out;
}

/* Guarda UNA foto. Si otro dispositivo va más adelantado,
   devuelve 'desactualizado' para que quien llame recargue. */
async function guardarFoto(idx, sel, filename) {
    const eid    = await getEventoId();
    const remota = await filaRemota(eid, idx);
    const meta   = metaDe(remota);
    const local  = Number(leerRelojes()[String(idx)] || 0);

    if (meta.clock > local && meta.sid !== SESSION_ID) {
        recordarReloj(idx, meta.clock);
        return 'desactualizado';
    }

    const clock = siguienteReloj(idx, meta.clock);
    await escribir(armarFila(eid, idx, sel, clock, false, filename));
    return 'ok';
}

/* Borrado suave de UNA foto. */
async function borrarFoto(idx) {
    const eid    = await getEventoId();
    const remota = await filaRemota(eid, idx);
    if (!remota) return 'ok';                 // nunca se guardó: nada que borrar
    const meta   = metaDe(remota);
    const local  = Number(leerRelojes()[String(idx)] || 0);

    if (meta.clock > local && meta.sid !== SESSION_ID) {
        recordarReloj(idx, meta.clock);
        return 'desactualizado';
    }

    const clock = siguienteReloj(idx, meta.clock);
    await escribir(armarFila(eid, idx, {}, clock, true));
    return 'ok';
}

/* Sube en bloque (migración de localStorage → nube). Secuencial
   para no saturar y porque cada foto necesita leer su reloj. */
async function subirTodas(selecciones, nombres) {
    const entradas = Object.entries(selecciones).filter(([, s]) => tieneAlgo(s));
    for (const [idx, sel] of entradas) {
        const i = parseInt(idx, 10);
        try { await guardarFoto(i, sel, nombres && nombres[idx]); }
        catch (e) { console.warn('[Supabase] foto ' + i + ':', e.message); }
    }
}

/* Borrado duro de todo el evento (el trigger no aplica a DELETE). */
async function borrarTodas() {
    const eid = await getEventoId();
    await fetch(`${URL_BASE}/rest/v1/selecciones?evento_id=eq.${eid}`, {
        method: 'DELETE', headers: HEADERS
    });
    guardarRelojes({});
}

async function registrarVisita(pagina) {
    try {
        const eid = await getEventoId();
        await fetch(`${URL_BASE}/rest/v1/visitas`, {
            method:  'POST',
            headers: Object.assign({}, HEADERS, { 'Prefer': 'return=minimal' }),
            body:    JSON.stringify({ evento_id: eid, pagina: pagina || 'selector', session_id: SESSION_ID })
        });
    } catch (e) { /* silencioso */ }
}

global.SB = {
    SESSION_ID,
    CODE_VERSION,
    getEventoId,
    fetchSelecciones,
    guardarFoto,
    borrarFoto,
    subirTodas,
    borrarTodas,
    registrarVisita,
    tieneAlgo,
    normalizar
};

})(window);
