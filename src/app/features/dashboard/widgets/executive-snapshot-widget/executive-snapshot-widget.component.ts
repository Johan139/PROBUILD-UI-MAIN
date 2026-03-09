import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Subject, forkJoin, of, switchMap, takeUntil, map, filter, take, from } from 'rxjs';
import { Project } from '../../../../models/project';
import { AuthService } from '../../../../authentication/auth.service';
import { ProjectService } from '../../../../services/project.service';
import { JobsService } from '../../../../services/jobs.service';
import { BudgetService } from '../../../jobs/services/budget.service';
import { ReportService } from '../../../jobs/services/report.service';
import { JobDataService } from '../../../jobs/services/job-data.service';
import { QuoteListItemDto, QuoteViewDto } from '../../../quote/quote.model';
import { QuoteService } from '../../../quote/quote.service';
import { Router } from '@angular/router';
import { Store } from '../../../../store/store.service';
import { SubtasksState } from '../../../../state/subtasks.state';
import { TimelineGroup } from '../../../../components/timeline/timeline.component';
import { TimelineService } from '../../../jobs/services/timeline.service';
import { WeatherImpactService } from '../../../jobs/services/weather-impact.service';
import { ForecastDay } from '../../../../services/weather.service';
import { JobAssignmentService } from '../../../jobs/job-assignment/job-assignment.service';
import { JobAssignment, JobUser } from '../../../jobs/job-assignment/job-assignment.model';
import { InvoiceService } from '../../../../services/invoice.service';
import { Invoice } from '../../../../models/invoice';

type StatusFilter = 'all' | 'live' | 'archived' | 'completed';

