import GLB_TEST from "./assets/models/test-gltf.glb?url";

import GUI from 'lil-gui';
import PerspectiveCamera from './camera/perspective-camera';
import Mat4 from './math/mat4';
import Renderer from './renderer';
import Scene from './scene';
import './style.css'
import { degToRad } from './utils';
import Quat from './math/quat';
import { loadGLB } from './gltf-loader';

const app = document.querySelector('#app');
if (!app) {
  throw new Error("Missing #app element in index.html");
}

const canvas = document.createElement("canvas");
app.appendChild(canvas);

const settings = {
  fov: 25,
  rotationX: 0.5,
  rotationY: 0,
  rotationZ: 0,
  cameraZ: 20,
}

const renderer = new Renderer({ canvas });
await renderer.initialize();

if (!renderer.device || !renderer.pipeline) {
  throw new Error("Renderer setup failed");
}

const camera = new PerspectiveCamera();

const scene = new Scene("Main scene");
renderer.addScene(scene);
scene.camera = camera;
scene.createUniformBuffer(renderer.device);

const glb = await loadGLB(GLB_TEST);
scene.addNode(glb);

const gui = new GUI();
gui.add(settings, 'fov', 0.1, 90, 1);
gui.add(settings, 'rotationX', 0, 10, 0.01);
gui.add(settings, 'rotationY', 0, 10, 0.01);
gui.add(settings, 'rotationZ', 0, 10, 0.01);
gui.add(settings, 'cameraZ', 0, 30, 0.01);

const loop = () => {
  const aspect = canvas.width / canvas.height;
  camera.setAspect(aspect);
  camera.setFOV(degToRad(settings.fov));
  camera.transform.position.z = settings.cameraZ;

  Quat.euler(settings.rotationX, settings.rotationY, settings.rotationZ, glb.transform.rotation);

  renderer.render();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);