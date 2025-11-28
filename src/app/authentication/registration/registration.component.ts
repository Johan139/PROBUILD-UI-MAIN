import {Component, OnInit} from '@angular/core';
import {MatCardModule} from "@angular/material/card";
import {MatGridListModule} from "@angular/material/grid-list";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import {AsyncPipe, CommonModule, NgForOf, NgIf} from "@angular/common";
import { MatSelectModule} from "@angular/material/select";
import {MatInputModule} from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import {MatButton} from "@angular/material/button";
import {HttpClient} from "@angular/common/http";
import {Router, ActivatedRoute} from "@angular/router";
import { environment } from '../../../environments/environment';
import {catchError, debounceTime, distinctUntilChanged, filter, map, startWith} from 'rxjs/operators';
import { InvitationService } from '../../services/invitation.service';
import {merge, Observable, of} from 'rxjs';
import { LoaderComponent } from '../../loader/loader.component';
import {MatDivider} from "@angular/material/divider";
import { PaymentIntentRequest, StripeService } from '../../services/StripeService';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PaymentPromptDialogComponent } from './payment-prompt-dialog.component';
import { TermsConfirmationDialogComponent } from './terms-confirmation-dialog/terms-confirmation-dialog.component';
import { COUNTRIES } from '../../data/countries';
import { STATES } from '../../data/states';
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import { userTypes } from '../../data/user-types';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
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
  certificationOptions
} from '../../data/registration-data';
import { RegistrationService } from '../../services/registration.service';
import { ElementRef, Inject, PLATFORM_ID, ViewChild, AfterViewInit } from '@angular/core';
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
    MatIconModule
  ],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss'
})
export class RegistrationComponent implements OnInit{
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

  subscriptionPackages: { value: string, display: string, amount: number, annualAmount:number }[] = [];

  countries: any[] = [];
  states: any[] = [];
  countryNumberCode: any[] = [];
  selectedCountryCode: any;
  addressTypes: { id: string; name: string; description?: string }[] = []; // ✅ added

  countryFilterCtrl = new FormControl('');
filteredCountryCodes!: Observable<any[]>;
  
  userTypes = userTypes;
  separatorKeysCodes: number[] = [ENTER, COMMA];
selectedPlanFromUrl: string | null = null;
  tradeCtrl = new FormControl();
  filteredTrades: Observable<{ value: string; display: string; }[]>;
  selectedTrades: { value: string; display: string; }[] = [];
selectedBillingFromUrl: string | null = null;
  supplierTypeCtrl = new FormControl();
  filteredSupplierTypes: Observable<{ value: string; display: string; }[]>;
  selectedSupplierTypes: { value: string; display: string; }[] = [];

  registrationForm: FormGroup;
  user:string = "";
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
    private profileService: ProfileService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.registrationForm = this.formBuilder.group({});
    this.filteredTrades = this.tradeCtrl.valueChanges.pipe(
      startWith(null),
      map(value => {
        const searchString = ((typeof value === 'string' ? value : '') || '').toLowerCase();
        return this.trades.filter(trade =>
          !this.selectedTrades.some(st => st.value === trade.value) &&
          trade.display.toLowerCase().includes(searchString)
        );
      })
    );
    this.filteredSupplierTypes = this.supplierTypeCtrl.valueChanges.pipe(
      startWith(null),
      map(value => {
        const searchString = ((typeof value === 'string' ? value : '') || '').toLowerCase();
        return this.supplierTypes.filter(type =>
          !this.selectedSupplierTypes.some(st => st.value === type.value) &&
          type.display.toLowerCase().includes(searchString)
        );
      })
    );
  }
