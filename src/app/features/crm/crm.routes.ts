import { Routes } from '@angular/router';
import { CrmDashboardComponent } from './crm-dashboard.component';

export const CRM_ROUTES: Routes = [
  {
    path: '',
    component: CrmDashboardComponent,
  },
  {
    path: 'email-templates',
    loadChildren: () =>
      import('./email-templates/email-template.routes').then(
        (m) => m.EMAIL_TEMPLATE_ROUTES,
      ),
  },
  {
    path: 'email-logs',
    loadChildren: () =>
      import('./email-logs/email-logs.routes').then((m) => m.EMAIL_LOGS_ROUTES),
  },
  {
    path: 'users',
    loadChildren: () =>
      import('./users/crm-users.routes').then((m) => m.CRM_USERS_ROUTES),
  },
];
