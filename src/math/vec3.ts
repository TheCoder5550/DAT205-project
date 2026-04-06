export default class Vec3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static equal(a: Vec3, b: Vec3, epsilon = 1e-6) {
    return Math.abs(a.x - b.x) < epsilon &&
           Math.abs(a.y - b.y) < epsilon &&
           Math.abs(a.z - b.z) < epsilon;
  }

  static fromArray(array: [number, number, number], dst?: Vec3) {
    dst = dst || new Vec3();
    dst.x = array[0];
    dst.y = array[1];
    dst.z = array[2];
    return;
  }

  static copy(v: Vec3, dst?: Vec3) {
    dst = dst || new Vec3();
    dst.x = v.x;
    dst.y = v.y;
    dst.z = v.z;
    return dst;
  }

  static zero(dst?: Vec3) {
    dst = dst || new Vec3();
    dst.x = 0;
    dst.y = 0;
    dst.z = 0;
    return dst;
  }

  static one(dst?: Vec3) {
    dst = dst || new Vec3();
    dst.x = 1;
    dst.y = 1;
    dst.z = 1;
    return dst;
  }

  static add(a: Vec3, b: Vec3, dst: Vec3) {
    dst = dst || new Vec3();
    dst.x = a.x + b.x;
    dst.y = a.y + b.y;
    dst.z = a.z + b.z;
    return dst;
  }

  static subtract(a: Vec3, b: Vec3, dst?: Vec3) {
    dst = dst || new Vec3();
    dst.x = a.x - b.x;
    dst.y = a.y - b.y;
    dst.z = a.z - b.z;
    return dst;
  }

  static multiply(v: Vec3, scalar: number, dst?: Vec3) {
    dst = dst || new Vec3();
    dst.x = v.x * scalar;
    dst.y = v.y * scalar;
    dst.z = v.z * scalar;
    return dst;
  }

  static negate(v: Vec3, dst?: Vec3) {
    dst = dst || new Vec3();
    dst.x = -v.x;
    dst.y = -v.y;
    dst.z = -v.z;
    return dst;
  }

  static normalize(v: Vec3, dst?: Vec3) {
    dst = dst || new Vec3();

    const len = Vec3.lengthSqr(v);
    if (len < 1e-12) {
      Vec3.copy(v, dst);
    }
    else {
      Vec3.multiply(v, 1 / Math.sqrt(len), dst);
    }

    return dst;
  }

  static length(v: Vec3) {
    const sum = v.x * v.x + v.y * v.y + v.z * v.z;
    return Math.sqrt(sum);
  }

  static lengthAlt(x: number, y: number, z: number) {
    const sum = x * x + y * y + z * z;
    return Math.sqrt(sum);
  }

  static lengthSqr(v: Vec3) {
    return v.x * v.x + v.y * v.y + v.z * v.z;
  }

  static cross(a: Vec3, b: Vec3, dst?: Vec3) {
    dst = dst || new Vec3();

    const ax = a.x;
    const ay = a.y;
    const az = a.z;
    const bx = b.x;
    const by = b.y;
    const bz = b.z;

    dst.x = ay * bz - az * by;
    dst.y = az * bx - ax * bz;
    dst.z = ax * by - ay * bx;

    return dst;
  }
}