import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { fmtEur, fmtPct, forecastVan, parsePositive, uid, vanStats } from './lib.ts'
import type { Errors, Van } from './lib.ts'
import { useStore } from './store.tsx'
import { BudgetMeter, Field } from './ui.tsx'

export function useDeleteVan() {
  const { update } = useStore()
  return (van: Van) =>
    update(
      (s) => ({
        ...s,
        vans: s.vans.filter((v) => v.id !== van.id),
        fillups: s.fillups.filter((f) => f.vanId !== van.id),
      }),
      `Deleted ${van.registration} and its fill-ups`,
    )
}

export function VanForm({ editing, onDone }: { editing: Van | null; onDone: () => void }) {
  const { state, update } = useStore()
  const [f, setF] = useState({
    registration: editing?.registration ?? '',
    driver: editing?.driver ?? '',
    economy: editing ? String(editing.economy) : '',
    budget: editing ? String(editing.budget) : '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const first = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) first.current?.focus()
  }, [editing])

  const validate = (v: typeof f) => {
    const e: Errors = {}
    const reg = v.registration.trim()
    if (!reg) e.registration = 'Registration is required'
    else if (
      state.vans.some((x) => x.id !== editing?.id && x.registration.trim().toLowerCase() === reg.toLowerCase())
    )
      e.registration = 'Another van already uses this registration'
    if (!v.driver.trim()) e.driver = 'Driver name is required'
    const ec = parsePositive(v.economy, 'Fuel economy')
    if (ec.error) e.economy = ec.error
    const bu = parsePositive(v.budget, 'Monthly budget')
    if (bu.error) e.budget = bu.error
    return { e, economy: ec.value, budget: bu.value }
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
    const van: Van = {
      id: editing?.id ?? uid(),
      registration: f.registration.trim(),
      driver: f.driver.trim(),
      economy: r.economy!,
      budget: r.budget!,
    }
    update((s) => ({
      ...s,
      vans: editing ? s.vans.map((v) => (v.id === van.id ? van : v)) : [...s.vans, van],
    }))
    onDone()
  }

  return (
    <form className="slip" data-testid="van-form" onSubmit={submit} noValidate aria-label={editing ? 'Edit van' : 'Add van'}>
      <p className="slip-kicker">{editing ? 'Amend entry' : 'New entry'}</p>
      <h2>{editing ? `Edit ${editing.registration}` : 'Add a van'}</h2>
      <Field id="van-registration" label="Registration" error={errors.registration}>
        {(p) => (
          <input {...p} ref={first} name="registration" value={f.registration} onChange={set('registration')} autoComplete="off" />
        )}
      </Field>
      <Field id="van-driver" label="Driver name" error={errors.driver}>
        {(p) => <input {...p} name="driver" value={f.driver} onChange={set('driver')} autoComplete="off" />}
      </Field>
      <div className="two">
        <Field id="van-economy" label="Fuel economy (L/100 km)" error={errors.economy}>
          {(p) => (
            <input {...p} name="economy" type="number" step="any" inputMode="decimal" value={f.economy} onChange={set('economy')} />
          )}
        </Field>
        <Field id="van-budget" label="Monthly budget (€)" error={errors.budget}>
          {(p) => (
            <input {...p} name="budget" type="number" step="any" inputMode="decimal" value={f.budget} onChange={set('budget')} />
          )}
        </Field>
      </div>
      <div className="actions">
        <button type="submit" className="btn ink" data-testid="van-save">
          {editing ? 'Save changes' : 'Add van'}
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

export function VansPage() {
  const { state, now, whatIf } = useStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const deleteVan = useDeleteVan()
  const editing = state.vans.find((v) => v.id === editingId) ?? null
  const formRef = useRef<HTMLDivElement>(null)
  const wi = Number(whatIf) > 0 ? Number(whatIf) : null

  return (
    <div className="split">
      <section aria-labelledby="vans-h">
        <div className="section-head">
          <h1 id="vans-h">Vans</h1>
          <p className="muted">{state.vans.length} on the books</p>
        </div>
        {state.vans.length === 0 && <p className="empty">No vans yet. Add the first one with the slip.</p>}
        <ul className="rows" data-testid="van-list">
          {state.vans.map((v) => {
            const st = vanStats(v, state.fillups, now)
            const fc = forecastVan(v, state.fillups, now, wi)
            return (
              <li className="row van-row" data-testid="van-row" key={v.id}>
                <div className="row-main">
                  <h3>
                    <a href={`#/vans/${v.id}`} className="reg">
                      {v.registration}
                    </a>
                    {fc.over && <span className="badge over">Over budget</span>}
                  </h3>
                  <p className="muted">
                    {v.driver} · {v.economy} L/100 km
                  </p>
                </div>
                <dl className="kv">
                  <div>
                    <dt>This month</dt>
                    <dd>{fmtEur(st.monthSpend)}</dd>
                  </div>
                  <div>
                    <dt>Budget</dt>
                    <dd>{fmtEur(v.budget)}</dd>
                  </div>
                  <div>
                    <dt>Used</dt>
                    <dd>{fmtPct(st.budgetUsed)}</dd>
                  </div>
                </dl>
                <BudgetMeter used={st.budgetUsed} label={`${fmtPct(st.budgetUsed)} of monthly budget used`} />
                <div className="row-actions">
                  <button
                    className="btn small"
                    aria-label={`Edit ${v.registration}`}
                    onClick={() => {
                      setEditingId(v.id)
                      formRef.current?.scrollIntoView({ block: 'start' })
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn small danger"
                    data-testid="van-delete"
                    aria-label={`Delete ${v.registration}`}
                    onClick={() => {
                      if (editingId === v.id) setEditingId(null)
                      deleteVan(v)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
      <aside ref={formRef} className="side">
        <VanForm key={editing?.id ?? 'new'} editing={editing} onDone={() => setEditingId(null)} />
      </aside>
    </div>
  )
}
