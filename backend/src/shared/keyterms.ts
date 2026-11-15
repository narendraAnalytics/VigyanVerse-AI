// Saaras v4 `keyterms` (Phase 6d): words the speech recogniser should expect, so Class 10 Science
// vocabulary is not misheard (live check 2026-11-15: "వక్రీభవనం" came back as "వక్రీబాణం").
// Rules from the docs: <= 50 terms, <= 64 characters each, one term per list item; it BIASES
// recognition, it never guarantees a word. Hints only: nothing here is shown to a student or used as
// curriculum text, so these are NOT chapter titles. A Telugu speaker should review the list before launch.
export const SCIENCE_KEYTERMS: readonly string[] = [
  // Physics
  'కాంతి', 'వక్రీభవనం', 'పరావర్తనం', 'కటకం', 'దర్పణం', 'నాభ్యంతరం', 'పట్టకం', 'ఇంద్రధనుస్సు',
  'విద్యుత్ ప్రవాహం', 'విభవ భేదం', 'నిరోధం', 'ఓమ్ నియమం', 'విద్యుత్ ఘటం', 'అయస్కాంత క్షేత్రం', 'విద్యుత్ శక్తి',
  // Chemistry
  'ఆమ్లం', 'క్షారం', 'లవణం', 'రసాయన చర్య', 'రసాయన సమీకరణం', 'ఆక్సీకరణం', 'క్షయకరణం', 'లోహం', 'అలోహం', 'కార్బన్ సమ్మేళనాలు',
  // Biology
  'కిరణజన్య సంయోగక్రియ', 'శ్వాసక్రియ', 'జీర్ణక్రియ', 'విసర్జన', 'ప్రత్యుత్పత్తి', 'అనువంశికత', 'పరిణామం', 'ఆహార గొలుసు', 'జీవ వైవిధ్యం', 'ఓజోన్ పొర',
  // English terms students mix into Telugu speech
  'Ohm law', 'photosynthesis', 'refraction', 'reflection', 'pH', 'carbon', 'electric current', 'resistance',
];

export const MAX_KEYTERMS = 50;
export const MAX_KEYTERM_CHARS = 64;

/** The list Sarvam will accept: trimmed, unique, within the limits. */
export function validKeyterms(terms: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of terms) {
    const term = t.trim();
    if (!term || term.length > MAX_KEYTERM_CHARS || seen.has(term)) continue;
    seen.add(term);
    out.push(term);
    if (out.length === MAX_KEYTERMS) break;
  }
  return out;
}
