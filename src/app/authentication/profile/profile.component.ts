import { Component, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { catchError, throwError } from 'rxjs';
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
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ConfirmationDialogComponent } from '../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import { PaymentIntentRequest, StripeService } from '../../services/StripeService';
import { isPlatformBrowser, NgForOf, NgIf } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
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
const BASE_URL = environment.BACKEND_URL;
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
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
    NgForOf,
    NgIf,
    SharedModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
  addressControl = new FormControl<string>('');
  options: { description: string; place_id: string }[] = [];
selectedPlace: { description: string; place_id: string } | null = null;
autocompleteService: google.maps.places.AutocompleteService | undefined;
isGoogleMapsLoaded: boolean = false;
  profile: Profile | null = null;
  profileForm: FormGroup;
  teamForm: FormGroup;
  isLoading = true;
  isSaving = false;
  isSendingInvite = false;
  isBrowser: boolean;
  subscriptionPackages: { value: string, display: string, amount: number }[] = [];
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
  constructionTypes = constructionTypes;
  preferenceOptions = preferenceOptions;
  supplierProducts = supplierProducts;
  deliveryAreas = deliveryAreas;
  leadTimeDelivery = leadTimeDelivery;
  availabilityOptions = availabilityOptions;
  certificationOptions = certificationOptions;

  alertMessage: string | undefined;
  showAlert: boolean | undefined;

  constructor(
    private profileService: ProfileService,
    public authService: AuthService,
    private fb: FormBuilder,
    private stripeService: StripeService,
    private dialog: MatDialog,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
        private jobsService: JobsService,
      @Inject(PLATFORM_ID) private platformId: Object,
          private snackBar: MatSnackBar,
    private teamManagementService: TeamManagementService
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
      address: [null, Validators.required],
      formattedAddress: [''],
      streetNumber: [''],
      streetName: [''],
      postalCode: [''],
      latitude: [null],
      longitude: [null],
      googlePlaceId: [''],
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
    this.authService.currentUser$.subscribe(user => {
      this.userRole = this.authService.getUserRole();
      if (user && user.id) {
        this.loadProfile();
        this.loadDocuments();
        this.checkSubscription();
      } else if (!this.authService.isLoggedIn()) {
        this.isLoading = false;
        this.snackBar.open('Please log in to view your profile.', 'Close', { duration: 3000 });
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
      })
    ).subscribe({
      next: (data: Profile | Profile[]) => {
        const profileData = Array.isArray(data) ? data[0] : data;
        this.profile = profileData;
        this.profileForm.patchValue(profileData);
        this.snackBar.open('Profile loaded successfully', 'Close', { duration: 3000 });
        this.isLoading = false;
        this.isVerified = profileData.isVerified ?? false;
        this.loadTeamMembers();
      },
      error: (error) => {
        this.snackBar.open(error.message?.includes('User not authenticated')
          ? 'Please log in to view your profile.'
          : 'Failed to load profile. Please try again.', 'Close', { duration: 3000 });
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
    console.log(this.profileForm)
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
                  if(!this.subscriptionActive)
                  {
                     const selectedPackageValue = this.profileForm.value.subscriptionPackage;
                      console.log(selectedPackageValue);
                      const selectedPackage = this.subscriptionPackages.find(p => p.value === selectedPackageValue);

                      const userId = updatedProfile.id;

                      this.dialog.open(PaymentPromptDialogComponent, {
                        data: {
                          userId: userId,
                          packageName: selectedPackage?.value || 'Unknown',
                          amount: selectedPackage?.amount || 0,
                          source: 'Profile'
                        },
                        disableClose: true,
                        width: '400px'
                      });
                    }

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

}
// To this:
export interface ProfileDocument {
  id: number;
  userId: string;
  fileName: string;
  size: number;
  blobUrl: string;
}
