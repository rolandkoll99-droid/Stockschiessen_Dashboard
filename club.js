// ============================================================
// club.js - Vereinslogo & Vereinsname fuer die gemeinsame Kopfzeile
// ============================================================
// Traegt Logo/Name in jedes ".club-brand"-Element ein (siehe theme.css).
// Wird als <script defer src="club.js"> eingebunden, laeuft also automatisch
// nach dem Einlesen des HTML - kein DOMContentLoaded-Handler noetig.
//
// ANPASSEN: Einfach CLUB_NAME und/oder CLUB_LOGO_SRC unten ersetzen und die
// Datei speichern. Ohne eigenes Logo bleibt CLUB_LOGO_SRC leer - dann wird
// nur der Vereinsname angezeigt (siehe .club-logo[src=""] in theme.css).
// ============================================================

const CLUB_NAME = 'ESV Grein';

// Pfad zu einem eigenen Vereinslogo (z.B. 'logo.png') - aktuell das
// generische Portal-Icon, da kein Vereinslogo hinterlegt ist.
const CLUB_LOGO_SRC = 'icons/icon-192.png';

document.querySelectorAll('.club-brand').forEach(function (brand) {
    const nameEl = brand.querySelector('.club-name');
    const logoEl = brand.querySelector('.club-logo');

    if (nameEl) nameEl.textContent = CLUB_NAME;

    if (logoEl) {
        if (CLUB_LOGO_SRC) {
            logoEl.src = CLUB_LOGO_SRC;
            logoEl.alt = CLUB_NAME + ' Logo';
            // Falls das Bild nicht geladen werden kann, sauber ausblenden statt
            // eines kaputten Bild-Icons.
            logoEl.addEventListener('error', function () {
                logoEl.removeAttribute('src');
            });
        } else {
            logoEl.removeAttribute('src');
        }
    }
});
