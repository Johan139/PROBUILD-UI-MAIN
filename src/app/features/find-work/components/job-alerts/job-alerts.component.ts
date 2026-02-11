import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-job-alerts',
  templateUrl: './job-alerts.component.html',
  styleUrls: ['./job-alerts.component.scss'],
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule, MatCheckboxModule,
    MatSlideToggleModule, MatAutocompleteModule, MatTooltipModule,
    FormsModule, ReactiveFormsModule
  ]
})
export class JobAlertsComponent implements OnInit, OnDestroy {
  @Input() distance: number = 100;
  @Output() distanceChange = new EventEmitter<number>();

  @Input() selectedTrades: string[] = [];
  @Output() selectedTradesChange = new EventEmitter<string[]>();

  @Input() allTrades: string[] = [];

  alertsAddressControl = new FormControl('');
  alertsOptions: { description: string; place_id: string }[] = [];
  alertsAddressLat: number | null = null;
  alertsAddressLng: number | null = null;

  @Input() notificationPreferences = {
    email: true,
    push: true,
    sms: false
  };

  @Output() savePreferences = new EventEmitter<void>();

  distanceUnit = 'mi';
  presetDistances: number[] = [5, 10, 25, 50, 100];

  private destroy$ = new Subject<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.alertsAddressControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
       if (typeof value === 'string' && value.trim()) {
          this.fetchAlertsPredictions(value);
       } else {
          this.alertsOptions = [];
       }
    });

    // Determine distance unit
    const userLocale = navigator.language || (navigator as any).userLanguage;
    if (userLocale === 'en-US' || userLocale === 'en-GB') {
      this.distanceUnit = 'mi';
    } else {
      this.distanceUnit = 'km';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchAlertsPredictions(input: string) {
      if (typeof google === 'undefined' || !google.maps || !google.maps.places) return;

      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions({ input }, (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              this.alertsOptions = predictions.map(p => ({
                  description: p.description,
                  place_id: p.place_id
              }));
          } else {
              this.alertsOptions = [];
          }
      });
  }

  onAlertsAddressSelected(event: any) {
      const selectedOption = event.option.value;
      this.alertsAddressControl.setValue(selectedOption.description, { emitEvent: false });

      // Get Details to get Lat/Lng
      const placesService = new google.maps.places.PlacesService(document.createElement('div'));
      placesService.getDetails({
          placeId: selectedOption.place_id,
          fields: ['geometry', 'formatted_address']
      }, (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
              this.alertsAddressLat = place.geometry.location.lat();
              this.alertsAddressLng = place.geometry.location.lng();
          }
      });
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.alertsAddressLat = lat;
        this.alertsAddressLng = lng;

        // Ensure Google Maps API is loaded before using Geocoder
        if (typeof google === 'undefined' || !google.maps || !google.maps.Geocoder) {
             return;
        }

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            // Extract City and Country
            let city = '';
            let country = '';

            for (const component of results[0].address_components) {
              if (component.types.includes('locality')) {
                city = component.long_name;
              } else if (component.types.includes('postal_town') && !city) {
                  // Fallback if locality is missing (common in UK)
                  city = component.long_name;
              }

              if (component.types.includes('country')) {
                country = component.short_name;
              }
            }

            // If we didn't find a city, try administrative_area_level_2 or 1
            if (!city) {
                 const admin2 = results[0].address_components.find(c => c.types.includes('administrative_area_level_2'));
                 if (admin2) city = admin2.long_name;
            }

            const formattedLocation = city && country ? `${city}, ${country}` : results[0].formatted_address;

            // Update the form control
            // emitEvent: false prevents the valueChanges subscription from firing (which does autocomplete search)
            this.alertsAddressControl.setValue(formattedLocation, { emitEvent: false });

            // Force UI update since we are in a callback
            this.cdr.detectChanges();
          } else {
            console.error('useCurrentLocation: Geocoder failed', status);
            alert('Geocoder failed due to: ' + status);
          }
        });
      },
      (error) => {
        console.error('useCurrentLocation: Error getting location', error);
        alert('Unable to retrieve your location.');
      }
    );
  }

  onDistanceChange(val: number) {
      this.distanceChange.emit(val);
  }

  setDistance(dist: number): void {
    this.distanceChange.emit(dist);
  }

  displayAlertsAddress(option: any): string {
    if (typeof option === 'string') {
      return option;
    }
    return option && option.description ? option.description : '';
  }

  selectAllTrades(): void {
    this.selectedTradesChange.emit([...this.allTrades]);
  }

  clearAllTrades(): void {
    this.selectedTradesChange.emit([]);
  }

  toggleTrade(trade: string): void {
    if (this.selectedTrades.includes(trade)) {
      this.selectedTradesChange.emit(this.selectedTrades.filter((t) => t !== trade));
    } else {
      this.selectedTradesChange.emit([...this.selectedTrades, trade]);
    }
  }
}
