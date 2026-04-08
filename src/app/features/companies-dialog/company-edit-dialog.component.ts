import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { GooglePlacesService } from '../../services/google-places.service';

import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { startWith, map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { RegistrationService } from '../../services/registration.service';
import { MatOptionModule } from '@angular/material/core';

export interface CountryCode {
  id: string;
  countryCode: string;
  countryPhoneNumberCode: string;
}

export interface CompanyDetails {
  name?: string;
  email?: string;
  phoneNumber?: string;
  vatNo?: string;
  address?: CompanyAddressDTO; // 👈 Change from string to object
  countryNumberCode?: string; // 👈 Add this
}

interface CompanyAddressDTO {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  googlePlaceId?: string;
}

@Component({
  standalone: true,
  selector: 'app-company-edit-dialog',
  templateUrl: './company-edit-dialog.component.html',
  styleUrls: ['./company-edit-dialog.component.scss'],
  imports: [
    ReactiveFormsModule,

    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatOptionModule,
    CommonModule,
    MatDialogModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
  ],
})
export class CompanyEditDialogComponent {
  form!: FormGroup;

  countryCodes: CountryCode[] = [];
  filteredCountryCodes!: Observable<CountryCode[]>;
  countryFilterCtrl = new FormControl('');
  selectedCompanyCountryCode!: CountryCode;
  companyAddressOptions: google.maps.places.AutocompletePrediction[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CompanyEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CompanyDetails,
    private registrationService: RegistrationService,
    private googlePlaces: GooglePlacesService,
  ) {
    const addressStr = data?.address
      ? typeof data.address === 'string'
        ? data.address
        : data.address?.formattedAddress || ''
      : '';

    this.form = this.fb.group({
      name: [data?.name ?? '', Validators.required],
      email: [data?.email ?? ''],
      phoneNumber: [data?.phoneNumber ?? ''],
      countryNumberCode: [data?.countryNumberCode ?? ''],
      vatNo: [data?.vatNo ?? ''],
      addressInput: [addressStr], // 👈 Set the string here
      address: [data?.address ?? null],
    });
  }

  ngOnInit(): void {
    this.googlePlaces.load();

    this.registrationService.getAllCountryNumberCodes().subscribe((codes) => {
      this.countryCodes = codes;

      this.selectedCompanyCountryCode =
        codes.find((c) => c.countryCode === 'ZA') || codes[0];

      this.form.patchValue({
        countryNumberCode: this.selectedCompanyCountryCode.id,
      });

      this.filteredCountryCodes = this.countryFilterCtrl.valueChanges.pipe(
        startWith(''),
        map((v) => this.filterCountryCodes(v ?? '')),
      );

      // ✅ MOVE THIS HERE - after country codes are loaded
      if (this.data?.address) {
        const addressStr =
          typeof this.data.address === 'string'
            ? this.data.address
            : this.data.address?.formattedAddress || '';

        this.form.patchValue({
          addressInput: addressStr,
          address: this.data.address,
        });
      }
    });

    this.form.get('addressInput')?.valueChanges.subscribe(async (value) => {
      if (typeof value !== 'string') {
        this.companyAddressOptions = [];
        return;
      }

      const input = value.trim();
      if (!input) {
        this.companyAddressOptions = [];
        return;
      }

      this.companyAddressOptions =
        await this.googlePlaces.getPredictions(input);
    });
  }

  private filterCountryCodes(value: string): CountryCode[] {
    const v = (value || '').toLowerCase();
    return this.countryCodes.filter(
      (c) =>
        c.countryCode.toLowerCase().includes(v) ||
        c.countryPhoneNumberCode.toLowerCase().includes(v),
    );
  }

  onCompanyCountryChanged(): void {
    const dial = this.selectedCompanyCountryCode?.countryPhoneNumberCode;
    const ctrl = this.form.get('phoneNumber');
    if (!dial || !ctrl) return;

    this.form.patchValue({
      countryNumberCode: this.selectedCompanyCountryCode.id,
    });

    const digits = String(ctrl.value || '')
      .replace(/^\+\d{1,4}/, '')
      .replace(/\D/g, '')
      .replace(/^0+/, '');

    ctrl.setValue(digits ? dial + digits : dial, { emitEvent: false });
  }
  async onCompanyAddressSelected(
    event: MatAutocompleteSelectedEvent,
  ): Promise<void> {
    const description = event.option.value; // This is now the description string

    // Find the original prediction object from the array
    const selected = this.companyAddressOptions.find(
      (opt) => opt.description === description,
    );

    if (!selected?.place_id) return;

    const place = await this.googlePlaces.getPlaceDetails(selected.place_id);
    if (!place) return;

    const components = place.address_components || [];
    const get = (t: string) =>
      components.find((c) => c.types.includes(t))?.long_name || '';

    const payload = {
      streetNumber: get('street_number'),
      streetName: get('route'),
      city: get('locality'),
      state: get('administrative_area_level_1'),
      postalCode: get('postal_code'),
      country: get('country'),
      latitude: place.geometry?.location?.lat() ?? null,
      longitude: place.geometry?.location?.lng() ?? null,
      formattedAddress: place.formatted_address,
      googlePlaceId: place.place_id,
    };

    this.form.patchValue(
      {
        address: payload,
        addressInput: payload.formattedAddress || '',
      },
      { emitEvent: false },
    );

    this.companyAddressOptions = [];
  }

  onPhoneFocus(event: FocusEvent): void {
    const dial = this.selectedCompanyCountryCode?.countryPhoneNumberCode;
    if (!dial) return;

    const input = event.target as HTMLInputElement;
    const ctrl = this.form.get('phoneNumber');
    const value = ctrl?.value || '';

    if (!value.startsWith(dial)) {
      ctrl?.setValue(dial, { emitEvent: false });
      setTimeout(() => input.setSelectionRange(dial.length, dial.length));
    }
  }

  onPhoneKeyDown(event: KeyboardEvent): void {
    const dial = this.selectedCompanyCountryCode?.countryPhoneNumberCode;
    if (!dial) return;

    const input = event.target as HTMLInputElement;
    const pos = input.selectionStart ?? 0;

    if (
      (event.key === 'Backspace' && pos <= dial.length) ||
      (event.key === 'Delete' && pos < dial.length) ||
      (event.key === 'ArrowLeft' && pos <= dial.length)
    ) {
      event.preventDefault();
    }

    if (event.key.length === 1 && !/[0-9]/.test(event.key)) {
      event.preventDefault();
    }
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const dial = this.selectedCompanyCountryCode?.countryPhoneNumberCode;
    const ctrl = this.form.get('phoneNumber');
    if (!dial || !ctrl) return;

    const pasted = event.clipboardData?.getData('text') || '';
    const clean = pasted.replace(/[^\d]/g, '').replace(/^0+/, '');
    ctrl.setValue(dial + clean, { emitEvent: false });
  }
  displayAddress = (option: any): string => {
    return option?.description || '';
  };

  save(): void {
    this.submit();
  }
  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const formValue = this.form.value;

    this.dialogRef.close(formValue);
  }
  cancel(): void {
    this.dialogRef.close(null);
  }
}
