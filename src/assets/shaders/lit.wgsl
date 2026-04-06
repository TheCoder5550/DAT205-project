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
  shadowMatrix: mat4x4f,
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
  @location(3) shadowPos: vec3f,
};

@group(0) @binding(0) var<uniform> uniformsScene: UniformsScene;
@group(0) @binding(1) var shadowSampler: sampler_comparison;
@group(0) @binding(2) var shadowMap: texture_depth_2d;

@group(1) @binding(0) var<uniform> uniformsObject: UniformsObject;

@group(2) @binding(0) var<uniform> uniformsMaterial: UniformsMaterial;
@group(2) @binding(1) var albedoSampler: sampler;
@group(2) @binding(2) var albedoTexture: texture_2d<f32>;

@vertex fn vs(vertex: Vertex) -> VSOutput {
  var vsOutput: VSOutput;
  vsOutput.position = uniformsScene.projectionMatrix * uniformsScene.viewMatrix * uniformsObject.worldMatrix * vertex.position;
  vsOutput.normal = uniformsObject.normalMatrix * vertex.normal;

  let surfaceWorldPosition = (uniformsObject.worldMatrix * vertex.position).xyz;
  let viewWorldPosition = (uniformsScene.cameraMatrix * vec4f(0, 0, 0, 1)).xyz;
  vsOutput.surfaceToView = viewWorldPosition - surfaceWorldPosition;
  vsOutput.uv = vertex.uv;

  let posFromLight = uniformsScene.shadowMatrix * uniformsObject.worldMatrix * vertex.position;
  vsOutput.shadowPos = vec3(
    posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
    posFromLight.z
  );

  return vsOutput;
}

@fragment fn fs(vsOutput: VSOutput) -> @location(0) vec4f {
  let uv = vsOutput.uv;
  let normal = normalize(vsOutput.normal);
  let sun = normalize(uniformsScene.sunDirection);

  let surfaceToViewDirection = normalize(vsOutput.surfaceToView);
  let halfVector = normalize(sun + surfaceToViewDirection);

  let diffuse = saturate(dot(normal, sun));
  let specular = pow(saturate(dot(normal, halfVector)), max(1, uniformsMaterial.shininess)) * saturate(uniformsMaterial.shininess / 10);
  let albedo = textureSample(albedoTexture, albedoSampler, uv) * uniformsMaterial.albedo;
  var color = albedo.rgb * diffuse + specular * saturate(diffuse * 10);

  let visibility = textureSampleCompare(
    shadowMap, shadowSampler,
    vsOutput.shadowPos.xy, vsOutput.shadowPos.z - 0.002
  );
  color *= 0.2 + visibility * 0.8;

  return vec4f(color, albedo.a);
}