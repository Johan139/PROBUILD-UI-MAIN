import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  FormControl,
  AbstractControl,
  ValidatorFn,
  ValidationErrors,
} from '@angular/forms';
import { AsyncPipe, CommonModule, NgForOf, NgIf } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import {
  parsePhoneNumberFromString,
  AsYouType,
  CountryCode,
} from 'libphonenumber-js';
import { environment } from '../../../environments/environment';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
} from 'rxjs/operators';
import { InvitationService } from '../../services/invitation.service';
import { merge, Observable, of } from 'rxjs';
import { LoaderComponent } from '../../loader/loader.component';
import { MatDivider } from '@angular/material/divider';
import {
  PaymentIntentRequest,
  StripeService,
} from '../../services/StripeService';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PaymentPromptDialogComponent } from './payment-prompt-dialog.component';
import { TermsConfirmationDialogComponent } from './terms-confirmation-dialog/terms-confirmation-dialog.component';
import { COUNTRIES } from '../../data/countries';
import { STATES } from '../../data/states';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { userTypes } from '../../data/user-types';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { combineLatest } from 'rxjs';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import {
  constructionTypes,
  trades,
  supplierTypes,
  supplierProducts,
  deliveryAreas,
  preferenceOptions,
  leadTimeDelivery,
  availabilityOptions,
  employeeNumber,
  operationalYears,
  certificationOptions,
} from '../../data/registration-data';
import { RegistrationService } from '../../services/registration.service';
import {
  ElementRef,
  Inject,
  PLATFORM_ID,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ProfileService } from '../profile/profile.service';
declare const google: any;
const BASE_URL = environment.BACKEND_URL;

export interface SubscriptionOption {
  id: number;
  subscription: string;
  amount: number;
}
export type BillingCycle = 'monthly' | 'yearly';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [
    MatCardModule,
    CommonModule,
    MatGridListModule,
    MatGridListModule,
    ReactiveFormsModule,
    NgForOf,
    MatSelectModule,
    MatDialogModule,
    NgIf,
    MatInputModule,
    MatFormFieldModule,
    MatButton,
    LoaderComponent,
    MatDivider,
    MatAutocompleteModule,
    AsyncPipe,
    MatCheckboxModule,
    MatChipsModule,
    MatRadioModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss',
})
export class RegistrationComponent implements OnInit {
  @ViewChild('countryAutoTrigger') countryAutoTrigger!: MatAutocompleteTrigger;
  @ViewChild('stateAutoTrigger') stateAutoTrigger!: MatAutocompleteTrigger;
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;

  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '';
  token: string | null = null;
  isBrowser: boolean | undefined;
  isGoogleMapsLoaded: boolean = false;
  autocomplete!: google.maps.places.Autocomplete;

  constructionTypes = constructionTypes;
  trades = trades;
  supplierTypes = supplierTypes;
  supplierProducts = supplierProducts;
  deliveryAreas = deliveryAreas;
  preferenceOptions = preferenceOptions;
  leadTimeDelivery = leadTimeDelivery;
  availabilityOptions = availabilityOptions;
  employeeNumber = employeeNumber;
  operationalYears = operationalYears;
  certificationOptions = certificationOptions;
  showOnlyBasicFields = true;

  private emailCheckCache = new Map<string, boolean>();
  private emailCheckInFlight = false;

  subscriptionPackages: {
    value: string;
    display: string;
    amount: number;
    annualAmount: number;
  }[] = [];

  countries: any[] = [];
  states: any[] = [];
  countryNumberCode: any[] = [];
  selectedCountryCode: any;
  addressTypes: { id: string; name: string; description?: string }[] = [];

  countryFilterCtrl = new FormControl('');
  filteredCountryCodes!: Observable<any[]>;

  userTypes = userTypes;
  separatorKeysCodes: number[] = [ENTER, COMMA];
  selectedPlanFromUrl: string | null = null;

  tradeCtrl = new FormControl();
  filteredTrades: Observable<{ value: string; display: string }[]>;
  selectedTrades: { value: string; display: string }[] = [];
  selectedBillingFromUrl: string | null = null;

