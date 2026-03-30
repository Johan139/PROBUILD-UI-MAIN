import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  TemplateRef,
  ViewChild,
  OnDestroy,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
  inject,
  DestroyRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  NgForOf,
  NgIf,
  isPlatformBrowser,
  CommonModule,
} from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { SubtasksState } from '../../state/subtasks.state';
import { Store } from '../../store/store.service';
import { LoaderComponent } from '../../loader/loader.component';
import {
  FormGroup,
  FormsModule,
  FormControl,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { FileSizePipe } from '../Documents/filesize.pipe';
import {
  Subscription,
  debounceTime,
  switchMap,
  of,
  map,
  filter,
  take,
  firstValueFrom,
} from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { v4 as uuidv4 } from 'uuid';
import { Location } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  TimelineComponent,
  TimelineGroup,
} from '../../components/timeline/timeline.component';
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
import { formatMoney } from '../../shared/pipes/money.pipe';
import { InitiateBiddingDialogComponent } from './initiate-bidding-dialog/initiate-bidding-dialog.component';
import {
  MeasurementService,
  TemperatureUnit,
} from '../../services/measurement.service';
import { SpreadsheetService } from './services/spreadsheet.service';
import { ConfirmationDialogComponent } from '../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import { format } from 'date-fns';
import { TeamManagementService } from '../../services/team-management.service';
import {
  JobUser,
  JobAssignmentLink,
} from './job-assignment/job-assignment.model';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../shared/shared.module';
import { userTypes } from '../../data/user-types';
import { BudgetService } from './services/budget.service';
import { ProjectBlueprintViewerComponent } from '../../components/project-blueprint-viewer/project-blueprint-viewer.component';
import { ProjectOverviewComponent } from './project-overview/project-overview.component';
import { Project } from '../../models/project';
import {
  UploadedFileInfo,
  FileUploadService,
} from '../../services/file-upload.service';
import { JobsService } from '../../services/jobs.service';
import { ProjectService } from '../../services/project.service';
import { ProjectBudgetTrackingComponent } from './project-budget-tracking/project-budget-tracking.component';
import { EditClientDialogComponent } from './edit-client-dialog/edit-client-dialog.component';
import { ConstructionPhasesComponent } from './components/construction-phases/construction-phases.component';
import { JobTeamComponent } from './components/job-team/job-team.component';
import { ProjectStageStepperComponent } from './components/project-stage-stepper/project-stage-stepper.component';
import { PhaseDetailedTakeoffComponent } from './components/phases/detailed-takeoff/phase-detailed-takeoff.component';
import { PhaseContractAwardComponent } from './components/phases/contract-award/phase-contract-award.component';
import { PhasePreConstructionComponent } from './components/phases/pre-construction/phase-pre-construction.component';
import { PhaseInitiationComponent } from './components/phases/initiation/phase-initiation.component';
import { PhasePreliminaryScopeComponent } from './components/phases/preliminary-scope/phase-preliminary-scope.component';
import { PhaseBidSolicitationComponent } from './components/phases/bid-solicitation/phase-bid-solicitation.component';
import { PhaseTradeAwardComponent } from './components/phases/trade-award/phase-trade-award.component';
import { PhaseMobilizationComponent } from './components/phases/mobilization/phase-mobilization.component';
import { PhaseConstructionLiveComponent } from './components/phases/construction-live/phase-construction-live.component';
import { PhaseCloseoutComponent } from './components/phases/closeout/phase-closeout.component';
import { PhaseReportRequestType } from './components/phases/shared/phase-navigation-header.component';
import {
  OverallBudgetDialogComponent,
  OverallBudgetDialogData,
} from './components/scope-insight-dialogs/overall-budget-dialog.component';
import {
  OverallTimelineDialogComponent,
  OverallTimelineDialogData,
  TimelineMilestoneRow,
} from './components/scope-insight-dialogs/overall-timeline-dialog.component';
import {
  BidPriceDialogComponent,
  BidPriceDialogData,
} from './components/scope-insight-dialogs/bid-price-dialog.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { JobCacheService } from './services/jobs/job-cache.service';

type ProjectPhase =
  | 'INITIATION'
  | 'PRELIMINARY_SCOPE'
  | 'DETAILED_TAKEOFF'
  | 'CONTRACT_AWARD'
  | 'PRE_CONSTRUCTION'
  | 'BID_SOLICITATION'
  | 'TRADE_AWARD'
  | 'MOBILIZATION'
  | 'CONSTRUCTION_LIVE'
  | 'CLOSEOUT';

interface ScopeRisk {
  category: string;
  description: string;
  level: 'high' | 'medium' | 'low';
}

