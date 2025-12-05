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
} from '@angular/forms';
import { AsyncPipe, CommonModule, NgForOf, NgIf } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { catchError, map, startWith } from 'rxjs/operators';
import { InvitationService } from '../../services/invitation.service';
import { Observable, of } from 'rxjs';
import { LoaderComponent } from '../../loader/loader.component';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDivider } from '@angular/material/divider';
import {
  PaymentIntentRequest,
  StripeService,
} from '../../services/StripeService';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PaymentPromptDialogComponent } from './../registration/payment-prompt-dialog.component';
import { TermsConfirmationDialogComponent } from './../registration/terms-confirmation-dialog/terms-confirmation-dialog.component';
import { COUNTRIES } from '../../data/countries';
import { STATES } from '../../data/states';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { userTypes } from '../../data/user-types';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ViewChild } from '@angular/core';
import { combineLatest } from 'rxjs';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { ProfileService } from '../profile/profile.service';
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
import { ElementRef, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
const BASE_URL = environment.BACKEND_URL;
declare const google: any;
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
  ],
  templateUrl: './trialregistration.component.html',
  styleUrl: './trialregistration.component.scss',
})
export class TrialRegistrationComponent implements OnInit {
  @ViewChild('countryAutoTrigger') countryAutoTrigger!: MatAutocompleteTrigger;
  @ViewChild('stateAutoTrigger') stateAutoTrigger!: MatAutocompleteTrigger;
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;

  isBrowser: boolean | undefined;
  isGoogleMapsLoaded: boolean = false;
  autocomplete!: google.maps.places.Autocomplete;
  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '';
  token: string | null = null;
  addressTypes: { id: string; name: string; description?: string }[] = [];
  selectedCountryCode: any = null;
  selectedDialCode: string = '';
  countryNumberCode: any[] = [];
  filteredCountryCodes!: Observable<any[]>;
  countryFilterCtrl = new FormControl('');

  // Options for dropdowns
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

  subscriptionPackages: {
    value: string;
    display: string;
    amount: number;
    annualAmount: number;
  }[] = [];

  countries: any[] = [];
  states: any[] = [];
  filteredCountries: Observable<any[]> | undefined;
  filteredStates: Observable<any[]> | undefined;

  userTypes = userTypes;
  separatorKeysCodes: number[] = [ENTER, COMMA];

  tradeCtrl = new FormControl();
  filteredTrades: Observable<{ value: string; display: string }[]>;
  selectedTrades: { value: string; display: string }[] = [];

  supplierTypeCtrl = new FormControl();
  filteredSupplierTypes: Observable<{ value: string; display: string }[]>;
  selectedSupplierTypes: { value: string; display: string }[] = [];
  showOnlyBasicFields = true;
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
    private profileService: ProfileService,
    private invitationService: InvitationService,
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

