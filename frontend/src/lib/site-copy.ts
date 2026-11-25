// Words shared by the book (drawn in the browser) and the plain copy in each route's server HTML
// (src/components/seo/PlainCopy.tsx), so search engines read exactly what students see.
import type { Subject } from '@/lib/api';

export const HOME_HEADING = 'Class 10 Science, explained the way you ask it';
export const HOME_INTRO =
  'Answers from your NCERT textbook, hints when you want to work it out yourself, and practice questions with checked answers.';

export const HOME_CONTENTS = [
  { n: 'I', href: '/physics', title: 'Physics', page: 1, about: 'Light, the human eye, electricity and magnetism' },
  { n: 'II', href: '/chemistry', title: 'Chemistry', page: 3, about: 'Reactions and equations, acids and bases, metals, carbon' },
  { n: 'III', href: '/biology', title: 'Biology', page: 5, about: 'Life processes, control, reproduction, heredity, our environment' },
  { n: 'IV', href: '/story', title: 'Our Story', page: 7, about: 'The idea behind VigyanVerse AI, how it helps, and what comes next' },
  { n: 'V', href: '/tutor', title: 'AI Tutor', page: 9, about: 'Type or speak a question, or upload a photo of your notes' },
  { n: 'VI', href: '/learning', title: 'My Learning', page: 11, about: 'Practice quizzes, chapter mastery and what to revise next' },
];

export const HOME_PROMISES = [
  'Answers come from your textbook and show the pages they came from.',
  'A question from outside the textbook gets a short answer that says so.',
  'Numbers are worked out by code, not guessed by the AI.',
  'Quiz questions are checked twice before you see them, and marking is done by code.',
  'Your photos stay private to you, and voice recordings are never stored.',
];

export const SUBJECT_INTRO: Record<Subject, string> = {
  physics: 'How light bends and reflects, how your eye sees colour, and how electric current and magnets behave.',
  chemistry: 'What happens in a chemical reaction, why some things are acids and others bases, and how metals and carbon compounds behave.',
  biology: 'How living things feed, breathe, respond, reproduce and pass traits on, and how they depend on their environment.',
};

// CBSE Class 10 Science 2026-27, the same rows as the seed migration
// backend/migrations/20261112070415_seed-cbse-class10-science-2026-27.sql (the book loads them from the
// database; this copy is only for the server HTML). Keep the two in step.
export const SYLLABUS: Record<Subject, { number: number | null; title: string; formativeOnly?: boolean }[]> = {
  chemistry: [
    { number: 1, title: 'Chemical Reactions and Equations' },
    { number: 2, title: 'Acids, Bases and Salts' },
    { number: 3, title: 'Metals and Non-metals' },
    { number: 4, title: 'Carbon and its Compounds' },
    { number: null, title: 'Periodic Classification of Elements', formativeOnly: true },
  ],
  biology: [
    { number: 5, title: 'Life Processes' },
    { number: 6, title: 'Control and Coordination' },
    { number: 7, title: 'How do Organisms Reproduce?' },
    { number: 8, title: 'Heredity' },
    { number: 13, title: 'Our Environment' },
  ],
  physics: [
    { number: 9, title: 'Light – Reflection and Refraction' },
    { number: 10, title: 'The Human Eye and the Colourful World' },
    { number: 11, title: 'Electricity' },
    { number: 12, title: 'Magnetic Effects of Electric Current' },
  ],
};
