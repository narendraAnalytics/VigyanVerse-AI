// "Our Story" (after Biology): the idea, how it works, who it helps and the AI behind it (left page),
// and what we plan next (right page). Plain data so the same text feeds the book pages and the plain
// copy in the route's server HTML (read by Razorpay's website review and readers without JavaScript).
//
// Keep it true to the product: no invented numbers, users or dates. Plans are marked as plans and
// are never sold before they exist. English only for now: do not name a language students cannot use
// yet (owner 2026-11-16). No link to the owner's other website until Razorpay approves this one.
import { BUSINESS, inr, PACKS_SNAPSHOT, PRICE_LINES } from './policies';

export interface StoryItem { title: string; text: string }

const firstPack = inr(PACKS_SNAPSHOT[0].price_paise);
const questionPrice = inr(PRICE_LINES.find((l) => l.task === 'tutor_turn')!.paise);

export const STORY = {
  title: 'Our Story',
  summary: 'Why VigyanVerse AI exists, how it works, who it helps, the AI behind it, and what comes next.',
  idea: {
    heading: 'The idea',
    intro:
      'Every Class 10 student deserves a patient science teacher: one who is there the night before an exam, ' +
      'explains in simple words, never makes you feel silly for asking, and always points back to your own textbook. ' +
      'VigyanVerse AI is our try at giving every student that teacher.',
  },
  how: [
    { title: 'You ask', text: 'Type a question, say it out loud, or upload a photo of your notes or a question paper.' },
    { title: 'We find the page', text: 'The app searches your NCERT Class 10 Science textbook for the part that answers it.' },
    { title: 'AI explains', text: 'An AI tutor explains it in short, simple words and shows the chapter and page it used.' },
    { title: 'Code checks', text: 'Numbers are worked out by code, and quiz answers are marked by code, not guessed by the AI.' },
  ] as StoryItem[],
  benefits: [
    { title: 'Your own textbook', text: 'Answers come from the NCERT book with page numbers, so you can check them and revise from the same pages.' },
    { title: 'Learn to think', text: 'Hint mode asks you small questions so you reach the answer yourself, instead of just copying it.' },
    { title: 'Practise smart', text: 'Quizzes with checked answers, and a "Revise next" list that brings back each chapter at the right time.' },
    { title: 'Any way you like', text: 'Ask by typing, by voice or with a photo, and watch "Bindu explains" whiteboard lessons.' },
    { title: 'Fair prices', text: `No subscription: start with ${firstPack} and pay only for what you use (a typed question is ${questionPrice}). Videos and progress are free.` },
    { title: 'Safe and private', text: 'Each student’s data is kept apart, there are no ads, and we never sell anyone’s data.' },
  ] as StoryItem[],
  ai: {
    heading: 'The AI behind it',
    lines: [
      { title: 'AI writes the words', text: 'AI models served by Sarvam AI, an Indian AI company, write the explanations, read photos, draft quizzes and handle voice (turning speech into text and reading answers aloud).' },
      { title: 'Code checks the facts', text: 'Our own code finds the textbook page, does the maths, balances equations, marks quizzes, tracks your progress and plans your revision.' },
    ] as StoryItem[],
    motto: 'AI writes the words. Code checks the facts. The textbook has the last word.',
  },
  next: {
    heading: 'What’s next',
    intro: 'Here is what we want to build next. These are plans, so there are no dates yet.',
    plans: [
      { title: 'More languages', text: 'Learn and ask in your own Indian language. Every translation will be checked by native speakers, never left to a machine alone.' },
      { title: 'More subjects', text: 'More subjects after Science, starting with the ones Class 10 students ask for most.' },
      { title: 'More boards', text: 'The Andhra Pradesh SSC syllabus, built from the official textbooks.' },
      { title: '1:1 learning', text: 'One-to-one learning shaped around one student: their weak chapters, their pace and their exam date.' },
      { title: 'More videos and diagrams', text: 'New explainer videos, and drawn diagrams for more topics such as the glass slab, the prism and electric circuits.' },
    ] as StoryItem[],
    promise: 'Nothing on this page is on sale yet. A new feature is added to the Pricing page only when it is ready, and we never charge for a plan.',
  },
  find: {
    heading: 'Find us',
    website: BUSINESS.website,
    email: BUSINESS.email,
  },
};
