#!/usr/bin/env python3
# ============================================================
# server.py - Lokaler Server fuer das Trainingsportal ESV Grein
# ============================================================
# Ersetzt den bisherigen "python3 -m http.server": liefert weiterhin ganz
# normal alle Dateien aus diesem Ordner aus (dashboard.html, die Module,
# Bilder, ...), speichert zusaetzlich aber auch Daten zentral auf DIESEM
# Geraet (Raspberry Pi oder PC) ab - unter data/kv/ als einfache JSON-
# Dateien, eine pro gespeichertem Schluessel.
#
# Dadurch koennen mehrere Geraete (der Pi-Hauptbildschirm UND ein oder
# mehrere Tablets im selben WLAN) dieselbe Spielerliste, denselben
# Material-Katalog und dieselbe Trainings-/Spielhistorie sehen, statt wie
# bisher nur getrennte Daten im jeweiligen Browser-Speicher (localStorage)
# zu haben.
#
# Voraussetzung: nur Python 3 (Standardbibliothek) - keine Installation von
# zusaetzlichen Paketen noetig. Laeuft unveraendert auf Raspberry Pi OS und
# auf einem normalen Windows/Mac/Linux-PC.
#
# Aufruf (Port optional, Standard 8080):
#   python3 server.py
#   python3 server.py 8080
#
# Fuer den Raspberry-Pi-Autostart als Systemdienst: in
# RASPBERRY_PI_SETUP.md den ExecStart-Befehl von
#   /usr/bin/python3 -m http.server 8080
# auf
#   /usr/bin/python3 /home/pi/stocksport/server.py 8080
# umstellen (siehe dortige Anleitung).
# ============================================================

import json
import os
import re
import socket
import sys
import tempfile
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'kv')

# Nur "harmlose" Schluessel erlauben (Buchstaben, Ziffern, _ - .) - das bildet
# jeden bisher im Portal verwendeten localStorage-Schluessel ab (z.B.
# "esv_grein_spielerliste" oder "training_SP12_2026-08-14") und verhindert
# gleichzeitig, dass ueber den Schluessel auf andere Dateien/Ordner
# zugegriffen werden koennte (Pfad-Traversal).
KEY_PATTERN = re.compile(r'^[A-Za-z0-9_.\-]{1,200}$')

# Schreibzugriffe auf dieselbe Datei serialisieren (mehrere Tablets koennten
# gleichzeitig speichern) - ein einzelnes Lock fuer alle Schluessel reicht
# hier locker aus, da jeder Schreibvorgang nur wenige Millisekunden dauert.
_write_lock = threading.Lock()


def _now_iso():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def _key_path(key):
    return os.path.join(DATA_DIR, key + '.json')


def _read_key(key):
    path = _key_path(key)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def _write_key(key, value):
    os.makedirs(DATA_DIR, exist_ok=True)
    record = {'value': value, 'updated': _now_iso()}
    # Atomar schreiben (erst in Temp-Datei, dann umbenennen) - so bleibt bei
    # einem Stromausfall/Absturz mitten im Schreiben immer noch die alte,
    # unbeschaedigte Version erhalten statt einer halb geschriebenen Datei.
    with _write_lock:
        fd, tmp_path = tempfile.mkstemp(dir=DATA_DIR, prefix='.tmp-')
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump(record, f, ensure_ascii=False)
            os.replace(tmp_path, _key_path(key))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    return record


def _delete_key(key):
    path = _key_path(key)
    if os.path.isfile(path):
        os.remove(path)
        return True
    return False


