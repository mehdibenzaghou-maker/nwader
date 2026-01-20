// app.js - Application AR complète pour Nwadri
class NwadriARApp {
    constructor() {
        this.mindarThree = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.currentGlasses = null;
        this.isARActive = false;
        this.currentModel = '1';
        this.faceMesh = null;
        this.videoElement = null;
        
        // Modèles de lunettes prédéfinis
        this.glassModels = {
            '1': { // Classic Black
                frameColor: '#000000',
                lensColor: '#1a5276',
                name: 'Classic Black',
                price: '€129'
            },
            '2': { // Golden Style
                frameColor: '#FFD700',
                lensColor: '#FFA500',
                name: 'Golden Style',
                price: '€159'
            },
            '3': { // Retro Aviator
                frameColor: '#2C3E50',
                lensColor: '#7F8C8D',
                name: 'Retro Aviator', 
                price: '€149'
            },
            '4': { // Modern Blue
                frameColor: '#3498DB',
                lensColor: '#2980B9',
                name: 'Modern Blue',
                price: '€139'
            },
            '5': { // Rose Gold
                frameColor: '#E75480',
                lensColor: '#F4C2C2',
                name: 'Rose Gold',
                price: '€169'
            },
            '6': { // Sport Black
                frameColor: '#1C1C1C',
                lensColor: '#34495E',
                name: 'Sport Black',
                price: '€179'
            }
        };
        
        // État de l'application
        this.appState = {
            initialized: false,
            cameraPermission: false,
            tracking: false,
            glassesVisible: true
        };
        
        this.init();
    }
    
    async init() {
        console.log('Initialisation de Nwadri AR...');
        
        // Vérifier la compatibilité du navigateur
        if (!this.checkCompatibility()) {
            this.showError('Votre navigateur ne supporte pas la réalité augmentée. Utilisez Chrome ou Edge récent.');
            return;
        }
        
        // Initialiser l'UI
        this.setupUI();
        
        // Charger MindAR
        await this.loadMindAR();
        
        // Initialiser Three.js
        await this.initThreeJS();
        
        // Initialiser les modèles 3D
        this.init3DModels();
        
        // Configurer les événements
        this.setupEventListeners();
        
        // Créer les prévisualisations des produits
        this.createProductPreviews();
        
        this.appState.initialized = true;
        console.log('Application Nwadri AR initialisée avec succès!');
    }
    
    checkCompatibility() {
        // Vérifier WebGL
        if (!window.WebGLRenderingContext) {
            return false;
        }
        
        // Vérifier l'accès à la caméra
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return false;
        }
        
        // Vérifier Three.js
        if (!window.THREE) {
            console.error('Three.js non chargé');
            return false;
        }
        
