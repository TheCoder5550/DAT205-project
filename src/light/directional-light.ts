import Vec3 from "../math/vec3";
import Light from "./light";

export default class DirectionalLight extends Light {
  direction;

  constructor() {
    super();
    
    this.direction = new Vec3(-1, 2, 2);
    Vec3.normalize(this.direction, this.direction);
  }
}