'use client';

// The turning page. A leaf is a chain of N hinged strips (CSS 3D, preserve-3d): strip 0 hangs
// on the spine and each next strip hangs on the previous one, so giving the outer strips a
// little extra rotation bends the paper into a curl. GSAP drives one progress value; every
// frame turns it into strip angles, light on both faces and the shadow cast on the page below.
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';

export interface LeafProps {
  /** 'forward' = right page turns over to the left; 'backward' = left page turns to the right. */
  direction: 'forward' | 'backward';
  /** spread: the leaf is one page of a two-page spread; single: it is the whole page. */
  mode: 'spread' | 'single';
  pageWidth: number;
  pageHeight: number;
  strips: number;
  duration: number;
  front: ReactNode;
  back: ReactNode;
  onDone: () => void;
  /** Shadow layer on the page underneath (positioned by the parent, driven here). */
  shadowRef?: React.RefObject<HTMLDivElement | null>;
}

export function Leaf({ direction, mode, pageWidth, pageHeight, strips, duration, front, back, onDone, shadowRef }: LeafProps) {
  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frontShade = useRef<(HTMLDivElement | null)[]>([]);
  const backShade = useRef<(HTMLDivElement | null)[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const w = pageWidth / strips;
  // A single page is hinged on its left edge whichever way it turns.
  const geo = mode === 'single' ? 'forward' : direction;
  const sign = geo === 'forward' ? -1 : 1;
  // In single-page mode turning back means the previous page comes back over the current one.
  const reverse = mode === 'single' && direction === 'backward';

  useLayoutEffect(() => {
    const state = { p: reverse ? 1 : 0, curl: 0, settle: 0 };

    const apply = () => {
      const base = 180 * state.p;
      let total = 0;
      for (let i = 0; i < strips; i++) {
        const el = stripRefs.current[i];
        if (!el) continue;
        // Outer strips lead: the free edge is lifted first, like a page held by its corner.
        const share = strips === 1 ? 0 : i / (strips - 1);
        const extra = i === 0 ? base : (state.curl * share + state.settle * share * share);
        const angle = sign * extra;
        total += extra;
        el.style.transform = `rotateY(${angle}deg)`;
        // Light: a face is darkest when it stands edge-on to the reader.
        const lit = Math.abs(Math.sin((Math.min(total, 180) * Math.PI) / 180));
        const f = frontShade.current[i];
        const b = backShade.current[i];
        if (f) f.style.opacity = String(0.08 + lit * 0.42);
        if (b) b.style.opacity = String(0.05 + lit * 0.3);
      }
      const sh = shadowRef?.current;
      if (sh) {
        const lift = Math.sin(state.p * Math.PI);
        sh.style.opacity = String(lift * 0.9);
        const projected = Math.abs(Math.cos(state.p * Math.PI)) * pageWidth;
        sh.style.setProperty('--edge', `${projected}px`);
        sh.style.setProperty('--blur', `${30 + lift * 70}px`);
        sh.dataset.over = state.p > 0.5 ? 'far' : 'near';
      }
    };

    apply();
    const curlMax = mode === 'single' ? 0 : 38;
    const tl = gsap.timeline({ onUpdate: apply, onComplete: () => doneRef.current() });
    tl.to(state, { p: reverse ? 0 : 1, duration, ease: 'power2.inOut' }, 0);
    if (strips > 1) {
      // Curl builds while the page lifts, then flattens as it lands...
      tl.to(state, { curl: curlMax, duration: duration * 0.45, ease: 'sine.out' }, 0);
      tl.to(state, { curl: 0, duration: duration * 0.55, ease: 'sine.inOut' }, duration * 0.45);
      // ...and the free edge gives a small flutter as the paper settles.
      tl.to(state, { settle: -9, duration: duration * 0.16, ease: 'sine.out' }, duration * 0.84);
      tl.to(state, { settle: 0, duration: duration * 0.34, ease: 'elastic.out(1, 0.45)' }, duration);
    }
    return () => {
      tl.kill();
    };
  }, [mode, pageWidth, strips, duration, reverse, sign, shadowRef]);

  // Where each face's content sits so that the N strips together show one whole page.
  const frontOffset = (i: number) => (geo === 'forward' ? -i * w : -(pageWidth - (i + 1) * w));
  const backOffset = (i: number) => (geo === 'forward' ? -(pageWidth - (i + 1) * w) : -i * w);

  const renderStrip = (i: number): ReactNode => {
    if (i >= strips) return null;
    const style: React.CSSProperties =
      geo === 'forward'
        ? { position: 'absolute', top: 0, left: i === 0 ? 0 : '100%', width: w, height: pageHeight, transformOrigin: 'left center' }
        : { position: 'absolute', top: 0, right: i === 0 ? 0 : '100%', width: w, height: pageHeight, transformOrigin: 'right center' };
    return (
      <div key={i} ref={(el) => { stripRefs.current[i] = el; }} className="leaf-strip" style={style}>
        <div className="leaf-face">
          <div style={{ position: 'absolute', top: 0, left: frontOffset(i), width: pageWidth, height: pageHeight }}>{front}</div>
          <div
            ref={(el) => { frontShade.current[i] = el; }}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: geo === 'forward'
              ? 'linear-gradient(90deg, rgba(40,28,10,.55), rgba(40,28,10,.1) 60%, rgba(255,250,235,.05))'
              : 'linear-gradient(270deg, rgba(40,28,10,.55), rgba(40,28,10,.1) 60%, rgba(255,250,235,.05))', opacity: 0.08 }}
          />
        </div>
        <div className="leaf-face leaf-face-back">
          <div style={{ position: 'absolute', top: 0, left: backOffset(i), width: pageWidth, height: pageHeight }}>{back}</div>
          <div
            ref={(el) => { backShade.current[i] = el; }}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(90deg, rgba(40,28,10,.35), rgba(255,250,235,.0) 70%)', opacity: 0.05 }}
          />
        </div>
        {renderStrip(i + 1)}
      </div>
    );
  };

  return (
    <div
      className="leaf absolute top-0"
      inert
      aria-hidden
      style={{
        width: pageWidth,
        height: pageHeight,
        left: mode === 'single' || direction === 'backward' ? 0 : pageWidth,
        zIndex: 30,
      }}
    >
      {renderStrip(0)}
    </div>
  );
}
