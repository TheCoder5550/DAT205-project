import Sampler from "./sampler";
import Texture from "./texture";

interface MaterialUniform {
  buffer: GPUBuffer;
  array: Float32Array<ArrayBuffer>;
  views: Record<string, Float32Array<ArrayBuffer>>;
}

type MaterialProperty = number | ArrayLike<number> | undefined;

export default class Material {
  name;
  readonly #properties: Record<string, MaterialProperty>;
  uniform: MaterialUniform | null;

  albedoSampler: Sampler | null;
  albedoTexture: Texture | null;
  
  constructor(name = "Unnamed") {
    this.name = name;
    this.#properties = {};
    this.uniform = null;
    this.albedoSampler = null;
    this.albedoTexture = null;

    this.setProperty("albedo", [1, 1, 1, 1]);
  }

  setProperty(name: string, value: MaterialProperty | Texture | Sampler) {
    if (name === "albedoTexture" && value instanceof Texture) {
      this.albedoTexture = value;
      return;
    }

    if (name === "albedoSampler" && value instanceof Sampler) {
      this.albedoSampler = value;
      return;
    }

    if (value instanceof Texture || value instanceof Sampler) {
      throw new Error("Cannot assign texture/sampler to material");
    }

    this.#properties[name] = value;
  }

  getProperty(name: string) {
    return this.#properties[name];
  }

  setUniforms() {
    if (!this.uniform) {
      throw new Error("Create uniform buffer first");
    }

    for (const key of Object.keys(this.uniform.views)) {
      const value = this.#properties[key];
      if (typeof value === "undefined") {
        continue;
      }
      
      this.uniform.views[key].set(typeof value === "number" ? [ value ] : value);
    }
  }

  createUniformBuffer(device: GPUDevice) {
    if (this.uniform) {
      throw new Error("Uniforms already created");
    }

    const size = (4 + 4) * 4;
    const buffer = device.createBuffer({
      label: `material "${this.name}" uniforms`,
      size: size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const array = new Float32Array(size / 4);

    const views = {
      albedo: array.subarray(0, 0 + 4),
      shininess: array.subarray(4, 4 + 1),
    }

    this.uniform = {
      buffer: buffer,
      array: array,
      views: views
    }
  }
}