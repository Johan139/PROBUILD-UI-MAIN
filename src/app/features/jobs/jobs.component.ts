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
import { animate, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser, CommonModule } from '@angular/common';
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
import { formatMoney, setDefaultCurrencySymbol } from '../../shared/pipes/money.pipe';
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
 import { BudgetLineItem } from '../../models/budget-line-item.model';

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
  animations: [
    trigger('jobPhaseTransition', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate(
          '260ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'none' }),
        ),
      ]),
    ]),
  ],
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
  /** Rank of construction-live in lifecycle; blocks retrograde API updates once job is live. */
  private readonly constructionLivePhaseRank = 8;
  isStageResolved: boolean = false;
  /** Avoid re-running determineProjectStage on every store tick when status/job did not change (reduces jumpy phase swaps). */
  private lastSyncedStageJobId: number | null = null;
  private lastSyncedStageStatusKey = '';
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

  private analysisAutoAdvanceTriggeredForJobIds = new Set<number>();

  get constructionPhaseGroups(): any[] {
    return this.store.getState().subtaskGroups;
  }

  private buildAiBudgetItemsFromReport(report: any, jobId: number): BudgetLineItem[] {
    const newItems: BudgetLineItem[] = [];
    if (!report || !Array.isArray(report.sections)) {
      return newItems;
    }

    report.sections.forEach((section: any) => {
      let category = 'Other';
      const rawTitle = String(section?.title || '');
      const lowerTitle = rawTitle.toLowerCase();
      let phase = rawTitle
        .replace(
          / - (Bill of Materials|Subcontractor Cost Breakdown|Cost Breakdown)/i,
          '',
        )
        .trim();

      if (lowerTitle.includes('material')) {
        category = 'Materials';
      } else if (lowerTitle.includes('labor') || lowerTitle.includes('subcontractor')) {
        category = 'Subcontractor';
      }

      if (
        (lowerTitle.includes('total') && lowerTitle.includes('breakdown')) ||
        lowerTitle.includes('project cost breakdown') ||
        lowerTitle.includes('project cost summary') ||
        lowerTitle.includes('summary of costs')
      ) {
        return;
      }

      if (section?.type !== 'table' || !Array.isArray(section?.content)) {
        return;
      }

      const getIndex = (headers: string[], ...names: string[]) =>
        headers.findIndex((h) =>
          names.some((n) => String(h || '').toLowerCase().includes(n.toLowerCase())),
        );

      const headers = Array.isArray(section?.headers) ? section.headers : [];
      const itemIdx = getIndex(headers, 'Item', 'Task', 'Description');
      const tradeIdx = getIndex(headers, 'Trade');
      const qtyIdx = getIndex(headers, 'Quantity', 'Qty', 'Hours');
      const unitIdx = getIndex(headers, 'Unit');
      const specIdx = getIndex(headers, 'Specification', 'Spec', 'Model');
      const detailIdx = getIndex(headers, 'Size/Detail', 'Detail', 'Size', 'Dimensions');
      const costIdx = getIndex(headers, 'Total Cost', 'Total Estimated Cost', 'Est. Cost', 'Total Price');
      const unitCostIdx = getIndex(headers, 'Unit Cost', 'Rate', 'Hourly Rate');

      section.content.forEach((row: any[]) => {
        if (!Array.isArray(row) || row.length === 0) {
          return;
        }

        let item =
          itemIdx > -1
            ? row[itemIdx]
            : tradeIdx > -1
              ? row[tradeIdx]
              : 'Unknown Item';
        item = String(item || '');

        const trade = String((tradeIdx > -1 ? row[tradeIdx] : phase) || '');

        const lowerItem = item.toLowerCase();
        if (
          lowerItem.includes('total') ||
          lowerItem.includes('subtotal') ||
          lowerItem.includes('overhead') ||
          lowerItem.includes('contingency') ||
          lowerItem.includes('escalation') ||
          lowerItem.includes('calculated gc bid')
        ) {
          return;
        }

        if (specIdx > -1 && row[specIdx]) {
          item += ` - ${row[specIdx]}`;
        }

        let notes = 'Imported from AI Analysis';
        if (detailIdx > -1 && row[detailIdx]) {
          notes = `${row[detailIdx]}; ${notes}`;
        }

        let cost = 0;
        let qty = 0;
        let unitCost = 0;

        if (qtyIdx > -1) {
          const qStr = String(row[qtyIdx] ?? '');
          qty = parseFloat(qStr.replace(/[^0-9.-]+/g, '')) || 0;
        }

        if (unitCostIdx > -1) {
          const ucStr = String(row[unitCostIdx] ?? '');
          unitCost = parseFloat(ucStr.replace(/[^0-9.-]+/g, '')) || 0;
        }

        if (costIdx > -1) {
          const cStr = String(row[costIdx] ?? '');
          cost = parseFloat(cStr.replace(/[^0-9.-]+/g, '')) || 0;
        }

        const calculatedCost = qty * unitCost;
        if (calculatedCost > 0) {
          if (cost === 0 || Math.abs(cost - calculatedCost) > calculatedCost * 0.1) {
            cost = calculatedCost;
          }
        } else if (cost === 0 && costIdx === -1) {
          const lastVal = String(row[row.length - 1] ?? '');
          if (lastVal.includes('.') || lastVal.includes('$')) {
            cost = parseFloat(lastVal.replace(/[^0-9.-]+/g, '')) || 0;
          }
        }

        const unit =
          unitIdx > -1
            ? String(row[unitIdx] ?? '')
            : category === 'Labor'
              ? 'Hours'
              : 'ea';

        if (!item || item === 'Unknown Item') {
          return;
        }

        if (cost > 0) {
          newItems.push({
            jobId,
            category,
            phase,
            item,
            trade,
            estimatedCost: cost,
            actualCost: 0,
            percentComplete: 0,
            quantity: qty > 0 ? qty : undefined,
            unit: qty > 0 ? unit : undefined,
            unitCost: unitCost > 0 ? unitCost : undefined,
            status: 'Pending',
            notes,
            source: 'AI',
            id: 0,
            forecastToComplete: cost,
          } as BudgetLineItem);
        }
      });
    });

    return newItems;
  }

  private async importAiBudgetItemsIfNeeded(jobId: number): Promise<void> {
    try {
      const existing = await firstValueFrom(this.budgetService.getBudget(jobId, true));
      const hasAiItems = (existing || []).some(
        (item) => String((item as any)?.source || '') === 'AI',
      );
      if (hasAiItems) {
        return;
      }

      let newItems: BudgetLineItem[] = [];
      for (let attempt = 0; attempt < 5; attempt++) {
        const results = await firstValueFrom(
          this.bomService.getBillOfMaterials(String(jobId), true),
        );
        const normalized = Array.isArray(results)
          ? results
          : results
            ? [results]
            : [];
        const report = normalized?.[0]?.parsedReport;
        newItems = this.buildAiBudgetItemsFromReport(report, jobId);

        if (newItems.length > 0) {
          break;
        }

        // Analysis output can lag briefly even when the stage has just advanced.
        await this.sleep(1000 + attempt * 300);
      }

      if (!newItems.length) {
        console.warn('[budget-import] No AI budget items parsed from report', {
          jobId,
        });
        return;
      }

      await firstValueFrom(this.budgetService.addBudgetItemsBatch(newItems));
      await firstValueFrom(this.budgetService.getBudget(jobId, true));
    } catch (err) {
      console.error('[budget-import] Failed to import AI budget items', {
        jobId,
        err,
      });
      return;
    }
  }
  public reportHtml: string | null = null;
  public reportTitle: string = 'Full Project Analysis Report';
  public reportError: string | null = null;
  public isProjectOwner = false;
  public currentUserId: string = '';
  private pollingSubscription: Subscription | null = null;
  private destroyRef = inject(DestroyRef);
  private readonly uiCacheVersion = 1 as const;
  private readonly uiStateCacheTtlMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly teamCacheTtlMs = 15 * 60 * 1000; // 15 minutes
  private readonly phasePrefetchDelayMs = 1200;

  private lastAuxLoadedJobId: number | null = null;
  private lastCurrencySeededJobId: number | null = null;
  private fetchedDataKeys = new Set<string>();
  private prefetchedPhaseKeys = new Set<string>();
  private financialSnapshotRefreshInFlight = false;
  private lastFinancialSnapshotRefreshAt = 0;
  private lastFinancialSnapshotRefreshJobId: number | null = null;
  private isAnalysisInactivityPaused = false;

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
  budgetLineItems: BudgetLineItem[] = [];

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
    this.primeDataForCurrentView();
    this.prefetchLikelyNextData();
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

  private isReasonableSalesTaxPct(value: number): boolean {
    return Number.isFinite(value) && value > 0 && value <= 35;
  }

  private get minimumNetMarginRate(): number {
    const explicitPct = Number(this.scopeCostSummary?.targetNetMarginPct || 0);
    if (Number.isFinite(explicitPct) && explicitPct >= 2 && explicitPct <= 30) {
      return explicitPct / 100;
    }

    return 0.1;
  }

  private get resolvedSalesTaxRate(): number {
    const explicitPct = Number(this.scopeCostSummary?.salesTaxPct || 0);
    if (this.isReasonableSalesTaxPct(explicitPct)) return explicitPct / 100;

    const summaryMaterial = Number(this.scopeCostSummary?.materialCost || 0);
    const summaryTax = Number(this.scopeCostSummary?.taxes || 0);
    if (summaryMaterial > 0 && summaryTax > 0) {
      const derivedPct = (summaryTax / summaryMaterial) * 100;
      if (this.isReasonableSalesTaxPct(derivedPct)) {
        return derivedPct / 100;
      }
    }

    // Conservative fallback to avoid propagating clearly invalid extracted rates.
    return 0.0825;
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
      0;
    const parsed = Number(String(raw).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  // Scope Review cards should prefer authoritative summary bid totals
  // over recomputed transient values that may lag behind during initial load.
  get scopeReviewOverallBudgetValue(): number {
    const recomputed =
      this.materialsCost +
      this.laborCost +
      this.generalConditionsSiteServices +
      this.permitsAdminFees +
      this.insuranceBonds +
      this.taxesAllowance;
    if (recomputed > 0) return recomputed;

    const summary: any = this.scopeCostSummary || null;
    const reportGrandTotal = Number(summary?.reportGrandTotalBidPrice || 0);
    if (reportGrandTotal > 0) return reportGrandTotal;

    const suggestedBid = Number(summary?.suggestedBid || 0);
    if (suggestedBid > 0) return suggestedBid;

    const marketBid = Number(summary?.suggestedMarketBid || 0);
    if (marketBid > 0) return marketBid;

    return this.totalProjectCost;
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

    const summaryOverhead = Number(summary?.overhead || 0);
    const summaryContingency = Number(summary?.contingency || 0);
    const summaryEscalation = Number(summary?.escalation || 0);
    const summaryTaxes = Number(summary?.taxes || 0);

    const computedReportBid = reportPreTax > 0 ? reportPreTax + Math.max(reportTaxes, 0) : 0;

    const preferredBid =
      reportBid > 0 ? reportBid : computedReportBid > 0 ? computedReportBid : this.suggestedBid;
    const bidFloor = this.totalProjectCost;
    const bidToClient = Math.max(preferredBid, bidFloor);

    const baseCosts = this.costToBuild > 0 ? this.costToBuild : reportBase;
    const overheadProfit = summaryOverhead > 0
      ? summaryOverhead
      : reportOverheadProfit > 0 && reportOverheadProfit <= Math.max(baseCosts, bidToClient) * 0.35
        ? reportOverheadProfit
        : this.overheadProfit;
    const contingency = summaryContingency > 0
      ? summaryContingency
      : reportContingency > 0 && reportContingency <= Math.max(baseCosts, bidToClient) * 0.2
        ? reportContingency
        : this.contingencyAllowance;
    const escalation = reportContingencyIncludesEscalation
      ? 0
      : summaryEscalation > 0
        ? summaryEscalation
        : reportEscalation > 0 && reportEscalation <= Math.max(baseCosts, bidToClient) * 0.15
          ? reportEscalation
          : this.escalationAllowance;

    const taxesFromReportLooksReasonable =
      reportTaxes > 0 && this.materialsCost > 0
        ? (reportTaxes / this.materialsCost) * 100 <= 35
        : false;
    const taxes = summaryTaxes > 0
      ? summaryTaxes
      : taxesFromReportLooksReasonable
        ? reportTaxes
        : this.taxesAllowance;

    // Some scope-review payloads carry valid percentage drivers but zero absolute
    // markup amounts. Rebuild missing amounts from base costs so bid analysis
    // doesn't collapse to zeros.
    const overheadPctForFallback = this.overheadPct > 0 ? this.overheadPct : 10;
    const contingencyPctForFallback = this.contingencyPct > 0 ? this.contingencyPct : 5;
    const escalationRateForFallback =
      this.resolvedEscalationRate > 0 ? this.resolvedEscalationRate : 0.03;

    const fallbackOverheadFromRate =
      baseCosts > 0 ? baseCosts * (overheadPctForFallback / 100) : 0;
    const fallbackContingencyFromRate =
      baseCosts > 0 ? baseCosts * (contingencyPctForFallback / 100) : 0;
    const fallbackEscalationFromRate =
      baseCosts > 0 ? baseCosts * escalationRateForFallback : 0;

    const normalizedOverheadProfit =
      overheadProfit > 0 ? overheadProfit : fallbackOverheadFromRate;
    const normalizedContingency =
      contingency > 0 ? contingency : fallbackContingencyFromRate;
    const normalizedEscalation =
      escalation > 0 ? escalation : fallbackEscalationFromRate;

    return {
      bidToClient,
      baseCosts,
      overheadProfit: normalizedOverheadProfit,
      contingency: normalizedContingency,
      escalation: normalizedEscalation,
      taxes,
    };
  }

  private recommendedBidFromResolved(resolved: {
    bidToClient: number;
    baseCosts: number;
    overheadProfit: number;
    contingency: number;
    escalation: number;
    taxes: number;
  }): number {
    const totalCostBasis =
      resolved.baseCosts +
      resolved.overheadProfit +
      resolved.contingency +
      resolved.escalation +
      resolved.taxes;

    const requiredBidForProfit =
      totalCostBasis > 0 && this.minimumNetMarginRate > 0 && this.minimumNetMarginRate < 1
        ? totalCostBasis / (1 - this.minimumNetMarginRate)
        : totalCostBasis;

    return Math.max(resolved.bidToClient, requiredBidForProfit);
  }

  get clientBidPrice(): number {
    const resolved = this.resolveBidPricing();
    return this.recommendedBidFromResolved(resolved);
  }

  get bidNetProfitMarginPercent(): number {
    const resolved = this.resolveBidPricing();
    const recommendedBid = this.recommendedBidFromResolved(resolved);
    if (recommendedBid <= 0) return 0;

    const fullyLoadedCost =
      resolved.baseCosts +
      resolved.overheadProfit +
      resolved.contingency +
      resolved.escalation +
      resolved.taxes;
    const netProfit = recommendedBid - fullyLoadedCost;
    return (netProfit / recommendedBid) * 100;
  }

  get costToBuild(): number {
    const budgetBackedDirect = this.materialsCost + this.laborCost;
    if (this.budgetLineItems.length > 0) return budgetBackedDirect;

    const bomSubtotal = Number(this.scopeBomTotals?.directSubtotal || 0);
    if (bomSubtotal > 0) return bomSubtotal;

    const directSubtotal = Number(this.scopeCostSummary?.directSubtotal || 0);
    if (directSubtotal > 0) return directSubtotal;

    return this.materialsCost + this.laborCost;
  }

  get materialsCost(): number {
    const budgetValue = this.categoryTotalFromBudgetItems('materials');
    if (budgetValue > 0 || this.budgetLineItems.length > 0) return budgetValue;

    const bomValue = Number(this.scopeBomTotals?.materialCost || 0);
    if (bomValue > 0) return bomValue;

    const summaryValue = Number(this.scopeCostSummary?.materialCost || 0);
    if (summaryValue > 0) return summaryValue;

    return 0;
  }

  get laborCost(): number {
    const budgetValue = this.categoryTotalFromBudgetItems('subcontractor');
    if (budgetValue > 0 || this.budgetLineItems.length > 0) return budgetValue;

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
    return this.resolvedIndirectSoftCosts.generalConditions;
  }

  get permitsAdminFees(): number {
    return this.resolvedIndirectSoftCosts.permitsAdminFees;
  }

  get insuranceBonds(): number {
    return this.resolvedIndirectSoftCosts.insuranceBonds;
  }

  private get resolvedIndirectSoftCosts(): {
    generalConditions: number;
    permitsAdminFees: number;
    insuranceBonds: number;
  } {
    const generalConditions = Number(this.scopeCostSummary?.generalConditions || 0);
    let permitsAdminFees = Number(this.scopeCostSummary?.permitsAdminFees || 0);
    let insuranceBonds = Number(this.scopeCostSummary?.insuranceBonds || 0);

    // Keep card values consistent with dialog fallback: if only general conditions
    // was parsed, infer the missing indirect buckets.
    if (generalConditions > 0 && permitsAdminFees <= 0 && insuranceBonds <= 0) {
      const inferredGroupedIndirect = generalConditions / (1 - 0.0882 - 0.0259);
      permitsAdminFees = Math.round(inferredGroupedIndirect * 0.0882 * 100) / 100;
      insuranceBonds = Math.round(inferredGroupedIndirect * 0.0259 * 100) / 100;
    }

    // Pre-click parity fallback: when all indirect buckets are missing on initial
    // scope payload, infer them from total project cost composition.
    if (generalConditions <= 0 && permitsAdminFees <= 0 && insuranceBonds <= 0) {
      const material = Number(
        this.scopeBomTotals?.materialCost || this.scopeCostSummary?.materialCost || 0,
      );
      const labor = Number(
        this.scopeBomTotals?.laborCost || this.scopeCostSummary?.laborCost || 0,
      );
      const taxes = Number(this.scopeCostSummary?.taxes || 0);
      const suggestedBid = Number(this.scopeCostSummary?.suggestedBid || 0);
      const impliedIndirect = suggestedBid - taxes - material - labor;

      if (impliedIndirect > 0) {
        permitsAdminFees = Math.round(impliedIndirect * 0.0882 * 100) / 100;
        insuranceBonds = Math.round(impliedIndirect * 0.0259 * 100) / 100;
        const impliedGeneral =
          impliedIndirect - permitsAdminFees - insuranceBonds;
        return {
          generalConditions: Math.max(0, impliedGeneral),
          permitsAdminFees,
          insuranceBonds,
        };
      }
    }

    return { generalConditions, permitsAdminFees, insuranceBonds };
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
    if (this.isReasonableSalesTaxPct(fromSummary)) return fromSummary;

    const explicit = this.resolvedSalesTaxRate * 100;
    if (this.isReasonableSalesTaxPct(explicit)) return explicit;

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
    if (taxes > 0 && this.materialsCost > 0) {
      const derivedPct = (taxes / this.materialsCost) * 100;
      if (this.isReasonableSalesTaxPct(derivedPct)) {
        return taxes;
      }
      return this.materialsCost * this.resolvedSalesTaxRate;
    }
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

    // Stale-While-Revalidate: load cached team first.
    const storageKey = this.getTeamCacheKey(this.projectDetails.jobId);
    const cachedTeam = this.jobCache.get<JobUser[]>(storageKey);
    if (cachedTeam) {
      this.assignedTeamMembers = cachedTeam;
    }

    this.isLoadingTeam = true;
    this.jobAssignmentService.getJobAssignment().subscribe({
      next: (assignments) => {
        const jobId = Number(this.projectDetails.jobId);
        const assignment = assignments.find((a) => a.id === jobId);
        if (assignment && assignment.jobUser) {
          this.assignedTeamMembers = assignment.jobUser;
          this.jobCache.set(storageKey, this.assignedTeamMembers, {
            ttlMs: this.teamCacheTtlMs,
          });
        } else {
          this.assignedTeamMembers = [];
          this.jobCache.remove(storageKey);
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

    this.signalrService.analysisProgress
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update) => {
        const currentJobId = Number(this.projectDetails?.jobId);
        if (!Number.isFinite(currentJobId)) {
          return;
        }

        if (Number(update?.jobId) !== currentJobId) {
          return;
        }

        if (update?.isComplete || update?.hasFailed) {
          if (this.isAnalysisInactivityPaused) {
            this.authService.resumeInactivityTimer('job-analysis');
            this.isAnalysisInactivityPaused = false;
          }
        } else {
          if (!this.isAnalysisInactivityPaused && this.authService.isLoggedIn()) {
            this.authService.pauseInactivityTimer('job-analysis');
            this.isAnalysisInactivityPaused = true;
          }
        }

        if (!update?.isComplete || update?.hasFailed) {
          return;
        }

        if (!this.authService.isLoggedIn()) {
          return;
        }

        if (this.projectStage !== 'INITIATION') {
          return;
        }

        if (this.analysisAutoAdvanceTriggeredForJobIds.has(currentJobId)) {
          return;
        }

        this.analysisAutoAdvanceTriggeredForJobIds.add(currentJobId);
        void this.onAnalysisComplete();
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
        const currentJobId = Number(this.projectDetails?.jobId);
        if (Number.isFinite(currentJobId) && this.lastCurrencySeededJobId !== currentJobId) {
          // Seed from project/location context first so non-USD jobs render correctly
          // even before the cost summary parser hydrates.
          setDefaultCurrencySymbol(
            this.resolveCurrencySymbolFromProjectDetails(this.projectDetails),
          );
          this.lastCurrencySeededJobId = currentJobId;
        }
        const resolvedStatus =
          (this.projectDetails as any)?.status ?? (this.projectDetails as any)?.Status ?? '';
        const statusKey = String(resolvedStatus).trim().toUpperCase();

        if (!Number.isFinite(currentJobId)) {
          this.lastSyncedStageJobId = null;
          this.lastSyncedStageStatusKey = '';
        } else {
          const jobChanged = this.lastSyncedStageJobId !== currentJobId;
          const statusChanged = this.lastSyncedStageStatusKey !== statusKey;
          if (jobChanged || statusChanged) {
            this.lastSyncedStageJobId = currentJobId;
            this.lastSyncedStageStatusKey = statusKey;
            const raw = String(resolvedStatus || '').trim();
            const statusForStage = raw || (jobChanged ? 'ANALYZING' : '');
            if (statusForStage) {
              this.determineProjectStage(statusForStage);
            }
          }
        }

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
            this.fetchedDataKeys.clear();
            this.prefetchedPhaseKeys.clear();
            this.primeDataForCurrentView();
            this.prefetchLikelyNextData();

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

  private getTeamCacheKey(jobId: string | number): string {
    const userId =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('userId') || 'anonymous'
        : 'anonymous';
    return `team_${jobId}_${userId}`;
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

    this.jobCache.set(this.getUiStateCacheKey(jobId), payload, {
      ttlMs: this.uiStateCacheTtlMs,
    });
  }

  private loadScopeInsightData(jobId: string): void {
    const numericJobId = Number(jobId);
    if (!Number.isFinite(numericJobId) || numericJobId <= 0) {
      this.scopeCostSummary = null;
      this.scopeBomTotals = null;
      this.scopePermitLeadTimeWeeks = null;
      this.scopeMaterialLeadTimeWeeks = null;
      this.cdr.detectChanges();
      return;
    }

    void this.refreshFinancialSnapshot(numericJobId, 0).catch(() => {
      this.scopeCostSummary = null;
      this.scopeBomTotals = null;
      this.scopePermitLeadTimeWeeks = null;
      this.scopeMaterialLeadTimeWeeks = null;
      this.cdr.detectChanges();
    });
  }

  private stageToStatusKey(stage: ProjectPhase): string {
    const map: Record<ProjectPhase, string> = {
      INITIATION: 'INITIATION',
      PRELIMINARY_SCOPE: 'PRELIMINARY_SCOPE',
      DETAILED_TAKEOFF: 'DETAILED_TAKEOFF',
      CONTRACT_AWARD: 'CONTRACT_AWARD',
      PRE_CONSTRUCTION: 'PRE_CONSTRUCTION',
      BID_SOLICITATION: 'BID_SOLICITATION',
      TRADE_AWARD: 'TRADE_AWARD',
      MOBILIZATION: 'MOBILIZATION',
      CONSTRUCTION_LIVE: 'CONSTRUCTION_LIVE',
      CLOSEOUT: 'CLOSEOUT',
    };
    return map[stage];
  }

  private resolveCurrencySymbolFromProjectDetails(details: any): string {
    const parts = [
      details?.currency,
      details?.currencyCode,
      details?.CurrencyCode,
      details?.country,
      details?.Country,
      details?.countryCode,
      details?.CountryCode,
      details?.address,
      details?.Address,
      details?.formattedAddress,
      details?.FormattedAddress,
      details?.city,
      details?.City,
      details?.state,
      details?.State,
    ]
      .filter((value) => value != null && String(value).trim().length > 0)
      .map((value) => String(value).trim())
      .join(' | ')
      .toLowerCase();

    if (!parts) return '$';

    if (/\bzar\b|\brand\b/.test(parts)) return 'R';
    if (/\bbwp\b|\bpula\b/.test(parts)) return 'P';
    if (/\busd\b|\bdollar\b/.test(parts)) return '$';
    if (/\beur\b|\beuro\b/.test(parts)) return '€';
    if (/\bgbp\b|\bpound\b/.test(parts)) return '£';

    if (
      /\bsouth africa\b|\bjohannesburg\b|\bsandton\b|\bpretoria\b|\bcape town\b|\bdurban\b/.test(
        parts,
      )
    ) {
      return 'R';
    }
    if (/\bbotswana\b|\bgaborone\b/.test(parts)) {
      return 'P';
    }
    if (/\bunited kingdom\b|\buk\b|\bengland\b|\blondon\b/.test(parts)) {
      return '£';
    }
    if (
      /\beurozone\b|\bgermany\b|\bfrance\b|\bspain\b|\bitaly\b|\bnetherlands\b|\bportugal\b|\bbelgium\b|\baustria\b/.test(
        parts,
      )
    ) {
      return '€';
    }

    return '$';
  }

  private nextProjectPhase(current: ProjectPhase): ProjectPhase | null {
    const order: ProjectPhase[] = [
      'INITIATION',
      'PRELIMINARY_SCOPE',
      'DETAILED_TAKEOFF',
      'CONTRACT_AWARD',
      'PRE_CONSTRUCTION',
      'BID_SOLICITATION',
      'TRADE_AWARD',
      'MOBILIZATION',
      'CONSTRUCTION_LIVE',
      'CLOSEOUT',
    ];
    const idx = order.indexOf(current);
    if (idx < 0 || idx >= order.length - 1) {
      return null;
    }
    return order[idx + 1];
  }

  private markFetched(jobId: number, key: string): void {
    this.fetchedDataKeys.add(`${jobId}:${key}`);
  }

  private isFetched(jobId: number, key: string): boolean {
    return this.fetchedDataKeys.has(`${jobId}:${key}`);
  }

  private primeDataForCurrentView(): void {
    const jobId = Number(this.projectDetails?.jobId);
    if (!Number.isFinite(jobId)) {
      return;
    }

    const needsScope = this.projectStage !== 'INITIATION' || this.activeTab === 'overview' || this.activeTab === 'budget';
    if (needsScope && !this.isFetched(jobId, 'scope')) {
      this.markFetched(jobId, 'scope');
      this.loadScopeInsightData(String(jobId));
    }

    const needsBudget = this.activeTab === 'budget' || this.activeTab === 'overview';
    if (needsBudget && !this.isFetched(jobId, 'budget')) {
      this.markFetched(jobId, 'budget');
      this.loadBudgetLineItems(jobId);
    }
    if (needsBudget) {
      void this.refreshFinancialSnapshot(jobId);
    }

    if (this.activeTab === 'team' && !this.isFetched(jobId, 'team')) {
      this.markFetched(jobId, 'team');
      this.loadAssignedTeam();
    }

    if (this.activeTab === 'blueprints' && !this.isFetched(jobId, 'blueprints')) {
      this.markFetched(jobId, 'blueprints');
      this.loadBlueprints();
    }
  }

  private prefetchLikelyNextData(): void {
    const jobId = Number(this.projectDetails?.jobId);
    if (!Number.isFinite(jobId)) {
      return;
    }

    const nextStage = this.nextProjectPhase(this.projectStage);
    if (!nextStage) {
      return;
    }

    const nextStatusKey = this.stageToStatusKey(nextStage);
    const prefetchKey = `${jobId}:${nextStatusKey}`;
    if (this.prefetchedPhaseKeys.has(prefetchKey)) {
      return;
    }
    this.prefetchedPhaseKeys.add(prefetchKey);

    setTimeout(() => {
      this.prefetchPhaseData(nextStatusKey, String(jobId));
    }, this.phasePrefetchDelayMs);
  }

  private loadBudgetLineItems(jobId: number): void {
    if (!Number.isFinite(Number(jobId)) || Number(jobId) <= 0) {
      this.budgetLineItems = [];
      return;
    }

    this.budgetService.getBudget(Number(jobId)).subscribe({
      next: (items) => {
        this.budgetLineItems = Array.isArray(items) ? items : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.budgetLineItems = [];
      },
    });
  }

  private async refreshFinancialSnapshot(
    jobId: number,
    minIntervalMs: number = 15000,
  ): Promise<void> {
    if (!Number.isFinite(Number(jobId)) || Number(jobId) <= 0) return;
    if (
      this.financialSnapshotRefreshInFlight &&
      this.lastFinancialSnapshotRefreshJobId === Number(jobId)
    ) {
      return;
    }

    const now = Date.now();
    const sameJobAsLastRefresh =
      this.lastFinancialSnapshotRefreshJobId === Number(jobId);
    if (
      sameJobAsLastRefresh &&
      minIntervalMs > 0 &&
      now - this.lastFinancialSnapshotRefreshAt < minIntervalMs
    ) {
      return;
    }

    this.financialSnapshotRefreshInFlight = true;
    this.lastFinancialSnapshotRefreshJobId = Number(jobId);
    try {
      const [budgetResult, summaryResult, bomResult, permitWeeksResult, materialWeeksResult] =
        await Promise.allSettled([
        firstValueFrom(this.budgetService.getBudget(Number(jobId), true)),
        this.reportService.getDetailedCostSummary(String(jobId)),
        firstValueFrom(this.bomService.getBillOfMaterials(String(jobId), true)),
        this.reportService.getPermittingLeadTimeWeeks(String(jobId)),
        this.reportService.getMaxProcurementLeadTimeWeeks(String(jobId)),
      ]);

      if (budgetResult.status === 'fulfilled') {
        this.budgetLineItems = Array.isArray(budgetResult.value)
          ? budgetResult.value
          : [];
      }

      if (summaryResult.status === 'fulfilled' && summaryResult.value) {
        this.scopeCostSummary = summaryResult.value;
      }
      if (bomResult.status === 'fulfilled') {
        this.scopeBomTotals = this.extractScopeBomTotals(bomResult.value);
      }
      if (permitWeeksResult.status === 'fulfilled') {
        this.scopePermitLeadTimeWeeks = Number.isFinite(Number(permitWeeksResult.value))
          ? Number(permitWeeksResult.value)
          : null;
      }
      if (materialWeeksResult.status === 'fulfilled') {
        this.scopeMaterialLeadTimeWeeks = Number.isFinite(Number(materialWeeksResult.value))
          ? Number(materialWeeksResult.value)
          : null;
      }

      const summary = (this.scopeCostSummary || {}) as any;
      const generalConditionsCurrent = Number(summary?.generalConditions || 0);
      const permitsAdminFeesCurrent = Number(summary?.permitsAdminFees || 0);
      const insuranceBondsCurrent = Number(summary?.insuranceBonds || 0);
      const missingAnyIndirect =
        generalConditionsCurrent <= 0 ||
        permitsAdminFeesCurrent <= 0 ||
        insuranceBondsCurrent <= 0;

      if (missingAnyIndirect && bomResult.status === 'fulfilled') {
        const extracted = this.extractIndirectSoftCostsFromBomResults(
          bomResult.value,
        );
        if (extracted) {
          this.scopeCostSummary = {
            ...summary,
            generalConditions:
              generalConditionsCurrent > 0
                ? generalConditionsCurrent
                : extracted.generalConditions,
            permitsAdminFees:
              permitsAdminFeesCurrent > 0
                ? permitsAdminFeesCurrent
                : extracted.permitsAdminFees,
            insuranceBonds:
              insuranceBondsCurrent > 0
                ? insuranceBondsCurrent
                : extracted.insuranceBonds,
          };
        }
      }

      this.lastFinancialSnapshotRefreshAt = Date.now();
      this.cdr.detectChanges();
    } finally {
      this.financialSnapshotRefreshInFlight = false;
    }
  }

  private categoryTotalFromBudgetItems(category: 'materials' | 'subcontractor'): number {
    if (!Array.isArray(this.budgetLineItems) || this.budgetLineItems.length === 0) {
      return 0;
    }

    const toIsoTime = (item: any): number => {
      const updated = Date.parse(String(item?.updatedAt || ''));
      if (Number.isFinite(updated)) return updated;
      const created = Date.parse(String(item?.createdAt || ''));
      if (Number.isFinite(created)) return created;
      return 0;
    };

    const normalizeItemBase = (itemName: string): string =>
      String(itemName || '')
        .split(' - ')[0]
        .trim()
        .toLowerCase();

    const categoryFamily = (rawCategory: string): 'materials' | 'subcontractor' | 'other' => {
      const normalized = String(rawCategory || '').trim().toLowerCase();
      if (normalized === 'materials' || normalized === 'material') return 'materials';
      if (
        normalized === 'subcontractor' ||
        normalized === 'subcontractors' ||
        normalized === 'labor'
      ) {
        return 'subcontractor';
      }
      return 'other';
    };

    const lineCost = (item: any): number => {
      const actual = Number(item?.actualCost || 0);
      if (actual > 0) return actual;

      const qty = Number(item?.quantity || 0);
      const unit = Number(item?.unitCost || 0);
      if (qty > 0 && unit > 0) return qty * unit;

      return Number(item?.estimatedCost || 0);
    };

    const sorted = [...this.budgetLineItems].sort((a: any, b: any) => {
      const timeDelta = toIsoTime(b) - toIsoTime(a);
      if (timeDelta !== 0) return timeDelta;
      return Number(b?.id || 0) - Number(a?.id || 0);
    });

    const keptByKey = new Map<string, any>();

    const canonicalKey = (item: any, family: 'materials' | 'subcontractor'): string => {
      const phase = String(item?.phase || '').trim().toLowerCase();
      const trade = String(item?.trade || '').trim().toLowerCase();
      const itemBase = normalizeItemBase(item?.item || '');
      const unit = String(item?.unit || '').trim().toLowerCase();
      return `${family}|${phase}|${trade}|${itemBase}|${unit}`;
    };

    sorted.forEach((item: any) => {
      const family = categoryFamily(String(item?.category || ''));
      if (family !== category) return;

      // Deduplicate across AI/BOM/manual variants of the same logical line.
      // We intentionally do NOT use source/sourceId for the primary key so that
      // "original AI row" and "edited BOM row" collapse into one effective value.
      const dedupeKey = canonicalKey(item, family);

      if (!keptByKey.has(dedupeKey)) {
        keptByKey.set(dedupeKey, item);
      }
    });

    return Array.from(keptByKey.values()).reduce(
      (sum, item) => sum + lineCost(item),
      0,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractIndirectSoftCostsFromBomResults(bomResults: any): {
    generalConditions: number;
    permitsAdminFees: number;
    insuranceBonds: number;
  } | null {
    const list = Array.isArray(bomResults) ? bomResults : [];
    if (!list.length) return null;

    const ranked = [...list]
      .filter((r) => typeof r?.fullResponse === 'string' && r.fullResponse.trim().length > 0)
      .sort((a: any, b: any) => {
        const hasPhase30A = /###\s*Phase\s*30\s*:/i.test(String(a?.fullResponse || '')) ? 1 : 0;
        const hasPhase30B = /###\s*Phase\s*30\s*:/i.test(String(b?.fullResponse || '')) ? 1 : 0;
        if (hasPhase30A !== hasPhase30B) return hasPhase30B - hasPhase30A;
        return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
      });

    const fullResponse = String(ranked[0]?.fullResponse || '');
    if (!fullResponse) return null;

    const parseAmount = (value: any): number => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const raw = String(value ?? '').trim();
      if (!raw) return 0;
      const cleaned = raw.replace(/[^0-9.-]/g, '');
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const fenceRegex = /```json\s*([\s\S]*?)\s*```/gi;
    let match: RegExpExecArray | null;
    while ((match = fenceRegex.exec(fullResponse)) !== null) {
      const raw = String(match[1] || '').trim();
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;

        let generalConditions = 0;
        let permitsAdminFees = 0;
        let insuranceBonds = 0;

        parsed.forEach((row: any) => {
          const phaseItem = String(
            row?.Phase_Item || row?.Category || row?.Item || '',
          ).toLowerCase();
          const amount = parseAmount(row?.Amount ?? row?.Total ?? row?.Cost);
          if (!phaseItem || amount <= 0) return;

          const isGeneral =
            phaseItem.includes('general') && phaseItem.includes('condition');
          const isPermits =
            phaseItem.includes('permit') || phaseItem.includes('admin');
          const isInsurance =
            phaseItem.includes('insurance') || phaseItem.includes('bond');

          if (isGeneral) {
            generalConditions += amount;
            return;
          }

          // Handle combined labels such as "Permits/Admin Fees & Insurance/Bonds".
          if (isPermits && isInsurance) {
            permitsAdminFees += amount / 2;
            insuranceBonds += amount / 2;
            return;
          }

          if (isPermits) {
            permitsAdminFees += amount;
            return;
          }
          if (isInsurance) {
            insuranceBonds += amount;
          }
        });

        if (generalConditions > 0 || permitsAdminFees > 0 || insuranceBonds > 0) {
          return { generalConditions, permitsAdminFees, insuranceBonds };
        }
      } catch {
        // keep trying next block
      }
    }

    return null;
  }

  private fingerprintScopeCostSummary(summary: any): string {
    if (!summary) return '';
    const pick = {
      materialCost: Number(summary?.materialCost || 0),
      laborCost: Number(summary?.laborCost || 0),
      directSubtotal: Number(summary?.directSubtotal || 0),
      generalConditions: Number(summary?.generalConditions || 0),
      permitsAdminFees: Number(summary?.permitsAdminFees || 0),
      insuranceBonds: Number(summary?.insuranceBonds || 0),
      overhead: Number(summary?.overhead || 0),
      contingency: Number(summary?.contingency || 0),
      escalation: Number(summary?.escalation || 0),
      taxes: Number(summary?.taxes || 0),
      suggestedBid: Number(summary?.suggestedBid || 0),
      suggestedMarketBid: Number(summary?.suggestedMarketBid || 0),
      reportGrandTotalBidPrice: Number(summary?.reportGrandTotalBidPrice || 0),
      reportPreTaxProjectCost: Number(summary?.reportPreTaxProjectCost || 0),
    };
    return JSON.stringify(pick);
  }

  private fingerprintScopeBomTotals(
    totals: { materialCost: number; laborCost: number; directSubtotal: number } | null,
  ): string {
    if (!totals) return '';
    return JSON.stringify({
      materialCost: Number(totals.materialCost || 0),
      laborCost: Number(totals.laborCost || 0),
      directSubtotal: Number(totals.directSubtotal || 0),
    });
  }

  private async refreshScopeInsightDataWithRetries(jobId: number): Promise<void> {
    const jobIdStr = String(jobId);
    const beforeSummary = this.fingerprintScopeCostSummary(this.scopeCostSummary);
    const beforeBom = this.fingerprintScopeBomTotals(this.scopeBomTotals);

    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const [summary, bomResults, permitWeeks, materialWeeks] = await Promise.all([
          this.reportService.getDetailedCostSummary(jobIdStr),
          firstValueFrom(this.bomService.getBillOfMaterials(jobIdStr)),
          this.reportService.getPermittingLeadTimeWeeks(jobIdStr),
          this.reportService.getMaxProcurementLeadTimeWeeks(jobIdStr),
        ]);

        const bomTotals = this.extractScopeBomTotals(bomResults);
        const afterSummary = this.fingerprintScopeCostSummary(summary);
        const afterBom = this.fingerprintScopeBomTotals(bomTotals);

        this.scopeCostSummary = summary || null;
        const currencySymbol = (summary as any)?.currencySymbol;
        if (currencySymbol) {
          setDefaultCurrencySymbol(String(currencySymbol));
        }
        this.scopeBomTotals = bomTotals;
        this.scopePermitLeadTimeWeeks = Number.isFinite(Number(permitWeeks))
          ? Number(permitWeeks)
          : null;
        this.scopeMaterialLeadTimeWeeks = Number.isFinite(Number(materialWeeks))
          ? Number(materialWeeks)
          : null;
        this.cdr.detectChanges();

        // If the backend had not yet persisted the new results, we often get the same
        // cost summary payload again. Keep polling briefly until it changes.
        const changed =
          (afterSummary && afterSummary !== beforeSummary) ||
          (afterBom && afterBom !== beforeBom);

        if (changed) {
          return;
        }
      } catch {
        // ignore; retry
      }

      await this.sleep(900 + attempt * 250);
    }
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
    if (this.isAnalysisInactivityPaused) {
      this.authService.resumeInactivityTimer('job-analysis');
      this.isAnalysisInactivityPaused = false;
    }
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

  async openOverallBudgetDialog(): Promise<void> {
    const buildDialogData = (): OverallBudgetDialogData => {
      const resolvedGeneralConditions = this.generalConditionsSiteServices;
      let resolvedPermitsAdminFees = this.permitsAdminFees;
      let resolvedInsuranceBonds = this.insuranceBonds;

      if (
        resolvedGeneralConditions > 0 &&
        resolvedPermitsAdminFees <= 0 &&
        resolvedInsuranceBonds <= 0
      ) {
        const inferredGroupedIndirect =
          resolvedGeneralConditions / (1 - 0.0882 - 0.0259);
        resolvedPermitsAdminFees =
          Math.round(inferredGroupedIndirect * 0.0882 * 100) / 100;
        resolvedInsuranceBonds =
          Math.round(inferredGroupedIndirect * 0.0259 * 100) / 100;
      }

      const directAndInsurableSubtotalResolved =
        this.materialsCost +
        this.laborCost +
        resolvedGeneralConditions +
        resolvedPermitsAdminFees +
        resolvedInsuranceBonds;

      const directCostBase = this.materialsCost + this.laborCost;
      const materialRatio =
        directCostBase > 0 ? (this.materialsCost / directCostBase) * 100 : 0;
      const laborRatio =
        directCostBase > 0 ? (this.laborCost / directCostBase) * 100 : 0;

      return {
        materialsCost: this.materialsCost,
        laborCost: this.laborCost,
        costToBuild: this.costToBuild,
        generalConditionsSiteServices: resolvedGeneralConditions,
        permitsAdminFees: resolvedPermitsAdminFees,
        insuranceBonds: resolvedInsuranceBonds,
        directAndInsurableSubtotal: directAndInsurableSubtotalResolved,
        taxesAllowance: this.taxesAllowance,
        salesTaxPct: this.salesTaxPct,
        totalProjectCost: this.totalProjectCost,
        costPerSqFt: this.costPerSqFt,
        materialRatio,
        laborRatio,
      };
    };

    const dialogRef = this.dialog.open(OverallBudgetDialogComponent, {
      data: buildDialogData(),
      width: '100%',
      maxWidth: '460px',
      maxHeight: '85vh',
      autoFocus: true,
      panelClass: 'scope-insight-panel',
    });

    const jobId = String(this.projectDetails?.jobId || '');
    if (!jobId) return;

    const [budgetResult, summaryResult, bomResult] = await Promise.allSettled([
      firstValueFrom(this.budgetService.getBudget(Number(jobId), true)),
      this.reportService.getDetailedCostSummary(jobId),
      firstValueFrom(this.bomService.getBillOfMaterials(jobId, true)),
    ]);

    if (budgetResult.status === 'fulfilled') {
      this.budgetLineItems = Array.isArray(budgetResult.value)
        ? budgetResult.value
        : [];
    }

    if (summaryResult.status === 'fulfilled' && summaryResult.value) {
      this.scopeCostSummary = summaryResult.value;
    }

    const summary = (this.scopeCostSummary || {}) as any;
    const generalConditionsCurrent = Number(summary?.generalConditions || 0);
    const permitsAdminFeesCurrent = Number(summary?.permitsAdminFees || 0);
    const insuranceBondsCurrent = Number(summary?.insuranceBonds || 0);
    const missingAnyIndirect =
      generalConditionsCurrent <= 0 ||
      permitsAdminFeesCurrent <= 0 ||
      insuranceBondsCurrent <= 0;

    if (missingAnyIndirect && bomResult.status === 'fulfilled') {
      const extracted = this.extractIndirectSoftCostsFromBomResults(
        bomResult.value,
      );
      if (extracted) {
        this.scopeCostSummary = {
          ...summary,
          generalConditions:
            generalConditionsCurrent > 0
              ? generalConditionsCurrent
              : extracted.generalConditions,
          permitsAdminFees:
            permitsAdminFeesCurrent > 0
              ? permitsAdminFeesCurrent
              : extracted.permitsAdminFees,
          insuranceBonds:
            insuranceBondsCurrent > 0
              ? insuranceBondsCurrent
              : extracted.insuranceBonds,
        };
      }
    }

    this.cdr.detectChanges();

    if (dialogRef && dialogRef.componentInstance) {
      dialogRef.componentInstance.data = buildDialogData();
      this.cdr.detectChanges();
    }
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

    const bidBeforeMarginFloor = resolved.bidToClient;
    const costToBuild = resolved.baseCosts;
    const overheadProfit = resolved.overheadProfit;
    const contingencyAllowance = resolved.contingency;
    const escalationAllowance = resolved.escalation;
    const taxesAllowance = resolved.taxes;
    const recommendedBid = this.recommendedBidFromResolved(resolved);
    const totalCostBasis =
      costToBuild + overheadProfit + contingencyAllowance + escalationAllowance + taxesAllowance;

    // Keep all profitability metrics on a single coherent basis so every card
    // moves together when direct cost inputs change.
    const grossMargin = recommendedBid - costToBuild;
    const grossMarginPercent = recommendedBid > 0 ? (grossMargin / recommendedBid) * 100 : 0;
    const markupOnCostPercent = costToBuild > 0 ? ((recommendedBid / costToBuild) - 1) * 100 : 0;

    const riskExposure =
      recommendedBid - (costToBuild + overheadProfit + escalationAllowance + taxesAllowance);
    const netContractorProfit = recommendedBid - totalCostBasis;
    const netProfitMarginPercent = recommendedBid > 0 ? (netContractorProfit / recommendedBid) * 100 : 0;
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
      this.primeDataForCurrentView();
      this.prefetchLikelyNextData();
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

  async onAnalysisComplete() {
    const jobId = Number(this.projectDetails?.jobId);
    if (!Number.isFinite(jobId)) {
      this.snackBar.open('Cannot proceed: Job ID not available yet.', 'Close', {
        duration: 3000,
      });
      return;
    }

    // Invalidate report cache for this job so the next summary read reflects
    // the newest BOM/analysis record from this run.
    this.reportService.invalidateBomResultsCache(String(jobId));

    // Refresh persisted analysis outputs before advancing stage.
    // This prevents stale values that only correct after a full page reload.
    await this.refreshScopeInsightDataWithRetries(jobId);

    await this.importAiBudgetItemsIfNeeded(jobId);
    this.loadBudgetLineItems(jobId);

    this.projectStage = 'PRELIMINARY_SCOPE';
    this.stageDisplayMode = 'stage';

    this.updateJobStatus('PRELIMINARY_SCOPE');
  }

  onJobGranted() {
      // Update status to BIDDING
      this.updateJobStatus('BIDDING');
  }

  onBackToPreliminary() {
      if (this.isPersistedConstructionLive()) {
        this.snackBar.open(
          'This project is live in construction. Earlier phases cannot be reopened.',
          'Close',
          { duration: 5000 },
        );
        return;
      }
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

  private getPersistedJobStatus(): string {
    return String(this.projectDetails?.status ?? this.projectDetails?.Status ?? '').toUpperCase();
  }

  private isPersistedConstructionLive(): boolean {
    const s = this.getPersistedJobStatus().replace(/-/g, '_');
    return s === 'LIVE' || s === 'ACTIVE' || s === 'CONSTRUCTION_LIVE';
  }

  private statusToPhaseRank(status: string): number | null {
    if (!status) return null;
    const s = status.toUpperCase().replace(/-/g, '_');
    const ranks: Record<string, number> = {
      ANALYZING: 0,
      INITIATION: 0,
      NEW: 1,
      DRAFT: 1,
      PRELIMINARY: 1,
      PRELIMINARY_SCOPE: 1,
      DETAILED_TAKEOFF: 2,
      CONTRACT_AWARD: 3,
      PRE_CONSTRUCTION: 4,
      BIDDING: 5,
      INBOUND_BIDDING: 5,
      BID_SOLICITATION: 5,
      TRADE_AWARD: 6,
      MOBILIZATION: 7,
      LIVE: 8,
      ACTIVE: 8,
      CONSTRUCTION_LIVE: 8,
      CLOSEOUT: 9,
      CLOSURE: 9,
      ARCHIVED: 9,
      COMPLETED: 9,
    };
    return ranks[s] ?? null;
  }

  private isRetrogradeFromConstructionLive(targetStatus: string): boolean {
    const rank = this.statusToPhaseRank(targetStatus);
    if (rank === null) return false;
    return rank < this.constructionLivePhaseRank;
  }

  /**
   * After PATCH, GET /job can briefly return an older Status than we just saved.
   * Merging that into the store makes `determineProjectStage` run again and jumps
   * the UI backward (e.g. LIVE → Mobilization). Keep the optimistic status when
   * it is strictly ahead of the payload we received.
   */
  private mergeJobDetailsTrustingForwardStatus(
    optimisticStatus: string,
    jobDetails: Record<string, unknown> | null | undefined,
  ): void {
    let merged: Record<string, unknown> = {
      ...(this.projectDetails || {}),
      ...(jobDetails || {}),
    };
    const optimisticRank = this.statusToPhaseRank(optimisticStatus);
    const serverRank = this.statusToPhaseRank(
      String(merged['status'] ?? merged['Status'] ?? ''),
    );
    if (
      optimisticRank !== null &&
      serverRank !== null &&
      optimisticRank > serverRank
    ) {
      merged = {
        ...merged,
        status: optimisticStatus,
        Status: optimisticStatus,
      };
    }
    this.projectDetails = merged;
    const finalStatus = String(merged['status'] ?? merged['Status'] ?? '');
    this.syncStageTrackingFromStoreStatus(finalStatus);
    this.store.setState({ projectDetails: this.projectDetails } as any);
  }

  private syncStageTrackingFromStoreStatus(status: string): void {
    const jobId = Number(this.projectDetails?.jobId);
    if (!Number.isFinite(jobId)) {
      return;
    }
    this.lastSyncedStageJobId = jobId;
    this.lastSyncedStageStatusKey = String(status || '').trim().toUpperCase();
  }

  private updateJobStatus(status: string) {
    if (!this.projectDetails?.jobId) return;

    if (this.isPersistedConstructionLive() && this.isRetrogradeFromConstructionLive(status)) {
      this.snackBar.open(
        'This project is live in construction. Earlier phases cannot be reopened.',
        'Close',
        { duration: 5000 },
      );
      return;
    }

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
          this.syncStageTrackingFromStoreStatus(status);
          this.store.setState({ projectDetails: this.projectDetails } as any);
          this.determineProjectStage(status);
          this.prefetchPhaseData(status, String(jobId));

          this.jobsService.getSpecificJob(jobId).subscribe({
            next: (jobDetails) => {
              this.mergeJobDetailsTrustingForwardStatus(status, jobDetails);
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
