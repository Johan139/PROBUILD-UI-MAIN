import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ProfileService } from './profile.service';
import { AuthService } from '../../authentication/auth.service';
import { Profile, TeamMember, Document } from './profile.model';
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
import { MatDialogModule } from '@angular/material/dialog';
import { NgForOf, NgIf } from '@angular/common';

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
    MatTabsModule,
    MatTableModule,
    MatDialogModule,
    NgForOf,
    NgIf
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profile: Profile | null = null;
  profileForm: FormGroup;
  teamForm: FormGroup;
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  userRole: string | null = null;
  isVerified = false;
  availableRoles: string[] = ['FOREMAN', 'BUILDER', 'PERSONAL_USE', 'PROJECT_OWNER', 'SUPPLIER', 'CONSTRUCTION'];
  teamMembers: TeamMember[] = [];
  documents: Document[] = [];
  displayedColumns: string[] = ['name', 'role', 'email', 'actions'];
  documentColumns: string[] = ['name', 'type', 'uploadedDate', 'actions'];

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

    this.teamForm = this.fb.group({
      name: ['', Validators.required],
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

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.userRole = this.authService.getUserRole();
      console.log('User Role:', this.userRole);
      console.log('User Data:', user);
      if (user) {
        this.loadProfile();
        this.loadTeamMembers();
        this.loadDocuments();
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
        console.log('Profile Data:', data);
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

  loadTeamMembers(): void {
    this.profileService.getTeamMembers().subscribe({
      next: (members: TeamMember[]) => {
        this.teamMembers = members;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load team members.';
      }
    });
  }

  loadDocuments(): void {
    this.profileService.getDocuments().subscribe({
      next: (docs: Document[]) => {
        this.documents = docs;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load documents.';
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
          this.loadDocuments(); // Refresh documents list
        },
        error: () => {
          this.errorMessage = 'Failed to upload certification.';
          this.isLoading = false;
        }
      });
    }
  }

  addTeamMember(): void {
    if (this.teamForm.valid) {
      const newMember: TeamMember = this.teamForm.value;
      this.profileService.addTeamMember(newMember).subscribe({
        next: (member: TeamMember) => {
          this.teamMembers.push(member);
          this.teamForm.reset();
          this.successMessage = 'Team member added successfully';
        },
        error: () => {
          this.errorMessage = 'Failed to add team member.';
        }
      });
    } else {
      this.errorMessage = 'Please fill all required fields correctly.';
    }
  }

  removeTeamMember(email: string): void {
    this.profileService.removeTeamMember(email).subscribe({
      next: () => {
        this.teamMembers = this.teamMembers.filter(member => member.email !== email);
        this.successMessage = 'Team member removed successfully';
      },
      error: () => {
        this.errorMessage = 'Failed to remove team member.';
      }
    });
  }

  changeUserRole(newRole: string): void {
    this.userRole = newRole;
    this.authService.changeUserRole(newRole);
    this.successMessage = `Switched to ${newRole} role`;
    console.log('Role switched to:', newRole);
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