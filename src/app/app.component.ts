import { Component, OnInit, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatCardModule } from "@angular/material/card";
import { MatSidenav, MatSidenavModule } from "@angular/material/sidenav";
import { NgIf, NgOptimizedImage, isPlatformBrowser, AsyncPipe } from "@angular/common";
import { MatNavList } from "@angular/material/list";
import { MatIconModule, MatIconRegistry } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { LoaderComponent } from './loader/loader.component';
import { MatMenuModule} from '@angular/material/menu';
import { DomSanitizer } from '@angular/platform-browser';
import { NotificationsService } from './services/notifications.service';
import { Observable } from 'rxjs';
import { Notification } from './models/notification';
import { MatDividerModule } from '@angular/material/divider';

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
    MatDividerModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'] // Fixed typo from `styleUrl` to `styleUrls`
})
export class AppComponent implements OnInit, OnDestroy {
  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '/';
  isLoading: boolean = false;
  title = 'ProBuildAI';
  loggedIn = false;
  isBrowser: boolean = typeof window !== 'undefined';
  isSidenavOpen = false;
  recentNotifications$!: Observable<Notification[]>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private router: Router, matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer, private notificationsService: NotificationsService) {
    this.isBrowser = isPlatformBrowser(this.platformId);

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
      this.loggedIn = JSON.parse(localStorage.getItem('loggedIn') || 'false');
      this.recentNotifications$ = this.notificationsService.getRecentNotifications();
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      window.removeEventListener('beforeunload', this.onBrowserClose);
    }
  }

  shouldShowSidenav(): boolean {
    const excludedRoutes = ['/login', '/register', '/confirm-email'];
    return !excludedRoutes.includes(this.router.url);
  }

  shouldShowLogoutButton(): boolean {
    const excludedRoutes = ['/login', '/register', '/confirm-email'];
    return !excludedRoutes.includes(this.router.url);
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
  logout() {
    this.showAlert = true;
    this.alertMessage = 'Are you sure you want to Logout ?';
    this.loggedIn = false;
    localStorage.setItem('token', '');
    localStorage.setItem('jwtToken', '');
    localStorage.setItem('loggedIn', 'false');
    localStorage.setItem('userId', '');
    localStorage.setItem('userType', '');
    localStorage.setItem('firstName', '');
    localStorage.setItem('Subtasks', '')
  }
  toggleSidenav(): void {
    this.isSidenavOpen = !this.isSidenavOpen;
  }
}

