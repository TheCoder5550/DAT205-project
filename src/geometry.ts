import { getCubeMeshData } from "./utils";

export default class Geometry {
  name;
  buffers: Record<string, GPUBuffer> | null;
  numVertices;

  constructor(name = "Unnamed") {
    this.name = name;
    this.buffers = null;
    this.numVertices = -1;
  }

  createBuffers(device: GPUDevice) {
    const cubeMesh = getCubeMeshData();
    const vertexData = cubeMesh.position.bufferData;
    const normalData = cubeMesh.normal.bufferData;
    const indexData = cubeMesh.indices.bufferData;
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