import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Notification } from '../../models/notification';
import { NotificationsService } from '../../services/notifications.service';
import { JobDataService } from '../../features/jobs/services/job-data.service';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-notifications-menu',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './notifications-menu.component.html',
  styleUrls: ['./notifications-menu.component.scss'],
})
export class NotificationsMenuComponent implements OnInit {
  recentNotifications$!: Observable<Notification[]>;
  hasUnreadNotifications$!: Observable<boolean>;
  isOpen = false;

  trackByNotif = (_: number, n: any) => n.id ?? n.timestamp ?? _;

  constructor(
    public notificationsService: NotificationsService,
    private userService: UserService,
    private jobDataService: JobDataService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.recentNotifications$ = this.notificationsService.notifications$;
    this.hasUnreadNotifications$ =
      this.notificationsService.hasUnreadNotifications$;
    this.notificationsService.getAllNotifications(1, 50).subscribe();
  }

  toggleMenu() {
    this.isOpen = !this.isOpen;
    // if (this.isOpen) {
    //   this.notificationsService.markAllRead().subscribe();
    // }
  }

  closeMenu() {
    this.isOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenu();
  }

  navigateFromNotification(notification: Notification): void {
    switch (notification.type) {
      case 'Quote':
        this.router.navigate(['/quote'], {
          queryParams: { quoteId: notification.quoteId },
        });
        break;

      case 'Invoice':
        this.router.navigate(['/quote'], {
          queryParams: { quoteId: notification.quoteId },
        });
        break;

      case 'Job':
        this.jobDataService.navigateToJob(notification.jobId);
        break;

      default:
        console.warn('Unknown notification type:', notification);
    }
  }

  getInitials(name: string | null | undefined): string {
    return this.userService.getInitials(name);
  }

  goToAllNotifications() {
    this.router.navigate(['/notifications']);
    this.closeMenu();
  }

  markAllRead() {
    this.notificationsService.markAllRead().subscribe();
    this.closeMenu();
  }
}
