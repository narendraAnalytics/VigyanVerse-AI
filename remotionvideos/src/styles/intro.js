// Intro: the home-page introduction video (script.txt, 2026-11-22), in the Paper Pop-Up style (prompt-paperpopup.txt,
// kit in popup.js). A pop-up book on a desk at night: a Class 10 student tells how she studies science with
// VigyanVerse AI, one spread per idea. Built scene by scene; only the scenes listed in BEATS exist so far.
//   Scene 1 (0 - 6 s): the shut emerald book (logo + title on a pasted paper label) under the lamp; the lamp clicks a
//   little brighter; the cover swings open and its hinge pulls up spread 1: the girl at her desk late at night, the
//   wall clock at 11, three question marks trembling on paper arms, the ribbon "Exam tomorrow?".
//   Scene 2 (6.2 - 13.1 s), same spread: "No teacher to ask at this hour": the camera drifts to the clock, whose paper
//   second hand ticks; "So I opened VigyanVerse AI": on the word VigyanVerse her laptop screen switches on (our logo),
//   a soft blue glow falls on her and the desk, and the camera pushes in to the laptop.
//   Scene 3 (13.1 - 20.6 s): the page turns to spread 2, the VigyanVerse AI chat window ("Hi! Ask me anything.");
//   on "type" a keyboard rises through a slit and the typed question appears in the chat, on "say" a microphone rises
//   and a voice message appears, on "snap" a phone rises, flashes, and a photo of her notes appears. Ribbon
//   "Type, say / or snap!" (the script's "Type it. Say it. Snap it." is too wide for one ribbon).
//   Scene 4 (20.6 - 30.6 s): the page turns to spread 3: her NCERT book open on the wall at the real section, Chapter 9
//   "Light - Reflection and Refraction", 9.2.4 "Mirror Formula and Magnification", printed page 143 (checked in
//   textbooks/jesc109.pdf with the ingestion's page offset, 2026-11-22). A paper magnifier swings onto the formula on
//   "finds ... textbook", a short answer card rises from the gutter on "explains", and a bookmark tag
//   "Chapter 9 · Page 143" pops up on "chapter and page". Ribbon "From your / NCERT book".
//   Scene 5a (30.6 - 33.95 s), spread 3: her friend rises through a slit beside the book, puzzled, a "?" bubble at
//   his head: "But can AI get the maths wrong?". Scene 5b (33.95 - 41.6 s): the page turns on "Not here" to spread 4:
//   left, an AI sheet where a fountain pen writes three lines in handwriting ("AI writes the words"); right, a paper
//   calculator whose gears turn while its display works V = I × R -> = 0.5 A × 4 Ω -> = 2 V ("code does the maths"),
//   then a green tick stamp lands ("marks the quizzes"). A problem card in the gutter: I = 0.5 A, R = 4 Ω, V = ?
//   Ribbon "AI writes, / code checks". (0.5 A × 4 Ω = 2 V: Ohm's law, V = IR, NCERT Ch 11.)
//   Scene 6 (41.6 - 54.6 s), owner 2026-11-22: "a team of AI agents", real model names and jobs. The page turns to
//   spread 5: the agent team's wall (a network, "The VigyanVerse AI agent team", "models served by Sarvam AI") and six
//   agent cards that rise one after another, left to right: Router agent (Sarvam Prism), Tutor agent (Sarvam 105B),
//   Maths & Quiz agent (DeepSeek V4.1 Flash), Photo agent (Gemma 4), Mistake agent (GLM 5.3 Flash), Voice agent
//   (Saaras v4 + Bulbul v4). Models checked in backend/src (2026-11-22). Ribbon "A team of / AI agents".
//   Scene 6b (54.6 - 74.0 s), owner 2026-11-22: the workflow, as the code really runs it. The page turns to spread 6,
//   a paper map "How my question travels": stations stand up on the page (You, Photo agent, Voice agent, Router agent,
//   NCERT search (code), Tutor agent, Maths agent) joined by printed tracks; paper tokens slide along the tracks on the
//   spoken words: a photo goes to the Photo agent and a voice note to the Voice agent (each turned into text), both go
//   to the Router, the Router sends questions to the Tutor and the Maths agent, NCERT pages (found by code) join them,
//   and the answers come back to You along the front track. Each station hops when a token arrives. No ribbon here.
//   Scene 7 (74.0 - 87.2 s): the page turns to spread 7. Left, "Hint mode": three hint bubbles pop up as a stair
//   ("What do we know?", "Is u negative here?", "So, what is v?") on "small questions", then a light bulb switches
//   on with "I got it!" on "myself". Right, "Bindu explains": Bindu (the app's flask mascot) pops up beside a
//   whiteboard and a paper marker writes the lesson line by line (Mirror Formula, 1/v + 1/u = 1/f, u = object,
//   v = image, NCERT p. 143 + tick). Ribbon "Hints & / lessons" ("Hints, not just answers" is too wide).
//   Scene 8 (87.2 - 99.4 s): the page turns to spread 8. Left, a quiz sheet "Quiz · Light · 5 questions": on "marked
//   by code" the five answers are marked (✓ ✓ ✗ ✓ ✓) and a "4/5" stamp lands; on "mistakes are explained" a Mistake agent
//   note unfolds by the cross (u is negative: the object is in front of the mirror, NCERT sign convention). Right, "My
//   Learning" chapter mastery bars: the Light bar grows after the quiz. In the gutter a desk calendar flips to "Revise
//   next: Light" on "which chapter" and "tomorrow" on "when" (the first revision is 1 day after a quiz, SM-2).
//   Ribbon "Practise, / then revise".
//   Scene 9 (99.4 - 115.4 s), the friend: "And it's fair...". The page turns to spread 9. Left, "Credits": on "ten
//   rupees" a ₹10 coin drops through a "Top up" slot standing on the page and the meter fills, the readout goes
//   ₹0 -> ₹10 ("1 credit = ₹1", "You pay only for AI help"). Right, "Prices": a "₹0.50 a question" tag swings in on
//   "fifty paise", FREE stamps land on a video card and a progress card on "free", a "No ads" badge on "ads". In the
//   gutter a padlock shield ("Kept private") clicks shut at the end. Ribbon "From ₹10, / no subscription".
//   Scene 10 (115.4 - 123.0 s): the page turns to spread 10, the same room and desk as spread 1 but the next morning
//   (sun in the window, clock at 7, she smiles, her laptop shows the answer and "NCERT p. 143"). On "Solved" the reader
//   pulls the tab (front right): the three question marks fold away and a big green tick rises through a slit; on
//   "page" a tag "Chapter 9 · Page 143" pops up over the laptop. Morning light comes up through the window. Ribbon
//   "Solved! / Page 143".
//   Scene 11 (123.0 - 129.0 s): "Let's learn science together, on VigyanVerse AI!": the tab slides back in, the left
//   half of the book (cover, block and every turned leaf) swings back over as one stack while the spread's pieces fold
//   flat (kit option close), the book lands shut on its emerald cover (logo label, "UNDERSTAND · VISUALIZE ·
//   DISCOVER"), and the camera rises to look down on it as at the start, holding still; after the last word a cream
//   card with the website address "vigyanverseai.live" fades in (overlay) and holds to the end (130.0 s).
// Story time = video time: each beat is long enough for its narration (see BEATS), so word timings can drive cues.
import { staticFile } from 'remotion';
import '../kit';
import { makePopupBook } from './popup.js';
import voice from '../voice/intro.json';

const K = window.K;

// ---------------------------------------------------------------- content
const C = {
  card: '#f5ecd9', cream: '#fbf3df', navy: '#22364e', coral: '#e2604a', pink: '#f3ab99', yellow: '#f5bd35', honey: '#eba020',
  amber: '#cf7d22', leaf: '#74a25e', sage: '#a6c787', deep: '#2f6753', sky: '#cfe5df',
  night: '#24365c', wall: '#2e4470', dots: '#3a5487', skin: '#c68863', skin2: '#b47652', cheek: '#e39a86', hair: '#2b1d1a', moon: '#f7e3a4',
  emerald: '#1f6660', emeraldDark: '#123d3a', gold: '#d2ad55',
};
// story-time beats (seconds): one per scene, then the end. Scenes are added one at a time.
export const BEATS = [0, 6.2, 13.1, 20.6, 30.6, 33.95, 41.6, 54.6, 74.0, 87.2, 99.4, 115.4, 123.0, 130.0];
const D = BEATS[BEATS.length - 1];
// the prompt book: every move on one clock (story time)
export const CUE = {
  lamp: 0.35,             // the desk lamp clicks a little brighter (frame 0 is already lit)
  cover: [2.7, 1.7],      // the cover starts to lift, and how long it takes to land open
};
const LANDED = CUE.cover[0] + CUE.cover[1];
// when a word of a narration line is spoken (story time = video time here)
const wordAt = (line, word) => { const l = voice.lines[line], w = l && (l.words || []).find((x) => x[0] === word); return w ? l.at + w[1] : null; };
const LIGHT = (wordAt(1, 'VigyanVerse') ?? 10.5) - 0.15;   // the laptop screen switches on
CUE.light = LIGHT;
CUE.turn1 = 13.1;                                           // the page turns from spread 1 to spread 2
const TYPE = (wordAt(2, 'type') ?? 14.2) - 0.1, SAY = (wordAt(2, 'say') ?? 15.5) - 0.1, SNAP = (wordAt(2, 'snap') ?? 17.4) + 0.05;
const RISE = 0.5;                                           // seconds a piece takes to come up through its slit
const rise = (t0, h) => (t) => -h * (1 - K.seg(t, t0, t0 + RISE, K.ease.outBack));
Object.assign(CUE, { type: TYPE, say: SAY, snap: SNAP });
CUE.turn2 = 20.6;                                           // the page turns from spread 2 to spread 3
const FIND = (wordAt(3, 'finds') ?? 21.5), FOUND = (wordAt(3, 'textbook') ?? 23.7) + 0.2;   // the magnifier swings in
const EXPLAIN = (wordAt(3, 'explains') ?? 24.5) - 0.1, CITE = (wordAt(3, 'chapter') ?? 28.0) - 0.05;
Object.assign(CUE, { find: FIND, found: FOUND, explain: EXPLAIN, cite: CITE });
const ASKS = (wordAt(4, 'But') ?? 31.05) - 0.15;            // the friend rises
CUE.turn3 = 33.7;                                           // the page turns on "Not here"
const WRITE = [(wordAt(5, 'AI') ?? 35.8), (wordAt(5, 'words') ?? 36.9) + 0.45];   // the pen writes
const CODE = (wordAt(5, 'code') ?? 37.7) - 0.1, MATHS = (wordAt(5, 'maths') ?? 38.5), MARK = (wordAt(5, 'marks') ?? 39.2) + 0.05;
const STEPS = [CODE + 0.15, MATHS - 0.05, MATHS + 0.55];      // the display lines appear
Object.assign(CUE, { asks: ASKS, write: WRITE, code: CODE, mark: MARK });
CUE.turn4 = 41.6;                                           // the page turns to the agent team
const TEAM0 = (wordAt(6, 'agents') ?? 44.2), TEAM_GAP = 0.9;  // the six cards rise one after another from "agents"
const teamAt = (k) => TEAM0 + k * TEAM_GAP;
CUE.team = teamAt(0);
CUE.turn5 = 54.6;                                           // the page turns to the workflow map
// the n-th time a word is spoken in a line
const wordNth = (line, word, n, fallback) => { const l = voice.lines[line], w = l && (l.words || []).filter((x) => x[0] === word)[n]; return w ? l.at + w[1] : fallback; };
const FLOW = {
  photo: wordNth(7, 'photo', 0, 57.7), voice: wordNth(7, 'voice', 0, 60.5), router: wordNth(7, 'router', 0, 64.6),
  tutor: wordNth(7, 'tutor', 0, 66.75), maths: wordNth(7, 'maths', 0, 67.5), ncert: wordNth(7, 'NCERT', 0, 69.3), answer: wordNth(7, 'answer', 0, 70.8),
};
CUE.flow = FLOW;
CUE.turn6 = 74.0;                                           // the page turns to hints + Bindu
const HINTS = [(wordAt(8, 'small') ?? 78.1) - 0.15, (wordAt(8, 'questions') ?? 78.6) - 0.05, (wordAt(8, 'till') ?? 79.2) + 0.05];
const LIT = (wordAt(8, 'myself') ?? 79.95) + 0.1;
const BINDU = (wordAt(8, 'Bindu') ?? 82.0) - 0.1;
const BOARD = [(wordAt(8, 'answer') ?? 83.4) - 0.1, (wordAt(8, 'becomes') ?? 83.8) + 0.1, (wordAt(8, 'whiteboard') ?? 84.3) + 0.2, (wordAt(8, 'lesson') ?? 85.0) + 0.25];
Object.assign(CUE, { hints: HINTS, lit: LIT, bindu: BINDU, board: BOARD });
CUE.turn7 = 87.2;                                           // the page turns to practise + revise
const MARKED = (wordAt(9, 'marked') ?? 90.6) - 0.05, MARKS = [0, 1, 2, 3, 4].map((i) => MARKED + i * 0.2);
const SCORE = (wordAt(9, 'code') ?? 91.2) + 0.3, MISTAKE = (wordAt(9, 'mistakes') ?? 92.0) - 0.05;
const GROW = [0, 1, 2, 3].map((i) => (wordAt(9, 'explained') ?? 92.7) + 0.1 + i * 0.16);
const CHAPTER = (wordAt(9, 'chapter') ?? 95.45) - 0.1, WHEN = (wordAt(9, 'when') ?? 97.26) - 0.05;
Object.assign(CUE, { marks: MARKS, score: SCORE, mistake: MISTAKE, grow: GROW, chapter: CHAPTER, when: WHEN });
CUE.turn8 = 99.4;                                           // the page turns to fair prices (the friend's line)
const DROP = (wordAt(10, 'ten') ?? 104.8) - 0.5, LANDS = DROP + 0.5;   // the ₹10 coin drops into the slot, landing on "ten"
const FILL = [0, 1, 2, 3].map((i) => LANDS + 0.12 + i * 0.14);          // the credits meter fills in four steps
const TAG = (wordAt(10, 'fifty') ?? 107.6) - 0.1;                      // the price tag swings in
const FREE = [(wordAt(10, 'free') ?? 111.0) - 0.05, (wordAt(10, 'free') ?? 111.0) + 0.22];   // two FREE stamps
const ADS = (wordAt(10, 'ads') ?? 112.9) - 0.05, LOCK = ADS + 0.95;    // the no-ads badge, then the padlock clicks shut
Object.assign(CUE, { drop: DROP, fill: FILL, tag: TAG, free: FREE, ads: ADS, lock: LOCK });
CUE.turn9 = 115.4;                                          // the page turns to the same desk, the next morning
const SOLVED = (wordAt(11, 'Solved') ?? 118.7);
const PULL_AT = [SOLVED - 0.45, SOLVED + 0.1];                // the reader pulls the tab out
const FOLD = [0, 1, 2].map((i) => PULL_AT[0] + 0.2 + i * 0.1);   // the question marks fold away
const TICK = SOLVED + 0.15, PAGE = (wordAt(11, 'page') ?? 119.8) - 0.05;
const SUN = CUE.turn9 + 0.9;                                  // morning light comes up through the window
Object.assign(CUE, { pull: PULL_AT, fold: FOLD, tick: TICK, page: PAGE, sun: SUN });
const PUSH_BACK = [122.7, 123.2];                              // scene 11: the tab slides back in
const CLOSE = [123.5, 1.7];                                   // then the book closes on its cover (shut at 125.2)
const SITE = (wordAt(12, 'AI') ?? 126.8) + 0.75;                // the website address card fades in after the last word
Object.assign(CUE, { pushBack: PUSH_BACK, close: CLOSE, site: SITE });
const TYPED = TYPE + 0.75, SPOKEN = SAY + 1.1, PHOTO = SNAP + 0.45;   // when each message lands in the chat

