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

@Component({
  selector: 'app-notifications-menu',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './notifications-menu.component.html',
  styleUrls: ['./notifications-menu.component.scss']
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
    private router: Router
  ) {}

  ngOnInit() {
    this.recentNotifications$ = this.notificationsService.notifications$;
    this.hasUnreadNotifications$ = this.notificationsService.hasUnreadNotifications$;
    this.notificationsService.getAllNotifications(1, 50).subscribe();
  }

  toggleMenu() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.notificationsService.markAllRead().subscribe();
    }
  }

  closeMenu() {
    this.isOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenu();
  }

  navigateToJob(notification: any): void {
    this.jobDataService.navigateToJob(notification);
    this.closeMenu();
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
