import { getDummySomata } from "./somata.js";

const VERT = `
attribute vec3 aPosition;
attribute float aActivity;
attribute float aRegion;
uniform mat4 uMVP;
uniform float uDead;
uniform float uPain;
varying vec3 vColor;
varying float vA;

vec3 regionColor(float r) {
  float t = clamp(r / 11.0, 0.0, 1.0);
  vec3 a = vec3(0.25, 0.7, 0.95);
  vec3 b = vec3(0.95, 0.45, 0.55);
  vec3 c = vec3(0.45, 0.95, 0.55);
  return mix(mix(a, b, smoothstep(0.0, 0.55, t)), c, smoothstep(0.45, 1.0, t));
}

void main() {
  vA = aActivity;
  vec3 base = regionColor(aRegion);
  vec3 live = mix(base * 0.35, base, clamp(aActivity, 0.0, 1.0));
  live = mix(live, vec3(1.0, 0.25, 0.2), clamp(uPain, 0.0, 1.0) * 0.55);
  vColor = mix(live, vec3(0.1, 0.1, 0.12), uDead);
  gl_Position = uMVP * vec4(aPosition, 1.0);
  float size = mix(1.4, 4.8, clamp(aActivity, 0.0, 1.0));
  gl_PointSize = mix(1.2, size, 1.0 - uDead * 0.7);
}
`;

const FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vA;
uniform float uDead;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  if (dot(p, p) > 1.0) discard;
  float a = mix(0.22, 0.95, clamp(vA, 0.0, 1.0));
  if (uDead > 0.5) a *= 0.35;
  gl_FragColor = vec4(vColor, a);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}

function mul(a, b) {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      o[j * 4 + i] =
        a[i] * b[j * 4] + a[i + 4] * b[j * 4 + 1] + a[i + 8] * b[j * 4 + 2] + a[i + 12] * b[j * 4 + 3];
    }
  }
  return o;
}

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}

function lookAt(ex, ey, ez) {
  let zx = ex;
  let zy = ey;
  let zz = ez;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl;
  zy /= zl;
  zz /= zl;
  let xx = -zz;
  let xy = 0;
  let xz = zx;
  const xl = Math.hypot(xx, xy, xz) || 1;
  xx /= xl;
  xy /= xl;
  xz /= xl;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  const m = new Float32Array(16);
  m[0] = xx;
  m[1] = yx;
  m[2] = zx;
  m[4] = xy;
  m[5] = yy;
  m[6] = zy;
  m[8] = xz;
  m[9] = yz;
  m[10] = zz;
  m[12] = -(xx * ex + xy * ey + xz * ez);
  m[13] = -(yx * ex + yy * ey + yz * ez);
  m[14] = -(zx * ex + zy * ey + zz * ez);
  m[15] = 1;
  return m;
}

const STRIDE = 4;

export class Brain3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false });
    this.yaw = 0.55;
    this.pitch = 0.35;
    this.radius = 3.2;
    this.dead = 0;
    this.pain = 0;
    this._dragging = false;
    this._last = [0, 0];
    this._raf = 0;
    this._onMove = (e) => this._pointer(e);
    this._onUp = () => {
      this._dragging = false;
    };
    if (!this.gl) return;
    this._initGl();
    this._bind();
    this._loop = () => {
      this._raf = requestAnimationFrame(this._loop);
      this.draw();
    };
    this._raf = requestAnimationFrame(this._loop);
  }

  _initGl() {
    const gl = this.gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    this.prog = gl.createProgram();
    gl.attachShader(this.prog, vs);
    gl.attachShader(this.prog, fs);
    gl.linkProgram(this.prog);
    gl.useProgram(this.prog);
    this.loc = {
      pos: gl.getAttribLocation(this.prog, "aPosition"),
      act: gl.getAttribLocation(this.prog, "aActivity"),
      reg: gl.getAttribLocation(this.prog, "aRegion"),
      mvp: gl.getUniformLocation(this.prog, "uMVP"),
      dead: gl.getUniformLocation(this.prog, "uDead"),
      pain: gl.getUniformLocation(this.prog, "uPain")
    };
    const dummy = getDummySomata();
    const nFull = dummy.xyz.length / 3;
    this.count = Math.floor(nFull / STRIDE);
    const pos = new Float32Array(this.count * 3);
    const region = new Float32Array(this.count);
    this.index = new Uint32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const src = i * STRIDE;
      pos[i * 3] = dummy.xyz[src * 3];
      pos[i * 3 + 1] = dummy.xyz[src * 3 + 1];
      pos[i * 3 + 2] = dummy.xyz[src * 3 + 2];
      region[i] = dummy.region[src];
      this.index[i] = src;
    }
    this.activity = new Float32Array(this.count);
    this.posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    this.regBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.regBuf);
    gl.bufferData(gl.ARRAY_BUFFER, region, gl.STATIC_DRAW);
    this.actBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.actBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.activity, gl.DYNAMIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0.04, 0.05, 0.07, 1);
  }

  _bind() {
    const el = this.canvas;
    el.addEventListener("pointerdown", (e) => {
      this._dragging = true;
      this._last = [e.clientX, e.clientY];
      el.setPointerCapture?.(e.pointerId);
    });
    el.addEventListener("pointermove", this._onMove);
    el.addEventListener("pointerup", this._onUp);
    el.addEventListener("pointerleave", this._onUp);
    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.radius = Math.min(8, Math.max(1.6, this.radius + e.deltaY * 0.004));
      },
      { passive: false }
    );
  }

  _pointer(e) {
    if (!this._dragging) return;
    const dx = e.clientX - this._last[0];
    const dy = e.clientY - this._last[1];
    this._last = [e.clientX, e.clientY];
    this.yaw += dx * 0.01;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + dy * 0.01));
  }

  setActivity(full) {
    if (!full || !this.activity) return;
    for (let i = 0; i < this.count; i++) this.activity[i] = full[this.index[i]] || 0;
    const gl = this.gl;
    if (!gl) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.actBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.activity);
  }

  setDead(dead) {
    this.dead = dead ? 1 : 0;
  }

  setPain(pain) {
    this.pain = Math.max(0, Math.min(1, pain || 0));
  }

  resize() {
    const el = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(64, el.clientWidth);
    const h = Math.max(64, el.clientHeight);
    el.width = Math.floor(w * dpr);
    el.height = Math.floor(h * dpr);
    this.gl?.viewport(0, 0, el.width, el.height);
  }

  draw() {
    const gl = this.gl;
    if (!gl || !this.prog) return;
    if (this.canvas.width === 0) this.resize();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    const cp = Math.cos(this.pitch);
    const ey = this.radius * Math.sin(this.pitch);
    const ex = this.radius * cp * Math.sin(this.yaw);
    const ez = this.radius * cp * Math.cos(this.yaw);
    const mvp = mul(perspective(0.7, aspect, 0.2, 20), lookAt(ex, ey, ez));
    gl.uniformMatrix4fv(this.loc.mvp, false, mvp);
    gl.uniform1f(this.loc.dead, this.dead);
    gl.uniform1f(this.loc.pain, this.pain);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.enableVertexAttribArray(this.loc.pos);
    gl.vertexAttribPointer(this.loc.pos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.actBuf);
    gl.enableVertexAttribArray(this.loc.act);
    gl.vertexAttribPointer(this.loc.act, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.regBuf);
    gl.enableVertexAttribArray(this.loc.reg);
    gl.vertexAttribPointer(this.loc.reg, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, this.count);
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    const gl = this.gl;
    if (gl && this.prog) gl.deleteProgram(this.prog);
    this.gl = null;
  }
}
