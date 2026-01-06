import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OnboardingService } from './onboarding.service';

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './onboarding-overlay.component.html',
  styleUrls: ['./onboarding-overlay.component.scss']
})
export class OnboardingOverlayComponent {

  constructor(public onboardingService: OnboardingService) {}

  // Helper for tooltip positioning
  tooltipStyle = computed(() => {
    const rect = this.onboardingService.highlightRect();
    const step = this.onboardingService.getCurrentStep();

    if (!rect) return { display: 'none' };

    // Basic positioning logic
    const gap = 15;
    let top = 0;
    let left = 0;

    // Convert document coords (service) back to viewport coords for fixed overlay
    const viewTop = rect.top - window.scrollY;
    const viewLeft = rect.left - window.scrollX;

    // Default preferred position
    let preferredPos = step?.position || 'bottom';
    const tooltipWidth = 320; // Approximation including padding
    const tooltipHeight = 180; // Approximation

    // Smart positioning: Check if 'right' fits, if not flip to 'left'
    if (preferredPos === 'right' && (viewLeft + rect.width + gap + tooltipWidth > window.innerWidth)) {
      preferredPos = 'left';
    }
    // Check if 'left' fits, if not flip to 'right' (or bottom if neither fits)
    if (preferredPos === 'left' && (viewLeft - gap - tooltipWidth < 0)) {
        preferredPos = 'bottom';
    }

    switch (preferredPos) {
      case 'bottom':
        top = viewTop + rect.height + gap;
        left = viewLeft;
        break;
      case 'top':
        top = viewTop - gap - tooltipHeight;
        left = viewLeft;
        break;
      case 'right':
        top = viewTop;
        left = viewLeft + rect.width + gap;
        break;
      case 'left':
        top = viewTop;
        left = viewLeft - tooltipWidth - gap;
        break;
      default:
        top = viewTop + rect.height + gap;
        left = viewLeft;
    }

    // Horizontal boundary check (keep inside screen)
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 20;
    }
    if (left < 10) {
        left = 10;
    }

    // Vertical boundary check
    if (top < 10) {
        top = 10;
    }

    return {
      top: `${top}px`,
      left: `${left}px`
    };
  });

  // Spotlight style (Fixed position matching the target)
  spotlightStyle = computed(() => {
    const rect = this.onboardingService.highlightRect();
    if (!rect) return { display: 'none' };

    const viewTop = rect.top - window.scrollY;
    const viewLeft = rect.left - window.scrollX;

    return {
      top: `${viewTop}px`,
      left: `${viewLeft}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    };
  });
}
