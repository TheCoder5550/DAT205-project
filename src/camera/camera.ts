import Mat4 from "../math/mat4";
import Transform from "../transform";

export default class Camera {
  transform;
  projectionMatrix;
  viewMatrix;

  constructor() {
    this.transform = new Transform();
    this.viewMatrix = this.transform.depend((transform, viewMatrix) => {
      Mat4.inverse(transform.matrix, viewMatrix);
    }, Mat4.identity());
    this.projectionMatrix = Mat4.identity();
  }
}