import GUI from 'lil-gui';
import PerspectiveCamera from './camera/perspective-camera';
import Geometry from './geometry';
import Material from './material';
import Mat4 from './math/mat4';
import MeshRenderer from './mesh-renderer';
import ObjectNode from './object-node';
import Renderer from './renderer';
import Scene from './scene';
import './style.css'
import { degToRad } from './utils';
import Quat from './math/quat';

const app = document.querySelector('#app');
if (!app) {
  throw new Error("Missing #app element in index.html");
}

const canvas = document.createElement("canvas");
app.appendChild(canvas);

const settings = {
  fov: 45,
  rotationX: 2,
  rotationY: 3,
  rotationZ: 7,
  cameraZ: 5,
}

for (let i = 0; i < 100; i++) {
  const q = new Quat(
    Math.random() * 10 - 5,
    Math.random() * 10 - 5,
    Math.random() * 10 - 5,
    Math.random() * 10 - 5,
  );
  Mat4.fromQuaternion(q);
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

const material = new Material();
material.setProperty("albedo", [Math.random(), Math.random(), Math.random(), 1]);
material.setProperty("shininess", 256);
material.createUniformBuffer(renderer.device);

const geometry = new Geometry();
geometry.createBuffers(renderer.device);

for (let i = 0; i < 10; i++) {
  const node = new ObjectNode();
  scene.addNode(node);
  node.createUniformBuffer();

  const meshRenderer = new MeshRenderer(geometry, material);
  meshRenderer.node = node;
  meshRenderer.createBindGroup(renderer.pipeline);
  node.meshRenderer = meshRenderer;
}

const gui = new GUI();
gui.add(settings, 'fov', 0.1, 90, 1);
gui.add(settings, 'rotationX', 0, 10, 0.01);
gui.add(settings, 'rotationY', 0, 10, 0.01);
gui.add(settings, 'rotationZ', 0, 10, 0.01);
gui.add(settings, 'cameraZ', 0, 10, 0.01);

const loop = () => {
  const aspect = canvas.width / canvas.height;
  camera.setAspect(aspect);
  camera.setFOV(degToRad(settings.fov));
  camera.transform.position.z = settings.cameraZ;

  for (let i = 0; i < scene.children.length; i++) {
    const node = scene.children[i];
    node.transform.position.x = i - 4.5;
    Quat.euler(settings.rotationX + i * 0.15, settings.rotationY, settings.rotationZ, node.transform.rotation);
  }

  settings.rotationX += 0.01;
  settings.rotationY += 0.002;

  renderer.render();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);