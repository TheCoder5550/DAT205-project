import WGSL_LIT from "./assets/shaders/lit.wgsl?raw";
import WGSL_LIT_SKINNED from "./assets/shaders/lit-skinned.wgsl?raw";
import WGSL_SHADOW from "./assets/shaders/shadow.wgsl?raw";
import WGSL_SHADOW_SKINNED from "./assets/shaders/shadow-skinned.wgsl?raw";

import Scene from "./scene";

interface RendererOptions {
  canvas: HTMLCanvasElement;
}

export default class Renderer {
  readonly options: RendererOptions;
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;

  scenes: Scene[];
  activeScene: Scene | null;

  emptySampler: GPUSampler | null;
  emptyTexture2D: GPUTexture | null;
  depthTexture: GPUTexture | null;

  layouts: Record<string, GPUBindGroupLayout>;
  pipelines: Record<string, GPURenderPipeline>;

  constructor(options: RendererOptions) {
    this.options = options;
    this.scenes = [];
    this.activeScene = null;
    this.emptySampler = null;
    this.emptyTexture2D = null;
    this.depthTexture = null;
    this.layouts = {};
    this.pipelines = {};
  }

  async initialize() {
    const canvas = this.options.canvas;
    const { device } = await this._getGPU();
    const { context } = this._getContext(canvas);

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format: presentationFormat,
    });

    this.emptySampler = _createEmptySampler(device);
    this.emptyTexture2D = _createEmptyTextures(device);
    this.layouts = _createLayouts(device);
    this.pipelines = _createPipelines(device, this.layouts, presentationFormat);

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
  }

  render() {
    const context = this.context;
    const device = this.device;
    if (!device || !context) {
      throw new Error("Await renderer.initialize() first");
    }

    const scene = this.activeScene;
    if (!scene) {
      return;
    }
    
    const encoder = device.createCommandEncoder();
    const { renderPassDescriptor } = this._getRenderPassDescriptor(device, context);

    scene.render(this, device, encoder, renderPassDescriptor);
    
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  }

  addScene(scene: Scene) {
    if (scene.renderer !== null) {
      throw new Error("Scene has already been added to a renderer");
    }

    if (this.scenes.length === 0 || !this.activeScene) {
      this.activeScene = scene;
    }
    
    this.scenes.push(scene);
    scene.renderer = this;
  }

  private _getRenderPassDescriptor(device: GPUDevice, context: GPUCanvasContext) {
    const canvasTexture = context.getCurrentTexture();
    
    // If we don't have a depth texture OR if its size is different
    // from the canvasTexture when make a new depth texture
    if (
      !this.depthTexture ||
      this.depthTexture.width !== canvasTexture.width ||
      this.depthTexture.height !== canvasTexture.height
    ) {
      if (this.depthTexture) {
        this.depthTexture.destroy();
      }
      this.depthTexture = device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: 'main render pass',
      colorAttachments: [
        {
          view: canvasTexture.createView(),
          clearValue: [0.3, 0.3, 0.3, 1],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };

    return {
      renderPassDescriptor,
      canvasTexture,
      depthTexture: this.depthTexture,
    };
  }

  private async _getGPU() {
    if (!navigator.gpu) {
      throw new Error("WebGPU not supported");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("This browser supports webgpu but it appears disabled");
    }

    const limits: GPUDeviceDescriptor = {
      requiredLimits: {},
      requiredFeatures: [],
    };
    const device = await adapter.requestDevice(limits);
    device.lost.then((info) => {
      console.error(`WebGPU device was lost: ${info.message}`);
    }).catch(console.error);
    this.device = device;

    return {
      adapter,
      device
    }
  }

  private _getContext(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('webgpu');
    if (!context) {
      throw new Error("Could not get 'webgpu' canvas context");
    }
    this.context = context;

    return {
      context
    }
  }
}

function _createEmptySampler(device: GPUDevice) {
  return device.createSampler();
}

function _createEmptyTextures(device: GPUDevice) {
  const kTextureWidth = 1;
  const kTextureHeight = 1;
  const textureData = new Uint8Array([255, 255, 255, 255]);
  const texture = device.createTexture({
    size: [kTextureWidth, kTextureHeight],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  device.queue.writeTexture(
    { texture },
    textureData,
    { bytesPerRow: kTextureWidth * 4 },
    { width: kTextureWidth, height: kTextureHeight },
  );
  return texture;
}

function _createLayouts(device: GPUDevice) {
  const layouts: Record<string, GPUBindGroupLayout> = {};

  layouts.scene = device.createBindGroupLayout({
    label: "scene layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {
          type: "comparison"
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          viewDimension: "2d-array",
          sampleType: "depth"
        },
      },
    ]
  });

  layouts.scene_shadow = device.createBindGroupLayout({
    label: "scene shadow layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" }
      },
    ]
  });

  layouts.object = device.createBindGroupLayout({
    label: "object layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" }
      },
    ]
  });

  layouts.material = device.createBindGroupLayout({
    label: "material layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        sampler: {},
      },
      {
        binding: 2,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        texture: {},
      },
    ]
  });

  layouts.skin = device.createBindGroupLayout({
    label: "skin layout",
    entries: [
      {
        binding: 0,
        buffer: {
          type: 'read-only-storage',
        },
        visibility: GPUShaderStage.VERTEX,
      },
      {
        binding: 1,
        buffer: {
          type: 'read-only-storage',
        },
        visibility: GPUShaderStage.VERTEX,
      },
    ],
  });

  return layouts;
}

