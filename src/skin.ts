import type { Attribute } from "./geometry";
import Mat4 from "./math/mat4";
import type ObjectNode from "./object-node";
import { getWorldMatrix } from "./object-node";
import type Renderer from "./renderer";

export default class Skin {
  name;
  joints;
  inverseBindMatrices: Attribute | null;

  jointBuffer: GPUBuffer | null;
  bindGroup: GPUBindGroup | null;

  constructor(joints: ObjectNode[], name = "Unnamed") {
    this.name = name;
    this.joints = joints;
    this.inverseBindMatrices = null;
    this.jointBuffer = null;
    this.bindGroup = null;
  }

  createUniformBuffer(renderer: Renderer, device: GPUDevice) {
    if (!this.inverseBindMatrices) {
      throw new Error("Inverse bind matrices required");
    }

    this.jointBuffer = device.createBuffer({
      label: `"${this.name}" joint`,
      size: Float32Array.BYTES_PER_ELEMENT * 16 * this.joints.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const inverseBindMatricesBuffer = device.createBuffer({
      label: `"${this.name}" inverse bind matrix`,
      size: Float32Array.BYTES_PER_ELEMENT * 16 * this.joints.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(
      inverseBindMatricesBuffer,
      0,
      this.inverseBindMatrices.bufferData
    );

    this.bindGroup = device.createBindGroup({
      label: `Skin: ${this.name}`,
      layout: renderer.layouts.skin,
      entries: [
        { binding: 0, resource: this.jointBuffer },
        { binding: 1, resource: inverseBindMatricesBuffer },
      ],
    });
  }

  update(device: GPUDevice, root: ObjectNode) {
    const globalWorldInverse = getWorldMatrix(root, Mat4.identity());
    Mat4.inverse(globalWorldInverse, globalWorldInverse);

    for (let j = 0; j < this.joints.length; j++) {
      const joint = this.joints[j];
      const dstMatrix = Mat4.identity();
      Mat4.multiply(globalWorldInverse, getWorldMatrix(joint, Mat4.identity()), dstMatrix);
      const toWrite = dstMatrix;
      device.queue.writeBuffer(
        this.jointBuffer!,
        j * 64,
        toWrite.buffer,
        toWrite.byteOffset,
        toWrite.byteLength
      );
    }
  }
}