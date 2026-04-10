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
  distinctUntilChanged,
  catchError,
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
  private analysisCompletionInFlight = false;
  private analysisCompletionInFlightStartedAtMs: number | null = null;

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
      const isSummaryOnlyAiLine = (item: any): boolean => {
        const itemName = String(item?.item || '').trim().toLowerCase();
        const phase = String(item?.phase || '').trim().toLowerCase();
        const notes = String(item?.notes || '').trim().toLowerCase();
        const source = String(item?.source || '').trim().toLowerCase();
        const isAiImported = source === 'ai' || notes.includes('imported from ai analysis');

        if (!isAiImported) return false;

        const explicitSummaryLabels = [
          'suggested market bid price',
          'calculated gc bid price',
          'calculated cost per conditioned area',
          'cost range',
          'project address',
        ];

        if (explicitSummaryLabels.some((token) => itemName.includes(token))) {
          return true;
        }

        return phase.includes('cost breakdown') || phase.includes('project closeout');
      };

      const existing = await firstValueFrom(this.budgetService.getBudget(jobId, true));
      const hasMeaningfulAiItems = (existing || []).some(
        (item) =>
          String((item as any)?.source || '').trim().toLowerCase() === 'ai' &&
          !isSummaryOnlyAiLine(item),
      );
      if (hasMeaningfulAiItems) {
        return;
      }

      let newItems: BudgetLineItem[] = [];
      const budgetImportMaxAttempts = 6;
      for (let attempt = 0; attempt < budgetImportMaxAttempts; attempt++) {
        const results = await firstValueFrom(
          this.bomService.getBillOfMaterials(String(jobId), true),
        );
        const normalized = Array.isArray(results)
          ? results
          : results
            ? [results]
            : [];

        let bestItems: BudgetLineItem[] = [];
        normalized.forEach((entry: any) => {
          const parsedReport = entry?.parsedReport;
          const items = this.buildAiBudgetItemsFromReport(parsedReport, jobId);
          if (items.length > bestItems.length) {
            bestItems = items;
          }
        });

        newItems = bestItems;

        if (newItems.length > 0) {
          break;
        }

        // Analysis output can lag briefly even when the stage has just advanced.
        if (attempt < budgetImportMaxAttempts - 1) {
          await this.sleep(Math.min(10_000, 1500 * Math.pow(2, attempt)));
        }
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
  /**
   * Deduplicate concurrent scope hydration for the same job. Every caller awaits
   * the same promise (unlike a guard that returned early and broke `await`).
   */
  private scopeHydrationPromises = new Map<number, Promise<void>>();
  private prefetchedPhaseKeys = new Set<string>();
  /**
   * Concurrent callers must await the same refresh; previously an in-flight guard
   * returned immediately and broke `await refreshFinancialSnapshot()` ordering.
   */
  private financialSnapshotPromises = new Map<number, Promise<void>>();
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
  scopeExecutiveSummaryData: any = null;
  scopeBomTotals: { materialCost: number; laborCost: number; directSubtotal: number } | null = null;
  scopePermitLeadTimeWeeks: number | null = null;
  scopeMaterialLeadTimeWeeks: number | null = null;
  // Hero cards should only render totals once the parent has finished its
  // scope/financial hydration passes (prevents 500K -> 700K intermediate jump).
  scopeTotalsReady = false;
  private scopeTotalsReadyTimer: any = null;
  private scopeTotalsReadySeq = 0;
  private suppressScopeTotalsReveal = false;
  private scopePerfByJob = new Map<
    number,
    {
      startedAt: number;
      firstValueAt?: number;
      stableAt?: number;
      reason: string;
      correlationId: string;
    }
  >();

  private newScopePerfCorrelationId(jobId: number): string {
    return `scope-${jobId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private startScopePerf(jobId: number, reason: string): void {
    if (!Number.isFinite(jobId) || jobId <= 0) return;
    const existing = this.scopePerfByJob.get(jobId);
    if (existing) return;
    const state = {
      startedAt: performance.now(),
      reason,
      correlationId: this.newScopePerfCorrelationId(jobId),
    };
    this.scopePerfByJob.set(jobId, state);
    console.info('[scope-perf] start', {
      jobId,
      reason,
      correlationId: state.correlationId,
    });
  }

  private markScopePerf(jobId: number, marker: 'first-value' | 'stable'): void {
    const state = this.scopePerfByJob.get(jobId);
    if (!state) return;
    const now = performance.now();
    if (marker === 'first-value' && state.firstValueAt == null) {
      state.firstValueAt = now;
      console.info('[scope-perf] first-value', {
        jobId,
        msFromStart: Math.round(now - state.startedAt),
        correlationId: state.correlationId,
      });
      return;
    }
    if (marker === 'stable' && state.stableAt == null) {
      state.stableAt = now;
      console.info('[scope-perf] stable', {
        jobId,
        msFromStart: Math.round(now - state.startedAt),
        correlationId: state.correlationId,
      });
    }
  }

  /**
   * Some refreshes can start while `projectStage` is still INITIATION, so the
   * normal `scopeTotalsReady` reveal never flips. When we switch into a phase
   * that renders hero totals, attempt to reveal immediately IF we already have
   * a "complete enough" cost summary (currency + indirect soft costs filled).
   */
  private tryRevealScopeTotalsFromExistingData(): void {
    if (this.suppressScopeTotalsReveal) return;

    const stage = this.projectStage;
    const relevantStage =
      stage === 'PRELIMINARY_SCOPE' || stage === 'DETAILED_TAKEOFF';
    if (!relevantStage) return;

    const currentJobId = Number(this.projectDetails?.jobId);
    if (!Number.isFinite(currentJobId)) return;

    // Guard against showing stale pre-refresh totals right after hard reload.
    // We only reveal when at least one financial snapshot for this exact job
    // has already been committed in this runtime.
    if (
      this.lastFinancialSnapshotRefreshJobId !== currentJobId ||
      this.lastFinancialSnapshotRefreshAt <= 0
    ) {
      return;
    }

    const summary = this.scopeCostSummary as any;
    if (!summary) return;

    // Phase hero cards use `scopeTotalProjectCost` (parent computed value).
    // Reveal using the exact same computed source so we don't get stuck
    // during INITIATION -> PRELIMINARY_SCOPE transitions.
    const budgetValue = this.scopeReviewOverallBudgetValue;
    if (!Number.isFinite(budgetValue) || budgetValue <= 0) return;

    this.scopeTotalsReady = true;
    this.markScopePerf(Number(this.projectDetails?.jobId), 'first-value');
    this.cdr.detectChanges();
  }
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
    const reportBase = Number(summary?.reportTotalDirectIndirectCosts || 0);
    if (reportBase > 0) {
      const reportTaxes = Number(summary?.reportVatAmount || summary?.taxes || 0);
      return reportBase + Math.max(0, reportTaxes);
    }

    const reportPreTax = Number(summary?.reportPreTaxProjectCost || 0);
    if (reportPreTax > 0) {
      const reportTaxes = Number(summary?.reportVatAmount || summary?.taxes || 0);
      return reportPreTax + Math.max(0, reportTaxes);
    }

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
    hasAuthoritativeReportBid: boolean;
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

    const hasAuthoritativeReportBid = reportBid > 0 || computedReportBid > 0;
    const preferredBid =
      reportBid > 0 ? reportBid : computedReportBid > 0 ? computedReportBid : this.suggestedBid;
    const bidFloor = this.totalProjectCost;
    const bidToClient = hasAuthoritativeReportBid
      ? preferredBid
      : Math.max(preferredBid, bidFloor);

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

    // Prefer explicit report tax values when present; also derive taxes from
    // grand-total minus pre-tax when a report omits the VAT row.
    const derivedReportTaxes =
      reportBid > 0 && reportPreTax > 0 ? Math.max(0, reportBid - reportPreTax) : 0;
    const effectiveReportTaxes = reportTaxes > 0 ? reportTaxes : derivedReportTaxes;
    const taxesFromReportLooksReasonable =
      effectiveReportTaxes > 0 &&
      (
        (reportPreTax > 0 && (effectiveReportTaxes / reportPreTax) * 100 <= 35) ||
        (this.materialsCost > 0 && (effectiveReportTaxes / this.materialsCost) * 100 <= 35)
      );
    const taxes = summaryTaxes > 0
      ? summaryTaxes
      : taxesFromReportLooksReasonable
        ? effectiveReportTaxes
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

    const useReportWhenTiny = (
      value: number,
      reportValue: number,
      base: number,
    ): number => {
      if (value > 0 && value < 1000 && base >= 100000 && reportValue > 0) {
        return reportValue;
      }
      return value;
    };

    const reconciledOverhead = useReportWhenTiny(
      normalizedOverheadProfit,
      reportOverheadProfit,
      baseCosts,
    );
    const reconciledContingency = useReportWhenTiny(
      normalizedContingency,
      reportContingency,
      baseCosts,
    );
    const reconciledEscalation = useReportWhenTiny(
      normalizedEscalation,
      reportEscalation,
      baseCosts,
    );

    return {
      bidToClient,
      baseCosts,
      overheadProfit: reconciledOverhead,
      contingency: reconciledContingency,
      escalation: reconciledEscalation,
      taxes,
      hasAuthoritativeReportBid,
    };
  }

  private recommendedBidFromResolved(resolved: {
    bidToClient: number;
    baseCosts: number;
    overheadProfit: number;
    contingency: number;
    escalation: number;
    taxes: number;
    hasAuthoritativeReportBid: boolean;
  }): number {
    if (resolved.hasAuthoritativeReportBid && resolved.bidToClient > 0) {
      return resolved.bidToClient;
    }

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

    const netContractorProfit =
      recommendedBid -
      (resolved.baseCosts + resolved.contingency + resolved.escalation + resolved.taxes);
    return (netContractorProfit / recommendedBid) * 100;
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
    const summaryTimeline = this.extractExecutiveSummaryTimeline();
    if (summaryTimeline?.weeks && summaryTimeline.weeks > 0) {
      return summaryTimeline.weeks;
    }

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
    const summaryTimeline = this.extractExecutiveSummaryTimeline();
    if (summaryTimeline?.workingDays && summaryTimeline.workingDays > 0) {
      return summaryTimeline.workingDays;
    }
    return this.totalDurationWeeksForDialog > 0 ? Math.round(this.totalDurationWeeksForDialog * 5) : 0;
  }

  get projectStartDate(): Date | null {
    // Prefer timeline-derived start when available; avoids placeholder DB dates.
    const timelineStarts = (this.timelineGroups || [])
      .flatMap((group) =>
        (group.subtasks || []).map((task) => {
          const raw = task.start || task.startDate || null;
          const d = raw ? new Date(raw) : null;
          return d && !isNaN(d.getTime()) && d.getFullYear() >= 2000 ? d : null;
        }),
      )
      .filter((d): d is Date => !!d);
    if (timelineStarts.length > 0) {
      return new Date(
        Math.min(...timelineStarts.map((d) => d.getTime())),
      );
    }

    const rawDate =
      this.projectDetails?.desiredStartDate ??
      this.projectDetails?.DesiredStartDate ??
      this.projectDetails?.date ??
      null;
    const d = rawDate ? new Date(rawDate) : null;
    if (!d || isNaN(d.getTime())) return null;
    // Ignore sentinel values like 0001-01-01.
    return d.getFullYear() >= 2000 ? d : null;
  }

  private extractExecutiveSummaryTimeline(): {
    workingDays: number;
    weeks: number;
    months: number;
  } | null {
    const summary =
      this.scopeExecutiveSummaryData ??
      this.projectDetails?.executiveSummary ??
      this.projectDetails?.scopeExecutiveSummary ??
      this.projectDetails?.preliminaryScope?.executiveSummary ??
      null;
    const keyHighlights = Array.isArray(summary?.keyHighlights) ? summary.keyHighlights : [];
    const durationHighlight = keyHighlights.find((item: any) => {
      const label = String(item?.label || '')
        .toLowerCase()
        .replace(/[*_`]/g, '')
        .replace(/[^a-z0-9]+/g, '')
        .trim();
      return (
        label.includes('projectduration') ||
        label.includes('projectedtimeline') ||
        label.includes('projecttimeline')
      );
    });
    const timelineHighlightText = keyHighlights
      .map((item: any) => ({
        label: String(item?.label || '')
          .toLowerCase()
          .replace(/[*_`]/g, '')
          .replace(/[^a-z0-9]+/g, '')
          .trim(),
        text: `${String(item?.value || '')} ${String(item?.note || '')}`.trim(),
      }))
      .filter(
        (item: any) =>
          item.label.includes('projectduration') ||
          item.label.includes('projectedtimeline') ||
          item.label.includes('projecttimeline') ||
          /working\s*days?|months?|weeks?/i.test(item.text),
      )
      .map((item: any) => item.text)
      .join(' ');
    const combinedText = [
      `${String(durationHighlight?.value || '')} ${String(durationHighlight?.note || '')}`.trim(),
      timelineHighlightText,
      String(summary?.overview || ''),
    ]
      .filter(Boolean)
      .join(' ');
    if (!combinedText) return null;

    const workingDaysMatch = combinedText.match(/\b(\d+(?:\.\d+)?)\s*working\s*days?\b/i);
    const weeksMatch = combinedText.match(/\b(\d+(?:\.\d+)?)\s*weeks?\b/i);
    const monthsMatch = combinedText.match(/\b(\d+(?:\.\d+)?)\s*months?\b/i);

    const workingDays = Number(workingDaysMatch?.[1] || 0);
    const weeks = Number(weeksMatch?.[1] || 0);
    const months = Number(monthsMatch?.[1] || 0);
    if (workingDays <= 0 && weeks <= 0 && months <= 0) return null;

    const resolvedWeeks =
      workingDays > 0 ? workingDays / 5 : months > 0 ? months * 4.33 : weeks > 0 ? weeks : 0;
    const resolvedWorkingDays =
      workingDays > 0
        ? workingDays
        : resolvedWeeks > 0
          ? resolvedWeeks * 5
          : months > 0
            ? months * 21.65
            : 0;
    const resolvedMonths =
      months > 0
        ? months
        : resolvedWeeks > 0
          ? resolvedWeeks / 4.33
          : resolvedWorkingDays > 0
            ? resolvedWorkingDays / 21.65
            : 0;

    return {
      workingDays: Math.round(resolvedWorkingDays),
      weeks: Math.round(resolvedWeeks * 10) / 10,
      months: Math.round(resolvedMonths * 10) / 10,
    };
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

    this.projectService.projects$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((projects) => {
        this.overviewProjects = projects;
        this.calculateProjectCounts();
      });
    this.projectService.loadProjects();

    this.sessionId = uuidv4();
    this.measurementService
      .getSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((settings) => {
        this.temperatureUnit = settings.temperature;
      });
    this.signalrService.startConnection();
    this.signalrService.progress
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((progress) => {
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

        if (update?.hasFailed) {
          if (this.isAnalysisInactivityPaused) {
            this.authService.resumeInactivityTimer('job-analysis');
            this.isAnalysisInactivityPaused = false;
          }
        } else if (update?.isComplete) {
          this.authService.extendAnalysisProtectionGrace(
            'job-analysis-complete-signalr',
          );
        } else {
          this.authService.extendAnalysisProtectionGrace('job-analysis-in-progress');
          if (!this.isAnalysisInactivityPaused && this.authService.isLoggedIn()) {
            this.authService.pauseInactivityTimer('job-analysis');
            this.isAnalysisInactivityPaused = true;
          }
        }

        if (!update?.isComplete || update?.hasFailed) {
          return;
        }
      });
    this.signalrService.uploadComplete
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isUploading = false;
        this.resetFileInput();
      });

    this.route.queryParams
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((params) => ({
          params,
          requestedJobId: Number(params?.['jobId']),
        })),
        distinctUntilChanged(
          (a, b) => a.requestedJobId === b.requestedJobId,
        ),
        switchMap((params) => {
          const requestedJobId = params.requestedJobId;
          this.isStageResolved = false;

          return this.jobDataService.fetchJobData(params.params).pipe(
            catchError((err) => {
              console.error('[jobs] fetchJobData failed', err);
              return of(null);
            }),
            switchMap(() =>
              this.store.select((state) => state.projectDetails).pipe(
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
              ),
            ),
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

        if (
          statusKey === 'ANALYZING' &&
          !this.isAnalysisInactivityPaused &&
          this.authService.isLoggedIn()
        ) {
          this.authService.pauseInactivityTimer('job-analysis');
          this.isAnalysisInactivityPaused = true;
        }

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
        takeUntilDestroyed(this.destroyRef),
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
      this.scopeExecutiveSummaryData = null;
      this.scopeBomTotals = null;
      this.scopePermitLeadTimeWeeks = null;
      this.scopeMaterialLeadTimeWeeks = null;
      this.scopeTotalsReady = false;
      if (this.scopeTotalsReadyTimer) {
        clearTimeout(this.scopeTotalsReadyTimer);
        this.scopeTotalsReadyTimer = null;
      }
      this.cdr.detectChanges();
      return;
    }

    this.scopeTotalsReady = false;
    this.startScopePerf(numericJobId, 'loadScopeInsightData');
    void this.hydrateScopeAndFinancialSnapshotWithRetries(numericJobId).catch(
      () => {
        this.scopeCostSummary = null;
        this.scopeExecutiveSummaryData = null;
        this.scopeBomTotals = null;
        this.scopePermitLeadTimeWeeks = null;
        this.scopeMaterialLeadTimeWeeks = null;
        this.scopeTotalsReady = false;
        if (this.scopeTotalsReadyTimer) {
          clearTimeout(this.scopeTotalsReadyTimer);
          this.scopeTotalsReadyTimer = null;
        }
        this.cdr.detectChanges();
      },
    );
  }

  /**
   * Reveal hero-card totals only after a minimum delay.
   * This intentionally trades a longer wait for stable values (prevents
   * intermediate reconciliation jumps like 500K -> 700K).
   */
  private scheduleScopeTotalsReady(stabilizeMs: number = 20000): void {
    this.scopeTotalsReady = false;
    this.scopeTotalsReadySeq += 1;
    const seq = this.scopeTotalsReadySeq;

    if (this.scopeTotalsReadyTimer) {
      clearTimeout(this.scopeTotalsReadyTimer);
    }

    this.scopeTotalsReadyTimer = setTimeout(() => {
      // Only set ready if nothing scheduled a newer reveal.
      if (this.scopeTotalsReadySeq !== seq) return;
      this.scopeTotalsReady = true;
      this.cdr.detectChanges();
    }, stabilizeMs);
  }

  /**
   * After analysis, BOM rows may land just before or after the first GET; ReportService also
   * caches BOM lists briefly. Retry until cost + executive look complete, then one financial
   * snapshot (budget + summary) with minInterval 0 — no parallel refresh from primeData.
   */
  hydrateScopeAndFinancialSnapshotWithRetries(
    jobId: number,
    options?: { forceScopeInsightRetries?: boolean },
  ): Promise<void> {
    const existing = this.scopeHydrationPromises.get(jobId);
    if (existing) {
      console.info('[jobs:trace] scope-hydration reuse inflight', {
        jobId,
        forceScopeInsightRetries: !!options?.forceScopeInsightRetries,
      });
      return existing;
    }

    const run = this.runHydrateScopeAndFinancialSnapshotWithRetries(
      jobId,
      options,
    );
    this.scopeHydrationPromises.set(jobId, run);
    console.info('[jobs:trace] scope-hydration start', {
      jobId,
      forceScopeInsightRetries: !!options?.forceScopeInsightRetries,
    });
    void run.finally(() => {
      if (this.scopeHydrationPromises.get(jobId) === run) {
        this.scopeHydrationPromises.delete(jobId);
        console.info('[jobs:trace] scope-hydration end', { jobId });
      }
    });
    return run;
  }

  private async runHydrateScopeAndFinancialSnapshotWithRetries(
    jobId: number,
    options?: { forceScopeInsightRetries?: boolean },
  ): Promise<void> {
    this.suppressScopeTotalsReveal = true;
    try {
      const persistedRank = this.statusToPhaseRank(this.getPersistedJobStatus());
      const effectiveRank =
        options?.forceScopeInsightRetries &&
        (persistedRank == null || persistedRank < 1)
          ? 1
          : persistedRank;
      console.info('[jobs:trace] scope-hydration run', {
        jobId,
        persistedRank,
        effectiveRank,
        status: this.getPersistedJobStatus(),
      });

      // Speed-first: render initial financial totals immediately, then run
      // scope retries/reconciliation in the background flow below.
      const bomForceRefreshFirst = effectiveRank === null || effectiveRank < 1;
      await this.refreshFinancialSnapshot(jobId, 0, {
        bomForceRefresh: bomForceRefreshFirst,
      });

      if (effectiveRank !== null && effectiveRank >= 1) {
        await this.refreshScopeInsightDataWithRetries(jobId);
        const insightCompleteAfterRetries = this.isScopeInsightPayloadComplete(
          this.scopeCostSummary,
          this.scopeExecutiveSummaryData,
        );
        if (!insightCompleteAfterRetries) {
          console.warn(
            '[jobs:trace] scope-hydration insight incomplete, forcing bom refresh',
            { jobId },
          );
          await this.sleep(250);
          this.reportService.invalidateBomResultsCache(String(jobId));
          await this.refreshFinancialSnapshot(jobId, 0, { bomForceRefresh: true });
        }
      }
    } finally {
      this.suppressScopeTotalsReveal = false;
      this.tryRevealScopeTotalsFromExistingData();
      this.markFetched(jobId, 'scope');
    }
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

    // Prefer explicit job / address country signals before report-style geo heuristics.
    if (/\busa\b|\bu\.s\.a\.?\b|\bunited states\b|\bu\.s\.\b/i.test(parts)) {
      return '$';
    }

    if (/\bzar\b|\brand\b|\brand(s)?\b|\bsouth african rand\b/.test(parts)) return 'R';
    if (/\bbwp\b|\bpula\b/.test(parts)) return 'P';
    if (/\busd\b|\bdollars?\b|\bdollar\b|\$/.test(parts)) return '$';
    if (/\beur\b|\beuro\b/.test(parts)) return '€';
    if (/\bgbp\b|\bpound\b/.test(parts)) return '£';

    // IMPORTANT: do not infer currency purely from address/location.
    // If the project didn't explicitly provide a currency token above, default to USD.
    return '$';
  }

  private resolveExplicitCurrencySymbolFromProjectDetails(
    details: any,
  ): string | null {
    const currencyParts = [
      details?.currency,
      details?.currencyCode,
      details?.CurrencyCode,
    ]
      .filter((value: any) => value != null && String(value).trim().length > 0)
      .map((value: any) => String(value).trim().toLowerCase())
      .join(' | ');

    if (!currencyParts) return null;

    if (/\busd\b/.test(currencyParts) || /\bdollars?\b/.test(currencyParts) || /\$/.test(currencyParts)) {
      return '$';
    }
    if (/\bzar\b/.test(currencyParts) || /\brand\b/.test(currencyParts) || /\bsouth african rand\b/.test(currencyParts) || /rand/.test(currencyParts) || /\bR\b/.test(currencyParts)) {
      return 'R';
    }
    if (/\beur\b/.test(currencyParts) || /\beuros?\b/.test(currencyParts) || /€/.test(currencyParts)) return '€';
    if (/\bgbp\b/.test(currencyParts) || /\bpounds?\b/.test(currencyParts) || /£/.test(currencyParts)) return '£';
    if (/\bbwp\b/.test(currencyParts) || /\bpula\b/.test(currencyParts)) return 'P';

    return null;
  }

  /** Keep money pipe aligned with project/job context; do not infer from AI report text. */
  private syncDefaultCurrencyFromProject(): void {
    const details = this.projectDetails;
    if (!details || typeof details !== 'object') return;
    setDefaultCurrencySymbol(this.resolveCurrencySymbolFromProjectDetails(details));
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

  /**
   * While initiation analysis is running, skip scope/BOM/report hydration — it
   * races `onAnalysisComplete` and caused empty Scope Review until refresh.
   */
  private shouldDeferScopeHydrationUntilPostAnalysis(): boolean {
    if (this.projectStage !== 'INITIATION') {
      return false;
    }
    const s = this.getPersistedJobStatus().toUpperCase().replace(/-/g, '_');
    return s === 'ANALYZING' || s === 'INITIATION' || s === '';
  }

  private primeDataForCurrentView(): void {
    const jobId = Number(this.projectDetails?.jobId);
    if (!Number.isFinite(jobId)) {
      return;
    }

    const needsScopeBase =
      this.projectStage !== 'INITIATION' ||
      this.activeTab === 'overview' ||
      this.activeTab === 'budget';
    const needsScope =
      needsScopeBase && !this.shouldDeferScopeHydrationUntilPostAnalysis();
    const scopeHydrationStarting =
      needsScope && !this.isFetched(jobId, 'scope');
    console.info('[jobs:trace] primeDataForCurrentView', {
      jobId,
      stage: this.projectStage,
      status: this.getPersistedJobStatus(),
      activeTab: this.activeTab,
      needsScopeBase,
      needsScope,
      scopeHydrationStarting,
    });
    if (scopeHydrationStarting) {
      this.loadScopeInsightData(String(jobId));
    }

    const needsBudget = this.activeTab === 'budget' || this.activeTab === 'overview';
    if (needsBudget && !this.isFetched(jobId, 'budget')) {
      this.markFetched(jobId, 'budget');
      this.loadBudgetLineItems(jobId);
    }
    // Scope hydration ends with refreshFinancialSnapshot(0); a parallel call here
    // races inFlight / 15s throttle and can apply a stale snapshot over good retries.
    if (needsBudget && !scopeHydrationStarting) {
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

  private refreshFinancialSnapshot(
    jobId: number,
    minIntervalMs: number = 15000,
    options?: { bomForceRefresh?: boolean },
  ): Promise<void> {
    const j = Number(jobId);
    if (!Number.isFinite(j) || j <= 0) {
      return Promise.resolve();
    }

    const pending = this.financialSnapshotPromises.get(j);
    if (pending) {
      console.info('[jobs:trace] financial-snapshot reuse inflight', {
        jobId: j,
      });
      return pending;
    }

    const now = Date.now();
    const sameJobAsLastRefresh = this.lastFinancialSnapshotRefreshJobId === j;
    if (
      sameJobAsLastRefresh &&
      minIntervalMs > 0 &&
      now - this.lastFinancialSnapshotRefreshAt < minIntervalMs
    ) {
      console.info('[jobs:trace] financial-snapshot throttled', {
        jobId: j,
        minIntervalMs,
        elapsedMs: now - this.lastFinancialSnapshotRefreshAt,
      });
      return Promise.resolve();
    }

    const run = this.runRefreshFinancialSnapshotImpl(j, options);
    this.financialSnapshotPromises.set(j, run);
    console.info('[jobs:trace] financial-snapshot start', {
      jobId: j,
      minIntervalMs,
      bomForceRefresh: options?.bomForceRefresh !== false,
    });
    void run.finally(() => {
      if (this.financialSnapshotPromises.get(j) === run) {
        this.financialSnapshotPromises.delete(j);
        console.info('[jobs:trace] financial-snapshot end', { jobId: j });
      }
    });
    return run;
  }

  private async runRefreshFinancialSnapshotImpl(
    jobId: number,
    options?: { bomForceRefresh?: boolean },
  ): Promise<void> {
    this.lastFinancialSnapshotRefreshJobId = Number(jobId);
    const bomForceRefresh = options?.bomForceRefresh !== false;
    // Hide hero-card totals while we are applying a new snapshot, then reveal
    // only once the latest refresh finishes. This prevents flicker from
    // intermediate reconciliation passes (e.g. 500K -> 700K) and also
    // guarantees the reveal still happens even if the refresh started while
    // `projectStage` was briefly INITIATION.
    this.scopeTotalsReadySeq += 1;
    const localScopeTotalsSeq = this.scopeTotalsReadySeq;

    // Stage updated scope values locally, then commit them at the end of the
    // refresh. This prevents intermediate reconciliation passes from causing
    // hero-card "disappear/reappear" flicker.
    let nextScopeCostSummary = this.scopeCostSummary;
    let nextScopeBomTotals = this.scopeBomTotals;

    // Only hide hero-card totals if we don't have stable totals visible yet.
    // Once totals are visible, keep them on-screen while the next refresh runs;
    // the staged commit happens at the end.
    if (!this.scopeTotalsReady) {
      this.scopeTotalsReady = false;
    }
    // Start the lead-time requests immediately, but don't block hero totals on them.
      const permitsPromise = this.reportService.getPermittingLeadTimeWeeks(String(jobId));
      const materialsPromise = this.reportService.getMaxProcurementLeadTimeWeeks(String(jobId));

      const budgetPromise = firstValueFrom(
        this.budgetService.getBudget(Number(jobId), true),
      );
      const executiveSummaryPromise =
        this.reportService.getExecutiveSummaryData(String(jobId));
      const summaryPromise = this.reportService.getDetailedCostSummary(String(jobId));
      const bomPromise = firstValueFrom(
        this.bomService.getBillOfMaterials(String(jobId), bomForceRefresh),
      );

      // Hero totals depend on cost summary. BOM is only needed to reconcile
      // missing indirect soft costs. So we await the cost summary first for
      // speed, and only await BOM if reconciliation is required.
      const [summaryResult] = await Promise.allSettled([summaryPromise]);

      if (summaryResult.status === 'fulfilled' && summaryResult.value) {
        nextScopeCostSummary = summaryResult.value;
        const explicitCurrency =
          this.resolveExplicitCurrencySymbolFromProjectDetails(
            this.projectDetails,
          );
        // If projectDetails didn't explicitly define a currency, trust the
        // parsed scope summary currency (and keep our improved $ detector).
        if (!explicitCurrency) {
          const detectedCurrencySymbol = (summaryResult.value as any)
            ?.currencySymbol;
          if (detectedCurrencySymbol) {
            setDefaultCurrencySymbol(String(detectedCurrencySymbol));
          }
        }
      }

      const summary = (nextScopeCostSummary || {}) as any;
      const generalConditionsCurrent = Number(summary?.generalConditions || 0);
      const permitsAdminFeesCurrent = Number(summary?.permitsAdminFees || 0);
      const insuranceBondsCurrent = Number(summary?.insuranceBonds || 0);
      const missingAnyIndirect =
        generalConditionsCurrent <= 0 ||
        permitsAdminFeesCurrent <= 0 ||
        insuranceBondsCurrent <= 0;
      console.info('[jobs:trace] financial-summary resolved', {
        jobId,
        hasSummary:
          summaryResult.status === 'fulfilled' && !!summaryResult.value,
        missingAnyIndirect,
      });

      if (missingAnyIndirect) {
        const [bomResult] = await Promise.allSettled([bomPromise]);
        if (bomResult.status === 'fulfilled') {
          nextScopeBomTotals = this.extractScopeBomTotals(bomResult.value);

          const extracted = this.extractIndirectSoftCostsFromBomResults(
            bomResult.value,
          );
          if (extracted) {
            nextScopeCostSummary = {
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
      }

      if (
        this.scopeTotalsReadySeq === localScopeTotalsSeq
      ) {
        // Commit only the reconciled snapshot. This is the moment the hero
        // cards are allowed to render updated totals.
        this.scopeCostSummary = nextScopeCostSummary;
        this.scopeBomTotals = nextScopeBomTotals;

        // Mark snapshot freshness at commit time so reveal gating can trust that
        // values belong to the current refresh cycle for this job.
        this.lastFinancialSnapshotRefreshJobId = Number(jobId);
        this.lastFinancialSnapshotRefreshAt = Date.now();

        // We completed the snapshot reconciliation; reveal if the user is
        // currently in a phase that renders these cards.
        this.tryRevealScopeTotalsFromExistingData();
      }
      this.cdr.detectChanges();

      // Now wait for lead-time data and update it without affecting the
      // already-revealed hero-card totals.
      const [
        budgetResult,
        executiveSummaryResult,
        permitWeeksResult,
        materialWeeksResult,
        bomResultLater,
      ] = await Promise.allSettled([
        budgetPromise,
        executiveSummaryPromise,
        permitsPromise,
        materialsPromise,
        bomPromise,
      ]);

      if (budgetResult.status === 'fulfilled') {
        this.budgetLineItems = Array.isArray(budgetResult.value)
          ? budgetResult.value
          : [];
      }
      if (
        executiveSummaryResult.status === 'fulfilled' &&
        executiveSummaryResult.value
      ) {
        this.scopeExecutiveSummaryData = executiveSummaryResult.value;
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

      // Update BOM totals once the BOM request finishes. If we already
      // reconciled indirect soft costs above, this shouldn't affect hero
      // totals (they come from scopeCostSummary).
      if (
        bomResultLater &&
        bomResultLater.status === 'fulfilled' &&
        this.scopeTotalsReadySeq === localScopeTotalsSeq
      ) {
        this.scopeBomTotals = this.extractScopeBomTotals(bomResultLater.value);
      }

      this.lastFinancialSnapshotRefreshAt = Date.now();
      if (this.scopeTotalsReady) {
        this.markScopePerf(Number(jobId), 'stable');
      }
      this.cdr.detectChanges();
  }

  private categoryTotalFromBudgetItems(category: 'materials' | 'subcontractor'): number {
    if (!Array.isArray(this.budgetLineItems) || this.budgetLineItems.length === 0) {
      return 0;
    }

    const shouldExcludeFromDirectCostTotals = (item: any): boolean => {
      const itemName = String(item?.item || '').trim().toLowerCase();
      if (!itemName) return false;

      const phase = String(item?.phase || '').trim().toLowerCase();
      const notes = String(item?.notes || '').trim().toLowerCase();
      const source = String(item?.source || '').trim().toLowerCase();
      const isAiImported = source === 'ai' || notes.includes('imported from ai analysis');

      const explicitNonCostLabels = [
        'suggested market bid price',
        'calculated gc bid price',
        'calculated cost per conditioned area',
        'cost range',
        'project address',
      ];

      if (explicitNonCostLabels.some((token) => itemName.includes(token))) {
        return true;
      }

      if (
        isAiImported &&
        (phase.includes('cost breakdown') || phase.includes('project closeout'))
      ) {
        return true;
      }

      return false;
    };

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

    return this.budgetLineItems.reduce((sum, item: any) => {
      const family = categoryFamily(String(item?.category || ''));
      if (family !== category) return sum;
      if (shouldExcludeFromDirectCostTotals(item)) return sum;

      return sum + Number(item?.estimatedCost || 0);
    }, 0);
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

        const sumCategorizedMaterials = (
          row: any,
          predicate: (itemName: string) => boolean,
        ): number => {
          const materials = Array.isArray(row?.Categorized_Materials)
            ? row.Categorized_Materials
            : [];
          return materials
            .filter((m: any) => predicate(String(m?.Item || '').toLowerCase()))
            .reduce(
              (sum: number, m: any) =>
                sum + parseAmount(m?.Total ?? m?.Amount ?? m?.Cost),
              0,
            );
        };

        parsed.forEach((row: any) => {
          const phaseItem = String(row?.Phase_Item || '').toLowerCase();
          const category = String(row?.Category || '').toLowerCase();
          const combinedLabel = `${phaseItem} ${category}`.trim();
          const amount = parseAmount(row?.Amount ?? row?.Total ?? row?.Cost);
          if (!combinedLabel && amount <= 0) return;

          const nestedGeneral = sumCategorizedMaterials(row, (name) =>
            (name.includes('general') && name.includes('condition')) ||
            (name.includes('site') &&
              (name.includes('management') ||
                name.includes('service') ||
                name.includes('supervision') ||
                name.includes('support') ||
                name.includes('security') ||
                name.includes('waste') ||
                name.includes('equipment'))),
          );
          const nestedPermits = sumCategorizedMaterials(
            row,
            (name) => name.includes('permit') || name.includes('admin'),
          );
          const nestedInsurance = sumCategorizedMaterials(
            row,
            (name) => name.includes('insurance') || name.includes('bond'),
          );

          if (nestedGeneral > 0 || nestedPermits > 0 || nestedInsurance > 0) {
            generalConditions += nestedGeneral;
            permitsAdminFees += nestedPermits;
            insuranceBonds += nestedInsurance;
            return;
          }

          if (!combinedLabel || amount <= 0) return;

          const isGeneral =
            (combinedLabel.includes('general') &&
              combinedLabel.includes('condition')) ||
            (combinedLabel.includes('site') &&
              (combinedLabel.includes('management') ||
                combinedLabel.includes('service') ||
                combinedLabel.includes('support')));
          const isPermits =
            combinedLabel.includes('permit') || combinedLabel.includes('admin');
          const isInsurance =
            combinedLabel.includes('insurance') || combinedLabel.includes('bond');

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

  private scopeRefreshDelayMs(attempt: number): number {
    return Math.min(2_000, 120 * Math.pow(2, attempt));
  }

  /**
   * True when cost summary has real bid-level numbers and executive summary looks
   * parsed from a finished report (not the stub after first partial BOM write).
   */
  private isScopeInsightPayloadComplete(
    summary: any,
    executiveSummary: any,
  ): boolean {
    if (!summary || typeof summary !== 'object') {
      return false;
    }
    const bid = Number(
      summary.suggestedBid ||
        summary.suggestedMarketBid ||
        summary.reportGrandTotalBidPrice ||
        0,
    );
    if (!Number.isFinite(bid) || bid <= 0) {
      return false;
    }

    if (!executiveSummary || typeof executiveSummary !== 'object') {
      return false;
    }

    const conf = Number(
      executiveSummary.blueprintConfidence?.overallConfidence ?? 0,
    );
    const overview = String(executiveSummary.overview || '').trim();
    const highlights = executiveSummary.keyHighlights;
    const hasHighlights = Array.isArray(highlights) && highlights.length > 0;
    const hasExecBody = overview.length >= 100 || hasHighlights;
    const hasConfidence = conf >= 1;
    const rec = String(executiveSummary.executiveRecommendation || '').trim();
    const hasRecommendation = rec.length >= 80;

    return hasConfidence || hasExecBody || hasRecommendation;
  }

  private async refreshScopeInsightDataWithRetries(jobId: number): Promise<void> {
    const jobIdStr = String(jobId);
    const maxAttempts = 4;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const normalized =
          await this.reportService.primeBomResultsFromNetwork(jobIdStr);

        const [summary, executiveSummary, permitWeeks, materialWeeks] =
          await Promise.all([
            this.reportService.getDetailedCostSummary(jobIdStr),
            this.reportService.getExecutiveSummaryData(jobIdStr),
            this.reportService.getPermittingLeadTimeWeeks(jobIdStr),
            this.reportService.getMaxProcurementLeadTimeWeeks(jobIdStr),
          ]);

        const bomForTotals =
          Array.isArray(normalized) && normalized.length > 0
            ? [
                {
                  parsedReport: this.bomService.parseReport(
                    String(normalized[0]?.fullResponse || ''),
                  ),
                },
              ]
            : [];
        const bomTotals = this.extractScopeBomTotals(bomForTotals);

        this.scopeCostSummary = summary || null;
        this.scopeExecutiveSummaryData = executiveSummary || null;
        // Currency is seeded from projectDetails once (on job load) and should
        // not be re-derived during scope refresh retries (it can cause flips).
        const explicitCurrency =
          this.resolveExplicitCurrencySymbolFromProjectDetails(
            this.projectDetails,
          );
        if (!explicitCurrency) {
          const detectedCurrencySymbol = (summary as any)?.currencySymbol;
          if (detectedCurrencySymbol) {
            setDefaultCurrencySymbol(String(detectedCurrencySymbol));
          }
        }
        this.scopeBomTotals = bomTotals;
        this.scopePermitLeadTimeWeeks = Number.isFinite(Number(permitWeeks))
          ? Number(permitWeeks)
          : null;
        this.scopeMaterialLeadTimeWeeks = Number.isFinite(Number(materialWeeks))
          ? Number(materialWeeks)
          : null;
        this.cdr.detectChanges();

        if (this.isScopeInsightPayloadComplete(summary, executiveSummary)) {
          return;
        }
      } catch {
        // Transient errors; retry with backoff (avoid tight loops on failures).
      }

      if (attempt < maxAttempts - 1) {
        await this.sleep(this.scopeRefreshDelayMs(attempt));
      }
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
            takeUntilDestroyed(this.destroyRef),
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
    if (this.scopeTotalsReadyTimer) {
      clearTimeout(this.scopeTotalsReadyTimer);
      this.scopeTotalsReadyTimer = null;
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

    const [budgetResult, summaryResult, executiveSummaryResult, bomResult] = await Promise.allSettled([
      firstValueFrom(this.budgetService.getBudget(Number(jobId), true)),
      this.reportService.getDetailedCostSummary(jobId),
      this.reportService.getExecutiveSummaryData(jobId),
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
    if (executiveSummaryResult.status === 'fulfilled' && executiveSummaryResult.value) {
      this.scopeExecutiveSummaryData = executiveSummaryResult.value;
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

  async openOverallTimelineDialog(): Promise<void> {
    const jobId = String(this.projectDetails?.jobId || '');
    if (!this.scopeExecutiveSummaryData && jobId) {
      try {
        this.scopeExecutiveSummaryData = await this.reportService.getExecutiveSummaryData(jobId);
      } catch {
        // keep existing fallback behavior
      }
    }

    const milestones = this.buildTimelineMilestones();
    const durationWeeks = this.totalDurationWeeksForDialog;
    const durationWeeksText =
      durationWeeks > 0 && Number.isInteger(durationWeeks)
        ? String(durationWeeks)
        : durationWeeks.toFixed(1).replace(/\.0$/, '');

    const data: OverallTimelineDialogData = {
      noticeToProceed: this.projectStartDate
        ? format(this.projectStartDate, 'MMM d, yyyy')
        : 'TBD',
      substantialCompletion: this.substantialCompletionDate
        ? format(this.substantialCompletionDate, 'MMM d, yyyy')
        : 'TBD',
      contractDurationText:
        durationWeeks > 0
          ? `${durationWeeksText} weeks (${Math.round(durationWeeks * 7)} calendar days)`
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

    // Overhead & Profit is already the contractor's margin bucket in our model.
    // Subtracting it again makes "net profit" go negative even when the bid is healthy.
    // Define net profit as the remaining amount after covering direct costs + allowances.
    const netContractorProfit =
      recommendedBid - (costToBuild + contingencyAllowance + escalationAllowance + taxesAllowance);
    const netProfitMarginPercent =
      recommendedBid > 0 ? (netContractorProfit / recommendedBid) * 100 : 0;
    const returnOnCostPercent =
      costToBuild > 0 ? (netContractorProfit / costToBuild) * 100 : 0;
    const size = Number(this.projectDetails?.buildingSize || this.projectDetails?.projectSize || 0);

    console.info('[jobs] Bid price dialog computed', {
      jobId: Number(this.projectDetails?.jobId || 0),
      recommendedBid,
      costToBuild,
      overheadProfit,
      contingencyAllowance,
      escalationAllowance,
      taxesAllowance,
      grossMargin,
      grossMarginPercent,
      riskExposure,
      netContractorProfit,
      netProfitMarginPercent,
      returnOnCostPercent,
    });

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
      console.info('[jobs:trace] determineProjectStage', {
        status,
        mappedStage: this.projectStage,
        mode: this.stageDisplayMode,
        jobId: this.projectDetails?.jobId,
      });
      this.primeDataForCurrentView();
      // If the cost summary already exists from an earlier refresh pass,
      // reveal hero totals now that the correct stage is active.
      this.tryRevealScopeTotalsFromExistingData();
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
    console.info('[jobs] onAnalysisComplete triggered', {
      inFlight: this.analysisCompletionInFlight,
      jobId: this.projectDetails?.jobId,
      stage: this.projectStage,
    });

    if (this.analysisCompletionInFlight) {
      console.info('[jobs] onAnalysisComplete coalesced to in-flight run', {
        jobId: this.projectDetails?.jobId,
      });
      return;
    }

    const jobId = Number(this.projectDetails?.jobId);
    if (!Number.isFinite(jobId)) {
      this.snackBar.open('Cannot proceed: Job ID not available yet.', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.analysisCompletionInFlight = true;
    this.analysisCompletionInFlightStartedAtMs = Date.now();

    try {

    this.authService.extendAnalysisProtectionGrace('job-analysis-complete-manual');

    // Manual Continue can run without a final SignalR `isComplete`; without this,
    // `pauseInactivityTimer('job-analysis')` never clears and idle/refresh UX breaks.
    if (this.isAnalysisInactivityPaused) {
      this.authService.resumeInactivityTimer('job-analysis');
      this.isAnalysisInactivityPaused = false;
    }

    this.reportService.invalidateBomResultsCache(String(jobId));
    this.startScopePerf(jobId, 'onAnalysisComplete');

    try {
      const inFlight = this.scopeHydrationPromises.get(jobId);
      if (inFlight) {
        await inFlight.catch(() => undefined);
      }
      await this.hydrateScopeAndFinancialSnapshotWithRetries(jobId, {
        forceScopeInsightRetries: true,
      });
    } catch (err) {
      console.error('[jobs] Blocking pre-navigation hydration failed', { jobId, err });
      this.snackBar.open(
        'Still finalizing analysis data. Please wait a moment and try again.',
        'Close',
        { duration: 3500 },
      );
      return;
    }

    // Move to Scope Review only after first hydration pass is done.
    this.projectDetails = {
      ...(this.projectDetails || {}),
      status: 'PRELIMINARY_SCOPE',
      Status: 'PRELIMINARY_SCOPE',
    };
    this.store.setState({ projectDetails: this.projectDetails } as any);
    this.projectStage = 'PRELIMINARY_SCOPE';
    this.stageDisplayMode = 'stage';
    this.syncStageTrackingFromStoreStatus('PRELIMINARY_SCOPE');
    this.cdr.detectChanges();

    this.updateJobStatus('PRELIMINARY_SCOPE');

    // If scope summary data was loaded during initiation, reveal now that
    // the stage has switched, avoiding the empty "--" hero-card screen.
    this.tryRevealScopeTotalsFromExistingData();

    void this.runPostAnalysisBackgroundWork(jobId);
    } finally {
      this.analysisCompletionInFlight = false;
      this.analysisCompletionInFlightStartedAtMs = null;
    }
  }

  /** Hydration + AI budget import after advancing to Scope Review (non-blocking for UI). */
  private async runPostAnalysisBackgroundWork(jobId: number): Promise<void> {
    try {
      await this.importAiBudgetItemsIfNeeded(jobId);
      this.loadBudgetLineItems(jobId);
      await this.refreshFinancialSnapshot(jobId, 0);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('[jobs] Post-analysis background work failed', { jobId, err });
    }
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
