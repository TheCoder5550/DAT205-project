type TypedArray<T extends ArrayBufferLike = ArrayBufferLike> =
  Int8Array<T> |
  Uint8Array<T> |
  Uint8ClampedArray<T> |
  Int16Array<T> |
  Uint16Array<T> |
  Int32Array<T> |
  Uint32Array<T> |
  Float16Array<T> |
  Float32Array<T> |
  Float64Array<T> |
  BigInt64Array<T> |
  BigUint64Array<T>;

export type Attributes = Record<string, Attribute>;

export interface Attribute {
  bufferData: TypedArray<ArrayBuffer>;
  size?: number;
  format?: 'uint16' | 'uint32';
}

export default class Geometry {
  name;
  attributes: Attributes;
  buffers: Record<string, GPUBuffer> | null;
  numVertices;

  constructor(name = "Unnamed") {
    this.name = name;
    this.attributes = {};
    this.buffers = null;
    this.numVertices = -1;
  }

  createBuffers(device: GPUDevice) {
    const cubeMesh = this.attributes;
    const indexData = cubeMesh.indices?.bufferData;
    if (!indexData) {
      throw new Error("Must use 'indices'");
    }
    this.numVertices = indexData.length;
    this.buffers = {};

    for (const [key, attribute] of Object.entries(this.attributes)) {
      if (key === "indices") {
        continue;
      }

      const data = attribute.bufferData;
      const buffer = device.createBuffer({
        label: `vertex buffer for attribute "${key}"`,
        size: data.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(buffer, 0, data);

      this.buffers[key] = buffer;
    }

    const indexBuffer = device.createBuffer({
      label: 'index buffer',
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, indexData);
    this.buffers["indices"] = indexBuffer;
  }
}