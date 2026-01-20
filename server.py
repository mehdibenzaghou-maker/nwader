# server.py - Serveur Python simple
import http.server
import socketserver
import os

PORT = 8000

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

# Changer le répertoire de travail
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"✅ Serveur démarré sur http://localhost:{PORT}")
    print(f"📁 Dossier courant: {os.getcwd()}")
    print("\n📋 Instructions:")
    print("   1. Placez vos fichiers .glb dans le dossier 'models/'")
    print("   2. Ouvrez http://localhost:8000")
    print("   3. Cliquez sur 'Activer Caméra'")
    print("   4. Cliquez sur 'Afficher Lunettes'")
    print("\n🔧 Pour ajuster la position:")
    print("   - Modifiez les valeurs dans le code (scale, positionY, positionZ)")
    print("   - Ou utilisez les boutons d'ajustement")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Serveur arrêté")
