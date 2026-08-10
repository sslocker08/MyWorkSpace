import * as THREE from 'three'

export class PageTop {
  constructor() {
    this._particles = null
    this._icosa     = null
    this._clock     = new THREE.Clock()
  }

  async init(ctx) {
    const { scene } = ctx
    const count = ctx.isMobile ? 2000 : 8000

    // ── Particle cloud ──────────────────────────────
    const positions = new Float32Array(count * 3)
    const colors    = new Float32Array(count * 3)
    const phi   = Math.PI * (3 - Math.sqrt(5)) // golden angle

    for (let i = 0; i < count; i++) {
      const y   = 1 - (i / (count - 1)) * 2
      const r   = Math.sqrt(1 - y * y)
      const th  = phi * i
      const rad = 2.2 + Math.random() * 0.8
      positions[i * 3]     = Math.cos(th) * r * rad
      positions[i * 3 + 1] = y * rad
      positions[i * 3 + 2] = Math.sin(th) * r * rad

      // Iridescent hue from y-position
      const hue = (y * 0.5 + 0.5) * 0.72 + 0.2
      const c = new THREE.Color().setHSL(hue, 0.7, 0.75)
      colors[i * 3]     = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size:         ctx.isMobile ? 0.028 : 0.018,
      vertexColors: true,
      transparent:  true,
      opacity:      0.82,
      sizeAttenuation: true,
      depthWrite:   false,
    })

    this._particles = new THREE.Points(geo, mat)
    scene.add(this._particles)

    // ── Iridescent icosahedron ──────────────────────
    const icosaGeo = new THREE.IcosahedronGeometry(0.9, 4)
    const icosaMat = new THREE.MeshPhysicalMaterial({
      color:        0xffffff,
      metalness:    1.0,
      roughness:    0.08,
      iridescence:  1.0,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [100, 700],
      envMapIntensity: 1.5,
      side: THREE.FrontSide,
    })

    this._icosa = new THREE.Mesh(icosaGeo, icosaMat)
    scene.add(this._icosa)

    // ── Ambient environment ─────────────────────────
    scene.add(new THREE.AmbientLight(0x222244, 2))
    const pt = new THREE.PointLight(0x88aaff, 6, 12)
    pt.position.set(3, 3, 3)
    scene.add(pt)
    const pt2 = new THREE.PointLight(0xffaa44, 4, 10)
    pt2.position.set(-2, -2, 2)
    scene.add(pt2)

    this._pt  = pt
    this._pt2 = pt2

    // Reset clock so t=0 at page init
    this._clock.start()
  }

  update(t, dt, ctx) {
    const { camera } = ctx
    const elapsed = this._clock.getElapsedTime()

    if (this._particles) {
      this._particles.rotation.y = elapsed * 0.035
      this._particles.rotation.x = Math.sin(elapsed * 0.07) * 0.06
    }

    if (this._icosa) {
      this._icosa.rotation.x = elapsed * 0.17
      this._icosa.rotation.y = elapsed * 0.23
    }

    // Scroll: camera zooms in/out on Z
    const targetZ = 5 - ctx.scrollY * 0.003
    camera.position.z += (targetZ - camera.position.z) * 0.06

    // Subtle light pulse
    if (this._pt) {
      this._pt.intensity  = 6  + Math.sin(elapsed * 1.2) * 1.5
      this._pt2.intensity = 4  + Math.cos(elapsed * 0.9) * 1.2
    }

    // Feed scroll velocity to afterimage
    if (ctx.afterimagePass) {
      ctx.afterimagePass.uniforms.uScrollVelocity.value = ctx.scrollVelocity
    }
    if (ctx.domainWarpPass) {
      ctx.domainWarpPass.uniforms.uTime.value = elapsed
      ctx.domainWarpPass.uniforms.uScrollVelocity.value = ctx.scrollVelocity
    }
  }

  dispose(ctx) {
    const { scene } = ctx
    if (this._particles) {
      this._particles.geometry.dispose()
      this._particles.material.dispose()
      scene.remove(this._particles)
    }
    if (this._icosa) {
      this._icosa.geometry.dispose()
      this._icosa.material.dispose()
      scene.remove(this._icosa)
    }
    if (this._pt)  scene.remove(this._pt)
    if (this._pt2) scene.remove(this._pt2)
  }
}
