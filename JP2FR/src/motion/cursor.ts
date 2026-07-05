// critique: P4 H4 E4 S4 R4 V4
//
// Custom cursor — desktop fine-pointer only (called only from init.ts's
// isDesktopFine branch). A single 朱(shu) dot that lerp-follows the pointer
// and scales up over interactive elements. Native cursor is hidden via an
// inline style toggle on <body> (scoped to exactly the lifetime of this
// feature) rather than a stylesheet rule, so this stays a pure
// src/motion/** concern. Entirely inert for keyboard users: the dot is
// aria-hidden and never intercepts events (pointer-events: none).
import { gsap } from 'gsap';

const CURSOR_SIZE = 20;
const HOVER_SCALE = 2.5;
const HOVER_SELECTOR = 'a, button, [data-add-to-cart]';

export function initCursor(): () => void {
  const cursor = document.createElement('div');
  cursor.setAttribute('aria-hidden', 'true');
  cursor.style.position = 'fixed';
  cursor.style.top = '0';
  cursor.style.left = '0';
  cursor.style.width = `${CURSOR_SIZE}px`;
  cursor.style.height = `${CURSOR_SIZE}px`;
  cursor.style.marginLeft = `${-CURSOR_SIZE / 2}px`;
  cursor.style.marginTop = `${-CURSOR_SIZE / 2}px`;
  cursor.style.borderRadius = '50%';
  // Solid 朱 dot — no blend mode: exclusion over the kinari ground shifted
  // the dot to an off-palette teal (caught in the visual gate); the palette
  // is a closed set (DESIGN.md §1).
  cursor.style.background = 'var(--color-shu)';
  cursor.style.pointerEvents = 'none';
  cursor.style.zIndex = 'var(--z-toast)';
  cursor.style.willChange = 'transform';
  cursor.style.opacity = '0';
  document.body.appendChild(cursor);

  const previousCursor = document.body.style.cursor;
  document.body.style.cursor = 'none';

  const moveX = gsap.quickTo(cursor, 'x', { duration: 0.15, ease: 'power3' });
  const moveY = gsap.quickTo(cursor, 'y', { duration: 0.15, ease: 'power3' });

  let hasMoved = false;
  const onMove = (event: MouseEvent): void => {
    if (!hasMoved) {
      hasMoved = true;
      gsap.set(cursor, { x: event.clientX, y: event.clientY });
      gsap.to(cursor, { opacity: 1, duration: 0.2 });
    }
    moveX(event.clientX);
    moveY(event.clientY);
  };

  const onOver = (event: Event): void => {
    if ((event.target as Element | null)?.closest(HOVER_SELECTOR)) {
      gsap.to(cursor, { scale: HOVER_SCALE, duration: 0.2, ease: 'power2.out' });
    }
  };

  const onOut = (event: Event): void => {
    if ((event.target as Element | null)?.closest(HOVER_SELECTOR)) {
      gsap.to(cursor, { scale: 1, duration: 0.2, ease: 'power2.out' });
    }
  };

  window.addEventListener('mousemove', onMove);
  document.addEventListener('mouseover', onOver);
  document.addEventListener('mouseout', onOut);

  return () => {
    window.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseover', onOver);
    document.removeEventListener('mouseout', onOut);
    document.body.style.cursor = previousCursor;
    cursor.remove();
  };
}
