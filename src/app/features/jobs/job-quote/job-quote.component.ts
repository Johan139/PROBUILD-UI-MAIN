import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormField } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { NgIf, NgFor, CommonModule, isPlatformBrowser } from '@angular/common';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { environment } from '../../../../environments/environment';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JobResponse } from '../../../models/jobdetails.response';
import { JobsService } from '../../../services/jobs.service';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { LoaderComponent } from '../../../loader/loader.component';
import { catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { formatDate } from '@angular/common';
import { DatePipe } from '@angular/common';
import { UploadDocument } from '../../../models/UploadDocument';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

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
    MatProgressBarModule,
    LoaderComponent
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './job-quote.component.html',
  styleUrls: ['./job-quote.component.scss']
})
export class JobQuoteComponent implements OnInit, OnDestroy {
  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '';
  jobCardForm: FormGroup;
  isLoading: boolean = false;
  jobListFull: any[] = [];
  jobList: any[] = [];
  pageSize = 10;
  currentPage = 1;
  isBrowser: boolean;
  selectedUnit: string = 'sq ft';
  progress: number = 0;
  isUploading: boolean = false;
  uploadedFilesCount: number = 0; // Track uploaded files count
  private hubConnection!: HubConnection;

  constructor(
    private formBuilder: FormBuilder,
    private jobService: JobsService,
    private httpClient: HttpClient,
    private datePipe: DatePipe,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {
    this.jobCardForm = new FormGroup({});
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
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
    });

    this.hubConnection = new HubConnectionBuilder()
      .withUrl('https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/progressHub')
      .configureLogging(LogLevel.Debug) // Add verbose logging
      .build();

    this.hubConnection.on('ReceiveProgress', (progress: number) => {
      const cappedProgress = Math.min(100, progress);
      this.progress = Math.min(100, 50 + Math.round((cappedProgress * 50) / 100)); // Scale 0-100% to 50-100%
      console.log(`Server-to-Azure Progress: ${this.progress}% (Raw SignalR: ${cappedProgress}%)`);
    });

    this.hubConnection.on('UploadComplete', (fileCount: number) => {
      this.isUploading = false;
      this.uploadedFilesCount = fileCount; // Update the count of uploaded files
      this.resetFileInput(); // Reset the file input after upload completes
      console.log(`Server-to-Azure upload complete. ${fileCount} file(s) uploaded.`);
    });

    this.hubConnection
      .start()
      .then(() => console.log('SignalR connection established successfully'))
      .catch(err => console.error('SignalR Connection Error:', err));
    
