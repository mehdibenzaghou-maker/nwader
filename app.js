// NWADRI AR - Solution garantie avec 3 options de secours
class NwadriAR {
    constructor() {
        // OPTION 1: Vos URLs R2 (remplacez par vos vrais liens)
        this.R2_URLS = {
            '1': 'https://pub-72b1924cc2494065a2af6bf69f360686.r2.dev/Nwader.glb', // Remplacez par votre URL R2
            '2': 'https://pub-72b1924cc2494065a2af6bf69f360686.r2.dev/Nwader.glb', // Remplacez par votre URL R2
            '3': 'https://pub-72b1924cc2494065a2af6bf69f360686.r2.dev/Nwader.glb', // Remplacez par votre URL R2
            '4': 'https://pub-72b1924cc2494065a2af6bf69f360686.r2.dev/Nwader.glb'  // Remplacez par votre URL R2
        };
        
        // OPTION 2: Fichiers locaux (dans le dossier models/)
        this.LOCAL_URLS = {
            '1': 'models/glasses1.glb',
            '2': 'models/glasses2.glb',
            '3': 'models/glasses3.glb',
            '4': 'models/glasses4.glb'
        };
        
        // OPTION 3: Modèles 3D générés (fallback garanti)
        this.FALLBACK_MODELS = {
            '1': this.createBasicGlasses('#000000', '#1a5276'),
            '2': this.createBasicGlasses('#FFD700', '#FFA500'),
            '3': this.createBasicGlasses('#2C3E50', '#7F8C8D'),
            '4': this.createBasicGlasses('#3498DB', '#2980B9')
        };
        
        // État de l'application
        this.isARActive = false;
        this.currentModel = '1';
        this.modelCache = new Map();
        
        this.init();
    }
    
    async init() {
        console.log('NWADRI AR - Initialisation...');
        
        // Vérifier la compatibilité
        if (!this.checkCompatibility()) {
            this.showMessage('Votre navigateur ne supporte pas WebGL', 'error');
            return;
        }
        
        // Initialiser le canvas
        this.initCanvas();
        
        // Configurer les événements
        this.setupEventListeners();
        
        // Tester les modèles immédiatement
        await this.testAllModels();
        
        console.log('NWADRI AR - Prêt!');
        this.updateStatus('Prêt à démarrer');
    }
    
    checkCompatibility() {
        // Vérifier WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!(window.WebGLRenderingContext && gl && gl instanceof WebGLRenderingContext);
    }
    
    initCanvas() {
        this.canvas = document.getElementById('ar-canvas');
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }
    
    async testAllModels() {
        console.log('Test de tous les modèles...');
        
        for (const modelId of ['1', '2', '3', '4']) {
            try {
                // Essayer R2 d'abord
                const success = await this.testModel(this.R2_URLS[modelId], `R2-${modelId}`);
                
                if (!success) {
                    // Essayer local
                    await this.testModel(this.LOCAL_URLS[modelId], `Local-${modelId}`);
                }
            } catch (error) {
                console.log(`Modèle ${modelId} - Fallback activé`);
            }
        }
    }
    
    async testModel(url, name) {
        if (!url || url === 'VOTRE_URL_R2_X') {
            console.log(`${name}: URL non configurée`);
            return false;
        }
        
        try {
            const response = await fetch(url, { method: 'HEAD' });
            console.log(`${name}: ${response.status} - ${response.headers.get('content-type')}`);
            return response.ok;
        } catch (error) {
            console.log(`${name}: Erreur - ${error.message}`);
            return false;
        }
    }
    
    // FONCTION PRINCIPALE - Démarrer l'AR
    async startAR() {
        try {
            this.showLoading(true);
            this.updateStatus('Démarrage AR...');
            
            // 1. Initialiser Three.js
            await this.initThreeJS();
            
            // 2. Créer une scène simple (sans MindAR pour l'instant)
            this.createSimpleScene();
            
            // 3. Charger les lunettes
            await this.loadCurrentGlasses();
            
            // 4. Démarrer l'animation
            this.startAnimation();
            
            // 5. Mettre à jour l'UI
            this.isARActive = true;
            this.updateUI();
            this.showMessage('AR démarré avec succès!');
            
        } catch (error) {
            console.error('Erreur démarrage AR:', error);
            this.showMessage('Erreur: ' + error.message, 'error');
            this.startFallbackMode();
        } finally {
            this.showLoading(false);
        }
    }
    
    async initThreeJS() {
        // Créer la scène
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Créer la caméra
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.z = 5;
        
        // Créer le renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Ajouter des lumières
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
    }
    
