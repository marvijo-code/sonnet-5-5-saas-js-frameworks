import { Component, computed, effect, inject, signal } from '@angular/core';
import { CAUSES, CAUSE_LABEL, Cause, Rules, Store, assess, euro, fmtDelay } from './store';

interface Draft {
  band1Max: string;
  band2Max: string;
  amount1: string;
  amount2: string;
  amount3: string;
  minDelayHours: string;
  windowMonths: string;
  extraordinary: Cause[];
}

@Component({
  selector: 'app-rules',
  template: `
    <div class="split">
      <section aria-labelledby="rules-h">
        <div class="section-head">
          <div>
            <p class="eyebrow">Compensation rules</p>
            <h1 id="rules-h">Rules</h1>
          </div>
        </div>
        <p class="muted lede">Change the rules and save. Eligibility, amounts, deadlines and the header total recalculate for every trip.</p>
        <form class="panel form" data-testid="rules-form" novalidate (submit)="save($event)" aria-label="Compensation rules">
          <h2 class="panel-title">Distance bands</h2>
          <div class="bands">
            <div class="band">
              <span class="band-name">Short haul · under {{ d().band1Max || '…' }} km</span>
              <div class="field" [class.invalid]="errs()['amount1']">
                <label for="r-a1">Amount (€)</label>
                <input id="r-a1" name="amount1" type="number" min="0" step="any" data-testid="rules-amount1" [value]="d().amount1" (input)="set('amount1', $event)"
                  [attr.aria-invalid]="errs()['amount1'] ? 'true' : null" [attr.aria-describedby]="errs()['amount1'] ? 'r-a1-err' : null" />
                @if (errs()['amount1']; as m) { <p class="err" role="alert" id="r-a1-err">{{ m }}</p> }
              </div>
            </div>
            <div class="band">
              <span class="band-name">Medium haul · {{ d().band1Max || '…' }} to {{ d().band2Max || '…' }} km</span>
              <div class="field" [class.invalid]="errs()['amount2']">
                <label for="r-a2">Amount (€)</label>
                <input id="r-a2" name="amount2" type="number" min="0" step="any" data-testid="rules-amount2" [value]="d().amount2" (input)="set('amount2', $event)"
                  [attr.aria-invalid]="errs()['amount2'] ? 'true' : null" [attr.aria-describedby]="errs()['amount2'] ? 'r-a2-err' : null" />
                @if (errs()['amount2']; as m) { <p class="err" role="alert" id="r-a2-err">{{ m }}</p> }
              </div>
            </div>
            <div class="band">
              <span class="band-name">Long haul · over {{ d().band2Max || '…' }} km</span>
              <div class="field" [class.invalid]="errs()['amount3']">
                <label for="r-a3">Amount (€)</label>
                <input id="r-a3" name="amount3" type="number" min="0" step="any" data-testid="rules-amount3" [value]="d().amount3" (input)="set('amount3', $event)"
                  [attr.aria-invalid]="errs()['amount3'] ? 'true' : null" [attr.aria-describedby]="errs()['amount3'] ? 'r-a3-err' : null" />
                @if (errs()['amount3']; as m) { <p class="err" role="alert" id="r-a3-err">{{ m }}</p> }
              </div>
            </div>
          </div>
          <div class="grid2">
            <div class="field" [class.invalid]="errs()['band1Max']">
              <label for="r-b1">Short band ends at (km)</label>
              <input id="r-b1" name="band1Max" type="number" min="0" step="any" data-testid="rules-band1" [value]="d().band1Max" (input)="set('band1Max', $event)"
                [attr.aria-invalid]="errs()['band1Max'] ? 'true' : null" [attr.aria-describedby]="errs()['band1Max'] ? 'r-b1-err' : null" />
              @if (errs()['band1Max']; as m) { <p class="err" role="alert" id="r-b1-err">{{ m }}</p> }
            </div>
            <div class="field" [class.invalid]="errs()['band2Max']">
              <label for="r-b2">Medium band ends at (km)</label>
              <input id="r-b2" name="band2Max" type="number" min="0" step="any" data-testid="rules-band2" [value]="d().band2Max" (input)="set('band2Max', $event)"
                [attr.aria-invalid]="errs()['band2Max'] ? 'true' : null" [attr.aria-describedby]="errs()['band2Max'] ? 'r-b2-err' : null" />
              @if (errs()['band2Max']; as m) { <p class="err" role="alert" id="r-b2-err">{{ m }}</p> }
            </div>
            <div class="field" [class.invalid]="errs()['minDelayHours']">
              <label for="r-min">Minimum arrival delay (hours)</label>
              <input id="r-min" name="minDelayHours" type="number" min="0" step="any" data-testid="rules-min-delay" [value]="d().minDelayHours" (input)="set('minDelayHours', $event)"
                [attr.aria-invalid]="errs()['minDelayHours'] ? 'true' : null" [attr.aria-describedby]="errs()['minDelayHours'] ? 'r-min-err' : null" />
              @if (errs()['minDelayHours']; as m) { <p class="err" role="alert" id="r-min-err">{{ m }}</p> }
            </div>
            <div class="field" [class.invalid]="errs()['windowMonths']">
              <label for="r-win">Claim window (months)</label>
              <input id="r-win" name="windowMonths" type="number" min="1" step="1" data-testid="rules-window" [value]="d().windowMonths" (input)="set('windowMonths', $event)"
                [attr.aria-invalid]="errs()['windowMonths'] ? 'true' : null" [attr.aria-describedby]="errs()['windowMonths'] ? 'r-win-err' : null" />
              @if (errs()['windowMonths']; as m) { <p class="err" role="alert" id="r-win-err">{{ m }}</p> }
            </div>
          </div>
          <fieldset class="causes">
            <legend>Causes treated as extraordinary</legend>
            <p class="hint">No compensation is owed when the delay is caused by one of these.</p>
            <div class="checks">
              @for (c of causes; track c) {
                <label class="check">
                  <input type="checkbox" [name]="'cause-' + c" [attr.data-testid]="'rules-cause-' + c" [checked]="d().extraordinary.includes(c)" (change)="toggle(c)" />
                  <span>{{ label[c] }}</span>
                </label>
              }
            </div>
          </fieldset>
          <div class="actions-row">
            <button type="submit" class="btn primary" data-testid="rules-save">Save rules</button>
            <button type="button" class="btn ghost" (click)="revert()">Revert edits</button>
          </div>
        </form>
      </section>

      <aside class="side-form">
        <div class="panel">
          <h2 class="panel-title">Preview on your trips</h2>
          <p class="hint">{{ preview().valid ? 'Uses the values in the form; applies when you save.' : 'Fix the highlighted fields to preview.' }}</p>
          <ul class="plain preview" data-testid="rules-preview">
            @for (p of preview().rows; track p.id) {
              <li>
                <span><strong class="mono">{{ p.flight }}</strong> {{ p.route }}</span>
                <span class="badge" [class]="'badge ' + p.verdict">{{ p.verdict === 'eligible' ? money(p.amount) : p.verdict === 'short' ? 'Too short' : 'Extraordinary' }}</span>
              </li>
            }
          </ul>
          <p class="sum">Eligible in total <strong>{{ money(preview().total) }}</strong></p>
        </div>
      </aside>
    </div>
  `,
})
export class RulesPage {
  private readonly store = inject(Store);
  readonly causes = CAUSES;
  readonly label = CAUSE_LABEL;
  readonly money = euro;
  readonly delay = fmtDelay;
  readonly d = signal<Draft>(this.fromRules(this.store.rules()));
  readonly submitted = signal(false);

