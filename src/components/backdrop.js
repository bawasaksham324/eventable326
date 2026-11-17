import * as THREE from 'three';

let backdropCreated = false;

export function createBackdrop(container) {
  if (backdropCreated) return;
  backdropCreated = true;
  const canvas = document.createElement('canvas');
  canvas.className = 'three-backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  container.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 8;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(420 * 3);
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (Math.random() - 0.5) * 17;
    positions[i + 1] = (Math.random() - 0.5) * 10;
    positions[i + 2] = (Math.random() - 0.5) * 8;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0x8c6bff, size: 0.025, transparent: true, opacity: 0.75 });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (event) => {
    points.rotation.y = (event.clientX / window.innerWidth - 0.5) * 0.06;
    points.rotation.x = (event.clientY / window.innerHeight - 0.5) * 0.04;
  });
  const tick = () => {
    if (!reducedMotion) points.rotation.z += 0.00025;
    renderer.render(scene, camera);
    if (!reducedMotion) requestAnimationFrame(tick);
  };
  tick();
}