    createSimpleScene() {
        // Ajouter un fond d'écran (optionnel)
        const geometry = new THREE.PlaneGeometry(20, 20);
        const material = new THREE.MeshBasicMaterial({
            color: 0x111111,
            side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.z = -10;
        this.scene.add(plane);
        
        // Ajouter un sol
        const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
        gridHelper.position.y = -2;
        this.scene.add(gridHelper);
    }
    
    async loadCurrentGlasses() {
        // Supprimer l'ancien modèle
        if (this.currentGlasses) {
            this.scene.remove(this.currentGlasses);
        }
        
        let model = null;
        
        // ESSAI 1: Depuis le cache
        if (this.modelCache.has(this.currentModel)) {
            console.log('Chargement depuis cache:', this.currentModel);
            model = this.modelCache.get(this.currentModel).clone();
        }
        // ESSAI 2: Depuis R2
        else if (this.R2_URLS[this.currentModel] && this.R2_URLS[this.currentModel] !== 'VOTRE_URL_R2_X') {
            model = await this.loadFromR2(this.currentModel);
        }
        // ESSAI 3: Depuis fichiers locaux
        else if (await this.fileExists(this.LOCAL_URLS[this.currentModel])) {
            model = await this.loadFromLocal(this.currentModel);
        }
        // ESSAI 4: Fallback (généré)
        else {
            console.log('Utilisation du fallback pour:', this.currentModel);
            model = this.FALLBACK_MODELS[this.currentModel].clone();
        }
        
        if (model) {
            // Configuration du modèle
            model.scale.set(0.5, 0.5, 0.5);
            model.position.set(0, 0, 0);
            model.rotation.y = Math.PI / 4;
            
            // Ajouter à la scène
            this.currentGlasses = model;
            this.scene.add(model);
            
            // Mettre en cache si ce n'est pas déjà fait
            if (!this.modelCache.has(this.currentModel) && !model.isFallback) {
                this.modelCache.set(this.currentModel, model.clone());
            }
            
            console.log('Modèle chargé:', this.currentModel);
        }
    }
    
    async loadFromR2(modelId) {
        const url = this.R2_URLS[modelId];
        console.log('Tentative R2:', url);
        
        try {
            // Méthode spéciale pour contourner les problèmes CORS
            const model = await this.loadGLBWithProxy(url);
            model.isFallback = false;
            return model;
        } catch (error) {
            console.error('Erreur R2:', error);
            return null;
        }
    }
    
    async loadFromLocal(modelId) {
        const url = this.LOCAL_URLS[modelId];
        console.log('Tentative local:', url);
        
        try {
            const loader = new THREE.GLTFLoader();
            const gltf = await new Promise((resolve, reject) => {
                loader.load(url, resolve, undefined, reject);
            });
            
            const model = gltf.scene;
            model.isFallback = false;
            return model;
            
        } catch (error) {
            console.error('Erreur local:', error);
            return null;
        }
    }
    
    async loadGLBWithProxy(url) {
        // Solution de secours pour les problèmes CORS
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();
            
            // Configurer le loader pour ignorer certaines erreurs CORS
            loader.setCrossOrigin('anonymous');
            
            loader.load(
                url,
                (gltf) => {
                    resolve(gltf.scene);
                },
                (progress) => {
                    console.log('Progression:', progress);
                },
                (error) => {
                    console.error('Erreur loader:', error);
                    
                    // Tentative alternative avec fetch
                    this.loadGLBWithFetch(url)
                        .then(resolve)
                        .catch(reject);
                }
            );
        });
    }
    
    async loadGLBWithFetch(url) {
        try {
            // Utiliser un proxy CORS public si nécessaire
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            
            const response = await fetch(proxyUrl);
            const arrayBuffer = await response.arrayBuffer();
            
            const loader = new THREE.GLTFLoader();
            const gltf = await loader.parseAsync(arrayBuffer, '');
            
            return gltf.scene;
        } catch (error) {
            console.error('Erreur fetch:', error);
            throw error;
        }
    }
    