private _filterCountryCodes(value: string): any[] {
  const search = (value || '').toLowerCase().trim();
  if (!search) return this.countryNumberCode;

  return this.countryNumberCode.filter(c =>
    c.countryCode?.toLowerCase().includes(search) ||
    c.countryPhoneNumberCode?.toLowerCase().includes(search)
  );
}
  ngOnInit() {
    this.loadSubscriptionPackages();
const plan = this.route.snapshot.queryParamMap.get('plan');
let billing = this.route.snapshot.queryParamMap.get('billing')?.toLowerCase() as BillingCycle | null;

// Validate billing value
if (billing !== 'monthly' && billing !== 'yearly') {
  billing = 'monthly'; // fallback
}


      this.profileService.getAddressType().subscribe({
    next: (types) => (this.addressTypes = types),
    error: (err) => console.error('Failed to load address types', err)
  });

this.selectedPlanFromUrl = plan?.toLowerCase() ?? null;
this.selectedBillingFromUrl = billing;
    this.registrationForm = this.formBuilder.group({
      firstName: [{value: '', disabled: true}, Validators.required],
      lastName: [{value: '', disabled: true}, Validators.required],
      phoneNumber: [
  '',
  [
    Validators.required,
    Validators.pattern(/^[0-9\s()+-]{6,20}$/) // allows 6–15 digits only
  ]
],
      email: [{value: '', disabled: true}, [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{10,}$/)
        ]
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
      addressType: ['', Validators.required],
      userType: ['PERSONAL_USE', Validators.required],

      constructionType: ([]),

      countryNumberCode:[''],

      nrEmployees: (''),
      yearsOfOperation: (''),
      certificationStatus: (''),
      certificationDocumentPath: (''),
      availability:(''),

      subscriptionPackage: ['', Validators.required],
      projectPreferences: ([]),

      productsOffered:([]),

      deliveryArea: ([]),
      deliveryTime: (''),
      userName:(''),
    });
  this.registrationForm.get('billingCycle')?.setValue(this.selectedBillingFromUrl);
    this.user = 'PERSONAL_USE';

 this.registrationService.getAllCountryNumberCodes().subscribe(data => {
  this.countryNumberCode = data;

  // 🌍 Try to get user's real country via IP API
  this.getUserMetadata().subscribe({
    next: (meta) => {
      const ipCountryCode = meta?.country_code || meta?.country || 'US'; // fallback to ZA
      const detected = this.countryNumberCode.find(
        c => c.countryCode?.toLowerCase() === ipCountryCode.toLowerCase()
      );
      if (detected) {
        this.selectedCountryCode = detected;
      } else {
        // fallback if no match
        const fallback = this.countryNumberCode.find(c => c.countryCode === 'US');
        this.selectedCountryCode = fallback || this.countryNumberCode[0];
      }
   // Initialize filter stream
this.filteredCountryCodes = this.countryFilterCtrl.valueChanges.pipe(
  startWith(''),
  debounceTime(100),
  distinctUntilChanged(),
  map(value => this._filterCountryCodes(value ?? ''))
);
      console.log(`🌍 Default dial code set to: ${this.selectedCountryCode.countryCode} (${this.selectedCountryCode.countryPhoneNumberCode})`);
    },
    error: (err) => {
      console.warn('Could not detect country via IP API, defaulting to ZA', err);
      const fallback = this.countryNumberCode.find(c => c.countryCode === 'ZA');
      this.selectedCountryCode = fallback || this.countryNumberCode[0];
    }
  });
});




  // Fetch all states once
this.registrationService.getAllStates().subscribe(allStates => {
  console.log('All states:', allStates); // <-- Add this
  this.states = allStates;

    const countryCtrl = this.registrationForm.get('country')!;
    const stateCtrl = this.registrationForm.get('state')!;

// this.filteredStates = merge(
//   countryCtrl.valueChanges.pipe(startWith(countryCtrl.value)),
//   stateCtrl.valueChanges.pipe(startWith(''))
// ).pipe(
//   map(() => {
//     const stateVal = stateCtrl.value;
//     const countryVal = countryCtrl.value;

//     // 1️⃣ No valid country → nothing to show
//     if (!countryVal || typeof countryVal !== 'object') return [];

//     // 2️⃣ If a state object is already selected → hide list completely
//     if (typeof stateVal === 'object') return [];

//     const search = (stateVal ?? '').toLowerCase();

//     const inCountry = this.states.filter(
//       s => s.countryId?.toLowerCase() === countryVal.id?.toLowerCase()
//     );

//     // 3️⃣ No text search → show all states in that country
//     if (!search) return inCountry;

//     return inCountry.filter(
//       s =>
//         (s.stateName ?? '').toLowerCase().includes(search) ||
//         (s.stateCode ?? '').toLowerCase().includes(search)
//     );
//   })
// );

  });


  // Countries filter
const countryCtrl = this.registrationForm.get('country')!;
// this.filteredCountries = countryCtrl.valueChanges.pipe(
//   debounceTime(150),
//   distinctUntilChanged(),
//   startWith(''),
//   map(value => {
//     // 1️⃣ User typing → filter
//     if (typeof value === 'string') {
//       const term = value.toLowerCase();
//       return this.countries.filter(c =>
//         c.countryName.toLowerCase().includes(term) ||
//         c.countryCode.toLowerCase().includes(term)
//       );
//     }
//     // 2️⃣ User selected an object → don’t reset list
//     return [];
//   })
// );



    this.registrationForm.get('userType')?.valueChanges.subscribe(value => {
      this.user = value;
      this.selectedTrades = [];
      this.selectedSupplierTypes = [];
    });

    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        // When a token is present, remove required validators from fields that are not needed for invited users
        const fieldsToUpdate = ['country', 'state', 'city', 'subscriptionPackage'];
        fieldsToUpdate.forEach(fieldName => {
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
              const userType = this.userTypes.find(t => t.display === data.role);
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
          }
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

private initAutocomplete(): void {
  if (!this.addressInput?.nativeElement) return;

  this.autocomplete = new google.maps.places.Autocomplete(this.addressInput.nativeElement, {
    fields: ['address_components', 'geometry', 'formatted_address', 'place_id'],
    types: ['geocode'],
  });

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
    if (types.includes('locality') || types.includes('sublocality')) city = component.long_name;
    if (types.includes('administrative_area_level_1')) state = component.long_name;
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
    countryCode: countryCode
  });

  console.log('📍 Google Maps selection', {
    formattedAddress: place.formatted_address,
    city,
    state,
    country,
    lat,
    lng,
    countryCode
  });
}


