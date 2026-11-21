// The site's policy pages (About, Contact, Pricing, Terms, Privacy, Refunds), written for
// Razorpay's website review and for students and parents. Plain data, no React, so the same
// text feeds the book pages (client) and the plain copy in each route's server HTML.
//
// Facts here must stay true to the product: prices mirror `task_prices` / `topup_packs`
// (the Pricing page shows the live tables once they load), voice recordings are never
// stored, photos stay until the student deletes them, money is credited only by the
// verified Razorpay webhook. Change a policy here and bump UPDATED.

export const UPDATED = '21 November 2026';

export const BUSINESS = {
  brand: 'VigyanVerse AI',
  /** Must match the name on the Razorpay account. */
  legalName: 'Freelance Services – Narendra Kumar',
  owner: 'Narendra Kumar',
  email: 'narendra.adp@gmail.com',
  /** Shown on the Contact page when set (owner to provide). */
  phone: '+91 90322 68522' as string | null,
  address: 'Palakollu, West Godavari district, Andhra Pradesh 534260, India' as string | null,
  website: 'https://vigyanverseai.live',
  jurisdiction: 'Andhra Pradesh',
  replyTime: 'within 2 working days',
};

export type PolicyId = 'about' | 'contact' | 'pricing' | 'terms' | 'privacy' | 'refunds';

export type Block =
  | { p: string }
  | { list: string[] }
  | { rows: [string, string][]; caption?: string; kind?: 'packs' | 'prices' }
  | { contact: true };

export interface PolicySection { heading: string; blocks: Block[] }

export interface PolicyDoc {
  id: PolicyId;
  path: string;
  /** Page title (also the browser tab). */
  title: string;
  /** Short name for links and the footer. */
  short: string;
  /** One line for the index page and the meta description. */
  summary: string;
  intro: string;
  sections: PolicySection[];
}

