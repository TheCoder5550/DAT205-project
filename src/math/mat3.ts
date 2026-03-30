export default class Mat3 {
  static identity(dst?: Float32Array) {
    dst = dst || new Float32Array(12);
    _fillFloat32Array(dst,
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    );
    return dst;
  }

  static copy(m: Float32Array, dst?: Float32Array) {
    dst = dst || new Float32Array(12);
    dst.set(m);
    return dst;
  }

  static fromMat4(m: Float32Array, dst?: Float32Array) {
    dst = dst || new Float32Array(12);
    _fillFloat32Array(dst,
      m[0], m[1], m[2],
      m[4], m[5], m[6],
      m[8], m[9], m[10],
    );
    return dst;
  }
}

function _fillFloat32Array(
  array: Float32Array,
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
) {
  array[0] = a;
  array[1] = b;
  array[2] = c;
  array[3] = 0;
  array[4] = d;
  array[5] = e;
  array[6] = f;
  array[7] = 0;
  array[8] = g;
  array[9] = h;
  array[10] = i;
  array[11] = 0;

  return array;
}