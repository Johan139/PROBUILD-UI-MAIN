import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { Store, INITIAL_STATE} from '../app/store/store.service'
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './authentication/http.interceptor';
import { provideHttpClient, withFetch, withInterceptors} from "@angular/common/http";
import { AuthService } from './authentication/auth.service';
import { MarkdownModule } from 'ngx-markdown';
import { FileUploadService } from './services/file-upload.service';
import { provideNativeDateAdapter } from '@angular/material/core';

export function initializeApp(authService: AuthService) {
  return () => authService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: INITIAL_STATE,
      useValue: {
        subtaskGroups: [
          {
            title: '',
            subtasks: [
              { tasks: '', days: 0, startDate: '', endDate: '' }
            ]
          }
        ]
      },
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    },
    Store,
    FileUploadService,
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideClientHydration(), provideAnimationsAsync(),
    importProvidersFrom(MarkdownModule.forRoot()),
    provideNativeDateAdapter(),
  ]
};
