import { Routes } from '@angular/router';

import { ActivitiesPageComponent } from './activities-page.component';
import { AnalyticsPageComponent } from './analytics-page.component';
import { authGuard } from './auth.guard';
import { CustomersPageComponent } from './customers-page.component';
import { DashboardPageComponent } from './dashboard-page.component';
import { DealsPageComponent } from './deals-page.component';
import { LoginPageComponent } from './login-page.component';
import { ShellComponent } from './shell.component';
import { UsersPageComponent } from './users-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPageComponent },
      { path: 'customers', component: CustomersPageComponent },
      { path: 'deals', component: DealsPageComponent },
      { path: 'activities', component: ActivitiesPageComponent },
      { path: 'analytics', component: AnalyticsPageComponent },
      { path: 'users', component: UsersPageComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
