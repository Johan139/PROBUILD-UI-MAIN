import { Injectable, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable, of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

const BASE_URL = environment.BACKEND_URL;

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private isGoogleMapsLoaded = false;

  constructor(
    private httpClient: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.Google_API}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (typeof google !== 'undefined' && google.maps) {
          this.isGoogleMapsLoaded = true;
          resolve();
        } else {
          reject(
            new Error(
              'Google Maps API script loaded but google object is not defined'
            )
          );
        }
      };
      script.onerror = (error) => {
        console.error('Google Maps script failed to load:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  getPlacePredictions(
    input: string | null
  ): Observable<{ description: string; place_id: string }[]> {
    if (!input || !this.isGoogleMapsLoaded) {
      return of([]);
    }
    const autocompleteService = new google.maps.places.AutocompleteService();
    return new Observable((observer) => {
      autocompleteService.getPlacePredictions(
        { input, componentRestrictions: { country: 'us' }, types: ['address'] },
        (predictions, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            observer.next(
              predictions.map((p) => ({
                description: p.description,
                place_id: p.place_id,
              }))
            );
          } else {
            observer.next([]);
          }
          observer.complete();
        }
      );
    });
  }

  onAddressSelected(
    event: MatAutocompleteSelectedEvent,
    addressInput: ElementRef<HTMLInputElement>
  ): Observable<any> {
    const selectedOption = event.option.value;
    if (!selectedOption || !selectedOption.place_id) {
      return of(null);
    }

    if (!addressInput?.nativeElement) {
      return of(null);
    }
    const placesService = new google.maps.places.PlacesService(
      addressInput.nativeElement
    );

    return new Observable((observer) => {
      placesService.getDetails(
        {
          placeId: selectedOption.place_id,
          fields: [
            'address_components',
            'formatted_address',
            'geometry',
            'name',
            'place_id',
          ],
        },
        (place, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            place
          ) {
            const getAddressComponent = (
              components: google.maps.GeocoderAddressComponent[],
              type: string
            ) => {
              const component = components.find((c) => c.types.includes(type));
              return component ? component.long_name : '';
            };

            if (
              place.address_components &&
              place.geometry &&
              place.geometry.location
            ) {
              const selectedAddress = {
                streetNumber: getAddressComponent(
                  place.address_components,
                  'street_number'
                ),
                streetName: getAddressComponent(
                  place.address_components,
                  'route'
                ),
                city: getAddressComponent(place.address_components, 'locality'),
                state: getAddressComponent(
                  place.address_components,
                  'administrative_area_level_1'
                ),
                zipCode: getAddressComponent(
                  place.address_components,
                  'postal_code'
                ),
                country: getAddressComponent(
                  place.address_components,
                  'country'
                ),
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng(),
                formatted_address: place.formatted_address,
                google_place_id: place.place_id,
              };
              observer.next({
                place,
                selectedAddress,
                description: selectedOption.description,
              });
            } else {
              observer.next(null);
            }
          } else {
            observer.next(null);
          }
          observer.complete();
        }
      );
    });
  }

  saveAddress(jobId: string, selectedAddress: any): Observable<any> {
    if (!selectedAddress || !jobId) {
      this.snackBar.open(
        'Please select a valid address from the suggestions.',
        'Close',
        { duration: 3000 }
      );
      return of(null);
    }

    return this.httpClient.put(
      `${BASE_URL}/Jobs/${jobId}/address`,
      selectedAddress
    );
  }
}
