class NwadriAR {
    constructor() {
        this.mindarThree = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.currentGlasses = null;
        this.faceMeshes = [];
        this.isARActive = false;
        this.videoDevice = 'user'; // 'user' pour frontal, 'environment' pour arrière
        
        this.initialize();
        this.setupEventListeners();
        this.create3DPreviews();
    }

    initialize() {
        // Initialiser Three.js renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('ar-canvas'),
            alpha: true,
            antialias: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    async startAR() {
        try {
            document.getElementById('loading').style.display = 'flex';
            
            // Arrêter AR si déjà actif
            if (this.mindarThree) {
                await this.stopAR();
            }

            // Initialiser MindAR
            this.mindarThree = new window.MINDAR.FACE.MindARThree({
                container: document.getElementById('ar-container'),
                devMode: false,
                maxTrack: 1,
            });

            const { renderer, scene, camera } = this.mindarThree;
            this.renderer = renderer;
            this.scene = scene;
            this.camera = camera;

            // Créer la géométrie de base pour les lunettes
            this.createFaceGeometry();

            // Démarrer MindAR
            await this.mindarThree.start();
            this.isARActive = true;
            document.getElementById('loading').style.display = 'none';
            
            // Charger les lunettes par défaut
            await this.loadGlasses('assets/glasses1.glb');
            
            // Mettre à jour l'état des boutons
            document.getElementById('startAR').disabled = true;
            document.getElementById('stopAR').disabled = false;
            
            // Lancer la boucle de rendu
            this.update();
            
        } catch (error) {
            console.error('Erreur lors du démarrage AR:', error);
            alert('Erreur: ' + error.message);
            document.getElementById('loading').style.display = 'none';
        }
    }

    async stopAR() {
        if (this.mindarThree) {
            await this.mindarThree.stop();
            this.mindarThree = null;
            this.isARActive = false;
            
            // Réinitialiser le canvas
            this.renderer.clear();
            
            // Mettre à jour l'état des boutons
            document.getElementById('startAR').disabled = false;
            document.getElementById('stopAR').disabled = true;
        }
    }

    createFaceGeometry() {
        if (!this.mindarThree) return;

        // Créer des géométries pour les points du visage
        const faceMeshes = [];
        const geometry = new THREE.SphereGeometry(0.002);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        
        for (let i = 0; i < 468; i++) {
            const mesh = new THREE.Mesh(geometry, material);
            faceMeshes.push(mesh);
            this.scene.add(mesh);
        }
        
        this.faceMeshes = faceMeshes;
    }

    async loadGlasses(modelPath) {
        if (!this.mindarThree || !this.scene) return;

        // Supprimer les anciennes lunettes
        if (this.currentGlasses) {
            this.scene.remove(this.currentGlasses);
        }

        try {
            // Charger le modèle GLB
            const loader = new THREE.GLTFLoader();
            const gltf = await new Promise((resolve, reject) => {
                loader.load(modelPath, resolve, undefined, reject);
            });

            // Configurer les lunettes
            this.currentGlasses = gltf.scene;
            this.currentGlasses.scale.set(0.3, 0.3, 0.3);
            this.currentGlasses.position.set(0, -0.15, -0.2);
            this.currentGlasses.rotation.set(0, 0, 0);

            // Ajouter au scène
            this.scene.add(this.currentGlasses);

        } catch (error) {
            console.error('Erreur de chargement des lunettes:', error);
        }
    }

    update() {
        if (!this.mindarThree || !this.isARActive) return;

        // Mettre à jour les points du visage
        if (this.mindarThree.faceMesh) {
            const face = this.mindarThree.faceMesh;
            const points = face.geometry.getAttribute('position').array;
            
            for (let i = 0; i < this.faceMeshes.length; i++) {
                const mesh = this.faceMeshes[i];
                mesh.position.set(points[i*3], points[i*3+1], points[i*3+2]);
            }
            
            // Mettre à jour la position des lunettes
            if (this.currentGlasses && face.geometry.boundingBox) {
                const center = new THREE.Vector3();
                face.geometry.boundingBox.getCenter(center);
                this.currentGlasses.position.copy(center);
                this.currentGlasses.position.y -= 0.05;
                this.currentGlasses.position.z -= 0.
