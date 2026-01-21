import http.server
import socketserver
import ssl
import os
import sys
from pathlib import Path

PORT = 8000

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        # Custom log format
        print(f"[{self.log_date_time_string()}] {self.address_string()} - {format % args}")

def check_ssl_cert():
    """Check if SSL certificate exists, create if not"""
    cert_file = 'localhost.pem'
    
    if not os.path.exists(cert_file):
        print("SSL certificate not found. Creating self-signed certificate...")
        try:
            # Create certificate using mkcert (if available) or generate self-signed
            import subprocess
            
            # Try mkcert first
            try:
                subprocess.run(['mkcert', '-install'], capture_output=True)
                subprocess.run(['mkcert', 'localhost'], capture_output=True)
                if os.path.exists('localhost.pem'):
                    print("✓ Certificate created with mkcert")
                    return True
            except:
                pass
            
            # Fallback to self-signed certificate
            from cryptography import x509
            from cryptography.x509.oid import NameOID
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import rsa
            from datetime import datetime, timedelta
            
            print("Creating self-signed certificate...")
            
            # Generate private key
            key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            
            # Generate certificate
            subject = issuer = x509.Name([
                x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
                x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "California"),
                x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "VisionAR"),
                x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
            ])
            
            cert = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                issuer
            ).public_key(
                key.public_key()
            ).serial_number(
                x509.random_serial_number()
            ).not_valid_before(
                datetime.utcnow()
            ).not_valid_after(
                datetime.utcnow() + timedelta(days=365)
            ).add_extension(
                x509.SubjectAlternativeName([x509.DNSName("localhost")]),
                critical=False,
            ).sign(key, hashes.SHA256())
            
            # Write certificate and key
            with open("localhost.pem", "wb") as f:
                f.write(key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.TraditionalOpenSSL,
                    encryption_algorithm=serialization.NoEncryption(),
                ))
                f.write(cert.public_bytes(serialization.Encoding.PEM))
            
            print("✓ Self-signed certificate created")
            return True
            
        except Exception as e:
            print(f"✗ Failed to create certificate: {e}")
            return False
    return True

def run_server():
    os.chdir(Path(__file__).parent)
    
    # Check for required files
    required_files = ['index.html', 'main.js', 'styles.css']
    missing_files = [f for f in required_files if not os.path.exists(f)]
    
    if missing_files:
        print(f"✗ Missing required files: {', '.join(missing_files)}")
        print("Please make sure all files are in the same directory.")
        return
    
    print("\n" + "="*60)
    print("🎓 AR Glasses Try-On Server")
    print("="*60)
    
    handler = CORSHTTPRequestHandler
    
    try:
        # Try HTTPS first
        if check_ssl_cert():
            httpd = socketserver.TCPServer(("", PORT), handler)
            
            # Wrap socket with SSL
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain('localhost.pem')
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
            
            print(f"\n✅ Server running at: https://localhost:{PORT}")
            print(f"📁 Serving from: {os.getcwd()}")
            print("\n⚠️  Note: You'll see a security warning for the self-signed certificate.")
            print("   This is normal for local development.")
            print("\n📱 Open your browser and visit:")
            print(f"   https://localhost:{PORT}")
            print("\n🔄 Press Ctrl+C to stop the server")
            print("="*60)
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped by user")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"\n✗ Port {PORT} is already in use!")
            print("Try: kill -9 $(lsof -t -i:8000)")
        else:
            print(f"\n✗ Error: {e}")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        print("\nTrying HTTP instead...")
        
        try:
            httpd = socketserver.TCPServer(("", PORT), handler)
            print(f"\n✅ Server running at: http://localhost:{PORT}")
            print("⚠️  Note: Camera may not work without HTTPS on some browsers")
            print("\n📱 Open your browser and visit:")
            print(f"   http://localhost:{PORT}")
            print("\n🔄 Press Ctrl+C to stop the server")
            httpd.serve_forever()
        except Exception as e:
            print(f"\n✗ Failed to start server: {e}")

if __name__ == "__main__":
    run_server()