// sound cues (story time): [time, file in public/sfx, volume]
export const SOUND_CUES = [
  [CUE.lamp, 'switch', 0.12],
  [CUE.cover[0], 'page-turn', 0.22], [CUE.cover[0] + 0.25, 'whoosh', 0.07],
  // cards creaking upright as the cover passes the top, then the pieces popping into place
  ...[0, 1, 2, 3, 4, 5].map((i) => [CUE.cover[0] + 0.95 + i * 0.09, 'paper-tick', 0.05 + 0.01 * i]),
  [CUE.cover[0] + 1.05, 'card-pop', 0.12], [CUE.cover[0] + 1.3, 'card-pop', 0.14], [CUE.cover[0] + 1.5, 'card-pop', 0.1],
  [LANDED, 'thump', 0.34], [LANDED + 0.04, 'page-turn', 0.05],
  // the question marks trembling on their arms
  ...[0, 1, 2, 3].map((i) => [LANDED + 0.2 + i * 0.28, 'paper-tick', 0.045 - 0.008 * i]),
  // scene 2: the clock ticking while she says there is no one to ask, then the laptop switching on
  ...[7, 8, 9].map((s) => [s, 'paper-tick', 0.09]),
  [LIGHT - 0.06, 'mouse-click', 0.16], [LIGHT + 0.08, 'ding', 0.1],
  // scene 3: the page turn (picked up, swings over with a rustle, lands), then the three ways to ask
  [CUE.turn1 + 0.02, 'page-turn', 0.24], [CUE.turn1 + 0.3, 'whoosh', 0.07],
  ...[0, 1, 2, 3, 4].map((i) => [CUE.turn1 + 0.75 + i * 0.085, 'paper-tick', 0.05 + 0.01 * i]),
  [CUE.turn1 + 1.25, 'thump', 0.14], [CUE.turn1 + 1.28, 'card-pop', 0.1],
  [TYPE, 'card-pop', 0.15], ...[0, 1, 2, 3].map((i) => [TYPE + 0.42 + i * 0.07, 'mouse-click', 0.07]), [TYPED, 'paper-tick', 0.1],
  [SAY, 'card-pop', 0.15], [SPOKEN, 'paper-tick', 0.1],
  [SNAP, 'card-pop', 0.15], [SNAP + 0.38, 'switch', 0.16], [PHOTO, 'paper-tick', 0.1],
  // scene 4: page turn, the magnifier swinging in and settling, the answer card, the bookmark tag
  [CUE.turn2 + 0.02, 'page-turn', 0.24], [CUE.turn2 + 0.3, 'whoosh', 0.07],
  ...[0, 1, 2, 3, 4].map((i) => [CUE.turn2 + 0.75 + i * 0.085, 'paper-tick', 0.05 + 0.01 * i]),
  [CUE.turn2 + 1.25, 'thump', 0.14], [CUE.turn2 + 1.28, 'card-pop', 0.1],
  [FIND, 'whoosh', 0.06], [FOUND - 0.05, 'paper-tick', 0.12], [FOUND + 0.05, 'ding', 0.08],
  [EXPLAIN, 'card-pop', 0.16], [CITE, 'card-pop', 0.14], [CITE + 0.12, 'ding', 0.1],
  // scene 5: the friend rises, the page turns, the pen scratches, the gears ratchet, the display ticks, the stamp lands
  [ASKS, 'card-pop', 0.16], [ASKS + 0.5, 'paper-tick', 0.08],
  [CUE.turn3 + 0.02, 'page-turn', 0.24], [CUE.turn3 + 0.3, 'whoosh', 0.07],
  ...[0, 1, 2, 3, 4].map((i) => [CUE.turn3 + 0.75 + i * 0.085, 'paper-tick', 0.05 + 0.01 * i]),
  [CUE.turn3 + 1.25, 'thump', 0.14], [CUE.turn3 + 1.28, 'card-pop', 0.1],
  ...Array.from({ length: 16 }, (_, i) => [WRITE[0] + 0.05 + i * 0.1, 'paper-tick', 0.03 + 0.012 * (i % 3)]),
  ...Array.from({ length: 10 }, (_, i) => [CODE + i * 0.16, 'mouse-click', 0.045]),
  ...STEPS.map((t) => [t, 'paper-tick', 0.11]),
  [MARK, 'thump', 0.3], [MARK + 0.02, 'card-pop', 0.1], [MARK + 0.12, 'ding', 0.12],
  // scene 6: page turn, then six cards popping up with a rising little chime
  [CUE.turn4 + 0.02, 'page-turn', 0.24], [CUE.turn4 + 0.3, 'whoosh', 0.07],
  ...[0, 1, 2, 3, 4].map((i) => [CUE.turn4 + 0.75 + i * 0.085, 'paper-tick', 0.05 + 0.01 * i]),
  [CUE.turn4 + 1.25, 'thump', 0.14], [CUE.turn4 + 1.28, 'card-pop', 0.1],
  ...[0, 1, 2, 3, 4, 5].map((k) => [teamAt(k), 'card-pop', 0.12 + 0.01 * k]),
  ...[0, 1, 2, 3, 4, 5].map((k) => [teamAt(k) + 0.32, 'paper-tick', 0.07]),
  [teamAt(5) + 0.6, 'ding', 0.1],
  // scene 6b: page turn, stations popping up, then each token sliding (a soft paper slide) and arriving (a tick)
  [CUE.turn5 + 0.02, 'page-turn', 0.24], [CUE.turn5 + 0.3, 'whoosh', 0.07],
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => [CUE.turn5 + 0.85 + i * 0.07, 'card-pop', 0.06 + 0.008 * i]),
  [CUE.turn5 + 1.25, 'thump', 0.14],
  // scene 7: page turn, hint bubbles, the bulb, Bindu, the marker on the board
  [CUE.turn6 + 0.02, 'page-turn', 0.24], [CUE.turn6 + 0.3, 'whoosh', 0.07],
  ...[0, 1, 2, 3, 4].map((i) => [CUE.turn6 + 0.75 + i * 0.085, 'paper-tick', 0.05 + 0.01 * i]),
  [CUE.turn6 + 1.25, 'thump', 0.14], [CUE.turn6 + 1.28, 'card-pop', 0.1],
  ...HINTS.map((t, i) => [t, 'card-pop', 0.11 + 0.02 * i]),
  [LIT - 0.04, 'switch', 0.12], [LIT + 0.05, 'ding', 0.13],
  [BINDU, 'card-pop', 0.15], [BINDU + 0.15, 'ding', 0.08],
  ...BOARD.map((t) => [t, 'paper-tick', 0.1]),
  ...Array.from({ length: 18 }, (_, i) => [BOARD[0] + 0.05 + i * 0.12, 'paper-tick', 0.025 + 0.01 * (i % 2)]),
  // scene 8: page turn, the marking, the score stamp, the mistake note, the bar growing, the calendar flipping
  [CUE.turn7 + 0.02, 'page-turn', 0.24], [CUE.turn7 + 0.3, 'whoosh', 0.07],
  ...[0, 1, 2, 3, 4].map((i) => [CUE.turn7 + 0.75 + i * 0.085, 'paper-tick', 0.05 + 0.01 * i]),
  [CUE.turn7 + 1.25, 'thump', 0.14], [CUE.turn7 + 1.28, 'card-pop', 0.1],
  ...MARKS.map((t, i) => (i === 2 ? [t, 'thump', 0.12] : [t, 'paper-tick', 0.11])),
  [SCORE, 'thump', 0.26], [SCORE + 0.1, 'ding', 0.1],
  [MISTAKE, 'card-pop', 0.15],
  ...GROW.map((t, i) => [t, 'paper-tick', 0.06 + 0.015 * i]),
  [CHAPTER, 'page-turn', 0.12], [WHEN, 'page-turn', 0.12], [WHEN + 0.15, 'ding', 0.12],
  // scene 9: page turn, the coin dropping into the slot, the meter filling, the tag, the stamps, the badge, the lock
  [CUE.turn8 + 0.02, 'page-turn', 0.24], [CUE.turn8 + 0.3, 'whoosh', 0.07],
  ...[0, 1, 2, 3, 4].map((i) => [CUE.turn8 + 0.75 + i * 0.085, 'paper-tick', 0.05 + 0.01 * i]),
  [CUE.turn8 + 1.25, 'thump', 0.14], [CUE.turn8 + 1.28, 'card-pop', 0.1],
  [DROP, 'whoosh', 0.06], [LANDS, 'thump', 0.2], [LANDS + 0.03, 'mouse-click', 0.12],
  ...FILL.map((t, i) => [t, 'paper-tick', 0.06 + 0.015 * i]), [FILL[3] + 0.1, 'ding', 0.12],
  [TAG, 'card-pop', 0.15], [TAG + 0.3, 'paper-tick', 0.07],
  ...FREE.map((t) => [t, 'thump', 0.22]),
  [ADS, 'card-pop', 0.15], [LOCK, 'switch', 0.14], [LOCK + 0.1, 'ding', 0.1],
  // scene 10: page turn, the tab sliding out, the question marks folding down, the big tick, the page tag
  [CUE.turn9 + 0.02, 'page-turn', 0.24], [CUE.turn9 + 0.3, 'whoosh', 0.07],
  ...[0, 1, 2, 3, 4].map((i) => [CUE.turn9 + 0.75 + i * 0.085, 'paper-tick', 0.05 + 0.01 * i]),
  [CUE.turn9 + 1.25, 'thump', 0.14], [CUE.turn9 + 1.28, 'card-pop', 0.1],
  [PULL_AT[0], 'whoosh', 0.08], ...[0, 1, 2, 3].map((i) => [PULL_AT[0] + 0.05 + i * 0.12, 'paper-tick', 0.06]),
  ...FOLD.map((t) => [t + 0.3, 'paper-tick', 0.09]),
  [TICK, 'card-pop', 0.18], [TICK + 0.45, 'ding', 0.14],
  [PAGE, 'card-pop', 0.14], [PAGE + 0.12, 'ding', 0.08],
  // scene 11: the tab slides back, the pieces fold flat as the left half comes over, the cover lands, then quiet
  [PUSH_BACK[0], 'whoosh', 0.05], [PUSH_BACK[1], 'paper-tick', 0.08],
  [CLOSE[0] + 0.02, 'page-turn', 0.22], [CLOSE[0] + 0.35, 'whoosh', 0.08],
  ...[0, 1, 2, 3, 4].map((i) => [CLOSE[0] + 0.6 + i * 0.1, 'paper-tick', 0.07 - 0.01 * i]),
  [CLOSE[0] + CLOSE[1], 'thump', 0.34], [CLOSE[0] + CLOSE[1] + 0.04, 'page-turn', 0.05],
  [SITE, 'ding', 0.07],
];

// small printed motifs
const leaf = (a, x, y, len, q, col = C.leaf) => a.path(col, (c) => { const ex = x + Math.cos(q) * len, ey = y + Math.sin(q) * len; c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(q + 0.7) * len * 0.62, y + Math.sin(q + 0.7) * len * 0.62, ex, ey); c.quadraticCurveTo(x + Math.cos(q - 0.7) * len * 0.62, y + Math.sin(q - 0.7) * len * 0.62, x, y); });
const star = (a, col, x, y, r) => a.path(col, (c) => { for (let k = 0; k < 8; k++) { const q = k * Math.PI / 4 + Math.PI / 2, rr = k % 2 ? r * 0.38 : r; c.lineTo(x + rr * Math.cos(q), y + rr * Math.sin(q)); } });
const arm = (a, pts) => { a.line(C.cream, 0.13, (c) => { c.moveTo(pts[0], pts[1]); c.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); }); a.line(C.navy, 0.045, (c) => { c.moveTo(pts[0], pts[1]); c.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); }, [0.1, 0.12]); };
const question = (a, x, y, r) => { a.disc(C.yellow, x, y, r); a.disc(C.cream, x, y, r * 0.8); a.text('?', x, y - r * 0.5, r * 1.55, C.coral); };
const ruler = document.createElement('canvas').getContext('2d');
const widthOf = (str, size) => { ruler.font = '700 100px "Fraunces"'; return ruler.measureText(str).width * size / 100; };
const bubble = (a, col, x, y, w, h) => { a.box(col, x, y, w, h, h / 2); };
const keyGlyph = (a, col, x, y) => { a.box(col, x - 0.13, y - 0.08, 0.26, 0.16, 0.03); for (let k = 0; k < 3; k++) a.box(C.coral, x - 0.09 + k * 0.07, y + 0.01, 0.04, 0.03); a.box(C.coral, x - 0.06, y - 0.05, 0.12, 0.025); };
const micGlyph = (a, col, x, y) => { a.box(col, x - 0.05, y - 0.02, 0.1, 0.18, 0.05); a.line(col, 0.025, (c) => c.arc(x, y + 0.04, 0.09, Math.PI, 0)); a.box(col, x - 0.012, y - 0.13, 0.024, 0.08); };
const atom = (a, col, x, y, s, w = 0.035) => { for (let k = 0; k < 3; k++) a.line(col, w, (c) => c.ellipse(x, y, s, s * 0.36, k * Math.PI / 3, 0, 7)); a.disc(col, x, y, s * 0.16); };

