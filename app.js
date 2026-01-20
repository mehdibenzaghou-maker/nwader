let scene, camera, renderer, glasses;
let video = document.getElementById('video');
let openCameraButton = document.getElementById('openCamera');
let mpCamera;

// --- Three.js setup ---
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const light = new THREE.HemisphereLight(0xffffff, 0x444444);
light.position.set(0, 1, 0);
scene.add(light);

// Load GLB glasses
const loader = new THREE.GLTFLoader();
loader.load(
  'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models/2.0/Sunglasses/glTF/Sunglasses.gltf',
  function(gltf){
    glasses = gltf.scene;
    glasses.scale.set(0.1, 0.1, 0.1);
    scene.add(glasses);
  }
);

// --- MediaPipe FaceMesh ---
const faceMesh = new FaceMesh.FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

// --- Open Camera button ---
openCameraButton.addEventListener('click', () => {
  openCameraButton.style.display = 'none';

  mpCamera = new Camera.Camera(video, {
    onFrame: async () => { await faceMesh.send({image: video}); },
    width: 640,
    height: 480
  });
  mpCamera.start();
});

// --- Position glasses ---
function onResults(results){
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0 || !glasses) return;
  const landmarks = results.multiFaceLandmarks[0];

  const nose = landmarks[6];         // nose tip
  const leftEye = landmarks[33];     // left eye
  const rightEye = landmarks[263];   // right eye
  const leftEar = landmarks[127];    // left ear
  const rightEar = landmarks[356];   // right ear

  // Scale glasses based on eye distance
  const eyeDistance = Math.sqrt(
    Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
  );
  const scale = eyeDistance * 2;
  glasses.scale.set(scale, scale, scale);

  // Convert normalized coordinates to Three.js space
  const x = (nose.x - 0.5) * 2;
  const y = -(nose.y - 0.5) * 2;
  const z = -0.5;
  glasses.position.set(x, y, z);

  // Rotate glasses to match head tilt
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const angleZ = Math.atan2(dy, dx);
  glasses.rotation.set(0, 0, angleZ);

  // Rotate around Y for slight head turn
  const headTilt = Math.atan2(rightEar.y - leftEar.y, rightEar.x - leftEar.x);
  glasses.rotation.y = headTilt;
}

// --- Render loop ---
function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
