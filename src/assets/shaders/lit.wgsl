struct Vertex {
  @location(0) position: vec4f,
  @location(1) normal: vec3f,
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
};

@group(0) @binding(0) var<uniform> uniformsScene: UniformsScene;
@group(0) @binding(1) var<uniform> uniformsObject: UniformsObject;
@group(0) @binding(2) var<uniform> uniformsMaterial: UniformsMaterial;

@vertex fn vs(vertex: Vertex) -> VSOutput {
  var vsOut: VSOutput;
  vsOut.position = uniformsScene.projectionMatrix * uniformsScene.viewMatrix * uniformsObject.worldMatrix * vertex.position;
  vsOut.normal = uniformsObject.normalMatrix * vertex.normal;

  let surfaceWorldPosition = (uniformsObject.worldMatrix * vertex.position).xyz;
  let viewWorldPosition = (uniformsScene.cameraMatrix * vec4f(0, 0, 0, 1)).xyz;
  vsOut.surfaceToView = viewWorldPosition - surfaceWorldPosition;
  return vsOut;
}

@fragment fn fs(vsOutput: VSOutput) -> @location(0) vec4f {
  let normal = normalize(vsOutput.normal);
  let sun = normalize(vec3f(0.1, 0, 1));

  let surfaceToViewDirection = normalize(vsOutput.surfaceToView);
  let halfVector = normalize(sun + surfaceToViewDirection);

  let diffuse = dot(normal, sun);
  let specular = pow(saturate(dot(normal, halfVector)), uniformsMaterial.shininess) * saturate(uniformsMaterial.shininess);
  let color = uniformsMaterial.albedo.rgb * diffuse + specular;

  return vec4f(color, uniformsMaterial.albedo.a);
}