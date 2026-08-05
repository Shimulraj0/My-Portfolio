import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const LIGHT_PALETTE = [
  0xe76f51, 0xee9b82, 0x264653, 0x1d3557, 0xe98065,
]
const DARK_PALETTE = [
  0xee9b82, 0xe76f51, 0x8ab4c4, 0xfdf6ec, 0xf4c0ae,
]

function isDark() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

function buildScene() {
  const count = 900
  const radius = 8
  const colors = []
  const positions = new Float32Array(count * 3)
  const palette = isDark() ? DARK_PALETTE : LIGHT_PALETTE

  for (let i = 0; i < count; i += 1) {
    const r = radius * Math.sqrt(Math.random())
    const theta = Math.random() * Math.PI * 2
    const x = r * Math.cos(theta)
    const z = r * Math.sin(theta)
    const y = (Math.random() - 0.5) * 0.35
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)])
    colors.push(c.r, c.g, c.b)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.055,
    vertexColors: true,
    transparent: true,
    opacity: isDark() ? 0.5 : 0.45,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  })

  return { geometry, material }
}

function ParticleField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
    camera.position.set(0, 2.2, 11)
    camera.lookAt(0, 0, 0)

    const group = new THREE.Group()
    const { geometry, material } = buildScene()
    const points = new THREE.Points(geometry, material)
    group.add(points)
    scene.add(group)

    const mouse = { x: 0, y: 0 }
    const onMouse = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMouse)

    const observer = new MutationObserver(() => {
      const palette = isDark() ? DARK_PALETTE : LIGHT_PALETTE
      const attr = points.geometry.attributes.color
      for (let i = 0; i < attr.count; i += 1) {
        const c = new THREE.Color(palette[i % palette.length])
        attr.setXYZ(i, c.r, c.g, c.b)
      }
      attr.needsUpdate = true
      material.opacity = isDark() ? 0.5 : 0.45
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    const timer = new THREE.Timer()

    const render = () => {
      timer.update()
      const t = timer.getElapsed()
      group.rotation.y = t * 0.06 + mouse.x * 0.28
      group.rotation.x = -0.12 + mouse.y * 0.16
      points.rotation.z = t * 0.012
      renderer.render(scene, camera)
    }

    const loop = () => {
      render()
      raf = requestAnimationFrame(loop)
    }

    if (reduced) {
      render()
    } else {
      loop()
    }

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('pointermove', onMouse)
      window.removeEventListener('resize', resize)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  )
}

export default ParticleField