// spread 1 (night) and spread 10 (the next morning) are the same room and desk
const roomArt = (morning) => (a) => {
    a.box(morning ? '#f1d9ae' : C.wall, -4.8, -0.1, 9.6, 3.25, 0.12);
    const r = K.rng(5); for (let i = 0; i < 60; i++) a.disc(morning ? '#e3c28c' : C.dots, r.range(-4.6, 4.6), r.range(0.3, 3.0), 0.035);   // wallpaper
    a.box(C.navy, -4.8, -0.1, 9.6, 0.32, 0.05);                                                                       // skirting board
    // the window: the moon and stars at night, the sun coming up in the morning
    a.box(C.coral, 0.35, 1.55, 2.3, 1.62, 0.1);
    a.clip((c) => c.rect(0.52, 1.72, 1.96, 1.28), () => {
      if (morning) {
        a.box('#bfe3f2', 0.4, 1.6, 2.2, 1.5); a.box('#fde7b8', 0.4, 1.6, 2.2, 0.45);
        for (let k = 0; k < 9; k++) { const q = k * Math.PI / 8; a.line(C.yellow, 0.05, (c) => { c.moveTo(1.95 + Math.cos(q) * 0.42, 1.85 + Math.sin(q) * 0.42); c.lineTo(1.95 + Math.cos(q) * 0.6, 1.85 + Math.sin(q) * 0.6); }); }
        a.disc(C.yellow, 1.95, 1.85, 0.32);
        [[0.95, 2.6], [1.62, 2.82]].forEach(([x, y]) => { a.disc(C.cream, x, y, 0.22, 0.12); a.disc(C.cream, x + 0.18, y + 0.05, 0.16, 0.12); a.disc(C.cream, x - 0.18, y, 0.14, 0.09); });
      } else {
        a.box('#16264a', 0.4, 1.6, 2.2, 1.5); a.disc(C.moon, 1.95, 2.62, 0.3); a.disc('#16264a', 2.06, 2.7, 0.26);
        [[0.8, 2.7, 0.07], [1.2, 2.25, 0.05], [1.45, 2.8, 0.08], [0.95, 2.05, 0.04], [2.25, 2.05, 0.05]].forEach(([x, y, s]) => star(a, C.moon, x, y, s));
      }
    });
    a.box(C.coral, 1.44, 1.72, 0.12, 1.28); a.box(C.coral, 0.52, 2.3, 1.96, 0.1); a.box(C.navy, 0.2, 1.45, 2.6, 0.13, 0.05);
    // a bookshelf on the left wall
    a.box(C.navy, -4.55, 2.15, 2.1, 0.12, 0.04);
    [[-4.4, 0.5, C.coral], [-4.18, 0.62, C.yellow], [-3.95, 0.45, C.sage], [-3.74, 0.58, C.sky], [-3.52, 0.5, C.pink], [-3.3, 0.55, C.honey]].forEach(([x, h, col]) => { a.box(col, x, 2.25, 0.19, h, 0.03); a.box(C.cream, x + 0.05, 2.25 + h * 0.65, 0.09, 0.04); });
    // the wall clock says eleven at night, seven in the morning
    const cx = 3.6, cy = 2.55;
    a.disc(C.cream, cx, cy, 0.62); a.disc(C.coral, cx, cy, 0.55); a.disc(C.cream, cx, cy, 0.46);
    for (let k = 0; k < 12; k++) { const q = k * Math.PI / 6; a.disc(C.navy, cx + 0.37 * Math.sin(q), cy + 0.37 * Math.cos(q), k % 3 ? 0.022 : 0.04); }
    a.line(C.navy, 0.07, (c) => { c.moveTo(cx, cy); c.lineTo(cx, cy + 0.34); });                                    // minute hand on 12
    a.line(C.navy, 0.09, (c) => { c.moveTo(cx, cy); c.lineTo(cx + (morning ? -0.104 : -0.12), cy + (morning ? -0.18 : 0.208)); });   // hour hand on 11 / 7
    a.disc(C.coral, cx, cy, 0.06);
};
const deskArt = (morning) => (a) => {
    const hx = -0.78, hy = 2.2;
    // plaits, shirt, collar and tie (behind the desk)
    for (const s of [-1, 1]) { a.line(C.hair, 0.17, (c) => { c.moveTo(hx + s * 0.34, hy - 0.05); c.quadraticCurveTo(hx + s * 0.46, hy - 0.45, hx + s * 0.42, hy - 0.85); }); a.disc(C.coral, hx + s * 0.42, hy - 0.9, 0.08); }
    a.box(C.sky, hx - 0.7, 0.9, 1.4, 1.0, 0.38);
    a.path(C.cream, (c) => { c.moveTo(hx - 0.22, 1.86); c.lineTo(hx, 1.66); c.lineTo(hx - 0.02, 1.88); }); a.path(C.cream, (c) => { c.moveTo(hx + 0.22, 1.86); c.lineTo(hx, 1.66); c.lineTo(hx + 0.02, 1.88); });
    a.path(C.coral, (c) => { c.moveTo(hx - 0.06, 1.7); c.lineTo(hx + 0.06, 1.7); c.lineTo(hx + 0.09, 1.3); c.lineTo(hx, 1.22); c.lineTo(hx - 0.09, 1.3); });
    a.box(C.skin, hx - 0.11, 1.78, 0.22, 0.18);                                                                        // neck
    // head: face, hair cap with a parting, brows, eyes, cheeks, mouth (worried at night, smiling in the morning)
    a.disc(C.skin, hx, hy, 0.4, 0.44);
    a.path(C.hair, (c) => { c.ellipse(hx, hy + 0.06, 0.45, 0.44, 0, 0, Math.PI); c.quadraticCurveTo(hx - 0.2, hy + 0.12, hx, hy + 0.26); c.quadraticCurveTo(hx + 0.2, hy + 0.12, hx + 0.45, hy + 0.06); });
    if (morning) {
      for (const s of [-1, 1]) { a.line(C.hair, 0.035, (c) => { c.moveTo(hx + s * 0.26, hy + 0.24); c.quadraticCurveTo(hx + s * 0.18, hy + 0.32, hx + s * 0.08, hy + 0.27); }); a.line(C.navy, 0.04, (c) => c.arc(hx + s * 0.15, hy + 0.03, 0.06, 0, Math.PI)); }
    } else {
      a.line(C.hair, 0.035, (c) => { c.moveTo(hx - 0.25, hy + 0.27); c.lineTo(hx - 0.1, hy + 0.3); });
      a.line(C.hair, 0.035, (c) => { c.moveTo(hx + 0.1, hy + 0.3); c.lineTo(hx + 0.25, hy + 0.27); });
      a.disc(C.navy, hx - 0.15, hy + 0.05, 0.045, 0.06); a.disc(C.navy, hx + 0.15, hy + 0.05, 0.045, 0.06);
    }
    a.disc(C.cheek, hx - 0.25, hy - 0.1, 0.065, 0.045); a.disc(C.cheek, hx + 0.25, hy - 0.1, 0.065, 0.045);
    if (morning) a.path(C.navy, (c) => { c.moveTo(hx - 0.13, hy - 0.14); c.quadraticCurveTo(hx, hy - 0.31, hx + 0.13, hy - 0.14); c.closePath(); });
    else a.line(C.navy, 0.03, (c) => { c.moveTo(hx - 0.08, hy - 0.2); c.quadraticCurveTo(hx, hy - 0.16, hx + 0.08, hy - 0.21); });
    // at night her hand is on her cheek (the elbow on the desk); in the morning it rests on the desk by the laptop
    if (morning) { a.line(C.sky, 0.2, (c) => { c.moveTo(hx + 0.6, 1.55); c.quadraticCurveTo(hx + 0.78, 1.2, hx + 1.02, 1.12); }); a.disc(C.skin, hx + 1.08, 1.12, 0.11, 0.08); }
    else { a.line(C.sky, 0.2, (c) => { c.moveTo(hx + 0.72, 1.02); c.quadraticCurveTo(hx + 0.62, 1.5, hx + 0.42, 1.88); }); a.disc(C.skin, hx + 0.38, hy - 0.22, 0.11, 0.13); }
    // the desk
    a.box(C.amber, -2.35, 0.92, 4.7, 0.17, 0.05);
    a.box(C.coral, -2.15, -0.1, 4.3, 1.04, 0.06);
    for (const x of [-1.9, 0.15]) { a.line(C.navy, 0.04, (c) => c.roundRect(x, 0.12, 1.75, 0.62, 0.06)); a.disc(C.cream, x + 0.875, 0.43, 0.07); }
    // the open textbook in front of her, a pencil in her other hand
    a.path(C.emerald, (c) => { c.moveTo(hx - 0.86, 1.05); c.lineTo(hx + 0.6, 1.05); c.lineTo(hx + 0.66, 1.55); c.lineTo(hx - 0.92, 1.55); });
    a.path(C.cream, (c) => { c.moveTo(hx - 0.8, 1.1); c.lineTo(hx - 0.13, 1.1); c.quadraticCurveTo(hx - 0.07, 1.42, hx - 0.07, 1.5); c.quadraticCurveTo(hx - 0.4, 1.56, hx - 0.84, 1.5); });
    a.path(C.cream, (c) => { c.moveTo(hx + 0.54, 1.1); c.lineTo(hx - 0.01, 1.1); c.quadraticCurveTo(hx - 0.07, 1.42, hx - 0.07, 1.5); c.quadraticCurveTo(hx + 0.2, 1.56, hx + 0.58, 1.5); });
    for (let k = 0; k < 4; k++) { const y = 1.18 + k * 0.08; a.box('#9fb0b5', hx - 0.72, y, 0.52, 0.025); a.box('#9fb0b5', hx + 0.04, y, 0.45, 0.025); }
    a.line(C.yellow, 0.06, (c) => { c.moveTo(hx - 0.68, 1.22); c.lineTo(hx - 0.3, 1.62); }); a.disc(C.skin, hx - 0.66, 1.2, 0.1, 0.08);
    // the laptop (its screen is a separate piece), and a small desk lamp
    a.box(C.navy, 0.42, 1.06, 1.72, 0.09, 0.03);
    a.box(C.cream, 0.55, 1.12, 1.46, 0.98, 0.08); a.box(C.navy, 0.63, 1.2, 1.3, 0.82, 0.04);   // the screen itself is a separate piece (off / on)
    a.box(C.navy, 2.08, 1.06, 0.36, 0.08, 0.03); a.line(C.navy, 0.06, (c) => { c.moveTo(2.26, 1.1); c.lineTo(2.1, 1.62); c.lineTo(2.3, 1.95); });
    a.path(C.yellow, (c) => { c.moveTo(2.08, 1.98); c.lineTo(2.48, 1.98); c.lineTo(2.34, 2.24); c.lineTo(2.2, 2.24); });
};
let logoImg = null;   // set in build() before the book is made (printed on the label and the laptop screen)
const SPREADS = [
  { // ------------------------------------------------------------ 1. the night before the exam
    words: ['Exam', 'tomorrow?'],
    floor(a) {
      a.box(C.night, -5.42, -3.02, 10.84, 6.04, 0.45);
      a.clip((c) => c.roundRect(-5.42, -3.02, 10.84, 6.04, 0.45), () => {
        for (let x = -5.4; x < 5.5; x += 0.42) a.box('#2c4069', x, -3.1, 0.025, 6.2);       // faint graph paper
        for (let y = -3.0; y < 3.1; y += 0.42) a.box('#2c4069', -5.5, y, 11, 0.025);
      });
      a.disc(C.coral, 0, -0.9, 3.6, 1.55); a.disc(C.pink, 0, -0.9, 3.25, 1.28); a.disc(C.coral, 0, -0.9, 2.9, 1.02);   // a round rug under the desk
      const r = K.rng(21);
      for (let i = 0; i < 26; i++) { const x = r.range(-5.1, 5.1), y = r.range(-2.8, 2.8); if (Math.abs(y + 0.9) < 1.7 && Math.abs(x) < 3.8) continue; star(a, r.pick([C.yellow, C.cream, C.moon]), x, y, r.range(0.06, 0.13)); }
      [[-4.4, -2.2], [4.3, -2.0], [-3.9, 1.9]].forEach(([x, y], i) => { a.disc(C.cream, x, y, 0.3); a.line('#cdbf9f', 0.03, (c) => { c.moveTo(x - 0.2, y + 0.05 * i); c.lineTo(x + 0.05, y - 0.1); c.lineTo(x + 0.18, y + 0.12); }); });   // crumpled notes
    },
    parts: [
      { id: 'room', fold: 'v', z: -1.0, alpha: 76, size: [9.8, 3.35], art: roomArt(false) },
      { fold: 'box', on: 'room', span: [-4.6, -2.5], depth: 1.35, strap: 0.75, height: 2.1, art(a) {                    // a pile of books and a globe
        [[-4.45, -0.1, 1.75, 0.34, C.coral], [-4.32, 0.24, 1.55, 0.3, C.yellow], [-4.5, 0.54, 1.8, 0.28, C.sage]].forEach(([x, y, w, h, col]) => { a.box(col, x, y, w, h, 0.05); a.box(C.cream, x + w - 0.18, y + 0.06, 0.12, h - 0.12, 0.02); });
        a.box(C.navy, -3.75, 0.82, 0.4, 0.1, 0.04); a.box(C.navy, -3.6, 0.88, 0.1, 0.28);
        a.line(C.navy, 0.07, (c) => c.arc(-3.55, 1.55, 0.6, -2.3, 0.75));
        a.disc(C.sky, -3.55, 1.55, 0.5); leaf(a, -3.8, 1.5, 0.45, 0.6, C.leaf); leaf(a, -3.4, 1.8, 0.3, 2.8, C.leaf); a.disc(C.leaf, -3.35, 1.3, 0.13, 0.09);
      } },
      { fold: 'box', on: 'room', span: [2.5, 4.6], depth: 1.2, strap: 0.7, height: 1.9, art(a) {                         // a potted plant
        a.path(C.coral, (c) => { c.moveTo(3.1, 0.65); c.lineTo(4.1, 0.65); c.lineTo(3.95, -0.1); c.lineTo(3.25, -0.1); }); a.box(C.cream, 3.05, 0.55, 1.1, 0.12, 0.04);
        a.line(C.deep, 0.08, (c) => { c.moveTo(3.6, 0.6); c.quadraticCurveTo(3.55, 1.1, 3.62, 1.7); });
        [[3.6, 0.85, 0.75, 2.6], [3.6, 0.95, 0.7, 0.45], [3.58, 1.25, 0.62, 2.3, C.sage], [3.6, 1.35, 0.58, 0.8, C.sage], [3.62, 1.65, 0.45, 1.6]].forEach(([x, y, l, q, col]) => leaf(a, x, y, l, q, col || C.leaf));
      } },
      { id: 'desk', fold: 'v', z: 0.7, alpha: 58, size: [5.0, 3.0], art: deskArt(false) },
      // the laptop screen: off until she opens VigyanVerse AI, then lit (two pieces in the same place)
      { fold: 'float', on: 'desk', side: 1, at: [1.28, 1.61], gap: 0.03, show: (t) => t < LIGHT, area: [0.6, 1.17, 1.96, 2.05], art(a) { a.box('#1b2a45', 0.65, 1.22, 1.26, 0.78, 0.04); a.box('#25375a', 0.72, 1.82, 0.5, 0.08, 0.03); } },
      { fold: 'float', on: 'desk', side: 1, at: [1.28, 1.61], gap: 0.03, show: (t) => t >= LIGHT, area: [0.6, 1.17, 1.96, 2.05], art(a) {
        a.box('#e9f6f2', 0.65, 1.22, 1.26, 0.78, 0.04); a.box(C.emerald, 0.65, 1.88, 1.26, 0.12, [0.04, 0.04, 0, 0]);
        a.disc(C.cream, 1.28, 1.66, 0.19); a.image(logoImg, 1.28, 1.66, 0.34);
        a.text('VigyanVerse AI', 1.28, 1.36, 0.11, C.navy);
        a.box(C.cream, 0.78, 1.25, 1.0, 0.06, 0.03);
      } },
      // the clock's second hand: a paper hand pinned at the centre, one tick a second
      { fold: 'float', on: 'room', side: 1, at: [3.6, 2.55], gap: 0.04, spin: (t) => -Math.floor(t + 4) * Math.PI / 30, area: [3.5, 2.42, 3.7, 2.97], art(a) { a.line(C.coral, 0.035, (c) => { c.moveTo(3.6, 2.48); c.lineTo(3.6, 2.9); }); a.disc(C.coral, 3.6, 2.55, 0.05); } },
      // three question marks on paper arms over her head (they tremble when the cover lands, then bob gently)
      { fold: 'float', on: 'desk', side: -1, at: [-1.05, 2.55], gap: 0.3, sway: 1, bob: 0.035, bobPhase: 0, area: [-2.2, 2.35, -0.9, 3.35], art(a) { arm(a, [-1.05, 2.55, -1.3, 2.95, -1.68, 2.9]); question(a, -1.78, 2.9, 0.32); } },
      { fold: 'float', on: 'desk', side: -1, at: [-0.55, 2.6], gap: 0.36, sway: -0.8, bob: 0.03, bobPhase: 2.1, area: [-0.7, 2.45, -0.02, 3.06], art(a) { arm(a, [-0.52, 2.62, -0.45, 2.76, -0.36, 2.76]); question(a, -0.3, 2.78, 0.24); } },
      { fold: 'float', on: 'desk', side: 1, at: [1.35, 2.05], gap: 0.3, sway: 1.2, bob: 0.04, bobPhase: 4.0, area: [1.15, 1.95, 2.0, 2.8], art(a) { arm(a, [1.35, 2.05, 1.42, 2.35, 1.58, 2.45]); question(a, 1.68, 2.5, 0.24); } },
    ],
  },
];

SPREADS.push(
  { // ------------------------------------------------------------ 2. ask any way: type it, say it, snap it
    words: ['Type, say', 'or snap!'], em: 0.72,
    floor(a) {
      a.box('#d9eee8', -5.42, -3.02, 10.84, 6.04, 0.45);
      a.clip((c) => c.roundRect(-5.42, -3.02, 10.84, 6.04, 0.45), () => { for (let x = -5.25; x < 5.4; x += 0.35) for (let y = -2.85; y < 3; y += 0.35) a.disc('#bfdfd6', x, y, 0.028); });
      // her notebook on the right page (the phone photographs it)
      a.box(C.navy, 2.35, -1.05, 2.55, 1.7, 0.08); a.box(C.cream, 2.45, -0.97, 2.35, 1.54, 0.05);
      a.box(C.coral, 2.82, -0.97, 0.03, 1.54); for (let k = 0; k < 6; k++) a.box('#9cc6d8', 2.5, -0.8 + k * 0.23, 2.25, 0.02);
      a.line(C.navy, 0.035, (c) => c.arc(3.9, -0.2, 0.42, 2.3, 3.98)); a.line(C.coral, 0.025, (c) => { c.moveTo(3.0, -0.2); c.lineTo(3.95, -0.2); });   // a mirror sketch
      // a few printed chat bubbles as decoration
      [[-4.5, -2.3, C.sky], [-3.6, 1.9, C.pink], [4.4, 2.2, C.sky], [-4.6, 0.4, C.yellow]].forEach(([x, y, col]) => { a.box(col, x - 0.35, y - 0.18, 0.7, 0.36, 0.18); a.path(col, (c) => { c.moveTo(x - 0.2, y - 0.15); c.lineTo(x - 0.3, y - 0.32); c.lineTo(x - 0.02, y - 0.16); }); });
    },
    parts: [
      { id: 'app', fold: 'v', z: -1.0, alpha: 76, size: [9.8, 3.35], art(a) {
        a.box(C.navy, -4.75, -0.1, 9.5, 3.38, 0.2);                                                         // the app window
        a.box('#fbf6ea', -4.58, 0.08, 9.16, 2.78, 0.12);
        a.box(C.emerald, -4.58, 2.86, 9.16, 0.32, [0.12, 0.12, 0, 0]);
        a.disc(C.cream, -4.28, 3.02, 0.13); a.image(logoImg, -4.28, 3.02, 0.24);
        a.text('VigyanVerse AI  ·  AI Tutor', -4.07, 2.95, 0.19, C.cream, 'left');
        [C.coral, C.yellow, C.sage].forEach((col, k) => a.disc(col, 3.95 + k * 0.2, 3.02, 0.06));
        // the tutor says hello (left)
        a.disc(C.emerald, -4.15, 2.5, 0.17); a.image(logoImg, -4.15, 2.5, 0.28);
        bubble(a, C.sky, -3.9, 2.28, 3.05, 0.44); a.text('Hi! Ask me anything.', -3.72, 2.42, 0.2, C.navy, 'left');
      } },
      // the three messages, each appearing when it is sent (right-hand side: the student)
      { fold: 'float', on: 'app', side: 1, at: [2.4, 2.5], gap: 0.05, show: (t) => t >= TYPED, area: [0.5, 2.24, 4.45, 2.76], art(a) {
        bubble(a, C.coral, 0.6, 2.28, 3.8, 0.44); keyGlyph(a, C.cream, 0.92, 2.5); a.text('What is the mirror formula?', 1.15, 2.42, 0.2, C.cream, 'left');
      } },
      { fold: 'float', on: 'app', side: 1, at: [3.1, 1.95], gap: 0.05, show: (t) => t >= SPOKEN, area: [1.7, 1.7, 4.45, 2.2], art(a) {
        bubble(a, C.coral, 1.8, 1.74, 2.6, 0.42); micGlyph(a, C.cream, 2.1, 1.95);
        [0.12, 0.22, 0.3, 0.16, 0.26, 0.34, 0.2, 0.12, 0.24, 0.3, 0.18, 0.1, 0.2, 0.14].forEach((h, k) => a.box(C.cream, 2.35 + k * 0.1, 1.95 - h / 2, 0.05, h, 0.025));
        a.text('0:04', 4.05, 1.88, 0.15, C.cream);
      } },
      { fold: 'float', on: 'app', side: 1, at: [1.65, 1.35], gap: 0.05, show: (t) => t >= PHOTO, area: [0.85, 0.85, 2.4, 1.66], art(a) {
        a.box(C.coral, 0.95, 0.9, 1.4, 0.72, 0.12); a.box(C.cream, 1.03, 0.97, 1.24, 0.58, 0.06);
        a.box(C.coral, 1.25, 0.97, 0.02, 0.58); for (let k = 0; k < 4; k++) a.box('#9cc6d8', 1.06, 1.06 + k * 0.12, 1.18, 0.015);
        a.line(C.navy, 0.025, (c) => c.arc(1.95, 1.22, 0.2, 2.3, 3.98));
      } },
      // 1. the keyboard (rises on "type")
      { fold: 'box', on: 'app', span: [-4.6, -2.3], depth: 1.4, strap: 0.5, height: 1.45, slide: rise(TYPE, 1.75), art(a) {
        a.box(C.navy, -4.5, -0.1, 2.1, 1.35, 0.14); a.box(C.coral, -4.42, -0.02, 1.94, 1.19, 0.1);
        for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) a.box(C.cream, -4.32 + k * 0.25 + (r % 2) * 0.08, 0.88 - r * 0.2, 0.19, 0.15, 0.03);
        a.box(C.cream, -3.95, 0.05, 1.0, 0.14, 0.04);
      } },
      // 2. the microphone (rises on "say"): a V-fold in the gutter, on a pale sound bubble
      { fold: 'v', z: 0.55, alpha: 58, size: [2.1, 2.3], slide: rise(SAY, 2.7), art(a) {
        a.disc(C.sky, 0, 1.45, 0.9); for (const r of [0.66, 0.8]) for (const s of [-1, 1]) a.line(C.yellow, 0.05, (c) => c.arc(0, 1.6, r, s > 0 ? -0.55 : Math.PI - 0.55, s > 0 ? 0.55 : Math.PI + 0.55));
        a.disc(C.navy, 0, -0.02, 0.6, 0.13); a.box(C.navy, -0.05, 0.0, 0.1, 0.92);
        a.line(C.coral, 0.07, (c) => c.arc(0, 1.42, 0.45, Math.PI * 1.05, Math.PI * 1.95));
        a.box(C.navy, -0.31, 1.15, 0.62, 1.0, 0.31); for (let k = 0; k < 5; k++) a.box('#4b6283', -0.22, 1.32 + k * 0.15, 0.44, 0.04, 0.02);
        a.box(C.sky, -0.33, 1.42, 0.66, 0.1, 0.03);
      } },
      // 3. the phone (rises on "snap"), its screen already showing her notebook page
      { id: 'phone', fold: 'box', on: 'app', span: [2.4, 4.6], depth: 1.25, strap: 0.5, height: 1.8, slide: rise(SNAP, 2.05), art(a) {
        a.box(C.navy, 2.95, -0.1, 1.15, 1.85, 0.18); a.box(C.cream, 3.03, 0.12, 0.99, 1.45, 0.08);
        a.box(C.coral, 3.22, 0.12, 0.02, 1.45); for (let k = 0; k < 6; k++) a.box('#9cc6d8', 3.06, 0.3 + k * 0.2, 0.93, 0.018);
        a.line(C.navy, 0.03, (c) => c.arc(3.75, 0.82, 0.28, 2.3, 3.98));
        a.disc(C.cream, 3.525, 0.0, 0.08); a.box('#4b6283', 3.4, 1.63, 0.25, 0.05, 0.025);
      } },
    ],
  },
);

