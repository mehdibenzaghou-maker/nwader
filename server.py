import http.server
import socketserver
import os

PORT = 8000

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def do_GET(self):
        # Serve index.html for all routes
        if self.path == '/' or self.path == '':
            self.path = '/index.html'
        return super().do_GET()

def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print(f"\n{'='*60}")
    print("🎓 PERFECT AR GLASSES TRY-ON SERVER")
    print("="*60)
    print(f"\n📁 Serving from: {os.getcwd()}")
    print(f"🌐 Open in browser: http://localhost:{PORT}")
    print("\n📱 On mobile (same WiFi):")
    print("   Use your computer's IP address")
    print(f"   Example: http://192.168.1.X:{PORT}")
    print("\n🎯 Features:")
    print("   • Real 3D glasses models")
    print("   • Perfect face fitting")
    print("   • Instant face tracking")
    print("   • Multiple styles")
    print("\n🔄 Press Ctrl+C to stop")
    print("="*60)
    
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")
        except Exception as e:
            print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    run_server()
