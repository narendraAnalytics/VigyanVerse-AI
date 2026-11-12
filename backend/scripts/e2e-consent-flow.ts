// End-to-end RLS + consent flow test against the LIVE InsForge project, with
// email verification left ON. 4 throwaway accounts (2 students, 2 parents) use
// plus-aliases of a mailbox you control, so the verification codes reach you.
//
//   1. E2E_MAILBOX=you@gmail.com npm run e2e:consent -- signup
//        -> signs up 4 accounts; InsForge emails 4 six-digit codes
//   2. npm run e2e:consent -- run s1=123456 s2=... p1=... p2=...
//        -> verifies, runs all checks, then deletes the accounts
//   3. npm run e2e:consent -- cleanup     (deletes any leftover e2e accounts)
//
// Env: INSFORGE_ANON_KEY (required), INSFORGE_API_KEY (defaults to .insforge/project.json),
//      E2E_STATE (state file path; keep it outside the repo — it holds the test password).
import { createClient } from '@insforge/sdk';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const project = JSON.parse(readFileSync(new URL('../.insforge/project.json', import.meta.url), 'utf8'));
const baseUrl: string = process.env.INSFORGE_BASE_URL ?? project.oss_host;
const anonKey = process.env.INSFORGE_ANON_KEY;
const apiKey: string = process.env.INSFORGE_API_KEY ?? project.api_key;
const statePath = process.env.E2E_STATE;
if (!anonKey) throw new Error('INSFORGE_ANON_KEY is required');
if (!statePath) throw new Error('E2E_STATE (path outside the repo) is required');

const LABELS = ['s1', 's2', 'p1', 'p2'] as const;
type Label = (typeof LABELS)[number];
interface State { run: string; password: string; emails: Record<Label, string> }
type Db = ReturnType<typeof createClient>['database'];
interface Account { label: string; id: string; db: Db }

const adminHeaders = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

/** Delete every account whose email contains this run's marker (or any e2e marker). */
async function cleanup(marker: string) {
  const res = await fetch(`${baseUrl}/api/auth/users?offset=0&limit=50&search=${encodeURIComponent(marker)}`, { headers: adminHeaders });
  const body = (await res.json()) as { data?: { id: string; email: string }[] } | { id: string; email: string }[];
  const users = (Array.isArray(body) ? body : body.data ?? []).filter((u) => u.email.includes(marker));
  if (!users.length) return console.log(`cleanup: no accounts matching "${marker}"`);
  const del = await fetch(`${baseUrl}/api/auth/users`, {
    method: 'DELETE', headers: adminHeaders, body: JSON.stringify({ userIds: users.map((u) => u.id) }),
  });
  console.log(`cleanup: deleted ${users.length} account(s) -> HTTP ${del.status}`);
  if (!del.ok) console.error(await del.text());
}

const mode = process.argv[2];

if (mode === 'signup') {
  const mailbox = process.env.E2E_MAILBOX;
  if (!mailbox?.includes('@')) throw new Error('E2E_MAILBOX is required');
  const [local, domain] = mailbox.split('@');
  const run = `vve2e${Date.now().toString(36)}`;
  const state: State = {
    run,
    password: `Vv-${crypto.randomUUID()}`,
    emails: Object.fromEntries(LABELS.map((l) => [l, `${local}+${run}${l}@${domain}`])) as Record<Label, string>,
  };
  writeFileSync(statePath, JSON.stringify(state));
  for (const l of LABELS) {
    const { data, error } = await createClient({ baseUrl, anonKey, isServerMode: true })
      .auth.signUp({ email: state.emails[l], password: state.password, name: `e2e ${l}` });
    console.log(`${l}: ${error ? `FAILED ${JSON.stringify(error)}` : `signed up, verification required = ${data?.requireEmailVerification}`}`);
  }
  console.log(`\nCheck the inbox for 4 codes (subject mentions verification), then:\n  npm run e2e:consent -- run s1=CODE s2=CODE p1=CODE p2=CODE`);
  process.exit(0);
}