// the real place in the book (NCERT Class 10 Science, rationalised 2026-27 edition, jesc109.pdf)
const CITATION = { chapter: 9, chapterTitle: 'Light – Reflection and Refraction', section: '9.2.4 Mirror Formula and Magnification', page: 143 };
const greyLines = (a, x, y, w, n, gap = 0.17, col = '#c9c0ad') => { const r = K.rng(Math.round(x * 100 + y * 10)); for (let k = 0; k < n; k++) a.box(col, x, y - k * gap, w * (k === n - 1 ? 0.55 : r.range(0.86, 1)), 0.045, 0.02); };
SPREADS.push(
  { // ------------------------------------------------------------ 3. the answer, from your own NCERT book
    words: ['From your', 'NCERT book'], em: 0.68,
    floor(a) {
      a.box('#f4e6c6', -5.42, -3.02, 10.84, 6.04, 0.45);
      a.clip((c) => c.roundRect(-5.42, -3.02, 10.84, 6.04, 0.45), () => { for (let y = -2.7; y < 3; y += 0.36) a.box('#d9e3ea', -5.5, y, 11, 0.025); a.box('#efb3a4', -4.55, -3.1, 0.03, 6.2); });
      [[-4.4, -2.2], [4.3, -2.3], [4.6, 1.9], [-4.7, 1.5]].forEach(([x, y], i) => atom(a, [C.coral, C.deep, C.amber, C.navy][i], x, y, 0.32, 0.03));
    },
    parts: [
      { id: 'book', fold: 'v', z: -1.0, alpha: 76, size: [9.0, 3.35], art(a) {
        // the open textbook: emerald boards behind two cream pages, the gutter on the crease
        a.box(C.emerald, -4.25, -0.1, 8.5, 3.38, 0.14);
        a.box('#fbf6ea', -4.1, 0.0, 4.02, 3.18, 0.06); a.box('#fbf6ea', 0.08, 0.0, 4.02, 3.18, 0.06);
        a.box('rgba(90,70,40,0.12)', -0.3, 0.0, 0.6, 3.18);
        // left page (142): running head, text, the concave-mirror figure
        a.text('Science', -3.85, 2.86, 0.15, '#8a8170', 'left');
        greyLines(a, -3.85, 2.55, 3.5, 4);
        a.box('#eef4f6', -3.85, 0.5, 2.05, 1.25, 0.05);
        a.line('#9aa7b0', 0.018, (c) => { c.moveTo(-3.78, 1.12); c.lineTo(-1.9, 1.12); });                            // principal axis
        a.line(C.navy, 0.05, (c) => c.arc(-3.55, 1.12, 1.4, -0.42, 0.42));                                          // the concave mirror (centre of curvature C at -3.55)
        const fx = -2.85;                                                                                       // focus F = half way to C
        for (const y of [1.42, 0.82]) { const mx = -3.55 + Math.sqrt(1.96 - (y - 1.12) ** 2); a.line(C.coral, 0.025, (c) => { c.moveTo(-3.75, y); c.lineTo(mx, y); c.lineTo(fx, 1.12); c.lineTo(fx - 0.5 * (mx - fx), 1.12 - 0.5 * (y - 1.12)); }); }
        a.disc(C.navy, fx, 1.12, 0.035); a.text('F', fx, 1.17, 0.13, C.navy);
        greyLines(a, -1.7, 1.62, 1.45, 6, 0.18);
        a.text('142', -3.85, 0.12, 0.15, '#8a8170', 'left');
        // right page (143): chapter head, the section heading, the formula in a box
        a.text(CITATION.chapterTitle, 3.85, 2.86, 0.15, '#8a8170', 'right');
        a.text(CITATION.section, 0.35, 2.48, 0.2, C.navy, 'left');
        greyLines(a, 0.35, 2.2, 3.5, 2);
        a.box(C.cream, 1.27, 1.3, 1.76, 0.5, 0.06); a.line(C.coral, 0.03, (c) => c.roundRect(1.27, 1.3, 1.76, 0.5, 0.06));
        a.text('1/v + 1/u = 1/f', 2.15, 1.475, 0.21, C.navy);
        greyLines(a, 0.35, 1.1, 3.0, 5);
        a.text(String(CITATION.page), 3.85, 0.12, 0.15, '#8a8170', 'right');
      } },
      // the magnifier: on a paper arm pinned at the bottom of the right page, it swings onto the formula
      { fold: 'float', on: 'book', side: 1, at: [3.78, 1.0], gap: 0.1, spin: (t) => -1.0 * (1 - K.seg(t, FIND, FOUND, K.ease.inOutQuint)), area: [1.2, 0.6, 3.95, 2.5], art(a) {
        a.line(C.navy, 0.13, (c) => { c.moveTo(3.78, 1.0); c.lineTo(2.97, 1.27); });
        a.disc(C.amber, 3.78, 1.0, 0.09);
        a.line(C.navy, 0.12, (c) => c.arc(2.15, 1.55, 0.86, 0, 7)); a.line(C.yellow, 0.055, (c) => c.arc(2.15, 1.55, 0.86, 0, 7));   // the ring only: the middle is cut out
      } },
      // the bookmark tag: a coral ribbon from the top of page 143 with the citation (pops up on "chapter and page")
      { fold: 'float', on: 'book', side: 1, at: [3.1, 0.6], gap: 0.06, sway: 1.4, show: (t) => t >= CITE, area: [2.2, 0.12, 4.05, 0.98], art(a) {
        a.path(C.coral, (c) => { c.moveTo(3.55, 0.95); c.lineTo(3.85, 0.95); c.lineTo(3.85, 0.62); c.lineTo(3.7, 0.7); c.lineTo(3.55, 0.62); });
        a.box(C.cream, 2.28, 0.18, 1.62, 0.66, 0.1); a.line(C.coral, 0.03, (c) => c.roundRect(2.34, 0.24, 1.5, 0.54, 0.08));
        a.text(`Chapter ${CITATION.chapter}`, 3.09, 0.55, 0.17, C.navy); a.text(`Page ${CITATION.page}`, 3.09, 0.32, 0.17, C.coral);
      } },
      // her friend (scene 5a): rises through a slit on his line, puzzled, a "?" bubble at his head
      { fold: 'box', on: 'book', span: [-4.6, -2.2], depth: 1.4, strap: 0.6, height: 2.45, slide: rise(ASKS, 2.75), art(a) {
        const hx = -3.65, hy = 1.75;
        a.box(C.yellow, hx - 0.62, -0.1, 1.24, 1.42, 0.36); a.path(C.cream, (c) => { c.moveTo(hx - 0.2, 1.3); c.lineTo(hx, 1.12); c.lineTo(hx + 0.2, 1.3); });   // shirt and collar
        a.box(C.skin2, hx - 0.1, 1.2, 0.2, 0.18);
        a.disc(C.skin2, hx, hy, 0.38, 0.42);
        a.path(C.hair, (c) => { c.ellipse(hx, hy + 0.08, 0.41, 0.38, 0, 0, Math.PI); c.lineTo(hx - 0.2, hy + 0.2); c.lineTo(hx + 0.05, hy + 0.12); c.lineTo(hx + 0.41, hy + 0.08); });
        a.disc(C.navy, hx - 0.14, hy - 0.02, 0.04, 0.055); a.disc(C.navy, hx + 0.14, hy - 0.02, 0.04, 0.055);
        a.line(C.hair, 0.035, (c) => { c.moveTo(hx - 0.24, hy + 0.12); c.lineTo(hx - 0.08, hy + 0.1); }); a.line(C.hair, 0.035, (c) => { c.moveTo(hx + 0.08, hy + 0.16); c.lineTo(hx + 0.24, hy + 0.2); });   // one brow up
        a.disc(C.navy, hx + 0.03, hy - 0.22, 0.05, 0.04);                                                                // a small "o"
        a.line(C.yellow, 0.2, (c) => { c.moveTo(hx + 0.5, 0.9); c.quadraticCurveTo(hx + 0.72, 1.3, hx + 0.42, 1.55); }); a.disc(C.skin2, hx + 0.38, 1.58, 0.1);   // scratching his head
        a.path(C.cream, (c) => { c.moveTo(hx + 0.42, 2.05); c.lineTo(hx + 0.62, 2.0); c.lineTo(hx + 0.55, 2.2); });     // bubble tail
        a.disc(C.cream, hx + 0.92, 2.2, 0.32); a.line(C.coral, 0.03, (c) => c.arc(hx + 0.92, 2.2, 0.32, 0, 7)); a.text('?', hx + 0.92, 2.04, 0.48, C.coral);
      } },
      // the answer card: short, simple words, with the source (rises from the gutter on "explains")
      { fold: 'v', z: 0.65, alpha: 60, size: [4.6, 1.85], slide: rise(EXPLAIN, 2.2), art(a) {
        a.box(C.navy, -2.25, -0.1, 4.5, 1.82, 0.16); a.box('#eef7f3', -2.15, 0.0, 4.3, 1.62, 0.12);
        a.disc(C.emerald, -1.8, 1.32, 0.2); a.image(logoImg, -1.8, 1.32, 0.32);
        a.text('Mirror formula', -1.5, 1.24, 0.24, C.emerald, 'left');
        a.text('1/v + 1/u = 1/f', 0, 0.74, 0.36, C.navy);
        a.text('u = object distance   v = image distance   f = focal length', 0, 0.42, 0.13, '#4b6283');
        a.box(C.cream, -1.25, 0.08, 2.5, 0.24, 0.12); a.text(`NCERT · Ch ${CITATION.chapter} · p. ${CITATION.page}`, 0, 0.14, 0.14, C.coral);
      } },
    ],
  },
);

const squiggleText = (a, str, x, y, size, col) => a.text(str, x, y, size, col, 'left', '700 100px "Kalam"');
const gear = (a, col, x, y, r, teeth) => { a.path(col, (c) => { for (let k = 0; k < teeth * 2; k++) { const q = k * Math.PI / teeth, rr = k % 2 ? r * 0.8 : r; c.lineTo(x + rr * Math.cos(q - 0.12), y + rr * Math.sin(q - 0.12)); c.lineTo(x + rr * Math.cos(q + 0.12), y + rr * Math.sin(q + 0.12)); } }); a.disc(C.cream, x, y, r * 0.28); a.disc(col, x, y, r * 0.12); };
// a gear's angle: turning only while the code works
const turning = (speed) => (t) => speed * (K.clamp(t, CODE, MARK + 0.3) - CODE);
SPREADS.push(
  { // ------------------------------------------------------------ 4. AI writes the words, code checks the facts
    words: ['AI writes,', 'code checks'], em: 0.66,
    floor(a) {
      a.box('#f6dccf', -5.42, -3.02, 5.42, 6.04, [0.45, 0, 0, 0.45]); a.box('#d6eaf0', 0, -3.02, 5.42, 6.04, [0, 0.45, 0.45, 0]);
      a.clip((c) => c.rect(0, -3.02, 5.42, 6.04), () => { for (let x = 0.2; x < 5.4; x += 0.4) a.box('#c0dbe4', x, -3.1, 0.022, 6.2); for (let y = -2.9; y < 3.1; y += 0.4) a.box('#c0dbe4', 0, y, 5.5, 0.022); });
      a.clip((c) => c.rect(-5.42, -3.02, 5.42, 6.04), () => { for (let y = -2.7; y < 3; y += 0.36) a.box('#efc4b4', -5.5, y, 5.5, 0.022); });
      [[-4.5, -2.3], [-4.6, 1.8]].forEach(([x, y]) => star(a, C.coral, x, y, 0.18)); [[4.5, -2.3], [4.6, 1.8]].forEach(([x, y]) => gear(a, '#9cc6d8', x, y, 0.28, 8));
    },
    parts: [
      { id: 'desk2', fold: 'v', z: -1.0, alpha: 76, size: [9.4, 3.3], art(a) {
        // left: the AI's sheet of paper
        a.box(C.coral, -4.55, -0.1, 4.3, 3.3, 0.16); a.box('#fff8ec', -4.42, 0.0, 4.04, 3.08, 0.1);
        for (let y = 2.4; y > 0.3; y -= 0.45) a.box('#f0d9cf', -4.25, y - 0.1, 3.7, 0.02);
        a.box(C.coral, -4.25, 2.72, 0.75, 0.3, 0.15); a.text('AI', -3.875, 2.79, 0.2, C.cream);
        // right: the paper calculator
        a.box(C.navy, 0.3, -0.1, 3.4, 3.3, 0.16); a.box('#2d4566', 0.4, 0.0, 3.2, 3.08, 0.1);
        a.box(C.emerald, 0.55, 2.72, 1.05, 0.3, 0.15); a.text('CODE', 1.075, 2.79, 0.18, C.cream);
        a.box('#dfeedd', 0.55, 1.55, 2.9, 1.08, 0.08);                                                       // the display
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) a.box(k === 3 ? C.coral : C.cream, 0.62 + k * 0.72, 0.2 + r * 0.42, 0.6, 0.32, 0.07);
        // gear housing on the right
        a.box(C.navy, 3.55, 0.6, 1.05, 2.2, 0.14); a.box('#2d4566', 3.62, 0.68, 0.9, 2.04, 0.1);
      } },
      // the pen's three handwritten lines, written one after another
      ...[['Ohm\'s law: the potential', 2.36], ['difference V across it', 1.91], ['= current × resistance.', 1.46]].map(([str, y], i) => (
        { fold: 'float', on: 'desk2', side: -1, at: [-2.6, y + 0.1], gap: 0.03, show: (t) => t >= WRITE[0] + 0.15 + i * (WRITE[1] - WRITE[0]) / 3, area: [-4.3, y - 0.12, -0.9, y + 0.36], art(a) {
          a.box('#fff8ec', -4.25, y - 0.08, 3.3, 0.42, 0.05); squiggleText(a, str, -4.2, y, 0.27, C.navy);
        } })),
      // the fountain pen, pinned at its cap, wiggling while it writes
      { fold: 'float', on: 'desk2', side: -1, at: [-0.62, 2.95], gap: 0.16, spin: (t) => { const on = K.seg(t, WRITE[0], WRITE[0] + 0.2) * (1 - K.seg(t, WRITE[1], WRITE[1] + 0.25)); return on * (0.07 * Math.sin(t * 17) - 0.25 * K.seg(t, WRITE[0], WRITE[1])); }, area: [-1.3, 1.42, -0.4, 3.15], art(a) {   // at rest the nib sits just right of the third line; writing swings it left
        a.line(C.navy, 0.2, (c) => { c.moveTo(-0.62, 2.95); c.lineTo(-0.92, 1.95); });
        a.line(C.gold, 0.21, (c) => { c.moveTo(-0.77, 2.46); c.lineTo(-0.8, 2.36); });
        a.path(C.gold, (c) => { c.moveTo(-0.84, 1.98); c.lineTo(-1.0, 1.92); c.lineTo(-1.1, 1.5); c.lineTo(-0.88, 1.8); });
        a.disc(C.coral, -0.62, 2.95, 0.07);
      } },
      // the display: each step of the working appears on its own strip
      ...[['V = I × R', 2.3, C.navy, 0.24], ['= 0.5 A × 4 Ω', 1.98, C.navy, 0.24], ['= 2 V', 1.64, C.coral, 0.3]].map(([str, y, col, size], i) => (
        { fold: 'float', on: 'desk2', side: 1, at: [1.9, y + 0.1], gap: 0.03, show: (t) => t >= STEPS[i], area: [0.62, y - 0.08, 3.35, y + 0.3], art(a) {
          a.box('#dfeedd', 0.66, y - 0.05, 2.65, 0.32, 0.04); a.text(str, 0.78, y, size, col, 'left');
        } })),
      // two gears that turn while the code works
      { fold: 'float', on: 'desk2', side: 1, at: [4.06, 2.2], gap: 0.05, spin: turning(-3.2), area: [3.6, 1.74, 4.52, 2.66], art(a) { gear(a, C.yellow, 4.06, 2.2, 0.42, 10); } },
      { fold: 'float', on: 'desk2', side: 1, at: [4.1, 1.2], gap: 0.05, spin: turning(4.2), area: [3.72, 0.82, 4.48, 1.58], art(a) { gear(a, C.sky, 4.1, 1.2, 0.34, 8); } },
      // the tick stamp: checked (lands on "marks the quizzes")
      { fold: 'float', on: 'desk2', side: 1, at: [3.0, 1.52], gap: 0.12, sway: 1.6, show: (t) => t >= MARK, area: [2.5, 1.02, 3.5, 2.02], art(a) {
        a.disc('#eaf5ee', 3.0, 1.52, 0.44); a.line(C.deep, 0.06, (c) => c.arc(3.0, 1.52, 0.44, 0, 7)); a.line(C.deep, 0.02, (c) => c.arc(3.0, 1.52, 0.36, 0, 7));
        a.line(C.deep, 0.11, (c) => { c.moveTo(2.8, 1.54); c.lineTo(2.95, 1.38); c.lineTo(3.22, 1.71); });
      } },
      // the problem card in the gutter
      { fold: 'v', z: 0.7, alpha: 60, size: [4.0, 1.0], art(a) {
        a.box(C.navy, -1.95, -0.1, 3.9, 0.98, 0.14); a.box(C.cream, -1.85, 0.0, 3.7, 0.78, 0.1);
        a.text('I = 0.5 A,  R = 4 Ω,  V = ?', 0, 0.28, 0.25, C.navy);
      } },
    ],
  },
);

