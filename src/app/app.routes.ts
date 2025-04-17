import { Routes } from '@angular/router';
import {LoginComponent} from "./authentication/login/login.component";
import { RegistrationComponent } from './authentication/registration/registration.component';
import {DashboardComponent} from "./features/dashboard/dashboard.component";
import { ConfirmEmailComponent } from './authentication/confirm-email/confirm-email.component';
import {AuthGuard} from "./authentication/auth.guard";
import {JobQuoteComponent} from "./features/jobs/job-quote/job-quote.component";
import { ProjectsComponent } from './features/projects/projects.component';
import {NotificationsComponent} from "./features/notifications/notifications.component";
import {JobsComponent} from "./features/jobs/jobs.component";
import { GanttChartComponent } from './components/gantt-chart/gantt-chart.component';
import { ProfileComponent } from './authentication/profile/profile.component';
import { JobAssignmentComponent } from './features/jobs/job-assignment/job-assignment.component';

export const routes: Routes = [
  {path:'', redirectTo: 'login', pathMatch:'full'},
  {path:'login', component:LoginComponent },
  {path:'gant-chart', component:GanttChartComponent, canActivate: [AuthGuard] },
  {path:'register', component:RegistrationComponent },
  {path:'confirm-email', component:ConfirmEmailComponent },
  {path:'job-quote', component:JobQuoteComponent, canActivate: [AuthGuard] },
  {path:'job-assignment', component:JobAssignmentComponent, canActivate: [AuthGuard] },
  {path:'projects', component:ProjectsComponent, canActivate: [AuthGuard] },
  {path:'view-quote', component:JobsComponent, canActivate: [AuthGuard] },
  {path:'dashboard', component: DashboardComponent,
    canActivate: [AuthGuard],
    children: [
      {path:'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
      { path:'notifications', component: NotificationsComponent, canActivate: [AuthGuard] },
      {path:'job-quote', component:JobQuoteComponent, canActivate: [AuthGuard] },
      {path:'view-quote', component:JobsComponent, canActivate: [AuthGuard] },
      {path:'job-assignment', component:JobAssignmentComponent, canActivate: [AuthGuard] },
    ]
  },
  { path:'profile', component: ProfileComponent, canActivate: [AuthGuard] }
];
