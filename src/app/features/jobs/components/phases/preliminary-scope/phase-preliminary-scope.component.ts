import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  TimelineComponent,
  TimelineGroup,
} from '../../../../../components/timeline/timeline.component';
import { ConstructionPhasesComponent } from '../../construction-phases/construction-phases.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { ProjectBlueprintViewerComponent } from '../../../../../components/project-blueprint-viewer/project-blueprint-viewer.component';
import { UploadedFileInfo } from '../../../../../services/file-upload.service';
import { JobsService } from '../../../../../services/jobs.service';
import { LucideIconsModule } from '../../../../../shared/lucide-icons.module';
import {
  PhaseNavigationHeaderComponent,
  PhaseReportRequestType,
} from '../shared/phase-navigation-header.component';
import { ReportService } from '../../../services/report.service';
import { JobTeamComponent } from '../../job-team/job-team.component';
import { JobUser } from '../../../job-assignment/job-assignment.model';
import { firstValueFrom } from 'rxjs';
import { MoneyPipe, MoneyInTextPipe, formatMoney } from '../../../../../shared/pipes/money.pipe';

type ScopeTab = 'overview' | 'timeline' | 'blueprints';

@Component({
  selector: 'app-phase-preliminary-scope',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideIconsModule,
    PhaseNavigationHeaderComponent,
    TimelineComponent,
    ConstructionPhasesComponent,
    MatExpansionModule,
    MatDividerModule,
    ProjectBlueprintViewerComponent,
    JobTeamComponent,
    MoneyPipe,
    MoneyInTextPipe,
  ],
  templateUrl: './phase-preliminary-scope.component.html',
  styleUrl: './phase-preliminary-scope.component.scss',
})
export class PhasePreliminaryScopeComponent implements OnChanges {
  @Input() projectDetails: any;
  @Input() stageDisplayMode: 'stage' | 'live' = 'stage';
  @Input() canUseLiveStageView = true;
  @Input() liveStageTemplate: TemplateRef<any> | null = null;
  @Input() scopeCostSummary: any = null;
  @Input() scopeTotalProjectCost: number | null = null;
  @Input() timelineGroups: TimelineGroup[] = [];
  @Input() constructionPhaseGroups: any[] = [];
  @Input() blueprintFiles: UploadedFileInfo[] = [];
  @Input() selectedBlueprint: UploadedFileInfo | null = null;
  @Input() blueprintPdfSrc: string | Uint8Array | null = null;
  @Input() isLoadingBlueprints = false;
  @Input() isReportLoading = false;
  @Input() showEnvironmentalReport = true;
  @Input() isProjectOwner = false;
  @Input() assignedTeamMembers: JobUser[] = [];

  @Output() setDisplayMode = new EventEmitter<'stage' | 'live'>();
  @Output() overallBudgetClick = new EventEmitter<void>();
  @Output() overallTimelineClick = new EventEmitter<void>();
  @Output() bidPriceClick = new EventEmitter<void>();
  @Output() blueprintSelected = new EventEmitter<UploadedFileInfo>();
  @Output() jobGranted = new EventEmitter<void>();
  @Output() backToSetup = new EventEmitter<void>();
  @Output() discardProject = new EventEmitter<void>();
  @Output() proceedToDetailedEstimating = new EventEmitter<void>();
  @Output() documentsRequested = new EventEmitter<void>();
  @Output() reportRequested = new EventEmitter<PhaseReportRequestType>();
  @Output() refreshTeamRequested = new EventEmitter<void>();

  activeTab: ScopeTab = 'overview';
  internalTeamOpen = true;
  executiveSummaryExpanded = true;
  isEditingProject = false;
  isEditingClient = false;
  isSummaryLoading = false;
  private lastLoadedJobId: string | null = null;
  private loadedExecutiveSummary: any = null;
  private loadedCostSummary: any = null;
  private loadedBlueprintIntelligence: any = null;
  private loadedJob: any = null;
  private loadedClient: any = null;

