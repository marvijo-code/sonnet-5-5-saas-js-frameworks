export interface Van {
  id: string
  registration: string
  driver: string
  economy: number
  budget: number
}
export interface Fillup {
  id: string
  vanId: string
  date: string
  litres: number
  price: number
  odometer: number
}
export interface PricePoint {
  id: string
  date: string
  price: number
}
export interface AppState {
  vans: Van[]
  fillups: Fillup[]
  prices: PricePoint[]
}

export const STORAGE_KEY = 'pumpmark-ledger-v1'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayIso = () => iso(new Date())
export const monthKey = (d: Date) => iso(d).slice(0, 7)
export const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()

const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })
const eurWhole = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const priceFmt = new Intl.NumberFormat('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
const num1 = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 1 })
const num0 = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 })
export const fmtEur = (n: number) => eur.format(n)
export const fmtEurWhole = (n: number) => eurWhole.format(n)
export const fmtPrice = (n: number) => `€${priceFmt.format(n)}`
export const fmtL = (n: number) => `${num1.format(n)} L`
export const fmtKm = (n: number) => `${num0.format(n)} km`
export const fmtPct = (n: number) => `${num0.format(n * 100)}%`
export const fmtDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function seedState(now = new Date()): AppState {
  const y = now.getFullYear()
  const m = now.getMonth()
  const today = now.getDate()
  const cur = (dom: number) => iso(new Date(y, m, Math.min(dom, today)))
  const prev = (dom: number) => iso(new Date(y, m - 1, dom))
  const vans: Van[] = [
    { id: 'van-1', registration: 'KT-482-VD', driver: 'Marta Kowalska', economy: 8.4, budget: 380 },
    { id: 'van-2', registration: 'LX-9031', driver: 'Jonas Weber', economy: 11.2, budget: 280 },
    { id: 'van-3', registration: 'BE-217-TR', driver: 'Sofia Marchetti', economy: 7.6, budget: 350 },
    { id: 'van-4', registration: 'WA 73G21', driver: 'Tomasz Nowak', economy: 12.8, budget: 360 },
    { id: 'van-5', registration: 'NL-44-ZXR', driver: 'Anouk de Vries', economy: 9.9, budget: 450 },
  ]
  const rows: [string, string, number, number, number][] = [
    ['van-1', prev(6), 45, 2.16, 41200],
    ['van-1', prev(19), 48, 2.18, 41780],
    ['van-1', cur(5), 46, 2.21, 42350],
    ['van-1', cur(20), 47, 2.22, 42920],
    ['van-2', prev(4), 62, 2.15, 88400],
    ['van-2', prev(17), 60, 2.17, 89000],
    ['van-2', cur(3), 64, 2.21, 89620],
    ['van-2', cur(18), 66, 2.23, 90280],
    ['van-3', prev(12), 40, 2.17, 15300],
    ['van-3', cur(8), 41, 2.21, 15850],
    ['van-3', cur(24), 39, 2.23, 16380],
    ['van-4', prev(2), 80, 2.14, 120100],
    ['van-4', prev(15), 78, 2.19, 120720],
    ['van-4', cur(7), 82, 2.21, 121400],
    ['van-4', cur(22), 85, 2.23, 122090],
    ['van-5', prev(10), 55, 2.18, 60250],
    ['van-5', cur(9), 54, 2.21, 60790],
    ['van-5', cur(26), 56, 2.23, 61340],
  ]
  const fillups: Fillup[] = rows.map(([vanId, date, litres, price, odometer], i) => ({
    id: `fu-${i + 1}`,
    vanId,
    date,
    litres,
    price,
    odometer,
  }))
  const priceRows: [number, number][] = [
    [140, 2.04],
    [112, 2.09],
    [84, 2.13],
    [56, 2.17],
    [28, 2.2],
    [0, 2.23],
  ]
  const prices: PricePoint[] = priceRows.map(([ago, price], i) => ({
    id: `pw-${i + 1}`,
    date: iso(new Date(y, m, today - ago)),
    price,
  }))
  return { vans, fillups, prices }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s && Array.isArray(s.vans) && Array.isArray(s.fillups) && Array.isArray(s.prices)) return s as AppState
    }
  } catch {
    /* fall through to seed */
  }
  return seedState()
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable */
  }
}

