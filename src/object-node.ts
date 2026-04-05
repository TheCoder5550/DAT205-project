import Mat3 from "./math/mat3";
import Mat4 from "./math/mat4";
import type MeshRenderer from "./mesh-renderer";
import type Renderer from "./renderer";
import Scene from "./scene";
import type Skin from "./skin";
import Transform from "./transform";

interface ObjectUniform {
  buffer: GPUBuffer;
  array: Float32Array<ArrayBuffer>;
  views: Record<string, Float32Array<ArrayBuffer>>;
}

export default class ObjectNode {
  name;
  transform;
  // normalMatrix;
  #parent: ObjectNode | Scene | null;
  children: ObjectNode[];
  scene: Scene | null;
  bindGroup: GPUBindGroup | null;
  uniform: ObjectUniform | null;
  meshRenderer: MeshRenderer | null;

  skin: Skin | null;
  
  constructor(name = "Unnamed") {
    // const TEMP_MAT4 = Mat4.identity();

    this.name = name;
    this.transform = new Transform();
    // this.normalMatrix = this.transform.depend((transform, me) => {
    //   Mat4.inverse(transform.matrix, TEMP_MAT4);
    //   Mat4.transpose(TEMP_MAT4, TEMP_MAT4);
    //   Mat3.fromMat4(TEMP_MAT4, me);
    // }, Mat3.identity());
    this.#parent = null;
    this.children = [];
    this.scene = null;
    this.bindGroup = null;
    this.uniform = null;
    this.meshRenderer = null;
    this.skin = null;
  }

  getParent() {
    return this.#parent;
  }

  setParent(parent: ObjectNode | Scene | null) {
    if (parent === this) {
      throw new Error("Cannot be own parent");
    }

    if (parent !== null && isGrandChild(this, parent)) {
      throw new Error("Circular scene graph detected");
    }

    if (parent === null) {
      if (this.#parent) {
        const index = this.#parent.children.indexOf(this);
        if (index === -1) {
          throw new Error("Parent desync");
        }
        this.#parent.children.splice(index, 1);
      }
      this.scene = null;
      const children = traverseChildren(this);
      for (const child of children) {
        child.scene = null;
      }
      return;
    }

    if (this.#parent) {
      throw new Error("Node already has parent");
    }

    if (parent instanceof Scene) {
      this.scene = parent;
    }
    else {
      this.scene = parent.scene;
    }

    this.#parent = parent;
    parent.children.push(this);

    const children = traverseChildren(this);
    for (const child of children) {
      child.scene = this.scene;
    }
  }

  setUniforms() {
    if (!this.uniform) {
      throw new Error("Create uniform buffer first");
    }

    const worldMatrix = getWorldMatrix(this, Mat4.identity());

    const TEMP_MAT4 = Mat4.identity();
    Mat4.inverse(worldMatrix, TEMP_MAT4);
    Mat4.transpose(TEMP_MAT4, TEMP_MAT4);
    const normalMatrix = Mat3.fromMat4(TEMP_MAT4);

    Mat4.copy(worldMatrix, this.uniform.views.worldMatrix);
    Mat3.copy(normalMatrix, this.uniform.views.normalMatrix);
  }

  createUniformBuffer(renderer: Renderer, device: GPUDevice) {
    if (this.uniform) {
      throw new Error("Uniforms already created");
    }

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

    this.bindGroup = device.createBindGroup({
      label: `Node: ${this.name}`,
      layout: renderer.layouts.object,
      entries: [
        { binding: 0, resource: buffer },
      ],
    });
  }
}

export function getWorldMatrix(node: ObjectNode, dst: Float32Array) {
  Mat4.copy(node.transform.matrix, dst);
  let currentNode: ObjectNode | null = node;
  while (currentNode !== null) {
    const parent = currentNode.getParent();
    if (!(parent instanceof ObjectNode)) {
      break;
    }
    Mat4.multiply(parent.transform.matrix, dst, dst);
    currentNode = parent;
  }

  return dst;
}

function isGrandChild(parent: ObjectNode, maybeChild: ObjectNode | Scene): boolean {
  let currentNode: ObjectNode | Scene | null = maybeChild;
  while (currentNode !== null) {
    if (currentNode === parent) {
      return true;
    }
    if (currentNode instanceof Scene) {
      return false;
    }
    currentNode = currentNode.getParent();
  }

  return false;
}

export function* traverseChildren(node: ObjectNode): Generator<ObjectNode> {
  yield node;
  for (const child of node.children) {
    yield *traverseChildren(child);
  }
}