import { useEffect, useRef } from 'react'

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_a;
uniform vec3 u_b;
uniform vec3 u_c;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec2(11.7, 3.1);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv * 1.7;
  float t = u_time * 0.05;

  float q = fbm(p + t);
  float r = fbm(p + q * 1.6 + vec2(1.7, 9.2) + t * 0.4);
  float s = fbm(p + r * 1.5 + vec2(8.3, 2.8));

  vec3 col = mix(u_a, u_b, clamp(q, 0.0, 1.0));
  col = mix(col, u_c, clamp(r * s * 1.4, 0.0, 1.0));

  float vig = smoothstep(0.0, 0.6, 1.0 - length(uv - 0.5));
  float alpha = vig * 0.85;
  gl_FragColor = vec4(col * alpha, alpha);
}
`

const PALETTES = {
  light: {
    a: [0.957, 0.753, 0.682],
    b: [0.655, 0.545, 0.98],
    c: [0.541, 0.706, 0.769],
  },
  dark: {
    a: [0.906, 0.435, 0.318],
    b: [0.486, 0.227, 0.929],
    c: [0.184, 0.416, 0.604],
  },
}

function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

function compile(gl, type, src) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'shader compile error'
    gl.deleteShader(shader)
    throw new Error(log)
  }
  return shader
}

function AuroraBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    })
    if (!gl) return undefined

    let program
    try {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT)
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
      program = gl.createProgram()
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link error')
    } catch {
      return undefined
    }

    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

    const loc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const resLoc = gl.getUniformLocation(program, 'u_resolution')
    const timeLoc = gl.getUniformLocation(program, 'u_time')
    const aLoc = gl.getUniformLocation(program, 'u_a')
    const bLoc = gl.getUniformLocation(program, 'u_b')
    const cLoc = gl.getUniformLocation(program, 'u_c')

    const lowPower = (navigator.hardwareConcurrency || 8) <= 4
    const scale = Math.min(window.devicePixelRatio || 1, 2) * (lowPower ? 0.4 : 0.6)

    let width = 0
    let height = 0
    const resize = () => {
      width = Math.max(1, Math.floor(window.innerWidth * scale))
      height = Math.max(1, Math.floor(window.innerHeight * scale))
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
    }
    resize()
    window.addEventListener('resize', resize)

    const setPalette = () => {
      const p = isDark() ? PALETTES.dark : PALETTES.light
      gl.uniform3f(aLoc, ...p.a)
      gl.uniform3f(bLoc, ...p.b)
      gl.uniform3f(cLoc, ...p.c)
    }
    setPalette()

    const observer = new MutationObserver(setPalette)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let running = false

    const render = () => {
      gl.uniform2f(resLoc, width, height)
      gl.uniform1f(timeLoc, performance.now() / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const loop = () => {
      render()
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (!running && !reduced) {
        running = true
        raf = requestAnimationFrame(loop)
      }
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    if (document.hidden) render()
    else start()

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', resize)
      observer.disconnect()
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-60 dark:opacity-50"
    />
  )
}

export default AuroraBackground
