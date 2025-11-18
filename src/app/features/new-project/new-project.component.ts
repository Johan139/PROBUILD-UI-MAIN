import { Component, ElementRef, OnInit, ViewChild, Renderer2, Inject, PLATFORM_ID, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { UploadOptionsDialogComponent } from '../jobs/job-quote/upload-options-dialog.component';
import { LucideAngularModule, HardHat, MapPin, MousePointer, Hand, ZoomIn, ZoomOut, Maximize2, Ruler, RotateCw, CheckCircle } from 'lucide-angular';
import { DragAndDropDirective } from '../../directives/drag-and-drop.directive';
import { PdfJsViewerModule } from 'ng2-pdfjs-viewer';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { AiChatService } from '../ai-chat/services/ai-chat.service';
import { AiChatStateService } from '../ai-chat/services/ai-chat-state.service';
import { Prompt } from '../ai-chat/models/ai-chat.models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FileUploadService, UploadedFileInfo } from '../../services/file-upload.service';
import { NewAnalysisService } from '../../services/new-analysis.service';
import { SignalrService, AnalysisProgressUpdate } from '../jobs/services/signalr.service';
import { RichTextEditorComponent } from '../../components/rich-text-editor/rich-text-editor.component';
import { environment } from '../../../environments/environment';
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../authentication/auth.service';
import { LocalStorageService } from '../../services/local-storage.service';

  interface WalkthroughStep {
  stepIndex: number;
  promptKey: string;
  aiResponse: string;
  userEditedResponse?: string;
  userComments?: string;
  isComplete: boolean;
}

interface AnalysisState {
  flowType: 'standard' | 'walkthrough';
  analysisType: 'sequential' | 'selected' | 'renovation';
  budgetLevel: 'high' | 'medium' | 'low';
  uploadedFiles: UploadedFileInfo[];
  selectedFile: UploadedFileInfo | null;
  walkthroughSessionId?: string;
  walkthroughHistory: WalkthroughStep[];
  currentWalkthroughStep: number;
  analysisProgress: AnalysisProgressUpdate | null;
}

type FlowState =
  | { step: 'idle' }
  | { step: 'uploaded'; fileName: string }
  | { step: 'extracting'; pct: number }
  | { step: 'address'; detectedAddress?: string }
  | { step: 'walkthrough'; index: number; notes: Record<string, string> }
  | { step: 'finalizing'; pct: number }
  | { step: 'done' };

@Component({
  selector: 'app-new-project',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    DragAndDropDirective,
    PdfJsViewerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    RichTextEditorComponent,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatExpansionModule,
    MatInputModule,
    MatDatepickerModule,
    MatProgressBarModule,
    MatCardModule
],
  templateUrl: './new-project.component.html',
  styleUrls: ['./new-project.component.scss']
})
export class NewProjectComponent implements OnInit, OnDestroy {
  HardHat = HardHat;
  MapPin = MapPin;
  MousePointer = MousePointer;
  Hand = Hand;
  ZoomIn = ZoomIn;
  ZoomOut = ZoomOut;
  Maximize2 = Maximize2;
  Ruler = Ruler;
  RotateCw = RotateCw;
  Check = CheckCircle;

  BRAND = {
    gray433: '#1E2329',
    gray426: '#2A2F35',
    gray432: '#3B4046',
    grayTooltip: '#6B7280',
    yellow012: '#FCD109',
    yellow120: '#FFE473',
    redWarn: '#F43F5E',
  };

  darkMode = true;
  flow: FlowState = { step: 'idle' };
  addressField = '21 Featherstone Rd & 21st St, Red Wing';
  zoom = 1; // Start at 100%
  metric = true;
  analysisMode: 'full' | 'selected' | 'renovation' = 'full';
  flowType: 'standard' | 'walkthrough' = 'standard';
  analysisType: 'Comprehensive' | 'Selected' | 'Renovation' = 'Comprehensive';
  budgetLevel: 'high' | 'medium' | 'low' = 'medium';
  isLoading = false;
  isRerunningStep = false;
  isNavigatingNext = false;
  progress = 0;

  uploadedFiles: UploadedFileInfo[] = [];
  selectedFile: UploadedFileInfo | null = null;
  pdfSrc: string | Uint8Array | null = null;
  availablePrompts$: Observable<Prompt[]>;
  selectedPrompts = new FormControl([]);
  viewerId = uuidv4();

