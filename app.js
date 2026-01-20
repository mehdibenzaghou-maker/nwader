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
                this.currentGlasses.position.z -= 0.1;
            }
        }

        // Rendu
        this.renderer.render(this.scene, this.camera);
        
        // Prochaine frame
        requestAnimationFrame(() => this.update());
    }

    async switchCamera() {
        // Basculer entre caméra avant/arrière
        this.videoDevice = this.videoDevice === 'user' ? 'environment' : 'user';
        
        if (this.isARActive) {
            await this.stopAR();
            setTimeout(() => this.startAR(), 500);
        }
    }

    create3DPreviews() {
        // Créer des prévisualisations 3D pour les produits
        ['product3d-1', 'product3d-2', 'product3d-3'].forEach((id, index) => {
            this.createProductPreview(id, index + 1);
        });
    }

    createProductPreview(containerId, glassesIndex) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Créer une scène Three.js simple pour la prévisualisation
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        
        renderer.setSize(300, 300);
        container.appendChild(renderer.domElement);
        
        // Lumière
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));
        
        // Charger le modèle
        const loader = new THREE.GLTFLoader();
        loader.load(`assets/glasses${glassesIndex}.glb`, (gltf) => {
            const model = gltf.scene;
            model.scale.set(0.5, 0.5, 0.5);
            scene.add(model);
            
            // Animation de rotation
            function animate() {
                requestAnimationFrame(animate);
                model.rotation.y += 0.01;
                renderer.render(scene, camera);
            }
            
            camera.position.z = 2;
            animate();
        });
    }

    setupEventListeners() {
        // Bouton démarrer AR
        document.getElementById('startAR').addEventListener('click', () => {
            this.showInstructions();
        });

        // Bouton arrêter AR
        document.getElementById('stopAR').addEventListener('click', () => {
            this.stopAR();
        });

        // Bouton changer caméra
        document.getElementById('switchCamera').addEventListener('click', () => {
            this.switchCamera();
        });

        // Sélection des lunettes
        document.querySelectorAll('.glasses-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                const glassesPath = e.currentTarget.dataset.glasses;
                
                // Mettre à jour la sélection visuelle
                document.querySelectorAll('.glasses-card').forEach(c => {
                    c.classList.remove('active');
                });
                e.currentTarget.classList.add('active');
                
                // Charger les nouvelles lunettes
                if (this.isARActive) {
                    await this.loadGlasses(glassesPath);
                }
            });
        });

        // Boutons "Essayer AR" dans la collection
        document.querySelectorAll('.try-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const glassesPath = e.currentTarget.dataset.glasses;
                
                if (!this.isARActive) {
                    // Si AR n'est pas actif, démarrer avec ces lunettes
                    await this.startAR();
                    setTimeout(() => {
                        this.loadGlasses(glassesPath);
                    }, 1000);
                } else {
                    // Sinon, juste changer les lunettes
                    await this.loadGlasses(glassesPath);
                }
            });
        });

        // Modal instructions
        const modal = document.getElementById('instructionsModal');
        const closeModal = document.querySelector('.close-modal');
        const startArModal = document.querySelector('.start-ar-modal');

        closeModal.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        startArModal.addEventListener('click', () => {
            modal.classList.remove('active');
            this.startAR();
        });

        // Formulaire de contact
        document.getElementById('contactForm').addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Merci pour votre message ! Nous vous répondrons bientôt.');
            e.target.reset();
        });

        // Navigation mobile
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.querySelector('.nav-menu');

        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Fermer le menu mobile au clic sur un lien
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }

    showInstructions() {
        const modal = document.getElementById('instructionsModal');
        modal.classList.add('active');
    }
}

// Initialiser l'application quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.nwadriApp = new NwadriAR();
});
