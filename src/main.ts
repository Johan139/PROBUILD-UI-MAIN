import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

// Apply production mode if needed
if (environment.production) {
  enableProdMode();
}

// Bootstrap the app with the standalone API
bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));