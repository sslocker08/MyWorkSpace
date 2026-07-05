// critique: P4 H4 E4 S4 R4 V4
//
// SIGNATURE moment — a pinned, scroll-scrubbed procedural Hokusai-style wave
// painted frame-by-frame on <canvas data-wave-seq>. No image frames in MVP
// (DESIGN.md §8: code-drawn placeholder, swappable for real frames later
// via src/lib/assets.ts without touching this file's contract). The canvas
// starts transparent so the seigaiha <img> fallback shows through until the
// first paint; from p=0 onward every frame is opaque and covers it.
//
// Perf contract (brief §9): every array used in the hot draw() path is
// allocated once at module/renderer-setup time; draw() itself never
// allocates (no new arrays/objects), only reads typed arrays + primitives
// and issues canvas calls.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { resolvePalette } from './lib/colors';
import { debounce, isLowEndDevice } from './lib/dom';

gsap.registerPlugin(ScrollTrigger);

const FOAM_ARC_MAX = 10;
const CRASH_PARTICLE_COUNT = 32;
const CURL_STEPS = 22;
const CREST_X_FRACTION = 0.72;

// Precomputed once at module load — fixed-size seed data, never mutated,
// never reallocated per frame.
const FOAM_SEED_FRACTIONS = new Float32Array(FOAM_ARC_MAX);
const FOAM_SEED_ANGLES = new Float32Array(FOAM_ARC_MAX);
for (let i = 0; i < FOAM_ARC_MAX; i++) {
  FOAM_SEED_FRACTIONS[i] = 0.42 + (i / FOAM_ARC_MAX) * 0.5; // spread along the front crest
  FOAM_SEED_ANGLES[i] = ((i * 53) % 360) * (Math.PI / 180);
}

