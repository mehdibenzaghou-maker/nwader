// server.js - Serveur local simple
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.glb': 'model/gltf-binary',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Ajouter CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Gérer OPTIONS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // Déterminer le fichier
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    // Obtenir l'extension
    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // Lire le fichier
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 - Fichier non trouvé');
            } else {
                res.writeHead(500);
                res.end('500 - Erreur serveur: ' + error.code);
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
    console.log('\n📱 Instructions:');
    console.log('   1. Ouvrez http://localhost:3000');
    console.log('   2. Cliquez sur "Activer la Caméra"');
    console.log('   3. Autorisez l\'accès à la caméra');
    console.log('   4. Cliquez sur "Démarrer AR"');
    console.log('   5. Choisissez des lunettes!');
    console.log('\n⚠️  IMPORTANT: Utilisez Chrome ou Edge sur mobile');
});

// Gérer la fermeture propre
process.on('SIGINT', () => {
    console.log('\n\n👋 Arrêt du serveur...');
    process.exit(0);
});
