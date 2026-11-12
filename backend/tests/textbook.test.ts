import { describe, expect, it } from 'vitest';
import {
  chunkTextbook,
  collapseShadowText,
  detectPageOffset,
  normalizeHeadingNumber,
  parseHeaderPageNumber,
  titleCase,
} from '../src/ingest/textbook.ts';

describe('collapseShadowText', () => {
  it('collapses 5x repeated heading runs, as found in NCERT PDFs', () => {
    expect(collapseShadowText('5.3 RESPIR5.3 RESPIR5.3 RESPIR5.3 RESPIR5.3 RESPIRAAAAATIONTIONTIONTIONTION')).toBe('5.3 RESPIRATION');
    expect(collapseShadowText('1 . 31 . 31 . 31 . 31 . 3 HAHAHAHAHAVE')).toBe('1 . 3 HAVE');
  });

  it('keeps ordinary numbers and text', () => {
    expect(collapseShadowText('about 100000 people')).toBe('about 100000 people');
    expect(collapseShadowText('Ohm’s law states that')).toBe('Ohm’s law states that');
  });
});

describe('normalizeHeadingNumber', () => {
  it('removes icon glyphs and letter spacing before section numbers', () => {
    expect(normalizeHeadingNumber('?11.3 CIRCUIT DIAGRAM')).toBe('11.3 CIRCUIT DIAGRAM');
    expect(normalizeHeadingNumber('1 . 3 HAVE YOU OBSERVED')).toBe('1.3 HAVE YOU OBSERVED');
    expect(normalizeHeadingNumber('5.2.1 Autotrophic Nutrition')).toBe('5.2.1 Autotrophic Nutrition');
  });
});

describe('parseHeaderPageNumber', () => {
  it('reads running headers on even and odd pages', () => {
    expect(parseHeaderPageNumber('Science80')).toBe(80);
    expect(parseHeaderPageNumber('Life Processes 99')).toBe(99);
    expect(parseHeaderPageNumber('Science194194194194194')).toBe(194);
  });

  it('ignores ordinary first lines', () => {
    expect(parseHeaderPageNumber('Life Processes')).toBeNull();
    expect(parseHeaderPageNumber('Activity 1.2')).toBeNull();
  });
});

describe('detectPageOffset', () => {
  it('finds the offset from agreeing headers', () => {
    expect(detectPageOffset(['Life Processes\n5CHAPTER', 'Science80\nx', 'Life Processes 81\nx', 'Science82\nx'])).toBe(78);
  });

  it('refuses to guess when headers are missing or disagree', () => {
    expect(() => detectPageOffset(['a', 'b', 'c'])).toThrow('Cannot determine printed page numbers');
    expect(() => detectPageOffset(['x', 'Science80\nx', 'Science12\nx', 'Science40\nx'])).toThrow();
  });
});

describe('titleCase', () => {
  it('title-cases ALL CAPS headings but keeps small words lowercase', () => {
    expect(titleCase('TYPES OF CHEMICAL REACTIONS')).toBe('Types of Chemical Reactions');
    expect(titleCase('Autotrophic Nutrition')).toBe('Autotrophic Nutrition');
  });
});

describe('chunkTextbook', () => {
  const pages = [
    'Life Processes\n5CHAPTER\nLiving things need energy. They take in food.\nn This is a bullet point.Reprint 2026-27',
    'Science80\n5.1 WHA5.1 WHA5.1 WHA5.1 WHA5.1 WHAT ARE LIFE PROCESSES?T ARE LIFE PROCESSES?T ARE LIFE PROCESSES?T ARE LIFE PROCESSES?T ARE LIFE PROCESSES?\nMaintenance processes are needed. Energy is needed for\nthem.Reprint 2026-27',
    'Life Processes 81\nThe energy comes from food, which is broken\ndown by oxidation.\n5.2.1 Autotrophic Nutrition\nGreen plants make food by photosynthesis using sunlight.Reprint 2026-27',
    'Science82\nQ U E S T I O N S\n1. What are life processes?\nWhat you have learnt\nLiving things need energy for maintenance.Reprint 2026-27',
  ];

  it('uses printed page numbers, sections, and never crosses sections', () => {
    const chunks = chunkTextbook(pages, 5);
    expect(chunks.map((c) => [c.sectionPath, c.pageStart, c.pageEnd])).toEqual([
      [null, 79, 79],
      ['5.1 What Are Life Processes?', 80, 81],
      ['5.1 What Are Life Processes? > 5.2.1 Autotrophic Nutrition', 81, 82],
      ['What you have learnt', 82, 82],
    ]);
    expect(chunks[0].content).toContain('• This is a bullet point.');
    expect(chunks[1].content).toBe('Maintenance processes are needed. Energy is needed for them. The energy comes from food, which is broken down by oxidation.');
    expect(chunks.every((c) => !c.content.includes('Reprint'))).toBe(true);
    expect(chunks.map((c) => c.chunkIndex)).toEqual([0, 1, 2, 3]);
  });
});
