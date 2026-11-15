'use client';

// Bindu ("a drop"): the study companion, a little conical flask with a face.
// It bobs gently and blinks; it stays still when reduced motion is on or on a turning leaf.
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useReducedMotion } from '@/lib/device';
import { usePreview } from '@/components/book/page-context';

export type BinduMood = 'happy' | 'thinking' | 'cheer';

export function Bindu({ size = 120, mood = 'happy', className }: { size?: number; mood?: BinduMood; className?: string }) {
  const reduced = useReducedMotion();
  const preview = usePreview();
  const still = reduced || preview;

  return (
    <motion.div
      className={clsx('relative inline-block', className)}
      style={{ width: size, height: size * 1.15 }}
      animate={still ? undefined : { y: [0, -6, 0] }}
      transition={still ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      <svg viewBox="0 0 120 138" width="100%" height="100%">
        <defs>
          <linearGradient id="bindu-glass" x1="0" x2="1">
            <stop offset="0" stopColor="#fdf8ec" />
            <stop offset="1" stopColor="#efe3c6" />
          </linearGradient>
          <linearGradient id="bindu-liquid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#5fb36b" />
            <stop offset="1" stopColor="#1f5f5b" />
          </linearGradient>
          <clipPath id="bindu-body">
            <path d="M46 10 H74 V44 L106 112 Q110 126 96 126 H24 Q10 126 14 112 L46 44 Z" />
          </clipPath>
        </defs>
        {/* shadow */}
        <ellipse cx="60" cy="132" rx="38" ry="5" fill="rgba(34,30,23,.18)" />
        {/* glass */}
        <path d="M46 10 H74 V44 L106 112 Q110 126 96 126 H24 Q10 126 14 112 L46 44 Z" fill="url(#bindu-glass)" stroke="#221e17" strokeWidth="3" strokeLinejoin="round" />
        {/* liquid */}
        <g clipPath="url(#bindu-body)">
          <motion.path
            d="M0 84 Q30 78 60 84 T120 84 V140 H0 Z"
            fill="url(#bindu-liquid)"
            animate={still ? undefined : { d: ['M0 84 Q30 78 60 84 T120 84 V140 H0 Z', 'M0 84 Q30 90 60 84 T120 84 V140 H0 Z', 'M0 84 Q30 78 60 84 T120 84 V140 H0 Z'] }}
            transition={still ? undefined : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx="40" cy="104" r="4" fill="#a8dcb0" opacity=".8" />
          <circle cx="76" cy="112" r="3" fill="#a8dcb0" opacity=".8" />
        </g>
        {/* rim */}
        <rect x="41" y="5" width="38" height="9" rx="4" fill="#c9a24a" stroke="#221e17" strokeWidth="3" />
        {/* face */}
        <g>
          <motion.g
            animate={still ? undefined : { scaleY: [1, 1, 0.1, 1, 1] }}
            transition={still ? undefined : { duration: 4.5, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] }}
            style={{ transformOrigin: '60px 66px' }}
          >
            {mood === 'cheer' ? (
              <>
                <path d="M41 66 Q46 60 51 66" fill="none" stroke="#221e17" strokeWidth="3" strokeLinecap="round" />
                <path d="M69 66 Q74 60 79 66" fill="none" stroke="#221e17" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="46" cy="66" r="4.5" fill="#221e17" />
                <circle cx="74" cy="66" r="4.5" fill="#221e17" />
                <circle cx="47.5" cy="64.5" r="1.4" fill="#fff" />
                <circle cx="75.5" cy="64.5" r="1.4" fill="#fff" />
              </>
            )}
          </motion.g>
          <circle cx="38" cy="75" r="4" fill="#e8907a" opacity=".55" />
          <circle cx="82" cy="75" r="4" fill="#e8907a" opacity=".55" />
          {mood === 'thinking' ? (
            <path d="M54 78 H66" stroke="#221e17" strokeWidth="3" strokeLinecap="round" />
          ) : (
            <path d="M52 76 Q60 84 68 76" fill="none" stroke="#221e17" strokeWidth="3" strokeLinecap="round" />
          )}
        </g>
        {/* leaf sprouting from the rim, like the logo */}
        <path d="M74 8 Q92 -4 100 10 Q86 18 74 8 Z" fill="#3d7a45" stroke="#221e17" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}

/** A handwritten speech bubble next to Bindu. */
export function Speech({ children, className, tail = 'left' }: { children: ReactNode; className?: string; tail?: 'left' | 'bottom' }) {
  return (
    <div className={clsx('relative rounded-2xl border-2 border-ink/80 bg-[#fffaf0] px-4 py-2.5 font-hand text-[1.05rem] leading-snug text-ink shadow-[3px_3px_0_rgba(34,30,23,.15)]', className)}>
      {children}
      {tail === 'left' ? (
        <span aria-hidden className="absolute -left-[11px] top-5 h-4 w-4 rotate-45 border-b-2 border-l-2 border-ink/80 bg-[#fffaf0]" />
      ) : (
        <span aria-hidden className="absolute -bottom-[10px] left-8 h-4 w-4 rotate-45 border-b-2 border-r-2 border-ink/80 bg-[#fffaf0]" />
      )}
    </div>
  );
}
