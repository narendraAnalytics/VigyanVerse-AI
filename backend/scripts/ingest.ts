// Ingest textbook chapter PDFs into document_chunks (keyword search; no embeddings yet).
//
//   npm run ingest -- --dry-run              parse + chunk only, print a report, write nothing
//   npm run ingest -- [--chapter 5]          upload PDF to the private 'curriculum' bucket,
//                                            upsert curriculum_sources, replace its chunks
//
// Manifest: data/ncert-cbse-10-science-2026-27.json (metadata + rights decision, no content).
// PDFs: ../textbooks/<file> (gitignored; checksums verified against the manifest).
// Runs locally with the project API key (admin, bypasses RLS). The database trigger still
// refuses chunks unless the source's usage_rights = 'permitted'.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extractText, getDocumentProxy } from 'unpdf';
import { createAdminClient } from '@insforge/sdk';
import { chunkTextbook, type Chunk } from '../src/ingest/textbook.ts';

interface Manifest {
  board_code: string; grade: number; academic_year: string; publisher: string; book: string;
  edition: string; language: 'en' | 'te'; usage_rights: 'permitted' | 'pending_review' | 'restricted';
  rights_notes: string; content_version: number; storage_prefix: string;
  chapters: { number: number; subject_code: string; file: string; url: string; sha256: string }[];
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyChapter = args.includes('--chapter') ? Number(args[args.indexOf('--chapter') + 1]) : null;
const manifestPath = new URL('../data/ncert-cbse-10-science-2026-27.json', import.meta.url);
const textbooksDir = new URL('../../textbooks/', import.meta.url);
const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const project = JSON.parse(readFileSync(new URL('../.insforge/project.json', import.meta.url), 'utf8'));
const admin = dryRun ? null : createAdminClient({
  baseUrl: process.env.INSFORGE_BASE_URL ?? project.oss_host,
  apiKey: process.env.INSFORGE_API_KEY ?? project.api_key,
});

function check<T>(label: string, res: { data: T; error: unknown }): T {
  if (res.error) throw new Error(`${label}: ${JSON.stringify(res.error)}`);
  return res.data;
}

function report(file: string, chunks: Chunk[]) {
  const sizes = chunks.map((c) => c.content.length);
  console.log(`  ${chunks.length} chunks, pages ${chunks[0]?.pageStart}-${chunks.at(-1)?.pageEnd}, ` +
    `chars min ${Math.min(...sizes)} / avg ${Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length)} / max ${Math.max(...sizes)}`);
  const sections = new Map<string, number>();
  for (const c of chunks) sections.set(c.sectionPath ?? '(intro)', (sections.get(c.sectionPath ?? '(intro)') ?? 0) + 1);
  for (const [s, n] of sections) console.log(`    ${String(n).padStart(2)} × ${s}`);
}

for (const ch of manifest.chapters) {
  if (onlyChapter !== null && ch.number !== onlyChapter) continue;
  const bytes = readFileSync(new URL(ch.file, textbooksDir));
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (ch.sha256 && sha !== ch.sha256) throw new Error(`${ch.file}: checksum ${sha} does not match manifest`);

  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text: pages } = await extractText(pdf, { mergePages: false });
  const chunks = chunkTextbook(pages, ch.number);
  console.log(`\nCh ${ch.number} (${ch.file}, ${pages.length} PDF pages)`);
  report(ch.file, chunks);
  if (dryRun || !admin) continue;

  const db = admin.database;
  const chapter = check('chapter lookup', await db.from('chapters').select('id, title_en')
    .eq('board_code', manifest.board_code).eq('grade', manifest.grade)
    .eq('academic_year', manifest.academic_year).eq('number', ch.number).limit(2)) as { id: string; title_en: string }[];
  if (chapter.length !== 1) throw new Error(`Expected one chapter row for Ch ${ch.number}, got ${chapter.length}`);

  const storageKey = `${manifest.storage_prefix}/${ch.file}`;
  check('upload', await admin.storage.from('curriculum').upload(storageKey, new Blob([bytes], { type: 'application/pdf' })));

  const sourceRow = {
    board_code: manifest.board_code, subject_code: ch.subject_code, grade: manifest.grade,
    academic_year: manifest.academic_year, language: manifest.language,
    title: `${manifest.publisher} ${manifest.book} — Ch ${ch.number} ${chapter[0].title_en}`,
    publisher: manifest.publisher, edition: manifest.edition, source_url: ch.url, storage_key: storageKey,
    content_version: manifest.content_version, usage_rights: manifest.usage_rights, rights_notes: manifest.rights_notes,
  };
  const existing = check('source lookup', await db.from('curriculum_sources').select('id').eq('storage_key', storageKey).limit(1)) as { id: string }[];
  let sourceId: string;
  if (existing.length) {
    sourceId = existing[0].id;
    check('source update', await db.from('curriculum_sources').update(sourceRow).eq('id', sourceId));
  } else {
    const inserted = check('source insert', await db.from('curriculum_sources').insert([sourceRow]).select('id')) as { id: string }[];
    sourceId = inserted[0].id;
  }

  // Replace this source's chunks (idempotent re-runs).
  check('delete old chunks', await db.from('document_chunks').delete().eq('source_id', sourceId));
  const rows = chunks.map((c) => ({
    source_id: sourceId, chapter_id: chapter[0].id, content_version: manifest.content_version,
    chunk_index: c.chunkIndex, language: manifest.language, page_start: c.pageStart, page_end: c.pageEnd,
    section_path: c.sectionPath, content: c.content,
  }));
  for (let i = 0; i < rows.length; i += 50) {
    check(`insert chunks ${i}`, await db.from('document_chunks').insert(rows.slice(i, i + 50)));
  }
  const stored = check('count', await db.from('document_chunks').select('id').eq('source_id', sourceId).limit(1000)) as unknown[];
  console.log(`  uploaded ${storageKey}; source ${sourceId}; ${stored.length}/${rows.length} chunks stored`);
  if (stored.length !== rows.length) throw new Error('Chunk count mismatch after insert');
}
