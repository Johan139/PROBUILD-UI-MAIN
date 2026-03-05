import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorkerUrl?: (moduleId: string, label: string) => string;
      getWorker?: (moduleId: string, label: string) => Worker;
    };
  }
}

const monacoVsBasePath = '/assets/monaco/vs';
const monacoVsBaseUrl = new URL(monacoVsBasePath + '/', document.baseURI).toString();

function monacoWorkerUrl(label: string): string {
  switch (label) {
    case 'json':
      return new URL('language/json/json.worker.js', monacoVsBaseUrl).toString();
    case 'css':
    case 'scss':
    case 'less':
      return new URL('language/css/css.worker.js', monacoVsBaseUrl).toString();
    case 'html':
    case 'handlebars':
    case 'razor':
      return new URL('language/html/html.worker.js', monacoVsBaseUrl).toString();
    case 'typescript':
    case 'javascript':
      return new URL('language/typescript/ts.worker.js', monacoVsBaseUrl).toString();
    default:
      return new URL('base/worker/workerMain.js', monacoVsBaseUrl).toString();
  }
}

(globalThis as any).MonacoEnvironment = {
  getWorkerUrl: (_moduleId: string, label: string) => monacoWorkerUrl(label),
  getWorker: (_moduleId: string, label: string) => {
    return new Worker(monacoWorkerUrl(label));
  },
};

// Apply production mode if needed
if (environment.production) {
  enableProdMode();
}

// Bootstrap the app with the standalone API
bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
