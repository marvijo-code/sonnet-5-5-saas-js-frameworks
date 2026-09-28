import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CAUSES, CAUSE_LABEL, Cause, Store, Trip, isValidDate, isValidDateTime, uid } from './store';

interface Draft {
  passenger: string;
  flight: string;
  date: string;
  origin: string;
  destination: string;
  distance: string;
  sched: string;
  actual: string;
  cause: string;
}
const BLANK: Draft = { passenger: '', flight: '', date: '', origin: '', destination: '', distance: '', sched: '', actual: '', cause: 'other' };

export function validateTrip(d: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.passenger.trim()) e['passenger'] = 'Passenger name is required.';
  const flight = d.flight.trim().toUpperCase();
  if (!flight) e['flight'] = 'Flight number is required.';
  else if (!/^[A-Z]{2}\d{1,4}$/.test(flight)) e['flight'] = 'Use 2 letters then 1 to 4 digits, e.g. UA1523.';
  if (!d.date) e['date'] = 'Flight date is required.';
  else if (!isValidDate(d.date)) e['date'] = 'Enter a valid date.';
  const o = d.origin.trim().toUpperCase();
  const x = d.destination.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(o)) e['origin'] = 'Use a 3-letter airport code, e.g. EWR.';
  if (!/^[A-Z]{3}$/.test(x)) e['destination'] = 'Use a 3-letter airport code, e.g. LAX.';
  else if (o === x) e['destination'] = 'Destination must differ from origin.';
  const km = Number(d.distance);
  if (d.distance.trim() === '' || !isFinite(km) || km <= 0) e['distance'] = 'Distance must be greater than 0 km.';
  if (d.sched && !isValidDateTime(d.sched)) e['sched'] = 'Enter a valid date and time.';
  if (d.actual && !isValidDateTime(d.actual)) e['actual'] = 'Enter a valid date and time.';
  if (d.sched && !d.actual) e['actual'] = 'Add the actual arrival to measure the delay.';
  if (d.actual && !d.sched) e['sched'] = 'Add the scheduled arrival to measure the delay.';
  if (!(CAUSES as readonly string[]).includes(d.cause)) e['cause'] = 'Choose a cause.';
  return e;
}

@Component({
  selector: 'app-trip-form',
  template: `
    <form class="panel form" data-testid="trip-form" novalidate (submit)="save($event)" aria-labelledby="tf-title">
      <h2 id="tf-title" class="panel-title">{{ trip() ? 'Edit trip' : 'Open a new file' }}</h2>
      <div class="grid2">
        @for (f of fields; track f.key) {
          <div class="field" [class.full]="f.full" [class.invalid]="errs()[f.key]">
            <label [for]="'tf-' + f.key">{{ f.label }}</label>
            <input
              [id]="'tf-' + f.key" [name]="f.key" [type]="f.type" [placeholder]="f.ph"
              [attr.data-testid]="'trip-' + f.key" [attr.maxlength]="f.max" [attr.min]="f.type === 'number' ? 0 : null"
              [attr.step]="f.type === 'number' ? 'any' : null" [attr.autocomplete]="'off'"
              [attr.aria-invalid]="errs()[f.key] ? 'true' : null" [attr.aria-describedby]="errs()[f.key] ? 'tf-' + f.key + '-err' : null"
              [value]="value(f.key)" (input)="set(f.key, $event)" />
            @if (errs()[f.key]; as msg) {
              <p class="err" role="alert" [id]="'tf-' + f.key + '-err'" [attr.data-testid]="'error-' + f.key">{{ msg }}</p>
            }
          </div>
        }
        <div class="field full">
          <label for="tf-cause">Cause of disruption</label>
          <select id="tf-cause" name="cause" data-testid="trip-cause" [value]="d().cause" (change)="set('cause', $event)">
            @for (c of causes; track c) {
              <option [value]="c" [selected]="d().cause === c">{{ label[c] }}</option>
            }
          </select>
        </div>
      </div>
      <div class="actions-row">
        <button type="submit" class="btn primary" data-testid="trip-save">{{ trip() ? 'Save changes' : 'Add trip' }}</button>
        @if (trip()) {
          <button type="button" class="btn ghost" (click)="cancel()">Cancel</button>
        }
      </div>
    </form>
  `,
})
export class TripForm {
  private readonly store = inject(Store);
  readonly trip = input<Trip | null>(null);
  readonly saved = output<Trip>();
  readonly cancelled = output<void>();

  readonly causes = CAUSES;
  readonly label = CAUSE_LABEL;
  readonly fields = [
    { key: 'passenger', label: 'Passenger name', type: 'text', ph: 'As printed on the ticket', full: true, max: null },
    { key: 'flight', label: 'Flight number', type: 'text', ph: 'UA1523', full: false, max: 6 },
    { key: 'date', label: 'Flight date', type: 'date', ph: '', full: false, max: null },
    { key: 'origin', label: 'Origin airport', type: 'text', ph: 'EWR', full: false, max: 3 },
    { key: 'destination', label: 'Destination airport', type: 'text', ph: 'LAX', full: false, max: 3 },
    { key: 'distance', label: 'Distance (km)', type: 'number', ph: '3970', full: true, max: null },
    { key: 'sched', label: 'Scheduled arrival', type: 'datetime-local', ph: '', full: false, max: null },
    { key: 'actual', label: 'Actual arrival', type: 'datetime-local', ph: '', full: false, max: null },
  ];

  readonly d = signal<Draft>({ ...BLANK });
  readonly submitted = signal(false);
  readonly errs = computed(() => (this.submitted() ? validateTrip(this.d()) : {}));

  constructor() {
    effect(() => {
      const t = this.trip();
      this.submitted.set(false);
      this.load(t);
    });
  }

  cancel() {
    const t = this.trip();
    this.submitted.set(false);
    if (t) this.load(t);
    this.cancelled.emit();
  }
  private load(t: Trip | null) {
    this.d.set(
      t
        ? { passenger: t.passenger, flight: t.flight, date: t.date, origin: t.origin, destination: t.destination,
            distance: String(t.distanceKm), sched: t.scheduledArrival, actual: t.actualArrival, cause: t.cause }
        : { ...BLANK },
    );
  }

  value(k: string): string {
    return (this.d() as unknown as Record<string, string>)[k] ?? '';
  }
  set(k: string, ev: Event) {
    const v = (ev.target as HTMLInputElement | HTMLSelectElement).value;
    this.d.update((x) => ({ ...x, [k]: v }));
  }

  save(ev: Event) {
    ev.preventDefault();
    this.submitted.set(true);
    const d = this.d();
    const errors = validateTrip(d);
    if (Object.keys(errors).length) {
      queueMicrotask(() => document.querySelector<HTMLElement>('[data-testid="trip-form"] [aria-invalid="true"]')?.focus());
      return;
    }
    const t: Trip = {
      id: this.trip()?.id ?? uid('t-'),
      passenger: d.passenger.trim(),
      flight: d.flight.trim().toUpperCase(),
      date: d.date,
      origin: d.origin.trim().toUpperCase(),
      destination: d.destination.trim().toUpperCase(),
      distanceKm: Number(d.distance),
      scheduledArrival: d.sched,
      actualArrival: d.actual,
      cause: d.cause as Cause,
    };
    this.store.saveTrip(t);
    if (!this.trip()) {
      this.d.set({ ...BLANK });
      this.submitted.set(false);
    }
    this.saved.emit(t);
  }
}
