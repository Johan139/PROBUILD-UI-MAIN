import { Component, OnInit, Inject, PLATFORM_ID, TemplateRef, ViewChild, OnDestroy, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { AsyncPipe, NgForOf, NgIf, isPlatformBrowser } from "@angular/common";
import { MatButton } from "@angular/material/button";
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { GanttChartComponent } from '../../components/gantt-chart/gantt-chart.component';
import { SubtasksState } from '../../state/subtasks.state';
import { Store } from '../../store/store.service';
import { LoaderComponent } from '../../loader/loader.component';
import { FormGroup, FormsModule, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { FileSizePipe } from '../Documents/filesize.pipe';
import { Subscription, timeout, debounceTime, switchMap, of, Observable, map, filter, take } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../environments/environment';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { v4 as uuidv4 } from 'uuid';
import { Location } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TimelineComponent, TimelineTask, TimelineGroup } from '../../components/timeline/timeline.component';
import { JobDataService } from './services/job-data.service';
import { SubtaskService } from './services/subtask.service';
import { DocumentService } from './services/document.service';
import { BomService } from './services/bom.service';
import { ReportService } from './services/report.service';
import { AddressService } from './services/address.service';
import { NoteService } from './services/note.service';
import { TimelineService } from './services/timeline.service';
import { SignalrService } from './services/signalr.service';
import { JobAssignmentService } from './job-assignment/job-assignment.service';
import { AuthService } from '../../authentication/auth.service';
import { WeatherService } from '../../weather.service';
import { WeatherImpactService } from './services/weather-impact.service';

const BASE_URL = environment.BACKEND_URL;

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    ReactiveFormsModule,
    NgIf,
    NgForOf,
    MatButton,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatDivider,
    MatIconModule,
    MatTooltipModule,
    LoaderComponent,
    GanttChartComponent,
    MatDialogModule,
    MatListModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    FileSizePipe,
    MatCheckboxModule,
    TimelineComponent,
    MatAutocompleteModule
  ],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss'
})
export class JobsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('documentsDialog') documentsDialog!: TemplateRef<any>;
  @ViewChild('billOfMaterialsDialog') billOfMaterialsDialog!: TemplateRef<any>;
  @ViewChild('noteDialog') noteDialog!: TemplateRef<any>;
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
  addressSuggestions: { description: string; place_id: string }[] = [];

  projectDetails: any;
  isEditingAddress: boolean = false;
  addressControl = new FormControl<string>('');
  selectedPlace: google.maps.places.PlaceResult | null = null;
  private selectedAddress: any;
  startDateDisplay: any;
  initialStartDate: any;
  noteText: string = '';
  documents: any[] = [];
  documentsError: string | null = null;
  alertMessage: string = '';
  isDialogOpened: boolean = false;
  isBomLoading: boolean = false;
  isBomProcessing: boolean = false;
  bomError: string | null = null;
  bom: any = null;
  processingResults: any[] = [];
  showAlert: boolean = false;
  routeURL: string = '';
  isLoading: boolean = false;
  isDocumentsLoading: boolean = false;
  isBrowser: boolean;
  IsAIProcessed: boolean = false;
  currentNoteTarget: any = null;
  noteDialogRef: any;
  progress: number = 0;
  isUploading: boolean = false;
  uploadedFilesCount: number = 0;
  uploadedFileNames: string[] = [];
  uploadedFileUrls: string[] = [];
  jobCardForm: FormGroup;
  sessionId: string = '';
  public isGeneratingReport = false;
  public isProjectOwner = false;
  public currentUserId: string = '';
  private pollingSubscription: Subscription | null = null;
  timelineGroups: TimelineGroup[] = [];

  constructor(
    private route: ActivatedRoute,
    public store: Store<SubtasksState>,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    public jobDataService: JobDataService,
    public subtaskService: SubtaskService,
    public documentService: DocumentService,
    public bomService: BomService,
    public reportService: ReportService,
    public addressService: AddressService,
    public noteService: NoteService,
    public timelineService: TimelineService,
    private signalrService: SignalrService,
    private jobAssignmentService: JobAssignmentService,
    private authService: AuthService,
    private weatherService: WeatherService,
    private weatherImpactService: WeatherImpactService
  ) {
    this.jobCardForm = new FormGroup({});
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  get isDialogOpen(): boolean {
    return this.dialog.openDialogs.length > 0;
  }

  ngOnInit() {
    this.sessionId = uuidv4();
    this.signalrService.startConnection(this.sessionId);
    this.signalrService.progress.subscribe((progress) => {
      this.progress = progress;
    });
    this.signalrService.uploadComplete.subscribe(() => {
      this.isUploading = false;
      this.resetFileInput();
    });

    this.route.queryParams.subscribe((params) => {
      this.projectDetails = params;
      this.startDateDisplay = new Date(
        this.projectDetails.date
      ).toISOString().split('T')[0];
      this.jobDataService.fetchJobData(this.projectDetails);

      if (this.projectDetails?.jobId) {
        this.authService.currentUser$.pipe(
          filter(user => !!user),
          take(1)
        ).subscribe(user => {
          this.currentUserId = user.id;
          this.checkProjectOwnerStatus(this.projectDetails.jobId, user.id);
        });
      }
    });

    this.store.select(state => state.projectDetails).pipe(
      switchMap(projectDetails => {
        if (!projectDetails || !projectDetails.latitude || !projectDetails.longitude) {
          return of([]);
        }
        return this.timelineService.timelineGroups$.pipe(
          switchMap(timelineGroups =>
            this.store.select(s => s.forecast).pipe(
              map(forecast => {
                if (!forecast) return timelineGroups;
                return this.weatherImpactService.applyWeatherImpact(timelineGroups, forecast);
              })
            )
          )
        );
      })
    ).subscribe(processedTimelineGroups => {
      this.timelineGroups = processedTimelineGroups;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.addressService.loadGoogleMapsScript().then(() => {
        this.addressControl.valueChanges
          .pipe(
            debounceTime(300),
            switchMap((value) =>
              this.addressService.getPlacePredictions(value)
            )
          )
          .subscribe((predictions) => {
            this.addressSuggestions = predictions;
          });
      });
    }
  }

  ngOnDestroy(): void {
    this.signalrService.stopConnection();
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) {
      return;
    }
    const file = input.files[0];
    this.isUploading = true;
    this.progress = 0;
    this.documentService
      .uploadFile(file, this.projectDetails.jobId, this.sessionId)
      .subscribe((e) => {
        if (e.type === 1 && e.total) {
          this.progress = Math.round((100 * e.loaded) / e.total);
        } else if (e.type === 4) {
          this.isUploading = false;
          this.resetFileInput();
          if (e.body?.fileUrls) {
            this.uploadedFileUrls = [
              ...this.uploadedFileUrls,
              ...e.body.fileUrls,
            ];
          }
        }
      });
  }

  resetFileInput(): void {
    const fileInput = document.getElementById(
      'file-upload'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  openNoteDialog(subtask: any): void {
    this.currentNoteTarget = subtask;
    this.noteDialogRef = this.dialog.open(this.noteDialog, {
      width: '250vw',
      height: '60vh',
      panelClass: 'subtask-note-dialog',
      data: {
        note: subtask?.note || '',
        jobId: this.projectDetails?.jobId,
        subtaskId: subtask?.id,
        createdByUserId: localStorage.getItem('userId'),
        sessionId: this.sessionId,
      },
    });
  }

  saveNoteDialog(): void {
    const userId: string | null = localStorage.getItem('userId');
    this.noteService
      .saveNote(
        this.projectDetails.jobId,
        this.projectDetails.userId,
        this.currentNoteTarget.id,
        this.noteText,
        userId || '',
        this.sessionId
      )
      .subscribe(() => {
        this.jobCardForm.reset();
        this.uploadedFilesCount = 0;
        this.uploadedFileNames = [];
        this.uploadedFileUrls = [];
        this.noteText = '';
        this.noteDialogRef.close();
      });
  }

  closeNoteDialog(): void {
    this.noteDialogRef.close();
  }

  openBillOfMaterialsDialog(): void {
    this.isBomLoading = true;
    this.bomService
      .getBillOfMaterials(this.projectDetails.jobId)
      .subscribe((result) => {
        this.isBomLoading = false;
        if (result.error) {
          this.bomError = result.error;
        } else {
          this.processingResults = result;
          this.IsAIProcessed = true;
        }
        this.dialog.open(this.billOfMaterialsDialog, {
          width: '20000px',
          maxHeight: '100vh',
          maxWidth: '150vw',
        });
      });
  }

  closeBillOfMaterialsDialog(): void {
    this.dialog.closeAll();
  }

  generateBOMPDF(): void {
    this.bomService.generateBOMPDF(this.processingResults);
  }

  downloadEnvironmentalReport(jobId: string): void {
    this.isGeneratingReport = true;
    this.reportService
      .downloadEnvironmentalReport(jobId)
      .finally(() => (this.isGeneratingReport = false));
  }

  openDocumentsDialog() {
    this.documentService
      .fetchDocuments(this.projectDetails.jobId)
      .subscribe((docs) => {
        this.documents = docs;
        this.dialog.open(this.documentsDialog, {
          width: '500px',
          maxHeight: '80vh',
          autoFocus: true,
        });
      });
  }

  closeDocumentsDialog() {
    this.dialog.closeAll();
  }

  viewDocument(document: any) {
    this.documentService.viewDocument(document);
  }

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

  handleGroupMove(event: { groupId: string; newStartDate: Date; newEndDate: Date; }): void {
    this.authService.currentUser$.pipe(
      filter(user => !!user),
      take(1)
    ).subscribe(user => {
      this.timelineService.handleGroupMove(event, this.projectDetails.jobId, user.id);
    });
  }

  NavigateBack(): void {
    this.location.back();
  }


  closeAlert(): void {
    this.showAlert = false;
  }
  private checkProjectOwnerStatus(jobId: string, userId: string): void {
    if (!userId || !jobId) {
      this.isProjectOwner = false;
      return;
    }

    this.jobAssignmentService.getJobAssignment().subscribe(assignments => {
      const numericJobId = +jobId;
      const jobAssignment = assignments.find(assignment => assignment.id === numericJobId);

      if (jobAssignment) {
        const user = jobAssignment.jobUser.find(u => u.id === userId);
        this.isProjectOwner = !!user && user.jobRole === 'PROJECT_OWNER';
      } else {
        this.isProjectOwner = false;
      }
    });
  }
}