@Component({
  selector: 'app-executive-snapshot-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './executive-snapshot-widget.component.html',
  styleUrls: ['./executive-snapshot-widget.component.scss'],
})
export class ExecutiveSnapshotWidgetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private selectionSeq = 0;
  private quoteSeq = 0;
  private lastBudgetEstimated = 0;
  private lastBudgetActual = 0;
  isCostSummaryLoading = false;

  statusFilter: StatusFilter = 'all';

  projects: Project[] = [];
  currentProjectIndex = 0;

  isLoading = true;
  jobId: number | null = null;
  projectName = '—';
  statusLabel = 'Live';

  overallBudget = 0;
  spentToDate = 0;
  budgetUsedPct = 0;

  crews = 0;
  laborHours = 0;
  subDays = 0;

  receivables = 0;
  payables = 0;

  rfqs = 0;
  deliveries = 0;
  inspections = 0;

  riskMessage = 'No risks detected';
  riskType: 'none' | 'warning' | 'danger' = 'none';
  riskItems: string[] = [];
  riskExpanded = false;

  private timelineGroups: TimelineGroup[] = [];
  private forecast: ForecastDay[] = [];

  allQuotes: QuoteListItemDto[] = [];
  quoteCount = 0;
  quoteDocTypeLabel = '—';
  quoteStatusLabel = '—';
  quoteTotal: number | null = null;
  quoteDueDate: string | null = null;
  latestQuoteId: string | null = null;
  isQuoteLoading = false;

  constructor(
    private projectService: ProjectService,
    private jobsService: JobsService,
    private budgetService: BudgetService,
    private reportService: ReportService,
    private jobDataService: JobDataService,
    private authService: AuthService,
    private quoteService: QuoteService,
    private router: Router,
    private store: Store<SubtasksState>,
    private timelineService: TimelineService,
    private weatherImpactService: WeatherImpactService,
    private jobAssignmentService: JobAssignmentService,
    private invoiceService: InvoiceService,
  ) {}

  ngOnInit(): void {
    this.store
      .select((s) => s.forecast)
      .pipe(takeUntil(this.destroy$))
      .subscribe((forecast) => {
        this.forecast = (forecast ?? []) as ForecastDay[];
        this.deriveRiskState();
      });

    this.timelineService.timelineGroups$
      .pipe(
        takeUntil(this.destroy$),
        map((timelineGroups) => {
          const forecast = this.forecast;
          if (!forecast || forecast.length === 0) return timelineGroups;
          return this.weatherImpactService.applyWeatherImpact(timelineGroups, forecast);
        }),
      )
      .subscribe((processedTimelineGroups) => {
        this.timelineGroups = processedTimelineGroups ?? [];
        this.deriveRiskState();
      });

    this.authService.currentUser$
      .pipe(
        takeUntil(this.destroy$),
        filter((user) => !!user?.id),
        take(1),
      )
      .subscribe((user) => {
        const userId = user?.id;
        if (!userId) return;

        this.quoteService
          .getUserQuotes(String(userId))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (quotes) => {
              this.allQuotes = (quotes ?? []) as QuoteListItemDto[];
              if (this.jobId) this.updateQuoteSummary(this.jobId);
            },
            error: () => {
              this.allQuotes = [];
            },
          });
      });

    this.projectService.projects$
      .pipe(takeUntil(this.destroy$))
      .subscribe((projects) => {
        this.projects = projects ?? [];
        if (this.currentProjectIndex < 0) this.currentProjectIndex = 0;
        const max = Math.max(0, this.filteredProjects.length - 1);
        if (this.currentProjectIndex > max) this.currentProjectIndex = max;

        if (!this.jobId) {
          this.selectProjectByIndex(0);
        }
      });

    this.projectService.loadProjects();
  }

  private loadCrewCount(jobId: number, seq: number): void {
    this.jobAssignmentService
      .getJobAssignment()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assignments: JobAssignment[]) => {
          if (seq !== this.selectionSeq) return;
          const assignment = (assignments ?? []).find((a) => Number(a?.id) === Number(jobId));
          const members = (assignment?.jobUser ?? []) as JobUser[];
          if (!members.length) {
            this.crews = 0;
            return;
          }

          const isSubcontractor = (m: JobUser) =>
            String(m?.userType ?? '').toUpperCase() === 'SUBCONTRACTOR' ||
            String(m?.jobRole ?? '').toUpperCase() === 'SUBCONTRACTOR' ||
            String(m?.jobRole ?? '') === 'Subcontractor';

          const subcontractors = members.filter((m) => isSubcontractor(m));
          const internal = members.filter((m) => !isSubcontractor(m));

          this.crews = internal.length + subcontractors.length;
        },
        error: () => {
          if (seq !== this.selectionSeq) return;
          this.crews = 0;
        },
      });
  }

  private loadFinancialKpis(jobId: number, seq: number): void {
    this.receivables = this.deriveReceivablesFromQuotes(jobId);

    this.invoiceService
      .getInvoicesForJob(jobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invoices: Invoice[]) => {
          if (seq !== this.selectionSeq) return;
          const list = (invoices ?? []) as Invoice[];
          const isPaid = (inv: Invoice) => {
            const s = String((inv as any)?.status ?? '').trim().toUpperCase();
            return s === 'PAID' || s === 'PAYED' || s === 'SETTLED';
          };
          this.payables = list
            .filter((i) => !isPaid(i))
            .reduce((sum, i) => sum + Number((i as any)?.amount ?? 0), 0);
        },
        error: () => {
          if (seq !== this.selectionSeq) return;
          this.payables = 0;
        },
      });
  }

  private deriveReceivablesFromQuotes(jobId: number): number {
    const related = (this.allQuotes ?? []).filter((q) => Number(q?.jobId) === Number(jobId));
    if (!related.length) return 0;

    const isInvoice = (q: any) => String(q?.documentType ?? '').toUpperCase() === 'INVOICE';
    const isOutbound = (q: any) => String(q?.direction ?? '').toUpperCase() === 'OUTBOUND';
    const isExcluded = (q: any) => {
      const s = String(q?.status ?? '').toUpperCase();
      return s === 'REJECTED' || s === 'WITHDRAWN';
    };

    return related
      .filter((q) => isInvoice(q) && isOutbound(q) && !isExcluded(q))
      .reduce((sum, q) => sum + Number(q?.total ?? 0), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredProjects(): Project[] {
    const list = this.projects ?? [];

    const filtered = this.statusFilter === 'all'
      ? list
      : list.filter((p) => {
      const label = this.mapJobStatusToLabel(p?.status);
      if (this.statusFilter === 'live') return label === 'Live' || label === 'Bidding';
      if (this.statusFilter === 'archived') return label === 'Archived';
      if (this.statusFilter === 'completed') return label === 'Completed';
      return true;
    });

    const parseTs = (v: any): number => {
      if (!v) return 0;
      if (v instanceof Date) {
        const t = v.getTime();
        return Number.isFinite(t) ? t : 0;
      }
      const t = Date.parse(String(v));
      return Number.isFinite(t) ? t : 0;
    };

    const sortTs = (p: any): number => {
      return (
        parseTs(p?.createdAt) ||
        parseTs(p?.biddingStartDate) ||
        parseTs(p?.potentialStartDate) ||
        parseTs(p?.archivedAt) ||
        0
      );
    };

    return [...filtered].sort((a, b) => {
      const tb = sortTs(b);
      const ta = sortTs(a);
      if (tb !== ta) return tb - ta;
      return Number(b?.jobId ?? 0) - Number(a?.jobId ?? 0);
    });
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilter = filter;
    this.selectProjectByIndex(0);
  }

  prevProject(): void {
    this.selectProjectByIndex(this.currentProjectIndex - 1);
  }

  nextProject(): void {
    this.selectProjectByIndex(this.currentProjectIndex + 1);
  }

  private selectProjectByIndex(index: number): void {
    const seq = ++this.selectionSeq;
    const list = this.filteredProjects;
    if (!list.length) {
      this.jobId = null;
      this.projectName = '—';
      this.statusLabel = 'Live';
      this.updateQuoteSummary(null);
      this.resetKpis();
      this.isLoading = false;
      return;
    }

    const clamped = Math.min(Math.max(index, 0), list.length - 1);
    this.currentProjectIndex = clamped;
    const selected = list[clamped];
    const jobId = Number(selected?.jobId ?? 0);

    if (!jobId) {
      this.jobId = null;
      this.projectName = selected?.projectName ?? 'Project';
      this.updateQuoteSummary(null);
      this.resetKpis();
      this.isLoading = false;
      return;
    }

    this.jobId = jobId;
    this.projectName = selected?.projectName ?? 'Project';
    this.isLoading = true;
    this.isCostSummaryLoading = true;
    this.updateQuoteSummary(jobId);
    this.resetKpis();
    this.riskExpanded = false;

    this.loadCrewCount(jobId, seq);
    this.loadFinancialKpis(jobId, seq);

    this.jobDataService
      .fetchJobData({ jobId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {},
        error: () => {},
      });

    forkJoin({
      job: this.jobsService.getSpecificJob(jobId),
      budget: this.budgetService.getBudget(jobId),
      docs: this.jobsService.getJobDocuments(String(jobId)),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (seq !== this.selectionSeq) return;

          this.statusLabel = this.mapJobStatusToLabel(data.job?.status ?? selected?.status);

          const items = data.budget ?? [];
          const estimated = items.reduce(
            (sum: number, i: any) => sum + Number(i?.estimatedCost ?? 0),
            0,
          );
          const actual = items.reduce(
            (sum: number, i: any) => sum + Number(i?.actualCost ?? 0),
            0,
          );

          this.lastBudgetEstimated = estimated;
          this.lastBudgetActual = actual;

          this.overallBudget = estimated;
          this.spentToDate = actual;
          this.budgetUsedPct =
            estimated > 0 ? Math.min(100, Math.round((actual / estimated) * 100)) : 0;

          if (!(estimated > 0)) {
            this.applyBudgetFallbackFromQuoteTotal();
          }

          this.inspections = (data.docs ?? []).filter((d: any) =>
            String(d?.category ?? d?.type ?? '')
              .toLowerCase()
              .includes('inspection'),
          ).length;

          this.deriveRiskState();
          this.isLoading = false;
        },
        error: () => {
          if (seq !== this.selectionSeq) return;
          this.isLoading = false;
        },
      });

    from(this.reportService.getDetailedCostSummary(String(jobId)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (costSummary: any) => {
          if (seq !== this.selectionSeq) return;
          this.isCostSummaryLoading = false;
          const suggested = Number(costSummary?.suggestedBid ?? 0);
          if (!(suggested > 0)) return;

          this.overallBudget = suggested;
          const actual = Number(this.lastBudgetActual ?? 0);
          this.budgetUsedPct =
            suggested > 0 ? Math.min(100, Math.round((actual / suggested) * 100)) : 0;
          this.deriveRiskState();
        },
        error: () => {
          if (seq !== this.selectionSeq) return;
          this.isCostSummaryLoading = false;
        },
      });
  }

  private applyBudgetFallbackFromQuoteTotal(): void {
    const q = this.quoteTotal;
    if (!(typeof q === 'number' && Number.isFinite(q) && q > 0)) return;
    if (this.overallBudget > 0) return;

    this.overallBudget = q;
    const actual = Number(this.lastBudgetActual ?? 0);
    this.budgetUsedPct =
      q > 0 ? Math.min(100, Math.round((actual / q) * 100)) : 0;
  }

  private resetKpis(): void {
    this.overallBudget = 0;
    this.spentToDate = 0;
    this.budgetUsedPct = 0;

    this.crews = 0;
    this.laborHours = 0;
    this.subDays = 0;

    this.receivables = 0;
    this.payables = 0;

    this.rfqs = 0;
    this.deliveries = 0;
    this.inspections = 0;

    this.riskType = 'none';
    this.riskMessage = 'Loading…';
    this.riskItems = [];
  }

  toggleRiskExpanded(): void {
    if (this.riskType === 'none') return;
    if (!this.riskItems?.length) return;
    this.riskExpanded = !this.riskExpanded;
  }

  get hasMoreRiskItems(): boolean {
    return (this.riskItems?.length ?? 0) > 2;
  }

  openLatestQuote(): void {
    if (!this.latestQuoteId) return;
    this.router.navigate(['/quote'], { queryParams: { quoteId: this.latestQuoteId } });
  }

  private updateQuoteSummary(jobId: number | null): void {
    const qSeq = ++this.quoteSeq;
    if (!jobId) {
      this.quoteCount = 0;
      this.quoteDocTypeLabel = '—';
      this.quoteStatusLabel = '—';
      this.quoteTotal = null;
      this.quoteDueDate = null;
      this.latestQuoteId = null;
      this.isQuoteLoading = false;
      return;
    }

    const related = (this.allQuotes ?? []).filter((q) => Number(q?.jobId) === Number(jobId));
    this.quoteCount = related.length;

    if (!related.length) {
      this.quoteDocTypeLabel = '—';
      this.quoteStatusLabel = '—';
      this.quoteTotal = null;
      this.quoteDueDate = null;
      this.latestQuoteId = null;
      this.isQuoteLoading = false;
      return;
    }

    const parseCreated = (v: any) => {
      const t = Date.parse(String(v ?? ''));
      return Number.isFinite(t) ? t : 0;
    };

    const latest = [...related].sort((a, b) => parseCreated(b?.createdDate) - parseCreated(a?.createdDate))[0];
    this.latestQuoteId = latest?.id ?? null;

    this.quoteDocTypeLabel = latest?.documentType === 'INVOICE' ? 'Invoice' : 'Quote';
    this.quoteStatusLabel = this.mapQuoteStatusToLabel(latest?.status);
    this.quoteTotal = typeof latest?.total === 'number' ? latest.total : null;
    this.quoteDueDate = null;

    if (qSeq === this.quoteSeq) {
      this.applyBudgetFallbackFromQuoteTotal();
    }

    if (!this.latestQuoteId) return;

    this.isQuoteLoading = true;
    this.quoteService
      .getQuote(this.latestQuoteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (q: QuoteViewDto) => {
          if (qSeq !== this.quoteSeq) return;
          this.quoteDocTypeLabel = q?.documentType === 'INVOICE' ? 'Invoice' : 'Quote';
          this.quoteStatusLabel = this.mapQuoteStatusToLabel(q?.status);
          this.quoteTotal = Number(q?.version?.total ?? this.quoteTotal ?? 0);
          this.quoteDueDate = q?.version?.dueDate ?? null;
          this.applyBudgetFallbackFromQuoteTotal();
          this.isQuoteLoading = false;
        },
        error: () => {
          if (qSeq !== this.quoteSeq) return;
          this.isQuoteLoading = false;
        },
      });
  }

  private mapQuoteStatusToLabel(status: any): string {
    const s = String(status ?? '').toUpperCase();
    if (s === 'DRAFT') return 'Draft';
    if (s === 'SUBMITTED') return 'Submitted';
    if (s === 'APPROVED') return 'Approved';
    if (s === 'REJECTED') return 'Rejected';
    if (s === 'WITHDRAWN') return 'Withdrawn';
    return '—';
  }

  viewFullProject(): void {
    if (!this.jobId) return;
    this.jobDataService.navigateToJob({ jobId: this.jobId }, 'MM/dd/yyyy');
  }

  private deriveRiskState(): void {
    if (this.budgetUsedPct >= 90) {
      this.riskType = 'danger';
      this.riskMessage = `Budget overrun by ${this.budgetUsedPct}%`;
      return;
    }

    if (this.budgetUsedPct >= 75) {
      this.riskType = 'warning';
      this.riskMessage = 'Budget nearing limit';
      return;
    }

    const timelineRisk = this.deriveTimelineRisk();
    if (timelineRisk) {
      this.riskType = timelineRisk.type;
      this.riskMessage = timelineRisk.message;
      return;
    }

    this.riskType = 'none';
    this.riskMessage = 'No risks detected';
  }

  private deriveTimelineRisk(): { type: 'warning' | 'danger'; message: string } | null {
    const groups = this.timelineGroups ?? [];
    if (!groups.length) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dangerMessages: string[] = [];
    const warningMessages: string[] = [];

    const behindGroups = groups.filter((g) => g?.scheduleStatus === 'behind');
    if (behindGroups.length) {
      const title = behindGroups[0]?.title ?? 'timeline';
      dangerMessages.push(`Schedule behind: ${title}`);
    }

    const overdueTasks = groups
      .flatMap((g) => (g?.subtasks ?? []).map((t) => ({ group: g, task: t })))
      .filter(({ task }) => {
        const end = new Date(task?.endDate ?? (task as any)?.end);
        return end.getTime() < today.getTime() && Number(task?.progress ?? 0) < 100;
      });
    if (overdueTasks.length) {
      const title = overdueTasks[0]?.group?.title ?? 'timeline';
      warningMessages.push(`Overdue tasks in ${title}`);
    }

    const forecastRisk = this.deriveForecastWeatherRisk();
    if (forecastRisk) {
      warningMessages.push(forecastRisk.message);
    }

    const warningGroups = groups.filter((g: any) => !!g?.hasWeatherWarning);
    if (warningGroups.length) {
      const g0: any = warningGroups[0];
      const msg = g0?.weatherWarningMessage ? String(g0.weatherWarningMessage) : 'Potential weather delay';
      const base = msg.split('\n')[0] || msg;
      warningMessages.push(
        warningGroups.length > 1 ? `${base} (+${warningGroups.length - 1} more)` : base,
      );
    }

    const weatherWarnings = groups
      .flatMap((g) => (g?.subtasks ?? []).filter((t) => (t as any)?.hasWeatherWarning));
    if (weatherWarnings.length) {
      const sample = weatherWarnings[0] as any;
      const base = sample?.weatherWarningMessage
        ? String(sample.weatherWarningMessage)
        : 'Potential weather delay';
      warningMessages.push(
        weatherWarnings.length > 1 ? `${base} (+${weatherWarnings.length - 1} more)` : base,
      );
    }

    const all = [...dangerMessages, ...warningMessages].filter((m) => !!m);
    this.riskItems = all;
    if (!all.length) return null;

    const maxItems = 2;
    const shown = all.slice(0, maxItems);
    const overflow = all.length - shown.length;
    const combined = overflow > 0 ? `${shown.join(' | ')} (+${overflow} more)` : shown.join(' | ');
    return {
      type: dangerMessages.length ? 'danger' : 'warning',
      message: combined,
    };
  }

  private deriveForecastWeatherRisk(): { type: 'warning' | 'danger'; message: string } | null {
    const forecast = this.forecast ?? [];
    if (!forecast.length) return null;

    const adverseDays = forecast.filter(
      (day) =>
        String(day.condition ?? '').toLowerCase().includes('rain') ||
        String(day.condition ?? '').toLowerCase().includes('storm') ||
        String(day.condition ?? '').toLowerCase().includes('snow') ||
        Number(day.precipitationProbability ?? 0) > 50,
    );

    if (!adverseDays.length) return null;

    const tasks = (this.timelineGroups ?? []).flatMap((g: any) => g?.subtasks ?? []);
    if (!tasks.length) {
      return adverseDays.length > 2
        ? { type: 'warning', message: `${adverseDays.length} days of adverse weather` }
        : null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tenDaysFromNow = new Date(today);
    tenDaysFromNow.setDate(today.getDate() + 10);
    tenDaysFromNow.setHours(23, 59, 59, 999);

    const activeTasks = tasks.filter((t: any) => {
      const start = new Date(t.startDate || t.start);
      const end = new Date(t.endDate || t.end);
      return (
        (start <= tenDaysFromNow && end >= today) ||
        (start >= today && start <= tenDaysFromNow)
      );
    });

    if (!activeTasks.length) {
      return adverseDays.length > 2
        ? { type: 'warning', message: `${adverseDays.length} days of adverse weather` }
        : null;
    }

    const vulnerableTasks = activeTasks.filter((t: any) => {
      const name = String(t.name || t.task || '').toLowerCase();
      return this.weatherImpactService.RAIN_AFFECTED_CATEGORIES.some((cat) =>
        name.includes(String(cat).toLowerCase()),
      );
    });

    if (vulnerableTasks.length) {
      const taskNames = vulnerableTasks
        .map((t: any) => t.name || t.task)
        .slice(0, 2)
        .join(', ');
      return {
        type: 'warning',
        message: `${adverseDays.length} bad weather days affecting ${taskNames}${vulnerableTasks.length > 2 ? '...' : ''}`,
      };
    }

    if (adverseDays.length > 2) {
      return { type: 'warning', message: `${adverseDays.length} days of adverse weather` };
    }

    return null;
  }

  private mapJobStatusToLabel(status: any): string {
    const s = String(status ?? '').toUpperCase();
    if (s === 'LIVE' || s === 'ACTIVE' || s === 'IN_PROGRESS') return 'Live';
    if (s === 'BIDDING') return 'Bidding';
    if (s === 'COMPLETED') return 'Completed';
    if (s === 'ARCHIVED') return 'Archived';
    return 'Live';
  }
}
