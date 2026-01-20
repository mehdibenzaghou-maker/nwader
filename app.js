// --- Three.js variables ---
let scene, camera, renderer, glasses;
let video = document.getElementById('video');
let startButton = document.getElementById('startButton');

// --- Three.js setup ---
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 2;
renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
light.position.set(0,1,1);
scene.add(light);

// Load your Nwader.glb glasses
const loader = new THREE.GLTFLoader();
loader.load(
  'https://pub-72b1924cc2494065a2af6bf69f360686.r2.dev/Nwader.glb',
  function(gltf){
    glasses = gltf.scene;
    glasses.scale.set(0.3,0.3,0.3);
    glasses.position.z = 0;
    scene.add(glasses);
  },
  undefined,
  function(error){ console.error("Failed to load GLB:", error);}
);

// --- MediaPipe FaceMesh setup ---
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

// --- Start Camera ---
startButton.addEventListener('click', async () => {
  startButton.style.display = 'none';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play();
      requestAnimationFrame(sendFrame);
    };
  } catch(e){
    alert("Camera access denied or not available.");
    console.error(e);
  }
});

// --- Send frames to MediaPipe ---
function sendFrame(){
  if(video.readyState >= 2){
    faceMesh.send({ image: video });
  }
  requestAnimationFrame(sendFrame);
}

// --- Position glasses ---
function onResults(results){
  if(!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0 || !glasses) return;
  const lm = results.multiFaceLandmarks[0];
  const nose = lm[6], leftEye = lm[33], rightEye = lm[263];

  // Scale based on eye distance
  const eyeDist = Math.sqrt(Math.pow(rightEye.x-leftEye.x,2)+Math.pow(rightEye.y-leftEye.y,2));
  const scale = eyeDist*2.5;
  glasses.scale.set(scale, scale, scale);

  // Position glasses
  glasses.position.set((nose.x-0.5)*2, -(nose.y-0.5)*2, 0);

  // Rotate to match head tilt
  const angleZ = Math.atan2(rightEye.y-leftEye.y, rightEye.x-leftEye.x);
  glasses.rotation.set(0,0,angleZ);
}

// --- Render loop ---
function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// --- Handle resize ---
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
