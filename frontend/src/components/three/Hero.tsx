'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePreview } from '@/components/book/page-context';
import { useLowPower, useReducedMotion } from '@/lib/device';

const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false, loading: () => <Plate /> });

/** The still picture used on a turning leaf, on low-powered devices and with reduced motion. */
function Plate() {
  return (
    <div className="relative mx-auto h-full w-full max-w-[420px]">
      <Image src="/logo.png" alt="" fill sizes="420px" className="object-contain p-6 [filter:drop-shadow(0_10px_12px_rgba(60,40,10,.25))]" />
    </div>
  );
}

export function Hero() {
  const preview = usePreview();
  const lowPower = useLowPower();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Pause the render loop when the plate is scrolled out of view.
  useEffect(() => {
    const el = ref.current;
    if (!el || preview) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [preview]);

  return (
    <div ref={ref} className="relative h-full w-full">
      {preview || lowPower ? <Plate /> : <HeroScene active={visible && !reduced} />}
    </div>
  );
}
