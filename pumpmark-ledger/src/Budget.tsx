import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  fmtDate,
  fmtEur,
  fmtPrice,
  forecastVan,
  parsePositive,
  todayIso,
  uid,
} from './lib.ts'
import type { Errors, PricePoint } from './lib.ts'
import { useStore } from './store.tsx'
import { Field } from './ui.tsx'

function PriceForm({ editing, onDone }: { editing: PricePoint | null; onDone: () => void }) {
  const { update } = useStore()
  const [f, setF] = useState({ date: editing?.date ?? todayIso(), price: editing ? String(editing.price) : '' })
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) first.current?.focus()
  }, [editing])

  const validate = (v: typeof f) => {
    const e: Errors = {}
    if (!v.date) e.date = 'Date is required'
    else if (v.date > todayIso()) e.date = 'Date cannot be in the future'
    const p = parsePositive(v.price, 'Price')
    if (p.error) e.price = p.error
    return { e, price: p.value }
  }
  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...f, [k]: ev.target.value }
    setF(next)
    if (submitted) setErrors(validate(next).e)
  }
  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    setSubmitted(true)
    const r = validate(f)
    setErrors(r.e)
    if (Object.keys(r.e).length) return
    const pt: PricePoint = { id: editing?.id ?? uid(), date: f.date, price: r.price! }
    update((s) => ({
      ...s,
      prices: editing ? s.prices.map((x) => (x.id === pt.id ? pt : x)) : [...s.prices, pt],
    }))
    onDone()
  }
  return (
    <form className="slip" data-testid="price-form" onSubmit={submit} noValidate aria-label={editing ? 'Edit price reading' : 'Add price reading'}>
      <p className="slip-kicker">Price watch</p>
      <h2>{editing ? 'Edit reading' : 'Add a reading'}</h2>
      <Field id="pw-date" label="Date" error={errors.date}>
        {(p) => <input {...p} ref={first} type="date" max={todayIso()} value={f.date} onChange={set('date')} />}
      </Field>
      <Field id="pw-price" label="EU average diesel (€ per litre)" error={errors.price}>
        {(p) => <input {...p} type="number" step="any" inputMode="decimal" value={f.price} onChange={set('price')} />}
      </Field>
      <div className="actions">
        <button type="submit" className="btn ink" data-testid="price-save">
          {editing ? 'Save changes' : 'Add reading'}
        </button>
        {editing && (
          <button type="button" className="btn ghost-ink" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function Sparkline({ points }: { points: PricePoint[] }) {
  if (points.length < 2) return null
  const W = 480
  const H = 130
  const pad = 14
  const lo = Math.min(...points.map((p) => p.price)) - 0.03
  const hi = Math.max(...points.map((p) => p.price)) + 0.03
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Diesel price trend, latest ${fmtPrice(last.price)} per litre`}>
      <path d={`${d} L${x(points.length - 1)},${H - pad} L${x(0)},${H - pad} Z`} className="spark-area" />
      <path d={d} className="spark-line" />
      {points.map((p, i) => (
        <circle key={p.id} cx={x(i)} cy={y(p.price)} r={i === points.length - 1 ? 5 : 3} className="spark-dot" />
      ))}
      <text x={x(points.length - 1) - 8} y={y(last.price) - 10} textAnchor="end" className="spark-label">
        {fmtPrice(last.price)}
      </text>
    </svg>
  )
}

export function BudgetPage() {
  const { state, now, whatIf, setWhatIf, update } = useStore()
  const [editing, setEditing] = useState<PricePoint | null>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const parsed = whatIf.trim() === '' ? null : parsePositive(whatIf, 'What-if price')
  const wi = parsed?.value ?? null
  const sortedPrices = [...state.prices].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const latest = sortedPrices[sortedPrices.length - 1]
  const current = editing && state.prices.find((p) => p.id === editing.id)

  const rows = state.vans.map((v) => ({ van: v, fc: forecastVan(v, state.fillups, now, wi) }))
  const totalForecast = rows.reduce((s, r) => s + r.fc.forecast, 0)
  const totalBudget = state.vans.reduce((s, v) => s + v.budget, 0)
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="section-head">
        <h1>Month-end forecast</h1>
        <p className="muted">
          {monthName} · day {now.getDate()} of {rows[0]?.fc.dim ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}
        </p>
      </div>

      <div className="whatif">
        <div className="whatif-in">
          <label htmlFor="whatif-price">What-if price per litre (€)</label>
          <div className="whatif-row">
            <input
              id="whatif-price"
              data-testid="whatif-price"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder={latest ? String(latest.price) : '2.23'}
              value={whatIf}
              onChange={(e) => setWhatIf(e.target.value)}
              aria-invalid={!!parsed?.error}
              aria-describedby="whatif-msg"
            />
            {latest && (
              <button type="button" className="btn small" onClick={() => setWhatIf(String(latest.price))}>
                Use {fmtPrice(latest.price)}
              </button>
            )}
            {whatIf !== '' && (
              <button type="button" className="btn small" onClick={() => setWhatIf('')}>
                Clear
              </button>
            )}
          </div>
        </div>
        <p id="whatif-msg" className={parsed?.error ? 'error' : 'muted'} role={parsed?.error ? 'alert' : undefined}>
          {parsed?.error
            ? `${parsed.error}. Showing the plain run-rate forecast.`
            : wi
              ? `Remaining ${rows[0]?.fc.remaining ?? 0} days repriced at ${fmtPrice(wi)} per litre.`
              : 'Run-rate forecast: spend so far ÷ days elapsed × days in month. Enter a price to reprice the remaining days.'}
        </p>
      </div>

      <ul className="rows forecast" data-testid="budget-forecast">
        {rows.length === 0 && <li className="empty">Add a van to see a forecast.</li>}
        {rows.map(({ van, fc }) => {
          const scale = Math.max(fc.forecast, van.budget, fc.spent) * 1.08 || 1
          return (
            <li className={`row forecast-row${fc.over ? ' is-over' : ''}`} data-testid="forecast-row" key={van.id}>
              <div className="row-main">
                <h3>
                  <a className="reg" href={`#/vans/${van.id}`}>
                    {van.registration}
                  </a>
                  <span className={`badge ${fc.over ? 'over' : 'ok'}`} data-testid={fc.over ? 'over-budget-flag' : undefined}>
                    {fc.over ? 'Over budget' : 'On track'}
                  </span>
                </h3>
                <p className="muted">{van.driver}</p>
              </div>
              <dl className="kv">
                <div>
                  <dt>So far</dt>
                  <dd>{fmtEur(fc.spent)}</dd>
                </div>
                <div>
                  <dt>Forecast</dt>
                  <dd className={fc.over ? 'neg' : ''}>{fmtEur(fc.forecast)}</dd>
                </div>
                <div>
                  <dt>Budget</dt>
                  <dd>{fmtEur(van.budget)}</dd>
                </div>
              </dl>
              <div
                className="track"
                role="img"
                aria-label={`Spent ${fmtEur(fc.spent)}, forecast ${fmtEur(fc.forecast)}, budget ${fmtEur(van.budget)}`}
              >
                <span className="track-proj" style={{ width: `${(fc.forecast / scale) * 100}%` }} />
                <span className="track-spent" style={{ width: `${(fc.spent / scale) * 100}%` }} />
                <span className="track-budget" style={{ left: `${(van.budget / scale) * 100}%` }} />
              </div>
              <p className={`delta ${fc.over ? 'neg' : 'pos'}`}>
                {fc.over
                  ? `${fmtEur(fc.forecast - van.budget)} over budget at month end`
                  : `${fmtEur(van.budget - fc.forecast)} headroom at month end`}
              </p>
            </li>
          )
        })}
      </ul>
      <p className="fleet-line">
        Fleet forecast <strong>{fmtEur(totalForecast)}</strong> against <strong>{fmtEur(totalBudget)}</strong> budgeted.
      </p>

      <div className="split lower">
        <section aria-labelledby="pw-h">
          <div className="section-head">
            <h2 id="pw-h">Price watch</h2>
            <p className="muted">EU average diesel, € per litre</p>
          </div>
          <Sparkline points={sortedPrices} />
          <ul className="rows" data-testid="price-list">
            {[...sortedPrices].reverse().map((p) => (
              <li className="row price-row" data-testid="price-row" key={p.id}>
                <div className="row-main">
                  <h3 className="reg">{fmtPrice(p.price)}</h3>
                  <p className="muted">{fmtDate(p.date)}</p>
                </div>
                <div className="row-actions">
                  <button
                    className="btn small"
                    aria-label={`Edit price reading of ${fmtDate(p.date)}`}
                    onClick={() => {
                      setEditing(p)
                      formRef.current?.scrollIntoView({ block: 'start' })
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn small danger"
                    data-testid="price-delete"
                    aria-label={`Delete price reading of ${fmtDate(p.date)}`}
                    onClick={() =>
                      update((s) => ({ ...s, prices: s.prices.filter((x) => x.id !== p.id) }), 'Price reading deleted')
                    }
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <aside ref={formRef} className="side">
          <PriceForm key={current?.id ?? 'new'} editing={current ?? null} onDone={() => setEditing(null)} />
        </aside>
      </div>
    </div>
  )
}
