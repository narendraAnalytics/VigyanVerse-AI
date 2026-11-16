// The one saved conversation that belongs to an uploaded image (migration image-conversations).
// Used by document-ask (answers from the image text) and tutor-chat ("solve it" from the image),
// so both kinds of answer land in the same history. Runs with the STUDENT's client: RLS only
// finds the student's own conversation, and the insert policy only links the student's own image.

/** The columns tutor-chat needs from a conversation. */
export const CONVERSATION_COLUMNS = 'id, mode, subject_code, socratic_topic, socratic_hints';
export interface ConversationRow { id: string; mode: 'tutor' | 'socratic'; subject_code: string | null; socratic_topic: string | null; socratic_hints: number }

/** The parts of the InsForge database client this needs (a query builder that is awaited). */
// deno-lint-ignore no-explicit-any
type Db = { from: (table: string) => any };

/** Saved conversations solved from an image are titled "Image: <first sentence>" (the app shows an icon). */
export const IMAGE_TITLE_PREFIX = 'Image: ';

export function imageConversationTitle(title: string | undefined): string {
  const t = (title ?? '').trim();
  const withPrefix = t.startsWith(IMAGE_TITLE_PREFIX) ? t : IMAGE_TITLE_PREFIX + (t || 'Question from an image');
  return withPrefix.slice(0, 80);
}

/**
 * Find the image's conversation, or create it. Returns null when the image is not the student's
 * own (the insert policy refuses it) or the database fails.
 */
export async function findOrCreateImageConversation(db: Db, documentId: string, title: string | undefined): Promise<ConversationRow | null> {
  const find = async () => {
    const { data, error } = await db.from('conversations').select(CONVERSATION_COLUMNS).eq('document_id', documentId).limit(1);
    return error ? null : ((data as ConversationRow[] | null)?.[0] ?? null);
  };
  const found = await find();
  if (found) return found;
  const { data, error } = await db.from('conversations')
    .insert([{ mode: 'tutor', subject_code: null, title: imageConversationTitle(title), document_id: documentId }])
    .select(CONVERSATION_COLUMNS);
  if (!error && (data as ConversationRow[] | null)?.length) return (data as ConversationRow[])[0];
  // Two requests for the same image at once: the unique index lets one insert; read that one.
  return find();
}