countryDisplayFn = (country: any): string => {
  if (!country) return '';
  return typeof country === 'string' ? country : country.countryName;
};

stateDisplayFn = (state: any) => state?.stateName ?? '';

  addTrade(event: any): void {
    const value = (event.value || '').trim();
    if (value) {
      const selectedTrade = this.trades.find(trade => trade.display.toLowerCase() === value.toLowerCase());
      if (selectedTrade && !this.selectedTrades.includes(selectedTrade)) {
        this.selectedTrades.push(selectedTrade);
      }
    }
    event.chipInput!.clear();
    this.registrationForm.get('tradeCtrl')!.setValue(null);
  }
openCountryPanel() {
  const ctrl = this.registrationForm.get('country');
  // only open if user actually focused in, not when programmatically set
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
      const selectedType = this.supplierTypes.find(type => type.display.toLowerCase() === value.toLowerCase());
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
    typeof value === 'string' ? value.toLowerCase() : value?.countryName?.toLowerCase() || '';
  return this.countries.filter(
    c =>
      c.countryName.toLowerCase().includes(filterValue) ||
      c.countryCode.toLowerCase().includes(filterValue)
  );
}



  updatePhoneNumberValidator(countryCode: string) {
    const phoneNumberControl = this.registrationForm.get('phoneNumber');
    const selectedCountry = this.countries.find(country => country.value === countryCode);
    if (selectedCountry && phoneNumberControl && selectedCountry.phonePattern) {
      phoneNumberControl.setValidators([
        Validators.required,
        Validators.pattern(selectedCountry.phonePattern)
      ]);
    } else if (phoneNumberControl) {
      // Reset to default or no pattern
      phoneNumberControl.setValidators([Validators.required]);
    }
    phoneNumberControl?.updateValueAndValidity();
  }

  userType(userSelected: any){
    //This is now handled by the valueChanges subscription in ngOnInit
    //this.user = userSelected.value
  }

