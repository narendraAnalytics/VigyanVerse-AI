// The site's policy pages (About, Contact, Pricing, Terms, Privacy, Refunds), written for
// Razorpay's website review and for students and parents. Plain data, no React, so the same
// text feeds the book pages (client) and the plain copy in each route's server HTML.
//
// Facts here must stay true to the product: prices mirror `task_prices` / `topup_packs`
// (the Pricing page shows the live tables once they load), voice recordings are never
// stored, photos stay until the student deletes them, money is credited only by the
// verified Razorpay webhook. Change a policy here and bump UPDATED.

export const UPDATED = '23 November 2026';

export const BUSINESS = {
  brand: 'VigyanVerse AI',
  /** Must match the name on the Razorpay account. */
  legalName: 'Freelance Services – Narendra Kumar',
  owner: 'Narendra Kumar',
  email: 'admin@vigyanverseai.live',
  /** Shown on the Contact page when set (owner to provide). */
  phone: '+91 90322 68522' as string | null,
  address: 'Palakollu, West Godavari district, Andhra Pradesh 534260, India' as string | null,
  website: 'https://vigyanverseai.live',
  jurisdiction: 'Andhra Pradesh',
  replyTime: 'within 2 working days',
};

export type PolicyId = 'about' | 'contact' | 'faq' | 'pricing' | 'terms' | 'privacy' | 'refunds';

export type Block =
  | { p: string }
  | { list: string[] }
  /** Questions and answers, each opening on a click (FAQ). */
  | { qa: [string, string][] }
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

/** ₹12.50, ₹110, ₹0.50 (same format as the credits page). */
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

/** A task's snapshot price for FAQ answers ("₹0.50"), from PRICE_LINES so the two never disagree. */
const cost = (task: string) => inr(PRICE_LINES.find((l) => l.task === task)!.paise);
const smallestPack = PACKS_SNAPSHOT[0];
const bonusPacks = PACKS_SNAPSHOT.filter((p) => p.credit_paise > p.price_paise)
  .map((p) => `pay ${inr(p.price_paise)} and get ${inr(p.credit_paise)}`).join(', or ');

/**
 * FAQ (owner 2026-11-24). Every answer states what the app really does (see CLAUDE.md files) or
 * repeats the policies above; English only for now (no student-visible mention of other languages).
 */
