import { Component, OnInit, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../services/notifications.service';
import { AuthService } from '../../authentication/auth.service';
import { Notification } from '../../models/notification';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  notifications$!: Observable<Notification[]>;
  isDevMode = isDevMode();

  constructor(private notificationsService: NotificationsService, public authService: AuthService) { }

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
  sendTestNotification(): void {
    this.notificationsService.sendTestNotification().subscribe(() => {
      this.notificationsService.getAllNotifications().subscribe();
    });
  }
}
