class GlassesAR {
    constructor() {
        this.faceMesh = null;
        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.glasses = null;
        this.isModelLoaded = false;
        this.isFaceDetected = false;
        this.currentGlassesIndex = 0;
        this.glassesModels = [
            'glasses.glb',  // Your GLB model
            // Add more models if available
        ];
        
        this.init();
    }
    
    async init() {
        this.setupThreeJS();
        this.setupFaceMesh();
        this.setupEventListeners();
        this.loadGlassesModel();
        this.animate();
    }
    
    setupThreeJS() {
        // Get canvas for 3D rendering
        const canvas = document.getElementById('outputCanvas');
        
        // Setup Three.js scene
        this.scene = new THREE.Scene();
        
        // Setup camera matching video dimensions
        this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
        this.camera.position.z = 5;
        
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            alpha: true,
            antialias: true 
        });
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.setClearColor(0x000000, 0);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 2);
        this.scene.add(directionalLight);
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
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.faceMesh.onResults(this.onFaceResults.bind(this));
    }
    
    setupEventListeners() {
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('changeGlasses').addEventListener('click', () => this.changeGlasses());
        document.getElementById('takeScreenshot').addEventListener('click', () => this.takeScreenshot());
    }
    
    async startCamera() {
        try {
            const video = document.getElementById('inputVideo');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user' 
                } 
            });
            
            video.srcObject = stream;
            this.updateStatus('Camera started. Looking for face...');
            
            // Start face detection
            this.camera = new Camera(video, {
                onFrame: async () => {
                    await this.faceMesh.send({ image: video });
                },
                width: 1280,
                height: 720
            });
            this.camera.start();
            
        } catch (error) {
            console.error('Camera error:', error);
            this.updateStatus('Error accessing camera. Please check permissions.');
        }
    }
    
    onFaceResults(results) {
        const canvas = document.getElementById('outputCanvas');
        const video = document.getElementById('inputVideo');
        
        // Draw video frame
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            if (!this.isFaceDetected) {
                this.isFaceDetected = true;
                this.updateStatus('Face detected! Placing glasses...');
            }
            
            // Update glasses position based on face landmarks
            this.updateGlassesPosition(landmarks);
            
            // Draw face landmarks for debugging (optional)
            // this.drawFaceLandmarks(ctx, landmarks);
        } else {
            this.isFaceDetected = false;
            if (this.glasses) {
                this.glasses.visible = false;
            }
        }
        
        ctx.restore();
    }
    
    updateGlassesPosition(landmarks) {
        if (!this.glasses || !this.isModelLoaded) return;
        
        // Key landmarks for glasses placement
        // MediaPipe Face Mesh indices: 
        // 1 = forehead center, 168 = left temple, 397 = right temple
        // 1, 94, 322 are good reference points
        
        const leftEye = landmarks[33];   // Left eye outer corner
        const rightEye = landmarks[263]; // Right eye outer corner
        const noseBridge = landmarks[168]; // Between eyes
        
        // Calculate position
        const eyeCenterX = (leftEye.x + rightEye.x) / 2;
        const eyeCenterY = (leftEye.y + rightEye.y) / 2;
        
        // Calculate eye distance for scaling
        const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) + 
            Math.pow(rightEye.y - leftEye.y, 2)
        );
        
        // Calculate head rotation from ear positions
        const leftEar = landmarks[234];
        const rightEar = landmarks[454];
        
        // Convert to 3D space
        // Note: This is a simplified conversion. For production, you'd need more precise mapping
        const x = (eyeCenterX - 0.5) * 3; // Scale to scene units
        const y = -(eyeCenterY - 0.5) * 2.5; // Flip Y axis
        const z = 0;
        
        // Calculate scale based on eye distance
        const scale = eyeDistance * 4;
        
        // Calculate rotation
        const headTilt = Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x);
        
        // Update glasses
        this.glasses.visible = true;
        this.glasses.position.set(x, y, z);
        this.glasses.scale.set(scale, scale, scale);
        
        // Add some rotation to match face
        this.glasses.rotation.z = -headTilt;
        this.glasses.rotation.y = (eyeCenterX - 0.5) * 0.5;
    }
    
    drawFaceLandmarks(ctx, landmarks) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        
        // Draw key points for glasses placement
        const keyPoints = [33, 133, 362, 263, 168, 94, 322]; // Eyes and nose bridge
        keyPoints.forEach(index => {
            const point = landmarks[index];
            ctx.beginPath();
            ctx.arc(point.x * ctx.canvas.width, point.y * ctx.canvas.height, 3, 0, 2 * Math.PI);
            ctx.stroke();
        });
    }
    
    async loadGlassesModel() {
        try {
            this.updateStatus('Loading 3D glasses model...');
            
            const loader = new THREE.GLTFLoader();
            
            loader.load(
                this.glassesModels[this.currentGlassesIndex],
                (gltf) => {
                    this.glasses = gltf.scene;
                    
                    // Adjust glasses if needed
                    this.glasses.rotation.x = Math.PI / 2; // Rotate to face forward
                    this.glasses.scale.set(0.1, 0.1, 0.1);
                    this.glasses.visible = false;
                    
                    this.scene.add(this.glasses);
                    this.isModelLoaded = true;
                    
                    this.updateStatus('Glasses model loaded! Click "Start Camera" to begin.');
                    document.getElementById('loading').style.display = 'none';
                    
                    console.log('Glasses model loaded successfully');
                },
                (progress) => {
                    console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('Error loading GLB model:', error);
                    this.updateStatus('Error loading glasses model. Using fallback cube.');
                    this.createFallbackGlasses();
                }
            );
            
        } catch (error) {
            console.error('Model loading error:', error);
            this.createFallbackGlasses();
        }
    }
    
    createFallbackGlasses() {
        // Create a simple glasses frame as fallback
        const frameGeometry = new THREE.BoxGeometry(1, 0.1, 0.3);
        const frameMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            metalness: 0.8,
            roughness: 0.2
        });
        
        // Create frame
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        
        // Create lenses
        const lensGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32);
        const lensMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xaaaaaa,
            transmission: 0.9,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            thickness: 0.5
        });
        
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.position.x = -0.5;
        
        const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
        rightLens.position.x = 0.5;
        
        // Group everything
        this.glasses = new THREE.Group();
        this.glasses.add(frame);
        this.glasses.add(leftLens);
        this.glasses.add(rightLens);
        
        this.glasses.visible = false;
        this.scene.add(this.glasses);
        this.isModelLoaded = true;
        
        document.getElementById('loading').style.display = 'none';
    }
    
    changeGlasses() {
        if (!this.isModelLoaded) return;
        
        this.currentGlassesIndex = (this.currentGlassesIndex + 1) % this.glassesModels.length;
        this.updateStatus(`Loading glasses style ${this.currentGlassesIndex + 1}...`);
        
        // Remove current glasses
        if (this.glasses) {
            this.scene.remove(this.glasses);
        }
        
        // Load new model
        this.loadGlassesModel();
    }
    
    takeScreenshot() {
        const canvas = document.getElementById('outputCanvas');
        const link = document.createElement('a');
        link.download = 'glasses-tryon.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.updateStatus('Screenshot saved!');
    }
    
    updateStatus(message) {
        document.getElementById('status').textContent = `Status: ${message}`;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Start the application when page loads
window.addEventListener('DOMContentLoaded', () => {
    new GlassesAR();
});
