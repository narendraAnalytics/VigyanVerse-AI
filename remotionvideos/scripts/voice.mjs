// Narration for the Ohm's law video with Edge TTS (msedge-tts 2.1.0: free Microsoft Edge neural voices,
// no API key). Writes public/voiceover/ohms-law/<id>.mp3 and src/voice.json (file, start time, length, text).
//   npm run voice                      (default: gentle Indian-English female voice)
//   VOICE=en-US-AvaNeural RATE=0.92 npm run voice
// Lines are the narration from script.txt; `at` is when each line starts in the video (seconds), one per beat.
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { execFileSync } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VOICE = process.env.VOICE || 'en-IN-NeerjaNeural';
const RATE = Number(process.env.RATE || 0.95);
const DIR = 'public/voiceover/ohms-law';
const LINES = [
  { id: '01-hook', at: 0.4, text: 'What makes a simple light bulb glow? The answer is something you cannot even see!' },
  { id: '02-current', at: 5.4, text: 'Electric current is the flow of electric charge through a conductor. A potential difference drives the current through the circuit.' },
  { id: '03-resistance', at: 12.4, text: 'But resistance opposes the flow of current. More resistance means less current when voltage remains constant.' },
  { id: '04-law', at: 18.2, text: "This relationship is explained by Ohm's Law: Voltage equals Current multiplied by Resistance." },
  { id: '05-end', at: 25.0, text: 'Now you know the science behind the light. Ready to test your understanding?' },
];

const ffprobe = join('node_modules', '@remotion', 'compositor-win32-x64-msvc', 'ffprobe.exe');
mkdirSync(DIR, { recursive: true });
const tts = new MsEdgeTTS();
await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
const out = [];
for (const line of LINES) {
  const { audioFilePath } = await tts.toFile(DIR, line.text, { rate: RATE });
  const dest = join(DIR, `${line.id}.mp3`);
  renameSync(audioFilePath, dest);
  const seconds = parseFloat(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dest]).toString().trim().replace(',', '.'));
  out.push({ file: `voiceover/ohms-law/${line.id}.mp3`, at: line.at, seconds, text: line.text });
  console.log(line.id, `starts ${line.at}s, lasts ${seconds.toFixed(2)}s, ends ${(line.at + seconds).toFixed(2)}s`);
}
writeFileSync('src/voice.json', JSON.stringify({ voice: VOICE, rate: RATE, lines: out }, null, 2) + '\n');
tts.close?.();
