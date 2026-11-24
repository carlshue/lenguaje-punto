"""Servidor local del editor (http://localhost:8765) sin caché, para ver siempre los ejemplos recién generados."""
import functools, http.server, json, os, sys


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass

    # Favoritos del editor: se guardan en favoritos.json junto al proyecto
    def do_GET(self):
        if self.path.split("?")[0] == "/api/favoritos":
            ruta = os.path.join(self.directory, "favoritos.json")
            datos = open(ruta, "rb").read() if os.path.exists(ruta) else b"[]"
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
            self.wfile.write(datos); return
        super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/favoritos":
            self.send_error(404); return
        datos = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        json.loads(datos)  # valida que sea JSON
        with open(os.path.join(self.directory, "favoritos.json"), "wb") as f:
            f.write(datos)
        self.send_response(204); self.end_headers()


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    raiz = os.path.dirname(os.path.abspath(__file__))
    http.server.ThreadingHTTPServer(("127.0.0.1", puerto), functools.partial(SinCache, directory=raiz)).serve_forever()
