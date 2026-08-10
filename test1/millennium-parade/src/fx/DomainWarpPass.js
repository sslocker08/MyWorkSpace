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
  uniform float     uTime;
  uniform float     uScrollVelocity;

  varying vec2 vUv;

  // sin-hash gradient noise — no texture needed
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float gnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(dot(hash2(i + vec2(0,0)), f - vec2(0,0)),
          dot(hash2(i + vec2(1,0)), f - vec2(1,0)), u.x),
      mix(dot(hash2(i + vec2(0,1)), f - vec2(0,1)),
          dot(hash2(i + vec2(1,1)), f - vec2(1,1)), u.x),
      u.y
    );
  }

  // 5-octave fbm
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2  s = vec2(1.0);
    mat2  r = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
      v += a * gnoise(p);
      p  = r * p * 2.0 + s;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float t = uTime * 0.18;

    // Two-stage domain warp: q → r → displacement
    vec2 p = vUv * 3.0;
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) + t));
    vec2 r = vec2(fbm(p + q + vec2(1.7, 9.2) + t * 0.9),
                  fbm(p + q + vec2(8.3, 2.8) + t * 1.1));

    float velAmp = 0.004 + abs(uScrollVelocity) * 0.018;
    vec2  warp   = r * velAmp;

    gl_FragColor = texture2D(tDiffuse, clamp(vUv + warp, 0.001, 0.999));
  }
`

export class DomainWarpPass extends Pass {
  constructor() {
    super()

    this.uniforms = {
      tDiffuse:        { value: null },
      uTime:           { value: 0 },
      uScrollVelocity: { value: 0 },
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

    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer)
    this.fsQuad.render(renderer)
  }

  dispose() {
    this.material.dispose()
    this.fsQuad.dispose()
  }
}
