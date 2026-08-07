import { useEffect, useRef } from 'react'

/**
 * FluidBackground — a real-time WebGL fluid-simulation background.
 *
 * Adapted from the MIT-licensed WebGL Fluid Simulation by Pavel Dobryakov
 * (github.com/PavelDoGreat/WebGL-Fluid-Simulation) and the website-focused
 * fork by Thomas Kabalin (github.com/tkabalin/WebGL-Fluid-Background).
 *
 * Differences from the originals:
 *  - runs headless (injects dye/velocity automatically — no interaction needed)
 *  - per-section aqua palettes that match the portfolio's design
 *  - dye renders with alpha (glowing wisps over the section's own background)
 *  - pauses when off-screen, in a hidden tab, or for reduced-motion users
 *  - caps DPR for performance, destroys GL resources on unmount
 */

const VARIANTS = {
  hero: {
    colors: [[34, 211, 238], [103, 232, 249], [6, 182, 212]],
    splatForce: 5200,
    splatRadius: 0.28,
    density: 0.9,
    velocity: 0.55,
    curl: 28,
    interval: 380,
    opacity: 0.5,
  },
  about: {
    colors: [[34, 211, 238], [14, 116, 144]],
    splatForce: 4200,
    splatRadius: 0.32,
    density: 0.95,
    velocity: 0.45,
    curl: 20,
    interval: 480,
    opacity: 0.4,
  },
  skills: {
    colors: [[6, 182, 212], [165, 243, 252]],
    splatForce: 3600,
    splatRadius: 0.3,
    density: 0.95,
    velocity: 0.45,
    curl: 18,
    interval: 540,
    opacity: 0.35,
  },
  projects: {
    colors: [[34, 211, 238], [8, 145, 178], [103, 232, 249]],
    splatForce: 4600,
    splatRadius: 0.26,
    density: 0.9,
    velocity: 0.55,
    curl: 30,
    interval: 420,
    opacity: 0.4,
  },
  contact: {
    colors: [[103, 232, 249], [6, 182, 212]],
    splatForce: 4800,
    splatRadius: 0.3,
    density: 0.85,
    velocity: 0.55,
    curl: 24,
    interval: 440,
    opacity: 0.45,
  },
  marquee: {
    colors: [[34, 211, 238]],
    splatForce: 2800,
    splatRadius: 0.4,
    density: 0.98,
    velocity: 0.35,
    curl: 12,
    interval: 650,
    opacity: 0.4,
  },
}

const BASE_VERT = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const CLEAR_FRAG = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
uniform sampler2D uTexture;
uniform float value;
void main () {
  gl_FragColor = value * texture2D(uTexture, vUv);
}
`

const SPLAT_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point.xy;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}
`

const ADVECTION_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform vec2 dyeTexelSize;
uniform float dt;
uniform float dissipation;
vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}
void main () {
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
  float decay = 1.0 + dissipation * dt;
  gl_FragColor = result / decay;
}
`

const DIVERGENCE_FRAG = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`

const CURL_FRAG = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`

const VORTICITY_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`

const PRESSURE_FRAG = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float C = texture2D(uPressure, vUv).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`

const GRADIENT_SUBTRACT_FRAG = `
precision mediump float;
precision mediump sampler2D;
varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`

const DISPLAY_FRAG = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTexture;
void main () {
  vec3 C = texture2D(uTexture, vUv).rgb;
  float a = max(C.r, max(C.g, C.b));
  gl_FragColor = vec4(C, a);
}
`

const DYE_RES = 256
const SIM_RES = 96
const PRESSURE_ITERATIONS = 3

function compileShader(gl, type, src, label) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'unknown error'
    gl.deleteShader(shader)
    throw new Error(`${label} shader compile error: ${log}`)
  }
  return shader
}

function createProgram(gl, vertSrc, fragSrc, label) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc, label)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc, label)
  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`${label} program link error: ${gl.getProgramInfoLog(program) || ''}`)
  }
  return program
}

function getSupportedFormat(gl) {
  const hf = gl.getExtension('EXT_color_buffer_half_float')
  if (hf) {
    const tex = gl.getExtension('OES_texture_half_float')
    if (tex) return { internalFormat: gl.RGBA, format: tex.HALF_FLOAT_OES }
  }
  const f = gl.getExtension('OES_texture_float')
  const cf = gl.getExtension('EXT_color_buffer_float')
  if (f && cf) return { internalFormat: gl.RGBA, format: gl.FLOAT }
  return { internalFormat: gl.RGBA, format: gl.UNSIGNED_BYTE }
}

