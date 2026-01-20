// NWADRI AR - Système complet avec caméra
class NwadriARCamera {
    constructor() {
        // Éléments DOM
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('ar-canvas');
        this.loading = document.getElementById('loading');
        this.loadingText = document.getElementById('loading-text');
        
        // État de l'application
        this.isCameraActive = false;
        this.isARActive = false;
        this.currentModel = '1';
        this.currentCamera = 'user'; // 'user' = frontal, 'environment' = arrière
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // Variables Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.videoTexture = null;
        this.videoMesh = null;
        this.currentGlasses = null;
        
        // Cache des modèles
        this.modelCache = new Map();
        
        // Configuration des modèles
        this.models = {
            '1': {
                name: 'Vortex Noir',
                price: '€149',
                color: '#000000',
                scale: 0.25,
                position: { x: 0, y: -0.1, z: -0.4 }
            },
            '2': {
                name: 'Solar Gold',
                price: '€179',
                color: '#FFD700',
                scale: 0.28,
                position: { x: 0, y: -0.08, z: -0.38 }
            },
            '3': {
                name: 'Nebula Grey',
                price: '€169',
                color: '#2C3E50',
                scale: 0.26,
                position: { x: 0, y: -0.09, z: -0.39 }
            },
            '4': {
                name: 'Ocean Blue',
                price: '€159',
                color: '#3498DB',
                scale: 0.27,
                position: { x: 0, y: -0.07, z: -0.37 }
            }
        };
        
        // Initialisation
        this.init();
    }
    
    init() {
        console.log('🚀 NWADRI AR - Initialisation...');
        
        // Initialiser le canvas
        this.initCanvas();
        
        // Configurer les événements
        this.setupEventListeners();
        
        // Mettre à jour l'interface
        this.updateUI();
        
        console.log('✅ NWADRI AR - Prêt!');
        this.showMessage('Cliquez sur "Activer la Caméra" pour commencer', 'info');
    }
    
