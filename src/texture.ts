export default class Texture {
  url;
  bitmap;
  texture: GPUTexture | null;

  constructor(url: string, bitmap: ImageBitmap) {
    this.url = url;
    this.bitmap = bitmap;
    this.texture = null;
  }

  createGPUTexture(device: GPUDevice) {
    this.texture = device.createTexture({
      label: this.url,
      format: 'rgba8unorm',
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
  }
}