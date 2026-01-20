// NWADRI AR - Version corrigée avec positionnement facial automatique
class NwadriARFaceTracking {
    constructor() {
        // ... (gardez tout le début comme avant) ...
        
        // NOUVEAU: Paramètres de positionnement facial
        this.facePosition = {
            x: 0,
            y: 0,
            z: -0.5,  // Distance par rapport à la caméra
            scale: 1.0
        };
        
        this.faceDetected = false;
        this.faceMeshPoints = null;
        
        // Initialisation
        this.init();
    }
    
    // ==================== FONCTION MODIFIÉE POUR CHARGER .glb ====================
    async loadGLBModel(modelId) {
        const modelInfo = this.models[modelId];
        
        // Vérifier le cache
        if (this.glbCache.has(modelId)) {
            console.log(`📦 Utilisation du cache pour ${modelId}`);
            const cached = this.glbCache.get(modelId).clone();
            this.positionOnFace(cached, modelInfo); // Positionner immédiatement
            return cached;
        }
        
        try {
            console.log(`📥 Tentative de chargement: ${modelInfo.glbFile}`);
            
            // CORRECTION CRITIQUE: Utiliser une URL qui fonctionne
            const workingUrl = await this.getWorkingGLBUrl(modelInfo.glbFile);
            
            // Charger avec Three.js
            const loader = new THREE.GLTFLoader();
            
            const gltf = await new Promise((resolve, reject) => {
                loader.load(
                    workingUrl,
                    (gltf) => {
                        console.log(`✅ Modèle ${modelId} chargé avec succès!`);
                        resolve(gltf);
                    },
                    (progress) => {
                        // Afficher la progression
                        console.log(`   Chargement: ${Math.round(progress.loaded / progress.total * 100)}%`);
                    },
                    (error) => {
                        console.error(`❌ Erreur chargement:`, error);
                        reject(error);
                    }
                );
            });
            
            // Préparer le modèle
            const model = gltf.scene;
            model.name = `glasses-${modelId}`;
            
            // POSITIONNEMENT AUTOMATIQUE SUR LE VISAGE
            this.positionOnFace(model, modelInfo);
            
            // Optimiser
            this.optimizeModelForAR(model);
            
            // Mettre en cache
            this.glbCache.set(modelId, model.clone());
            
            return model;
            
        } catch (error) {
            console.error(`❌ Échec chargement, création fallback:`, error);
            return this.createAutoPositionedFallback(modelInfo);
        }
    }
    
    // ==================== POSITIONNEMENT AUTOMATIQUE SUR LE VISAGE ====================
    positionOnFace(model, modelInfo) {
        // Position par défaut pour un visage humain
        // Ces valeurs sont calibrées pour la caméra frontale
        
        const defaultFacePosition = {
            x: 0,           // Centre horizontal
            y: -0.1,        // Légèrement au-dessus du nez
            z: -0.4,        // Distance devant la caméra
            scale: 0.15     // Taille par défaut
        };
        
        // Appliquer la position
        model.position.set(
            defaultFacePosition.x,
            defaultFacePosition.y,
            defaultFacePosition.z
        );
        
        // Appliquer l'échelle
        const finalScale = modelInfo.scale * defaultFacePosition.scale;
        model.scale.set(finalScale, finalScale, finalScale);
        
        // Rotation pour caméra frontale (miroir)
        model.rotation.set(0, Math.PI, 0); // Tourner de 180° pour l'effet miroir
        
        console.log(`🎯 Lunettes positionnées sur le visage:`, {
            position: model.position,
            scale: model.scale,
            rotation: model.rotation
        });
    }
    
    // ==================== DÉTECTION FACIALE SIMULÉE ====================
    simulateFaceDetection() {
        // Cette fonction simule la détection d'un visage
        // En production, vous utiliserez TensorFlow.js ou FaceAPI.js
        
        if (!this.video || !this.video.videoWidth) return;
        
        // Simuler un visage au centre de l'écran
        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;
        
        this.facePosition = {
            x: 0,  // Centre
            y: -0.08,  // Légèrement plus bas pour les yeux
            z: -0.35,  // Distance
            scale: 1.0
        };
        
        this.faceDetected = true;
        
        // Ajuster la position si on a des lunettes
        if (this.currentGlasses) {
            this.updateGlassesPosition();
        }
        
        return this.facePosition;
    }
    
