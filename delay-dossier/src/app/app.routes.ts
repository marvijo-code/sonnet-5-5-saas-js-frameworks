import { Routes } from '@angular/router';
import { Trips } from './trips';
import { TripDetail } from './trip-detail';
import { Claims } from './claims';
import { RulesPage } from './rules';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'trips' },
  { path: 'trips', component: Trips, title: 'Trips · Delay Dossier' },
  { path: 'trips/:id', component: TripDetail, title: 'Trip dossier · Delay Dossier' },
  { path: 'claims', component: Claims, title: 'Claims · Delay Dossier' },
  { path: 'rules', component: RulesPage, title: 'Rules · Delay Dossier' },
  { path: '**', redirectTo: 'trips' },
];
