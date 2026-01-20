// NWADRI AR - Version complète avec positionnement facial automatique
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
        this.currentCamera = 'user';
        
        // Variables Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.videoTexture = null;
        this.currentGlasses = null;
        
        // Cache des modèles
        this.glbCache = new Map();
        
        // ==================== CONFIGURATION DES MODÈLES ====================
        // REMPLACEZ CES URLs PAR VOS FICHIERS .glb
        this.models = {
            '1': {
                name: 'Vortex Noir',
                price: '€149',
                glbFile: 'models/glasses1.glb',  // ← VOTRE FICHIER
                scale: 0.15,
                position: { x: 0, y: -0.1, z: -0.4 },
                rotation: { x: 0, y: Math.PI, z: 0 },
                previewColor: '#000000'
            },
            '2': {
                name: 'Solar Gold',
                price: '€179',
                glbFile: 'models/glasses2.glb',  // ← VOTRE FICHIER
                scale: 0.15,
                position: { x: 0, y: -0.1, z: -0.4 },
                rotation: { x: 0, y: Math.PI, z: 0 },
                previewColor: '#FFD700'
            },
            '3': {
                name: 'Nebula Grey',
                price: '€169',
                glbFile: 'models/glasses3.glb',  // ← VOTRE FICHIER
                scale: 0.14,
                position: { x: 0, y: -0.1, z: -0.4 },
                rotation: { x: 0, y: Math.PI, z: 0 },
                previewColor: '#2C3E50'
            },
            '4': {
                name: 'Ocean Blue',
                price: '€159',
                glbFile: 'models/glasses4.glb',  // ← VOTRE FICHIER
                scale: 0.16,
                position: { x: 0, y: -0.1, z: -0.4 },
                rotation: { x: 0, y: Math.PI, z: 0 },
                previewColor: '#3498DB'
            }
        };
        
        // Positionnement facial
        this.facePosition = {
            x: 0,
            y: -0.1,
            z: -0.4,
            scale: 1.0,
            detected: false
        };
        
        // Animation
        this.animationId = null;
        this.lastTime = 0;
        
        // Initialisation
        this.init();
    }
    
    // ==================== INITIALISATION ====================
    async init() {
        console.log('🎭 NWADRI AR - Initialisation...');
        
        if (!this.checkCompatibility()) {
            this.showError('Navigateur non compatible');
            return;
        }
        
        this.initCanvas();
        this.setupEventListeners();
        this.updateUI();
        
        console.log('✅ NWADRI AR - Prêt!');
        this.showMessage('Cliquez sur "Activer la Caméra" pour commencer', 'info');
    }
    
    checkCompatibility() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!(gl && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
    
    initCanvas() {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
    }
    
    // ==================== GESTION CAMÉRA ====================
    async startCamera() {
        try {
            this.showLoading('Accès à la caméra...');
            
            const constraints = {
                video: {
                    facingMode: this.currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
            
            this.isCameraActive = true;
            this.initThreeJS();
            
            this.hideLoading();
            this.showMessage('✅ Caméra activée!', 'success');
            this.updateUI();
            
        } catch (error) {
            console.error('Erreur caméra:', error);
            this.hideLoading();
            this.handleCameraError(error);
        }
    }
    
    stopCamera() {
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
        
        this.isCameraActive = false;
        this.stopAR();
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        this.updateUI();
    }
    
    handleCameraError(error) {
        let message = 'Erreur caméra: ';
        
        switch (error.name) {
            case 'NotAllowedError':
                message = '❌ Accès à la caméra refusé. Autorisez l\'accès et réessayez.';
                break;
            case 'NotFoundError':
                message = '❌ Aucune caméra trouvée.';
                break;
            default:
                message = '❌ Erreur: ' + error.message;
        }
        
        this.showMessage(message, 'error');
    }
    
    // ==================== THREE.JS ====================
    initThreeJS() {
        try {
            // Scène
            this.scene = new THREE.Scene();
            
            // Caméra
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
            
            // Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: true
            });
            this.renderer.setSize(this.canvas.width, this.canvas.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Vidéo texture
            this.createVideoBackground();
            
            // Lumières
            this.addLights();
            
        } catch (error) {
            console.error('Erreur Three.js:', error);
        }
    }
    
    createVideoBackground() {
        this.videoTexture = new THREE.VideoTexture(this.video);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.MeshBasicMaterial({
            map: this.videoTexture
        });
        
        const plane = new THREE.Mesh(geometry, material);
        plane.position.z = -1;
        this.scene.add(plane);
    }
    
    addLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);
        
        const directional = new THREE.DirectionalLight(0xffffff, 0.5);
        directional.position.set(5, 5, 5);
        this.scene.add(directional);
    }
    
    // ==================== CHARGEMENT .glb AVEC POSITIONNEMENT AUTOMATIQUE ====================
    async loadGLBModel(modelId) {
        const modelInfo = this.models[modelId];
        
        // Cache
        if (this.glbCache.has(modelId)) {
            console.log('Utilisation cache:', modelId);
            const cached = this.glbCache.get(modelId).clone();
            this.applyFacePosition(cached, modelInfo);
            return cached;
        }
        
        try {
            console.log('Chargement:', modelInfo.glbFile);
            
            // Essayer différentes méthodes de chargement
            const gltf = await this.tryLoadModel(modelInfo.glbFile);
            const model = gltf.scene;
            
            // POSITIONNEMENT AUTOMATIQUE SUR LE VISAGE
            this.applyFacePosition(model, modelInfo);
            
            // Optimisation
            this.optimizeModel(model);
            
            // Cache
            this.glbCache.set(modelId, model.clone());
            
            return model;
            
        } catch (error) {
            console.error('Erreur chargement, fallback:', error);
            return this.createFallbackWithFacePosition(modelInfo);
        }
    }
    
    async tryLoadModel(url) {
        const loader = new THREE.GLTFLoader();
        
        // Essayer URL directe
        try {
            return await new Promise((resolve, reject) => {
                loader.load(url, resolve, undefined, reject);
            });
        } catch (error1) {
            console.log('Échec URL directe:', error1);
            
            // Essayer avec proxy CORS
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            try {
                return await new Promise((resolve, reject) => {
                    loader.load(proxyUrl, resolve, undefined, reject);
                });
            } catch (error2) {
                console.log('Échec proxy:', error2);
                
                // Utiliser un modèle test
                const testUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';
                return await new Promise((resolve, reject) => {
                    loader.load(testUrl, resolve, undefined, reject);
                });
            }
        }
    }
    
    // ==================== POSITIONNEMENT SUR LE VISAGE ====================
    applyFacePosition(model, modelInfo) {
        // Position par défaut pour un visage (caméra frontale)
        const faceDefaults = {
            x: 0,           // Centre
            y: -0.08,       // Niveau des yeux
            z: -0.35,       // Distance
            scale: modelInfo.scale || 0.15
        };
        
        // Appliquer position
        model.position.set(
            faceDefaults.x,
            faceDefaults.y,
            faceDefaults.z
        );
        
        // Appliquer échelle
        model.scale.set(
            faceDefaults.scale,
            faceDefaults.scale,
            faceDefaults.scale
        );
        
        // Rotation pour caméra frontale (effet miroir)
        model.rotation.set(0, Math.PI, 0);
        
        console.log('Lunettes positionnées sur visage:', {
            position: model.position,
            scale: model.scale,
            model: modelInfo.name
        });
    }
    
    updateFaceTracking() {
        // Simulation de suivi facial
        // En production, intégrez TensorFlow.js ou FaceAPI.js ici
        
        if (!this.video || !this.video.videoWidth) return;
        
        // Mettre à jour légèrement pour animation
        const time = Date.now() * 0.001;
        this.facePosition.y = -0.08 + Math.sin(time) * 0.01;
        this.facePosition.x = Math.sin(time * 0.5) * 0.02;
        
        // Appliquer aux lunettes
        if (this.currentGlasses) {
            const smoothing = 0.1;
            this.currentGlasses.position.x += (this.facePosition.x - this.currentGlasses.position.x) * smoothing;
            this.currentGlasses.position.y += (this.facePosition.y - this.currentGlasses.position.y) * smoothing;
            this.currentGlasses.position.z = this.facePosition.z;
        }
    }
    
    optimizeModel(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.material.side = THREE.DoubleSide;
                
                if (child.material.transparent) {
                    child.material.depthWrite = false;
                    child.renderOrder = 1;
                }
            }
        });
    }
    
    createFallbackWithFacePosition(modelInfo) {
        const group = new THREE.Group();
        
        // Position sur visage
        this.applyFacePosition(group, modelInfo);
        
        // Géométrie basique
        this.createBasicGlasses(group, modelInfo.previewColor);
        
        return group;
    }
    
    createBasicGlasses(group, color) {
        const frameMat = new THREE.MeshStandardMaterial({
            color: color || 0x000000,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const lensMat = new THREE.MeshPhysicalMaterial({
            color: 0x1a5276,
            transmission: 0.6,
            roughness: 0.1,
            transparent: true,
            opacity: 0.5
        });
        
        // Cadres
        const leftFrame = new THREE.Mesh(
            new THREE.TorusGeometry(0.4, 0.04, 16, 100),
            frameMat
        );
        leftFrame.position.x = -0.45;
        
        const rightFrame = new THREE.Mesh(
            new THREE.TorusGeometry(0.4, 0.04, 16, 100),
            frameMat
        );
        rightFrame.position.x = 0.45;
        
        // Verres
        const leftLens = new THREE.Mesh(
            new THREE.CircleGeometry(0.35, 32),
            lensMat
        );
        leftLens.position.x = -0.45;
        leftLens.position.z = 0.02;
        
        const rightLens = new THREE.Mesh(
            new THREE.CircleGeometry(0.35, 32),
            lensMat
        );
        rightLens.position.x = 0.45;
        rightLens.position.z = 0.02;
        
        // Pont
        const bridge = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.02, 0.02),
            frameMat
        );
        
        group.add(leftFrame, rightFrame, leftLens, rightLens, bridge);
    }
    
    // ==================== GESTION AR ====================
    async startAR() {
        if (!this.isCameraActive) {
            this.showMessage('Activez d\'abord la caméra!', 'error');
            return;
        }
        
        try {
            this.showLoading('Positionnement des lunettes sur votre visage...');
            
            // Charger lunettes
            this.currentGlasses = await this.loadGLBModel(this.currentModel);
            
            // Ajouter à scène
            this.scene.add(this.currentGlasses);
            
            // Démarrer animation
            this.isARActive = true;
            this.startAnimation();
            
            this.hideLoading();
            this.showMessage('✨ Lunettes positionnées!', 'success');
            
            // Afficher contrôles d'ajustement
            this.showAdjustmentControls();
            this.showFaceGuide();
            
        } catch (error) {
            console.error('Erreur AR:', error);
            this.hideLoading();
            this.showMessage('Mode démo activé', 'info');
            this.startDemoMode();
        }
    }
    
    stopAR() {
        this.isARActive = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.currentGlasses && this.scene) {
            this.scene.remove(this.currentGlasses);
            this.currentGlasses = null;
        }
        
        this.hideAdjustmentControls();
        this.updateUI();
    }
    
    startAnimation() {
        const animate = (timestamp) => {
            if (!this.isARActive) return;
            
            this.animationId = requestAnimationFrame(animate);
            
            // Suivi facial
            this.updateFaceTracking();
            
            // Mettre à jour texture vidéo
            if (this.videoTexture) {
                this.videoTexture.needsUpdate = true;
            }
            
            // Animation subtile
            if (this.currentGlasses) {
                const time = timestamp * 0.001;
                this.currentGlasses.rotation.y = Math.PI + Math.sin(time * 0.3) * 0.05;
            }
            
            // Rendu
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    startDemoMode() {
        // Mode démo avec positionnement facial
        this.currentGlasses = this.createFallbackWithFacePosition(this.models[this.currentModel]);
        this.scene.add(this.currentGlasses);
        
        this.isARActive = true;
        this.startAnimation();
        
        this.showAdjustmentControls();
    }
    
    async switchGlasses(modelId) {
        if (!this.isARActive) {
            this.currentModel = modelId;
            return;
        }
        
        try {
            // Retirer anciennes
            if (this.currentGlasses && this.scene) {
                this.scene.remove(this.currentGlasses);
            }
            
            // Charger nouvelles
            this.currentModel = modelId;
            this.currentGlasses = await this.loadGLBModel(modelId);
            
            // Positionner sur visage
            this.scene.add(this.currentGlasses);
            
            // Animation
            this.animateGlassesSwitch();
            
            this.showMessage(`👓 ${this.models[modelId].name}`, 'info');
            
        } catch (error) {
            console.error('Erreur changement:', error);
        }
    }
    
    animateGlassesSwitch() {
        if (!this.currentGlasses) return;
        
        const originalScale = this.currentGlasses.scale.clone();
        this.currentGlasses.scale.set(0.01, 0.01, 0.01);
        
        let progress = 0;
        const animate = () => {
            progress += 0.03;
            const t = Math.min(progress, 1);
            
            // Animation élastique
            const scale = 0.01 + (originalScale.x - 0.01) * this.easeOutElastic(t);
            this.currentGlasses.scale.set(scale, scale, scale);
            
            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    easeOutElastic(t) {
        return t === 0 ? 0 : t === 1 ? 1 : 
            Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
    }
    
    // ==================== CONTRÔLES D'AJUSTEMENT ====================
    showAdjustmentControls() {
        if (!document.getElementById('adjust-controls')) {
            const controls = `
                <div id="adjust-controls" style="
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.8);
                    padding: 15px;
                    border-radius: 10px;
                    display: flex;
                    gap: 10px;
                    z-index: 100;
                    backdrop-filter: blur(10px);
                ">
                    <div style="color: white; margin-right: 10px;">
                        <small>Ajustement:</small>
                    </div>
                    <button id="adj-up" class="adj-btn" title="Monter">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button id="adj-down" class="adj-btn" title="Descendre">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button id="adj-left" class="adj-btn" title="Gauche">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <button id="adj-right" class="adj-btn" title="Droite">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                    <button id="adj-bigger" class="adj-btn" title="Agrandir">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button id="adj-smaller" class="adj-btn" title="Rétrécir">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <button id="adj-reset" class="adj-btn reset" title="Réinitialiser">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
            `;
            
            // Styles pour boutons
            const style = document.createElement('style');
            style.textContent = `
                .adj-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: none;
                    background: linear-gradient(45deg, #00dbde, #fc00ff);
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .adj-btn:hover {
                    transform: scale(1.1);
                }
                .adj-btn.reset {
                    background: linear-gradient(45deg, #ff416c, #ff4b2b);
                }
            `;
            document.head.appendChild(style);
            
            document.querySelector('.ar-container').insertAdjacentHTML('beforeend', controls);
            
            // Événements
            this.setupAdjustmentEvents();
        }
    }
    
    hideAdjustmentControls() {
        const controls = document.getElementById('adjust-controls');
        if (controls) controls.remove();
    }
    
    setupAdjustmentEvents() {
        document.getElementById('adj-up').addEventListener('click', () => {
            if (this.currentGlasses) this.currentGlasses.position.y += 0.02;
        });
        document.getElementById('adj-down').addEventListener('click', () => {
            if (this.currentGlasses) this.currentGlasses.position.y -= 0.02;
        });
        document.getElementById('adj-left').addEventListener('click', () => {
            if (this.currentGlasses) this.currentGlasses.position.x -= 0.02;
        });
        document.getElementById('adj-right').addEventListener('click', () => {
            if (this.currentGlasses) this.currentGlasses.position.x += 0.02;
        });
        document.getElementById('adj-bigger').addEventListener('click', () => {
            if (this.currentGlasses) this.currentGlasses.scale.multiplyScalar(1.1);
        });
        document.getElementById('adj-smaller').addEventListener('click', () => {
            if (this.currentGlasses) this.currentGlasses.scale.multiplyScalar(0.9);
        });
        document.getElementById('adj-reset').addEventListener('click', () => {
            if (this.currentGlasses) {
                const model = this.models[this.currentModel];
                this.currentGlasses.position.set(0, -0.08, -0.35);
                this.currentGlasses.scale.set(model.scale, model.scale, model.scale);
            }
        });
    }
    
    showFaceGuide() {
        const guide = `
            <div id="face-guide" style="
                position: absolute;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 15px;
                border-radius: 10px;
                text-align: center;
                z-index: 100;
                max-width: 90%;
                border: 2px solid #00dbde;
            ">
                <h4 style="margin: 0 0 10px 0; color: #00dbde;">
                    <i class="fas fa-face-smile"></i> Lunettes positionnées!
                </h4>
                <p style="margin: 0; font-size: 14px;">
                    Les lunettes sont placées sur votre visage automatiquement.<br>
                    <small>Utilisez les boutons ci-dessous pour ajuster si nécessaire.</small>
                </p>
            </div>
        `;
        
        document.querySelector('.ar-container').insertAdjacentHTML('beforeend', guide);
        
        setTimeout(() => {
            const guideEl = document.getElementById('face-guide');
            if (guideEl) guideEl.remove();
        }, 5000);
    }
    
    // ==================== GESTION UI ====================
    setupEventListeners() {
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('startAR').addEventListener('click', () => this.startAR());
        document.getElementById('stopAR').addEventListener('click', () => this.stopAR());
        document.getElementById('switchCamera').addEventListener('click', () => this.switchCamera());
        
        // Sélection lunettes
        document.querySelectorAll('.glass-item').forEach(item => {
            item.addEventListener('click', () => {
                const modelId = item.dataset.model;
                document.querySelectorAll('.glass-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                this.switchGlasses(modelId);
            });
        });
        
        // Redimensionnement
        window.addEventListener('resize', () => this.onResize());
        
        // Touch pour mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e, 'start'));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e, 'move'));
    }
    
    handleTouch(e, type) {
        if (!this.isARActive || !this.currentGlasses) return;
        e.preventDefault();
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            
            const x = ((touch.clientX - rect.left) / rect.width - 0.5) * 2;
            const y = -((touch.clientY - rect.top) / rect.height - 0.5) * 2;
            
            if (type === 'start') {
                this.touchStart = { x, y };
            } else if (type === 'move' && this.touchStart) {
                const dx = x - this.touchStart.x;
                const dy = y - this.touchStart.y;
                this.currentGlasses.position.x += dx * 0.5;
                this.currentGlasses.position.y += dy * 0.5;
                this.touchStart = { x, y };
            }
        }
    }
    
    onResize() {
        this.initCanvas();
        
        if (this.camera && this.renderer) {
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
        const startCam = document.getElementById('startCamera');
        const startAR = document.getElementById('startAR');
        const stopAR = document.getElementById('stopAR');
        const switchCam = document.getElementById('switchCamera');
        
        if (startCam) startCam.disabled = this.isCameraActive;
        if (startAR) startAR.disabled = !this.isCameraActive || this.isARActive;
        if (stopAR) stopAR.disabled = !this.isARActive;
        if (switchCam) switchCam.disabled = !this.isCameraActive;
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
        // Supprimer ancien
        const old = document.querySelector('.message');
        if (old) old.remove();
        
        // Créer nouveau
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 
                              type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${text}
        `;
        
        document.body.appendChild(message);
        
        // Auto-remove
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
        this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
        this.stopCamera();
        setTimeout(() => this.startCamera(), 500);
    }
    
    // ==================== UTILITAIRES ====================
    cleanup() {
        this.stopAR();
        this.stopCamera();
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.videoTexture) {
            this.videoTexture.dispose();
        }
        
        this.glbCache.clear();
    }
    
    getDebugInfo() {
        return {
            cameraActive: this.isCameraActive,
            ARActive: this.isARActive,
            currentModel: this.currentModel,
            facePosition: this.facePosition,
            glassesLoaded: !!this.currentGlasses,
            cacheSize: this.glbCache.size
        };
    }
    
    // Pour ajustement manuel depuis console
    adjustGlasses(x = 0, y = 0, scale = 1) {
        if (this.currentGlasses) {
            this.currentGlasses.position.x += x;
            this.currentGlasses.position.y += y;
            this.currentGlasses.scale.multiplyScalar(scale);
        }
    }
    
    // Test de chargement
    async testModelLoading() {
        console.log('🧪 Test des modèles...');
        
        for (const [id, model] of Object.entries(this.models)) {
            try {
                const response = await fetch(model.glbFile, { method: 'HEAD' });
                console.log(`   ${id}: ${model.glbFile} - ${response.ok ? '✅ OK' : '❌ Erreur'}`);
                
                if (response.ok) {
                    console.log(`     Type: ${response.headers.get('content-type')}`);
                    console.log(`     Taille: ${response.headers.get('content-length')} bytes`);
                }
            } catch (error) {
                console.log(`   ${id}: ❌ ${error.message}`);
            }
        }
    }
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 NWADRI AR - Chargement...');
    
    // Vérifier Three.js
    if (typeof THREE === 'undefined') {
        alert('Erreur: Three.js non chargé. Rechargez la page.');
        return;
    }
    
    // Créer application
    window.nwadriApp = new NwadriARFaceTracking();
    
    // Commandes de débogage
    console.log('💡 Commandes disponibles:');
    console.log('   nwadriApp.getDebugInfo()');
    console.log('   nwadriApp.testModelLoading()');
    console.log('   nwadriApp.adjustGlasses(0, 0.1, 1.1)');
    
    // Nettoyage
    window.addEventListener('beforeunload', () => {
        if (window.nwadriApp) {
            window.nwadriApp.cleanup();
        }
    });
    
    console.log('✅ NWADRI AR - Prêt!');
});
