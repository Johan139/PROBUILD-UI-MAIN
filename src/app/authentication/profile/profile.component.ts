import { Component, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { catchError, take, throwError } from 'rxjs';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ProfileService } from './profile.service';
import { AuthService } from '../../authentication/auth.service';
import { Profile, TeamMember, Document } from './profile.model';
import { userTypes } from '../../data/user-types';
import { TeamManagementService } from '../../services/team-management.service';
import {
  constructionTypes,
  preferenceOptions,
  supplierProducts,
  deliveryAreas,
  leadTimeDelivery,
  availabilityOptions,
  certificationOptions
} from '../../data/registration-data';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SubscriptionRow } from '../../models/SubscriptionRow'
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ConfirmationDialogComponent } from '../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import { PaymentIntentRequest, StripeService } from '../../services/StripeService';
import { isPlatformBrowser, NgForOf, NgIf } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { v4 as uuidv4 } from 'uuid';
import { JobsService } from '../../services/jobs.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PaymentPromptDialogComponent } from '../registration/payment-prompt-dialog.component';
import { SharedModule } from '../../shared/shared.module';
import { ManagePermissionsDialogComponent } from '../../shared/dialogs/manage-permissions-dialog/manage-permissions-dialog.component';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { SubscriptionUpgradeComponent } from '../subscription-upgrade/subscription-upgrade.component';
import { SubscriptionCreateComponent } from '../registration/subscription-create/subscription-create.component';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Observable, of } from 'rxjs';
import { startWith, map, switchMap } from 'rxjs/operators';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { RegistrationService } from '../../services/registration.service';
import { LogoService } from '../../services/logo.service';
import { MeasurementService, MeasurementSettings } from '../../services/measurement.service';


const BASE_URL = environment.BACKEND_URL;

interface SubscriptionPackage { value: string; amount: number; }
export interface PaymentRecord {
  id: number;
  userId: string;
  package: string;
  stripeSessionId: string;
  status: string;
  amount: number;
  paidAt: Date;
  validUntil: Date;
  isTrial: boolean;
}
export interface SubscriptionUpgradeDTO {
  subscriptionId: string;
  packageName: string; // use camelCase in TS
  userId:string;
  assignedUser:string | null;
}
export type ActiveMap = Record<string, { subscriptionId: string; packageLabel?: string }>;
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
      CommonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatDialogModule,
    MatMenuModule,
      MatTableModule,
  MatPaginatorModule,
  MatSortModule,
    NgForOf,
    NgIf,
    SharedModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})

export class ProfileComponent implements OnInit {
  cardTitle = 'User Profile';
  @ViewChild('countryAutoTrigger') countryAutoTrigger!: MatAutocompleteTrigger;
  @ViewChild('stateAutoTrigger') stateAutoTrigger!: MatAutocompleteTrigger;
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef;
  logoUrl: string | null = null;
  addressControl = new FormControl<string>('');
  options: { description: string; place_id: string }[] = [];
  selectedPlace: { description: string; place_id: string } | null = null;
  autocompleteService: google.maps.places.AutocompleteService | undefined;
  isGoogleMapsLoaded: boolean = false;
  profile: Profile | null = null;
  profileForm: FormGroup;
  teamForm: FormGroup;
  cancelTrail: boolean = false;
  isLoading = true;
  isSaving = false;
  rowBusy = new Set<string>();
  isSendingInvite = false;
  isBrowser: boolean;
  subscriptionPackages: { value: string, display: string, amount: number, annualAmount:number }[] = [];
  subscriptionuserPackages: { value: string, display: string, amount: number }[] = [];
  progress: number = 0;
  isUploading: boolean = false;
  uploadedFilesCount: number = 0;
  uploadedFileNames: string[] = [];
  uploadedFileUrls: string[] = [];
  sessionId: string = '';
  subscriptionActive: boolean = false;
  jobCardForm: FormGroup;
  userRole: string | null = null;
  isVerified = false;
countries: any[] = [];
states: any[] = [];
filteredCountries: Observable<any[]> = of([]);
filteredStates: Observable<any[]> = of([]);
  availableRoles: { value: string, display: string }[] = userTypes
    .filter(ut => ut.value !== 'GENERAL_CONTRACTOR')
    .filter(ut => ut.value !== 'SUBCONTRACTOR')
    .filter(ut => ut.value !== 'VENDOR');

  teamMembers: TeamMember[] = [];
  activeTeamMembers: TeamMember[] = [];
  deactivatedTeamMembers: TeamMember[] = [];
  documents: ProfileDocument[] = [];
  displayedColumns: string[] = ['name', 'role', 'email', 'status', 'actions'];
  documentColumns: string[] = ['name', 'type', 'uploadedDate', 'actions'];

//subscription variables
activeSubscriptionsData = new MatTableDataSource<SubscriptionRow>([]);
teamSubscriptionsData = new MatTableDataSource<SubscriptionRow>([]);
inactiveSubscriptionsData = new MatTableDataSource<SubscriptionRow>([]);
  subscriptionColumns: string[] = ['package', 'validUntil', 'amount', 'assignedUser', 'status', 'actions'];
subscriptionsData = new MatTableDataSource<SubscriptionRow>([]);
  isLoadingSubscriptions = false;
  subscriptionsError: string | null = null;
  constructionTypes = constructionTypes;
  preferenceOptions = preferenceOptions;
  supplierProducts = supplierProducts;
  deliveryAreas = deliveryAreas;
  leadTimeDelivery = leadTimeDelivery;
  availabilityOptions = availabilityOptions;
  certificationOptions = certificationOptions;

  alertMessage: string | undefined;
  showAlert: boolean | undefined;

@ViewChild(MatPaginator) subscriptionsPaginator!: MatPaginator;
@ViewChild(MatSort) subscriptionsSort!: MatSort;
//subscription children
@ViewChild('activePaginator') activePaginator!: MatPaginator;
@ViewChild('teamPaginator') teamPaginator!: MatPaginator;
@ViewChild('inactivePaginator') inactivePaginator!: MatPaginator;
//subscription sorting
@ViewChild('activeSort') activeSort!: MatSort;
@ViewChild('teamSort') teamSort!: MatSort;
@ViewChild('inactiveSort') inactiveSort!: MatSort;

