'use client';

// The whole app is one open textbook on a desk. Every route is a spread (two pages) in the book;
// changing route turns the page in the direction of the book's reading order. Links, browser
// back/forward, direct URLs, arrow keys and swipes all go through the URL, so they all turn pages.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { clsx } from 'clsx';
import { MAIN_SECTIONS, visibleSections, sectionForPath, sectionById, type SectionId } from '@/lib/sections';
import { useAuth } from '@/lib/auth';
import { useLowPower, useReducedMotion, useSpread } from '@/lib/device';
import { Leaf } from './Leaf';
import { Cover } from './Cover';
import { LayoutProvider, PreviewProvider } from './page-context';
import { SectionPage } from '@/components/sections/registry';
import { Header } from './Header';
import { AddMoneySheet, TopUpPrompt } from '@/components/wallet/Wallet';
import { POLICIES } from '@/lib/policies';
import { linkCursor } from '@/lib/cursors';
import { useStore } from '@/lib/store';
import { decideIntroVideo, introVideo } from '@/lib/intro-video';
import { IntroPlayer } from '@/components/intro/IntroPlayer';

interface Turn {
  from: SectionId;
  to: SectionId;
  dir: 'forward' | 'backward';
}

const INTRO_KEY = 'vv-book-opened';

function useStageSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.getAttribute('role') === 'slider';
}

