import type Camera from "./camera/camera";
import Mat4 from "./math/mat4";
import type ObjectNode from "./object-node";
import type Renderer from "./renderer";

interface SceneUniform {
  buffer: GPUBuffer;
  array: Float32Array<ArrayBuffer>;
  views: Record<string, Float32Array<ArrayBuffer>>;
}

export default class Scene {
  name;
  renderer: Renderer | null;
  camera: Camera | null;
  readonly children: ObjectNode[];
  uniform: SceneUniform | null;

  constructor(name = "Unnamed") {
    this.name = name;
    this.renderer = null;
    this.camera = null;
    this.children = [];
    this.uniform = null;
  }

  addNode(node: ObjectNode) {
    if (node.scene) {
      throw new Error("Node has already been added to a scene");
    }
    
    node.scene = this;
    this.children.push(node);
  }

  setUniforms() {
    if (!this.camera) {
      throw new Error("Set camera first");
    }

    if (!this.uniform) {
      throw new Error("Create uniform buffer first");
    }

    Mat4.copy(this.camera.projectionMatrix, this.uniform.views.projectionMatrix);
    Mat4.copy(this.camera.viewMatrix.getValue(), this.uniform.views.viewMatrix);
    Mat4.copy(this.camera.transform.matrix, this.uniform.views.cameraMatrix);
  }

  createUniformBuffer(device: GPUDevice) {
    const size = (16 + 16 + 16) * 4;
    const buffer = device.createBuffer({
      label: `scene "${this.name}" uniforms`,
      size: size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const array = new Float32Array(size / 4);

    const views = {
      projectionMatrix: array.subarray(0, 0 + 16),
      viewMatrix: array.subarray(16, 16 + 16),
      cameraMatrix: array.subarray(32, 32 + 16),
    }

    this.uniform = {
      buffer: buffer,
      array: array,
      views: views
    }
  }
}