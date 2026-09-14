// ============================================================
// auth.js – Zugangssperre für das Trainingsportal ESV Grein
// ============================================================
// Wird von jedem Modul (dashboard.html, 01_Trainingsmodus.html, ...) per
// <script src="auth.js"></script> eingebunden. Die Module rufen anschließend
// requireGate() und requireLogin() auf - beide prüfen denselben Zugang und
// schicken bei fehlender Anmeldung zurück zu index.html (der eigentlichen
// Login-Seite/Startseite des Portals). Erst nach richtigem Code dort werden
// die restlichen Dateien "freigeschaltet".
//
// Die reinen Kiosk-Varianten für das fest verbaute Raspberry-Pi-Touchdisplay
// (z.B. 05_Trainingsmodus_Pro_Tablet.html) rufen requireGate()/requireLogin()
// bewusst NICHT auf - das Gerät steht ohnehin unter Aufsicht, ein Login wäre
// dort nur hinderlich. Das bleibt unverändert.

const AUTH_STORAGE_KEY = 'esv_grein_auth_ok';

// Pfad zur Login-Seite - liegt im selben Ordner wie alle anderen Module,
// daher reicht ein einfacher Dateiname (funktioniert lokal per Doppelklick
// genauso wie auf GitHub Pages).
const LOGIN_PAGE = 'index.html';

function isAuthenticated() {
    try {
        return localStorage.getItem(AUTH_STORAGE_KEY) === '1';
    } catch (e) {
        // z.B. wenn localStorage blockiert ist (privater Modus o.ä.) -
        // im Zweifel NICHT durchlassen, sondern zur Anmeldung schicken.
        return false;
    }
}

// requireGate() und requireLogin() prüfen bewusst denselben Zugang - beide
// Namen existieren, weil alle Module sie bereits direkt nacheinander
// aufrufen; sie an dieser Stelle zu trennen würde nur unnötige Komplexität
// bringen, ohne dass es hier zwei unterschiedliche Zugangsstufen gibt.
function requireGate() {
    if (!isAuthenticated()) {
        window.location.replace(LOGIN_PAGE);
    }
}

function requireLogin() {
    if (!isAuthenticated()) {
        window.location.replace(LOGIN_PAGE);
    }
}

// Wird von den "Abmelden"-Links/Buttons in den Modulen aufgerufen.
function logout() {
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch (e) {}
    window.location.href = LOGIN_PAGE;
}