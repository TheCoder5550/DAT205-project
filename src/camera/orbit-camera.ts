import Mat4 from "../math/mat4";
import Vec3 from "../math/vec3";
import type Camera from "./camera";

const TEMP_VECTOR = new Vec3();

export default class OrbitCamera {
  camera;
  canvas;
  
  constructor(camera: Camera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;

    let left = false;
    let right = false;
    const position = Vec3.zero();
    const rotation = new Vec3(-0.4, 0, 0);
    let zoom = 20;

    const updateTransform = () => {
      const matrix = Mat4.identity();
      Mat4.applyTranslation(position.x, position.y, position.z, matrix);
      Mat4.applyRotationY(rotation.y, matrix);
      Mat4.applyRotationX(rotation.x, matrix);
      Mat4.applyTranslation(0, 0, zoom, matrix);
      this.camera.transform.setMatrix(matrix);
    };

    canvas.addEventListener("contextmenu", e => {
      e.preventDefault();
    });

    canvas.addEventListener("mousedown", e => {
      if (e.button === 0) left = true;
      if (e.button === 2) right = true;
    });

    window.addEventListener("mouseup", e => {
      if (e.button === 0) left = false;
      if (e.button === 2) right = false;
    });

    window.addEventListener("mousemove", e => {
      if (left) {
        rotation.x += -e.movementY * 0.01;
        rotation.y += -e.movementX * 0.01;
        updateTransform();
      }
      else if (right) {
        const f = 0.0006 * zoom;
        TEMP_VECTOR.x = -e.movementX * f;
        TEMP_VECTOR.y = e.movementY * f;
        TEMP_VECTOR.z = 0;
        const rotationMatrix = Mat4.identity();
        Mat4.applyRotationY(rotation.y, rotationMatrix);
        Mat4.applyRotationX(rotation.x, rotationMatrix);
        Mat4.transformVector(rotationMatrix, TEMP_VECTOR, TEMP_VECTOR);
        Vec3.add(position, TEMP_VECTOR, position);
        updateTransform();
      }
    });

    canvas.addEventListener("wheel", e => {
      zoom += e.deltaY * 0.001 * zoom;
      zoom = Math.max(0, zoom);
      updateTransform();
    });

    updateTransform();
  }
}