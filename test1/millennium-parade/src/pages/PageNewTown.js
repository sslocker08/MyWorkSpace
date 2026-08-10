import * as THREE from 'three'

// Hash for per-building randomness (no texture)
function hash(n) {
  return Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1
}

export class PageNewTown {
  constructor() {
    this._group   = null
    this._ground  = null
    this._spline  = null
    this._clock   = new THREE.Clock()
    this._objects = []
  }

  async init(ctx) {
    const { scene } = ctx
    const isMobile = ctx.isMobile

    this._group = new THREE.Group()
    scene.add(this._group)

    // ── Reflective ground ────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(60, 60)
    const groundMat = new THREE.MeshStandardMaterial({
      color:     0x050508,
      metalness: 0.85,
      roughness: 0.35,
    })
    this._ground = new THREE.Mesh(groundGeo, groundMat)
    this._ground.rotation.x = -Math.PI / 2
    this._ground.position.y = 0
    this._group.add(this._ground)

    // ── City grid ────────────────────────────────────
    const gridN = isMobile ? 10 : 20
    const spacing = 2.4

    for (let ix = 0; ix < gridN; ix++) {
      for (let iz = 0; iz < gridN; iz++) {
        const i  = ix * gridN + iz
        const h  = 0.4 + hash(i * 7.3)  * 4.2 + hash(i * 13.7) * 2.1
        const w  = 0.4 + hash(i * 3.1)  * 0.7
        const d  = 0.4 + hash(i * 17.9) * 0.7

        const geo = new THREE.BoxGeometry(w, h, d)

        // Varying building darkness with slight warm tint
        const grey   = 0.04 + hash(i * 2.3) * 0.1
        const warmth = hash(i * 5.7) * 0.02
        const col    = new THREE.Color(grey + warmth, grey, grey)

        const mat = new THREE.MeshStandardMaterial({
          color:     col,
          metalness: 0.4,
          roughness: 0.7,
        })

        const mesh = new THREE.Mesh(geo, mat)

        const ox = (ix - gridN / 2) * spacing + (hash(i * 11.1) - 0.5) * 0.6
        const oz = (iz - gridN / 2) * spacing + (hash(i * 19.3) - 0.5) * 0.6
        mesh.position.set(ox, h / 2, oz)
        this._group.add(mesh)
        this._objects.push(mesh)

        // Amber window glow on some buildings
        if (hash(i * 29.1) > 0.55) {
          const winLight = new THREE.PointLight(0xffaa44, 0.6 + hash(i * 37.3) * 0.8, 3)
          winLight.position.set(ox, h * 0.6 + (hash(i * 41.7) - 0.5) * h * 0.5, oz)
          this._group.add(winLight)
          this._objects.push(winLight)
        }
      }
    }

    // ── Lighting ─────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x111122, 1.2)
    scene.add(ambient)
    this._ambient = ambient

    const spot = new THREE.SpotLight(0x9999ff, 8, 40, Math.PI * 0.15, 0.4, 1.5)
    spot.position.set(0, 18, 5)
    spot.target.position.set(0, 0, 0)
    scene.add(spot)
    scene.add(spot.target)
    this._spot = spot

    // ── Fog ──────────────────────────────────────────
    scene.fog = new THREE.FogExp2(0x000005, 0.038)

    // ── Spline camera path (6 control points) ────────
    const pts = [
      new THREE.Vector3( 0,  6,  22),
      new THREE.Vector3( 5,  4,  14),
      new THREE.Vector3(-4,  3,   6),
      new THREE.Vector3( 3,  2,  -2),
      new THREE.Vector3(-2,  3, -10),
      new THREE.Vector3( 0,  5, -18),
    ]
    this._spline = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5)

    this._clock.start()
  }

  update(t, dt, ctx) {
    const { camera, afterimagePass, domainWarpPass } = ctx
    const elapsed = this._clock.getElapsedTime()

    // scrollY [0..1] along spline (clamp)
    const rawT  = ctx.scrollY * 0.00028
    const splineT = Math.max(0, Math.min(0.98, rawT))

    const pos = this._spline.getPoint(splineT)
    const lookAt = this._spline.getPoint(Math.min(0.98, splineT + 0.04))

    // Smooth camera tracking
    camera.position.lerp(pos, 0.055)
    const target = new THREE.Vector3().lerpVectors(camera.position, lookAt, 1)
    camera.lookAt(target)

    // Slight camera sway
    camera.position.x += Math.sin(elapsed * 0.4) * 0.04
    camera.position.y += Math.cos(elapsed * 0.31) * 0.02

    // Building flicker (window lights)
    this._group.children.forEach((child, idx) => {
      if (child.isPointLight) {
        child.intensity = (0.6 + hash(idx * 3.7) * 0.8)
          * (0.9 + Math.sin(elapsed * (2 + hash(idx * 7.1) * 4) + idx) * 0.1)
      }
    })

    if (afterimagePass) {
      afterimagePass.uniforms.uScrollVelocity.value = ctx.scrollVelocity
    }
    if (domainWarpPass) {
      domainWarpPass.uniforms.uTime.value = elapsed
      domainWarpPass.uniforms.uScrollVelocity.value = ctx.scrollVelocity
    }
  }

  dispose(ctx) {
    const { scene } = ctx
    if (this._group) {
      this._group.traverse(child => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
      scene.remove(this._group)
    }
    if (this._ambient) scene.remove(this._ambient)
    if (this._spot) { scene.remove(this._spot); scene.remove(this._spot.target) }
    scene.fog = null
    this._objects = []
  }
}
