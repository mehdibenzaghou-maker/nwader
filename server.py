import http.server
import socketserver
import os

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Always serve index.html for root
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("\n" + "="*60)
    print("🚀 PERFECT AR GLASSES TRY-ON")
    print("="*60)
    print(f"\n📁 Serving from: {os.getcwd()}")
    print(f"🌐 Open browser: http://localhost:{PORT}")
    print("\n📱 Mobile access (same WiFi):")
    print("   Find your IP and use: http://YOUR_IP:8000")
    print("\n🎯 Features:")
    print("   • Clean organized layout")
    print("   • Real 3D glasses models")
    print("   • Perfect auto-fitting")
    print("   • Multiple styles")
    print("   • Working GLB loading")
    print("\n🔄 Press Ctrl+C to stop")
    print("="*60)
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")

if __name__ == "__main__":
    run_server()
