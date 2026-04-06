import OrthographicCamera from "./camera/orthographic-camera";
import Mat4 from "./math/mat4";
import Vec3 from "./math/vec3";
import type Renderer from "./renderer";
import { _getRenderableNodes } from "./renderer";
import type Scene from "./scene";

export default class Shadowmap {
  uniform;
  camera;
  depthTexture;
  shadowMatrix = Mat4.identity();
  sampler;
  
  private renderPassDescriptor: GPURenderPassDescriptor;
  private bindGroup;

  constructor(renderer: Renderer, device: GPUDevice) {
    const area = 15;
    const textureSize = 1024;
    const enablePCF = true;

    const desc: GPUTextureDescriptor = {
      size: [textureSize, textureSize],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
    };
    this.depthTexture = device.createTexture(desc);
    const depthTextureView = this.depthTexture.createView();

    this.renderPassDescriptor = {
      label: 'shadow renderpass',
      colorAttachments: [],
      depthStencilAttachment: {
        view: depthTextureView,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };

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
    }

    this.bindGroup = device.createBindGroup({
      label: `shadowmap (generate)`,
      layout: renderer.layouts.scene_shadow,
      entries: [
        { binding: 0, resource: buffer },
      ],
    });

    this.sampler = device.createSampler({
      compare: 'less',
      ...(enablePCF && {
        minFilter: "linear",
        magFilter: "linear",
      }),
    });

    this.camera = new OrthographicCamera({ size: area, near: 0.1, far: 100 });
  }

  updateMatrices(sunDirection: Vec3) {
    const mat = Mat4.identity();
    Mat4.lookAt(Vec3.zero(), sunDirection, new Vec3(0, 1, 0), mat);
    Mat4.applyTranslation(0, 0, 50, mat);
    this.camera.transform.setMatrix(mat);

    Mat4.identity(this.shadowMatrix);
    Mat4.multiply(this.shadowMatrix, this.camera.projectionMatrix, this.shadowMatrix);
    Mat4.multiply(this.shadowMatrix, this.camera.viewMatrix.getValue(), this.shadowMatrix);
  }

  shadowPass(renderer: Renderer, device: GPUDevice, encoder: GPUCommandEncoder, scene: Scene) {
    Mat4.copy(this.camera.projectionMatrix, this.uniform.views.projectionMatrix);
    Mat4.copy(this.camera.viewMatrix.getValue(), this.uniform.views.viewMatrix);
    Mat4.copy(this.camera.transform.matrix, this.uniform.views.cameraMatrix);

    device.queue.writeBuffer(this.uniform.buffer, 0, this.uniform.array);

    const pass = encoder.beginRenderPass(this.renderPassDescriptor);
    pass.setBindGroup(0, this.bindGroup);

    const renderables = _getRenderableNodes(renderer, scene);
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