import { describe, expect, it } from 'vitest';
import {
  buildVocabulary,
  chunkTextbook,
  collapseShadowText,
  compareSectionNumbers,
  repairHeadingTitle,
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
    expect(normalizeHeadingNumber('1 2 . 2 MAGNETIC FIELD')).toBe('12.2 MAGNETIC FIELD');
    expect(normalizeHeadingNumber('1 3 . 2 HOW DO OUR ACTIVITIES')).toBe('13.2 HOW DO OUR ACTIVITIES');
  });
});

describe('repairHeadingTitle', () => {
  const vocab = buildVocabulary(['Plants respond to light.', 'The force on a current-carrying conductor', 'variation in a population']);
  it('joins letter-spaced fragments and collapses repeated dashes', () => {
    expect(repairHeadingTitle('COORDINATION IN PL ANTS', vocab)).toBe('COORDINATION IN PLANTS');
    expect(repairHeadingTitle('FORCE ON A CURRENT-----C ARRYING CONDUCTOR', vocab)).toBe('FORCE ON A CURRENT-CARRYING CONDUCTOR');
    expect(repairHeadingTitle('ACCUMUL ATION OF VARIATION', vocab)).toBe('ACCUMULATION OF VARIATION');
    expect(repairHeadingTitle('Rules for the Inheritance of Traits –––––', vocab)).toBe('Rules for the Inheritance of Traits –');
  });
  it('leaves real words alone', () => {
    expect(repairHeadingTitle('PLANTS IN A POPULATION', vocab)).toBe('PLANTS IN A POPULATION');
  });
});

describe('compareSectionNumbers', () => {
  it('orders section numbers numerically', () => {
    expect(compareSectionNumbers('2.1.4', '2.1.5')).toBeLessThan(0);
    expect(compareSectionNumbers('2.2', '2.1.6')).toBeGreaterThan(0);
    expect(compareSectionNumbers('2.10', '2.9')).toBeGreaterThan(0);
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

  it('joins wrapped headings, accepts "pH", and drops out-of-order headings', () => {
    const p = [
      'Acids 1\nIntroductory text about acids, bases and salts in daily life.',
      'Science2\n2.1.3 How do Metal Carbonates and Metal\nHydrogencarbonates React with Acids?\nThey react with acids to give carbon dioxide gas.',
      'Acids 3\n2.1.5 Reaction of Metallic Oxides with Acids\nCopper oxide dissolves in dilute hydrochloric acid.\n2.1.4 How do Acids and Bases React with each other?',
      'Science4\n2.4.2 pH of Salts\nSome salts are acidic and some salts are basic in nature.',
    ];
    const warnings: string[] = [];
    const chunks = chunkTextbook(p, 2, { onWarning: (m) => warnings.push(m) });
    expect(chunks.map((c) => c.sectionPath)).toEqual([
      null,
      '2.1.3 How do Metal Carbonates and Metal Hydrogencarbonates React with Acids?',
      '2.1.5 Reaction of Metallic Oxides with Acids',
      '2.4.2 pH of Salts',
    ]);
    expect(warnings).toEqual(['p3: heading 2.1.4 appears after 2.1.5; ignored (out of reading order)']);
  });
});