  ngOnInit() {
    this.loadSubscriptionPackages();
    this.profileService.getAddressType().subscribe({
      next: (types) => (this.addressTypes = types),
      error: (err) => console.error('Failed to load address types', err),
    });
    this.loadGoogleTag();
    this.registrationForm = this.formBuilder.group({
      firstName: [{ value: '', disabled: true }, Validators.required],
      lastName: [{ value: '', disabled: true }, Validators.required],
      phoneNumber: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9\s()+-]{6,20}$/), // allows 6–15 digits only
        ],
      ],
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

    this.user = 'PERSONAL_USE';

    this.registrationService.getAllCountryNumberCodes().subscribe((data) => {
      this.countryNumberCode = data;

      // 🌍 Try to get user's real country via IP API
      this.getUserMetadata().subscribe({
        next: (meta) => {
          const ipCountryCode = meta?.country_code || meta?.country || 'US'; // fallback
          const detected = this.countryNumberCode.find(
            (c) => c.countryCode?.toLowerCase() === ipCountryCode.toLowerCase(),
          );
          if (detected) {
            this.selectedCountryCode = detected;
          } else {
            const fallback = this.countryNumberCode.find(
              (c) => c.countryCode === 'US',
            );
            this.selectedCountryCode = fallback || this.countryNumberCode[0];
          }

          // Initialize filter stream
          this.filteredCountryCodes = this.countryFilterCtrl.valueChanges.pipe(
            startWith(''),
            map((value) => this._filterCountryCodes(value ?? '')),
          );

          console.log(
            `🌍 Default dial code set to: ${this.selectedCountryCode.countryCode} (${this.selectedCountryCode.countryPhoneNumberCode})`,
          );
        },
        error: (err) => {
          console.warn(
            'Could not detect country via IP API, defaulting to ZA',
            err,
          );
          const fallback = this.countryNumberCode.find(
            (c) => c.countryCode === 'ZA',
          );
          this.selectedCountryCode = fallback || this.countryNumberCode[0];
        },
      });
    });

    // Countries filter
    // this.filteredCountries = this.registrationForm
    //   .get('country')!
    //   .valueChanges.pipe(
    //     startWith(''),
    //     map((value) => this._filterCountries(value))
    //   );

    this.registrationForm.get('userType')?.valueChanges.subscribe((value) => {
      this.user = value;
      this.selectedTrades = [];
      this.selectedSupplierTypes = [];
    });

    this.route.queryParams.subscribe((params) => {
      this.token = params['token'];
      if (this.token) {
        // When a token is present, remove required validators from fields that are not needed for invited users
        const fieldsToUpdate = [
          'country',
          'state',
          'city',
          'subscriptionPackage',
        ];
        fieldsToUpdate.forEach((fieldName) => {
          const control = this.registrationForm.get(fieldName);
          if (control) {
            control.clearValidators();
            control.updateValueAndValidity();
          }
        });

        this.invitationService.getInvitation(this.token).subscribe({
          next: (data: any) => {
            console.log('Invitation data:', data);
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
        else reject(new Error('Google Maps API loaded but google not defined'));
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
    let streetNumber = '';
    let streetName = '';
    let city = '';
    let state = '';
    let postalCode = '';
    let country = '';
    let countryCode = '';

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

    const lat = place.geometry?.location?.lat();
    const lng = place.geometry?.location?.lng();

    this.registrationForm.patchValue({
      formattedAddress: place.formatted_address,
      streetNumber,
      streetName,
      city,
      state,
      postalCode,
      country,
      latitude: lat,
      longitude: lng,
      googlePlaceId: place.place_id,
      countryCode: countryCode,
    });

    console.log('📍 Google Maps selection', {
      formattedAddress: place.formatted_address,
      city,
      state,
      country,
      lat,
      lng,
      countryCode,
    });
  }

  countryDisplayFn = (id: string) => {
    const country = this.countries.find((c) => c.id === id);
    return country ? country.countryName : '';
  };
  stateDisplayFn = (state: any) => {
    if (typeof state === 'string') {
      return this.states.find((s) => s.id === state)?.stateName ?? '';
    } else if (state && typeof state === 'object') {
      return state.stateName || '';
    }
    return '';
  };

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
    ctrl?.setValue(ctrl.value ?? '', { emitEvent: true });
    setTimeout(() => this.countryAutoTrigger?.openPanel());
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
    // User typed text
    const filterText = typeof value === 'string' ? value.toLowerCase() : '';

    return this.countries.filter(
      (c) =>
        c.countryName.toLowerCase().includes(filterText) ||
        c.countryCode.toLowerCase().includes(filterText),
    );
  }

  updatePhoneNumberValidator(countryCode: string) {
    const phoneNumberControl = this.registrationForm.get('phoneNumber');
    const selectedCountry = this.countries.find(
      (country) => country.value === countryCode,
    );
    if (selectedCountry && phoneNumberControl && selectedCountry.phonePattern) {
      phoneNumberControl.setValidators([
        Validators.required,
        Validators.pattern(selectedCountry.phonePattern),
      ]);
    } else if (phoneNumberControl) {
      // Reset to default or no pattern
      phoneNumberControl.setValidators([Validators.required]);
    }
    phoneNumberControl?.updateValueAndValidity();
  }

  userType(userSelected: any) {
    //This is now handled by the valueChanges subscription in ngOnInit
    //this.user = userSelected.value
  }

  private loadSubscriptionPackages(): void {
    this.stripeService.getSubscriptions().subscribe({
      next: (subscriptions) => {
        this.subscriptionPackages = subscriptions
          .filter((s) => s.subscription.includes('Trial'))
          .map((s) => ({
            value: s.subscription,
            display: `${s.subscription}`,
            amount: s.amount,
            annualAmount: s.annualAmount,
          }));

        // 🔥 FORCE the default value AFTER the list is loaded
        this.registrationForm
          .get('subscriptionPackage')
          ?.setValue(this.subscriptionPackages[0].value);

        // 🔥 Disable it so it becomes grayed out
        this.registrationForm.get('subscriptionPackage')?.disable();
      },
      error: (err) => console.error('Subscription load error:', err),
    });
  }

  certificationChange(selectedOption: any) {
    if (selectedOption === 'FULLY_LICENSED') this.certified = true;
  }
  getUserMetadata(): Observable<any> {
    return this.httpClient.get('https://ipapi.co/json/');
  }
  loadGoogleTag() {
    if (document.getElementById('google-ads-script')) {
      return; // Already loaded
    }

    // Load the gtag.js script
    const gtagScript = document.createElement('script');
    gtagScript.src =
      'https://www.googletagmanager.com/gtag/js?id=AW-17722362865';
    gtagScript.async = true;
    gtagScript.id = 'google-ads-script';
    document.head.appendChild(gtagScript);

    // Add the config script
    const configScript = document.createElement('script');
    configScript.id = 'google-ads-config';
    configScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'AW-17722362865');
  `;
    document.head.appendChild(configScript);
  }

  private getOperatingSystem(): string {
    const userAgent = navigator.userAgent;

    // Windows
    if (/Windows NT 10.0/.test(userAgent)) return 'Windows 10 or 11';
    if (/Windows NT 6.3/.test(userAgent)) return 'Windows 8.1';
    if (/Windows NT 6.2/.test(userAgent)) return 'Windows 8';
    if (/Windows NT 6.1/.test(userAgent)) return 'Windows 7';
    if (/Windows NT 6.0/.test(userAgent)) return 'Windows Vista';
    if (/Windows NT 5.1/.test(userAgent)) return 'Windows XP';

    // macOS
    if (/Mac OS X 10[\._]15/.test(userAgent)) return 'macOS Catalina';
    if (/Mac OS X 11[\._]/.test(userAgent)) return 'macOS Big Sur';
    if (/Mac OS X 12[\._]/.test(userAgent)) return 'macOS Monterey';
    if (/Mac OS X 13[\._]/.test(userAgent)) return 'macOS Ventura';
    if (/Mac OS X 14[\._]/.test(userAgent)) return 'macOS Sonoma or later';

    // iOS
    if (/iPhone/.test(userAgent)) return 'iOS (iPhone)';
    if (/iPad/.test(userAgent)) return 'iOS (iPad)';

    // Android
    if (/Android/.test(userAgent)) {
      const match = userAgent.match(/Android\s([0-9\.]+)/);
      return match ? `Android ${match[1]}` : 'Android';
    }

    // Linux
    if (/Linux/.test(userAgent)) return 'Linux';

    return 'Unknown OS';
  }

  onSubmit(): void {
    if (this.token) {
      if (this.registrationForm.valid) {
        this.isLoading = true;
        const data = {
          token: this.token,
          password: this.registrationForm.get('password')?.value,
          phoneNumber: this.registrationForm.get('phoneNumber')?.value,
        };
        this.invitationService.registerInvited(data).subscribe({
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
        //THE USER MUST BE REGISTERED IN THE USER TABLE AS WELL.
        const selectedPackageValue =
          this.registrationForm.getRawValue().subscriptionPackage;
        const selectedPackage = this.subscriptionPackages.find(
          (p) => p.value === selectedPackageValue,
        );

        if (!this.registrationForm.valid) {
          console.warn('⛔ FORM INVALID — DETAILS BELOW:');

          Object.keys(this.registrationForm.controls).forEach((key) => {
            const control = this.registrationForm.get(key);

            if (control && control.invalid) {
              console.warn(
                `❌ ${key} FAILED`,
                control.errors,
                ' | VALUE: ',
                control.value,
              );
            }
          });

          this.alertMessage =
            'Please fill in all required fields or check for all fields are correct.';
          this.showAlert = true;
          return;
        }

        // ✅ Open terms dialog before submitting
        const dialogRef = this.dialog.open(TermsConfirmationDialogComponent, {
          disableClose: true,
          width: '500px',
        });

        dialogRef.afterClosed().subscribe((userAgreed) => {
          if (!userAgreed) {
            return; // Stop if user did not agree
          }

          this.isLoading = true;

          const formValue = this.registrationForm.getRawValue();

          if (this.user === 'SUBCONTRACTOR') {
            formValue.trades = this.selectedTrades.map((trade) => trade.value);
          }

          if (this.user === 'VENDOR') {
            formValue.supplierTypes = this.selectedSupplierTypes.map(
              (type) => type.value,
            );
          }

          // Just before sending formValue to the backend
          this.getUserMetadata().subscribe((metadata) => {
            // Attach IP/location metadata
            formValue.ipAddress = metadata.ip;
            formValue.cityFromIP = metadata.city;
            formValue.regionFromIP = metadata.region; // changed
            formValue.countryFromIP = metadata.country_name;
            formValue.latitudeFromIP = metadata.latitude;
            formValue.longitudeFromIP = metadata.longitude;
            formValue.timezone = metadata.timezone;
            formValue.operatingSystem = this.getOperatingSystem();
            formValue.countryNumberCode = this.selectedCountryCode?.id || null;
            // Ensure only the ID is sent
            if (typeof formValue.country === 'object') {
              formValue.country = formValue.country?.id;
            }
            if (typeof formValue.state === 'object') {
              formValue.state = formValue.state?.id;
            }

            this.httpClient
              .post(`${BASE_URL}/Account/register`, formValue, {})
              .pipe(
                catchError((error) => {
                  this.isLoading = false;
                  if (error.status === 400) {
                    if (error.error[0]?.code === 'DuplicateUserName') {
                      this.alertMessage =
                        'You are already Registered, please proceed to Login';
                    } else {
                      this.alertMessage =
                        'Data is malformed. Please check all input fields.';
                    }
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
                  if (
                    this.registrationForm
                      .getRawValue()
                      .subscriptionPackage.includes('Basic')
                  ) {
                    this.routeURL = 'login';
                    this.showAlert = true;
                  } else if (
                    this.registrationForm
                      .getRawValue()
                      .subscriptionPackage.includes('Trial')
                  ) {
                    const userId = res.userId;
                    const packageName =
                      this.registrationForm.getRawValue().subscriptionPackage;
                    // Trigger trial subscription
                    this.httpClient
                      .post(
                        `${BASE_URL}/Account/trailversion`,
                        { userId, packageName },
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
                    const billingCycle = this.registrationForm.value
                      .billingCycle as 'monthly' | 'yearly';
                    console.log(billingCycle);
                    this.dialog.open(PaymentPromptDialogComponent, {
                      data: {
                        userId,
                        packageName: selectedPackage?.value || 'Unknown',
                        amount: selectedPackage?.amount || 0,
                        source: 'register',
                        billingCycle: billingCycle,
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
        });
      }
      return;
    }

    const selectedPackageValue =
      this.registrationForm.getRawValue().subscriptionPackage;
    const selectedPackage = this.subscriptionPackages.find(
      (p) => p.value === selectedPackageValue,
    );

    if (!this.registrationForm.valid) {
      console.warn('⛔ FORM INVALID — DETAILS BELOW:');

      Object.keys(this.registrationForm.controls).forEach((key) => {
        const control = this.registrationForm.get(key);

        if (control && control.invalid) {
          console.warn(
            `❌ ${key} FAILED`,
            control.errors,
            ' | VALUE: ',
            control.value,
          );
        }
      });

      this.alertMessage =
        'Please fill in all required fields or check for all fields are correct.';
      this.showAlert = true;
      return;
    }

    // ✅ Open terms dialog before submitting
    const dialogRef = this.dialog.open(TermsConfirmationDialogComponent, {
      disableClose: true,
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((userAgreed) => {
      if (!userAgreed) {
        return; // Stop if user did not agree
      }

      this.isLoading = true;

      const formValue = this.registrationForm.getRawValue();

      if (this.user === 'SUBCONTRACTOR') {
        formValue.trades = this.selectedTrades.map((trade) => trade.value);
      }

      if (this.user === 'VENDOR') {
        formValue.supplierTypes = this.selectedSupplierTypes.map(
          (type) => type.value,
        );
      }

      // Just before sending formValue to the backend
      this.getUserMetadata().subscribe((metadata) => {
        // Attach IP/location metadata
        formValue.ipAddress = metadata.ip;
        formValue.cityFromIP = metadata.city;
        formValue.regionFromIP = metadata.region; // changed
        formValue.countryFromIP = metadata.country_name;
        formValue.latitudeFromIP = metadata.latitude;
        formValue.longitudeFromIP = metadata.longitude;
        formValue.timezone = metadata.timezone;
        formValue.countryNumberCode = this.selectedCountryCode?.id || null;
        formValue.operatingSystem = this.getOperatingSystem();
        this.httpClient
          .post(`${BASE_URL}/Account/register`, formValue, {
            headers: { 'Content-Type': 'application/json' },
          })
          .pipe(
            catchError((error) => {
              this.isLoading = false;
              if (error.status === 400) {
                if (error.error[0]?.code === 'DuplicateUserName') {
                  this.alertMessage =
                    'You are already Registered, please proceed to Login';
                } else {
                  this.alertMessage =
                    'Data is malformed. Please check all input fields.';
                }
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
              if (
                this.registrationForm
                  .getRawValue()
                  .subscriptionPackage?.includes('Basic')
              ) {
                this.routeURL = 'login';
                this.showAlert = true;
              } else if (
                this.registrationForm
                  .getRawValue()
                  .subscriptionPackage?.includes('Trial')
              ) {
                const userId = res.userId;
                const packageName =
                  this.registrationForm.getRawValue().subscriptionPackage;
                // Trigger trial subscription
                this.httpClient
                  .post(
                    `${BASE_URL}/Account/trailversion`,
                    { userId, packageName },
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
                const billingCycle = this.registrationForm.value
                  .billingCycle as 'monthly' | 'yearly';
                this.dialog.open(PaymentPromptDialogComponent, {
                  data: {
                    userId,
                    packageName: selectedPackage?.value || 'Unknown',
                    amount: selectedPackage?.amount || 0,
                    source: 'register',
                    billingCycle: billingCycle,
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
    if (!selectedValues || selectedValues.length === 0) {
      return '';
    }
    return this.constructionTypes
      .filter((type) => selectedValues.includes(type.value))
      .map((type) => type.display)
      .join(', ');
  }

  getProjectPreferencesDisplayValue(): string {
    const selectedValues =
      this.registrationForm.get('projectPreferences')?.value;
    if (!selectedValues || selectedValues.length === 0) {
      return '';
    }
    return this.preferenceOptions
      .filter((pref) => selectedValues.includes(pref.value))
      .map((pref) => pref.display)
      .join(', ');
  }

  getProductsOfferedDisplayValue(): string {
    const selectedValues = this.registrationForm.get('productsOffered')?.value;
    if (!selectedValues || selectedValues.length === 0) {
      return '';
    }
    return this.supplierProducts
      .filter((prod) => selectedValues.includes(prod.value))
      .map((prod) => prod.display)
      .join(', ');
  }

  getDeliveryAreaDisplayValue(): string {
    const selectedValues = this.registrationForm.get('deliveryArea')?.value;
    if (!selectedValues || selectedValues.length === 0) {
      return '';
    }
    return this.deliveryAreas
      .filter((area) => selectedValues.includes(area.value))
      .map((area) => area.display)
      .join(', ');
  }

  closeAlert(): void {
    if (this.routeURL != '') {
      this.router.navigateByUrl('login');
    }
    this.showAlert = false;
  }

  validateCountrySelection() {
    const ctrl = this.registrationForm.get('country');
    const value = ctrl?.value;

    const isValid = this.countries.some((c) => c.id === value);

    if (!isValid) {
      ctrl?.setErrors({ invalidSelection: true });
      ctrl?.setValue('');
    }
  }
  private mustBeValidCountryValidator = (countries: any[]): ValidatorFn => {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) return { required: true };

      const isValid = countries.some((c) => c.id === value);
      return isValid ? null : { invalidSelection: true };
    };
  };
  private mustBeValidStateValidator = (states: any[]): ValidatorFn => {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return { required: true };
      const isValid = states.some((s) => s.id === value);
      return isValid ? null : { invalidSelection: true };
    };
  };

  onCountrySelected(event: any): void {
    const selected = event.option.value;
    this.selectedCountryCode = selected;

    const countryCtrl = this.registrationForm.get('country');
    const stateCtrl = this.registrationForm.get('state');
    const phoneCtrl = this.registrationForm.get('phoneNumber');

    countryCtrl?.setValue(selected, { emitEvent: false });

    // Reset dependent state
    stateCtrl?.reset('', { emitEvent: false });
    stateCtrl?.markAsPristine();
    stateCtrl?.markAsUntouched();

    // 🪄 Find matching dial code based on backend mapping
    const match = this.countryNumberCode.find(
      (x) => x.countryId?.toLowerCase() === selected.id?.toLowerCase(),
    );
    this.selectedDialCode = match?.countryPhoneNumberCode || '';

    // Auto-insert dial code if empty
    if (this.selectedDialCode && !phoneCtrl?.value) {
      phoneCtrl?.setValue(`${this.selectedDialCode} `);
    }
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

  onPhoneInput(event: any) {
    const inputEl = event.target as HTMLInputElement;
    let value = inputEl.value || '';
    const dial = this.selectedCountryCode?.countryPhoneNumberCode || '';
    const phoneCtrl = this.registrationForm.get('phoneNumber');

    // Clean illegal characters but allow + only at start
    value = value
      .replace(/[^0-9\s()+-]/g, '') // remove strange chars
      .replace(/(?!^)\+/g, ''); // remove any '+' that isn’t at start

    if (dial) {
      // Remove duplicate dial prefixes like +27+27 or +1+1
      const duplicatePattern = new RegExp(
        `^(\\+?${dial.replace('+', '\\+')}\\s*)+`,
      );
      value = value.replace(duplicatePattern, dial);

      // Ensure single '+'
      if (!value.startsWith('+')) {
        value = '+' + value.replace(/^\+*/, '');
      }

      // Reset if cleared
      if (!value.trim()) {
        value = dial;
      }
      // Prevent deleting dial prefix
      else if (value.length < dial.length && dial.startsWith(value)) {
        value = dial;
      }
      // Normalize weird +0 / +00 cases
      else if (value === '+' || value === '+0') {
        value = dial;
      }
      // If missing dial entirely → prepend
      else if (!value.startsWith(dial)) {
        let digits = value.replace(/^\+?0+/, '');
        value = dial + digits;
      }
      // Fix "+270..." or "+440..."
      else if (value.startsWith(dial + '0') && value.length > dial.length + 1) {
        value = dial + value.substring(dial.length + 1);
      }
    }

    // Final cleanup
    value = value.replace(/\+\++/g, '+');

    inputEl.value = value;
    phoneCtrl?.setValue(value, { emitEvent: false });
  }

  onCountryCodeChange(selected: any) {
    this.selectedCountryCode = selected;
    const dial = selected?.countryPhoneNumberCode || '';
    const phoneCtrl = this.registrationForm.get('phoneNumber');
    const currentValue = phoneCtrl?.value || '';

    if (!currentValue || !currentValue.startsWith('+')) {
      phoneCtrl?.setValue(dial + ' ');
    } else {
      const cleaned = currentValue.replace(/^\+\d+/, '');
      phoneCtrl?.setValue(dial + cleaned);
    }
  }
  // Mark field as touched to trigger real-time validation
  markFieldTouched(fieldName: string) {
    const field = this.registrationForm.get(fieldName);
    field?.markAsTouched();
  }

  // Get error message for any field
  getFieldError(fieldName: string): string {
    const field = this.registrationForm.get(fieldName);

    if (!field) return '';

    // Required field error
    if (field.hasError('required')) {
      return 'Mandatory Field: Input Required.';
    }

    // Email-specific errors
    if (fieldName === 'email' && field.invalid && !field.hasError('required')) {
      return 'Please enter a valid email address';
    }

    // Password-specific errors
    if (fieldName === 'password') {
      if (field.hasError('minlength')) {
        return 'Password must be at least 10 characters long.';
      }
      if (field.hasError('pattern')) {
        return 'Password must contain at least one uppercase letter, one lowercase letter, and one special character: - ! @ # $ % ^ & * ? _';
      }
    }

    return '';
  }
}
