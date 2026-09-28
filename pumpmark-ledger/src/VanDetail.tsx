import { useRef, useState } from 'react'
import { FillupForm, FillupList } from './Fillups.tsx'
import { fmtEur, fmtKm, fmtPct, forecastVan, vanStats } from './lib.ts'
import type { Fillup } from './lib.ts'
import { useStore } from './store.tsx'
import { BudgetMeter, Stat } from './ui.tsx'
import { VanForm, useDeleteVan } from './Vans.tsx'

export function VanDetail({ id }: { id: string }) {
  const { state, now, whatIf } = useStore()
  const [editingFu, setEditingFu] = useState<Fillup | null>(null)
  const [editingVan, setEditingVan] = useState(false)
  const deleteVan = useDeleteVan()
  const formRef = useRef<HTMLDivElement>(null)
  const van = state.vans.find((v) => v.id === id)

  if (!van)
    return (
      <section>
        <a className="back" href="#/vans">
          ← All vans
        </a>
        <h1>Van not found</h1>
        <p className="empty">This van was deleted or never existed.</p>
      </section>
    )

  const st = vanStats(van, state.fillups, now)
  const fc = forecastVan(van, state.fillups, now, Number(whatIf) > 0 ? Number(whatIf) : null)
  const fu = editingFu && state.fillups.find((f) => f.id === editingFu.id)

  return (
    <div>
      <a className="back" href="#/vans">
        ← All vans
      </a>
      <div className="section-head detail-head">
        <div>
          <h1 className="reg-title">{van.registration}</h1>
          <p className="muted">
            {van.driver} · {van.economy} L/100 km · budget {fmtEur(van.budget)} / month
          </p>
        </div>
        <div className="row-actions">
          <button className="btn small" onClick={() => { setEditingVan(true); formRef.current?.scrollIntoView({ block: 'start' }) }}>
            Edit van
          </button>
          <button
            className="btn small danger"
            data-testid="van-delete"
            onClick={() => {
              deleteVan(van)
              window.location.hash = '#/vans'
            }}
          >
            Delete van
          </button>
        </div>
      </div>

      <div className="stats" data-testid="van-stats">
        <Stat label="Spend this month" value={fmtEur(st.monthSpend)} sub={`${st.monthLitres.toFixed(1)} L filled`} />
        <Stat
          label="Cost per km"
          value={st.costPerKm !== null ? `${fmtEur(st.costPerKm)}` : '—'}
          sub={st.costPerKm !== null ? `${fmtEur(st.totalSpend)} over ${fmtKm(st.kmSpan)}` : 'Needs two odometer readings'}
        />
        <Stat
          label="Budget used"
          value={fmtPct(st.budgetUsed)}
          tone={st.budgetUsed > 1 ? 'over' : ''}
          sub={`of ${fmtEur(van.budget)}`}
        />
        <Stat
          label="Month-end forecast"
          value={fmtEur(fc.forecast)}
          tone={fc.over ? 'over' : 'ok'}
          sub={fc.over ? `Over by ${fmtEur(fc.forecast - van.budget)}` : 'Within budget'}
        />
      </div>
      <BudgetMeter used={st.budgetUsed} label={`${fmtPct(st.budgetUsed)} of monthly budget used`} />

      <div className="split lower">
        <section aria-labelledby="vd-fu">
          <div className="section-head">
            <h2 id="vd-fu">Fill-ups</h2>
            <p className="muted">{st.count} on record</p>
          </div>
          <FillupList
            vanId={van.id}
            onEdit={(f) => {
              setEditingFu(f)
              setEditingVan(false)
              formRef.current?.scrollIntoView({ block: 'start' })
            }}
          />
        </section>
        <aside ref={formRef} className="side">
          {editingVan ? (
            <VanForm key="van" editing={van} onDone={() => setEditingVan(false)} />
          ) : (
            <FillupForm key={fu?.id ?? 'new'} editing={fu ?? null} fixedVanId={van.id} onDone={() => setEditingFu(null)} />
          )}
        </aside>
      </div>
    </div>
  )
}