        return true;
    }
    
    async loadMindAR() {
        return new Promise((resolve, reject) => {
            if (window.MINDAR) {
                console.log('MindAR déjà chargé');
                resolve();
                return;
            }
            
            console.log('Chargement de MindAR...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.0/dist/mindar-face.prod.js';
            script.onload = () => {
                console.log('MindAR chargé avec succès');
                resolve();
            };
            script.onerror = () => {
                console.error('Erreur de chargement de MindAR');
                reject(new Error('Impossible de charger MindAR'));
            };
            document.head.appendChild(script);
        });
    }
    
    async initThreeJS() {
        // Vérifier que Three.js est chargé
        if (!window.THREE) {
            throw new Error('Three.js non chargé');
        }
        
        // Initialiser le canvas AR
        const canvas = document.getElementById('ar-canvas');
        if (!canvas) {
            throw new Error('Canvas AR non trouvé');
        }
        
        // Définir la taille du canvas
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        console.log('Three.js initialisé sur le canvas:', canvas.width, 'x', canvas.height);
    }
    
    init3DModels() {
        // Créer les géométries de base pour les lunettes
        console.log('Initialisation des modèles 3D...');
    }
    
    createGlassesModel(modelId) {
    const modelInfo = this.glassModels[modelId];
    if (!modelInfo) {
        console.error('Modèle non trouvé:', modelId);
        return this.createDefaultGlasses();
    }
    
    // VOTRE CODE ICI - Charger vos fichiers .glb
    
    const group = new THREE.Group();
    group.name = `glasses-${modelId}`;
    
    // Charger le modèle GLB selon l'ID
    return this.loadGLBModel(modelId, group);
}

async loadGLBModel(modelId, parentGroup) {
    // MAPPAGE de vos fichiers .glb
    const modelPaths = {
        '1': 'https://pub-72b1924cc2494065a2af6bf69f360686.r2.dev/Nwader.glb',  // Classic Black
        '2': 'https://votre-domaine.com/models/glasses2.glb',  // Golden Style
        '3': 'https://votre-domaine.com/models/glasses3.glb',  // Retro Aviator
        '4': 'https://votre-domaine.com/models/glasses4.glb',  // Modern Blue
        '5': 'https://votre-domaine.com/models/glasses5.glb',  // Rose Gold
        '6': 'https://votre-domaine.com/models/glasses6.glb'   // Sport Black
    };
    
    const modelPath = modelPaths[modelId];
    
    if (!modelPath) {
        console.error('Chemin du modèle non trouvé pour:', modelId);
        return parentGroup;
    }
    
    try {
        const loader = new THREE.GLTFLoader();
        
        // Charger le modèle GLB
        const gltf = await new Promise((resolve, reject) => {
            loader.load(
                modelPath,
                resolve,
                // Progression du chargement
                (xhr) => {
                    console.log(`Chargement ${modelId}: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
                },
                reject
            );
        });
        
        // Configurer le modèle
        const model = gltf.scene;
        
        // Ajuster l'échelle (à adapter selon vos modèles)
        model.scale.set(0.3, 0.3, 0.3);
        
        // Positionner sur le visage
        model.position.set(0, -0.2, -0.3);
        
        // Rotation si nécessaire
        model.rotation.set(0, 0, 0);
        
        // Ajouter au groupe parent
        parentGroup.add(model);
        
        console.log(`Modèle ${modelId} chargé avec succès:`, modelPath);
        
        return parentGroup;
        
    } catch (error) {
        console.error(`Erreur de chargement du modèle ${modelId}:`, error);
        
        // Fallback: créer des lunettes de base
        return this.createDefaultGlasses();
    }
}
        // Paramètres des lunettes
        const frameRadius = 0.15;
        const bridgeWidth = 0.05;
        const templeLength = 0.3;
        
        // Matériaux
        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: modelInfo.frameColor,
            metalness: 0.8,
            roughness: 0.2,
            emissive: new THREE.Color(modelInfo.frameColor).multiplyScalar(0.1)
        });
        
        const lensMaterial = new THREE.MeshPhysicalMaterial({
            color: modelInfo.lensColor,
            transmission: 0.7,
            roughness: 0.1,
            thickness: 0.5,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        // Cadre gauche
        const leftFrameGeometry = new THREE.TorusGeometry(frameRadius, 0.012, 16, 100);
        const leftFrame = new THREE.Mesh(leftFrameGeometry, frameMaterial);
        leftFrame.position.x = -frameRadius - bridgeWidth/2;
        leftFrame.rotation.y = Math.PI / 2;
        
        // Cadre droit
        const rightFrameGeometry = new THREE.TorusGeometry(frameRadius, 0.012, 16, 100);
        const rightFrame = new THREE.Mesh(rightFrameGeometry, frameMaterial);
        rightFrame.position.x = frameRadius + bridgeWidth/2;
        rightFrame.rotation.y = Math.PI / 2;
        
        // Pont
        const bridgeGeometry = new THREE.CylinderGeometry(0.008, 0.008, bridgeWidth, 8);
        const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
        bridge.position.x = 0;
        
        // Verres
        const lensGeometry = new THREE.CircleGeometry(frameRadius - 0.01, 32);
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.position.x = -frameRadius - bridgeWidth/2;
        leftLens.position.z = 0.005;
        
        const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
        rightLens.position.x = frameRadius + bridgeWidth/2;
        rightLens.position.z = 0.005;
        
        // Branches (temples)
        const templeGeometry = new THREE.BoxGeometry(templeLength, 0.008, 0.008);
        
        const leftTemple = new THREE.Mesh(templeGeometry, frameMaterial);
        leftTemple.position.set(-frameRadius - bridgeWidth/2 - templeLength/2, 0, 0);
        leftTemple.rotation.z = -0.3;
        
        const rightTemple = new THREE.Mesh(templeGeometry, frameMaterial);
        rightTemple.position.set(frameRadius + bridgeWidth/2 + templeLength/2, 0, 0);
        rightTemple.rotation.z = 0.3;
        
        // Assembler
        group.add(leftFrame, rightFrame, bridge, leftLens, rightLens, leftTemple, rightTemple);
        
        // Ajouter un effet de brillance
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 2);
        pointLight.position.set(0, 0.2, 0.5);
        group.add(pointLight);
        
        return group;
    }
    
    createDefaultGlasses() {
        const group = new THREE.Group();
        
        // Lunettes simples par défaut
        const geometry = new THREE.TorusGeometry(0.15, 0.01, 16, 100);
        const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftGlasses = new THREE.Mesh(geometry, material);
        leftGlasses.position.x = -0.2;
        
        const rightGlasses = new THREE.Mesh(geometry, material);
        rightGlasses.position.x = 0.2;
        
        group.add(leftGlasses, rightGlasses);
        return group;
    }
    
    async startAR() {
        try {
            if (!this.appState.initialized) {
                throw new Error('Application non initialisée');
            }
            
            if (!window.MINDAR) {
                throw new Error('MindAR non chargé');
            }
            
            console.log('Démarrage de l\'expérience AR...');
            
            // Afficher le loading
            this.showLoading(true);
            
            // Créer l'instance MindAR
            this.mindarThree = new MINDAR.FACE.MindARThree({
                container: document.getElementById('ar-container'),
                maxTrack: 1,
                faceOccluder: false
            });
            
            // Récupérer les composants Three.js
            const { renderer, scene, camera } = this.mindarThree;
            this.renderer = renderer;
            this.scene = scene;
            this.camera = camera;
            
            // Configurer le renderer
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            
            // Ajouter des lumières à la scène
            this.addLights();
            
            // Créer le maillage facial
            this.faceMesh = this.mindarThree.addFaceMesh();
            
            // Créer et ajouter les lunettes
            this.currentGlasses = this.createGlassesModel(this.currentModel);
            this.currentGlasses.scale.set(1.2, 1.2, 1.2);
            this.currentGlasses.position.set(0, -0.25, -0.35);
            
            // Attacher les lunettes au visage
            this.faceMesh.add(this.currentGlasses);
            this.scene.add(this.faceMesh);
            
            // Démarrer MindAR
            await this.mindarThree.start();
            this.isARActive = true;
            this.appState.tracking = true;
            
            // Démarrer la boucle de rendu
            this.renderer.setAnimationLoop(() => {
                this.renderer.render(this.scene, this.camera);
                
                // Animation subtile des lunettes
                if (this.currentGlasses && this.appState.tracking) {
                    this.currentGlasses.rotation.y += 0.001;
                    
                    // Effet de flottement léger
                    const time = Date.now() * 0.001;
                    this.currentGlasses.position.y = -0.25 + Math.sin(time) * 0.01;
                }
            });
            
            // Mettre à jour l'UI
            this.showLoading(false);
            this.updateUIState(true);
            
            // Ajouter un effet de transition
            this.addARTouchEffects();
            
            console.log('AR démarré avec succès!');
            
        } catch (error) {
            console.error('Erreur lors du démarrage AR:', error);
            this.showLoading(false);
            this.showError(`Erreur: ${error.message}`);
            
            // Fallback: mode démo
            if (error.message.includes('MindAR') || error.message.includes('caméra')) {
                this.startDemoMode();
            }
        }
    }
    
    addLights() {
        if (!this.scene) return;
        
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Lumière directionnelle principale
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // Lumière directionnelle secondaire
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-5, 3, -5);
        this.scene.add(directionalLight2);
        
        // Lumière frontale (pour éclairer le visage)
        const frontLight = new THREE.PointLight(0xffffff, 0.5);
        frontLight.position.set(0, 0, 2);
        this.scene.add(frontLight);
    }
    
    async stopAR() {
        try {
            if (this.mindarThree) {
                // Arrêter la boucle de rendu
                this.renderer.setAnimationLoop(null);
                
                // Arrêter MindAR
                await this.mindarThree.stop();
                
                // Nettoyer
                this.mindarThree = null;
                this.renderer = null;
                this.scene = null;
                this.camera = null;
                this.currentGlasses = null;
                this.faceMesh = null;
                
                this.isARActive = false;
                this.appState.tracking = false;
                
                // Mettre à jour l'UI
                this.updateUIState(false);
                
                // Effacer le canvas
                const canvas = document.getElementById('ar-canvas');
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                console.log('AR arrêté avec succès');
            }
        } catch (error) {
            console.error('Erreur lors de l\'arrêt AR:', error);
        }
    }
    
    switchGlasses(modelId) {
        if (!this.currentGlasses || !this.faceMesh) return;
        
        console.log('Changement de lunettes vers le modèle:', modelId);
        
        // Sauvegarder la position et rotation actuelles
        const currentPosition = this.currentGlasses.position.clone();
        const currentRotation = this.currentGlasses.rotation.clone();
        const currentScale = this.currentGlasses.scale.clone();
        
        // Supprimer les anciennes lunettes
        this.faceMesh.remove(this.currentGlasses);
        
        // Créer les nouvelles lunettes
        this.currentModel = modelId;
        this.currentGlasses = this.createGlassesModel(modelId);
        
        // Restaurer la position et rotation
        this.currentGlasses.position.copy(currentPosition);
        this.currentGlasses.rotation.copy(currentRotation);
        this.currentGlasses.scale.copy(currentScale);
        
        // Ajouter les nouvelles lunettes
        this.faceMesh.add(this.currentGlasses);
        
        // Mettre à jour l'affichage du produit
        this.updateProductDisplay(modelId);
        
        // Effet de transition
        this.animateGlassesSwitch();
    }
    
    animateGlassesSwitch() {
        if (!this.currentGlasses) return;
        
        // Animation de transition
        const originalScale = this.currentGlasses.scale.clone();
        this.currentGlasses.scale.set(0.1, 0.1, 0.1);
        
        let progress = 0;
        const duration = 300; // ms
        
        const animate = () => {
            progress += 16.67; // ~60fps
            const t = Math.min(progress / duration, 1);
            
            // Easing function
            const easeOut = t => t * (2 - t);
            
            const scale = 0.1 + (originalScale.x - 0.1) * easeOut(t);
            this.currentGlasses.scale.set(scale, scale, scale);
            
            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    updateProductDisplay(modelId) {
        const modelInfo = this.glassModels[modelId];
        if (!modelInfo) return;
        
        // Mettre à jour le nom et prix affichés
        const productName = document.getElementById('current-product-name');
        const productPrice = document.getElementById('current-product-price');
        
        if (productName) productName.textContent = modelInfo.name;
        if (productPrice) productPrice.textContent = modelInfo.price;
    }
    
    startDemoMode() {
        console.log('Démarrage du mode démo...');
        
        const canvas = document.getElementById('ar-canvas');
        const ctx = canvas.getContext('2d');
        
        // Effacer le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dessiner un visage de démonstration
        this.drawDemoFace(ctx);
        
        // Afficher un message
        const message = document.createElement('div');
        message.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
        `;
        message.innerHTML = `
            <h3>Mode Démo Activé</h3>
            <p>Pour une expérience AR complète :</p>
            <ul style="text-align: left; margin: 10px 0;">
                <li>Utilisez Chrome ou Edge récent</li>
                <li>Autorisez l'accès à la caméra</li>
                <li>Assurez-vous d'avoir une bonne connexion</li>
            </ul>
            <button onclick="this.parentElement.remove()" style="
                background: #4ecdc4;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
            ">Compris</button>
        `;
        
        document.querySelector('.ar-viewport').appendChild(message);
        
        // Mettre à jour l'UI
        document.getElementById('startAR').disabled = true;
        document.getElementById('stopAR').disabled = false;
        
        console.log('Mode démo activé');
    }
    
    drawDemoFace(ctx) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Visage
        ctx.fillStyle = '#f0c9a6';
        ctx.beginPath();
        ctx.ellipse(width/2, height/2, 100, 120, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Yeux
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(width/2 - 50, height/2 - 20, 20, 15, 0, 0, Math.PI * 2);
        ctx.ellipse(width/2 + 50, height/2 - 20, 20, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupilles
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(width/2 - 50, height/2 - 20, 8, 0, Math.PI * 2);
        ctx.arc(width/2 + 50, height/2 - 20, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Nez
        ctx.fillStyle = '#e6b8a2';
        ctx.beginPath();
        ctx.ellipse(width/2, height/2 + 20, 15, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Bouche
        ctx.fillStyle = '#e75480';
        ctx.beginPath();
        ctx.ellipse(width/2, height/2 + 70, 30, 15, 0, 0, Math.PI);
        ctx.fill();
        
        // Lunettes (modèle actuel)
        this.drawDemoGlasses(ctx, width/2, height/2 - 20);
    }
    
    drawDemoGlasses(ctx, centerX, centerY) {
        const modelInfo = this.glassModels[this.currentModel];
        if (!modelInfo) return;
        
        ctx.strokeStyle = modelInfo.frameColor;
        ctx.lineWidth = 5;
        ctx.fillStyle = modelInfo.lensColor + '80'; // 50% d'opacité
        
        // Verre gauche
        ctx.beginPath();
        ctx.arc(centerX - 50, centerY, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        
        // Verre droit
        ctx.beginPath();
        ctx.arc(centerX + 50, centerY, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        
        // Pont
        ctx.beginPath();
        ctx.moveTo(centerX - 20, centerY);
        ctx.lineTo(centerX + 20, centerY);
        ctx.stroke();
    }
    
    setupUI() {
        console.log('Configuration de l\'interface utilisateur...');
        
        // Initialiser les éléments UI
        this.updateUIState(false);
        
        // Ajouter des styles supplémentaires
        this.addCustomStyles();
    }
    
    addCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .product-info {
                animation: fadeIn 0.5s ease-out;
            }
            
            .tracking-active {
                animation: pulse 2s infinite;
            }
            
            .glasses-card {
                transition: all 0.3s ease;
            }
            
            .glasses-card:hover {
                transform: translateY(-5px) scale(1.05);
            }
        `;
        document.head.appendChild(style);
    }
    
    updateUIState(arActive) {
        const startBtn = document.getElementById('startAR');
        const stopBtn = document.getElementById('stopAR');
        const loading = document.getElementById('loading');
        
        if (startBtn) startBtn.disabled = arActive;
        if (stopBtn) stopBtn.disabled = !arActive;
        
        // Mettre à jour le texte des boutons
        if (arActive) {
            if (startBtn) startBtn.innerHTML = '<i class="fas fa-play"></i> AR Actif';
            if (stopBtn) stopBtn.innerHTML = '<i class="fas fa-stop"></i> Arrêter AR';
            
            // Ajouter une classe pour indiquer que le tracking est actif
            const viewport = document.querySelector('.ar-viewport');
            if (viewport) viewport.classList.add('tracking-active');
        } else {
            if (startBtn) startBtn.innerHTML = '<i class="fas fa-play"></i> Démarrer AR';
            if (stopBtn) stopBtn.innerHTML = '<i class="fas fa-stop"></i> Arrêter AR';
            
            // Retirer la classe de tracking
            const viewport = document.querySelector('.ar-viewport');
            if (viewport) viewport.classList.remove('tracking-active');
        }
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }
    
    showError(message) {
        console.error('Erreur:', message);
        
        // Créer une notification d'erreur
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
            max-width: 300px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;
        
        errorDiv.innerHTML = `
            <strong><i class="fas fa-exclamation-triangle"></i> Erreur</strong>
            <p style="margin: 5px 0 0 0; font-size: 14px;">${message}</p>
            <button onclick="this.parentElement.remove()" style="
                position: absolute;
                top: 5px;
                right: 5px;
                background: none;
                border: none;
                color: white;
                cursor: pointer;
            ">×</button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Supprimer automatiquement après 5 secondes
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.parentElement.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    showInstructions() {
        const modal = document.getElementById('instructionsModal');
        if (modal) {
            modal.classList.add('active');
        } else {
            // Créer la modal si elle n'existe pas
            this.createInstructionsModal();
        }
    }
    
    createInstructionsModal() {
        const modal = document.createElement('div');
        modal.id = 'instructionsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2><i class="fas fa-info-circle"></i> Instructions AR</h2>
                <div class="instructions-list">
                    <div class="instruction-step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h4>Autorisez la caméra</h4>
                            <p>Cliquez sur "Autoriser" quand votre navigateur le demande</p>
                        </div>
                    </div>
                    <div class="instruction-step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h4>Positionnez votre visage</h4>
                            <p>Placez-vous face à la caméra avec un bon éclairage</p>
                        </div>
                    </div>
                    <div class="instruction-step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h4>Choisissez des lunettes</h4>
                            <p>Cliquez sur différents modèles pour les essayer</p>
                        </div>
                    </div>
                    <div class="instruction-step">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <h4>Tournez la tête</h4>
                            <p>Voyez comment les lunettes vous vont sous tous les angles</p>
                        </div>
                    </div>
                </div>
                <button id="startFromModal" class="btn btn-primary">
                    <i class="fas fa-camera"></i> Commencer l'expérience AR
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Ajouter les styles pour la modal
        const style = document.createElement('style');
        style.textContent = `
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 2000;
                align-items: center;
                justify-content: center;
            }
            
            .modal.active {
                display: flex;
            }
            
            .modal-content {
                background: white;
                padding: 2rem;
                border-radius: 15px;
                max-width: 500px;
                width: 90%;
                animation: fadeIn 0.3s ease;
            }
            
            .close-modal {
                position: absolute;
                top: 1rem;
                right: 1rem;
                font-size: 2rem;
                cursor: pointer;
                color: #7f8c8d;
            }
            
            .instructions-list {
                margin: 2rem 0;
            }
            
            .instruction-step {
                display: flex;
                align-items: center;
                margin: 1.5rem 0;
                gap: 1rem;
            }
            
            .step-number {
                width: 40px;
                height: 40px;
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                flex-shrink: 0;
            }
            
            .step-content h4 {
                margin: 0 0 0.3rem 0;
                color: #2c3e50;
            }
            
            .step-content p {
                margin: 0;
                color: #7f8c8d;
                font-size: 0.9rem;
            }
        `;
        document.head.appendChild(style);
        
        // Configurer les événements de la modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        modal.querySelector('#startFromModal').addEventListener('click', () => {
            modal.classList.remove('active');
            this.startAR();
        });
    }
    
    setupEventListeners() {
        console.log('Configuration des événements...');
        
        // Bouton Démarrer AR
        const startBtn = document.getElementById('startAR');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startAR());
        }
        
        // Bouton Arrêter AR
        const stopBtn = document.getElementById('stopAR');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopAR());
        }
        
        // Bouton Changer Caméra
        const switchBtn = document.getElementById('switchCamera');
        if (switchBtn) {
            switchBtn.addEventListener('click', () => this.switchCamera());
        }
        
        // Sélection des lunettes
        document.querySelectorAll('.glasses-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const modelId = e.currentTarget.dataset.glasses;
                
                // Mettre à jour la sélection visuelle
                document.querySelectorAll('.glasses-card').forEach(c => {
                    c.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
                
                // Changer les lunettes
                this.switchGlasses(modelId);
            });
        });
        
        // Boutons "Essayer AR" dans la collection
        document.querySelectorAll('.try-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modelId = e.currentTarget.dataset.glasses;
                
                // Mettre à jour la sélection
                document.querySelectorAll('.glasses-card').forEach(card => {
                    if (card.dataset.glasses === modelId) {
                        card.click();
                    }
                });
                
                // Démarrer AR si pas déjà actif
                if (!this.isARActive) {
                    this.startAR();
                }
                
                // Scroll vers la section AR
                document.getElementById('try-on').scrollIntoView({ 
                    behavior: 'smooth' 
                });
            });
        });
        
        // Navigation
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }
        
        // Fermer le menu mobile au clic sur un lien
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                if (navMenu) navMenu.classList.remove('active');
            });
        });
        
        // Scroll fluide pour les ancres
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            if (this.isARActive && this.renderer) {
                const canvas = document.getElementById('ar-canvas');
                if (canvas) {
                    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
                    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
                    this.camera.updateProjectionMatrix();
                }
            }
        });
        
        // Gestionnaire d'erreurs global
        window.addEventListener('error', (e) => {
            console.error('Erreur globale:', e.error);
        });
        
        console.log('Événements configurés');
    }
    
    async switchCamera() {
        if (!this.isARActive) return;
        
        try {
            // Arrêter l'AR actuel
            await this.stopAR();
            
            // Attendre un peu
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Redémarrer l'AR
            await this.startAR();
            
            console.log('Caméra changée');
        } catch (error) {
            console.error('Erreur lors du changement de caméra:', error);
        }
    }
    
    createProductPreviews() {
        console.log('Création des prévisualisations des produits...');
        
        // Cette fonction pourrait créer des rendus 3D miniatures
        // Pour l'instant, nous utilisons des icônes Font Awesome
        
        // Ajouter des effets de survol aux cartes produits
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px)';
                card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
            });
        });
    }
    
    addARTouchEffects() {
        // Ajouter des effets visuels lors du démarrage AR
        const viewport = document.querySelector('.ar-viewport');
        if (!viewport) return;
        
        // Effet de flash
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            opacity: 0;
            pointer-events: none;
            z-index: 100;
        `;
        viewport.appendChild(flash);
        
        // Animation de flash
        let opacity = 1;
        const fadeOut = () => {
            opacity -= 0.05;
            flash.style.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(fadeOut);
            } else {
                flash.remove();
            }
        };
        
        fadeOut();
    }
    
    // Fonctions utilitaires
    showNotification(message, type = 'info') {
        const colors = {
            info: '#3498db',
            success: '#2ecc71',
            warning: '#f39c12',
            error: '#e74c3c'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
            max-width: 300px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;
        
        notification.innerHTML = `
            <strong>${type === 'info' ? 'ℹ️' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌'} 
            ${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <p style="margin: 5px 0 0 0; font-size: 14px;">${message}</p>
        `;
        
        document.body.appendChild(notification);
        
        // Supprimer automatiquement après 3 secondes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'fadeIn 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.parentElement.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    // Gestion des performances
    optimizePerformance() {
        // Réduire la qualité si nécessaire
        if (this.renderer) {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        }
    }
    
    // Nettoyage
    cleanup() {
        this.stopAR();
        
        // Supprimer les écouteurs d'événements
        // (Dans une application réelle, vous voudriez garder une référence à tous les écouteurs)
        
        console.log('Application nettoyée');
    }
}

// Initialiser l'application quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    console.log('Chargement de l\'application Nwadri...');
    
    // Vérifier si nous sommes dans un environnement sécurisé (HTTPS)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn('Pour une meilleure expérience, utilisez HTTPS');
    }
    
    // Initialiser l'application
    window.nwadriApp = new NwadriARApp();
    
    // Ajouter un écouteur pour le beforeunload (nettoyage)
    window.addEventListener('beforeunload', () => {
        if (window.nwadriApp) {
            window.nwadriApp.cleanup();
        }
    });
    
    console.log('Application Nwadri prête!');
});

// Exposer l'application globalement pour le débogage
window.NwadriAR = NwadriARApp;
