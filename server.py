#!/usr/bin/env python3
"""
NWADRI - Serveur Web pour Filtre Lunettes AR
Ce serveur permet de tester localement votre application AR
"""

import http.server
import socketserver
import os
import sys
import mimetypes
from pathlib import Path
from datetime import datetime
import json

# ============================================================
# CONFIGURATION
# ============================================================
PORT = 8000
HOST = "localhost"
ALLOWED_EXTENSIONS = {
    '.html', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.gif',
    '.glb', '.gltf', '.bin', '.wasm', '.ico', '.svg', '.woff', '.woff2', '.ttf'
}

# ============================================================
# HANDLER PERSONNALISÉ
# ============================================================
class NWADRIRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Handler personnalisé pour servir les fichiers avec bons headers"""
    
    def log_message(self, format, *args):
        """Log personnalisé avec timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {self.address_string()} - {format % args}")
    
    def do_GET(self):
        """Gérer les requêtes GET"""
        # Normaliser le chemin
        path = self.translate_path(self.path)
        
        # Si c'est la racine, servir index.html
        if self.path == "/":
            self.path = "/index.html"
            path = self.translate_path(self.path)
        
        # Vérifier si le fichier existe
        if not os.path.exists(path):
            self.send_error(404, "Fichier non trouvé")
            return
        
        # Vérifier l'extension
        file_extension = os.path.splitext(path)[1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            self.send_error(403, "Type de fichier non autorisé")
            return
        
        # Déterminer le type MIME
        mime_type = self.guess_mime_type(path)
        
        # Lire le fichier
        try:
            with open(path, 'rb') as file:
                content = file.read()
        except Exception as e:
            self.send_error(500, f"Erreur lecture fichier: {str(e)}")
            return
        
        # Envoyer la réponse
        self.send_response(200)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(len(content)))
        
        # Headers CORS importants
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        
        # Headers spéciaux pour les fichiers 3D
        if file_extension in ['.glb', '.gltf']:
            self.send_header("Content-Type", "model/gltf-binary" if file_extension == '.glb' else "model/gltf+json")
        
        self.end_headers()
        self.wfile.write(content)
    
    def do_OPTIONS(self):
        """Gérer les pré-requêtes OPTIONS pour CORS"""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    
    def guess_mime_type(self, path):
        """Déterminer le type MIME avec corrections"""
        mime_type, _ = mimetypes.guess_type(path)
        
        if not mime_type:
            # Types spéciaux
            ext = os.path.splitext(path)[1].lower()
            if ext == '.glb':
                return 'model/gltf-binary'
            elif ext == '.gltf':
                return 'model/gltf+json'
            elif ext == '.js':
                return 'application/javascript'
            elif ext == '.wasm':
                return 'application/wasm'
            else:
                return 'application/octet-stream'
        
        return mime_type
    
    def translate_path(self, path):
        """Traduire le chemin avec sécurité"""
        # Simplifier le chemin
        path = path.split('?', 1)[0]
        path = path.split('#', 1)[0]
        
        # Normaliser
        path = os.path.normpath(path)
        
        # Sécurité : empêcher de sortir du répertoire
        if path.startswith('/'):
            path = path[1:]
        
        # Retourner le chemin complet
        return os.path.join(self.server.base_directory, path)

# ============================================================
# SERVEUR PERSONNALISÉ
# ============================================================
class NWADRIServer(socketserver.TCPServer):
    """Serveur TCP personnalisé avec gestion du répertoire de base"""
    
    def __init__(self, server_address, handler_class, base_directory):
        self.base_directory = base_directory
        super().__init__(server_address, handler_class)
    
    def serve_forever(self, poll_interval=0.5):
        """Servir indéfiniment"""
        print(f"\n{'='*60}")
        print("🚀 NWADRI - SERVEUR AR DÉMARRÉ")
        print(f"{'='*60}")
        super().serve_forever(poll_interval)

# ============================================================
# FONCTIONS UTILITAIRES
# ============================================================
def check_dependencies():
    """Vérifier les dépendances"""
    try:
        import http.server
        import socketserver
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def create_directory_structure(base_dir):
    """Créer la structure de dossiers recommandée"""
    directories = [
        "models",
        "assets",
        "assets/textures",
        "assets/previews"
    ]
    
    for directory in directories:
        dir_path = os.path.join(base_dir, directory)
        os.makedirs(dir_path, exist_ok=True)
        print(f"📁 Créé: {directory}/")

