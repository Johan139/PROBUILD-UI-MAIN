import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GooglePlacesService {
  private autocomplete?: google.maps.places.AutocompleteService;
  private isLoaded = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async load(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.isLoaded) return;

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.Google_API}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });

    this.autocomplete = new google.maps.places.AutocompleteService();
    this.isLoaded = true;
  }
  getPlaceDetails(
    placeId: string,
  ): Promise<google.maps.places.PlaceResult | null> {
    return new Promise((resolve) => {
      const svc = new google.maps.places.PlacesService(
        document.createElement('div'),
      );

      svc.getDetails(
        {
          placeId,
          fields: [
            'place_id',
            'geometry',
            'formatted_address',
            'address_components',
          ],
        },
        (place, status) => {
          resolve(
            status === google.maps.places.PlacesServiceStatus.OK ? place : null,
          );
        },
      );
    });
  }
  getPredictions(
    input: string,
    location?: { lat: number; lng: number },
    radius = 50000,
  ): Promise<google.maps.places.AutocompletePrediction[]> {
    if (!this.autocomplete || !input.trim()) return Promise.resolve([]);

    return new Promise((resolve) => {
      const req: google.maps.places.AutocompletionRequest = { input };

      if (location) {
        req.location = new google.maps.LatLng(location.lat, location.lng);
        req.radius = radius;
      }

      this.autocomplete!.getPlacePredictions(req, (preds, status) => {
        resolve(
          status === google.maps.places.PlacesServiceStatus.OK && preds
            ? preds
            : [],
        );
      });
    });
  }
}
