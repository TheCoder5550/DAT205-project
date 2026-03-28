import WGSL_TRIANGLE from "./assets/shaders/hardcoded-triangle.wgsl?raw";
import { createCircleVertices } from "./utils";

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

  async initialize() {
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

    const canvas = this.options.canvas;
    const context = canvas.getContext('webgpu');
    if (!context) {
      throw new Error("Could not get 'webgpu' canvas context");
    }
    this.context = context;

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: presentationFormat,
    });

    const module = device.createShaderModule({
      label: 'our hardcoded red triangle shaders',
      code: WGSL_TRIANGLE,
    });

    const pipeline = device.createRenderPipeline({
      label: 'our hardcoded red triangle pipeline',
      layout: 'auto',
      vertex: {
        module,
        buffers: [
          {
            arrayStride: 2 * 4 + 4, // 2 floats, 4 bytes each + 4 bytes
            attributes: [
              {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
              {shaderLocation: 4, offset: 8, format: 'unorm8x4'},   // perVertexColor
            ],
          },
          {
            arrayStride: 4 + 2 * 4, // 4 bytes + 2 floats, 4 bytes each
            stepMode: 'instance',
            attributes: [
              {shaderLocation: 1, offset: 0, format: 'unorm8x4'},   // color
              {shaderLocation: 2, offset: 4, format: 'float32x2'},  // offset
            ],
          },
          {
            arrayStride: 2 * 4, // 2 floats, 4 bytes each
            stepMode: 'instance',
            attributes: [
              {shaderLocation: 3, offset: 0, format: 'float32x2'},   // scale
            ],
          },
        ],
      },
      fragment: {
        module,
        targets: [{ format: presentationFormat }],
      },
    });

    const nrObjects = 50;
    const objects: { scale: number }[] = [];

    // create 2 vertex buffers
    const staticUnitSize =
      4 + // color is 4 32bit floats (4bytes each)
      2 * 4;  // offset is 2 32bit floats (4bytes each)
  
    const changingUnitSize =
      2 * 4;  // scale is 2 32bit floats (4bytes each)
    const staticVertexBufferSize = staticUnitSize * nrObjects;
    const changingVertexBufferSize = changingUnitSize * nrObjects;
  
    const staticVertexBuffer = device.createBuffer({
      label: 'static vertex for objects',
      size: staticVertexBufferSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  
    const changingVertexBuffer = device.createBuffer({
      label: 'changing vertex for objects',
      size: changingVertexBufferSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  
    // offsets to the various uniform values in float32 indices
    const kColorOffset = 0;
    const kOffsetOffset = 1;
    const kScaleOffset = 0;

    // setup a storage buffer with vertex data
    const { vertexData, indexData, numVertices } = createCircleVertices({
      radius: 0.5,
      innerRadius: 0.25,
    });
    const vertexBuffer = device.createBuffer({
      label: 'vertex buffer vertices',
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
  
    const staticVertexValuesU8 = new Uint8Array(staticVertexBufferSize);
    const staticVertexValuesF32 = new Float32Array(staticVertexValuesU8.buffer);
    for (let i = 0; i < nrObjects; ++i) {
      const staticOffsetU8 = i * staticUnitSize;
      const staticOffsetF32 = staticOffsetU8 / 4;

      // These are only set once so set them now
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      staticVertexValuesF32.set([x, y], staticOffsetF32 + kOffsetOffset);

      const r = Math.random();
      const g = Math.random();
      const b = Math.random();
      const a = 1;
      staticVertexValuesU8.set([r * 255, g * 255, b * 255, a * 255], staticOffsetU8 + kColorOffset);

      const scale = Math.random() * 0.2 + 0.1;
      objects.push({
        scale: scale,
      });
    }
    device.queue.writeBuffer(staticVertexBuffer, 0, staticVertexValuesF32);
  
    // a typed array we can use to update the changingStorageBuffer
    const storageValues = new Float32Array(changingVertexBufferSize / 4);

    const render = () => {
      const renderPassDescriptor: GPURenderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      };

      const aspect = canvas.width / canvas.height;

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setVertexBuffer(1, staticVertexBuffer);
      pass.setVertexBuffer(2, changingVertexBuffer);
      pass.setIndexBuffer(indexBuffer, 'uint32');

      for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const offset = i * (changingUnitSize / 4);
        storageValues.set([object.scale / aspect, object.scale], offset + kScaleOffset); // set the scale
      }

      // upload all scales at once
      device.queue.writeBuffer(changingVertexBuffer, 0, storageValues);
  
      pass.drawIndexed(numVertices, nrObjects);  // call our vertex shader 3 times for each instance

      pass.end();
 
      const commandBuffer = encoder.finish();
      device.queue.submit([ commandBuffer ]);
    }

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;
        canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
        canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
      }
      render();
    });
    observer.observe(canvas);
  }
}