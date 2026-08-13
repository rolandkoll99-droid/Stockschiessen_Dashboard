# Trainingsportal auf dem Raspberry Pi (Touch-Monitor / Monitor)

Diese Anleitung richtet das Trainingsportal als **Kiosk-Anwendung** ein:
Der Pi startet automatisch im Vollbild-Browser mit dem Dashboard, ganz ohne
Adressleiste, Taskleiste oder Mauszeiger – ideal für einen fest montierten
Touch-Monitor in der Halle.

Getestet/empfohlen für **Raspberry Pi OS (64-bit, mit Desktop)** auf
Raspberry Pi 4 oder 5. Ein Pi Zero/1/2 ist für die aufwendigeren Module
(Trainingsanalyse mit Charts) zu schwach.

## 1. Dateien auf den Pi kopieren

Kompletten Ordnerinhalt (alle Dateien aus diesem Paket) z. B. nach
`/home/pi/stocksport/` kopieren – per USB-Stick, `scp` oder direkt das
ZIP auf dem Pi entpacken:

```bash
mkdir -p /home/pi/stocksport
unzip Stocksport_V2_2_optimiert.zip -d /home/pi/stocksport
```

## 2. Lokalen Webserver einrichten (wichtig!)

Die Seiten **nicht** direkt per Doppelklick/`file://` öffnen. Der Login-
Mechanismus verwendet `sessionStorage`, das über `file://`-Pfade im Browser
unzuverlässig funktioniert (Chromium behandelt jede lokale Datei ggf. als
eigenen Ursprung). Stattdessen einen einfachen lokalen Webserver laufen
lassen:

```bash
sudo apt update
sudo apt install -y python3

# Server manuell testen:
cd /home/pi/stocksport
python3 -m http.server 8080
```

Im Browser auf dem Pi sollte jetzt `http://localhost:8080/` funktionieren.

### Als Systemdienst (startet automatisch beim Booten)

```bash
sudo tee /etc/systemd/system/stocksport.service > /dev/null << 'EOF'
[Unit]
Description=Stocksport Trainingsportal (lokaler Webserver)
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/stocksport
ExecStart=/usr/bin/python3 -m http.server 8080
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now stocksport.service
```

## 3. Chromium im Kiosk-Modus automatisch starten

```bash
sudo apt install -y chromium-browser unclutter
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart
```

Datei mit folgendem Inhalt anlegen/ersetzen:

```
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0.5 -root
@chromium-browser --noerrdialogs --disable-infobars --kiosk --incognito \
  --overscroll-history-navigation=0 --disable-pinch \
  http://localhost:8080/
```

Erklärung der wichtigsten Punkte:
- `xset s off` / `-dpms` / `s noblank` – Bildschirmschoner und
  Energiesparmodus deaktivieren, damit der Monitor nicht abschaltet.
- `unclutter` – blendet den Mauszeiger nach kurzer Inaktivität aus
  (nützlich, auch wenn der Monitor Touch-fähig ist).
- `--kiosk` – echtes Vollbild ohne Adressleiste, ohne Möglichkeit für
  Besucher, die Seite zu verlassen.
- `--disable-pinch` – verhindert versehentliches Auseinanderziehen/
  Verzerren der Ansicht per Touch.
- `--incognito` – jede Sitzung startet „sauber“ (kein alter Cache);
  **Achtung:** dadurch werden auch `localStorage`-Daten (Spielerliste,
  Trainingsergebnisse) bei jedem Neustart des Browsers gelöscht. Wenn die
  Daten dauerhaft erhalten bleiben sollen, `--incognito` weglassen.

Danach neu starten: `sudo reboot`

## 4. Touch-Monitor kalibrieren (falls nötig)

Die meisten HDMI-Touch-Monitore funktionieren unter Raspberry Pi OS „out of
the box“ (Plug & Play über USB für den Touch-Teil). Falls die Touch-Punkte
nicht exakt sitzen:

```bash
sudo apt install -y xinput-calibrator
xinput_calibrator
```

Die ausgegebenen Werte in `/etc/X11/xorg.conf.d/99-calibration.conf`
eintragen (Anleitung erscheint direkt im Terminal nach dem Kalibrieren).

## 5. Bildschirmauflösung / Ausrichtung

Über `sudo raspi-config` → **Display Options** lässt sich die Auflösung
fix einstellen, falls der Monitor per HDMI nicht automatisch erkannt wird.
Für Hochkant-Montage kann in `/boot/config.txt` `display_rotate=1` (90°)
gesetzt werden – Touch-Eingabe muss dann ggf. per `xinput` mit
transformiert werden (`xinput set-prop … 'Coordinate Transformation Matrix'`).

## 6. Wichtige Einschränkung: Zugriffsschutz & lokale Daten

- Der Passwort-/Login-Schutz (`index.html`, `login.html`) ist aktuell in
  `auth.js` per `PROTECTION_ENABLED = false` **deaktiviert** – auf einem
  Kiosk-Gerät in der Halle meist gewünscht, damit niemand ausgesperrt wird.
  Für Zugriffsschutz `PROTECTION_ENABLED = true` setzen.
- Spielerliste und Trainingsergebnisse werden im **`localStorage` des
  jeweiligen Browsers** gespeichert – nicht auf einem zentralen Server. Wenn
  du zusätzlich das Tablet (siehe `TABLET_SVITOO_P11-T_SETUP.md`) nutzt,
  haben Pi und Tablet **getrennte** Datenstände. Für den Abgleich die
  Excel-/CSV-Export-/Importfunktion in der Spielerverwaltung nutzen.
