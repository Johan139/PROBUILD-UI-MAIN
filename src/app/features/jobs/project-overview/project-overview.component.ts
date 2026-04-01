import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  DestroyRef,
  inject,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { ProjectCardComponent } from '../../my-projects/project-card/project-card.component';
import { ProjectsTableComponent } from '../../../components/projects-table/projects-table.component';
import { Project } from '../../../models/project';
import { MeasurementService } from '../../../services/measurement.service';
import { AuthService } from '../../../authentication/auth.service';
import { AddressService } from '../services/address.service';
import { JobDataService } from '../services/job-data.service';
import { BudgetService } from '../services/budget.service';
import { BidsService } from '../../../services/bids.service';
import { JobsService } from '../../../services/jobs.service';
import { ProjectService } from '../../../services/project.service';
import { ReportService } from '../services/report.service';
import { TimelineGroup } from '../../../components/timeline/timeline.component';
import { WeatherImpactService } from '../services/weather-impact.service';
import { PermitsDialogComponent } from '../permits-dialog/permits-dialog.component';
import { TaskDetailDialogComponent } from './task-detail-dialog/task-detail-dialog.component';
import { PermitsService } from '../services/permits.service';
import { ContractService } from '../../../services/contract.service';
import { WeatherImpactModalComponent } from './weather-impact-modal/weather-impact-modal.component';
import { SubtaskService } from '../services/subtask.service';
import { TimelineService } from '../services/timeline.service';
import { LucideIconsModule } from '../../../shared/lucide-icons.module';
import { ArchiveService } from '../../archive/archive-service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MoneyPipe, MoneyInTextPipe } from '../../../shared/pipes/money.pipe';
import { formatMoney } from '../../../shared/pipes/money.pipe';
@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatExpansionModule,
    LucideIconsModule,
    MoneyPipe,
    ProjectCardComponent,
    ProjectsTableComponent,
    WeatherImpactModalComponent
],

  templateUrl: './project-overview.component.html',
  styleUrls: ['./project-overview.component.scss'],
})
export class ProjectOverviewComponent {
  @Input() projects: Project[] = [];
  @Input() liveProjectsCount: number = 0;
  @Input() biddingProjectsCount: number = 0;
  @Input() teamMemberCount: number = 0;
  @Input() timelineData: TimelineGroup[] = [];
  @Input() assignedTeamMembers: any[] = [];
  @Input() scopeCostSummary: any = null;
  @Input() scopeBomTotals: {
    materialCost: number;
    laborCost: number;
    directSubtotal: number;
  } | null = null;
  @Input() scopeTotalProjectCost: number | null = null;
  @Input() bidNetProfitMarginPercent: number | null = null;
  @Input() bidTotalPrice: number | null = null;

  // Job Details & Weather Inputs
  @Input() projectDetails: any;
  @Input() isLoading: boolean = false;
  @Input() startDateDisplay: any;
  @Input() forecast: any[] | undefined = [];
  @Input() weatherError: string | null | undefined = null;
  @Input() temperatureUnit: 'C' | 'F' = 'C';

  executiveSummaryExpanded = false;
  isSummaryLoading = false;
  private loadedExecutiveSummary: any = null;
  private loadedCostSummary: any = null;

  @Output() jobArchived = new EventEmitter<number>();

  @Output() selectProject = new EventEmitter<string>();
  @Output() navigateToTab = new EventEmitter<string>();

  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;

  // Address Editing State
  isEditingAddress: boolean = false;
  addressControl = new FormControl<string>('');
  addressSuggestions: { description: string; place_id: string }[] = [];
  selectedPlace: google.maps.places.PlaceResult | null = null;
  private selectedAddress: any;
  private destroyRef = inject(DestroyRef);
  // Inline Editing State
  isEditingProject: boolean = false;
  isEditingClient: boolean = false;
  tempProjectDetails: any = {};
  tempClientDetails: any = {};

  // Weather Modal State
  weatherModalOpen: boolean = false;
  weatherAdjusted: boolean = false;
  totalDelayDays: number = 0;
  affectedTasks: string[] = [];
  adjustedCompletionDate: Date | null = null;
  estimatedCompletionDate: Date | null = null;

  // Dynamic Data Properties
  ownerName: string = '';
  clientName: string = '';
  clientEmail: string = '';
  clientPhone: string = '';
  contractStatus: string = 'Pending';

  activeValue: number = 0;
  spentToDate: number = 0;
  remainingBudget: number = 0;
  bidPrice: number = 0;
  totalProjectCost: number = 0;
  costToBuild: number = 0;
  isFinancialLoading: boolean = false;
  grossProfit: number = 0;
  profitMargin: number = 0;
  profitAtRisk: number = 0;
  baselineCost: number = 0;
  overheadAndProfit: number = 0;
  contingency: number = 0;
  escalation: number = 0;
  taxes: number = 0;

  budgetItems: any[] = [];
  selectedDivision: string | null = 'all';
  costByPhase: { name: string; value: number }[] = [];
  materialPercent: number = 0;
  laborPercent: number = 0;
  bidsReceived: number = 0;
  totalDuration: number = 0;
  currentWeek: number = 0;
  outlookTasks: { name: string; date: string }[] = [];
  behindScheduleCount: number = 0;
  weatherRiskMessage: string = 'None';
  weatherRiskLevel: 'none' | 'warning' | 'critical' = 'none';
  completedTasksCount: number = 0;

  // Blueprint Intelligence
  blueprintSheetCount: number = 0;
  blueprintRoomCount: number = 0;
  blueprintConfidenceScore: number = 0;
  dimensionalAccuracy: number = 0;
  completeness: number = 0;
  readability: number = 0;
  projectTotalArea: number | null = null;
  totalArea: number = 0;
  blueprintRooms: { name: string; area: string }[] = [];

  // Bidding Status
  tradesRequiredCount: number = 0;
  invitedPlatformCount: number = 0;
  invitedExternalCount: number = 0;
  pendingResponseCount: number = 0;
  biddingRound: number = 1;

  // Subcontractor Overview
  confirmedSubsCount: number = 0;
  pendingSubsCount: number = 0;
  projectTrades: { name: string; status: 'confirmed' | 'pending' | 'none' }[] =
    [];

  // Permits
  permitStatus: 'success' | 'warning' | 'none' = 'none';
  permitStatusText: string = 'No Data';

  // Task Summary
  taskSummaryStats = {
    total: 0,
    complete: 0,
    inProgress: 0,
    pending: 0,
  };
  recentTasks: any[] = [];

  // Document Hub
  contractCount: number = 0;
  rfiCount: number = 0;
  inspectionCount: number = 0;
  photoCount: number = 0;

