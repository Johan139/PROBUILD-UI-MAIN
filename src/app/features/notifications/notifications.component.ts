import { Component, OnInit, isDevMode } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NotificationsService } from '../../services/notifications.service';
import { AuthService } from '../../authentication/auth.service';
import { Notification } from '../../models/notification';
import { Observable } from 'rxjs';
import { JobsService } from '../../services/jobs.service';
import { Router } from '@angular/router';
import { JobDataService } from '../jobs/services/job-data.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
  providers: [DatePipe]
})
export class NotificationsComponent implements OnInit {
  notifications$!: Observable<Notification[]>;
  isDevMode = isDevMode();

  constructor(
    private notificationsService: NotificationsService,
    public authService: AuthService,
    private jobsService: JobsService,
    private router: Router,
    private datePipe: DatePipe,
    private jobDataService: JobDataService
  ) { }

  ngOnInit(): void {
    this.notifications$ = this.notificationsService.notifications$;
    this.notificationsService.getAllNotifications().subscribe({
      next: (notifications) => console.log('Initial notifications loaded in component:', notifications),
      error: (err) => console.error('Error loading initial notifications in component:', err)
    });

    this.notifications$.subscribe(notifications => {
      console.log('Component notifications$ updated:', notifications);
    });
  }

  navigateToJob(notification: any): void {
    this.jobDataService.navigateToJob(notification);
  }

  sendTestNotification(): void {
    this.notificationsService.sendTestNotification().subscribe(() => {
      this.notificationsService.getAllNotifications().subscribe();
    });
  }
}