// the agent team (model ids in backend/src: sarvam-prism, sarvam-105b, deepseekv4.1-flash-1017, gemma4, glm5.3-flash,
// saaras:v4 + bulbul:v4-flash). All models are served through Sarvam Token Factory (owner: the correct name).
const AGENTS = [
  { name: 'ROUTER', model: ['Sarvam Prism'], job: ['sorts each', 'question'], col: C.coral, icon: 'route' },
  { name: 'TUTOR', model: ['Sarvam 105B'], job: ['explains and', 'gives hints'], col: C.emerald, icon: 'chat' },
  { name: 'MATHS & QUIZ', model: ['DeepSeek', 'V4.1 Flash'], job: ['sets up sums', 'and quizzes'], col: C.amber, icon: 'maths' },
  { name: 'PHOTO', model: ['Gemma 4'], job: ['reads photos', 'of notes'], col: '#5b7fb8', icon: 'camera' },
  { name: 'MISTAKE', model: ['GLM 5.3 Flash'], job: ['explains', 'mistakes'], col: '#c0503f', icon: 'mistake' },
  { name: 'VOICE', model: ['Saaras v4 +', 'Bulbul v4'], job: ['listens and', 'speaks'], col: C.deep, icon: 'voice' },
];
const fit = (str, max, w) => Math.min(max, w / widthOf(str, 1));
const agentIcon = (a, kind, x, y) => {
  const W = C.cream;
  if (kind === 'route') { a.disc(W, x - 0.17, y, 0.05); for (const dy of [-0.13, 0, 0.13]) { a.line(W, 0.035, (c) => { c.moveTo(x - 0.15, y); c.lineTo(x + 0.12, y + dy); }); a.disc(W, x + 0.15, y + dy, 0.045); } }
  if (kind === 'chat') { a.box(W, x - 0.2, y - 0.1, 0.4, 0.24, 0.08); a.path(W, (c) => { c.moveTo(x - 0.1, y - 0.08); c.lineTo(x - 0.16, y - 0.2); c.lineTo(x, y - 0.09); }); for (const dx of [-0.09, 0, 0.09]) a.disc(C.emerald, x + dx, y + 0.02, 0.03); }
  if (kind === 'maths') { a.text('+', x - 0.12, y - 0.08, 0.26, W); a.text('×', x + 0.12, y - 0.08, 0.26, W); }
  if (kind === 'camera') { a.box(W, x - 0.2, y - 0.12, 0.4, 0.26, 0.05); a.box(W, x - 0.08, y + 0.1, 0.14, 0.06, 0.02); a.disc('#5b7fb8', x, y, 0.08); a.disc(W, x, y, 0.04); }
  if (kind === 'mistake') { a.line(W, 0.04, (c) => { c.moveTo(x - 0.22, y + 0.09); c.lineTo(x - 0.08, y - 0.07); c.moveTo(x - 0.08, y + 0.09); c.lineTo(x - 0.22, y - 0.07); }); a.line(W, 0.045, (c) => { c.moveTo(x + 0.02, y); c.lineTo(x + 0.08, y - 0.07); c.lineTo(x + 0.22, y + 0.1); }); }
  if (kind === 'voice') { micGlyph(a, W, x - 0.06, y); for (const r of [0.12, 0.2]) a.line(W, 0.025, (c) => c.arc(x - 0.06, y + 0.02, r, -0.6, 0.6)); }
};
SPREADS.push(
  { // ------------------------------------------------------------ 5. the AI agent team
    words: ['A team of', 'AI agents'], em: 0.72,
    floor(a) {
      a.box('#e7e2f3', -5.42, -3.02, 10.84, 6.04, 0.45);
      a.clip((c) => c.roundRect(-5.42, -3.02, 10.84, 6.04, 0.45), () => { for (let x = -5.2; x < 5.4; x += 0.4) for (let y = -2.8; y < 3; y += 0.4) a.disc('#d2cae8', x, y, 0.03); });
      const r = K.rng(44); for (let i = 0; i < 10; i++) { const x = r.range(-5, 5), y = r.range(-2.7, 2.6); if (Math.abs(y + 1.9) < 0.8 && Math.abs(x) < 4.3) continue; a.disc(r.pick([C.coral, C.yellow, C.sage, C.sky]), x, y, 0.09); }
    },
    parts: [
      { id: 'hq', fold: 'v', z: -1.0, alpha: 76, size: [9.8, 3.35], art(a) {
        a.box(C.navy, -4.8, -0.1, 9.6, 3.35, 0.16);
        // a network of nodes behind the cards
        const r = K.rng(12), nodes = Array.from({ length: 18 }, () => [r.range(-4.5, 4.5), r.range(0.3, 2.55)]);
        nodes.forEach(([x, y], i) => { const [x2, y2] = nodes[(i * 7 + 3) % nodes.length]; a.line('#3a5487', 0.025, (c) => { c.moveTo(x, y); c.lineTo(x2, y2); }); });
        nodes.forEach(([x, y]) => a.disc('#4e6a9c', x, y, 0.05));
        a.disc(C.cream, -4.35, 2.95, 0.15); a.image(logoImg, -4.35, 2.95, 0.27);
        a.text('The VigyanVerse AI agent team', -4.1, 2.88, 0.24, C.cream, 'left');
        a.text('models served by Sarvam Token Factory', 4.55, 2.88, 0.17, C.sky, 'right');
      } },
      // six agent cards, each rising through its own slit
      ...AGENTS.map((g, k) => {
        const side = k < 3 ? -1 : 1, x0 = side < 0 ? -4.68 + k * 1.55 : 0.08 + (k - 3) * 1.55, w = 1.5, cx = x0 + w / 2;
        return { fold: 'box', on: 'hq', span: [x0, x0 + w], depth: 1.1, strap: 0.5, height: 2.35, slide: rise(teamAt(k), 2.65), art(a) {
          a.box(g.col, x0, -0.1, w, 2.42, 0.14); a.box(C.cream, x0 + 0.07, -0.03, w - 0.14, 1.95, 0.1);
          agentIcon(a, g.icon, cx, 2.12);
          a.text(g.name, cx, 1.58, fit(g.name, 0.22, w - 0.22), C.navy);
          a.text('agent', cx, 1.36, 0.15, '#6b7a8c');
          const pillH = 0.18 + 0.2 * g.model.length; a.box(C.navy, x0 + 0.13, 1.18 - pillH, w - 0.26, pillH, 0.08);
          g.model.forEach((m, i) => a.text(m, cx, 1.18 - 0.22 - 0.2 * i, fit(m, 0.16, w - 0.38), C.cream));
          g.job.forEach((j, i) => a.text(j, cx, 0.38 - 0.18 * i, fit(j, 0.15, w - 0.24), g.col === C.emerald || g.col === C.deep ? C.deep : g.col));
        } };
      }),
    ],
  },
);

// ---------------------------------------------------------------- spread 6: the workflow map
// stations on the open spread: [x, y] (x across, 0 = gutter; y toward the back)
const ST = { you: [-4.3, -0.6], photo: [-2.4, 0.7], voice: [-2.4, -1.9], router: [0.6, -0.6], ncert: [2.4, 0.75], tutor: [4.3, 0.05], maths: [4.3, -1.85] };
const polyline = (pts) => { const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), total = seg.reduce((a, b) => a + b, 0);
  return (u) => { let d = K.clamp(u) * total; for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) { const k = seg[i] ? K.clamp(d / seg[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; } d -= seg[i]; } return pts[pts.length - 1]; }; };
// a token's trip: pts along the track, from t0 for dur seconds; it stands on its start pad a moment, slides, and is taken in
const TRIPS = [
  { kind: 'photo', pts: [ST.you, [-3.4, 0.7], ST.photo], t0: FLOW.photo - 0.1, dur: 1.0 },
  { kind: 'voice', pts: [ST.you, [-3.4, -1.9], ST.voice], t0: FLOW.voice - 0.1, dur: 1.0 },
  { kind: 'text', pts: [ST.photo, [-0.6, 0.7], [-0.6, -0.6], ST.router], t0: FLOW.router - 0.2, dur: 1.1 },
  { kind: 'text', pts: [ST.voice, [-0.6, -1.9], [-0.6, -0.6], ST.router], t0: FLOW.router - 0.05, dur: 1.1 },
  { kind: 'q', pts: [ST.router, [2.0, -0.6], [2.0, 0.05], ST.tutor], t0: FLOW.tutor - 0.15, dur: 1.0 },
  { kind: 'q', pts: [ST.router, [2.0, -0.6], [2.0, -1.85], ST.maths], t0: FLOW.maths - 0.15, dur: 1.0 },
  { kind: 'page', pts: [ST.ncert, [3.3, 0.75], [3.3, 0.05], ST.tutor], t0: FLOW.ncert - 0.1, dur: 0.85 },
  { kind: 'page', pts: [ST.ncert, [3.3, 0.75], [3.3, -1.85], ST.maths], t0: FLOW.ncert + 0.1, dur: 0.95 },
  { kind: 'answer', pts: [ST.tutor, [5.0, 0.05], [5.0, -2.7], [-4.3, -2.7], ST.you], t0: FLOW.answer - 0.1, dur: 1.9 },
  { kind: 'answer', pts: [ST.maths, [4.3, -2.7], [-4.3, -2.7], ST.you], t0: FLOW.answer + 0.15, dur: 1.75 },
];
TRIPS.forEach((tr) => { tr.at = polyline(tr.pts); tr.end = tr.t0 + tr.dur; });
// station hops: a little jump each time a token arrives
const arrivals = (station) => TRIPS.filter((tr) => { const p = tr.pts[tr.pts.length - 1]; return p === ST[station]; }).map((tr) => tr.end);
const hopper = (station) => { const at = arrivals(station); return (t) => at.reduce((h, a) => h + (t > a && t < a + 0.35 ? 0.16 * Math.sin(Math.PI * (t - a) / 0.35) : 0), 0); };
const SIGNS = [
  { key: 'you', name: 'YOU', sub: ['the student'], col: C.coral },
  { key: 'photo', name: 'PHOTO', sub: ['agent', 'Gemma 4'], col: '#5b7fb8' },
  { key: 'voice', name: 'VOICE', sub: ['agent', 'Saaras + Bulbul'], col: C.deep },
  { key: 'router', name: 'ROUTER', sub: ['agent', 'Sarvam Prism'], col: C.coral },
  { key: 'ncert', name: 'NCERT', sub: ['page search', 'code'], col: C.emerald },
  { key: 'tutor', name: 'TUTOR', sub: ['agent', 'Sarvam 105B'], col: C.emerald },
  { key: 'maths', name: 'MATHS', sub: ['agent', 'DeepSeek + code'], col: C.amber },
];
const tokenArt = (kind) => (a) => {
  const W = 0.56, x0 = -W / 2, y0 = 0.0;
  a.ctx.save(); a.ctx.scale(1.3, 1.3);   // drawn at 0.56, shown 30% bigger
  const card = (col) => a.box(col, x0, y0, W, W, 0.1);
  if (kind === 'photo') { card('#5b7fb8'); a.box(C.cream, -0.18, 0.15, 0.36, 0.24, 0.04); a.disc('#5b7fb8', 0, 0.27, 0.07); a.box(C.cream, -0.06, 0.38, 0.12, 0.05, 0.02); }
  if (kind === 'voice') { card(C.deep); micGlyph(a, C.cream, 0, 0.3); }
  if (kind === 'text') { card(C.cream); a.line(C.navy, 0.025, (c) => c.roundRect(x0 + 0.02, y0 + 0.02, W - 0.04, W - 0.04, 0.08)); for (let k = 0; k < 3; k++) a.box('#7d8ea3', -0.17, 0.38 - k * 0.1, k === 2 ? 0.2 : 0.34, 0.035, 0.015); }
  if (kind === 'q') { card(C.coral); a.text('?', 0, 0.12, 0.42, C.cream); }
  if (kind === 'page') { card(C.cream); a.box(C.emerald, x0, 0.38, W, 0.18, [0.1, 0.1, 0, 0]); a.text('NCERT', 0, 0.42, 0.1, C.cream); for (let k = 0; k < 3; k++) a.box('#9fb0b5', -0.18, 0.27 - k * 0.08, 0.36, 0.03, 0.015); }
  if (kind === 'answer') { card(C.cream); a.line(C.deep, 0.03, (c) => c.roundRect(x0 + 0.02, y0 + 0.02, W - 0.04, W - 0.04, 0.08)); a.line(C.deep, 0.07, (c) => { c.moveTo(-0.15, 0.28); c.lineTo(-0.04, 0.16); c.lineTo(0.17, 0.4); }); }
  a.ctx.restore();
};
SPREADS.push(
  { // ------------------------------------------------------------ 6. the workflow: how my question travels
    floor(a) {
      a.box('#f4ecdb', -5.42, -3.02, 10.84, 6.04, 0.45);
      a.clip((c) => c.roundRect(-5.42, -3.02, 10.84, 6.04, 0.45), () => { for (let x = -5.2; x < 5.4; x += 0.4) for (let y = -2.8; y < 3; y += 0.4) a.disc('#e6dcc6', x, y, 0.025); });
      a.text('How my question travels', -5.05, 2.55, 0.4, C.navy, 'left');
      a.text('agents = AI   ·   page search + sums = code', 5.05, 2.6, 0.19, '#6b7a8c', 'right');
      // the tracks (drawn under the pads): AI paths coral, code paths emerald, the way back green
      const track = (pts, col) => { a.line(C.cream, 0.2, (c) => pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])))); a.line(col, 0.06, (c) => pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))), [0.12, 0.12]); };
      TRIPS.forEach((tr) => track(tr.pts, tr.kind === 'page' ? C.emerald : tr.kind === 'answer' ? C.deep : C.coral));
      // pads, one under each station
      Object.entries(ST).forEach(([k, [x, y]]) => { const g = SIGNS.find((q) => q.key === k); a.disc(C.cream, x, y, 0.5); a.disc(g.col, x, y, 0.42); a.disc(C.cream, x, y, 0.3); });
    },
    parts: [
      // the station signs, standing just behind their pads
      ...SIGNS.map((g) => ({ fold: 'stand', at: [ST[g.key][0], ST[g.key][1] + 0.42], size: [1.5, 1.05], hop: hopper(g.key), art(a) {
        a.box(g.col, -0.75, -0.1, 1.5, 1.15, 0.12); a.box(C.cream, -0.68, -0.03, 1.36, 0.8, 0.08);
        a.text(g.name, 0, 0.82, fit(g.name, 0.22, 1.3), C.cream);
        g.sub.forEach((t, i) => a.text(t, 0, 0.5 - 0.26 * i, fit(t, i ? 0.17 : 0.15, 1.24), i ? C.navy : '#6b7a8c'));
      } })),
      // the tokens, each visible only on its trip
      ...TRIPS.map((tr) => ({ fold: 'stand', size: [0.8, 0.8], path: (t) => tr.at(K.ease.inOut(K.seg(t, tr.t0 + 0.15, tr.end))), show: (t) => t >= tr.t0 && t < tr.end + 0.12, art: tokenArt(tr.kind) })),
    ],
  },
);

