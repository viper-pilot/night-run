import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const loader = new GLTFLoader();

export function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, (err) => {
      console.error(`Failed to load ${url}`, err);
      reject(err);
    });
  });
}

/** Wrap model in a pivot group, scale its largest dimension to `targetSize`
 *  (0 = keep native size), centre it on X/Z and rest its base on y = 0. */
export function normalize(model, { targetSize = 0, scale = 1, rotation = [0, 0, 0] } = {}) {
  model.rotation.set(...rotation);
  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = (targetSize ? targetSize / Math.max(size.x, size.y, size.z) : 1) * scale;
  model.scale.multiplyScalar(k);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.set(model.position.x - c.x, model.position.y - box.min.y, model.position.z - c.z);
  const pivot = new THREE.Group();
  pivot.add(model);
  const dims = box.getSize(new THREE.Vector3());
  return { pivot, dims };
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    [].concat(o.material).forEach((m) => {
      Object.values(m).forEach((v) => v?.isTexture && v.dispose());
      m.dispose();
    });
  });
}
