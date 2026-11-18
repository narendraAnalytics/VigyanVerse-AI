// Loads the STAGE, TEXT3D and SOUND kits (copied unchanged from prompt.txt). They are classic scripts that
// read a global THREE, so ./setup must run first: ES modules evaluate their imports in order.
import './setup';
import './stage.js';
import './text3d.js';
import './sound.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = window as any;
export const K = w.K;
export const SOUND = w.SOUND;
