import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../services/notifications.service';
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

  constructor(private notificationsService: NotificationsService) { }

  ngOnInit(): void {
    this.notifications$ = this.notificationsService.notifications$;
    this.notificationsService.getAllNotifications().subscribe(notifications => {
      // The BehaviorSubject in the service will handle the initial list.
    });
  }
}
