'use client';

// Full-screen player for the home-page intro (see src/lib/intro-video.ts). The video fills the whole window (edge to
// edge, letterboxed on black so the burned-in captions and the end card are never cropped) and starts at once.
// Autoplay rules (Chrome autoplay policy, iOS Safari): it starts MUTED with playsInline; "Tap for sound" unmutes inside
// the click (a user gesture) and, in that same gesture, asks for real fullscreen (+ landscape on Android). If play() is
// refused anyway (e.g. iPhone Low Power Mode) a big play button is shown instead. Skip appears after a few seconds (at
// once on a replay); Esc skips too. When it ends or is skipped the book's cover opens as usual.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCw, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '@/lib/store';
import { INTRO_VIDEO, closeIntroVideo, introPosterUrl, introVideo, introVideoUrl } from '@/lib/intro-video';

const SKIP_AFTER_MS = 3000;

type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

/** Real fullscreen + landscape; only works inside a tap, silently ignored where unsupported (iPhone). */
function goFullscreen(el: HTMLElement | null) {
  if (!el || document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape').catch(() => {}))
    .catch(() => {});
}
function leaveFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

export function IntroPlayer() {
  const { open, replay } = useStore(introVideo);
  const shell = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const finish = useCallback(() => {
    ref.current?.pause();
    leaveFullscreen();
    setLeaving(true);
    window.setTimeout(() => { closeIntroVideo(); setLeaving(false); }, 450);
  }, []);

  useEffect(() => {
    if (!open) return;
    setMuted(!replay); setBlocked(false); setCanSkip(replay); setLeaving(false); setProgress(0);
    const v = ref.current;
    if (v) {
      v.muted = !replay;
      v.currentTime = 0;
      v.play().catch(() => {
        // sound refused (no gesture) -> try muted; refused again -> show a play button
        if (!v.muted) { v.muted = true; setMuted(true); v.play().catch(() => setBlocked(true)); } else setBlocked(true);
      });
    }
    const id = window.setTimeout(() => setCanSkip(true), SKIP_AFTER_MS);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.fullscreenElement) finish(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(id); window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, replay, finish]);

  if (!open) return null;

  const soundOn = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false; setMuted(false);
    goFullscreen(shell.current);
    if (v.paused) v.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  };
  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    if (v.muted) soundOn(); else { v.muted = true; setMuted(true); }
  };
  const playBlocked = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false; setMuted(false);
    goFullscreen(shell.current);
    v.play().then(() => { setBlocked(false); setCanSkip(true); }).catch(() => { v.muted = true; setMuted(true); v.play().then(() => setBlocked(false)).catch(() => {}); });
  };

  return (
    <div
      ref={shell}
      role="dialog"
      aria-modal="true"
      aria-label={`${INTRO_VIDEO.title}: introduction video`}
      className="fixed inset-0 z-[100] bg-black transition-opacity duration-500"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      {/* edge to edge: contain (not cover) so captions and the website card are never cut off */}
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full cursor-pointer object-contain"
        src={introVideoUrl()}
        poster={introPosterUrl()}
        muted
        autoPlay
        playsInline
        preload="auto"
        onEnded={finish}
        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
        onClick={() => (muted ? soundOn() : undefined)}
        aria-label="Introduction video with captions"
      />

      {/* controls sit at the TOP corners: the captions are burned into the bottom of the video */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/55 to-transparent p-3 pb-10 sm:p-5 sm:pb-14"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        {muted ? (
          <button
            type="button"
            onClick={soundOn}
            className="pointer-events-auto inline-flex animate-pulse items-center gap-2 rounded-full bg-gold px-4 py-2 font-display text-base text-ink shadow-lg hover:animate-none hover:bg-paper sm:text-lg"
          >
            <Volume2 className="h-5 w-5" aria-hidden /> Tap for sound
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleSound}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-gold/60 bg-black/30 px-3 py-1.5 font-display text-sm text-gold hover:bg-gold/10"
            aria-label="Mute the video"
          >
            <VolumeX className="h-4 w-4" aria-hidden /> Mute
          </button>
        )}
        <button
          type="button"
          onClick={finish}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-paper/50 bg-black/30 px-4 py-2 font-display text-base text-paper transition-opacity duration-500 hover:bg-paper/10 sm:text-lg"
          style={{ opacity: canSkip ? 1 : 0, pointerEvents: canSkip ? undefined : 'none' }}
          aria-hidden={!canSkip}
          tabIndex={canSkip ? undefined : -1}
        >
          {replay ? 'Close' : 'Skip intro'} <SkipForward className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* phones held upright: a 16:9 video is only a strip, so suggest turning the phone */}
      <p aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] hidden text-center font-display text-sm text-paper/70 portrait:block sm:portrait:hidden">
        <RotateCw className="mr-1.5 inline h-4 w-4 align-[-3px]" /> Turn your phone for a bigger view
      </p>

      {/* a thin gold line along the bottom edge shows how much is left */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
        <span className="block h-full bg-gold transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      </span>

      {blocked && (
        <button type="button" onClick={playBlocked} className="absolute inset-0 grid place-items-center bg-black/35" aria-label="Play the introduction video">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald text-paper shadow-lg ring-4 ring-paper/70">
            <Play className="ml-1 h-9 w-9" fill="currentColor" strokeWidth={0} />
          </span>
        </button>
      )}
    </div>
  );
}