  // Carousel State
  currentIndex = 0;
  projectView: 'grid' | 'list' = 'grid';

  // Weekly Schedule State
  displayWeek: number = 1;

  private localStorageKey = '';
  private projectStartDate: Date | null = null;
  private lastProjectJobId: string | null = null;

  constructor(
    public measurementService: MeasurementService,
    public authService: AuthService,
    private addressService: AddressService,
    private jobDataService: JobDataService,
    private budgetService: BudgetService,
    private bidsService: BidsService,
    private jobsService: JobsService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
    private reportService: ReportService,
    private weatherImpactService: WeatherImpactService,
    private dialog: MatDialog,
    private permitsService: PermitsService,
    private contractService: ContractService,
    private subtaskService: SubtaskService,
    private timelineService: TimelineService,
    private archiveService: ArchiveService,
  ) {}

  setUnit(unit: 'C' | 'F'): void {
    this.temperatureUnit = unit;
    localStorage.setItem('tempUnit', unit);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const nextJobId = this.projectDetails?.jobId
      ? String(this.projectDetails.jobId)
      : null;
    const projectChanged = !!nextJobId && nextJobId !== this.lastProjectJobId;

    if (projectChanged) {
      this.resetTransientOverviewState();
      this.lastProjectJobId = nextJobId;
    }

    if (this.projectDetails?.jobId) {
      this.localStorageKey = `project_overview_${this.projectDetails.jobId}`;
      this.loadProjectData();

      // Initialize temp objects for editing
      this.tempProjectDetails = { ...this.projectDetails };
    }
    if (changes['timelineData'] || changes['projectDetails']) {
      this.processTimelineData();
    }
  }

  private resetTransientOverviewState(): void {
    this.isFinancialLoading = true;
    this.loadedCostSummary = null;
    this.loadedExecutiveSummary = null;

    this.activeValue = 0;
    this.spentToDate = 0;
    this.remainingBudget = 0;
    this.bidPrice = 0;
    this.totalProjectCost = 0;
    this.costToBuild = 0;
    this.grossProfit = 0;
    this.profitMargin = 0;
    this.profitAtRisk = 0;
    this.baselineCost = 0;
    this.overheadAndProfit = 0;
    this.contingency = 0;
    this.escalation = 0;
    this.taxes = 0;

    this.totalDuration = 0;
    this.currentWeek = 0;
    this.displayWeek = 1;
    this.projectStartDate = null;
    this.estimatedCompletionDate = null;
    this.outlookTasks = [];
    this.behindScheduleCount = 0;
  }