/** ₹12.50, ₹110, ₹0.50 (same format as the wallet). */
export function inr(paise: number): string {
  const r = paise / 100;
  return `₹${Number.isInteger(r) ? r.toLocaleString('en-IN') : r.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Snapshot of `topup_packs` (2026-11-21); the Pricing page swaps in the live table once it loads. */
export const PACKS_SNAPSHOT = [
  { price_paise: 1000, credit_paise: 1000 },
  { price_paise: 5000, credit_paise: 5000 },
  { price_paise: 10000, credit_paise: 11000 },
  { price_paise: 20000, credit_paise: 23000 },
];

/** Plain words for each `task_prices` row, in list order, with the 2026-11-21 price. */
export const PRICE_LINES: { task: string; what: string; paise: number; after?: string }[] = [
  { task: 'tutor_turn', what: 'A question to the AI tutor (typed)', paise: 50 },
  { task: 'photo_question', what: 'A question about an uploaded photo', paise: 50 },
  { task: 'voice_input', what: 'A spoken question (turning your voice into text)', paise: 50, after: ', plus the answer' },
  { task: 'voice_read', what: 'Hearing an answer read aloud (Listen)', paise: 100 },
  { task: 'photo_read', what: 'Reading an uploaded photo of notes or a question', paise: 150 },
  { task: 'quiz_batch', what: 'A practice quiz, per 5 questions', paise: 200 },
  { task: 'bindu_explain', what: '"Bindu explains": an answer as a spoken whiteboard lesson', paise: 300, after: ' (replays free)' },
];

export function packRows(packs: { price_paise: number; credit_paise: number }[]): [string, string][] {
  return packs.map((p) => {
    const extra = p.credit_paise - p.price_paise;
    return [`Pay ${inr(p.price_paise)}`, `get ${inr(p.credit_paise)} in credits${extra > 0 ? ` (${inr(extra)} extra)` : ''}`];
  });
}

/** Price rows; `live` (task -> paise) overrides the snapshot when the table has loaded. */
export function priceRows(live?: Map<string, number>): [string, string][] {
  return PRICE_LINES
    .filter((l) => !live || live.has(l.task))
    .map((l) => [l.what, `${inr(live?.get(l.task) ?? l.paise)}${l.after ?? ''}`]);
}

const contactLine = `${BUSINESS.email} (we reply ${BUSINESS.replyTime})`;

export const POLICIES: PolicyDoc[] = [
  {
    id: 'about',
    path: '/about',
    title: 'About us',
    short: 'About',
    summary: 'Who runs VigyanVerse AI and what it does.',
    intro:
      'VigyanVerse AI is a website that helps Class 10 students learn Science (Physics, Chemistry and Biology). ' +
      'It is built and run in India by ' + BUSINESS.legalName + '.',
    sections: [
      {
        heading: 'What you can do here',
        blocks: [
          { list: [
            'Read short chapter guides and watch explainer videos for Physics, Chemistry and Biology (free).',
            'Ask the AI tutor a question by typing, speaking or uploading a photo of your notes. Answers come from the NCERT Class 10 Science textbook and show the pages they came from.',
            'Practise with quizzes whose answers are checked by code, and see which chapters to revise next.',
          ] },
        ],
      },
      {
        heading: 'How we charge',
        blocks: [
          { p: 'There is no subscription. You top up a small prepaid balance (from ₹10) and each AI task uses a few rupees of it. The full price list is on the Pricing page.' },
        ],
      },
      {
        heading: 'Who we are',
        blocks: [
          { rows: [
            ['Business name', BUSINESS.legalName],
            ['Owner', BUSINESS.owner],
            ['Website', BUSINESS.website],
            ['Email', BUSINESS.email],
          ] },
          { p: 'VigyanVerse AI is an independent service. It is not run by, or connected with, NCERT, CBSE or any school board.' },
        ],
      },
    ],
  },
  {
    id: 'contact',
    path: '/contact',
    title: 'Contact us',
    short: 'Contact',
    summary: 'Email, phone and address for help, payments and privacy.',
    intro: 'Questions, a payment problem, or a request about your data? Write to us and we reply ' + BUSINESS.replyTime + '.',
    sections: [
      { heading: 'How to reach us', blocks: [{ contact: true }] },
      {
        heading: 'To help us help you faster',
        blocks: [
          { list: [
            'Write from the email address you use to sign in.',
            'For a payment problem, add the Razorpay payment ID (it starts with "pay_") and the date and amount.',
            'For a privacy request (see, correct or delete your data), say which one you want.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'pricing',
    path: '/pricing',
    title: 'Pricing',
    short: 'Pricing',
    summary: 'Top-up packs and what each AI task costs, in rupees.',
    intro:
      'VigyanVerse AI is pay-as-you-go. You add credits to your wallet, and each AI task uses some of them. ' +
      '1 credit = ₹1. There is no subscription and nothing renews automatically.',
    sections: [
      {
        heading: 'Top-up packs',
        blocks: [
          { rows: packRows(PACKS_SNAPSHOT), caption: 'You pay the first amount; your wallet gets the second.', kind: 'packs' },
          { p: 'Payments are made through Razorpay (UPI, debit and credit cards, net banking and wallets). The amount shown is the amount you pay: there are no extra charges at checkout.' },
        ],
      },
      {
        heading: 'What each task costs',
        blocks: [
          { rows: priceRows(), caption: 'Taken from your wallet only when the task runs.', kind: 'prices' },
          { p: 'Always free: creating an account, the subject pages and explainer videos, checking your quiz answers, your progress and your revision list.' },
        ],
      },
      {
        heading: 'Good to know',
        blocks: [
          { list: [
            'The app checks your balance before every paid task, so you are never charged without enough credits.',
            'If a task fails on our side, its credits go back to your wallet automatically.',
            'Credits do not expire while your account is open.',
            'Credits are added to your wallet as soon as Razorpay confirms the payment, usually within a minute. Nothing is shipped: everything is delivered online, in your account.',
          ] },
        ],
      },
    ],
  },
  {
    id: 'terms',
    path: '/terms',
    title: 'Terms and Conditions',
    short: 'Terms',
    summary: 'The rules for using VigyanVerse AI and paying for it.',
    intro:
      'These terms are an agreement between you and ' + BUSINESS.legalName + ' ("we", "us"), which runs VigyanVerse AI at ' +
      BUSINESS.website + '. By creating an account or using the site, you agree to them.',
    sections: [
      {
        heading: '1. Who can use it',
        blocks: [
          { p: 'VigyanVerse AI is made for school students, mainly Class 10. If you are under 18, use it with the knowledge of your parent or guardian, who accepts these terms on your behalf and is responsible for payments made from your account.' },
        ],
      },
      {
        heading: '2. Your account',
        blocks: [
          { list: [
            'Give a real email address and keep your password private. You are responsible for what happens in your account.',
            'One account is for one student. Do not share it or sell it.',
          ] },
        ],
      },
      {
        heading: '3. Credits and payments',
        blocks: [
          { list: [
            'Credits are a prepaid balance in Indian rupees (1 credit = ₹1), bought through Razorpay. Prices are on the Pricing page and may change; a change never affects credits you already have.',
            'Credits can only be used for tasks on VigyanVerse AI. They cannot be transferred to another account or exchanged for cash, except as described in the Cancellation and Refund Policy.',
            'We do not see or store your card, UPI or bank details: Razorpay handles them.',
          ] },
        ],
      },
      {
        heading: '4. About the AI answers',
        blocks: [
          { p: 'Answers are written by AI from the NCERT textbook, and numbers are worked out by code. We work hard to keep them right, but AI can still make mistakes. Check important answers against your textbook or teacher. VigyanVerse AI helps you learn; it does not promise any exam result.' },
        ],
      },
      {
        heading: '5. Fair use',
        blocks: [
          { list: [
            'Use VigyanVerse AI only for learning.',
            'Do not upload photos of other people, or anything harmful, hateful or illegal.',
            'Do not use it to cheat in a test or exam, try to break or overload the site, or copy its content in bulk.',
          ] },
          { p: 'We may pause or close an account that breaks these rules. Unused credits from a paid top-up are then handled under the Cancellation and Refund Policy.' },
        ],
      },
      {
        heading: '6. Content',
        blocks: [
          { p: 'The site, its design, videos and tools belong to us. Textbook passages remain the property of their owners and are shown only to explain them. Your own questions and photos stay yours; you let us process them only to answer you.' },
        ],
      },
      {
        heading: '7. Limits of our responsibility',
        blocks: [
          { p: 'We provide the service "as is". To the extent the law allows, our total responsibility for any claim is limited to the amount you paid us in the 3 months before the claim.' },
        ],
      },
      {
        heading: '8. Changes and law',
        blocks: [
          { p: 'We may update these terms; the date at the top shows the latest version, and we will tell signed-in users about important changes. These terms follow the laws of India, and the courts of ' + BUSINESS.jurisdiction + ' decide any dispute.' },
          { p: 'Questions: ' + contactLine + '.' },
        ],
      },
    ],
  },
  {
    id: 'privacy',
    path: '/privacy',
    title: 'Privacy Policy',
    short: 'Privacy',
    summary: 'What we collect, why, who helps us, and how to delete it.',
    intro:
      'Most of our users are school students, many under 18, so we collect as little as we can, never show ads and never sell anyone’s data. ' +
      'This page explains what we keep and how to have it deleted.',
    sections: [
      {
        heading: 'What we collect',
        blocks: [
          { list: [
            'Account: your email address and sign-in details (or your Google or GitHub sign-in, if you choose it).',
            'Bookplate: your first name, class, board and, if you give it, your birth year.',
            'Learning: your questions, the answers, quizzes and results, and your chapter progress, so you can come back to them.',
            'Photos you upload, and the text read from them, until you delete them (deleting a photo also deletes its chat).',
            '"Bindu explains" lessons you buy: the spoken audio of that answer, so you can replay it.',
            'Wallet: your balance, top-ups and what each task cost. Razorpay handles card, UPI and bank details; we never see them.',
          ] },
          { p: 'Voice questions are turned into text and the recording is thrown away straight away: we never store your voice.' },
        ],
      },
      {
        heading: 'Why we use it',
        blocks: [
          { p: 'Only to run VigyanVerse AI: to answer your questions, save your chats and progress, run your wallet, keep your account safe and reply when you write to us. We do not use your data for advertising, and we do not sell or rent it to anyone.' },
        ],
      },
      {
        heading: 'Who helps us run the service',
        blocks: [
          { rows: [
            ['InsForge', 'Our database, file storage, sign-in and server code (servers in the Asia-Pacific region)'],
            ['Sarvam AI (India)', 'Runs the AI models that read your question or photo and write the answer, and the voice features'],
            ['Vercel', 'Hosts the website'],
            ['Razorpay', 'Processes payments'],
            ['Google / GitHub', 'Sign-in, only if you choose it'],
          ] },
          { p: 'Each of them gets only what it needs for its job.' },
        ],
      },
      {
        heading: 'How we protect it',
        blocks: [
          { p: 'Every student’s data is kept separate: the database itself only lets your account read your own chats, photos and wallet. Your photos are private files, and all traffic is encrypted (HTTPS).' },
        ],
      },
      {
        heading: 'Cookies',
        blocks: [
          { p: 'We use only the cookies needed to keep you signed in, and the browser’s storage for small settings (for example, that you have already seen the opening animation). No advertising or tracking cookies.' },
        ],
      },
      {
        heading: 'Your choices and rights',
        blocks: [
          { list: [
            'See or correct your data: most of it is in the app; or write to us.',
            'Delete a photo yourself at any time in the AI Tutor.',
            'Delete your whole account: email us from your account’s email address. We delete your account and all its data (chats, quizzes, photos, saved lessons, wallet) within 7 days. Razorpay keeps its own payment records as the law requires.',
            'A parent or guardian can write to us to see, correct or delete their child’s data.',
          ] },
        ],
      },
      {
        heading: 'Grievance officer',
        blocks: [
          { p: 'In line with India’s Digital Personal Data Protection Act, 2023, privacy questions and complaints go to ' + BUSINESS.owner + ', ' + contactLine + '.' },
        ],
      },
    ],
  },
  {
    id: 'refunds',
    path: '/refunds',
    title: 'Cancellation and Refund Policy',
    short: 'Refunds',
    summary: 'Cancelling, refunds of top-ups, failed payments and delivery.',
    intro:
      'VigyanVerse AI sells prepaid credits, not subscriptions, so there is never anything to cancel and nothing renews. ' +
      'This page explains when you get your money back.',
    sections: [
      {
        heading: 'Refund of a top-up',
        blocks: [
          { list: [
            'You can ask for a full refund of a top-up within 7 days of paying, as long as none of the credits from that top-up have been used.',
            'Once credits from a top-up are used, or after 7 days, that top-up cannot be refunded.',
            'Bonus credits (for example the extra ₹10 in the ₹100 pack) are removed when their top-up is refunded.',
          ] },
        ],
      },
      {
        heading: 'Always refunded',
        blocks: [
          { list: [
            'Money taken from your bank or UPI but no credits added: Razorpay either completes the top-up or returns the money automatically, usually within 5 to 7 working days. If not, write to us with the payment ID.',
            'Paying twice for the same top-up: we refund the extra payment in full.',
            'An AI task that fails on our side: its credits go back to your wallet automatically, straight away.',
          ] },
        ],
      },
      {
        heading: 'How to ask for a refund',
        blocks: [
          { p: 'Email ' + BUSINESS.email + ' from your account’s email address with the Razorpay payment ID (starts with "pay_"), the date and the amount. We reply ' + BUSINESS.replyTime + '.' },
          { p: 'Approved refunds are started within 2 working days and go back to the same card, UPI or bank account you paid from. Banks usually show the money within 5 to 7 working days.' },
        ],
      },
      {
        heading: 'Cancelling',
        blocks: [
          { p: 'There is no subscription or automatic payment to cancel: you only pay when you choose to top up. You can stop using VigyanVerse AI at any time, and you can ask us to delete your account (see the Privacy Policy).' },
        ],
      },
      {
        heading: 'Delivery (no shipping)',
        blocks: [
          { p: 'Everything we sell is digital and delivered online. Credits appear in your wallet as soon as Razorpay confirms the payment, usually within a minute. Nothing is shipped to an address.' },
        ],
      },
    ],
  },
];

export function policyById(id: PolicyId): PolicyDoc {
  return POLICIES.find((p) => p.id === id)!;
}