// ---------------------------------------------------------------- spread 7: hints + Bindu explains
// Bindu, the app's mascot (frontend/src/components/mascot/Bindu.tsx): a conical flask with a face, green liquid, gold
// rim. Drawn from the same SVG shape; (x, y) = bottom centre, s = height in world units.
const binduFlask = (a, x, y, s) => {
  const k = s / 126, P = (X, Y) => [x + (X - 60) * k, y + (126 - Y) * k];
  const body = (c) => { c.moveTo(...P(46, 10)); c.lineTo(...P(74, 10)); c.lineTo(...P(74, 44)); c.lineTo(...P(106, 112)); c.quadraticCurveTo(...P(110, 126), ...P(96, 126)); c.lineTo(...P(24, 126)); c.quadraticCurveTo(...P(10, 126), ...P(14, 112)); c.lineTo(...P(46, 44)); c.closePath(); };
  a.path('#221e17', (c) => { c.save(); body(c); c.restore(); }); a.ctx.lineWidth = 6 * k; a.ctx.strokeStyle = '#221e17'; a.ctx.stroke();
  a.path('#fdf8ec', body);
  a.clip(body, () => { a.box('#3f8f66', x - 1, y, 2, (126 - 84) * k); a.disc('#a8dcb0', ...P(40, 104), 4 * k); a.disc('#a8dcb0', ...P(76, 112), 3 * k); });
  a.box('#c9a24a', ...P(41, 14), 38 * k, 9 * k, 4 * k);
  a.disc('#221e17', ...P(46, 66), 4.5 * k); a.disc('#221e17', ...P(74, 66), 4.5 * k); a.disc('#ffffff', ...P(47.5, 64.5), 1.4 * k); a.disc('#ffffff', ...P(75.5, 64.5), 1.4 * k);
  a.disc('#e8907a', ...P(38, 75), 4 * k); a.disc('#e8907a', ...P(82, 75), 4 * k);
  a.line('#221e17', 3 * k, (c) => { c.moveTo(...P(50, 80)); c.quadraticCurveTo(...P(60, 88), ...P(70, 80)); });
};
const boardText = (a, str, x, y, size, col) => a.text(str, x, y, size, col, 'left', '700 100px "Kalam"');
SPREADS.push(
  { // ------------------------------------------------------------ 7. learn to think: hint mode, and Bindu explains
    words: ['Hints &', 'lessons'], em: 0.74,
    floor(a) {
      a.box('#fbefd3', -5.42, -3.02, 5.42, 6.04, [0.45, 0, 0, 0.45]); a.box('#e3f1ec', 0, -3.02, 5.42, 6.04, [0, 0.45, 0.45, 0]);
      const r = K.rng(77); for (let i = 0; i < 14; i++) { const x = r.range(-5.1, 5.1), y = r.range(-2.8, 2.7); if (Math.abs(y + 1.9) < 0.75 && Math.abs(x) < 3.5) continue; x < 0 ? a.text('?', x, y, 0.32, '#f0c98a') : star(a, '#bcdccf', x, y, 0.12); }
    },
    parts: [
      { id: 'learn', fold: 'v', z: -1.0, alpha: 76, size: [9.8, 3.35], art(a) {
        // left: hint mode, a stair up to a light bulb
        a.box(C.amber, -4.8, -0.1, 4.62, 3.33, 0.16); a.box('#fbe7b3', -4.7, 0.0, 4.42, 3.13, 0.1);
        a.box(C.coral, -4.55, 2.72, 1.55, 0.32, 0.16); a.text('Hint mode', -3.775, 2.8, 0.19, C.cream);
        a.line('#f2b880', 0.08, (c) => { c.moveTo(-4.5, 0.35); c.lineTo(-4.5, 0.45); c.lineTo(-3.9, 0.45); c.lineTo(-3.9, 1.1); c.lineTo(-3.4, 1.1); c.lineTo(-3.4, 1.75); c.lineTo(-2.9, 1.75); c.lineTo(-2.9, 2.4); c.lineTo(-1.2, 2.4); });
        a.disc('#e8e1cf', -0.85, 2.55, 0.3); a.box(C.navy, -0.98, 2.08, 0.26, 0.22, 0.05); a.line('#b8ad94', 0.025, (c) => { c.moveTo(-0.95, 2.45); c.lineTo(-0.85, 2.62); c.lineTo(-0.75, 2.45); });   // the bulb, off
        // right: the whiteboard
        a.box('#9aa7b0', 0.18, 0.15, 4.6, 3.05, 0.1); a.box('#fbfbf7', 0.3, 0.27, 4.36, 2.81, 0.06);
        a.box(C.navy, 0.6, 0.02, 3.7, 0.16, 0.05); a.box(C.coral, 3.5, 0.17, 0.5, 0.08, 0.03); a.box('#2d5fa8', 2.9, 0.17, 0.5, 0.08, 0.03);
        a.box(C.emerald, 0.45, 2.72, 1.9, 0.3, 0.15); a.text('Bindu explains', 1.4, 2.79, 0.18, C.cream);
      } },
      // three hint bubbles, popping up one by one as a stair
      ...[['What do we know?', -4.3, 0.6], ['Is u negative here?', -3.8, 1.25], ['So, what is v?', -3.3, 1.9]].map(([str, x, y], i) => (
        { fold: 'float', on: 'learn', side: -1, at: [x + 1.0, y + 0.2], gap: 0.06, sway: 1.2, show: (t) => t >= HINTS[i], area: [x - 0.05, y - 0.05, x + 2.25, y + 0.48], art(a) {
          a.box(C.cream, x, y, 2.2, 0.42, 0.21); a.line(C.coral, 0.03, (c) => c.roundRect(x + 0.04, y + 0.04, 2.12, 0.34, 0.17));
          a.text(str, x + 1.1, y + 0.13, fit(str, 0.19, 1.9), C.navy);
        } })),
      // the bulb lights up: "I got it!"
      { fold: 'float', on: 'learn', side: -1, at: [-0.85, 2.55], gap: 0.05, show: (t) => t >= LIT, area: [-1.5, 1.6, -0.2, 3.2], art(a) {
        for (let k = 0; k < 8; k++) { const q = k * Math.PI / 4 + 0.2; a.line(C.yellow, 0.05, (c) => { c.moveTo(-0.85 + Math.cos(q) * 0.38, 2.55 + Math.sin(q) * 0.38); c.lineTo(-0.85 + Math.cos(q) * 0.55, 2.55 + Math.sin(q) * 0.55); }); }
        a.disc(C.yellow, -0.85, 2.55, 0.3); a.disc('#fff2b8', -0.92, 2.62, 0.12); a.box(C.navy, -0.98, 2.08, 0.26, 0.22, 0.05);
        a.box(C.coral, -1.45, 1.68, 1.2, 0.34, 0.17); a.text('I got it!', -0.85, 1.77, 0.19, C.cream);
      } },
      // the lesson, written line by line
      ...[['Mirror Formula', 0.6, 2.3, 0.3, C.navy], ['1/v + 1/u = 1/f', 0.6, 1.8, 0.3, '#2d5fa8'], ['u = object,  v = image', 0.6, 1.35, 0.22, '#2d5fa8'], ['NCERT p. 143', 0.6, 0.78, 0.24, '#2f7d4f']].map(([str, x, y, size, col], i) => (
        { fold: 'float', on: 'learn', side: 1, at: [x + 1.0, y + 0.15], gap: 0.03, show: (t) => t >= BOARD[i], area: [x - 0.05, y - 0.12, x + 2.75, y + size * 1.25], art(a) {
          a.box('#fbfbf7', x - 0.03, y - 0.08, 2.75, size * 1.25, 0.04); boardText(a, str, x, y, size, col);
          if (i === 0) a.box(C.navy, x, y - 0.07, widthOf('Mirror Formula', size) * 0.86, 0.025);
          if (i === 3) { a.box('#2f7d4f', x, y - 0.06, 1.55, 0.025); a.line('#2f7d4f', 0.05, (c) => { c.moveTo(x + 1.75, y + 0.1); c.lineTo(x + 1.85, y); c.lineTo(x + 2.05, y + 0.22); }); }
        } })),
      // the marker, pinned near the top of the board, wiggling while it writes
      { fold: 'float', on: 'learn', side: 1, at: [3.55, 2.95], gap: 0.16, spin: (t) => { const on = K.seg(t, BOARD[0], BOARD[0] + 0.15) * (1 - K.seg(t, BOARD[3] + 0.2, BOARD[3] + 0.45)); return on * (0.06 * Math.sin(t * 19) + 0.35 * K.seg(t, BOARD[0], BOARD[3])); }, area: [2.75, 1.85, 3.75, 3.1], art(a) {
        a.line(C.navy, 0.16, (c) => { c.moveTo(3.55, 2.95); c.lineTo(3.05, 2.15); }); a.line('#2d5fa8', 0.17, (c) => { c.moveTo(3.55, 2.95); c.lineTo(3.42, 2.74); });
        a.path('#2d5fa8', (c) => { c.moveTo(3.1, 2.1); c.lineTo(2.97, 1.97); c.lineTo(3.0, 2.12); });
      } },
      // Bindu pops up beside the board
      { fold: 'float', on: 'learn', side: 1, at: [3.95, 0.45], gap: 0.22, sway: 1.5, bob: 0.03, show: (t) => t >= BINDU, area: [3.35, 0.35, 4.65, 2.2], art(a) {
        binduFlask(a, 3.95, 0.45, 1.15);
        a.box(C.cream, 3.4, 1.72, 1.2, 0.4, 0.2); a.line(C.emerald, 0.03, (c) => c.roundRect(3.44, 1.76, 1.12, 0.32, 0.16)); a.text("Let's see!", 4.0, 1.85, 0.16, C.emerald);
      } },
    ],
  },
);

// ---------------------------------------------------------------- spread 8: practise and revise
const MARK_OK = [true, true, false, true, true];
const BARS = [['Light', 2.02, 0.4, 0.8], ['Electricity', 1.57, 0.62, 0.62], ['Life Processes', 1.12, 0.35, 0.35]];   // [chapter, y, before, after]
const BAR_X = [2.85, 4.55];
const calendar = (variant) => (a) => {
  a.box(C.navy, -1.2, -0.1, 2.4, 2.28, 0.14); a.box(C.cream, -1.12, -0.02, 2.24, 2.1, 0.1);
  a.box(C.coral, -1.12, 1.68, 2.24, 0.4, [0.1, 0.1, 0, 0]); a.text('Revise next', 0, 1.79, 0.2, C.cream);
  for (const x of [-0.6, 0.6]) { a.box('#9aa7b0', x - 0.05, 1.95, 0.1, 0.28, 0.05); }
  if (variant === 0) { a.text('Today', 0, 1.05, 0.36, '#9aa7b0'); }
  if (variant >= 1) { a.text('Light', 0, 1.22, 0.36, C.navy); a.text('Chapter 9', 0, 1.0, 0.15, '#6b7a8c'); }
  if (variant === 2) { a.box(C.deep, -0.85, 0.6, 1.7, 0.3, 0.15); a.text('tomorrow', 0, 0.67, 0.2, C.cream); }
};
SPREADS.push(
  { // ------------------------------------------------------------ 8. practise: quizzes marked by code, mistakes explained, revise next
    words: ['Practise,', 'then revise'], em: 0.7,
    floor(a) {
      a.box('#eef3e1', -5.42, -3.02, 10.84, 6.04, 0.45);
      a.clip((c) => c.roundRect(-5.42, -3.02, 10.84, 6.04, 0.45), () => { for (let y = -2.7; y < 3; y += 0.36) a.box('#dbe5c6', -5.5, y, 11, 0.022); });
      const r = K.rng(88); for (let i = 0; i < 12; i++) { const x = r.range(-5.1, 5.1), y = r.range(-2.8, 2.7); if (Math.abs(y + 1.9) < 0.75 && Math.abs(x) < 3.6) continue; a.line(C.sage, 0.06, (c) => { c.moveTo(x - 0.12, y); c.lineTo(x - 0.03, y - 0.1); c.lineTo(x + 0.14, y + 0.12); }); }
    },
    parts: [
      { id: 'practise', fold: 'v', z: -1.0, alpha: 76, size: [9.8, 3.35], art(a) {
        // left: the quiz sheet
        a.box(C.navy, -4.8, -0.1, 4.62, 3.33, 0.16); a.box('#fffdf6', -4.7, 0.0, 4.42, 3.13, 0.1);
        a.text('Quiz · Light · 5 questions', -4.5, 2.72, 0.2, C.navy, 'left');
        a.box('#e5dccb', -4.5, 2.6, 3.4, 0.02);
        for (let q = 0; q < 5; q++) {
          const y = 2.25 - q * 0.45;
          a.text(`Q${q + 1}`, -4.5, y - 0.06, 0.17, C.coral, 'left');
          a.box('#cfc6b4', -4.05, y + 0.03, 1.6 + (q % 2) * 0.35, 0.04, 0.02);
          for (let o = 0; o < 4; o++) { const ox = -4.0 + o * 0.6, pick = o === (q * 2 + 1) % 4; a.disc(pick ? C.navy : '#fffdf6', ox, y - 0.17, 0.07); a.line('#7d8ea3', 0.02, (c) => c.arc(ox, y - 0.17, 0.07, 0, 7)); a.box('#dcd3c2', ox + 0.12, y - 0.19, 0.3, 0.035, 0.015); }
        }
        // right: My Learning, chapter mastery
        a.box(C.navy, 0.18, -0.1, 4.62, 3.33, 0.16); a.box('#f5faf6', 0.28, 0.0, 4.42, 3.13, 0.1);
        a.box(C.emerald, 0.45, 2.66, 1.55, 0.32, 0.16); a.text('My Learning', 1.225, 2.74, 0.18, C.cream);
        a.text('Chapter mastery', 2.15, 2.74, 0.18, '#6b7a8c', 'left'); a.box('#e5ece7', 1.1, 2.5, 3.4, 0.02);
        BARS.forEach(([name, y, before]) => {
          a.text(name, 1.35, y - 0.06, 0.18, C.navy, 'left');
          a.box('#e3ece6', BAR_X[0], y - 0.1, BAR_X[1] - BAR_X[0], 0.22, 0.11); a.line('#9aa7b0', 0.02, (c) => c.roundRect(BAR_X[0], y - 0.1, BAR_X[1] - BAR_X[0], 0.22, 0.11));
          a.box(name === 'Light' ? C.sage : '#9cc6b8', BAR_X[0], y - 0.1, (BAR_X[1] - BAR_X[0]) * before, 0.22, 0.11);
        });
      } },
      // the marks, one after another
      ...MARK_OK.map((ok, q) => { const y = 2.25 - q * 0.45 + 0.1, x = -1.4; return { fold: 'float', on: 'practise', side: -1, at: [x, y - 0.1], gap: 0.04, show: (t) => t >= MARKS[q], area: [x - 0.25, y - 0.35, x + 0.25, y + 0.15], art(a) {
        if (ok) a.line(C.deep, 0.07, (c) => { c.moveTo(x - 0.16, y - 0.1); c.lineTo(x - 0.05, y - 0.22); c.lineTo(x + 0.17, y + 0.06); });
        else a.line(C.coral, 0.07, (c) => { c.moveTo(x - 0.14, y + 0.03); c.lineTo(x + 0.14, y - 0.25); c.moveTo(x + 0.14, y + 0.03); c.lineTo(x - 0.14, y - 0.25); });
      } }; }),
      // the score stamp
      { fold: 'float', on: 'practise', side: -1, at: [-0.95, 2.6], gap: 0.1, sway: 1.5, show: (t) => t >= SCORE, area: [-1.45, 2.15, -0.4, 3.05], art(a) {
        a.disc('#eaf5ee', -0.92, 2.6, 0.4); a.line(C.deep, 0.05, (c) => c.arc(-0.92, 2.6, 0.4, 0, 7)); a.text('4/5', -0.92, 2.5, 0.3, C.deep);
      } },
      // the mistake note, pinned by the cross
      { fold: 'float', on: 'practise', side: -1, at: [-1.6, 1.25], gap: 0.12, sway: 1.3, show: (t) => t >= MISTAKE, area: [-4.4, 0.3, -1.5, 1.3], art(a) {
        a.path('#fde2d7', (c) => c.roundRect(-4.35, 0.35, 2.8, 0.9, 0.08)); a.line(C.coral, 0.025, (c) => c.roundRect(-4.31, 0.39, 2.72, 0.82, 0.06));
        a.text('Mistake agent', -4.2, 1.03, 0.15, C.coral, 'left');
        a.text('u is negative: the object', -4.2, 0.78, 0.17, C.navy, 'left');
        a.text('is in front of the mirror.', -4.2, 0.55, 0.17, C.navy, 'left');
        a.disc(C.coral, -1.65, 1.18, 0.06);
      } },
      // the Light bar growing after the quiz: four strips of fill
      ...GROW.map((t0, i) => { const [, y, before, after] = BARS[0], L = BAR_X[1] - BAR_X[0], w = L * (before + (after - before) * (i + 1) / 4); return { fold: 'float', on: 'practise', side: 1, at: [BAR_X[0] + w / 2, y], gap: 0.02 + 0.004 * i, show: (t) => t >= t0 && (i === 3 || t < GROW[i + 1]), area: [BAR_X[0] - 0.02, y - 0.12, BAR_X[0] + w + 0.02, y + 0.14], art(a) { a.box(C.deep, BAR_X[0], y - 0.1, w, 0.22, 0.11); } }; }),
      // the desk calendar in the gutter: Today -> Light -> Light, tomorrow
      ...[0, 1, 2].map((v) => ({ fold: 'v', z: 0.7, alpha: 60, size: [2.5, 2.35], show: (t) => (v === 0 ? t < CHAPTER : v === 1 ? t >= CHAPTER && t < WHEN : t >= WHEN), art: calendar(v) })),
    ],
  },
);