export function BookShell() {
  const pathname = usePathname();
  const router = useRouter();
  const target = sectionForPath(pathname).id;
  const { user } = useAuth();
  const navSections = visibleSections(!!user);

  const spread = useSpread();
  const reduced = useReducedMotion();
  const lowPower = useLowPower();
  const layout = spread ? 'spread' : 'single';

  const [current, setCurrent] = useState<SectionId>(target);
  const [turn, setTurn] = useState<Turn | null>(null);
  const turnRef = useRef<Turn | null>(null);
  turnRef.current = turn;

  // Opening the cover: shown once per browser session. On the first home-page visit of a device the intro VIDEO
  // plays first (src/lib/intro-video.ts); the cover waits until it has ended or been skipped.
  const [intro, setIntro] = useState<'closed' | 'opening' | 'done'>('done');
  const introVid = useStore(introVideo);
  useEffect(() => {
    decideIntroVideo(window.location.pathname);
    let seen = true;
    try { seen = sessionStorage.getItem(INTRO_KEY) === '1'; } catch { /* storage blocked */ }
    if (!seen && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setIntro('closed');
  }, []);

  const areaRef = useRef<HTMLDivElement>(null);
  const area = useStageSize(areaRef);
  const bookRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const leftPageRef = useRef<HTMLDivElement>(null);
  // The header only exists once the book is measured, so measure it through a callback ref.
  const [headEl, setHeadEl] = useState<HTMLDivElement | null>(null);
  const [headH, setHeadH] = useState(0);
  useLayoutEffect(() => {
    if (!headEl) return;
    const measure = () => setHeadH(headEl.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(headEl);
    return () => ro.disconnect();
  }, [headEl]);

  // The book fills the desk: only a thin strip is left for the page edges and the shadow.
  const edgeRoom = spread ? 2 * (3 + (MAIN_SECTIONS.length - 1) * 1.5) + 4 : 0;
  const bookH = Math.max(0, area.h);
  const bookW = Math.max(0, area.w - edgeRoom);
  const pageW = spread ? bookW / 2 : bookW;

  // Route changed -> start a turn (or finish the one in progress first).
  useEffect(() => {
    const showing = turnRef.current?.to ?? current;
    if (target === showing) return;
    const from = showing;
    if (turnRef.current) setCurrent(turnRef.current.to);
    if (reduced || intro !== 'done' || bookW === 0) {
      setTurn(null);
      setCurrent(target);
      return;
    }
    const dir = sectionById(target).order > sectionById(from).order ? 'forward' : 'backward';
    setTurn({ from, to: target, dir });
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishTurn = useCallback(() => {
    const t = turnRef.current;
    if (!t) return;
    setCurrent(t.to);
    setTurn(null);
  }, []);

  // Announce the new section for screen readers and move focus to the page heading.
  const [announce, setAnnounce] = useState('');
  useEffect(() => {
    if (turn) return;
    setAnnounce(sectionById(current).label);
    const h = bookRef.current?.querySelector<HTMLElement>('[data-page-heading]');
    if (h && document.activeElement === document.body) h.focus({ preventScroll: true });
  }, [current, turn]);

  // Hover cursor for clickable things: a pencil in the section's colour, a fountain pen on the
  // account pages (globals.css reads --cursor-link; set on <html> so sheets and the footer get it too).
  const cursorSection = turn?.to ?? current;
  useEffect(() => {
    document.documentElement.style.setProperty('--cursor-link', linkCursor(cursorSection));
  }, [cursorSection]);

  // Keyboard: left / right arrow turn to the previous / next main section.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const idx = navSections.findIndex((s) => s.id === target);
      const next = idx < 0 ? navSections[0] : navSections[idx + (e.key === 'ArrowRight' ? 1 : -1)];
      if (next) { e.preventDefault(); router.push(next.path); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, router, navSections.length]);

  // Touch: a horizontal swipe on the page turns it.
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch' || isTyping(e.target)) return;
    swipe.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || e.pointerType !== 'touch') return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - s.t > 700) return;
    const idx = navSections.findIndex((x) => x.id === target);
    const next = idx < 0 ? navSections[0] : navSections[idx + (dx < 0 ? 1 : -1)];
    if (next) router.push(next.path);
  };

  // The opening: the closed book slides to the centre of the desk while its cover swings open.
  const openBook = useCallback(() => {
    if (intro !== 'closed') return;
    setIntro('opening');
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* storage blocked */ }
  }, [intro]);
  useEffect(() => {
    if (intro !== 'closed' || !introVid.decided || introVid.open) return;
    const id = window.setTimeout(openBook, 1400);
    return () => window.clearTimeout(id);
  }, [intro, openBook, introVid.decided, introVid.open]);
  useLayoutEffect(() => {
    const book = bookRef.current;
    if (!book || !spread) return;
    if (intro === 'closed') {
      gsap.set(book, { x: -pageW / 2 });
      if (leftPageRef.current) gsap.set(leftPageRef.current, { opacity: 0 });
    } else if (intro === 'opening') {
      gsap.to(book, { x: 0, duration: 1.25, ease: 'power2.inOut' });
      if (leftPageRef.current) gsap.to(leftPageRef.current, { opacity: 1, duration: 0.3, delay: 0.62 });
    } else {
      gsap.set(book, { x: 0 });
      if (leftPageRef.current) gsap.set(leftPageRef.current, { opacity: 1 });
    }
  }, [intro, spread, pageW]);

  const strips = lowPower || !spread ? 1 : 5;
  const duration = spread ? (lowPower ? 0.8 : 1.15) : 0.7;

  const page = (id: SectionId, side: 'left' | 'right' | 'single', preview = false) => (
    <PreviewProvider value={preview}>
      <SectionPage id={id} side={side} />
    </PreviewProvider>
  );

  // Which page sits where during a turn (the leaf covers the one being turned).
  const t = turn;
  const leftBase = t ? (t.dir === 'forward' ? t.from : t.to) : current;
  const rightBase = t ? (t.dir === 'forward' ? t.to : t.from) : current;
  const singleBase = t ? (t.dir === 'forward' ? t.to : t.from) : current;
  const blankPage = <div className="paper grain absolute inset-0" />;

  const sectionCount = MAIN_SECTIONS.length;
  // back matter (wallet, policies) sits after the last main section
  const readIndex = Math.min(sectionCount - 1, Math.max(0, sectionById(current).order));
  const leftStack = 3 + readIndex * 1.5;
  const rightStack = 3 + (sectionCount - 1 - readIndex) * 1.5;

  return (
    <LayoutProvider value={layout}>
      <div className="desk grain relative flex h-dvh w-full flex-col overflow-hidden">
        <DeskProps />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center">
          <div ref={areaRef} className="book-stage relative flex min-h-0 w-full flex-1 items-start justify-center">
            {bookW > 0 && (
              <div
                ref={bookRef}
                className="relative"
                style={{ width: bookW, height: bookH, ['--head-h' as string]: `${headH}px` }}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
              >
                {/* the navbar, printed across the top of the book (stays put while pages turn) */}
                <div
                  ref={setHeadEl}
                  className="absolute inset-x-0 top-0 z-50 transition-opacity duration-500"
                  style={{ opacity: intro === 'done' ? 1 : 0, pointerEvents: intro === 'done' ? undefined : 'none' }}
                >
                  <Header current={turn?.to ?? current} />
                  <div aria-hidden className="mx-[var(--page-pad)] h-[5px] border-y border-gold/60" />
                </div>

                {/* page edges: the stack grows on the left as you read further */}
                {spread && (
                  <>
                    <div aria-hidden className="absolute -bottom-[3px] top-[3px] rounded-l-sm" style={{ left: -leftStack, width: leftStack, background: 'repeating-linear-gradient(90deg, #e5d6b4 0 1px, #cbb68b 1px 2px)', boxShadow: '-4px 6px 18px rgba(0,0,0,.45)', opacity: intro === 'done' ? 1 : 0 }} />
                    <div aria-hidden className="absolute -bottom-[3px] top-[3px] rounded-r-sm" style={{ right: -rightStack, width: rightStack, background: 'repeating-linear-gradient(90deg, #cbb68b 0 1px, #e5d6b4 1px 2px)', boxShadow: '4px 6px 18px rgba(0,0,0,.45)' }} />
                  </>
                )}
                <div className="absolute inset-0 shadow-[0_30px_60px_-20px_rgba(0,0,0,.65),0_10px_24px_rgba(0,0,0,.35)]" style={{ left: spread && intro === 'closed' ? pageW : 0 }} />

                {spread ? (
                  <>
                    <div ref={leftPageRef} className="absolute left-0 top-0 overflow-hidden rounded-l-[3px]" style={{ width: pageW, height: bookH }}>
                      <div key={`${leftBase}-left`} className="absolute inset-0">{page(leftBase, 'left')}</div>
                    </div>
                    <div className="absolute top-0 overflow-hidden rounded-r-[3px]" style={{ left: pageW, width: pageW, height: bookH }}>
                      <div key={`${rightBase}-right`} className="absolute inset-0">{page(rightBase, 'right')}</div>
                    </div>
                    {/* the gutter */}
                    <div aria-hidden className="pointer-events-none absolute top-0 z-10 h-full w-16 -translate-x-1/2" style={{ left: pageW, background: 'linear-gradient(90deg, transparent, rgba(60,40,10,.18) 45%, rgba(40,25,5,.32) 50%, rgba(60,40,10,.18) 55%, transparent)' }} />
                  </>
                ) : (
                  <div className="absolute inset-0 overflow-hidden rounded-[3px]">
                    <div key={`${singleBase}-single`} className="absolute inset-0">{page(singleBase, 'single')}</div>
                  </div>
                )}

                <div ref={shadowRef} className="turn-shadow" data-dir={turn?.dir ?? 'forward'} style={{ ['--spine' as string]: spread ? `${pageW}px` : '0px' }} />

                {turn && (
                  <Leaf
                    key={`${turn.from}-${turn.to}`}
                    direction={turn.dir}
                    mode={layout}
                    pageWidth={pageW}
                    pageHeight={bookH}
                    strips={strips}
                    duration={duration}
                    shadowRef={shadowRef}
                    onDone={finishTurn}
                    front={spread
                      ? page(turn.from, turn.dir === 'forward' ? 'right' : 'left', true)
                      : page(turn.dir === 'forward' ? turn.from : turn.to, 'single', true)}
                    back={spread ? page(turn.to, turn.dir === 'forward' ? 'left' : 'right', true) : blankPage}
                  />
                )}

                {/* the front cover, before the book is opened */}
                {intro === 'closed' && (
                  <div className="absolute top-0 z-40 cursor-pointer" style={{ left: spread ? pageW : 0, width: pageW, height: bookH }} onClick={openBook}>
                    <Cover onOpen={openBook} />
                  </div>
                )}
                {intro === 'opening' && (
                  <Leaf
                    direction="forward"
                    mode={layout}
                    pageWidth={pageW}
                    pageHeight={bookH}
                    strips={spread && !lowPower ? 5 : 1}
                    duration={1.3}
                    shadowRef={shadowRef}
                    onDone={() => setIntro('done')}
                    front={<Cover />}
                    back={spread ? page(current, 'left', true) : blankPage}
                  />
                )}
              </div>
            )}
          </div>
          <SiteFooter current={current} />
        </div>
        <p className="sr-only" aria-live="polite">{announce}</p>
      </div>
      {/* Add-money sheet (Razorpay), opened from the balance pill or a "not enough money" reply */}
      <AddMoneySheet />
      <TopUpPrompt />
      {/* the home-page intro video: once per device, and again from the Home page button */}
      <IntroPlayer />
    </LayoutProvider>
  );
}

