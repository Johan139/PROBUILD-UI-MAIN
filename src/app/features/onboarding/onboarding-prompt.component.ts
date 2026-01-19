import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OnboardingService } from './onboarding.service';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-onboarding-prompt',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './onboarding-prompt.component.html',
  styleUrls: ['./onboarding-prompt.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class OnboardingPromptComponent {
  constructor(public onboardingService: OnboardingService) {}
}
