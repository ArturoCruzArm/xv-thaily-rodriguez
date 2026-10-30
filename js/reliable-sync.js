/* Durable per-photo changes. transport.write must verify the server readback. */
(function (global) {
'use strict';
global.createSelectionSync = function (options) {
    const copy = value => JSON.parse(JSON.stringify(value));
    const storage = options.storage || localStorage;
    const key = options.key + '_pending_v2';
    let pending = JSON.parse(storage.getItem(key) || '{}');
    let busy = false;
    let state = {};
    const persist = () => storage.setItem(key, JSON.stringify(pending));
    function overlay(remote) {
        const result = copy(remote);
        Object.entries(pending).forEach(([name, change]) => {
            if (change.value === null) delete result[name];
            else result[name] = copy(change.value);
        });
        state = result;
        options.apply(copy(result));
    }
    async function refresh() {
        if (busy) return;
        busy = true;
        options.status('Comprobando guardado…');
        try {
            let remote = await options.read();
            overlay(remote);
            // Changes arriving during a request remain pending for the next pass.
            for (let attempt = 0; Object.keys(pending).length && attempt < 4; attempt++) {
                options.status('Guardando en la nube…');
                const batch = copy(pending);
                await options.write(batch);
                Object.keys(batch).forEach(name => {
                    if (pending[name]?.revision === batch[name].revision) delete pending[name];
                });
                persist();
                remote = await options.read();
                overlay(remote);
            }
            options.status(Object.keys(pending).length ? 'Guardado local; hay cambios pendientes' : 'Guardado en la nube ✓');
        } catch (error) {
            options.status('Pendiente de conexión — tus cambios siguen en este dispositivo');
            options.error?.(error);
        } finally { busy = false; }
    }
    function change(name, value) {
        pending[name] = { value: copy(value), revision: crypto.randomUUID() };
        persist();
        if (value === null) delete state[name]; else state[name] = copy(value);
        options.status('Guardado en este dispositivo; enviando…');
        void refresh();
    }
    return { refresh, change, pending: () => copy(pending) };
};
})(typeof window === 'undefined' ? globalThis : window);
