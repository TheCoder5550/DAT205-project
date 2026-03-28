struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

struct Vertex {
  @location(0) position: vec2f,
  @location(1) color: vec4f,
  @location(2) offset: vec2f,
  @location(3) scale: vec2f,
  @location(4) perVertexColor: vec3f,
};

@vertex fn vs(vertex: Vertex) -> VSOutput {
  var vsOutput: VSOutput;
  vsOutput.position = vec4f(
    vertex.position * vertex.scale + vertex.offset,
    0.0, 1.0,
  );
  vsOutput.color = vertex.color * vec4f(vertex.perVertexColor, 1);
  return vsOutput;
}

@fragment fn fs(vsOutput: VSOutput) -> @location(0) vec4f {
  return vsOutput.color;
}