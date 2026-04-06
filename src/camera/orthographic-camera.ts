import Mat4 from "../math/mat4";
import Camera from "./camera";

interface OrthographicCameraOptions {
  size?: number;
  near?: number;
  far?: number;
}

export default class OrthographicCamera extends Camera {
  #size;
  #near;
  #far;

  constructor(options?: OrthographicCameraOptions) {
    super();

    this.#size = options?.size ?? 20;
    this.#near = options?.near ?? 0.1;
    this.#far = options?.far ?? 100;

    Mat4.orthographic({
      size: this.#size,
      near: this.#near,
      far: this.#far,
    }, this.projectionMatrix);
  }

  getSize() {
    return this.#size;
  }
}