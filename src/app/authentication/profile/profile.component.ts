import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ProfileService } from './profile.service';
import { AuthService } from '../../authentication/auth.service';
import { Profile } from './profile.model';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgForOf, NgIf} from "@angular/common";

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
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    NgForOf, NgIf
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
  successMessage: string | null = null;
  userRole: string | null = null;
  isVerified = false;
  availableRoles: string[] = ['FOREMAN', 'BUILDER', 'PERSONAL_USE', 'PROJECT_OWNER', 'SUPPLIER', 'CONSTRUCTION'];

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private fb: FormBuilder,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.profileForm = this.fb.group({
        id: [null],
        email: [null],
        firstName: [null, Validators.required],
        lastName: [null, Validators.required],
        phoneNumber: [null, Validators.required],
        userType: [null],
        companyName: [null, Validators.required],
        companyRegNo: [null],
        vatNo: [null],
        constructionType: [null],
        nrEmployees: [null],
        yearsOfOperation: [null],
        certificationStatus: [null],
        certificationDocumentPath: [null],
        availability: [null],
        trade: [null],
        supplierType: [null],
        productsOffered: [null],
        projectPreferences: [null],
        deliveryArea: [null],
        deliveryTime: [null],
        country: [null],
        state: [null],
        city: [null],
        subscriptionPackage: [null],
        isVerified: [false]
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

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.userRole = this.authService.getUserRole();
      console.log('User Role:', this.userRole); // Debug: Check user role
      console.log('User Data:', user); // Debug: Check user data
      if (user) {
        this.loadProfile();
      } else {
        this.isLoading = false;
        this.errorMessage = 'Please log in to view your profile.';
      }
    });
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.profileService.getProfile().subscribe({
      next: (data: Profile) => {
        console.log('Profile Data:', data); // Debug: Check profile data
        this.profile = data;
        this.profileForm.patchValue(data[0]);
        this.successMessage = 'Profile loaded successfully';
        this.isLoading = false;
        this.isVerified = data.isVerified ?? false;
      },
      error: (error) => {
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

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.isLoading = true;
      this.errorMessage = null;
      this.successMessage = null;
      this.profileService.uploadCertification(file).subscribe({
        next: (response: any) => {
          this.profileForm.patchValue({
            certification: { certificationDocumentPath: response.path ?? null }
          });
          this.profile = { ...this.profile!, certificationDocumentPath: response.path ?? null };
          this.successMessage = 'Certification uploaded successfully';
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to upload certification.';
          this.isLoading = false;
        }
      });
    }
  }

  changeUserRole(newRole: string): void {
    this.userRole = newRole;
    this.authService.changeUserRole(newRole);
    this.successMessage = `Switched to ${newRole} role`;
    console.log('Role switched to:', newRole); // Debug: Check role switch
    console.log('Visibility - Personal:', this.canViewPersonalInfo());
    console.log('Visibility - Company:', this.canViewCompanyDetails());
    console.log('Visibility - Certification:', this.canViewCertification());
    console.log('Visibility - Trade:', this.canViewTradeSupplier());
    console.log('Visibility - Delivery:', this.canViewDeliveryLocation());
    console.log('Visibility - Subscription:', this.canViewSubscription());
  }

  canViewPersonalInfo(): boolean {
    return this.availableRoles.includes(this.userRole || '');
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
    return this.availableRoles.includes(this.userRole || '');
  }
}