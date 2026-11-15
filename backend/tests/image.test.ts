import { describe, expect, it } from 'vitest';
import { signatureMatches, toBase64 } from '../src/shared/image.ts';

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = Uint8Array.from([...Buffer.from('RIFF'), 1, 2, 3, 4, ...Buffer.from('WEBP'), 0, 0]);

describe('signatureMatches', () => {
  it('accepts the real types', () => {
    expect(signatureMatches('image/png', png)).toBe(true);
    expect(signatureMatches('image/jpeg', jpg)).toBe(true);
    expect(signatureMatches('image/webp', webp)).toBe(true);
  });
  it('rejects a label that does not match the bytes, empty files and other types', () => {
    expect(signatureMatches('image/png', jpg)).toBe(false);
    expect(signatureMatches('image/jpeg', png)).toBe(false);
    expect(signatureMatches('image/webp', png)).toBe(false);
    expect(signatureMatches('image/png', new Uint8Array())).toBe(false);
    expect(signatureMatches('application/pdf', Buffer.from('%PDF-1.7 xx'))).toBe(false);
  });
});

describe('toBase64', () => {
  it('matches Buffer base64, including large arrays', () => {
    const big = new Uint8Array(200_000).map((_, i) => i % 251);
    expect(toBase64(big)).toBe(Buffer.from(big).toString('base64'));
    expect(toBase64(png)).toBe(Buffer.from(png).toString('base64'));
  });
});