    initCanvas() {
        // Définir la taille du canvas
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        
        // Pour mobile, ajuster la taille
        if (this.isMobile) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight * 0.6;
        }
    }
    
    // ==================== GESTION CAMÉRA ====================
    async startCamera() {
        try {
            this.showLoading('Accès à la caméra...');
            
            // Vérifier les permissions
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Votre navigateur ne supporte pas l\'accès à la caméra');
            }
            
            // Paramètres de la caméra
            const constraints = {
                video: {
                    facingMode: this.currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };
            
            // Obtenir le flux vidéo
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Connecter au vidéo
            this.video.srcObject = stream;
            
            // Attendre que la vidéo soit prête
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
            
            // Mettre à jour l'état
            this.isCameraActive = true;
            this.video.style.display = 'block';
            
            // Mettre à jour l'interface
            this.updateUI();
            
            this.hideLoading();
            this.showMessage('✅ Caméra activée! Cliquez sur "Démarrer AR"', 'success');
            
            // Initialiser Three.js
            this.initThreeJS();
            
        } catch (error) {
            console.error('❌ Erreur caméra:', error);
            this.hideLoading();
            
            if (error.name === 'NotAllowedError') {
                this.showMessage('❌ Accès à la caméra refusé. Autorisez l\'accès et réessayez.', 'error');
            } else if (error.name === 'NotFoundError') {
                this.showMessage('❌ Aucune caméra trouvée sur cet appareil.', 'error');
            } else {
                this.showMessage('❌ Erreur caméra: ' + error.message, 'error');
            }
            
            // Fallback: utiliser une image statique
            this.useImageFallback();
        }
    }
    
    stopCamera() {
        if (this.video.srcObject) {
            // Arrêter tous les tracks
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }
        
        this.isCameraActive = false;
        this.video.style.display = 'none';
        this.updateUI();
    }
    
    async switchCamera() {
        // Changer entre caméra avant/arrière
        this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
        
        // Arrêter la caméra actuelle
        this.stopCamera();
        
        // Redémarrer avec la nouvelle caméra
        setTimeout(() => this.startCamera(), 500);
    }
    
    useImageFallback() {
        console.log('Utilisation du fallback image');
        
        // Créer un canvas de fallback
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Ajouter un message
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Mode démo - Caméra non disponible', this.canvas.width/2, this.canvas.height/2);
        
        this.showMessage('Mode démo activé (pas de caméra)', 'info');
    }
    
    // ==================== THREE.JS ====================
    initThreeJS() {
        try {
            console.log('🎮 Initialisation Three.js...');
            
            // Créer la scène
            this.scene = new THREE.Scene();
            
            // Créer la caméra Three.js
            const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
            this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
            this.camera.position.set(0, 0, 5);
            
            // Créer le renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Ajouter des lumières
            this.addLights();
            
            // Créer la texture vidéo
            this.createVideoTexture();
            
            console.log('✅ Three.js initialisé');
            
        } catch (error) {
            console.error('❌ Erreur Three.js:', error);
            this.showMessage('Erreur graphique: ' + error.message, 'error');
        }
    }
    
    createVideoTexture() {
        // Créer une texture à partir de la vidéo
        this.videoTexture = new THREE.VideoTexture(this.video);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        this.videoTexture.format = THREE.RGBAFormat;
        
        // Créer un plan pour afficher la vidéo
        const videoGeometry = new THREE.PlaneGeometry(16, 9);
        const videoMaterial = new THREE.MeshBasicMaterial({
            map: this.videoTexture,
            transparent: true,
            opacity: 1.0
        });
        
        this.videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
        this.videoMesh.position.z = -10;
        this.scene.add(this.videoMesh);
    }
    
    addLights() {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Lumière directionnelle
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // Lumière frontale (pour éclairer les lunettes)
        const frontLight = new THREE.PointLight(0xffffff, 0.5, 10);
        frontLight.position.set(0, 0, 3);
        this.scene.add(frontLight);
    }
    
    // ==================== GESTION MODÈLES 3D ====================
    async loadGlasses(modelId) {
        try {
            const modelInfo = this.models[modelId];
            if (!modelInfo) {
                throw new Error('Modèle non trouvé');
            }
            
            // Vérifier le cache
            if (this.modelCache.has(modelId)) {
                console.log('Utilisation du cache pour modèle', modelId);
                return this.modelCache.get(modelId).clone();
            }
            
            // Créer le modèle 3D
            const glasses = this.createGlasses3D(modelInfo);
            
            // Mettre en cache
            this.modelCache.set(modelId, glasses.clone());
            
            return glasses;
            
        } catch (error) {
            console.error('Erreur création modèle:', error);
            return this.createFallbackGlasses();
        }
    }
    
    createGlasses3D(modelInfo) {
        const group = new THREE.Group();
        
        // Paramètres
        const frameRadius = 0.5;
        const bridgeWidth = 0.2;
        const lensRadius = frameRadius * 0.9;
        
        // Matériaux
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: modelInfo.color,
            metalness: 0.9,
            roughness: 0.1,
            emissive: new THREE.Color(modelInfo.color).multiplyScalar(0.1)
        });
        
        const lensMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x1a5276,
            transmission: 0.8,
            roughness: 0.05,
            thickness: 0.3,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        // Cadre gauche
        const leftFrameGeometry = new THREE.TorusGeometry(frameRadius, 0.05, 16, 100);
        const leftFrame = new THREE.Mesh(leftFrameGeometry, frameMaterial);
        leftFrame.position.x = -frameRadius - bridgeWidth/2;
        leftFrame.rotation.y = Math.PI / 2;
        
        // Cadre droit
        const rightFrameGeometry = new THREE.TorusGeometry(frameRadius, 0.05, 16, 100);
        const rightFrame = new THREE.Mesh(rightFrameGeometry, frameMaterial);
        rightFrame.position.x = frameRadius + bridgeWidth/2;
        rightFrame.rotation.y = Math.PI / 2;
        
        // Pont
        const bridgeGeometry = new THREE.CylinderGeometry(0.03, 0.03, bridgeWidth, 8);
        const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
        bridge.position.x = 0;
        
        // Verres
        const lensGeometry = new THREE.CircleGeometry(lensRadius, 32);
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.position.x = -frameRadius - bridgeWidth/2;
        leftLens.position.z = 0.02;
        
        const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
        rightLens.position.x = frameRadius + bridgeWidth/2;
        rightLens.position.z = 0.02;
        
        // Branches
        const templeGeometry = new THREE.BoxGeometry(1.2, 0.03, 0.03);
        
        const leftTemple = new THREE.Mesh(templeGeometry, frameMaterial);
        leftTemple.position.set(-frameRadius - bridgeWidth/2 - 0.6, 0, 0);
        leftTemple.rotation.z = -0.3;
        
        const rightTemple = new THREE.Mesh(templeGeometry, frameMaterial);
        rightTemple.position.set(frameRadius + bridgeWidth/2 + 0.6, 0, 0);
        rightTemple.rotation.z = 0.3;
        
        // Assembler
        group.add(leftFrame, rightFrame, bridge, leftLens, rightLens, leftTemple, rightTemple);
        
        // Appliquer l'échelle
        group.scale.set(modelInfo.scale, modelInfo.scale, modelInfo.scale);
        
        return group;
    }
    
    createFallbackGlasses() {
        const group = new THREE.Group();
        
        // Lunettes simples de secours
        const geometry = new THREE.BoxGeometry(1, 0.5, 0.05);
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const glasses = new THREE.Mesh(geometry, material);
        group.add(glasses);
        
        return group;
    }
    
    // ==================== AR ====================
    async startAR() {
        if (!this.isCameraActive) {
            this.showMessage('Activez d\'abord la caméra!', 'error');
            return;
        }
        
        if (!this.scene) {
            this.showMessage('Erreur: Three.js non initialisé', 'error');
            return;
        }
        
        try {
            this.showLoading('Démarrage AR...');
            
            // Charger les lunettes actuelles
            this.currentGlasses = await this.loadGlasses(this.currentModel);
            
            // Positionner les lunettes devant la caméra
            const modelInfo = this.models[this.currentModel];
            this.currentGlasses.position.set(
                modelInfo.position.x,
                modelInfo.position.y,
                modelInfo.position.z
            );
            
            // Ajouter à la scène
            this.scene.add(this.currentGlasses);
            
            // Démarrer l'animation
            this.isARActive = true;
            this.startAnimation();
            
            // Mettre à jour l'interface
            this.updateUI();
            
            this.hideLoading();
            this.showMessage('✨ AR activé! Les lunettes apparaissent sur le flux vidéo', 'success');
            
        } catch (error) {
            console.error('❌ Erreur démarrage AR:', error);
            this.hideLoading();
            this.showMessage('Erreur AR: ' + error.message, 'error');
        }
    }
    
    stopAR() {
        this.isARActive = false;
        
        // Retirer les lunettes de la scène
        if (this.currentGlasses && this.scene) {
            this.scene.remove(this.currentGlasses);
            this.currentGlasses = null;
        }
        
        // Mettre à jour l'interface
        this.updateUI();
        
        this.showMessage('AR arrêté', 'info');
    }
    
    startAnimation() {
        const animate = () => {
            if (!this.isARActive) return;
            
            requestAnimationFrame(animate);
            
            // Mettre à jour la texture vidéo
            if (this.videoTexture) {
                this.videoTexture.needsUpdate = true;
            }
            
            // Animation des lunettes
            if (this.currentGlasses) {
                // Rotation subtile
                this.currentGlasses.rotation.y += 0.005;
                
                // Effet de "flottement" léger
                const time = Date.now() * 0.001;
                this.currentGlasses.position.y = this.models[this.currentModel].position.y + Math.sin(time) * 0.02;
            }
            
            // Rendu
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        
        animate();
    }
    
    async switchGlasses(modelId) {
        if (!this.isARActive) return;
        
        try {
            // Retirer les anciennes lunettes
            if (this.currentGlasses && this.scene) {
                this.scene.remove(this.currentGlasses);
            }
            
            // Charger les nouvelles lunettes
            this.currentModel = modelId;
            this.currentGlasses = await this.loadGlasses(modelId);
            
            // Positionner
            const modelInfo = this.models[modelId];
            this.currentGlasses.position.set(
                modelInfo.position.x,
                modelInfo.position.y,
                modelInfo.position.z
            );
            
            // Ajouter à la scène
            this.scene.add(this.currentGlasses);
            
            // Effet de transition
            this.animateGlassesSwitch();
            
            this.showMessage(`Lunettes changées: ${modelInfo.name}`, 'info');
            
        } catch (error) {
            console.error('Erreur changement lunettes:', error);
        }
    }
    
    animateGlassesSwitch() {
        if (!this.currentGlasses) return;
        
        // Animation d'apparition
        const originalScale = this.currentGlasses.scale.clone();
        this.currentGlasses.scale.set(0.1, 0.1, 0.1);
        
        let progress = 0;
        const duration = 400; // ms
        
        const animate = () => {
            progress += 16.67;
            const t = Math.min(progress / duration, 1);
            
            // Easing
            const easeOut = t => t * (2 - t);
            
            const scale = 0.1 + (originalScale.x - 0.1) * easeOut(t);
            this.currentGlasses.scale.set(scale, scale, scale);
            
            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    // ==================== UI ====================
    setupEventListeners() {
        // Bouton Activer Caméra
        document.getElementById('startCamera').addEventListener('click', () => {
            this.startCamera();
        });
        
        // Bouton Démarrer AR
        document.getElementById('startAR').addEventListener('click', () => {
            this.startAR();
        });
        
        // Bouton Arrêter AR
        document.getElementById('stopAR').addEventListener('click', () => {
            this.stopAR();
        });
        
        // Bouton Changer Caméra
        document.getElementById('switchCamera').addEventListener('click', () => {
            this.switchCamera();
        });
        
        // Sélection des lunettes
        document.querySelectorAll('.glass-item').forEach(item => {
            item.addEventListener('click', () => {
                const modelId = item.dataset.model;
                
                // Mettre à jour la sélection visuelle
                document.querySelectorAll('.glass-item').forEach(el => {
                    el.classList.remove('active');
                });
                item.classList.add('active');
                
                // Changer les lunettes
                this.switchGlasses(modelId);
            });
        });
        
        // Redimensionnement
        window.addEventListener('resize', () => {
            this.onResize();
        });
        
        // Gestion erreurs vidéo
        this.video.addEventListener('error', (e) => {
            console.error('Erreur vidéo:', e);
            this.showMessage('Erreur flux vidéo', 'error');
        });
    }
    
    onResize() {
        // Redimensionner le canvas
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        
        // Mettre à jour Three.js
        if (this.camera && this.renderer) {
            this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        }
    }
    
    updateUI() {
        const startCameraBtn = document.getElementById('startCamera');
        const startARBtn = document.getElementById('startAR');
        const stopARBtn = document.getElementById('stopAR');
        const switchCameraBtn = document.getElementById('switchCamera');
        
        // Bouton caméra
        if (startCameraBtn) {
            startCameraBtn.disabled = this.isCameraActive;
        }
        
        // Bouton AR
        if (startARBtn) {
            startARBtn.disabled = !this.isCameraActive || this.isARActive;
        }
        
        // Bouton arrêter
        if (stopARBtn) {
            stopARBtn.disabled = !this.isARActive;
        }
        
        // Bouton changer caméra
        if (switchCameraBtn) {
            switchCameraBtn.disabled = !this.isCameraActive;
        }
    }
    
    showLoading(text) {
        if (this.loading && this.loadingText) {
            this.loadingText.textContent = text;
            this.loading.style.display = 'flex';
        }
    }
    
    hideLoading() {
        if (this.loading) {
            this.loading.style.display = 'none';
        }
    }
    
    showMessage(text, type = 'info') {
        // Supprimer ancien message
        const oldMessage = document.querySelector('.message');
        if (oldMessage) oldMessage.remove();
        
        // Créer nouveau message
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 
                              type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${text}
        `;
        
        document.body.appendChild(message);
        
        // Auto-suppression
        setTimeout(() => {
            if (message.parentElement) {
                message.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => {
                    if (message.parentElement) {
                        message.parentElement.removeChild(message);
                    }
                }, 300);
            }
        }, 4000);
    }
    
    // ==================== UTILITAIRES ====================
    async testCameraAccess() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch {
            return false;
        }
    }
    
    getCameraInfo() {
        return {
            isMobile: this.isMobile,
            cameraActive: this.isCameraActive,
            ARActive: this.isARActive,
            currentCamera: this.currentCamera,
            currentModel: this.currentModel,
            canvasSize: { width: this.canvas.width, height: this.canvas.height }
        };
    }
    
    // ==================== NETTOYAGE ====================
    cleanup() {
        this.stopAR();
        this.stopCamera();
        
        // Nettoyer Three.js
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        if (this.videoTexture) {
            this.videoTexture.dispose();
            this.videoTexture = null;
        }
        
        // Nettoyer le cache
        this.modelCache.clear();
        
        console.log('🧹 NWADRI AR nettoyé');
    }
}

// ==================== DÉMARRAGE ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 NWADRI - Chargement...');
    
    // Créer l'application
    window.nwadriApp = new NwadriARCamera();
    
    // Pour débogage
    console.log('💡 Pour déboguer:');
    console.log('   - Tapez "nwadriApp.getCameraInfo()" pour les infos');
    console.log('   - Tapez "nwadriApp.testCameraAccess()" pour tester la caméra');
    
    // Nettoyage à la fermeture
    window.addEventListener('beforeunload', () => {
        if (window.nwadriApp) {
            window.nwadriApp.cleanup();
        }
    });
    
    // Message de bienvenue
    setTimeout(() => {
        console.log('🎉 NWADRI AR prêt!');
    }, 1000);
});
