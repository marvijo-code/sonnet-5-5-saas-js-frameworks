export type Crop = 'grape' | 'apple' | 'stone fruit' | 'other'
export type Stage = 'egg mass' | 'nymph' | 'adult'
export type Finding = 'clear' | 'pest found'

export const CROPS: Crop[] = ['grape', 'apple', 'stone fruit', 'other']
export const STAGES: Stage[] = ['egg mass', 'nymph', 'adult']
export const FINDINGS: Finding[] = ['clear', 'pest found']

export interface Block {
  id: string
  name: string
  crop: Crop
  area: number
  hostTrees: boolean
}
export interface Sighting {
  id: string
  blockId: string
  date: string
  stage: Stage
  count: number
  confirmed: boolean
  notes: string
}
export interface Inspection {
  id: string
  blockId: string
  inspector: string
  doneDate: string
  finding: Finding
}
export interface State {
  blocks: Block[]
  sightings: Sighting[]
  inspections: Inspection[]
}

const pad = (n: number) => String(n).padStart(2, '0')

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(dayNumber(iso) * 86400000 + days * 86400000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function fmtDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function uid(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 9)
}

export interface Risk {
  score: number
  raw: number
  confirmedCount: number
  confirmedPts: number
  hasAdult: boolean
  adultPts: number
  hostPts: number
  grapePts: number
}

export function computeRisk(block: Block, sightings: Sighting[], today: string): Risk {
  const t = dayNumber(today)
  const recent = sightings.filter((s) => {
    if (s.blockId !== block.id || !s.confirmed) return false
    const age = t - dayNumber(s.date)
    return age >= 0 && age <= 30
  })
  const confirmedCount = recent.length
  const hasAdult = recent.some((s) => s.stage === 'adult')
  const confirmedPts = confirmedCount * 10
  const adultPts = hasAdult ? 15 : 0
  const hostPts = block.hostTrees ? 20 : 0
  const grapePts = block.crop === 'grape' ? 15 : 0
  const raw = confirmedPts + adultPts + hostPts + grapePts
  return { score: Math.min(100, raw), raw, confirmedCount, confirmedPts, hasAdult, adultPts, hostPts, grapePts }
}

export type Tier = 'low' | 'watch' | 'alert'
export const tierOf = (score: number): Tier => (score >= 60 ? 'alert' : score >= 30 ? 'watch' : 'low')
export const TIER_LABEL: Record<Tier, string> = { low: 'Low', watch: 'Watch', alert: 'Alert' }
export const intervalFor = (score: number) => (score >= 60 ? 3 : score >= 30 ? 7 : 14)

export interface Due {
  block: Block
  score: number
  interval: number
  last: Inspection | null
  due: string
  daysLeft: number // negative = overdue
  overdue: boolean
}

export function computeDue(block: Block, state: State, today: string): Due {
  const score = computeRisk(block, state.sightings, today).score
  const interval = intervalFor(score)
  let last: Inspection | null = null
  for (const i of state.inspections) {
    if (i.blockId === block.id && (!last || i.doneDate > last.doneDate)) last = i
  }
  const due = last ? addDays(last.doneDate, interval) : today
  const daysLeft = dayNumber(due) - dayNumber(today)
  return { block, score, interval, last, due, daysLeft, overdue: daysLeft < 0 }
}

export function seedState(): State {
  const t = todayISO()
  const ago = (n: number) => addDays(t, -n)
  const blocks: Block[] = [
    { id: 'b-kekes', name: 'Kékes Terrace', crop: 'grape', area: 4.2, hostTrees: true },
    { id: 'b-oldorch', name: 'Old Orchard North', crop: 'apple', area: 3.5, hostTrees: true },
    { id: 'b-riverside', name: 'Riverside Plums', crop: 'stone fruit', area: 2.1, hostTrees: false },
    { id: 'b-balaton', name: 'Balaton Slope', crop: 'grape', area: 6.8, hostTrees: false },
    { id: 'b-cherry', name: 'Cherry Hollow', crop: 'stone fruit', area: 1.6, hostTrees: true },
    { id: 'b-nursery', name: 'Windbreak Nursery', crop: 'other', area: 0.9, hostTrees: false },
  ]
  const sightings: Sighting[] = [
    { id: 's-1', blockId: 'b-kekes', date: ago(2), stage: 'adult', count: 5, confirmed: true, notes: 'Adults on trunk of Ailanthus at the east headland.' },
    { id: 's-2', blockId: 'b-kekes', date: ago(5), stage: 'nymph', count: 12, confirmed: true, notes: 'Late-instar nymphs on lower canes, row 14.' },
    { id: 's-3', blockId: 'b-kekes', date: ago(9), stage: 'egg mass', count: 3, confirmed: true, notes: 'Egg masses on trellis posts.' },
    { id: 's-4', blockId: 'b-oldorch', date: ago(4), stage: 'adult', count: 2, confirmed: true, notes: 'Photographed and sent to plant protection office.' },
    { id: 's-5', blockId: 'b-oldorch', date: ago(12), stage: 'nymph', count: 7, confirmed: true, notes: '' },
    { id: 's-6', blockId: 'b-oldorch', date: ago(3), stage: 'adult', count: 1, confirmed: true, notes: 'Single adult on picking crate.' },
    { id: 's-7', blockId: 'b-riverside', date: ago(6), stage: 'nymph', count: 4, confirmed: true, notes: 'Near the river path gate.' },
    { id: 's-8', blockId: 'b-balaton', date: ago(15), stage: 'nymph', count: 3, confirmed: false, notes: 'Possible; could be a leafhopper. Awaiting ID.' },
    { id: 's-9', blockId: 'b-balaton', date: ago(34), stage: 'egg mass', count: 2, confirmed: true, notes: 'Scraped and destroyed.' },
    { id: 's-10', blockId: 'b-cherry', date: ago(1), stage: 'egg mass', count: 2, confirmed: true, notes: 'On fence post beside the hedge.' },
  ]
  const inspections: Inspection[] = [
    { id: 'i-1', blockId: 'b-kekes', inspector: 'Zsófia Nagy', doneDate: ago(4), finding: 'pest found' },
    { id: 'i-2', blockId: 'b-oldorch', inspector: 'Márk Szabó', doneDate: ago(2), finding: 'pest found' },
    { id: 'i-3', blockId: 'b-riverside', inspector: 'Zsófia Nagy', doneDate: ago(16), finding: 'clear' },
    { id: 'i-4', blockId: 'b-balaton', inspector: 'Ilona Kovács', doneDate: ago(10), finding: 'clear' },
    { id: 'i-5', blockId: 'b-cherry', inspector: 'Márk Szabó', doneDate: ago(8), finding: 'pest found' },
    { id: 'i-6', blockId: 'b-nursery', inspector: 'Ilona Kovács', doneDate: ago(3), finding: 'clear' },
  ]
  return { blocks, sightings, inspections }
}
