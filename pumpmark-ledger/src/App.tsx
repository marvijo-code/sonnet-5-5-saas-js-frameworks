import { BudgetPage } from './Budget.tsx'
import { FillupsPage } from './Fillups.tsx'
import { forecastVan, fmtEur } from './lib.ts'
import { StoreProvider, useStore } from './store.tsx'
import { useHash } from './ui.tsx'
import { VanDetail } from './VanDetail.tsx'
import { VansPage } from './Vans.tsx'

const NAV = [
  { href: '#/vans', label: 'Vans', match: '/vans' },
  { href: '#/fillups', label: 'Fill-ups', match: '/fillups' },
  { href: '#/budget', label: 'Budget', match: '/budget' },
]

function Header({ path }: { path: string }) {
  const { state, now, whatIf, reset } = useStore()
  const wi = Number(whatIf) > 0 ? Number(whatIf) : null
  const rows = state.vans.map((v) => forecastVan(v, state.fillups, now, wi))
  const over = rows.filter((r) => r.over).length
  const spend = rows.reduce((s, r) => s + r.spent, 0)
  const month = now.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

  return (
    <header className="top">
      <div className="top-bar">
        <a className="brand" href="#/vans" aria-label="Pumpmark Ledger home">
          <svg viewBox="0 0 32 32" aria-hidden="true" width="30" height="30">
            <rect width="32" height="32" rx="7" fill="#ffb320" />
            <path d="M9 25V9.5A2.5 2.5 0 0 1 11.5 7h6A2.5 2.5 0 0 1 20 9.5V25M7 25h15" fill="none" stroke="#15140f" strokeWidth="2.4" strokeLinecap="round" />
            <rect x="12" y="10" width="5" height="4" rx="1" fill="#15140f" />
            <path d="M20 13l3 2.5V22a1.5 1.5 0 0 0 3 0v-7l-2.5-2.5" fill="none" stroke="#15140f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            Pumpmark <em>Ledger</em>
          </span>
        </a>
        <button className="btn small" data-testid="reset-data" onClick={reset}>
          Reset data
        </button>
      </div>
      <div className="pump" data-testid="fleet-summary" role="group" aria-label="Fleet summary">
        <div className="pump-cell">
          <span className="pump-label">Fleet spend · {month}</span>
          <span className="pump-digits" data-testid="fleet-spend">
            {fmtEur(spend)}
          </span>
        </div>
        <div className="pump-cell">
          <span className="pump-label">Forecast over budget{wi ? ' · what-if' : ''}</span>
          <span className={`pump-digits${over ? ' alert' : ''}`} data-testid="over-count">
            {over}
            <small> of {state.vans.length} vans</small>
          </span>
        </div>
      </div>
      <nav aria-label="Main">
        {NAV.map((n) => (
          <a key={n.href} href={n.href} aria-current={path.startsWith(n.match) ? 'page' : undefined}>
            {n.label}
          </a>
        ))}
      </nav>
    </header>
  )
}

function Toast() {
  const { toast, undo, dismissToast } = useStore()
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.id}>
          <span>{toast.message}</span>
          <button className="btn small" onClick={undo}>
            Undo
          </button>
          <button className="btn small ghost" onClick={dismissToast} aria-label="Dismiss message">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

function Screen() {
  const hash = useHash()
  const path = hash.replace(/^#/, '').split('?')[0] || '/'
  const parts = path.split('/').filter(Boolean)
  let page
  if (parts[0] === 'vans' && parts[1]) page = <VanDetail id={decodeURIComponent(parts[1])} />
  else if (parts[0] === 'fillups') page = <FillupsPage />
  else if (parts[0] === 'budget') page = <BudgetPage />
  else page = <VansPage />
  return (
    <>
      <Header path={parts.length ? `/${parts[0]}` : '/vans'} />
      <main id="main" key={path}>
        {page}
      </main>
    </>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Screen />
      <Toast />
      <footer className="foot">
        <p>All data stays in this browser. EU diesel averaged a record €2.23 per litre in September 2026.</p>
      </footer>
    </StoreProvider>
  )
}