// ---------------------------------------------------------------- spread 9: fair prices
// Facts from frontend/src/lib/policies.ts (2026-11-23): packs from ₹10, 1 credit = ₹1, a typed question ₹0.50; only AI
// tasks cost credits (videos and progress are free), no subscription, no ads. No free credits: the coin is a top-up.
const METER = [-4.3, -1.6, 1.95];                               // the credits meter: x from, x to, y
const coinSlide = (t) => (t < DROP ? -2.2 : 2.0 - 3.4 * K.ease.in(K.seg(t, DROP, LANDS + 0.12)));   // falls through the slot
const padlock = (closed) => (a) => {
  // a shield with a padlock (each student's work is kept apart), the shackle clicks shut on LOCK
  a.path(C.navy, (c) => { c.moveTo(-0.85, 1.85); c.lineTo(0.85, 1.85); c.lineTo(0.85, 1.0); c.quadraticCurveTo(0.8, 0.3, 0, -0.05); c.quadraticCurveTo(-0.8, 0.3, -0.85, 1.0); c.closePath(); });
  a.path(C.cream, (c) => { c.moveTo(-0.73, 1.73); c.lineTo(0.73, 1.73); c.lineTo(0.73, 1.02); c.quadraticCurveTo(0.69, 0.42, 0, 0.1); c.quadraticCurveTo(-0.69, 0.42, -0.73, 1.02); c.closePath(); });
  const up = closed ? 0 : 0.16;
  a.line('#7d8ea3', 0.09, (c) => { c.moveTo(-0.22, 1.15); c.lineTo(-0.22, 1.15 + up); c.arc(0, 1.15 + up, 0.22, Math.PI, 0, true); if (closed) c.lineTo(0.22, 1.15); });
  a.box(C.gold, -0.34, 0.62, 0.68, 0.56, 0.08); a.disc(C.navy, 0, 0.94, 0.07); a.box(C.navy, -0.025, 0.74, 0.05, 0.18);
  a.box(C.deep, -0.95, 1.97, 1.9, 0.34, 0.17); a.text('Kept private', 0, 2.06, 0.18, C.cream);
};
SPREADS.push(
  { // ------------------------------------------------------------ 9. fair: credits from ₹10, ₹0.50 a question, free videos + progress, no ads
    words: ['From ₹10,', 'no subscription'], em: 0.56,
    floor(a) {
      a.box('#fbf0dc', -5.42, -3.02, 10.84, 6.04, 0.45);
      const r = K.rng(99); for (let i = 0; i < 14; i++) { const x = r.range(-5.1, 5.1), y = r.range(-2.8, 2.7); if (Math.abs(y + 1.9) < 0.75 && Math.abs(x) < 3.6) continue; a.line('#ecd3a2', 0.04, (c) => c.arc(x, y, 0.15, 0, 7)); a.text('₹', x, y - 0.07, 0.18, '#e2c38a'); }
    },
    parts: [
      { id: 'fair', fold: 'v', z: -1.0, alpha: 76, size: [9.8, 3.35], art(a) {
        // left: credits, a meter that fills when the coin goes in
        a.box(C.amber, -4.8, -0.1, 4.62, 3.33, 0.16); a.box('#fdf5e2', -4.7, 0.0, 4.42, 3.13, 0.1);
        a.box(C.coral, -4.55, 2.66, 1.25, 0.32, 0.16); a.text('Credits', -3.925, 2.74, 0.18, C.cream);
        a.text('₹0', -0.45, 2.62, 0.42, '#b9ad97', 'right');
        const [x0, x1, y] = METER; a.box('#efe4cc', x0, y - 0.16, x1 - x0, 0.32, 0.16); a.line('#c4a979', 0.025, (c) => c.roundRect(x0, y - 0.16, x1 - x0, 0.32, 0.16));
        a.text('₹0', x0 + 0.12, y - 0.45, 0.15, '#8b7d66'); a.text('₹10', x1 - 0.15, y - 0.45, 0.15, '#8b7d66');
        a.text('1 credit = ₹1', -4.5, 1.0, 0.21, C.navy, 'left');
        a.text('You pay only for AI help', -4.5, 0.62, 0.17, '#6b7a8c', 'left');
        // right: prices, a video card and a progress card
        a.box(C.navy, 0.18, -0.1, 4.62, 3.33, 0.16); a.box('#f5f8fb', 0.28, 0.0, 4.42, 3.13, 0.1);
        a.box(C.navy, 0.45, 2.66, 1.1, 0.32, 0.16); a.text('Prices', 1.0, 2.74, 0.18, C.cream);
        a.box(C.navy, 1.25, 0.2, 1.55, 1.45, 0.1); a.box('#dfe9f3', 1.33, 0.55, 1.39, 1.02, 0.06);
        a.path(C.coral, (c) => { c.moveTo(1.88, 0.82); c.lineTo(1.88, 1.3); c.lineTo(2.28, 1.06); c.closePath(); }); a.text('Videos', 2.025, 0.3, 0.17, C.cream);
        a.box(C.emerald, 3.05, 0.2, 1.55, 1.45, 0.1); a.box('#e6f2ec', 3.13, 0.55, 1.39, 1.02, 0.06);
        [0.5, 0.85, 0.65].forEach((w, k) => a.box(C.sage, 3.25, 1.3 - k * 0.24, 1.1 * w, 0.14, 0.07)); a.text('Progress', 3.825, 0.3, 0.17, C.cream);
      } },
      // the ₹10 coin: drops from above and goes through the slot in the page
      { fold: 'box', on: 'fair', span: [-3.45, -2.45], depth: 0.6, strap: 0.45, height: 1.0, slide: coinSlide, show: (t) => t >= DROP && t < LANDS + 0.2, art(a) {
        a.disc(C.amber, -2.95, 0.45, 0.5); a.disc(C.yellow, -2.95, 0.45, 0.43); a.line(C.honey, 0.03, (c) => c.arc(-2.95, 0.45, 0.36, 0, 7));
        a.text('₹10', -2.95, 0.34, 0.3, C.amber);
      } },
      // the slot box standing on the page, where the coin goes in
      { fold: 'stand', at: [-2.95, 0.45], size: [1.7, 0.6], art(a) {
        a.box(C.amber, -0.85, -0.1, 1.7, 0.65, 0.1); a.box(C.navy, -0.5, 0.36, 1.0, 0.09, 0.045); a.text('Top up', 0, 0.04, 0.18, C.cream);
      } },
      // the meter filling in four steps, then the readout ₹0 -> ₹10
      ...FILL.map((t0, i) => { const [x0, x1, y] = METER, w = (x1 - x0) * (i + 1) / 4; return { fold: 'float', on: 'fair', side: -1, at: [x0 + w / 2, y], gap: 0.02 + 0.004 * i, show: (t) => t >= t0 && (i === 3 || t < FILL[i + 1]), area: [x0 - 0.02, y - 0.18, x0 + w + 0.02, y + 0.18], art(a) { a.box(C.honey, x0, y - 0.16, w, 0.32, 0.16); } }; }),
      { fold: 'float', on: 'fair', side: -1, at: [-0.9, 2.78], gap: 0.05, sway: 1.2, show: (t) => t >= FILL[3], area: [-1.6, 2.5, -0.33, 3.1], art(a) {
        a.box('#fdf5e2', -1.6, 2.52, 1.27, 0.56, 0.08); a.text('₹10', -0.45, 2.62, 0.42, C.deep, 'right');
      } },
      // the price tag, hanging from a pin
      { fold: 'float', on: 'fair', side: 1, at: [0.7, 2.5], gap: 0.1, sway: 1.6, spin: () => -0.05, show: (t) => t >= TAG, area: [0.6, 1.88, 4.05, 2.6], art(a) {
        a.line('#9aa7b0', 0.025, (c) => { c.moveTo(0.7, 2.5); c.lineTo(1.47, 2.24); }); a.disc(C.navy, 0.7, 2.5, 0.06);
        a.path(C.coral, (c) => { c.moveTo(1.3, 2.24); c.lineTo(1.55, 2.52); c.lineTo(3.95, 2.52); c.lineTo(3.95, 1.96); c.lineTo(1.55, 1.96); c.closePath(); });
        a.disc(C.cream, 1.48, 2.24, 0.05);
        const s = '₹0.50 a question'; a.text(s, 2.75, 2.15, fit(s, 0.24, 2.2), C.cream);
      } },
      // FREE stamps on the video card and the progress card
      ...[[2.025, 1.06], [3.825, 1.06]].map(([x, y], i) => ({ fold: 'float', on: 'fair', side: 1, at: [x, y], gap: 0.08, sway: 1.5, spin: () => 0.22, show: (t) => t >= FREE[i], area: [x - 0.5, y - 0.5, x + 0.5, y + 0.5], art(a) {
        a.disc(C.cream, x, y, 0.46); a.line(C.deep, 0.05, (c) => c.arc(x, y, 0.4, 0, 7)); a.text('FREE', x, y - 0.08, 0.24, C.deep);
      } })),
      // no ads
      { fold: 'float', on: 'fair', side: 1, at: [4.2, 2.8], gap: 0.06, sway: 1.4, show: (t) => t >= ADS, area: [2.85, 2.44, 4.58, 3.16], art(a) {
        a.text('No ads', 3.78, 2.72, 0.22, C.coral, 'right');
        a.disc('#fdecea', 4.2, 2.8, 0.34); a.line(C.coral, 0.05, (c) => c.arc(4.2, 2.8, 0.3, 0, 7)); a.text('ADS', 4.2, 2.73, 0.17, C.navy);
        a.line(C.coral, 0.05, (c) => { c.moveTo(3.99, 2.59); c.lineTo(4.41, 3.01); });
      } },
      // the padlock shield in the gutter: open, then shut
      ...[0, 1].map((v) => ({ fold: 'v', z: 0.7, alpha: 60, size: [2.1, 2.35], show: (t) => (v ? t >= LOCK : t < LOCK), art: padlock(v === 1) })),
    ],
  },
);

// ---------------------------------------------------------------- spread 10: the next morning, solved
// The same room and desk as spread 1 (roomArt / deskArt), now in the morning: sun in the window, the clock at 7, the
// girl smiling, her laptop showing the answer with its NCERT page. The reader pulls the tab: the question marks fold
// away and a big green tick rises through a slit; on "page" a tag "Chapter 9 · Page 143" pops up (CITATION).
const QMARKS = SPREADS[0].parts.filter((o) => o.fold === 'float' && o.on === 'desk' && o.bob);   // the three question marks
const FOLD_DIR = [1, 1, -1];                                  // each swings away from her face
SPREADS.push(
  { // ------------------------------------------------------------ 10. the result: solved, with the page to prove it
    words: ['Solved!', 'Page 143'], em: 0.74,
    floor(a) {
      a.box('#f3e6c9', -5.42, -3.02, 10.84, 6.04, 0.45);
      a.clip((c) => c.roundRect(-5.42, -3.02, 10.84, 6.04, 0.45), () => {
        for (let x = -5.4; x < 5.5; x += 0.42) a.box('#e6d4af', x, -3.1, 0.025, 6.2);       // the same graph paper, by day
        for (let y = -3.0; y < 3.1; y += 0.42) a.box('#e6d4af', -5.5, y, 11, 0.025);
      });
      a.disc(C.coral, 0, -0.9, 3.6, 1.55); a.disc(C.pink, 0, -0.9, 3.25, 1.28); a.disc(C.coral, 0, -0.9, 2.9, 1.02);   // the rug
      const r = K.rng(21);
      for (let i = 0; i < 18; i++) { const x = r.range(-5.1, 5.1), y = r.range(-2.8, 2.8); if (Math.abs(y + 0.9) < 1.7 && Math.abs(x) < 3.8) continue; if (x > 3.2 && y < -2.0) continue; leaf(a, x, y, r.range(0.14, 0.24), r.range(0, 6.3), r.pick([C.sage, C.leaf])); }
      // where the pull tab slides out
      a.text('pull', 4.1, -2.66, 0.2, C.coral, 'right'); a.line(C.coral, 0.035, (c) => { c.moveTo(3.25, -2.75); c.lineTo(3.55, -2.75); c.moveTo(3.47, -2.68); c.lineTo(3.55, -2.75); c.lineTo(3.47, -2.82); });
    },
    parts: [
      { id: 'room', fold: 'v', z: -1.0, alpha: 76, size: [9.8, 3.35], art: roomArt(true) },
      SPREADS[0].parts[1],                                      // the pile of books and the globe, as the night before
      SPREADS[0].parts.find((o) => o.fold === 'float' && o.on === 'room'),   // the clock's ticking second hand
      { id: 'desk', fold: 'v', z: 0.7, alpha: 58, size: [5.0, 3.0], art: deskArt(true) },
      // the laptop shows the answer and its page
      { fold: 'float', on: 'desk', side: 1, at: [1.28, 1.61], gap: 0.03, area: [0.6, 1.17, 1.96, 2.05], art(a) {
        a.box('#e9f6f2', 0.65, 1.22, 1.26, 0.78, 0.04); a.box(C.emerald, 0.65, 1.88, 1.26, 0.12, [0.04, 0.04, 0, 0]);
        a.text('1/v + 1/u = 1/f', 1.28, 1.63, 0.13, C.navy);
        a.box(C.sage, 0.8, 1.52, 0.96, 0.035, 0.017); a.box(C.sage, 0.8, 1.44, 0.72, 0.035, 0.017);
        a.box(C.deep, 0.78, 1.26, 1.0, 0.13, 0.065); a.text('NCERT p. 143', 1.28, 1.29, 0.08, C.cream);
      } },
      // the question marks of last night, folding away when the tab is pulled
      ...QMARKS.map((o, i) => ({ ...o, spin: (t) => FOLD_DIR[i] * 1.9 * K.ease.in(K.seg(t, FOLD[i], FOLD[i] + 0.35)), show: (t) => t < FOLD[i] + 0.35 })),
      // the big green tick rises through a slit where the plant stood
      { fold: 'box', on: 'room', span: [2.65, 4.55], depth: 1.2, strap: 0.7, height: 1.9, slide: rise(TICK, 2.15), art(a) {
        a.disc(C.cream, 3.6, 0.85, 0.92); a.disc(C.deep, 3.6, 0.85, 0.84); a.line(C.cream, 0.05, (c) => c.arc(3.6, 0.85, 0.74, 0, 7));
        a.line(C.cream, 0.2, (c) => { c.moveTo(3.18, 0.88); c.lineTo(3.47, 0.58); c.lineTo(4.03, 1.2); });
      } },
      // "with the page to prove it": the chapter and page pop up over the laptop
      { fold: 'float', on: 'desk', side: 1, at: [1.28, 2.05], gap: 0.12, sway: 1.3, show: (t) => t >= PAGE, area: [0.35, 2.0, 2.4, 2.68], art(a) {
        a.box(C.cream, 1.24, 2.0, 0.08, 0.2, 0.03);
        a.box(C.coral, 0.4, 2.18, 1.96, 0.46, 0.23); a.line(C.cream, 0.025, (c) => c.roundRect(0.45, 2.23, 1.86, 0.36, 0.18));
        const str = `Chapter ${CITATION.chapter} · Page ${CITATION.page}`; a.text(str, 1.38, 2.33, fit(str, 0.2, 1.7), C.cream);
      } },
    ],
  },
);

// scene 6b token sounds: a soft slide as each leaves, a tick and a ding as it arrives
TRIPS.forEach((tr, i) => { SOUND_CUES.push([tr.t0 + 0.15, 'whoosh', 0.04], [tr.end, 'paper-tick', 0.1], ...(i >= TRIPS.length - 2 ? [[tr.end + 0.05, 'ding', 0.09]] : [])); });

