import * as THREE from 'three'
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { AfterimagePass }  from '../fx/AfterimagePass.js'
import { DomainWarpPass }  from '../fx/DomainWarpPass.js'
import { CRTPass }         from '../fx/CRTPass.js'
import { GlitchTransitionPass } from '../fx/GlitchTransitionPass.js'

export function initRenderer({ isMobile, reducedMotion }) {
  const canvas = document.getElementById('gl-canvas')
  const w = window.innerWidth
  const h = window.innerHeight

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = !isMobile
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000)
  camera.position.set(0, 0, 5)

  let composer = null
  let afterimagePass = null
  let domainWarpPass = null
  let glitchPass = null

  if (!isMobile && !reducedMotion) {
    composer = new EffectComposer(renderer)

    const renderPass = new RenderPass(scene, camera)
    afterimagePass  = new AfterimagePass({ damp: 0.88 })
    domainWarpPass  = new DomainWarpPass()
    const crtPass   = new CRTPass()
    glitchPass      = new GlitchTransitionPass()
    glitchPass.enabled = false

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      0.32,   // strength
      0.42,   // radius
      0.82    // threshold
    )

    composer.addPass(renderPass)
    composer.addPass(afterimagePass)
    composer.addPass(domainWarpPass)
    composer.addPass(crtPass)
    composer.addPass(glitchPass)
    composer.addPass(bloomPass)
  }

  return { scene, camera, renderer, composer, afterimagePass, domainWarpPass, glitchPass }
}
