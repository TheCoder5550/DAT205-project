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
}