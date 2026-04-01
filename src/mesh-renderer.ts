import type Geometry from "./geometry";
import type Material from "./material";
import type ObjectNode from "./object-node";
import type Renderer from "./renderer";

export default class MeshRenderer {
  node: ObjectNode | null;
  readonly geometries;
  readonly materials;
  bindGroups: GPUBindGroup[] | null;
  nrPrimitives;

  constructor(geometry: Geometry | Geometry[], material: Material | Material[]) {
    this.node = null;
    this.bindGroups = null;
    this.geometries = Array.isArray(geometry) ? geometry : [ geometry ];
    this.materials = Array.isArray(material) ? material : [ material ];

    if (this.geometries.length !== this.materials.length) {
      throw new Error("Geometries and materials must have same length");
    }

    this.nrPrimitives = this.geometries.length;
  }

  createBindGroups(renderer: Renderer) {
    const device = renderer.device;
    const pipeline = renderer.pipeline;
    if (!device || !pipeline || !renderer.emptySampler || !renderer.emptyTexture2D) {
      throw new Error("Setup renderer first");
    }

    const node = this.node;
    if (!node) {
      throw new Error("Add component to node first");
    }
    const scene = node.scene;
    if (!scene) {
      throw new Error("Add object to scene first");
    }

    if (!scene.uniform) {
      throw new Error("Create scene uniform first");
    }
    if (!node.uniform) {
      throw new Error("Create node uniform first");
    }

    this.bindGroups = [];

    for (let i = 0; i < this.nrPrimitives; i++) {
      const material = this.materials[i];

      if (!material.uniform) {
        material.createUniformBuffer(device);
      }
      if (!material.uniform) {
        throw new Error("Could not create material uniform buffer");
      }

      let texture = renderer.emptyTexture2D;
      if (material.albedoTexture !== null) {
        if (!material.albedoTexture.texture) {
          material.albedoTexture.createGPUTexture(device);
        }
        texture = material.albedoTexture.texture!;
      }
  
      let sampler = renderer.emptySampler;
      if (material.albedoSampler !== null) {
        if (!material.albedoSampler.sampler) {
          material.albedoSampler.createSampler(device);
        }
        sampler = material.albedoSampler.sampler!;
      }

      this.bindGroups[i] = device.createBindGroup({
        label: `meshrenderer bind group for node "${node.name}"`,
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: scene.uniform.buffer },
          { binding: 1, resource: node.uniform.buffer },
          { binding: 2, resource: material.uniform.buffer },

          { binding: 3, resource: sampler },
          { binding: 4, resource: texture },
        ],
      });
    }
  }
}