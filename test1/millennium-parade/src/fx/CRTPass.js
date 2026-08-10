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
  uniform vec2      uResolution;
  uniform float     uTime;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // ── Barrel distortion ──────────────────────────
    vec2 cc = uv - 0.5;
    float r2 = dot(cc, cc);
    uv = (uv - 0.5) * (1.0 + r2 * 0.04) + 0.5;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // ── Chromatic aberration (radial) ──────────────
    vec2 dir = (uv - 0.5) * 0.003;
    float r = texture2D(tDiffuse, uv + dir).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv - dir).b;
    vec3 col = vec3(r, g, b);

    // ── Aperture grille (R/G/B subpixel mask) ─────
    // Each phosphor column is 3 px wide; mod by 3 to pick channel
    float px = mod(floor(gl_FragCoord.x), 3.0);
    vec3 mask;
    if      (px < 0.5) mask = vec3(1.0, 0.18, 0.18);
    else if (px < 1.5) mask = vec3(0.18, 1.0, 0.18);
    else               mask = vec3(0.18, 0.18, 1.0);

    // Soften mask in bright areas so it doesn't kill highlights
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    mask = mix(mask, vec3(1.0), smoothstep(0.55, 0.9, lum));
    col *= mask;

    // ── Scanline shadow (subtle horizontal bands) ─
    float scan = sin(gl_FragCoord.y * 3.14159) * 0.5 + 0.5;
    col *= mix(0.88, 1.0, scan * scan);

    // ── Phosphor flicker ──────────────────────────
    float flicker = sin(uTime * 60.0 * 6.28318) * 0.005 + 1.0;
    col *= flicker;

    // ── Vignette ──────────────────────────────────
    float dist = length(cc) * 1.42;
    float vig  = smoothstep(0.95, 0.4, dist);
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
  }
`

export class CRTPass extends Pass {
  constructor() {
    super()

    this.uniforms = {
      tDiffuse:    { value: null },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uTime:       { value: 0 },
    }

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vert,
      fragmentShader: frag,
    })

    this.fsQuad = new FullScreenQuad(this.material)
  }

  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value = readBuffer.texture
    this.uniforms.uTime.value    = performance.now() * 0.001

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
