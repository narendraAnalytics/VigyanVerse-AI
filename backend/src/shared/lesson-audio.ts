// Saved "Bindu explains" lessons (migration lesson-audio). voice-speak with purpose 'bindu' and a `lesson`
// (the tutor message id + board heading + welcome) checks, AS THE STUDENT, that the message is their own tutor
// answer and not saved yet; after the paid voice call it stores the audio (admin client: students cannot write
// this bucket) and the lesson_audio row. Saving never fails the request: the student still gets the lesson.
import { decodeBase64 } from './speech.ts';

export const LESSON_BUCKET = 'lesson-audio';

export interface LessonInfo { messageId: number; title: string; greeting: string }

export const lessonKey = (studentId: string, messageId: number) => `${studentId}/${messageId}.mp3`;

type Res<T> = PromiseLike<{ data: T | null; error: unknown }>;
interface Query<T> { eq(col: string, v: unknown): Query<T>; limit(n: number): Res<T> }
/** The bits of the database client used here (user-scoped for the check, admin for the save). */
export interface LessonDb {
  from(table: string): {
    select(cols: string): Query<Record<string, unknown>[]>;
    insert(rows: Record<string, unknown>[]): Res<unknown>;
  };
}
export interface LessonStorage {
  from(bucket: string): {
    upload(path: string, file: Blob): Promise<{ data: { key?: string } | null; error: unknown }>;
    remove(path: string): Promise<unknown>;
  };
}

/**
 * Before charging: 'ok' (the caller's own tutor answer, no lesson saved), 'saved' (already paid and saved:
 * the app should load it, never pay again), 'not_found' (not the caller's tutor message), 'failed'.
 */
export async function checkLessonTarget(userDb: LessonDb, messageId: number): Promise<'ok' | 'saved' | 'not_found' | 'failed'> {
  const [msg, saved] = await Promise.all([
    userDb.from('messages').select('id, role').eq('id', messageId).limit(1),
    userDb.from('lesson_audio').select('message_id').eq('message_id', messageId).limit(1),
  ]);
  if (msg.error || saved.error) return 'failed';
  if (saved.data?.length) return 'saved';
  const row = msg.data?.[0];
  return row && row.role === 'tutor' ? 'ok' : 'not_found';
}

/** After the paid voice call: store the audio and its row. Returns true when saved; never throws. */
export async function saveLesson(
  admin: { database: LessonDb; storage: LessonStorage },
  studentId: string,
  lesson: LessonInfo,
  audio: { base64: string; mime: string; spokenText: string },
): Promise<boolean> {
  try {
    const bytes = decodeBase64(audio.base64);
    if (!bytes) return false;
    const key = lessonKey(studentId, lesson.messageId);
    const up = await admin.storage.from(LESSON_BUCKET).upload(key, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: audio.mime }));
    if (up.error || !up.data) throw new Error('upload failed');
    const storedKey = up.data.key ?? key;
    const ins = await admin.database.from('lesson_audio').insert([{
      message_id: lesson.messageId, student_id: studentId, storage_key: storedKey, mime: audio.mime,
      title: lesson.title.slice(0, 120), greeting: lesson.greeting.slice(0, 300),
      spoken_text: audio.spokenText.slice(0, 1200), size_bytes: bytes.length,
    }]);
    if (ins.error) {
      await admin.storage.from(LESSON_BUCKET).remove(storedKey).catch(() => {});
      throw new Error('row insert failed');
    }
    return true;
  } catch (e) {
    console.error(`lesson-audio: save failed for message ${lesson.messageId}: ${e instanceof Error ? e.message : 'unknown'}`);
    return false;
  }
}
