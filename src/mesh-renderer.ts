import type Geometry from "./geometry";
import type Material from "./material";
import type ObjectNode from "./object-node";

export default class MeshRenderer {
  node: ObjectNode | null;
  geometry;
  material;
  bindGroup: GPUBindGroup | null;

  constructor(geometry: Geometry, material: Material) {
    this.node = null;
    this.geometry = geometry;
    this.material = material;
    this.bindGroup = null;
  }

  createBindGroup(pipeline: GPURenderPipeline) {
    const node = this.node;
    if (!node) {
      throw new Error("Add component to node first");
    }
    const scene = node.scene;
    if (!scene) {
      throw new Error("Add object to scene first");
    }
    const renderer = scene.renderer;
    if (!renderer) {
      throw new Error("Add scene to renderer first");
    }
    const device = renderer.device;
    if (!device) {
      throw new Error("Initialize renderer first");
    }

    const material = this.material;

    this.bindGroup = device.createBindGroup({
      label: `meshrenderer bind group for node "${node.name}"`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: scene.uniform!.buffer },
        { binding: 1, resource: node.uniform!.buffer },
        { binding: 2, resource: material.uniform!.buffer },
      ],
    });
  }
}