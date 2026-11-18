import * as THREE from 'three';

// The kits expect three.js as a global (they were written for a plain HTML page with an import map).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).THREE = THREE;
