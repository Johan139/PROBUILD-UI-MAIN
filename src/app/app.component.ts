import { Component, OnInit, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatCardModule } from "@angular/material/card";
import { MatSidenav, MatSidenavModule } from "@angular/material/sidenav";
import { NgIf, NgOptimizedImage, isPlatformBrowser, AsyncPipe, NgFor, DatePipe, SlicePipe } from "@angular/common";
import { MatNavList } from "@angular/material/list";
import { MatIconModule, MatIconRegistry } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { LoaderComponent } from './loader/loader.component';
import { MatMenuModule} from '@angular/material/menu';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from './authentication/auth.service';
import { LogoutConfirmDialogComponent } from './authentication/logout-confirm-dialog/logout-confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { NotificationsService } from './services/notifications.service';
import { JobsService } from './services/jobs.service';
import { Observable, tap } from 'rxjs';
import { Notification } from './models/notification';
import { MatDividerModule } from '@angular/material/divider';
import { JobDataService } from './features/jobs/services/job-data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatCardModule,
    MatSidenavModule,
    NgIf,
    MatNavList,
    LoaderComponent,
    MatIconModule,
    MatMenuModule,
    MatSidenav,
    RouterLink,
    MatButtonModule,
    NgOptimizedImage,
    RouterModule,
    MatIconModule,
    AsyncPipe,
    NgFor,
    MatDividerModule,
    SlicePipe
],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'], // Fixed typo from `styleUrl` to `styleUrls`
  providers: [DatePipe]
})
export class AppComponent implements OnInit, OnDestroy {
  showAlert: boolean = false;
  alertMessage: string = '';
  LoggedInName: string = '';
  companyName: string = '';
  routeURL: string = '/';
  isLoading: boolean = false;
  isServicesExpanded: boolean = false;
  title = 'ProBuildAI';
  loggedIn = false;
  isBrowser: boolean = typeof window !== 'undefined';
  isSidenavOpen = false;
  recentNotifications$!: Observable<Notification[]>;
  public hasUnreadNotifications$!: Observable<boolean>;


  constructor(@Inject(PLATFORM_ID) private platformId: Object,private dialog: MatDialog,  private authService: AuthService, private router: Router, matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer, public notificationsService: NotificationsService, private jobsService: JobsService, private datePipe: DatePipe, private jobDataService: JobDataService) {

    this.isBrowser = isPlatformBrowser(this.platformId);
    this.hasUnreadNotifications$ = this.notificationsService.hasUnreadNotifications$;

    matIconRegistry.addSvgIcon(
      'icons8-settings',
      domSanitizer.bypassSecurityTrustResourceUrl('app/assets/icons8-settings.svg')
    );
    matIconRegistry.addSvgIcon(
      'profile-circle',
      domSanitizer.bypassSecurityTrustResourceUrl('app/assets/custom-svg/profile-circle-svgrepo-com.svg')
    );
    matIconRegistry.addSvgIcon(
      'logout',
      domSanitizer.bypassSecurityTrustResourceUrl('app/assets/custom-svg/logout-svgrepo-com.svg')
    );
    matIconRegistry.addSvgIcon(
      'trash',
      domSanitizer.bypassSecurityTrustResourceUrl('app/assets/custom-svg/icons8-trash.svg')
    );
  }


ngOnInit() {
  if (this.isBrowser) {
    this.authService.currentUser$.subscribe(user => {
        if (user) {
          const firstName = user.firstName || localStorage.getItem('firstName') || '';
          const lastName = user.lastName || localStorage.getItem('lastName') || '';
          this.LoggedInName = `${firstName} ${lastName}`.trim();
          this.companyName = user.companyName || localStorage.getItem('companyName') || '';
        } else {
          this.LoggedInName = '';
          this.companyName = '';
      }

      // ✅ Set loggedIn reactively based on whether a user is present
      this.loggedIn = !!user;
    });
      this.loggedIn = JSON.parse(localStorage.getItem('loggedIn') || 'false');
      this.recentNotifications$ = this.notificationsService.notifications$;
      this.notificationsService.getAllNotifications(1, 50).subscribe();
    }
  }


  onNotificationsOpened(): void {
    this.notificationsService.markAsRead();
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      window.removeEventListener('beforeunload', this.onBrowserClose);
    }
  }

shouldShowHeaderButtons(): boolean {
  const excludedRoutes = ['/login', '/register', '/confirm-email'];
  return this.loggedIn && !excludedRoutes.includes(this.router.url.toLowerCase());
}

  onBrowserClose(event: BeforeUnloadEvent ) {
    localStorage.setItem('loggedIn', 'false');
  }

  // onBrowserOpen(event: BeforeUnloadEvent ) {
  //   this.loggedIn = true;
  //   localStorage.setItem('loggedIn', 'true');
  // }
  cancelalert(): void{
    this.showAlert = false;
  }
  closeAlert(): void {
    if (this.routeURL) {
      this.router.navigateByUrl(this.routeURL);
    }
    this.showAlert = false;
  }
logout(): void {
  const dialogRef = this.dialog.open(LogoutConfirmDialogComponent, {
    width: '320px',
    disableClose: true
  });

  dialogRef.afterClosed().subscribe(result => {
    console.log(result)
    if (result === true) {
      localStorage.clear();
      this.loggedIn = false;
      this.authService.logout();
          if (this.routeURL) {
      this.router.navigateByUrl(this.routeURL);
    }
    }
  });
}
  toggleSidenav(): void {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  navigateToJob(notification: any): void {
    this.jobDataService.navigateToJob(notification);
  }
}