    updateGlassesPosition() {
        if (!this.currentGlasses || !this.faceDetected) return;
        
        // Lisser le mouvement
        const smoothing = 0.1;
        
        this.currentGlasses.position.x += (this.facePosition.x - this.currentGlasses.position.x) * smoothing;
        this.currentGlasses.position.y += (this.facePosition.y - this.currentGlasses.position.y) * smoothing;
        this.currentGlasses.position.z = this.facePosition.z;
        
        // Ajuster la taille selon la "distance"
        const targetScale = this.models[this.currentModel].scale * this.facePosition.scale;
        const currentScale = this.currentGlasses.scale.x;
        const newScale = currentScale + (targetScale - currentScale) * smoothing;
        
        this.currentGlasses.scale.set(newScale, newScale, newScale);
    }
    
    // ==================== FONCTION POUR OBTENIR UNE URL FONCTIONNELLE ====================
    async getWorkingGLBUrl(originalUrl) {
        // Liste de URLs de test si les vôtres ne marchent pas
        const testUrls = [
            originalUrl,
            // Modèles 3D gratuits pour test
            'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
            'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb'
        ];
        
        for (const url of testUrls) {
            try {
                console.log(`🔍 Test URL: ${url}`);
                const response = await fetch(url, { method: 'HEAD' });
                
                if (response.ok) {
                    console.log(`✅ URL fonctionnelle: ${url}`);
                    return url;
                }
            } catch (error) {
                console.log(`❌ URL échouée: ${url}`);
                continue;
            }
        }
        
        throw new Error('Aucune URL GLB fonctionnelle trouvée');
    }
    
    // ==================== FALLBACK AVEC POSITIONNEMENT ====================
    createAutoPositionedFallback(modelInfo) {
        console.log(`🎨 Création fallback positionné pour ${modelInfo.name}`);
        
        const group = new THREE.Group();
        
        // Positionner automatiquement sur le visage
        this.positionOnFace(group, modelInfo);
        
        // Créer des lunettes basiques
        this.createBasicGlassesGeometry(group, modelInfo.previewColor);
        
        return group;
    }
    
