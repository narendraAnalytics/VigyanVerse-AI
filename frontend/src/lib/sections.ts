// The book's sections, in reading order. The order decides which way a page turns.
// Main sections appear in the navbar (bookmark ribbons); the others are front-matter pages
// (account, bookplate, parent permission slip) reached by links.

export type SectionId =
  | 'home' | 'physics' | 'chemistry' | 'biology' | 'tutor' | 'learning'
  | 'sign-in' | 'sign-up' | 'reset-password' | 'onboarding' | 'parent' | 'wallet'
  | 'about' | 'contact' | 'pricing' | 'terms' | 'privacy' | 'refunds';

export interface Section {
  id: SectionId;
  path: string;
  label: string;
  /** Position in the book: front matter is negative, so turning to it goes backwards. */
  order: number;
  color: string;
  main: boolean;
}

export const SECTIONS: Section[] = [
  { id: 'sign-in', path: '/sign-in', label: 'Sign in', order: -5, color: 'var(--emerald)', main: false },
  { id: 'sign-up', path: '/sign-up', label: 'Create account', order: -4, color: 'var(--emerald)', main: false },
  { id: 'reset-password', path: '/reset-password', label: 'Reset password', order: -3, color: 'var(--emerald)', main: false },
  { id: 'onboarding', path: '/onboarding', label: 'Your bookplate', order: -2, color: 'var(--gold-deep)', main: false },
  { id: 'parent', path: '/parent', label: 'Parent permission', order: -1, color: 'var(--gold-deep)', main: false },
  { id: 'home', path: '/', label: 'Home', order: 0, color: 'var(--emerald)', main: true },
  { id: 'physics', path: '/physics', label: 'Physics', order: 1, color: 'var(--physics)', main: true },
  { id: 'chemistry', path: '/chemistry', label: 'Chemistry', order: 2, color: 'var(--chemistry)', main: true },
  { id: 'biology', path: '/biology', label: 'Biology', order: 3, color: 'var(--biology)', main: true },
  { id: 'tutor', path: '/tutor', label: 'AI Tutor', order: 4, color: 'var(--tutor)', main: true },
  { id: 'learning', path: '/learning', label: 'My Learning', order: 5, color: 'var(--learning)', main: true },
  // Back matter: reached from the balance pill and the account menu (signed in).
  { id: 'wallet', path: '/wallet', label: 'Credits', order: 6, color: 'var(--emerald)', main: false },
  // The fine print (policy pages), linked from the footer under the book on every page.
  { id: 'about', path: '/about', label: 'About us', order: 7, color: 'var(--gold-deep)', main: false },
  { id: 'contact', path: '/contact', label: 'Contact us', order: 8, color: 'var(--gold-deep)', main: false },
  { id: 'pricing', path: '/pricing', label: 'Pricing', order: 9, color: 'var(--gold-deep)', main: false },
  { id: 'terms', path: '/terms', label: 'Terms and Conditions', order: 10, color: 'var(--gold-deep)', main: false },
  { id: 'privacy', path: '/privacy', label: 'Privacy Policy', order: 11, color: 'var(--gold-deep)', main: false },
  { id: 'refunds', path: '/refunds', label: 'Cancellation and Refund Policy', order: 12, color: 'var(--gold-deep)', main: false },
];

export const MAIN_SECTIONS = SECTIONS.filter((s) => s.main);

/** Sections that only appear in the navbar (and arrow-key / swipe order) once signed in. */
export const SIGNED_IN_ONLY: SectionId[] = ['tutor', 'learning'];

export function visibleSections(signedIn: boolean): Section[] {
  return signedIn ? MAIN_SECTIONS : MAIN_SECTIONS.filter((s) => !SIGNED_IN_ONLY.includes(s.id));
}

export function sectionForPath(pathname: string): Section {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return SECTIONS.find((s) => s.path === clean) ?? SECTIONS.find((s) => s.id === 'home')!;
}

export function sectionById(id: SectionId): Section {
  return SECTIONS.find((s) => s.id === id)!;
}
