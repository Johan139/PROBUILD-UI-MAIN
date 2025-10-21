import { Component, OnInit, Inject, OnDestroy, PLATFORM_ID, effect } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatCardModule } from "@angular/material/card";
import { MatSidenav, MatSidenavModule } from "@angular/material/sidenav";
import { NgIf, NgOptimizedImage, isPlatformBrowser, NgFor, DatePipe } from "@angular/common";
import { MatListModule, MatNavList } from "@angular/material/list";
import { MatIconModule, MatIconRegistry } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { LoaderComponent } from './loader/loader.component';
import { MatMenuModule} from '@angular/material/menu';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from './authentication/auth.service';
import { LogoutConfirmDialogComponent } from './authentication/logout-confirm-dialog/logout-confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { FooterComponent } from './footer/footer.component';
import { filter } from 'rxjs';
import { MatDividerModule } from '@angular/material/divider';
import { AiChatIconComponent } from './features/ai-chat/components/ai-chat-icon/ai-chat-icon.component';
import { AiChatWindowComponent } from './features/ai-chat/components/ai-chat-window/ai-chat-window.component';
import { AiChatStateService } from './features/ai-chat/services/ai-chat-state.service';
import { MatTooltip } from '@angular/material/tooltip';
import { NotificationsMenuComponent } from './components/notifications-menu/notifications-menu.component';
import { ThemeService } from './theme.service';

type NavItem = {
  label: string;
  icon: string;            // Material icon name or svgIcon id
  route?: string | any[];  // string or routerLink array
  action?: () => void;     // optional handler
  aria?: string;
  tooltip: string;
};

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
    NgFor,
    MatDividerModule,
    FooterComponent,
    AiChatIconComponent,
    AiChatWindowComponent,
    MatTooltip,
    MatListModule,
    MatIconModule,
    NotificationsMenuComponent

],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
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
  showFooter = true;
  showAiChatIcon = true;
  isRouterOutletVisible = true;

  navItems: NavItem[] = [
    { label: 'Home',            icon: 'home',            route: ['/dashboard'],      tooltip: 'Return to the main dashboard' },
    { label: 'My Jobs',         icon: 'folder',          route: ['/job-quote'],      tooltip: 'View and manage your ongoing jobs' },
    { label: 'Job Assignment',  icon: 'assignment_ind',  route: ['/job-assignment'], tooltip: 'Assign jobs to your team members' },
    { label: 'Calendar',        icon: 'calendar_today',  route: ['/calendar'],       tooltip: 'Access your schedule and calendar events' },
    { label: 'My Quotes',       icon: 'description',     route: ['/quotes'],         tooltip: 'Review your existing quotes' },
    { label: 'New Quote',       icon: 'note_add',        route: ['/quote'],          tooltip: 'Create a new quote' },
    { label: 'Available Jobs',  icon: 'work_outline',    route: ['/jobselection'],   tooltip: 'Browse and select from available jobs' },
    { label: 'Find Work',       icon: 'travel_explore',  route: ['/find-work'],      tooltip: 'Search for new work opportunities' },
    { label: 'Connections',     icon: 'group',           route: ['/connections'],    tooltip: 'Manage your professional connections' },
    { label: 'Archive',         icon: 'inventory_2',     route: ['/archive'],        tooltip: 'Access your archived projects and records' },
    { label: 'Notifications',   icon: 'notifications',   route: ['/notifications'],  tooltip: 'View your latest notifications' },
    { label: 'AI Chat',         icon: 'smart_toy',       action: () => this.goToAiChatFullScreen(), tooltip: 'Open the AI-powered chat assistant' },
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private dialog: MatDialog,
    private authService: AuthService,
    private router: Router,
    matIconRegistry: MatIconRegistry,
    domSanitizer: DomSanitizer,
    private aiChatStateService: AiChatStateService,
    public themeService: ThemeService
  ) {
    effect(() => {
      // This effect will run whenever isDarkMode changes
      this.themeService.isDarkMode(); 
      if (this.isBrowser) {
        this.isRouterOutletVisible = false;
        setTimeout(() => (this.isRouterOutletVisible = true), 0);
      }
    });

            this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
    .subscribe((event: NavigationEnd) => {
  this.showFooter = !event.urlAfterRedirects.includes('/login');
  console.log('Footer visibility:', this.showFooter);
  console.log('Current route:', event.urlAfterRedirects);

});
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.showAiChatIcon = !event.urlAfterRedirects.startsWith('/ai-chat');
    });

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
   const events = ['mousemove', 'keydown', 'scroll', 'touchstart'];
    for (const event of events) {
      window.addEventListener(event, () => {
        this.authService.resetInactivityTimer();
      });
    }

    this.authService.currentUser$.subscribe(user => {
      this.loggedIn = !!user;
      if (user) {
        const firstName = user.firstName || localStorage.getItem('firstName') || '';
        const lastName = user.lastName || localStorage.getItem('lastName') || '';
        this.LoggedInName = `${firstName} ${lastName}`.trim();
        this.companyName = user.companyName || localStorage.getItem('companyName') || '';
      } else {
        this.LoggedInName = '';
        this.companyName = '';
      }
    });

  }
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


  goToAiChatFullScreen(): void {
    this.router.navigate(['/ai-chat']);
    this.aiChatStateService.setIsChatOpen(false);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}

