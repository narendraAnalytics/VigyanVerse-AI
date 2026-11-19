// Short narrated explainer videos (made in ../remotionvideos with Remotion, Soft Clay style).
// Files live in the PUBLIC InsForge bucket `explainers`. The public link answers with a tiny redirect and
// the bytes come from InsForge's CDN (range requests work, so students can seek), so the Nano server
// does not carry the video traffic. Videos load only when the student presses play (5 GB/month free bandwidth).
import type { Subject } from './api';
import { publicClient } from './insforge';

export interface Explainer {
  title: string;
  chapter: string;
  seconds: number;
  video: string;   // object key in the bucket
  poster: string;  // object key of the still shown before play
  tab?: string;    // short name for the Watch tab (defaults to the title)
}

export const EXPLAINERS: Partial<Record<Subject, Explainer>> = {
  physics: {
    title: 'Ohm’s law',
    chapter: 'Chapter 11, Electricity',
    seconds: 44,
    video: 'physics/ohms-law-720p.mp4',
    poster: 'physics/ohms-law-poster.jpg',
  },
  chemistry: {
    title: 'The hidden chemistry around us',
    tab: 'Chemistry around us',
    chapter: 'Chapters 1 to 4',
    seconds: 54,
    video: 'chemistry/chemistry-720p.mp4',
    poster: 'chemistry/chemistry-poster.jpg',
  },
  biology: {
    title: 'The science of life',
    tab: 'The science of life',
    chapter: 'Chapters 5 to 8 and 13',
    seconds: 49,
    video: 'biology/biology-720p.mp4',
    poster: 'biology/biology-poster.jpg',
  },
};

/** The Home page plate: the welcome video (Toy Blocks style). */
export const HOME_EXPLAINER: Explainer = {
  title: 'The secret behind a rainbow',
  chapter: 'Chapter 10, dispersion of light',
  seconds: 48,
  video: 'home/rainbow-720p.mp4',
  poster: 'home/rainbow-poster.jpg',
};

export function explainerUrl(key: string): string {
  // pure string construction in the SDK (no network call); data is never null here
  return publicClient().storage.from('explainers').getPublicUrl(key).data?.publicUrl ?? '';
}
