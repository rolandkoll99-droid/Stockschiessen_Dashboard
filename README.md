# Trainingsportal

Statische Website mit Passwortsperre, Login, Dashboard und 5 Trainingsmodulen.

## Design

Einheitliches, modernes Theme über alle Seiten: dunkler Hintergrund mit
dezentem Verlauf, Eisblau (`#33c5ff`) als Akzentfarbe, „Space Grotesk" für
Überschriften und „Inter" als Fließtext-Schrift. Jede Modulseite hat eine
Topbar mit Link zurück zum Dashboard und einem Abmelden-Button.

Bei den Modulen 02 und 04 wurde die weiße Inhaltskarte (Tabellen, Ranking,
Analyse-Ansicht) bewusst beibehalten, da sie für die Lesbarkeit von Daten
wichtig ist – nur der Rahmen (Hintergrund, Kopfzeile, Navigation) wurde an
das neue Theme angepasst. Team- bzw. bahnspezifische Farben (Grün/Rot für
Mannschaften, Blau für „Bahn 1") sind funktional und wurden nicht verändert.

## Dateien

```
index.html                     Passwortschutz (Zugangscode-Eingabe)
login.html                     Login (Benutzername + Passwort)
dashboard.html                 Übersicht / Startseite nach dem Login
01_Trainingsmodus.html         Modul 1: Freies Training ohne Zeitdruck
05_Trainingsmodus_Pro.html     Modul 2: Freies Training mit Zusatztastatur
04_Trainingsanalyse.html       Modul 3: Trainingsanalyse / Auswertung
06_Einzeltraining.html         Modul 4: Einzeltraining mit Anleitung
02_Spielerverwaltung.html      Modul 5: Verwaltung der Spielerprofile
02_Spielerliste.xlsx           Beispiel-/Vorlagendatei für den Excel-Import
style.css                      gemeinsames Design (Basistheme)
auth.js                        zentrale, einfache Zugriffslogik (Passwort, Login, Logout)
Defensiv Basis.jpg             Situationsbilder für das Einzeltraining
Defensiv Elite.jpg
Offensiv Basic.jpg
Offensiv Elite.jpg
```

Hinweis: Die Modulnummern in den Dateinamen sind historisch gewachsen und
entsprechen nicht der Reihenfolge im Dashboard – im Dashboard sind alle
fünf Module unter sprechenden Titeln (01–05) verlinkt.

## So legst du das Projekt auf GitHub an

1. **Repository erstellen**
   Auf github.com oben rechts auf **+ → New repository** klicken. Namen vergeben
   (z. B. `trainingsportal`), auf **Create repository** klicken.

2. **Dateien hochladen**
   Im leeren Repo auf **uploading an existing file** klicken (oder „Add file → Upload files“)
   und alle Dateien aus diesem Ordner per Drag-and-drop hochladen. Danach unten
   **Commit changes** klicken.

   Alternativ per Git auf der Kommandozeile:
   ```bash
   git init
   git add .
   git commit -m "Erste Version Trainingsportal"
   git branch -M main
   git remote add origin https://github.com/DEIN-NUTZERNAME/trainingsportal.git
   git push -u origin main
   ```

3. **GitHub Pages aktivieren** (damit die Seite im Browser aufrufbar ist)
   Im Repo auf **Settings → Pages**. Unter „Build and deployment“ als Source
   **Deploy from a branch** wählen, Branch `main` und Ordner `/ (root)` auswählen,
   **Save** klicken. Nach ein bis zwei Minuten ist die Seite unter
   `https://DEIN-NUTZERNAME.github.io/trainingsportal/` erreichbar.

4. **Zugangsdaten anpassen**
   In `auth.js` die Werte `SITE_PASSWORD`, `VALID_USER.user` und `VALID_USER.pass`
   ändern und die Datei erneut committen/pushen.

## Wichtiger Hinweis zur Sicherheit

Der Passwortschutz in `auth.js` läuft **komplett im Browser** (clientseitig).
Das Passwort steht im Klartext im Quellcode und kann von jedem, der die Seite
aufruft, im „Seitenquelltext anzeigen“ ausgelesen werden. Das reicht, um
neugierige Besucher fernzuhalten, ist aber **kein echter Zugriffsschutz** für
vertrauliche Inhalte.

Für echten Schutz gibt es zwei gängige Wege:
- **GitHub Pages bleibt öffentlich, aber mit echtem Login:** Statt reinem HTML
  ein Hosting mit serverseitiger Logik verwenden, z. B. Cloudflare Pages +
  Cloudflare Access, oder Netlify mit Netlify Identity.
- **Repository privat halten:** GitHub Pages kann auch aus einem privaten
  Repository veröffentlicht werden (bei GitHub Pro/Team/Enterprise, oder als
  privates Deployment über Vercel/Netlify), sodass nur eingeladene Personen
  überhaupt Zugriff auf den Code haben.

## Betrieb auf Raspberry Pi & Tablet (Kiosk-Modus)

Für den Betrieb auf einem Raspberry Pi mit Touch-Monitor bzw. auf einem
SVITOO P11-T Tablet (1280×800) gibt es eigene Schritt-für-Schritt-Anleitungen:

- [`RASPBERRY_PI_SETUP.md`](RASPBERRY_PI_SETUP.md) – lokaler Webserver,
  Chromium-Kiosk-Modus, Touch-Kalibrierung, Autostart.
- [`TABLET_SVITOO_P11-T_SETUP.md`](TABLET_SVITOO_P11-T_SETUP.md) – Zugriff
  über WLAN auf den Pi oder eigenständiger Betrieb, Vollbild/Kiosk-Modus,
  wichtiger Hinweis zum Modul „Trainingsmodus Pro“ (benötigt Tastatur).

## Struktur erweitern

Jede Modulseite hat denselben Grundaufbau: eine Topbar mit Link zurück zum
Dashboard und einem Abmelden-Button, eine Titelzeile sowie eine Karte für den
Inhalt. Eigene Inhalte einfach in die `<div class="card">` (bzw. das
entsprechende Hauptcontainer-Element) der jeweiligen Datei einfügen.

Neue Module bindest du wie folgt ein:
1. HTML-Datei nach dem bestehenden Muster anlegen (Topbar mit
   `<a href="dashboard.html">&larr; Zurück zum Dashboard</a>` und
   `<a class="logout" href="#" onclick="logout(); return false;">Abmelden</a>`).
2. `auth.js` einbinden und `requireGate(); requireLogin();` aufrufen, damit das
   Modul denselben Zugriffsschutz wie die anderen Seiten nutzt.
3. Eine neue Kachel in `dashboard.html` im `<div class="grid">` ergänzen.

## Zugriffsschutz an/aus

In `auth.js` steuert die Konstante `PROTECTION_ENABLED`, ob Passwortschutz und
Login aktiv sind:
- `true` – Zugangscode (`index.html`) und Login (`login.html`) sind Pflicht.
- `false` – alle Seiten sind frei zugänglich, `index.html` und `login.html`
  leiten automatisch zum Dashboard weiter. Das ist der aktuelle Zustand
  (praktisch für Entwicklung/Tests, siehe Sicherheitshinweis unten).

## Wetter-Anzeige im Dashboard

Das Dashboard zeigt optional das aktuelle Wetter über die OpenWeatherMap-API
an (`WEATHER_API_KEY`/`WEATHER_LOCATION` in `dashboard.html`). Ohne gültigen
Key wird automatisch ein einfacher Platzhalterwert (Tag/Nacht-Schätzung)
angezeigt. Der aktuell hinterlegte Key ist im Quelltext sichtbar – für den
produktiven Einsatz empfiehlt es sich, den Key in den OpenWeatherMap-
Einstellungen auf die eigene Domain zu beschränken oder einen eigenen Key
einzutragen.
