import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store, euro } from './store';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  template: `
    <a class="skip" href="#main">Skip to content</a>
    <header class="masthead">
      <div class="masthead-in">
        <a class="brand" routerLink="/trips" aria-label="Delay Dossier, home">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 20 29 6 21 27l-5-8-4 6-1-7z" /></svg>
          <span>Delay <em>Dossier</em></span>
        </a>
        <div class="unclaimed" data-testid="unclaimed-summary" role="status">
          <span class="u-label">Unclaimed compensation</span>
          <span class="u-amount">{{ money(store.unclaimed().total) }}</span>
          <span class="u-sub">on {{ store.unclaimed().count }} eligible {{ store.unclaimed().count === 1 ? 'trip' : 'trips' }} with no claim</span>
        </div>
      </div>
      <p class="alert-strip">
        <span class="dot" aria-hidden="true"></span>
        21 Sep 2026: failed air traffic control equipment grounded flights at EWR, PHL, JFK and LGA. Check your files before the window closes.
      </p>
    </header>
    <nav class="folder-tabs" aria-label="Main">
      <a routerLink="/trips" routerLinkActive="active" ariaCurrentWhenActive="page">Trips</a>
      <a routerLink="/claims" routerLinkActive="active" ariaCurrentWhenActive="page">Claims</a>
      <a routerLink="/rules" routerLinkActive="active" ariaCurrentWhenActive="page">Rules</a>
    </nav>
    <main id="main" class="folder" tabindex="-1">
      <router-outlet />
    </main>
    <footer class="foot">
      <span>All data stays in this browser.</span>
      <button type="button" class="btn ghost small-btn" data-testid="reset-data" (click)="store.reset()">Reset data</button>
    </footer>
    @if (store.toast(); as t) {
      <div class="toast" role="status">
        <span>{{ t.message }}</span>
        @if (t.undo) {
          <button type="button" class="btn small-btn" (click)="undo(t.undo)">Undo</button>
        }
        <button type="button" class="btn ghost small-btn" (click)="store.dismissToast()" aria-label="Dismiss notification">×</button>
      </div>
    }
  `,
})
export class App {
  readonly store = inject(Store);
  readonly money = euro;
  undo(fn: () => void) {
    fn();
    this.store.dismissToast();
  }
}
