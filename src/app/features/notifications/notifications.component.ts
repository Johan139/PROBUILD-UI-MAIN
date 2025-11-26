import { Component, OnInit, isDevMode } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NotificationsService } from '../../services/notifications.service';
import { AuthService } from '../../authentication/auth.service';
import { Notification } from '../../models/notification';
import { JobDataService } from '../jobs/services/job-data.service';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.scss'],
    providers: [DatePipe]
})
export class NotificationsComponent implements OnInit {
  isDevMode = isDevMode();
  currentPage: number = 1;
  pageSize: number = 50;
  public paginatedNotifications: any[] = [];
    totalNotifications = 0;
  totalPages: number = Number.MAX_SAFE_INTEGER;

  constructor(
    private notificationsService: NotificationsService,
    public authService: AuthService,
    private datePipe: DatePipe,
    private jobDataService: JobDataService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationsService.getAllNotifications(this.currentPage, this.pageSize).subscribe(response => {
      this.paginatedNotifications = response?.notifications || [];
      this.totalPages = response?.totalCount ? Math.ceil(response.totalCount / this.pageSize) : 1;
    });
  }

  navigateToJob(notification: Notification): void {
    this.jobDataService.navigateToJob(notification);
  }

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

  trackByNotif = (_: number, n: any) => n.id ?? n.timestamp ?? _;

  getInitials(name?: string | null): string {
    return this.userService.getInitials(name);
  }

  // open + mark read + navigate
  onOpen(n: Notification) {
    if ((n as any).unread && this.notificationsService.markRead) {
      this.notificationsService.markRead(n.id).subscribe({ next: () => (n as any).unread = false });
    }
    this.navigateToJob(n);
  }

  // top “Show” selector snaps to page 1
  goToFirstPage(): void {
    this.currentPage = 1;
    this.loadNotifications();
  }

  // mark all read button
  markAllRead(): void {
    if (!this.notificationsService.markAllRead) return;
    this.notificationsService.markAllRead().subscribe(() => {
      this.paginatedNotifications.forEach(n => (n as any).unread = false);
    });
  }
}
