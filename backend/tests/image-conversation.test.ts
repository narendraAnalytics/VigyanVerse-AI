import { describe, expect, it } from 'vitest';
import { findOrCreateImageConversation, imageConversationTitle } from '../src/shared/image-conversation.ts';

const ROW = { id: 'c1', mode: 'tutor', subject_code: null, socratic_topic: null, socratic_hints: 0 };

/** A tiny stand-in for the InsForge query builder: scripted select results and insert results. */
function fakeDb(opts: { selects: unknown[][]; insert?: { data: unknown[] | null; error: unknown } }) {
  const calls = { selects: 0, inserts: [] as unknown[] };
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({ limit: async () => ({ data: opts.selects[calls.selects++] ?? [], error: null }) }),
      }),
      insert: (rows: unknown[]) => {
        calls.inserts.push(rows);
        return { select: async () => opts.insert ?? { data: [ROW], error: null } };
      },
    }),
  };
  return { db, calls };
}

describe('imageConversationTitle', () => {
  it('adds the Image: prefix once and keeps 80 chars', () => {
    expect(imageConversationTitle('A concave mirror')).toBe('Image: A concave mirror');
    expect(imageConversationTitle('Image: A concave mirror')).toBe('Image: A concave mirror');
    expect(imageConversationTitle(undefined)).toBe('Image: Question from an image');
    expect(imageConversationTitle('x'.repeat(200))).toHaveLength(80);
  });
});

describe('findOrCreateImageConversation', () => {
  it('returns the existing conversation without inserting', async () => {
    const { db, calls } = fakeDb({ selects: [[ROW]] });
    expect(await findOrCreateImageConversation(db, 'd1', 'T')).toEqual(ROW);
    expect(calls.inserts).toHaveLength(0);
  });

  it('creates one linked to the image, titled with the prefix', async () => {
    const { db, calls } = fakeDb({ selects: [[]] });
    expect(await findOrCreateImageConversation(db, 'd1', 'A concave mirror')).toEqual(ROW);
    expect(calls.inserts[0]).toEqual([{ mode: 'tutor', subject_code: null, title: 'Image: A concave mirror', document_id: 'd1' }]);
  });

  it('reads the winner when a parallel request created it first', async () => {
    const { db } = fakeDb({ selects: [[], [ROW]], insert: { data: null, error: { message: 'duplicate key' } } });
    expect(await findOrCreateImageConversation(db, 'd1', 'T')).toEqual(ROW);
  });

  it('returns null when the image is not the student\'s own (policy refuses the insert)', async () => {
    const { db } = fakeDb({ selects: [[], []], insert: { data: null, error: { message: 'row-level security' } } });
    expect(await findOrCreateImageConversation(db, 'd1', 'T')).toBeNull();
  });
});