  readonly errs = computed(() => (this.submitted() ? this.validate(this.d()) : {}));

  readonly preview = computed(() => {
    const d = this.d();
    const valid = Object.keys(this.validate(d)).length === 0;
    const rules = valid ? this.toRules(d) : this.store.rules();
    let total = 0;
    const rows = this.store.trips().map((t) => {
      const a = assess(t, rules, this.store.today);
      if (a.verdict === 'eligible') total += a.amount;
      return { id: t.id, flight: t.flight, route: `${t.origin}→${t.destination}`, verdict: a.verdict, amount: a.amount };
    });
    return { valid, rows, total };
  });

  constructor() {
    effect(() => {
      const r = this.store.rules();
      this.d.set(this.fromRules(r));
      this.submitted.set(false);
    });
  }

  private fromRules(r: Rules): Draft {
    return {
      band1Max: String(r.band1Max), band2Max: String(r.band2Max),
      amount1: String(r.amount1), amount2: String(r.amount2), amount3: String(r.amount3),
      minDelayHours: String(r.minDelayHours), windowMonths: String(r.windowMonths),
      extraordinary: [...r.extraordinary],
    };
  }
  private toRules(d: Draft): Rules {
    return {
      band1Max: Number(d.band1Max), band2Max: Number(d.band2Max),
      amount1: Number(d.amount1), amount2: Number(d.amount2), amount3: Number(d.amount3),
      minDelayHours: Number(d.minDelayHours), windowMonths: Number(d.windowMonths),
      extraordinary: [...d.extraordinary],
    };
  }
  private validate(d: Draft): Record<string, string> {
    const e: Record<string, string> = {};
    const pos = (k: keyof Draft, msg: string) => {
      const v = String(d[k]).trim();
      const n = Number(v);
      if (v === '' || !isFinite(n) || n <= 0) e[k] = msg;
    };
    pos('amount1', 'Amount must be greater than €0.');
    pos('amount2', 'Amount must be greater than €0.');
    pos('amount3', 'Amount must be greater than €0.');
    pos('band1Max', 'Enter a distance above 0 km.');
    pos('band2Max', 'Enter a distance above 0 km.');
    if (!e['band1Max'] && !e['band2Max'] && Number(d.band2Max) <= Number(d.band1Max)) {
      e['band2Max'] = 'Must be greater than the short band limit.';
    }
    pos('minDelayHours', 'Minimum delay must be greater than 0 hours.');
    pos('windowMonths', 'Claim window must be at least 1 month.');
    if (!e['windowMonths'] && !Number.isInteger(Number(d.windowMonths))) e['windowMonths'] = 'Use a whole number of months.';
    return e;
  }

  set(k: keyof Draft, ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.d.update((x) => ({ ...x, [k]: v }));
  }
  toggle(c: Cause) {
    this.d.update((x) => ({
      ...x,
      extraordinary: x.extraordinary.includes(c) ? x.extraordinary.filter((y) => y !== c) : [...x.extraordinary, c],
    }));
  }
  revert() {
    this.submitted.set(false);
    this.d.set(this.fromRules(this.store.rules()));
  }
  save(ev: Event) {
    ev.preventDefault();
    this.submitted.set(true);
    if (Object.keys(this.validate(this.d())).length) {
      queueMicrotask(() => document.querySelector<HTMLElement>('[data-testid="rules-form"] [aria-invalid="true"]')?.focus());
      return;
    }
    this.store.saveRules(this.toRules(this.d()));
    this.submitted.set(false);
  }
}
