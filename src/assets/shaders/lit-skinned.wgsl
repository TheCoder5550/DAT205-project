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
};

struct UniformsObject {
  worldMatrix: mat4x4f,
  normalMatrix: mat3x3f,
}

struct UniformsMaterial {
  albedo: vec4f,
  shininess: f32,
}

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) surfaceToView: vec3f,
  @location(2) uv: vec2f,
};

@group(0) @binding(0) var<uniform> uniformsScene: UniformsScene;
@group(1) @binding(0) var<uniform> uniformsObject: UniformsObject;
@group(2) @binding(0) var<uniform> uniformsMaterial: UniformsMaterial;

@group(2) @binding(1) var albedoSampler: sampler;
@group(2) @binding(2) var albedoTexture: texture_2d<f32>;

@group(3) @binding(0) var<storage, read> joint_matrices: array<mat4x4f>;
@group(3) @binding(1) var<storage, read> inverse_bind_matrices: array<mat4x4f>;

@vertex fn vs(vertex: Vertex) -> VSOutput {
  var vsOutput: VSOutput;

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

  // let normalMatrix4 = uniformsObject.worldMatrix * skin_matrix;
  // let normalMatrix = mat3x3(normalMatrix4[0].xyz, normalMatrix4[1].xyz, normalMatrix4[2].xyz);
  let normalMatrix = uniformsObject.normalMatrix;

  vsOutput.position = uniformsScene.projectionMatrix * uniformsScene.viewMatrix * uniformsObject.worldMatrix * skin_matrix * vertex.position;
  vsOutput.normal = normalMatrix * vertex.normal;

  let surfaceWorldPosition = (uniformsObject.worldMatrix * vertex.position).xyz;
  let viewWorldPosition = (uniformsScene.cameraMatrix * vec4f(0, 0, 0, 1)).xyz;
  vsOutput.surfaceToView = viewWorldPosition - surfaceWorldPosition;
  vsOutput.uv = vertex.uv;
  return vsOutput;
}

@fragment fn fs(vsOutput: VSOutput) -> @location(0) vec4f {
  let uv = vsOutput.uv;
  let normal = normalize(vsOutput.normal);
  let sun = normalize(vec3f(-1, 2, 2));

  let surfaceToViewDirection = normalize(vsOutput.surfaceToView);
  let halfVector = normalize(sun + surfaceToViewDirection);

  let diffuse = saturate(dot(normal, sun));
  let specular = pow(saturate(dot(normal, halfVector)), max(1, uniformsMaterial.shininess)) * saturate(uniformsMaterial.shininess / 10);
  let albedo = textureSample(albedoTexture, albedoSampler, uv) * uniformsMaterial.albedo;
  let color = albedo.rgb * diffuse + specular * saturate(diffuse * 10);

  return vec4f(color, albedo.a);
}