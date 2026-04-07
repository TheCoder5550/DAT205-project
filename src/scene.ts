import type Camera from "./camera/camera";
import DirectionalLight from "./light/directional-light";
import Mat4 from "./math/mat4";
import Vec3 from "./math/vec3";
import type ObjectNode from "./object-node";
import type Renderer from "./renderer";
import ShadowmapRenderer from "./shadow-map";
import { _getRenderableNodes, type TypedArray } from "./utils";

interface SceneUniform {
  buffer: GPUBuffer;
  array: ArrayBuffer;
  views: Record<string, TypedArray<ArrayBuffer>>;
}

export default class Scene {
  name;
  renderer: Renderer | null;
  camera: Camera | null;
  readonly children: ObjectNode[];
  uniform: SceneUniform | null;
  bindGroup: GPUBindGroup | null;
  shadowmapRenderer: ShadowmapRenderer | null;

  lights;

  constructor(name = "Unnamed") {
    this.name = name;
    this.renderer = null;
    this.camera = null;
    this.children = [];
    this.uniform = null;
    this.bindGroup = null;

    this.lights = [
      new DirectionalLight(),
      new DirectionalLight(),
    ];
    this.lights[0].intensity = new Vec3(0.4, 0.9, 1.1);
    this.lights[1].intensity = new Vec3(1.5, 0.7, 0.4);

    this.lights[1].direction = new Vec3(-1.1, 2, 2);
    this.shadowmapRenderer = null;
  }

  addNode(node: ObjectNode) {
    node.setParent(this);
  }

  setUniforms() {
    if (!this.camera) {
      throw new Error("Set camera first");
    }

    if (!this.uniform || !this.shadowmapRenderer) {
      throw new Error("Create uniform buffer first");
    }

    Mat4.copy(this.camera.projectionMatrix, assertF32(this.uniform.views.projectionMatrix));
    Mat4.copy(this.camera.viewMatrix.getValue(), assertF32(this.uniform.views.viewMatrix));
    Mat4.copy(this.camera.transform.matrix, assertF32(this.uniform.views.cameraMatrix));

    this.uniform.views.numLights[0] = this.lights.length;
    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i];

      this.uniform.views.lights[i * 8 + 0] = light.intensity.x;
      this.uniform.views.lights[i * 8 + 1] = light.intensity.y;
      this.uniform.views.lights[i * 8 + 2] = light.intensity.z;

      this.uniform.views.lights[i * 8 + 4] = light.direction.x;
      this.uniform.views.lights[i * 8 + 5] = light.direction.y;
      this.uniform.views.lights[i * 8 + 6] = light.direction.z;

      Mat4.copy(this.shadowmapRenderer.shadowmaps[i].shadowMatrix, assertF32(this.uniform.views.shadowMatrices).subarray(i * 16, i * 16 + 16));
    }
  }

  createUniformBuffer(renderer: Renderer, device: GPUDevice) {
    this.shadowmapRenderer = new ShadowmapRenderer(renderer, device);
    // this.shadowmap.updateMatrices(this.lights[0].direction);

    const size = (16 + 16 + 16 + 4 + 4 * (4 + 4) + 4 * 16) * 4;
    const buffer = device.createBuffer({
      label: `scene "${this.name}" uniforms`,
      size: size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const array = new ArrayBuffer(size);
    const floatArray = new Float32Array(array);
    const intArray = new Uint32Array(array);

    const views = {
      projectionMatrix: floatArray.subarray(0, 0 + 16),
      viewMatrix: floatArray.subarray(16, 16 + 16),
      cameraMatrix: floatArray.subarray(32, 32 + 16),
      numLights: intArray.subarray(48, 48 + 4),
      lights: floatArray.subarray(52, 52 + 32),
      shadowMatrices: floatArray.subarray(84, 84 + 64),
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
        { binding: 1, resource: this.shadowmapRenderer.sampler },
        { binding: 2, resource: this.shadowmapRenderer.texture },
      ],
    });
  }

  render(renderer: Renderer, device: GPUDevice, encoder: GPUCommandEncoder, renderPassDescriptor: GPURenderPassDescriptor) {
    if (!this.uniform) {
      this.createUniformBuffer(renderer, device);
    }
    if (!this.uniform || !this.shadowmapRenderer) {
      throw new Error("Could not create scene uniform");
    }

    this.setUniforms();
    device.queue.writeBuffer(this.uniform.buffer, 0, this.uniform.array);

    this.shadowmapRenderer.shadowPass(encoder, this);

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setBindGroup(0, this.bindGroup);

    const map = _getRenderableNodes(renderer, this);
    for (const [name, nodes] of Object.entries(map)) {
      const pipeline = renderer.pipelines[name === "basic" ? "lit" : "lit-skinned"];
      pass.setPipeline(pipeline);

      for (const node of nodes) {
        if (!node.meshRenderer) {
          continue;
        }
        if (!node.uniform) {
          throw new Error("");
        }

        node.setUniforms();
        device.queue.writeBuffer(node.uniform.buffer, 0, node.uniform.array);
        pass.setBindGroup(1, node.bindGroup);

        for (let i = 0; i < node.meshRenderer.nrPrimitives; i++) {
          const material = node.meshRenderer.materials[i];
          const geometry = node.meshRenderer.geometries[i];

          if (!material.uniform) {
            throw new Error("Material uniform not created");
          }
          if (!geometry.buffers) {
            throw new Error("No geometry buffers");
          }

          material.setUniforms();
          device.queue.writeBuffer(material.uniform.buffer, 0, material.uniform.array);
          pass.setBindGroup(2, material.bindGroup);

          const indexFormat = geometry.attributes.indices.format;
          if (!indexFormat) {
            throw new Error("Index format must be defined");
          }
          pass.setIndexBuffer(geometry.buffers.indices, indexFormat);
          pass.setVertexBuffer(0, geometry.buffers.position ?? geometry.buffers.POSITION);
          pass.setVertexBuffer(1, geometry.buffers.normal ?? geometry.buffers.NORMAL);
          pass.setVertexBuffer(2, geometry.buffers.uv ?? geometry.buffers.TEXCOORD_0);
          
          if (name === "skinned" && node.skin) {
            pass.setVertexBuffer(3, geometry.buffers.JOINTS_0);
            pass.setVertexBuffer(4, geometry.buffers.WEIGHTS_0);
            pass.setBindGroup(3, node.skin.bindGroup);
          }

          pass.drawIndexed(geometry.numVertices);
        }
      }
    }

    pass.end();
  }
}

function assertF32<T extends ArrayBufferLike>(array: TypedArray<T>) {
  if (!(array instanceof Float32Array)) {
    console.error(array);
    throw new Error("Not a Float32Array");
  }
  
  return array;
}