    console.log(this.hubConnection.connectionId);
    if (this.isBrowser) {
      const userId = localStorage.getItem('userId');
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
        console.error('User ID is not available in local storage.');
      }
    }
  }

  ngOnDestroy(): void {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log('SignalR connection stopped'))
        .catch(err => console.error('Error stopping SignalR:', err));
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

  populateHouse(type: string): void {
    console.log(type);
    if (type === 'wood') {
      this.jobCardForm.patchValue({
        wallStructure: 'WOOD',
        wallInsulation: 'FOAM',
        roofStructure: 'TILES',
        roofInsulation: 'FOAM',
        foundation: 'RAISED'
      });
    } else {
      this.jobCardForm.patchValue({
        wallStructure: 'BRICK',
        wallInsulation: 'NONE',
        roofStructure: 'TILES',
        roofInsulation: 'LINING',
        foundation: 'CONCRETE'
      });
    }
  }

  onSubmit(): void {
    if (!this.isBrowser) return;

    localStorage.setItem('Subtasks', '');
    this.isLoading = true;
    this.isUploading = true;
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
    formData.append('address', formValue.address);

    if (formValue.blueprint) {
      formData.append('blueprint', formValue.blueprint);
    }

    this.progress = 0;

    this.httpClient.post<JobResponse>(`${BASE_URL}/Jobs`, formData, {
      headers: new HttpHeaders(),
      reportProgress: true,
      observe: 'events'
    })
    .pipe(timeout(300000))
    .subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((50 * event.loaded) / event.total);
          console.log(`Client-to-API Progress: ${this.progress}% (Loaded: ${event.loaded}, Total: ${event.total})`);
        } else if (event.type === HttpEventType.Response) {
          console.log('Upload to API complete:', event.body);
          this.isLoading = false;
          const res = event.body;
          if (res) {
            const responseParams = {
              jobId: res.id,
              blueprintPath: res.blueprintPath,
              operatingArea: res.operatingArea,
              address: res.address,
              ...formValue
            };
            this.alertMessage = 'Job Quote Creation Successful';
            this.showAlert = true;
            this.router.navigate(['view-quote'], { queryParams: responseParams });
          }
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.isUploading = false;
        console.error('Upload error:', error);
        this.progress = 0;
      },
      complete: () => console.log('Client-to-API upload complete')
    });
  }

  loadJob(id: any): void {
    this.jobService.getSpecificJob(id).subscribe(res => {
      const parsedDate = new Date(res.desiredStartDate);
      const formattedDate = this.datePipe.transform(parsedDate, 'MM/dd/yyyy');
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
        date: formattedDate
      };
      this.router.navigate(['view-quote'], { queryParams: responseParams });
    });
  }

  updateConvertedValue(value: string | number): void {
    const numValue = parseFloat(value as string);
    if (isNaN(numValue)) {
      console.log('Invalid input, no conversion');
      return;
    }
    console.log('Converted value updated:', numValue, this.selectedUnit);
  }

  onUnitChange(unit: string): void {
    console.log('Unit changed to:', unit);
    const currentValue = this.jobCardForm.value.buildingSize;
    this.selectedUnit = unit;
    if (!currentValue || isNaN(parseFloat(currentValue))) {
      console.log('No valid value to convert');
      return;
    }

    const numValue = parseFloat(currentValue);
    let newValue: number;
    if (this.selectedUnit === 'sq m') {
      newValue = numValue * 0.092903;
      console.log(`Converting ${numValue} sq ft to ${newValue} sq m`);
    } else if (this.selectedUnit === 'sq ft') {
      newValue = numValue * 10.7639;
      console.log(`Converting ${numValue} sq m to ${newValue} sq ft`);
    } else {
      console.log('No conversion needed');
      this.selectedUnit = unit;
      return;
    }

    this.jobCardForm.get('buildingSize')?.setValue(newValue.toFixed(2), { emitEvent: true });
    this.selectedUnit = unit;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) {
      console.error('No files selected');
      return;
    }

    const formData = new FormData();
    Array.from(input.files).forEach(file => {
      formData.append('Blueprint', file);
    });
    formData.append('Title', this.jobCardForm.get('Title')?.value || 'test');
    formData.append('Description', this.jobCardForm.get('Description')?.value || 'tester');
    formData.append('connectionId', this.hubConnection.connectionId || ''); // Pass SignalR connectionId

    this.progress = 0;
    this.isUploading = true;
    console.log('Starting file upload. Connection ID:', this.hubConnection.connectionId);

    this.httpClient
      .post<any>({BASE_URL} +'/Jobs/UploadImage', formData, {
        reportProgress: true,
        observe: 'events',
        headers: new HttpHeaders({ 'Accept': 'application/json' })
      })
      .pipe(timeout(300000))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.progress = Math.round((50 * event.loaded) / event.total);
            console.log(`Client-to-API Progress: ${this.progress}% (Loaded: ${event.loaded}, Total: ${event.total})`);
          } else if (event.type === HttpEventType.Response) {
            console.log('Upload to API complete:', event.body);
            this.uploadedFilesCount = event.body?.fileNames?.length || this.uploadedFilesCount;
            this.resetFileInput(); // Reset the file input after HTTP response
          }
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.progress = 0;
          this.isUploading = false;
          this.resetFileInput(); // Reset on error too
        },
        complete: () => console.log('Client-to-API upload complete')
      });
  }

  // Method to reset the file input
  resetFileInput(): void {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Clear the file input value
      console.log('File input reset');
    }
  }

  closeAlert(): void {
    if (this.routeURL !== '') {
      this.router.navigate(['view-quote']);
    }
    this.showAlert = false;
  }
}