def check_for_glb_files(base_dir):
    """Vérifier la présence de fichiers .glb"""
    models_dir = os.path.join(base_dir, "models")
    
    if not os.path.exists(models_dir):
        print("❌ Dossier 'models/' non trouvé")
        return []
    
    glb_files = list(Path(models_dir).glob("*.glb"))
    
    if glb_files:
        print(f"✅ {len(glb_files)} fichier(s) .glb trouvé(s):")
        for file in glb_files:
            size = os.path.getsize(file)
            print(f"   • {file.name} ({size:,} bytes)")
    else:
        print("❌ Aucun fichier .glb trouvé dans 'models/'")
        print("   Placez vos fichiers .glb dans ce dossier")
    
    return glb_files

def create_example_files(base_dir):
    """Créer des fichiers d'exemple si nécessaire"""
    # Créer un fichier index.html si absent
    index_path = os.path.join(base_dir, "index.html")
    if not os.path.exists(index_path):
        print("📝 Création d'un index.html exemple...")
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write("""<!DOCTYPE html>
<html>
<head>
    <title>NWADRI AR - Placeholder</title>
</head>
<body>
    <h1>NWADRI AR</h1>
    <p>Placez vos fichiers ici.</p>
</body>
</html>""")
    
    # Créer un fichier config.json
    config_path = os.path.join(base_dir, "config.json")
    if not os.path.exists(config_path):
        with open(config_path, 'w') as f:
            json.dump({
                "app_name": "NWADRI AR",
                "version": "1.0.0",
                "models_directory": "models/"
            }, f, indent=2)

def print_instructions(base_dir, glb_files):
    """Afficher les instructions"""
    print(f"\n{'='*60}")
    print("📋 INSTRUCTIONS D'UTILISATION")
    print(f"{'='*60}")
    
    print("\n1. 📁 STRUCTURE DES FICHIERS:")
    print(f"   Votre dossier: {os.path.abspath(base_dir)}")
    print("   ├── index.html       (votre page web)")
    print("   ├── app.js          (code JavaScript)")
    print("   ├── models/         (vos fichiers .glb)")
    print("   └── assets/         (images, textures)")
    
    print("\n2. 🔗 COMMENT METTRE VOS FICHIERS .glb:")
    print("   Dans votre code JavaScript, remplacez:")
    print("   ")
    print("   glbUrl: 'models/vos-lunettes.glb'")
    print("   ")
    print("   par le nom de VOTRE fichier .glb")
    
    if glb_files:
        print("\n3. 📦 VOS FICHIERS .glb DISPONIBLES:")
        for i, file in enumerate(glb_files, 1):
            print(f"   {i}. {file.name}")
            print(f"      Chemin: models/{file.name}")
    
    print("\n4. ⚙️  AJUSTEMENT DE LA POSITION:")
    print("   Si les lunettes ne sont pas bien placées:")
    print("   • Modifiez 'scale' dans le code JavaScript")
    print("   • Ajustez 'positionY' pour monter/descendre")
    print("   • Testez différentes valeurs")
    
    print("\n5. 🌐 POUR TESTER:")
    print(f"   Ouvrez votre navigateur à:")
    print(f"   → http://{HOST}:{PORT}")
    print("   ")
    print("   Utilisez Chrome ou Edge pour de meilleurs résultats")
    
    print("\n6. 📱 SUR MOBILE:")
    print("   • Connectez votre mobile au même WiFi")
    print(f"   • Ouvrez: http://{get_local_ip()}:{PORT}")
    print("   • Chrome Mobile recommandé")
    
    print(f"\n{'='*60}")
    print("🎯 CONFIGURATION RAPIDE POUR VOS FICHIERS .glb:")
    print(f"{'='*60}")
    
    print("""
DANS VOTRE CODE JAVASCRIPT (app.js ou index.html):
--------------------------------------------------

Cherchez cette section:

this.models = {
    '1': {
        name: 'Classic Black',
        // ↓↓↓ REMPLACEZ PAR VOTRE FICHIER .glb ↓↓↓
        glbUrl: 'models/glasses1.glb',  // ← CHANGEZ ICI
        scale: 0.18,
        positionY: 0.15
    }
};

REMPLACEZ 'models/glasses1.glb' par:
• 'models/votre-fichier.glb' (si local)
• 'https://votre-url.com/modele.glb' (si en ligne)

AJUSTEZ LES PARAMÈTRES:
• scale: 0.18 (augmentez si trop petit)
• positionY: 0.15 (+ = plus haut, - = plus bas)
    """)

