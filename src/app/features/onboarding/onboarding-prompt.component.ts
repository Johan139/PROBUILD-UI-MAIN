import { Component } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OnboardingService } from './onboarding.service';
import { Router } from '@angular/router';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

@Component({
  selector: 'app-onboarding-prompt',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './onboarding-prompt.component.html',
  styleUrls: ['./onboarding-prompt.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate(
          '300ms ease-out',
          style({ transform: 'translateY(0)', opacity: 1 }),
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          style({ transform: 'translateY(100%)', opacity: 0 }),
        ),
      ]),
    ]),
  ],
})
export class OnboardingPromptComponent {
  constructor(
    public onboardingService: OnboardingService,
    private router: Router,
  ) {}

  shouldShowPrompt(): boolean {
    const excludedRoutes = ['/login', '/register', '/trial-registration'];

    const currentUrl = this.router.url.split('?')[0];

    const isExcluded = excludedRoutes.some((route) =>
      currentUrl.startsWith(route),
    );

    return this.onboardingService.showPrompt() && !isExcluded;
  }
}
