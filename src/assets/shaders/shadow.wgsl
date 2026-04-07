struct Vertex {
  @location(0) position: vec4f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
};

struct UniformsScene {
  projectionMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  cameraMatrix: mat4x4f,
  sunDirection: vec3f,
};

struct UniformsObject {
  worldMatrix: mat4x4f,
  normalMatrix: mat3x3f,
}

// struct UniformsMaterial {
//   albedo: vec4f,
//   shininess: f32,
// }

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@group(0) @binding(0) var<uniform> uniformsScene: UniformsScene;
@group(1) @binding(0) var<uniform> uniformsObject: UniformsObject;
// @group(2) @binding(0) var<uniform> uniformsMaterial: UniformsMaterial;
// @group(2) @binding(1) var albedoSampler: sampler;
// @group(2) @binding(2) var albedoTexture: texture_2d<f32>;

@vertex fn vs(vertex: Vertex) -> VSOutput {
  var vsOutput: VSOutput;
  vsOutput.position = uniformsScene.projectionMatrix * uniformsScene.viewMatrix * uniformsObject.worldMatrix * vertex.position;
  vsOutput.uv = vertex.uv;
  return vsOutput;
}

// @fragment fn fs(vsOutput: VSOutput) -> @location(0) vec4f {
//   return vec4f(1, 0, 1, 1);
// }