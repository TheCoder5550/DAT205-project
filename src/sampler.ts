type SamplerOptions = Pick<GPUSamplerDescriptor, "minFilter" | "magFilter" | "addressModeU" | "addressModeV">;

export default class Sampler {
  options;
  sampler: GPUSampler | null;

  constructor(options?: SamplerOptions) {
    this.options = options;
    this.sampler = null;
  }

  createSampler(device: GPUDevice) {
    this.sampler = device.createSampler(this.options);
  }
}