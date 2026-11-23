'use client';

// The home-page introduction video (../remotionvideos, composition Intro, Paper Pop-Up style, 130 s, captions burned
// in). It plays ONCE per device on the first visit to the home page, muted (browsers allow muted autoplay; sound only
// after a tap), before the book's cover opens. "Watch the intro again" on the Home page replays it with sound.
// Not autoplayed for prefers-reduced-motion or Save-Data visitors (they can still press the button).
import { createStore } from './store';
import { explainerUrl } from './explainers';

export const INTRO_VIDEO = {
  title: 'Welcome to VigyanVerse AI',
  seconds: 130,
  video: 'home/intro-720p.mp4',
  poster: 'home/intro-poster.jpg',
};
export const introVideoUrl = () => explainerUrl(INTRO_VIDEO.video);
export const introPosterUrl = () => explainerUrl(INTRO_VIDEO.poster);

const SEEN_KEY = 'vv-intro-video-seen';

interface IntroState {
  decided: boolean;   // first-visit check done (the cover waits for it)
  open: boolean;      // the player is on screen
  replay: boolean;    // opened by the student (start with sound, Skip at once)
  seen: boolean;      // this device has watched or skipped it before
}
export const introVideo = createStore<IntroState>({ decided: false, open: false, replay: false, seen: false });

/** Called once by the book on load: play the intro if this is the first home-page visit on this device. */
export function decideIntroVideo(pathname: string) {
  if (introVideo.get().decided) return;
  let seen = false;
  try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { /* storage blocked: treat as not seen */ }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  introVideo.set({ decided: true, seen, open: pathname === '/' && !seen && !reduced && !saveData, replay: false });
}

export function playIntroAgain() {
  introVideo.set({ open: true, replay: true });
}

export function closeIntroVideo() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked */ }
  introVideo.set({ open: false, replay: false, seen: true });
}
