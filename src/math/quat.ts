import Mat4 from "./mat4";

const TEMP_MATRIX = new Float32Array(16);

export default class Quat {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x = 0, y = 0, z = 0, w = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  static equal(a: Quat, b: Quat, epsilon = 1e-6) {
    return Math.abs(a.x - b.x) < epsilon &&
           Math.abs(a.y - b.y) < epsilon &&
           Math.abs(a.z - b.z) < epsilon &&
           Math.abs(a.w - b.w) < epsilon;
  }

  static fromArray(array: [number, number, number, number], dst?: Quat) {
    dst = dst || new Quat();
    dst.x = array[0];
    dst.y = array[1];
    dst.z = array[2];
    dst.w = array[3];
    return dst;
  }

  static copy(q: Quat, dst?: Quat) {
    dst = dst || new Quat();
    dst.x = q.x;
    dst.y = q.y;
    dst.z = q.z;
    dst.w = q.w;
    return dst;
  }

  static identity(dst?: Quat) {
    dst = dst || new Quat();
    dst.x = 0;
    dst.y = 0;
    dst.z = 0;
    dst.w = 1;
    return dst;
  }

  static normalize(q: Quat, dst?: Quat) {
    dst = dst || new Quat();

    const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    if (len < 1e-6) {
      dst.x = q.x;
      dst.y = q.y;
      dst.z = q.z;
      dst.w = q.w;
      return dst;
    }
    
    dst.x = q.x / len;
    dst.y = q.y / len;
    dst.z = q.z / len;
    dst.w = q.w / len;
    return dst;
  }

  static euler(x: number, y: number, z: number, dst?: Quat) {
    dst = dst || new Quat();

    const roll = x;
    const pitch = y;
    const yaw = z;

    const qx = Math.sin(roll/2) * Math.cos(pitch/2) * Math.cos(yaw/2) - Math.cos(roll/2) * Math.sin(pitch/2) * Math.sin(yaw/2);
    const qy = Math.cos(roll/2) * Math.sin(pitch/2) * Math.cos(yaw/2) + Math.sin(roll/2) * Math.cos(pitch/2) * Math.sin(yaw/2);
    const qz = Math.cos(roll/2) * Math.cos(pitch/2) * Math.sin(yaw/2) - Math.sin(roll/2) * Math.sin(pitch/2) * Math.cos(yaw/2);
    const qw = Math.cos(roll/2) * Math.cos(pitch/2) * Math.cos(yaw/2) + Math.sin(roll/2) * Math.sin(pitch/2) * Math.sin(yaw/2);
    
    dst.x = qx;
    dst.y = qy;
    dst.z = qz;
    dst.w = qw;
    
    return dst;
  }

  static fromMatrix(m: Float32Array, dst?: Quat) {
    dst = dst || new Quat();

    m = Mat4.extractRotationMatrix(m, TEMP_MATRIX);

    const trace = Mat4.get(m, 0, 0) + Mat4.get(m, 1, 1) + Mat4.get(m, 2, 2);
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);

      dst.x = (Mat4.get(m, 2, 1) - Mat4.get(m, 1, 2)) * s;
      dst.y = (Mat4.get(m, 0, 2) - Mat4.get(m, 2, 0)) * s;
      dst.z = (Mat4.get(m, 1, 0) - Mat4.get(m, 0, 1)) * s;
      dst.w = 0.25 / s;
    }
    else {
      if (Mat4.get(m, 0, 0) > Mat4.get(m, 1, 1) && Mat4.get(m, 0, 0) > Mat4.get(m, 2, 2)) {
        const s = 2 * Math.sqrt(1 + Mat4.get(m, 0, 0) - Mat4.get(m, 1, 1) - Mat4.get(m, 2, 2));

        dst.x = 0.25 * s;
        dst.y = (Mat4.get(m, 0, 1) + Mat4.get(m, 1, 0)) / s;
        dst.z = (Mat4.get(m, 0, 2) + Mat4.get(m, 2, 0)) / s;
        dst.w = (Mat4.get(m, 2, 1) - Mat4.get(m, 1, 2)) / s;
      }
      else if (Mat4.get(m, 1, 1) > Mat4.get(m, 2, 2)) {
        const s = 2 * Math.sqrt(1 + Mat4.get(m, 1, 1) - Mat4.get(m, 0, 0) - Mat4.get(m, 2, 2));

        dst.x = (Mat4.get(m, 0, 1) + Mat4.get(m, 1, 0)) / s;
        dst.y = 0.25 * s;
        dst.z = (Mat4.get(m, 1, 2) + Mat4.get(m, 2, 1)) / s;
        dst.w = (Mat4.get(m, 0, 2) - Mat4.get(m, 2, 0)) / s;
      }
      else {
        const s = 2 * Math.sqrt(1 + Mat4.get(m, 2, 2) - Mat4.get(m, 0, 0) - Mat4.get(m, 1, 1));

        dst.x = (Mat4.get(m, 0, 2) + Mat4.get(m, 2, 0)) / s;
        dst.y = (Mat4.get(m, 1, 2) + Mat4.get(m, 2, 1)) / s;
        dst.z = 0.25 * s;
        dst.w = (Mat4.get(m, 1, 0) - Mat4.get(m, 0, 1)) / s;
      }
    }

    return dst;
  }
}