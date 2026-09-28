import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Claim, ClaimStatus, STATUSES, Store, euro, fmtDate, isValidDate, uid } from './store';

interface Draft {
  tripId: string;
  dateFiled: string;
  amount: string;
  status: string;
}

type Filter = 'open' | 'all' | 'paid' | 'rejected';

@Component({
  selector: 'app-claims',
  imports: [RouterLink],
  template: `
    <div class="split">
      <section aria-labelledby="claims-h">
        <div class="section-head">
          <div>
            <p class="eyebrow">Claim tracker</p>
            <h1 id="claims-h">Claims</h1>
          </div>
          <div class="tabs" role="group" aria-label="Filter claims by status">
            @for (f of filters; track f) {
              <button type="button" class="chip" [class.on]="filter() === f" [attr.aria-pressed]="filter() === f" (click)="filter.set(f)">{{ f }}</button>
            }
          </div>
        </div>
        <p class="muted lede">
          {{ filter() === 'open' ? 'Open claims, most urgent deadline first. Under 30 days left is flagged.' : 'Sorted by claim deadline.' }}
        </p>
        @if (rows().length) {
          <ul class="tickets" data-testid="claim-list">
            @for (r of rows(); track r.claim.id) {
              <li class="ticket-row claim" data-testid="claim-row" [class.flagged]="r.flag">
                <div class="stub">
                  @if (r.trip) {
                    <a class="flightno" [routerLink]="['/trips', r.trip.id]" [attr.aria-label]="'Open trip ' + r.trip.flight">{{ r.trip.flight }}</a>
                  } @else {
                    <span class="flightno">—</span>
                  }
                  <span class="stub-date">{{ money(r.claim.amount) }}</span>
                </div>
                <div class="ticket-main">
                  <p class="pax strong">{{ r.trip?.passenger ?? 'Unknown trip' }}</p>
                  <p class="pax">Filed {{ fmt(r.claim.dateFiled) }}
                    @if (r.a) { · Deadline {{ fmt(r.a.deadline) }} }</p>
                </div>
                <div class="ticket-side">
                  @if (r.a) {
                    <span class="days" [class.urgent]="r.flag" data-testid="claim-days">
                      {{ r.a.daysLeft < 0 ? 'Expired ' + -r.a.daysLeft + 'd ago' : r.a.daysLeft + ' days left' }}
                    </span>
                  }
                  @if (r.flag && r.claim.status === 'open') {
                    <span class="badge flag" data-testid="deadline-flag">Under 30 days</span>
                  }
                  <label class="inline-select">
                    <span class="sr">Status of claim for {{ r.trip?.flight }}</span>
                    <select [value]="r.claim.status" (change)="setStatus(r.claim, $any($event.target).value)">
                      @for (s of statuses; track s) {
                        <option [value]="s" [selected]="s === r.claim.status">{{ s }}</option>
                      }
                    </select>
                  </label>
                </div>
                <div class="row-actions">
                  <button type="button" class="btn small-btn" (click)="edit(r.claim)" [attr.aria-label]="'Edit claim for ' + r.trip?.flight">Edit</button>
                  <button type="button" class="btn small-btn danger" data-testid="claim-delete" (click)="remove(r.claim)" [attr.aria-label]="'Delete claim for ' + r.trip?.flight">Delete</button>
                </div>
              </li>
            }
          </ul>
        } @else {
          <div class="empty" data-testid="claim-list">
            <p>No {{ filter() === 'all' ? '' : filter() }} claims to show.</p>
          </div>
        }
      </section>

      <aside class="side-form">
        <form class="panel form" data-testid="claim-form" novalidate (submit)="save($event)" aria-labelledby="cf-title">
          <h2 id="cf-title" class="panel-title">{{ editingId() ? 'Edit claim' : 'File a claim' }}</h2>
          <div class="field" [class.invalid]="errs()['tripId']">
            <label for="cf-trip">Trip</label>
            <select id="cf-trip" name="tripId" data-testid="claim-trip" [value]="d().tripId" (change)="pickTrip($any($event.target).value)"
              [attr.aria-invalid]="errs()['tripId'] ? 'true' : null" [attr.aria-describedby]="errs()['tripId'] ? 'cf-trip-err' : null">
              <option value="" [selected]="!d().tripId">Select a trip…</option>
              @for (t of store.trips(); track t.id) {
                <option [value]="t.id" [selected]="d().tripId === t.id">{{ t.flight }} · {{ t.passenger }} · {{ fmt(t.date) }}</option>
              }
            </select>
            @if (errs()['tripId']; as m) { <p class="err" role="alert" id="cf-trip-err" data-testid="error-tripId">{{ m }}</p> }
          </div>
          <div class="grid2">
            <div class="field" [class.invalid]="errs()['dateFiled']">
              <label for="cf-date">Date filed</label>
              <input id="cf-date" name="dateFiled" type="date" data-testid="claim-date" [value]="d().dateFiled" (input)="set('dateFiled', $event)"
                [attr.aria-invalid]="errs()['dateFiled'] ? 'true' : null" [attr.aria-describedby]="errs()['dateFiled'] ? 'cf-date-err' : null" />
              @if (errs()['dateFiled']; as m) { <p class="err" role="alert" id="cf-date-err" data-testid="error-dateFiled">{{ m }}</p> }
            </div>
            <div class="field" [class.invalid]="errs()['amount']">
              <label for="cf-amount">Amount claimed (€)</label>
              <input id="cf-amount" name="amount" type="number" min="0" step="any" data-testid="claim-amount" [value]="d().amount" (input)="set('amount', $event)"
                [attr.aria-invalid]="errs()['amount'] ? 'true' : null" [attr.aria-describedby]="errs()['amount'] ? 'cf-amount-err' : null" />
              @if (errs()['amount']; as m) { <p class="err" role="alert" id="cf-amount-err" data-testid="error-amount">{{ m }}</p> }
            </div>
          </div>
          <div class="field">
            <label for="cf-status">Status</label>
            <select id="cf-status" name="status" data-testid="claim-status" [value]="d().status" (change)="set('status', $event)">
              @for (s of statuses; track s) {
                <option [value]="s" [selected]="d().status === s">{{ s }}</option>
              }
            </select>
          </div>
          @if (suggest(); as s) {
            <p class="hint">Rule amount for this trip: <strong>{{ money(s) }}</strong></p>
          }
          <div class="actions-row">
            <button type="submit" class="btn primary" data-testid="claim-save">{{ editingId() ? 'Save changes' : 'File claim' }}</button>
            @if (editingId()) { <button type="button" class="btn ghost" (click)="reset()">Cancel</button> }
          </div>
        </form>
      </aside>
    </div>
  `,
})
export class Claims {
  readonly store = inject(Store);
  readonly trip = input<string>();
  readonly statuses = STATUSES;
  readonly filters: Filter[] = ['open', 'all', 'paid', 'rejected'];
  readonly filter = signal<Filter>('open');
  readonly editingId = signal<string | null>(null);
  readonly d = signal<Draft>(this.blank());
  readonly submitted = signal(false);
  readonly fmt = fmtDate;
  readonly money = euro;

