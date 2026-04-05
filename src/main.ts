import GLB_TEST from "./assets/models/test-gltf.glb?url";

import GUI from 'lil-gui';
import PerspectiveCamera from './camera/perspective-camera';
import Renderer from './renderer';
import Scene from './scene';
import './style.css'
import { degToRad } from './utils';
import { loadGLB } from './gltf-loader';
import Stats from "stats.js";
import type ObjectNode from "./object-node";
import OrbitCamera from "./camera/orbit-camera";

const app = document.querySelector('#app');
if (!app) {
  throw new Error("Missing #app element in index.html");
}

const canvas = document.createElement("canvas");
app.appendChild(canvas);

const stats = new Stats();
document.body.append(stats.dom);

const settings = {
  fov: 25,
}

const renderer = new Renderer({ canvas });
await renderer.initialize();

if (!renderer.device) {
  throw new Error("Renderer setup failed");
}

const camera = new PerspectiveCamera();
new OrbitCamera(camera, canvas);

const scene = new Scene("Main scene");
renderer.addScene(scene);
scene.camera = camera;

const glb = await loadGLB(GLB_TEST);
scene.addNode(glb);

const gui = new GUI();
gui.add(settings, 'fov', 0.1, 90, 1);

let selectedNode: ObjectNode | null = null;

let selectedFolder: GUI | null = null;

const root = gui.addFolder(`Scene: ${scene.name}`);
const createFolders = (parentFolder: GUI, nodes: ObjectNode[]) => {
  for (const node of nodes) {
    const folder = parentFolder.addFolder(node.name);
    folder.close();
    folder.add({
      ["Select node"]: () => {
        selectedNode = node;

        if (selectedFolder) {
          selectedFolder.destroy();
        }
        selectedFolder = gui.addFolder("Selected node");

        selectedFolder.add(selectedNode, "name");

        const posFolder = selectedFolder.addFolder("Position");
        const rotFolder = selectedFolder.addFolder("Rotation");
        const scaleFolder = selectedFolder.addFolder("Scale");

        posFolder.add(selectedNode.transform.position, "x");
        posFolder.add(selectedNode.transform.position, "y");
        posFolder.add(selectedNode.transform.position, "z");

        rotFolder.add(selectedNode.transform.rotation, "x");
        rotFolder.add(selectedNode.transform.rotation, "y");
        rotFolder.add(selectedNode.transform.rotation, "z");
        rotFolder.add(selectedNode.transform.rotation, "w");

        scaleFolder.add(selectedNode.transform.scale, "x");
        scaleFolder.add(selectedNode.transform.scale, "y");
        scaleFolder.add(selectedNode.transform.scale, "z");
      }
    }, "Select node");
    createFolders(folder, node.children);
  }
}
createFolders(root, scene.children);

const loop = () => {
  stats.update();

  const aspect = canvas.width / canvas.height;
  camera.setAspect(aspect);
  camera.setFOV(degToRad(settings.fov));

  renderer.render();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);