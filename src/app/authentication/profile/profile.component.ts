import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService } from './profile.service';
import { Profile } from './profile.model';
import { AuthService } from '../../authentication/auth.service';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconModule, MatIconRegistry } from "@angular/material/icon";
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatIconModule,
    BrowserModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTabsModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'] 
})
export class ProfileComponent implements OnInit {
  profile: Profile | null = null;
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  currentUser: any;
  successMessage: string | null = null;
  certified = false;
  userRole: string | null = null;
  isVerified = false;
  isLoadingJobs = true;

  // Available roles for testing
  availableRoles: string[] = ['FOREMAN', 'BUILDER', 'PERSONAL_USE', 'PROJECT_OWNER', 'SUPPLIER', 'CONSTRUCTION'];

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private fb: FormBuilder,
    matIconRegistry: MatIconRegistry, 
    domSanitizer: DomSanitizer
  ) {
    this.profileForm = this.fb.group({
      id: [''],
      email: [''],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      userType: [''],
      companyName: ['', Validators.required],
      companyRegNo: [''],
      vatNo: [''],
      constructionType: [''],
      nrEmployees: [''],
      yearsOfOperation: [''],
      certificationStatus: [''],
      certificationDocumentPath: [''],
      availability: [''],
      trade: [''],
      supplierType: [''],
      productsOffered: [''],
      projectPreferences: [''],
      deliveryArea: [''],
      deliveryTime: [''],
      country: [''],
      state: [''],
      city: [''],
      subscriptionPackage: [''],
      isVerified: [false]
    });

    matIconRegistry.addSvgIcon(
      'verified',
      domSanitizer.bypassSecurityTrustResourceUrl('app/assets/custom-svg/verification-symbol-svgrepo-com.svg')
    );
    matIconRegistry.addSvgIcon(
      'notVerified',
      domSanitizer.bypassSecurityTrustResourceUrl('app/assets/custom-svg/status-failed-svgrepo-com.svg')
    );

    
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.userRole = this.authService.getUserRole() || 'PROJECT_MANAGER'; // Default to PM for testing
      if (user) {
        this.loadProfile();
      }
    });
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.profileService.getProfile().subscribe({
      next: (data: Profile) => {
        this.profile = data;
        this.profileForm.patchValue(data[0]);
        this.successMessage = 'Profile loaded successfully';
        this.isLoading = false;
        this.isVerified = data.isVerified;
      },
      error: (error) => {
        console.error('Error fetching profile:', error.message, error.status, error.statusText);
        this.errorMessage = error.message === 'User not authenticated'
          ? 'Please log in to view your profile.'
          : 'Failed to load profile. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.profileForm.valid && !this.isSaving) {
      this.isSaving = true;
      this.errorMessage = null;
      this.successMessage = null;
      const updatedProfile: Profile = this.profileForm.value;
      this.profileService.updateProfile(updatedProfile).subscribe({
        next: (response: Profile) => {
          this.profile = response;
          this.profileForm.patchValue(response);
          this.successMessage = 'Profile updated successfully';
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.errorMessage = 'Failed to update profile. Please try again.';
          this.isSaving = false;
        }
      });
    } else {
      this.errorMessage = 'Please fill all required fields correctly.';
    }
  }

  certificationChange(selectedOption: any) {
    if (selectedOption === "FULLY_LICENSED")
      this.certified = true;
    else
      this.certified = false;
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.isLoading = true;
      this.errorMessage = null;
      this.successMessage = null;
      this.profileService.uploadCertification(file).subscribe({
        next: (response: any) => {
          this.profileForm.patchValue({
            certificationDocumentPath: response.path ?? ''
          });
          this.profile = { ...this.profile!, certificationDocumentPath: response.path };
          this.successMessage = 'Certification uploaded successfully';
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error uploading certification:', error);
          this.errorMessage = 'Failed to upload certification.';
          this.isLoading = false;
        }
      });
    }
  }

  // Role-based visibility methods
  canViewPersonalInfo(): boolean {
    return ['FOREMAN', 'BUILDER', 'PERSONAL_USE', 'PROJECT_OWNER', 'SUPPLIER', 'CONSTRUCTION'].includes(this.userRole || '');
  }

  canViewCompanyDetails(): boolean {
    return ['CONSTRUCTION', 'PROJECT_OWNER', 'SUPPLIER'].includes(this.userRole || '');
  }

  canViewCertification(): boolean {
    return ['FOREMAN', 'CONSTRUCTION', 'BUILDER'].includes(this.userRole || '');
  }

  canViewTradeSupplier(): boolean {
    return ['FOREMAN', 'CONSTRUCTION', 'PROJECT_OWNER', 'SUPPLIER'].includes(this.userRole || '');
  }

  canViewDeliveryLocation(): boolean {
    return ['PROJECT_OWNER', 'SUPPLIER'].includes(this.userRole || '');
  }

  canViewSubscription(): boolean {
    return ['FOREMAN', 'BUILDER', 'PERSONAL_USE', 'PROJECT_OWNER', 'SUPPLIER', 'CONSTRUCTION'].includes(this.userRole || '');
  }

  canViewJobManagement(): boolean {
    return ['FOREMAN', 'CONSTRUCTION', 'PROJECT_OWNER'].includes(this.userRole || '');
  }

  // New method to handle role change from dropdown
  changeUserRole(newRole: string): void {
    this.userRole = newRole;
    this.authService.changeUserRole(newRole); // Simulate login to update AuthService
    this.successMessage = `Switched to ${newRole} role`; // Optional feedback
  }
}