import { Show } from 'solid-js'
import type { JSX } from 'solid-js'
import { TIER_LABEL, tierOf } from './model.ts'

export function Field(props: { id: string; label: string; error?: string; hint?: string; children: JSX.Element }) {
  return (
    <div class="field" classList={{ invalid: !!props.error }}>
      <label for={props.id}>{props.label}</label>
      {props.children}
      <Show when={props.hint && !props.error}>
        <p class="hint" id={`${props.id}-hint`}>{props.hint}</p>
      </Show>
      <Show when={props.error}>
        <p class="err" id={`${props.id}-err`} role="alert">
          <span aria-hidden="true">✕ </span>
          {props.error}
        </p>
      </Show>
    </div>
  )
}

export function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-err` : hint ? `${id}-hint` : undefined
}

export function Seal(props: { score: number; big?: boolean; testid?: boolean }) {
  const tier = () => tierOf(props.score)
  return (
    <div class={`seal tier-${tier()}`} classList={{ big: props.big }}>
      <span class="seal-num" data-testid={props.testid === false ? undefined : 'risk-score'}>{props.score}</span>
      <span class="seal-tier">{TIER_LABEL[tier()]}</span>
    </div>
  )
}

export function Gauge(props: { score: number }) {
  const tier = () => tierOf(props.score)
  return (
    <div class={`gauge tier-${tier()}`} role="img" aria-label={`Spread risk ${props.score} out of 100, ${TIER_LABEL[tier()]}`}>
      <div class="gauge-track">
        <div class="gauge-fill" style={{ width: `${props.score}%` }} />
        <span class="gauge-tick" style={{ left: '30%' }} />
        <span class="gauge-tick" style={{ left: '60%' }} />
      </div>
      <div class="gauge-scale" aria-hidden="true">
        <span style={{ left: '0%' }}>0</span>
        <span style={{ left: '30%' }}>30</span>
        <span style={{ left: '60%' }}>60</span>
        <span style={{ left: '100%' }}>100</span>
      </div>
    </div>
  )
}

export function Logo() {
  return (
    <svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 30 C12 34 8 42 12 45 C20 45 25 39 24 30Z" fill="#c8402b" />
      <path d="M24 30 C36 34 40 42 36 45 C28 45 23 39 24 30Z" fill="#a83322" />
      <path d="M24 27 C9 24 2 12 6 5 C17 4 27 13 24 27Z" fill="#d8c6a0" stroke="#3a2f1e" stroke-width="1.2" />
      <path d="M24 27 C39 24 46 12 42 5 C31 4 21 13 24 27Z" fill="#cbb78d" stroke="#3a2f1e" stroke-width="1.2" />
      <g fill="#2a2216">
        <circle cx="13" cy="12" r="1.5" />
        <circle cx="18" cy="17" r="1.3" />
        <circle cx="11" cy="18" r="1.1" />
        <circle cx="35" cy="12" r="1.5" />
        <circle cx="30" cy="17" r="1.3" />
        <circle cx="37" cy="18" r="1.1" />
      </g>
      <path d="M24 14 V34" stroke="#2a2216" stroke-width="2.4" stroke-linecap="round" />
    </svg>
  )
}
