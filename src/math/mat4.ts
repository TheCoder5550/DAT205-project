import Quat from "./quat";

const TEMP_MATRIX = new Float32Array(16);
const TEMP_QUAT = new Quat();

export default class Mat4 {
  static identity(dst?: Float32Array) {
    dst = dst || new Float32Array(16);
    _fillFloat32Array(dst,
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
    return dst;
  }

  static copy(m: Float32Array, dst?: Float32Array) {
    dst = dst || new Float32Array(16);
    dst.set(m);
    return dst;
  }

  static equal(a: Float32Array, b: Float32Array, epsilon = 1e-6) {
    return (
      Math.abs(a[0] - b[0]) < epsilon &&
      Math.abs(a[1] - b[1]) < epsilon &&
      Math.abs(a[2] - b[2]) < epsilon &&
      Math.abs(a[3] - b[3]) < epsilon &&
      Math.abs(a[4] - b[4]) < epsilon &&
      Math.abs(a[5] - b[5]) < epsilon &&
      Math.abs(a[6] - b[6]) < epsilon &&
      Math.abs(a[7] - b[7]) < epsilon &&
      Math.abs(a[8] - b[8]) < epsilon &&
      Math.abs(a[9] - b[9]) < epsilon &&
      Math.abs(a[10] - b[10]) < epsilon &&
      Math.abs(a[11] - b[11]) < epsilon &&
      Math.abs(a[12] - b[12]) < epsilon &&
      Math.abs(a[13] - b[13]) < epsilon &&
      Math.abs(a[14] - b[14]) < epsilon &&
      Math.abs(a[15] - b[15]) < epsilon
    );
  }

  static multiply(a: Float32Array, b: Float32Array, dst?: Float32Array) {
    dst = dst || new Float32Array(16);

    const a11 = a[ 0 ], a12 = a[ 4 ], a13 = a[ 8 ], a14 = a[ 12 ];
    const a21 = a[ 1 ], a22 = a[ 5 ], a23 = a[ 9 ], a24 = a[ 13 ];
    const a31 = a[ 2 ], a32 = a[ 6 ], a33 = a[ 10 ], a34 = a[ 14 ];
    const a41 = a[ 3 ], a42 = a[ 7 ], a43 = a[ 11 ], a44 = a[ 15 ];

    const b11 = b[ 0 ], b12 = b[ 4 ], b13 = b[ 8 ], b14 = b[ 12 ];
    const b21 = b[ 1 ], b22 = b[ 5 ], b23 = b[ 9 ], b24 = b[ 13 ];
    const b31 = b[ 2 ], b32 = b[ 6 ], b33 = b[ 10 ], b34 = b[ 14 ];
    const b41 = b[ 3 ], b42 = b[ 7 ], b43 = b[ 11 ], b44 = b[ 15 ];

    dst[ 0 ] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    dst[ 4 ] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    dst[ 8 ] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    dst[ 12 ] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

    dst[ 1 ] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    dst[ 5 ] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    dst[ 9 ] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    dst[ 13 ] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

    dst[ 2 ] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    dst[ 6 ] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    dst[ 10 ] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    dst[ 14 ] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

    dst[ 3 ] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    dst[ 7 ] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    dst[ 11 ] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    dst[ 15 ] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

    return dst;
  }

  static inverse(m: Float32Array, dst?: Float32Array) {
    dst = dst || new Float32Array(16);
 
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m03 = m[0 * 4 + 3];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m13 = m[1 * 4 + 3];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const m23 = m[2 * 4 + 3];
    const m30 = m[3 * 4 + 0];
    const m31 = m[3 * 4 + 1];
    const m32 = m[3 * 4 + 2];
    const m33 = m[3 * 4 + 3];
 
    const tmp0 = m22 * m33;
    const tmp1 = m32 * m23;
    const tmp2 = m12 * m33;
    const tmp3 = m32 * m13;
    const tmp4 = m12 * m23;
    const tmp5 = m22 * m13;
    const tmp6 = m02 * m33;
    const tmp7 = m32 * m03;
    const tmp8 = m02 * m23;
    const tmp9 = m22 * m03;
    const tmp10 = m02 * m13;
    const tmp11 = m12 * m03;
    const tmp12 = m20 * m31;
    const tmp13 = m30 * m21;
    const tmp14 = m10 * m31;
    const tmp15 = m30 * m11;
    const tmp16 = m10 * m21;
    const tmp17 = m20 * m11;
    const tmp18 = m00 * m31;
    const tmp19 = m30 * m01;
    const tmp20 = m00 * m21;
    const tmp21 = m20 * m01;
    const tmp22 = m00 * m11;
    const tmp23 = m10 * m01;
 
    const t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
               (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
    const t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
               (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
    const t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
               (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
    const t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
               (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);
 
    const d = 1 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);
 
    dst[0] = d * t0;
    dst[1] = d * t1;
    dst[2] = d * t2;
    dst[3] = d * t3;
 
    dst[4] = d * ((tmp1 * m10 + tmp2 * m20 + tmp5 * m30) -
                  (tmp0 * m10 + tmp3 * m20 + tmp4 * m30));
    dst[5] = d * ((tmp0 * m00 + tmp7 * m20 + tmp8 * m30) -
                  (tmp1 * m00 + tmp6 * m20 + tmp9 * m30));
    dst[6] = d * ((tmp3 * m00 + tmp6 * m10 + tmp11 * m30) -
                  (tmp2 * m00 + tmp7 * m10 + tmp10 * m30));
    dst[7] = d * ((tmp4 * m00 + tmp9 * m10 + tmp10 * m20) -
                  (tmp5 * m00 + tmp8 * m10 + tmp11 * m20));
 
    dst[8] = d * ((tmp12 * m13 + tmp15 * m23 + tmp16 * m33) -
                  (tmp13 * m13 + tmp14 * m23 + tmp17 * m33));
    dst[9] = d * ((tmp13 * m03 + tmp18 * m23 + tmp21 * m33) -
                  (tmp12 * m03 + tmp19 * m23 + tmp20 * m33));
    dst[10] = d * ((tmp14 * m03 + tmp19 * m13 + tmp22 * m33) -
                   (tmp15 * m03 + tmp18 * m13 + tmp23 * m33));
    dst[11] = d * ((tmp17 * m03 + tmp20 * m13 + tmp23 * m23) -
                   (tmp16 * m03 + tmp21 * m13 + tmp22 * m23));
 
    dst[12] = d * ((tmp14 * m22 + tmp17 * m32 + tmp13 * m12) -
                   (tmp16 * m32 + tmp12 * m12 + tmp15 * m22));
    dst[13] = d * ((tmp20 * m32 + tmp12 * m02 + tmp19 * m22) -
                   (tmp18 * m22 + tmp21 * m32 + tmp13 * m02));
    dst[14] = d * ((tmp18 * m12 + tmp23 * m32 + tmp15 * m02) -
                   (tmp22 * m32 + tmp14 * m02 + tmp19 * m12));
    dst[15] = d * ((tmp22 * m22 + tmp16 * m02 + tmp21 * m12) -
                   (tmp20 * m12 + tmp23 * m22 + tmp17 * m02));
    return dst;
  }

  static transpose(m: Float32Array, dst?: Float32Array) {
    dst = dst || new Float32Array(16);

    _fillFloat32Array(dst,
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15]
    );

    return dst;
  }

  static applyTranslation(x: number, y: number, z: number, dst: Float32Array) {
    dst[12] += dst[0] * x + dst[4] * y + dst[8]  * z;
    dst[13] += dst[1] * x + dst[5] * y + dst[9]  * z;
    dst[14] += dst[2] * x + dst[6] * y + dst[10] * z;
    dst[15] += dst[3] * x + dst[7] * y + dst[11] * z;
    return dst;
  }

  static applyRotationX(rx = 0, dst: Float32Array) {
    _fillFloat32Array(
      TEMP_MATRIX,
      1, 0, 0, 0,
      0, Math.cos(rx), Math.sin(rx), 0,
      0, -Math.sin(rx), Math.cos(rx), 0,
      0, 0, 0, 1
    );
    Mat4.multiply(dst, TEMP_MATRIX, dst);

    return dst;
  }

  static applyRotationY(ry = 0, dst: Float32Array) {
    _fillFloat32Array(
      TEMP_MATRIX,
      Math.cos(ry), 0, -Math.sin(ry), 0,
      0, 1, 0, 0,
      Math.sin(ry), 0, Math.cos(ry), 0,
      0, 0, 0, 1
    );
    Mat4.multiply(dst, TEMP_MATRIX, dst);

    return dst;
  }

  static applyRotationZ(rz = 0, dst: Float32Array) {
    _fillFloat32Array(
      TEMP_MATRIX,
      Math.cos(rz), Math.sin(rz), 0, 0,
      -Math.sin(rz), Math.cos(rz), 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    );
    Mat4.multiply(dst, TEMP_MATRIX, dst);

    return dst;
  }

  static applyScale(x: number, y: number, z: number, dst: Float32Array) {
    dst[0] *= x;  
    dst[1] *= x;
    dst[2] *= x;
    dst[3] *= x;

    dst[4] *= y;
    dst[5] *= y;
    dst[6] *= y;
    dst[7] *= y;
    
    dst[8] *= z;
    dst[9] *= z;
    dst[10] *= z;
    dst[11] *= z;

    return dst;
  }

  static orthographic(options: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    size?: number;
    near?: number;
    far?: number;
  }, dst?: Float32Array) {
    dst = dst || new Float32Array(16);

    const top = options.top || options.size || 5;
    const bottom = options.bottom || -(options.size || 5);
    const left = options.left || options.size || 5;
    const right = options.right || -(options.size || 5);
    const far = options.far || 100;
    const near = options.near || 1;

    _fillFloat32Array(dst,
      2 / (right - left), 0, 0, 0,
      0, 2 / (top - bottom), 0, 0,
      0, 0, -2 / (far - near), 0,
      -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1
    );

    return dst;
  }

  static perspective(options?: {
    fov?: number;
    aspect?: number;
    near?: number;
    far?: number;
  }, dst?: Float32Array) {
    dst = dst || new Float32Array(16);

    const fovy = options?.fov ?? 1.5;
    const aspect = options?.aspect ?? 1;
    const near = options?.near ?? 0.1;
    const far = options?.far ?? 100;

    const s = Math.sin(fovy);
    const rd = 1 / (far - near);
    const ct = Math.cos(fovy) / s;

    _fillFloat32Array(dst,
      ct / aspect, 0,  0,                    0, 
      0,           ct, 0,                    0, 
      0,           0,  -(far + near) * rd,   -1,
      0,           0,  -2 * near * far * rd, 0
    );
    
    return dst;
  }

  static fromQuaternion(quaternion: Quat, dst?: Float32Array) {
    dst = dst || new Float32Array(16);

    Quat.normalize(quaternion, TEMP_QUAT);
    const q = TEMP_QUAT;

    _fillFloat32Array(dst,
      1 - 2*q.y*q.y - 2*q.z*q.z, 2*q.x*q.y + 2*q.z*q.w,     2*q.x*q.z - 2*q.y*q.w,     0,
      2*q.x*q.y - 2*q.z*q.w,     1 - 2*q.x*q.x - 2*q.z*q.z, 2*q.y*q.z + 2*q.x*q.w,     0,
      2*q.x*q.z + 2*q.y*q.w,     2*q.y*q.z - 2*q.x*q.w,     1 - 2*q.x*q.x - 2*q.y*q.y, 0,
      0,                         0,                         0,                         1
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
  j: number,
  k: number,
  l: number,
  m: number,
  n: number,
  o: number,
  p: number
) {
  array[0] = a;
  array[1] = b;
  array[2] = c;
  array[3] = d;
  array[4] = e;
  array[5] = f;
  array[6] = g;
  array[7] = h;
  array[8] = i;
  array[9] = j;
  array[10] = k;
  array[11] = l;
  array[12] = m;
  array[13] = n;
  array[14] = o;
  array[15] = p;

  return array;
}