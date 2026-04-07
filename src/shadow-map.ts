import OrthographicCamera from "./camera/orthographic-camera";
import type DirectionalLight from "./light/directional-light";
import Mat4 from "./math/mat4";
import Vec3 from "./math/vec3";
import type ObjectNode from "./object-node";
import type Renderer from "./renderer";
import type Scene from "./scene";
import { _getRenderableNodes } from "./utils";

type Renderables = {
  basic: ObjectNode[];
  skinned: ObjectNode[];
};

interface ShadowmapRendererOptions {
  resolution?: number;
  pcf?: boolean;
}

export default class ShadowmapRenderer {
  renderer;
  device;
  sampler;
  texture;
  shadowmaps;
  
  constructor(renderer: Renderer, device: GPUDevice, options?: ShadowmapRendererOptions) {
    const textureSize = options?.resolution ?? 1024;
    const enablePCF = options?.pcf ?? true;

    this.renderer = renderer;
    this.device = device;

    const desc: GPUTextureDescriptor = {
      size: [textureSize, textureSize, 4],
      dimension: "2d",
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    };
    this.texture = device.createTexture(desc);

    this.sampler = device.createSampler({
      compare: 'less',
      ...(enablePCF && {
        minFilter: "linear",
        magFilter: "linear",
      }),
    });

    this.shadowmaps = [];
    for (let i = 0; i < 4; i++) {
      const textureView = this.texture.createView({
        dimension: "2d-array",
        baseArrayLayer: i,
        arrayLayerCount: 1
      });
      this.shadowmaps.push(new Shadowmap(renderer, device, textureView));
    }
  }

  shadowPass(encoder: GPUCommandEncoder, scene: Scene) {
    const renderables = _getRenderableNodes(this.renderer, scene);

    for (let i = 0; i < this.shadowmaps.length; i++) {
      const shadowmap = this.shadowmaps[i];
      const light = scene.lights[i];
      if (!light) {
        continue;
      }

      shadowmap.shadowPass(this.renderer, this.device, encoder, renderables, light);
    }
  }
}

class Shadowmap {
  camera;
  shadowMatrix = Mat4.identity();
  
  private renderPassDescriptor: GPURenderPassDescriptor;
  private uniform;
  private bindGroup;

  constructor(renderer: Renderer, device: GPUDevice, textureView: GPUTextureView) {
    const area = 15;

    const size = (16 + 16 + 16 + 4) * 4;
    const buffer = device.createBuffer({
      label: `shadowmap uniforms`,
      size: size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const array = new Float32Array(size / 4);

    const views = {
      projectionMatrix: array.subarray(0, 0 + 16),
      viewMatrix: array.subarray(16, 16 + 16),
      cameraMatrix: array.subarray(32, 32 + 16),
      sunDirection: array.subarray(48, 48 + 3),
    }

    this.uniform = {
      buffer: buffer,
      array: array,
      views: views
    };

    this.bindGroup =  device.createBindGroup({
      label: `shadowmap (generate)`,
      layout: renderer.layouts.scene_shadow,
      entries: [
        { binding: 0, resource: buffer },
      ],
    });

    this.camera = new OrthographicCamera({ size: area, near: 0.1, far: 100 });

    this.renderPassDescriptor = {
      label: 'shadow renderpass',
      colorAttachments: [],
      depthStencilAttachment: {
        view: textureView,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };
  }

  shadowPass(renderer: Renderer, device: GPUDevice, encoder: GPUCommandEncoder, renderables: Renderables, light: DirectionalLight) {
    const uniform = this.uniform;
    const bindGroup = this.bindGroup;
    const shadowMatrix = this.shadowMatrix;

    const mat = Mat4.identity();
    Mat4.lookAt(Vec3.zero(), light.direction, new Vec3(0, 1, 0), mat);
    Mat4.applyTranslation(0, 0, 50, mat);
    this.camera.transform.setMatrix(mat);

    Mat4.identity(shadowMatrix);
    Mat4.multiply(shadowMatrix, this.camera.projectionMatrix, shadowMatrix);
    Mat4.multiply(shadowMatrix, this.camera.viewMatrix.getValue(), shadowMatrix);

    Mat4.copy(this.camera.projectionMatrix, uniform.views.projectionMatrix);
    Mat4.copy(this.camera.viewMatrix.getValue(), uniform.views.viewMatrix);
    Mat4.copy(this.camera.transform.matrix, uniform.views.cameraMatrix);

    device.queue.writeBuffer(uniform.buffer, 0, uniform.array);

    const pass = encoder.beginRenderPass(this.renderPassDescriptor);
    pass.setBindGroup(0, bindGroup);

    for (const [name, nodes] of Object.entries(renderables)) {
      const pipeline = renderer.pipelines[name === "basic" ? "shadow" : "shadow-skinned"];
      pass.setPipeline(pipeline);

      for (const node of nodes) {
        if (!node.meshRenderer) {
          continue;
        }
        if (!node.uniform) {
          throw new Error("No node uniforms");
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