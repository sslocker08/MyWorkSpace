import { initRenderer } from './core/renderer.js'
import { initRouter }   from './core/router.js'
import { initI18n }     from './core/i18n.js'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isMobile      = window.matchMedia('(hover: none) and (pointer: coarse)').matches

// ── Boot ──────────────────────────────────────────────────
const { scene, camera, renderer, composer, afterimagePass, domainWarpPass, glitchPass } =
  initRenderer({ isMobile, reducedMotion })

initI18n()

const ctx = {
  scene, camera, renderer, composer,
  afterimagePass, domainWarpPass, glitchPass,
  isMobile, reducedMotion,
  width:          window.innerWidth,
  height:         window.innerHeight,
  scrollY:        0,
  scrollVelocity: 0,
}

const router = initRouter(ctx)

// ── Loading fade-out ───────────────────────────────────────
const loadingEl  = document.getElementById('loading')
const loadFill   = document.getElementById('loading-fill')

let loadProgress = 0
const loadInterval = setInterval(() => {
  loadProgress = Math.min(loadProgress + 0.04, 0.95)
  if (loadFill) loadFill.style.width = `${loadProgress * 100}%`
}, 50)

// After first page initialises (router fires async), reveal canvas
window.addEventListener('millennium:ready', () => {
  clearInterval(loadInterval)
  if (loadFill) loadFill.style.width = '100%'
  setTimeout(() => loadingEl?.classList.add('hidden'), 300)
}, { once: true })

// Fallback: hide loading after 2 s regardless
setTimeout(() => {
  clearInterval(loadInterval)
  loadingEl?.classList.add('hidden')
}, 2000)

// ── Scroll velocity ────────────────────────────────────────
let lastWheel = 0
window.addEventListener('wheel', e => {
  e.preventDefault()
  ctx.scrollY       += e.deltaY
  ctx.scrollVelocity = e.deltaY
  lastWheel = performance.now()
}, { passive: false })

let lastTouchY = 0
window.addEventListener('touchstart', e => {
  lastTouchY = e.touches[0].clientY
}, { passive: true })
window.addEventListener('touchmove', e => {
  const dy = lastTouchY - e.touches[0].clientY
  ctx.scrollY       += dy
  ctx.scrollVelocity = dy
  lastTouchY         = e.touches[0].clientY
}, { passive: true })

// ── Resize ────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth
  const h = window.innerHeight
  ctx.width  = w
  ctx.height = h
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  if (composer) composer.setSize(w, h)
})

// ── RAF loop ──────────────────────────────────────────────
if (reducedMotion) {
  // Single static frame
  renderer.render(scene, camera)
} else {
  let lastTime = performance.now()

  function frame(now) {
    const dt = Math.min((now - lastTime) * 0.001, 0.05)
    lastTime = now

    // Velocity decay
    ctx.scrollVelocity *= 0.85

    router.update(now * 0.001, dt, ctx)

    if (composer) {
      composer.render()
    } else {
      renderer.render(scene, camera)
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}

// Signal first paint (used by router's first navigateTo callback)
// We dispatch after a microtask so router has a chance to init
Promise.resolve().then(() => {
  window.dispatchEvent(new Event('millennium:ready'))
})
