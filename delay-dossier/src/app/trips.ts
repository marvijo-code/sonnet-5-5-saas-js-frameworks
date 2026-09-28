import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CAUSE_LABEL, Store, Trip, euro, fmtDate, fmtDelay } from './store';
import { TripForm } from './trip-form';

@Component({
  selector: 'app-trips',
  imports: [RouterLink, TripForm],
  template: `
    <div class="split">
      <section aria-labelledby="trips-h">
        <div class="section-head">
          <div>
            <p class="eyebrow">Case files</p>
            <h1 id="trips-h">Trips</h1>
          </div>
          <label class="search">
            <span class="sr">Search trips</span>
            <input type="search" placeholder="Search passenger, flight, airport" [value]="q()" (input)="q.set($any($event.target).value)" />
          </label>
        </div>
        @if (rows().length) {
          <ul class="tickets" data-testid="trip-list">
            @for (t of rows(); track t.id) {
              @let a = store.assessments().get(t.id)!;
              @let claim = store.claimsFor(t.id);
              <li class="ticket-row" data-testid="trip-row" [class.editing]="editing()?.id === t.id">
                <a class="stub" [routerLink]="['/trips', t.id]" [attr.aria-label]="'Open dossier for ' + t.passenger + ', flight ' + t.flight">
                  <span class="flightno">{{ t.flight }}</span>
                  <span class="stub-date">{{ fmt(t.date) }}</span>
                </a>
                <div class="ticket-main">
                  <div class="route" aria-label="Route">
                    <span>{{ t.origin }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h17m-5-6 6 6-6 6" /></svg><span>{{ t.destination }}</span>
                  </div>
                  <p class="pax">{{ t.passenger }} · {{ cause[t.cause] }} · {{ t.distanceKm }} km</p>
                </div>
                <div class="ticket-side">
                  <span class="badge" [class]="'badge ' + a.verdict" data-testid="row-eligibility">
                    {{ a.verdict === 'eligible' ? 'Eligible ' + money(a.amount) : a.verdict === 'short' ? 'Delay too short' : 'Extraordinary' }}
                  </span>
                  <span class="small">Delay {{ delay(a.delayMinutes) }}</span>
                  @if (claim.length) {
                    <span class="small">Claim {{ claim[0].status }}</span>
                  } @else if (a.verdict === 'eligible') {
                    <span class="small warn-text">No claim yet</span>
                  }
                </div>
                <div class="row-actions">
                  <button type="button" class="btn small-btn" (click)="edit(t)" [attr.aria-label]="'Edit trip ' + t.flight + ' for ' + t.passenger">Edit</button>
                  <button type="button" class="btn small-btn danger" data-testid="trip-delete" (click)="remove(t)" [attr.aria-label]="'Delete trip ' + t.flight + ' for ' + t.passenger">Delete</button>
                </div>
              </li>
            }
          </ul>
        } @else {
          <div class="empty" data-testid="trip-list">
            <p>{{ q() ? 'No trips match that search.' : 'No trips on file. Open a new file to start a dossier.' }}</p>
          </div>
        }
      </section>
      <aside class="side-form">
        <app-trip-form [trip]="editing()" (saved)="editing.set(null)" (cancelled)="editing.set(null)" />
      </aside>
    </div>
  `,
})
export class Trips {
  readonly store = inject(Store);
  readonly q = signal('');
  readonly editing = signal<Trip | null>(null);
  readonly cause = CAUSE_LABEL;
  readonly fmt = fmtDate;
  readonly delay = fmtDelay;
  readonly money = euro;

  readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return [...this.store.trips()]
      .filter((t) => !q || `${t.passenger} ${t.flight} ${t.origin} ${t.destination}`.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  edit(t: Trip) {
    this.editing.set(t);
    queueMicrotask(() => {
      const el = document.getElementById('tf-passenger');
      el?.scrollIntoView({ block: 'center' });
      el?.focus({ preventScroll: true });
    });
  }
  remove(t: Trip) {
    if (this.editing()?.id === t.id) this.editing.set(null);
    this.store.deleteTrip(t.id);
  }
}