  constructor(
    private profileService: ProfileService,
    public authService: AuthService,
    private fb: FormBuilder,
    private httpClient: HttpClient,
    private stripeService: StripeService,
    private dialog: MatDialog,
    private matIconRegistry: MatIconRegistry,
    private route: ActivatedRoute,
    private registrationService: RegistrationService,
    private router: Router,
    private domSanitizer: DomSanitizer,
    private jobsService: JobsService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private snackBar: MatSnackBar,
    private teamManagementService: TeamManagementService,
    private logoService: LogoService,
    private measurementService: MeasurementService
  ) {
       this.jobCardForm = new FormGroup({});
        this.isBrowser = isPlatformBrowser(this.platformId);
    this.profileForm = this.fb.group({
      id: [null],
      email: [null],
      firstName: [null, Validators.required],
      lastName: [null, Validators.required],
      phoneNumber: [null, Validators.required],
      userType: [null],
      companyName: [null],
      companyRegNo: [null],
      vatNo: [null],
      constructionType: [[]],
      nrEmployees: [null],
      yearsOfOperation: [null],
      certificationStatus: [null],
      certificationDocumentPath: [null],
      availability: [null],
      trade: [null],
      SessionId :[null],
      supplierType: [null],
      productsOffered: [[]],
      projectPreferences: [[]],
      deliveryArea: [[]],
      deliveryTime: [null],
      country: [null],
      state: [null],
      city: [null],
      subscriptionPackage: ['', Validators.required],
      isVerified: [false],
      address: [null],
      formattedAddress: [''],
      streetNumber: [''],
      streetName: [''],
      postalCode: [''],
      latitude: [null],
      longitude: [null],
      googlePlaceId: [''],
     notificationRadius: [100],
     jobPreferences: [[]],
      measurementSystem: ['Metric'],
      temperatureUnit: ['C']
    });

    this.teamForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      role: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.matIconRegistry.addSvgIcon(
      'verified',
      this.domSanitizer.bypassSecurityTrustResourceUrl('app/assets/custom-svg/verification-symbol-svgrepo-com.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'notVerified',
      this.domSanitizer.bypassSecurityTrustResourceUrl('app/assets/custom-svg/status-failed-svgrepo-com.svg')
    );
  }

  ngAfterViewInit(): void {
  this.subscriptionsData.paginator = this.subscriptionsPaginator;
  this.subscriptionsData.sort = this.subscriptionsSort;

  this.activeSubscriptionsData.paginator = this.activePaginator;
  this.teamSubscriptionsData.paginator = this.teamPaginator;
  this.inactiveSubscriptionsData.paginator = this.inactivePaginator;

  this.activeSubscriptionsData.sort = this.activeSort;
  this.teamSubscriptionsData.sort = this.teamSort;
  this.inactiveSubscriptionsData.sort = this.inactiveSort;

    this.addressControl.valueChanges.subscribe(value => {
      if (typeof value === 'string' && value.trim()) {
        this.autocompleteService?.getPlacePredictions({ input: value }, (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            this.options = predictions.map(pred => ({
              description: pred.description,
              place_id: pred.place_id,
            }));
          } else {
            this.options = [];
          }
        });
      } else {
        this.options = [];
      }
    });
  }

