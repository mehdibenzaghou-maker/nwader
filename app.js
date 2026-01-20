let scene, camera, renderer, glasses;
let video = document.getElementById('video');
let openCameraButton = document.getElementById('openCamera');
let mpCamera;

// --- Three.js ---
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 2; // move camera back
renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Light
const light = new THREE.HemisphereLight(0xffffff, 0x444444);
light.position.set(0, 1, 1);
scene.add(light);

// Debug cube to confirm rendering
let cubeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
let cubeMat = new THREE.MeshNormalMaterial();
let cube = new THREE.Mesh(cubeGeo, cubeMat);
cube.position.z = 0;
scene.add(cube);

// Load glasses
const loader = new THREE.GLTFLoader();
loader.load(
  'https://pub-72b1924cc2494065a2af6bf69f360686.r2.dev/Nwader.glb',
  function(gltf){
    glasses = gltf.scene;
    glasses.scale.set(0.3, 0.3, 0.3);
    glasses.position.z = 0;
    scene.add(glasses);
  }
);

// --- MediaPipe ---
const faceMesh = new FaceMesh.FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({ maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.5, minTrackingConfidence:0.5 });
faceMesh.onResults(onResults);

// --- Open Camera ---
openCameraButton.addEventListener('click', () => {
  openCameraButton.style.display = 'none';
  mpCamera = new Camera.Camera(video, {
    onFrame: async () => { await faceMesh.send({image: video}); },
    width: 640, height: 480
  });
  mpCamera.start();
});

// --- Face tracking ---
function onResults(results){
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0 || !glasses) return;
  const lm = results.multiFaceLandmarks[0];
  const nose = lm[6], leftEye = lm[33], rightEye = lm[263];

  const eyeDist = Math.sqrt(Math.pow(rightEye.x-leftEye.x,2)+Math.pow(rightEye.y-leftEye.y,2));
  const scale = eyeDist*2;
  glasses.scale.set(scale, scale, scale);

  glasses.position.set((nose.x-0.5)*2, -(nose.y-0.5)*2, 0);

  const angleZ = Math.atan2(rightEye.y-leftEye.y, rightEye.x-leftEye.x);
  glasses.rotation.set(0,0,angleZ);
}

// --- Render ---
function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// --- Resize ---
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
