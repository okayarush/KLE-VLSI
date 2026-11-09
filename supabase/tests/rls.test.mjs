// RLS isolation test. Creates 2 student teams + 1 faculty with the service role, then checks policies as each actor.
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from '../../scripts/env.mjs'

const env = loadEnv()
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PW = 'Test-pass-12345!'
const stamp = Date.now()
let fails = 0
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++ }

async function mkUser(tag) {
  const email = `rls.${tag}.${stamp}@kletech.ac.in`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true })
  if (error) throw error
  const c = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const s = await c.auth.signInWithPassword({ email, password: PW })
  if (s.error) throw s.error
  return { id: data.user.id, email, c }
}
const A = await mkUser('a'), B = await mkUser('b'), F = await mkUser('f')
await admin.from('user_roles').insert({ user_id: F.id, role: 'faculty' })

const bad = await admin.auth.admin.createUser({ email: `x${stamp}@gmail.com`, password: PW, email_confirm: true })
ok(!!bad.error, 'non-kletech sign-up is rejected')

const ta = (await A.c.rpc('create_team', { p_name: 'Team A', p_theme: 1, p_artefact: 'x' })).data
const tb = (await B.c.rpc('create_team', { p_name: 'Team B', p_theme: 2, p_artefact: 'y' })).data
ok(!!ta && !!tb, 'students create their own teams')
ok((await A.c.rpc('create_team', { p_name: 'Again', p_theme: 1, p_artefact: '' })).error != null, 'a student cannot create a second team')

const ins = await A.c.from('section_prose').upsert({ team_id: ta, page_no: 2, section_id: 'need', text: 'secret A' })
ok(!ins.error, 'A can write prose to own team')
const row = await A.c.from('section_rows').insert({ team_id: ta, page_no: 4, section_id: 'frtable', data: { no: 'FR-01' } }).select().single()
ok(!row.error && row.data?.created_by === A.id, 'A can add a row; server stamps created_by')

ok(((await B.c.from('section_prose').select('*').eq('team_id', ta)).data ?? []).length === 0, 'B cannot read A prose')
ok(((await B.c.from('section_rows').select('*').eq('team_id', ta)).data ?? []).length === 0, 'B cannot read A rows')
ok((await B.c.from('section_prose').upsert({ team_id: ta, page_no: 2, section_id: 'need', text: 'hacked' })).error != null, 'B cannot write into A team')
await B.c.from('section_rows').update({ data: { no: 'HACK' } }).eq('id', row.data.id)
ok((await admin.from('section_rows').select('data').eq('id', row.data.id).single()).data.data.no === 'FR-01', 'B cannot update A row')
await B.c.from('section_rows').delete().eq('id', row.data.id)
ok((await admin.from('section_rows').select('id').eq('id', row.data.id)).data.length === 1, 'B cannot delete A row')
ok(((await B.c.from('teams').select('*').eq('id', ta)).data ?? []).length === 0, 'B cannot see team A')
ok((await B.c.from('team_members').insert({ team_id: ta, user_id: B.id })).error != null, 'B cannot add self to team A')
ok((await B.c.from('teams').insert({ name: 'direct', theme_no: 1, created_by: B.id })).error != null, 'direct team insert is blocked (RPC only)')
ok((await B.c.rpc('invite_member', { p_team: ta, p_email: B.email })).error != null, 'B cannot invite into team A')

const path = `team/${ta}/2/${crypto.randomUUID()}-t.png`
const png = new Blob([Uint8Array.from([137, 80, 78, 71])], { type: 'image/png' })
ok(!(await A.c.storage.from('evidence').upload(path, png, { contentType: 'image/png' })).error, 'A can upload evidence to own folder')
ok((await B.c.storage.from('evidence').download(path)).error != null, 'B cannot download A evidence')
ok((await B.c.storage.from('evidence').upload(`team/${ta}/2/${crypto.randomUUID()}-b.png`, png, { contentType: 'image/png' })).error != null, 'B cannot upload into A folder')
ok((await A.c.storage.from('evidence').upload(`team/${ta}/2/${crypto.randomUUID()}-x.exe`, new Blob(['x']), { contentType: 'application/x-msdownload' })).error != null, 'disallowed MIME type is rejected')
await admin.storage.from('evidence').remove([path])

await admin.from('team_assignments').insert({ team_id: ta, faculty_id: F.id, kind: 'reviewer' })
const draft = await F.c.from('faculty_reviews').insert({ team_id: ta, review_id: 'R1', summary: 'draft', observations: [{ text: 'o1' }], faculty_id: F.id }).select().single()
ok(!draft.error, 'assigned faculty can write a review')
ok(((await A.c.from('faculty_reviews').select('*').eq('team_id', ta)).data ?? []).length === 0, 'A cannot see an unreleased review')
await F.c.from('faculty_reviews').update({ released_at: new Date().toISOString() }).eq('id', draft.data.id)
ok(((await A.c.from('faculty_reviews').select('*').eq('team_id', ta)).data ?? []).length === 1, 'A sees the review once released')
ok((await A.c.from('faculty_reviews').insert({ team_id: ta, review_id: 'R2', faculty_id: A.id })).error != null, 'student cannot insert a faculty review')
await A.c.from('faculty_reviews').update({ summary: 'edited by student' }).eq('id', draft.data.id)
await A.c.from('faculty_reviews').delete().eq('id', draft.data.id)
const after = (await admin.from('faculty_reviews').select('summary').eq('id', draft.data.id)).data
ok(after.length === 1 && after[0].summary === 'draft', 'student cannot edit or delete a faculty review')
ok(((await B.c.from('faculty_reviews').select('*').eq('team_id', ta)).data ?? []).length === 0, 'B cannot see A faculty review')

const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
for (const t of ['teams', 'section_prose', 'section_rows', 'evidence', 'faculty_reviews', 'profiles']) ok(((await anon.from(t).select('*')).data ?? []).length === 0, `anon reads nothing from ${t}`)

await admin.from('teams').delete().in('id', [ta, tb])
for (const u of [A, B, F]) { const d = await admin.auth.admin.deleteUser(u.id); if (d.error) console.error('cleanup failed for', u.email, d.error.message) }
console.log(fails ? `\n${fails} FAILED` : '\nAll RLS checks passed')
process.exit(fails ? 1 : 0)
