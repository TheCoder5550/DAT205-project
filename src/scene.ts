import type Camera from "./camera/camera";
import Mat4 from "./math/mat4";
import Vec3 from "./math/vec3";
import type ObjectNode from "./object-node";
import type Renderer from "./renderer";
import Shadowmap from "./shadow-map";

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
  bindGroup: GPUBindGroup | null;
  shadowmap: Shadowmap | null;

  private sunDirection;

  constructor(name = "Unnamed") {
    this.name = name;
    this.renderer = null;
    this.camera = null;
    this.children = [];
    this.uniform = null;
    this.bindGroup = null;

    this.sunDirection = new Vec3(-1, 2, 2);
    this.shadowmap = null;
  }

  addNode(node: ObjectNode) {
    node.setParent(this);
  }

  setUniforms() {
    if (!this.camera) {
      throw new Error("Set camera first");
    }

    if (!this.uniform || !this.shadowmap) {
      throw new Error("Create uniform buffer first");
    }

    Mat4.copy(this.camera.projectionMatrix, this.uniform.views.projectionMatrix);
    Mat4.copy(this.camera.viewMatrix.getValue(), this.uniform.views.viewMatrix);
    Mat4.copy(this.camera.transform.matrix, this.uniform.views.cameraMatrix);
    this.uniform.views.sunDirection[0] = this.sunDirection.x;
    this.uniform.views.sunDirection[1] = this.sunDirection.y;
    this.uniform.views.sunDirection[2] = this.sunDirection.z;
    Mat4.copy(this.shadowmap.shadowMatrix, this.uniform.views.shadowMatrix);
  }

  createUniformBuffer(renderer: Renderer, device: GPUDevice) {
    this.shadowmap = new Shadowmap(renderer, device);
    this.shadowmap.updateMatrices(this.sunDirection);

    const size = (16 + 16 + 16 + 4 + 16) * 4;
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
      sunDirection: array.subarray(48, 48 + 3),
      shadowMatrix: array.subarray(52, 52 + 16),
    }

    this.uniform = {
      buffer: buffer,
      array: array,
      views: views
    }

    this.bindGroup = device.createBindGroup({
      label: `Scene: ${this.name}`,
      layout: renderer.layouts.scene,
      entries: [
        { binding: 0, resource: buffer },

        // Shadows
        { binding: 1, resource: this.shadowmap.sampler },
        { binding: 2, resource: this.shadowmap.depthTexture },
      ],
    });
  }
}