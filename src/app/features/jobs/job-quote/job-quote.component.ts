import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID, ElementRef, ViewChild, AfterViewInit, TemplateRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatDivider, MatDividerModule } from '@angular/material/divider';
import { NgIf, NgFor, CommonModule, isPlatformBrowser } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JobResponse } from '../../../models/jobdetails.response';
import { JobsService } from '../../../services/jobs.service';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { LoaderComponent } from '../../../loader/loader.component';
import { timeout, switchMap, filter, take, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { formatDate } from '@angular/common';
import { DatePipe } from '@angular/common';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { QuoteService } from '../../quote/quote.service';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatExpansionModule } from '@angular/material/expansion';
import { FileSizePipe } from '../../Documents/filesize.pipe';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { AuthService } from '../../../authentication/auth.service';
import { FileUploadService, UploadedFileInfo } from '../../../services/file-upload.service';
import { AnalysisService, AnalysisRequestDto } from '../services/analysis.service';
import { AiChatService } from '../../ai-chat/services/ai-chat.service';
import { AiChatStateService } from '../../ai-chat/services/ai-chat-state.service';
import { Prompt } from '../../ai-chat/models/ai-chat.models';
import { SubscriptionWarningComponent } from '../../../shared/dialogs/subscription-warning/subscription-warning.component';
import { JobDocument } from '../../../models/JobDocument';
import { DocumentsDialogComponent } from '../../../shared/dialogs/documents-dialog/documents-dialog.component';

const BASE_URL = environment.BACKEND_URL;
const Google_API = environment.Google_API;

