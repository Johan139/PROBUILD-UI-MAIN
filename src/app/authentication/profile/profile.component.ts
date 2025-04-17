import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService } from './profile.service';
import { Profile } from './profile.model';
import { AuthService } from '../../authentication/auth.service';

interface Job {
  id: string;
  jobTitle: string;
  status: string;
  location: string;
  startDate: string;
  staffAssignments: StaffAssignment[];
}

interface StaffAssignment {
  staffId: string;
  staffName: string;
  role: string;
}

@Component({
  selector: 'app-profile',
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

  // Job Management Properties
  jobs: Job[] = [];
  isLoadingJobs = true;

  // Available roles for testing
  availableRoles: string[] = ['FOREMAN', 'BUILDER', 'PERSONAL_USE', 'PROJECT_OWNER', 'SUPPLIER', 'CONSTRUCTION'];

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private fb: FormBuilder
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
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.userRole = this.authService.getUserRole() || 'PROJECT_MANAGER'; // Default to PM for testing
      if (user) {
        this.loadProfile();
        this.loadJobs();
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

  loadJobs(): void {
    this.isLoadingJobs = true;
    this.jobs = [
      {
        id: 'job1',
        jobTitle: 'Residential House Build',
        status: 'In Progress',
        location: 'Austin, TX',
        startDate: '2025-03-15',
        staffAssignments: [
          { staffId: 's1', staffName: 'John Doe', role: 'FOREMAN' },
          { staffId: 's2', staffName: 'Jane Smith', role: 'BUILDER' },
          { staffId: 's3', staffName: 'Mike Johnson', role: 'CONSTRUCTION' }
        ]
      },
      {
        id: 'job2',
        jobTitle: 'Commercial Office Renovation',
        status: 'Pending',
        location: 'Houston, TX',
        startDate: '2025-04-01',
        staffAssignments: [
          { staffId: 's4', staffName: 'Emily Brown', role: 'SUPPLIER' },
          { staffId: 's5', staffName: 'Tom Wilson', role: 'BUILDER' }
        ]
      },
      {
        id: 'job3',
        jobTitle: 'Industrial Warehouse Expansion',
        status: 'Completed',
        location: 'Dallas, TX',
        startDate: '2025-01-10',
        staffAssignments: []
      }
    ];
    this.isLoadingJobs = false;
  }

  updateStaffRole(jobId: string, staffId: string, newRole: string): void {
    const job = this.jobs.find(j => j.id === jobId);
    if (job) {
      const assignment = job.staffAssignments.find(s => s.staffId === staffId);
      if (assignment) {
        assignment.role = newRole;
        this.successMessage = 'Staff role updated successfully';
      }
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