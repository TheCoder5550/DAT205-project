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
    const vertexData = cubeMesh.POSITION?.bufferData ?? cubeMesh.position.bufferData;
    const normalData = cubeMesh.NORMAL?.bufferData ?? cubeMesh.normal?.bufferData;
    const indexData = cubeMesh.indices?.bufferData;
    if (!indexData) {
      throw new Error("Must use 'indices'");
    }
    const numVertices = indexData.length;

    const normalBuffer = device.createBuffer({
      label: 'vertex buffer normal',
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(normalBuffer, 0, normalData);

    const vertexBuffer = device.createBuffer({
      label: 'vertex buffer position',
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertexData);

    const indexBuffer = device.createBuffer({
      label: 'index buffer',
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, indexData);

    this.buffers = {
      indices: indexBuffer,
      position: vertexBuffer,
      normal: normalBuffer, 
    }
    this.numVertices = numVertices;
  }
}