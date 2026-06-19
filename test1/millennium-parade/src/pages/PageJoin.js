import * as THREE from 'three'

// Vertex shader with morph noise displacement
const blobVert = /* glsl */`
  uniform float uTime;
  uniform float uMorphAmp;

  varying vec3 vNormal;
  varying vec3 vPos;

  // Simple 3-D sin noise (no texture)
  float noise3(vec3 p) {
    return sin(p.x * 2.1 + p.y * 1.7 + p.z * 1.3 + uTime)
         * sin(p.x * 3.3 - p.z * 2.1 + uTime * 0.7) * 0.5
         + sin(p.y * 4.1 + p.z * 3.7 - uTime * 0.9) * 0.25
         + sin(p.x * 7.9 - p.y * 5.1 + uTime * 1.4) * 0.125;
  }

  void main() {
    vec3 pos = position;
    vec3 n   = normalize(pos);

    float d = noise3(n * 2.0 + uTime * 0.40) * 0.50
            + noise3(n * 4.0 - uTime * 0.25) * 0.30
            + noise3(n * 8.0 + uTime * 0.60) * 0.20;

    pos += n * d * uMorphAmp;

    vPos    = pos;
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const blobFrag = /* glsl */`
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vPos;

  void main() {
    // Iridescent fresnel-based colour cycle
    vec3 viewDir = normalize(cameraPosition - vPos);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);

    // Cycle through hues based on position + time
    float hue = fract(vPos.y * 0.3 + vPos.x * 0.2 + uTime * 0.08);
    // HSL → RGB approximation
    vec3 k = mod(vec3(hue * 6.0) + vec3(0.0, 4.0, 2.0), 6.0);
    vec3 rgb = clamp(abs(k - 3.0) - 1.0, 0.0, 1.0);
    vec3 hueCol = mix(vec3(0.0), rgb, 0.85);

    // Blend with white on fresnel edge
    vec3 col = mix(hueCol, vec3(1.0), fresnel * 0.5);

    // Subsurface-like translucency (inner glow)
    float sss = pow(max(0.0, -dot(vNormal, viewDir)), 2.0) * 0.3;
    col += vec3(sss * 0.6, sss * 0.3, sss * 0.8);

    gl_FragColor = vec4(col, 0.88);
  }
`

export class PageJoin {
  constructor() {
    this._blob  = null
    this._clock = new THREE.Clock()
  }

  async init(ctx) {
    const { scene, camera } = ctx
    const detail = ctx.isMobile ? 3 : 5

    const geo = new THREE.IcosahedronGeometry(1.5, detail)

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:     { value: 0 },
        uMorphAmp: { value: 0.55 },
        cameraPosition: { value: camera.position },
      },
      vertexShader:   blobVert,
      fragmentShader: blobFrag,
      transparent:    true,
      side:           THREE.DoubleSide,
      depthWrite:     false,
    })

    this._blob = new THREE.Mesh(geo, mat)
    scene.add(this._blob)

    // Rim lights for depth
    const rimA = new THREE.PointLight(0x88aaff, 5, 8)
    rimA.position.set(2, 2, 2)
    scene.add(rimA)
    const rimB = new THREE.PointLight(0xff44aa, 3, 6)
    rimB.position.set(-2, -1, 1)
    scene.add(rimB)
    scene.add(new THREE.AmbientLight(0x111122, 1.5))

    this._rimA = rimA
    this._rimB = rimB

    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)

    this._clock.start()
  }

  update(t, dt, ctx) {
    const { camera } = ctx
    const elapsed = this._clock.getElapsedTime()

    if (this._blob) {
      this._blob.material.uniforms.uTime.value = elapsed
      // Slow orbit
      this._blob.rotation.y = elapsed * 0.2
      this._blob.rotation.x = Math.sin(elapsed * 0.13) * 0.3
    }

    // Camera gentle orbit
    camera.position.x = Math.sin(elapsed * 0.18) * 0.4
    camera.position.y = Math.cos(elapsed * 0.14) * 0.2
    camera.lookAt(0, 0, 0)

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
    if (this._blob) {
      this._blob.geometry.dispose()
      this._blob.material.dispose()
      scene.remove(this._blob)
    }
    if (this._rimA) scene.remove(this._rimA)
    if (this._rimB) scene.remove(this._rimB)
  }
}
