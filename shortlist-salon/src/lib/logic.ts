import type { Book, Log, Member, State } from './types'

export const SHORTLIST_DATE = '2026-09-22'

const pad = (n: number) => String(n).padStart(2, '0')

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const isDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

const dayNum = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86400000
}

export const daysBetween = (a: string, b: string) => Math.round(dayNum(b) - dayNum(a))

export function addDays(iso: string, n: number): string {
  const t = new Date((dayNum(iso) + n) * 86400000)
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

export function fmtDate(iso: string, withYear = true): string {
  if (!isDate(iso)) return iso
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  })
}

export const fmtNum = (n: number) => n.toLocaleString('en-GB')

export function currentPage(logs: Log[], memberId: string, bookId: string): number {
  let best = 0
  for (const l of logs) if (l.memberId === memberId && l.bookId === bookId && l.page > best) best = l.page
  return best
}

export interface Pace {
  current: number
  remaining: number
  percent: number
  days: number
  needed: number
  behind: boolean
  finish: string | null
  late: boolean
}

export function paceFor(book: Book, member: Member, s: State, today: string): Pace {
  const current = Math.min(book.pages, currentPage(s.logs, member.id, book.id))
  const remaining = Math.max(0, book.pages - current)
  const days = daysBetween(today, s.settings.announce)
  const needed = remaining === 0 ? 0 : remaining / Math.max(days, 1)
  const finish = remaining === 0 ? null : addDays(today, Math.ceil(remaining / member.speed))
  return {
    current,
    remaining,
    percent: Math.round((current / book.pages) * 100),
    days,
    needed,
    behind: remaining > 0 && needed > member.speed,
    finish,
    late: !!finish && finish > s.settings.announce,
  }
}

export function clubCompletion(s: State) {
  let read = 0
  let total = 0
  for (const b of s.books)
    for (const mid of b.assigned) {
      if (!s.members.some((m) => m.id === mid)) continue
      total += b.pages
      read += Math.min(b.pages, currentPage(s.logs, mid, b.id))
    }
  return { read, total, percent: total ? Math.round((read / total) * 100) : 0 }
}

export const votesFor = (s: State, bookId: string) => s.members.filter((m) => m.predicted === bookId)

const SPINES = ['#8b2332', '#17362f', '#2f4a73', '#b8923f', '#5b3a5e', '#a4552c']
export function spineColor(id: string): string {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return SPINES[h % SPINES.length]
}

/* ---------- validation ---------- */

const isWhole = (s: string) => /^\d+$/.test(s.trim())

export function validateBook(s: State, v: { title: string; author: string; pages: string }, editId?: string) {
  const e: Record<string, string> = {}
  if (!v.title.trim()) e.title = 'Title is required.'
  if (!v.author.trim()) e.author = 'Author is required.'
  if (!isWhole(v.pages) || Number(v.pages) <= 0) e.pages = 'Pages must be a whole number greater than 0.'
  else if (editId) {
    const top = Math.max(0, ...s.logs.filter((l) => l.bookId === editId).map((l) => l.page))
    if (Number(v.pages) < top) e.pages = `A reading log already reaches page ${top}.`
  }
  return e
}

export function validateMember(s: State, v: { name: string; speed: string }, editId?: string) {
  const e: Record<string, string> = {}
  const name = v.name.trim()
  if (!name) e.name = 'Name is required.'
  else if (s.members.some((m) => m.id !== editId && m.name.trim().toLowerCase() === name.toLowerCase()))
    e.name = 'Another member already has this name.'
  const sp = Number(v.speed.trim())
  if (!v.speed.trim() || !Number.isFinite(sp) || sp <= 0) e.speed = 'Reading speed must be a number greater than 0.'
  return e
}

export function validateLog(
  s: State,
  v: { memberId: string; bookId: string; date: string; page: string },
  editId?: string,
) {
  const e: Record<string, string> = {}
  const member = s.members.find((m) => m.id === v.memberId)
  const book = s.books.find((b) => b.id === v.bookId)
  if (!v.memberId || !member) e.member = 'Choose a member.'
  if (!v.bookId || !book) e.book = 'Choose a book.'
  else if (member && !book.assigned.includes(member.id)) e.book = `${book.title} is not assigned to ${member.name}.`
  if (!v.date) e.date = 'Date is required.'
  else if (!isDate(v.date)) e.date = 'Enter a valid date.'
  if (!isWhole(v.page)) e.page = 'Enter the current page as a whole number.'
  else {
    const p = Number(v.page)
    if (book && p > book.pages) e.page = `Cannot exceed ${book.pages} pages.`
    else if (member && book && isDate(v.date)) {
      const others = s.logs.filter((l) => l.id !== editId && l.memberId === member.id && l.bookId === book.id)
      const before = Math.max(0, ...others.filter((l) => l.date <= v.date).map((l) => l.page))
      const after = others.filter((l) => l.date > v.date).map((l) => l.page)
      if (p < before) e.page = `Cannot be lower than page ${before}, logged earlier.`
      else if (after.length && p > Math.min(...after))
        e.page = `Cannot pass page ${Math.min(...after)}, already logged on a later date.`
    }
  }
  return e
}

export function validateSettings(v: { prize: string; announce: string }) {
  const e: Record<string, string> = {}
  if (!v.prize.trim()) e.prize = 'Prize name is required.'
  if (!v.announce) e.announce = 'Announcement date is required.'
  else if (!isDate(v.announce)) e.announce = 'Enter a valid date.'
  return e
}
