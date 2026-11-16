// Offline check of the diagram figure pointer against the real NCERT chunks (no model calls).
// Usage: npx tsx scripts/check-figures.ts <chunks.json from `db query ... --json`>
// Retrieval is approximated by word overlap (the live turn uses match_chunks_weighted).
import { readFileSync } from 'node:fs';
import { findFigure } from '../src/agents/diagram.ts';
import type { ChunkHit } from '../src/shared/retrieval.ts';

const rows = (JSON.parse(readFileSync(process.argv[2], 'utf8')) as { rows: ChunkHit[] }).rows;
const QUESTIONS = [
  'Draw a labelled diagram of the human heart',
  'Draw the structure of a nephron',
  'Draw a neat diagram of the human alimentary canal',
  'Draw a labelled diagram of a neuron',
  'Draw the human respiratory system',
  'Draw a diagram of the human excretory system',
  'Draw the structure of a stomata',
  'Draw a labelled diagram of the longitudinal section of a flower',
  'Draw the reflex arc',
  'Draw a labelled diagram of the human brain',
  'Draw an electric circuit with a cell, a bulb and a key',
  'Draw the magnetic field lines around a bar magnet',
  'Draw the experimental set-up for electrolysis of water',
  'Draw the human eye',
  'Draw a diagram of a solar cooker',
];
const COMMON = new Set(['draw', 'labelled', 'diagram', 'neat', 'structure', 'human', 'with', 'around', 'experimental']);
const words = (s: string) => new Set((s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !COMMON.has(w)));
for (const q of QUESTIONS) {
  const w = words(q);
  const hits = rows
    .map((r) => ({ r, s: [...words(r.content)].filter((x) => w.has(x)).length }))
    .sort((a, b) => b.s - a.s).slice(0, 5).map((x) => x.r);
  const f = findFigure(q, hits);
  console.log(`${q}\n   -> ${f ? `Figure ${f.figure} "${f.caption}" (ch ${f.chapterNumber}, p ${f.pageStart})` : 'no pointer'}`);
}
