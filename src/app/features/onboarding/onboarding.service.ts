import { Injectable, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../authentication/auth.service';
import { TourStep, NEW_PROJECT_TOUR } from './tour-steps';

/** Persisted preference: do not clear on logout (see app logout). */
export const ONBOARDING_STATUS_STORAGE_KEY = 'onboardingStatus';

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  // State Signals
  isActive = signal<boolean>(false);
  currentStepIndex = signal<number>(0);
  currentTour = signal<TourStep[]>([]);
  showPrompt = signal<boolean>(false);

  // Highlight Rect State
  highlightRect = signal<{ top: number; left: number; width: number; height: number } | null>(null);

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {
    // Listen for route changes to re-position or advance tour
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.isActive()) {
        setTimeout(() => this.updateHighlight(), 500); // Wait for DOM render
      }
      this.applyPromptVisibilityFromStorage();
    });

    // Resize listener to update highlight
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (this.isActive()) this.updateHighlight();
      });
      window.addEventListener('scroll', () => {
        if (this.isActive()) this.updateHighlight();
      }, true);
    }
  }

  /**
   * Keeps the welcome prompt in sync with localStorage and auth.
   * Only shows for logged-in users who have not skipped or completed onboarding.
   */
  applyPromptVisibilityFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.showPrompt.set(false);
      return;
    }

    const status = localStorage.getItem(ONBOARDING_STATUS_STORAGE_KEY);
    if (status === 'skipped' || status === 'completed') {
      this.showPrompt.set(false);
      return;
    }

    if (!status) {
      this.showPrompt.set(true);
      return;
    }

    this.showPrompt.set(false);
  }

  /** @deprecated Use applyPromptVisibilityFromStorage — kept for any external callers */
  checkOnboardingStatus(): void {
    this.applyPromptVisibilityFromStorage();
  }

  /** Clear saved choice and show the welcome prompt again (Help → Reset Onboarding). */
  resetOnboarding(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ONBOARDING_STATUS_STORAGE_KEY);
    }
    this.stopTour();
    this.showPrompt.set(true);
  }

  skipOnboarding() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ONBOARDING_STATUS_STORAGE_KEY, 'skipped');
    }
    this.showPrompt.set(false);
    // Could trigger "Help" icon highlight logic in UI component
  }

  startTour(tourId: string = 'new-project') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ONBOARDING_STATUS_STORAGE_KEY, 'completed');
    }
    this.showPrompt.set(false);

    // Load Tour Data
    if (tourId === 'new-project') {
      this.currentTour.set(NEW_PROJECT_TOUR);
    }

    this.currentStepIndex.set(0);
    this.isActive.set(true);

    // Navigate to start route if needed
    const firstStep = this.currentTour()[0];
    if (firstStep.route && this.router.url !== firstStep.route) {
      this.router.navigate([firstStep.route]).then(() => {
        setTimeout(() => this.updateHighlight(), 500);
      });
    } else {
      setTimeout(() => this.updateHighlight(), 100);
    }
  }

  stopTour() {
    this.isActive.set(false);
    this.highlightRect.set(null);
  }

  nextStep() {
    const current = this.currentStepIndex();
    const tour = this.currentTour();

    if (current < tour.length - 1) {
      const nextStep = tour[current + 1];
      this.currentStepIndex.set(current + 1);

      // Check route change
      if (nextStep.route && !this.router.url.includes(nextStep.route)) {
        // If the step is just informational or we want to force navigation:
        if (!nextStep.actionRequired) {
          this.router.navigate([nextStep.route]).then(() => {
             setTimeout(() => this.updateHighlight(), 500);
          });
          return; // Wait for navigation
        } else {
            // If action is required (like clicking a link), we stay here and let the user do it
            // Should probably guide them to do it
            // For now, assume 'Next' means "Take me there" if possible
             this.router.navigate([nextStep.route]).then(() => {
                 setTimeout(() => this.updateHighlight(), 500);
             });
             return;
        }
      }

      setTimeout(() => this.updateHighlight(), 300);
    } else {
      this.stopTour();
    }
  }

  prevStep() {
    const current = this.currentStepIndex();
    const tour = this.currentTour();

    if (current > 0) {
      const prevStep = tour[current - 1];
      this.currentStepIndex.set(current - 1);

      // Handle reverse navigation
      if (prevStep.route && !this.router.url.includes(prevStep.route)) {
         this.router.navigate([prevStep.route]).then(() => {
             setTimeout(() => this.updateHighlight(), 500);
         });
         return;
      }

      setTimeout(() => this.updateHighlight(), 300);
    }
  }

  // --- Core Logic ---
  updateHighlight() {
    if (!this.isActive()) return;

    const tour = this.currentTour();
    const index = this.currentStepIndex();
    const step = tour[index];

    if (!step) return;

    // Retry finding element logic
    this.findElement(step.targetSelector, 0);
  }

  private findElement(selector: string, attempt: number) {
    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      this.highlightRect.set({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });

      // Scroll into view if needed
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      if (attempt < 5) {
        setTimeout(() => this.findElement(selector, attempt + 1), 500);
      } else {
        console.warn(`Onboarding: Element not found ${selector}`);
        // Fallback or center screen?
      }
    }
  }

  getCurrentStep() {
    const tour = this.currentTour();
    const index = this.currentStepIndex();
    return tour[index];
  }
}
