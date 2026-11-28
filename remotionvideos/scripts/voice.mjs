// Narration for the explainer videos with Edge TTS (msedge-tts 2.1.0: free Microsoft Edge neural voices, no API key).
// Writes public/voiceover/<video>/<id>.mp3 and src/voice/<video>.json (file, start time, length, text).
//   npm run voice -- ohms-law          npm run voice -- rainbow
//   VOICE=en-US-AvaNeural RATE=0.92 npm run voice -- rainbow
// Lines come from each video's script.txt; `at` is when the line starts in story time (one line per beat).
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VIDEOS = {
  'ohms-law': [
    { id: '01-hook', at: 0.4, text: 'What makes a simple light bulb glow? The answer is something you cannot even see!' },
    { id: '02-current', at: 5.4, text: 'Electric current is the flow of electric charge through a conductor. A potential difference drives the current through the circuit.' },
    { id: '03-resistance', at: 12.4, text: 'But resistance opposes the flow of current. More resistance means less current when voltage remains constant.' },
    { id: '04-law', at: 18.2, text: "This relationship is explained by Ohm's Law: Voltage equals Current multiplied by Resistance." },
    { id: '05-end', at: 25.0, text: 'Now you know the science behind the light. Ready to test your understanding?' },
  ],
  rainbow: [
    { id: '01-mystery', at: 0.6, text: 'Have you ever wondered how a single beam of white light can transform into seven beautiful colours?' },
    { id: '02-refraction', at: 6.0, text: 'When white light passes through a glass prism, it bends due to refraction.' },
    { id: '03-dispersion', at: 13.0, text: 'But something extraordinary happens. The white light separates into seven different colours. This phenomenon is called dispersion of light.' },
    { id: '04-deviation', at: 22.0, text: 'Different colours bend by different amounts. Violet deviates the most, while red deviates the least.' },
    { id: '05-end', at: 29.0, text: 'And that is how a simple beam of white light reveals the colourful science hidden within it. Welcome to the world of physics!' },
  ],
  chemistry: [
    { id: '01-reactions', at: 0.5, text: 'What happens when substances react? Their atoms rearrange, creating entirely new substances. This is the fascinating world of chemical reactions!' },
    { id: '02-acids', at: 7.0, text: 'Why are some substances acidic and others basic? Their ions determine how they behave, something we can explore using the pH scale.' },
    { id: '03-metals', at: 13.0, text: 'Metals can lose electrons, while non-metals can gain them. But metals can also react with their environment and undergo corrosion.' },
    { id: '04-carbon', at: 20.0, text: 'And carbon? Its ability to form strong bonds and long chains creates an extraordinary variety of compounds.' },
    { id: '05-end', at: 27.0, text: 'Chemistry is everywhere. Discover the science behind everything!' },
  ],
  biology: [
    { id: '01-life', at: 0.5, text: 'Life is an extraordinary system. Every living organism performs essential processes to survive.' },
    { id: '02-energy', at: 10.1, text: 'Living things obtain nutrition, break down food and release energy through respiration.' },
    { id: '03-control', at: 17.5, text: 'They sense changes around them and respond through nervous systems, hormones and plant movements.' },
    { id: '04-heredity', at: 25.6, text: 'Through reproduction, life continues. DNA carries hereditary information from one generation to the next.' },
    { id: '05-end', at: 35.7, text: 'And every organism depends on its environment. Life is connected. Life is extraordinary. Discover its science!' },
  ],
  // the sign-in page: two students, so each line can name its own voice (made with RATE=1.08)
  signin: [
    { id: '01-girl', at: 0.4, voice: 'en-IN-NeerjaNeural', text: 'New to VigyanVerse? Signing in takes just one tap.' },
    { id: '02-boy', at: 5.8, voice: 'en-IN-PrabhatNeural', text: 'Just pick Google or GitHub, whichever you use.' },
    { id: '03-girl', at: 9.7, voice: 'en-IN-NeerjaNeural', text: "And you're in!" },
    { id: '04-boy', at: 11.8, voice: 'en-IN-PrabhatNeural', text: "Let's start learning!" },
  ],
  // the home-page introduction (script.txt, 2026-11-22): a Class 10 student tells how she studies now. Built scene by
  // scene, so lines are added as their scenes are made (made with RATE=1.0). Girl = Neerja, her friend = Prabhat.
  intro: [
    { id: '01-hook', at: 0.6, voice: 'en-IN-NeerjaNeural', text: "It's the night before my science exam, and I'm stuck on one question." },
    { id: '02-problem', at: 6.5, voice: 'en-IN-NeerjaNeural', text: 'No teacher to ask at this hour. So I opened VigyanVerse AI.' },
    { id: '03-ask', at: 13.75, voice: 'en-IN-NeerjaNeural', text: 'I can type my question, say it out loud, or just snap a photo of my notes.' },
    { id: '04-textbook', at: 21.2, voice: 'en-IN-NeerjaNeural', text: 'It finds the answer in my own NCERT textbook, explains it in short, simple words, and shows the chapter and page.' },
    { id: '05-doubt', at: 31.0, voice: 'en-IN-PrabhatNeural', text: 'But can AI get the maths wrong?' },
    { id: '06-code', at: 34.1, voice: 'en-IN-NeerjaNeural', text: 'Not here. AI writes the words, but code does the maths and marks the quizzes.' },
    // scene 6 (owner 2026-11-22: say "agents", show the real model names and their jobs)
    { id: '07-team', at: 42.2, voice: 'en-IN-NeerjaNeural', text: 'Behind it is a team of AI agents, each with its own job, powered by models served through Sarvam Token Factory, from the Indian AI company Sarvam AI.' },
    // scene 6b (owner 2026-11-22): the workflow, how a question travels between the agents
    { id: '08-flow', at: 55.2, voice: 'en-IN-NeerjaNeural', text: "Here's how it works. A photo is read by the photo agent, and my voice is turned into text by the voice agent. Then the router agent sends my question to the tutor or the maths agent, with the right NCERT pages, and the answer comes back to me." },
    { id: '09-think', at: 74.6, voice: 'en-IN-NeerjaNeural', text: 'Want to really learn? Hint mode asks me small questions till I get it myself. And with Bindu explains, an answer becomes a whiteboard lesson.' },
    { id: '10-practise', at: 87.8, voice: 'en-IN-NeerjaNeural', text: 'Then I practise. Quizzes are marked by code, my mistakes are explained, and Revise next tells me which chapter to go over, and when.' },
    // scene 9 (the friend): fair prices. There are NO free credits, so "credits start at", never "you start with"
    { id: '11-fair', at: 100.0, voice: 'en-IN-PrabhatNeural', text: "And it's fair. No subscription: credits start at just ten rupees, and a typed question costs fifty paise. Videos and progress are free, and there are no ads." },
    // scene 10: back at her desk, the next morning
    { id: '12-result', at: 116.0, voice: 'en-IN-NeerjaNeural', text: 'That question from last night? Solved, with the page to prove it.' },
    // scene 11: the book closes on its cover
    { id: '13-close', at: 123.6, voice: 'en-IN-NeerjaNeural', text: "Let's learn science together, on VigyanVerse AI!" },
  ],
  // LinkedIn demo (script.txt, 2026-11-24, mid-century cartoon, built scene by scene): two mothers on their balconies.
  // Priya = Neerja; Meera = Neerja Expressive a little lower and slower, so the two women sound different (RATE=1.0).
  demo: [
    { id: '01-priya-ask', at: 1.2, voice: 'en-IN-NeerjaNeural', text: 'Meera, you look so worried today. What happened?' },
    { id: '02-meera-worry', at: 5.8, voice: 'en-IN-NeerjaExpressiveNeural', pitch: '-8%', rate: 1.0, text: "It's Anika. Her Class 10 board exams are coming, and chemistry just isn't going in. Equations, acids, bases... she reads the chapter three times, and still feels lost." },
    // scene 2: Priya recommends the app (starts after scene 1 ends at 20.63 s)
    { id: '03-priya-tip', at: 21.1, voice: 'en-IN-NeerjaNeural', text: 'My son had the same problem last year. Then he started using VigyanVerse AI. It teaches straight from the NCERT textbook, in a really simple way. Look.' },
    // scene 3 (owner 2026-11-24): the recording, Priya explains, Meera asks in between (ats set from the line lengths)
    { id: '04-priya-chapters', at: 35.4, voice: 'en-IN-NeerjaNeural', text: 'Every chapter is right there, with short videos that make it easy to see.' },
    { id: '05-meera-stuck', at: 40.41, voice: 'en-IN-NeerjaExpressiveNeural', pitch: '-8%', rate: 1.0, text: "But what if she's stuck on a question late at night?" },
    { id: '06-priya-tutor', at: 43.53, voice: 'en-IN-NeerjaNeural', text: 'She just types it, or says it out loud, and the AI tutor explains it simply, with the exact chapter and page from her book.' },
    { id: '07-meera-homework', at: 52.48, voice: 'en-IN-NeerjaExpressiveNeural', pitch: '-8%', rate: 1.0, text: 'And her homework questions, from the notebook?' },
    { id: '08-priya-photo', at: 55.48, voice: 'en-IN-NeerjaNeural', text: "She snaps a photo, and it's solved step by step." },
    { id: '09-meera-learning', at: 59.16, voice: 'en-IN-NeerjaExpressiveNeural', pitch: '-8%', rate: 1.0, text: "How will I know she's really learning?" },
    { id: '10-priya-quiz', at: 61.62, voice: 'en-IN-NeerjaNeural', text: 'Short quizzes, checked by code, show what she has learnt, and what to revise next.' },
    { id: '11-priya-bindu', at: 67.86, voice: 'en-IN-NeerjaNeural', text: 'And Bindu turns any answer into a little whiteboard lesson.' },
    { id: '12-meera-cost', at: 71.86, voice: 'en-IN-NeerjaExpressiveNeural', pitch: '-8%', rate: 1.0, text: 'Is it expensive?' },
    { id: '13-priya-price', at: 73.45, voice: 'en-IN-NeerjaNeural', text: 'Not at all. No subscription, and credits start at just ten rupees.' },
    // owner 2026-11-24: safe payments (wording from the site's "Safe payments by Razorpay" box and Pricing page)
    { id: '14-meera-safe', at: 79.44, voice: 'en-IN-NeerjaExpressiveNeural', pitch: '-8%', rate: 1.0, text: 'And paying online, is that safe?' },
    { id: '15-priya-safe', at: 82.17, voice: 'en-IN-NeerjaNeural', text: 'Yes. Payments go through Razorpay, with UPI or a card, and VigyanVerse AI never sees her card number or UPI PIN. Her data stays private, and there are no ads.' },
    // scene 4 (owner 2026-11-24: say the website): back on the balcony, Meera smiles
    { id: '16-meera-site', at: 97.3, voice: 'en-IN-NeerjaExpressiveNeural', pitch: '-8%', rate: 1.0, text: "That sounds wonderful! What's the website?" },
    { id: '17-priya-site', at: 101.4, voice: 'en-IN-NeerjaNeural', text: 'Just open VigyanVerse AI dot live, on her phone or laptop.' },
    { id: '18-meera-smile', at: 106.64, voice: 'en-IN-NeerjaExpressiveNeural', pitch: '-8%', rate: 1.0, text: "That's exactly what she needs. Simple, and from her own textbook. I'll tell Anika to start tonight!" },
  ],
  // Life Processes study video (script.txt, 2026-11-28, Scale Zoom style from lemo-opuscar, built scene by scene).
  // Narrator = Neerja, a warm unhurried teacher (RATE=0.95). Lines are added as their scenes are built.
  life: [
    // scene 1: the mystery of life
    { id: '01-wonder', at: 1.2, text: 'Have you ever wondered what keeps you alive?' },
    { id: '02-sleep', at: 4.6, text: 'Even when you are sleeping, your body never stops working.' },
    { id: '03-heart', at: 9.0, text: 'Your heart pumps blood, your lungs exchange gases, and millions of cells perform essential activities every second.' },
    { id: '04-how', at: 17.8, text: 'But how does all this happen?' },
    { id: '05-answer', at: 20.5, text: 'The answer lies in something called Life Processes.' },
    // scene 2: what are life processes?
    { id: '06-define', at: 27.6, text: 'Life processes are the basic maintenance activities performed by living organisms to stay alive.' },
    { id: '07-four', at: 34.6, text: 'The four major life processes are nutrition, respiration, transportation and excretion.' },
    { id: '08-together', at: 41.4, text: 'Each process performs a different function, but together they keep an organism alive.' },
    // scene 3: nutrition
    { id: '09-food', at: 49.9, text: 'Every living organism needs food for energy, growth and repair. But not all organisms obtain food in the same way.' },
    { id: '10-photo', at: 59.5, text: 'Green plants prepare their own food through photosynthesis. They use sunlight, carbon dioxide and water in the presence of chlorophyll to produce glucose and release oxygen.' },
    { id: '11-auto', at: 72.3, text: 'This is called autotrophic nutrition.' },
    { id: '12-hetero', at: 77.0, text: 'Animals, on the other hand, depend on other organisms for food. This is called heterotrophic nutrition.' },
    { id: '13-humans', at: 86.6, text: 'In humans, digestion begins in the mouth, continues in the stomach and is completed in the small intestine, where nutrients are absorbed.' },
  ],
};
const VIDEO = process.argv[2] || 'ohms-law';
const LINES = VIDEOS[VIDEO];
if (!LINES) throw new Error(`Unknown video "${VIDEO}". Use one of: ${Object.keys(VIDEOS).join(', ')}`);
const VOICE = process.env.VOICE || 'en-IN-NeerjaNeural';
const RATE = Number(process.env.RATE || 0.95);
const DIR = `public/voiceover/${VIDEO}`;

