const VERT = `
attribute vec2 aPosition;
attribute float aActivity;
attribute float aRegion;
uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;
uniform float uPointScale;
varying float vActivity;
varying float vRegion;

void main() {
  vActivity = aActivity;
  vRegion = aRegion;
  vec3 clip = projectionMatrix * translationMatrix * vec3(aPosition, 1.0);
  gl_Position = vec4(clip.xy, 0.0, 1.0);
  float size = mix(1.4, 6.5, clamp(aActivity, 0.0, 1.0));
  gl_PointSize = max(1.0, size * uPointScale);
}
`;

const FRAG = `
#ifdef GL_ES
precision mediump float;
#endif
varying float vActivity;
varying float vRegion;
uniform vec3 uTint;

vec3 regionColor(float r) {
  float t = clamp(r / 11.0, 0.0, 1.0);
  vec3 a = vec3(0.35, 0.75, 0.95);
  vec3 b = vec3(0.95, 0.45, 0.55);
  vec3 c = vec3(0.55, 0.95, 0.55);
  vec3 ab = mix(a, b, smoothstep(0.0, 0.55, t));
  return mix(ab, c, smoothstep(0.45, 1.0, t));
}

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float a = clamp(vActivity, 0.06, 1.0) * (1.0 - d * 0.35);
  vec3 col = regionColor(vRegion) * uTint * (0.35 + 0.65 * vActivity);
  gl_FragColor = vec4(col, a);
}
`;

function makeState(PIXI) {
  const state = PIXI.State?.for2d?.() ?? new PIXI.State();
  const ADD = PIXI.BLEND_MODES?.ADD ?? PIXI.BLEND_MODES?.add ?? 1;
  if ("blendMode" in state) state.blendMode = ADD;
  return state;
}

function createPixi8(PIXI, positions, activity, region) {
  const geometry = new PIXI.MeshGeometry({
    aPosition: { buffer: positions, size: 2 },
    aActivity: { buffer: activity, size: 1 },
    aRegion: { buffer: region, size: 1 }
  });
  const shader = PIXI.Shader.from({
    gl: { vertex: VERT, fragment: FRAG },
    resources: {
      flyUniforms: {
        uPointScale: { value: 1, type: "f32" },
        uTint: { value: [1, 1, 1], type: "vec3<f32>" }
      }
    }
  });
  const topology = PIXI.Topology?.POINT_LIST ?? "point-list";
  return new PIXI.Mesh({
    geometry,
    shader,
    state: makeState(PIXI),
    topology
  });
}

export function createPointMesh(positions, activity, region) {
  const PIXI = globalThis.PIXI;
  if (!PIXI?.MeshGeometry) return null;
  try {
    return createPixi8(PIXI, positions, activity, region);
  } catch (err) {
    console.warn("flybrain-vtt: PIXI point mesh failed", err);
    return null;
  }
}

export function uploadActivity(mesh, activity) {
  if (!mesh?.geometry) return;
  const geo = mesh.geometry;
  const attr = geo.getAttribute?.("aActivity") ?? geo.attributes?.aActivity ?? geo.attributes?.activity;
  const buffer = attr?.buffer ?? attr;
  if (buffer?.update) buffer.update(activity);
  else if (typeof geo.updateBuffers === "function") geo.updateBuffers();
  mesh.shader.uniforms && (mesh.shader.uniforms.uPointScale = mesh.shader.uniforms.uPointScale);
}

export function setPointScale(mesh, scale) {
  const uniforms = mesh?.shader?.uniforms;
  if (uniforms && "uPointScale" in uniforms) uniforms.uPointScale = scale;
  const res = mesh?.shader?.resources?.flyUniforms?.uniforms;
  if (res && "uPointScale" in res) res.uPointScale = scale;
}