export const byDateDesc = (a: Fillup, b: Fillup) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : b.odometer - a.odometer

export interface VanStats {
  monthSpend: number
  monthLitres: number
  budgetUsed: number
  totalSpend: number
  costPerKm: number | null
  kmSpan: number
  lastOdometer: number | null
  count: number
}

export function vanStats(van: Van, fillups: Fillup[], now = new Date()): VanStats {
  const mk = monthKey(now)
  const mine = fillups.filter((f) => f.vanId === van.id)
  const inMonth = mine.filter((f) => f.date.startsWith(mk))
  const monthSpend = inMonth.reduce((s, f) => s + f.litres * f.price, 0)
  const monthLitres = inMonth.reduce((s, f) => s + f.litres, 0)
  const totalSpend = mine.reduce((s, f) => s + f.litres * f.price, 0)
  const odos = mine.map((f) => f.odometer)
  const kmSpan = odos.length > 1 ? Math.max(...odos) - Math.min(...odos) : 0
  return {
    monthSpend,
    monthLitres,
    budgetUsed: van.budget > 0 ? monthSpend / van.budget : 0,
    totalSpend,
    costPerKm: kmSpan > 0 ? totalSpend / kmSpan : null,
    kmSpan,
    lastOdometer: odos.length ? Math.max(...odos) : null,
    count: mine.length,
  }
}

export interface Forecast {
  spent: number
  litres: number
  elapsed: number
  remaining: number
  dim: number
  forecast: number
  baseline: number
  over: boolean
}

/** month-end = spent / elapsed * days in month; a what-if price reprices the remaining days. */
export function forecastVan(van: Van, fillups: Fillup[], now: Date, whatIf: number | null): Forecast {
  const { monthSpend: spent, monthLitres: litres } = vanStats(van, fillups, now)
  const elapsed = now.getDate()
  const dim = daysInMonth(now)
  const remaining = dim - elapsed
  const baseline = (spent / elapsed) * dim
  const forecast = whatIf !== null ? spent + (litres / elapsed) * remaining * whatIf : baseline
  return { spent, litres, elapsed, remaining, dim, forecast, baseline, over: forecast > van.budget }
}

export type Errors = Record<string, string>

export function parsePositive(raw: string, label: string): { value?: number; error?: string } {
  const t = raw.trim()
  if (t === '') return { error: `${label} is required` }
  const n = Number(t)
  if (!Number.isFinite(n)) return { error: `${label} must be a number` }
  if (n <= 0) return { error: `${label} must be greater than 0` }
  return { value: n }
}

export function validateFillup(
  f: { vanId: string; date: string; litres: string; price: string; odometer: string },
  fillups: Fillup[],
  editingId: string | null,
): { errors: Errors; value?: Omit<Fillup, 'id'> } {
  const errors: Errors = {}
  if (!f.vanId) errors.vanId = 'Choose a van'
  if (!f.date) errors.date = 'Date is required'
  else if (f.date > todayIso()) errors.date = 'Date cannot be in the future'
  const l = parsePositive(f.litres, 'Litres')
  if (l.error) errors.litres = l.error
  const p = parsePositive(f.price, 'Price per litre')
  if (p.error) errors.price = p.error
  const o = parsePositive(f.odometer, 'Odometer')
  if (o.error) errors.odometer = o.error
  if (o.value !== undefined && f.vanId && f.date && !errors.date) {
    const others = fillups.filter((x) => x.vanId === f.vanId && x.id !== editingId)
    const before = others.filter((x) => x.date <= f.date).map((x) => x.odometer)
    const after = others.filter((x) => x.date > f.date).map((x) => x.odometer)
    if (before.length && o.value <= Math.max(...before))
      errors.odometer = `Odometer must be greater than the previous reading (${fmtKm(Math.max(...before))})`
    else if (after.length && o.value >= Math.min(...after))
      errors.odometer = `Odometer must be lower than the next reading (${fmtKm(Math.min(...after))})`
  }
  if (Object.keys(errors).length) return { errors }
  return {
    errors,
    value: { vanId: f.vanId, date: f.date, litres: l.value!, price: p.value!, odometer: o.value! },
  }
}
