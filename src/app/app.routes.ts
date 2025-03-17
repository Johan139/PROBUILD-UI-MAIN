
import { Routes } from '@angular/router';
import {LoginComponent} from "./authentication/login/login.component";
import { RegistrationComponent } from './authentication/registration/registration.component';
import {DashboardComponent} from "./features/dashboard/dashboard.component";
import { ConfirmEmailComponent } from './authentication/confirm-email/confirm-email.component';
import {authGuard} from "./authentication/auth.guard";
import {JobQuoteComponent} from "./features/jobs/job-quote/job-quote.component";
import { ProjectsComponent } from './features/projects/projects.component';
import {NotificationsComponent} from "./features/notifications/notifications.component";
import {JobsComponent} from "./features/jobs/jobs.component";
import { GanttChartComponent } from './components/gantt-chart/gantt-chart.component';

export const routes: Routes = [
  {path: '', redirectTo: 'login', pathMatch:'full'},
  {path:'login', component:LoginComponent},
  {path:'gant-chart', component:GanttChartComponent},
  {path: 'register', component:RegistrationComponent},
  {path: 'confirm-email', component:ConfirmEmailComponent},
  {path:'job-quote', component:JobQuoteComponent},
  {path:'projects', component:ProjectsComponent},
  {path:'view-quote', component:JobsComponent},
  {path: 'dashboard', component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      {path: 'dashboard', component: DashboardComponent},
      { path: 'notifications', component: NotificationsComponent},
      {path:'job-quote', component:JobQuoteComponent},
      {path:'view-quote', component:JobsComponent},
    ]
  },
];
