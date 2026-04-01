import Mat4 from "./math/mat4";
import Quat from "./math/quat";
import Vec3 from "./math/vec3";

export default class Transform {
  position;
  rotation;
  scale;

  #lastPosition;
  #lastRotation;
  #lastScale;

  #matrix;
  #dependencyCallbacks: (() => void)[];

  constructor() {
    this.position = Vec3.zero();
    this.rotation = Quat.identity();
    this.scale = Vec3.one();

    this.#lastPosition = Vec3.copy(this.position);
    this.#lastRotation = Quat.copy(this.rotation);
    this.#lastScale = Vec3.copy(this.scale);

    this.#matrix = Mat4.identity();
    this.#dependencyCallbacks = [];
  }

  depend<T>(callback: (parent: Transform, child: T) => void, initial: T) {
    const matrix = initial;
    let needsUpdate = false;

    this.#dependencyCallbacks.push(() => {
      needsUpdate = true;
    });

    return {
      getValue: () => {
        if (needsUpdate) {
          callback(this, matrix);
        }
        return matrix;
      }
    };
  }

  updateMatrix() {
    Mat4.identity(this.#matrix);
    Mat4.applyTranslation(this.position.x, this.position.y, this.position.z, this.#matrix);
    Mat4.multiply(this.#matrix, Mat4.fromQuaternion(this.rotation), this.#matrix);
    Mat4.applyScale(this.scale.x, this.scale.y, this.scale.z, this.#matrix);

    for (const callback of this.#dependencyCallbacks) {
      callback();
    }
  }

  setMatrix(matrix: Float32Array) {
    Mat4.copy(matrix, this.#matrix);
    
    throw new Error("Not implemented");
  }

  get matrix() {
    if (
      !Vec3.equal(this.position, this.#lastPosition) ||
      !Quat.equal(this.rotation, this.#lastRotation) ||
      !Vec3.equal(this.scale, this.#lastScale)
    ) {
      Vec3.copy(this.position, this.#lastPosition);
      Quat.copy(this.rotation, this.#lastRotation);
      Vec3.copy(this.scale, this.#lastScale);
      this.updateMatrix();
    }

    return this.#matrix;
  }
}