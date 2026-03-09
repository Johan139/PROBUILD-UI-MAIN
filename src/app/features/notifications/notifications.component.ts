import { Component, OnInit, isDevMode } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { NotificationsService } from '../../services/notifications.service';
import { AuthService } from '../../authentication/auth.service';
import { JobDataService } from '../jobs/services/job-data.service';
import { UserService } from '../../services/user.service';
import { Notification } from '../../models/notification';
import { Router } from '@angular/router';
import {
  NotificationChannel,
  NotificationType,
} from './models/notification.enums';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { NotificationPreference } from './models/notification-preference.model';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

type NotificationTab = 'ALL' | 'UNREAD';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSlideToggleModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
  providers: [DatePipe],
})
export class NotificationsComponent implements OnInit {
  isDevMode = isDevMode();

  /* ================= PAGINATION ================= */
  currentPage = 1;
  pageSize = 50;
  totalPages = 1;
  totalNotifications = 0;

  preferenceRows = [
    { label: 'New bids received', type: NotificationType.NewBid },
    { label: 'Quote accepted/declined', type: NotificationType.QuoteStatus },
    { label: 'Payment received', type: NotificationType.PaymentReceived },
    { label: 'Invoice overdue', type: NotificationType.InvoiceOverdue },
    { label: 'Weather alerts', type: NotificationType.WeatherAlert },
    { label: 'Task updates', type: NotificationType.TaskUpdate },
    { label: 'Job matches', type: NotificationType.JobMatch },
    { label: 'Team changes', type: NotificationType.TeamChange },
  ];

  preferences: NotificationPreference[] = [];
  NotificationType = NotificationType;
  NotificationChannel = NotificationChannel;
  /* ================= DATA ================= */
  paginatedNotifications: Notification[] = [];

  /* ================= TABS ================= */
  activeTab: NotificationTab = 'ALL';
  updating = false;
  constructor(
    private notificationsService: NotificationsService,
    public authService: AuthService,
    private jobDataService: JobDataService,
    private userService: UserService,
    private router: Router,
    private preferencesService: NotificationPreferencesService,
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.loadPreferences();
  }

  /* ================= LOAD (SAME AS OLD VERSION) ================= */
  loadNotifications(): void {
    this.notificationsService
      .getAllNotifications(this.currentPage, this.pageSize)
      .subscribe((response) => {
        this.paginatedNotifications = response?.notifications || [];
        console.log(response);
        this.totalNotifications = response?.totalCount ?? 0;
        this.totalPages = this.totalNotifications
          ? Math.ceil(this.totalNotifications / this.pageSize)
          : 1;
      });
  }

  /* ================= TAB FILTER (VIEW-ONLY) ================= */
  get visibleNotifications(): Notification[] {
    if (this.activeTab === 'UNREAD') {
      return this.paginatedNotifications.filter((n) => this.isUnread(n));
    }

    return this.paginatedNotifications;
  }

  setTab(tab: NotificationTab): void {
    this.activeTab = tab;
  }

  get unreadCount(): number {
    return this.paginatedNotifications.filter((n) => this.isUnread(n)).length;
  }

  /* ================= OPEN + NAVIGATE ================= */
  onOpen(notification: Notification): void {
    // optimistic read
    if (this.isUnread(notification)) {
      notification.isRead = true;

      this.notificationsService.markRead(notification.id).subscribe({
        error: () => {
          notification.isRead = false;
        },
      });
    }

    this.navigateFromNotification(notification);
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
        console.log(notification.type);
        console.warn('Unknown notification type:', notification);
    }
  }

  isUnread(n: Notification): boolean {
    return n.isRead !== true;
  }

  /* ================= PAGINATION ================= */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadNotifications();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadNotifications();
    }
  }

  goToFirstPage(): void {
    this.currentPage = 1;
    this.loadNotifications();
  }

  /* ================= ACTIONS ================= */
  markAllRead(): void {
    if (!this.notificationsService.markAllRead) return;

    this.notificationsService.markAllRead().subscribe(() => {
      this.paginatedNotifications.forEach((n) => {
        n.isRead = true;
      });
    });
  }
  onToggle(
    type: NotificationType,
    channel: NotificationChannel,
    value: boolean,
  ) {
    const pref = this.preferences.find(
      (p) => p.notificationType === type && p.channel === channel,
    );

    const previousValue = pref?.isEnabled ?? true;

    if (pref) {
      pref.isEnabled = value;
    }

    this.preferencesService
      .updatePreference({
        notificationType: type,
        channel: channel,
        isEnabled: value,
      })
      .subscribe({
        error: () => {
          if (pref) {
            pref.isEnabled = previousValue;
          }
        },
      });
  }
  isPreferenceEnabled(
    type: NotificationType,
    channel: NotificationChannel,
  ): boolean {
    const pref = this.preferences.find(
      (p) => p.notificationType === type && p.channel === channel,
    );

    return pref?.isEnabled ?? true; // default true if missing
  }

  loadPreferences(): void {
    this.preferencesService.getPreferences().subscribe((prefs) => {
      this.preferences = prefs;
    });
  }
  /* ================= HELPERS ================= */
  trackByNotif = (_: number, n: Notification) =>
    n.id ?? (n as any).timestamp ?? _;

  getInitials(name?: string | null): string {
    return this.userService.getInitials(name);
  }
}
