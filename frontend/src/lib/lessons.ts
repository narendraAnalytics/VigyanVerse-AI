'use client';

// Saved "Bindu explains" lessons (migration lesson-audio): voice-speak stores a paid lesson's audio in the
// private `lesson-audio` bucket (the student's own folder) with a `lesson_audio` row per tutor answer.
// Watching a saved lesson again, on any device, is free: the audio comes from storage, the board is redrawn
// from the saved answer text. RLS lets a student read only their own rows and files.
import { insforge } from './insforge';

export interface LessonMedia { src: string; spokenText: string; title: string; greeting: string }

/** A saved answer's database id (new answers get one from tutor-chat); local ids cannot be saved. */
export const savedMessageId = (id: string): number | null => (/^\d+$/.test(id) ? Number(id) : null);

/** Which of these tutor answers already have a saved lesson. */
export async function savedLessonIds(messageIds: string[]): Promise<Set<string>> {
  const ids = messageIds.map(savedMessageId).filter((x): x is number => x !== null);
  if (!ids.length) return new Set();
  const { data, error } = await insforge().database.from('lesson_audio').select('message_id').in('message_id', ids);
  if (error) return new Set();
  return new Set(((data as { message_id: number }[] | null) ?? []).map((r) => String(r.message_id)));
}

/** Load a saved lesson (free). Null when there is none or it cannot be read. */
export async function loadSavedLesson(messageId: string): Promise<LessonMedia | null> {
  const id = savedMessageId(messageId);
  if (id === null) return null;
  const client = insforge();
  const { data, error } = await client.database.from('lesson_audio')
    .select('storage_key, mime, title, greeting, spoken_text').eq('message_id', id).limit(1);
  const row = (data as { storage_key: string; mime: string; title: string; greeting: string; spoken_text: string }[] | null)?.[0];
  if (error || !row) return null;
  const file = await client.storage.from('lesson-audio').download(row.storage_key);
  if (file.error || !file.data) return null;
  const blob = file.data.type ? file.data : new Blob([file.data], { type: row.mime });
  return { src: URL.createObjectURL(blob), spokenText: row.spoken_text, title: row.title, greeting: row.greeting };
}
