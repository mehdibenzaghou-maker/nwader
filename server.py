import http.server
import socketserver
import os

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Headers CORS importants
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def guess_type(self, path):
        # Types MIME corrects pour .glb
        if path.endswith('.glb'):
            return 'model/gltf-binary'
        return super().guess_type(path)

# Démarrer le serveur
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print(f"✅ Serveur démarré: http://localhost:{PORT}")
print(f"📁 Dossier: {os.getcwd()}")
print("\n📋 INSTRUCTIONS:")
print("1. Placez ce fichier dans votre dossier")
print("2. Lancez: python server.py")
print("3. Ouvrez: http://localhost:8000")
print("\n⚠️  Pour Chrome mobile: chrome://flags/#unsafely-treat-insecure-origin-as-secure")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Serveur arrêté")