interface JobUiStateCache {
  version: 1;
  activeTab: 'overview' | 'budget' | 'timeline' | 'team' | 'blueprints';
  stageDisplayMode: 'stage' | 'live';
  preliminaryTab: 0 | 1 | 2;
  updatedAt: string;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgIf,
    NgForOf,
    MatButton,
    MatCard,
    MatCardContent,
    MatDivider,
    MatIconModule,
    MatTooltipModule,
    LoaderComponent,
    MatDialogModule,
    MatListModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    FileSizePipe,
    MatCheckboxModule,
    TimelineComponent,
    MatAutocompleteModule,
    MatMenuModule,
    MatExpansionModule,
    MatSelectModule,
    SharedModule,
    ProjectBlueprintViewerComponent,
    ProjectOverviewComponent,
    ProjectBudgetTrackingComponent,
    ConstructionPhasesComponent,
    JobTeamComponent,
    ProjectStageStepperComponent,
    PhaseDetailedTakeoffComponent,
    PhaseContractAwardComponent,
    PhasePreConstructionComponent,
    PhaseInitiationComponent,
    PhasePreliminaryScopeComponent,
    PhaseBidSolicitationComponent,
    PhaseTradeAwardComponent,
    PhaseMobilizationComponent,
    PhaseConstructionLiveComponent,
    PhaseCloseoutComponent
  ],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss',
})
export class JobsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('documentsDialog') documentsDialog!: TemplateRef<any>;
  @ViewChild('billOfMaterialsDialog') billOfMaterialsDialog!: TemplateRef<any>;
  @ViewChild('reportDialog') reportDialog!: TemplateRef<any>;
  @ViewChild('noteDialog') noteDialog!: TemplateRef<any>;
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
  @ViewChild(ProjectOverviewComponent)
  projectOverviewComponent!: ProjectOverviewComponent;
  addressSuggestions: { description: string; place_id: string }[] = [];

  projectDetails: any;
  projectStage: ProjectPhase = 'CONSTRUCTION_LIVE';
  private manualProjectStageOverride: ProjectPhase | null = null;
  isStageResolved: boolean = false;
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
  public isReportLoading = false;

  get constructionPhaseGroups(): any[] {
    return this.store.getState().subtaskGroups;
  }
  public reportHtml: string | null = null;
  public reportTitle: string = 'Full Project Analysis Report';
  public reportError: string | null = null;
  public isProjectOwner = false;
  public currentUserId: string = '';
  private pollingSubscription: Subscription | null = null;
  private destroyRef = inject(DestroyRef);
  private readonly uiCacheVersion = 1 as const;

  private lastAuxLoadedJobId: number | null = null;

  timelineGroups: TimelineGroup[] = [];
  isSubtaskTimelineActive: boolean = false;
  selectedTimelineParentGroup: TimelineGroup | null = null;
  subtaskTimelineGroups: TimelineGroup[] = [];
  temperatureUnit: TemperatureUnit = 'C';

  // Tab State
  activeTab: 'overview' | 'budget' | 'timeline' | 'team' | 'blueprints' =
    'budget';
  stageDisplayMode: 'stage' | 'live' = 'stage';
  preliminaryTab: 0 | 1 | 2 = 0;
  showExportMenu = false;
  executiveSummaryOpen = true;
  scopeReviewSummaryOpen = true;
  internalTeamOpen = false;
  selectedRisk: ScopeRisk | null = null;
  editingProjectDetails = false;
  editingClientDetails = false;

  scopeProjectName = '';
  scopeProjectAddress = '';
  scopeProjectTotalArea = '0';
  scopeClientFirstName = '';
  scopeClientLastName = '';
  scopeClientEmail = '';
  scopeClientPhone = '';

  readonly scopeRiskFactors: ScopeRisk[] = [
    {
      category: 'Geotechnical Uncertainty',
      description: 'Missing site soil report may alter foundation design and cost.',
      level: 'high',
    },
    {
      category: 'Supply Chain',
      description: 'Long-lead materials can impact critical path.',
      level: 'medium',
    },
    {
      category: 'Client Selections',
      description: 'Allowance decisions can affect both schedule and pricing.',
      level: 'medium',
    },
  ];

  // Blueprint Viewer Data
  blueprintFiles: UploadedFileInfo[] = [];
  selectedBlueprint: UploadedFileInfo | null = null;
  blueprintPdfSrc: string | Uint8Array | null = null;
  isLoadingBlueprints: boolean = false;
  scopeCostSummary: any = null;
  scopeBomTotals: { materialCost: number; laborCost: number; directSubtotal: number } | null = null;
  scopePermitLeadTimeWeeks: number | null = null;
  scopeMaterialLeadTimeWeeks: number | null = null;

  // Project Overview Data
  overviewProjects: Project[] = [];
  liveProjectsCount: number = 0;
  biddingProjectsCount: number = 0;

  // Team Data
  assignedTeamMembers: JobUser[] = [];
  isLoadingTeam: boolean = false;
  teamForm: FormGroup;
  availableRoles: { value: string; display: string }[] = [];
  isSendingInvite: boolean = false;

  private tradePackageRefreshTriggeredForJobIds = new Set<number>();

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
    private teamManagementService: TeamManagementService,
    public authService: AuthService,
    private weatherService: WeatherService,
    private weatherImpactService: WeatherImpactService,
    public measurementService: MeasurementService,
    private spreadsheetService: SpreadsheetService,
    private fb: FormBuilder,
    private budgetService: BudgetService,
    private fileUploadService: FileUploadService,
    private jobsService: JobsService,
    private projectService: ProjectService,
    private jobCache: JobCacheService,
  ) {
    this.jobCardForm = new FormGroup({});
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Initialise Team Form
    this.teamForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      role: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });

    this.availableRoles = userTypes.filter(
      (role) => role.value !== 'GENERAL_CONTRACTOR',
    );
  }

  setActiveTab(
    tab: 'overview' | 'budget' | 'timeline' | 'team' | 'blueprints',
  ): void {
    this.activeTab = tab;
    this.persistJobUiState();
  }

  setStageDisplayMode(mode: 'stage' | 'live'): void {
    this.stageDisplayMode = mode;
    this.persistJobUiState();
  }

  setPreliminaryTab(tab: 0 | 1 | 2): void {
    this.preliminaryTab = tab;
    this.persistJobUiState();
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  closeExportMenu(): void {
    this.showExportMenu = false;
  }

  backToSetup(): void {
    this.projectStage = 'INITIATION';
    this.stageDisplayMode = 'stage';
  }

  proceedToDetailedTakeoff(): void {
    this.updateJobStatus('DETAILED_TAKEOFF');
  }

  confirmDiscardProject(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Discard Project?',
        message:
          'Are you sure you want to discard this project? All progress and entered data will be lost.',
        confirmButtonText: 'Discard',
        cancelButtonText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.NavigateBack();
      }
    });
  }

  private get hasBomDirectCosts(): boolean {
    return Number(this.scopeBomTotals?.directSubtotal || 0) > 0;
  }

  private get summaryDirectAndInsurableBase(): number {
    const explicit = Number(this.scopeCostSummary?.directAndInsurableSubtotal || 0);
    if (explicit > 0) return explicit;

    return (
      Number(this.scopeCostSummary?.materialCost || 0) +
      Number(this.scopeCostSummary?.laborCost || 0) +
      Number(this.scopeCostSummary?.generalConditions || 0) +
      Number(this.scopeCostSummary?.permitsAdminFees || 0) +
      Number(this.scopeCostSummary?.insuranceBonds || 0)
    );
  }

  private get resolvedOverheadPct(): number {
    const explicit = Number(this.scopeCostSummary?.overheadPct || 0);
    if (explicit > 0) return explicit;

    const base = this.summaryDirectAndInsurableBase;
    const amount = Number(this.scopeCostSummary?.overhead || 0);
    return base > 0 && amount > 0 ? (amount / base) * 100 : 0;
  }

  private get resolvedContingencyPct(): number {
    const explicit = Number(this.scopeCostSummary?.contingencyPct || 0);
    if (explicit > 0) return explicit;

    const base = this.summaryDirectAndInsurableBase;
    const amount = Number(this.scopeCostSummary?.contingency || 0);
    return base > 0 && amount > 0 ? (amount / base) * 100 : 0;
  }

  private get resolvedEscalationRate(): number {
    const base = this.summaryDirectAndInsurableBase;
    const amount = Number(this.scopeCostSummary?.escalation || 0);
    return base > 0 && amount > 0 ? amount / base : 0;
  }

  private get resolvedSalesTaxRate(): number {
    const explicitPct = Number(this.scopeCostSummary?.salesTaxPct || 0);
    if (explicitPct > 0) return explicitPct / 100;

    const summaryMaterial = Number(this.scopeCostSummary?.materialCost || 0);
    const summaryTax = Number(this.scopeCostSummary?.taxes || 0);
    return summaryMaterial > 0 && summaryTax > 0 ? summaryTax / summaryMaterial : 0;
  }

  get totalProjectCost(): number {
    const recomputed = this.preTaxSubtotal + this.taxesAllowance;
    if (recomputed > 0) return recomputed;

    const fromSummary = Number(this.scopeCostSummary?.suggestedBid || 0);
    if (fromSummary > 0) return fromSummary;

    const raw =
      this.projectDetails?.budget ||
      this.projectDetails?.totalBudget ||
      this.projectDetails?.estimatedBudget ||
      1451759;
    const parsed = Number(String(raw).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1451759;
  }

  get suggestedBid(): number {
    const marketBid = Number(this.scopeCostSummary?.suggestedMarketBid || 0);
    if (marketBid > 0) return Math.max(this.totalProjectCost, marketBid);
    return this.totalProjectCost;
  }

  private resolveBidPricing(): {
    bidToClient: number;
    baseCosts: number;
    overheadProfit: number;
    contingency: number;
    escalation: number;
    taxes: number;
  } {
    const summary: any = this.scopeCostSummary || {};

    const reportBid = Number(summary?.reportGrandTotalBidPrice || 0);
    const reportBase = Number(summary?.reportTotalDirectIndirectCosts || 0);
    const reportOverheadProfit = Number(summary?.reportOverheadProfit || 0);
    const reportContingency = Number(summary?.reportContingency || 0);
    const reportEscalation = Number(summary?.reportEscalation || 0);
    const reportTaxes = Number(summary?.reportVatAmount || 0);
    const reportPreTax = Number(summary?.reportPreTaxProjectCost || 0);
    const reportContingencyIncludesEscalation =
      Boolean(summary?.reportContingencyIncludesEscalation);

    const computedReportBid = reportPreTax > 0 ? reportPreTax + Math.max(reportTaxes, 0) : 0;

    const bidToClient =
      reportBid > 0 ? reportBid : computedReportBid > 0 ? computedReportBid : this.suggestedBid;

    const baseCosts = reportBase > 0 ? reportBase : this.costToBuild;
    const overheadProfit = reportOverheadProfit > 0 ? reportOverheadProfit : this.overheadProfit;
    const contingency = reportContingency > 0 ? reportContingency : this.contingencyAllowance;
    const escalation = reportContingencyIncludesEscalation
      ? 0
      : reportEscalation > 0
        ? reportEscalation
        : this.escalationAllowance;
    const taxes = reportTaxes > 0 ? reportTaxes : this.taxesAllowance;

    return {
      bidToClient,
      baseCosts,
      overheadProfit,
      contingency,
      escalation,
      taxes,
    };
  }

  get clientBidPrice(): number {
    return this.resolveBidPricing().bidToClient;
  }

  get bidNetProfitMarginPercent(): number {
    const resolved = this.resolveBidPricing();
    if (resolved.bidToClient > 0 && resolved.overheadProfit > 0) {
      return (resolved.overheadProfit / resolved.bidToClient) * 100;
    }

    if (this.suggestedBid <= 0) return 0;
    const fullyLoadedCost =
      this.costToBuild +
      this.overheadProfit +
      this.contingencyAllowance +
      this.escalationAllowance +
      this.taxesAllowance;
    const netProfit = this.suggestedBid - fullyLoadedCost;
    return (netProfit / this.suggestedBid) * 100;
  }

  get costToBuild(): number {
    const bomSubtotal = Number(this.scopeBomTotals?.directSubtotal || 0);
    if (bomSubtotal > 0) return bomSubtotal;

    const directSubtotal = Number(this.scopeCostSummary?.directSubtotal || 0);
    if (directSubtotal > 0) return directSubtotal;

    return this.materialsCost + this.laborCost;
  }

  get materialsCost(): number {
    const bomValue = Number(this.scopeBomTotals?.materialCost || 0);
    if (bomValue > 0) return bomValue;

    const summaryValue = Number(this.scopeCostSummary?.materialCost || 0);
    if (summaryValue > 0) return summaryValue;

    return 0;
  }

  get laborCost(): number {
    const bomValue = Number(this.scopeBomTotals?.laborCost || 0);
    if (bomValue > 0) return bomValue;

    const summaryValue = Number(this.scopeCostSummary?.laborCost || 0);
    if (summaryValue > 0) return summaryValue;

    return 0;
  }

  get overheadProfit(): number {
    if (this.hasBomDirectCosts && this.directAndInsurableSubtotal > 0) {
      return this.directAndInsurableSubtotal * (this.resolvedOverheadPct / 100);
    }
    return Number(this.scopeCostSummary?.overhead || 0);
  }

  get contingencyAllowance(): number {
    if (this.hasBomDirectCosts && this.directAndInsurableSubtotal > 0) {
      return this.directAndInsurableSubtotal * (this.resolvedContingencyPct / 100);
    }
    return Number(this.scopeCostSummary?.contingency || 0);
  }

  get generalConditionsSiteServices(): number {
    return Number(this.scopeCostSummary?.generalConditions || 0);
  }

  get permitsAdminFees(): number {
    return Number(this.scopeCostSummary?.permitsAdminFees || 0);
  }

  get insuranceBonds(): number {
    return Number(this.scopeCostSummary?.insuranceBonds || 0);
  }

  get directAndInsurableSubtotal(): number {
    if (this.hasBomDirectCosts) {
      return (
        this.materialsCost +
        this.laborCost +
        this.generalConditionsSiteServices +
        this.permitsAdminFees +
        this.insuranceBonds
      );
    }

    const fromSummary = Number(this.scopeCostSummary?.directAndInsurableSubtotal || 0);
    if (fromSummary > 0) return fromSummary;
    return (
      this.materialsCost +
      this.laborCost +
      this.generalConditionsSiteServices +
      this.permitsAdminFees +
      this.insuranceBonds
    );
  }

  get escalationAllowance(): number {
    if (this.hasBomDirectCosts && this.directAndInsurableSubtotal > 0) {
      return this.directAndInsurableSubtotal * this.resolvedEscalationRate;
    }
    return Number(this.scopeCostSummary?.escalation || 0);
  }

  get overheadPct(): number {
    return this.resolvedOverheadPct;
  }

  get contingencyPct(): number {
    return this.resolvedContingencyPct;
  }

  get salesTaxPct(): number {
    const fromSummary = Number(this.scopeCostSummary?.salesTaxPct || 0);
    if (fromSummary > 0) return fromSummary;

    const explicit = this.resolvedSalesTaxRate * 100;
    if (explicit > 0) return explicit;

    const base = Number(this.scopeCostSummary?.preTaxSubtotal || 0) || this.preTaxSubtotal;
    if (base > 0 && this.taxesAllowance > 0) {
      return (this.taxesAllowance / base) * 100;
    }

    return 0;
  }

  get preTaxSubtotal(): number {
    return this.directAndInsurableSubtotal;
  }

  get taxesAllowance(): number {
    if (this.hasBomDirectCosts && this.materialsCost > 0) {
      const computed = this.materialsCost * this.resolvedSalesTaxRate;
      if (computed > 0) return computed;
    }
    const taxes = Number(this.scopeCostSummary?.taxes || 0);
    if (taxes > 0) return taxes;
    return 0;
  }

  get costPerSqFt(): number {
    const fromSummary = Number(this.scopeCostSummary?.costPerSqFt || 0);
    if (fromSummary > 0) return fromSummary;

    const area = Number(this.projectDetails?.buildingSize || this.projectDetails?.projectSize || 0);
    if (area > 0 && this.totalProjectCost > 0) return this.totalProjectCost / area;
    return 0;
  }

  get marketRangeLow(): number {
    return Number(this.scopeCostSummary?.marketLow || 0);
  }

  get marketRangeHigh(): number {
    return Number(this.scopeCostSummary?.marketHigh || 0);
  }

  get totalDurationWeeksForDialog(): number {
    if (!this.timelineGroups?.length) return 0;

    const ranges = this.timelineGroups.flatMap((group) => {
      const subtaskRanges = (group.subtasks || []).flatMap((task) => {
        const start = task.start ? new Date(task.start) : task.startDate ? new Date(task.startDate) : null;
        const end = task.end ? new Date(task.end) : task.endDate ? new Date(task.endDate) : null;
        return start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) ? [{ start, end }] : [];
      });

      if (subtaskRanges.length > 0) return subtaskRanges;

      const start = group.startDate ? new Date(group.startDate) : null;
      const end = group.endDate ? new Date(group.endDate) : null;
      return start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) ? [{ start, end }] : [];
    });

    if (!ranges.length) return 0;
    const minStart = Math.min(...ranges.map((r) => r.start.getTime()));
    const maxEnd = Math.max(...ranges.map((r) => r.end.getTime()));
    const days = Math.max(7, Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24)));
    return Math.max(1, Math.ceil(days / 7));
  }

  get substantialCompletionDate(): Date | null {
    if (!this.projectStartDate || this.totalDurationWeeksForDialog <= 0) return null;
    return new Date(this.projectStartDate.getTime() + this.totalDurationWeeksForDialog * 7 * 24 * 60 * 60 * 1000);
  }

  get workingDaysForDialog(): number {
    return this.totalDurationWeeksForDialog > 0 ? this.totalDurationWeeksForDialog * 5 : 0;
  }

  get projectStartDate(): Date | null {
    const rawDate =
      this.projectDetails?.desiredStartDate ??
      this.projectDetails?.DesiredStartDate ??
      this.projectDetails?.date ??
      null;
    const d = rawDate ? new Date(rawDate) : null;
    return d && !isNaN(d.getTime()) ? d : null;
  }

  onMobilizationStartDateSaved(isoDate: string): void {
    if (!isoDate) {
      return;
    }

    this.projectDetails = {
      ...(this.projectDetails || {}),
      desiredStartDate: isoDate,
      DesiredStartDate: isoDate,
      date: isoDate,
    };

    this.startDateDisplay = isoDate.split('T')[0] || null;

    this.store.setState({
      projectDetails: this.projectDetails,
    });
  }

  saveScopeProjectDetails(): void {
    this.projectDetails = {
      ...this.projectDetails,
      projectName: this.scopeProjectName,
      address: this.scopeProjectAddress,
      buildingSize: this.scopeProjectTotalArea,
    };
    this.editingProjectDetails = false;
  }

  saveScopeClientDetails(): void {
    this.projectDetails = {
      ...this.projectDetails,
      clientName: `${this.scopeClientFirstName} ${this.scopeClientLastName}`.trim(),
      clientEmail: this.scopeClientEmail,
      clientPhone: this.scopeClientPhone,
    };
    this.editingClientDetails = false;
  }

  private syncScopeReviewDrafts(): void {
    this.scopeProjectName = this.projectDetails?.projectName || 'HERNANDEZ RESIDENCE';
    this.scopeProjectAddress =
      this.projectDetails?.address || 'Belicia Ln, Round Rock, TX';
    this.scopeProjectTotalArea = String(
      this.projectDetails?.buildingSize || this.projectDetails?.projectSize || 3222,
    );

    const fullName = this.projectDetails?.clientName || 'Jacques Barnard';
    const parts = String(fullName).split(' ');
    this.scopeClientFirstName = parts[0] || 'Jacques';
    this.scopeClientLastName = parts.slice(1).join(' ') || 'Barnard';
    this.scopeClientEmail = this.projectDetails?.clientEmail || 'jb@probuildai.com';
    this.scopeClientPhone = this.projectDetails?.clientPhone || '5124818499';
  }

  canUseLiveStageView(): boolean {
    return (
      this.projectStage === 'PRELIMINARY_SCOPE' ||
      this.projectStage === 'BID_SOLICITATION'
    );
  }

  handleTabNavigation(tab: string): void {
    if (
      ['overview', 'budget', 'timeline', 'team', 'blueprints'].includes(tab)
    ) {
      this.setActiveTab(
        tab as 'overview' | 'budget' | 'timeline' | 'team' | 'blueprints',
      );
    }
  }

  loadBlueprints(): void {
    if (!this.projectDetails?.jobId) return;
    this.isLoadingBlueprints = true;
    this.documentService.fetchDocuments(this.projectDetails.jobId).subscribe({
      next: (docs) => {
        // Filter for PDFs and map to UploadedFileInfo
        this.blueprintFiles = docs
          .filter(
            (doc: any) =>
              (doc.name && doc.name.toLowerCase().endsWith('.pdf')) ||
              (doc.type && doc.type.includes('pdf')),
          )
          .map(
            (doc: any) =>
              ({
                name: doc.name || 'Untitled Document',
                url: '', // No direct URL available
                type: doc.type || 'application/pdf',
                size: doc.size || 0,
                id: doc.id,
              }) as any,
          );

        if (this.blueprintFiles.length > 0) {
          this.handleBlueprintSelected(this.blueprintFiles[0]);
        } else {
          this.isLoadingBlueprints = false;
        }
      },
      error: (err) => {
        console.error('Error loading blueprints', err);
        this.isLoadingBlueprints = false;
        this.snackBar.open('Failed to load blueprints.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  handleBlueprintSelected(file: UploadedFileInfo): void {
    this.selectedBlueprint = file;
    this.isLoadingBlueprints = true;

    const docId = (file as any).id;
    if (docId) {
      this.jobsService.downloadJobDocument(docId).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) {
              this.blueprintPdfSrc = new Uint8Array(
                reader.result as ArrayBuffer,
              );
              this.isLoadingBlueprints = false;
            }
          };
          reader.readAsArrayBuffer(blob);
        },
        error: (err) => {
          console.error('Error downloading document', err);
          this.isLoadingBlueprints = false;
          this.snackBar.open('Failed to load blueprint content.', 'Close', {
            duration: 3000,
          });
        },
      });
    } else if (file.url) {
      this.fileUploadService.getFile(file.url).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) {
              this.blueprintPdfSrc = new Uint8Array(
                reader.result as ArrayBuffer,
              );
              this.isLoadingBlueprints = false;
            }
          };
          reader.readAsArrayBuffer(blob);
        },
        error: (err) => {
          console.error('Error fetching blueprint blob', err);
          this.isLoadingBlueprints = false;
          this.snackBar.open('Failed to load blueprint file.', 'Close', {
            duration: 3000,
          });
        },
      });
    }
  }

  loadAssignedTeam(): void {
    if (!this.projectDetails?.jobId) return;

    // Stale-While-Revalidate: Load from Local Storage first
    const storageKey = `team_${this.projectDetails.jobId}`;
    if (this.isBrowser) {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          this.assignedTeamMembers = JSON.parse(cached);
        } catch (e) {
          // console.error('Error parsing cached team data', e);
        }
      }
    }

    this.isLoadingTeam = true;
    this.jobAssignmentService.getJobAssignment().subscribe({
      next: (assignments) => {
        const jobId = Number(this.projectDetails.jobId);
        const assignment = assignments.find((a) => a.id === jobId);
        if (assignment && assignment.jobUser) {
          this.assignedTeamMembers = assignment.jobUser;
          // Update Local Storage with fresh data
          if (this.isBrowser) {
            localStorage.setItem(
              storageKey,
              JSON.stringify(this.assignedTeamMembers),
            );
          }
        } else {
          this.assignedTeamMembers = [];
        }
        this.isLoadingTeam = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading assignments', err);
        this.isLoadingTeam = false;
        this.snackBar.open('Failed to load team members', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  inviteTeamMember(): void {
    if (this.teamForm.valid) {
      this.isSendingInvite = true;
      const newMember = this.teamForm.value;
      const inviterId = this.currentUserId;

      if (!inviterId) {
        this.snackBar.open('Cannot invite: User ID not found.', 'Close', {
          duration: 3000,
        });
        this.isSendingInvite = false;
        return;
      }

      // First add to team
      this.teamManagementService.addTeamMember(newMember, inviterId).subscribe({
        next: (member) => {
          // Then assign to this job
          const assignmentLink: JobAssignmentLink = {
            userId: member.id,
            jobId: Number(this.projectDetails.jobId),
            jobRole: newMember.role,
          };

          this.jobAssignmentService
            .createJobAssignment(assignmentLink)
            .subscribe({
              next: () => {
                this.snackBar.open(
                  'Team member invited and assigned!',
                  'Close',
                  { duration: 3000 },
                );
                this.isSendingInvite = false;
                this.teamForm.reset();
                // Refresh list
                this.loadAssignedTeam();
              },
              error: (err) => {
                console.error('Error assigning to job', err);
                this.snackBar.open(
                  'Member invited but failed to assign to job.',
                  'Close',
                  { duration: 3000 },
                );
                this.isSendingInvite = false;
              },
            });
        },
        error: (error) => {
          if (error.status === 409) {
            this.snackBar.open(error.error.message, 'Close', {
              duration: 5000,
            });
          } else {
            this.snackBar.open('Failed to invite team member.', 'Close', {
              duration: 3000,
            });
          }
          this.isSendingInvite = false;
        },
      });
    }
  }

  removeTeamMember(user: JobUser): void {
    if (
      !confirm(
        `Are you sure you want to remove ${user.firstName} from this project?`,
      )
    )
      return;

    const link: JobAssignmentLink = {
      userId: user.id,
      jobId: Number(this.projectDetails.jobId),
      jobRole: user.jobRole || '',
    };

    this.jobAssignmentService.deleteUserAssignment(link).subscribe({
      next: () => {
        this.snackBar.open('User removed from project.', 'Close', {
          duration: 3000,
        });
        this.loadAssignedTeam();
      },
      error: (err) => {
        console.error('Error removing user', err);
        this.snackBar.open('Failed to remove user.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  get isDialogOpen(): boolean {
    return this.dialog.openDialogs.length > 0;
  }

  ngOnInit() {
    this.isStageResolved = false;

    this.projectService.projects$.subscribe((projects) => {
      this.overviewProjects = projects;
      this.calculateProjectCounts();
    });
    this.projectService.loadProjects();

    this.sessionId = uuidv4();
    this.measurementService.getSettings().subscribe((settings) => {
      this.temperatureUnit = settings.temperature;
    });
    this.signalrService.startConnection();
    this.signalrService.progress.subscribe((progress) => {
      this.progress = progress;
    });
    this.signalrService.uploadComplete.subscribe(() => {
      this.isUploading = false;
      this.resetFileInput();
    });

    this.route.queryParams
      .pipe(
        take(1),
        switchMap((params) => {
          const requestedJobId = Number(params?.['jobId']);
          this.isStageResolved = false;

          this.jobDataService
            .fetchJobData(params)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();

          return this.store.select((state) => state.projectDetails).pipe(
            filter((projectDetails) => {
              if (!projectDetails) {
                return false;
              }

              const currentJobId = Number(projectDetails?.jobId);
              if (!requestedJobId) {
                return true;
              }

              return currentJobId === requestedJobId;
            }),
          );
        }),
      )
      .subscribe((projectDetails) => {
        this.projectDetails = projectDetails;
        const resolvedStatus =
          (this.projectDetails as any)?.status ?? (this.projectDetails as any)?.Status ?? '';
        this.determineProjectStage(String(resolvedStatus));
        this.hydrateJobUiStateFromCache(this.projectDetails?.jobId);
        this.syncScopeReviewDrafts();
        this.isStageResolved = true;

        const initialStartRaw =
          this.projectDetails?.desiredStartDate ??
          this.projectDetails?.DesiredStartDate ??
          this.projectDetails?.date ??
          null;

        if (initialStartRaw) {
          const d = new Date(initialStartRaw);
          this.startDateDisplay = isNaN(d.getTime())
            ? null
            : d.toISOString().split('T')[0];
        } else {
          this.startDateDisplay = null;
        }

        if (this.projectDetails?.jobId) {
          const jobId = Number(this.projectDetails.jobId);

          if (this.lastAuxLoadedJobId !== jobId) {
            this.lastAuxLoadedJobId = jobId;

            this.loadBlueprints();
            this.loadAssignedTeam();

            if (this.projectStage !== 'INITIATION') {
              this.loadScopeInsightData(this.projectDetails.jobId);
            }

            this.authService.currentUser$
              .pipe(
                filter((user) => !!user),
                take(1),
              )
              .subscribe((user) => {
                if (user) {
                  this.currentUserId = user.id;
                  this.checkProjectOwnerStatus(
                    this.projectDetails.jobId,
                    user.id,
                  );
                }
              });
          }
        }
      });

    this.store
      .select((state) => state.projectDetails)
      .pipe(
        switchMap((projectDetails) => {
          if (
            !projectDetails ||
            !projectDetails.latitude ||
            !projectDetails.longitude
          ) {
            return of([]);
          }
          return this.timelineService.timelineGroups$.pipe(
            switchMap((timelineGroups) =>
              this.store
                .select((s) => s.forecast)
                .pipe(
                  map((forecast) => {
                    if (!forecast) return timelineGroups;
                    return this.weatherImpactService.applyWeatherImpact(
                      timelineGroups,
                      forecast,
                    );
                  }),
                ),
            ),
          );
        }),
      )
      .subscribe((processedTimelineGroups) => {
        this.timelineGroups = processedTimelineGroups;

        if (this.isSubtaskTimelineActive && this.selectedTimelineParentGroup) {
          const refreshedParent = processedTimelineGroups.find(
            (group) => group.title === this.selectedTimelineParentGroup?.title,
          );

          if (refreshedParent) {
            this.selectedTimelineParentGroup = refreshedParent;
            this.subtaskTimelineGroups = this.buildSubtaskTimelineGroups(refreshedParent);
          }
        }

        this.cdr.detectChanges();
      });
  }

  private getUiStateCacheKey(jobId: string | number): string {
    return `job_ui_state_${jobId}`;
  }

  private hydrateJobUiStateFromCache(jobId: string | number | undefined): void {
    if (!jobId) {
      return;
    }

    const cached = this.jobCache.get<JobUiStateCache>(
      this.getUiStateCacheKey(jobId),
    );

    if (!cached || cached.version !== this.uiCacheVersion) {
      return;
    }

    this.activeTab = cached.activeTab;
    this.stageDisplayMode = cached.stageDisplayMode;
    this.preliminaryTab = cached.preliminaryTab;
  }

  private persistJobUiState(): void {
    const jobId = this.projectDetails?.jobId;
    if (!jobId) {
      return;
    }

    const payload: JobUiStateCache = {
      version: this.uiCacheVersion,
      activeTab: this.activeTab,
      stageDisplayMode: this.stageDisplayMode,
      preliminaryTab: this.preliminaryTab,
      updatedAt: new Date().toISOString(),
    };

    this.jobCache.set(this.getUiStateCacheKey(jobId), payload);
  }

  private loadScopeInsightData(jobId: string): void {
    Promise.all([
      this.reportService.getDetailedCostSummary(jobId),
      firstValueFrom(this.bomService.getBillOfMaterials(jobId)),
      this.reportService.getPermittingLeadTimeWeeks(jobId),
      this.reportService.getMaxProcurementLeadTimeWeeks(jobId),
    ])
      .then(([summary, bomResults, permitWeeks, materialWeeks]) => {
        this.scopeCostSummary = summary || null;
        this.scopeBomTotals = this.extractScopeBomTotals(bomResults);
        this.scopePermitLeadTimeWeeks = Number.isFinite(Number(permitWeeks))
          ? Number(permitWeeks)
          : null;
        this.scopeMaterialLeadTimeWeeks = Number.isFinite(Number(materialWeeks))
          ? Number(materialWeeks)
          : null;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.scopeCostSummary = null;
        this.scopeBomTotals = null;
        this.scopePermitLeadTimeWeeks = null;
        this.scopeMaterialLeadTimeWeeks = null;
        this.cdr.detectChanges();
      });
  }

  private extractScopeBomTotals(bomResults: any): {
    materialCost: number;
    laborCost: number;
    directSubtotal: number;
  } | null {
    const results = Array.isArray(bomResults) ? bomResults : [];
    const parsed = results?.[0]?.parsedReport;
    if (!parsed?.sections?.length) return null;

    let materialCost = 0;
    let laborCost = 0;

    parsed.sections.forEach((section: any) => {
      const title = String(section?.title || '').toLowerCase();
      const rows = Array.isArray(section?.content) ? section.content : [];

      if (title.includes('bill of materials')) {
        rows.forEach((row: any[]) => {
          if (!Array.isArray(row) || !row.length) return;
          const item = String(row[0] || '').toLowerCase();
          if (!item || item.includes('total')) return;
          materialCost += Number(String(row[5] || '').replace(/[^0-9.-]/g, '')) || 0;
        });
      }

      if (title.includes('subcontractor cost breakdown')) {
        rows.forEach((row: any[]) => {
          if (!Array.isArray(row) || !row.length) return;
          const item = String(row[0] || '').toLowerCase();
          if (!item || item.includes('total')) return;
          laborCost += Number(String(row[4] || '').replace(/[^0-9.-]/g, '')) || 0;
        });
      }
    });

    const directSubtotal = materialCost + laborCost;
    if (directSubtotal <= 0) return null;

    return { materialCost, laborCost, directSubtotal };
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.addressService.loadGoogleMapsScript().then(() => {
        this.addressControl.valueChanges
          .pipe(
            debounceTime(300),
            switchMap((value) =>
              this.addressService.getPlacePredictions(value),
            ),
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
      'file-upload',
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
        this.sessionId,
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
    this.bomService.generateBOMPDF(
      this.processingResults,
      this.projectDetails.projectName,
    );
  }

  downloadEnvironmentalReport(jobId: string): void {
    this.isGeneratingReport = true;
    this.reportService
      .downloadEnvironmentalReport(jobId)
      .finally(() => (this.isGeneratingReport = false));
  }

  private handleReportAction(
    title: string,
    action: (jobId: string) => Promise<string | null>,
    errorMsg: string,
  ): void {
    this.isReportLoading = true;
    this.reportError = null;
    this.reportHtml = null;
    this.reportTitle = title;

    action(this.projectDetails.jobId)
      .then((content) => {
        if (content) {
          this.reportHtml = content;
          this.dialog.open(this.reportDialog, {
            width: '90vw',
            height: '90vh',
            maxWidth: '1200px',
            maxHeight: '90vh',
          });
        } else {
          this.snackBar.open(`Could not retrieve ${title}.`, 'Close', {
            duration: 3000,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
      })
      .finally(() => {
        this.isReportLoading = false;
      });
  }

  onPhaseReportRequested(reportType: PhaseReportRequestType): void {
    switch (reportType) {
      case 'fullReport':
        this.openReportDialog();
        break;
      case 'billOfMaterials':
        this.openBillOfMaterialsDialog();
        break;
      case 'executiveSummary':
        this.openExecutiveSummaryDialog();
        break;
      case 'environmentalReport':
        this.openEnvironmentalReportDialog();
        break;
      case 'procurementSchedule':
        this.openProcurementScheduleDialog();
        break;
      case 'dailyConstructionPlan':
        this.openDailyConstructionPlanDialog();
        break;
      default:
        break;
    }
  }

  openProcurementScheduleDialog(): void {
    this.handleReportAction(
      'Procurement & Submittal Schedule',
      (id) => this.reportService.getProcurementSchedule(id),
      'An error occurred while fetching the Procurement Schedule.',
    );
  }

  openDailyConstructionPlanDialog(): void {
    this.handleReportAction(
      'Daily Construction & Logistics Plan',
      (id) => this.reportService.getDailyConstructionPlan(id),
      'An error occurred while fetching the Daily Construction Plan.',
    );
  }

  openReportDialog(): void {
    this.handleReportAction(
      'Full Project Analysis Report',
      (id) => this.reportService.getFullReportContent(id),
      'An error occurred while fetching the report.',
    );
  }

  openExecutiveSummaryDialog(): void {
    this.handleReportAction(
      'Executive Summary',
      (id) => this.reportService.getExecutiveSummary(id),
      'An error occurred while fetching the Executive Summary.',
    );
  }

  openEnvironmentalReportDialog(): void {
    this.handleReportAction(
      'Environmental Lifecycle Report',
      (id) => this.reportService.getEnvironmentalReportContent(id),
      'An error occurred while fetching the Environmental Report.',
    );
  }

  closeReportDialog(): void {
    this.dialog.closeAll();
  }

  downloadFullReport(): void {
    if (!this.reportHtml) return;

    this.isGeneratingReport = true;
    const cleanTitle = this.reportTitle.replace(/ /g, '_');
    const fileName = `${this.projectDetails.projectName}_${cleanTitle}.pdf`;

    this.reportService
      .generatePdfFromHtml(this.reportHtml, fileName, this.reportTitle)
      .finally(() => {
        this.isGeneratingReport = false;
      });
  }

  downloadAsSpreadsheet(format: 'csv' | 'excel'): void {
    const data: { [key: string]: any[] } = {};
    this.processingResults.forEach((result) => {
      result.parsedReport.sections.forEach(
        (section: { title: string; headers: any[]; content: any[][] }) => {
          if (!data[section.title]) {
            data[section.title] = [];
          }
          section.content.forEach((row: { [x: string]: any }) => {
            const newRow: { [key: string]: any } = {};
            section.headers.forEach(
              (header: string | number, index: string | number) => {
                newRow[header] = row[index];
              },
            );
            data[section.title].push(newRow);
          });
        },
      );
    });

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `${this.projectDetails.projectName}_BOM_${date}`;

    if (format === 'csv') {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: {
          title: 'Download Multiple CSVs',
          message:
            'This will download a separate CSV file for each section of the Bill of Materials. Do you want to continue?',
          confirmButtonText: 'Yes, Download All',
          cancelButtonText: 'Cancel',
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.spreadsheetService.generateCsv(data, fileName);
        }
      });
    } else if (format === 'excel') {
      this.spreadsheetService.generateExcel(data, fileName);
    }
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

  openOverallBudgetDialog(): void {
    const directCostBase = this.materialsCost + this.laborCost;
    const materialRatio =
      directCostBase > 0 ? (this.materialsCost / directCostBase) * 100 : 0;
    const laborRatio =
      directCostBase > 0 ? (this.laborCost / directCostBase) * 100 : 0;

    const data: OverallBudgetDialogData = {
      materialsCost: this.materialsCost,
      laborCost: this.laborCost,
      costToBuild: this.costToBuild,
      generalConditionsSiteServices: this.generalConditionsSiteServices,
      permitsAdminFees: this.permitsAdminFees,
      insuranceBonds: this.insuranceBonds,
      directAndInsurableSubtotal: this.directAndInsurableSubtotal,
      taxesAllowance: this.taxesAllowance,
      salesTaxPct: this.salesTaxPct,
      totalProjectCost: this.totalProjectCost,
      costPerSqFt: this.costPerSqFt,
      materialRatio,
      laborRatio,
    };

    this.dialog.open(OverallBudgetDialogComponent, {
      data,
      width: '100%',
      maxWidth: '460px',
      maxHeight: '85vh',
      autoFocus: true,
      panelClass: 'scope-insight-panel',
    });
  }

  openOverallTimelineDialog(): void {
    const milestones = this.buildTimelineMilestones();

    const data: OverallTimelineDialogData = {
      noticeToProceed: this.projectStartDate
        ? format(this.projectStartDate, 'MMM d, yyyy')
        : 'TBD',
      substantialCompletion: this.substantialCompletionDate
        ? format(this.substantialCompletionDate, 'MMM d, yyyy')
        : 'TBD',
      contractDurationText:
        this.totalDurationWeeksForDialog > 0
          ? `${this.totalDurationWeeksForDialog} weeks (${this.totalDurationWeeksForDialog * 7} calendar days)`
          : 'TBD',
      workingDaysText:
        this.workingDaysForDialog > 0 ? `${this.workingDaysForDialog} days` : 'TBD',
      milestones,
      weatherDelays: this.projectDetails?.weatherRiskLevel || 'Low Risk',
      permitLeadTime:
        this.scopePermitLeadTimeWeeks && this.scopePermitLeadTimeWeeks > 0
          ? `${this.scopePermitLeadTimeWeeks} weeks`
          : this.projectDetails?.permitLeadTime || 'Not available',
      materialLeadTime:
        this.scopeMaterialLeadTimeWeeks && this.scopeMaterialLeadTimeWeeks > 0
          ? `${this.scopeMaterialLeadTimeWeeks} weeks`
          : this.projectDetails?.materialLeadTime || 'Not available',
    };

    this.dialog.open(OverallTimelineDialogComponent, {
      data,
      width: '100%',
      maxWidth: '460px',
      maxHeight: '85vh',
      autoFocus: true,
      panelClass: 'scope-insight-panel',
    });
  }

  private buildTimelineMilestones(): TimelineMilestoneRow[] {
    if (!this.timelineGroups?.length) {
      return [];
    }

    const ranges = this.timelineGroups
      .map((group) => {
        const subtaskRanges = (group.subtasks || [])
          .map((task) => {
            const start = task.start ? new Date(task.start) : task.startDate ? new Date(task.startDate) : null;
            const end = task.end ? new Date(task.end) : task.endDate ? new Date(task.endDate) : null;
            return start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())
              ? { start, end }
              : null;
          })
          .filter((r): r is { start: Date; end: Date } => !!r);

        let start: Date | null = null;
        let end: Date | null = null;

        if (subtaskRanges.length > 0) {
          start = new Date(Math.min(...subtaskRanges.map((r) => r.start.getTime())));
          end = new Date(Math.max(...subtaskRanges.map((r) => r.end.getTime())));
        } else {
          const gStart = group.startDate ? new Date(group.startDate) : null;
          const gEnd = group.endDate ? new Date(group.endDate) : null;
          if (gStart && gEnd && !isNaN(gStart.getTime()) && !isNaN(gEnd.getTime())) {
            start = gStart;
            end = gEnd;
          }
        }

        if (!start || !end) return null;
        return { title: group.title || 'Untitled Phase', start, end };
      })
      .filter((r): r is { title: string; start: Date; end: Date } => !!r)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (!ranges.length) return [];

    const projectStart = ranges[0].start.getTime();

    return ranges.map((range, index) => {
      const startWeek = Math.max(1, Math.ceil((range.start.getTime() - projectStart + 1) / (1000 * 60 * 60 * 24 * 7)));
      const endWeek = Math.max(startWeek, Math.ceil((range.end.getTime() - projectStart + 1) / (1000 * 60 * 60 * 24 * 7)));

      let tone: TimelineMilestoneRow['tone'] = 'default';
      if (index === 0) tone = 'accent';
      if (index === ranges.length - 1) tone = 'success';

      return {
        phase: range.title,
        weeks: startWeek === endWeek ? `Wk ${startWeek}` : `Wk ${startWeek}-${endWeek}`,
        tone,
      };
    });
  }

  openBidPriceDialog(): void {
    const resolved = this.resolveBidPricing();

    const recommendedBid = resolved.bidToClient;
    const costToBuild = resolved.baseCosts;
    const overheadProfit = resolved.overheadProfit;
    const contingencyAllowance = resolved.contingency;
    const escalationAllowance = resolved.escalation;
    const taxesAllowance = resolved.taxes;

    const grossMargin = recommendedBid - costToBuild;
    const grossMarginPercent = recommendedBid > 0 ? (grossMargin / recommendedBid) * 100 : 0;
    const markupOnCostPercent = costToBuild > 0 ? ((recommendedBid / costToBuild) - 1) * 100 : 0;

    // Net contractor profit in the full report corresponds to the OH&P line.
    // Therefore, exclude overheadProfit from the cost basis when computing profit.
    const totalCostBasis = costToBuild + contingencyAllowance + escalationAllowance + taxesAllowance;
    const riskExposure = recommendedBid - totalCostBasis;
    const netContractorProfit = overheadProfit > 0 ? overheadProfit : riskExposure;
    const netProfitMarginPercent =
      recommendedBid > 0
        ? ((overheadProfit > 0 ? overheadProfit : netContractorProfit) / recommendedBid) * 100
        : 0;
    const returnOnCostPercent = costToBuild > 0 ? (netContractorProfit / costToBuild) * 100 : 0;
    const size = Number(this.projectDetails?.buildingSize || this.projectDetails?.projectSize || 0);

    const data: BidPriceDialogData = {
      suggestedBid: recommendedBid,
      costToBuild,
      totalProjectCost: this.totalProjectCost,
      overheadProfit,
      contingencyAllowance,
      escalationAllowance,
      taxesAllowance,
      grossMargin,
      grossMarginPercent,
      markupOnCostPercent,
      riskExposure,
      netContractorProfit,
      netProfitMarginPercent,
      returnOnCostPercent,
      marketRangeLow: this.marketRangeLow,
      marketRangeHigh: this.marketRangeHigh,
      costPerSqFt: this.costPerSqFt,
      bidPerSqFtText: size > 0 ? formatMoney(recommendedBid / size, true, 2) : 'N/A',
    };

    this.dialog.open(BidPriceDialogComponent, {
      data,
      width: '100%',
      maxWidth: '460px',
      maxHeight: '85vh',
      autoFocus: true,
      panelClass: 'scope-insight-panel',
    });
  }

  viewDocument(document: any) {
    this.documentService.viewDocument(document);
  }

  triggerEditAddress(): void {
    this.setActiveTab('overview');
    // Slight delay to ensure tab switch and view init
    setTimeout(() => {
      if (this.projectOverviewComponent) {
        this.projectOverviewComponent.toggleAddressEdit(true);
      }
    }, 100);
  }

  openEditClientDialog(): void {
    const dialogRef = this.dialog.open(EditClientDialogComponent, {
      width: '500px',
      data: { jobId: this.projectDetails.jobId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.jobDataService
          .fetchJobData(this.projectDetails)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe();
      }
    });
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
          this.jobDataService
            .fetchJobData(this.projectDetails)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
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

  handleGroupMove(event: {
    groupId: string;
    newStartDate: Date;
    newEndDate: Date;
  }): void {
    this.authService.currentUser$
      .pipe(
        filter((user) => !!user),
        take(1),
      )
      .subscribe((user) => {
        if (this.isSubtaskTimelineActive) {
          this.handleSubtaskTimelineMove(event, user.id);
          return;
        }

        this.timelineService.handleGroupMove(event, this.projectDetails.jobId, user.id);
      });
  }

  private handleSubtaskTimelineMove(
    event: { groupId: string; newStartDate: Date; newEndDate: Date },
    senderId: string,
  ): void {
    if (!this.selectedTimelineParentGroup) {
      return;
    }

    const selectedSubtaskGroup = this.subtaskTimelineGroups.find(
      (group) => (group.id || group.title) === event.groupId,
    );
    const sourceSubtask = selectedSubtaskGroup?.subtasks?.[0];
    const subtaskIdentifier =
      sourceSubtask?.task ||
      sourceSubtask?.name ||
      (sourceSubtask?.id != null ? String(sourceSubtask.id) : null) ||
      selectedSubtaskGroup?.title ||
      event.groupId;
    const subtaskDisplayName = selectedSubtaskGroup?.title || 'this subtask';

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm Subtask Move',
        message: `Please confirm you want to move ${subtaskDisplayName} to ${format(
          event.newStartDate,
          'MMM d, yyyy',
        )}. This will update the task timeline and notify all users assigned to this task.`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result || !this.selectedTimelineParentGroup) {
        return;
      }

      console.log('[JobsComponent] Subtask move confirm', {
        parentGroupTitle: this.selectedTimelineParentGroup.title,
        subtaskIdentifier,
        subtaskDisplayName,
        newStartDate: event.newStartDate,
      });

      this.timelineService.moveSubtaskWithinGroup(
        this.selectedTimelineParentGroup.title,
        subtaskIdentifier,
        event.newStartDate,
        this.projectDetails.jobId,
        senderId,
      ).subscribe({
        next: () => {
          this.snackBar.open('Subtask timeline updated successfully.', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          this.snackBar.open(
            err?.message || 'Failed to update subtask timeline.',
            'Close',
            { duration: 4000 },
          );
        },
      });
    });
  }

  handleTimelineGroupDoubleClick(group: TimelineGroup): void {
    if (this.isSubtaskTimelineActive) {
      return;
    }

    this.selectedTimelineParentGroup = group;
    this.subtaskTimelineGroups = this.buildSubtaskTimelineGroups(group);
    this.isSubtaskTimelineActive = true;
  }

  returnToMainTimeline(): void {
    this.isSubtaskTimelineActive = false;
    this.selectedTimelineParentGroup = null;
    this.subtaskTimelineGroups = [];
  }

  get displayedTimelineGroups(): TimelineGroup[] {
    return this.isSubtaskTimelineActive
      ? this.subtaskTimelineGroups
      : this.timelineGroups;
  }

  private buildSubtaskTimelineGroups(parentGroup: TimelineGroup): TimelineGroup[] {
    const subtasks = (parentGroup.subtasks || []).filter((task) => !task.deleted);

    return subtasks.map((task, index) => {
      const startDate = this.resolveTaskDate(task.start, task.startDate);
      const endDate = this.resolveTaskDate(task.end, task.endDate) ?? startDate;
      const isComplete =
        task.accepted || (task.status || '').toLowerCase() === 'completed';

      return {
        id:
          task.id != null
            ? String(task.id)
            : task.task || task.name || `subtask-${index + 1}`,
        title: task.task || task.name || `Subtask ${index + 1}`,
        subtasks: [task],
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
        progress: isComplete ? 100 : 0,
      };
    });
  }

  private resolveTaskDate(
    dateValue?: Date,
    dateString?: string,
  ): Date | null {
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return dateValue;
    }

    if (dateString) {
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }

  NavigateBack(): void {
    this.location.back();
  }

  publishJob(): void {
    const dialogRef = this.dialog.open(InitiateBiddingDialogComponent, {
      width: '600px',
      data: {},
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.biddingType) {
        this.projectDetails.biddingType = result.biddingType;
        this.projectDetails.requiredSubcontractorTypes =
          result.requiredSubcontractorTypes;
        this.projectDetails.tradeBudgets = result.tradeBudgets;
        this.projectDetails.status = 'BIDDING';
        this.subtaskService
          .publishJob(this.projectDetails.jobId, this.projectDetails)
          .subscribe(() => {
            this.snackBar.open('Project published successfully', 'Close', {
              duration: 3000,
            });
          });
      }
    });
  }

  closeAlert(): void {
    this.showAlert = false;
  }

  private calculateProjectCounts(): void {
    if (!this.overviewProjects) {
      this.liveProjectsCount = 0;
      this.biddingProjectsCount = 0;
      return;
    }

    this.liveProjectsCount = this.overviewProjects.filter(
      (p) =>
        (p.status || '').toUpperCase() === 'LIVE' ||
        (p.status || '').toUpperCase() === 'ACTIVE',
    ).length;

    this.biddingProjectsCount = this.overviewProjects.filter(
      (p) => (p.status || '').toUpperCase() === 'BIDDING',
    ).length;
  }
  onJobArchived(jobId: number): void {
    // Reload project list
    this.projectService.loadProjects();

    // Optional: if user is currently viewing the archived job
    if (this.projectDetails?.jobId === jobId) {
      this.snackBar.open('This project has been archived.', 'Close', {
        duration: 3000,
      });

      // Navigate back to project list or dashboard
      this.router.navigateByUrl('/projects', { replaceUrl: true }).then(() => {
        this.projectDetails = null;
        this.activeTab = 'overview';
      });
    }
  }

  private checkProjectOwnerStatus(jobId: string, userId: string): void {
    if (!userId || !jobId) {
      this.isProjectOwner = false;
      return;
    }

    this.store
      .select((state) => state.projectDetails)
      .subscribe((projectDetails) => {
        if (projectDetails && projectDetails.userId === userId) {
          this.isProjectOwner = true;
        } else {
          this.jobAssignmentService
            .getJobAssignment()
            .subscribe((assignments) => {
              const numericJobId = +jobId;
              const jobAssignment = assignments.find(
                (assignment) => assignment.id === numericJobId,
              );
              if (jobAssignment) {
                const user = jobAssignment.jobUser.find((u) => u.id === userId);
                this.isProjectOwner = !!user;
              } else {
                this.isProjectOwner = false;
              }
            });
        }
      });
  }

  private determineProjectStage(status: string) {
      if (!status) {
          return;
      }

      if (this.manualProjectStageOverride) {
          this.projectStage = this.manualProjectStageOverride as any;
          this.stageDisplayMode = this.canUseLiveStageView() ? 'stage' : 'live';
          return;
      }

      const s = status.toUpperCase();
      if (s === 'ANALYZING' || s === 'INITIATION') {
          this.projectStage = 'INITIATION';
      } else if (
        s === 'PRELIMINARY' ||
        s === 'NEW' ||
        s === 'DRAFT' ||
        s === 'PRELIMINARY_SCOPE'
      ) {
          this.projectStage = 'PRELIMINARY_SCOPE';
          this.triggerTradePackageRefreshIfNeeded();
      } else if (s === 'DETAILED-TAKEOFF' || s === 'DETAILED_TAKEOFF') {
          this.projectStage = 'DETAILED_TAKEOFF';
      } else if (s === 'CONTRACT-AWARD' || s === 'CONTRACT_AWARD') {
          this.projectStage = 'CONTRACT_AWARD';
      } else if (s === 'PRE-CONSTRUCTION' || s === 'PRE_CONSTRUCTION') {
          this.projectStage = 'PRE_CONSTRUCTION';
      } else if (s === 'BIDDING' || s === 'INBOUND-BIDDING' || s === 'BID_SOLICITATION') {
          this.projectStage = 'BID_SOLICITATION';
      } else if (s === 'TRADE-AWARD' || s === 'TRADE_AWARD') {
          this.projectStage = 'TRADE_AWARD';
      } else if (s === 'MOBILIZATION') {
          this.projectStage = 'MOBILIZATION';
      } else if (s === 'LIVE' || s === 'ACTIVE' || s === 'CONSTRUCTION_LIVE') {
          this.projectStage = 'CONSTRUCTION_LIVE';
      } else if (s === 'ARCHIVED' || s === 'CLOSURE' || s === 'COMPLETED' || s === 'CLOSEOUT') {
          this.projectStage = 'CLOSEOUT';
      } else {
          this.projectStage = 'CONSTRUCTION_LIVE'; // Fallback
      }

      this.stageDisplayMode = this.canUseLiveStageView() ? 'stage' : 'live';
  }

  private triggerTradePackageRefreshIfNeeded(): void {
    const jobId = Number(this.projectDetails?.jobId);
    if (!Number.isFinite(jobId)) {
      return;
    }

    if (this.tradePackageRefreshTriggeredForJobIds.has(jobId)) {
      return;
    }

    this.tradePackageRefreshTriggeredForJobIds.add(jobId);
    console.info('[tradepackages] Refresh requested (Scope Review)', { jobId });
    this.bomService.refreshTradePackages(jobId).subscribe({
      next: () => {
        console.info('[tradepackages] Refresh completed', { jobId });
        this.bomService.getTradePackages(String(jobId)).subscribe({
          next: (packages) => {
            const count = Array.isArray(packages) ? packages.length : 0;
            console.info('[tradepackages] Packages after refresh', { jobId, count });
          },
          error: (err) => {
            console.error('[tradepackages] Failed to load packages after refresh', { jobId, err });
          },
        });
      },
      error: (err) => {
        console.error('[tradepackages] Refresh failed', { jobId, err });
        this.tradePackageRefreshTriggeredForJobIds.delete(jobId);
      },
    });
  }

  onAnalysisComplete() {
      const jobId = Number(this.projectDetails?.jobId);
      if (!Number.isFinite(jobId)) {
        this.snackBar.open('Cannot proceed: Job ID not available yet.', 'Close', {
          duration: 3000,
        });
        return;
      }

      this.projectStage = 'PRELIMINARY_SCOPE';
      this.stageDisplayMode = 'stage';

      this.updateJobStatus('PRELIMINARY_SCOPE');
  }

  onJobGranted() {
      // Update status to BIDDING
      this.updateJobStatus('BIDDING');
  }

  onBackToPreliminary() {
      this.manualProjectStageOverride = 'PRELIMINARY_SCOPE';
      this.projectStage = 'PRELIMINARY_SCOPE';
      this.stageDisplayMode = 'stage';
  }

  navigateTo(status: string): void {
    this.updateJobStatus(status);
  }

  onArchiveProject(): void {
    this.updateJobStatus('CLOSURE');
  }

  onGoLive() {
      this.updateJobStatus('LIVE');
  }

  private updateJobStatus(status: string) {
    if (!this.projectDetails?.jobId) return;

    this.manualProjectStageOverride = null;

    const jobId = this.projectDetails.jobId;

    this.jobsService
      .updateJobStatus(jobId, status)
      .subscribe({
        next: () => {
          this.projectDetails = {
            ...(this.projectDetails || {}),
            status,
            Status: status,
          };
          this.store.setState({ projectDetails: this.projectDetails } as any);
          this.determineProjectStage(status);
          this.prefetchPhaseData(status, String(jobId));

          this.jobsService.getSpecificJob(jobId).subscribe({
            next: (jobDetails) => {
              this.projectDetails = { ...(this.projectDetails || {}), ...(jobDetails || {}) };
              this.store.setState({ projectDetails: this.projectDetails } as any);
              // Don't re-determine stage here - backend may return stale status
              // The initial determineProjectStage(status) call already set correct stage
            },
            error: (err) => {
              console.error('Failed to refresh job details after status update', err);
            },
          });
        },
        error: (err) => {
          console.error('Failed to update status', err);
          this.snackBar.open('Failed to update project status.', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  private prefetchPhaseData(status: string, jobId: string): void {
    if (!jobId) {
      return;
    }

    const phase = String(status || '').toUpperCase();

    if (phase === 'DETAILED_TAKEOFF') {
      this.bomService.getBillOfMaterials(jobId).subscribe({ error: () => {} });
      this.budgetService.getBudget(Number(jobId)).subscribe({ error: () => {} });
      this.reportService.getDetailedCostSummary(jobId).catch(() => null);
      this.reportService.getValueEngineeringReport(jobId).catch(() => []);
      return;
    }

    if (phase === 'PRELIMINARY_SCOPE' || phase === 'PRELIMINARY') {
      this.triggerTradePackageRefreshIfNeeded();
      this.bomService.getBillOfMaterials(jobId).subscribe({ error: () => {} });
      this.reportService.getDetailedCostSummary(jobId).catch(() => null);
      return;
    }
  }
}
