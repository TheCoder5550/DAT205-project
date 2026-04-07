import Vec3 from "../math/vec3";

export default class Light {
  intensity;

  constructor() {
    this.intensity = new Vec3(1, 1, 1);
  }
}