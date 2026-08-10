const PAGE_MAP = {
  top:     () => import('../pages/PageTop.js').then(m => new m.PageTop()),
  works:   () => import('../pages/PageWorks.js').then(m => new m.PageWorks()),
  newtown: () => import('../pages/PageNewTown.js').then(m => new m.PageNewTown()),
  join:    () => import('../pages/PageJoin.js').then(m => new m.PageJoin()),
}

const VALID_PAGES = new Set(Object.keys(PAGE_MAP))

export function initRouter(ctx) {
  let currentPage = null
  let currentKey  = null
  let glitchTimer = -1

  // ── Glitch helpers ──────────────────────────────
  function startGlitch() {
    if (!ctx.glitchPass) return
    ctx.glitchPass.enabled = true
    ctx.glitchPass.uniforms.uIntensity.value = 1.0
    glitchTimer = 0
  }

  function updateGlitch(dt) {
    if (!ctx.glitchPass?.enabled) return
    glitchTimer += dt
    const progress = glitchTimer / 0.28
    ctx.glitchPass.uniforms.uIntensity.value = Math.max(0, 1 - progress)
    ctx.glitchPass.uniforms.uTime.value = performance.now() * 0.001
    if (progress >= 1) {
      ctx.glitchPass.enabled = false
      glitchTimer = -1
    }
  }

  // ── Navigation ──────────────────────────────────
  async function navigateTo(key) {
    if (!VALID_PAGES.has(key)) key = 'top'
    if (key === currentKey) return

    // Hide current overlay
    if (currentKey) {
      document.querySelector(`.page-overlay[data-page="${currentKey}"]`)
        ?.classList.remove('active')
    }

    startGlitch()

    // Dispose current page
    if (currentPage) {
      currentPage.dispose(ctx)
      currentPage = null
    }

    // Clear scene objects (keep lights if any persistent)
    while (ctx.scene.children.length > 0) {
      const obj = ctx.scene.children[0]
      ctx.scene.remove(obj)
    }

    // Reset camera
    ctx.camera.position.set(0, 0, 5)
    ctx.camera.rotation.set(0, 0, 0)
    ctx.camera.fov = 60
    ctx.camera.updateProjectionMatrix()

    // Reset scroll
    ctx.scrollY = 0
    ctx.scrollVelocity = 0

    // Update nav active state
    currentKey = key
    document.querySelectorAll('#nav-links a').forEach(a => {
      const url = new URL(a.href, location.origin)
      a.classList.toggle('active', url.searchParams.get('p') === key)
    })

    // Instantiate + init new page
    const factory = PAGE_MAP[key]
    currentPage = await factory()
    await currentPage.init(ctx)

    // Show overlay
    document.querySelector(`.page-overlay[data-page="${key}"]`)
      ?.classList.add('active')
  }

  // ── Link interception ───────────────────────────
  document.querySelectorAll('#nav-links a, #logo').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault()
      const url = new URL(a.href, location.origin)
      const key = url.searchParams.get('p') || 'top'
      history.pushState(null, '', `?p=${key}`)
      navigateTo(key)
    })
  })

  window.addEventListener('popstate', () => {
    const key = new URLSearchParams(location.search).get('p') || 'top'
    navigateTo(key)
  })

  // ── Initial route ───────────────────────────────
  const initKey = new URLSearchParams(location.search).get('p') || 'top'
  navigateTo(initKey)

  return {
    update(t, dt, ctx) {
      updateGlitch(dt)
      if (currentPage) currentPage.update(t, dt, ctx)
    },
  }
}