@Component({
  selector: 'app-job-quote',
  standalone: true,
  imports: [
    CommonModule,

    ReactiveFormsModule,

    MatFormField,
    MatSelectModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDivider,
    FormsModule,
    NgIf,
    NgFor,

    // Angular Material Modules
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCardModule,
    MatDividerModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatAutocompleteModule,
    MatTableModule,
    MatExpansionModule,
    MatIconModule,
    MatCheckboxModule,
    MatRadioModule,

    // Custom Components and Pipes
    LoaderComponent,
    FileSizePipe,
    SubscriptionWarningComponent,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './job-quote.component.html',
  styleUrls: ['./job-quote.component.scss'],
})
export class JobQuoteComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('folderInput') folderInput!: ElementRef<HTMLInputElement>;
  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '';
  jobCardForm: FormGroup;
  isLoading: boolean = false;
  jobListFull: any[] = [];
  jobList: any[] = [];
  pageSize = 99999;
  currentPage = 1;
  isBrowser: boolean;
  selectedUnit: string = 'sq ft';
  progress: number = 0;
  isUploading: boolean = false;
  subscriptionActive: boolean = false;
  sessionId: string = '';
  private hubConnection!: HubConnection;
  uploadedFileInfos: UploadedFileInfo[] = [];
  //predictions: any[] = [];
  autocompleteService: google.maps.places.AutocompleteService | undefined;
  //autocomplete: google.maps.places.Autocomplete | undefined;
  options: { description: string; place_id: string }[] = [];
  addressControl = new FormControl<string>('',[Validators.required]);
  selectedPlace: { description: string; place_id: string } | null = null;
  private isGoogleMapsLoaded: boolean = false; // Track if Google Maps script is loaded
  activeBidsDataSource = new MatTableDataSource<any>();
  activeBidColumns: string[] = ['number', 'createdBy', 'createdDate', 'total', 'actions'];

  analysisType: 'Comprehensive' | 'Selected' = 'Comprehensive';
  availablePrompts$: Observable<Prompt[]>;
  selectedPrompts = new FormControl([]);
  analysisReport: string | null = null;
  isAnalyzing: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private jobService: JobsService,
    private httpClient: HttpClient,
    private datePipe: DatePipe,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService,
    private quoteService: QuoteService,
    private fileUploadService: FileUploadService,
    private analysisService: AnalysisService,
    private aiChatService: AiChatService,
    private aiChatStateService: AiChatStateService
  ) {
    this.jobCardForm = new FormGroup({});
    this.isBrowser = isPlatformBrowser(this.platformId);
    const hiddenPromptsForJobQuote = ['SYSTEM_COMPREHENSIVE_ANALYSIS'];
    this.availablePrompts$ = this.aiChatStateService.prompts$.pipe(
      map(prompts => prompts.filter(p => !hiddenPromptsForJobQuote.includes(p.promptKey)))
    );
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
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      company: [''],
      position: [''],
    });

    this.hubConnection = new HubConnectionBuilder()
    .withUrl('https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/progressHub', {
      accessTokenFactory: () => localStorage.getItem('authToken') || ''
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Debug)
    .build();

    this.hubConnection.on('ReceiveProgress', (progress: number) => {
      const cappedProgress = Math.min(100, progress);
      this.progress = Math.min(100, 50 + Math.round((cappedProgress * 50) / 100));
      console.log(`Server-to-Azure Progress: ${this.progress}% (Raw SignalR: ${cappedProgress}%)`);
    });

    this.hubConnection.on('UploadComplete', (fileCount: number) => {
      this.isUploading = false;
      console.log(`Server-to-Azure upload complete. Total ${this.uploadedFileInfos.length} file(s) uploaded.`);
      console.log('Current uploadedFileInfos:', this.uploadedFileInfos);
    });

    this.authService.currentUser$.pipe(
      filter(user => !!user),
      take(1),
      switchMap(user => {
        return this.httpClient.get<{ hasActive: boolean }>(`${BASE_URL}/Account/has-active-subscription/${user.id}`);
      })
    ).subscribe({
      next: (res) => {
        this.subscriptionActive = res.hasActive;
        if (!res.hasActive) {
          this.alertMessage = "You do not have an active subscription. Please subscribe to create a job quote.";
        }
      },
      error: (err) => {
        console.error('Subscription check failed', err);
        this.alertMessage = "Unable to verify subscription. Try again later.";
        this.showAlert = true;
        this.router.navigate(['/dashboard']);
      }
    });
    // this.hubConnection
    //   .start()
    //   .then(() => console.log('SignalR connection established successfully'))
    //   .catch(err => console.error('SignalR Connection Error:', err));

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
      this.authService.currentUser$.pipe(
        filter(user => !!user),
        take(1),
        switchMap(user => {
          if (user && user.id) {
            this.isLoading = true;
            // Check if the user is a team member (e.g., has an inviterId)
            if (user.inviterId) {
              return this.jobService.getAssignedJobsForTeamMember(user.id);
            } else {
              return this.jobService.getAllJobsByUserId(user.id);
            }
          }
          return of([]); // Return empty observable if no user
        })
      ).subscribe({
        next: (response: any) => {
            if (response) {
                this.jobListFull = response;
                this.loadJobs();
            }
            this.isLoading = false;
        },
        error: (error) => {
            console.error('Error fetching jobs:', error);
            this.isLoading = false;
        }
    });
    }

    this.loadActiveBids();
    this.aiChatService.getMyPrompts();
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
    //this.deleteTemporaryFiles();
  }

  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.Google_API}&libraries=places`;
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

  loadActiveBids(): void {
    const userId: string | null = localStorage.getItem('userId');
    this.quoteService.getQuotesByUser(userId ?? '').subscribe({
      next: (quotes) => {
        this.activeBidsDataSource.data = quotes;
      },
      error: (err) => {
        console.error('Failed to load active bids', err);
        this.activeBidsDataSource.data = [];
      }
    });
  }

  displayFn(option: any): string {
    return option && option.description ? option.description : '';
  }

  loadJobs(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = this.currentPage * this.pageSize;
    this.jobList = this.jobListFull.slice(startIndex, endIndex);
  }

  openQuote(quoteId: string | null): void {
    console.log('Attempting to open quote with ID:', quoteId);
    this.router.navigate(['/quote'], {
      queryParams: { quoteId: quoteId }
    });
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
    if (this.analysisType === 'Comprehensive') {
      this.performComprehensiveAnalysis();
    } else {
      this.performSelectedAnalysis();
    }
  }

  performSaveJob(callback?: (jobResponse: JobResponse) => void): void {
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
    formData.append('firstName', formValue.firstName);
    formData.append('lastName', formValue.lastName);
    formData.append('email', formValue.email);
    formData.append('phone', formValue.phone);
    formData.append('company', formValue.company);
    formData.append('position', formValue.position);
    formData.append('sessionId', this.sessionId);
    formData.append('temporaryFileUrls', JSON.stringify(this.uploadedFileInfos.map(f => f.url)));

    // Append analysis type and prompts for the backend routing
    formData.append('analysisType', this.analysisType);
    if (this.analysisType === 'Selected') {
      const selectedPromptKeys = this.selectedPrompts.value;
      if (selectedPromptKeys && selectedPromptKeys.length > 0) {
        selectedPromptKeys.forEach(key => formData.append('promptKeys', key));
      }
    }

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
              this.submitFormData(formData, callback);
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
                      this.submitFormData(formData, callback);
                    } else {
                      console.error('Geocoding API failed:', response.status);
                      this.submitFormData(formData, callback); // Proceed without lat/long
                    }
                  },
                  error: (error) => {
                    console.error('Geocoding API error:', error);
                    this.submitFormData(formData, callback); // Proceed without lat/long
                  }
                });
            }
          } else {
            console.warn('Failed to fetch place details for lat/long:', status);
            this.submitFormData(formData, callback);
          }
        }
      );
    } else {
      this.submitFormData(formData, callback);
    }
  }
  private submitFormData(formData: FormData, callback?: (jobResponse: JobResponse) => void): void {
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
              if (callback) {
                callback(res);
              } else {
                const responseParams = {
                  jobId: res.id,
                  operatingArea: res.operatingArea,
                  address: res.address,
                  documents: res.documents,
                  latitude : res.latitude,
                  longitude: res.longitude,
                  ...this.jobCardForm.value,
                };
                this.alertMessage = 'Job Quote Creation Successful';
                this.showAlert = true;
                this.uploadedFileInfos = [];
                this.dialog.closeAll();
                this.router.navigate(['view-quote'], { queryParams: responseParams });
              }
            }
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.isUploading = false;
          console.error('Upload error:', error);
          this.progress = 0;
          //this.deleteTemporaryFiles();
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



  onCancel(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        console.log('Cancel clicked. Files to be deleted:', this.uploadedFileInfos.map(f => f.url));
        //this.deleteTemporaryFiles();
        this.jobCardForm.reset();
        this.uploadedFileInfos = [];
        this.sessionId = uuidv4();
        this.router.navigate(['/dashboard']);
      }
    });
  }

  deleteTemporaryFiles(): void {
    const urlsToDelete = this.uploadedFileInfos.map(f => f.url);
    if (urlsToDelete.length === 0) {
      return;
    }
    this.httpClient.post(`${BASE_URL}/Jobs/DeleteTemporaryFiles`, {
      blobUrls: urlsToDelete,
    }).subscribe({
      next: () => {
        this.uploadedFileInfos = [];
      },
      error: (error) => {
        console.error('Error deleting temporary files:', error);
        this.uploadedFileInfos = [];
      },
    });
  }
  documents: any[] = [];
  error = '';
  documentsConfirmed = false;
  fetchDocuments(): void {
    if (!this.uploadedFileInfos || this.uploadedFileInfos.length === 0) {
      this.error = 'No uploaded documents available.';
      this.documents = [];
      return;
    }

    this.documents = this.uploadedFileInfos.map(fileInfo => ({
      ...fileInfo,
      displayName: this.getDisplayName(fileInfo.name)
    }));
    this.isLoading = false;
  }

  getDisplayName(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  }

  getUploadedFileNames(): string {
    return this.uploadedFileInfos.map(f => f.name).join(', ');
  }

  openUploadDialog(): void {
    this.fileUploadService.openUploadOptionsDialog().subscribe(result => {
      if (result === 'files') {
        this.fileInput.nativeElement.click();
      } else if (result === 'folder') {
        this.folderInput.nativeElement.click();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) {
      return;
    }
    const files = Array.from(input.files);
    this.fileUploadService.uploadFiles(files, this.sessionId).subscribe(upload => {
      this.progress = upload.progress;
      this.isUploading = upload.isUploading;
      if (upload.files) {
        this.uploadedFileInfos = [...this.uploadedFileInfos, ...upload.files];
      }
    });
  }


  getFileSize(url: string): number {
    try {
      return 840 * 1024; // 840 KB in bytes
    } catch (e) {
      console.error('Error fetching file size:', e);
      return 0;
    }
  }

  viewDocument(doc: any) {
    const blobUrl = doc.url;
    this.jobService.downloadJobDocumentFile(blobUrl).subscribe({
      next: (response: Blob) => {
        const contentType = doc.type;
        console.log('Content Type:', contentType);
        const blob = new Blob([response], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const newTab = window.open(url, '_blank');

        if (newTab) {
          setTimeout(() => window.URL.revokeObjectURL(url), 10000);
        } else {
          console.error('Failed to open new tab');
        }
      },
      error: (err) => {
        console.error('Error viewing document:', err);
      }
    });
  }
  close() {
    this.dialog.closeAll();
  }
  closeAlert(): void {
    if (this.routeURL !== '') {
      this.router.navigate(['view-quote']);
    }
    this.showAlert = false;
  }

  confirmDialog(): void {
    this.performSaveJob();
  }

  performComprehensiveAnalysis(): void {
    this.performSaveJob();
  }

  performSelectedAnalysis(): void {
    const selectedPromptKeys = this.selectedPrompts.value;
    if (!selectedPromptKeys || selectedPromptKeys.length === 0) {
      this.alertMessage = 'Please select at least one prompt for the analysis.';
      this.showAlert = true;
      return;
    }

    // Save the job first, then trigger the analysis in the callback.
    this.performSaveJob((jobResponse) => {
      // This code will run AFTER the job has been successfully created.
      this.isAnalyzing = true;
      this.analysisReport = null;

      const request: AnalysisRequestDto = {
        analysisType: 'Selected',
        promptKeys: selectedPromptKeys,
        documentUrls: this.uploadedFileInfos.map(f => f.url),
        jobId: jobResponse.id, // Pass the new Job ID to the backend
        userId: localStorage.getItem('userId') || ''
      };

      // No need to call a separate performAnalysis method anymore.
      // The redirection is handled by the successful save.
      // The analysis will be processed in the background by Hangfire.
      console.log('Job created, selected analysis will now run in the background.', request);
    });
  }

  public viewUploadedFiles(): void {
    const documents: JobDocument[] = this.uploadedFileInfos.map((fileInfo, index) => ({
      id: index, // Using index as a temporary unique ID
      fileName: fileInfo.name,
      blobUrl: fileInfo.url,
      type: fileInfo.type,
      sessionId: this.sessionId,
      jobId: 0, // This might not be available yet
      uploadedAt: new Date().toISOString(),
      displayName: this.getDisplayName(fileInfo.name),
      size: fileInfo.size
    }));
    this.fileUploadService.viewUploadedFiles(documents);
  }
}


