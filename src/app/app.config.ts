import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import {Store, INITIAL_STATE} from '../app/store/store.service'
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './authentication/http.interceptor';
import {provideHttpClient, withFetch, withInterceptors} from "@angular/common/http";

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
    Store,
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideClientHydration(), provideAnimationsAsync(),
  ]
};
