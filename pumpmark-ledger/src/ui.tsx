import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  children: (p: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined }) => ReactNode
}

export function Field({ id, label, error, hint, children }: FieldProps) {
  const describedBy = [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="error" id={`${id}-err`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className={`stat${tone ? ` ${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}

export function BudgetMeter({ used, label }: { used: number; label: string }) {
  const pct = Math.min(used, 1.25) / 1.25
  return (
    <div className="meter" role="img" aria-label={label}>
      <span className={`meter-fill${used > 1 ? ' over' : used > 0.85 ? ' warn' : ''}`} style={{ width: `${pct * 100}%` }} />
      <span className="meter-limit" style={{ left: `${(1 / 1.25) * 100}%` }} />
    </div>
  )
}