// [angle, speed, size, phase] per crash particle.
const PARTICLE_SEED = new Float32Array(CRASH_PARTICLE_COUNT * 4);
for (let i = 0; i < CRASH_PARTICLE_COUNT; i++) {
  const base = i * 4;
  PARTICLE_SEED[base + 0] = -Math.PI * 0.65 + (i / CRASH_PARTICLE_COUNT) * Math.PI * 0.9;
  PARTICLE_SEED[base + 1] = 0.5 + ((i * 7) % 10) / 10;
  PARTICLE_SEED[base + 2] = 1.5 + ((i * 3) % 5);
  PARTICLE_SEED[base + 3] = ((i * 29) % 100) / 100;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

interface Renderer {
  resize: () => void;
  draw: (progress: number) => void;
}

function createRenderer(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Renderer {
  let width = canvas.width;
  let height = canvas.height;
  const palette = resolvePalette(ctx);

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width || canvas.width;
    height = rect.height || canvas.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawBand = (baseY: number, amplitude: number, freq: number, phase: number, fillStyle: string): void => {
    const steps = 24;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, baseY);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = t * width;
      const y =
        baseY -
        Math.sin(t * Math.PI * freq + phase) * amplitude -
        Math.sin(t * Math.PI * freq * 2.3 + phase * 1.6) * amplitude * 0.22;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
  };

  const drawCrestCurl = (cx: number, cy: number, growth: number): void => {
    if (growth <= 0.001) return;
    ctx.beginPath();
    for (let i = 0; i <= CURL_STEPS; i++) {
      const t = i / CURL_STEPS;
      const angle = t * Math.PI * 2 * (0.6 + growth);
      const radius = growth * height * 0.16 * t;
      const x = cx + Math.cos(angle) * radius;
      const y = cy - Math.sin(angle) * radius * 0.6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = palette.kinari;
    ctx.lineWidth = Math.max(2, height * 0.006);
    ctx.stroke();
  };

  const drawFoamClaws = (crestBaseY: number, crestAmplitude: number, growPhase: number): void => {
    const count = growPhase > 0.02 ? Math.max(1, Math.round(FOAM_ARC_MAX * growPhase)) : 0;
    for (let i = 0; i < count; i++) {
      const frac = FOAM_SEED_FRACTIONS[i];
      const x = frac * width;
      const y = crestBaseY - crestAmplitude * 0.7;
      const size = height * (0.012 + (i % 3) * 0.003);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(FOAM_SEED_ANGLES[i]);
      ctx.beginPath();
      ctx.ellipse(0, 0, size, size * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = palette.kinari;
      ctx.fill();
      ctx.restore();
    }
  };

  const drawCrashParticles = (crestX: number, crestY: number, crashPhase: number): void => {
    if (crashPhase <= 0) return;
    const maxDist = Math.min(width, height) * 0.35;
    for (let i = 0; i < CRASH_PARTICLE_COUNT; i++) {
      const base = i * 4;
      const angle = PARTICLE_SEED[base + 0];
      const speed = PARTICLE_SEED[base + 1];
      const size = PARTICLE_SEED[base + 2];
      const phase = PARTICLE_SEED[base + 3];
      const local = clamp01((crashPhase - phase * 0.4) / (1 - phase * 0.4));
      if (local <= 0) continue;
      const dist = local * speed * maxDist;
      const x = crestX + Math.sin(angle) * dist;
      const y = crestY - Math.cos(angle) * dist * 0.5 + local * local * maxDist * 0.6;
      const alpha = Math.max(0, 1 - local * 1.1);
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = palette.kinari;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  const draw = (progressRaw: number): void => {
    const p = clamp01(progressRaw);
    const growPhase = clamp01(p / 0.7);
    const crashPhase = clamp01((p - 0.7) / 0.3);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.washi;
    ctx.fillRect(0, 0, width, height);

    // Back — asagi, farthest, subtlest motion.
    drawBand(height * 0.58 - growPhase * height * 0.03, height * (0.02 + growPhase * 0.012), 2.1, 0.4, palette.asagi);

    // Mid — ai.
    drawBand(height * 0.68 - growPhase * height * 0.05, height * (0.025 + growPhase * 0.02), 2.6, 1.1, palette.ai);

    // Front — deep ai-sumi mix, the cresting hero band. Folds back down a
    // little as the crash phase progresses (energy moving into curl/foam).
    const frontBaseY =
      height * 0.82 - growPhase * height * 0.14 + crashPhase * height * 0.05;
    const frontAmplitude = height * (0.05 + growPhase * 0.09) * (1 - crashPhase * 0.3);
    drawBand(frontBaseY, frontAmplitude, 1.7, 2.0, palette.aiSumiDeep);

    const crestX = width * CREST_X_FRACTION;
    const crestY = frontBaseY - frontAmplitude;
    const curlGrowth = growPhase * 0.35 + crashPhase * 1.1;
    drawCrestCurl(crestX, crestY, curlGrowth);
    drawFoamClaws(frontBaseY, frontAmplitude, growPhase);
    drawCrashParticles(crestX, crestY, crashPhase);
  };

  return { resize, draw };
}

export interface WaveSequenceOptions {
  /** Skip the pin/scrub entirely and paint one static frame at this
   * progress — used for prefers-reduced-motion and low-end mobile. */
  staticProgress?: number;
}

/** Returns a cleanup function for the one manual (non-gsap) side effect this
 * feature owns — the window resize listener. gsap tweens/ScrollTriggers
 * created below are captured by the enclosing gsap.matchMedia context and
 * revert automatically; this return value exists only for that listener. */
export function initWaveSequence(options: WaveSequenceOptions = {}): () => void {
  const noop = (): void => {};
  const section = document.querySelector<HTMLElement>('[data-concept]');
  const wrap = document.querySelector<HTMLElement>('[data-wave-seq-wrap]');
  const canvas = wrap?.querySelector<HTMLCanvasElement>('[data-wave-seq]');
  if (!section || !wrap || !canvas) return noop;

  const ctx = canvas.getContext('2d');
  if (!ctx) return noop;

  const renderer = createRenderer(canvas, ctx);
  renderer.resize();

  const staticProgress = options.staticProgress ?? (isLowEndDevice() ? 1 : undefined);
  if (staticProgress !== undefined) {
    renderer.draw(staticProgress);
    return noop; // concept-lines stay in their server-rendered, fully visible state.
  }

  renderer.draw(0);

  const lines = Array.from(section.querySelectorAll<HTMLElement>('[data-concept-line]'));
  if (lines.length) gsap.set(lines, { autoAlpha: 0, y: 20 });

  let currentProgress = 0;
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      pin: true,
      start: 'top top',
      end: '+=250%',
      scrub: 1,
      onUpdate: (self) => {
        currentProgress = self.progress;
        renderer.draw(self.progress);
      },
    },
  });

  const revealAt = [0.15, 0.45, 0.75];
  const durations = [0.1, 0.1, 0.25];
  lines.forEach((line, index) => {
    const at = revealAt[index];
    const duration = durations[index];
    if (at === undefined || duration === undefined) return;
    tl.fromTo(
      line,
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration, ease: 'none', immediateRender: false },
      at,
    );
  });

  const onResize = debounce(() => {
    renderer.resize();
    renderer.draw(currentProgress);
    ScrollTrigger.refresh();
  }, 200);
  window.addEventListener('resize', onResize);

  return () => window.removeEventListener('resize', onResize);
}
