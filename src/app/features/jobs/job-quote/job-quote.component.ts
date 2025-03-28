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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
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
import { v4 as uuidv4 } from 'uuid';
import { ConfirmationDialogComponent } from './confirmation-dialog.component'; // Import the new dialog component

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
    MatTooltipModule,
    MatDialogModule,
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
  uploadedFilesCount: number = 0;
  uploadedFileNames: string[] = [];
  uploadedFileUrls: string[] = [];
  sessionId: string = '';
  private hubConnection!: HubConnection;

  constructor(
    private formBuilder: FormBuilder,
    private jobService: JobsService,
    private httpClient: HttpClient,
    private datePipe: DatePipe,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.jobCardForm = new FormGroup({});
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.sessionId = uuidv4();
    console.log('Generated sessionId:', this.sessionId);

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
      .configureLogging(LogLevel.Debug)
      .build();

    this.hubConnection.on('ReceiveProgress', (progress: number) => {
      const cappedProgress = Math.min(100, progress);
      this.progress = Math.min(100, 50 + Math.round((cappedProgress * 50) / 100));
      console.log(`Server-to-Azure Progress: ${this.progress}% (Raw SignalR: ${cappedProgress}%)`);
    });

    this.hubConnection.on('UploadComplete', (fileCount: number) => {
      this.isUploading = false;
      this.resetFileInput();
      console.log(`Server-to-Azure upload complete. Total ${this.uploadedFilesCount} file(s) uploaded.`);
      console.log('Current uploadedFileUrls:', this.uploadedFileUrls);
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
    this.deleteTemporaryFiles();
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
    formData.append('sessionId', this.sessionId);
    formData.append('temporaryFileUrls', JSON.stringify(this.uploadedFileUrls));

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
            this.uploadedFileUrls = [];
            this.router.navigate(['view-quote'], { queryParams: responseParams });
          }
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.isUploading = false;
        console.error('Upload error:', error);
        this.progress = 0;
        this.deleteTemporaryFiles();
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

    const newFileNames = Array.from(input.files).map(file => file.name);
    this.uploadedFileNames = [...this.uploadedFileNames, ...newFileNames];

    const formData = new FormData();
    Array.from(input.files).forEach(file => {
      formData.append('Blueprint', file);
    });
    formData.append('Title', this.jobCardForm.get('Title')?.value || 'test');
    formData.append('Description', this.jobCardForm.get('Description')?.value || 'tester');
    formData.append('connectionId', this.hubConnection.connectionId || '');
    formData.append('sessionId', this.sessionId);

    this.progress = 0;
    this.isUploading = true;
    console.log('Starting file upload. Connection ID:', this.hubConnection.connectionId);

    this.httpClient
      .post<any>(BASE_URL + '/Jobs/UploadImage', formData, {
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
            console.log('Upload response:', event.body);
            const newFilesCount = newFileNames.length;
            this.uploadedFilesCount += newFilesCount;
            if (event.body?.fileUrls) {
              this.uploadedFileUrls = [...this.uploadedFileUrls, ...event.body.fileUrls];
              console.log('Updated uploadedFileUrls after upload:', this.uploadedFileUrls);
            } else {
              console.error('No fileUrls returned in response:', event.body);
            }
            this.resetFileInput();
          }
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.progress = 0;
          this.isUploading = false;
          this.uploadedFileNames = this.uploadedFileNames.filter(name => !newFileNames.includes(name));
          this.resetFileInput();
        },
        complete: () => console.log('Client-to-API upload complete')
      });
  }

  resetFileInput(): void {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
      console.log('File input reset');
    }
  }

  onCancel(): void {
    // Open the confirmation dialog
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      disableClose: true // Prevent closing by clicking outside
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        // User confirmed cancellation
        console.log('Cancel clicked. uploadedFileUrls before deletion:', this.uploadedFileUrls);
        this.deleteTemporaryFiles();
        this.jobCardForm.reset();
        this.uploadedFilesCount = 0;
        this.uploadedFileNames = [];
        this.uploadedFileUrls = [];
        this.sessionId = uuidv4();
        this.router.navigate(['/dashboard']);
      }
      // If result is false, the user clicked "Return to Work", so do nothing
    });
  }

  deleteTemporaryFiles(): void {
    console.log('Deleting temporary files. uploadedFileUrls:', this.uploadedFileUrls);
    if (this.uploadedFileUrls.length === 0) {
      console.log('No temporary files to delete.');
      return;
    }

    this.httpClient.post(`${BASE_URL}/Jobs/DeleteTemporaryFiles`, {
      blobUrls: this.uploadedFileUrls
    }).subscribe({
      next: () => {
        console.log('Temporary files deleted successfully');
        this.uploadedFileUrls = [];
        this.uploadedFilesCount = 0;
        this.uploadedFileNames = [];
      },
      error: (error) => {
        console.error('Error deleting temporary files:', error);
        this.uploadedFileUrls = [];
        this.uploadedFilesCount = 0;
        this.uploadedFileNames = [];
      }
    });
  }

  closeAlert(): void {
    if (this.routeURL !== '') {
      this.router.navigate(['view-quote']);
    }
    this.showAlert = false;
  }
}