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
  uniform float     uIntensity;
  uniform float     uTime;
  uniform vec2      uResolution;

  varying vec2 vUv;

  // Low-quality hash — intentionally cheap & noisy
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;

    // Row-granular glitch: every 2 scanlines is one "band"
    float row = floor(vUv.y * uResolution.y * 0.5);

    // Probability ramps with intensity; high-frequency time seed for flicker
    float seed   = row + floor(uTime * 30.0) * 1000.0;
    float prob   = uIntensity * 0.6;
    float doGlitch = step(1.0 - prob, hash(seed));

    float shiftX = (hash(seed * 3.7) * 2.0 - 1.0) * 0.045 * uIntensity * doGlitch;
    float shiftY = (hash(seed * 5.1) * 2.0 - 1.0) * 0.006 * uIntensity * doGlitch;

    // RGB channel split
    vec2 uvR = clamp(uv + vec2( shiftX,       shiftY), 0.0, 1.0);
    vec2 uvG = clamp(uv + vec2( shiftY * 0.3, 0.0),   0.0, 1.0);
    vec2 uvB = clamp(uv + vec2(-shiftX,      -shiftY), 0.0, 1.0);

    float r = texture2D(tDiffuse, uvR).r;
    float g = texture2D(tDiffuse, uvG).g;
    float b = texture2D(tDiffuse, uvB).b;

    vec3 col = vec3(r, g, b);

    // White flash at peak intensity (intensity > 0.8)
    float flash = smoothstep(0.8, 1.0, uIntensity) * 0.25;
    col = mix(col, vec3(1.0), flash);

    gl_FragColor = vec4(col, 1.0);
  }
`

export class GlitchTransitionPass extends Pass {
  constructor() {
    super()

    this.uniforms = {
      tDiffuse:    { value: null },
      uIntensity:  { value: 0 },
      uTime:       { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    }

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vert,
      fragmentShader: frag,
    })

    this.fsQuad = new FullScreenQuad(this.material)
    this.enabled = false
  }

  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value   = readBuffer.texture
    this.uniforms.uTime.value      = performance.now() * 0.001

    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer)
    this.fsQuad.render(renderer)
  }

  setSize(w, h) {
    this.uniforms.uResolution.value.set(w, h)
  }

  dispose() {
    this.material.dispose()
    this.fsQuad.dispose()
  }
}
