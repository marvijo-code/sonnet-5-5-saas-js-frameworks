import { Injectable, computed, signal } from '@angular/core';

export const CAUSES = ['weather', 'air traffic control', 'technical', 'crew', 'other'] as const;
export type Cause = (typeof CAUSES)[number];
export const CAUSE_LABEL: Record<Cause, string> = {
  weather: 'Weather',
  'air traffic control': 'Air traffic control',
  technical: 'Technical',
  crew: 'Crew',
  other: 'Other',
};
export const STATUSES = ['open', 'paid', 'rejected'] as const;
export type ClaimStatus = (typeof STATUSES)[number];

export interface Trip {
  id: string;
  passenger: string;
  flight: string;
  date: string;
  origin: string;
  destination: string;
  distanceKm: number;
  scheduledArrival: string;
  actualArrival: string;
  cause: Cause;
}
export interface Claim {
  id: string;
  tripId: string;
  dateFiled: string;
  amount: number;
  status: ClaimStatus;
}
export interface Rules {
  band1Max: number;
  band2Max: number;
  amount1: number;
  amount2: number;
  amount3: number;
  minDelayHours: number;
  extraordinary: Cause[];
  windowMonths: number;
}
export interface State {
  trips: Trip[];
  claims: Claim[];
  rules: Rules;
}
export type Verdict = 'eligible' | 'short' | 'extraordinary';
export interface Assessment {
  delayMinutes: number | null;
  verdict: Verdict;
  reason: string;
  amount: number;
  deadline: string;
  daysLeft: number;
}

export const KEY = 'delay-dossier-v1';

export const DEFAULT_RULES: Rules = {
  band1Max: 1500,
  band2Max: 3500,
  amount1: 250,
  amount2: 400,
  amount3: 600,
  minDelayHours: 3,
  extraordinary: ['weather', 'air traffic control'],
  windowMonths: 24,
};

/* ---------- date helpers (all calendar maths in UTC to avoid DST drift) ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
export function isValidDateTime(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && isValidDate(s.slice(0, 10)) && !isNaN(Date.parse(s + 'Z'));
}
function fromUtc(dt: Date): string {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
export function addDays(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number);
  return fromUtc(new Date(Date.UTC(y, m - 1, d + n)));
}
export function addMonths(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const dim = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, dim))}`;
}
export function daysBetween(a: string, b: string): number {
  const p = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((p(b) - p(a)) / 86400000);
}
export function fmtDate(s: string): string {
  if (!isValidDate(s)) return s || '—';
  const [y, m, d] = s.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
export function fmtDateTime(s: string): string {
  if (!isValidDateTime(s)) return '—';
  return `${fmtDate(s.slice(0, 10))}, ${s.slice(11)}`;
}
export function fmtDelay(min: number | null): string {
  if (min === null) return 'Not recorded';
  if (min <= 0) return 'On time';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${pad(m)}m` : `${m}m`;
}
export function euro(n: number): string {
  return '€' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/* ---------- domain logic ---------- */
export function bandAmount(km: number, r: Rules): number {
  if (km < r.band1Max) return r.amount1;
  if (km <= r.band2Max) return r.amount2;
  return r.amount3;
}

export function assess(t: Trip, r: Rules, today: string): Assessment {
  let delayMinutes: number | null = null;
  if (isValidDateTime(t.scheduledArrival) && isValidDateTime(t.actualArrival)) {
    delayMinutes = Math.round((Date.parse(t.actualArrival + 'Z') - Date.parse(t.scheduledArrival + 'Z')) / 60000);
  }
  const amount = bandAmount(t.distanceKm, r);
  const deadline = isValidDate(t.date) ? addMonths(t.date, r.windowMonths) : today;
  const daysLeft = daysBetween(today, deadline);
  let verdict: Verdict;
  let reason: string;
  if (delayMinutes === null || delayMinutes < r.minDelayHours * 60) {
    verdict = 'short';
    reason =
      delayMinutes === null
        ? 'Delay too short: arrival times are not recorded'
        : `Delay too short: ${fmtDelay(delayMinutes)} is under the ${r.minDelayHours}h minimum`;
  } else if (r.extraordinary.includes(t.cause)) {
    verdict = 'extraordinary';
    reason = `Extraordinary cause: ${CAUSE_LABEL[t.cause].toLowerCase()} is not compensable`;
  } else {
    verdict = 'eligible';
    reason = `Eligible: ${fmtDelay(delayMinutes)} delay, cause ${CAUSE_LABEL[t.cause].toLowerCase()} is compensable`;
  }
  return { delayMinutes, verdict, reason, amount, deadline, daysLeft };
}

