import { describe, expect, it, vi } from 'vitest';
import { checkLessonTarget, LESSON_BUCKET, lessonKey, saveLesson, type LessonDb, type LessonStorage } from '../src/shared/lesson-audio.ts';

/** A fake database: `rows[table]` is what a select returns; inserts are recorded. */
function fakeDb(rows: Record<string, Record<string, unknown>[] | 'error'>, insertError = false) {
  const inserted: { table: string; rows: Record<string, unknown>[] }[] = [];
  const db: LessonDb = {
    from(table) {
      const result = () => Promise.resolve(rows[table] === 'error' ? { data: null, error: 'boom' } : { data: (rows[table] as Record<string, unknown>[]) ?? [], error: null });
      const q = { eq: () => q, limit: () => result() };
      return {
        select: () => q,
        insert: (r) => { inserted.push({ table, rows: r }); return Promise.resolve({ data: null, error: insertError ? 'nope' : null }); },
      };
    },
  };
  return { db, inserted };
}

function fakeStorage(uploadError = false) {
  const uploads: { bucket: string; path: string; size: number }[] = [];
  const removed: string[] = [];
  const storage: LessonStorage = {
    from(bucket) {
      return {
        upload: async (path, file) => {
          uploads.push({ bucket, path, size: file.size });
          return uploadError ? { data: null, error: 'fail' } : { data: { key: path }, error: null };
        },
        remove: async (path) => { removed.push(path); return {}; },
      };
    },
  };
  return { storage, uploads, removed };
}

const AUDIO = { base64: btoa('ID3-fake-mp3-bytes'), mime: 'audio/mpeg', spokenText: "Hi, it's Bindu! Use V = I R." };
const LESSON = { messageId: 42, title: "Ohm's Law", greeting: "Hi, it's Bindu!" };

describe('lesson-audio', () => {
  it('keys a lesson under the student folder by message id', () => {
    expect(lessonKey('stu-1', 42)).toBe('stu-1/42.mp3');
  });

  it("accepts the student's own unsaved tutor answer", async () => {
    const { db } = fakeDb({ messages: [{ id: 42, role: 'tutor' }], lesson_audio: [] });
    expect(await checkLessonTarget(db, 42)).toBe('ok');
  });

  it('refuses an answer that is already saved (no second charge)', async () => {
    const { db } = fakeDb({ messages: [{ id: 42, role: 'tutor' }], lesson_audio: [{ message_id: 42 }] });
    expect(await checkLessonTarget(db, 42)).toBe('saved');
  });

  it("refuses a message the student cannot see (RLS) or the student's own question", async () => {
    expect(await checkLessonTarget(fakeDb({ messages: [], lesson_audio: [] }).db, 42)).toBe('not_found');
    expect(await checkLessonTarget(fakeDb({ messages: [{ id: 42, role: 'student' }], lesson_audio: [] }).db, 42)).toBe('not_found');
  });

  it('fails closed when the check cannot run', async () => {
    expect(await checkLessonTarget(fakeDb({ messages: 'error', lesson_audio: [] }).db, 42)).toBe('failed');
  });

  it('uploads the audio and saves the row', async () => {
    const { db, inserted } = fakeDb({});
    const { storage, uploads } = fakeStorage();
    expect(await saveLesson({ database: db, storage }, 'stu-1', LESSON, AUDIO)).toBe(true);
    expect(uploads).toEqual([{ bucket: LESSON_BUCKET, path: 'stu-1/42.mp3', size: 18 }]);
    expect(inserted[0].table).toBe('lesson_audio');
    expect(inserted[0].rows[0]).toMatchObject({ message_id: 42, student_id: 'stu-1', storage_key: 'stu-1/42.mp3', title: "Ohm's Law", greeting: "Hi, it's Bindu!", size_bytes: 18 });
  });

  it('never throws: a failed upload or row returns false and removes the orphan file', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = fakeStorage(true);
    expect(await saveLesson({ database: fakeDb({}).db, storage: a.storage }, 'stu-1', LESSON, AUDIO)).toBe(false);
    const b = fakeStorage();
    expect(await saveLesson({ database: fakeDb({}, true).db, storage: b.storage }, 'stu-1', LESSON, AUDIO)).toBe(false);
    expect(b.removed).toEqual(['stu-1/42.mp3']);
    expect(await saveLesson({ database: fakeDb({}).db, storage: fakeStorage().storage }, 'stu-1', LESSON, { ...AUDIO, base64: '%%%' })).toBe(false);
    err.mockRestore();
  });
});
