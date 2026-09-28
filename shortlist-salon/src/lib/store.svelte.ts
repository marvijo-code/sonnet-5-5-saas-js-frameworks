import type { Book, Log, Member, Settings, State } from './types'
import { addDays, todayISO } from './logic'

export const KEY = 'shortlist-salon-v1'

function seed(): State {
  const t = todayISO()
  const d = (n: number) => addDays(t, -n)
  const L = (id: number, memberId: string, bookId: string, ago: number, page: number): Log => ({
    id: `l${id}`,
    memberId,
    bookId,
    date: d(ago),
    page,
  })
  return {
    settings: { prize: 'Booker Prize 2026', announce: '2026-11-09' },
    books: [
      { id: 'b1', title: 'The Salt Cartographer', author: 'Imre Halloran-Vass', pages: 312, assigned: ['m1', 'm3', 'm5'] },
      { id: 'b2', title: 'A Lantern for Drowned Streets', author: 'Odile Nakamura-Reyes', pages: 384, assigned: ['m1', 'm2'] },
      { id: 'b3', title: 'Quiet Engines', author: 'Tobias Wrenfield', pages: 268, assigned: ['m2', 'm4'] },
      { id: 'b4', title: 'The Ninth Orchard', author: 'Adaeze Okonkwo-Lind', pages: 426, assigned: ['m2', 'm4'] },
      { id: 'b5', title: 'Small Hours in Marrowgate', author: 'Constance Ilves', pages: 240, assigned: ['m3', 'm5'] },
      { id: 'b6', title: 'What the Heron Kept', author: 'Rafael Duquesne', pages: 352, assigned: ['m4', 'm5'] },
    ],
    members: [
      { id: 'm1', name: 'Priya Menon', speed: 30, predicted: 'b2' },
      { id: 'm2', name: 'Ottoline Beck', speed: 45, predicted: 'b4' },
      { id: 'm3', name: 'Samir Haddad', speed: 10, predicted: 'b1' },
      { id: 'm4', name: 'Wilhelmina Cho', speed: 60, predicted: 'b4' },
      { id: 'm5', name: 'Dev Laurent', speed: 6, predicted: null },
    ],
    logs: [
      L(1, 'm1', 'b1', 14, 90),
      L(2, 'm1', 'b1', 3, 180),
      L(3, 'm1', 'b2', 7, 60),
      L(4, 'm2', 'b2', 10, 120),
      L(5, 'm2', 'b2', 2, 250),
      L(6, 'm2', 'b3', 5, 268),
      L(7, 'm3', 'b1', 6, 40),
      L(8, 'm3', 'b5', 4, 100),
      L(9, 'm4', 'b4', 9, 200),
      L(10, 'm4', 'b4', 1, 330),
      L(11, 'm5', 'b6', 5, 30),
      L(12, 'm5', 'b1', 1, 60),
    ],
  }
}

function valid(x: any): x is State {
  return (
    x &&
    Array.isArray(x.books) &&
    Array.isArray(x.members) &&
    Array.isArray(x.logs) &&
    x.settings &&
    typeof x.settings.prize === 'string' &&
    typeof x.settings.announce === 'string' &&
    x.books.every((b: Book) => b && Array.isArray(b.assigned))
  )
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (valid(parsed)) return parsed
    }
  } catch {
    /* fall through to seed */
  }
  return seed()
}

export const app: State = $state(load())
export const ui = $state({ toast: '', snapshot: '' as string })

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify($state.snapshot(app)))
  } catch {
    /* storage unavailable */
  }
}
persist()

let timer: ReturnType<typeof setTimeout> | undefined
export function notify(msg: string, undoable = false, before = '') {
  ui.toast = msg
  ui.snapshot = undoable ? before : ''
  clearTimeout(timer)
  timer = setTimeout(() => (ui.toast = ''), 6000)
}
export function undo() {
  if (!ui.snapshot) return
  Object.assign(app, JSON.parse(ui.snapshot))
  persist()
  ui.toast = ''
  ui.snapshot = ''
}
const snap = () => JSON.stringify($state.snapshot(app))
const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export function resetData() {
  Object.assign(app, seed())
  persist()
  notify('Data reset to the seeded shortlist.')
}

export function saveBook(v: { title: string; author: string; pages: number; assigned: string[] }, id?: string) {
  const data = { title: v.title.trim(), author: v.author.trim(), pages: v.pages, assigned: [...v.assigned] }
  if (id) {
    const b = app.books.find((x) => x.id === id)
    if (!b) return id
    const dropped = b.assigned.filter((m) => !data.assigned.includes(m))
    Object.assign(b, data)
    if (dropped.length) app.logs = app.logs.filter((l) => !(l.bookId === id && dropped.includes(l.memberId)))
  } else {
    id = uid('b')
    app.books.push({ id, ...data })
  }
  persist()
  return id
}

export function deleteBook(id: string) {
  const b = app.books.find((x) => x.id === id)
  const before = snap()
  app.books = app.books.filter((x) => x.id !== id)
  app.logs = app.logs.filter((l) => l.bookId !== id)
  for (const m of app.members) if (m.predicted === id) m.predicted = null
  persist()
  notify(`Deleted “${b?.title ?? 'book'}”.`, true, before)
}

export function saveMember(v: { name: string; speed: number; predicted: string | null }, id?: string) {
  const data = { name: v.name.trim(), speed: v.speed, predicted: v.predicted }
  if (id) {
    const m = app.members.find((x) => x.id === id)
    if (m) Object.assign(m, data)
  } else {
    id = uid('m')
    app.members.push({ id, ...data })
  }
  persist()
  return id
}

export function deleteMember(id: string) {
  const m = app.members.find((x) => x.id === id)
  const before = snap()
  app.members = app.members.filter((x) => x.id !== id)
  app.logs = app.logs.filter((l) => l.memberId !== id)
  for (const b of app.books) b.assigned = b.assigned.filter((x) => x !== id)
  persist()
  notify(`Removed ${m?.name ?? 'member'} and their logs.`, true, before)
}

export function saveLog(v: Omit<Log, 'id'>, id?: string) {
  if (id) {
    const l = app.logs.find((x) => x.id === id)
    if (l) Object.assign(l, v)
  } else {
    id = uid('l')
    app.logs.push({ id, ...v })
  }
  persist()
}

export function deleteLog(id: string) {
  const before = snap()
  app.logs = app.logs.filter((l) => l.id !== id)
  persist()
  notify('Reading log deleted.', true, before)
}

export function saveSettings(v: Settings) {
  app.settings.prize = v.prize.trim()
  app.settings.announce = v.announce
  persist()
}