  currentUserEditedContent: string = '';
  currentUserComments: string = '';
  applyCostOptimisation: boolean = false;
  hasScrolledToBottom: boolean = false;
  isFileListCollapsed = false;

  private state = new BehaviorSubject<AnalysisState>({
    flowType: 'standard',
    analysisType: 'sequential',
    budgetLevel: 'medium',
    uploadedFiles: [],
    selectedFile: null,
    walkthroughHistory: [],
    currentWalkthroughStep: -1,
    analysisProgress: null,
  });

  state$ = this.state.asObservable();

  SECTION_ORDER = [
    { key: 'Foundation', color: '#22C55E' },
    { key: 'Walls', color: '#60A5FA' },
    { key: 'Roof', color: '#F87171' },
    { key: 'Kitchen', color: '#F59E0B' },
  ];

  HIGHLIGHTS: Record<string, { left: string; top: string; w: string; h: string }> = {
    Foundation: { left: '10%', top: '60%', w: '80%', h: '30%' },
    Walls: { left: '12%', top: '20%', w: '76%', h: '55%' },
    Roof: { left: '8%', top: '10%', w: '84%', h: '40%' },
    Kitchen: { left: '55%', top: '35%', w: '25%', h: '20%' },
  };

  defaultDesc: Record<string, string> = {
    Foundation: 'Concrete slab with Class-III vapor barrier, #4 rebar @ 12" O.C., 25 MPa concrete, perimeter insulation as per climate zone.',
    Walls: 'Exterior 2x6 studs @ 16" O.C., R-21 insulation, sheathing + weather barrier, selected cladding; interior 2x4 @ 16" O.C.',
    Roof: 'Timber trusses, 30-year shingles, underlayment, drip edge, ridge vent; R-38 attic insulation.',
    Kitchen: 'Base & wall cabinets, soft-close hardware, quartz/granite tops, undermount sink, appliance allowances.',
  };

  rightToolbarButtons = [
    { key: 'select', icon: this.MousePointer, label: 'Select' },
    { key: 'pan', icon: this.Hand, label: 'Pan' },
    { key: 'zoomin', icon: this.ZoomIn, label: 'Zoom In' },
    { key: 'zoomout', icon: this.ZoomOut, label: 'Zoom Out' },
    { key: 'fit', icon: this.Maximize2, label: 'Fit to Page' },
    { key: 'measure', icon: this.Ruler, label: 'Measure', disabled: true }, // TODO: Reenable when interactive blueprint implemented
    { key: 'rotate', icon: this.RotateCw, label: 'Rotate' },
  ];

  progressSteps: { k: string, done: boolean }[] = [];
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('pdfViewer') pdfViewer: any;
  @ViewChild(RichTextEditorComponent) private richTextEditor!: RichTextEditorComponent;

  constructor(
    public dialog: MatDialog,
    private renderer: Renderer2,
    private aiChatService: AiChatService,
    private aiChatStateService: AiChatStateService,
    private fileUploadService: FileUploadService,
    private newAnalysisService: NewAnalysisService,
    private signalrService: SignalrService,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private localStorageService: LocalStorageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.clientForm = this.formBuilder.group({
      projectName: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      companyName: [''],
      position: [''],
      startDate: ['', Validators.required],
    });

    this.addressForm = this.formBuilder.group({
      formattedAddress: ['', Validators.required],
    });
    const hiddenPrompts = ['SYSTEM_COMPREHENSIVE_ANALYSIS', 'SYSTEM_RENOVATION_ANALYSIS'];
    this.availablePrompts$ = this.aiChatStateService.prompts$.pipe(
      map(prompts => prompts.filter(p => !hiddenPrompts.includes(p.promptKey)))
    );
  }

  isBrowser: boolean;
  autocompleteService: google.maps.places.AutocompleteService | undefined;
  options: { description: string; place_id: string }[] = [];
  addressControl = new FormControl<string>('', [Validators.required, this.requireMatch.bind(this)]);
  selectedPlace: { description: string; place_id: string } | null = null;
  private isGoogleMapsLoaded: boolean = false;
  clientForm: FormGroup;
  addressForm: FormGroup;
  sessionId!: string;
  private readonly CLIENT_FORM_KEY = 'newProjectClientForm';