const FAQ: PolicyDoc = {
  id: 'faq',
  path: '/faq',
  title: 'Frequently asked questions',
  short: 'FAQ',
  summary: 'Quick answers about credits, payments, the AI tutor, quizzes and your data.',
  intro: 'Short answers to the questions students and parents ask most. Tap a question to open it. Still stuck? Write to us from the Contact page.',
  sections: [
    {
      heading: 'Getting started',
      blocks: [{ qa: [
        ['What is VigyanVerse AI?',
          'A website that helps Class 10 students learn Science: Physics, Chemistry and Biology. You can read chapter guides, watch explainer videos, ask an AI tutor questions and practise with quizzes.'],
        ['Which syllabus does it follow?',
          'The NCERT Class 10 Science textbook: the 13 chapters in the CBSE 2026-27 syllabus. Tutor answers come from this textbook and show the chapter and page they came from.'],
        ['Is it free?',
          'Creating an account, the subject pages, the explainer videos, checking your quiz answers, your progress and your revision list are all free. The AI tasks (asking the tutor, quizzes, photos, voice) use credits that you buy in small packs. There is no subscription.'],
        ['How do I sign up?',
          'Sign up with your email (we send you a 6-digit code), or with Google or GitHub. Then fill in your bookplate: your first name, board and class.'],
        ['Do I need a parent’s permission?',
          'There is no separate parent step: you use your own account. If you are under 18, use VigyanVerse AI with your parent’s or guardian’s knowledge, as our Terms say. Parents can write to us at any time about their child’s account or data.'],
        ['Does it work on a phone?',
          'Yes. It works in the browser on phones, tablets and computers. Nothing to install.'],
      ] }],
    },
    {
      heading: 'Credits and payments',
      blocks: [{ qa: [
        ['What are credits?',
          `Credits pay for the AI tasks. 1 credit = ₹1. You top up once and each task takes a little from your credits. Credits do not expire while your account is open.`],
        ['How much does each task cost?',
          `A typed question to the tutor: ${cost('tutor_turn')}. A question about your photo: ${cost('photo_question')}. Reading an uploaded photo: ${cost('photo_read')}. A spoken question: ${cost('voice_input')}, plus the answer. Hearing an answer read aloud (Listen): ${cost('voice_read')}. "Bindu explains" lesson: ${cost('bindu_explain')} (replays free). A quiz: ${cost('quiz_batch')} for every 5 questions. The full list is on the Pricing page.`],
        ['Which packs can I buy?',
          `Packs start at ${inr(smallestPack.price_paise)} (about ${Math.floor(smallestPack.credit_paise / PRICE_LINES[0].paise)} tutor questions). The bigger packs give extra credits: ${bonusPacks}.`],
        ['How do I pay? Is it safe?',
          'Tap your credits balance at the top of the page and pick a pack. You pay through Razorpay, an RBI-regulated payment company, with UPI, a debit or credit card or net banking. VigyanVerse AI never sees your card number, bank details or UPI PIN.'],
        ['Why do I have to fill in my bookplate before topping up?',
          'Credits belong to a student account, and the bookplate (your name, board and class) is what creates it. It takes a few seconds, and the top-up sheet links straight to it.'],
        ['I paid, but my credits did not show up. What now?',
          'Credits are usually added within a minute. If your bank is still confirming the payment, it can take a few minutes. If money was taken but no credits were added, Razorpay either completes the top-up or returns the money automatically, usually within 5 to 7 working days. If not, email us with the Razorpay payment ID (it starts with "pay_").'],
        ['What happens if a task fails?',
          'If the AI cannot answer because of a problem on our side, the credits for that task go back to your account automatically, straight away. The app also checks your balance before every paid task, so you are never charged without enough credits.'],
        ['Can I get a refund?',
          'Yes, a full refund of a top-up within 7 days of paying, if none of its credits have been used. Credits cannot be withdrawn as cash or sent to someone else. The details are in the Cancellation and Refund Policy.'],
        ['Is there a subscription to cancel?',
          'No. You only pay when you choose to top up. Nothing renews by itself.'],
      ] }],
    },
    {
      heading: 'The AI tutor',
      blocks: [{ qa: [
        ['What is the difference between "Explain it" and "Hint me"?',
          '"Explain it" gives a short, clear answer with the textbook pages. "Hint me" does not give the answer straight away: it asks you small questions and gives hints so you work it out yourself. If you get stuck, just ask it to tell you the answer.'],
        ['Where do the answers come from?',
          'From the NCERT Class 10 Science textbook. The tutor searches the textbook first and answers from the passages it finds, then shows the chapter and page. Calculations are worked out and checked by code, not guessed by the AI.'],
        ['What is "Bindu explains"?',
          `A button under a tutor answer. Bindu, our science friend, turns the answer into a short whiteboard lesson: she says it aloud while the board is written out line by line, with the textbook chapter and page at the end. It costs ${cost('bindu_explain')} once per answer, and you can watch it again for free, even on another device.`],
        ['Can I ask about a photo of my notes or homework?',
          `Yes. Upload a photo (images only) and the app reads it (${cost('photo_read')}). Then ask about it, or tap "Ask the tutor to solve it" (${cost('photo_question')} per question). Your photo and its chat stay until you delete the photo.`],
        ['Can I speak my question?',
          `Yes. Tap the microphone and ask. Turning your voice into text costs ${cost('voice_input')}, plus the answer. Your recording is turned into text and then thrown away: we never store your voice.`],
        ['Can it draw diagrams?',
          'Ask it to "draw" a mirror or lens ray diagram and it draws one from exact calculations. For other diagrams (like the heart or the nephron) it shows which NCERT figure and page to look at in your textbook.'],
        ['Are the answers always right?',
          'We work hard to keep them right: answers come from the textbook and numbers are checked by code. But AI can still make mistakes, so check important answers against your textbook or teacher.'],
        ['Which language are the answers in?',
          'English.'],
      ] }],
    },
    {
      heading: 'Quizzes and progress',
      blocks: [{ qa: [
        ['How do the quizzes work?',
          `Pick a whole chapter (Practise) or type a topic (Quiz me on a topic), then choose 5, 10 or 15 questions. Each set of 5 costs ${cost('quiz_batch')}. You can add a timer: 60 seconds for each multiple-choice question and 120 seconds for each numerical. Your answers are checked by code, and you can read any finished quiz again under "Your quizzes" on My Learning.`],
        ['Why can I not get a quiz on some topics?',
          'Quizzes only cover topics in your textbook. A topic that is not in it is refused before anything is charged.'],
        ['What is "Revise next"?',
          'After a quiz, My Learning plans when to revise each chapter (today, tomorrow or in a few days), based on how you did. Revising at the right time helps you remember for longer.'],
      ] }],
    },
    {
      heading: 'Your data and account',
      blocks: [{ qa: [
        ['Is my data safe?',
          'Yes. The database only lets your account read your own chats, photos and credits, your photos are private files, and all traffic is encrypted (HTTPS). We never show ads and never sell anyone’s data.'],
        ['How do I delete my account?',
          'Email us from your account’s email address. We delete your account and all its data (chats, quizzes, photos, saved lessons, credits) within 7 days. You can delete a single photo yourself at any time in the AI Tutor.'],
        ['How do I contact you?',
          `Email ${BUSINESS.email}. We reply ${BUSINESS.replyTime}. For a payment problem, add the Razorpay payment ID (it starts with "pay_").`],
      ] }],
    },
  ],
};

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
          { p: 'There is no subscription. You buy a small pack of credits (from ₹10) and each AI task uses a few of them. The full price list is on the Pricing page.' },
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
            'For partnerships (startups, founders, schools, educators), put "Partnership" in the subject.',
          ] },
        ],
      },
    ],
  },
  FAQ,
  {
    id: 'pricing',
    path: '/pricing',
    title: 'Pricing',
    short: 'Pricing',
    summary: 'Top-up packs and what each AI task costs, in rupees.',
    intro:
      'VigyanVerse AI is pay-as-you-go. You buy credits, and each AI task uses some of them. ' +
      '1 credit = ₹1. There is no subscription and nothing renews automatically.',
    sections: [
      {
        heading: 'Top-up packs',
        blocks: [
          { rows: packRows(PACKS_SNAPSHOT), caption: 'You pay the first amount; your account gets the second in credits.', kind: 'packs' },
          { p: 'Payments are made through Razorpay (UPI, debit and credit cards and net banking). The amount shown is the amount you pay: there are no extra charges at checkout.' },
        ],
      },
      {
        heading: 'Safe payments',
        blocks: [
          { list: [
            'Payments are handled by Razorpay, an RBI-regulated payment company certified to PCI DSS (the card-security standard).',
            'You pay inside Razorpay’s secure window, or approve the payment in your own UPI app with your own PIN.',
            'VigyanVerse AI never sees or stores your card number, bank details or UPI PIN.',
            'The whole site uses a secure HTTPS connection (look for the padlock in your browser).',
            'Credits are added only after Razorpay confirms the payment to our server, and each payment is counted once.',
            'A payment problem? Email us with the Razorpay payment ID (it starts with "pay_"); see the Contact page and the Refund Policy.',
          ] },
        ],
      },
      {
        heading: 'What each task costs',
        blocks: [
          { rows: priceRows(), caption: 'Taken from your credits only when the task runs.', kind: 'prices' },
          { p: 'Always free: creating an account, the subject pages and explainer videos, checking your quiz answers, your progress and your revision list.' },
        ],
      },
      {
        heading: 'Good to know',
        blocks: [
          { list: [
            'The app checks your balance before every paid task, so you are never charged without enough credits.',
            'If a task fails on our side, its credits go back to your account automatically.',
            'Credits do not expire while your account is open.',
            'Credits are used only on VigyanVerse AI: they cannot be withdrawn, sent to anyone else or exchanged for cash (see the Refund Policy for refunds of unused top-ups).',
            'Credits are added to your account as soon as Razorpay confirms the payment, usually within a minute. Nothing is shipped: everything is delivered online, in your account.',
            'More questions? See the FAQ page (Frequently asked questions), linked at the bottom of every page.',
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
            'Credits are prepaid units for using VigyanVerse AI’s own AI tasks, priced in Indian rupees (1 credit = ₹1) and bought through Razorpay. Prices are on the Pricing page and may change; a change never affects credits you already have.',
            'Credits can only be used for tasks on VigyanVerse AI. They cannot be transferred to another account or person, withdrawn, exchanged for cash, or used to pay for anything else, except a refund as described in the Cancellation and Refund Policy.',
            'Credits are not a wallet, bank account or stored money, and they earn no interest.',
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
            'Credits: your balance, top-ups and what each task cost. Razorpay handles card, UPI and bank details; we never see them.',
          ] },
          { p: 'Voice questions are turned into text and the recording is thrown away straight away: we never store your voice.' },
        ],
      },
      {
        heading: 'Why we use it',
        blocks: [
          { p: 'Only to run VigyanVerse AI: to answer your questions, save your chats and progress, keep track of your credits, keep your account safe and reply when you write to us. We do not use your data for advertising, and we do not sell or rent it to anyone.' },
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
          { p: 'Every student’s data is kept separate: the database itself only lets your account read your own chats, photos and credits. Your photos are private files, and all traffic is encrypted (HTTPS).' },
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
            'Delete your whole account: email us from your account’s email address. We delete your account and all its data (chats, quizzes, photos, saved lessons, credits) within 7 days. Razorpay keeps its own payment records as the law requires.',
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
            'An AI task that fails on our side: its credits go back to your account automatically, straight away.',
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
          { p: 'Everything we sell is digital and delivered online. Credits appear in your account as soon as Razorpay confirms the payment, usually within a minute. Nothing is shipped to an address.' },
        ],
      },
    ],
  },
];

export function policyById(id: PolicyId): PolicyDoc {
  return POLICIES.find((p) => p.id === id)!;
}
