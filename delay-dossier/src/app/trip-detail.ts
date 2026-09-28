import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CAUSE_LABEL, Store, euro, fmtDate, fmtDateTime, fmtDelay } from './store';
import { TripForm } from './trip-form';

@Component({
  selector: 'app-trip-detail',
  imports: [RouterLink, TripForm],
  template: `
    @if (trip(); as t) {
      @let a = a$()!;
      <p class="crumb"><a routerLink="/trips">← All trips</a></p>
      <div class="split">
        <section aria-labelledby="dossier-h">
          <header class="dossier-head">
            <div>
              <p class="eyebrow">Dossier · {{ t.id }}</p>
              <h1 id="dossier-h">{{ t.passenger }}</h1>
              <div class="route big">
                <span class="flightno">{{ t.flight }}</span>
                <span>{{ t.origin }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h17m-5-6 6 6-6 6" /></svg><span>{{ t.destination }}</span>
              </div>
              <p class="pax">{{ fmt(t.date) }} · {{ t.distanceKm }} km · {{ cause[t.cause] }}</p>
            </div>
            <div class="stamp" [class]="'stamp ' + a.verdict" aria-hidden="true">
              {{ a.verdict === 'eligible' ? 'Eligible' : 'Not eligible' }}
            </div>
          </header>

          <div class="verdict" [class]="'verdict ' + a.verdict" data-testid="eligibility" [attr.data-state]="a.verdict">
            <p class="verdict-label">
              {{ a.verdict === 'eligible' ? 'Eligible' : a.verdict === 'short' ? 'Delay too short' : 'Extraordinary cause' }}
            </p>
            <p class="verdict-reason">{{ a.reason }}</p>
          </div>

          <div class="delaybar" role="img" [attr.aria-label]="'Arrival delay ' + delay(a.delayMinutes) + ' against a ' + store.rules().minDelayHours + ' hour minimum'">
            <div class="track">
              <div class="fill" [class.met]="a.verdict !== 'short'" [style.width.%]="fillPct(a.delayMinutes)"></div>
              <div class="mark" [style.left.%]="markPct()"><span>{{ store.rules().minDelayHours }}h min</span></div>
            </div>
          </div>

          <dl class="facts">
            <div><dt>Scheduled arrival</dt><dd>{{ dt(t.scheduledArrival) }}</dd></div>
            <div><dt>Actual arrival</dt><dd>{{ dt(t.actualArrival) }}</dd></div>
            <div><dt>Arrival delay</dt><dd data-testid="delay">{{ delay(a.delayMinutes) }}</dd></div>
            <div>
              <dt>Compensation band</dt>
              <dd data-testid="amount">{{ money(a.amount) }}
                <span class="small">{{ a.verdict === 'eligible' ? 'payable' : 'not payable' }}</span></dd>
            </div>
            <div><dt>Claim deadline</dt><dd data-testid="deadline">{{ fmt(a.deadline) }}</dd></div>
            <div>
              <dt>Time left</dt>
              <dd data-testid="days-left" [class.urgent]="a.daysLeft < 30">
                {{ a.daysLeft < 0 ? 'Expired ' + -a.daysLeft + ' days ago' : a.daysLeft + (a.daysLeft === 1 ? ' day' : ' days') }}
              </dd>
            </div>
          </dl>

          <div class="panel">
            <div class="section-head tight">
              <h2 class="panel-title">Claims on this trip</h2>
              <a class="btn primary small-btn" routerLink="/claims" [queryParams]="{ trip: t.id }">File a claim</a>
            </div>
            @if (claims().length) {
              <ul class="plain">
                @for (c of claims(); track c.id) {
                  <li>
                    <span>{{ fmt(c.dateFiled) }} · {{ money(c.amount) }}</span>
                    <span class="badge" [class]="'badge ' + c.status">{{ c.status }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted">No claim has been filed for this trip.</p>
            }
          </div>

          <div class="actions-row">
            <button type="button" class="btn danger" data-testid="trip-delete" (click)="remove()" [attr.aria-label]="'Delete trip ' + t.flight">Delete trip</button>
          </div>
        </section>
        <aside class="side-form">
          <app-trip-form [trip]="t" />
        </aside>
      </div>
    } @else {
      <div class="empty">
        <h1>File not found</h1>
        <p>There is no trip with that id. It may have been deleted.</p>
        <a class="btn primary" routerLink="/trips">Back to trips</a>
      </div>
    }
  `,
})
export class TripDetail {
  readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly id = input<string>();
  readonly trip = computed(() => this.store.trip(this.id()));
  readonly a$ = computed(() => {
    const t = this.trip();
    return t ? this.store.assessments().get(t.id) : undefined;
  });
  readonly claims = computed(() => {
    const t = this.trip();
    return t ? this.store.claimsFor(t.id) : [];
  });
  readonly cause = CAUSE_LABEL;
  readonly fmt = fmtDate;
  readonly dt = fmtDateTime;
  readonly delay = fmtDelay;
  readonly money = euro;

  private scale(min: number | null): number {
    return Math.max(8, this.store.rules().minDelayHours * 2, Math.ceil((min ?? 0) / 60) + 1);
  }
  fillPct(min: number | null): number {
    return Math.max(0, Math.min(100, (Math.max(0, min ?? 0) / 60 / this.scale(min)) * 100));
  }
  markPct(): number {
    const t = this.trip();
    const min = t ? this.a$()?.delayMinutes ?? null : null;
    return Math.min(100, (this.store.rules().minDelayHours / this.scale(min)) * 100);
  }
  remove() {
    const t = this.trip();
    if (!t) return;
    this.store.deleteTrip(t.id);
    this.router.navigate(['/trips']);
  }
}
