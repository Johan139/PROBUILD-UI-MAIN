import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  AfterViewInit,
  ViewChild,
  NgZone,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { ThemeService } from '../../../theme.service';
import { ProfileService } from '../profile.service'; // ✅ added
import { UserAddress } from '../profile.model';

const lightMapId = 'cfb7ea445a870af896b65c20';
const darkMapId = 'cfb7ea445a870af82d9def4b';

@Component({
  selector: 'app-address-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit Address' : 'Add New Address' }}</h2>

    <mat-dialog-content class="dialog-content">
      <form
        [formGroup]="form"
        (ngSubmit)="onSave()"
        class="address-dialog-form"
      >
        <!-- Autocomplete Address Field -->
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Address</mat-label>
          <input
            #addressInput
            matInput
            placeholder="Start typing an address"
            formControlName="formattedAddress"
          />
        </mat-form-field>

        <!-- ✅ Dynamic Address Type -->
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Address Type</mat-label>
          <mat-select formControlName="addressType" required>
            <mat-option *ngFor="let t of addressTypes" [value]="t.id">
              {{ t.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <div #mapContainer class="map-container" *ngIf="mapReady"></div>

        <div class="buttons">
          <button
            mat-raised-button
            class="dialog-btn-primary"
            type="submit"
            [disabled]="form.invalid"
          >
            {{ data ? 'Update' : 'Save' }}
          </button>

          <button
            mat-button
            mat-dialog-close
            type="button"
            class="dialog-btn-cancel"
          >
            Cancel
          </button>
        </div>
      </form>
    </mat-dialog-content>
  `,
  styles: [
    `
      .address-dialog-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-width: 500px;
      }
      .full-width {
        width: 100%;
      }
      .map-container {
        height: 250px;
        width: 100%;
        border-radius: 8px;
        overflow: hidden;
        margin-top: 0.5rem;
      }
      .buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 8px;
      }
    `,
  ],
})
export class AddressDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  form: FormGroup;
  map?: google.maps.Map;
  userLatitude: number | null = null;
  userLongitude: number | null = null;
  marker?: google.maps.Marker;
  mapReady = false;
  addressTypes: { id: string; name: string; description?: string }[] = []; // ✅ added
  private currentTheme: 'light' | 'dark' = 'light';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddressDialogComponent>,
    private zone: NgZone,
    private themeService: ThemeService,
    private profileService: ProfileService, // ✅ added
    @Inject(MAT_DIALOG_DATA) public data: UserAddress | null,
  ) {
    this.form = this.fb.group({
      id: [data?.id || null],
      formattedAddress: [data?.formattedAddress || '', Validators.required],
      latitude: [data?.latitude || null],
      longitude: [data?.longitude || null],
      googlePlaceId: [data?.googlePlaceId || ''],
      streetNumber: [data?.streetNumber || ''],
      streetName: [data?.streetName || ''],
      city: [data?.city || ''],
      state: [data?.state || ''],
      postalCode: [data?.postalCode || ''],
      country: [data?.country || ''],
      countryCode: [data?.countryCode || ''],
      addressType: [data?.addressType || null, Validators.required], // ✅
    });

    effect(() => {
      const isDark = this.themeService.isDarkMode();
      this.currentTheme = isDark ? 'dark' : 'light';
      this.applyMapTheme(this.currentTheme);
    });
  }

  ngOnInit(): void {
    this.loadAddressTypes(); // ✅ dynamically populate dropdown
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLatitude = pos.coords.latitude;
          this.userLongitude = pos.coords.longitude;
          console.log(
            '📍 Dialog user location:',
            this.userLatitude,
            this.userLongitude,
          );
        },
        (err) => console.warn('Geolocation denied or failed:', err),
      );
    }
    if (!(window as any).google?.maps?.places) {
      console.error(
        '❌ Google Maps JavaScript API with Places library not loaded.',
      );
      return;
    }
  }

  private loadAddressTypes(): void {
    this.profileService.getAddressType().subscribe({
      next: (types) => (this.addressTypes = types),
      error: (err) => console.error('Failed to load address types', err),
    });
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const interval = setInterval(() => {
        if (
          this.addressInput?.nativeElement &&
          (window as any).google?.maps?.places
        ) {
          clearInterval(interval);
          this.zone.run(() => this.initAutocomplete());
        }
      }, 150);
    });

    if (this.data?.latitude && this.data?.longitude) {
      setTimeout(
        () => this.showMap(this.data!.latitude!, this.data!.longitude!),
        500,
      );
    }
  }

  private initAutocomplete(): void {
    const options: google.maps.places.AutocompleteOptions = {
      fields: [
        'geometry',
        'formatted_address',
        'place_id',
        'address_components',
      ],
    };

    // ✅ Add proximity bias if location available
    if (this.userLatitude && this.userLongitude) {
      const center = new google.maps.LatLng(
        this.userLatitude,
        this.userLongitude,
      );

      // Create a bounding box around the user's location
      const radiusInDegrees = 0.5; // ~50 km bias
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(
          center.lat() - radiusInDegrees,
          center.lng() - radiusInDegrees,
        ),
        new google.maps.LatLng(
          center.lat() + radiusInDegrees,
          center.lng() + radiusInDegrees,
        ),
      );

      options.bounds = bounds;
      options.strictBounds = false; // allows suggestions outside box but biases inside
    }

    const autocomplete = new google.maps.places.Autocomplete(
      this.addressInput.nativeElement,
      options,
    );

    autocomplete.addListener('place_changed', () => {
      this.zone.run(() => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.formatted_address) return;

        const lat = place.geometry.location?.lat() || 0;
        const lng = place.geometry.location?.lng() || 0;
        const components = this.parseAddressComponents(
          place.address_components || [],
        );

        this.form.patchValue({
          formattedAddress: place.formatted_address,
          latitude: lat,
          longitude: lng,
          googlePlaceId: place.place_id,
          ...components,
        });

        this.showMap(lat, lng);
      });
    });
  }

  private parseAddressComponents(
    components: google.maps.GeocoderAddressComponent[],
  ) {
    const get = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name || '';
    const getShort = (type: string) =>
      components.find((c) => c.types.includes(type))?.short_name || '';
    return {
      streetNumber: get('street_number'),
      streetName: get('route'),
      city:
        get('locality') ||
        get('sublocality') ||
        get('administrative_area_level_2'),
      state: get('administrative_area_level_1'),
      postalCode: get('postal_code'),
      country: get('country'),
      countryCode: getShort('country'),
    };
  }

  private showMap(lat: number, lng: number): void {
    this.mapReady = true;
    setTimeout(() => {
      const mapId = this.currentTheme === 'dark' ? darkMapId : lightMapId;
      if (!this.map) {
        this.map = new google.maps.Map(this.mapContainer.nativeElement, {
          center: { lat, lng },
          zoom: 15,
          mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        this.marker = new google.maps.Marker({
          position: { lat, lng },
          map: this.map,
        });
      } else {
        this.map.setOptions({ mapId });
        this.map.setCenter({ lat, lng });
        this.marker?.setPosition({ lat, lng });
      }
    }, 100);
  }

  private applyMapTheme(theme: 'light' | 'dark'): void {
    if (!this.map) return;
    const mapId = theme === 'dark' ? darkMapId : lightMapId;
    this.map.setOptions({ mapId });
  }

  onSave(): void {
    console.log(this.form.value);
    if (this.form.valid) this.dialogRef.close(this.form.value);
  }
}
