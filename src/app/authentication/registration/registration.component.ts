import {Component, OnInit} from '@angular/core';
import {MatCardModule} from "@angular/material/card";
import {MatGridListModule} from "@angular/material/grid-list";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import {AsyncPipe, NgForOf, NgIf} from "@angular/common";
import { MatSelectModule} from "@angular/material/select";
import {MatInputModule} from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import {MatButton} from "@angular/material/button";
import {HttpClient} from "@angular/common/http";
import {Router, ActivatedRoute} from "@angular/router";
import { environment } from '../../../environments/environment';
import {catchError, map, startWith} from 'rxjs/operators';
import { InvitationService } from '../../services/invitation.service';
import {Observable, of} from 'rxjs';
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
import {COMMA, ENTER} from '@angular/cdk/keycodes';
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

const BASE_URL = environment.BACKEND_URL;
export interface SubscriptionOption {
  id: number;
  subscription: string;
  amount: number;
}
@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [
    MatCardModule,
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
    MatIconModule
  ],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss'
})
export class RegistrationComponent implements OnInit{
  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '';
  token: string | null = null;
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

  subscriptionPackages: { value: string, display: string, amount: number }[] = [];

  countries = COUNTRIES;
  states: { [key: string]: { value: string, display: string }[] } = STATES;
  filteredCountries: Observable<any[]> | undefined;
  filteredStates: Observable<any[]> | undefined;

  userTypes = userTypes;
  separatorKeysCodes: number[] = [ENTER, COMMA];

  tradeCtrl = new FormControl();
  filteredTrades: Observable<{ value: string; display: string; }[]>;
  selectedTrades: { value: string; display: string; }[] = [];

  supplierTypeCtrl = new FormControl();
  filteredSupplierTypes: Observable<{ value: string; display: string; }[]>;
  selectedSupplierTypes: { value: string; display: string; }[] = [];

  registrationForm: FormGroup;
  user:string = "";
  certified = false;
  isLoading: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private httpClient: HttpClient,
    private router: Router,
    private stripeService: StripeService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private invitationService: InvitationService
  ) {
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

  ngOnInit() {
    this.loadSubscriptionPackages();
    this.registrationForm = this.formBuilder.group({
      firstName: [{value: '', disabled: true}, Validators.required],
      lastName: [{value: '', disabled: true}, Validators.required],
      phoneNumber: ['', Validators.required],
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
      latitude: [null],
      longitude: [null],
      formattedAddress: [''],
      googlePlaceId: [''],
      vatNo: [''],
      userType: ['PERSONAL_USE', Validators.required],

      constructionType: ([]),
      country: ['', Validators.required],
      state: ['', Validators.required],
      city: ['', Validators.required],

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

    this.user = 'PERSONAL_USE';

    // Update phone number validation based on country selection
    this.filteredCountries = this.registrationForm.get('country')?.valueChanges.pipe(
      startWith(''),
      map(value => this._filterCountries(value))
    );

    this.registrationForm.get('country')?.valueChanges.subscribe(countryValue => {
      const country = this.countries.find(c => c.display === countryValue);
      if (country) {
        this.updatePhoneNumberValidator(country.value);
        this.filteredStates = this.registrationForm.get('state')?.valueChanges.pipe(
          startWith(''),
          map(value => this._filterStates(value, country.value))
        );
      }
    });

    this.registrationForm.get('userType')?.valueChanges.subscribe(value => {
      this.user = value;
      this.selectedTrades = [];
      this.selectedSupplierTypes = [];
    });

    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
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


  private _filterCountries(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.countries.filter(option => option.display.toLowerCase().includes(filterValue));
  }

  private _filterStates(value: string, countryCode: string): any[] {
    const filterValue = value.toLowerCase();
    const countryStates = this.states[countryCode] || [];
    return countryStates.filter(option => option.display.toLowerCase().includes(filterValue));
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
          display: `${s.subscription} ($${s.amount.toFixed(2)})`,
          amount: s.amount
        }));
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
            this.routeURL = 'login';
          },
          error: () => {
            this.isLoading = false;
            this.alertMessage = 'Failed to complete registration.';
            this.showAlert = true;
          }
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

      if (this.user === 'SUBCONTRACTOR') {
        formValue.trades = this.selectedTrades.map(trade => trade.value);
      }

      if (this.user === 'VENDOR') {
        formValue.supplierTypes = this.selectedSupplierTypes.map(type => type.value);
      }

      this.httpClient.post(`${BASE_URL}/Account/register`, JSON.stringify(formValue), {
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
          this.alertMessage = 'Registration successful, please wait for account activation you shall be advised shortly';
          const userId = res.userId;
          if(this.registrationForm.value.subscriptionPackage.includes('Basic'))
          {
            this.routeURL = 'login';
            this.showAlert = true;
          }
          else if(this.registrationForm.value.subscriptionPackage.includes('Trial'))
          {
            const userId = res.userId;
            // Trigger trial subscription
            this.httpClient.post(`${BASE_URL}/Account/trailversion`, { userId }, {
              headers: { 'Content-Type': 'application/json' }
            }).subscribe(() => {
              this.alertMessage = 'Trial activated. Login to get started!';
              this.routeURL = 'login';
              this.showAlert = true;
            });
          }
          else
          {
            this.dialog.open(PaymentPromptDialogComponent, {
              data: {
                userId,
                packageName: selectedPackage?.value || 'Unknown',
                amount: selectedPackage?.amount || 0,
                source: 'register'
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
}
