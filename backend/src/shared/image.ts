// Small image helpers for document-process (kept out of the function so they are unit-tested).

/** The bytes must really be the image type the row says (never trust a mime label). */
export function signatureMatches(mime: string, b: Uint8Array): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (mime === 'image/png') return b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (mime === 'image/jpeg') return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === 'image/webp') return b.length > 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  return false;
}

/** base64 of a byte array without building one giant argument list. */
export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