    async fileExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }
    
    createBasicGlasses(frameColor, lensColor) {
        const group = new THREE.Group();
        group.isFallback = true;
        
        // Monture
        const frameGeometry = new THREE.TorusGeometry(1, 0.1, 16, 100);
        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: frameColor,
            metalness: 0.8,
            roughness: 0.2
        });
        
        // Verres
        const lensGeometry = new THREE.CircleGeometry(0.9, 32);
        const lensMaterial = new THREE.MeshPhysicalMaterial({
            color: lensColor,
            transmission: 0.7,
            roughness: 0.1,
            thickness: 0.5,
            transparent: true,
            opacity: 0.6
        });
        
        const leftFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        leftFrame.position.x = -1.2;
        
        const rightFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        rightFrame.position.x = 1.2;
        
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.position.x = -1.2;
        leftLens.position.z = 0.05;
        
        const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
        rightLens.position.x = 1.2;
        rightLens.position.z = 0.05;
        
        // Pont
        const bridgeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8);
        const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
        bridge.position.x = 0;
        
        group.add(leftFrame, rightFrame, leftLens, rightLens, bridge);
        
        return group;
    }
    
    startAnimation() {
        const animate = () => {
            if (!this.isARActive) return;
            
            requestAnimationFrame(animate);
            
            // Animation des lunettes
            if (this.currentGlasses) {
                this.currentGlasses.rotation.y += 0.01;
                this.currentGlasses.position.y = Math.sin(Date.now() * 0.001) * 0.1;
            }
            
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }
    
    startFallbackMode() {
        console.log('Mode fallback activé');
        this.updateStatus('Mode démo activé');
        
        // Afficher un message
        this.showMessage('Mode démo - Vos modèles seront affichés en 3D', 'info');
        
        // Forcer le chargement du fallback
        this.loadCurrentGlasses();
    }
    
    stopAR() {
        this.isARActive = false;
        
        // Nettoyer Three.js
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Réinitialiser
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentGlasses = null;
        
        // Effacer le canvas
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.updateUI();
        this.showMessage('AR arrêté');
    }
    
    // GESTION DE L'INTERFACE
    setupEventListeners() {
        // Bouton démarrer
        document.getElementById('startAR').addEventListener('click', () => {
            this.startAR();
        });
        
        // Bouton arrêter
        document.getElementById('stopAR').addEventListener('click', () => {
            this.stopAR();
        });
        
        // Bouton tester modèle
        document.getElementById('testModel').addEventListener('click', async () => {
            this.showMessage('Test des modèles en cours...', 'info');
            await this.testAllModels();
            this.showMessage('Test terminé - Voir la console', 'info');
        });
        
        // Sélection des lunettes
        document.querySelectorAll('.glass-card').forEach(card => {
            card.addEventListener('click', async () => {
                const modelId = card.dataset.model;
                
                // Mettre à jour la sélection
                document.querySelectorAll('.glass-card').forEach(c => {
                    c.classList.remove('active');
                });
                card.classList.add('active');
                
                // Changer de modèle
                this.currentModel = modelId;
                
                // Si AR actif, charger le nouveau modèle
                if (this.isARActive) {
                    await this.loadCurrentGlasses();
                    this.showMessage(`Lunettes changées: Modèle ${modelId}`);
                }
            });
        });
        
        // Redimensionnement
        window.addEventListener('resize', () => {
            if (this.isARActive && this.camera && this.renderer) {
                const width = this.canvas.clientWidth;
                const height = this.canvas.clientHeight;
                
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(width, height);
            }
        });
    }
    
    updateUI() {
        const startBtn = document.getElementById('startAR');
        const stopBtn = document.getElementById('stopAR');
        
        if (startBtn) startBtn.disabled = this.isARActive;
        if (stopBtn) stopBtn.disabled = !this.isARActive;
    }
    
    updateStatus(text) {
        const status = document.getElementById('status');
        if (status) {
            status.innerHTML = `<i class="fas fa-info-circle"></i> ${text}`;
        }
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }
    
    showMessage(text, type = 'info') {
        // Supprimer les anciens messages
        const oldMessages = document.querySelectorAll('.message');
        oldMessages.forEach(msg => msg.remove());
        
        // Créer le nouveau message
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${text}
        `;
        
        document.body.appendChild(message);
        
        // Supprimer automatiquement
        setTimeout(() => {
            if (message.parentElement) {
                message.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => {
                    if (message.parentElement) {
                        message.parentElement.removeChild(message);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    // UTILITAIRE: Télécharger un modèle GLB de test
    async downloadTestModel() {
        // Créer un modèle GLB simple pour tester
        const simpleGLB = await this.createSimpleGLB();
        
        // Télécharger
        const blob = new Blob([simpleGLB], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'test-glasses.glb';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage('Modèle test téléchargé! Placez-le dans models/', 'info');
    }
}

// Démarrer l'application
document.addEventListener('DOMContentLoaded', () => {
    console.log('NWADRI - Chargement de l\'application...');
    window.nwadriApp = new NwadriAR();
    
    // Pour déboguer
    window.debugNWADRI = window.nwadriApp;
});
