import { describe, expect, test } from 'vitest'
import Scene from '../src/scene';
import ObjectNode from '../src/object-node';

describe("ObjectNode", () => {
  test("Self parent", () => {
    const a = new ObjectNode("A");
    expect(() => a.setParent(a)).toThrow("Cannot be own parent");
  })

  test("Circular nodes", () => {
    const a = new ObjectNode("A");
    const b = new ObjectNode("B");
    const c = new ObjectNode("C");

    b.setParent(a);
    c.setParent(b);

    expect(() => a.setParent(c)).not.toThrow("Maximum call stack size exceeded");
    expect(() => a.setParent(c)).toThrow("Circular scene graph detected");
  })

  test("Scene propagation", () => {
    const scene = new Scene();
    const a = new ObjectNode("A");
    const b = new ObjectNode("B");
    const c = new ObjectNode("C");
    const d = new ObjectNode("D");

    b.setParent(a);
    d.setParent(c);
    scene.addNode(a);

    expect(b.scene).toBe(scene);

    c.setParent(b);

    expect(d.scene).toBe(scene);
  });

  test("Clear parent scene", () => {
    const scene = new Scene();
    const a = new ObjectNode("A");
    const b = new ObjectNode("B");

    a.setParent(scene);
    b.setParent(a);
    a.setParent(null);

    expect(a.scene).toBe(null);
    expect(b.scene).toBe(null);
  })
})