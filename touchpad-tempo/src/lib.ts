import { computed, reactive, ref, watch } from 'vue'

export const KEY = 'touchpad-tempo-v1'
export const DISTANCES = [50, 100, 200, 400] as const
export const STROKES = ['freestyle', 'backstroke', 'breaststroke', 'butterfly', 'individual medley'] as const
export type Stroke = (typeof STROKES)[number]

export interface Swimmer {
  id: string
  name: string
  birthYear: number
  squad: string
}
export interface Race {
  id: string
  swimmerId: string
  distance: number
  stroke: Stroke
  date: string
  splits: number[]
}
export interface Target {
  id: string
  label: string
  distance: number
  stroke: Stroke
  time: number
}
export interface State {
  swimmers: Swimmer[]
  races: Race[]
  targets: Target[]
}

/* ---------- formatting & maths ---------- */

export const r2 = (n: number) => Math.round(n * 100) / 100
export const total = (r: Race) => r2(r.splits.reduce((a, b) => a + b, 0))
export const eventKey = (d: number, s: string) => `${d}|${s}`
export const eventLabel = (d: number, s: string) => `${d} m ${s}`
export const currentYear = () => new Date().getFullYear()

export function fmtTime(sec: number): string {
  const cs = Math.round(sec * 100)
  const m = Math.floor(cs / 6000)
  const rest = (cs % 6000) / 100
  return m > 0 ? `${m}:${rest.toFixed(2).padStart(5, '0')}` : rest.toFixed(2)
}
export function fmtSigned(n: number, digits = 2): string {
  const v = Number(n.toFixed(digits))
  return `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(digits)}`
}
export function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
export function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function isNegativeSplit(r: Race): boolean {
  const n = r.splits.length
  if (n < 2 || n % 2) return false
  const h = n / 2
  const first = r.splits.slice(0, h).reduce((a, b) => a + b, 0)
  const second = r.splits.slice(h).reduce((a, b) => a + b, 0)
  return r2(second) < r2(first)
}
export function halves(r: Race): [number, number] {
  const h = Math.floor(r.splits.length / 2)
  return [r2(r.splits.slice(0, h).reduce((a, b) => a + b, 0)), r2(r.splits.slice(h).reduce((a, b) => a + b, 0))]
}

let counter = 0
export const uid = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

/* ---------- seed ---------- */

export function seedState(): State {
  const swimmers: Swimmer[] = [
    { id: 's1', name: 'Hana Mizuno', birthYear: 2009, squad: 'Tide Squad' },
    { id: 's2', name: 'Leo Baptiste', birthYear: 2008, squad: 'Tide Squad' },
    { id: 's3', name: 'Sofia Reyes', birthYear: 2010, squad: 'Tide Squad' },
    { id: 's4', name: 'Jonas Eklund', birthYear: 2007, squad: 'Tide Squad' },
    { id: 's5', name: 'Amara Diallo', birthYear: 2011, squad: 'Lane 6 Juniors' },
    { id: 's6', name: 'Theo Marchetti', birthYear: 2012, squad: 'Lane 6 Juniors' },
    { id: 's7', name: 'Priya Nair', birthYear: 2011, squad: 'Lane 6 Juniors' },
    { id: 's8', name: 'Kofi Mensah', birthYear: 2013, squad: 'Lane 6 Juniors' },
  ]
  const R = (n: number, s: string, d: number, st: Stroke, ago: number, splits: number[]): Race => ({
    id: `r${n}`,
    swimmerId: s,
    distance: d,
    stroke: st,
    date: isoDaysAgo(ago),
    splits,
  })
  const races: Race[] = [
    R(1, 's1', 200, 'breaststroke', 60, [33.9, 36.0, 36.4, 36.6]),
    R(2, 's1', 200, 'breaststroke', 30, [33.5, 35.6, 36.1, 36.3]),
    R(3, 's1', 200, 'breaststroke', 8, [33.2, 35.4, 35.9, 35.8]),
    R(4, 's1', 100, 'breaststroke', 45, [33.0, 37.6]),
    R(5, 's2', 200, 'breaststroke', 20, [34.8, 37.0, 37.5, 37.7]),
    R(6, 's2', 100, 'freestyle', 40, [28.0, 30.3]),
    R(7, 's2', 100, 'freestyle', 12, [29.0, 28.7]),
    R(8, 's3', 200, 'freestyle', 35, [29.8, 31.9, 32.3, 32.0]),
    R(9, 's3', 200, 'freestyle', 10, [31.2, 32.1, 31.6, 31.3]),
    R(10, 's4', 200, 'freestyle', 25, [30.9, 32.8, 33.3, 33.6]),
    R(11, 's4', 200, 'freestyle', 5, [30.6, 32.6, 33.0, 33.0]),
    R(12, 's5', 100, 'freestyle', 30, [29.9, 31.6]),
    R(13, 's5', 100, 'freestyle', 4, [29.4, 31.0]),
    R(14, 's6', 100, 'breaststroke', 22, [35.6, 38.9]),
    R(15, 's6', 100, 'breaststroke', 6, [34.9, 38.0]),
    R(16, 's7', 100, 'breaststroke', 9, [34.8, 37.5]),
  ]
  const targets: Target[] = [
    { id: 't1', label: 'National Juniors', distance: 200, stroke: 'breaststroke', time: 140.0 },
    { id: 't2', label: 'Regional Champs', distance: 100, stroke: 'freestyle', time: 58.0 },
    { id: 't3', label: 'County Qualifier', distance: 200, stroke: 'freestyle', time: 128.0 },
    { id: 't4', label: 'Club Gold Standard', distance: 100, stroke: 'breaststroke', time: 72.0 },
  ]
  return { swimmers, races, targets }
}

