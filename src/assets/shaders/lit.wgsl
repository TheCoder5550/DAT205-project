struct Vertex {
  @location(0) position: vec4f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
};

struct DirectionalLight {
  intensity: vec3f,
  direction: vec3f,
}

const MAX_LIGHTS = 4;

struct UniformsScene {
  projectionMatrix: mat4x4f,
  viewMatrix: mat4x4f,
  cameraMatrix: mat4x4f,
  numLights: u32,
  lights: array<DirectionalLight, MAX_LIGHTS>,
  shadowMatrices: array<mat4x4f, MAX_LIGHTS>,
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
  @location(3) shadowPos_0: vec3f,
  @location(4) shadowPos_1: vec3f,
  @location(5) shadowPos_2: vec3f,
  @location(6) shadowPos_3: vec3f,
};

@group(0) @binding(0) var<uniform> uniformsScene: UniformsScene;
@group(0) @binding(1) var shadowSampler: sampler_comparison;
@group(0) @binding(2) var shadowMap: texture_depth_2d_array;

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

  var posFromLight = uniformsScene.shadowMatrices[0] * uniformsObject.worldMatrix * vertex.position;
  vsOutput.shadowPos_0 = vec3(
    posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
    posFromLight.z
  );

  posFromLight = uniformsScene.shadowMatrices[1] * uniformsObject.worldMatrix * vertex.position;
  vsOutput.shadowPos_1 = vec3(
    posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
    posFromLight.z
  );

  posFromLight = uniformsScene.shadowMatrices[2] * uniformsObject.worldMatrix * vertex.position;
  vsOutput.shadowPos_2 = vec3(
    posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
    posFromLight.z
  );

  posFromLight = uniformsScene.shadowMatrices[3] * uniformsObject.worldMatrix * vertex.position;
  vsOutput.shadowPos_3 = vec3(
    posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
    posFromLight.z
  );

  return vsOutput;
}

fn InterleavedGradientNoise(position_screen: vec2f) -> f32 {
  let magic = vec3f(0.06711056f, 0.00583715f, 52.9829189f);
  return fract(magic.z * fract(dot(position_screen, magic.xy)));
}

fn VogelDiskSample(sampleIndex: i32, samplesCount: i32, phi: f32) -> vec2f {
  const GoldenAngle = 2.4;

  let fSampleIndex = f32(sampleIndex);
  let fSamplesCount = f32(samplesCount);

  let r = sqrt(fSampleIndex + 0.5) / sqrt(fSamplesCount);
  let theta = fSampleIndex * GoldenAngle + phi;

  let sine = sin(theta);
  let cosine = cos(theta);
  
  return vec2f(r * cosine, r * sine);
}

@fragment fn fs(vsOutput: VSOutput) -> @location(0) vec4f {
  let uv = vsOutput.uv;
  let normal = normalize(vsOutput.normal);
  let surfaceToViewDirection = normalize(vsOutput.surfaceToView);
  let albedo = textureSample(albedoTexture, albedoSampler, uv) * uniformsMaterial.albedo;

  var color = vec3f(0);

  for (var i: u32 = 0; i < uniformsScene.numLights; i += 1) {
    let light = uniformsScene.lights[i];
    let sun = normalize(light.direction);
    let halfVector = normalize(sun + surfaceToViewDirection);

    let diffuse = saturate(dot(normal, sun));
    let specular = pow(saturate(dot(normal, halfVector)), max(1, uniformsMaterial.shininess)) * saturate(uniformsMaterial.shininess / 10);

    var shadowPos = vec3f(0);
    switch i {
      case 0: {
        shadowPos = vsOutput.shadowPos_0;
        break;
      }
      case 1: {
        shadowPos = vsOutput.shadowPos_1;
        break;
      }
      case 2: {
        shadowPos = vsOutput.shadowPos_2;
        break;
      }
      case 3: {
        shadowPos = vsOutput.shadowPos_3;
        break;
      }
      default {}
    }

    var visibility = 1.0;
    const shadowSamples = 8;
    for (var j = 0; j < shadowSamples; j += 1) {
      const PI = 3.141592;
      let phi = InterleavedGradientNoise(vsOutput.position.xy) * 2 * PI;
      let offset = VogelDiskSample(j, shadowSamples, phi);
      var currentVis = textureSampleCompare(
        shadowMap, shadowSampler,
        shadowPos.xy + offset * 0.004, i, shadowPos.z - 0.002 * 3
      );
      visibility -= (1 - currentVis) / shadowSamples;
    }

    var currentColor = light.intensity * (albedo.rgb * diffuse + specular * saturate(diffuse * 10));
    currentColor *= 0.1 + visibility * 0.9;
    color += currentColor;
  }

  return vec4f(color, albedo.a);
}