// Seed the first tenant: ZakkiWedsYasmeen, one parent event and four child events.
// Run once with the service role key (ADR-04: seed by script, never SQL-editor paste).
//   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed.ts
// Aborts if the parent slug already exists.
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL ?? 'https://cxedgteczvlawjqzfvnc.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!key) { console.error('Set SUPABASE_SERVICE_ROLE_KEY in the shell for this run only.'); process.exit(1) }
const db = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const { data: existing } = await db.from('events').select('id').eq('slug', 'zakki-weds-yasmeen').maybeSingle()
  if (existing) { console.log('Parent event exists. Nothing seeded.'); return }

  const { data: parent, error: pe } = await db.from('events').insert({
    slug: 'zakki-weds-yasmeen', name: 'ZakkiWedsYasmeen', short_name: 'Wedding', event_type: 'private',
    status: 'open', date: '2027-05-27', venue_city: 'Milwaukee, WI', hashtag: '#ZakkiWedsYasmeen',
    host_line: 'We request the pleasure of your company at the wedding of our children',
    names_line: 'Zakki and Yasmeen',
    verse_ar: 'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً ۚ إِنَّ فِي ذَٰلِكَ لَآيَاتٍ لِّقَوْمٍ يَتَفَكَّرُونَ',
    verse_en: 'Among His signs is that He created for you spouses from among yourselves, so that you may find rest in them, and He placed love and mercy between you. Surely in this are signs for a people who reflect.',
    verse_ref: 'Surah Ar-Rum · 30:21',
    theme: { type1: '#4A1B24', type2: '#8A5766', band: '#E8C4C0' },
  }).select().single()
  if (pe) throw pe

  const children = [
    { slug: 'yasmeen-mehndi', name: "Yasmeen's Mehndi", short_name: "Y. Mehndi", date: '2027-05-27', paid_by: 'Asiya', guest_list_note: 'very short list',
      host_line: 'We request the pleasure of your company at the Mehndi of', names_line: 'Yasmeen with Zakki',
      verse_ar: 'سُبْحَانَ الَّذِي خَلَقَ الْأَزْوَاجَ كُلَّهَا مِمَّا تُنبِتُ الْأَرْضُ وَمِنْ أَنفُسِهِمْ وَمِمَّا لَا يَعْلَمُونَ',
      verse_en: 'Glory to Him who created all things in pairs: what the earth grows, and themselves, and what they do not yet know.', verse_ref: 'Surah Ya-Sin · 36:36',
      dress_code: 'Traditional. Pastels, yellows and blush.', theme: { type1: '#4A1B24', type2: '#9C6B78', band: '#F3E3C8' } },
    { slug: 'zakki-mehndi', name: "Zakki's Mehndi", short_name: 'Z. Mehndi', date: '2027-05-28', paid_by: 'Zubia', guest_list_note: 'very short list',
      host_line: 'We request the pleasure of your company at the Mehndi of', names_line: 'Zakki with Yasmeen',
      verse_ar: 'هُوَ الَّذِي خَلَقَكُم مِّن نَّفْسٍ وَاحِدَةٍ وَجَعَلَ مِنْهَا زَوْجَهَا لِيَسْكُنَ إِلَيْهَا',
      verse_en: 'It is He who created you from a single soul, and from it made its mate, so that he might find peace with her.', verse_ref: "Surah Al-A'raf · 7:189",
      dress_code: 'Traditional. Greens, olive, and deep jewel tones.', theme: { type1: '#3F4D36', type2: '#6F8262', band: '#E6EBDF' } },
    { slug: 'nikkah', name: 'Nikkah', short_name: 'Nikkah', date: '2027-05-29', paid_by: 'Both dads', guest_list_note: 'short list',
      host_line: 'We request the pleasure of your company at the Nikkah of', names_line: 'Yasmeen and Zakki',
      verse_ar: 'هُنَّ لِبَاسٌ لَّكُمْ وَأَنتُمْ لِبَاسٌ لَّهُنَّ', verse_en: 'They are a garment for you, and you are a garment for them.', verse_ref: 'Surah Al-Baqarah · 2:187',
      dress_code: 'Modest formal. White and ivory.', theme: { type1: '#2F3D2A', type2: '#5E6F55', band: '#EEF1EA' } },
    { slug: 'shalima', name: 'Shaadi · Shalima', short_name: 'Shalima', date: '2027-05-30', paid_by: 'Both dads', guest_list_note: 'long list',
      host_line: 'We request the pleasure of your company at the Shalima of', names_line: 'Zakki and Yasmeen',
      verse_ar: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
      verse_en: 'Our Lord, grant us spouses and children who are the comfort of our eyes, and make us an example for those who are mindful of You.', verse_ref: 'Surah Al-Furqan · 25:74',
      dress_code: 'Formal. Burgundy, wine, blush, ivory, olive.', theme: { type1: '#4A1B24', type2: '#7A2A36', band: '#F1E1E4' } },
  ]
  const { data: kids, error: ke } = await db.from('events').insert(children.map(c => ({ ...c, event_type: 'private', status: 'open', parent_event_id: parent.id, venue_city: 'Milwaukee, WI' }))).select('id, slug')
  if (ke) throw ke
  const byslug = Object.fromEntries(kids!.map(k => [k.slug, k.id]))

  // Six logins. auth.users rows are created by Zubia in the dashboard; members link by email on first login.
  const members = [
    { name: 'Zubia Mughal', role: "Zakki's mother", email: 'zubiaml4l@gmail.com' },
    { name: 'Kamran Sarwar', role: "Zakki's father", email: 'kamran@example.com' },
    { name: 'Asiya Patrick', role: "Yasmeen's mother", email: 'asiya@example.com' },
    { name: 'Taqi Patrick', role: "Yasmeen's father", email: 'taqi@example.com' },
    { name: 'Zakki', role: 'Groom', email: 'zakki@example.com' },
    { name: 'Yasmeen', role: 'Bride', email: 'yasmeen@example.com' },
  ]
  const { data: mem, error: me } = await db.from('members').insert(members.map(m => ({ ...m, event_id: parent.id }))).select('id, name')
  if (me) throw me
  const who = (n: string) => mem!.find(m => m.name.startsWith(n))!.id

  // Starter tasks from the family. Amounts are 0 until real quotes land. No invented figures.
  const tasks = [
    { event_id: byslug.nikkah, title: 'Book the masjid and the sheikh for the Nikkah', owner_id: who('Kamran'), due: '2026-11-15', category: 'venue' },
    { event_id: byslug.nikkah, title: 'Book the Nikkah venue and add the name here', owner_id: who('Kamran'), due: '2026-11-15', category: 'venue' },
    { event_id: byslug.shalima, title: 'Book the Shalima venue and add the name here', owner_id: who('Taqi'), due: '2026-11-30', category: 'venue' },
    { event_id: byslug['yasmeen-mehndi'], title: "Yasmeen's Mehndi venue and time", owner_id: who('Taqi'), due: '2026-11-30', category: 'venue' },
    { event_id: byslug['zakki-mehndi'], title: "Zakki's Mehndi venue and time", owner_id: who('Kamran'), due: '2026-11-30', category: 'venue' },
    { event_id: parent.id, title: 'Phone numbers for Danyal, Azlan, Mahwish on the site', owner_id: who('Zubia'), due: '2026-11-01', category: 'invites' },
    { event_id: parent.id, title: 'Send invite links to the family list', owner_id: who('Zubia'), due: '2027-01-15', category: 'invites' },
  ]
  const { error: te } = await db.from('tasks').insert(tasks)
  if (te) throw te

  const content = [
    { key: 'home_welcome', body: '' }, { key: 'registry_note', body: 'Your presence and your prayers are the gift.' },
    { key: 'rsvp_contacts', body: 'Danyal Kamran Mirza · [phone]\nAzlan Kamran Mirza · [phone]\nMahwish Abu Bakr · [phone]' },
    { key: 'reply_by', body: '' }, { key: 'sadqa_causes', body: '' }, { key: 'hotel_block', body: '' },
  ]
  const { error: ce } = await db.from('site_content').insert(content.map(c => ({ ...c, event_id: parent.id })))
  if (ce) throw ce

  console.log('Seeded: 1 parent, 4 events, 6 members, 7 tasks, 6 content rows.')
}
main().catch(e => { console.error(e); process.exit(1) })
