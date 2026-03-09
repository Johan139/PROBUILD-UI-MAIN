import { Routes } from '@angular/router';
import { EmailLogsListComponent } from './email-logs-list/email-logs-list.component';
import { EmailLogDetailsComponent } from './email-log-details/email-log-details.component';

export const EMAIL_LOGS_ROUTES: Routes = [
  {
    path: '',
    component: EmailLogsListComponent,
  },
  {
    path: ':id',
    component: EmailLogDetailsComponent,
  },
];