/** The site footer, stamped on the desk under the book: the policy pages, on every page. */
function SiteFooter({ current }: { current: SectionId }) {
  return (
    <footer className="relative z-20 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-4 py-1.5 text-[0.72rem] leading-tight text-gold sm:gap-x-4 sm:text-[0.78rem]">
      <nav aria-label="The fine print" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 sm:gap-x-4">
        {POLICIES.map((p) => (
          <Link
            key={p.id}
            href={p.path}
            aria-current={current === p.id ? "page" : undefined}
            className={clsx("underline-offset-4 hover:text-paper hover:underline", current === p.id && "text-paper underline decoration-gold")}
          >
            {p.short}
          </Link>
        ))}
      </nav>
      <span aria-hidden className="hidden h-3 w-px bg-gold/40 sm:block" />
      {/* brand only; the legal business name stays on About, Contact and the policy pages (Razorpay checks those) */}
      <span className="text-gold/75">© 2026 VigyanVerse AI</span>
    </footer>
  );
}

/** A red pencil and a brass protractor resting on the desk, on wide screens only. */
function DeskProps() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden 2xl:block">
      <svg viewBox="0 0 300 40" className="absolute bottom-10 left-6 w-64 rotate-[-18deg] drop-shadow-[0_6px_6px_rgba(0,0,0,.5)]">
        <rect x="30" y="12" width="230" height="16" rx="2" fill="#b8432f" />
        <rect x="30" y="12" width="230" height="5" fill="#d0614a" />
        <rect x="250" y="11" width="24" height="18" rx="2" fill="#c9a24a" />
        <rect x="270" y="11" width="22" height="18" rx="4" fill="#e7a9a0" />
        <path d="M30 12 L4 20 L30 28 Z" fill="#e9d2a8" />
        <path d="M12 17.5 L4 20 L12 22.5 Z" fill="#2a2620" />
      </svg>
      <svg viewBox="0 0 200 110" className="absolute right-10 top-28 w-48 rotate-[14deg] opacity-80 drop-shadow-[0_6px_6px_rgba(0,0,0,.5)]">
        <path d="M10 100 A90 90 0 0 1 190 100 Z" fill="rgba(201,162,74,.28)" stroke="#c9a24a" strokeWidth="2" />
        <path d="M50 100 A50 50 0 0 1 150 100" fill="none" stroke="#c9a24a" strokeWidth="1.5" />
        {Array.from({ length: 19 }, (_, i) => {
          const a = (Math.PI * i) / 18;
          const r1 = i % 3 === 0 ? 74 : 82;
          return <line key={i} x1={100 - 90 * Math.cos(a)} y1={100 - 90 * Math.sin(a)} x2={100 - r1 * Math.cos(a)} y2={100 - r1 * Math.sin(a)} stroke="#c9a24a" strokeWidth="1.2" />;
        })}
      </svg>
    </div>
  );
}
