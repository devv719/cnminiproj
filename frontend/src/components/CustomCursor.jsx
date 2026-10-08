import { useEffect, useRef } from 'react';

/**
 * CustomCursor — smooth circular cursor with inertia.
 * Uses requestAnimationFrame + lerp for lag effect.
 * No React state = zero re-renders.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const posRef = useRef({ x: -100, y: -100 });
  const smoothRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef(null);
  const hoveredRef = useRef(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const onMouseMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, label, [data-interactive]';

    const onMouseOver = (e) => {
      if (e.target.closest && e.target.closest(INTERACTIVE)) {
        if (!hoveredRef.current) {
          hoveredRef.current = true;
          ring.style.width = '52px';
          ring.style.height = '52px';
          ring.style.borderColor = 'rgba(20,20,19,0.85)';
          ring.style.backgroundColor = 'rgba(20,20,19,0.04)';
          dot.style.backgroundColor = '#00FB96';
          dot.style.width = '10px';
          dot.style.height = '10px';
        }
      }
    };

    const onMouseOut = (e) => {
      if (e.target.closest && e.target.closest(INTERACTIVE)) {
        const related = e.relatedTarget;
        if (!related || !related.closest || !related.closest(INTERACTIVE)) {
          hoveredRef.current = false;
          ring.style.width = '36px';
          ring.style.height = '36px';
          ring.style.borderColor = 'rgba(20,20,19,0.55)';
          ring.style.backgroundColor = 'transparent';
          dot.style.backgroundColor = '#00FB96';
          dot.style.width = '8px';
          dot.style.height = '8px';
        }
      }
    };

    const onMouseDown = () => {
      ring.style.transform = ring.style.transform.replace('translate', '');
      ring.style.opacity = '0.6';
    };
    const onMouseUp = () => {
      ring.style.opacity = '1';
    };

    const lerp = (a, b, t) => a + (b - a) * t;

    const animate = () => {
      const target = posRef.current;
      const smooth = smoothRef.current;

      smooth.x = lerp(smooth.x, target.x, 0.12);
      smooth.y = lerp(smooth.y, target.y, 0.12);

      const dw = parseFloat(dot.style.width) || 8;
      const rw = parseFloat(ring.style.width) || 36;

      // Dot follows mouse exactly (no lag)
      dot.style.transform = `translate(${target.x - dw / 2}px, ${target.y - dw / 2}px)`;
      // Ring follows with inertia
      ring.style.transform = `translate(${smooth.x - rw / 2}px, ${smooth.y - rw / 2}px)`;

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseover', onMouseOver, { passive: true });
    document.addEventListener('mouseout', onMouseOut, { passive: true });
    document.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('mouseup', onMouseUp, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    document.documentElement.classList.add('custom-cursor-active');

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(rafRef.current);
      document.documentElement.classList.remove('custom-cursor-active');
    };
  }, []);

  return (
    <>
      {/* Center dot */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#00FB96',
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform',
          transition: 'background-color 0.2s ease, width 0.2s ease, height 0.2s ease',
        }}
      />
      {/* Outer ring with inertia */}
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1.5px solid rgba(20,20,19,0.55)',
          backgroundColor: 'transparent',
          pointerEvents: 'none',
          zIndex: 99998,
          willChange: 'transform',
          transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1), height 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.25s ease, background-color 0.25s ease, opacity 0.15s ease',
        }}
      />
    </>
  );
}
