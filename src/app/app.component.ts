import {
  Component,
  OnInit,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  effect,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterModule,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import {
  NgIf,
  NgOptimizedImage,
  isPlatformBrowser,
  NgFor,
  DatePipe,
} from '@angular/common';
import { MatListModule, MatNavList } from '@angular/material/list';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LoaderComponent } from './loader/loader.component';
import { MatMenuModule } from '@angular/material/menu';
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
import { OnboardingService } from './features/onboarding/onboarding.service';
import { OnboardingPromptComponent } from './features/onboarding/onboarding-prompt.component';
import { OnboardingOverlayComponent } from './features/onboarding/onboarding-overlay.component';

type NavItem = {
  label: string;
  icon: string;
  route?: string | any[];
  action?: () => void;
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
    NotificationsMenuComponent,
    OnboardingPromptComponent,
    OnboardingOverlayComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [DatePipe],
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
  showHeader = true;
  showSidenav = true;

  navItems: NavItem[] = [
    {
      label: 'Home',
      icon: 'home',
      route: ['/dashboard'],
      tooltip: 'Return to the main dashboard',
    },
    {
      label: 'New Project',
      icon: 'note_add',
      route: ['/new-project'],
      tooltip: 'Create a new project',
    },
    {
      label: 'My Projects',
      icon: 'folder',
      route: ['/my-projects'],
      tooltip: 'View and manage your ongoing projects',
    },
    // {
    //   label: 'Project Assignment',
    //   icon: 'assignment_ind',
    //   route: ['/job-assignment'],
    //   tooltip: 'Assign team members to your projects',
    // },
    {
      label: 'Calendar',
      icon: 'calendar_today',
      route: ['/calendar'],
      tooltip: 'Access your schedule and calendar events',
    },
    {
      label: 'Quotes & Invoices',
      icon: 'description',
      route: ['/quotes'],
      tooltip: 'Review your existing quotes & invoices',
    },
    // {
    //   label: 'New Quote',
    //   icon: 'note_add',
    //   route: ['/quote'],
    //   tooltip: 'Create a new quote',
    // },
    {
      label: 'Marketplace',
      icon: 'travel_explore',
      route: ['/find-work'],
      tooltip: 'Search for new work opportunities(Under Construction)',
    },
    {
      label: 'Connections',
      icon: 'group',
      route: ['/connections'],
      tooltip: 'Manage your professional connections',
    },
    {
      label: 'Archive',
      icon: 'inventory_2',
      route: ['/archive'],
      tooltip: 'Access your archived projects and records',
    },
    {
      label: 'Notifications',
      icon: 'notifications',
      route: ['/notifications'],
      tooltip: 'View your latest notifications',
    },
    {
      label: 'AI Chat',
      icon: 'smart_toy',
      action: () => this.goToAiChatFullScreen(),
      tooltip: 'Open the AI-powered chat assistant',
    },
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private dialog: MatDialog,
    private authService: AuthService,
    private router: Router,
    matIconRegistry: MatIconRegistry,
    domSanitizer: DomSanitizer,
    private aiChatStateService: AiChatStateService,
    public themeService: ThemeService,
    public onboardingService: OnboardingService,
  ) {
    effect(() => {
      this.themeService.isDarkMode();
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Existing code
        const currentRoute = this.router.routerState.root;
        const minimalLayout =
          currentRoute.firstChild?.snapshot.data['minimalLayout'];

        this.showHeader = !minimalLayout;
        this.showSidenav = !minimalLayout;
        this.showFooter =
          !event.urlAfterRedirects.includes('/login') &&
          !event.urlAfterRedirects.includes('/register') &&
          !event.urlAfterRedirects.includes('/trial-registration') &&
          !minimalLayout;

        // ADD THIS LINE - scroll to top
        window.scrollTo(0, 0);
      });

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event: NavigationEnd) => {
        this.showAiChatIcon = !event.urlAfterRedirects.startsWith('/ai-chat');
      });

    this.isBrowser = isPlatformBrowser(this.platformId);

    matIconRegistry.addSvgIcon(
      'icons8-settings',
      domSanitizer.bypassSecurityTrustResourceUrl(
        'app/assets/icons8-settings.svg',
      ),
    );
    matIconRegistry.addSvgIcon(
      'profile-circle',
      domSanitizer.bypassSecurityTrustResourceUrl(
        'app/assets/custom-svg/profile-circle-svgrepo-com.svg',
      ),
    );
    matIconRegistry.addSvgIcon(
      'logout',
      domSanitizer.bypassSecurityTrustResourceUrl(
        'app/assets/custom-svg/logout-svgrepo-com.svg',
      ),
    );
    matIconRegistry.addSvgIcon(
      'trash',
      domSanitizer.bypassSecurityTrustResourceUrl(
        'app/assets/custom-svg/icons8-trash.svg',
      ),
    );
  }

  ngOnInit() {
    if (this.isBrowser) {
      setTimeout(() => this.onboardingService.checkOnboardingStatus(), 2000);

      const events = ['mousemove', 'keydown', 'scroll', 'touchstart'];
      for (const event of events) {
        window.addEventListener(event, () => {
          this.authService.resetInactivityTimer();
        });
      }

      this.authService.currentUser$.subscribe((user) => {
        this.loggedIn = !!user;

        const isAdmin = user && this.authService.isAdmin();

        // Remove CRM if it exists
        this.navItems = this.navItems.filter((n) => n.label !== 'CRM');

        // Add CRM if admin
        if (isAdmin) {
          this.navItems.push({
            label: 'CRM',
            icon: 'support_agent',
            route: ['/crm'],
            tooltip: 'Manage email templates and CRM tools',
          });
        }

        if (user) {
          const firstName =
            user.firstName || localStorage.getItem('firstName') || '';
          const lastName =
            user.lastName || localStorage.getItem('lastName') || '';
          this.LoggedInName = `${firstName} ${lastName}`.trim();
          this.companyName =
            user.companyName || localStorage.getItem('companyName') || '';
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
    return (
      this.loggedIn && !excludedRoutes.includes(this.router.url.toLowerCase())
    );
  }

  onBrowserClose(event: BeforeUnloadEvent) {
    localStorage.setItem('loggedIn', 'false');
  }

  cancelalert(): void {
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
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
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
