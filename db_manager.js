// ============================================================
// db_manager.js - Datenzugriff für 09_Datenbankverwaltung.html
// ============================================================
// Bündelt die verschiedenen, im Portal verwendeten Datentöpfe (Spieler,
// Material, Trainings-/Spielhistorie, einzelne Einzeltrainings-Sitzungen)
// zu EINER gemeinsamen "Datenbank"-Ansicht für Export/Import/Reset.
//
// Alles liest/schreibt über Store (siehe sync-client.js) - dadurch zeigt
// diese Übersicht automatisch den zentralen, geräteübergreifenden Datenstand
// vom lokalen Server (Raspberry Pi/PC), nicht nur den dieses einen Browsers.
// ============================================================

(function (global) {
    'use strict';

    const KEYS = {
        spieler: 'esv_grein_spielerliste',
        platten: 'esv_grein_plattenmaterial',
        stingel: 'esv_grein_stingel',
        sessions: 'trainingsmodus_pro_historie' // Spiel-/Trainings-Sessions (Pro + Tablet)
    };

    const TRAINING_KEY_PREFIX = 'training_';
    const TRAINING_KEY_IGNORE = 'training_db_backup'; // eigener, unabhängiger Zweck (siehe unten)

    function safeArray(value) {
        return Array.isArray(value) ? value : [];
    }

    // -------- Einzelne Getter --------
    async function getSpieler() { return safeArray(Store.get(KEYS.spieler, [])); }
    async function getPlatten() { return safeArray(Store.get(KEYS.platten, [])); }
    async function getStingel() { return safeArray(Store.get(KEYS.stingel, [])); }
    async function getTrainingSessions() { return safeArray(Store.get(KEYS.sessions, [])); }

    // Einzeltrainings-Datensätze liegen unter dynamischen Schlüsseln
    // "training_<spielerId>_<datum>" (siehe 04_Trainingsanalyse.html). Store
    // spiegelt sie ganz normal in localStorage, daher reicht ein Scan der
    // bekannten Schlüssel.
    function trainingKeys() {
        try {
            return Object.keys(localStorage).filter(function (k) {
                return k.indexOf(TRAINING_KEY_PREFIX) === 0 && k !== TRAINING_KEY_IGNORE;
            });
        } catch (e) {
            return [];
        }
    }

    async function getTrainings() {
        return trainingKeys().map(function (k) {
            return Store.get(k, null);
        }).filter(Boolean);
    }

    // -------- Gesamtübersicht --------
    async function exportAllData() {
        const [spieler, trainings, platten, stingel, training_sessions] = await Promise.all([
            getSpieler(), getTrainings(), getPlatten(), getStingel(), getTrainingSessions()
        ]);
        return { spieler, trainings, platten, stingel, training_sessions };
    }

    async function importAllData(data) {
        if (Array.isArray(data.spieler)) Store.set(KEYS.spieler, data.spieler);
        if (Array.isArray(data.platten)) Store.set(KEYS.platten, data.platten);
        if (Array.isArray(data.stingel)) Store.set(KEYS.stingel, data.stingel);
        if (Array.isArray(data.training_sessions)) Store.set(KEYS.sessions, data.training_sessions);
        if (Array.isArray(data.trainings)) {
            data.trainings.forEach(function (t) {
                if (t && t.playerId && t.datum) {
                    Store.set(TRAINING_KEY_PREFIX + t.playerId + '_' + t.datum, t);
                }
            });
        }
    }

    async function resetDatabase() {
        Store.set(KEYS.spieler, []);
        Store.set(KEYS.platten, []);
        Store.set(KEYS.stingel, []);
        Store.set(KEYS.sessions, []);
        trainingKeys().forEach(function (k) { Store.remove(k); });
    }

    async function init() {
        // Store initialisiert sich selbst (siehe sync-client.js); hier reicht
        // es, kurz zu warten, bis der erste Abgleich mit dem Server (falls
        // vorhanden) durch ist, damit exportAllData()/refreshStats() direkt
        // den aktuellen Stand zeigen.
        if (global.Store && typeof global.Store.init === 'function') {
            await global.Store.init();
        }
        return true;
    }

    global.db = {
        init: init,
        getSpieler: getSpieler,
        getPlatten: getPlatten,
        getStingel: getStingel,
        getTrainings: getTrainings,
        getTrainingSessions: getTrainingSessions,
        exportAllData: exportAllData,
        importAllData: importAllData,
        resetDatabase: resetDatabase
    };
})(typeof window !== 'undefined' ? window : this);
