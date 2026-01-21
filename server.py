#!/usr/bin/env python3
"""
Simple HTTP server for AR Glasses Try-On
Run with: python server.py
"""

import http.server
import socketserver
import os
import sys

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve files with proper MIME types
        if self.path == '/':
            self.path = '/index.html'
        
        # Set CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Check if index.html exists
    if not os.path.exists('index.html'):
        print("ERROR: index.html not found!")
        print("Make sure index.html is in the same directory as server.py")
        sys.exit(1)
    
    print("\n" + "="*60)
    print("🎓 AR Glasses Try-On Server")
    print("="*60)
    print(f"\n📁 Serving from: {os.getcwd()}")
    print(f"🌐 Open your browser and visit: http://localhost:{PORT}")
    print("\n📱 On mobile (same network):")
    print("   1. Find your computer's IP address")
    print(f"   2. Visit: http://YOUR_IP:{PORT}")
    print("\n⚠️  Important:")
    print("   • Use Chrome or Edge for best results")
    print("   • Allow camera access when prompted")
    print("   • Ensure good lighting for face detection")
    print("\n🔄 Press Ctrl+C to stop the server")
    print("="*60 + "\n")
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")
        except Exception as e:
            print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    run_server()
