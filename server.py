from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl
import os

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    
    # For HTTPS (needed for camera access in some browsers)
    try:
        # Create self-signed certificate for development
        import subprocess
        if not os.path.exists('localhost.pem'):
            print("Creating self-signed certificate...")
            subprocess.run([
                'openssl', 'req', '-x509', '-newkey', 'rsa:4096',
                '-keyout', 'localhost.key', '-out', 'localhost.crt',
                '-days', '365', '-nodes', '-subj', '/CN=localhost'
            ], check=True)
            subprocess.run([
                'cat', 'localhost.key', 'localhost.crt'
            ], stdout=open('localhost.pem', 'w'), check=True)
        
        httpd.socket = ssl.wrap_socket(
            httpd.socket,
            server_side=True,
            certfile='localhost.pem',
            ssl_version=ssl.PROTOCOL_TLS
        )
        print(f"HTTPS server running at https://localhost:{port}")
    except:
        print(f"HTTP server running at http://localhost:{port}")
        print("Note: Camera may require HTTPS on some browsers")
    
    print("Server is running...")
    print("Press Ctrl+C to stop")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == '__main__':
    run_server()
