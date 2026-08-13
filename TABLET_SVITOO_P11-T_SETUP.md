# Trainingsportal auf dem SVITOO P11-T Tablet

Das SVITOO P11-T ist ein 11″-Android-Tablet (Android 16, Unisoc T7250,
4 GB physischer RAM, WLAN 802.11 a/b/g/n/ac) mit einer **Displayauflösung
von 1280×800 Pixel**. Die Website ist bereits so gebaut, dass sie bei dieser
Breite ohne horizontales Scrollen und mit ausreichend großen Touch-Flächen
funktioniert – es ist keine separate „mobile Version“ nötig.

Es gibt zwei sinnvolle Varianten, das Tablet einzurichten:

## Variante A (empfohlen): Tablet greift auf den Raspberry Pi zu

Wenn du den Pi wie in `RASPBERRY_PI_SETUP.md` beschrieben mit dem lokalen
Webserver eingerichtet hast, kann das Tablet dieselbe Seite über das
WLAN aufrufen – ideal, wenn Pi-Monitor und Tablet **gleichzeitig** im
Einsatz sein sollen (z. B. Pi an der Bahn, Tablet beim Trainer).

1. Tablet und Pi müssen im **selben WLAN** sein.
2. IP-Adresse des Pi ermitteln: auf dem Pi im Terminal `hostname -I`
   ausführen (z. B. `192.168.1.42`).
3. Auf dem Tablet **Chrome** öffnen und `http://192.168.1.42:8080/`
   aufrufen.

> ⚠️ **Wichtig zur Datenhaltung:** Spielerliste und Trainingsergebnisse
> werden im `localStorage` des jeweiligen **Browsers/Geräts** gespeichert,
> nicht zentral auf dem Pi. Pi-Monitor und Tablet haben also – auch wenn
> beide dieselbe URL aufrufen – jeweils **ihren eigenen Datenstand**. Für
> einen Abgleich die Export-/Import-Funktion (CSV/Excel) in der
> Spielerverwaltung nutzen, oder das Tablet nur als Zweitanzeige ohne
> eigene Dateneingabe verwenden.

## Variante B: Tablet als eigenständiges Gerät (ohne Pi)

Falls kein Pi im Netz verfügbar ist, läuft das Portal auch direkt auf dem
Tablet:

1. Den Ordnerinhalt dieses Pakets auf das Tablet kopieren (z. B. per USB-
   Kabel in den Ordner `Download/stocksport`, oder per Cloud-Speicher).
2. Eine kleine lokale Webserver-App aus dem Play Store installieren, z. B.
   **„Simple HTTP Server“** oder **„KSWEB“**, und als Stammverzeichnis den
   `stocksport`-Ordner wählen.
3. In Chrome `http://localhost:8080/` (bzw. den in der Server-App
   angezeigten Port) öffnen.

(Direktes Öffnen der `index.html` per Datei-Manager funktioniert nur
eingeschränkt, weil dann der Login-Mechanismus über `sessionStorage`
nicht zuverlässig zwischen den Seiten funktioniert – siehe Hinweis in
`RASPBERRY_PI_SETUP.md`.)

## Vollbild / Kiosk-Modus auf dem Tablet

### Einfach: Als Web-App zum Startbildschirm hinzufügen
1. Seite in Chrome öffnen (`dashboard.html` bzw. die Server-URL).
2. Menü (⋮) → **„Zum Startbildschirm hinzufügen“**.
3. Von dort startet die Seite ohne Adressleiste, fast wie eine eigene App.

### Für einen echten Kiosk-Betrieb (Gerät nur für das Trainingsportal)
Für ein Gerät, das dauerhaft nur diese Seite zeigen soll und das
Verlassen der App verhindert, empfiehlt sich eine kostenlose Kiosk-Browser-
App aus dem Play Store, z. B. **„Fully Kiosk Browser“**:
1. App installieren, als Start-URL die Adresse aus Variante A oder B
   eintragen.
2. In den Einstellungen der App: *Kiosk-Modus / „Lock Screen“* aktivieren,
   Bildschirm-Timeout deaktivieren, Startseite beim Hochfahren automatisch
   laden.
3. Optional die App als Standard-Startbildschirm (Launcher) festlegen,
   damit das Tablet nach dem Einschalten direkt in der Seite landet.

### Grundeinstellungen des Tablets
- **Bildschirm-Timeout**: Einstellungen → Display → „Bildschirm-Timeout“
  auf „Nie“/max. Wert stellen (bzw. über die Kiosk-App steuern), damit der
  Monitor während des Trainings nicht abdunkelt.
- **Ausrichtung sperren**: Landscape (Querformat) empfohlen, da die Module
  für 1280×800 im Querformat ausgelegt sind. Schnelleinstellungen →
  Auto-Drehen deaktivieren.
- **WLAN „immer verbunden“**: Einstellungen → WLAN → erweitert →
  „WLAN im Ruhezustand aktiv lassen: Immer“, damit die Verbindung zum
  Pi-Server nicht abbricht.

## Wichtiger Hinweis: Modul „Trainingsmodus Pro“ (05) braucht eine Tastatur

`05_Trainingsmodus_Pro.html` ist bewusst für eine **physische
Zusatztastatur/Nummernblock** gebaut (Eingabetaste, `+`, `-`, `*`, `/`,
`Esc` steuern das Training). Auf einem reinen Touch-Tablet ohne
angeschlossene Tastatur lassen sich diese Kurzbefehle **nicht** auslösen.
Für dieses Modul auf dem Tablet entweder:
- eine kleine **Bluetooth-Tastatur/Nummernblock** mit dem Tablet koppeln, oder
- auf dem Tablet stattdessen die anderen, rein touch-bedienbaren Module
  nutzen (01 Trainingsmodus, 02 Spielerverwaltung, 04 Trainingsanalyse,
  06 Einzeltraining) und „Trainingsmodus Pro“ dem Pi mit angeschlossener
  Tastatur vorbehalten.

## Browser-Empfehlung

Chrome (vorinstalliert) verwenden – nicht ältere/alternative Browser-Apps
aus Drittanbieter-App-Stores, da diese teils veraltete WebView-Versionen
nutzen und moderne Funktionen (z. B. die IndexedDB-Nutzung im Modul
„Trainingsanalyse“) nicht zuverlässig unterstützen.
