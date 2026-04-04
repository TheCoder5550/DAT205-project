import { generateMipmaps, numMipLevels } from "./utils";

export default class Texture {
  url;
  bitmap;
  texture: GPUTexture | null;
  mips;

  constructor(url: string, bitmap: ImageBitmap) {
    this.url = url;
    this.bitmap = bitmap;
    this.texture = null;
    this.mips = true;
  }

  createGPUTexture(device: GPUDevice) {
    this.texture = device.createTexture({
      label: this.url,
      format: 'rgba8unorm',
      mipLevelCount: this.mips ? numMipLevels(this.bitmap.width, this.bitmap.height) : 1,
      size: [ this.bitmap.width, this.bitmap.height ],
      usage: (
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT
      ),
    });

    device.queue.copyExternalImageToTexture(
      { source: this.bitmap, flipY: false },
      { texture: this.texture },
      { width: this.bitmap.width, height: this.bitmap.height },
    );

    if (this.texture.mipLevelCount > 1) {
      generateMipmaps(device, this.texture);
    }
  }
}