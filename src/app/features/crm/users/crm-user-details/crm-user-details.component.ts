import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ViewChild,
  inject,
} from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Observable } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';

import {
  AsYouType,
  CountryCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';

import { GooglePlacesService } from '../../../../services/google-places.service';
import { RegistrationService } from '../../../../services/registration.service';

import {
  CrmUsersService,
  CrmUserDetails,
  CrmSubscriptionPackageOption,
} from '../crm-users.service';

@Component({
  selector: 'app-crm-user-details',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatOptionModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './crm-user-details.component.html',
  styleUrls: ['./crm-user-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmUserDetailsComponent {
  private route = inject(ActivatedRoute);
  private crmUsersService = inject(CrmUsersService);
  private googlePlaces = inject(GooglePlacesService);
  private registrationService = inject(RegistrationService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild(MatAutocompleteTrigger) addressAutoTrigger?: MatAutocompleteTrigger;

  saving = false;

  user$ = this.route.paramMap.pipe(
    switchMap((params) => {
      const id = params.get('id');
      if (!id) throw new Error('Missing user id');
      return this.crmUsersService.getById(id);
    }),
    tap((user) => this.patchForm(user)),
  );

  subscriptionPackages$: Observable<CrmSubscriptionPackageOption[]> =
    this.crmUsersService.getSubscriptionPackages();

  address$ = this.route.paramMap.pipe(
    switchMap((params) => {
      const id = params.get('id');
      if (!id) throw new Error('Missing user id');
      return this.crmUsersService.getPrimaryAddress(id);
    }),
    tap((address) => this.patchAddressForm(address)),
  );

  countryCodes: any[] = [];
  selectedCountryCode: any;
  countryFilterCtrl = new FormControl('');
  filteredCountryCodes!: Observable<any[]>;

  form = new FormGroup({
    firstName: new FormControl<string>(''),
    lastName: new FormControl<string>(''),
    email: new FormControl<string>(''),
    emailConfirmed: new FormControl<boolean>(false, { nonNullable: true }),
    phoneNumber: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, this.phoneValidator()],
    }),
    countryNumberCode: new FormControl<string>(''),
    userType: new FormControl<string>(''),
    isAdmin: new FormControl<boolean>(false, { nonNullable: true }),
    companyName: new FormControl<string>(''),
    companyRegNo: new FormControl<string>(''),
    vatNo: new FormControl<string>(''),
    trade: new FormControl<string>(''),
    supplierType: new FormControl<string>(''),
    subscriptionPackage: new FormControl<string>(''),
    isActive: new FormControl<boolean>(true, { nonNullable: true }),
    isVerified: new FormControl<boolean>(false, { nonNullable: true }),
  });

  addressForm = new FormGroup({
    addressInput: new FormControl<any>(''),
    streetNumber: new FormControl<string>(''),
    streetName: new FormControl<string>(''),
    city: new FormControl<string>(''),
    state: new FormControl<string>(''),
    postalCode: new FormControl<string>(''),
    country: new FormControl<string>(''),
    countryCode: new FormControl<string>(''),
    latitude: new FormControl<number | null>(null),
    longitude: new FormControl<number | null>(null),
    formattedAddress: new FormControl<string>(''),
    googlePlaceId: new FormControl<string>(''),
    addressType: new FormControl<string>(''),
  });

  addressOptions: google.maps.places.AutocompletePrediction[] = [];
  private suppressAddressSearch = false;

  addressDisplayFn = (option: any): string => {
    if (!option) return '';
    return typeof option === 'string' ? option : option.description;
  };

  readonly userTypes: string[] = [
    'Client',
    'Contractor',
    'Supplier',
    'Admin',
  ];

  save(user: CrmUserDetails) {
    this.saving = true;

    const payload: any = {
      ...this.form.getRawValue(),
      ...this.addressForm.getRawValue(),
    };

    this.buildPhoneForSubmit(payload);

    this.crmUsersService.update(user.id, payload).subscribe({
      next: () => {
        this.saving = false;
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  sendPasswordReset(user: CrmUserDetails) {
    this.crmUsersService.sendPasswordReset(user.id).subscribe();
  }

  async onAddressSelected(selected: google.maps.places.AutocompletePrediction) {
    if (!selected?.place_id) return;

    const place = await this.googlePlaces.getPlaceDetails(selected.place_id);
    if (!place) return;

    const components = place.address_components || [];
    const get = (t: string) =>
      components.find((c) => c.types.includes(t))?.long_name || '';
    const getShort = (t: string) =>
      components.find((c) => c.types.includes(t))?.short_name || '';

    const latitude = place.geometry?.location?.lat() ?? null;
    const longitude = place.geometry?.location?.lng() ?? null;

    this.suppressAddressSearch = true;

    this.addressForm.patchValue(
      {
        addressInput: {
          description: place.formatted_address || selected.description,
          place_id: place.place_id,
        } as any,
        formattedAddress: place.formatted_address || selected.description,
        streetNumber: get('street_number'),
        streetName: get('route'),
        city: get('locality'),
        state: get('administrative_area_level_1'),
        postalCode: get('postal_code'),
        country: get('country'),
        countryCode: getShort('country'),
        latitude,
        longitude,
        googlePlaceId: place.place_id || '',
      },
      { emitEvent: false },
    );

    this.addressOptions = [];
    this.suppressAddressSearch = false;

    requestAnimationFrame(() => {
      this.addressAutoTrigger?.closePanel();
      (document.activeElement as HTMLElement | null)?.blur?.();
    });
  }

  private _filterCountryCodes(value: string): any[] {
    const search = (value || '').toLowerCase().trim();
    if (!search) return this.countryCodes;
    return this.countryCodes.filter(
      (c) =>
        c.countryCode?.toLowerCase().includes(search) ||
        c.countryPhoneNumberCode?.toLowerCase().includes(search),
    );
  }

  onCountryCodeChange(selected: any): void {
    this.selectedCountryCode = selected;
    this.form.get('phoneNumber')?.updateValueAndValidity();
    this.form.get('countryNumberCode')?.setValue(selected?.id || '', {
      emitEvent: false,
    });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const inputEvent = event as InputEvent;

    if (inputEvent.inputType?.startsWith('delete')) {
      this.form.get('phoneNumber')?.setValue(input.value, { emitEvent: false });
      return;
    }

    const countryCode = (this.selectedCountryCode?.countryCode || 'US') as CountryCode;
    const formatted = new AsYouType(countryCode).input(input.value);
    this.form.get('phoneNumber')?.setValue(formatted, { emitEvent: false });
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    const countryCode = (this.selectedCountryCode?.countryCode || 'ZA') as CountryCode;
    const parsed = parsePhoneNumberFromString(pasted, countryCode);
    if (parsed) {
      this.form
        .get('phoneNumber')
        ?.setValue(parsed.formatNational(), { emitEvent: false });
    } else {
      const formatted = new AsYouType(countryCode).input(pasted);
      this.form.get('phoneNumber')?.setValue(formatted, { emitEvent: false });
    }
  }

  onPhoneBlur(event: FocusEvent): void {
    const ctrl = this.form.get('phoneNumber');
    const value = ctrl?.value || '';
    const countryCode = (this.selectedCountryCode?.countryCode || 'ZA') as CountryCode;
    const parsed = parsePhoneNumberFromString(value, countryCode);
    if (parsed && parsed.isValid()) {
      ctrl?.setValue(parsed.formatNational(), { emitEvent: false });
    }
    ctrl?.markAsTouched();
  }

  private buildPhoneForSubmit(formValue: any): void {
    const value = formValue.phoneNumber || '';
    const countryCode = (this.selectedCountryCode?.countryCode || 'ZA') as CountryCode;
    const parsed = parsePhoneNumberFromString(value, countryCode);
    formValue.phoneNumber = parsed ? parsed.format('E.164') : value;
    formValue.countryNumberCode = this.selectedCountryCode?.id || null;
  }

  private phoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const countryCode = (this.selectedCountryCode?.countryCode || 'ZA') as CountryCode;
      const parsed = parsePhoneNumberFromString(value, countryCode);

      if (!parsed || !parsed.isValid()) {
        return { invalidPhone: true };
      }
      return null;
    };
  }

  private patchForm(user: CrmUserDetails) {
    this.form.patchValue(
      {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        emailConfirmed: !!user.emailConfirmed,
        phoneNumber: user.phoneNumber || '',
        countryNumberCode: user.countryNumberCode || '',
        userType: user.userType || '',
        isAdmin: !!user.isAdmin,
        companyName: user.companyName || '',
        companyRegNo: user.companyRegNo || '',
        vatNo: user.vatNo || '',
        trade: user.trade || '',
        supplierType: user.supplierType || '',
        subscriptionPackage: user.subscriptionPackage || '',
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
      { emitEvent: false },
    );

    if (this.countryCodes.length) {
      this.selectedCountryCode =
        this.countryCodes.find((c: any) => c.id === user.countryNumberCode)
        || this.selectedCountryCode;
    }
  }

  constructor() {
    this.registrationService.getAllCountryNumberCodes().subscribe((data) => {
      this.countryCodes = data;
      const currentId = this.form.get('countryNumberCode')?.value;
      this.selectedCountryCode =
        data.find((c: any) => c.id === currentId)
        || data.find((c: any) => c.countryCode === 'US')
        || data[0];

      if (this.selectedCountryCode?.id && !currentId) {
        this.form.get('countryNumberCode')?.setValue(this.selectedCountryCode.id, {
          emitEvent: false,
        });
      }

      this.filteredCountryCodes = this.countryFilterCtrl.valueChanges.pipe(
        startWith(''),
        debounceTime(100),
        distinctUntilChanged(),
        map((v) => this._filterCountryCodes(v ?? '')),
      );
    });

    this.addressForm
      .get('addressInput')
      ?.valueChanges.pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(async (value) => {
        if (this.suppressAddressSearch) return;
        if (typeof value !== 'string') {
          this.addressOptions = [];
          this.cdr.markForCheck();
          return;
        }
        const input = value.trim();
        if (!input) {
          this.addressOptions = [];
          this.cdr.markForCheck();
          return;
        }
        await this.googlePlaces.load();
        this.addressOptions = await this.googlePlaces.getPredictions(input);

        this.cdr.markForCheck();
        if (this.addressOptions.length) {
          requestAnimationFrame(() => this.addressAutoTrigger?.openPanel());
        }
      });
  }

  private patchAddressForm(address: any) {
    if (!address) {
      this.addressForm.reset(
        {
          addressInput: '',
          streetNumber: '',
          streetName: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          countryCode: '',
          latitude: null,
          longitude: null,
          formattedAddress: '',
          googlePlaceId: '',
          addressType: '',
        },
        { emitEvent: false },
      );
      return;
    }

    this.suppressAddressSearch = true;

    this.addressForm.patchValue(
      {
        addressInput: {
          description: address.formattedAddress || '',
          place_id: address.googlePlaceId || '',
        },
        streetNumber: address.streetNumber || '',
        streetName: address.streetName || '',
        city: address.city || '',
        state: address.state || '',
        postalCode: address.postalCode || '',
        country: address.country || '',
        countryCode: address.countryCode || '',
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
        formattedAddress: address.formattedAddress || '',
        googlePlaceId: address.googlePlaceId || '',
        addressType: address.addressType || '',
      },
      { emitEvent: false },
    );

    this.suppressAddressSearch = false;
    this.cdr.markForCheck();
  }

  fullName(user: any) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  }
}