export function uid(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function shift(dt: string, minutes: number): string {
  return new Date(Date.parse(dt + 'Z') + minutes * 60000).toISOString().slice(0, 16);
}

export function seedState(today: string): State {
  const mk = (
    id: string, passenger: string, flight: string, ago: number, origin: string, destination: string,
    distanceKm: number, arrTime: string, delayMin: number, cause: Cause,
  ): Trip => {
    const date = addDays(today, -ago);
    const sched = `${date}T${arrTime}`;
    return { id, passenger, flight, date, origin, destination, distanceKm,
      scheduledArrival: sched, actualArrival: shift(sched, delayMin), cause };
  };
  const trips: Trip[] = [
    mk('t1', 'Maya Okafor', 'UA1523', 7, 'EWR', 'LAX', 3970, '18:40', 250, 'air traffic control'),
    mk('t2', 'Jonas Weber', 'DL2048', 7, 'LGA', 'MSP', 1690, '21:15', 216, 'air traffic control'),
    mk('t3', 'Priya Nair', 'BA0112', 40, 'JFK', 'LHR', 5540, '07:20', 360, 'technical'),
    mk('t4', 'Tomás Alvarez', 'DL2210', 95, 'LGA', 'SFO', 4150, '16:05', 210, 'crew'),
    mk('t5', 'Elena Rossi', 'AZ0611', 20, 'JFK', 'FCO', 6900, '09:50', 90, 'technical'),
    mk('t6', 'Sam Whitfield', 'UA0088', 3, 'EWR', 'ORD', 1160, '12:30', 240, 'crew'),
    mk('t7', 'Hana Lindqvist', 'LX0021', 710, 'PHL', 'ZRH', 6600, '08:45', 192, 'other'),
  ];
  const claims: Claim[] = [
    { id: 'c1', tripId: 't3', dateFiled: addDays(today, -32), amount: 600, status: 'open' },
    { id: 'c2', tripId: 't5', dateFiled: addDays(today, -14), amount: 600, status: 'rejected' },
    { id: 'c3', tripId: 't7', dateFiled: addDays(today, -60), amount: 600, status: 'open' },
  ];
  return { trips, claims, rules: { ...DEFAULT_RULES, extraordinary: [...DEFAULT_RULES.extraordinary] } };
}

export interface Toast {
  message: string;
  undo?: () => void;
}

@Injectable({ providedIn: 'root' })
export class Store {
  readonly today = todayIso();
  private readonly state = signal<State>(this.load());
  readonly trips = computed(() => this.state().trips);
  readonly claims = computed(() => this.state().claims);
  readonly rules = computed(() => this.state().rules);
  readonly toast = signal<Toast | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  readonly assessments = computed(() => {
    const r = this.rules();
    return new Map(this.trips().map((t) => [t.id, assess(t, r, this.today)] as const));
  });

  readonly unclaimed = computed(() => {
    const claimed = new Set(this.claims().map((c) => c.tripId));
    const a = this.assessments();
    let total = 0;
    let count = 0;
    for (const t of this.trips()) {
      const x = a.get(t.id);
      if (x && x.verdict === 'eligible' && !claimed.has(t.id)) {
        total += x.amount;
        count++;
      }
    }
    return { total, count };
  });

  private load(): State {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && Array.isArray(p.trips) && Array.isArray(p.claims) && p.rules) {
          return { trips: p.trips, claims: p.claims, rules: { ...DEFAULT_RULES, ...p.rules } };
        }
      }
    } catch {
      /* fall through to seed */
    }
    const s = seedState(this.today);
    this.persist(s);
    return s;
  }

  private persist(s: State) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable */
    }
  }

  private commit(s: State) {
    this.state.set(s);
    this.persist(s);
  }

  notify(message: string, undo?: () => void) {
    clearTimeout(this.toastTimer);
    this.toast.set({ message, undo });
    this.toastTimer = setTimeout(() => this.toast.set(null), 7000);
  }
  dismissToast() {
    clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  assess(t: Trip, r: Rules = this.rules()): Assessment {
    return assess(t, r, this.today);
  }
  trip(id: string | undefined): Trip | undefined {
    return this.trips().find((t) => t.id === id);
  }
  claimsFor(tripId: string): Claim[] {
    return this.claims().filter((c) => c.tripId === tripId);
  }

  saveTrip(t: Trip) {
    const s = this.state();
    const exists = s.trips.some((x) => x.id === t.id);
    this.commit({ ...s, trips: exists ? s.trips.map((x) => (x.id === t.id ? t : x)) : [...s.trips, t] });
    this.notify(exists ? `Trip ${t.flight} updated` : `Trip ${t.flight} added to the files`);
  }
  deleteTrip(id: string) {
    const before = this.state();
    const t = before.trips.find((x) => x.id === id);
    if (!t) return;
    this.commit({ ...before, trips: before.trips.filter((x) => x.id !== id), claims: before.claims.filter((c) => c.tripId !== id) });
    this.notify(`Trip ${t.flight} deleted`, () => this.commit(before));
  }
  saveClaim(c: Claim) {
    const s = this.state();
    const exists = s.claims.some((x) => x.id === c.id);
    this.commit({ ...s, claims: exists ? s.claims.map((x) => (x.id === c.id ? c : x)) : [...s.claims, c] });
    this.notify(exists ? 'Claim updated' : 'Claim filed');
  }
  setClaimStatus(id: string, status: ClaimStatus) {
    const s = this.state();
    this.commit({ ...s, claims: s.claims.map((c) => (c.id === id ? { ...c, status } : c)) });
  }
  deleteClaim(id: string) {
    const before = this.state();
    this.commit({ ...before, claims: before.claims.filter((c) => c.id !== id) });
    this.notify('Claim deleted', () => this.commit(before));
  }
  saveRules(r: Rules) {
    this.commit({ ...this.state(), rules: r });
    this.notify('Rules saved, every figure recalculated');
  }
  reset() {
    this.commit(seedState(this.today));
    this.notify('Data reset to the seed records');
  }
}
