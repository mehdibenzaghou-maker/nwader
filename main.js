/**
 * Production-Grade AR Sunglasses Virtual Try-On Platform
 * Built with Three.js + MediaPipe Face Mesh
 * Optimized for mobile and desktop browsers
 */

import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.148.0/examples/jsm/loaders/GLTFLoader.js';

// Configuration
const CONFIG = {
    // Performance
    FPS_LIMIT: 60,
    DETECTION_INTERVAL: 33, // ~30fps for face detection
    SMOOTHING_FACTOR: 0.3,
    
    // Face Detection
    MIN_DETECTION_CONFIDENCE: 0.7,
    MIN_TRACKING_CONFIDENCE: 0.7,
    MAX_FACES: 1,
    
    // Camera
    CAMERA_RESOLUTION: { width: 1280, height: 720 },
    PREFERRED_CAMERA: 'user', // 'user' for front, 'environment' for back
    
    // 3D Models
    GLASSES_SCALE_FACTOR: 0.0008,
    MODEL_ROTATION: { x: Math.PI / 2, y: 0, z: 0 },
    
    // Face Landmarks (MediaPipe indices)
    LANDMARKS: {
        NOSE_BRIDGE: 168,
        LEFT_EYE_OUTER: 33,
        RIGHT_EYE_OUTER: 263,
        LEFT_EAR: 234,
        RIGHT_EAR: 454,
        FOREHEAD: 10,
        NOSE_TIP: 1,
        LEFT_EYE: 145,
        RIGHT_EYE: 374,
        LEFT_TEMPLE: 162,
        RIGHT_TEMPLE: 389
    }
};

// State Management
class AppState {
    constructor() {
        this.isCameraActive = false;
        this.isFaceDetected = false;
        this.isTracking = false;
        this.currentGlassesIndex = 0;
        this.isMirrored = true;
        this.isDemoMode = false;
        this.loadedModels = new Map();
        this.faceLandmarks = null;
        this.lastFaceUpdate = 0;
        this.fpsCounter = 0;
        this.lastFpsUpdate = 0;
    }
}

// Main Application Class
class SunglassesVTO {
    constructor() {
        this.state = new AppState();
        this.init();
    }

    async init() {
        try {
            // Initialize core systems
            await this.initThreeJS();
            await this.initFaceDetection();
            await this.initUI();
            await this.loadGlassesModels();
            
            // Start animation loop
            this.animate();
            
            // Initialize performance monitoring
            this.initPerformanceMonitor();
            
            console.log('✅ VTO Platform Initialized');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showError('Failed to initialize AR platform');
        }
    }

    // Three.js Initialization
    async initThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = null;
        
        // Camera setup matching video resolution
        const aspect = CONFIG.CAMERA_RESOLUTION.width / CONFIG.CAMERA_RESOLUTION.height;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.z = 5;
        
        // Renderer with optimal settings
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('glassesCanvas'),
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Advanced lighting setup
        this.setupLighting();
        
        // Handle window resize
        this.setupResizeHandler();
        
        // GLTF Loader with cache
        this.gltfLoader = new GLTFLoader();
        