def get_local_ip():
    """Obtenir l'adresse IP locale"""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def create_test_glb():
    """Créer un fichier .glb de test si aucun n'existe"""
    models_dir = os.path.join(os.getcwd(), "models")
    test_file = os.path.join(models_dir, "test-glasses.glb")
    
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
    
    # Créer un fichier .glb minimal (juste un header)
    # Note: Ce n'est qu'un placeholder, pas un vrai modèle 3D
    print("📝 Création d'un fichier .glb de test...")
    
    # Format GLB minimal (header seulement)
    glb_data = bytearray([
        # Header: glTF, version 2, length
        0x67, 0x6C, 0x54, 0x46,  # "glTF"
        0x02, 0x00, 0x00, 0x00,  # Version 2
        0x20, 0x00, 0x00, 0x00,  # Length: 32 bytes
        
        # JSON chunk
        0x12, 0x00, 0x00, 0x00,  # Chunk length: 18
        0x4A, 0x53, 0x4F, 0x4E,  # "JSON"
        # JSON content: {"asset":{"version":"2.0"}}
        0x7B, 0x22, 0x61, 0x73, 0x73, 0x65, 0x74, 0x22,
        0x3A, 0x7B, 0x22, 0x76, 0x65, 0x72, 0x73, 0x69,
        0x6F, 0x6E, 0x22, 0x3A, 0x22, 0x32, 0x2E, 0x30,
        0x22, 0x7D, 0x7D,
        
        # BIN chunk (vide)
        0x00, 0x00, 0x00, 0x00,  # Chunk length: 0
        0x42, 0x49, 0x4E, 0x44   # "BIND"
    ])
    
    with open(test_file, 'wb') as f:
        f.write(glb_data)
    
    print(f"✅ Fichier de test créé: models/test-glasses.glb")
    print("   Note: C'est un placeholder. Remplacez par vos vrais fichiers .glb")
    
    return test_file

# ============================================================
# POINT D'ENTRÉE
# ============================================================
def main():
    """Fonction principale"""
    
    print("🔧 NWADRI AR - Configuration du serveur")
    print("-" * 40)
    
    # Vérifier les dépendances
    if not check_dependencies():
        print("❌ Dépendances manquantes. Python 3.6+ requis.")
        sys.exit(1)
    
    # Déterminer le répertoire de base
    base_directory = os.getcwd()
    print(f"📁 Répertoire courant: {base_directory}")
    
    # Créer la structure de dossiers
    create_directory_structure(base_directory)
    
    # Vérifier les fichiers .glb
    glb_files = check_for_glb_files(base_directory)
    
    # Si aucun fichier .glb, en créer un pour tester
    if not glb_files:
        create_test_glb()
        glb_files = [Path("models/test-glasses.glb")]
    
    # Créer des fichiers d'exemple si nécessaire
    create_example_files(base_directory)
    
    # Afficher les instructions
    print_instructions(base_directory, glb_files)
    
    # Configurer le serveur
    handler = lambda *args: NWADRIRequestHandler(*args)
    server = NWADRIServer((HOST, PORT), handler, base_directory)
    
    # Démarrer le serveur
    try:
        print(f"\n⚡ Serveur démarré sur http://{HOST}:{PORT}")
        print("📱 IP locale:", get_local_ip())
        print("\n🔄 En attente de connexions...")
        print("   Appuyez sur Ctrl+C pour arrêter\n")
        
        server.serve_forever()
        
    except KeyboardInterrupt:
        print("\n\n👋 Serveur arrêté par l'utilisateur")
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"\n❌ Le port {PORT} est déjà utilisé.")
            print("   Essayez un autre port ou fermez l'autre programme.")
            print("   Pour changer le port: python server.py --port 8080")
        else:
            print(f"\n❌ Erreur serveur: {e}")
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
    finally:
        server.server_close()
        print("✅ Serveur fermé proprement")

# ============================================================
# EXÉCUTION
# ============================================================
if __name__ == "__main__":
    # Gérer les arguments en ligne de commande
    import argparse
    
    parser = argparse.ArgumentParser(description="NWADRI AR Server")
    parser.add_argument("--port", type=int, default=PORT, help="Port du serveur")
    parser.add_argument("--host", type=str, default=HOST, help="Hôte du serveur")
    parser.add_argument("--dir", type=str, help="Répertoire à servir")
    
    args = parser.parse_args()
    
    PORT = args.port
    HOST = args.host
    
    if args.dir:
        os.chdir(args.dir)
    
    main()
