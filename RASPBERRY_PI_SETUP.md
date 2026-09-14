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
eigenen Ursprung). Stattdessen den mitgelieferten lokalen Server
`server.py` laufen lassen – er liefert wie zuvor ganz normal die Seiten
aus, speichert **zusätzlich aber auch Spielerliste, Material und
Trainings-/Spielergebnisse zentral auf dem Pi**, sodass alle Geräte im
selben WLAN (Pi-Monitor **und** Tablets) denselben Datenstand sehen (siehe
Abschnitt 6). `server.py` braucht keine Zusatzpakete – nur Python 3, das
auf Raspberry Pi OS bereits vorinstalliert ist.

```bash
sudo apt update
sudo apt install -y python3

# Server manuell testen:
cd /home/pi/stocksport
python3 server.py 8080
```

Im Browser auf dem Pi sollte jetzt `http://localhost:8080/` funktionieren,
und in der Konsole erscheint beim Start die WLAN-Adresse, unter der auch
Tablets den Pi erreichen (z. B. `http://192.168.1.23:8080/`).

### Als Systemdienst (startet automatisch beim Booten)

```bash
sudo tee /etc/systemd/system/stocksport.service > /dev/null << 'EOF'
[Unit]
Description=Stocksport Trainingsportal (lokaler Webserver mit zentraler Datenablage)
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/stocksport
ExecStart=/usr/bin/python3 server.py 8080
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now stocksport.service
```

**Hinweis für ein bestehendes Setup:** Lief bisher `python3 -m http.server
8080` als Dienst, einfach die `ExecStart`-Zeile wie oben auf `server.py`
ändern und den Dienst neu starten (`sudo systemctl daemon-reload &&
sudo systemctl restart stocksport.service`). Die bisher genutzten Seiten
und Links (`http://<Pi-Adresse>:8080/...`) bleiben unverändert.

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

## 6. Zugriffsschutz & zentrale Daten

- Die reine Tablet-/Touch-Trainingsansicht (`05_Trainingsmodus_Pro_Tablet.html`)
  hat **bewusst keinen Login** – sie ist als Kiosk-Modul gedacht, das jedes
  Vereinsmitglied direkt nutzen kann, ganz ohne An-/Abmelden.
  Die übrigen Verwaltungsmodule (Spielerverwaltung, Trainingsanalyse,
  Einzeltraining, Datenbankverwaltung) sind über `auth.js` weiterhin
  passwortgeschützt und leiten ohne Anmeldung zu `index.html` um.
- **Alle Geräte teilen sich jetzt denselben Datenstand:** Spielerliste,
  Platten-/Stingel-Material sowie alle Trainings- und Spielergebnisse
  werden nicht mehr nur im `localStorage` des jeweiligen Browsers
  gespeichert, sondern zusätzlich zentral auf dem Server (`server.py`,
  läuft auf diesem Pi bzw. einem PC im selben Netzwerk) abgelegt. Der Pi-
  Monitor **und** alle Tablets (siehe `TABLET_SVITOO_P11-T_SETUP.md`)
  zeigen dadurch automatisch denselben Stand, sobald sie im selben WLAN
  mit derselben Server-Adresse verbunden sind – ein manueller Excel-/CSV-
  Abgleich ist dafür nicht mehr nötig. Fällt der Server kurz aus (WLAN-
  Unterbrechung, Neustart), funktioniert jedes Gerät einfach mit seinem
  zuletzt bekannten lokalen Stand weiter und gleicht automatisch wieder ab,
  sobald der Server wieder erreichbar ist. Ob ein Gerät gerade verbunden
  ist, zeigt die kleine Status-Anzeige oben im Dashboard bzw. in der
  Datenbankverwaltung ("● Zentral verbunden" / "● Nur dieses Gerät").
