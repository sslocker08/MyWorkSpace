import * as THREE from 'three'
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js'

const vert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const frag = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform sampler2D tFeedback;
  uniform float     uDamp;
  uniform float     uScrollVelocity;

  varying vec2 vUv;

  void main() {
    vec4 current  = texture2D(tDiffuse, vUv);

    // UV drift on feedback — makes smear directional (downward on positive scroll)
    float velSign = sign(uScrollVelocity);
    vec2  drift   = vec2(0.0, uScrollVelocity * 0.00018);
    vec4  prev    = texture2D(tFeedback, clamp(vUv + drift, 0.001, 0.999));

    // Velocity-sensitive decay: fast scroll clears smear faster
    float velFactor = clamp(abs(uScrollVelocity) * 0.0038, 0.0, 0.11);
    float damp = uDamp - velFactor;

    gl_FragColor = mix(current, prev, damp);
  }
`

const blitVert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }
`
const blitFrag = /* glsl */`
  uniform sampler2D tMap;
  varying vec2 vUv;
  void main() { gl_FragColor = texture2D(tMap, vUv); }
`

export class AfterimagePass extends Pass {
  constructor({ damp = 0.88 } = {}) {
    super()
    this.damp = damp

    const w = window.innerWidth
    const h = window.innerHeight
    const opts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthBuffer: false,
    }

    this.rtA = new THREE.WebGLRenderTarget(w, h, opts)
    this.rtB = new THREE.WebGLRenderTarget(w, h, opts)
    this.readRT  = this.rtB
    this.writeRT = this.rtA

    this.uniforms = {
      tDiffuse:        { value: null },
      tFeedback:       { value: this.readRT.texture },
      uDamp:           { value: damp },
      uScrollVelocity: { value: 0 },
    }

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vert,
      fragmentShader: frag,
    })

    this.blitUniforms = { tMap: { value: null } }
    this.blitMaterial = new THREE.ShaderMaterial({
      uniforms: this.blitUniforms,
      vertexShader: blitVert,
      fragmentShader: blitFrag,
    })

    this.fsQuad = new FullScreenQuad(this.material)
    this.blitQuad = new FullScreenQuad(this.blitMaterial)
  }

  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value  = readBuffer.texture
    this.uniforms.tFeedback.value = this.readRT.texture

    // Accumulate into write ping-pong target
    renderer.setRenderTarget(this.writeRT)
    this.fsQuad.render(renderer)

    // Blit accumulated result to composer's write buffer
    this.blitUniforms.tMap.value = this.writeRT.texture
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer)
    this.blitQuad.render(renderer)

    // Swap
    const tmp     = this.readRT
    this.readRT   = this.writeRT
    this.writeRT  = tmp
  }

  setSize(w, h) {
    this.rtA.setSize(w, h)
    this.rtB.setSize(w, h)
  }

  dispose() {
    this.rtA.dispose()
    this.rtB.dispose()
    this.material.dispose()
    this.blitMaterial.dispose()
    this.fsQuad.dispose()
    this.blitQuad.dispose()
  }
}
