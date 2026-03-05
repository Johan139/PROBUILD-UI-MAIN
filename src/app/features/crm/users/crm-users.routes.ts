import { Routes } from '@angular/router';
import { CrmUsersListComponent } from './crm-users-list/crm-users-list.component';
import { CrmUserDetailsComponent } from './crm-user-details/crm-user-details.component';

export const CRM_USERS_ROUTES: Routes = [
  {
    path: '',
    component: CrmUsersListComponent,
  },
  {
    path: ':id',
    component: CrmUserDetailsComponent,
  },
];