  constructor(
    private readonly reportService: ReportService,
    private readonly jobsService: JobsService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectDetails']) {
      this.loadScopeAnalysis();
    }
  }

  tempProjectDetails = {
    projectName: '',
    address: '',
    jobType: '',
  };

  tempClientDetails = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  };

  get executiveSummary(): {
    overview: string;
    blueprintConfidence: { overallConfidence: number };
    keyHighlights: Array<{ label: string; value: string; note: string }>;
    riskFactors: Array<{ risk: string; description: string; severity: 'high' | 'medium' }>;
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

    const keyHighlights = Array.isArray(summary?.keyHighlights)
      ? summary.keyHighlights.map((item: any) => {
          const label = String(item?.label || '');
          let value = String(item?.value || '');
          let note = String(item?.note || '');

          // Format money values - convert comma-separated to space-separated
          value = this.formatMoneyInText(value);
          note = this.formatMoneyInText(note);

          return { label, value, note };
        })
      : [];

    const riskFactors = Array.isArray(summary?.riskFactors)
      ? summary.riskFactors
          .map((item: any) => ({
            risk: String(item?.risk || ''),
            description: String(item?.description || ''),
            severity: String(item?.severity || '').toLowerCase() === 'high' ? 'high' : 'medium',
          }))
          .filter((item: any) => item.risk || item.description)
      : [];

    return {
      overview: String(summary?.overview || ''),
      blueprintConfidence: {
        overallConfidence: Number(summary?.blueprintConfidence?.overallConfidence || 0),
      },
      keyHighlights,
      riskFactors,
      strategicAnalysis: {
        opportunities: Array.isArray(summary?.strategicAnalysis?.opportunities)
          ? summary.strategicAnalysis.opportunities.map((item: any) => String(item || '').trim()).filter(Boolean)
          : [],
        risks: Array.isArray(summary?.strategicAnalysis?.risks)
          ? summary.strategicAnalysis.risks.map((item: any) => String(item || '').trim()).filter(Boolean)
          : [],
        implications: Array.isArray(summary?.strategicAnalysis?.implications)
          ? summary.strategicAnalysis.implications.map((item: any) => String(item || '').trim()).filter(Boolean)
          : [],
      },
      topPriorities: Array.isArray(summary?.topPriorities)
        ? summary.topPriorities.map((item: any) => String(item || '').trim()).filter(Boolean)
        : [],
      executiveRecommendation: String(summary?.executiveRecommendation || ''),
    };
  }

  private async loadScopeAnalysis(): Promise<void> {
    const jobId = String(this.projectDetails?.jobId || this.projectDetails?.id || '').trim();
    if (!jobId || jobId === this.lastLoadedJobId) return;

    this.isSummaryLoading = true;

    try {
      const [summary, cost, blueprint, job, client] = await Promise.all([
        this.reportService.getExecutiveSummaryData(jobId),
        this.reportService.getDetailedCostSummary(jobId),
        this.reportService.getBlueprintIntelligence(jobId),
        firstValueFrom(this.jobsService.getSpecificJob(jobId)),
        firstValueFrom(this.jobsService.getClientDetails(Number(jobId))),
      ]);

      this.loadedExecutiveSummary = summary;
      this.loadedCostSummary = cost;
      this.loadedBlueprintIntelligence = blueprint;
      this.loadedJob = job;
      this.loadedClient = client;
      this.lastLoadedJobId = jobId;
    } catch {
      this.loadedExecutiveSummary = null;
      this.loadedCostSummary = null;
      this.loadedBlueprintIntelligence = null;
      this.loadedJob = null;
      this.loadedClient = null;
      // Allow retry on the next change detection / re-entry.
      this.lastLoadedJobId = null;
    } finally {
      this.isSummaryLoading = false;
    }
  }

  setActiveTab(tab: ScopeTab): void {
    this.activeTab = tab;
  }

  toggleExecutiveSummary(): void {
    this.executiveSummaryExpanded = !this.executiveSummaryExpanded;
  }

  /**
   * Find and reformat all money values in a text string.
   * Converts comma-separated dollar amounts (e.g., $1,234.56) to space-separated (e.g., $1 234.56).
   */
  private formatMoneyInText(text: string): string {
    if (!text) return text;

    // Match dollar amounts with commas: $1,234.56 or $12,345.67
    return text.replace(/\$([\d,]+(?:\.\d{2})?)/g, (match, amountStr) => {
      const numericValue = parseFloat(amountStr.replace(/,/g, ''));
      if (!isNaN(numericValue) && numericValue > 0) {
        return formatMoney(numericValue, true, 2);
      }
      return match; // Return original if can't parse
    });
  }

  toggleEditProject(): void {
    if (!this.isEditingProject) {
      this.tempProjectDetails = {
        projectName: this.projectDetails?.projectName || '',
        address:
          this.projectDetails?.address ||
          this.projectDetails?.jobAddress?.formatted_address ||
          '',
        jobType: this.projectDetails?.jobType || '',
      };
    }
    this.isEditingProject = !this.isEditingProject;
  }

  saveProject(): void {
    this.projectDetails = {
      ...this.projectDetails,
      projectName: this.tempProjectDetails.projectName,
      address: this.tempProjectDetails.address,
      jobType: this.tempProjectDetails.jobType,
    };
    this.isEditingProject = false;
  }

  toggleEditClient(): void {
    if (!this.isEditingClient) {
      const fullName = this.clientName;
      const [firstName, ...rest] = String(fullName).split(' ');
      this.tempClientDetails = {
        firstName: firstName || '',
        lastName: rest.join(' '),
        email: this.clientEmail,
        phone: this.clientPhone,
      };
    }
    this.isEditingClient = !this.isEditingClient;
  }

  saveClient(): void {
    this.projectDetails = {
      ...this.projectDetails,
      clientName: `${this.tempClientDetails.firstName} ${this.tempClientDetails.lastName}`.trim(),
      clientEmail: this.tempClientDetails.email,
      clientPhone: this.tempClientDetails.phone,
    };
    this.isEditingClient = false;
  }

  get overallBudgetValue(): number {
    const fromParent = Number(this.scopeTotalProjectCost || 0);
    if (fromParent > 0) return fromParent;

    const totalProjectCost = Number(
      this.scopeCostSummary?.suggestedBid || this.loadedCostSummary?.suggestedBid || 0,
    );
    if (totalProjectCost > 0) return totalProjectCost;

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
    return fromProjectDetails > 0 ? fromProjectDetails : 0;
  }

  get spentToDate(): number {
    return 0;
  }

  get overallRemainingBudget(): number {
    return Math.max(0, this.overallBudgetValue - this.spentToDate);
  }

  get overallBudgetProgressPercent(): number {
    if (this.overallBudgetValue <= 0) return 0;
    return Math.max(0, Math.min(100, (this.spentToDate / this.overallBudgetValue) * 100));
  }

  get bidPriceValue(): number {
    const direct = Number(this.projectDetails?.bidPrice || 0);
    if (direct > 0) return direct;
    const marketBid = Number(this.loadedCostSummary?.suggestedMarketBid || 0);
    const projectCost = Number(this.loadedCostSummary?.suggestedBid || 0);
    if (projectCost > 0 || marketBid > 0) {
      return Math.max(projectCost, marketBid);
    }
    const suggested = Number(
      this.loadedCostSummary?.suggestedBid ||
        this.loadedCostSummary?.suggestedMarketBid ||
      this.projectDetails?.suggestedBid ||
        this.projectDetails?.suggestedMarketBid ||
        this.projectDetails?.costAnalysis?.suggestedBid ||
        0,
    );
    if (suggested > 0) return suggested;
    return this.overallBudgetValue;
  }

  get bidCostToBuild(): number {
    const directSubtotal = Number(this.loadedCostSummary?.directSubtotal || 0);
    if (directSubtotal > 0) return directSubtotal;
    return this.overallBudgetValue;
  }

  get bidGrossProfit(): number {
    return this.bidPriceValue - this.bidCostToBuild;
  }

  get bidProfitMarginPercent(): number {
    if (this.bidPriceValue <= 0) return 0;
    return (this.bidGrossProfit / this.bidPriceValue) * 100;
  }

  get bidExposureValue(): number {
    const contingency = Number(this.loadedCostSummary?.contingency || 0);
    return contingency > 0 ? contingency : Math.max(0, this.overallBudgetValue * 0.08);
  }

  get totalDurationWeeks(): number {
    const range = this.getTimelineDateRange();
    if (!range) {
      const explicit = Number(
        this.projectDetails?.projectDurationWeeks ||
          this.projectDetails?.durationWeeks ||
          this.projectDetails?.timeline?.durationWeeks ||
          0,
      );
      return explicit > 0 ? explicit : 0;
    }

    const days = Math.max(
      7,
      Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)),
    );
    return Math.max(1, Math.ceil(days / 7));
  }

  get currentWeek(): number {
    // In preliminary scope review, timeline progress should always be pre-start.
    return 0;
  }

  get timelineProgressPercent(): number {
    if (this.totalDurationWeeks <= 0) return 0;
    return Math.max(0, Math.min(100, (this.currentWeek / this.totalDurationWeeks) * 100));
  }

  get estimatedCompletionDate(): Date {
    const fallbackStartRaw =
      this.projectDetails?.desiredStartDate ??
      this.projectDetails?.DesiredStartDate ??
      this.projectDetails?.date ??
      null;

    const start = this.getTimelineDateRange()?.start || (fallbackStartRaw ? new Date(fallbackStartRaw) : null);
    if (!start || isNaN(start.getTime())) {
      return new Date(Date.now() + this.totalDurationWeeks * 7 * 24 * 60 * 60 * 1000);
    }
    return new Date(start.getTime() + this.totalDurationWeeks * 7 * 24 * 60 * 60 * 1000);
  }

  private getTimelineDateRange(): { start: Date; end: Date } | null {
    if (!this.timelineGroups?.length) return null;

    const ranges = this.timelineGroups.flatMap((group) => {
      const subtaskRanges = (group.subtasks || []).flatMap((task) => {
        const start = task.start ? new Date(task.start) : task.startDate ? new Date(task.startDate) : null;
        const end = task.end ? new Date(task.end) : task.endDate ? new Date(task.endDate) : null;
        return start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())
          ? [{ start, end }]
          : [];
      });

      if (subtaskRanges.length > 0) return subtaskRanges;

      const start = group.startDate ? new Date(group.startDate) : null;
      const end = group.endDate ? new Date(group.endDate) : null;
      return start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())
        ? [{ start, end }]
        : [];
    });

    if (!ranges.length) return null;

    const minStart = Math.min(...ranges.map((range) => range.start.getTime()));
    const maxEnd = Math.max(...ranges.map((range) => range.end.getTime()));

    return {
      start: new Date(minStart),
      end: new Date(maxEnd),
    };
  }

  private getFirstTaskStartDate(): Date | null {
    if (!this.timelineGroups?.length) return null;

    const starts = this.timelineGroups
      .flatMap((group) => (group.subtasks || []).map((task) => {
        const start = task.start ? new Date(task.start) : task.startDate ? new Date(task.startDate) : null;
        return start && !isNaN(start.getTime()) ? start : null;
      }))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());

    return starts.length ? starts[0] : null;
  }

  get projectTotalArea(): number {
    const intelligenceArea = Number(this.loadedBlueprintIntelligence?.underRoofArea || 0);
    if (intelligenceArea > 0) return intelligenceArea;
    const parsed = Number(this.projectDetails?.buildingSize || this.projectDetails?.projectSize || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  get clientName(): string {
    if (this.loadedClient?.firstName || this.loadedClient?.lastName) {
      const fullName = `${this.loadedClient?.firstName || ''} ${this.loadedClient?.lastName || ''}`.trim();
      return this.loadedClient?.companyName ? `${fullName} (${this.loadedClient.companyName})` : fullName;
    }
    return this.projectDetails?.clientName || this.ownerName;
  }

  get clientEmail(): string {
    if (this.loadedClient?.email) return this.loadedClient.email;
    return this.projectDetails?.clientEmail || 'N/A';
  }

  get clientPhone(): string {
    if (this.loadedClient?.phone) return this.loadedClient.phone;
    return this.projectDetails?.clientPhone || 'N/A';
  }

  get blueprintConfidenceScore(): number {
    const intelligence = Number(this.loadedBlueprintIntelligence?.confidenceScore || 0);
    if (intelligence > 0) return Math.min(100, Math.round(intelligence));
    const score = Number(this.projectDetails?.blueprintConfidenceScore || this.projectDetails?.blueprintConfidence || 0);
    if (score > 0) return Math.min(100, Math.round(score));
    const summaryScore = Number(
      this.loadedExecutiveSummary?.blueprintConfidence?.overallConfidence ||
        this.projectDetails?.executiveSummary?.blueprintConfidence?.overallConfidence ||
        0,
    );
    return summaryScore > 0 ? Math.min(100, Math.round(summaryScore)) : 0;
  }

  get dimensionalAccuracy(): number {
    const intelligenceScore = Number(this.loadedBlueprintIntelligence?.dimensionalAccuracy || 0);
    if (intelligenceScore > 0) return Math.min(100, Math.round(intelligenceScore));
    const score = Number(this.projectDetails?.dimensionalAccuracy || 0);
    return score > 0 ? Math.min(100, Math.round(score)) : 0;
  }

  get completeness(): number {
    const intelligenceScore = Number(this.loadedBlueprintIntelligence?.completeness || 0);
    if (intelligenceScore > 0) return Math.min(100, Math.round(intelligenceScore));
    const score = Number(this.projectDetails?.completeness || 0);
    return score > 0 ? Math.min(100, Math.round(score)) : 0;
  }

  get readability(): number {
    const intelligenceScore = Number(this.loadedBlueprintIntelligence?.readability || 0);
    if (intelligenceScore > 0) return Math.min(100, Math.round(intelligenceScore));
    const score = Number(this.projectDetails?.readability || 0);
    return score > 0 ? Math.min(100, Math.round(score)) : 0;
  }

  onBlueprintSelected(file: UploadedFileInfo): void {
    this.blueprintSelected.emit(file);
  }

  get contractStatus(): string {
    if (this.loadedJob?.contractStatus) return this.loadedJob.contractStatus;
    return this.projectDetails?.contractStatus || this.projectDetails?.status || 'N/A';
  }

  get ownerName(): string {
    if (this.loadedJob?.user?.firstName || this.loadedJob?.user?.lastName) {
      return `${this.loadedJob?.user?.firstName || ''} ${this.loadedJob?.user?.lastName || ''}`.trim();
    }

    if (this.projectDetails?.ownerName) {
      return this.projectDetails.ownerName;
    }

    if (this.projectDetails?.firstName || this.projectDetails?.lastName) {
      return `${this.projectDetails?.firstName || ''} ${this.projectDetails?.lastName || ''}`.trim();
    }

    return 'N/A';
  }

  get budgetValue(): number {
    return Number(this.projectDetails?.budget || this.projectDetails?.projectBudget || 0);
  }

  get spentValue(): number {
    return Number(this.projectDetails?.actualCost || this.projectDetails?.spentToDate || 0);
  }

  get remainingValue(): number {
    const budget = this.budgetValue;
    const spent = this.spentValue;
    return budget > 0 ? Math.max(0, budget - spent) : 0;
  }
}

