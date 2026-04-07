struct Vertex {
  @location(0) position: vec4f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) joints: vec4u,
  @location(4) weights: vec4f,
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

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@group(0) @binding(0) var<uniform> uniformsScene: UniformsScene;
@group(1) @binding(0) var<uniform> uniformsObject: UniformsObject;

@group(3) @binding(0) var<storage, read> joint_matrices: array<mat4x4f>;
@group(3) @binding(1) var<storage, read> inverse_bind_matrices: array<mat4x4f>;

@vertex fn vs(vertex: Vertex) -> VSOutput {
  let joint0 = joint_matrices[u32(vertex.joints[0])] * inverse_bind_matrices[u32(vertex.joints[0])];
  let joint1 = joint_matrices[u32(vertex.joints[1])] * inverse_bind_matrices[u32(vertex.joints[1])];
  let joint2 = joint_matrices[u32(vertex.joints[2])] * inverse_bind_matrices[u32(vertex.joints[2])];
  let joint3 = joint_matrices[u32(vertex.joints[3])] * inverse_bind_matrices[u32(vertex.joints[3])];
  
  let skin_matrix = (
    joint0 * vertex.weights[0] +
    joint1 * vertex.weights[1] +
    joint2 * vertex.weights[2] +
    joint3 * vertex.weights[3]
  );

  var vsOutput: VSOutput;
  vsOutput.position = uniformsScene.projectionMatrix * uniformsScene.viewMatrix * uniformsObject.worldMatrix * skin_matrix * vertex.position;
  return vsOutput;
}