const ffprobe = join('node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffprobe.exe');
mkdirSync(DIR, { recursive: true });
// The Edge service sometimes answers 429 (too many requests): wait and try again with a fresh connection.
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function speak(text, voice = VOICE, prosody = {}) {
  for (let attempt = 1; ; attempt++) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });   // word timings for captions
      const res = await tts.toFile(DIR, text, { rate: prosody.rate ?? RATE, ...(prosody.pitch ? { pitch: prosody.pitch } : {}) });
      tts.close?.();
      return res;
    } catch (e) {
      tts.close?.();
      if (attempt >= 8) throw e;
      const wait = 15000 * attempt;
      console.log(`  Edge TTS busy (${e.message.slice(0, 60)}), retrying in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}
// Edge sends word boundaries in 100-ns ticks: keep [word, start s, end s] for the on-screen captions
function readWords(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  rmSync(path, { force: true });
  const items = (Array.isArray(raw) ? raw : raw.Metadata || []).flatMap((m) => m.Metadata || [m]);
  return items.filter((m) => m.Type === 'WordBoundary').map((m) => [m.Data.text.Text, +(m.Data.Offset / 1e7).toFixed(3), +((m.Data.Offset + m.Data.Duration) / 1e7).toFixed(3)]);
}
const out = [];
for (const line of LINES) {
  const { audioFilePath, metadataFilePath } = await speak(line.text, line.voice || VOICE, { rate: line.rate, pitch: line.pitch });
  const words = metadataFilePath ? readWords(metadataFilePath) : [];
  await sleep(1500);
  const dest = join(DIR, `${line.id}.mp3`);
  renameSync(audioFilePath, dest);
  const seconds = parseFloat(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dest]).toString().trim().replace(',', '.'));
  out.push({ file: `voiceover/${VIDEO}/${line.id}.mp3`, at: line.at, seconds, text: line.text, ...(words.length ? { words } : {}), ...(line.voice ? { voice: line.voice } : {}) });
  console.log(line.id, `starts ${line.at}s, lasts ${seconds.toFixed(2)}s, ends ${(line.at + seconds).toFixed(2)}s`);
}
mkdirSync('src/voice', { recursive: true });
writeFileSync(`src/voice/${VIDEO}.json`, JSON.stringify({ voice: VOICE, rate: RATE, lines: out }, null, 2) + '\n');