def _all_keys():
    if not os.path.isdir(DATA_DIR):
        return []
    return [fn[:-5] for fn in os.listdir(DATA_DIR) if fn.endswith('.json') and not fn.startswith('.tmp-')]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    # Ruhigere Konsole: nur echte Fehler (4xx/5xx) protokollieren, keine Zeile
    # pro normal ausgeliefertem Bild/CSS/API-Aufruf.
    def log_message(self, fmt, *args):
        status = str(args[1]) if len(args) > 1 else ''
        if status.startswith('4') or status.startswith('5'):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        # Kein Caching fuer API-Antworten - jedes Geraet soll immer den
        # aktuellen Stand bekommen, nie eine gecachte alte Antwort.
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get('Content-Length', 0) or 0)
        if length <= 0:
            return None
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

    def _api_path(self):
        path = unquote(urlsplit(self.path).path)
        if path == '/api/health' or path == '/api/kv' or path == '/api/kv/':
            return path.rstrip('/') or path
        if path.startswith('/api/kv/'):
            return path
        return None

    # ---------------- GET ----------------
    def do_GET(self):
        path = unquote(urlsplit(self.path).path)

        if path == '/api/health':
            self._send_json(200, {'status': 'ok', 'time': _now_iso()})
            return

        if path == '/api/kv' or path == '/api/kv/':
            data = {}
            meta = {}
            for key in _all_keys():
                record = _read_key(key)
                if record is not None:
                    data[key] = record.get('value')
                    meta[key] = record.get('updated')
            self._send_json(200, {'data': data, 'updated': meta})
            return

        if path.startswith('/api/kv/'):
            key = path[len('/api/kv/'):]
            if not KEY_PATTERN.match(key):
                self._send_json(400, {'error': 'ungueltiger Schluessel'})
                return
            record = _read_key(key)
            if record is None:
                self._send_json(200, {'key': key, 'value': None, 'updated': None})
            else:
                self._send_json(200, {'key': key, 'value': record.get('value'), 'updated': record.get('updated')})
            return

        # Kein API-Aufruf -> ganz normale statische Datei ausliefern
        super().do_GET()

    def do_HEAD(self):
        # HEAD wird von unserem eigenen Client nicht benutzt (nur GET/PUT/
        # DELETE) - fuer /api/-Pfade reicht eine einfache Bestaetigung ohne
        # Koerper, alles andere (Dateien) laeuft normal ueber die Basisklasse.
        path = unquote(urlsplit(self.path).path)
        if path == '/api/health' or path == '/api/kv' or path == '/api/kv/' or path.startswith('/api/kv/'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return
        super().do_HEAD()

    # ---------------- PUT / POST (Wert speichern) ----------------
    def do_PUT(self):
        self._handle_write()

    def do_POST(self):
        self._handle_write()

    def _handle_write(self):
        path = unquote(urlsplit(self.path).path)
        if not path.startswith('/api/kv/'):
            self.send_error(404, 'Not Found')
            return
        key = path[len('/api/kv/'):]
        if not KEY_PATTERN.match(key):
            self._send_json(400, {'error': 'ungueltiger Schluessel'})
            return
        body = self._read_body()
        if body is None or 'value' not in body:
            self._send_json(400, {'error': 'Erwarte JSON-Body {"value": ...}'})
            return
        record = _write_key(key, body['value'])
        self._send_json(200, {'key': key, 'value': record['value'], 'updated': record['updated']})

    # ---------------- DELETE ----------------
    def do_DELETE(self):
        path = unquote(urlsplit(self.path).path)
        if not path.startswith('/api/kv/'):
            self.send_error(404, 'Not Found')
            return
        key = path[len('/api/kv/'):]
        if not KEY_PATTERN.match(key):
            self._send_json(400, {'error': 'ungueltiger Schluessel'})
            return
        _delete_key(key)
        self._send_json(200, {'key': key, 'deleted': True})

    # CORS ist nicht noetig (alles laeuft ueber denselben Ursprung/Server),
    # aber ein einfacher OPTIONS-Handler schadet nicht und hilft bei
    # eventuellen Debugging-Tools.
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Allow', 'GET, POST, PUT, DELETE, OPTIONS')
        self.end_headers()


def _local_ip():
    # Ermittelt die LAN-IP dieses Geraets (fuer die Startmeldung), ohne
    # tatsaechlich Daten zu verschicken.
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'
    finally:
        s.close()


def main():
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f'Ungueltiger Port "{sys.argv[1]}", verwende 8080.')

    os.makedirs(DATA_DIR, exist_ok=True)
    os.chdir(BASE_DIR)

    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    ip = _local_ip()
    print('=' * 60)
    print(' Trainingsportal ESV Grein - lokaler Server')
    print('=' * 60)
    print(f' Auf diesem Geraet:  http://localhost:{port}/')
    print(f' Im WLAN (Tablets):  http://{ip}:{port}/')
    print(f' Daten liegen unter: {DATA_DIR}')
    print(' Beenden mit Strg+C')
    print('=' * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServer beendet.')
        server.shutdown()


if __name__ == '__main__':
    main()
