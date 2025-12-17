import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { Loader } from '@googlemaps/js-api-loader';

@Injectable({
  providedIn: 'root',
})
export class MapLoaderService {
  private isApiLoaded = new BehaviorSubject<boolean>(false);
  public isApiLoaded$ = this.isApiLoaded.asObservable();
  private loader: Loader;

  constructor() {
    this.loader = new Loader({
      apiKey: environment.Google_API,
      version: 'weekly',
      libraries: ['places'],
    });

    this.loadGoogleMapsApi();
  }

  private loadGoogleMapsApi(): void {
    if (typeof window === 'undefined') {
      // Don't run in server-side rendering
      return;
    }

    if (window.google && window.google.maps) {
      this.isApiLoaded.next(true);
      return;
    }

    this.loader
      .importLibrary('maps')
      .then(() => {
        this.isApiLoaded.next(true);
      })
      .catch((e) => {
        console.error('Error loading Google Maps API:', e);
        this.isApiLoaded.next(false);
      });
  }
}
