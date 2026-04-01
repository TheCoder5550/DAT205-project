import Geometry, { type Attribute, type Attributes } from "./geometry";
import Material from "./material";
import Quat from "./math/quat";
import Vec3 from "./math/vec3";
import MeshRenderer from "./mesh-renderer";
import ObjectNode from "./object-node";
import Sampler from "./sampler";
import Texture from "./texture";
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

const MIN_FILTER: Record<number, GPUFilterMode> = {
  9728: "nearest",
  9729: "linear",
  9984: "nearest",//"NEAREST_MIPMAP_NEAREST",
  9985: "linear",//"LINEAR_MIPMAP_NEAREST",
  9986: "nearest",//"NEAREST_MIPMAP_LINEAR",
  9987: "linear",//"LINEAR_MIPMAP_LINEAR",
}

const MAG_FILTER: Record<number, GPUFilterMode> = {
  9728: "nearest",
  9729: "linear",
}

const WRAP: Record<number, GPUAddressMode> = {
  33071: "clamp-to-edge",
  33648: "mirror-repeat",
  10497: "repeat",
}

export async function loadGLB(path: string): Promise<ObjectNode> {
  const data = await fetchGLB(path);
  const { json, buffer: bufferChunk } = decodeGLB(data);

  const bufferViews = json.bufferViews ?? [];
  const accessors = json.accessors ?? [];
  const images = json.images ?? [];
  const samplers = json.samplers ?? [];
  const textures = json.textures ?? [];
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

  const processedImageURLs = images.map(image => {
    if (typeof image.bufferView !== "undefined") {
      const view = processedBufferViews[image.bufferView];
      const mimeType = image.mimeType;
      if (typeof mimeType === "undefined") {
        throw new Error("Mime type must be set");
      }
  
      const blob = new Blob([ view ], { type: mimeType });
      const sourceURI = URL.createObjectURL(blob);
  
      return sourceURI;
    }
    else if (typeof image.uri !== "undefined") {
      return image.uri;
    }

    throw new Error("One of uri and bufferView must be set");
  });

  const processedImages = await Promise.all(processedImageURLs.map(async url => {
    const image = await loadImageBitmap(url);
    return new Texture(url, image);
  }));

  const processedTextures = textures.map(texture => {
    if (typeof texture.source === "undefined") {
      throw new Error("Empty texture source not implemented");
    }
    
    return processedImages[texture.source];
  });

  const processedSamplers = samplers.map(sampler => {
    return new Sampler({
      minFilter: sampler.minFilter ? MIN_FILTER[sampler.minFilter] : undefined,
      magFilter: sampler.magFilter ? MAG_FILTER[sampler.magFilter] : undefined,
      addressModeU: sampler.wrapS ? WRAP[sampler.wrapS] : undefined,
      addressModeV: sampler.wrapT ? WRAP[sampler.wrapT] : undefined,
    });
  });

  const processedMaterials = materials.map(material => {
    const processed = new Material(material.name);
    processed.setProperty("albedo", material.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1]);
    processed.setProperty("roughness", material.pbrMetallicRoughness?.roughnessFactor ?? 0.5);
    processed.setProperty("shininess", 2 / ((material.pbrMetallicRoughness?.roughnessFactor ?? 0.5) ** 4) - 2);
    processed.setProperty("metallic", material.pbrMetallicRoughness?.metallicFactor ?? 0);
    processed.setProperty("emissive", material.emissiveFactor ?? [0, 0, 0]);

    const albedoTextureIndex = material.pbrMetallicRoughness?.baseColorTexture?.index;
    if (typeof albedoTextureIndex !== "undefined") {
      processed.setProperty("albedoTexture", processedTextures[albedoTextureIndex]);
      processed.setProperty("albedoSampler", processedSamplers[albedoTextureIndex]);
    }

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

  const decoder = new TextDecoder();

  const magic = decoder.decode(byteData.slice(0, 4));
  if (magic !== "glTF") {
    throw new Error("Invalid file: No magic")
  }

  const uint32 = new Uint32Array(data);

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

async function loadImageBitmap(url: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
}