import Mat3 from "./math/mat3";
import Mat4 from "./math/mat4";
import type MeshRenderer from "./mesh-renderer";
import type Scene from "./scene";
import Transform from "./transform";

interface ObjectUniform {
  buffer: GPUBuffer;
  array: Float32Array<ArrayBuffer>;
  views: Record<string, Float32Array<ArrayBuffer>>;
}

export default class ObjectNode {
  name;
  transform;
  normalMatrix;
  children: ObjectNode[];
  scene: Scene | null;
  uniform: ObjectUniform | null;
  meshRenderer: MeshRenderer | null;
  
  constructor(name = "Unnamed") {
    const TEMP_MAT4 = Mat4.identity();

    this.name = name;
    this.transform = new Transform();
    this.normalMatrix = this.transform.depend((transform, me) => {
      Mat4.inverse(transform.matrix, TEMP_MAT4);
      Mat4.transpose(TEMP_MAT4, TEMP_MAT4);
      Mat3.fromMat4(TEMP_MAT4, me);
    }, Mat3.identity());
    this.children = [];
    this.scene = null;
    this.uniform = null;
    this.meshRenderer = null;
  }

  setUniforms() {
    if (!this.uniform) {
      throw new Error("Create uniform buffer first");
    }

    Mat4.copy(this.transform.matrix, this.uniform.views.worldMatrix);
    Mat3.copy(this.normalMatrix.getValue(), this.uniform.views.normalMatrix);
  }

  createUniformBuffer() {
    if (this.uniform) {
      throw new Error("Uniforms already created");
    }

    const device = getDevice(this);

    const size = (16 + 12) * 4;
    const buffer = device.createBuffer({
      label: `object "${this.name}" uniforms`,
      size: size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const array = new Float32Array(size / 4);

    const views = {
      worldMatrix: array.subarray(0, 0 + 16),
      normalMatrix: array.subarray(16, 16 + 12),
    }

    this.uniform = {
      buffer: buffer,
      array: array,
      views: views
    }
  }
}

function getDevice(node: ObjectNode) {
  if (!node.scene) {
    throw new Error("Add object to scene first");
  }
  const renderer = node.scene.renderer;
  if (!renderer) {
    throw new Error("Add scene to renderer first");
  }
  const device = renderer.device;
  if (!device) {
    throw new Error("Initialize renderer first");
  }

  return device;
}