function FluidBackground({ variant = 'hero' }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return undefined

    let gl
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false })
    } catch {
      return undefined
    }
    if (!gl) return undefined

    const cfg = VARIANTS[variant] || VARIANTS.hero
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) return undefined

    let running = false
    let raf = 0
    let lastTime = performance.now()

    // ---- GL setup ----
    const format = getSupportedFormat(gl)
    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

    let programs
    try {
      programs = {
        clear: createProgram(gl, BASE_VERT, CLEAR_FRAG, 'clear'),
        splat: createProgram(gl, BASE_VERT, SPLAT_FRAG, 'splat'),
        advection: createProgram(gl, BASE_VERT, ADVECTION_FRAG, 'advection'),
        divergence: createProgram(gl, BASE_VERT, DIVERGENCE_FRAG, 'divergence'),
        curl: createProgram(gl, BASE_VERT, CURL_FRAG, 'curl'),
        vorticity: createProgram(gl, BASE_VERT, VORTICITY_FRAG, 'vorticity'),
        pressure: createProgram(gl, BASE_VERT, PRESSURE_FRAG, 'pressure'),
        gradientSubtract: createProgram(gl, BASE_VERT, GRADIENT_SUBTRACT_FRAG, 'gradientSubtract'),
        display: createProgram(gl, BASE_VERT, DISPLAY_FRAG, 'display'),
      }
    } catch (err) {
      // Never lose the context here — StrictMode remounts would inherit a dead
      // context and every GL call would silently no-op.
      console.error('[FluidBackground] GL init failed, disabling:', err.message)
      return undefined
    }

    const uniformsCache = new Map()
    function u(program, name) {
      if (!uniformsCache.has(program)) uniformsCache.set(program, {})
      const cache = uniformsCache.get(program)
      if (!(name in cache)) cache[name] = gl.getUniformLocation(program, name)
      return cache[name]
    }

    for (const p of Object.values(programs)) {
      gl.useProgram(p)
      const loc = gl.getAttribLocation(p, 'aPosition')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    }

    let dyeA = null
    let dyeB = null
    let velocityA = null
    let velocityB = null
    let divergence = null
    let curl = null
    let pressure = null
    let dye = null
    let velocity = null

    function createFBO(w, h) {
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        format.internalFormat,
        w,
        h,
        0,
        format.internalFormat,
        format.format,
        null,
      )
      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.viewport(0, 0, w, h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      return { texture, fbo, w, h, texelSizeX: 1 / w, texelSizeY: 1 / h }
    }

    function initFramebuffers() {
      velocityA = createFBO(SIM_RES, SIM_RES)
      velocityB = createFBO(SIM_RES, SIM_RES)
      divergence = createFBO(SIM_RES, SIM_RES)
      curl = createFBO(SIM_RES, SIM_RES)
      pressure = createFBO(SIM_RES, SIM_RES)
      dyeA = createFBO(DYE_RES, DYE_RES)
      dyeB = createFBO(DYE_RES, DYE_RES)
      dye = dyeA
      velocity = velocityA
    }
    initFramebuffers()

    function bindFBO(target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target == null ? null : target.fbo)
      gl.viewport(0, 0, target == null ? canvas.width : target.w, target == null ? canvas.height : target.h)
    }

    function blit(target) {
      bindFBO(target)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    function swapBufs(a, b) {
      return [b, a]
    }

    function correctRadius(radius) {
      const aspect = canvas.width / canvas.height
      if (aspect > 1) radius *= aspect
      return radius
    }

    function splat(x, y, dx, dy, color) {
      // inject into velocity
      gl.useProgram(programs.splat)
      gl.uniform1i(u(programs.splat, 'uTarget'), 0)
      gl.uniform1f(u(programs.splat, 'aspectRatio'), canvas.width / canvas.height)
      gl.uniform2f(u(programs.splat, 'point'), x, y)
      gl.uniform3f(u(programs.splat, 'color'), dx, dy, 0)
      gl.uniform1f(u(programs.splat, 'radius'), correctRadius(cfg.splatRadius / 100))
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.texture)
      blit(velocity)

      // inject into dye
      gl.useProgram(programs.splat)
      gl.uniform1i(u(programs.splat, 'uTarget'), 0)
      gl.uniform1f(u(programs.splat, 'aspectRatio'), canvas.width / canvas.height)
      gl.uniform2f(u(programs.splat, 'point'), x, y)
      gl.uniform3f(u(programs.splat, 'color'), color[0] / 255, color[1] / 255, color[2] / 255)
      gl.uniform1f(u(programs.splat, 'radius'), correctRadius(cfg.splatRadius / 100))
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, dye.texture)
      blit(dye)
    }

    function step(dt) {
      gl.disable(gl.BLEND)

      // curl
      gl.useProgram(programs.curl)
      gl.uniform2f(u(programs.curl, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(u(programs.curl, 'uVelocity'), 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.texture)
      blit(curl)

      // vorticity
      gl.useProgram(programs.vorticity)
      gl.uniform2f(u(programs.vorticity, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(u(programs.vorticity, 'uVelocity'), 0)
      gl.uniform1i(u(programs.vorticity, 'uCurl'), 1)
      gl.uniform1f(u(programs.vorticity, 'curl'), cfg.curl)
      gl.uniform1f(u(programs.vorticity, 'dt'), dt)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.texture)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, curl.texture)
      blit(velocityB)
      ;[velocity, velocityB] = swapBufs(velocity, velocityB)

      // divergence
      gl.useProgram(programs.divergence)
      gl.uniform2f(u(programs.divergence, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(u(programs.divergence, 'uVelocity'), 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.texture)
      blit(divergence)

      // clear pressure
      gl.useProgram(programs.clear)
      gl.uniform1i(u(programs.clear, 'uTexture'), 0)
      gl.uniform1f(u(programs.clear, 'value'), 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, pressure.texture)
      blit(pressure)

      // pressure iterations
      gl.useProgram(programs.pressure)
      gl.uniform2f(u(programs.pressure, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(u(programs.pressure, 'uPressure'), 0)
      gl.uniform1i(u(programs.pressure, 'uDivergence'), 1)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, pressure.texture)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, divergence.texture)
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) blit(pressure)

      // gradient subtract
      gl.useProgram(programs.gradientSubtract)
      gl.uniform2f(u(programs.gradientSubtract, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(u(programs.gradientSubtract, 'uPressure'), 0)
      gl.uniform1i(u(programs.gradientSubtract, 'uVelocity'), 1)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, pressure.texture)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, velocity.texture)
      blit(velocityB)
      ;[velocity, velocityB] = swapBufs(velocity, velocityB)

      // advect velocity
      gl.useProgram(programs.advection)
      gl.uniform2f(u(programs.advection, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform2f(u(programs.advection, 'dyeTexelSize'), velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform1i(u(programs.advection, 'uVelocity'), 0)
      gl.uniform1i(u(programs.advection, 'uSource'), 1)
      gl.uniform1f(u(programs.advection, 'dt'), dt)
      gl.uniform1f(u(programs.advection, 'dissipation'), cfg.velocity)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.texture)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, velocity.texture)
      blit(velocityB)
      ;[velocity, velocityB] = swapBufs(velocity, velocityB)

      // splat impulses
      // (automatic splats are injected between steps by the caller)

      // advect dye
      gl.useProgram(programs.advection)
      gl.uniform2f(u(programs.advection, 'texelSize'), velocity.texelSizeX, velocity.texelSizeY)
      gl.uniform2f(u(programs.advection, 'dyeTexelSize'), dye.texelSizeX, dye.texelSizeY)
      gl.uniform1i(u(programs.advection, 'uVelocity'), 0)
      gl.uniform1i(u(programs.advection, 'uSource'), 1)
      gl.uniform1f(u(programs.advection, 'dt'), dt)
      gl.uniform1f(u(programs.advection, 'dissipation'), cfg.density)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, velocity.texture)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, dye.texture)
      blit(dyeB)
      ;[dye, dyeB] = swapBufs(dye, dyeB)
    }

    function render() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.enable(gl.BLEND)
      gl.useProgram(programs.display)
      gl.uniform1i(u(programs.display, 'uTexture'), 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, dye.texture)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const rect = container.getBoundingClientRect()
      const w = Math.max(1, Math.round(rect.width * dpr))
      const h = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    const autoSplat = () => {
      const x = 0.15 + Math.random() * 0.7
      const y = 0.15 + Math.random() * 0.7
      const angle = Math.random() * Math.PI * 2
      const mag = cfg.splatForce * (0.35 + Math.random() * 0.65)
      const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)]
      splat(x, y, Math.cos(angle) * mag, Math.sin(angle) * mag, color)
    }

    const onPointer = (e) => {
      if (!running) return
      const rect = container.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = 1 - (e.clientY - rect.top) / rect.height
      const color = cfg.colors[Math.floor(Math.random() * cfg.colors.length)]
      splat(x, y, 0, 0, color)
    }

    const loop = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now
      step(dt)
      render()
      if (running) raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (running) return
      running = true
      resize()
      lastTime = performance.now()
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: '100px' },
    )
    io.observe(container)

    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', resize)

    autoSplat()
    autoSplat()
    const timer = setInterval(autoSplat, cfg.interval)
    if (window.matchMedia('(pointer: fine)').matches) {
      container.addEventListener('pointermove', onPointer, { passive: true })
    }
    start()

    return () => {
      clearInterval(timer)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', resize)
      container.removeEventListener('pointermove', onPointer)
      stop()
      for (const p of Object.values(programs)) gl.deleteProgram(p)
      gl.deleteBuffer(vertexBuffer)
      for (const f of [dyeA, dyeB, velocityA, velocityB, divergence, curl, pressure]) {
        if (f) {
          gl.deleteTexture(f.texture)
          gl.deleteFramebuffer(f.fbo)
        }
      }
      // NOTE: do NOT call loseContext() here — React StrictMode remounts effects,
      // and a lost context makes every subsequent GL call silently no-op, which
      // surfaces as bogus 'shader compile error' failures on the second mount.
    }
  }, [variant])

  return (
    <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ opacity: (VARIANTS[variant] || VARIANTS.hero).opacity }}
      />
    </div>
  )
}

export default FluidBackground
