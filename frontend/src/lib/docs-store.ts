'use client';

import { createStore } from './store';
import { api, ApiError } from './api';
import { insforge } from './insforge';

export type DocKind = 'notes' | 'textbook_page' | 'diagram' | 'question_paper' | 'other';
export interface UploadedDoc {
  id: string;
  kind: DocKind;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  needs_review: boolean;
  created_at: string;
  extracted_text?: string | null;
}

export const KIND_LABEL: Record<DocKind, string> = {
  notes: 'My notes', textbook_page: 'Textbook page', diagram: 'Diagram', question_paper: 'Question paper', other: 'Other',
};

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export const docs = createStore({ list: [] as UploadedDoc[], busy: null as string | null, error: null as string | null });

export async function loadDocs() {
  const { data } = await insforge().database.from('uploaded_documents')
    .select('id, kind, status, needs_review, created_at').order('created_at', { ascending: false }).limit(20);
  docs.set({ list: (data as UploadedDoc[] | null) ?? [] });
}

/** Upload one image, register it, and have the vision model read it. Returns the document id. */
export async function uploadAndRead(file: File, kind: DocKind, userId: string): Promise<string | null> {
  if (!EXT[file.type]) { docs.set({ error: 'Use a PNG, JPEG or WebP photo.' }); return null; }
  if (file.size > MAX_UPLOAD_BYTES) { docs.set({ error: 'That photo is over 4 MB. Try a smaller one.' }); return null; }
  docs.set({ busy: 'Uploading your photo…', error: null });
  const client = insforge();
  try {
    const key = `${userId}/${crypto.randomUUID()}.${EXT[file.type]}`;
    const up = await client.storage.from('student-uploads').upload(key, file);
    if (up.error || !up.data) throw new ApiError('upload_failed', 'The upload did not work. If a parent has not allowed uploads yet, ask them first.', 0);
    const row = await client.database.from('uploaded_documents')
      .insert([{ storage_key: up.data.key ?? key, mime: file.type, size_bytes: file.size, kind }]).select('id');
    const id = (row.data as { id: string }[] | null)?.[0]?.id;
    if (row.error || !id) throw new ApiError('register_failed', 'The photo uploaded, but it could not be added to your notes. Try again.', 0);
    docs.set({ busy: 'Reading your photo…' });
    await loadDocs();
    await api.documentProcess(id);
    await loadDocs();
    return id;
  } catch (e) {
    docs.set({ error: e instanceof ApiError ? e.message : 'Something went wrong. Try again.' });
    await loadDocs();
    return null;
  } finally {
    docs.set({ busy: null });
  }
}

/** Delete the photo and its reading (a student can always remove their own data). */
export async function removeDoc(id: string) {
  const client = insforge();
  const { data } = await client.database.from('uploaded_documents').select('storage_key').eq('id', id).limit(1);
  const key = (data as { storage_key: string }[] | null)?.[0]?.storage_key;
  if (key) await client.storage.from('student-uploads').remove(key);
  await client.database.from('uploaded_documents').delete().eq('id', id);
  await loadDocs();
}
