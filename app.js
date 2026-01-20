// NWADRI AR - Version avec suivi facial et fichiers .glb
class NwadriARFaceTracking {
    constructor() {
        // Éléments DOM
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('ar-canvas');
        this.loading = document.getElementById('loading');
        this.loadingText = document.getElementById('loading-text');
        
        // État
        this.isCameraActive = false;
        this.isARActive = false;
        this.currentModel = '1';
        this.faceDetector = null;
        this.faceLandmarks = null;
        this.faceMesh = null;
        
        // Variables Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.videoTexture = null;
        this.currentGlasses = null;
        
        // Cache des modèles GLB
        this.glbCache = new Map();
        
        // Configuration des modèles .glb
        this.models = {
            '1': {
                name: 'Vortex Noir',
                price: '€149',
                glbFile: 'https://pub-72b1924cc2494065a2af6bf69f360686.r2.dev/Nwader.glb',  // ← VOTRE FICHIER .glb
                scale: 0.12,                     // Ajustez selon votre modèle
                position: { x: 0, y: 0, z: 0 },   // Sera ajusté par suivi facial
                rotation: { x: 0, y: 0, z: 0 },
                previewColor: '#000000'
            },
            '2': {
                name: 'Solar Gold',
                price: '€179',
                glbFile: 'models/glasses2.glb',  // ← VOTRE FICHIER .glb
                scale: 0.12,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: Math.PI, z: 0 },
                previewColor: '#FFD700'
            },
            '3': {
                name: 'Nebula Grey',
                price: '€169',
                glbFile: 'models/glasses3.glb',  // ← VOTRE FICHIER .glb
                scale: 0.11,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                previewColor: '#2C3E50'
            },
            '4': {
                name: 'Ocean Blue',
                price: '€159',
                glbFile: 'models/glasses4.glb',  // ← VOTRE FICHIER .glb
                scale: 0.13,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: Math.PI, z: 0 },
                previewColor: '#3498DB'
            }
        };
        
        // Points du visage pour le placement des lunettes
        this.facePoints = {
            leftEye: null,
            rightEye: null,
            nose: null,
            faceCenter: null
        };
        
        // Initialisation
        this.init();
    }
    
    async init() {
        console.log('🎭 NWADRI AR Face Tracking - Initialisation...');
        
        // Vérifier la compatibilité
        if (!this.checkCompatibility()) {
            this.showError('Votre navigateur ne supporte pas les fonctionnalités nécessaires');
            return;
        }
        
        // Initialiser le canvas
        this.initCanvas();
        
        // Configurer les événements
        this.setupEventListeners();
        
        // Tester le chargement des modèles
        await this.testModelFiles();
        
        this.updateUI();
        console.log('✅ NWADRI AR Face Tracking - Prêt!');
    }
    
    checkCompatibility() {
        // Vérifier WebGL
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            console.error('WebGL non supporté');
            return false;
        }
        
        // Vérifier getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('getUserMedia non supporté');
            return false;
        }
        
        // Vérifier Three.js
        if (typeof THREE === 'undefined') {
            console.error('Three.js non chargé');
            return false;
        }
        
        return true;
    }
    
    initCanvas() {
        // Ajuster la taille du canvas
        this.updateCanvasSize();
        
        // Pour mobile
        if (this.isMobile()) {
            this.canvas.style.width = '100%';
            this.canvas.style.height = '60vh';
        }
    }
    
    updateCanvasSize() {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
    }
    
    isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }
    
    // ==================== GESTION CAMÉRA ====================
    async startCamera() {
        try {
            this.showLoading('Accès à la caméra...');
            
            // Arrêter si déjà actif
            if (this.isCameraActive) {
                this.stopCamera();
            }
            
            // Paramètres de la caméra
            const constraints = {
                video: {
                    facingMode: 'user', // Caméra frontale
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };
            
            // Obtenir le flux vidéo
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Configurer la vidéo
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
            
            // Initialiser Three.js avec la vidéo
            this.initThreeJS();
            
            // Initialiser le suivi facial
            await this.initFaceTracking();
            
            this.hideLoading();
            this.showMessage('✅ Caméra activée!', 'success');
            this.updateUI();
            
        } catch (error) {
            console.error('❌ Erreur caméra:', error);
            this.hideLoading();
            this.handleCameraError(error);
        }
    }
    
    stopCamera() {
        if (this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }
        
        this.isCameraActive = false;
        this.isARActive = false;
        this.video.style.display = 'none';
        
        // Nettoyer Three.js
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        this.updateUI();
    }
    
    handleCameraError(error) {
        let message = 'Erreur caméra: ';
        
        switch (error.name) {
            case 'NotAllowedError':
                message = '❌ Accès à la caméra refusé. Autorisez l\'accès dans les paramètres de votre navigateur.';
                break;
            case 'NotFoundError':
                message = '❌ Aucune caméra trouvée sur cet appareil.';
                break;
            case 'NotReadableError':
                message = '❌ La caméra est déjà utilisée par une autre application.';
                break;
            case 'OverconstrainedError':
                message = '❌ La caméra ne supporte pas les paramètres demandés.';
                break;
            default:
                message = '❌ Erreur inconnue: ' + error.message;
        }
        
        this.showMessage(message, 'error');
    }
    
    // ==================== THREE.JS ====================
    initThreeJS() {
        try {
            console.log('🎮 Initialisation Three.js avec vidéo...');
            
            // Créer la scène
            this.scene = new THREE.Scene();
            this.scene.background = null;
            
            // Créer la caméra Three.js
            const aspect = this.video.videoWidth / this.video.videoHeight;
            const viewportHeight = 2;
            const viewportWidth = viewportHeight * aspect;
            
            this.camera = new THREE.OrthographicCamera(
                -viewportWidth / 2,
                viewportWidth / 2,
                viewportHeight / 2,
                -viewportHeight / 2,
                0.1,
                1000
            );
            
            this.camera.position.z = 5;
            
            // Créer le renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: true,
                preserveDrawingBuffer: true
            });
            
            this.renderer.setSize(this.canvas.width, this.canvas.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.autoClear = false;
            
            // Créer la texture vidéo
            this.createVideoBackground();
            
            // Ajouter des lumières
            this.addLights();
            
            console.log('✅ Three.js initialisé');
            
        } catch (error) {
            console.error('❌ Erreur Three.js:', error);
            this.showMessage('Erreur graphique: ' + error.message, 'error');
        }
    }
    
    createVideoBackground() {
        // Créer une texture à partir de la vidéo
        this.videoTexture = new THREE.VideoTexture(this.video);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        this.videoTexture.format = THREE.RGBFormat;
        
        // Créer un plan pour afficher la vidéo en fond
        const videoGeometry = new THREE.PlaneGeometry(2, 2);
        const videoMaterial = new THREE.MeshBasicMaterial({
            map: this.videoTexture,
            transparent: false
        });
        
        const videoPlane = new THREE.Mesh(videoGeometry, videoMaterial);
        videoPlane.position.z = -1; // En arrière-plan
        this.scene.add(videoPlane);
    }
    
    addLights() {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        // Lumière directionnelle (pour les reflets)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // Lumière frontale (pour éclairer le visage)
        const frontLight = new THREE.PointLight(0xffffff, 0.3);
        frontLight.position.set(0, 0, 2);
        this.scene.add(frontLight);
    }
    
    // ==================== CHARGEMENT FICHIERS .glb ====================
    async testModelFiles() {
        console.log('🔍 Test des fichiers .glb...');
        
        for (const [modelId, modelInfo] of Object.entries(this.models)) {
            try {
                const exists = await this.checkFileExists(modelInfo.glbFile);
                console.log(`   ${modelId}: ${modelInfo.glbFile} - ${exists ? '✅ Trouvé' : '❌ Non trouvé'}`);
                
                if (!exists) {
                    console.warn(`   Fichier manquant: ${modelInfo.glbFile}`);
                    console.warn(`   Création d'un modèle de secours...`);
                    
                    // Créer un modèle de secours
                    this.models[modelId].useFallback = true;
                }
            } catch (error) {
                console.error(`   Erreur test ${modelId}:`, error);
            }
        }
    }
    
    async checkFileExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }
    
    async loadGLBModel(modelId) {
        const modelInfo = this.models[modelId];
        
        // Vérifier le cache
        if (this.glbCache.has(modelId)) {
            console.log(`📦 Utilisation du cache pour ${modelId}`);
            return this.glbCache.get(modelId).clone();
        }
        
        // Si fichier manquant ou erreur, utiliser fallback
        if (modelInfo.useFallback) {
            console.log(`🔄 Utilisation du fallback pour ${modelId}`);
            return this.createFallbackGlasses(modelInfo);
        }
        
        try {
            console.log(`📥 Chargement ${modelInfo.glbFile}...`);
            
            // Charger avec Three.js GLTFLoader
            const loader = new THREE.GLTFLoader();
            
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    modelInfo.glbFile,
                    (gltf) => {
                        console.log(`✅ Modèle ${modelId} chargé`);
                        resolve(gltf);
                    },
                    (progress) => {
                        // Afficher la progression
                        if (progress.lengthComputable) {
                            const percent = (progress.loaded / progress.total * 100).toFixed(1);
                            console.log(`   Progression: ${percent}%`);
                        }
                    },
                    (error) => {
                        console.error(`❌ Erreur chargement ${modelId}:`, error);
                        reject(error);
                    }
                );
            });
            
            // Préparer le modèle
            const model = gltf.scene;
            
            // Appliquer les paramètres
            model.scale.set(modelInfo.scale, modelInfo.scale, modelInfo.scale);
            model.position.set(
                modelInfo.position.x,
                modelInfo.position.y,
                modelInfo.position.z
            );
            model.rotation.set(
                modelInfo.rotation.x,
                modelInfo.rotation.y,
                modelInfo.rotation.z
            );
            
            // Optimiser le modèle
            this.optimizeModel(model);
            
            // Mettre en cache
            this.glbCache.set(modelId, model.clone());
            
            return model;
            
        } catch (error) {
            console.error(`❌ Échec chargement ${modelId}, fallback activé:`, error);
            
            // Créer un modèle de secours
            const fallbackModel = this.createFallbackGlasses(modelInfo);
            this.glbCache.set(modelId, fallbackModel.clone());
            
            return fallbackModel;
        }
    }
    
    optimizeModel(model) {
        // Traverser tous les meshes du modèle
        model.traverse((child) => {
            if (child.isMesh) {
                // Optimiser les matériaux
                if (child.material) {
                    child.material.side = THREE.DoubleSide;
                    
                    // Pour les verres, rendre transparent
                    if (child.name.toLowerCase().includes('glass') || 
                        child.name.toLowerCase().includes('lens')) {
                        child.material.transparent = true;
                        child.material.opacity = 0.7;
                    }
                }
            }
        });
    }
    
    createFallbackGlasses(modelInfo) {
        console.log(`🎨 Création fallback pour ${modelInfo.name}`);
        
        const group = new THREE.Group();
        group.name = `fallback-${modelInfo.name}`;
        
        // Couleurs selon le modèle
        const frameColor = modelInfo.previewColor || 0x000000;
        const lensColor = 0x1a5276;
        
        // Matériaux
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: frameColor,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const lensMaterial = new THREE.MeshPhysicalMaterial({
            color: lensColor,
            transmission: 0.6,
            roughness: 0.1,
            transparent: true,
            opacity: 0.5
        });
        
        // Cadre gauche
        const leftFrame = new THREE.Mesh(
            new THREE.TorusGeometry(0.5, 0.05, 16, 100),
            frameMaterial
        );
        leftFrame.position.x = -0.6;
        leftFrame.rotation.y = Math.PI / 2;
        
        // Cadre droit
        const rightFrame = new THREE.Mesh(
            new THREE.TorusGeometry(0.5, 0.05, 16, 100),
            frameMaterial
        );
        rightFrame.position.x = 0.6;
        rightFrame.rotation.y = Math.PI / 2;
        
        // Pont
        const bridge = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8),
            frameMaterial
        );
        
        // Verres
        const leftLens = new THREE.Mesh(
            new THREE.CircleGeometry(0.45, 32),
            lensMaterial
        );
        leftLens.position.x = -0.6;
        leftLens.position.z = 0.03;
        
        const rightLens = new THREE.Mesh(
            new THREE.CircleGeometry(0.45, 32),
            lensMaterial
        );
        rightLens.position.x = 0.6;
        rightLens.position.z = 0.03;
        
        // Branches
        const leftTemple = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.04, 0.04),
            frameMaterial
        );
        leftTemple.position.set(-1.0, 0, 0);
        leftTemple.rotation.z = -0.2;
        
        const rightTemple = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.04, 0.04),
            frameMaterial
        );
        rightTemple.position.set(1.0, 0, 0);
        rightTemple.rotation.z = 0.2;
        
        // Assembler
        group.add(leftFrame, rightFrame, bridge, leftLens, rightLens, leftTemple, rightTemple);
        
        // Appliquer l'échelle
        group.scale.set(modelInfo.scale, modelInfo.scale, modelInfo.scale);
        
        return group;
    }
    
    // ==================== SUIVI FACIAL SIMPLE ====================
    async initFaceTracking() {
        console.log('👁️ Initialisation suivi facial...');
        
        // Pour une solution simple, nous allons utiliser une approximation
        // Basée sur la position de la vidéo
        
        // Position fixe au centre (sera ajustée par l'utilisateur)
        this.facePoints = {
            leftEye: { x: -0.3, y: 0, z: 0 },
            rightEye: { x: 0.3, y: 0, z: 0 },
            nose: { x: 0, y: -0.2, z: 0 },
            faceCenter: { x: 0, y: 0, z: 0 }
        };
        
        console.log('✅ Suivi facial initialisé (mode simple)');
    }
    
    updateFacePosition() {
        // Dans cette version simple, nous gardons une position fixe
        // Mais nous pouvons ajouter des ajustements manuels
        
        if (!this.currentGlasses) return;
        
        // Positionner les lunettes sur le "visage"
        const modelInfo = this.models[this.currentModel];
        
        // Ajustement basé sur la taille de la vidéo
        const videoAspect = this.video.videoWidth / this.video.videoHeight;
        const scaleFactor = 1 / videoAspect;
        
        this.currentGlasses.position.set(
            this.facePoints.faceCenter.x * scaleFactor,
            this.facePoints.faceCenter.y,
            this.facePoints.faceCenter.z
        );
        
        // Ajuster la taille selon la distance
        const distanceFactor = 1.0; // À ajuster
        this.currentGlasses.scale.set(
            modelInfo.scale * distanceFactor,
            modelInfo.scale * distanceFactor,
            modelInfo.scale * distanceFactor
        );
    }
    
    // ==================== GESTION AR ====================
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
            this.showLoading('Chargement des lunettes...');
            
            // Charger les lunettes actuelles
            this.currentGlasses = await this.loadGLBModel(this.currentModel);
            
            // Positionner sur le visage
            this.updateFacePosition();
            
            // Ajouter à la scène
            this.scene.add(this.currentGlasses);
            
            // Démarrer l'animation
            this.isARActive = true;
            this.startAnimation();
            
            this.hideLoading();
            this.showMessage('✨ Lunettes AR activées!', 'success');
            this.updateUI();
            
            // Afficher les contrôles d'ajustement
            this.showAdjustmentControls();
            
        } catch (error) {
            console.error('❌ Erreur démarrage AR:', error);
            this.hideLoading();
            this.showMessage('Erreur AR: ' + error.message, 'error');
        }
    }
    
    stopAR() {
        this.isARActive = false;
        
        // Retirer les lunettes
        if (this.currentGlasses && this.scene) {
            this.scene.remove(this.currentGlasses);
            this.currentGlasses = null;
        }
        
        // Cacher les contrôles d'ajustement
        this.hideAdjustmentControls();
        
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
            
            // Rendu
            if (this.renderer && this.scene && this.camera) {
                this.renderer.clear();
                this.renderer.render(this.scene, this.camera);
            }
        };
        
        animate();
    }
    
    async switchGlasses(modelId) {
        if (!this.isARActive) {
            this.currentModel = modelId;
            return;
        }
        
        try {
            this.showLoading('Changement de lunettes...');
            
            // Retirer les anciennes
            if (this.currentGlasses && this.scene) {
                this.scene.remove(this.currentGlasses);
            }
            
            // Charger les nouvelles
            this.currentModel = modelId;
            this.currentGlasses = await this.loadGLBModel(modelId);
            
            // Positionner
            this.updateFacePosition();
            
            // Ajouter à la scène
            this.scene.add(this.currentGlasses);
            
            // Animation d'apparition
            this.animateGlassesSwitch();
            
            this.hideLoading();
            this.showMessage(`👓 ${this.models[modelId].name}`, 'info');
            
        } catch (error) {
            console.error('Erreur changement lunettes:', error);
            this.hideLoading();
        }
    }
    
    animateGlassesSwitch() {
        if (!this.currentGlasses) return;
        
        const originalScale = this.currentGlasses.scale.clone();
        this.currentGlasses.scale.set(0.01, 0.01, 0.01);
        
        let progress = 0;
        const duration = 500;
        
        const animate = () => {
            progress += 16.67;
            const t = Math.min(progress / duration, 1);
            
            // Animation élastique
            const elastic = t => {
                return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.cos(t * Math.PI * 4.5);
            };
            
            const scale = 0.01 + (originalScale.x - 0.01) * elastic(t);
            this.currentGlasses.scale.set(scale, scale, scale);
            
            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    // ==================== CONTROLES D'AJUSTEMENT ====================
    showAdjustmentControls() {
        // Créer les contrôles si ils n'existent pas
        if (!document.getElementById('adjustment-controls')) {
            const controls = document.createElement('div');
            controls.id = 'adjustment-controls';
            controls.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.7);
                padding: 15px;
                border-radius: 10px;
                display: flex;
                gap: 10px;
                z-index: 100;
                backdrop-filter: blur(10px);
            `;
            
            controls.innerHTML = `
                <div style="color: white; margin-right: 10px;">
                    <small>Ajustez la position:</small>
                </div>
                <button id="adjust-up" style="padding: 8px 12px; background: #00dbde; border: none; border-radius: 5px; color: white; cursor: pointer;">
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button id="adjust-down" style="padding: 8px 12px; background: #00dbde; border: none; border-radius: 5px; color: white; cursor: pointer;">
                    <i class="fas fa-arrow-down"></i>
                </button>
                <button id="adjust-left" style="padding: 8px 12px; background: #00dbde; border: none; border-radius: 5px; color: white; cursor: pointer;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <button id="adjust-right" style="padding: 8px 12px; background: #00dbde; border: none; border-radius: 5px; color: white; cursor: pointer;">
                    <i class="fas fa-arrow-right"></i>
                </button>
                <button id="adjust-bigger" style="padding: 8px 12px; background: #fc00ff; border: none; border-radius: 5px; color: white; cursor: pointer;">
                    <i class="fas fa-search-plus"></i>
                </button>
                <button id="adjust-smaller" style="padding: 8px 12px; background: #fc00ff; border: none; border-radius: 5px; color: white; cursor: pointer;">
                    <i class="fas fa-search-minus"></i>
                </button>
                <button id="adjust-reset" style="padding: 8px 12px; background: #ff416c; border: none; border-radius: 5px; color: white; cursor: pointer;">
                    <i class="fas fa-redo"></i>
                </button>
            `;
            
            document.querySelector('.ar-container').appendChild(controls);
            
            // Ajouter les événements
            this.setupAdjustmentEvents();
        }
    }
    
    hideAdjustmentControls() {
        const controls = document.getElementById('adjustment-controls');
        if (controls) {
            controls.remove();
        }
    }
    
    setupAdjustmentEvents() {
        // Haut
        document.getElementById('adjust-up').addEventListener('click', () => {
            if (this.currentGlasses) {
                this.currentGlasses.position.y += 0.02;
            }
        });
        
        // Bas
        document.getElementById('adjust-down').addEventListener('click', () => {
            if (this.currentGlasses) {
                this.currentGlasses.position.y -= 0.02;
            }
        });
        
        // Gauche
        document.getElementById('adjust-left').addEventListener('click', () => {
            if (this.currentGlasses) {
                this.currentGlasses.position.x -= 0.02;
            }
        });
        
        // Droite
        document.getElementById('adjust-right').addEventListener('click', () => {
            if (this.currentGlasses) {
                this.currentGlasses.position.x += 0.02;
            }
        });
        
        // Agrandir
        document.getElementById('adjust-bigger').addEventListener('click', () => {
            if (this.currentGlasses) {
                this.currentGlasses.scale.multiplyScalar(1.1);
            }
        });
        
        // Rétrécir
        document.getElementById('adjust-smaller').addEventListener('click', () => {
            if (this.currentGlasses) {
                this.currentGlasses.scale.multiplyScalar(0.9);
            }
        });
        
        // Réinitialiser
        document.getElementById('adjust-reset').addEventListener('click', () => {
            if (this.currentGlasses) {
                const modelInfo = this.models[this.currentModel];
                this.currentGlasses.position.set(0, 0, 0);
                this.currentGlasses.scale.set(modelInfo.scale, modelInfo.scale, modelInfo.scale);
                this.currentGlasses.rotation.set(0, 0, 0);
            }
        });
    }
    
    // ==================== GESTION UI ====================
    setupEventListeners() {
        // Activer Caméra
        document.getElementById('startCamera').addEventListener('click', () => {
            this.startCamera();
        });
        
        // Démarrer AR
        document.getElementById('startAR').addEventListener('click', () => {
            this.startAR();
        });
        
        // Arrêter AR
        document.getElementById('stopAR').addEventListener('click', () => {
            this.stopAR();
        });
        
        // Changer Caméra
        document.getElementById('switchCamera').addEventListener('click', () => {
            this.switchCamera();
        });
        
        // Sélection lunettes
        document.querySelectorAll('.glass-item').forEach(item => {
            item.addEventListener('click', () => {
                const modelId = item.dataset.model;
                
                // Mettre à jour la sélection
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
        
        // Touch events pour mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e));
    }
    
    handleTouch(e) {
        if (!this.isARActive || !this.currentGlasses) return;
        
        e.preventDefault();
        
        if (e.touches.length === 1) {
            // Déplacement
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            
            const x = ((touch.clientX - rect.left) / rect.width - 0.5) * 2;
            const y = -((touch.clientY - rect.top) / rect.height - 0.5) * 2;
            
            this.currentGlasses.position.x = x * 0.5;
            this.currentGlasses.position.y = y * 0.5;
            
        } else if (e.touches.length === 2) {
            // Zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            if (this.lastTouchDistance) {
                const scaleChange = distance / this.lastTouchDistance;
                this.currentGlasses.scale.multiplyScalar(scaleChange);
            }
            
            this.lastTouchDistance = distance;
        }
    }
    
    onResize() {
        this.updateCanvasSize();
        
        if (this.camera && this.renderer) {
            // Pour OrthographicCamera
            const aspect = this.video.videoWidth / this.video.videoHeight;
            const viewportHeight = 2;
            const viewportWidth = viewportHeight * aspect;
            
            this.camera.left = -viewportWidth / 2;
            this.camera.right = viewportWidth / 2;
            this.camera.top = viewportHeight / 2;
            this.camera.bottom = -viewportHeight / 2;
            this.camera.updateProjectionMatrix();
            
            this.renderer.setSize(this.canvas.width, this.canvas.height);
        }
    }
    
    updateUI() {
        const startCameraBtn = document.getElementById('startCamera');
        const startARBtn = document.getElementById('startAR');
        const stopARBtn = document.getElementById('stopAR');
        const switchCameraBtn = document.getElementById('switchCamera');
        
        if (startCameraBtn) startCameraBtn.disabled = this.isCameraActive;
        if (startARBtn) startARBtn.disabled = !this.isCameraActive || this.isARActive;
        if (stopARBtn) stopARBtn.disabled = !this.isARActive;
        if (switchCameraBtn) switchCameraBtn.disabled = !this.isCameraActive;
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
                message.style.opacity = '0';
                setTimeout(() => {
                    if (message.parentElement) {
                        message.parentElement.removeChild(message);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    showError(text) {
        this.showMessage(text, 'error');
    }
    
    switchCamera() {
        // Basculer entre caméra avant/arrière
        this.stopCamera();
        setTimeout(() => this.startCamera(), 500);
    }
    
    // ==================== NETTOYAGE ====================
    cleanup() {
        this.stopAR();
        this.stopCamera();
        
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        if (this.videoTexture) {
            this.videoTexture.dispose();
            this.videoTexture = null;
        }
        
        this.glbCache.clear();
        
        console.log('🧹 NWADRI AR nettoyé');
    }
    
    // ==================== UTILITAIRES ====================
    getDebugInfo() {
        return {
            cameraActive: this.isCameraActive,
            ARActive: this.isARActive,
            currentModel: this.currentModel,
            modelLoaded: !!this.currentGlasses,
            cacheSize: this.glbCache.size,
            videoSize: {
                width: this.video.videoWidth,
                height: this.video.videoHeight
            },
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            }
        };
    }
    
    // Pour ajuster manuellement la position
    adjustPosition(x = 0, y = 0, z = 0) {
        if (this.currentGlasses) {
            this.currentGlasses.position.x += x;
            this.currentGlasses.position.y += y;
            this.currentGlasses.position.z += z;
        }
    }
    
    adjustScale(factor = 1) {
        if (this.currentGlasses) {
            this.currentGlasses.scale.multiplyScalar(factor);
        }
    }
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎭 NWADRI AR Face Tracking - Chargement...');
    
    // Vérifier la version de Three.js
    if (typeof THREE === 'undefined') {
        console.error('❌ Three.js non chargé!');
        alert('Erreur: Three.js non chargé. Vérifiez votre connexion internet.');
        return;
    }
    
    // Créer l'application
    window.nwadriApp = new NwadriARFaceTracking();
    
    // Pour débogage dans la console
    console.log('💡 Commandes disponibles:');
    console.log('   nwadriApp.getDebugInfo() - Informations système');
    console.log('   nwadriApp.adjustPosition(0, 0.1, 0) - Ajuster position');
    console.log('   nwadriApp.adjustScale(1.1) - Ajuster taille');
    
    // Nettoyage
    window.addEventListener('beforeunload', () => {
        if (window.nwadriApp) {
            window.nwadriApp.cleanup();
        }
    });
    
    // Message de démarrage
    setTimeout(() => {
        console.log('🚀 NWADRI AR prêt!');
        console.log('👉 Placez vos fichiers .glb dans le dossier models/');
    }, 1000);
});
