// ============================================================
// sync-client.js - zentrale Datenablage ueber den lokalen Server
// ============================================================
// Stellt "Store" bereit - ein Ersatz fuer die direkten localStorage-Aufrufe,
// die bisher in jedem Modul verwendet wurden. Store.get()/Store.set() lesen
// und schreiben weiterhin SOFORT in den Browser-Speicher (localStorage) -
// die Seite bleibt also genauso schnell und funktioniert genauso offline
// wie bisher.
//
// ZUSAETZLICH speichert Store.set() im Hintergrund auch am lokalen Server
// (Raspberry Pi/PC, siehe server.py), und beim Laden der Seite sowie alle
// paar Sekunden danach holt Store die aktuellen Werte vom Server und
// uebernimmt sie in den Browser-Speicher, falls sich dort etwas geaendert
// hat (z.B. weil an einem ANDEREN Geraet ein Spieler hinzugefuegt wurde).
// Wer per Store.onChange() auf einen Schluessel "hoert", bekommt dann
// automatisch die neuen Daten und kann die Ansicht neu aufbauen.
//
// Ist kein Server erreichbar (Seite direkt per Doppelklick/file:// geoeffnet,
// oder der Pi/PC gerade aus), funktioniert alles unveraendert nur lokal -
// genau wie vor dieser Erweiterung. Es ist also nichts kaputt, wenn kein
// Server laeuft.
// ============================================================