const state: State = JSON.parse(readFileSync(statePath, 'utf8'));

if (mode === 'cleanup') {
  await cleanup(state.run);
  rmSync(statePath, { force: true });
  process.exit(0);
}

if (mode !== 'run') throw new Error('mode must be signup | run | cleanup');

// Codes must be labelled (s1=123456 ...). Never guess: InsForge locks a code after
// a few wrong attempts, so trying codes against the wrong account burns them.
const codes = Object.fromEntries(process.argv.slice(3).map((a) => a.split('='))) as Partial<Record<Label, string>>;
const missing = LABELS.filter((l) => !/^\d{6}$/.test(codes[l] ?? ''));
if (missing.length) throw new Error(`Provide labelled 6-digit codes for: ${missing.join(', ')}`);
const results: { ok: boolean; name: string; detail?: string }[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ ok, name, detail: ok ? undefined : JSON.stringify(detail)?.slice(0, 200) });
}

async function verify(label: Label): Promise<Account> {
  const client = createClient({ baseUrl, anonKey, isServerMode: true });
  const { data, error } = await client.auth.verifyEmail({ email: state.emails[label], otp: codes[label]! });
  if (error || !data?.accessToken || !data.user?.id) {
    throw new Error(`verify ${label} failed: ${error?.message ?? JSON.stringify(data)}`);
  }
  console.log(`${label}: verified`);
  const db = createClient({ baseUrl, anonKey, accessToken: data.accessToken, isServerMode: true }).database;
  return { label, id: data.user.id, db };
}

// Verification happens before the try/finally: if a code is wrong the accounts are
// kept so the run can be retried; use `cleanup` mode to remove them.
const [S1, S2, P1, P2] = [await verify('s1'), await verify('s2'), await verify('p1'), await verify('p2')];

