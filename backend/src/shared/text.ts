// Text cleanup shared by ingestion and the answer paths.
//
// The NCERT PDFs draw long reaction arrows ("2AgBr(s) —Sunlight→ 2Ag(s) + Br2(g)", "—Heat→") from Adobe Symbol
// "arrow extender" glyphs, which the PDF text layer maps to the Unicode PRIVATE USE AREA (U+F8E7). No font draws
// those code points, so the browser showed "Sunlight □ →□□□□" when the tutor quoted such an equation (found
// 2026-11-24: 95 of them in 12 chunks, Chapter 1 pages 5-12, Chapter 2, 3, 4 and 13). Private-use characters never
// carry meaning in our text, so they are removed; the arrow (U+2192) and the condition word ("Sunlight") stay.

/** Every Private Use Area character in the Basic Multilingual Plane (U+E000-U+F8FF). */
export const PRIVATE_USE = /[-]/g;

/**
 * Remove private-use characters and the double spaces they leave behind. Line breaks are kept.
 * "2AgBr(s) Sunlight  → 2Ag(s)" -> "2AgBr(s) Sunlight → 2Ag(s)"
 */
export function stripPrivateUse(text: string): string {
  if (!/[-]/.test(text)) return text;
  return text.replace(PRIVATE_USE, '').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/gm, '');
}
