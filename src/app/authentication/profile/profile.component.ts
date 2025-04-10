import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService } from './profile.service';
import { Profile } from './profile.model';
import { AuthService } from '../../authentication/auth.service';

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

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.profileForm = this.fb.group({
      id:[''],
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
      subscriptionPackage: [''], // Added
      isVerified: [false] // Added
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
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
          this.profileForm.patchValue(response); // Sync form with response
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

  certificationChange(selectedOption:any) {
    if(selectedOption === "FULLY_LICENSED")
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
}