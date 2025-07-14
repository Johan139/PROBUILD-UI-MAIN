import { Component, OnInit, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatCardModule } from "@angular/material/card";
import { MatSidenav, MatSidenavModule } from "@angular/material/sidenav";
import { NgIf, NgOptimizedImage, isPlatformBrowser } from "@angular/common";
import { MatNavList } from "@angular/material/list";
import { MatIconModule, MatIconRegistry } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { LoaderComponent } from './loader/loader.component';
import { MatMenuModule} from '@angular/material/menu';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from './authentication/auth.service';
import { LogoutConfirmDialogComponent } from './authentication/logout-confirm-dialog/logout-confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';

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
    MatIconModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'] // Fixed typo from `styleUrl` to `styleUrls`
})
export class AppComponent implements OnInit, OnDestroy {
  showAlert: boolean = false;
  alertMessage: string = '';
  LoggedInName: string = '';
  routeURL: string = '/';
  isLoading: boolean = false;
  title = 'ProBuildAI';
  loggedIn = false;
  isBrowser: boolean = typeof window !== 'undefined';
  isSidenavOpen = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private dialog: MatDialog, private router: Router,  private authService: AuthService, matIconRegistry: MatIconRegistry, domSanitizer: DomSanitizer) {
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
 this.authService.currentUser$.subscribe(user => {
      if (user) {
        const firstName = user.firstName || localStorage.getItem('firstName') || '';
        const lastName = user.lastName || localStorage.getItem('lastName') || '';
        this.LoggedInName = `${firstName} ${lastName}`.trim();
        this.loggedIn = true;
      } else {
        this.LoggedInName = '';
        this.loggedIn = false;
      }
    });
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
}