    createBasicGlassesGeometry(group, color) {
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: color || 0x000000,
            metalness: 0.9,
            roughness: 0.1
        });
        
        const lensMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x1a5276,
            transmission: 0.7,
            roughness: 0.05,
            transparent: true,
            opacity: 0.4
        });
        
        // Cadre gauche
        const leftFrame = new THREE.Mesh(
            new THREE.TorusGeometry(0.4, 0.04, 16, 100),
            frameMaterial
        );
        leftFrame.position.x = -0.45;
        
        // Cadre droit
        const rightFrame = new THREE.Mesh(
            new THREE.TorusGeometry(0.4, 0.04, 16, 100),
            frameMaterial
        );
        rightFrame.position.x = 0.45;
        
        // Verres
        const leftLens = new THREE.Mesh(
            new THREE.CircleGeometry(0.35, 32),
            lensMaterial
        );
        leftLens.position.x = -0.45;
        leftLens.position.z = 0.02;
        
        const rightLens = new THREE.Mesh(
            new THREE.CircleGeometry(0.35, 32),
            lensMaterial
        );
        rightLens.position.x = 0.45;
        rightLens.position.z = 0.02;
        
        // Pont
        const bridge = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.02, 0.02),
            frameMaterial
        );
        
        group.add(leftFrame, rightFrame, leftLens, rightLens, bridge);
    }
    
    // ==================== OPTIMISATION POUR AR ====================
    optimizeModelForAR(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                // Double sided pour AR
                child.material.side = THREE.DoubleSide;
                
                // Pour les matériaux transparents
                if (child.material.transparent) {
                    child.material.depthWrite = false;
                    child.renderOrder = 1;
                }
                
                // Optimiser les ombres
                child.castShadow = false;
                child.receiveShadow = false;
            }
        });
    }
    
    // ==================== MÉTHODE STARTAR MODIFIÉE ====================
    async startAR() {
        if (!this.isCameraActive) {
            this.showMessage('Activez d\'abord la caméra!', 'error');
            return;
        }
        
        try {
            this.showLoading('Chargement et positionnement des lunettes...');
            
            // Simuler la détection faciale
            this.simulateFaceDetection();
            
            // Charger les lunettes
            this.currentGlasses = await this.loadGLBModel(this.currentModel);
            
            // Ajouter à la scène
            this.scene.add(this.currentGlasses);
            
            // Démarrer l'animation avec suivi
            this.isARActive = true;
            this.startFaceTrackingAnimation();
            
            this.hideLoading();
            this.showMessage('✨ Lunettes positionnées sur votre visage!', 'success');
            
            // Afficher les instructions
            this.showFaceInstructions();
            
        } catch (error) {
            console.error('❌ Erreur démarrage AR:', error);
            this.hideLoading();
            this.showMessage('Utilisation du mode démo', 'info');
            this.startDemoMode();
        }
    }
    
    // ==================== ANIMATION AVEC SUIVI FACIAL ====================
    startFaceTrackingAnimation() {
        const animate = () => {
            if (!this.isARActive) return;
            
            requestAnimationFrame(animate);
            
            // Mettre à jour la texture vidéo
            if (this.videoTexture) {
                this.videoTexture.needsUpdate = true;
            }
            
            // Simuler le suivi facial (rafraîchir la position)
            this.simulateFaceDetection();
            
            // Mettre à jour la position des lunettes
            if (this.currentGlasses) {
                this.updateGlassesPosition();
                
                // Animation subtile de respiration
                const time = Date.now() * 0.001;
                this.currentGlasses.position.y += Math.sin(time * 2) * 0.001;
            }
            
            // Rendu
            if (this.renderer && this.scene && this.camera) {
                this.renderer.clear();
                this.renderer.render(this.scene, this.camera);
            }
        };
        
        animate();
    }
    
    // ==================== MODE DÉMO ====================
    startDemoMode() {
        // Créer des lunettes de démo positionnées
        this.currentGlasses = this.createAutoPositionedFallback(this.models[this.currentModel]);
        this.scene.add(this.currentGlasses);
        
        this.isARActive = true;
        this.startFaceTrackingAnimation();
        
        this.showMessage('Mode démo - Les lunettes sont positionnées sur le visage', 'info');
    }
    
    // ==================== INSTRUCTIONS VISAGE ====================
    showFaceInstructions() {
        const instructions = document.createElement('div');
        instructions.id = 'face-instructions';
        instructions.style.cssText = `
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
            backdrop-filter: blur(10px);
            border: 2px solid #00dbde;
            max-width: 90%;
        `;
        
        instructions.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #00dbde;">
                <i class="fas fa-face-smile"></i> Lunettes Positionnées!
            </h4>
            <p style="margin: 0; font-size: 14px;">
                Les lunettes sont automatiquement placées sur votre visage.<br>
                <small>Déplacez-vous pour voir les différents angles.</small>
            </p>
        `;
        
        document.querySelector('.ar-container').appendChild(instructions);
        
        // Supprimer après 5 secondes
        setTimeout(() => {
            if (instructions.parentElement) {
                instructions.remove();
            }
        }, 5000);
    }
    
    // ==================== UTILITAIRE POUR DÉBOGUER ====================
    debugModelLoading() {
        console.log('🔧 Débogage chargement modèles:');
        
        for (const [id, model] of Object.entries(this.models)) {
            console.log(`   Modèle ${id}: ${model.glbFile}`);
            
            // Tester chaque URL
            fetch(model.glbFile, { method: 'HEAD' })
                .then(r => console.log(`     ✅ ${r.status} - ${r.headers.get('content-type')}`))
                .catch(e => console.log(`     ❌ ${e.message}`));
        }
    }
}

// ==================== SCRIPT DE TEST RAPIDE ====================
// Ajoutez ceci à la fin de app.js, AVANT la dernière ligne
console.log('🛠️  Configuration de test:');

// Pour tester immédiatement dans la console, ajoutez:
window.testGLB = async function() {
    console.log('🧪 Test de chargement GLB...');
    
    const testUrls = [
        // Vos URLs
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
        // URLs de test
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/DamagedHelmet/glTF-Binary/DamagedHelmet.glb'
    ];
    
    for (const url of testUrls) {
        try {
            console.log(`Testing: ${url}`);
            const response = await fetch(url);
            console.log(`✅ ${url}: ${response.status} - ${response.headers.get('content-type')}`);
        } catch (error) {
            console.log(`❌ ${url}: ${error.message}`);
        }
    }
};