export const introStyle = {
  id: 'paper-pop-up-intro',
  name: 'Paper Pop-Up: intro',
  topic: 'VigyanVerse AI: how a Class 10 student studies science with it',
  duration: D,
  fonts: ['700 100px "Fraunces"', '700 100px "Kalam"'],
  render: { samples: 24, shutter: 0.5, tone: 'neutral', exposure: 0.9, saturation: 1.1, bloom: 0.12, bloomThreshold: 1.1, vignette: 0.42, grain: 0.014, fov: 26, background: '#050403' },

  async build(S) {
    const { camera, THREE } = S;
    const logo = await new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = staticFile('logo.png'); });
    logoImg = logo;
    const book = makePopupBook(S, {
      C, SPREADS, TURNS: [CUE.turn1, CUE.turn2, CUE.turn3, CUE.turn4, CUE.turn5, CUE.turn6, CUE.turn7, CUE.turn8, CUE.turn9], TURN: 1.25,
      pull: { at: PULL_AT, back: PUSH_BACK, x: [5.15, 5.95], z: 2.55 },   // the pull tab on the last spread (scene 10)
      close: CLOSE,                                           // scene 11: the book shuts on its cover
      cover: {
        open: CUE.cover, cloth: '#1b5c56',
        // the cloth cover (cover units, y up = the top edge of the book): emerald, gold double frame, gold atoms and
        // the motto at the foot; the title is on the pasted paper label
        draw(a, w, h) {
          const c = a.ctx, g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, '#23706b'); g.addColorStop(0.6, '#1a5551'); g.addColorStop(1, '#113533');
          c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h);
          c.strokeStyle = 'rgba(0,0,0,0.07)'; c.lineWidth = 0.02; for (let x = -w - h; x < w; x += 0.09) { c.beginPath(); c.moveTo(x, -h / 2); c.lineTo(x + h, h / 2); c.stroke(); }
          a.line(C.gold, 0.05, (p) => p.rect(-w / 2 + 0.3, -h / 2 + 0.3, w - 0.6, h - 0.6)); a.line(C.gold, 0.022, (p) => p.rect(-w / 2 + 0.42, -h / 2 + 0.42, w - 0.84, h - 0.84));
          [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => star(a, C.gold, sx * (w / 2 - 0.42), sy * (h / 2 - 0.42), 0.16));
          atom(a, C.gold, -1.55, -2.15, 0.34, 0.03); atom(a, C.gold, 1.55, -2.15, 0.34, 0.03);
          a.text('UNDERSTAND · VISUALIZE · DISCOVER', 0, -2.85, 0.2, C.gold);
          a.text('CLASS 10 · NCERT', 0, -2.25, 0.24, C.gold);
        },
        // the paper label: logo, name and subject
        label: { size: [4.5, 3.3], at: [0, 0.55], draw(a) {
          a.box(C.cream, -2.2, -1.6, 4.4, 3.2, 0.14);
          a.line(C.coral, 0.04, (p) => p.roundRect(-2.04, -1.44, 4.08, 2.88, 0.1));
          a.disc(C.card, 0, 0.62, 0.66); a.image(logo, 0, 0.62, 1.2);
          const size = Math.min(0.58, 3.8 / widthOf('VigyanVerse AI', 1));   // as big as fits inside the frame
          a.text('VigyanVerse AI', 0, -0.42, size, C.navy);
          a.box(C.coral, -0.9, -0.62, 1.8, 0.05);
          a.text('Class 10 Science', 0, -1.08, 0.34, C.coral);
        } },
      },
    });

    // ------------------------------------------------------------ camera: from the shut cover to the open spread
    const cam = {
      // shut cover -> breathe out while it swings (the gutter, where the spread rises, stays in the middle) -> the
      // whole room on screen, then a gentle push in
      pos: K.path([[0, [3.0, 12.6, 8.3]], [2.6, [2.95, 12.25, 8.05]], [3.7, [1.2, 10.0, 11.4]], [4.9, [-0.1, 7.3, 13.4]], [6.2, [0.0, 6.9, 12.8]], [8.6, [0.9, 6.5, 12.0]], [10.2, [1.0, 5.9, 11.0]], [11.6, [1.05, 6.3, 9.2]], [13.1, [1.0, 6.1, 8.8]], [14.0, [-0.3, 7.6, 13.6]], [15.0, [-1.0, 8.0, 12.2]], [16.4, [-0.1, 8.1, 12.0]], [18.0, [0.9, 8.1, 12.0]], [20.6, [0.5, 8.4, 12.5]], [21.6, [0.2, 8.6, 13.2]], [23.9, [1.3, 7.2, 10.6]], [26.0, [0.8, 7.6, 11.4]], [28.3, [0.9, 7.6, 11.3]], [30.6, [0.6, 7.8, 11.8]], [32.0, [-0.7, 7.7, 11.6]], [33.7, [-0.6, 7.8, 11.8]], [34.8, [0.0, 8.6, 13.0]], [36.4, [-1.3, 7.5, 10.9]], [38.4, [1.5, 7.5, 10.9]], [39.8, [1.75, 7.0, 9.9]], [41.6, [0.4, 8.0, 12.2]], [42.9, [0.0, 8.4, 13.2]], [44.6, [-2.4, 6.0, 9.0]], [49.4, [2.4, 6.0, 9.0]], [52.0, [0.0, 7.2, 11.6]], [54.6, [0.0, 7.0, 11.2]], [55.9, [0.0, 12.6, 10.4]], [57.6, [-2.2, 9.6, 8.2]], [62.4, [-2.0, 9.6, 8.2]], [64.6, [-0.4, 10.0, 8.6]], [67.0, [2.0, 9.6, 8.2]], [70.4, [1.6, 10.2, 8.8]], [72.0, [0.0, 12.2, 10.2]], [74.0, [0.0, 12.0, 10.0]], [75.3, [0.0, 8.6, 13.0]], [77.4, [-2.2, 7.0, 10.2]], [80.6, [-1.8, 7.0, 10.2]], [82.2, [2.2, 7.0, 10.2]], [85.6, [2.1, 6.8, 9.8]], [87.2, [0.2, 7.8, 11.8]], [88.5, [0.0, 8.6, 13.0]], [90.3, [-2.1, 7.0, 10.0]], [92.3, [-1.9, 7.0, 10.0]], [94.2, [2.1, 7.0, 10.0]], [95.2, [0.3, 6.6, 9.6]], [97.8, [0.2, 6.8, 9.9]], [99.4, [0.0, 7.8, 12.0]], [100.7, [0.0, 8.6, 13.0]], [102.9, [0.0, 8.4, 12.6]], [104.0, [-2.1, 7.0, 10.0]], [106.0, [-1.9, 7.0, 10.0]], [107.3, [2.1, 7.0, 10.0]], [113.0, [2.0, 7.0, 10.0]], [114.0, [0.2, 6.9, 10.2]], [115.4, [0.0, 7.6, 11.8]], [116.7, [0.0, 8.6, 13.0]], [117.6, [2.0, 7.8, 12.8]], [118.7, [2.0, 7.7, 12.6]], [119.7, [1.3, 6.8, 10.8]], [120.6, [1.0, 6.3, 9.6]], [123.0, [1.0, 6.0, 9.0]], [123.9, [1.4, 7.8, 11.8]], [125.3, [2.95, 11.2, 9.6]], [126.6, [3.0, 12.0, 8.9]], [127.9, [3.0, 12.6, 9.8]], [D, [3.0, 12.6, 9.8]]]),
      aim: K.path([[0, [3.0, 0.3, -0.15]], [2.6, [3.0, 0.32, -0.1]], [3.7, [0.7, 0.75, 0.1]], [4.9, [0.0, 1.2, 0.2]], [6.2, [0.0, 1.2, 0.2]], [8.6, [1.1, 1.55, -0.1]], [10.2, [0.9, 1.45, 0.0]], [11.6, [0.8, 1.45, 0.0]], [13.1, [0.8, 1.45, 0.0]], [14.0, [0.0, 1.3, 0.0]], [15.0, [-0.8, 1.2, 0.0]], [16.4, [0.0, 1.25, 0.0]], [18.0, [0.8, 1.25, 0.0]], [20.6, [0.3, 1.25, -0.1]], [21.6, [0.2, 1.3, -0.3]], [23.9, [1.6, 1.7, -0.6]], [26.0, [0.6, 1.3, -0.1]], [28.3, [0.9, 1.45, -0.2]], [30.6, [0.6, 1.4, -0.2]], [32.0, [-1.0, 1.45, -0.2]], [33.7, [-0.8, 1.4, -0.2]], [34.8, [0.0, 1.35, -0.3]], [36.4, [-1.7, 1.75, -0.6]], [38.4, [1.8, 1.75, -0.6]], [39.8, [2.0, 1.9, -0.7]], [41.6, [0.3, 1.45, -0.3]], [42.9, [0.0, 1.4, -0.3]], [44.6, [-2.4, 1.35, -0.4]], [49.4, [2.4, 1.35, -0.4]], [52.0, [0.0, 1.45, -0.4]], [54.6, [0.0, 1.45, -0.4]], [55.9, [0.0, 0.1, -0.1]], [57.6, [-2.6, 0.2, -0.3]], [62.4, [-2.4, 0.2, -0.3]], [64.6, [-0.6, 0.2, -0.2]], [67.0, [2.6, 0.2, -0.3]], [70.4, [1.6, 0.1, -0.3]], [72.0, [0.0, 0.1, -0.1]], [74.0, [0.0, 0.1, -0.1]], [75.3, [0.0, 1.3, -0.3]], [77.4, [-2.3, 1.5, -0.6]], [80.6, [-1.9, 1.6, -0.6]], [82.2, [2.4, 1.6, -0.6]], [85.6, [2.3, 1.6, -0.6]], [87.2, [0.2, 1.4, -0.3]], [88.5, [0.0, 1.3, -0.3]], [90.3, [-2.3, 1.6, -0.6]], [92.3, [-2.0, 1.4, -0.6]], [94.2, [2.4, 1.6, -0.6]], [95.2, [0.2, 1.1, 0.2]], [97.8, [0.1, 1.1, 0.2]], [99.4, [0.0, 1.4, -0.3]], [100.7, [0.0, 1.3, -0.3]], [102.9, [0.0, 1.3, -0.3]], [104.0, [-2.3, 1.5, -0.6]], [106.0, [-2.1, 1.5, -0.6]], [107.3, [2.4, 1.5, -0.6]], [113.0, [2.3, 1.5, -0.6]], [114.0, [0.0, 1.1, 0.1]], [115.4, [0.0, 1.3, -0.2]], [116.7, [0.0, 1.3, -0.3]], [117.6, [2.1, 0.9, 0.7]], [118.7, [2.0, 1.0, 0.6]], [119.7, [0.7, 1.35, 0.0]], [120.6, [0.8, 1.5, 0.0]], [123.0, [0.8, 1.5, 0.0]], [123.9, [1.5, 0.7, 0.0]], [125.3, [2.95, 0.3, 0.0]], [126.6, [3.0, 0.3, -0.1]], [127.9, [3.0, 0.3, 0.75]], [D, [3.0, 0.3, 0.75]]]),
    };
    const focusOpen = (t) => { const u = K.seg(t, 2.8, 4.8, K.ease.inOut), v = K.seg(t, 10.0, 11.8, K.ease.inOut), w = K.seg(t, 13.2, 14.3, K.ease.inOut); return [K.lerp(K.lerp(K.lerp(3.0, 0.0, u), 0.75, v), 0, w), K.lerp(K.lerp(K.lerp(0.36, 1.0, u), 1.5, v), 1.2, w), K.lerp(K.lerp(K.lerp(0, 1.0, u), 0.3, v), 0.4, w)]; };
    const focusAt = (t) => { const f = focusOpen(t), e = K.seg(t, CLOSE[0] + 0.6, CLOSE[0] + CLOSE[1] + 0.4, K.ease.inOut); return [K.lerp(f[0], 3.0, e), K.lerp(f[1], 0.36, e), K.lerp(f[2], 0.0, e)]; };
    // the phone's flash on "snap"
    const flash = new THREE.PointLight('#fff6e8', 0, 6, 2); S.scene.add(flash);
    const phone = book.spreads[1].byId.phone;
    const bulb = new THREE.PointLight('#ffd27a', 0, 5, 2); S.scene.add(bulb);
    const learn = book.spreads[6].byId.learn;
    const sun = new THREE.PointLight('#ffd49a', 0, 7, 2); S.scene.add(sun);   // the morning sun through the window (spread 10)
    const morningRoom = book.spreads[9].byId.room;
    // the screen's glow: a soft cool light in front of the laptop that comes up as it switches on
    const glow = new THREE.PointLight('#bfe6ff', 0, 4.5, 2); S.scene.add(glow);
    const desk = book.spreads[0].byId.desk;

    return {
      update(t) {
        book.update(t);
        book.lamp.intensity = book.lampPower * (0.8 + 0.2 * K.seg(t, CUE.lamp, CUE.lamp + 0.08));
        const w = desk.wing && desk.wing[1];
        if (w) { const n = [w.X[1] * w.Y[2] - w.X[2] * w.Y[1], w.X[2] * w.Y[0] - w.X[0] * w.Y[2], w.X[0] * w.Y[1] - w.X[1] * w.Y[0]], p = [0, 1, 2].map((k) => w.O[k] + w.X[k] * 1.28 + w.Y[k] * 1.6 + n[k] * 0.55); glow.position.set(p[0], p[1], p[2]); }
        glow.intensity = 12 * K.seg(t, LIGHT, LIGHT + 0.25, K.ease.out) * (1 - K.seg(t, CUE.turn1, CUE.turn1 + 0.5)) * (book.spreads[0].group.visible ? 1 : 0);
        const f = phone.frame;
        if (f) { const p = [0, 1, 2].map((k) => f.O[k] + f.X[k] * 3.52 + f.Y[k] * 0.9 + f.n[k] * 0.7); flash.position.set(p[0], p[1], p[2]); }
        const lw = learn.wing && learn.wing[-1];
        if (lw) { const n = [lw.X[1] * lw.Y[2] - lw.X[2] * lw.Y[1], lw.X[2] * lw.Y[0] - lw.X[0] * lw.Y[2], lw.X[0] * lw.Y[1] - lw.X[1] * lw.Y[0]], p = [0, 1, 2].map((k) => lw.O[k] + lw.X[k] * -0.85 + lw.Y[k] * 2.55 + n[k] * 0.45); bulb.position.set(p[0], p[1], p[2]); }
        bulb.intensity = book.spreads[6].group.visible ? 9 * K.seg(t, LIT, LIT + 0.2, K.ease.out) : 0;
        const mw = morningRoom.wing && morningRoom.wing[1];
        if (mw) { const n = [mw.X[1] * mw.Y[2] - mw.X[2] * mw.Y[1], mw.X[2] * mw.Y[0] - mw.X[0] * mw.Y[2], mw.X[0] * mw.Y[1] - mw.X[1] * mw.Y[0]], p = [0, 1, 2].map((k) => mw.O[k] + mw.X[k] * 1.5 + mw.Y[k] * 2.3 + n[k] * 0.9); sun.position.set(p[0], p[1], p[2]); }
        sun.intensity = book.spreads[9].group.visible ? 16 * K.seg(t, SUN, SUN + 1.2, K.ease.inOut) : 0;
        const ft = t - (SNAP + 0.38); flash.intensity = ft > 0 && book.spreads[1].group.visible ? 160 * Math.exp(-ft * 8) : 0;
        K.look(camera, cam.pos(t), cam.aim(t));
        K.focus(camera, focusAt(t), K.lerp(0.05, 0.1, K.seg(t, 3, 5)));
      },
      // the VigyanVerse logo badge, bottom right, on every frame
      overlay(ctx, t, W, Hh) {
        const fl = t - (SNAP + 0.38);   // a quick white blink of the camera flash
        if (fl > 0 && fl < 0.5) { ctx.save(); ctx.globalAlpha = 0.22 * Math.exp(-fl * 10); ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, W, Hh); ctx.restore(); }
        // the website address on the closed cover at the end, in the captions' cream card style
        const sa = K.seg(t, SITE, SITE + 0.45, K.ease.out);
        if (sa > 0) {
          const k = W / 1920, label = 'vigyanverseai.live', fs = 64 * k; ctx.save(); ctx.globalAlpha = sa;
          ctx.font = `700 ${fs}px "Fraunces"`; const tw = ctx.measureText(label).width, cw = tw + 96 * k, ch = 104 * k, x0 = (W - cw) / 2, y0 = Hh - 150 * k + (1 - sa) * 18 * k;
          ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24 * k; ctx.shadowOffsetY = 6 * k; ctx.fillStyle = C.cream; ctx.beginPath(); ctx.roundRect(x0, y0, cw, ch, 22 * k); ctx.fill();
          ctx.shadowColor = 'transparent'; ctx.lineWidth = 3 * k; ctx.strokeStyle = C.coral; ctx.beginPath(); ctx.roundRect(x0 + 8 * k, y0 + 8 * k, cw - 16 * k, ch - 16 * k, 16 * k); ctx.stroke();
          ctx.fillStyle = C.navy; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, W / 2, y0 + ch / 2 + 2 * k); ctx.restore();
        }
        const s = W / 1920, r = 52 * s, cx = W - 68 * s - r, cy = Hh - 60 * s - r;
        ctx.save(); ctx.globalAlpha = 0.95; ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = C.gold; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r - 4 * s, 0, 7); ctx.clip(); const d = (r - 6 * s) * 2; ctx.drawImage(logo, cx - d / 2, cy - d / 2, d, d); ctx.restore();
      },
    };
  },
};