  private loadFromCache(): void {
    const cached = localStorage.getItem(this.localStorageKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        this.ownerName = data.ownerName || this.ownerName;
        this.clientName = data.clientName || '';
        this.activeValue = data.activeValue || 0;
        this.costByPhase = data.costByPhase || [];
        this.materialPercent = data.materialPercent || 0;
        this.laborPercent = data.laborPercent || 0;
        this.bidsReceived = data.bidsReceived || 0;
        this.completedTasksCount = data.completedTasksCount || 0;
      } catch (e) {
        console.error('Failed to parse cached overview data', e);
      }
    }
  }

  private saveToCache(): void {
    const data = {
      ownerName: this.ownerName,
      clientName: this.clientName,
      activeValue: this.activeValue,
      costByPhase: this.costByPhase,
      materialPercent: this.materialPercent,
      laborPercent: this.laborPercent,
      bidsReceived: this.bidsReceived,
      completedTasksCount: this.completedTasksCount,
    };
    localStorage.setItem(this.localStorageKey, JSON.stringify(data));
  }

  loadProjectData(): void {
    // Load from cache first (Stale-While-Revalidate)
    this.loadFromCache();

    const jobId = this.projectDetails.jobId;

    // Prevent cached financial values from flashing while fresh totals load.
    this.isFinancialLoading = true;

    this.isSummaryLoading = true;
    this.reportService
      .getExecutiveSummaryData(jobId)
      .then((summary) => {
        this.loadedExecutiveSummary = summary;
        // Recompute timeline cards once summary timeline becomes available.
        this.processTimelineData();
      })
      .catch(() => {
        this.loadedExecutiveSummary = null;
      })
      .finally(() => {
        this.isSummaryLoading = false;
      });

    // 1. Blueprint Intelligence
    this.reportService.getBlueprintIntelligence(jobId).then((data) => {
      this.blueprintConfidenceScore = data.confidenceScore;
      this.blueprintSheetCount = data.sheetCount;
      this.blueprintRoomCount = data.roomCount;
      this.blueprintRooms = data.rooms;
      const normalizedUnderRoofSqFt = this.normalizeUnderRoofAreaToSqFt(
        data.underRoofArea,
      );
      this.projectTotalArea = normalizedUnderRoofSqFt && normalizedUnderRoofSqFt > 0
        ? normalizedUnderRoofSqFt
        : null;

      this.dimensionalAccuracy = data.dimensionalAccuracy || 0;
      this.completeness = data.completeness || 0;
      this.readability = data.readability || 0;
      this.totalArea = this.computeRoomsTotalSqFt(this.blueprintRooms);

      this.saveToCache();
    });

    // TODO: Get Contracts Status (Client Contract is assumed to be the earliest one), need something more robust
    this.contractService.getContractsByJobId(jobId).subscribe({
      next: (contracts) => {
        if (contracts && contracts.length > 0) {
          // Sort by CreatedAt to find the first contract (Client Contract)
          const sortedContracts = contracts.sort(
            (a, b) => {
              const aCreatedAt = a.createdAt
                ? new Date(a.createdAt).getTime()
                : 0;
              const bCreatedAt = b.createdAt
                ? new Date(b.createdAt).getTime()
                : 0;
              return aCreatedAt - bCreatedAt;
            },
          );
          const clientContract = sortedContracts[0];

          if (clientContract) {
            // Map status: 'SIGNED' -> 'Signed', 'PENDING' -> 'Drafting' or keep as is
            const status = clientContract.status;
            this.contractStatus =
              status === 'SIGNED' || status === 'Signed'
                ? 'Signed'
                : 'Drafting';
          }
        } else {
          this.contractStatus = 'Pending';
        }
      },
      error: () => (this.contractStatus = 'Unknown'),
    });

    // Get Owner Name, Client Name & Subcontractor/Bidding Info from Job
    this.jobsService.getSpecificJob(jobId).subscribe({
      next: (job: any) => {
        if (job?.user) {
          this.ownerName = `${job.user.firstName} ${job.user.lastName}`;
        } else if (this.projectDetails?.userId) {
          // Fallback to current user if matches
          this.authService.currentUser$.subscribe((user) => {
            if (user && user.id === this.projectDetails.userId) {
              this.ownerName = `${user.firstName} ${user.lastName}`;
            }
          });
        }

        // Bidding Status Extraction
        if (
          job.tradeBudgets &&
          Array.isArray(job.tradeBudgets) &&
          job.tradeBudgets.length > 0
        ) {
          this.tradesRequiredCount = job.tradeBudgets.length;
          this.projectTrades = job.tradeBudgets.map((tb: any) => ({
            name: tb.tradeName.replace(/_/g, ' '),
            status: 'none',
          }));
        } else if (job.requiredSubcontractorTypes) {
          const types = Array.isArray(job.requiredSubcontractorTypes)
            ? job.requiredSubcontractorTypes
            : job.requiredSubcontractorTypes.split(',');
          this.tradesRequiredCount = types.length;
          // Fallback if no tradeBudgets
          this.projectTrades = types.map((t: string) => ({
            name: t,
            status: 'none',
          }));
        }
        this.biddingRound = job.biddingRound || 1;

        // Subcontractor Overview Extraction
        if (job.jobAssignments && Array.isArray(job.jobAssignments)) {
          const subs = job.jobAssignments.filter(
            (a: any) => a.role === 'Subcontractor',
          );
          this.confirmedSubsCount = subs.filter(
            (a: any) => a.status === 'Active',
          ).length;
          this.pendingSubsCount = subs.filter(
            (a: any) => a.status === 'Pending',
          ).length;

          // Update statuses in projectTrades
          subs.forEach((sub: any) => {
            if (sub.trade) {
              const normalizedSubTrade = sub.trade
                .toLowerCase()
                .replace(/_/g, ' ');

              const match = this.projectTrades.find((pt) => {
                const normalizedPtName = pt.name
                  .toLowerCase()
                  .replace(/_/g, ' ');
                return (
                  normalizedPtName === normalizedSubTrade ||
                  normalizedPtName.includes(normalizedSubTrade) ||
                  normalizedSubTrade.includes(normalizedPtName)
                );
              });

              if (match) {
                if (sub.status === 'Active') {
                  match.status = 'confirmed';
                } else if (
                  sub.status === 'Pending' &&
                  match.status !== 'confirmed'
                ) {
                  match.status = 'pending';
                }
              }
            }
          });
        }

        // Fetch client details
        this.jobsService.getClientDetails(Number(jobId)).subscribe({
          next: (client) => {
            if (client) {
              this.clientName = `${client.firstName} ${client.lastName}`;
              this.clientEmail = client.email || this.clientEmail;
              this.clientPhone = client.phone || this.clientPhone;

              if (client.companyName) {
                this.clientName += ` (${client.companyName})`;
              }
              this.tempClientDetails = {
                firstName: client.firstName,
                lastName: client.lastName,
                email: client.email,
                phone: client.phone,
              };
              this.saveToCache();
            }
          },
          error: (err) => console.error('Failed to load client details', err),
        });
        this.saveToCache();
      },
      error: () => (this.ownerName = 'Unknown'),
    });

    // Check Permit Status
    this.checkPermitStatus(jobId);

    // Documents
    this.jobsService.getJobDocuments(jobId).subscribe({
      next: (docs) => {
        if (docs) {
          // TODO: Simple counting based on category or type, FIXME with actual documents
          this.contractCount = docs.filter((d) =>
            (d.category || d.type || '').toLowerCase().includes('contract'),
          ).length;
          this.rfiCount = docs.filter((d) =>
            (d.category || d.type || '').toLowerCase().includes('rfi'),
          ).length;
          this.inspectionCount = docs.filter((d) =>
            (d.category || d.type || '').toLowerCase().includes('inspection'),
          ).length;
          this.photoCount = docs.filter(
            (d) =>
              (d.category || d.type || '').toLowerCase().includes('photo') ||
              (d.fileType || '').toLowerCase().includes('image'),
          ).length;
        }
      },
      error: (err) => console.error('Failed to load documents', err),
    });

    this.budgetService.getBudget(jobId).subscribe({
      next: (items) => {
        this.budgetItems = items;
        this.calculateBudgetStats(items);
        this.saveToCache();
      },
      error: (err) => console.error('Failed to load budget', err),
    });

    this.reportService
      .getDetailedCostSummary(jobId)
      .then((summary) => {
        this.loadedCostSummary = summary;
        if (summary) {
          this.costToBuild = Number(summary.directSubtotal || 0);
          if (this.costToBuild <= 0) {
            this.costToBuild =
              Number(summary.materialCost || 0) + Number(summary.laborCost || 0);
          }
          this.totalProjectCost = Number(summary.suggestedBid || 0);
          const marketBid = Number(summary.suggestedMarketBid || 0);

        // Align with preliminary semantics:
        // - Total Project Cost = suggestedBid
        // - Suggested Bid Price = suggestedMarketBid
        // Guardrail: never show client bid below total project cost
        this.bidPrice = Math.max(this.totalProjectCost, marketBid);

        // Some reports/flows provide per-sq-ft figures (e.g. $215.50) in bid fields.
        // If bidPrice is implausibly low compared to the overall totals, fall back
        // to the best-known total so profitability calculations don't explode.
        const overallTotal = this.overallBudgetValue;
        const details: any = this.projectDetails as any;
        const detailsTotal = Number(
          details?.budget ||
            details?.projectBudget ||
            details?.totalProjectCost ||
            details?.suggestedBid ||
            details?.suggestedMarketBid ||
            details?.costAnalysis?.suggestedBid ||
            details?.costAnalysis?.suggestedMarketBid ||
            0,
        );
        const expectedTotal = Math.max(
          this.activeValue,
          detailsTotal,
          this.totalProjectCost,
          marketBid,
          overallTotal,
        );
        if (expectedTotal > 0 && this.bidPrice > 0 && this.bidPrice < expectedTotal * 0.1) {
          this.bidPrice = expectedTotal;
        }

        // Baseline for profitability should represent build cost, not client bid.
        this.baselineCost =
          this.costToBuild || Number(summary.directSubtotal || 0);
        this.overheadAndProfit = Number(summary.overhead || 0);
        this.contingency = Number(summary.contingency || 0);
        this.escalation = Number(summary.escalation || 0);
        this.taxes = Number(summary.taxes || 0);

          this.calculateProfitMetrics();
        }
      })
      .catch(() => {
        this.loadedCostSummary = null;
        // keep cached values; just stop loading state
      })
      .finally(() => {
        this.isFinancialLoading = false;
      });

    this.bidsService.getBidsForJob(jobId).subscribe({
      next: (bids) => {
        this.bidsReceived = bids ? bids.length : 0;
        if (bids) {
          this.pendingResponseCount = bids.filter(
            (b) => b.status === 'Pending',
          ).length;
          // TODO: derive invited counts from bids or if we need another endpoint
          this.invitedPlatformCount = bids.length;
        }

        this.saveToCache();
      },
      error: (err) => console.error('Failed to load bids', err),
    });
  }

  toggleExecutiveSummary(): void {
    this.executiveSummaryExpanded = !this.executiveSummaryExpanded;
  }

  get executiveSummary(): {
    overview: string;
    blueprintConfidence: { overallConfidence: number };
    keyHighlights: Array<{ label: string; value: string; note: string }>;
    riskFactors: Array<{
      risk: string;
      description: string;
      severity: 'high' | 'medium';
    }>;
    strategicAnalysis: {
      opportunities: string[];
      risks: string[];
      implications: string[];
    };
    topPriorities: string[];
    executiveRecommendation: string;
  } {
    const summary =
      this.loadedExecutiveSummary ||
      this.projectDetails?.executiveSummary ||
      this.projectDetails?.scopeExecutiveSummary ||
      this.projectDetails?.preliminaryScope?.executiveSummary ||
      null;

    return {
      overview: String(summary?.overview || ''),
      blueprintConfidence: {
        overallConfidence: Number(
          summary?.blueprintConfidence?.overallConfidence || 0,
        ),
      },
      keyHighlights: Array.isArray(summary?.keyHighlights)
        ? summary.keyHighlights
            .map((item: any) => {
              const label = String(item?.label || '');
              const rawValue = String(item?.value || '');
              const rawNote = String(item?.note || '');
              const normalizedLabel = label
                .toLowerCase()
                .replace(/[*_`]/g, '')
                .replace(/[^a-z0-9]+/g, '')
                .trim();

              return {
                label,
                value: this.formatMoneyInText(rawValue),
                note: this.formatMoneyInText(rawNote),
              };
            })
            .filter((item: any) => item.label || item.value || item.note)
        : [],
      riskFactors: Array.isArray(summary?.riskFactors)
        ? summary.riskFactors
            .map((item: any) => ({
              risk: String(item?.risk || ''),
              description: String(item?.description || ''),
              severity:
                String(item?.severity || '').toLowerCase() === 'high'
                  ? 'high'
                  : 'medium',
            }))
            .filter((item: any) => item.risk || item.description)
        : [],
      strategicAnalysis: {
        opportunities: Array.isArray(summary?.strategicAnalysis?.opportunities)
          ? summary.strategicAnalysis.opportunities
              .map((item: any) => String(item || '').trim())
              .filter(Boolean)
          : [],
        risks: Array.isArray(summary?.strategicAnalysis?.risks)
          ? summary.strategicAnalysis.risks
              .map((item: any) => String(item || '').trim())
              .filter(Boolean)
          : [],
        implications: Array.isArray(summary?.strategicAnalysis?.implications)
          ? summary.strategicAnalysis.implications
              .map((item: any) => String(item || '').trim())
              .filter(Boolean)
          : [],
      },
      topPriorities: Array.isArray(summary?.topPriorities)
        ? summary.topPriorities
            .map((item: any) => String(item || '').trim())
            .filter(Boolean)
        : [],
      executiveRecommendation: String(summary?.executiveRecommendation || ''),
    };
  }

  calculateBudgetStats(items: any[]): void {
    if (!items || items.length === 0) {
      this.spentToDate = Number(
        this.projectDetails?.actualCost || this.projectDetails?.spentToDate || 0,
      );
      // If no detailed budget line-items exist yet, use the best-known overall budget.
      // Keep activeValue in sync so the hero card doesn't drop to $0.
      const fallbackBudget = this.overallBudgetValue;
      if (fallbackBudget > 0) {
        this.activeValue = fallbackBudget;
      }

      this.remainingBudget = this.overallBudgetValue - this.spentToDate;
      this.calculateProfitMetrics();
      return;
    }

    const estimatedFromBudget = items.reduce(
      (sum, item) => sum + (item.estimatedCost || 0),
      0,
    );

    this.activeValue = estimatedFromBudget;

    this.spentToDate = items.reduce((sum, item) => {
      const actual = Number(
        item.actualCost ?? item.actual ?? item.spentToDate ?? 0,
      );
      return sum + (isNaN(actual) ? 0 : actual);
    }, 0);

    if (this.spentToDate <= 0) {
      this.spentToDate = Number(
        this.projectDetails?.actualCost || this.projectDetails?.spentToDate || 0,
      );
    }

    this.remainingBudget = this.activeValue - this.spentToDate;

    this.calculateProfitMetrics();

    // Cost by Division (Phase)
    const phaseMap = new Map<string, number>();
    items.forEach((item) => {
      const phase = item.phase || 'Unassigned';
      const current = phaseMap.get(phase) || 0;
      phaseMap.set(phase, current + (item.estimatedCost || 0));
    });

    this.costByPhase = Array.from(phaseMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4); // Top 4

    // Material vs Labour
    let materialCost = 0;
    let laborCost = 0;
    items.forEach((item) => {
      if (item.category === 'Materials')
        materialCost += item.estimatedCost || 0;
      if (item.category === 'Subcontractor')
        laborCost += item.estimatedCost || 0;
    });

    const totalCategorized = materialCost + laborCost;
    if (totalCategorized > 0) {
      this.materialPercent = Math.round(
        (materialCost / totalCategorized) * 100,
      );
      this.laborPercent = Math.round((laborCost / totalCategorized) * 100);
    }
  }

  calculateProfitMetrics(): void {
    // Baseline Cost should include Taxes as it's a hard cost
    const costBaseline = this.baselineCost + this.taxes;
    const budgetForProfit =
      this.costToBuild > 0
        ? this.costToBuild
        : this.activeValue > 0
          ? this.activeValue
          : this.overallBudgetValue;

    // If we have a baseline cost from the report, and the current tracked items (activeValue)
    // are significantly lower (e.g. data not fully imported), default to the baseline to show a realistic budget
    if (costBaseline > 0 && budgetForProfit < costBaseline) {
      this.remainingBudget = costBaseline - this.spentToDate;
    }

    if (this.bidPrice > 0) {
      this.grossProfit = this.bidPrice - budgetForProfit;
      this.profitMargin = (this.grossProfit / this.bidPrice) * 100;

      // Profit at Risk: If current estimated cost (activeValue) exceeds baseline
      if (costBaseline > 0) {
        this.profitAtRisk = Math.max(0, budgetForProfit - costBaseline);
      } else {
        // Fallback if no baseline: Assume 20% margin was target
        const targetCost = this.bidPrice / 1.2;
        this.profitAtRisk = Math.max(0, budgetForProfit - targetCost);
      }
    }
  }

  get overallBudgetValue(): number {
    const fromScopeTotal = Number(this.scopeTotalProjectCost || 0);
    if (fromScopeTotal > 0) return fromScopeTotal;

    const summary = this.scopeCostSummary || this.loadedCostSummary || null;
    const fromSummary = Number(summary?.suggestedBid || 0);
    if (fromSummary > 0) return fromSummary;

    const details: any = this.projectDetails as any;
    const fromProjectDetails = Number(
      details?.budget ||
        details?.projectBudget ||
        details?.totalProjectCost ||
        details?.totalBudget ||
        details?.estimatedBudget ||
        details?.suggestedBid ||
        details?.suggestedMarketBid ||
        details?.costAnalysis?.suggestedBid ||
        details?.costAnalysis?.suggestedMarketBid ||
        0,
    );
    if (fromProjectDetails > 0) return fromProjectDetails;

    const fromActive = Number(this.activeValue || 0);
    if (fromActive > 0) return fromActive;

    const fromBid = Number(this.bidPrice || 0);
    return fromBid > 0 ? fromBid : 0;
  }

  get overallRemainingBudget(): number {
    return this.overallBudgetValue - this.spentToDate;
  }

  get syncedSpentToDate(): number {
    // Keep this in sync with Scope Review behavior (currently pre-spend by default).
    return Number(this.projectDetails?.actualCost || this.projectDetails?.spentToDate || 0);
  }

  get syncedRemainingBudget(): number {
    return Math.max(0, this.overallBudgetValue - this.syncedSpentToDate);
  }

  get syncedBidPrice(): number {
    const override = Number(this.bidTotalPrice || 0);
    if (override > 0) return override;

    const summary = this.scopeCostSummary || this.loadedCostSummary || null;
    const marketBid = Number(summary?.suggestedMarketBid || 0);
    const projectCost = Number(summary?.suggestedBid || 0);
    if (projectCost > 0 || marketBid > 0) {
      return Math.max(projectCost, marketBid);
    }

    const direct = Number(this.bidPrice || 0);
    return direct > 0 ? direct : this.overallBudgetValue;
  }

  get syncedCostToBuild(): number {
    const fromBom = Number(this.scopeBomTotals?.directSubtotal || 0);
    if (fromBom > 0) return fromBom;

    const summary = this.scopeCostSummary || this.loadedCostSummary || null;
    const directSubtotal = Number(summary?.directSubtotal || 0);
    if (directSubtotal > 0) return directSubtotal;

    const material = Number(summary?.materialCost || 0);
    const labor = Number(summary?.laborCost || 0);
    const computed = material + labor;
    return computed > 0 ? computed : Number(this.costToBuild || 0);
  }

  get syncedGrossProfit(): number {
    return this.syncedBidPrice - this.syncedCostToBuild;
  }

  get syncedProfitMarginPercent(): number {
    const override = Number(this.bidNetProfitMarginPercent || 0);
    if (override > 0) return override;
    if (this.syncedBidPrice <= 0) return 0;

    const summary = this.scopeCostSummary || this.loadedCostSummary || null;
    const fullyLoadedCost =
      this.syncedCostToBuild +
      Number(summary?.overhead || 0) +
      Number(summary?.contingency || 0) +
      Number(summary?.escalation || 0) +
      Number(summary?.taxes || 0);
    const netProfit = this.syncedBidPrice - fullyLoadedCost;
    return (netProfit / this.syncedBidPrice) * 100;
  }

  get syncedExposureValue(): number {
    const summary = this.scopeCostSummary || this.loadedCostSummary || null;
    const contingency = Number(summary?.contingency || 0);
    return contingency > 0 ? contingency : Math.max(0, this.overallBudgetValue * 0.08);
  }

  get profitBreakdownTooltip(): string {
    const parts: string[] = [];
    if (this.overheadAndProfit > 0) {
      parts.push(
        `Net Profit: ${formatMoney(this.overheadAndProfit, true, 0)}`,
      );
    }
    if (this.taxes > 0) {
      parts.push(
        `Tax: ${formatMoney(this.taxes, true, 0)}`,
      );
    }
    if (this.contingency > 0) {
      parts.push(
        `Contingency: ${formatMoney(this.contingency, true, 0)}`,
      );
    }
    if (this.escalation > 0) {
      parts.push(
        `Escalation: ${formatMoney(this.escalation, true, 0)}`,
      );
    }
    if (parts.length > 0) {
      return parts.join(' | ');
    }
    return 'Gross Profit';
  }

  processTimelineData(): void {
    const summaryTimeline = this.extractExecutiveSummaryTimeline();
    if (summaryTimeline?.workingDays && summaryTimeline.workingDays > 0) {
      this.totalDuration = Math.max(1, Math.round(summaryTimeline.workingDays / 5));
    } else if (summaryTimeline?.weeks && summaryTimeline.weeks > 0) {
      this.totalDuration = Math.max(1, Math.round(summaryTimeline.weeks));
    }

    if (!this.timelineData || this.timelineData.length === 0) return;

    const allTasks = this.timelineData.flatMap((g) => g.subtasks);
    if (allTasks.length === 0) return;

    const startDates = allTasks
      .map((t) => new Date(t.startDate || t.start).getTime())
      .filter((d) => !isNaN(d));
    const endDates = allTasks
      .map((t) => new Date(t.endDate || t.end).getTime())
      .filter((d) => !isNaN(d));

    if (startDates.length > 0 && endDates.length > 0) {
      const minStart = Math.min(...startDates);
      this.projectStartDate = new Date(minStart);
      const maxEnd = Math.max(...endDates);

      // Total duration falls back to timeline only when summary duration is missing.
      const durationMs = maxEnd - minStart;
      if (!(summaryTimeline && (summaryTimeline.workingDays > 0 || summaryTimeline.weeks > 0))) {
        this.totalDuration = Math.max(
          1,
          Math.ceil(durationMs / (1000 * 60 * 60 * 24 * 7)),
        );
      }

      // Current Week
      const now = new Date().getTime();
      const elapsedMs = now - minStart;
      this.currentWeek =
        elapsedMs > 0 ? Math.ceil(elapsedMs / (1000 * 60 * 60 * 24 * 7)) : 0;
      this.displayWeek = this.currentWeek || 1;
    }

    // Outlook (Next 7 Days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    this.outlookTasks = allTasks
      .filter((t: any) => {
        const start = new Date(t.startDate || t.start);
        return start >= today && start <= nextWeek;
      })
      .slice(0, 3)
      .map((t: any) => ({
        name: t.name || t.task || 'Untitled Task',
        date: (t.startDate || t.start || '').toString(),
      }));

    // Tasks Behind Schedule
    this.behindScheduleCount = allTasks.filter((t) => {
      const end = new Date(t.endDate || t.end);
      return end < today && t.status !== 'completed' && !t.accepted;
    }).length;

    // Completed Tasks
    this.completedTasksCount = allTasks.filter(
      (t) => t.status === 'completed',
    ).length;

    // Calculate Task Summary Stats
    this.taskSummaryStats = {
      total: allTasks.length,
      complete: allTasks.filter(
        (t: any) => (t.status || '').toLowerCase() === 'completed',
      ).length,
      inProgress: allTasks.filter(
        (t: any) =>
          (t.status || '').toLowerCase() === 'in-progress' ||
          (t.status || '').toLowerCase() === 'active',
      ).length,
      pending: allTasks.filter(
        (t: any) => !t.status || (t.status || '').toLowerCase() === 'pending',
      ).length,
    };

    // Get Recent Tasks (Mocking logic for demo). TODO: Replace with real "recently updated" data
    this.recentTasks = allTasks
      .filter((t: any) => {
        const status = (t.status || '').toLowerCase();
        return (
          status === 'completed' ||
          status === 'in-progress' ||
          status === 'active' ||
          status === 'pending'
        );
      })
      .sort((a, b) => {
        // Sort by most recent start or end date
        const dateA = new Date(
          a.endDate || a.end || a.startDate || a.start,
        ).getTime();
        const dateB = new Date(
          b.endDate || b.end || b.startDate || b.start,
        ).getTime();
        return dateB - dateA;
      })
      .slice(0, 3)
      .map((t: any) => ({
        id: t.id ? `TSK-${t.id}` : `TSK-${Math.floor(Math.random() * 10000)}`,
        name: t.name || t.task,
        trade: t.category || t.trade || 'General',
        status: (t.status || 'pending').toLowerCase(),
        timestamp:
          (t.status || '').toLowerCase() === 'completed'
            ? 'Completed'
            : 'Ongoing',
      }));

    // Calculate Estimated Completion Date (Latest End Date)
    if (endDates.length > 0) {
      const maxEnd = Math.max(...endDates);
      this.estimatedCompletionDate = new Date(maxEnd);
    }

    // Check Weather Impact (Next 10 Days)
    this.checkWeatherRisk(allTasks);
  }

  private extractExecutiveSummaryTimeline(): {
    workingDays: number;
    weeks: number;
    months: number;
  } | null {
    const summary =
      this.loadedExecutiveSummary ||
      this.projectDetails?.executiveSummary ||
      this.projectDetails?.scopeExecutiveSummary ||
      this.projectDetails?.preliminaryScope?.executiveSummary ||
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

    if (workingDays > 0 || weeks > 0 || months > 0) {
      const resolvedWeeks =
        workingDays > 0
          ? workingDays / 5
          : months > 0
            ? months * 4.33
            : weeks > 0
              ? weeks
              : 0;
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

    return null;
  }

  checkWeatherRisk(tasks: any[]): void {
    if (!this.forecast || this.forecast.length === 0) {
      this.weatherRiskMessage = 'No Data';
      this.weatherRiskLevel = 'none';
      return;
    }

    // Filter tasks that are active in the next 10 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(today.getDate() + 10);
    tenDaysFromNow.setHours(23, 59, 59, 999);

    const activeTasks = tasks.filter((t) => {
      const start = new Date(t.startDate || t.start);
      const end = new Date(t.endDate || t.end);
      return (
        (start <= tenDaysFromNow && end >= today) || // Overlaps with next 10 days
        (start >= today && start <= tenDaysFromNow)
      );
    });

    if (activeTasks.length === 0) {
      this.weatherRiskMessage = 'None';
      this.weatherRiskLevel = 'none';
      return;
    }

    // Check against forecast
    let maxRiskLevel: 'none' | 'warning' | 'critical' = 'none';
    let riskDetails: string[] = [];

    // Simple forecast check first (any bad weather?)
    const adverseDays = this.forecast.filter(
      (day) =>
        day.condition.toLowerCase().includes('rain') ||
        day.condition.toLowerCase().includes('storm') ||
        day.condition.toLowerCase().includes('snow') ||
        day.precipitationProbability > 50,
    );

    if (adverseDays.length > 0) {
      const vulnerableTasks = activeTasks.filter((t) => {
        const name = (t.name || t.task || '').toLowerCase();
        return this.weatherImpactService.RAIN_AFFECTED_CATEGORIES.some((cat) =>
          name.includes(cat),
        );
      });

      if (vulnerableTasks.length > 0) {
        maxRiskLevel = 'warning';
        const taskNames = vulnerableTasks
          .map((t) => t.name || t.task)
          .slice(0, 2)
          .join(', ');
        riskDetails.push(
          `${adverseDays.length} bad weather days affecting ${taskNames}${vulnerableTasks.length > 2 ? '...' : ''}`,
        );
      } else {
        // Bad weather but maybe indoor tasks?
        if (adverseDays.length > 2) {
          maxRiskLevel = 'warning'; // General warning for travel/logistics
          riskDetails.push(`${adverseDays.length} days of adverse weather`);
        }
      }
    }

    if (maxRiskLevel === 'warning') {
      this.weatherRiskLevel = 'warning';
      this.weatherRiskMessage = riskDetails[0] || 'Potential Delays';

      // Populate Modal Data
      this.totalDelayDays = adverseDays.length; // Approximate delay
      const taskNames = [...new Set(activeTasks.map((t) => t.name || t.task))];
      this.affectedTasks = taskNames;

      // Estimated New Completion Date
      if (this.estimatedCompletionDate) {
        const newEndDate = new Date(this.estimatedCompletionDate);
        newEndDate.setDate(newEndDate.getDate() + this.totalDelayDays);
        this.adjustedCompletionDate = newEndDate;
      }
    } else {
      this.weatherRiskLevel = 'none';
      this.weatherRiskMessage = 'Low Risk';
    }
  }

  // --- Inline Editing Logic ---

  toggleEditProject(): void {
    if (this.isEditingProject) {
      // Reset if cancelling (optional, or just toggle off)
      this.tempProjectDetails = { ...this.projectDetails };
    }
    this.isEditingProject = !this.isEditingProject;
  }

  saveProject(): void {
    this.isLoading = true;
    this.jobsService
      .updateJob(this.tempProjectDetails, this.projectDetails.jobId)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.isEditingProject = false;
          // Update local state or reload
          this.projectDetails = {
            ...this.projectDetails,
            ...this.tempProjectDetails,
          };
          this.snackBar.open('Project details updated', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.snackBar.open('Failed to update project', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  toggleEditClient(): void {
    this.isEditingClient = !this.isEditingClient;
  }

  saveClient(): void {
    this.isLoading = true;
    this.jobsService
      .updateClientDetails(this.projectDetails.jobId, this.tempClientDetails)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.isEditingClient = false;
          this.clientName = `${this.tempClientDetails.firstName} ${this.tempClientDetails.lastName}`;
          this.clientEmail = this.tempClientDetails.email;
          this.clientPhone = this.tempClientDetails.phone;
          this.snackBar.open('Client details updated', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.snackBar.open('Failed to update client', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  // --- Weather Modal Logic ---

  openWeatherModal(): void {
    if (this.weatherRiskLevel === 'warning') {
      this.weatherModalOpen = true;
    }
  }

  closeWeatherModal(): void {
    this.weatherModalOpen = false;
  }

  adjustTimeline(): void {
    this.isLoading = true;
    const affectedGroups = new Set<string>();

    this.timelineData.forEach((group) => {
      group.subtasks.forEach((task) => {
        if (this.affectedTasks.includes(task.name || task.task || '')) {
          affectedGroups.add(group.title);
        }
      });
    });

    const senderId = this.authService.getUserId() || '';

    affectedGroups.forEach((groupTitle) => {
      const group = this.timelineData.find((g) => g.title === groupTitle);
      if (group) {
        const currentStart = new Date(group.startDate || new Date());
        const newStart = new Date(currentStart);
        newStart.setDate(newStart.getDate() + this.totalDelayDays);

        this.timelineService.moveGroup(
          groupTitle,
          newStart,
          this.projectDetails.jobId,
          senderId,
        );
      }
    });

    this.isLoading = false;
    this.weatherAdjusted = true;
    this.snackBar.open('Timeline adjusted and team notified.', 'Close', {
      duration: 3000,
    });
  }

  onOpenBudget(): void {
    this.navigateToTab.emit('budget');
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'bidding':
        return 'Bidding Phase';
      case 'live':
        return 'Live Project';
      case 'draft':
        return 'Draft';
      default:
        return status;
    }
  }

  onViewClick(id: string) {
    this.selectProject.emit(id);
  }

  onEditClick(id: string) {
    void id;
  }

  onDeleteClick(id: string) {
    void id;
  }

  onActivateClick(id: string) {
    void id;
  }

  // Carousel Logic
  get visibleProjects() {
    return this.projects.slice(this.currentIndex, this.currentIndex + 3);
  }

  nextProject() {
    if (this.currentIndex < this.projects.length - 3) {
      this.currentIndex++;
    }
  }

  prevProject() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  toggleProjectView(view: 'grid' | 'list') {
    this.projectView = view;
  }

  loadJob(id: any): void {
    this.jobDataService.navigateToJob({ jobId: id });
  }

  uploadThumbnail(event: { jobId: number; file: File }): void {
    this.projectService.uploadThumbnail(event.jobId, event.file).subscribe({
      next: () => {
        this.snackBar.open('Thumbnail uploaded successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        console.error('Thumbnail upload failed in project overview', err);
        this.snackBar.open(
          'Thumbnail upload failed. Please try again.',
          'Close',
          {
            duration: 4000,
          },
        );
      },
    });
  }

  archiveJob(jobId: number): void {
    this.archiveService.archiveJob(jobId).subscribe({
      next: () => {
        // Immediately remove from local array for instant UI update
        const beforeLength = this.projects.length;

        this.projects = this.projects.filter((p) => {
          const projectJobId = Number(p.jobId);
          return projectJobId !== jobId;
        });

        // Reset carousel index if needed to prevent empty view
        if (this.currentIndex >= this.projects.length - 2) {
          this.currentIndex = Math.max(0, this.projects.length - 3);
        }

        // Emit to parent so it can refresh from server (ensures consistency)
        this.jobArchived.emit(jobId);

        this.snackBar.open('Job archived successfully!', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        console.error('Failed to archive Job', err);
        alert(err?.error ?? 'Failed to archive Job');
      },
    });
  }

  openPermitsDialog(): void {
    const dialogRef = this.dialog.open(PermitsDialogComponent, {
      width: '90vw',
      maxWidth: '1600px',
      height: '90vh',
      maxHeight: '90vh',
      panelClass: 'full-screen-dialog',
      data: { jobId: this.projectDetails.jobId },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.checkPermitStatus(this.projectDetails.jobId);
    });
  }

  checkPermitStatus(jobId: number): void {
    this.permitsService.getPermits(jobId).subscribe({
      next: (permits) => {
        if (!permits || permits.length === 0) {
          this.permitStatus = 'none';
          this.permitStatusText = 'No Permits';
          return;
        }

        const expired = permits.some(
          (p) => p.status.toLowerCase() === 'expired',
        );
        const pending = permits.some(
          (p) => p.status.toLowerCase() === 'pending',
        );
        const allActive = permits.every(
          (p) =>
            p.status.toLowerCase() === 'active' ||
            p.status.toLowerCase() === 'approved',
        );

        if (expired) {
          this.permitStatus = 'warning';
          this.permitStatusText = 'Expired Permit';
        } else if (pending) {
          this.permitStatus = 'warning';
          this.permitStatusText = 'Pending Approval';
        } else if (allActive) {
          this.permitStatus = 'success';
          this.permitStatusText = 'All Approved';
        } else {
          this.permitStatus = 'none';
          this.permitStatusText = 'In Progress';
        }
      },
      error: () => {
        this.permitStatus = 'none';
        this.permitStatusText = 'Unknown';
      },
    });
  }

  get weeklyTasks() {
    if (
      !this.timelineData ||
      this.timelineData.length === 0 ||
      !this.projectStartDate
    )
      return [];

    const weekStartMs =
      this.projectStartDate.getTime() +
      (this.displayWeek - 1) * 7 * 24 * 60 * 60 * 1000;
    const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;

    const allTasks = this.timelineData.flatMap((g) => g.subtasks);

    return allTasks
      .filter((t: any) => {
        const start = new Date(t.startDate || t.start).getTime();
        const end = new Date(t.endDate || t.end).getTime();
        // Check for overlap
        return start < weekEndMs && end >= weekStartMs;
      })
      .map((t: any) => ({
        ...t,
        status: t.status === 'in_progress' ? 'in-progress' : t.status, // Normalize
        trade: t.category || 'General',
        assignee:
          t.assignees && t.assignees.length
            ? t.assignees[0].name
            : 'Unassigned',
        hours: this.calculateHours(t.startDate || t.start, t.endDate || t.end),
      }));
  }

  get weeklyStats() {
    const tasks = this.weeklyTasks;
    const total = tasks.length;
    const complete = tasks.filter(
      (t) => (t.status || '').toLowerCase() === 'completed',
    ).length;
    const inProgress = tasks.filter(
      (t) =>
        (t.status || '').toLowerCase() === 'in-progress' ||
        (t.status || '').toLowerCase() === 'active',
    ).length;
    const pending = total - complete - inProgress;
    const hours = tasks.reduce((sum, t) => sum + t.hours, 0);

    return { total, complete, inProgress, pending, hours };
  }

  nextWeek() {
    if (this.displayWeek < this.totalDuration) {
      this.displayWeek++;
    }
  }

  prevWeek() {
    if (this.displayWeek > 1) {
      this.displayWeek--;
    }
  }

  openTaskDetail(task: any) {
    const dialogRef = this.dialog.open(TaskDetailDialogComponent, {
      width: '600px',
      panelClass: 'custom-modal',
      data: {
        task: task,
        isOwner: true, // HARDCODED: setting viewer as owner for now, check authService
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Update local task data with result
        Object.assign(task, result);
        this.subtaskService.updateSubtask(task);
      }
    });
  }

  private calculateHours(start: string | Date, end: string | Date): number {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const hours = (e - s) / (1000 * 60 * 60);
    return Math.max(0, Math.round(hours));
  }

  get currentDivisionStats() {
    let items = this.budgetItems;
    let name = 'All Divisions';
    let total = this.activeValue;

    if (this.selectedDivision !== 'all' && this.selectedDivision) {
      items = this.budgetItems.filter((i) => i.phase === this.selectedDivision);
      name = this.selectedDivision;
      total = items.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
    }

    if (total === 0) {
      return {
        name,
        amount: 0,
        pct: '0%',
        materials: 0,
        labor: 0,
      };
    }

    const materials = items
      .filter((i) => i.category === 'Materials')
      .reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
    const labor = items
      .filter((i) => i.category === 'Subcontractor')
      .reduce((sum, i) => sum + (i.estimatedCost || 0), 0);

    return {
      name,
      amount: total,
      pct:
        this.activeValue > 0
          ? Math.round((total / this.activeValue) * 100) + '%'
          : '0%',
      materials: Math.round((materials / total) * 100),
      labor: Math.round((labor / total) * 100),
      materialAmount: materials,
      laborAmount: labor,
    };
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

  getAreaInSqM(areaStr: any): string {
    const parsed = this.parseAreaWithUnit(areaStr);
    if (!parsed || parsed.value <= 0) return '0';

    let sqFt = parsed.value;
    if (parsed.unit === 'sqm') {
      sqFt = parsed.value * 10.7639;
    } else if (parsed.unit === 'unknown' && parsed.value <= 80) {
      // Typical room-size heuristic: small unlabeled values are usually m² in reports.
      sqFt = parsed.value * 10.7639;
    }

    return (sqFt * 0.092903).toFixed(1);
  }

  private formatMoneyInText(text: string): string {
    if (!text) return text;

    // Convert comma-grouped currency values to space-grouped style.
    return text.replace(
      /(?:\$|\bZAR\b|\bR\b)\s*((?:\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?)/gi,
      (match, amountStr) => {
        const numericValue = parseFloat(String(amountStr).replace(/,/g, ''));
        if (!isNaN(numericValue) && numericValue > 0) {
          return formatMoney(numericValue, true, 2);
        }
        return match;
      },
    );
  }

  private normalizeNumericText(raw: string): string {
    const compact = raw.replace(/\s/g, '');
    const hasComma = compact.includes(',');
    const hasDot = compact.includes('.');

    if (hasComma && hasDot) {
      // Assume commas are thousands separators.
      return compact.replace(/,/g, '');
    }

    if (hasComma && !hasDot) {
      // If comma is likely decimal separator, convert to dot.
      if (/,(\d{1,2})$/.test(compact)) {
        return compact.replace(',', '.');
      }
      // Otherwise treat as thousands separator.
      return compact.replace(/,/g, '');
    }

    return compact;
  }

  private parseAreaWithUnit(input: any): { value: number; unit: 'sqft' | 'sqm' | 'unknown' } | null {
    if (input == null) return null;
    const raw = String(input).trim();
    if (!raw) return null;

    const lower = raw.toLowerCase();
    const unit: 'sqft' | 'sqm' | 'unknown' = /\bm²\b|\bm2\b|\bsqm\b|\bsq m\b/.test(lower)
      ? 'sqm'
      : /\bsq\s*ft\b|\bsqft\b|\bft²\b|\bft2\b/.test(lower)
        ? 'sqft'
        : 'unknown';

    const numericText = this.normalizeNumericText(raw).replace(/[^0-9.-]/g, '');
    const value = Number.parseFloat(numericText);
    if (!Number.isFinite(value)) return null;

    return { value, unit };
  }

  private normalizeUnderRoofAreaToSqFt(rawArea: any): number | null {
    const parsed = this.parseAreaWithUnit(rawArea);
    if (!parsed || parsed.value <= 0) return null;

    if (parsed.unit === 'sqm') {
      return parsed.value * 10.7639;
    }

    if (parsed.unit === 'sqft') {
      return parsed.value;
    }

    // Heuristic for unlabeled numeric values from report extraction:
    // <= 500 is very likely m², otherwise sq ft.
    return parsed.value <= 500 ? parsed.value * 10.7639 : parsed.value;
  }

  private computeRoomsTotalSqFt(
    rooms: Array<{ name: string; area: string }>,
  ): number {
    return (rooms || []).reduce((sum, room) => {
      const parsed = this.parseAreaWithUnit(room?.area);
      if (!parsed || parsed.value <= 0) return sum;

      let sqFt = parsed.value;
      if (parsed.unit === 'sqm') {
        sqFt = parsed.value * 10.7639;
      } else if (parsed.unit === 'unknown' && parsed.value <= 80) {
        // Typical room-area values in m² are small (e.g. 12, 27.5, 40).
        sqFt = parsed.value * 10.7639;
      }

      return sum + sqFt;
    }, 0);
  }
}