        console.log('✅ Three.js initialized');
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        // Directional lights for realistic shadows
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight1.position.set(5, 5, 5);
        directionalLight1.castShadow = true;
        this.scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-5, 5, -5);
        this.scene.add(directionalLight2);
        
        // Rim light for edge definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        rimLight.position.set(0, -5, -5);
        this.scene.add(rimLight);
    }

    // Face Detection with MediaPipe
    async initFaceDetection() {
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });
        
        this.faceMesh.setOptions({
            maxNumFaces: CONFIG.MAX_FACES,
            refineLandmarks: true,
            minDetectionConfidence: CONFIG.MIN_DETECTION_CONFIDENCE,
            minTrackingConfidence: CONFIG.MIN_TRACKING_CONFIDENCE
        });
        
        this.faceMesh.onResults(this.onFaceResults.bind(this));
        
        console.log('✅ Face detection initialized');
    }

    // UI Initialization
    async initUI() {
        this.bindEvents();
        this.createGlassesCarousel();
        this.updateStatus('Ready to try on');
        
        // Check camera permissions
        await this.checkCameraPermissions();
    }

    // Camera Permission Handling
    async checkCameraPermissions() {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'camera' });
            
            if (permissionStatus.state === 'granted') {
                this.startCamera();
            } else if (permissionStatus.state === 'prompt') {
                this.showPermissionPrompt();
            } else {
                this.showError('Camera access denied. Please enable in browser settings.');
            }
            
            // Listen for permission changes
            permissionStatus.onchange = () => {
                if (permissionStatus.state === 'granted') {
                    this.startCamera();
                }
            };
            
        } catch (error) {
            // Fallback for browsers that don't support permissions API
            this.showPermissionPrompt();
        }
    }

    // Start Camera with Error Handling
    async startCamera() {
        try {
            this.updateStatus('Starting camera...');
            
            const constraints = {
                video: {
                    facingMode: CONFIG.PREFERRED_CAMERA,
                    width: { ideal: CONFIG.CAMERA_RESOLUTION.width },
                    height: { ideal: CONFIG.CAMERA_RESOLUTION.height },
                    frameRate: { ideal: 30, max: 60 }
                },
                audio: false
            };
            
            // iOS Safari workaround
            if (this.isIOS()) {
                constraints.video.facingMode = { exact: 'user' };
            }
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            const video = document.getElementById('cameraVideo');
            
            video.srcObject = stream;
            
            // Wait for video metadata
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });
            
            // Start face detection pipeline
            this.startFaceDetection(video);
            
            this.state.isCameraActive = true;
            this.updateStatus('Looking for face...');
            this.hidePermissionPrompt();
            this.showToast('Camera started successfully');
            
            console.log('✅ Camera started');
            
        } catch (error) {
            console.error('Camera error:', error);
            this.handleCameraError(error);
        }
    }

    // Face Detection Pipeline
    startFaceDetection(video) {
        const camera = new Camera(video, {
            onFrame: async () => {
                const now = Date.now();
                if (now - this.state.lastFaceUpdate >= CONFIG.DETECTION_INTERVAL) {
                    try {
                        await this.faceMesh.send({ image: video });
                        this.state.lastFaceUpdate = now;
                    } catch (error) {
                        // Silent fail - face detection busy
                    }
                }
            },
            width: CONFIG.CAMERA_RESOLUTION.width,
            height: CONFIG.CAMERA_RESOLUTION.height
        });
        
        camera.start();
    }

    // Process Face Detection Results
    onFaceResults(results) {
        const video = document.getElementById('cameraVideo');
        const faceCanvas = document.getElementById('faceCanvas');
        const ctx = faceCanvas.getContext('2d');
        
        // Update canvas size to match video
        if (video.videoWidth > 0) {
            faceCanvas.width = video.videoWidth;
            faceCanvas.height = video.videoHeight;
        }
        
        // Clear and draw video frame
        ctx.save();
        ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
        
        if (this.state.isMirrored) {
            ctx.scale(-1, 1);
            ctx.drawImage(video, -faceCanvas.width, 0, faceCanvas.width, faceCanvas.height);
        } else {
            ctx.drawImage(video, 0, 0, faceCanvas.width, faceCanvas.height);
        }
        ctx.restore();
        
        // Process face landmarks
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            this.state.faceLandmarks = results.multiFaceLandmarks[0];
            
            if (!this.state.isFaceDetected) {
                this.state.isFaceDetected = true;
                this.state.isTracking = true;
                this.onFaceDetected();
            }
            
            // Update glasses position with precision
            this.updateGlassesPosition();
            
        } else {
            if (this.state.isFaceDetected) {
                this.state.isFaceDetected = false;
                this.state.isTracking = false;
                this.onFaceLost();
            }
            
            if (this.glasses) {
                this.glasses.visible = false;
            }
        }
        
        // Update performance monitor
        this.updatePerformanceStats();
    }

    // Professional Glasses Positioning Algorithm
    updateGlassesPosition() {
        if (!this.state.faceLandmarks || !this.glasses) return;
        
        const landmarks = this.state.faceLandmarks;
        const config = CONFIG.LANDMARKS;
        
        // Get key facial points
        const noseBridge = landmarks[config.NOSE_BRIDGE];
        const leftEye = landmarks[config.LEFT_EYE];
        const rightEye = landmarks[config.RIGHT_EYE];
        const leftTemple = landmarks[config.LEFT_TEMPLE];
        const rightTemple = landmarks[config.RIGHT_TEMPLE];
        const forehead = landmarks[config.FOREHEAD];
        
        // Calculate face metrics
        const interpupillaryDistance = this.calculateDistance(leftEye, rightEye);
        const faceWidth = this.calculateDistance(leftTemple, rightTemple);
        const eyeCenter = this.calculateMidpoint(leftEye, rightEye);
        
        // Calculate head rotation (yaw, pitch, roll)
        const headRotation = this.calculateHeadRotation(landmarks);
        
        // Map to 3D space with perspective correction
        const screenTo3D = this.mapScreenTo3D(eyeCenter, interpupillaryDistance);
        
        // Apply smoothing for stable tracking
        const smoothedPosition = this.smoothPosition(screenTo3D.position);
        const smoothedScale = this.smoothScale(interpupillaryDistance * CONFIG.GLASSES_SCALE_FACTOR);
        
        // Update glasses
        this.glasses.visible = true;
        this.glasses.position.copy(smoothedPosition);
        this.glasses.scale.setScalar(smoothedScale);
        
        // Apply precise rotation
        this.glasses.rotation.set(
            headRotation.pitch + CONFIG.MODEL_ROTATION.x,
            headRotation.yaw,
            headRotation.roll
        );
        
        // Adjust for nose bridge position
        const noseBridgeOffset = this.calculateNoseBridgeOffset(noseBridge, eyeCenter);
        this.glasses.position.y += noseBridgeOffset.y;
        this.glasses.position.z += noseBridgeOffset.z;
    }

    // Mathematical helper functions
    calculateDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + 
            Math.pow(point2.y - point1.y, 2)
        );
    }

    calculateMidpoint(point1, point2) {
        return {
            x: (point1.x + point2.x) / 2,
            y: (point1.y + point2.y) / 2
        };
    }

    calculateHeadRotation(landmarks) {
        const config = CONFIG.LANDMARKS;
        
        // Calculate yaw from ear positions
        const leftEar = landmarks[config.LEFT_EAR];
        const rightEar = landmarks[config.RIGHT_EAR];
        const yaw = Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x);
        
        // Calculate pitch from forehead to nose tip
        const forehead = landmarks[config.FOREHEAD];
        const noseTip = landmarks[config.NOSE_TIP];
        const pitch = Math.atan2(noseTip.y - forehead.y, noseTip.x - forehead.x);
        
        // Calculate roll from eye line
        const leftEye = landmarks[config.LEFT_EYE_OUTER];
        const rightEye = landmarks[config.RIGHT_EYE_OUTER];
        const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        
        return { yaw: yaw * 0.5, pitch: pitch * 0.3, roll: roll * 0.8 };
    }

    mapScreenTo3D(eyeCenter, ipd) {
        // Convert screen coordinates (0-1) to 3D space (-1 to 1)
        const x = (eyeCenter.x - 0.5) * 2.5;
        const y = -(eyeCenter.y - 0.5) * 2.2;
        
        // Calculate depth based on IPD (proportional scaling)
        const z = (ipd - 0.1) * 2;
        
        return {
            position: new THREE.Vector3(x, y + 0.15, z),
            scale: ipd
        };
    }

    smoothPosition(targetPosition) {
        if (!this.lastPosition) {
            this.lastPosition = targetPosition.clone();
            return targetPosition;
        }
        
        this.lastPosition.lerp(targetPosition, CONFIG.SMOOTHING_FACTOR);
        return this.lastPosition;
    }

    smoothScale(targetScale) {
        if (!this.lastScale) {
            this.lastScale = targetScale;
            return targetScale;
        }
        
        this.lastScale += (targetScale - this.lastScale) * CONFIG.SMOOTHING_FACTOR;
        return this.lastScale;
    }

    calculateNoseBridgeOffset(noseBridge, eyeCenter) {
        // Calculate offset from eye center to nose bridge
        const dx = noseBridge.x - eyeCenter.x;
        const dy = noseBridge.y - eyeCenter.y;
        
        return {
            y: dy * 0.5,
            z: dx * 0.3
        };
    }

    // Load 3D Glasses Models
    async loadGlassesModels() {
        const models = [
            {
                id: 'aviator',
                name: 'Aviator',
                icon: '🕶️',
                url: 'models/sunglasses-aviator.glb',
                scale: 0.8,
                color: '#FFD700'
            },
            {
                id: 'wayfarer',
                name: 'Wayfarer',
                icon: '😎',
                url: 'models/sunglasses-wayfarer.glb',
                scale: 1.0,
                color: '#2C3E50'
            },
            {
                id: 'sport',
                name: 'Sport',
                icon: '🏃',
                url: 'models/sunglasses-sport.glb',
                scale: 0.9,
                color: '#E74C3C'
            },
            {
                id: 'retro',
                name: 'Retro',
                icon: '✨',
                url: 'models/sunglasses-retro.glb',
                scale: 0.85,
                color: '#9B59B6'
            }
        ];
        
        this.glassesModels = models;
        
        // Load first model
        await this.loadGlassesModel(0);
    }

    async loadGlassesModel(index) {
        const model = this.glassesModels[index];
        
        if (this.state.loadedModels.has(model.id)) {
            // Use cached model
            this.glasses = this.state.loadedModels.get(model.id).clone();
            this.scene.add(this.glasses);
            this.glasses.visible = false;
            return;
        }
        
        try {
            this.updateStatus(`Loading ${model.name}...`);
            
            const gltf = await new Promise((resolve, reject) => {
                this.gltfLoader.load(model.url, resolve, null, reject);
            });
            
            // Process and optimize model
            this.processGlassesModel(gltf.scene, model);
            
            // Cache the model
            this.state.loadedModels.set(model.id, gltf.scene.clone());
            
            this.glasses = gltf.scene;
            this.scene.add(this.glasses);
            this.glasses.visible = false;
            
            this.state.currentGlassesIndex = index;
            this.updateGlassesSelector();
            
            this.showToast(`${model.name} loaded`);
            
        } catch (error) {
            console.error(`Failed to load model ${model.name}:`, error);
            this.showError(`Failed to load ${model.name}. Using placeholder.`);
            this.createFallbackGlasses(model);
        }
    }

    processGlassesModel(model, config) {
        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        // Apply initial scale
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = config.scale / maxDim;
        model.scale.setScalar(scale);
        
        // Apply initial rotation
        model.rotation.x = CONFIG.MODEL_ROTATION.x;
        
        // Optimize materials for AR
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.material) {
                    // Enhance material appearance
                    child.material.needsUpdate = true;
                    
                    // Make lenses more realistic
                    if (child.material.name && child.material.name.toLowerCase().includes('lens')) {
                        child.material.transparent = true;
                        child.material.opacity = 0.3;
                        child.material.transmission = 0.9;
                        child.material.roughness = 0.05;
                        child.material.ior = 1.5;
                    }
                }
            }
        });
    }

    createFallbackGlasses(config) {
        // Create a simple glasses model as fallback
        const group = new THREE.Group();
        
        // Frame
        const frameGeometry = new THREE.BoxGeometry(2, 0.12, 0.25);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: config.color,
            metalness: 0.9,
            roughness: 0.1,
            envMapIntensity: 1.2
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        group.add(frame);
        
        // Lenses
        const lensGeometry = new THREE.CircleGeometry(0.7, 32);
        const lensMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x1a1a1a,
            transmission: 0.2,
            transparent: true,
            opacity: 0.25,
            roughness: 0.05,
            thickness: 1.5,
            ior: 1.5
        });
        
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.position.x = -0.9;
        leftLens.rotation.x = Math.PI / 2;
        group.add(leftLens);
        
        const rightLens = leftLens.clone();
        rightLens.position.x = 0.9;
        group.add(rightLens);
        
        // Temples
        const templeGeometry = new THREE.BoxGeometry(0.08, 0.08, 1.5);
        const leftTemple = new THREE.Mesh(templeGeometry, frameMaterial);
        leftTemple.position.set(-1, 0, -0.75);
        leftTemple.rotation.y = 0.3;
        group.add(leftTemple);
        
        const rightTemple = leftTemple.clone();
        rightTemple.position.set(1, 0, -0.75);
        rightTemple.rotation.y = -0.3;
        group.add(rightTemple);
        
        // Scale and add
        group.scale.setScalar(0.1);
        group.rotation.x = Math.PI / 2;
        
        this.glasses = group;
        this.scene.add(this.glasses);
        this.glasses.visible = false;
    }

    // UI Methods
    createGlassesCarousel() {
        const carousel = document.getElementById('carouselTrack');
        carousel.innerHTML = '';
        
        this.glassesModels.forEach((model, index) => {
            const item = document.createElement('div');
            item.className = `glasses-item ${index === this.state.currentGlassesIndex ? 'active' : ''}`;
            item.dataset.index = index;
            
            item.innerHTML = `
                <span class="glasses-icon">${model.icon}</span>
                <span class="glasses-name">${model.name}</span>
            `;
            
            item.addEventListener('click', () => this.selectGlasses(index));
            
            carousel.appendChild(item);
        });
    }

    updateGlassesSelector() {
        document.querySelectorAll('.glasses-item').forEach((item, index) => {
            item.classList.toggle('active', index === this.state.currentGlassesIndex);
        });
    }

    selectGlasses(index) {
        if (index !== this.state.currentGlassesIndex) {
            this.loadGlassesModel(index);
        }
    }

    // Event Handlers
    bindEvents() {
        // Camera controls
        document.getElementById('tryOnBtn').addEventListener('click', () => this.startCamera());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopCamera());
        document.getElementById('toggleMirror').addEventListener('click', () => this.toggleMirror());
        
        // Capture
        document.getElementById('captureBtn').addEventListener('click', () => this.captureScreenshot());
        
        // Carousel
        document.getElementById('carouselPrev').addEventListener('click', () => this.scrollCarousel(-1));
        document.getElementById('carouselNext').addEventListener('click', () => this.scrollCarousel(1));
        
        // Error handling
        document.getElementById('retryCamera').addEventListener('click', () => this.startCamera());
        
        // Permission prompt
        document.getElementById('requestCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('demoMode').addEventListener('click', () => this.enableDemoMode());
    }

    // Screenshot Capture with Professional Quality
    async captureScreenshot() {
        if (!this.state.isFaceDetected) {
            this.showToast('Please position your face first');
            return;
        }
        
        try {
            const video = document.getElementById('cameraVideo');
            const glassesCanvas = document.getElementById('glassesCanvas');
            
            // Create high-quality canvas
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext('2d', { alpha: true });
            
            // Draw video (mirrored if enabled)
            ctx.save();
            if (this.state.isMirrored) {
                ctx.scale(-1, 1);
                ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            } else {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            ctx.restore();
            
            // Draw glasses
            ctx.drawImage(glassesCanvas, 0, 0, canvas.width, canvas.height);
            
            // Add watermark/logo
            this.addWatermark(ctx, canvas);
            
            // Show preview modal
            this.showScreenshotPreview(canvas);
            
        } catch (error) {
            console.error('Screenshot error:', error);
            this.showToast('Failed to capture screenshot');
        }
    }

    addWatermark(ctx, canvas) {
        ctx.font = '16px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'right';
        ctx.fillText('Virtual Try-On', canvas.width - 20, canvas.height - 20);
    }

    // Utility Methods
    updateStatus(message) {
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = message;
        }
    }

    showToast(message, duration = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, duration);
    }

    showError(message) {
        const errorState = document.getElementById('errorState');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorState && errorMessage) {
            errorMessage.textContent = message;
            errorState.style.display = 'flex';
        }
    }

    hideError() {
        const errorState = document.getElementById('errorState');
        if (errorState) {
            errorState.style.display = 'none';
        }
    }

    showPermissionPrompt() {
        const prompt = document.getElementById('permissionPrompt');
        if (prompt) {
            prompt.style.display = 'flex';
        }
    }

    hidePermissionPrompt() {
        const prompt = document.getElementById('permissionPrompt');
        if (prompt) {
            prompt.style.display = 'none';
        }
    }

    showScreenshotPreview(canvas) {
        const modal = document.getElementById('screenshotModal');
        const previewCanvas = document.getElementById('screenshotCanvas');
        
        previewCanvas.width = canvas.width;
        previewCanvas.height = canvas.height;
        previewCanvas.getContext('2d').drawImage(canvas, 0, 0);
        
        modal.style.display = 'flex';
        
        // Setup download button
        document.getElementById('downloadBtn').onclick = () => {
            this.downloadScreenshot(canvas);
        };
        
        // Setup share button (if Web Share API is available)
        if (navigator.share) {
            document.getElementById('shareBtn').onclick = () => {
                this.shareScreenshot(canvas);
            };
        } else {
            document.getElementById('shareBtn').style.display = 'none';
        }
    }

    downloadScreenshot(canvas) {
        const link = document.createElement('a');
        link.download = `sunglasses-tryon-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.showToast('Screenshot downloaded');
    }

    async shareScreenshot(canvas) {
        try {
            canvas.toBlob(async (blob) => {
                const file = new File([blob], 'sunglasses-tryon.png', { type: 'image/png' });
                
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'My Sunglasses Try-On',
                        text: 'Check out my new sunglasses!'
                    });
                }
            }, 'image/png');
        } catch (error) {
            console.error('Share error:', error);
            this.downloadScreenshot(canvas);
        }
    }

    // Performance Monitoring
    initPerformanceMonitor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
    }

    updatePerformanceStats() {
        // Update FPS counter
        this.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            // Update UI
            const fpsCounter = document.getElementById('fpsCounter');
            if (fpsCounter) {
                fpsCounter.textContent = this.fps;
            }
        }
        
        // Update tracking status
        const trackingStatus = document.getElementById('trackingStatus');
        if (trackingStatus) {
            trackingStatus.textContent = this.state.isTracking ? 'Active' : 'Lost';
            trackingStatus.style.color = this.state.isTracking ? '#4CAF50' : '#f44336';
        }
        
        // Update model count
        const modelCount = document.getElementById('modelCount');
        if (modelCount) {
            modelCount.textContent = this.state.loadedModels.size;
        }
    }

    // Platform Detection
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    isAndroid() {
        return /Android/.test(navigator.userAgent);
    }

    // Window Resize Handler
    setupResizeHandler() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.onWindowResize();
            }, 100);
        });
    }

    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    // Animation Loop
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.renderer && this.scene && this.camera) {
            // Add subtle animation to glasses for realism
            if (this.glasses && this.glasses.visible) {
                const time = Date.now() * 0.001;
                this.glasses.position.y += Math.sin(time) * 0.001;
                this.glasses.rotation.y += 0.0005;
            }
            
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Cleanup
    stopCamera() {
        const video = document.getElementById('cameraVideo');
        if (video && video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
        
        this.state.isCameraActive = false;
        this.state.isFaceDetected = false;
        this.state.isTracking = false;
        
        if (this.glasses) {
            this.glasses.visible = false;
        }
        
        this.updateStatus('Camera stopped');
        this.showToast('Camera stopped');
    }

    toggleMirror() {
        this.state.isMirrored = !this.state.isMirrored;
        this.showToast(`Mirror ${this.state.isMirrored ? 'enabled' : 'disabled'}`);
    }

    scrollCarousel(direction) {
        const carousel = document.getElementById('carouselTrack');
        carousel.scrollLeft += direction * 150;
    }

    onFaceDetected() {
        this.hideError();
        this.updateStatus('Face detected - Tracking active');
        this.showToast('Perfect fit! Adjust your position if needed');
    }

    onFaceLost() {
        this.updateStatus('Face lost - Looking for face...');
        this.showToast('Position your face in the circle', 2000);
    }

    handleCameraError(error) {
        let message = 'Camera error';
        
        if (error.name === 'NotAllowedError') {
            message = 'Camera access denied. Please allow camera access in browser settings.';
        } else if (error.name === 'NotFoundError') {
            message = 'No camera found. Please connect a camera.';
        } else if (error.name === 'NotReadableError') {
            message = 'Camera is in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
            message = 'Camera cannot meet requirements. Trying fallback...';
            // Try with simpler constraints
            this.startCameraWithFallback();
            return;
        }
        
        this.showError(message);
        this.updateStatus('Camera error');
    }

    async startCameraWithFallback() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true, // Minimal constraints
                audio: false
            });
            
            const video = document.getElementById('cameraVideo');
            video.srcObject = stream;
            video.play();
            
            this.startFaceDetection(video);
            this.state.isCameraActive = true;
            
        } catch (fallbackError) {
            this.showError('Cannot access camera. Please check permissions.');
        }
    }

    enableDemoMode() {
        this.state.isDemoMode = true;
        this.hidePermissionPrompt();
        this.showToast('Demo mode enabled');
        // Load demo face image and enable glasses placement
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Hide loading screen after all assets are loaded
    window.addEventListener('load', () => {
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 500);
    });
    
    // Start the application
    const app = new SunglassesVTO();
    window.vtoApp = app; // Expose for debugging
    
    // Service Worker for PWA (optional)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause tracking when page is not visible
        window.vtoApp?.pauseTracking();
    } else {
        // Resume tracking when page becomes visible
        window.vtoApp?.resumeTracking();
    }
});
