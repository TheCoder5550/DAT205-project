import type Geometry from "./geometry";
import type Material from "./material";
import type ObjectNode from "./object-node";

export default class MeshRenderer {
  node: ObjectNode | null;
  readonly geometries;
  readonly materials;
  nrPrimitives;

  constructor(geometry: Geometry | Geometry[], material: Material | Material[]) {
    this.node = null;
    this.geometries = Array.isArray(geometry) ? geometry : [ geometry ];
    this.materials = Array.isArray(material) ? material : [ material ];

    if (this.geometries.length !== this.materials.length) {
      throw new Error("Geometries and materials must have same length");
    }

    this.nrPrimitives = this.geometries.length;
  }
}