  readonly rows = computed(() => {
    const f = this.filter();
    const a = this.store.assessments();
    return this.store
      .claims()
      .filter((c) => f === 'all' || c.status === f)
      .map((claim) => {
        const trip = this.store.trip(claim.tripId);
        const as = trip ? a.get(trip.id) : undefined;
        return { claim, trip, a: as, flag: !!as && as.daysLeft < 30 };
      })
      .sort((x, y) => (x.a?.deadline ?? '9999').localeCompare(y.a?.deadline ?? '9999'));
  });

  readonly errs = computed(() => (this.submitted() ? this.validate(this.d()) : {}));
  readonly suggest = computed(() => {
    const t = this.store.trip(this.d().tripId);
    return t ? this.store.assessments().get(t.id)?.amount ?? 0 : 0;
  });

  constructor() {
    effect(() => {
      const t = this.trip();
      if (t && this.store.trip(t)) {
        this.editingId.set(null);
        this.submitted.set(false);
        this.d.set({ ...this.blank(), tripId: t, amount: String(this.store.assessments().get(t)?.amount ?? '') });
      }
    });
  }

  private blank(): Draft {
    return { tripId: '', dateFiled: this.store?.today ?? '', amount: '', status: 'open' };
  }
  private validate(d: Draft): Record<string, string> {
    const e: Record<string, string> = {};
    if (!d.tripId || !this.store.trip(d.tripId)) e['tripId'] = 'Choose the trip this claim belongs to.';
    if (!d.dateFiled) e['dateFiled'] = 'Date filed is required.';
    else if (!isValidDate(d.dateFiled)) e['dateFiled'] = 'Enter a valid date.';
    const n = Number(d.amount);
    if (d.amount.trim() === '' || !isFinite(n) || n <= 0) e['amount'] = 'Amount must be greater than €0.';
    return e;
  }

  set(k: string, ev: Event) {
    const v = (ev.target as HTMLInputElement | HTMLSelectElement).value;
    this.d.update((x) => ({ ...x, [k]: v }));
  }
  pickTrip(id: string) {
    this.d.update((x) => {
      const rule = this.store.assessments().get(id)?.amount;
      return { ...x, tripId: id, amount: x.amount.trim() === '' && rule ? String(rule) : x.amount };
    });
  }
  edit(c: Claim) {
    this.editingId.set(c.id);
    this.submitted.set(false);
    this.d.set({ tripId: c.tripId, dateFiled: c.dateFiled, amount: String(c.amount), status: c.status });
    queueMicrotask(() => {
      const el = document.getElementById('cf-trip');
      el?.scrollIntoView({ block: 'center' });
      el?.focus({ preventScroll: true });
    });
  }
  reset() {
    this.editingId.set(null);
    this.submitted.set(false);
    this.d.set(this.blank());
  }
  setStatus(c: Claim, s: string) {
    this.store.setClaimStatus(c.id, s as ClaimStatus);
  }
  remove(c: Claim) {
    if (this.editingId() === c.id) this.reset();
    this.store.deleteClaim(c.id);
  }
  save(ev: Event) {
    ev.preventDefault();
    this.submitted.set(true);
    const d = this.d();
    if (Object.keys(this.validate(d)).length) {
      queueMicrotask(() => document.querySelector<HTMLElement>('[data-testid="claim-form"] [aria-invalid="true"]')?.focus());
      return;
    }
    this.store.saveClaim({
      id: this.editingId() ?? uid('c-'),
      tripId: d.tripId,
      dateFiled: d.dateFiled,
      amount: Number(d.amount),
      status: d.status as ClaimStatus,
    });
    this.reset();
  }
}