function _createPipelines(device: GPUDevice, layouts: Record<string, GPUBindGroupLayout>, presentationFormat: GPUTextureFormat) {
  const pipelines: Record<string, GPURenderPipeline> = {};

  const litModule = device.createShaderModule({
    label: 'lit',
    code: WGSL_LIT,
  });

  const litSkinnedModule = device.createShaderModule({
    label: 'lit skinned',
    code: WGSL_LIT_SKINNED,
  });

  const shadowModule = device.createShaderModule({
    label: 'shadow',
    code: WGSL_SHADOW,
  });

  const shadowSkinnedModule = device.createShaderModule({
    label: 'shadow skinned',
    code: WGSL_SHADOW_SKINNED,
  });

  pipelines["lit"] = device.createRenderPipeline({
    label: 'lit',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        layouts.scene,
        layouts.object,
        layouts.material,
        layouts.shadow,
      ]
    }),
    vertex: {
      module: litModule,
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
        {
          arrayStride: 2 * 4,
          attributes: [
            {shaderLocation: 2, offset: 0, format: 'float32x2'},  // uv
          ],
        },
      ]
    },
    fragment: {
      module: litModule,
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

  pipelines["lit-skinned"] = device.createRenderPipeline({
    label: 'lit skinned',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        layouts.scene,
        layouts.object,
        layouts.material,
        layouts.skin,
      ]
    }),
    vertex: {
      module: litSkinnedModule,
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
        {
          arrayStride: 2 * 4,
          attributes: [
            {shaderLocation: 2, offset: 0, format: 'float32x2'},  // uv
          ],
        },
        {
          arrayStride: 4 * 1,
          attributes: [
            {shaderLocation: 3, offset: 0, format: 'uint8x4'},  // joints
          ],
        },
        {
          arrayStride: 4 * 4,
          attributes: [
            {shaderLocation: 4, offset: 0, format: 'float32x4'},  // weights
          ],
        },
      ]
    },
    fragment: {
      module: litModule,
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

  pipelines["shadow"] = device.createRenderPipeline({
    label: 'shadow',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        layouts.scene_shadow,
        layouts.object,
        layouts.material,
      ]
    }),
    vertex: {
      module: shadowModule,
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
        {
          arrayStride: 2 * 4,
          attributes: [
            {shaderLocation: 2, offset: 0, format: 'float32x2'},  // uv
          ],
        },
      ]
    },
    // fragment: {
    //   module: shadowModule,
    //   targets: [],
    // },
    primitive: {
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });

  pipelines["shadow-skinned"] = device.createRenderPipeline({
    label: 'shadow skinned',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        layouts.scene_shadow,
        layouts.object,
        layouts.material,
        layouts.skin
      ]
    }),
    vertex: {
      module: shadowSkinnedModule,
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
        {
          arrayStride: 2 * 4,
          attributes: [
            {shaderLocation: 2, offset: 0, format: 'float32x2'},  // uv
          ],
        },
        {
          arrayStride: 4 * 1,
          attributes: [
            {shaderLocation: 3, offset: 0, format: 'uint8x4'},  // joints
          ],
        },
        {
          arrayStride: 4 * 4,
          attributes: [
            {shaderLocation: 4, offset: 0, format: 'float32x4'},  // weights
          ],
        },
      ]
    },
    // fragment: {
    //   module: shadowModule,
    //   targets: [],
    // },
    primitive: {
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });

  return pipelines;
}