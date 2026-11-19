// Narration for the explainer videos with Edge TTS (msedge-tts 2.1.0: free Microsoft Edge neural voices, no API key).
// Writes public/voiceover/<video>/<id>.mp3 and src/voice/<video>.json (file, start time, length, text).
//   npm run voice -- ohms-law          npm run voice -- rainbow
//   VOICE=en-US-AvaNeural RATE=0.92 npm run voice -- rainbow
// Lines come from each video's script.txt; `at` is when the line starts in story time (one line per beat).
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
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
async function speak(text, voice = VOICE) {
  for (let attempt = 1; ; attempt++) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const res = await tts.toFile(DIR, text, { rate: RATE });
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
const out = [];
for (const line of LINES) {
  const { audioFilePath } = await speak(line.text, line.voice || VOICE);
  await sleep(1500);
  const dest = join(DIR, `${line.id}.mp3`);
  renameSync(audioFilePath, dest);
  const seconds = parseFloat(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dest]).toString().trim().replace(',', '.'));
  out.push({ file: `voiceover/${VIDEO}/${line.id}.mp3`, at: line.at, seconds, text: line.text, ...(line.voice ? { voice: line.voice } : {}) });
  console.log(line.id, `starts ${line.at}s, lasts ${seconds.toFixed(2)}s, ends ${(line.at + seconds).toFixed(2)}s`);
}
mkdirSync('src/voice', { recursive: true });
writeFileSync(`src/voice/${VIDEO}.json`, JSON.stringify({ voice: VOICE, rate: RATE, lines: out }, null, 2) + '\n');
