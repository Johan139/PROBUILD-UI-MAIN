import { Component, OnInit, isDevMode } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { NotificationsService } from '../../services/notifications.service';
import { AuthService } from '../../authentication/auth.service';
import { JobDataService } from '../jobs/services/job-data.service';
import { UserService } from '../../services/user.service';
import { Notification } from '../../models/notification';

type NotificationTab = 'ALL' | 'UNREAD';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
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

  /* ================= DATA ================= */
  paginatedNotifications: Notification[] = [];

  /* ================= TABS ================= */
  activeTab: NotificationTab = 'ALL';

  constructor(
    private notificationsService: NotificationsService,
    public authService: AuthService,
    private jobDataService: JobDataService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  /* ================= LOAD (SAME AS OLD VERSION) ================= */
  loadNotifications(): void {
    this.notificationsService
      .getAllNotifications(this.currentPage, this.pageSize)
      .subscribe((response) => {
        this.paginatedNotifications = response?.notifications || [];

        this.totalNotifications = response?.totalCount ?? 0;
        this.totalPages = this.totalNotifications
          ? Math.ceil(this.totalNotifications / this.pageSize)
          : 1;
      });
  }

  /* ================= TAB FILTER (VIEW-ONLY) ================= */
  get visibleNotifications(): Notification[] {
    if (this.activeTab === 'UNREAD') {
      return this.paginatedNotifications.filter((n: any) => n.unread === true);
    }
    return this.paginatedNotifications;
  }

  setTab(tab: NotificationTab): void {
    this.activeTab = tab;
  }

  get unreadCount(): number {
    return this.paginatedNotifications.filter((n: any) => n.unread === true)
      .length;
  }

  /* ================= OPEN + NAVIGATE ================= */
  onOpen(notification: Notification): void {
    if ((notification as any).unread && this.notificationsService.markRead) {
      this.notificationsService.markRead(notification.id).subscribe(() => {
        (notification as any).unread = false;
      });
    }

    this.jobDataService.navigateToJob(notification);
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
      this.paginatedNotifications.forEach((n: any) => (n.unread = false));
    });
  }

  /* ================= HELPERS ================= */
  trackByNotif = (_: number, n: Notification) =>
    n.id ?? (n as any).timestamp ?? _;

  getInitials(name?: string | null): string {
    return this.userService.getInitials(name);
  }
}
