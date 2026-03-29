import WGSL_LIT from "./assets/shaders/lit.wgsl?raw";
import GUI from 'lil-gui';
import Mat4 from "./math/mat4";
import { getCubeMeshData } from "./utils";
import Mat3 from "./math/mat3";

interface RendererOptions {
  canvas: HTMLCanvasElement;
}

export default class Renderer {
  readonly options: RendererOptions;
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;

  constructor(options: RendererOptions) {
    this.options = options;
  }

  async #_getGPU() {
    if (!navigator.gpu) {
      throw new Error("WebGPU not supported");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("This browser supports webgpu but it appears disabled");
    }

    const device = await adapter.requestDevice();
    device.lost.then((info) => {
      console.error(`WebGPU device was lost: ${info.message}`);
    }).catch(console.error);
    this.device = device;

    return {
      adapter,
      device
    }
  }

  #_getContext(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('webgpu');
    if (!context) {
      throw new Error("Could not get 'webgpu' canvas context");
    }
    this.context = context;

    return {
      context
    }
  }

  async initialize() {
    const canvas = this.options.canvas;
    const { device } = await this.#_getGPU();
    const { context } = this.#_getContext(canvas);

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: presentationFormat,
    });

    const module = device.createShaderModule({
      label: 'lit',
      code: WGSL_LIT,
    });

    const pipeline = device.createRenderPipeline({
      label: 'lit',
      layout: 'auto',
      vertex: {
        module,
        buffers: [
          {
            arrayStride: 3 * 4,
            attributes: [
              {shaderLocation: 0, offset: 0, format: 'float32x3'},  // position
            ],
          },
          {
            arrayStride: 3 * 4,
            attributes: [
              {shaderLocation: 1, offset: 0, format: 'float32x3'},  // normal
            ],
          },
        ]
      },
      fragment: {
        module,
        targets: [{ format: presentationFormat }],
      },
      primitive: {
        cullMode: 'back',
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus',
      },
    });

    // Scene uniforms
    const sizeScene = (16 + 16 + 16) * 4;
    const uniformBufferScene = device.createBuffer({
      label: 'scene uniforms',
      size: sizeScene,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformsScene: Record<string, Float32Array<ArrayBuffer>> = {
      all: new Float32Array(sizeScene / 4),
    }
    uniformsScene.projectionMatrix = uniformsScene.all.subarray(0, 0 + 16);
    uniformsScene.viewMatrix = uniformsScene.all.subarray(16, 16 + 16);
    uniformsScene.cameraMatrix = uniformsScene.all.subarray(32, 32 + 16);

    // Object uniforms
    const sizeObject = (16 + 12) * 4;
    const uniformBufferObject = device.createBuffer({
      label: 'object uniforms',
      size: sizeObject,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformsObject: Record<string, Float32Array<ArrayBuffer>> = {
      all: new Float32Array(sizeObject / 4),
    }
    uniformsObject.worldMatrix = uniformsObject.all.subarray(0, 0 + 16);
    uniformsObject.normalMatrix = uniformsObject.all.subarray(16, 16 + 12);

    // Material uniforms
    const sizeMaterial = (4 + 4) * 4;
    const uniformBufferMaterial = device.createBuffer({
      label: 'material uniforms',
      size: sizeMaterial,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const uniformsMaterial: Record<string, Float32Array<ArrayBuffer>> = {
      all: new Float32Array(sizeMaterial / 4),
    }
    uniformsMaterial.albedo = uniformsMaterial.all.subarray(0, 0 + 4);
    uniformsMaterial.shininess = uniformsMaterial.all.subarray(4, 4 + 1);

    // The color will not change so let's set it once at init time
    uniformsMaterial.albedo.set([Math.random(), Math.random(), Math.random(), 1]);
    uniformsMaterial.shininess.set([256]);

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

    const bindGroup = device.createBindGroup({
      label: 'bind group for object',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: uniformBufferScene },
        { binding: 1, resource: uniformBufferObject },
        { binding: 2, resource: uniformBufferMaterial },
      ],
    });

    let depthTexture: GPUTexture | null = null;

    const settings = {
      fov: 45,
      rotationX: 2,
      rotationY: 3,
      rotationZ: 7,
    }

    const cameraMatrix = Mat4.applyTranslation(0, 0, 3, Mat4.identity(uniformsScene.cameraMatrix));
    Mat4.inverse(cameraMatrix, uniformsScene.viewMatrix);

    const render = () => {
      const canvasTexture = context.getCurrentTexture();

      // If we don't have a depth texture OR if its size is different
      // from the canvasTexture when make a new depth texture
      if (
        !depthTexture ||
        depthTexture.width !== canvasTexture.width ||
        depthTexture.height !== canvasTexture.height
      ) {
        if (depthTexture) {
          depthTexture.destroy();
        }
        depthTexture = device.createTexture({
          size: [canvasTexture.width, canvasTexture.height],
          format: 'depth24plus',
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
      }

      const renderPassDescriptor: GPURenderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
          {
            view: canvasTexture.createView(),
            clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
        depthStencilAttachment: {
          view: depthTexture.createView(),
          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
        },
      };

      const aspect = canvas.width / canvas.height;

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setVertexBuffer(1, normalBuffer);
      pass.setIndexBuffer(indexBuffer, 'uint32');

      Mat4.perspective({
        fov: settings.fov * Math.PI / 180,
        aspect: aspect,
        near: 0.1,
        far: 100,
      }, uniformsScene.projectionMatrix);

      const world = Mat4.identity(uniformsObject.worldMatrix);
      Mat4.applyRotationX(settings.rotationX, world);
      Mat4.applyRotationY(settings.rotationY, world);
      Mat4.applyRotationZ(settings.rotationZ, world);

      Mat3.fromMat4(Mat4.transpose(Mat4.inverse(world)), uniformsObject.normalMatrix);

      // upload the uniform values to the uniform buffer
      device.queue.writeBuffer(uniformBufferScene, 0, uniformsScene.all);
      device.queue.writeBuffer(uniformBufferObject, 0, uniformsObject.all);
      device.queue.writeBuffer(uniformBufferMaterial, 0, uniformsMaterial.all);

      pass.setBindGroup(0, bindGroup);
      pass.drawIndexed(numVertices);

      pass.end();

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);

      settings.rotationX += 0.01;
      settings.rotationY += 0.002;
      requestAnimationFrame(render);
    }

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const canvas = entry.target as HTMLCanvasElement;
        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;
        canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
        canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      }
    });
    observer.observe(canvas);

    const gui = new GUI();
    gui.add(settings, 'fov', 0.1, 90, 1);
    gui.add(settings, 'rotationX', 0, 10, 0.01);
    gui.add(settings, 'rotationY', 0, 10, 0.01);
    gui.add(settings, 'rotationZ', 0, 10, 0.01);

    requestAnimationFrame(render);
  }
}