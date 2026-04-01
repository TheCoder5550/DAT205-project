import Geometry, { type Attribute, type Attributes } from "./geometry";
import Material from "./material";
import Quat from "./math/quat";
import Vec3 from "./math/vec3";
import MeshRenderer from "./mesh-renderer";
import ObjectNode from "./object-node";
import type { GlTF } from "./types/gltf";

const COMPONENT_TYPE = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
};

const TYPE = {
  "SCALAR": 1,
  "VEC2": 2,
  "VEC3": 3,
  "VEC4": 4,
  "MAT2": 4,
  "MAT3": 9,
  "MAT4": 16,
};

export async function loadGLB(path: string): Promise<ObjectNode> {
  const data = await fetchGLB(path);
  const { json, buffer: bufferChunk } = decodeGLB(data);

  const bufferViews = json.bufferViews ?? [];
  const accessors = json.accessors ?? [];
  const materials = json.materials ?? [];
  const meshes = json.meshes ?? [];
  const nodes = json.nodes ?? [];
  const scenes = json.scenes ?? [];

  const processedBufferViews = bufferViews.map(view => {
    // FIXME: Use correct buffer
    const buffer = bufferChunk;
    const byteOffset = view.byteOffset ?? 0;
    const byteLength = view.byteLength;
    const data = buffer.slice(byteOffset, byteOffset + byteLength);
    return data;
  });

  const processedAccessors = accessors.map(accessor => {
    const viewIndex = accessor.bufferView;
    if (typeof viewIndex === "undefined") {
      throw new Error("Not implemented");
    }
    const view = processedBufferViews[viewIndex];

    if (!(accessor.componentType in COMPONENT_TYPE)) {
      throw new Error("Invalid component type");
    }
    const TypedConstructor = COMPONENT_TYPE[accessor.componentType as keyof typeof COMPONENT_TYPE];
    const typedData = new TypedConstructor(view);

    if (!(accessor.type in TYPE)) {
      throw new Error("Invalid type");
    }
    const size = TYPE[accessor.type as keyof typeof TYPE];
    const format = accessor.componentType === 5123 ? "uint16" : accessor.componentType === 5125 ? "uint32" : undefined;

    const attr: Attribute & { type: string } = {
      bufferData: typedData,
      type: accessor.type,
      size: size,
      format: format
    };

    return attr;
  });

  const processedMaterials = materials.map(material => {
    const processed = new Material(material.name);
    processed.setProperty("albedo", material.pbrMetallicRoughness?.baseColorFactor);
    processed.setProperty("roughness", material.pbrMetallicRoughness?.roughnessFactor);
    processed.setProperty("shininess", 2 / ((material.pbrMetallicRoughness?.roughnessFactor ?? 0) ** 4) - 2);
    processed.setProperty("metallic", material.pbrMetallicRoughness?.metallicFactor);
    processed.setProperty("emissive", material.emissiveFactor);
    return processed;
  });

  const processedNodes = nodes.map(node => {
    const obj = new ObjectNode(node.name);

    if (node.matrix) {
      obj.transform.setMatrix(new Float32Array(node.matrix));
    }
    else {
      if (node.translation) {
        Vec3.fromArray(node.translation, obj.transform.position);
      }
      if (node.rotation) {
        Quat.fromArray(node.rotation, obj.transform.rotation);
      }
      if (node.scale) {
        Vec3.fromArray(node.scale, obj.transform.scale);
      }
    }

    if (typeof node.mesh !== "undefined") {
      const mesh = meshes[node.mesh];

      const geometry = mesh.primitives.map((primitive, primitiveIndex) => {
        const processedAttributes: Attributes = {};

        for (const [key, accIndex] of Object.entries(primitive.attributes)) {
          const accessor = processedAccessors[accIndex];
          processedAttributes[key] = {
            bufferData: accessor.bufferData,
            size: accessor.size,
          };
        }
        if (typeof primitive.indices !== "undefined") {
          const accessor = processedAccessors[primitive.indices];
          processedAttributes["indices"] = {
            bufferData: accessor.bufferData,
            size: accessor.size,
            format: accessor.format,
          }
        }
        const geometry = new Geometry(`${mesh.name} - Primitive ${primitiveIndex}`);
        geometry.attributes = processedAttributes;
        return geometry;
      });
      const materials = mesh.primitives.map(primitive => {
        if (typeof primitive.material === "undefined") {
          return new Material();
        }
        return processedMaterials[primitive.material];
      });
      const meshRenderer = new MeshRenderer(geometry, materials);
      meshRenderer.node = obj;
      obj.meshRenderer = meshRenderer;
    }

    return obj;
  });

  for (let i = 0; i < nodes.length; i++) {
    const processedParent = processedNodes[i];
    const node = nodes[i];

    const children = node.children ?? [];
    for (const childIndex of children) {
      const processedChild = processedNodes[childIndex];
      processedChild.setParent(processedParent);
    }
  }

  const rootChildren = typeof json.scene !== "undefined" ?
    scenes[json.scene].nodes ?? [] :
    new Array(nodes.length).fill(0).map((_, idx) => idx);

  const root = new ObjectNode(path);
  for (const index of rootChildren) {
    const node = processedNodes[index];
    node.setParent(root);
  }

  console.log(root);

  return root;
}

function decodeGLB(data: ArrayBuffer) {
  const byteData = new Int8Array(data);
  const uint32 = new Uint32Array(data);

  const decoder = new TextDecoder();

  const magic = decoder.decode(byteData.slice(0, 4));
  if (magic !== "glTF") {
    throw new Error("Invalid file: No magic")
  }

  const version = uint32[1];
  if (version !== 2) {
    console.warn("Version 1 not supported");
  }

  const jsonLength = uint32[3];
  const jsonType = uint32[4];
  if (jsonType !== 0x4E4F534A) {
    throw new Error("First chunk must be a JSON chunk");
  }
  const jsonData = byteData.slice(20, 20 + jsonLength);
  const jsonString = decoder.decode(jsonData);
  const json = JSON.parse(jsonString) as GlTF;

  const buffer = data.slice(28 + jsonLength, 28 + jsonLength + uint32[5 + jsonLength / 4]);

  console.log(json);

  return {
    json,
    buffer,
  }
}

async function fetchGLB(path: string): Promise<ArrayBuffer> {
  const res = await fetch(path);
  const data = await res.arrayBuffer();
  return data;
}