import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { byDateDesc, fmtDate, fmtEur, fmtKm, fmtL, fmtPrice, todayIso, uid, validateFillup } from './lib.ts'
import type { Errors, Fillup } from './lib.ts'
import { useStore } from './store.tsx'
import { Field } from './ui.tsx'

function FillupForm({
  editing,
  fixedVanId,
  onDone,
}: {
  editing: Fillup | null
  fixedVanId?: string
  onDone: () => void
}) {
  const { state, update } = useStore()
  const latestPrice = [...state.prices].sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.price
  const [f, setF] = useState({
    vanId: editing?.vanId ?? fixedVanId ?? '',
    date: editing?.date ?? todayIso(),
    litres: editing ? String(editing.litres) : '',
    price: editing ? String(editing.price) : latestPrice ? String(latestPrice) : '',
    odometer: editing ? String(editing.odometer) : '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const first = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (editing) first.current?.focus()
  }, [editing])

  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...f, [k]: ev.target.value }
    setF(next)
    if (submitted) setErrors(validateFillup(next, state.fillups, editing?.id ?? null).errors)
  }

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    setSubmitted(true)
    const r = validateFillup(f, state.fillups, editing?.id ?? null)
    setErrors(r.errors)
    if (!r.value) return
    const fu: Fillup = { id: editing?.id ?? uid(), ...r.value }
    update((s) => ({
      ...s,
      fillups: editing ? s.fillups.map((x) => (x.id === fu.id ? fu : x)) : [...s.fillups, fu],
    }))
    onDone()
  }

  const litres = Number(f.litres)
  const price = Number(f.price)
  const total = litres > 0 && price > 0 ? litres * price : null
  const last = state.fillups
    .filter((x) => x.vanId === f.vanId && x.id !== editing?.id)
    .reduce<number | null>((m, x) => (m === null || x.odometer > m ? x.odometer : m), null)

  return (
    <form className="slip" data-testid="fillup-form" onSubmit={submit} noValidate aria-label={editing ? 'Edit fill-up' : 'Log fill-up'}>
      <p className="slip-kicker">{editing ? 'Amend receipt' : 'Pump receipt'}</p>
      <h2>{editing ? 'Edit fill-up' : 'Log a fill-up'}</h2>
      <Field id="fu-van" label="Van" error={errors.vanId}>
        {(p) => (
          <select {...p} ref={first} name="vanId" value={f.vanId} onChange={set('vanId')}>
            <option value="">Select a van…</option>
            {state.vans.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration} — {v.driver}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field id="fu-date" label="Date" error={errors.date}>
        {(p) => <input {...p} name="date" type="date" max={todayIso()} value={f.date} onChange={set('date')} />}
      </Field>
      <div className="two">
        <Field id="fu-litres" label="Litres" error={errors.litres}>
          {(p) => <input {...p} name="litres" type="number" step="any" inputMode="decimal" value={f.litres} onChange={set('litres')} />}
        </Field>
        <Field id="fu-price" label="Price per litre (€)" error={errors.price}>
          {(p) => <input {...p} name="price" type="number" step="any" inputMode="decimal" value={f.price} onChange={set('price')} />}
        </Field>
      </div>
      <Field
        id="fu-odo"
        label="Odometer (km)"
        error={errors.odometer}
        hint={last !== null ? `Latest reading on file: ${fmtKm(last)}` : undefined}
      >
        {(p) => <input {...p} name="odometer" type="number" step="any" inputMode="decimal" value={f.odometer} onChange={set('odometer')} />}
      </Field>
      <p className="slip-total" aria-live="polite">
        <span>Total</span>
        <strong>{total !== null ? fmtEur(total) : '—'}</strong>
      </p>
      <div className="actions">
        <button type="submit" className="btn ink" data-testid="fillup-save">
          {editing ? 'Save changes' : 'Add fill-up'}
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

export function FillupList({ vanId, onEdit }: { vanId?: string; onEdit: (f: Fillup) => void }) {
  const { state, update } = useStore()
  const list = state.fillups.filter((f) => !vanId || f.vanId === vanId).sort(byDateDesc)
  const reg = (id: string) => state.vans.find((v) => v.id === id)?.registration ?? 'Deleted van'

  const economy = (f: Fillup) => {
    const prev = state.fillups
      .filter((x) => x.vanId === f.vanId && x.odometer < f.odometer)
      .sort((a, b) => b.odometer - a.odometer)[0]
    return prev ? (f.litres / (f.odometer - prev.odometer)) * 100 : null
  }

  if (!list.length) return <p className="empty" data-testid="fillup-list">No fill-ups logged yet.</p>
  return (
    <ul className="rows" data-testid="fillup-list">
      {list.map((f) => {
        const e = economy(f)
        return (
          <li className="row fillup-row" data-testid="fillup-row" key={f.id}>
            <div className="row-main">
              <h3>
                <span className="reg">{reg(f.vanId)}</span>
              </h3>
              <p className="muted">{fmtDate(f.date)}</p>
            </div>
            <dl className="kv">
              <div>
                <dt>Fuel</dt>
                <dd>{fmtL(f.litres)}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{fmtPrice(f.price)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{fmtEur(f.litres * f.price)}</dd>
              </div>
            </dl>
            <p className="odo muted">
              {fmtKm(f.odometer)}
              {e !== null && <> · {e.toFixed(1)} L/100 km on this leg</>}
            </p>
            <div className="row-actions">
              <button className="btn small" data-testid="fillup-edit" aria-label={`Edit fill-up of ${reg(f.vanId)} on ${fmtDate(f.date)}`} onClick={() => onEdit(f)}>
                Edit
              </button>
              <button
                className="btn small danger"
                data-testid="fillup-delete"
                aria-label={`Delete fill-up of ${reg(f.vanId)} on ${fmtDate(f.date)}`}
                onClick={() =>
                  update((s) => ({ ...s, fillups: s.fillups.filter((x) => x.id !== f.id) }), 'Fill-up deleted')
                }
              >
                Delete
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function FillupsPage() {
  const { state } = useStore()
  const [editing, setEditing] = useState<Fillup | null>(null)
  const [filter, setFilter] = useState('')
  const formRef = useRef<HTMLDivElement>(null)
  const shown = state.fillups.filter((f) => !filter || f.vanId === filter)
  const litres = shown.reduce((s, f) => s + f.litres, 0)
  const spend = shown.reduce((s, f) => s + f.litres * f.price, 0)
  const current = editing && state.fillups.find((f) => f.id === editing.id)

  return (
    <div className="split">
      <section aria-labelledby="fu-h">
        <div className="section-head">
          <h1 id="fu-h">Fill-up log</h1>
          <p className="muted">
            {shown.length} entries · {fmtL(litres)} · {fmtEur(spend)}
          </p>
        </div>
        <div className="toolbar">
          <label htmlFor="fu-filter">Show</label>
          <select id="fu-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All vans</option>
            {state.vans.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration}
              </option>
            ))}
          </select>
        </div>
        <FillupList
          vanId={filter || undefined}
          onEdit={(f) => {
            setEditing(f)
            formRef.current?.scrollIntoView({ block: 'start' })
          }}
        />
      </section>
      <aside ref={formRef} className="side">
        <FillupForm key={current?.id ?? 'new'} editing={current ?? null} onDone={() => setEditing(null)} />
      </aside>
    </div>
  )
}

export { FillupForm }
