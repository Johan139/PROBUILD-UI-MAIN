import { Injectable, signal, effect, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  isDarkMode = signal<boolean>(false);

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.isDarkMode.set(this.getInitialDarkMode());
      this.initializeTheme();
    }
  }

  toggleTheme(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }

  private initializeTheme(): void {
    // Set the initial theme class on the body
    if (this.isDarkMode()) {
      document.body.classList.add('theme-dark');
    }

    // Effect to toggle the theme class on the body
    effect(() => {
      const isDark = this.isDarkMode();
      if (isDark) {
        document.body.classList.add('theme-dark');
      } else {
        document.body.classList.remove('theme-dark');
      }
      // Persist the user's preference
      localStorage.setItem('isDarkMode', JSON.stringify(isDark));
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.isDarkMode.set(e.matches);
    });
  }

  private getInitialDarkMode(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const storedPreference = localStorage.getItem('isDarkMode');
      if (storedPreference) {
        return JSON.parse(storedPreference);
      }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false; // Default to light mode 
  }
}