/* ---------- persistence ---------- */

function valid(x: unknown): x is State {
  const s = x as State
  return !!s && Array.isArray(s.swimmers) && Array.isArray(s.races) && Array.isArray(s.targets)
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
  return seedState()
}

export const state = reactive<State>(load())

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable */
  }
}
watch(state, persist, { deep: true, flush: 'sync' })
persist()

function replaceState(next: State) {
  state.swimmers = next.swimmers
  state.races = next.races
  state.targets = next.targets
}

export function resetData() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  replaceState(seedState())
  toast.value = { message: 'Data reset to the starter roster.' }
}

/* ---------- toast with undo ---------- */

export const toast = ref<{ message: string; undo?: () => void } | null>(null)
let toastTimer: number | undefined
watch(toast, (t) => {
  clearTimeout(toastTimer)
  if (t) toastTimer = window.setTimeout(() => (toast.value = null), 7000)
})
function withUndo(message: string, mutate: () => void) {
  const snapshot = JSON.stringify(state)
  mutate()
  toast.value = { message, undo: () => replaceState(JSON.parse(snapshot)) }
}

/* ---------- mutations ---------- */

export function saveSwimmer(v: Omit<Swimmer, 'id'>, id?: string): string {
  if (id) {
    const s = state.swimmers.find((x) => x.id === id)
    if (s) Object.assign(s, v)
    return id
  }
  const nid = uid('s')
  state.swimmers.push({ id: nid, ...v })
  return nid
}
export function deleteSwimmer(id: string) {
  const s = state.swimmers.find((x) => x.id === id)
  if (!s) return
  const n = state.races.filter((r) => r.swimmerId === id).length
  withUndo(`Deleted ${s.name}${n ? ` and ${n} race${n > 1 ? 's' : ''}` : ''}.`, () => {
    state.swimmers = state.swimmers.filter((x) => x.id !== id)
    state.races = state.races.filter((r) => r.swimmerId !== id)
  })
}
export function saveRace(v: Omit<Race, 'id'>, id?: string) {
  if (id) {
    const r = state.races.find((x) => x.id === id)
    if (r) Object.assign(r, v)
  } else state.races.push({ id: uid('r'), ...v })
}
export function deleteRace(id: string) {
  withUndo('Race deleted.', () => {
    state.races = state.races.filter((r) => r.id !== id)
  })
}
export function saveTarget(v: Omit<Target, 'id'>, id?: string) {
  if (id) {
    const t = state.targets.find((x) => x.id === id)
    if (t) Object.assign(t, v)
  } else state.targets.push({ id: uid('t'), ...v })
}
export function deleteTarget(id: string) {
  const t = state.targets.find((x) => x.id === id)
  withUndo(`Deleted target ${t?.label ?? ''}.`, () => {
    state.targets = state.targets.filter((x) => x.id !== id)
  })
}

/* ---------- queries ---------- */

export const swimmerById = (id: string) => state.swimmers.find((s) => s.id === id)
export const raceSort = (a: Race, b: Race) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1)

export function bestTime(swimmerId: string, distance: number, stroke: string): number | null {
  let best: number | null = null
  for (const r of state.races) {
    if (r.swimmerId === swimmerId && r.distance === distance && r.stroke === stroke) {
      const t = total(r)
      if (best === null || t < best) best = t
    }
  }
  return best
}

export interface Gap {
  seconds: number
  percent: number
  reached: boolean
}
export function gapTo(best: number, target: number): Gap {
  const seconds = r2(best - target)
  return { seconds, percent: (seconds / target) * 100, reached: seconds <= 0 }
}

export const NEAR_PERCENT = 2

export interface Near {
  swimmer: Swimmer
  target: Target
  best: number
  gap: Gap
}
/** Swimmer/target pairs within 2% of a qualifying time that the swimmer has not yet reached. */
export const nearMisses = computed<Near[]>(() => {
  const out: Near[] = []
  for (const sw of state.swimmers) {
    for (const t of state.targets) {
      const best = bestTime(sw.id, t.distance, t.stroke)
      if (best === null) continue
      const gap = gapTo(best, t.time)
      if (!gap.reached && gap.percent <= NEAR_PERCENT) out.push({ swimmer: sw, target: t, best, gap })
    }
  }
  return out
})
export const nearSwimmerCount = computed(() => new Set(nearMisses.value.map((n) => n.swimmer.id)).size)

/* ---------- router ---------- */

export const route = ref(parseHash())
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '')
  return h.split('/').filter(Boolean).map(decodeURIComponent)
}
window.addEventListener('hashchange', () => {
  route.value = parseHash()
})
export const go = (path: string) => {
  location.hash = path
}
