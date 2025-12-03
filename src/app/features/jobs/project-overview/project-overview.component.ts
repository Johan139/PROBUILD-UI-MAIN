import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoaderComponent } from '../../../loader/loader.component';
import { MeasurementService } from '../../../services/measurement.service';
import { AuthService } from '../../../authentication/auth.service';
import { AddressService } from '../services/address.service';
import { JobDataService } from '../services/job-data.service';
import { LucideIconsModule } from '../../../shared/lucide-icons.module';

export interface Project {
  id: string;
  title: string;
  address: string;
  status: 'live' | 'bidding' | 'draft';
  budget?: string;
  deadline?: string;
  team?: number;
  progress?: number;
  bids?: number;
  thumbnailUrl: string;
}

@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    LoaderComponent,
    LucideIconsModule,
  ],

  templateUrl: './project-overview.component.html',
  styleUrls: ['./project-overview.component.scss'],
})
export class ProjectOverviewComponent {
  @Input() projects: Project[] = [];
  @Input() liveProjectsCount: number = 0;
  @Input() biddingProjectsCount: number = 0;

  // Job Details & Weather Inputs
  @Input() projectDetails: any;
  @Input() isLoading: boolean = false;
  @Input() startDateDisplay: any;
  @Input() forecast: any[] | undefined = [];
  @Input() weatherError: string | null | undefined = null;
  @Input() temperatureUnit: string = 'C';

  @Output() selectProject = new EventEmitter<string>();

  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;

  // Address Editing State
  isEditingAddress: boolean = false;
  addressControl = new FormControl<string>('');
  addressSuggestions: { description: string; place_id: string }[] = [];
  selectedPlace: google.maps.places.PlaceResult | null = null;
  private selectedAddress: any;

  constructor(
    public measurementService: MeasurementService,
    public authService: AuthService,
    private addressService: AddressService,
    private jobDataService: JobDataService,
    private snackBar: MatSnackBar,
  ) {}

  getStatusLabel(status: string): string {
    switch (status) {
      case 'bidding':
        return 'Bidding Phase';
      case 'live':
        return 'Live Project';
      case 'draft':
        return 'Draft';
      default:
        return status;
    }
  }

  onViewClick(id: string) {
    this.selectProject.emit(id);
  }

  onEditClick(id: string) {
    console.log('Edit project:', id);
  }

  onDeleteClick(id: string) {
    console.log('Delete project:', id);
  }

  onActivateClick(id: string) {
    console.log('Activate project:', id);
  }

  // Address Editing Logic
  toggleAddressEdit(isEditing: boolean): void {
    this.isEditingAddress = isEditing;
    if (isEditing) {
      this.addressControl.setValue(this.projectDetails.address, {
        emitEvent: true,
      });
      setTimeout(() => {
        if (this.addressInput?.nativeElement) {
          this.addressInput.nativeElement.focus();
        }
      }, 0);
    } else {
      this.selectedPlace = null;
      this.addressSuggestions = [];
    }
  }

  onAddressSelected(event: MatAutocompleteSelectedEvent): void {
    this.addressService
      .onAddressSelected(event, this.addressInput)
      .subscribe((result) => {
        if (result) {
          this.selectedPlace = result.place;
          this.selectedAddress = result.selectedAddress;
          this.addressControl.setValue(result.description, {
            emitEvent: false,
          });
        } else {
          this.selectedPlace = null;
          this.selectedAddress = null;
        }
      });
  }

  saveAddress(): void {
    this.isLoading = true;
    this.addressService
      .saveAddress(this.projectDetails.jobId, this.selectedAddress)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.isEditingAddress = false;
          this.jobDataService.fetchJobData(this.projectDetails);
          this.snackBar.open('Address updated successfully!', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.snackBar.open('Failed to update address.', 'Close', {
            duration: 3000,
          });
        },
      });
  }
}
