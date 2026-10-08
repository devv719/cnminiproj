import { useEffect, useRef } from 'react';

/**
 * useScrollReveal — attaches IntersectionObserver to a ref.
 * When element enters viewport, adds 'scroll-visible' class.
 * When it leaves (scrolling up), removes it for reverse animation.
 */
export function useScrollReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const el = ref.current;
    if (!el) return;

    if (mq.matches) {
      el.classList.add('scroll-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('scroll-visible');
          } else {
            // Only reverse if user scrolled back up (entry is above viewport)
            if (options.reverse !== false && entry.boundingClientRect.top > 0) {
              el.classList.remove('scroll-visible');
            }
          }
        });
      },
      {
        threshold: options.threshold ?? 0.15,
        rootMargin: options.rootMargin ?? '0px 0px -60px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin, options.reverse]);

  return ref;
}

/**
 * ScrollReveal — wrapper component that fades/slides children into view on scroll.
 * variant: 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'scale'
 */
export function ScrollReveal({
  children,
  className = '',
  variant = 'slide-up',
  delay = 0,
  duration = 700,
  threshold = 0.15,
  reverse = true,
  as: Tag = 'div',
  ...props
}) {
  const ref = useScrollReveal({ threshold, reverse });

  return (
    <Tag
      ref={ref}
      className={`scroll-reveal scroll-reveal--${variant} ${className}`}
      style={{
        '--reveal-delay': `${delay}ms`,
        '--reveal-duration': `${duration}ms`,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}

/**
 * ScrollStagger — wraps children and staggers them with incremental delays.
 */
export function ScrollStagger({
  children,
  className = '',
  staggerMs = 100,
  variant = 'slide-up',
  threshold = 0.12,
  as: Tag = 'div',
  ...props
}) {
  const ref = useScrollReveal({ threshold });

  return (
    <Tag ref={ref} className={`scroll-stagger ${className}`} {...props}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <div
              key={i}
              className={`scroll-reveal scroll-reveal--${variant}`}
              style={{
                '--reveal-delay': `${i * staggerMs}ms`,
                '--reveal-duration': '600ms',
              }}
            >
              {child}
            </div>
          ))
        : children}
    </Tag>
  );
}

/**
 * ScrollText — progressively reveals words/phrases as user scrolls through the element.
 * Each word/phrase becomes visible when its portion of the element is in the viewport.
 */
export function ScrollText({ text, className = '', splitBy = 'word' }) {
  const containerRef = useRef(null);
  const wordsRef = useRef([]);

  const parts = splitBy === 'word'
    ? text.split(' ')
    : text.split(/[,.!?]+/).filter(Boolean).map(s => s.trim());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress goes 0→1 as element scrolls from bottom to top of viewport
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / (rect.height + vh * 0.3)));

      wordsRef.current.forEach((word, i) => {
        if (!word) return;
        const wordProgress = i / (wordsRef.current.length - 1 || 1);
        if (progress >= wordProgress) {
          word.style.opacity = '1';
          word.style.transform = 'translateY(0)';
        } else {
          word.style.opacity = '0.15';
          word.style.transform = 'translateY(4px)';
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [parts.length]);

  return (
    <span ref={containerRef} className={`inline ${className}`} aria-label={text}>
      {parts.map((part, i) => (
        <span
          key={i}
          ref={(el) => (wordsRef.current[i] = el)}
          style={{
            display: 'inline-block',
            opacity: 0.15,
            transform: 'translateY(4px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
            marginRight: splitBy === 'word' ? '0.28em' : '0',
            whiteSpace: splitBy === 'word' ? 'normal' : 'pre',
          }}
          aria-hidden="true"
        >
          {part}
        </span>
      ))}
    </span>
  );
}

/**
 * ParallaxHeading — large heading that drifts toward center as you scroll.
 */
export function ParallaxHeading({ children, className = '', speed = 0.15 }) {
  const ref = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const center = window.innerHeight / 2;
      const offset = (rect.top + rect.height / 2 - center) * speed;
      el.style.transform = `translateY(${-offset}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
