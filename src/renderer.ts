import WGSL_TRIANGLE from "./assets/shaders/hardcoded-triangle.wgsl?raw";

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
    });
    this.device = device;

    const context = this.options.canvas.getContext('webgpu');
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
      },
      fragment: {
        module,
        targets: [{ format: presentationFormat }],
      },
    });

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

      // Get the current texture from the canvas context and
      // set it as the texture to render to.
      // renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
  
      // make a command encoder to start encoding commands
      const encoder = device.createCommandEncoder({ label: 'our encoder' });
  
      // make a render pass encoder to encode render specific commands
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.draw(3);  // call our vertex shader 3 times
      pass.end();
  
      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    }

    render();
  }
}