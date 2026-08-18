// ============================================================
// DATENBANK-MANAGER FÜR TRAININGSPORTAL ESV GREIN
// ============================================================
// Verwendet IndexedDB als lokale Datenbank im Browser.
// Alle Daten werden auf dem Gerät gespeichert - kein externer Server nötig.
// ============================================================

const DB_CONFIG = {
    name: 'ESV_Grein_Training_DB',
    version: 3,
    stores: {
        spieler: { keyPath: 'id', indexes: ['name', 'verein'] },
        trainings: { keyPath: 'id', indexes: ['playerId', 'datum', 'playerId_datum'] },
        platten: { keyPath: 'id', indexes: ['bezeichnung', 'hersteller'] },
        stingel: { keyPath: 'id', indexes: ['bezeichnung', 'material'] },
        training_sessions: { keyPath: 'id', indexes: ['playerId', 'date'] },
        settings: { keyPath: 'key' }
    }
};

class TrainingDatabase {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this._pendingRequests = [];
    }

    // ============================================================
    // DATENBANK ÖFFNEN / INITIALISIEREN
    // ============================================================
    async init() {
        if (this.isInitialized && this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;

                // Object Stores für jede Entität
                Object.entries(DB_CONFIG.stores).forEach(([storeName, config]) => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: config.keyPath || 'id' });
                        if (config.indexes) {
                            config.indexes.forEach(index => {
                                store.createIndex(index, index, { unique: false });
                            });
                        }
                    }
                });

                // Bei Upgrade: bestehende Stores aktualisieren
                if (oldVersion > 0) {
                    this._migrateData(db, oldVersion);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                this._processPendingRequests();
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB Fehler:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    _processPendingRequests() {
        while (this._pendingRequests.length > 0) {
            const { resolve, reject, operation } = this._pendingRequests.shift();
            try {
                const result = operation();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
    }

    _migrateData(db, oldVersion) {
        // Datenmigration bei Versionswechsel
        console.log(`Migriere Datenbank von Version ${oldVersion} auf ${DB_CONFIG.version}`);
    }

    // ============================================================
    // GENERISCHE CRUD-OPERATIONEN
    // ============================================================
    async _executeTransaction(storeName, mode, callback) {
        await this.init();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                this._pendingRequests.push({ resolve, reject, operation: () => this._executeTransaction(storeName, mode, callback) });
                return;
            }

            try {
                const transaction = this.db.transaction(storeName, mode);
                const store = transaction.objectStore(storeName);
                const result = callback(store);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }

    // ============================================================
    // SPIELER
    // ============================================================
    async getSpieler() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('spieler', 'readonly');
            const store = transaction.objectStore('spieler');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveSpieler(spieler) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('spieler', 'readwrite');
            const store = transaction.objectStore('spieler');
            const request = store.put(spieler);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteSpieler(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('spieler', 'readwrite');
            const store = transaction.objectStore('spieler');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ============================================================
    // TRAININGS
    // ============================================================
    async getTrainings(playerId = null) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('trainings', 'readonly');
            const store = transaction.objectStore('trainings');
            let request;

            if (playerId) {
                const index = store.index('playerId');
                request = index.getAll(playerId);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveTraining(training) {
        await this.init();
        if (!training.id) {
            training.id = this.generateId('T');
        }
        training.timestamp = new Date().toISOString();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('trainings', 'readwrite');
            const store = transaction.objectStore('trainings');
            const request = store.put(training);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteTraining(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('trainings', 'readwrite');
            const store = transaction.objectStore('trainings');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ============================================================
    // PLATTENMATERIAL
    // ============================================================
    async getPlatten() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('platten', 'readonly');
            const store = transaction.objectStore('platten');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async savePlatte(platte) {
        await this.init();
        if (!platte.id) {
            platte.id = this.generateId('PM');
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('platten', 'readwrite');
            const store = transaction.objectStore('platten');
            const request = store.put(platte);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deletePlatte(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('platten', 'readwrite');
            const store = transaction.objectStore('platten');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ============================================================
    // STINGEL
    // ============================================================
    async getStingel() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('stingel', 'readonly');
            const store = transaction.objectStore('stingel');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveStingel(stingel) {
        await this.init();
        if (!stingel.id) {
            stingel.id = this.generateId('ST');
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('stingel', 'readwrite');
            const store = transaction.objectStore('stingel');
            const request = store.put(stingel);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteStingel(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('stingel', 'readwrite');
            const store = transaction.objectStore('stingel');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ============================================================
    // TRAININGSSITZUNGEN (für Trainingsanalyse)
    // ============================================================
    async getTrainingSessions(playerId = null) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('training_sessions', 'readonly');
            const store = transaction.objectStore('training_sessions');
            let request;

            if (playerId) {
                const index = store.index('playerId');
                request = index.getAll(playerId);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveTrainingSession(session) {
        await this.init();
        if (!session.id) {
            session.id = this.generateId('S');
        }
        session.timestamp = new Date().toISOString();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('training_sessions', 'readwrite');
            const store = transaction.objectStore('training_sessions');
            const request = store.put(session);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteTrainingSession(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('training_sessions', 'readwrite');
            const store = transaction.objectStore('training_sessions');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ============================================================
    // SETTINGS / KONFIGURATION
    // ============================================================
    async getSetting(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('settings', 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    }

    async saveSetting(key, value) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('settings', 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ============================================================
    // HILFSFUNKTIONEN
    // ============================================================
    generateId(prefix = '') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}${timestamp}${random}`;
    }

    // ============================================================
    // EXPORT / IMPORT (JSON)
    // ============================================================
    async exportAllData() {
        const data = {
            version: DB_CONFIG.version,
            exportDate: new Date().toISOString(),
            spieler: await this.getSpieler(),
            trainings: await this.getTrainings(),
            platten: await this.getPlatten(),
            stingel: await this.getStingel(),
            training_sessions: await this.getTrainingSessions(),
            settings: await this.getAllSettings()
        };
        return data;
    }

    async getAllSettings() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('settings', 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async importAllData(data) {
        await this.init();
        const stores = ['spieler', 'platten', 'stingel'];

        for (const storeName of stores) {
            if (data[storeName] && Array.isArray(data[storeName])) {
                const transaction = this.db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                store.clear();

                for (const item of data[storeName]) {
                    store.put(item);
                }

                await new Promise((resolve, reject) => {
                    transaction.oncomplete = resolve;
                    transaction.onerror = () => reject(transaction.error);
                });
            }
        }

        return { success: true, message: 'Daten erfolgreich importiert' };
    }

    // ============================================================
    // DATENBANK LÖSCHEN (Reset)
    // ============================================================
    async resetDatabase() {
        if (!this.db) {
            await this.init();
        }
        const storeNames = Array.from(this.db.objectStoreNames);
        for (const storeName of storeNames) {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            store.clear();
            await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });
        }
        return { success: true, message: 'Datenbank wurde zurückgesetzt' };
    }

    // ============================================================
    // DATENBANK SCHLIESSEN
    // ============================================================
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }
}

// ============================================================
// SINGLETON-INSTANZ
// ============================================================
const db = new TrainingDatabase();

// ============================================================
// EXPORT FÜR ANDERE MODULE
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { db, TrainingDatabase };
} else {
    // Für Browser
    window.db = db;
    window.TrainingDatabase = TrainingDatabase;
    console.log('✅ Datenbank-Manager geladen. Verfügbare Funktionen: db.getSpieler(), db.saveTraining(), db.exportAllData(), ...');
}