  supplierTypeCtrl = new FormControl();
  filteredSupplierTypes: Observable<{ value: string; display: string }[]>;
  selectedSupplierTypes: { value: string; display: string }[] = [];

  hidePassword = true;
  registrationForm: FormGroup;
  user: string = '';
  certified = false;
  isLoading: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private formBuilder: FormBuilder,
    private httpClient: HttpClient,
    private router: Router,
    private stripeService: StripeService,
    private registrationService: RegistrationService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private invitationService: InvitationService,
    private profileService: ProfileService,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.registrationForm = this.formBuilder.group({});
    this.filteredTrades = this.tradeCtrl.valueChanges.pipe(
      startWith(null),
      map((value) => {
        const searchString = (
          (typeof value === 'string' ? value : '') || ''
        ).toLowerCase();
        return this.trades.filter(
          (trade) =>
            !this.selectedTrades.some((st) => st.value === trade.value) &&
            trade.display.toLowerCase().includes(searchString),
        );
      }),
    );
    this.filteredSupplierTypes = this.supplierTypeCtrl.valueChanges.pipe(
      startWith(null),
      map((value) => {
        const searchString = (
          (typeof value === 'string' ? value : '') || ''
        ).toLowerCase();
        return this.supplierTypes.filter(
          (type) =>
            !this.selectedSupplierTypes.some((st) => st.value === type.value) &&
            type.display.toLowerCase().includes(searchString),
        );
      }),
    );
  }

  private _filterCountryCodes(value: string): any[] {
    const search = (value || '').toLowerCase().trim();
    if (!search) return this.countryNumberCode;
    return this.countryNumberCode.filter(
      (c) =>
        c.countryCode?.toLowerCase().includes(search) ||
        c.countryPhoneNumberCode?.toLowerCase().includes(search),
    );
  }

  ngOnInit() {
    this.loadSubscriptionPackages();
    const plan = this.route.snapshot.queryParamMap.get('plan');
    let billing = this.route.snapshot.queryParamMap
      .get('billing')
      ?.toLowerCase() as BillingCycle | null;

    if (billing !== 'monthly' && billing !== 'yearly') {
      billing = 'monthly';
    }

    this.profileService.getAddressType().subscribe({
      next: (types) => (this.addressTypes = types),
      error: (err) => console.error('Failed to load address types', err),
    });

    this.selectedPlanFromUrl = plan?.toLowerCase() ?? null;
    this.selectedBillingFromUrl = billing;

    this.registrationForm = this.formBuilder.group({
      firstName: [{ value: '', disabled: true }, Validators.required],
      lastName: [{ value: '', disabled: true }, Validators.required],
      phoneNumber: ['', [Validators.required, this.phoneValidator()]],
      email: [
        { value: '', disabled: true },
        [Validators.required, Validators.email],
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.pattern(
            /^(?=.*[A-Z])(?=.*[a-z])(?=.*[!\@\#\$\%\^\&\*\?\_\-])[A-Za-z\d!\@\#\$\%\^\&\*\?\_\-]{10,}$/,
          ),
        ],
      ],
      companyName: [''],
      companyRegNo: [''],
      streetNumber: [''],
      streetName: [''],
      postalCode: [''],
      countryCode: [''],
      billingCycle: ['monthly'],
      city: [''],
      state: [''],
      country: [''],
      latitude: [null],
      longitude: [null],
      formattedAddress: [''],
      googlePlaceId: [''],
      vatNo: [''],
      addressType: [''],
      userType: ['PERSONAL_USE'],
      constructionType: [],
      countryNumberCode: [''],
      nrEmployees: '',
      yearsOfOperation: '',
      certificationStatus: '',
      certificationDocumentPath: '',
      availability: '',
      subscriptionPackage: ['', Validators.required],
      projectPreferences: [],
      productsOffered: [],
      deliveryArea: [],
      deliveryTime: '',
      userName: '',
    });

    this.registrationForm
      .get('billingCycle')
      ?.setValue(this.selectedBillingFromUrl);
    this.user = 'PERSONAL_USE';

    this.registrationService.getAllCountryNumberCodes().subscribe((data) => {
      this.countryNumberCode = data;
      this.getUserMetadata().subscribe({
        next: (meta) => {
          const ipCountryCode = meta?.country_code || meta?.country || 'US';
          const detected = this.countryNumberCode.find(
            (c) => c.countryCode?.toLowerCase() === ipCountryCode.toLowerCase(),
          );
          this.selectedCountryCode =
            detected ||
            this.countryNumberCode.find((c) => c.countryCode === 'US') ||
            this.countryNumberCode[0];

          this.filteredCountryCodes = this.countryFilterCtrl.valueChanges.pipe(
            startWith(''),
            debounceTime(100),
            distinctUntilChanged(),
            map((value) => this._filterCountryCodes(value ?? '')),
          );
        },
        error: () => {
          this.selectedCountryCode =
            this.countryNumberCode.find((c) => c.countryCode === 'ZA') ||
            this.countryNumberCode[0];
        },
      });
    });

    this.registrationService.getAllStates().subscribe((allStates) => {
      this.states = allStates;
    });

    this.registrationForm.get('userType')?.valueChanges.subscribe((value) => {
      this.user = value;
      this.selectedTrades = [];
      this.selectedSupplierTypes = [];
    });

    this.route.queryParams.subscribe((params) => {
      this.token = params['token'];
      if (this.token) {
        ['country', 'state', 'city', 'subscriptionPackage'].forEach(
          (fieldName) => {
            const control = this.registrationForm.get(fieldName);
            if (control) {
              control.clearValidators();
              control.updateValueAndValidity();
            }
          },
        );

        this.registrationService.getInvitation(this.token).subscribe({
          next: (data: any) => {
            this.registrationForm.patchValue(data);
            if (data.role) {
              const userType = this.userTypes.find(
                (t) => t.display === data.role,
              );
              if (userType) {
                this.registrationForm.get('userType')?.setValue(userType.value);
                this.user = userType.value;
              }
            }
            this.registrationForm.get('userType')?.disable();
          },
          error: () => {
            this.alertMessage = 'Invalid or expired invitation token.';
            this.showAlert = true;
          },
        });
      } else {
        this.registrationForm.get('firstName')?.enable();
        this.registrationForm.get('lastName')?.enable();
        this.registrationForm.get('email')?.enable();
      }
    });

    const emailCtrl = this.registrationForm.get('email');
    if (emailCtrl && !this.token) {
      emailCtrl.valueChanges
        .pipe(
          debounceTime(600),
          distinctUntilChanged(),
          filter(() => emailCtrl.valid),
        )
        .subscribe((email: string) => {
          const normalized = email.trim().toLowerCase();
          if (this.emailCheckCache.has(normalized)) {
            this.setEmailTakenError(
              emailCtrl,
              this.emailCheckCache.get(normalized)!,
            );
            return;
          }
          if (this.emailCheckInFlight) return;
          this.emailCheckInFlight = true;
          this.registrationService.checkEmailExists(normalized).subscribe({
            next: (exists) => {
              this.emailCheckCache.set(normalized, exists);
              this.setEmailTakenError(emailCtrl, exists);
              this.emailCheckInFlight = false;
            },
            error: () => {
              this.emailCheckInFlight = false;
            },
          });
        });
    }
  }

  private setEmailTakenError(control: AbstractControl | null, exists: boolean) {
    if (!control) return;
    if (exists) {
      control.setErrors({ ...control.errors, emailTaken: true });
    } else if (control.hasError('emailTaken')) {
      const errors = { ...control.errors };
      delete errors['emailTaken'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;
    try {
      await this.loadGoogleMapsScript();
      this.isGoogleMapsLoaded = true;
      this.initAutocomplete();
    } catch (err) {
      console.error('Failed to load Google Maps API:', err);
    }
  }

  private loadGoogleMapsScript(): Promise<void> {
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
        if (typeof google !== 'undefined' && google.maps) resolve();
        else
          reject(
            new Error('Google Maps API loaded but google object not defined'),
          );
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  private initAutocomplete(): void {
    if (!this.addressInput?.nativeElement) return;
    this.autocomplete = new google.maps.places.Autocomplete(
      this.addressInput.nativeElement,
      {
        fields: [
          'address_components',
          'geometry',
          'formatted_address',
          'place_id',
        ],
        types: ['geocode'],
      },
    );
    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete.getPlace();
      if (!place.address_components) return;
      this.handlePlaceSelection(place);
    });
  }

  private handlePlaceSelection(place: any): void {
    let streetNumber = '',
      streetName = '',
      city = '',
      state = '',
      postalCode = '',
      country = '',
      countryCode = '';
    for (const component of place.address_components) {
      const types = component.types;
      if (types.includes('street_number')) streetNumber = component.long_name;
      if (types.includes('route')) streetName = component.long_name;
      if (types.includes('locality') || types.includes('sublocality'))
        city = component.long_name;
      if (types.includes('administrative_area_level_1'))
        state = component.long_name;
      if (types.includes('postal_code')) postalCode = component.long_name;
      if (types.includes('country')) {
        country = component.long_name;
        countryCode = component.short_name;
      }
    }
    this.registrationForm.patchValue({
      formattedAddress: place.formatted_address,
      streetNumber,
      streetName,
      city,
      state,
      postalCode,
      country,
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
      googlePlaceId: place.place_id,
      countryCode,
    });
  }

  countryDisplayFn = (country: any): string => {
    if (!country) return '';
    return typeof country === 'string' ? country : country.countryName;
  };
  stateDisplayFn = (state: any) => state?.stateName ?? '';

  // ─── PHONE HANDLING — Option 2 ────────────────────────────────────────────
  // phoneNumber field stores digits only, no dial code, no leading zero.
  // Dial code lives in selectedCountryCode and is combined only on submit.

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const countryCode = (this.selectedCountryCode?.countryCode ||
      'US') as CountryCode;
    // AsYouType formats as the user types (adds spaces, dashes per country standard)
    const formatted = new AsYouType(countryCode).input(input.value);
    this.registrationForm
      .get('phoneNumber')
      ?.setValue(formatted, { emitEvent: false });
    // Don't move cursor — let browser handle it naturally for typing
  }

  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    const countryCode = (this.selectedCountryCode?.countryCode ||
      'ZA') as CountryCode;

    // Try to parse the pasted number — handles +27..., 0821234567, +1800..., etc.
    const parsed = parsePhoneNumberFromString(pasted, countryCode);
    if (parsed) {
      // Format it nicely in national format for the field
      const formatted = parsed.formatNational();
      this.registrationForm
        .get('phoneNumber')
        ?.setValue(formatted, { emitEvent: false });
    } else {
      // Fallback: run through AsYouType to clean it up best we can
      const formatted = new AsYouType(countryCode).input(pasted);
      this.registrationForm
        .get('phoneNumber')
        ?.setValue(formatted, { emitEvent: false });
    }
  }

  onPhoneBlur(event: FocusEvent): void {
    const ctrl = this.registrationForm.get('phoneNumber');
    const value = ctrl?.value || '';
    const countryCode = (this.selectedCountryCode?.countryCode ||
      'ZA') as CountryCode;

    const parsed = parsePhoneNumberFromString(value, countryCode);
    if (parsed && parsed.isValid()) {
      // On blur, format as national (e.g. "082 123 4567" for ZA)
      ctrl?.setValue(parsed.formatNational(), { emitEvent: false });
    }
    ctrl?.markAsTouched();
  }

  onCountryCodeChange(selected: any): void {
    this.selectedCountryCode = selected;
    // Re-run the phone validator against the new country
    this.registrationForm.get('phoneNumber')?.updateValueAndValidity();
  }
  // ─── END PHONE HANDLING ───────────────────────────────────────────────────

  addTrade(event: any): void {
    const value = (event.value || '').trim();
    if (value) {
      const selectedTrade = this.trades.find(
        (trade) => trade.display.toLowerCase() === value.toLowerCase(),
      );
      if (selectedTrade && !this.selectedTrades.includes(selectedTrade)) {
        this.selectedTrades.push(selectedTrade);
      }
    }
    event.chipInput!.clear();
    this.registrationForm.get('tradeCtrl')!.setValue(null);
  }

  openCountryPanel() {
    const ctrl = this.registrationForm.get('country');
    if (!ctrl?.value || typeof ctrl.value === 'string') {
      setTimeout(() => this.countryAutoTrigger.openPanel());
    }
  }

  openStatePanel() {
    const ctrl = this.registrationForm.get('state');
    ctrl?.setValue(ctrl.value ?? '', { emitEvent: true });
    setTimeout(() => this.stateAutoTrigger?.openPanel());
  }

  removeTrade(trade: any): void {
    const index = this.selectedTrades.indexOf(trade);
    if (index >= 0) {
      this.selectedTrades.splice(index, 1);
      this.tradeCtrl.setValue(this.tradeCtrl.value);
    }
  }

  selectedTrade(event: any): void {
    const selectedTrade = event.option.value;
    if (!this.selectedTrades.includes(selectedTrade)) {
      this.selectedTrades.push(selectedTrade);
    }
    this.tradeCtrl.setValue(null);
  }

  addSupplierType(event: any): void {
    const value = (event.value || '').trim();
    if (value) {
      const selectedType = this.supplierTypes.find(
        (type) => type.display.toLowerCase() === value.toLowerCase(),
      );
      if (selectedType && !this.selectedSupplierTypes.includes(selectedType)) {
        this.selectedSupplierTypes.push(selectedType);
      }
    }
    event.chipInput!.clear();
    this.registrationForm.get('supplierTypeCtrl')!.setValue(null);
  }

  removeSupplierType(type: any): void {
    const index = this.selectedSupplierTypes.indexOf(type);
    if (index >= 0) {
      this.selectedSupplierTypes.splice(index, 1);
      this.supplierTypeCtrl.setValue(this.supplierTypeCtrl.value);
    }
  }

  selectedSupplierType(event: any): void {
    const selectedType = event.option.value;
    if (!this.selectedSupplierTypes.includes(selectedType)) {
      this.selectedSupplierTypes.push(selectedType);
    }
    this.supplierTypeCtrl.setValue(null);
  }

  private _filterCountries(value: any): any[] {
    const filterValue =
      typeof value === 'string'
        ? value.toLowerCase()
        : value?.countryName?.toLowerCase() || '';
    return this.countries.filter(
      (c) =>
        c.countryName.toLowerCase().includes(filterValue) ||
        c.countryCode.toLowerCase().includes(filterValue),
    );
  }

  userType(userSelected: any) {}

  private loadSubscriptionPackages(): void {
    this.stripeService.getSubscriptions().subscribe({
      next: (subscriptions) => {
        this.subscriptionPackages = subscriptions.map((s) => ({
          value: s.subscription,
          display: `${s.subscription}`,
          amount: s.amount,
          annualAmount: s.annualAmount,
        }));
        if (this.selectedPlanFromUrl) {
          const match = this.subscriptionPackages.find(
            (p) => p.value.toLowerCase() === this.selectedPlanFromUrl,
          );
          if (match) {
            this.registrationForm
              .get('subscriptionPackage')
              ?.setValue(match.value);
          }
        }
      },
      error: (err) =>
        console.error('Failed to load subscription packages:', err),
    });
  }

  certificationChange(selectedOption: any) {
    if (selectedOption === 'FULLY_LICENSED') this.certified = true;
  }

  getUserMetadata(): Observable<any> {
    return this.httpClient.get('https://ipapi.co/json/');
  }

  private getOperatingSystem(): string {
    const userAgent = navigator.userAgent;
    if (/Windows NT 10.0/.test(userAgent)) return 'Windows 10 or 11';
    if (/Windows NT 6.3/.test(userAgent)) return 'Windows 8.1';
    if (/Windows NT 6.2/.test(userAgent)) return 'Windows 8';
    if (/Windows NT 6.1/.test(userAgent)) return 'Windows 7';
    if (/Windows NT 6.0/.test(userAgent)) return 'Windows Vista';
    if (/Windows NT 5.1/.test(userAgent)) return 'Windows XP';
    if (/Mac OS X 10[\._]15/.test(userAgent)) return 'macOS Catalina';
    if (/Mac OS X 11[\._]/.test(userAgent)) return 'macOS Big Sur';
    if (/Mac OS X 12[\._]/.test(userAgent)) return 'macOS Monterey';
    if (/Mac OS X 13[\._]/.test(userAgent)) return 'macOS Ventura';
    if (/Mac OS X 14[\._]/.test(userAgent)) return 'macOS Sonoma or later';
    if (/iPhone/.test(userAgent)) return 'iOS (iPhone)';
    if (/iPad/.test(userAgent)) return 'iOS (iPad)';
    if (/Android/.test(userAgent)) {
      const match = userAgent.match(/Android\s([0-9\.]+)/);
      return match ? `Android ${match[1]}` : 'Android';
    }
    if (/Linux/.test(userAgent)) return 'Linux';
    return 'Unknown OS';
  }

  private buildPhoneForSubmit(formValue: any): void {
    const value = formValue.phoneNumber || '';
    const countryCode = (this.selectedCountryCode?.countryCode ||
      'ZA') as CountryCode;

    const parsed = parsePhoneNumberFromString(value, countryCode);
    // Always send E.164 format to backend: +27821234567
    formValue.phoneNumber = parsed ? parsed.format('E.164') : value;
    formValue.countryNumberCode = this.selectedCountryCode?.id || null;
  }

  onSubmit(): void {
    if (this.registrationForm.get('email')?.hasError('emailTaken')) {
      this.alertMessage =
        'This email is already registered. Please log in instead.';
      this.showAlert = true;
      return;
    }

    // ── Invited user flow ──────────────────────────────────────────────────
    if (this.token) {
      if (!this.registrationForm.valid) {
        this.alertMessage = 'Please fill in all required fields.';
        this.showAlert = true;
        return;
      }
      this.isLoading = true;
      const data = {
        token: this.token,
        password: this.registrationForm.get('password')?.value,
        phoneNumber: this.registrationForm.get('phoneNumber')?.value,
      };
      // Combine dial code for invited user too
      const countryCode = (this.selectedCountryCode?.countryCode ||
        'ZA') as CountryCode;
      const parsed = parsePhoneNumberFromString(
        data.phoneNumber || '',
        countryCode,
      );
      data.phoneNumber = parsed ? parsed.format('E.164') : data.phoneNumber;

      this.registrationService.registerInvited(data).subscribe({
        next: () => {
          this.isLoading = false;
          this.alertMessage = 'Registration successful. You can now log in.';
          this.showAlert = true;
          this.routeURL = 'login?type=member';
        },
        error: () => {
          this.isLoading = false;
          this.alertMessage = 'Failed to complete registration.';
          this.showAlert = true;
        },
      });
      return;
    }

    // ── Standard flow ──────────────────────────────────────────────────────
    const selectedPackageValue =
      this.registrationForm.value.subscriptionPackage;
    const selectedPackage = this.subscriptionPackages.find(
      (p) => p.value === selectedPackageValue,
    );

    if (!this.registrationForm.valid) {
      this.alertMessage =
        'Please fill in all required fields or check for all fields are correct.';
      this.showAlert = true;
      return;
    }

    this.isLoading = true;
    const formValue = this.registrationForm.getRawValue();

    // ✅ Combine dial code + digits here, once, cleanly
    this.buildPhoneForSubmit(formValue);

    if (this.user === 'SUBCONTRACTOR') {
      formValue.trades = this.selectedTrades.map((trade) => trade.value);
    }
    if (this.user === 'VENDOR') {
      formValue.supplierTypes = this.selectedSupplierTypes.map(
        (type) => type.value,
      );
    }

    this.getUserMetadata().subscribe((metadata) => {
      formValue.ipAddress = metadata.ip;
      formValue.cityFromIP = metadata.city;
      formValue.regionFromIP = metadata.region;
      formValue.countryFromIP = metadata.country_name;
      formValue.latitudeFromIP = metadata.latitude;
      formValue.longitudeFromIP = metadata.longitude;
      formValue.timezone = metadata.timezone;
      formValue.operatingSystem = this.getOperatingSystem();

      if (typeof formValue.country === 'object')
        formValue.country = formValue.country?.id;
      if (typeof formValue.state === 'object')
        formValue.state = formValue.state?.id;

      this.httpClient
        .post(`${BASE_URL}/Account/register`, formValue, {
          headers: { 'Content-Type': 'application/json' },
        })
        .pipe(
          catchError((error) => {
            this.isLoading = false;
            if (error.status === 400) {
              this.alertMessage =
                error.error[0]?.code === 'DuplicateUserName'
                  ? 'You are already Registered, please proceed to Login'
                  : 'Data is malformed. Please check all input fields.';
            } else if (error.status === 500) {
              this.alertMessage =
                'Oops something went wrong, please try again later.';
            } else {
              this.alertMessage =
                'An unexpected error occurred. Contact support@probuildai.com';
            }
            this.showAlert = true;
            return of(null);
          }),
        )
        .subscribe((res: any) => {
          this.isLoading = false;
          if (res) {
            this.alertMessage =
              'Registration successful! Check your inbox for a verification email to activate your account.';
            const userId = res.userId;
            const pkg = this.registrationForm.value.subscriptionPackage;

            if (pkg.includes('Basic')) {
              this.routeURL = 'login';
              this.showAlert = true;
            } else if (pkg.includes('Trial')) {
              this.httpClient
                .post(
                  `${BASE_URL}/Account/trailversion`,
                  { userId, packageName: pkg },
                  {
                    headers: { 'Content-Type': 'application/json' },
                  },
                )
                .subscribe(() => {
                  this.alertMessage =
                    'Your trial account is now active. Please confirm your email and sign in to begin.';
                  this.routeURL = 'login';
                  this.showAlert = true;
                });
            } else {
              const billingCycle = this.registrationForm.value.billingCycle as
                | 'monthly'
                | 'yearly';
              this.dialog.open(PaymentPromptDialogComponent, {
                data: {
                  userId,
                  packageName: selectedPackage?.value || 'Unknown',
                  amount: selectedPackage?.amount || 0,
                  source: 'register',
                  billingCycle,
                },
                disableClose: true,
                width: '400px',
              });
              this.showAlert = true;
              this.routeURL = 'login';
            }
          }
        });
    });
  }

  showPaymentPrompt() {
    this.dialog.open(PaymentPromptDialogComponent, {
      disableClose: true,
      width: '400px',
    });
  }

  getConstructionTypeDisplayValue(): string {
    const selectedValues = this.registrationForm.get('constructionType')?.value;
    if (!selectedValues || selectedValues.length === 0) return '';
    return this.constructionTypes
      .filter((type) => selectedValues.includes(type.value))
      .map((type) => type.display)
      .join(', ');
  }

  getProjectPreferencesDisplayValue(): string {
    const selectedValues =
      this.registrationForm.get('projectPreferences')?.value;
    if (!selectedValues || selectedValues.length === 0) return '';
    return this.preferenceOptions
      .filter((pref) => selectedValues.includes(pref.value))
      .map((pref) => pref.display)
      .join(', ');
  }

  getProductsOfferedDisplayValue(): string {
    const selectedValues = this.registrationForm.get('productsOffered')?.value;
    if (!selectedValues || selectedValues.length === 0) return '';
    return this.supplierProducts
      .filter((prod) => selectedValues.includes(prod.value))
      .map((prod) => prod.display)
      .join(', ');
  }

  getDeliveryAreaDisplayValue(): string {
    const selectedValues = this.registrationForm.get('deliveryArea')?.value;
    if (!selectedValues || selectedValues.length === 0) return '';
    return this.deliveryAreas
      .filter((area) => selectedValues.includes(area.value))
      .map((area) => area.display)
      .join(', ');
  }

  closeAlert(): void {
    if (this.routeURL !== '') this.router.navigateByUrl('login');
    this.showAlert = false;
  }

  onCountryBlur() {
    const ctrl = this.registrationForm.get('country');
    if (!ctrl?.value || typeof ctrl.value !== 'object') {
      ctrl?.setValue(null);
      ctrl?.setErrors({ invalidSelection: true });
    }
  }

  onStateBlur(): void {
    setTimeout(() => {
      const ctrl = this.registrationForm.get('state');
      if (!ctrl?.value || typeof ctrl.value !== 'object') {
        ctrl?.setValue(null);
        ctrl?.setErrors({ invalidSelection: true });
      }
    }, 150);
  }

  onCountrySelected(event: any): void {
    const selected = event.option.value;
    const countryCtrl = this.registrationForm.get('country');
    const stateCtrl = this.registrationForm.get('state');

    countryCtrl?.setValue(selected, { emitEvent: false });
    stateCtrl?.reset('', { emitEvent: false });
    stateCtrl?.markAsPristine();
    stateCtrl?.markAsUntouched();

    const match = this.countryNumberCode.find(
      (x) => x.countryId?.toLowerCase() === selected.id?.toLowerCase(),
    );
    if (match) this.selectedCountryCode = match;

    requestAnimationFrame(() => {
      this.countryAutoTrigger.closePanel();
      stateCtrl?.setValue(stateCtrl.value ?? '', { emitEvent: true });
    });
  }

  onStateSelected(event: any): void {
    const selected = event.option.value;
    const stateCtrl = this.registrationForm.get('state');
    stateCtrl?.setValue(selected, { emitEvent: false });
    requestAnimationFrame(() => {
      this.stateAutoTrigger.closePanel();
      (document.activeElement as HTMLElement)?.blur();
    });
    stateCtrl?.markAsTouched();
    stateCtrl?.updateValueAndValidity();
  }

  markFieldTouched(fieldName: string) {
    this.registrationForm.get(fieldName)?.markAsTouched();
  }

  getFieldError(fieldName: string): string {
    const field = this.registrationForm.get(fieldName);
    if (!field) return '';
    if (field.hasError('required')) return 'Mandatory Field: Input Required.';
    if (fieldName === 'email' && field.invalid && !field.hasError('required'))
      return 'Please enter a valid email address';
    if (fieldName === 'phoneNumber' && field.hasError('invalidPhone'))
      return 'Please enter a valid phone number for the selected country.';
    if (fieldName === 'password') {
      if (field.hasError('minlength'))
        return 'Password must be at least 10 characters long.';
      if (field.hasError('pattern'))
        return 'Password must contain at least one uppercase letter, one lowercase letter, and one special character: - ! @ # $ % ^ & * ? _';
    }
    return '';
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  getSelectedPlan(): {
    value: string;
    display: string;
    amount: number;
    annualAmount: number;
  } | null {
    const val = this.registrationForm.get('subscriptionPackage')?.value;
    if (!val) return null;
    return this.subscriptionPackages.find((p) => p.value === val) ?? null;
  }

  getPageTitle(): string {
    const plan = this.getSelectedPlan();
    if (!plan) return 'Create Your Account';
    const name = plan.display.split(' - ')[0].split(' –')[0].trim();
    return `Sign Up for ${name}`;
  }

  getPageSubtitle(): string {
    const plan = this.getSelectedPlan();
    if (!plan) return 'Start your free trial today.';
    if (plan.value.toLowerCase().includes('trial') || plan.amount === 0)
      return '7-day free trial. No credit card needed.';
    return '7-day free trial included.';
  }

  getPlanDescription(planValue: string): string {
    const lower = planValue.toLowerCase();
    if (lower.includes('trial') || lower.includes('starter'))
      return 'Test drive with real blueprints. No card needed.';
    if (lower.includes('essential'))
      return 'Perfect for solo estimators and small crews.';
    if (lower.includes('professional') || lower.includes('pro'))
      return 'Everything you need to run a full estimating operation.';
    if (lower.includes('enterprise'))
      return 'Unlimited access and dedicated support for large teams.';
    return '';
  }
  private phoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null; // required handles empty

      const countryCode = (this.selectedCountryCode?.countryCode ||
        'ZA') as CountryCode;
      const parsed = parsePhoneNumberFromString(value, countryCode);

      if (!parsed || !parsed.isValid()) {
        return { invalidPhone: true };
      }
      return null;
    };
  }
}
