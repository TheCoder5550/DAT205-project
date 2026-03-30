interface MaterialUniform {
  buffer: GPUBuffer;
  array: Float32Array<ArrayBuffer>;
  views: Record<string, Float32Array<ArrayBuffer>>;
}

type MaterialProperty = number | ArrayLike<number>;

export default class Material {
  name;
  readonly #properties: Record<string, MaterialProperty>;
  uniform: MaterialUniform | null;
  
  constructor(name = "Unnamed") {
    this.name = name;
    this.#properties = {};
    this.uniform = null;
  }

  setProperty(name: string, value: MaterialProperty) {
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