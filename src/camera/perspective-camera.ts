import Mat4 from "../math/mat4";
import Camera from "./camera";

interface PerspectiveCameraOptions {
  fov?: number;
  near?: number;
  far?: number;
  aspect?: number;
}

export default class PerspectiveCamera extends Camera {
  #fov;
  #aspect;
  #near;
  #far;

  constructor(options?: PerspectiveCameraOptions) {
    super();

    this.#fov = options?.fov ?? 1.5;
    this.#aspect = options?.aspect ?? 1;
    this.#near = options?.near ?? 0.1;
    this.#far = options?.far ?? 100;

    Mat4.perspective({
      fov: this.#fov,
      aspect: this.#aspect,
      near: this.#near,
      far: this.#far,
    }, this.projectionMatrix);
  }

  getFOV() {
    return this.#fov;
  }

  setFOV(fov: number) {
    this.#fov = fov;
    const ct = Math.cos(this.#fov) / Math.sin(this.#fov);
    this.projectionMatrix[0] = ct / this.#aspect;
    this.projectionMatrix[5] = ct;
  }

  getAspect() {
    return this.#aspect;
  }

  setAspect(aspect: number) {
    this.#aspect = aspect;
    const ct = Math.cos(this.#fov) / Math.sin(this.#fov);
    this.projectionMatrix[0] = ct / this.#aspect;
  }
}