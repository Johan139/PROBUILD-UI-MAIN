import { Component, Inject, PLATFORM_ID } from '@angular/core';
import {FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {Router} from "@angular/router";
import {MatFormField} from "@angular/material/form-field";
import { MatSelectModule} from "@angular/material/select";
import {MatDatepickerModule} from "@angular/material/datepicker";
import {MatCardModule} from "@angular/material/card";
import {MatDivider} from "@angular/material/divider";
import {NgIf, NgFor, CommonModule, isPlatformBrowser} from "@angular/common";
import {MatInput} from "@angular/material/input";
import {MatButton} from "@angular/material/button";
import { environment } from '../../../../environments/environment';
import {provideNativeDateAdapter} from '@angular/material/core';
import { JobResponse } from '../../../models/jobdetails.response';
import {JobsService} from "../../../services/jobs.service";
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { LoaderComponent } from '../../../loader/loader.component';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';  
import { formatDate } from '@angular/common';
import { DatePipe } from '@angular/common';

const BASE_URL = environment.BACKEND_URL;
@Component({
  selector: 'app-job-quote',
  standalone: true,
  imports: [
    CommonModule,
    MatFormField,
    MatSelectModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDivider,
    NgIf,
    NgFor,
    MatInput,
    MatButton,
    LoaderComponent
  ],
  providers:[provideNativeDateAdapter(), DatePipe],
  templateUrl: './job-quote.component.html',
  styleUrl: './job-quote.component.scss'
})
export class JobQuoteComponent {
  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '';
  jobCardForm:FormGroup;
  isLoading: boolean = false;
  jobListFull: any[] = [];
  jobList: any[] = [];
  pageSize = 10;
  currentPage = 1;
  isBrowser: boolean;
  selectedUnit: string = 'sq ft';

  constructor(private formBuilder:FormBuilder,
              private jobService: JobsService,
              private httpClient: HttpClient,
              private datePipe: DatePipe,
              @Inject(PLATFORM_ID) private platformId: Object,
              private router: Router) {
    this.jobCardForm = new FormGroup({})
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
      this.jobCardForm = this.formBuilder.group({
        projectName: ['', Validators.required],
        date: ['', Validators.required],
        jobType: ['', Validators.required],
        quantity: ['', Validators.required],
        wallStructure: ['', Validators.required],
        wallInsulation: ['', Validators.required],
        roofStructure: ['', Validators.required],
        roofInsulation: ['', Validators.required],
        foundation: ['', Validators.required],
        finishes: ['', Validators.required],
        electricalSupply: ['', Validators.required],
        stories: ['', Validators.required],
        buildingSize: ['', Validators.required],
        address: ['', Validators.required],
        blueprint: new FormControl()
      }
    )
    if (this.isBrowser) {
      const userId = localStorage.getItem("userId");
      if (userId) {
        this.isLoading = true;
        this.jobService.getAllJobsByUserId(userId).subscribe(
          (response) => {
            this.jobListFull = response;
            this.loadJobs();
            this.isLoading = false;
          },
          (error) => {
            console.error('Error fetching jobs:', error);
            this.isLoading = false;
          }
        );
      } else {
        console.error("User ID is not available in local storage.");
      }
    }
  }
  loadJobs(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = this.currentPage * this.pageSize;
    this.jobList = this.jobListFull.slice(startIndex, endIndex);
  }
  navigatePage(direction: 'prev' | 'next'): void {
    if (direction === 'prev' && this.currentPage > 1) {
      this.currentPage--;
    } else if (direction === 'next' && this.currentPage * this.pageSize < this.jobListFull.length) {
      this.currentPage++;
    }
    this.loadJobs();
  }

  populateHouse(type: string) {
    console.log(type)
    if(type === 'wood'){
       this.jobCardForm.patchValue({
         wallStructure: 'WOOD',
         wallInsulation: 'FOAM',
         roofStructure: 'TILES',
         roofInsulation: 'FOAM',
         foundation: 'RAISED'
       })

    }
    else {
      this.jobCardForm.patchValue({
        wallStructure: 'BRICK',
        wallInsulation: 'NONE',
        roofStructure: 'TILES',
        roofInsulation: 'LINING',
        foundation: 'CONCRETE'
      })
    }
  }

  onSubmit(): void {
    if (this.isBrowser) {
    localStorage.setItem('Subtasks', '')
    this.isLoading = true;
    const userId: string | null = localStorage.getItem('userId');
    const formData = new FormData();
    const formValue = this.jobCardForm.value;
    const formattedDate = formatDate(formValue.date, 'MM/dd/yyyy', 'en-US');
    formData.append('DesiredStartDate', formattedDate);
    formData.append('JobType', formValue.jobType);
    formData.append('ProjectName', formValue.projectName);
    formData.append('Qty', formValue.quantity);
    formData.append('WallStructure', formValue.wallStructure);
    formData.append('WallInsulation', formValue.wallInsulation);
    formData.append('RoofStructure', formValue.roofStructure);
    formData.append('RoofInsulation', formValue.roofInsulation);
    formData.append('Foundation', formValue.foundation);
    formData.append('Finishes', formValue.finishes);
    formData.append('ElectricalSupplyNeeds', formValue.electricalSupply);
    formData.append('Stories', formValue.stories);
    formData.append('BuildingSize', formValue.buildingSize);
    formData.append('OperatingArea', 'GreenField');
    formData.append('UserId', userId ?? '');
    formData.append('status', 'NEW');
    formData.append('address', formValue.address)
  
    // Append the file
    if (formValue.blueprint) {
      formData.append('blueprint', formValue.blueprint);
    }
  
    // Perform the HTTP request
    this.httpClient.post<JobResponse>(`${BASE_URL}/Jobs/PostJob`, formData, {
      headers: new HttpHeaders(),
      reportProgress: true,
      observe: 'response',
    })
    .pipe(
      catchError((error) => {
        // Handle errors
        this.isLoading = false;
        if (error.status === 400) {
          if (error.error[0]?.code === 'DuplicateProjectName') {
            this.alertMessage = 'Project Already Exists';
          } else {
            this.alertMessage = 'Data is Malformed. Please check all input fields.';
          }
        } else if (error.status === 500) {
          this.alertMessage = 'Oops! Something went wrong. Please try again later.';
        } else {
          this.alertMessage = 'Unexpected error occurred. Contact support.';
        }
        this.showAlert = true;
        return of(null);
      })
    )
    .subscribe((res) => {
      this.isLoading = false;
      if (res && res.body) {
        console.log(res.body);
    
        // Extract necessary data from the response
        const responseParams = {
          jobId: res.body.id,
          blueprintPath: res.body.blueprintPath,
          operatingArea: res.body.operatingArea,
          address: res.body.address,
          ...formValue
        };
    
        this.alertMessage = 'Job Quote Creation Successful';
        this.showAlert = true;
        this.router.navigate(['view-quote'], { queryParams: responseParams });
      }
    })
  }
  }
  
  loadJob(id: any) {
    this.jobService.getSpecificJob(id).subscribe(res => {
      const parsedDate = new Date(res.desiredStartDate);
      const formattedDate = this.datePipe.transform(parsedDate, 'MM/dd/yyyy');
      console.log(`DateFormat :: ${formattedDate}`)
      const responseParams = {
        jobId: res.id,
        operatingArea: res.operatingArea,
        address: res.address,
        projectName: res.projectName,
        jobType: res.jobType,
        buildingSize: res.buildingSize,
        wallStructure: res.wallStructure,
        wallInsulation: res.wallInsulation,
        roofStructure: res.roofStructure,
        roofInsulation: res.roofInsulation,
        electricalSupply: res.electricalSupply,
        finishes: res.finishes,
        foundation: res.foundation,
        date: formattedDate,

      };
      this.router.navigate(['view-quote'], { queryParams: responseParams });
    });
  }
// Update the input field based on the current value and unit
updateConvertedValue(value: string | number) {
  const numValue = parseFloat(value as string);
  if (isNaN(numValue)) {
    console.log('Invalid input, no conversion');
    return;
  }
  console.log('Converted value updated:', numValue, this.selectedUnit);
}

// Handle unit change and convert the input field value
onUnitChange(unit: string) {
  console.log('Unit changed to:', unit);
  const currentValue = this.jobCardForm.value.buildingSize;
  this.selectedUnit = unit;
  if (!currentValue || isNaN(parseFloat(currentValue))) {
    console.log('No valid value to convert');
     // Still update the unit
    return;
  }

  const numValue = parseFloat(currentValue);
  let newValue: number;
  if (this.selectedUnit === 'sq m') {
    newValue = numValue * 0.092903; // sq ft to sq m
    console.log(`Converting ${numValue} sq ft to ${newValue} sq m`);
  } else if (this.selectedUnit === 'sq ft') {
    newValue = numValue * 10.7639; // sq m to sq ft
    console.log(`Converting ${numValue} sq m to ${newValue} sq ft`);
  } else {
    console.log('No conversion needed');
    this.selectedUnit = unit;
    return;
  }

  // Update the form control
  this.jobCardForm.get('buildingSize')?.setValue(newValue.toFixed(2), { emitEvent: true });
  this.selectedUnit = unit; // Update the unit after conversion
}
onFileSelected(event: Event): void {
  console.log('Change event fired:', event);
  alert('test');
  const input = event.target as HTMLInputElement;
  if (input?.files?.length) {
    this.jobCardForm.patchValue({
      blueprint: input.files[0],
    });
  }
}
  closeAlert(): void {
    if(this.routeURL != ''){
      this.router.navigate(['view-quote']);
    }
    this.showAlert = false;
  }
}