  ngOnInit(): void {
    this.loadSubscriptionPackages();

this.registrationService.getCountries().subscribe(countries => {
  this.countries = countries;
});

this.registrationService.getAllStates().subscribe(allStates => {
  this.states = allStates;

  const countryCtrl = this.profileForm.get('country')!;
  const stateCtrl = this.profileForm.get('state')!;

  this.filteredStates = combineLatest([
    countryCtrl.valueChanges.pipe(startWith(countryCtrl.value)),
    stateCtrl.valueChanges.pipe(startWith(''))
  ]).pipe(
    map(([countryId, search]) => {
      const term = (typeof search === 'string' ? search : '').toLowerCase();
      if (!countryId) return [];

      const normalizedCountryId = (countryId + '').toLowerCase();
      const inCountry = this.states.filter(s =>
        (s.countryId + '').toLowerCase() === normalizedCountryId
      );

      return term
        ? inCountry.filter(s =>
            (s.stateName ?? '').toLowerCase().includes(term) ||
            (s.stateCode ?? '').toLowerCase().includes(term)
          )
        : inCountry;
    })
  );
});

this.filteredCountries = this.profileForm.get('country')!.valueChanges.pipe(
  startWith(''),
  map(value => this._filterCountries(value))
);

    this.authService.currentUser$.subscribe(user => {
      this.userRole = this.authService.getUserRole();
      if (user && user.id) {
        this.loadProfile();
        this.loadDocuments();
        this.checkSubscription();
       this.manageSubscriptions();
        this.GetUserSubscription();
      } else if (!this.authService.isLoggedIn()) {
        this.isLoading = false;
      }
    });
  console.log(this.subscriptionPackages)
     this.route.queryParamMap.pipe(take(1)).subscribe(params => {
      if (params.get('subSuccess') === '1') {
        this.snackBar.open('Subscription successfully added', 'Dismiss', { duration: 5000 });
        // remove the param from the URL
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { subSuccess: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
    });

    this.sessionId = uuidv4();
    this.profileService.initializeSignalR();

    this.profileService.progress$.subscribe(progress => {
      this.progress = progress;
    });

    this.profileService.uploadComplete$.subscribe(fileCount => {
      this.isUploading = false;
      this.resetFileInput();
      console.log(`Upload complete. Total ${fileCount} file(s) uploaded.`);
    });

    if (this.isBrowser) {
      this.profileService.loadGoogleMapsScript().then(() => {
        this.isGoogleMapsLoaded = true;
        this.autocompleteService = new google.maps.places.AutocompleteService();
      }).catch(err => console.error('Google Maps script loading error:', err));
    }

    this.measurementService.getSettings().subscribe(settings => {
      if (this.profileForm.get('measurementSystem')?.value !== settings.system) {
        this.profileForm.get('measurementSystem')?.setValue(settings.system, { emitEvent: false });
      }
      if (this.profileForm.get('temperatureUnit')?.value !== settings.temperature) {
        this.profileForm.get('temperatureUnit')?.setValue(settings.temperature, { emitEvent: false });
      }
    });

    this.profileForm.get('measurementSystem')?.valueChanges.subscribe(value => {
      this.measurementService.updateSettings({ system: value });
    });

    this.profileForm.get('temperatureUnit')?.valueChanges.subscribe(value => {
      this.measurementService.updateSettings({ temperature: value });
    });
  }
private _filterCountries(value: string | null): any[] {
  const filterValue = (value ?? '').toLowerCase();
  return !filterValue
    ? this.countries
    : this.countries.filter(c =>
        c.countryName.toLowerCase().includes(filterValue) ||
        c.countryCode.toLowerCase().includes(filterValue)
      );
}
countryDisplayFn = (id: string) =>
  this.countries.find(c => c.id === id)?.countryName ?? '';

stateDisplayFn = (state: any) => {
  if (typeof state === 'string') {
    return this.states.find(s => s.id === state)?.stateName ?? '';
  } else if (state && typeof state === 'object') {
    return state.stateName || '';
  }
  return '';
};
openCountryPanel() {
  const ctrl = this.profileForm.get('country');
  ctrl?.setValue(ctrl.value ?? '', { emitEvent: true });
  setTimeout(() => this.countryAutoTrigger?.openPanel());
}

openStatePanel() {
  const ctrl = this.profileForm.get('state');
  ctrl?.setValue(ctrl.value ?? '', { emitEvent: true });
  setTimeout(() => this.stateAutoTrigger?.openPanel());
}
loadProfile(): void {
  this.isLoading = true;

  this.profileService.getProfile().pipe(
    catchError(err => {
      const currentUser = this.authService.currentUserSubject.value;
      if (currentUser && currentUser.isTeamMember && currentUser.id) {
        return this.profileService.getTeamMemberProfile(currentUser.id);
      }
      return throwError(() => err);
    }),
    switchMap((data: Profile | Profile[]) => {
      const profileData = Array.isArray(data) ? data[0] : data;
      this.profile = profileData;

      // Load countries & states in parallel before patching form
      return combineLatest([
        this.registrationService.getCountries(),
        this.registrationService.getAllStates()
      ]).pipe(
        take(1),
        map(([countries, states]) => ({ profileData, countries, states }))
      );
    })
  ).subscribe({
    next: ({ profileData, countries, states }) => {
      this.countries = countries;
      this.states = states;

      this.profileForm.patchValue(profileData); // includes country & state IDs
      this.isVerified = profileData.isVerified ?? false;

      this.loadTeamMembers();
      this.loadUserLogo();
      this.isLoading = false;
    },
    error: () => {
      this.snackBar.open('Failed to load profile. Please try again.', 'Close', { duration: 3000 });
      this.isLoading = false;
    }
  });
}

  onAddressSelected(event: MatAutocompleteSelectedEvent): void {
    const selectedAddress = event.option.value;
    this.selectedPlace = selectedAddress;

    const placesService = new google.maps.places.PlacesService(this.addressInput.nativeElement);
    placesService.getDetails(
      {
        placeId: selectedAddress.place_id,
        fields: [
          'place_id',
          'geometry',
          'formatted_address',
          'address_components'
        ]
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const components = place.address_components || [];
          const getComponent = (type: string) =>
            components.find(c => c.types.includes(type))?.long_name || '';

          const patchObj = {
            address: selectedAddress.description,
            formattedAddress: place.formatted_address || selectedAddress.description,
            streetNumber: getComponent('street_number'),
            streetName: getComponent('route'),
            city: getComponent('locality'),
            state: getComponent('administrative_area_level_1'),
            postalCode: getComponent('postal_code'),
            country: getComponent('country'),
            latitude: place.geometry?.location?.lat() ?? null,
            longitude: place.geometry?.location?.lng() ?? null,
            googlePlaceId: place.place_id || selectedAddress.place_id,  // fallback if needed
          };

          this.profileForm.patchValue(patchObj);
          this.addressControl.setValue(patchObj.address);
          console.log('🔄 Google Place data patched:', patchObj);
        }
      }
    );

  }

  private loadSubscriptionPackages(): void {
    this.stripeService.getSubscriptions().subscribe({
      next: (subscriptions) => {
        console.log(subscriptions)
        this.subscriptionPackages = subscriptions.map(s => ({
          value: s.subscription,
          display: `${s.subscription}`,
          amount: s.amount,
          annualAmount: s.annualAmount
        }));
      },
      error: (err) => {
        console.error('Failed to load subscription packages:', err);
      }
    });
  }

  checkSubscription(): void {
    this.profileService.hasActiveSubscription().subscribe({
      next: (res) => {
        this.subscriptionActive = res.hasActive;
        if (!res.hasActive) {
          this.alertMessage = "You do not have an active subscription. Please subscribe to create a job quote.";
        }
      },
      error: (err) => {
        console.error('Subscription check failed', err);
        this.alertMessage = "Unable to verify subscription. Try again later.";
        this.showAlert = true;
      }
    });
  }
  isInactiveRow(r: SubscriptionRow): boolean {
  return !r.status || r.status.toLowerCase() !== 'active';
}
manageSubscriptions(): void {
  this.isLoadingSubscriptions = true;
  this.subscriptionsError = null;

  this.profileService.manageSubscriptions().subscribe({
    next: (res) => {

      const raw = Array.isArray(res) ? res : (res ?? []);

      const normalized: SubscriptionRow[] = (raw || []).map((x: any) => {
        const pkg =
          x.package ?? x.plan ?? x.planName ?? x.product ?? x.subscription ?? x.packageName ?? '—';

        const validUntilRaw =
          x.validUntil ?? x.current_period_end ?? x.currentPeriodEnd ?? x.endDate ?? x.expiresAt ?? null;

        let validUntil: Date | null = null;
        if (validUntilRaw != null) {
          validUntil =
            typeof validUntilRaw === 'number'
              ? new Date(validUntilRaw < 2_000_000_000 ? validUntilRaw * 1000 : validUntilRaw)
              : new Date(validUntilRaw);
        }

        const amountRaw = x.amount ?? x.amount_total ?? x.unit_amount ?? x.price ?? x.total ?? 0;
        const amount = typeof amountRaw === 'number' && amountRaw > 10000 ? amountRaw / 100 : amountRaw;

        const assignedUser = x.assignedUser ?? x.user ?? x.userEmail ?? x.customer_email ?? null;
        const assignedUserName = x.assignedUserName ?? x.user ?? x.userEmail ?? x.customer_email ?? null;


        const subscriptionId = x.subscriptionId ?? x.subscriptionID ?? x.id ?? x.subscription?.id ?? '';

          const isTrial = x.isTrial === true || String(x.status ?? '').toLowerCase() === 'trialing';
  let status = String(x.status ?? '').toLowerCase();
  if (!status && isTrial) status = 'trialing';

        return { package: pkg, validUntil, amount, assignedUser, assignedUserName, status, subscriptionId };
      });

      // --- (old quick filters kept for reference) ---
      const assignedIsNull = (r: SubscriptionRow) =>
        ((r.assignedUser == null) || String(r.assignedUser).trim() === '') &&
        ((r.status ?? '').toLowerCase() === 'active');

      const assignedIsNotNull = (r: SubscriptionRow) =>
        ((r.status ?? '').toLowerCase() === 'active') &&
        !((r.assignedUser == null) || String(r.assignedUser).trim() === '');
      // ----------------------------------------------

      // --- NEW: viewer-aware bucketing ---
      const meId = (this.authService.currentUserSubject.value?.id ??
                    String(localStorage.getItem('userId') || '')
                   ).trim().toLowerCase();

      const meEmail = (this.authService.currentUserSubject.value?.email ??
                       this.profileForm.get('email')?.value ??
                       ''
                      ).trim().toLowerCase();

      const iAmTeamMember = this.authService.isTeamMember();

      const isActive = (r: SubscriptionRow) =>
        String(r.status || '').toLowerCase() === 'active';

      const assignedLower = (r: SubscriptionRow) =>
        String(r.assignedUser ?? '').trim().toLowerCase();

      const assignedNameLower = (r: SubscriptionRow) =>
        String((r as any).assignedUserName ?? '').trim().toLowerCase();

      // Match either by stored id/email in assignedUser, or by email in assignedUserName
      const isAssignedToMe = (r: SubscriptionRow) => {
        const a = assignedLower(r);
        const an = assignedNameLower(r);
        return (a && (a === meId || a === meEmail)) || (an && an === meEmail);
      };

      const isUnassigned = (r: SubscriptionRow) => assignedLower(r) === '';

      // What I should see as "Active"
      const mine = normalized.filter(r =>
        isActive(r) && (
          iAmTeamMember
            ? isAssignedToMe(r)                  // team member: seats assigned to me
            : (isUnassigned(r) || isAssignedToMe(r)) // owner: unassigned (self) or explicitly assigned to me
        )
      );

      // What goes to "Team"
      const team = normalized.filter(r =>
        isActive(r) &&
        !isUnassigned(r) &&
        !isAssignedToMe(r)
      );

      const inactive = normalized.filter(r => this.isInactiveRow(r));
      // --- END NEW ---

      this.activeSubscriptionsData.data   = mine;
      this.teamSubscriptionsData.data     = team;
      this.inactiveSubscriptionsData.data = inactive;

      // (Optional: keep the combined table in sync if you still use it anywhere)
      this.subscriptionsData.data = normalized;

      this.isLoadingSubscriptions = false;
    },
    error: (err) => {
      console.error('manageSubscriptions failed', err);
      this.subscriptionsError = 'Unable to load subscriptions. Try again later.';
      this.isLoadingSubscriptions = false;
    },
  });
}


GetUserSubscription(): void {
  this.profileService.getUserSubscription().subscribe({
    next: (res) => {
      this.subscriptionuserPackages = res.map(s => ({
        value: s.package,                              // server’s code/name
        display: `${s.package} ($${s.amount.toFixed(2)})`,
        amount: s.amount
      }));

      const activeCode = this.subscriptionuserPackages?.[0]?.value ?? null;
      if (activeCode) {
        // Prefer direct code match in your known packages
        const match = this.subscriptionPackages.find(p =>
          p.value.toLowerCase() === activeCode.toLowerCase()
          || p.display.toLowerCase().startsWith(activeCode.toLowerCase()) // fallback if backend sends display text
        );
        if (match) {
          this.profileForm.get('subscriptionPackage')?.setValue(match.value);
        }
      }
    },
    error: (err) => {
      console.error('Subscription check failed', err);
      this.alertMessage = "Unable to verify subscription. Try again later.";
      this.showAlert = true;
    }
  });
}



  loadTeamMembers(): void {
    const currentUser = this.authService.currentUserSubject.value;
    if (!currentUser || !currentUser.id) {
      this.snackBar.open('User not fully loaded. Please try again.', 'Close', { duration: 3000 });
      return;
    }
    const userId = currentUser.isTeamMember ? currentUser.inviterId : currentUser.id;
    this.teamManagementService.getTeamMembers(userId).subscribe({
      next: (members: TeamMember[]) => {
        this.teamMembers = members;
        this.activeTeamMembers = members.filter(m => m.status !== 'Deactivated' && m.status !== 'Deleted');
        this.deactivatedTeamMembers = members.filter(m => m.status === 'Deactivated');
      },
      error: (error) => {
        console.error('[ProfileComponent] Error loading team members:', error);
        this.snackBar.open('Failed to load team members.', 'Close', { duration: 3000 });
      }
    });
  }

  loadDocuments(): void {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) {
      console.warn('UserId not found for document fetch');
      return;
    }

    this.profileService.getUserDocuments(userId).subscribe({
      next: (docs: ProfileDocument[]) => {
        this.documents = docs.map(doc => ({
          ...doc,
          name: doc.fileName,
          type: 'Uploaded', // Placeholder until backend sends a real type
          uploadedDate: new Date(), // Or parse if available
          path: doc.blobUrl
        }));
      },
      error: (err) => {
        console.error('Failed to fetch documents:', err);
      }
    });
  }