try {

  // --- onboarding ---------------------------------------------------------
  for (const s of [S1, S2]) {
    const p = await s.db.from('profiles').insert([{ id: s.id, role: 'student', display_name: s.label }]);
    const st = await s.db.from('students').insert([{ profile_id: s.id, board_code: 'CBSE', grade: 10, birth_year: 2011 }]);
    check(`${s.label}: create student profile`, !p.error && !st.error, p.error ?? st.error);
  }
  for (const p of [P1, P2]) {
    const r = await p.db.from('profiles').insert([{ id: p.id, role: 'parent', display_name: p.label }]);
    check(`${p.label}: create parent profile`, !r.error, r.error);
  }

  const adminTry = await S2.db.from('profiles').update({ role: 'admin' }).eq('id', S2.id);
  check('student cannot change own role', !!adminTry.error, adminTry);
  const parentAsStudent = await P1.db.from('students').insert([{ profile_id: P1.id, grade: 10 }]);
  check('parent cannot create a students row', !!parentAsStudent.error, parentAsStudent);
  const nameEdit = await S1.db.from('profiles').update({ display_name: 'Student One' }).eq('id', S1.id);
  check('student can edit own display_name', !nameEdit.error, nameEdit.error);

  // --- isolation before linking -------------------------------------------
  const s1Profiles = await S1.db.from('profiles').select('id');
  check('student sees only own profile', s1Profiles.data?.length === 1, s1Profiles);
  const p1Students = await P1.db.from('students').select('profile_id');
  check('unlinked parent sees no students', p1Students.data?.length === 0, p1Students);

  // --- invite + link --------------------------------------------------------
  const inv = await S1.db.rpc('create_parent_invite');
  const code: string | undefined = (Array.isArray(inv.data) ? inv.data[0] : inv.data)?.invite_code;
  check('student creates invite code', !!code && /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(code), inv);

  const studentAccept = await S2.db.rpc('accept_parent_invite', { p_code: code });
  check('student cannot accept an invite', !!studentAccept.error, studentAccept);
  const wrong = await P1.db.rpc('accept_parent_invite', { p_code: '0000-0000-0000' });
  check('wrong code returns null', !wrong.error && wrong.data === null, wrong);
  const ok = await P1.db.rpc('accept_parent_invite', { p_code: code!.toLowerCase() });
  check('parent accepts code (case-insensitive) -> student id', ok.data === S1.id, ok);
  const reuse = await P2.db.rpc('accept_parent_invite', { p_code: code });
  check('used code cannot be reused', !reuse.error && reuse.data === null, reuse);

  // --- visibility after linking -------------------------------------------
  const p1See = await P1.db.from('students').select('profile_id');
  check('linked parent sees exactly their child', p1See.data?.length === 1 && p1See.data[0].profile_id === S1.id, p1See);
  const p2See = await P2.db.from('students').select('profile_id');
  check('other parent still sees no students', p2See.data?.length === 0, p2See);
  const s1SeeProfiles = await S1.db.from('profiles').select('id');
  check('student sees own + linked parent profile', s1SeeProfiles.data?.length === 2, s1SeeProfiles);
  const s2SeeProfiles = await S2.db.from('profiles').select('id');
  check('unrelated student still sees only self', s2SeeProfiles.data?.length === 1, s2SeeProfiles);

  // --- consent ----------------------------------------------------------------
  const has = async (who: Account) => (await who.db.rpc('has_consent', { p_student: S1.id, p_consent_type: 'ai_tutoring' })).data;
  check('no consent before parent grants', (await has(S1)) === false);

  const grant = await P1.db.rpc('record_consent', { p_student: S1.id, p_consent_type: 'ai_tutoring', p_granted: true, p_policy_version: 'e2e-v1' });
  check('linked parent records consent', !grant.error, grant.error);
  check('student sees consent granted', (await has(S1)) === true);
  check('parent sees consent granted', (await has(P1)) === true);
  check('unrelated parent cannot query consent', (await has(P2)) === false);

  const p2Grant = await P2.db.rpc('record_consent', { p_student: S1.id, p_consent_type: 'ai_tutoring', p_granted: true, p_policy_version: 'e2e-v1' });
  check('unlinked parent cannot record consent', !!p2Grant.error, p2Grant);
  const direct = await S1.db.from('consent_records').insert([{ student_id: S1.id, consent_type: 'ai_tutoring', granted: true, policy_version: 'x' }]);
  check('student cannot write consent directly', !!direct.error, direct);

  await P1.db.rpc('record_consent', { p_student: S1.id, p_consent_type: 'ai_tutoring', p_granted: false, p_policy_version: 'e2e-v1' });
  check('withdrawal turns consent off', (await has(S1)) === false);
  await P1.db.rpc('record_consent', { p_student: S1.id, p_consent_type: 'ai_tutoring', p_granted: true, p_policy_version: 'e2e-v1' });

  // --- unlink ------------------------------------------------------------------
  const unlink = await S1.db.rpc('revoke_parent_link', { p_other: P1.id });
  check('student can unlink parent', unlink.data === true, unlink);
  check('consent stops counting after unlink', (await has(S1)) === false);
  const p1After = await P1.db.from('students').select('profile_id');
  check('unlinked parent loses access to child', p1After.data?.length === 0, p1After);

  // --- invite table + brute force ---------------------------------------------
  const invRead = await S1.db.from('parent_invites').select('id');
  check('invite table not readable by clients', !!invRead.error || invRead.data?.length === 0, invRead);
  for (let i = 0; i < 10; i++) await P2.db.rpc('accept_parent_invite', { p_code: `FFFF-FFFF-${String(i).padStart(4, '0')}` });
  const throttled = await P2.db.rpc('accept_parent_invite', { p_code: 'FFFF-FFFF-9999' });
  check('11th wrong code in an hour is throttled', !!throttled.error, throttled);
} catch (error) {
  check('test run completed without exceptions', false, error instanceof Error ? error.message : error);
} finally {
  await cleanup(state.run);
  rmSync(statePath, { force: true });
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  -> ${r.detail}` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;
