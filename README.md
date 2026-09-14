# Trainingsportal

Website mit Passwortsperre, Login, Dashboard und mehreren Trainingsmodulen.
Läuft über den mitgelieferten lokalen Server `server.py`, der neben den
Seiten auch die Daten (Spieler, Material, Trainings-/Spielergebnisse)
**zentral** speichert, sodass Pi und Tablets im selben WLAN denselben
Datenstand sehen (siehe „Zentrale Datenablage" weiter unten).

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
05_Trainingsmodus_Pro.html     Modul: Freies Training mit Zusatztastatur
05_Trainingsmodus_Pro_Tablet.html  Modul: Freies Training für Tablet/Touchscreen (ohne Login)
04_Trainingsanalyse.html       Modul: Trainingsanalyse / Auswertung
06_Einzeltraining.html         Modul: Einzeltraining mit Anleitung
02_Spielerverwaltung.html      Modul: Verwaltung der Spielerprofile
07_Spielermaterial.html        Modul: Platten- & Stingel-Material verwalten
09_Datenbankverwaltung.html    Modul: zentraler Datenstand – Export/Import/Reset
08_Anleitung.html              Anleitung & Hilfe zu allen Modulen
02_Spielerliste.xlsx           Beispiel-/Vorlagendatei für den Excel-Import
style.css                      gemeinsames Design (Basistheme)
auth.js                        zentrale, einfache Zugriffslogik (Passwort, Login, Logout)
server.py                      lokaler Server (Python, ohne Zusatzinstallation) – liefert die
                                Seiten aus UND speichert die Daten zentral (siehe unten)
sync-client.js                 Client-Bibliothek ("Store"), die alle Module mit server.py
                                synchronisiert – Ersatz für direkte localStorage-Aufrufe
db_manager.js                  Datenzugriff für 09_Datenbankverwaltung.html
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

## Zentrale Datenablage (Raspberry Pi / PC)

Bisher speicherte jedes Gerät (Pi-Monitor, jedes Tablet) seine Daten nur im
eigenen Browser (`localStorage`) – Spielerliste und Trainingsergebnisse
waren dadurch auf jedem Gerät unterschiedlich. `server.py` löst das: er
läuft als lokaler Webserver auf dem Pi (oder einem PC im selben Netzwerk)
und bietet zusätzlich zur normalen Seitenauslieferung eine einfache
Speicher-Schnittstelle (`/api/kv/...`) an, über die alle Module (via
`sync-client.js`, global als `Store` verfügbar) automatisch im Hintergrund
Daten abgleichen.

- **Was wird zentral geteilt:** Spielerliste, Platten-/Stingel-Material,
  Team-Namen/-Farben sowie alle Trainings- und Spielergebnisse (inkl.
  Einzeltrainings-Historie).
- **Wie läuft der Abgleich ab:** Jedes Gerät liest/schreibt weiterhin
  sofort in seinen eigenen Browser-Speicher (schnell, funktioniert auch
  offline), gleicht aber alle paar Sekunden im Hintergrund mit dem Server
  ab. Ändert ein Gerät Daten, sehen andere Geräte die Änderung innerhalb
  weniger Sekunden.
- **Kein Server erreichbar?** Dann funktioniert jedes Gerät einfach mit
  seinem zuletzt bekannten Stand weiter (wie bisher) und synchronisiert
  automatisch wieder, sobald der Server wieder da ist. Es geht nichts
  kaputt, wenn `server.py` mal nicht läuft.
- **Status sehen:** Dashboard und Datenbankverwaltung (`09_`) zeigen oben
  eine kleine Anzeige „● Zentral verbunden" bzw. „● Nur dieses Gerät".
- **Starten:** `python3 server.py` (Standardport 8080, optional
  `python3 server.py <Port>`) – siehe [`RASPBERRY_PI_SETUP.md`](RASPBERRY_PI_SETUP.md)
  für den Dauerbetrieb als Systemdienst.

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

`auth.js` stellt die Funktionen `requireGate()` (Zugangscode) und
`requireLogin()` (Benutzername + Passwort) bereit. Jede Modulseite, die
geschützt sein soll, ruft beide beim Laden auf und wird ohne gültige
Anmeldung automatisch zu `index.html` umgeleitet – das betrifft aktuell
`02_Spielerverwaltung.html`, `04_Trainingsanalyse.html`,
`06_Einzeltraining.html` und `09_Datenbankverwaltung.html`.

Die Tablet-/Kiosk-Trainingsansicht (`05_Trainingsmodus_Pro_Tablet.html`)
ruft diese Funktionen **bewusst nicht** auf – sie ist als frei zugängliches
Modul für Mitglieder am Trainingsplatz gedacht, ganz ohne An-/Abmelden.

Um den Schutz für ein Modul zu entfernen, einfach den Aufruf von
`requireGate(); requireLogin();` in der jeweiligen Datei löschen (wie im
Tablet-Modul bereits gemacht). Einen globalen Ein/Aus-Schalter für alle
Seiten gibt es nicht – jede Seite entscheidet für sich per Funktionsaufruf.

## Wetter-Anzeige im Dashboard

Das Dashboard zeigt optional das aktuelle Wetter über die OpenWeatherMap-API
an (`WEATHER_API_KEY`/`WEATHER_LOCATION` in `dashboard.html`). Ohne gültigen
Key wird automatisch ein einfacher Platzhalterwert (Tag/Nacht-Schätzung)
angezeigt. Der aktuell hinterlegte Key ist im Quelltext sichtbar – für den
produktiven Einsatz empfiehlt es sich, den Key in den OpenWeatherMap-
Einstellungen auf die eigene Domain zu beschränken oder einen eigenen Key
einzutragen.