(function (global) {
    'use strict';

    const API_KV = '/api/kv/';
    const API_KV_ALL = '/api/kv';
    const API_HEALTH = '/api/health';
    const POLL_INTERVAL_MS = 4000;
    const PUSH_DEBOUNCE_MS = 250;
    const FETCH_TIMEOUT_MS = 3000;

    const listeners = Object.create(null);   // key -> Set(callback)
    const pushTimers = Object.create(null);  // key -> setTimeout id
    let serverAvailable = null;              // null = noch nicht geprueft
    let pollTimer = null;
    let initPromise = null;

    function canUseNetwork() {
        // Ueber file:// (Doppelklick, ohne Server) sind fetch()-Aufrufe auf
        // "/api/..." sinnlos/unzuverlaessig - dann direkt offline bleiben.
        return typeof fetch === 'function' &&
            (global.location.protocol === 'http:' || global.location.protocol === 'https:');
    }

    function fetchWithTimeout(url, options) {
        const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const opts = Object.assign({}, options);
        if (controller) opts.signal = controller.signal;
        const timeoutId = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;
        return fetch(url, opts).finally(() => { if (timeoutId) clearTimeout(timeoutId); });
    }

    function readLocal(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function writeLocal(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            // z.B. privater Modus / Speicher voll - Server-Sync versuchen wir
            // trotzdem weiter, nur der lokale Cache faellt dann aus.
        }
    }

    function removeLocal(key) {
        try { localStorage.removeItem(key); } catch (e) {}
    }

    function sameValue(a, b) {
        try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return a === b; }
    }

    function notify(key, value) {
        const set = listeners[key];
        if (!set) return;
        set.forEach(function (fn) {
            try { fn(value); } catch (err) { console.error('Store.onChange Fehler fuer "' + key + '":', err); }
        });
    }

    // ---------------- Oeffentliche Lese-/Schreibfunktionen ----------------

    function get(key, fallback) {
        return readLocal(key, fallback);
    }

    function set(key, value) {
        writeLocal(key, value);
        schedulePush(key);
        return value;
    }

    function remove(key) {
        removeLocal(key);
        if (canUseNetwork()) {
            fetchWithTimeout(API_KV + encodeURIComponent(key), { method: 'DELETE' }).catch(function () {});
        }
    }

    function onChange(key, callback) {
        if (!listeners[key]) listeners[key] = new Set();
        listeners[key].add(callback);
        return function unsubscribe() { listeners[key].delete(callback); };
    }

    function isServerAvailable() {
        return serverAvailable;
    }

    // ---------------- Hintergrund-Synchronisierung ----------------

    // Stellt sicher, dass Hintergrund-Pushes erst NACH dem ersten Abgleich mit
    // dem Server gesendet werden. Ohne das koennte ein synchroner "Standard-
    // werte setzen, falls noch nichts gespeichert ist"-Schreibvorgang beim
    // Laden der Seite (z.B. Spielerliste mit Default-Spielern befuellen, wenn
    // localStorage noch leer ist) den echten, gerade vom Server geholten
    // Datenstand ueberschreiben - und zwar noch BEVOR der erste Abgleich
    // ueberhaupt abgeschlossen ist. init() startet sich hierdurch bei Bedarf
    // auch schon vor DOMContentLoaded von selbst (idempotent, siehe init()).
    function ensureReady() {
        return init();
    }

    function schedulePush(key) {
        if (!canUseNetwork()) return;
        clearTimeout(pushTimers[key]);
        pushTimers[key] = setTimeout(function () {
            ensureReady().then(function () {
                // Immer den AKTUELL in localStorage stehenden Wert senden statt
                // dem Wert von damals, als Store.set() aufgerufen wurde -
                // zwischenzeitlich koennte applyRemote() localStorage bereits
                // mit dem echten Server-Stand ueberschrieben haben.
                const currentValue = readLocal(key, null);
                return fetchWithTimeout(API_KV + encodeURIComponent(key), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: currentValue })
                });
            }).then(function (res) {
                serverAvailable = !!(res && res.ok);
            }).catch(function () {
                serverAvailable = false;
            });
        }, PUSH_DEBOUNCE_MS);
    }

    function pullAll() {
        if (!canUseNetwork()) return Promise.resolve(null);
        return fetchWithTimeout(API_KV_ALL, { cache: 'no-store' })
            .then(function (res) { return res && res.ok ? res.json() : null; })
            .then(function (body) { return body && body.data ? body.data : null; })
            .catch(function () { return null; });
    }

    function checkHealth() {
        if (!canUseNetwork()) { serverAvailable = false; return Promise.resolve(false); }
        return fetchWithTimeout(API_HEALTH, { cache: 'no-store' })
            .then(function (res) { serverAvailable = !!(res && res.ok); return serverAvailable; })
            .catch(function () { serverAvailable = false; return false; });
    }

    function applyRemote(remoteData) {
        if (!remoteData) return;
        Object.keys(remoteData).forEach(function (key) {
            const remoteValue = remoteData[key];
            const localValue = readLocal(key, undefined);
            if (!sameValue(localValue, remoteValue)) {
                writeLocal(key, remoteValue);
                notify(key, remoteValue);
            }
        });
    }

    function poll() {
        if (typeof document !== 'undefined' && document.hidden) return; // Tab im Hintergrund: sparen
        pullAll().then(function (remote) {
            if (remote) { serverAvailable = true; applyRemote(remote); }
            else { serverAvailable = false; }
        });
    }

    // Einmalig beim Start: pruefen ob ein Server da ist, einmal alle Daten
    // abgleichen, danach regelmaessig im Hintergrund weiter abgleichen.
    function init() {
        if (initPromise) return initPromise;
        initPromise = checkHealth().then(function (ok) {
            if (!ok) return;
            return pullAll().then(applyRemote);
        }).then(function () {
            if (serverAvailable && !pollTimer) {
                pollTimer = setInterval(poll, POLL_INTERVAL_MS);
            }
        });
        return initPromise;
    }

    // Beim Zurueckkommen aus dem Hintergrund (Tab wieder aktiv) sofort einmal
    // abgleichen, statt bis zu POLL_INTERVAL_MS zu warten.
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) poll();
        });
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    global.Store = {
        get: get,
        set: set,
        remove: remove,
        onChange: onChange,
        isServerAvailable: isServerAvailable,
        init: init,
        // fuer gezielte Sonderfaelle (z.B. "jetzt sofort neu abgleichen"-Button)
        refresh: poll
    };
})(typeof window !== 'undefined' ? window : this);
