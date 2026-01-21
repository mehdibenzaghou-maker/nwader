class GlassesAR {
    constructor() {
        this.faceMesh = null;
        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.glasses = null;
        this.isModelLoaded = false;
        this.isFaceDetected = false;
        this.isCameraActive = false;
        this.currentGlassesIndex = 0;
        
        // Using a publicly available GLB glasses model
        this.glassesModels = [
            {
                id: 'aviator',
                name: 'Aviator',
                description: 'Classic aviator style with gold frame',
                url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
                color: '#FFD700'
            },
            {
                id: 'wayfarer',
                name: 'Wayfarer',
                description: 'Iconic wayfarer design',
                url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SciFiHelmet/glTF/SciFiHelmet.gltf',
                color: '#2C3E50'
            },
            {
                id: 'round',
                name: 'Round Frame',
                description: 'Vintage round glasses',
                url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/FlightHelmet/glTF/FlightHelmet.gltf',
                color: '#8B4513'
            }
        ];
        
        this.init();
    }
    
    async init() {
        this.setupThreeJS();
        this.setupFaceMesh();
        this.setupEventListeners();
        this.createGlassesGrid();
        this.showToast('AR Glasses Try-On initialized!', 'success');
        this.updateStatus('Ready to start', 'ready');
        this.animate();
        
        // Hide loading after a moment
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 1000);
    }
    
    setupThreeJS() {
        const canvas = document.getElementById('outputCanvas');
        
        // Setup Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = null;
        
        // Setup camera matching video dimensions
        this.camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
        
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            alpha: true,
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Add a subtle environment light
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        this.scene.add(hemisphereLight);
    }
    
    setupFaceMesh() {
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });
        
        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });
        
        this.faceMesh.onResults(this.onFaceResults.bind(this));
    }
    
    setupEventListeners() {
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('changeGlasses').addEventListener('click', () => this.changeGlasses());
        document.getElementById('takeScreenshot').addEventListener('click', () => this.takeScreenshot());
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Show face guide when camera starts
        document.getElementById('startCamera').addEventListener('click', () => {
            setTimeout(() => {
                document.getElementById('faceGuide').style.display = 'block';
            }, 1000);
        });
    }
    
    createGlassesGrid() {
        const grid = document.getElementById('glassesGrid');
        grid.innerHTML = '';
        
        this.glassesModels.forEach((model, index) => {
            const card = document.createElement('div');
            card.className = 'glass-card';
            if (index === this.currentGlassesIndex) {
                card.classList.add('active');
            }
            card.dataset.index = index;
            
            card.innerHTML = `
                <div class="glass-image" style="background: ${model.color}">
                    <i class="fas fa-glasses"></i>
                </div>
                <div class="glass-info">
                    <h3 class="glass-name">${model.name}</h3>
                    <p class="glass-description">${model.description}</p>
                    <button class="try-btn">Try On</button>
                </div>
            `;
            
            card.addEventListener('click', () => this.selectGlasses(index));
            grid.appendChild(card);
        });
    }
    
    selectGlasses(index) {
        this.currentGlassesIndex = index;
        this.loadGlassesModel();
        
        // Update active state in grid
        document.querySelectorAll('.glass-card').forEach((card, i) => {
            card.classList.toggle('active', i === index);
        });
        
        this.showToast(`Trying ${this.glassesModels[index].name}`, 'info');
    }
    
    async startCamera() {
        if (this.isCameraActive) {
            this.stopCamera();
            return;
        }
        
        try {
            this.updateStatus('Requesting camera...', 'loading');
            
            const video = document.getElementById('inputVideo');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
                } 
            });
            
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                this.updateStatus('Camera active - Looking for face...', 'active');
                this.showToast('Camera started successfully!', 'success');
                
                // Update button text
                const btn = document.getElementById('startCamera');
                btn.innerHTML = '<i class="fas fa-stop"></i><span>Stop Camera</span>';
                
                this.isCameraActive = true;
                document.getElementById('faceGuide').style.display = 'block';
            };
            
            // Start face detection
            this.camera = new Camera(video, {
                onFrame: async () => {
                    try {
                        await this.faceMesh.send({ image: video });
                    } catch (error) {
                        console.error('Face detection error:', error);
                    }
                },
                width: 1280,
                height: 720
            });
            this.camera.start();
            
        } catch (error) {
            console.error('Camera error:', error);
            this.updateStatus('Camera access denied', 'error');
            this.showToast('Could not access camera. Please check permissions.', 'error');
        }
    }
    
    stopCamera() {
        const video = document.getElementById('inputVideo');
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
        
        if (this.camera) {
            this.camera.stop();
        }
        
        this.isCameraActive = false;
        this.isFaceDetected = false;
        
        // Update button text
        const btn = document.getElementById('startCamera');
        btn.innerHTML = '<i class="fas fa-video"></i><span>Start Camera</span>';
        
        this.updateStatus('Camera stopped', 'ready');
        document.getElementById('faceGuide').style.display = 'none';
        
        if (this.glasses) {
            this.glasses.visible = false;
        }
    }
    
    onFaceResults(results) {
        const canvas = document.getElementById('outputCanvas');
        const video = document.getElementById('inputVideo');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            if (!this.isFaceDetected) {
                this.isFaceDetected = true;
                this.updateStatus('Face detected!', 'active');
                document.getElementById('faceGuide').style.display = 'none';
                this.showToast('Face detected! Glasses will appear.', 'success');
            }
            
            // Update glasses position
            this.updateGlassesPosition(landmarks);
            
            // Draw face landmarks (optional, for debugging)
            // this.drawFaceLandmarks(ctx, landmarks);
            
        } else {
            if (this.isFaceDetected) {
                this.isFaceDetected = false;
                this.updateStatus('Looking for face...', 'active');
                document.getElementById('faceGuide').style.display = 'block';
            }
            
            if (this.glasses) {
                this.glasses.visible = false;
            }
        }
    }
    
    updateGlassesPosition(landmarks) {
        if (!this.glasses || !this.isModelLoaded) return;
        
        try {
            // Get key facial landmarks
            const leftEye = landmarks[33];   // Left eye outer corner
            const rightEye = landmarks[263]; // Right eye outer corner
            const noseTip = landmarks[1];    // Nose tip
            
            // Calculate center between eyes
            const centerX = (leftEye.x + rightEye.x) / 2;
            const centerY = (leftEye.y + rightEye.y) / 2;
            
            // Calculate eye distance for scaling
            const eyeDistance = Math.sqrt(
                Math.pow(rightEye.x - leftEye.x, 2) + 
                Math.pow(rightEye.y - leftEye.y, 2)
            );
            
            // Convert to 3D coordinates
            // Normalize coordinates to [-1, 1] range
            const x = (centerX - 0.5) * 4;
            const y = -(centerY - 0.5) * 3;
            const z = 0;
            
            // Calculate scale based on eye distance
            const scale = eyeDistance * 8;
            
            // Calculate rotation based on face orientation
            const noseToLeftEye = Math.atan2(
                leftEye.y - noseTip.y,
                leftEye.x - noseTip.x
            );
            
            // Update glasses
            this.glasses.visible = true;
            this.glasses.position.set(x, y, z);
            this.glasses.scale.setScalar(scale);
            
            // Apply rotation
            this.glasses.rotation.x = Math.PI / 2;
            this.glasses.rotation.y = (centerX - 0.5) * 0.5;
            this.glasses.rotation.z = -noseToLeftEye + Math.PI / 2;
            
        } catch (error) {
            console.error('Error updating glasses position:', error);
        }
    }
    
    drawFaceLandmarks(ctx, landmarks) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#00ff00';
        
        // Draw key points
        const keyPoints = [33, 133, 362, 263, 1, 168, 94, 322];
        keyPoints.forEach(index => {
            const point = landmarks[index];
            ctx.beginPath();
            ctx.arc(
                point.x * ctx.canvas.width,
                point.y * ctx.canvas.height,
                3, 0, Math.PI * 2
            );
            ctx.fill();
        });
    }
    
    async loadGlassesModel() {
        try {
            const model = this.glassesModels[this.currentGlassesIndex];
            this.updateStatus(`Loading ${model.name}...`, 'loading');
            
            // Remove existing glasses
            if (this.glasses) {
                this.scene.remove(this.glasses);
            }
            
            const loader = new THREE.GLTFLoader();
            
            loader.load(
                model.url,
                (gltf) => {
                    this.glasses = gltf.scene;
                    
                    // Center and scale the model
                    const box = new THREE.Box3().setFromObject(this.glasses);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 0.5 / maxDim;
                    
                    this.glasses.position.sub(center);
                    this.glasses.scale.setScalar(scale);
                    this.glasses.rotation.x = Math.PI / 2;
                    this.glasses.visible = false;
                    
                    // Add shadows
                    this.glasses.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    this.scene.add(this.glasses);
                    this.isModelLoaded = true;
                    
                    this.updateStatus(`${model.name} loaded`, 'ready');
                    this.showToast(`${model.name} loaded successfully!`, 'success');
                    
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100).toFixed(1);
                    this.updateStatus(`Loading model: ${percent}%`, 'loading');
                },
                (error) => {
                    console.error('Error loading model:', error);
                    this.createFallbackGlasses();
                    this.showToast('Using fallback glasses model', 'info');
                }
            );
            
        } catch (error) {
            console.error('Model loading error:', error);
            this.createFallbackGlasses();
        }
    }
    
    createFallbackGlasses() {
        // Create a simple glasses model as fallback
        const group = new THREE.Group();
        
        // Frame
        const frameGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2C3E50,
            metalness: 0.8,
            roughness: 0.2
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        group.add(frame);
        
        // Left lens
        const leftLensGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 32);
        const lensMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x87CEEB,
            transmission: 0.9,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            thickness: 1
        });
        const leftLens = new THREE.Mesh(leftLensGeometry, lensMaterial);
        leftLens.position.x = -0.8;
        leftLens.rotation.z = Math.PI / 2;
        group.add(leftLens);
        
        // Right lens
        const rightLens = new THREE.Mesh(leftLensGeometry, lensMaterial);
        rightLens.position.x = 0.8;
        rightLens.rotation.z = Math.PI / 2;
        group.add(rightLens);
        
        // Temple (left)
        const templeGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.5);
        const leftTemple = new THREE.Mesh(templeGeometry, frameMaterial);
        leftTemple.position.set(-1.1, -0.2, -0.5);
        leftTemple.rotation.y = Math.PI / 6;
        group.add(leftTemple);
        
        // Temple (right)
        const rightTemple = new THREE.Mesh(templeGeometry, frameMaterial);
        rightTemple.position.set(1.1, -0.2, -0.5);
        rightTemple.rotation.y = -Math.PI / 6;
        group.add(rightTemple);
        
        this.glasses = group;
        this.glasses.scale.setScalar(0.2);
        this.glasses.visible = false;
        this.scene.add(this.glasses);
        this.isModelLoaded = true;
        
        this.updateStatus('Fallback glasses loaded', 'ready');
    }
    
    changeGlasses() {
        this.currentGlassesIndex = (this.currentGlassesIndex + 1) % this.glassesModels.length;
        this.selectGlasses(this.currentGlassesIndex);
    }
    
    takeScreenshot() {
        if (!this.isFaceDetected) {
            this.showToast('Please start camera and face detection first', 'error');
            return;
        }
        
        const canvas = document.getElementById('outputCanvas');
        const link = document.createElement('a');
        link.download = `glasses-tryon-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        this.showToast('Screenshot saved!', 'success');
    }
    
    updateStatus(message, type = 'ready') {
        const statusText = document.getElementById('statusText');
        const statusDot = document.querySelector('.status-dot');
        
        statusText.textContent = message;
        statusDot.className = 'status-dot';
        statusDot.classList.add(type);
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast';
        toast.classList.add('show', type);
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    onWindowResize() {
        const canvas = document.getElementById('outputCanvas');
        if (!canvas) return;
        
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
        
        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.renderer && this.scene && this.camera) {
            // Add subtle animation to glasses
            if (this.glasses && this.glasses.visible) {
                this.glasses.rotation.y += 0.001;
            }
            
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    const arApp = new GlassesAR();
    
    // Add CSS for toast types
    const style = document.createElement('style');
    style.textContent = `
        .toast.success { background: #4CAF50; }
        .toast.error { background: #F44336; }
        .toast.info { background: #2196F3; }
        .toast.warning { background: #FF9800; }
        
        .try-btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 600;
            transition: var(--transition);
            width: 100%;
        }
        
        .try-btn:hover {
            background: var(--primary-dark);
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(style);
});