private loadSubscriptionPackages(): void {
  this.stripeService.getSubscriptions().subscribe({
    next: (subscriptions) => {
      this.subscriptionPackages = subscriptions.map(s => ({
        value: s.subscription,
        display: `${s.subscription}`,
        amount: s.amount,
        annualAmount: s.annualAmount
      }));

      // 🔥 Auto-select plan ONLY after list loads
      if (this.selectedPlanFromUrl) {
        const match = this.subscriptionPackages.find(
          p => p.value.toLowerCase() === this.selectedPlanFromUrl
        );

        if (match) {
          this.registrationForm.get('subscriptionPackage')?.setValue(match.value);
        }
      }
    },
    error: (err) => {
      console.error('Failed to load subscription packages:', err);
    }
  });
}
  certificationChange(selectedOption:any) {
    if(selectedOption === "FULLY_LICENSED")
      this.certified = true;
  }
getUserMetadata(): Observable<any> {
  return this.httpClient.get('https://ipapi.co/json/');
}


private getOperatingSystem(): string {
  const userAgent = navigator.userAgent;

  // Windows
  if (/Windows NT 10.0/.test(userAgent)) return "Windows 10 or 11";
  if (/Windows NT 6.3/.test(userAgent)) return "Windows 8.1";
  if (/Windows NT 6.2/.test(userAgent)) return "Windows 8";
  if (/Windows NT 6.1/.test(userAgent)) return "Windows 7";
  if (/Windows NT 6.0/.test(userAgent)) return "Windows Vista";
  if (/Windows NT 5.1/.test(userAgent)) return "Windows XP";

  // macOS
  if (/Mac OS X 10[\._]15/.test(userAgent)) return "macOS Catalina";
  if (/Mac OS X 11[\._]/.test(userAgent)) return "macOS Big Sur";
  if (/Mac OS X 12[\._]/.test(userAgent)) return "macOS Monterey";
  if (/Mac OS X 13[\._]/.test(userAgent)) return "macOS Ventura";
  if (/Mac OS X 14[\._]/.test(userAgent)) return "macOS Sonoma or later";

  // iOS
  if (/iPhone/.test(userAgent)) return "iOS (iPhone)";
  if (/iPad/.test(userAgent)) return "iOS (iPad)";

  // Android
  if (/Android/.test(userAgent)) {
    const match = userAgent.match(/Android\s([0-9\.]+)/);
    return match ? `Android ${match[1]}` : "Android";
  }

  // Linux
  if (/Linux/.test(userAgent)) return "Linux";

  return "Unknown OS";
}

  onSubmit(): void {

    if (this.token) {
      if (this.registrationForm.valid) {
        this.isLoading = true;
        const data = {
          token: this.token,
          password: this.registrationForm.get('password')?.value,
          phoneNumber: this.registrationForm.get('phoneNumber')?.value
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
          }
        });
          //THE USER MUST BE REGISTERED IN THE USER TABLE AS WELL.
    const selectedPackageValue = this.registrationForm.value.subscriptionPackage;
    const selectedPackage = this.subscriptionPackages.find(p => p.value === selectedPackageValue);

    if (!this.registrationForm.valid) {
      this.alertMessage = 'Please fill in all required fields or check for all fields are correct.';
      this.showAlert = true;
      return;
    }

    // ✅ Open terms dialog before submitting
    const dialogRef = this.dialog.open(TermsConfirmationDialogComponent, {
      disableClose: true,
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(userAgreed => {
      if (!userAgreed) {
        return; // Stop if user did not agree
      }

      this.isLoading = true;

      const formValue = this.registrationForm.getRawValue();

// ✅ Combine country code + cleaned phone number before saving
let rawPhone = formValue.phoneNumber || '';
let countryCode = this.selectedCountryCode?.countryPhoneNumberCode || '';

// Strip out everything except digits and '+'
const cleaned = rawPhone.replace(/[^\d+]/g, '');

// If user already started with +countryCode, keep as is
if (cleaned.startsWith(countryCode.replace('+', '')) || cleaned.startsWith(countryCode)) {
  formValue.phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
} else {
  // Remove leading zeros from local numbers
  const normalized = cleaned.replace(/^0+/, '');
  formValue.phoneNumber = `${countryCode}${normalized}`;
}

// 🔍 Debug log
console.log('📞 Final phone number saved:', formValue.phoneNumber);

      if (this.user === 'SUBCONTRACTOR') {
        formValue.trades = this.selectedTrades.map(trade => trade.value);
      }

      if (this.user === 'VENDOR') {
        formValue.supplierTypes = this.selectedSupplierTypes.map(type => type.value);
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
    console.log(this.selectedCountryCode?.id)
formValue.countryNumberCode = this.selectedCountryCode?.id || null;
// Ensure only the ID is sent
if (typeof formValue.country === 'object') {
  formValue.country = formValue.country?.id;
}
if (typeof formValue.state === 'object') {
  formValue.state = formValue.state?.id;
}

      this.httpClient.post(`${BASE_URL}/Account/register`, formValue, {
      })
      .pipe(
        catchError((error) => {
          this.isLoading = false;
          if (error.status === 400) {
            if (error.error[0]?.code === 'DuplicateUserName') {
              this.alertMessage = 'You are already Registered, please proceed to Login';
            } else {
              this.alertMessage = 'Data is malformed. Please check all input fields.';
            }
          } else if (error.status === 500) {
            this.alertMessage = 'Oops something went wrong, please try again later.';
          } else {
            this.alertMessage = 'An unexpected error occurred. Contact support@probuildai.com';
          }
          this.showAlert = true;
          return of(null);
        })
      )
      .subscribe((res: any) => {
        this.isLoading = false;
        if (res) {
          this.alertMessage = 'Registration successful! Check your inbox for a verification email to activate your account.';
          const userId = res.userId;
          if(this.registrationForm.value.subscriptionPackage.includes('Basic'))
          {
            this.routeURL = 'login';
            this.showAlert = true;
          }
          else if(this.registrationForm.value.subscriptionPackage.includes('Trial'))
          {
            const userId = res.userId;
            const packageName = this.registrationForm.value.subscriptionPackage;
            // Trigger trial subscription
            this.httpClient.post(`${BASE_URL}/Account/trailversion`, { userId, packageName }, {
              headers: { 'Content-Type': 'application/json' }
            }).subscribe(() => {
              this.alertMessage = 'Your trial account is now active. Please confirm your email and sign in to begin.';
              this.routeURL = 'login';
              this.showAlert = true;
            });
          }
          else
          {
            const billingCycle = this.registrationForm.value.billingCycle as 'monthly' | 'yearly';
            console.log(billingCycle)
            this.dialog.open(PaymentPromptDialogComponent, {
              data: {
                userId,
                packageName: selectedPackage?.value || 'Unknown',
                amount: selectedPackage?.amount || 0,
                source: 'register',
                billingCycle: billingCycle
              },
              disableClose: true,
              width: '400px'
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

    const selectedPackageValue = this.registrationForm.value.subscriptionPackage;
    const selectedPackage = this.subscriptionPackages.find(p => p.value === selectedPackageValue);

    if (!this.registrationForm.valid) {
      this.alertMessage = 'Please fill in all required fields or check for all fields are correct.';
      this.showAlert = true;
      return;
    }

    // ✅ Open terms dialog before submitting
    const dialogRef = this.dialog.open(TermsConfirmationDialogComponent, {
      disableClose: true,
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(userAgreed => {
      if (!userAgreed) {
        return; // Stop if user did not agree
      }

      this.isLoading = true;

      const formValue = this.registrationForm.getRawValue();

let rawPhone = formValue.phoneNumber || '';
let countryCode = this.selectedCountryCode?.countryPhoneNumberCode || '';

// Strip out everything except digits and '+'
const cleaned = rawPhone.replace(/[^\d+]/g, '');

// If user already started with +countryCode, keep as is
if (cleaned.startsWith(countryCode.replace('+', '')) || cleaned.startsWith(countryCode)) {
  formValue.phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
} else {
  // Remove leading zeros from local numbers
  const normalized = cleaned.replace(/^0+/, '');
  formValue.phoneNumber = `${countryCode}${normalized}`;
}

      if (this.user === 'SUBCONTRACTOR') {
        formValue.trades = this.selectedTrades.map(trade => trade.value);
      }

      if (this.user === 'VENDOR') {
        formValue.supplierTypes = this.selectedSupplierTypes.map(type => type.value);
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
      this.httpClient.post(`${BASE_URL}/Account/register`, formValue, {
        headers: { 'Content-Type': 'application/json' }
      })
      .pipe(
        catchError((error) => {
          this.isLoading = false;
          if (error.status === 400) {
            if (error.error[0]?.code === 'DuplicateUserName') {
              this.alertMessage = 'You are already Registered, please proceed to Login';
            } else {
              this.alertMessage = 'Data is malformed. Please check all input fields.';
            }
          } else if (error.status === 500) {
            this.alertMessage = 'Oops something went wrong, please try again later.';
          } else {
            this.alertMessage = 'An unexpected error occurred. Contact support@probuildai.com';
          }
          this.showAlert = true;
          return of(null);
        })
      )
      .subscribe((res: any) => {
        this.isLoading = false;
        if (res) {
          this.alertMessage = 'Registration successful! Check your inbox for a verification email to activate your account.';
          const userId = res.userId;
          if(this.registrationForm.value.subscriptionPackage.includes('Basic'))
          {
            this.routeURL = 'login';
            this.showAlert = true;
          }
          else if(this.registrationForm.value.subscriptionPackage.includes('Trial'))
          {
            const userId = res.userId;
            const packageName = this.registrationForm.value.subscriptionPackage;
            // Trigger trial subscription
            this.httpClient.post(`${BASE_URL}/Account/trailversion`, { userId, packageName }, {
              headers: { 'Content-Type': 'application/json' }
            }).subscribe(() => {
              this.alertMessage = 'Your trial account is now active. Please confirm your email and sign in to begin.';
              this.routeURL = 'login';
              this.showAlert = true;
            });
          }
          else
          {
               const billingCycle = this.registrationForm.value.billingCycle as 'monthly' | 'yearly';
            this.dialog.open(PaymentPromptDialogComponent, {
              data: {
                userId,
                packageName: selectedPackage?.value || 'Unknown',
                amount: selectedPackage?.amount || 0,
                source: 'register',
                billingCycle: billingCycle
              },
              disableClose: true,
              width: '400px'
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
      width: '400px'
    });
  }

  getConstructionTypeDisplayValue(): string {
    const selectedValues = this.registrationForm.get('constructionType')?.value;
    if (!selectedValues || selectedValues.length === 0) {
      return '';
    }
    return this.constructionTypes
      .filter(type => selectedValues.includes(type.value))
      .map(type => type.display)
      .join(', ');
  }

  getProjectPreferencesDisplayValue(): string {
    const selectedValues = this.registrationForm.get('projectPreferences')?.value;
    if (!selectedValues || selectedValues.length === 0) {
      return '';
    }
    return this.preferenceOptions
      .filter(pref => selectedValues.includes(pref.value))
      .map(pref => pref.display)
      .join(', ');
  }

  getProductsOfferedDisplayValue(): string {
    const selectedValues = this.registrationForm.get('productsOffered')?.value;
    if (!selectedValues || selectedValues.length === 0) {
      return '';
    }
    return this.supplierProducts
      .filter(prod => selectedValues.includes(prod.value))
      .map(prod => prod.display)
      .join(', ');
  }

  getDeliveryAreaDisplayValue(): string {
    const selectedValues = this.registrationForm.get('deliveryArea')?.value;
    if (!selectedValues || selectedValues.length === 0) {
      return '';
    }
    return this.deliveryAreas
      .filter(area => selectedValues.includes(area.value))
      .map(area => area.display)
      .join(', ');
  }

  closeAlert(): void {
    if(this.routeURL != ''){
      this.router.navigateByUrl('login');
    }
    this.showAlert = false;
  }

  onCountryBlur() {
  const ctrl = this.registrationForm.get('country');
  const val = ctrl?.value;

  // If not a valid object (user typed text only)
  if (!val || typeof val !== 'object') {
    ctrl?.setValue(null);
    ctrl?.setErrors({ invalidSelection: true });
  }
}

onStateBlur(): void {
  setTimeout(() => {
    const ctrl = this.registrationForm.get('state');
    const val = ctrl?.value;
    // only clear if still a string after dropdown selection settles
    if (!val || typeof val !== 'object') {
      ctrl?.setValue(null);
      ctrl?.setErrors({ invalidSelection: true });
    }
  }, 150);
}

selectedDialCode = '+1';
onPhoneInput(event: any) {
  const inputEl = event.target as HTMLInputElement;
  let value = inputEl.value || '';
  const dial = this.selectedCountryCode?.countryPhoneNumberCode || '';
  const phoneCtrl = this.registrationForm.get('phoneNumber');

  // Clean illegal characters but allow + only at start
  value = value
    .replace(/[^0-9\s()+-]/g, '')  // remove strange chars
    .replace(/(?!^)\+/g, '');      // remove any '+' that isn’t at start

  if (dial) {
    // Remove duplicate dial prefixes like +27+27 or +1+1
    const duplicatePattern = new RegExp(`^(\\+?${dial.replace('+', '\\+')}\\s*)+`);
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


// optional pretty format (basic local example)
private formatPhoneNumber(value: string, countryCode: string): string {
  if (countryCode === 'ZA' && value.length >= 3) {
    return `(${value.slice(0, 3)}) ${value.slice(3, 6)} ${value.slice(6)}`;
  }
  if (countryCode === 'US' && value.length >= 3) {
    return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
  }
  return value; // fallback
}
onCountrySelected(event: any): void {
  const selected = event.option.value;
  this.selectedCountryCode = selected;
  const countryCtrl = this.registrationForm.get('country');
  const stateCtrl = this.registrationForm.get('state');
  const phoneCtrl = this.registrationForm.get('phoneNumber');
  const dial = selected?.countryPhoneNumberCode || '';
  const currentValue = phoneCtrl?.value | 0;
  // Set country value
  countryCtrl?.setValue(selected, { emitEvent: false });

  // Clear dependent state
  stateCtrl?.reset('', { emitEvent: false });
  stateCtrl?.markAsPristine();
  stateCtrl?.markAsUntouched();

  // 🔍 Find matching dial code
  const match = this.countryNumberCode.find(
    (x) => x.countryId?.toLowerCase() === selected.id?.toLowerCase()
  );
  this.selectedDialCode = match?.countryPhoneNumberCode || '';

  // 🪄 If no phone entered yet, inject the code automatically
  if (this.selectedDialCode && !phoneCtrl?.value) {
    phoneCtrl?.setValue(`${this.selectedDialCode} `);
  }

  requestAnimationFrame(() => {
    this.countryAutoTrigger.closePanel();
    stateCtrl?.setValue(stateCtrl.value ?? '', { emitEvent: true });
  });
}



onStateSelected(event: any): void {
  const selected = event.option.value;
  const stateCtrl = this.registrationForm.get('state');

  // set object value directly without re-emitting
  stateCtrl?.setValue(selected, { emitEvent: false });

  // ✅ use the same logic as country: close panel in animation frame
  requestAnimationFrame(() => {
    this.stateAutoTrigger.closePanel();

    // Optional: blur to prevent flicker
    (document.activeElement as HTMLElement)?.blur();
  });

  // Mark as touched & valid
  stateCtrl?.markAsTouched();
  stateCtrl?.updateValueAndValidity();

  console.log('✅ Selected state:', selected);
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
      else reject(new Error('Google Maps API loaded but google object not defined'));
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
onCountryCodeChange(selected: any) {
  this.selectedCountryCode = selected;
  const dial = selected?.countryPhoneNumberCode || '';
  const phoneCtrl = this.registrationForm.get('phoneNumber');
  const currentValue = phoneCtrl?.value || '';

  if (!currentValue || !currentValue.startsWith('+')) {
    phoneCtrl?.setValue(dial + ' ');
  } else {
    // Replace old code if user switched countries
    const cleaned = currentValue.replace(/^\+\d+/, '');
    phoneCtrl?.setValue(dial + cleaned);
  }
}

}
