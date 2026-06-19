import * as THREE from 'three'

const ALBUMS = [
  { title: 'MILLENNIUM PARADE',  year: '2021', color: 0x1a1a2e },
  { title: 'Soranji',            year: '2022', color: 0x0d1b2a },
  { title: 'downer',             year: '2019', color: 0x1c0a00 },
  { title: 'fly with me',        year: '2020', color: 0x0a1628 },
  { title: 'Familiar Stranger',  year: '2023', color: 0x0e1a0e },
  { title: 'Plankton',           year: '2024', color: 0x1a0a1a },
]

export class PageWorks {
  constructor() {
    this._group      = null
    this._planes     = []
    this._raycaster  = new THREE.Raycaster()
    this._mouse      = new THREE.Vector2(-999, -999)
    this._hovered    = null
    this._snapTarget = 0
    this._snapCurrent = 0
    this._clock      = new THREE.Clock()
    this._onMove     = null
    this._metaEl     = null
  }

  async init(ctx) {
    const { scene, camera } = ctx

    this._group = new THREE.Group()
    scene.add(this._group)

    const arcRadius = 4.5
    const arcSpread = Math.PI * 0.28

    ALBUMS.forEach((album, i) => {
      const angle = (i / (ALBUMS.length - 1) - 0.5) * arcSpread * 2

      const geo = new THREE.PlaneGeometry(1.6, 1.6)

      // Solid colour + subtle metallic sheen (no texture needed)
      const mat = new THREE.MeshStandardMaterial({
        color:     album.color,
        metalness: 0.6,
        roughness: 0.4,
        side:      THREE.DoubleSide,
      })

      const mesh = new THREE.Mesh(geo, mat)
      const x = Math.sin(angle) * arcRadius
      const z = -Math.cos(angle) * arcRadius + arcRadius

      mesh.position.set(x, 0, z)
      mesh.rotation.y = -angle
      mesh.userData.index  = i
      mesh.userData.album  = album
      mesh.userData.angle  = angle

      this._group.add(mesh)
      this._planes.push(mesh)

      // Album label
      const hintLight = new THREE.PointLight(0xffffff, 0, 4)
      hintLight.position.set(x, 1.5, z - 0.3)
      hintLight.userData.albumIndex = i
      this._group.add(hintLight)
    })

    camera.position.set(0, 0, 2)
    camera.lookAt(0, 0, arcRadius)

    scene.add(new THREE.AmbientLight(0x222233, 2))
    const key = new THREE.DirectionalLight(0xaabbff, 2.5)
    key.position.set(3, 5, 3)
    scene.add(key)
    this._key = key

    this._metaEl = document.getElementById('album-meta')

    this._onMove = (e) => {
      const x = (e.clientX ?? e.touches?.[0]?.clientX) / window.innerWidth
      const y = (e.clientY ?? e.touches?.[0]?.clientY) / window.innerHeight
      this._mouse.set(x * 2 - 1, -(y * 2 - 1))
    }
    window.addEventListener('mousemove',  this._onMove)
    window.addEventListener('touchmove',  this._onMove, { passive: true })

    this._clock.start()
    this._updateMeta(0)
  }

  _updateMeta(idx) {
    if (!this._metaEl) return
    const a = ALBUMS[idx]
    this._metaEl.textContent = `${a.title}  ·  ${a.year}`
  }

  update(t, dt, ctx) {
    const { camera } = ctx
    const elapsed = this._clock.getElapsedTime()

    // Scroll snaps to discrete album slots
    const slots = ALBUMS.length
    const rawIdx = ctx.scrollY * 0.0015
    this._snapTarget  = Math.min(slots - 1, Math.max(0, Math.round(rawIdx)))
    this._snapCurrent += (this._snapTarget - this._snapCurrent) * 0.08

    // Rotate arc group so focused album faces camera
    const targetAngle = -this._planes[Math.round(this._snapCurrent)]?.userData.angle ?? 0
    this._group.rotation.y += (targetAngle - this._group.rotation.y) * 0.07

    // Raycasting hover
    this._raycaster.setFromCamera(this._mouse, camera)
    const hits = this._raycaster.intersectObjects(this._planes)
    const newHovered = hits.length ? hits[0].object : null

    if (newHovered !== this._hovered) {
      if (this._hovered) {
        // restore
        this._hovered.scale.setScalar(1)
        this._group.children.forEach(c => {
          if (c.isPointLight && c.userData.albumIndex === this._hovered.userData.index) {
            c.intensity = 0
          }
        })
      }
      this._hovered = newHovered
      if (this._hovered) {
        this._hovered.scale.setScalar(1.1)
        this._group.children.forEach(c => {
          if (c.isPointLight && c.userData.albumIndex === this._hovered.userData.index) {
            c.intensity = 2.5
          }
        })
        this._updateMeta(this._hovered.userData.index)
      } else {
        this._updateMeta(Math.round(this._snapCurrent))
      }
    }

    // Gentle camera sway
    camera.position.x = Math.sin(elapsed * 0.3) * 0.15
    camera.position.y = Math.cos(elapsed * 0.21) * 0.08

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
    if (this._onMove) {
      window.removeEventListener('mousemove', this._onMove)
      window.removeEventListener('touchmove', this._onMove)
    }
    if (this._group) {
      this._group.traverse(c => {
        if (c.geometry) c.geometry.dispose()
        if (c.material) c.material.dispose()
      })
      scene.remove(this._group)
    }
    if (this._key) scene.remove(this._key)
    if (this._metaEl) this._metaEl.textContent = ''
    this._planes = []
  }
}