  async ngOnInit(): Promise<void> {
    this.sessionId = uuidv4();
    this.loadForm();
    this.updateProgressSteps();
    this.aiChatService.getMyPrompts();

    this.signalrService.startConnection();
    this.signalrService.analysisProgress.subscribe(update => {
      this.state.next({ ...this.state.getValue(), analysisProgress: update });
      if (update.isComplete || update.hasFailed) {
        this.isLoading = false;
        if (!update.hasFailed) {
          this.setFlow('done');
        }
      }
    });

    if (this.isBrowser) {
      try {
        await this.loadGoogleMapsScript();
        this.isGoogleMapsLoaded = true;
        this.autocompleteService = new google.maps.places.AutocompleteService();
      } catch (error) {
        // console.error('Error loading Google Maps API:', error);
        this.isGoogleMapsLoaded = false;
      }
    }

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
      if (this.selectedPlace && value !== this.selectedPlace.description) {
        this.selectedPlace = null;
      }
    });

    this.clientForm.valueChanges.subscribe(value => {
      this.localStorageService.setItem(this.CLIENT_FORM_KEY, value);
    });
  }


  ngOnDestroy(): void {
    this.deleteTemporaryFiles();
  }

  deleteTemporaryFiles(): void {
    const urlsToDelete = this.uploadedFiles.map(f => f.url);
    if (urlsToDelete.length === 0) {
      return;
    }
    this.fileUploadService.deleteTemporaryFiles(urlsToDelete).subscribe({
      next: () => {
        this.uploadedFiles = [];
      },
      error: (error) => {
        //console.error('Error deleting temporary files:', error);
      },
    });
  }

  loadForm(): void {
    const savedData = this.localStorageService.getItem(this.CLIENT_FORM_KEY);
    if (savedData) {
      this.clientForm.patchValue(savedData, { emitEvent: false });
    }
  }

  isUploaded(flow: FlowState): flow is Extract<FlowState, { step: 'uploaded' }> {
    return flow.step === 'uploaded';
  }

  isExtracting(flow: FlowState): flow is Extract<FlowState, { step: 'extracting' }> {
    return flow.step === 'extracting';
  }

  isAddress(flow: FlowState): flow is Extract<FlowState, { step: 'address' }> {
    return flow.step === 'address';
  }

  isWalkthrough(flow: FlowState): flow is Extract<FlowState, { step: 'walkthrough' }> {
    return flow.step === 'walkthrough';
  }

  isFinalizing(flow: FlowState): flow is Extract<FlowState, { step: 'finalizing' }> {
    return flow.step === 'finalizing';
  }

  get currentKey(): string {
    if (this.isWalkthrough(this.flow)) {
      return this.SECTION_ORDER[this.flow.index].key;
    }
    return 'Foundation';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.onFileDropped(input.files);
    }
  }

  onFileDropped(files: FileList): void {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      this.fileUploadService.uploadFiles(fileArray, this.sessionId).subscribe(upload => {
        this.progress = upload.progress;
        this.isLoading = upload.isUploading;
        if (upload.files) {
          const isFirstUpload = this.uploadedFiles.length === 0;
          this.uploadedFiles = [...this.uploadedFiles, ...upload.files];
          if (isFirstUpload && this.uploadedFiles.length > 0) {
            this.selectedFile = this.uploadedFiles[0];
            this.setFlow('uploaded', { fileName: this.selectedFile.name });
            this.displayPdfByName(this.selectedFile.name);
          }
        }
      });
    }
  }

  onPdfSelectionChange(file: UploadedFileInfo): void {
    if (file) {
      this.selectedFile = file;
      this.setFlow('uploaded', { fileName: this.selectedFile.name });
      this.displayPdfByName(this.selectedFile.name);
    }
  }

  displayPdfByName(fileName: string): void {
    const fileInfo = this.uploadedFiles.find(f => f.name === fileName);
    if (fileInfo) {
      this.fileUploadService.getFile(fileInfo.url).subscribe(blob => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            this.pdfSrc = new Uint8Array(reader.result as ArrayBuffer);
            this.viewerId = uuidv4();
          }
        };
        reader.readAsArrayBuffer(blob);
      });
    }
  }

  openUploadDialog(): void {
    const dialogRef = this.dialog.open(UploadOptionsDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result === 'folder') {
          this.renderer.setAttribute(this.fileInput.nativeElement, 'webkitdirectory', 'true');
        } else {
          this.renderer.removeAttribute(this.fileInput.nativeElement, 'webkitdirectory');
        }
        this.fileInput.nativeElement.click();
      }
    });
  }

  setFlow(step: FlowState['step'], data?: any): void {
    this.flow = { step, ...data };
    this.updateProgressSteps();
  }

  async handleToolbarClick(key: string): Promise<void> {
    if (!this.pdfViewer) {
      return;
    }

    switch (key) {
      case 'zoomin':
        this.zoom = Math.min(4, this.zoom + 0.25); // Max zoom 400%
        await this.pdfViewer.setZoom(this.zoom);
        break;
      case 'zoomout':
        this.zoom = Math.max(0.25, this.zoom - 0.25); // Min zoom 25%
        await this.pdfViewer.setZoom(this.zoom);
        break;
      case 'fit':
        this.zoom = 1; // Reset to 100%
        await this.pdfViewer.setZoom('auto');
        break;
      case 'rotate':
        await this.pdfViewer.triggerRotation('cw');
        break;
      case 'select':
        await this.pdfViewer.setCursor('select');
        break;
      case 'pan':
        await this.pdfViewer.setCursor('hand');
        break;
    }
  }

  analyze(): void {
    if (this.flow.step === 'idle') return;
    if (this.flow.step === 'uploaded') this.setFlow('extracting', { pct: 5 });
    if (this.flow.step === 'walkthrough') this.setFlow('finalizing', { pct: 5 });
    if (this.flow.step === 'extracting') this.setFlow('address', { detectedAddress: this.addressField });
    if (this.flow.step === 'finalizing') setTimeout(() => this.setFlow('done'), 300);
  }

  cancel(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.setFlow('idle');
        this.uploadedFiles = [];
        this.selectedFile = null;
        this.pdfSrc = null;
        this.clientForm.reset();
        this.localStorageService.removeItem(this.CLIENT_FORM_KEY);
      }
    });
  }

  viewUploadedFiles(): void {
    alert('Open files drawer (stub)');
  }

  nextStep(): void {
    if (this.flow.step === 'walkthrough') {
      if (this.flow.index < this.SECTION_ORDER.length - 1) {
        this.setFlow('walkthrough', { ...this.flow, index: this.flow.index + 1 });
      } else {
        this.setFlow('finalizing', { pct: 5 });
      }
    }
  }

  getPlaceholder(key: string): string {
    switch (key) {
      case 'Kitchen':
        return 'e.g., Solid wood fronts, granite top, matte black hardware';
      case 'Foundation':
        return 'e.g., Increase rebar density; add waterproofing membrane';
      default:
        return 'e.g., Switch to light-gauge steel; adjust sheathing';
    }
  }

  updateProgressSteps(): void {
    this.progressSteps = [
      { k: 'Upload', done: this.flow.step !== 'idle' },
      { k: 'Extract', done: ['extracting', 'address', 'walkthrough', 'finalizing', 'done'].includes(this.flow.step) },
      { k: 'Address', done: ['address', 'walkthrough', 'finalizing', 'done'].includes(this.flow.step) },
      { k: 'Walkthrough', done: ['walkthrough', 'finalizing', 'done'].includes(this.flow.step) },
      { k: 'Finalize', done: ['finalizing', 'done'].includes(this.flow.step) },
    ];
  }

  startStandardAnalysis(): void {
    if (this.clientForm.invalid || this.addressForm.invalid) {
      // Show validation errors
      return;
    }

    const formData = new FormData();
    formData.append('ProjectName', this.clientForm.value.projectName);
    formData.append('firstName', this.clientForm.value.firstName);
    formData.append('lastName', this.clientForm.value.lastName);
    formData.append('email', this.clientForm.value.email);
    formData.append('phone', this.clientForm.value.phone);
    formData.append('company', this.clientForm.value.companyName);
    formData.append('position', this.clientForm.value.position);
    formData.append('startDate', this.clientForm.value.startDate);

    formData.append('address', this.addressForm.value.formattedAddress);

    if (this.selectedPlace && this.selectedPlace.place_id) {
        const placesService = new google.maps.places.PlacesService(document.createElement('div'));
        placesService.getDetails(
            { placeId: this.selectedPlace.place_id, fields: ['geometry', 'formatted_address', 'address_components'] },
            (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    const lat = place.geometry?.location?.lat();
                    const lng = place.geometry?.location?.lng();

                    let streetNumber = '';
                    let streetName = '';
                    let city = '';
                    let state = '';
                    let postalCode = '';
                    let country = '';

                    if (place.address_components) {
                        place.address_components.forEach(component => {
                            const types = component.types;
                            if (types.includes('street_number')) streetNumber = component.long_name;
                            if (types.includes('route')) streetName = component.long_name;
                            if (types.includes('locality')) city = component.long_name;
                            if (types.includes('administrative_area_level_1')) state = component.short_name;
                            if (types.includes('postal_code')) postalCode = component.long_name;
                            if (types.includes('country')) country = component.long_name;
                        });
                    }

                    formData.append('streetNumber', streetNumber);
                    formData.append('streetName', streetName);
                    formData.append('city', city);
                    formData.append('state', state);
                    formData.append('postalCode', postalCode);
                    formData.append('country', country);

                    if (lat !== undefined && lng !== undefined) {
                        formData.append('latitude', lat.toString());
                        formData.append('longitude', lng.toString());
                    }
                    formData.append('googlePlaceId', this.selectedPlace!.place_id);
                    this.submitStandardAnalysis(formData);
                }
            }
        );
    } else {
        this.submitStandardAnalysis(formData);
    }
  }

  submitStandardAnalysis(formData: FormData) {
    const userId = this.authService.getUserId();
    if (!userId) {
      // console.error("Could not get UserId");
      this.snackBar.open('Error: Could not get user ID. Please try logging in again.', 'Close', { duration: 10000 });
      return;
    }
    formData.append('userId', userId);
    const connectionId = this.signalrService.getConnectionId();
    if (!connectionId) {
      // console.error("Could not get SignalR connection ID");
      this.snackBar.open('Error: Could not establish a connection with the server. Please refresh the page.', 'Close', { duration: 10000 });
      return;
    }
    formData.append('connectionId', connectionId);
    formData.append('analysisType', this.analysisType);
    formData.append('budgetLevel', this.budgetLevel);
    formData.append('generateDetailsWithAi', 'true');
    formData.append('sessionId', this.sessionId);

    const fileUrls = this.uploadedFiles.map(f => f.url);
    formData.append('temporaryFileUrls', JSON.stringify(fileUrls));

    this.isLoading = true;
    this.newAnalysisService.startStandardAnalysis(formData).subscribe({
      next: (response) => {
        // console.log('Analysis started successfully', response);
        this.snackBar.open('Analysis started successfully!', 'Close', { duration: 5000 });
        this.clientForm.reset();
        this.localStorageService.removeItem(this.CLIENT_FORM_KEY);
        // Progress will be handled by the SignalR subscription
      },
      error: (error) => {
        // console.error('Analysis failed to start', error);
        this.isLoading = false;
        this.snackBar.open('Error: Analysis failed to start. Please try again.', 'Close', { duration: 10000 });
      }
    });
  }

  startWalkthrough(): void {
    if (!this.selectedFile) return;

    const promptKeys = (this.analysisType === 'Selected' ? this.selectedPrompts.value : []) ?? [];
    this.newAnalysisService.startWalkthrough(this.uploadedFiles, this.clientForm.value.startDate, this.analysisType, this.budgetLevel, promptKeys).subscribe({
      next: (response) => {
        this.state.next({
          ...this.state.getValue(),
          walkthroughSessionId: response.sessionId,
          walkthroughHistory: [response.firstStep],
          currentWalkthroughStep: 0,
        });
        this.snackBar.open('Walkthrough started successfully!', 'Close', { duration: 5000 });
      },
      error: (error) => {
        // console.error('Failed to start walkthrough', error);
        this.snackBar.open('Error: Failed to start walkthrough. Please try again.', 'Close', { duration: 10000 });
      }
    });
  }

  goToNextStep(): void {
    const currentState = this.state.getValue();
    if (!currentState.walkthroughSessionId) return;

    this.isNavigatingNext = true;
    this.newAnalysisService.getNextWalkthroughStep(
      currentState.walkthroughSessionId,
      this.applyCostOptimisation
    ).subscribe({
      next: (nextStep) => {
        this.state.next({
          ...currentState,
          walkthroughHistory: [...currentState.walkthroughHistory, nextStep],
          currentWalkthroughStep: currentState.walkthroughHistory.length,
        });
        this.hasScrolledToBottom = false;
        this.isNavigatingNext = false;
      },
      error: (error) => {
        // console.error('Failed to get next step', error);
        this.isNavigatingNext = false;
        this.snackBar.open('Error: Failed to get next step. Please try again.', 'Close', { duration: 10000 });
      }
    });
  }

  goToPreviousStep(): void {
    const currentState = this.state.getValue();
    if (currentState.currentWalkthroughStep > 0) {
      this.state.next({
        ...currentState,
        currentWalkthroughStep: currentState.currentWalkthroughStep - 1,
      });
    }
  }

  onEditorContentChanged(newContent: string) {
    this.currentUserEditedContent = newContent;
  }

  rerunCurrentStep() {
    const currentState = this.state.getValue();
    const currentStep = currentState.walkthroughHistory[currentState.currentWalkthroughStep];
    if (!currentState.walkthroughSessionId) return;

    const payload = {
      originalAiResponse: currentStep.aiResponse,
      userEditedResponse: this.currentUserEditedContent,
      userComments: this.currentUserComments,
      applyCostOptimisation: this.applyCostOptimisation
    };
    this.isRerunningStep = true;
    this.newAnalysisService.rerunWalkthroughStep(currentState.walkthroughSessionId, currentStep.stepIndex, payload)
      .subscribe({
        next: updatedStep => {
          const newHistory = [...currentState.walkthroughHistory];
          newHistory[currentState.currentWalkthroughStep] = updatedStep;
          this.state.next({
            ...currentState,
            walkthroughHistory: newHistory
          });
          this.isRerunningStep = false;
          this.snackBar.open('Step updated successfully!', 'Close', { duration: 5000 });
        },
        error: (error) => {
          // console.error('Failed to rerun step', error);
          this.isRerunningStep = false;
          this.snackBar.open('Error: Failed to rerun step. Please try again.', 'Close', { duration: 10000 });
        }
      });
  }

  undo(): void {
    if (this.richTextEditor) {
      this.richTextEditor.undo();
    }
  }

  redo(): void {
    if (this.richTextEditor) {
      this.richTextEditor.redo();
    }
  }

  onResponseViewerScroll(event: Event): void {
    const element = event.target as HTMLElement;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      this.hasScrolledToBottom = true;
    }
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
          // console.error('Google Maps script failed to load:', error);
          reject(error);
        };
        document.head.appendChild(script);
      });
    }

    onAddressSelected(event: any) {
        const selectedAddress = event.option.value;
        this.selectedPlace = selectedAddress;
        this.addressControl.setValue(selectedAddress.description);
        this.addressForm.get('formattedAddress')?.setValue(selectedAddress.description);
    }

    requireMatch(control: AbstractControl): ValidationErrors | null {
    if (!this.selectedPlace) {
      return { requireMatch: true };
    }
    return null;
  }

  removeFile(fileToRemove: UploadedFileInfo): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm Deletion',
        message: `Are you sure you want to remove the file "${fileToRemove.name}"?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.fileUploadService.deleteTemporaryFile(fileToRemove.url).subscribe({
          next: () => {
            this.uploadedFiles = this.uploadedFiles.filter(f => f.url !== fileToRemove.url);
            if (this.selectedFile?.url === fileToRemove.url) {
              if (this.uploadedFiles.length > 0) {
                this.selectedFile = this.uploadedFiles[0];
                this.displayPdfByName(this.selectedFile.name);
              } else {
                this.selectedFile = null;
                this.pdfSrc = null;
                this.setFlow('idle');
              }
            }
            this.snackBar.open(`File "${fileToRemove.name}" has been removed.`, 'Close', { duration: 3000 });
          },
          error: (error) => {
            console.error('Failed to delete file:', error);
            this.snackBar.open(`Error removing file "${fileToRemove.name}". Please try again.`, 'Close', { duration: 5000 });
          }
        });
      }
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.uploadedFiles.length > 0) {
      $event.returnValue = true;
    }
  }
}

