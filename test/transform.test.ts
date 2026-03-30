import { describe, expect, test } from 'vitest'
import Transform from '../src/transform';
import Vec3 from '../src/math/vec3';
import Mat4 from '../src/math/mat4';
import Quat from '../src/math/quat';

describe("Transform", () => {
  test("Update position", () => {
    const t = new Transform();
    t.position.x = 100;
    expect(t.position).toStrictEqual(new Vec3(100, 0, 0));
  });
  
  test("Sync matrix (manually)", () => {
    const t = new Transform();
    t.position.x = 200;
    t.position.y = 100;
    t.updateMatrix();
    expect(t.matrix).toStrictEqual(Mat4.applyTranslation(200, 100, 0, Mat4.identity()));
  });

  test("Sync matrix 1", () => {
    const t = new Transform();
    t.position.x = 300;
    t.position.y = 200;
    expect(t.matrix).toStrictEqual(Mat4.applyTranslation(300, 200, 0, Mat4.identity()));
  });

  test("Sync matrix 2", () => {
    const t = new Transform();
    t.rotation = Quat.euler(Math.PI * 0.25, Math.PI * 0.125, 0);
    expect(t.matrix).toStrictEqual(Mat4.fromQuaternion(Quat.euler(Math.PI * 0.25, Math.PI * 0.125, 0)));
  });

  test("Sync matrix 3", () => {
    const t = new Transform();
    Quat.euler(Math.PI * 0.25, Math.PI * 0.125, 0, t.rotation);
    expect(t.matrix).toStrictEqual(Mat4.fromQuaternion(Quat.euler(Math.PI * 0.25, Math.PI * 0.125, 0)));
  });
})