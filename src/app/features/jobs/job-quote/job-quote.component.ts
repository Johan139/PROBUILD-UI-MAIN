import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
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
import { timeout, debounceTime, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { formatDate } from '@angular/common';
import { DatePipe } from '@angular/common';
import { UploadDocument } from '../../../models/UploadDocument';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

const BASE_URL = environment.BACKEND_URL;
const Google_API = environment.Google_API;

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
    LoaderComponent,
    MatAutocompleteModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './job-quote.component.html',
  styleUrls: ['./job-quote.component.scss'],
})
export class JobQuoteComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
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
  //predictions: any[] = [];
  autocompleteService: google.maps.places.AutocompleteService | undefined;
  //autocomplete: google.maps.places.Autocomplete | undefined;
  options: { description: string; place_id: string }[] = [];
  addressControl = new FormControl<string>('');
  selectedPlace: { description: string; place_id: string } | null = null;
  private isGoogleMapsLoaded: boolean = false; // Track if Google Maps script is loaded

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

  async ngOnInit(): Promise<void> {
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
      blueprint: new FormControl(),
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
      try {
        await this.loadGoogleMapsScript();
        this.isGoogleMapsLoaded = true;
        this.autocompleteService = new google.maps.places.AutocompleteService();
        console.log('Google Maps API loaded successfully');

        // this.jobCardForm.get('address')?.valueChanges
        //   .pipe(debounceTime(300), switchMap(value => this.getPlacePredictions(value)))
        //   .subscribe(predictions => {
        //     this.predictions = predictions || [];
        //   });
      } catch (error) {
        console.error('Error loading Google Maps API:', error);
        this.isGoogleMapsLoaded = false;
      }
    }

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

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser || !this.addressInput?.nativeElement) {
      console.error('addressInput is not available or not running in browser');
      return;
    }

    if (!this.isGoogleMapsLoaded) {
      try {
        await this.loadGoogleMapsScript();
        this.isGoogleMapsLoaded = true;
      } catch (error) {
        console.error('Failed to load Google Maps API:', error);
        return;
      }
    }

    if (!this.addressInput?.nativeElement) {
      console.error('addressInput element is not available');
      return;
    }

    // this.autocomplete = new google.maps.places.Autocomplete(this.addressInput.nativeElement, {
    //   fields: ['place_id', 'formatted_address'],
    // });

    // const autocompleteInstance = this.autocomplete;

    // autocompleteInstance.addListener('place_changed', () => {
    //   if (!autocompleteInstance) {
    //     console.error('Autocomplete instance is not initialized');
    //     return;
    //   }
    //   const place = autocompleteInstance.getPlace();
    //   if (place.place_id && place.formatted_address) {
    //     this.selectedPlace = {
    //       description: place.formatted_address,
    //       place_id: place.place_id,
    //     };
    //     this.addressControl.setValue(place.formatted_address);
    //     this.jobCardForm.get('address')?.setValue(place.formatted_address);
    //   } else {
    //     console.warn('No place_id or formatted_address found for selected place:', place);
    //   }
    // });

    this.addressControl.valueChanges.subscribe((value) => {
      if (typeof value === 'string' && value.trim()) {
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions({ input: value }, (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            this.options = predictions.map((pred) => ({
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

  ngOnDestroy(): void {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log('SignalR connection stopped'))
        .catch(err => console.error('Error stopping SignalR:', err));
    }
    this.deleteTemporaryFiles();
  }

  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }
  
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key='+Google_API+'&libraries=places';
     
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (typeof google !== 'undefined' && google.maps) {
          resolve();
        } else {
          reject(new Error('Google Maps API script loaded but google object is not defined'));
        }
      };
      script.onerror = (error) => {
        console.error('Google Maps script failed to load:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  getPlacePredictions(input: string): Promise<any[]> {
    if (!input || !this.autocompleteService) {
      return Promise.resolve([]);
    }

    const service = this.autocompleteService;
    return new Promise((resolve) => {
      service.getPlacePredictions(
        { input: input },
        (predictions: any[] | null, status: string) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions);
          } else {
            resolve([]);
            console.warn('Place predictions failed with status:', status);
          }
        }
      );
    });
  }

  onAddressSelected(event: MatAutocompleteSelectedEvent) {
    const selectedAddress = event.option.value;
    console.log('Selected address:', selectedAddress);
    this.selectedPlace = selectedAddress;
    this.addressControl.setValue(selectedAddress.description);
    this.jobCardForm.get('address')?.setValue(selectedAddress.description);

    const placeId = selectedAddress.place_id;
    console.log('Extracted placeId:', placeId);

    if (!placeId) {
      console.error('Invalid or missing placeId:', placeId);
      return;
    }

    const placesService = new google.maps.places.PlacesService(this.addressInput.nativeElement);
    placesService.getDetails(
      { placeId: placeId, fields: ['name', 'formatted_address', 'geometry'] },
      (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          console.log('Place details:', place);
        } else {
          console.warn('Place details failed with status:', status);
          if (status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST) {
            console.error('Invalid placeId:', placeId);
          }
        }
      }
    );
  }

  displayFn(option: any): string {
    return option && option.description ? option.description : '';
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
        foundation: 'RAISED',
      });
    } else {
      this.jobCardForm.patchValue({
        wallStructure: 'BRICK',
        wallInsulation: 'NONE',
        roofStructure: 'TILES',
        roofInsulation: 'LINING',
        foundation: 'CONCRETE',
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
  
    if (this.selectedPlace && this.selectedPlace.place_id) {
      const placesService = new google.maps.places.PlacesService(this.addressInput.nativeElement);
      placesService.getDetails(
        { placeId: this.selectedPlace.place_id, fields: ['geometry', 'formatted_address', 'address_components', 'types'] },
        (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
          console.log('Place details status:', status);
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            console.log('Google Maps place details:', place);
            console.log('Geometry:', place.geometry);
            console.log('Location:', place.geometry?.location);
            const lat = place.geometry?.location?.lat ? place.geometry.location.lat() : undefined;
            const lng = place.geometry?.location?.lng ? place.geometry.location.lng() : undefined;
            console.log('Latitude:', lat, 'Longitude:', lng);
            formData.set('address', place.formatted_address || formValue.address);
  
            let streetNumber = '';
            let streetName = '';
            let city = '';
            let state = '';
            let postalCode = '';
            let country = '';
  
            if (place.address_components) {
              place.address_components.forEach(component => {
                const types = component.types;
                if (types.includes('street_number')) {
                  streetNumber = component.long_name;
                }
                if (types.includes('route')) {
                  streetName = component.long_name;
                }
                if (types.includes('locality')) {
                  city = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                  state = component.short_name;
                }
                if (types.includes('postal_code')) {
                  postalCode = component.long_name;
                }
                if (types.includes('country')) {
                  country = component.long_name;
                }
              });
            }
  
            formData.append('streetNumber', streetNumber);
            formData.append('streetName', streetName);
            formData.append('city', city);
            formData.append('state', state);
            formData.append('postalCode', postalCode);
            formData.append('country', country);
  
            if (lat !== undefined && lng !== undefined) {
              console.log('Appending latitude and longitude to FormData:', lat, lng);
              formData.append('latitude', lat.toString());
              formData.append('longitude', lng.toString());
              formData.append('googlePlaceId', this.selectedPlace!.place_id);
              this.submitFormData(formData);
            } else {
              console.warn('Latitude or Longitude undefined for place_id:', this.selectedPlace!.place_id);
              console.warn('Place types:', place.types);
              formData.append('googlePlaceId', this.selectedPlace!.place_id);
  
              // Fallback to Geocoding API
              console.log('Falling back to Geocoding API for address:', formValue.address);
              this.httpClient.get('https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formValue.address)}&key='+ Google_API)
                .subscribe({
                  next: (response: any) => {
                    if (response.status === 'OK' && response.results && response.results.length > 0) {
                      const location = response.results[0].geometry.location;
                      const lat = location.lat;
                      const lng = location.lng;
                      console.log('Geocoding API returned - Latitude:', lat, 'Longitude:', lng);
                      formData.append('latitude', lat.toString());
                      formData.append('longitude', lng.toString());
                      this.submitFormData(formData);
                    } else {
                      console.error('Geocoding API failed:', response.status);
                      this.submitFormData(formData); // Proceed without lat/long
                    }
                  },
                  error: (error) => {
                    console.error('Geocoding API error:', error);
                    this.submitFormData(formData); // Proceed without lat/long
                  }
                });
            }
          } else {
            console.warn('Failed to fetch place details for lat/long:', status);
            this.submitFormData(formData);
          }
        }
      );
    } else {
      this.submitFormData(formData);
    }
  }
  
  private submitFormData(formData: FormData): void {
    this.progress = 0;
  
    this.httpClient
      .post<JobResponse>(`${BASE_URL}/Jobs`, formData, {
        headers: new HttpHeaders(),
        reportProgress: true,
        observe: 'events',
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
                operatingArea: res.operatingArea,
                address: res.address,
                documents: res.documents,
                ...this.jobCardForm.value,
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
        complete: () => console.log('Client-to-API upload complete'),
      });
  }

  loadJob(id: any): void {
    this.jobService.getSpecificJob(id).subscribe(res => {
      const parsedDate = new Date(res.desiredStartDate);
      const formattedDate = this.datePipe.transform(parsedDate, 'MM/dd/yyyy');
      const responseParams = {
        jobId: res.jobId,
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
        documents: res.documents,
        latitude : res.latitude,
        longitude: res.longitude,
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
        headers: new HttpHeaders({ Accept: 'application/json' }),
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
        complete: () => console.log('Client-to-API upload complete'),
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
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        console.log('Cancel clicked. uploadedFileUrls before deletion:', this.uploadedFileUrls);
        this.deleteTemporaryFiles();
        this.jobCardForm.reset();
        this.uploadedFilesCount = 0;
        this.uploadedFileNames = [];
        this.uploadedFileUrls = [];
        this.sessionId = uuidv4();
        this.router.navigate(['/dashboard']);
      }
    });
  }

  deleteTemporaryFiles(): void {
    console.log('Deleting temporary files. uploadedFileUrls:', this.uploadedFileUrls);
    if (this.uploadedFileUrls.length === 0) {
      console.log('No temporary files to delete.');
      return;
    }

    this.httpClient.post(`${BASE_URL}/Jobs/DeleteTemporaryFiles`, {
      blobUrls: this.uploadedFileUrls,
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
      },
    });
  }

  closeAlert(): void {
    if (this.routeURL !== '') {
      this.router.navigate(['view-quote']);
    }
    this.showAlert = false;
  }
}