  viewDocument(document: any): void {
    this.profileService.downloadJobDocument(document.id).subscribe({
      next: (response: Blob) => {
        // Infer MIME type based on extension
        const extension = document.name?.split('.').pop()?.toLowerCase();
        let mimeType = 'application/octet-stream'; // fallback

        if (extension === 'pdf') mimeType = 'application/pdf';
        else if (['png', 'jpg', 'jpeg'].includes(extension)) mimeType = `image/${extension}`;
        else if (extension === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (extension === 'doc') mimeType = 'application/msword';

        const blob = new Blob([response], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const newTab = window.open(url, '_blank');

        if (!newTab) {
          this.alertMessage = 'Failed to open document. Please allow pop-ups for this site.';
          this.showAlert = true;
        }

        // Cleanup after 10 seconds
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: (err) => {
        console.error('Error viewing document:', err);
        this.alertMessage = 'Failed to view document.';
        this.showAlert = true;
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.valid && !this.isSaving) {
      this.isSaving = true;
      this.profileForm.patchValue({
        SessionId: this.sessionId
      });
      const updatedProfile: Profile = this.profileForm.value;

      this.profileService.updateProfile(updatedProfile).subscribe({
        next: (response: Profile) => {
          this.profile = response;
          this.profileForm.patchValue(response);
          this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
                               const selectedPackageValue = this.profileForm.value.subscriptionPackage;
                      const selectedPackage = this.subscriptionPackages.find(p => p.value === selectedPackageValue);


          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.snackBar.open('Failed to update profile. Please try again.', 'Close', { duration: 3000 });
          this.isSaving = false;
        }
      });
    } else {
      this.snackBar.open('Please fill all required fields correctly.', 'Close', { duration: 3000 });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) {
      console.error('No files selected');
      return;
    }

    const newFileNames = Array.from(input.files).map(file => file.name);
    this.uploadedFileNames = [...this.uploadedFileNames, ...newFileNames];

    const formData = new FormData();
    Array.from(input.files).forEach(file => {
      formData.append('Blueprint', file);
    });
    formData.append('Title', this.jobCardForm.get('Title')?.value || 'test');
    formData.append('Description', this.jobCardForm.get('Description')?.value || 'tester');
    formData.append('sessionId', this.sessionId);

    this.progress = 0;
    this.isUploading = true;

    this.profileService.uploadImage(formData).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          const newFilesCount = newFileNames.length;
          this.uploadedFilesCount += newFilesCount;
          if (event.body?.fileUrls) {
            this.uploadedFileUrls = [...this.uploadedFileUrls, ...event.body.fileUrls];
          }
          this.isUploading = false;
          this.resetFileInput();
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.progress = 0;
        this.isUploading = false;
        this.uploadedFileNames = this.uploadedFileNames.filter(name => !newFileNames.includes(name));
        this.resetFileInput();
      }
    });
  }

  addTeamMember(): void {
    if (this.teamForm.valid) {
      this.isSendingInvite = true;
      const newMember: TeamMember = this.teamForm.value;
      const inviterId = this.authService.currentUserSubject.value?.id;
      if (!inviterId) {
        this.snackBar.open('Cannot add team member: User not logged in.', 'Close', { duration: 3000 });
        this.isSendingInvite = false;
        return;
      }
      this.teamManagementService.addTeamMember(newMember, inviterId).subscribe({
        next: (member: TeamMember) => {
          this.teamMembers = [...this.teamMembers, member];
          this.loadTeamMembers();
          this.teamForm.reset();
          Object.keys(this.teamForm.controls).forEach(key => {
            const control = this.teamForm.get(key);
            control?.setErrors(null);
            control?.markAsPristine();
            control?.markAsUntouched();
          });
          this.snackBar.open('Team member invited successfully', 'Close', {
            duration: 3000,
          });
          this.isSendingInvite = false;
        },
        error: (error) => {
          if (error.status === 409) {
            this.snackBar.open(error.error.message, 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          } else {
            this.snackBar.open('Failed to add team member.', 'Close', { duration: 3000 });
          }
          this.isSendingInvite = false;
        }
      });
    } else {
      this.snackBar.open('Please fill all required fields correctly.', 'Close', { duration: 3000 });
    }
  }

  resetFileInput(): void {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
      console.log('File input reset');
    }
  }

  openConfirmationDialog(memberId: string, action: 'deactivate' | 'reactivate' | 'delete'): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: `Confirm ${action}`,
        message: `Are you sure you want to ${action} this team member?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        switch (action) {
          case 'deactivate':
            this.deactivateTeamMember(memberId);
            break;
          case 'reactivate':
            this.reactivateTeamMember(memberId);
            break;
          case 'delete':
            this.deleteTeamMember(memberId);
            break;
        }
      }
    });
  }
  private lc(v: any): string {
  return String(v ?? '').trim().toLowerCase();
}

/** True if this row’s seat is assigned to the current viewer (id or email match) */
private isAssignedToMe(row: SubscriptionRow): boolean {
  const meId    = this.lc(this.authService.currentUserSubject.value?.id ?? localStorage.getItem('userId'));
  const meEmail = this.lc(this.authService.currentUserSubject.value?.email ?? this.profileForm.get('email')?.value);

  const a  = this.lc(row.assignedUser);
  const an = this.lc((row as any).assignedUserName);

  // assignedUser may carry id or email; assignedUserName often carries email
  return (!!a && (a === meId || a === meEmail)) || (!!an && an === meEmail);
}

/** Only allow manage if the seat is NOT assigned to me (i.e., I’m the payer/owner view) */
canManageRow(row: SubscriptionRow): boolean {
  return !this.isAssignedToMe(row);
}
cancelSubscription(row: SubscriptionRow): void {
  if (!this.canManageRow(row) || this.isInactiveRow(row)) return;
  const id = row.subscriptionId;

  if (!id) {
    this.snackBar.open('Missing subscription id.', 'Close', { duration: 2500 });
    return;
  }


  this.rowBusy.add(id!);
this.stripeService.cancelSubscription(id!).subscribe({
    next: () => {
      this.snackBar.open('Subscription cancelled.', 'Close', { duration: 3000 });
      this.manageSubscriptions(); // refresh table
    },
    error: (err) => {
      console.error('cancelSubscriptionById failed', err);
      this.snackBar.open('Failed to cancel subscription.', 'Close', { duration: 3000 });
    },
    //complete: () => this.rowBusy.delete(id),
  });
}
canceltrailSubscription(row: string): void {

  if (!row) {
    this.snackBar.open('Missing subscription id.', 'Close', { duration: 2500 });
    return;
  }


  this.rowBusy.add(row!);
this.stripeService.cancelSubscription(row!).subscribe({
    next: () => {
      this.snackBar.open('Subscription cancelled.', 'Close', { duration: 3000 });
      this.manageSubscriptions(); // refresh table
    },
    error: (err) => {
      console.error('cancelSubscriptionById failed', err);
      this.snackBar.open('Failed to cancel subscription.', 'Close', { duration: 3000 });
    },
    //complete: () => this.rowBusy.delete(id),
  });
}
upgradeSubscription(row: SubscriptionRow) {
  if (!this.canManageRow(row) || this.isInactiveRow(row)) return;
  this.openSubscriptionUpgradeDialog(row);
}

createPaymentSession(selectedPackage: { display: string; amount: number }) {
  this.openSubscriptionCreateDialog();
}

/** Try to resolve the active plan's *code* (the same value you use in subscriptionPackages[].value). */
/** Resolve the active plan *code* (matches subscriptionPackages[].value). */
private getActivePlanCode(): string | null {
  const normalize = (s: string) =>
    (s || '')
      .toLowerCase()
      .replace(/\s*\(\$[\d.,]+.*?\)\s*/g, '')   // strip "( $xxx ... )"
      .replace(/\s*until\s+\d{4}-\d{2}-\d{2}.*/i, '') // strip "Until YYYY-MM-DD ..."
      .replace(/\s*:\s*\$[\d.,]+.*$/, '')       // strip ": $xxx ..." tails
      .replace(/\s+/g, ' ')
      .trim();

  // 1) Prefer the row that is Active AND has no assigned user
  const allRows =
    (this.subscriptionsData?.data ?? [])
      .concat(this.activeSubscriptionsData?.data ?? []); // safe union

  const selfActive = allRows.find(r =>
    (r.status ?? '').toLowerCase() === 'active' &&
    (!r.assignedUser || String(r.assignedUser).trim() === '')
  );

  if (selfActive?.package) {
    const rowName = normalize(selfActive.package);
    const match = (this.subscriptionPackages ?? []).find(p =>
      normalize(p.value) === rowName || normalize(p.display) === rowName
    );
    if (match) return match.value; // ✅ the code your mat-options use
  }

  // 2) Fallback: first entry from getUserSubscription() (if you kept that)
  const codeFromUserList = this.subscriptionuserPackages?.[0]?.value ?? null;
  if (codeFromUserList) return codeFromUserList;

  // 3) Last resort: whatever is in the form
  return this.profileForm.get('subscriptionPackage')?.value ?? null;
}

private getRowPlanCode(row: SubscriptionRow): string | null {
  // If your row already carries a code, use it directly
  const direct =
    (row as any).packageCode ??
    (row as any).planCode ??
    (row as any).packageName ??
    null;
  if (direct) return String(direct);

  const normalize = (s: string) =>
    (s || '')
      .toLowerCase()
      .replace(/\s*\(\$[\d.,]+.*?\)\s*/g, '')     // drop "( $xxx ... )"
      .replace(/\s*[—-]\s*current.*/i, '')        // drop "— current"
      .replace(/\s*until\s+\d{4}-\d{2}-\d{2}.*/i, '') // drop "until YYYY-MM-DD …"
      .replace(/\s*:\s*\$[\d.,]+.*$/, '')         // drop ": $xxx …"
      .replace(/\s+/g, ' ')
      .trim();

  const label =
    (row as any).package ??
    (row as any).plan ??
    (row as any).name ??
    '';

  if (!label) return null;

  const n = normalize(String(label));

  const match = (this.subscriptionPackages ?? []).find((p: any) => {
    const candidates = [
      p.value,
      p.display,
      p.name,
      p.label
    ].filter(Boolean).map((x: string) => normalize(String(x)));
    return candidates.includes(n);
  });

  return match?.value ?? null;
}
startCheckoutForUpgrade(
  pkgCode: string,
  assignedUser: string | null,
  billingCycle: 'monthly' | 'yearly' = 'monthly',
  subscriptionId: string
): void {
  const pkgMeta = this.subscriptionPackages.find(p =>
    String(p.value).toLowerCase() === String(pkgCode).toLowerCase()
  );
  if (!pkgMeta) {
    this.snackBar.open('Unknown package selected.', 'Close', { duration: 3000 });
    return;
  }

  const userId = String(localStorage.getItem('userId') ?? '');
  this.stripeService.createCheckoutSession({
    userId,
    packageName: pkgMeta.value,
    amount: billingCycle === 'yearly' ? (pkgMeta.annualAmount ?? pkgMeta.amount) : pkgMeta.amount,
    source: 'profile',           // 👈 makes intent explicit on backend
    assignedUser: assignedUser ?? userId,
    billingCycle
  }).subscribe({
    next: res => {window.location.assign(res.url); this.canceltrailSubscription(subscriptionId);},
    error: err => {
      console.error('Checkout session error', err);
      this.snackBar.open('Failed to start checkout.', 'Close', { duration: 3500 });
    }
  });
}
openSubscriptionUpgradeDialog(subscription: SubscriptionRow): void {
  const subscriptionId = subscription.subscriptionId ?? (subscription as any)['id'] ?? null;
  const assignedUser   = subscription.assignedUser ?? (subscription as any)['assignedUser'] ?? null;

  // Determine current plan code for preselect
  const currentValueFromRow = this.getRowPlanCode(subscription);
  const currentValue =
    currentValueFromRow ??
    this.getActivePlanCode() ??
    this.profileForm.get('subscriptionPackage')?.value ?? null;

  const dialogRef = this.dialog.open(SubscriptionUpgradeComponent, {
    width: '600px',
    autoFocus: false,
    data: {
      packages: this.subscriptionPackages,
      currentValue,
      isTeamMember: this.authService.isTeamMember(),
      subscriptionId,                 // MAY be null for trial
      userId: String(localStorage.getItem('userId') || '')
    }
  });

  // Expect either a string (pkgCode) or an object with pkgCode & billingCycle
  dialogRef.afterClosed().subscribe((result?: string | { subscriptionPackage: string; billingCycle?: 'monthly'|'yearly' }) => {
    if (!result) return;

    const pkgCode      = typeof result === 'string' ? result : result.subscriptionPackage;
    const billingCycle = typeof result === 'string' ? 'monthly' : (result.billingCycle ?? 'monthly');
console.log(pkgCode)
    // reflect selection
    this.profileForm.patchValue({ subscriptionPackage: pkgCode });
    this.profileForm.get('subscriptionPackage')?.markAsDirty();

    // 🔀 Branch: trial (no subscription) → Checkout; normal (has subscription) → API upgrade
    if (subscriptionId.includes('trial')) {
      this.startCheckoutForUpgrade(pkgCode, assignedUser, billingCycle,subscriptionId);

      return;
    }

    this.rowBusy.add(subscriptionId);
    const payload: SubscriptionUpgradeDTO = {
      subscriptionId,
      packageName: pkgCode,
      userId: String(localStorage.getItem('userId')),
      assignedUser
    };

    this.stripeService.upgradeSubscriptionByPackage(payload).subscribe({
      next: () => {
        this.snackBar.open(
          'Subscription upgraded. Proration will be billed on your next invoice.',
          'Close',
          { duration: 3500 }
        );
        this.manageSubscriptions();
      },
      error: (err) => {
        console.error('Upgrade failed', err);
        this.snackBar.open('Failed to upgrade subscription.', 'Close', { duration: 3500 });
      },
      complete: () => this.rowBusy.delete(subscriptionId)
    });
  });
}

/** Emails with an active/trial subscription */
private getActiveSubscriptionEmails(): Set<string> {
  const ACTIVE = new Set(['active', 'trialing']);
  const rows = (this.subscriptionsData?.data ?? [])
    .concat(this.teamSubscriptionsData?.data ?? [])
    .concat(this.activeSubscriptionsData?.data ?? []);

  const emails = new Set<string>();
  for (const r of rows) {
    const status = String(r.status || '').toLowerCase();
    const email = String(r.assignedUserName ?? '')
      .trim()
      .toLowerCase();
console.log(email)
    if (email && ACTIVE.has(status)) emails.add(email);
  }
  return emails;
}
getActiveByUserIdForSelf(): ActiveMap {
  const map: ActiveMap = {};
  const selfId =
    this.authService.currentUserSubject.value?.id ??
    String(localStorage.getItem('userId') || '');

  if (!selfId) return map;

  const ACTIVE = new Set(['active', 'trialing']);
  const rows = (this.subscriptionsData?.data ?? [])
    .concat(this.teamSubscriptionsData?.data ?? [])
    .concat(this.activeSubscriptionsData?.data ?? []);

  const selfActive = rows.find(r =>
    // self rows have no assigned user
    (!r.assignedUser || String(r.assignedUser).trim() === '') &&
    ACTIVE.has(String(r.status || '').toLowerCase())
  );

  if (selfActive) {
    map[selfId] = {
      subscriptionId: String(selfActive.subscriptionId ?? selfActive['id'] ?? ''),
      packageLabel: String(selfActive.package ?? '')
    };
  }
  return map;
}

openSubscriptionCreateDialog(): void {
  const activeEmails = this.getActiveSubscriptionEmails();

  // get all registered first so we can count who got hidden
  const allRegisteredTeam = (this.teamMembers ?? [])
    .filter(m => (m.status ?? '').toLowerCase().trim() === 'registered');

  const teamBlockedCount = allRegisteredTeam
    .filter(m => m.email && activeEmails.has(m.email.toLowerCase()))
    .length;

  // keep your existing email-based filtering
  const registeredTeam = allRegisteredTeam
    .filter(m => !m.email || !activeEmails.has(m.email.toLowerCase()));

  // self-block using your existing self map
  const selfMap = this.getActiveByUserIdForSelf();
  const selfId = String(localStorage.getItem('userId') || '');
  const selfBlocked = !!selfMap[selfId];

  // short, descriptive message
  const notice =
    selfBlocked && teamBlockedCount > 0
      ? `You already have a subscription. ${teamBlockedCount} team member${teamBlockedCount > 1 ? 's' : ''} already subscribed.`
      : selfBlocked
        ? 'You already have an active subscription.'
        : teamBlockedCount > 0
          ? `${teamBlockedCount} team member${teamBlockedCount > 1 ? 's' : ''} already subscribed.`
          : null;
  console.log(this.subscriptionPackages)
  this.dialog.open(SubscriptionCreateComponent, {
    width: '600px',
    autoFocus: false,
    data: {
      packages: this.subscriptionPackages,
      currentValue: this.profileForm.get('subscriptionPackage')?.value ?? null,
      isTeamMember: this.authService.isTeamMember(),
      userId: selfId,
      teamMembers: registeredTeam.map(m => ({
        id: m.id,
        name: `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim(),
        email: m.email
      })),
      activeByUserId: selfMap,
      notice
    }
  })
  .afterClosed()
  .subscribe((sel?: { pkg: { value: string; amount: number }; assigneeUserId: string; billingCycle: 'monthly' | 'yearly'; annualAmount:number  }) => {
    if (!sel) return;
     const { pkg, assigneeUserId, billingCycle } = sel;

    this.profileForm.patchValue({ subscriptionPackage: pkg.value });
    this.profileForm.get('subscriptionPackage')?.markAsDirty();
         if(String(pkg?.value ?? "").toLowerCase().includes("Basic"))
          {
            //this.routeURL = 'login';
            this.showAlert = true;
          } else
if (String(pkg?.value ?? "").toLowerCase().includes("trial")) {

  const userId = String(localStorage.getItem('userId') ?? '');
            const packageName = pkg.value;
            // Trigger trial subscription
            this.httpClient.post(`${BASE_URL}/Account/trailversion`, { userId, packageName }, {
              headers: { 'Content-Type': 'application/json' }
            }).subscribe(() => {
              this.alertMessage = 'Your trial account is now active. Please confirm your email and sign in to begin.';
              //this.routeURL = 'login';
              this.showAlert = true;
            });
}else
{
    this.stripeService.createCheckoutSession({
      userId: String(localStorage.getItem('userId') ?? ''),
      packageName: pkg.value,
      amount: pkg.amount,
      source: 'profile',
      assignedUser: assigneeUserId,
      billingCycle
    }).subscribe({
      next: res => window.location.assign(res.url),
      error: err => console.error('Checkout session error', err)
    });
    }
  });

}


  openPermissionsDialog(teamMemberId: string, firstName: string, lastName: string): void {
    this.teamManagementService.getPermissions(teamMemberId).subscribe(permissions => {
      const dialogRef = this.dialog.open(ManagePermissionsDialogComponent, {
        width: '500px',
        data: {
          teamMemberId,
          teamMemberName: `${firstName} ${lastName}`,
          permissions
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.snackBar.open('Permissions updated successfully', 'Close', {
            duration: 3000
          });
        }
      });
    });
  }

  deactivateTeamMember(id: string): void {
    this.teamManagementService.deactivateTeamMember(id).subscribe({
      next: () => {
        const member = this.teamMembers.find(m => m.id === id);
        if (member) {
          member.status = 'Deactivated';
          this.activeTeamMembers = this.teamMembers.filter(m => m.status !== 'Deactivated' && m.status !== 'Deleted');
          this.deactivatedTeamMembers = this.teamMembers.filter(m => m.status === 'Deactivated');
        }
        this.snackBar.open('Team member deactivated successfully', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to deactivate team member', 'Close', { duration: 3000 });
      }
    });
  }

  reactivateTeamMember(id: string): void {
    this.teamManagementService.reactivateTeamMember(id).subscribe({
      next: () => {
        this.loadTeamMembers();
        this.snackBar.open('Team member reactivated successfully', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to reactivate team member', 'Close', { duration: 3000 });
      }
    });
  }

  deleteTeamMember(id: string): void {
    this.teamManagementService.removeTeamMember(id).subscribe({
      next: () => {
        this.teamMembers = this.teamMembers.filter(m => m.id !== id);
        this.activeTeamMembers = this.teamMembers.filter(m => m.status !== 'Deactivated' && m.status !== 'Deleted');
        this.deactivatedTeamMembers = this.teamMembers.filter(m => m.status === 'Deactivated');
        this.snackBar.open('Team member permanently deleted', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to delete team member', 'Close', { duration: 3000 });
      }
    });
  }

  ngOnDestroy(): void {
    this.profileService.stopSignalR();
  }

  changeUserRole(newRole: string): void {
    this.userRole = newRole;
    this.authService.changeUserRole(newRole);
    this.snackBar.open(`Switched to ${newRole} role`, 'Close', { duration: 3000 });
    console.log('Role switched to:', newRole);
    console.log('Visibility - Personal:', this.canViewPersonalInfo());
    console.log('Visibility - Company:', this.canViewCompanyDetails());
    console.log('Visibility - Certification:', this.canViewCertification());
    console.log('Visibility - Trade:', this.canViewTradeSupplier());
    console.log('Visibility - Delivery:', this.canViewDeliveryLocation());
    console.log('Visibility - Subscription:', this.canViewSubscription());
  }

  // TODO: Implement these methods based on user roles once development complete
  canViewPersonalInfo(): boolean {
    return true;
  }

  canViewCompanyDetails(): boolean {
    return ['GENERAL_CONTRACTOR', 'PROJECT_MANAGER', 'CHIEF_ESTIMATOR', 'GENERAL_SUPERINTENDANT', 'SUPERINTENDANT', 'ASSISTANT_SUPERINTENDANT', 'FOREMAN', 'SUBCONTRACTOR', 'VENDOR'].includes(this.userRole || '');
  }

  canViewCertification(): boolean {
    return ['GENERAL_CONTRACTOR', 'PROJECT_MANAGER', 'CHIEF_ESTIMATOR', 'GENERAL_SUPERINTENDANT', 'SUPERINTENDANT', 'ASSISTANT_SUPERINTENDANT', 'FOREMAN', 'SUBCONTRACTOR', 'VENDOR'].includes(this.userRole || '');
  }

  canViewTradeSupplier(): boolean {
    return ['GENERAL_CONTRACTOR', 'PROJECT_MANAGER', 'CHIEF_ESTIMATOR', 'GENERAL_SUPERINTENDANT', 'SUPERINTENDANT', 'ASSISTANT_SUPERINTENDANT', 'FOREMAN', 'SUBCONTRACTOR', 'VENDOR'].includes(this.userRole || '');
  }

  canViewDeliveryLocation(): boolean {
    return true;
  }

  canViewSubscription(): boolean {
    return ['GENERAL_CONTRACTOR', 'PROJECT_MANAGER', 'CHIEF_ESTIMATOR', 'GENERAL_SUPERINTENDANT', 'SUPERINTENDANT', 'ASSISTANT_SUPERINTENDANT', 'FOREMAN', 'SUBCONTRACTOR', 'VENDOR'].includes(this.userRole || '');
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onLogoChange(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    this.logoService.setUserLogo(file).subscribe({
      next: () => {
        this.loadUserLogo();
        this.snackBar.open('Logo updated successfully', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Logo upload failed', err);
        this.snackBar.open('Failed to update logo', 'Close', { duration: 3000 });
      }
    });
  }

  removeLogo(): void {
    this.logoService.deleteUserLogo().subscribe({
      next: () => {
        this.logoUrl = null;
        this.snackBar.open('Logo removed successfully', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Failed to remove logo', err);
        this.snackBar.open('Failed to remove logo', 'Close', { duration: 3000 });
      }
    });
  }

  loadUserLogo(): void {
    this.logoService.getUserLogo().subscribe({
      next: (logo) => {
        this.logoUrl = logo.url;
      },
      error: () => {
        this.logoUrl = null;
      }
    });
  }
  updateCardTitle(event: any): void {
    switch (event.index) {
      case 0:
        this.cardTitle = 'User Profile';
        break;
      case 1:
        this.cardTitle = 'Company Profile';
        break;
      case 2:
        this.cardTitle = 'Team Management';
        break;
      case 3:
        this.cardTitle = 'Documents';
        break;
      case 4:
        this.cardTitle = 'Subscriptions';
        break;
      default:
        this.cardTitle = 'User Profile';
    }
  }
}

export interface ProfileDocument {
  id: number;
  userId: string;
  fileName: string;
  size: number;
  blobUrl: string;
}
