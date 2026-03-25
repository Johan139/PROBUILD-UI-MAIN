import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { formatMoney } from '../../../../../shared/pipes/money.pipe';
import { MoneyPipe, MoneyInTextPipe } from '../../../../../shared/pipes/money.pipe';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule, DollarSign, Package, Sparkles, FileText, CheckCircle2, ChevronUp, ChevronDown, Download, Calculator, TrendingUp, RefreshCw, UploadIcon, X, Mail, Eye, FileCheck, Loader } from 'lucide-angular';
import { MatTabsModule } from '@angular/material/tabs';
import { BomService } from '../../../services/bom.service';
import { ReportService } from '../../../services/report.service';
import { JobsService } from '../../../../../services/jobs.service';
import { QuoteService } from '../../../../../features/quote/quote.service';
import { AuthService } from '../../../../../authentication/auth.service';
import { LocalStorageService } from '../../../../../services/local-storage.service';
import { QuoteDto, QuoteRowDto } from '../../../../../features/quote/quote.model';

@Component({
  selector: 'app-job-preliminary-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MatTabsModule, MatSnackBarModule, MoneyPipe, MoneyInTextPipe],
  templateUrl: './job-preliminary-view.component.html',
  styleUrls: ['./job-preliminary-view.component.scss']
})
export class JobPreliminaryViewComponent implements OnInit, OnChanges {
  @Input() projectDetails: any;
  @Output() jobGranted = new EventEmitter<void>();
  @Output() fullReportRequested = new EventEmitter<void>();

  private lastLoadedJobId: string | null = null;

  // State
  activeTab: 'budget' | 'procurement' | 'value-engineering' = 'budget';
  executiveSummaryExpanded = true;
  quoteGenerated = false;
  generatedQuoteId: string | null = null;
  generatedQuote: QuoteDto | null = null;
  isSending: boolean = false;
  revisionMode = false;
  revisionFile: File | null = null;
  expandedBomSections: string[] = [];
  veSelections: Record<string, boolean> = {};

  // Icons
  DollarSign = DollarSign;
  Package = Package;
  Sparkles = Sparkles;
  FileText = FileText;
  CheckCircle2 = CheckCircle2;
  ChevronUp = ChevronUp;
  ChevronDown = ChevronDown;
  Download = Download;
  Calculator = Calculator;
  TrendingUp = TrendingUp;
  RefreshCw = RefreshCw;
  UploadIcon = UploadIcon;
  X = X;
  Mail = Mail;
  Eye = Eye;
  FileCheck = FileCheck;
  Loader = Loader;

  executiveSummary: any = null;
  costAnalysis: any = null;
  billsOfMaterials: any = {};
  valueEngineering: any[] = [];
  procurement: any = { longLeadItems: [], criticalPath: [] };
  isLoading = true;
  isReportLoading = false;
  isGeneratingReport = false;
  reportHtml: string | null = null;
  reportTitle = 'Full Project Analysis Report';
  reportError: string | null = null;

  constructor(
    private bomService: BomService,
    private reportService: ReportService,
    private jobsService: JobsService,
    private quoteService: QuoteService,
    private authService: AuthService,
    private localStorageService: LocalStorageService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    if (this.projectDetails?.jobId) {
      this.loadData(this.projectDetails.jobId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['projectDetails']) {
      return;
    }

    const jobId = String(this.projectDetails?.jobId || '').trim();
    if (!jobId || jobId === this.lastLoadedJobId) {
      return;
    }

    this.loadData(jobId);
  }

  loadData(jobId: string) {
    if (jobId === this.lastLoadedJobId) {
      return;
    }

    this.lastLoadedJobId = jobId;
    this.isLoading = true;
    this.checkExistingQuote(jobId);

    const summary$ = this.reportService.getExecutiveSummaryData(jobId);
    const boms$ = this.bomService.getBillOfMaterials(jobId);
    const cost$ = this.reportService.getDetailedCostSummary(jobId);
    const procurement$ =
      this.reportService.getProcurementSchedulePreliminary(jobId);
    const veReport$ = this.reportService.getValueEngineeringReport(jobId);

    Promise.all([
      summary$,
      boms$.toPromise(),
      cost$,
      procurement$,
      veReport$,
    ]).then(([summary, boms, cost, procurement, veReport]) => {
      this.executiveSummary = summary;
      this.costAnalysis = cost;

      this.valueEngineering = veReport && veReport.length > 0 ? veReport : [];
      this.valueEngineering.forEach(
        (item) => (this.veSelections[item.id] = false),
      );

      this.hydrateExecutiveSummaryHighlights();
      this.cdr.detectChanges();

      if (boms && boms.length > 0 && boms[0].parsedReport) {
        this.processBoms(boms[0].parsedReport);
      }

      this.procurement = {
        longLeadItems: procurement || [],
        criticalPath: [],
      };

      this.isLoading = false;
    });
  }

  private hydrateExecutiveSummaryHighlights(): void {
    if (!this.executiveSummary?.keyHighlights?.length) {
      return;
    }

    this.executiveSummary.keyHighlights = this.executiveSummary.keyHighlights.map(
      (item: any) => {
        const label = (item?.label || '').toLowerCase();
        const valueRaw = String(item?.value || '');

        // Handle Total Project Cost from cost analysis
        if (label.includes('total project cost')) {
          const totalProjectCost =
            this.costAnalysis?.suggestedBid ||
            this.costAnalysis?.suggestedMarketBid ||
            this.costAnalysis?.totalCost ||
            0;

          return {
            ...item,
            value: totalProjectCost > 0 ? formatMoney(totalProjectCost, true, 2) : 'N/A',
          };
        }

        // Handle Project Duration - strip markdown
        if (label.includes('project duration')) {
          return {
            ...item,
            value: this.stripMarkdown(valueRaw || 'N/A'),
          };
        }

        // Handle Value Engineering Potential
        if (label.includes('value engineering')) {
          return {
            ...item,
            value:
              this.totalVePotentialSavings > 0
                ? formatMoney(this.totalVePotentialSavings, true, 2)
                : 'N/A',
          };
        }

        // Handle Total Estimated Bid Price
        if (label.includes('total estimated bid')) {
          const bidPrice =
            this.costAnalysis?.suggestedMarketBid ||
            this.costAnalysis?.suggestedBid ||
            0;
          return {
            ...item,
            value: bidPrice > 0 ? formatMoney(bidPrice, true, 2) : valueRaw,
          };
        }

        // Handle Cost Per Conditioned Sq Ft and similar cost metrics
        if (label.includes('cost per') || label.includes('per sq ft') || label.includes('per square foot')) {
          const costPerSqFt = this.costAnalysis?.costPerSqFt || 0;
          return {
            ...item,
            value: costPerSqFt > 0 ? formatMoney(costPerSqFt, true, 2) : valueRaw,
          };
        }

        // Generic: Detect and reformat any money value that has commas (API format)
        // Matches patterns like $936,940.59 or $12,345.67 with optional whitespace
        const moneyMatch = valueRaw.match(/^\s*\$([\d,]+(?:\.\d{2})?)\s*$/);
        if (moneyMatch) {
          const numericValue = parseFloat(moneyMatch[1].replace(/,/g, ''));
          if (!isNaN(numericValue) && numericValue > 0) {
            return {
              ...item,
              value: formatMoney(numericValue, true, 2),
            };
          }
        }

        // Also check and format money values in the note field
        if (item.note) {
          const noteFormatted = this.formatMoneyInText(String(item.note));
          if (noteFormatted !== item.note) {
            return {
              ...item,
              note: noteFormatted,
            };
          }
        }

        return item;
      },
    );
  }

  private stripMarkdown(text: string): string {
    return String(text)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
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

  processBoms(report: any) {
    report.sections.forEach((section: any) => {
      if (section.title && section.title.includes('Bill of Materials')) {
        const key = section.title.split(' - ')[0].replace(/\s+/g, '').toLowerCase(); // e.g. "Groundwork & Foundation" -> "groundwork&foundation"

        // Parse totals from the table if possible, or calculate
        let totalMat = 0;
        const materials = section.content
          .filter(
            (row: any[]) =>
              row[0] && !row[0].toLowerCase().includes('total') && row.length > 1,
          )
          .map((row: any[]) => {
            // | Item | Specification | Unit | Quantity | Unit Cost | Total Item Cost | ...
            // 0, 1, 2, 3, 4, 5
            const cost = parseFloat(row[5]?.replace(/[^0-9.]/g, '')) || 0;
            totalMat += cost;
            return {
              item: row[0],
              spec: row[1],
              unit: row[2],
              qty: row[3],
              unitCost: row[4]?.replace('$', ''),
              total: cost,
            };
          });

        if (!this.billsOfMaterials[key]) {
          this.billsOfMaterials[key] = {
            title: section.title.replace(' - Bill of Materials', ''),
            summary: 'Materials Breakdown',
            totalMaterialCost: totalMat,
            totalLaborCost: 0, // Will populate from labor table
            confidenceScore: 90, // TODO: Default or extract
            materials: materials,
            labor: []
          };
        } else {
          this.billsOfMaterials[key].materials = materials;
          this.billsOfMaterials[key].totalMaterialCost = totalMat;
        }
      } else if (
        section.title &&
        section.title.includes('Subcontractor Cost Breakdown')
      ) {
        const key = section.title
          .split(' - ')[0]
          .replace(/\s+/g, '')
          .toLowerCase();
        let totalLab = 0;
        const labor = section.content
          .filter(
            (row: any[]) =>
              row[0] && !row[0].toLowerCase().includes('total') && row.length > 1,
          )
          .map((row: any[]) => {
            // | Trade | Scope | Hours | Rate | Total | ...
            // 0, 1, 2, 3, 4
            const cost = parseFloat(row[4]?.replace(/[^0-9.]/g, '')) || 0;
            totalLab += cost;
            return {
              trade: row[0],
              scope: row[1],
              hours: row[2],
              rate: row[3]?.replace('$', ''),
              total: cost,
            };
          });

        if (!this.billsOfMaterials[key]) {
            this.billsOfMaterials[key] = {
              title: section.title.replace(' - Subcontractor Cost Breakdown', ''),
              summary: 'Labor Breakdown',
              totalMaterialCost: 0,
              totalLaborCost: totalLab,
              confidenceScore: 90,
              materials: [],
              labor: labor
            };
         } else {
            this.billsOfMaterials[key].labor = labor;
            this.billsOfMaterials[key].totalLaborCost = totalLab;
         }
      }
    });
  }

  // Helpers
  toggleExecutiveSummary() {
    this.executiveSummaryExpanded = !this.executiveSummaryExpanded;
  }

  handleDownloadPdf(type: string) {
    void type;
  }

  openReportDialog(): void {
    this.fullReportRequested.emit();
  }

  closeReportDialog(): void {
    // No-op: dialog is owned by parent Jobs component
  }

  downloadFullReport(): void {
    const finalize = () => {
      this.isGeneratingReport = false;
    };

    const generate = () => {
      if (!this.reportHtml) {
        finalize();
        return;
      }

      const cleanTitle = this.reportTitle.replace(/ /g, '_');
      const fileName = `${this.projectDetails.projectName}_${cleanTitle}.pdf`;

      this.reportService
        .generatePdfFromHtml(this.reportHtml, fileName, this.reportTitle)
        .finally(finalize);
    };

    this.isGeneratingReport = true;

    if (this.reportHtml) {
      generate();
      return;
    }

    this.handleReportAction(
      'Full Project Analysis Report',
      (id) => this.reportService.getFullReportContent(id),
      'An error occurred while fetching the report.',
      false,
      generate,
    );
  }

  private handleReportAction(
    title: string,
    action: (jobId: string) => Promise<string | null>,
    errorMsg: string,
    openDialogOnSuccess: boolean,
    onSuccess?: () => void,
  ): void {
    this.isReportLoading = true;
    this.reportError = null;
    this.reportHtml = null;
    this.reportTitle = title;

    action(this.projectDetails.jobId)
      .then((content) => {
        if (content) {
          this.reportHtml = content;
          if (openDialogOnSuccess) this.openReportDialog();
          onSuccess?.();
        } else {
          const message = `Could not retrieve ${title}.`;
          this.reportError = message;
          this.snackBar.open(message, 'Close', { duration: 3000 });
          this.isGeneratingReport = false;
        }
      })
      .catch((err) => {
        console.error(err);
        this.reportError = errorMsg;
        this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
        this.isGeneratingReport = false;
      })
      .finally(() => {
        this.isReportLoading = false;
      });
  }

  toggleBomSection(key: string) {
    if (this.expandedBomSections.includes(key)) {
      this.expandedBomSections = this.expandedBomSections.filter(k => k !== key);
    } else {
      this.expandedBomSections.push(key);
    }
  }

  toggleVeSelection(id: string) {
    this.veSelections[id] = !this.veSelections[id];
  }

  generateQuotation() {
    if (this.isLoading) return;

    const currentUser = this.authService.currentUserSubject.value;
    if (!currentUser) {
      console.error('No current user found');
      return;
    }

    const job = this.projectDetails;
    if (!job || !job.jobId) {
      console.error('No job details found');
      return;
    }

    this.isLoading = true;

    // Fetch Client Details
    this.jobsService.getClientDetails(Number(job.jobId)).subscribe({
      next: (clientDetails) => {
        this.createQuote(currentUser, job, clientDetails);
      },
      error: (err) => {
        console.warn('Failed to fetch client details, using defaults', err);
        this.createQuote(currentUser, job, null);
      },
    });
  }

  private createQuote(currentUser: any, job: any, clientDetails: any) {
    // Client Details
    let clientName = job.projectName || 'Client';
    let clientEmail = '';
    let clientPhone = '';

    if (clientDetails) {
      clientName = `${clientDetails.firstName} ${clientDetails.lastName}`;
      if (clientDetails.companyName) {
        clientName += ` (${clientDetails.companyName})`;
      }
      clientEmail = clientDetails.email || '';
      clientPhone = clientDetails.phone || '';
    }

    // Calculate total project cost (align with preliminary "Suggested Bid Price")
    const totalCost =
      this.costAnalysis?.suggestedMarketBid || this.costAnalysis?.suggestedBid || 0;

    // Build one row per budget phase with cost, then append a total row
    // These phase totals are the same values shown in the Budget tab cards
    const phaseRows: QuoteRowDto[] = Object.keys(this.billsOfMaterials || {})
      .map((key) => {
        const phase = this.billsOfMaterials[key];
        if (!phase) return null;

        const materialCost = Number(phase.totalMaterialCost || 0);
        const laborCost = Number(phase.totalLaborCost || 0);
        const phaseCost = materialCost + laborCost;

        if (phaseCost <= 0) return null;

        return {
          description: `${phase.title || key} Cost`,
          quantity: 1,
          unit: 'LS',
          unitPrice: phaseCost,
          total: phaseCost,
        } as QuoteRowDto;
      })
      .filter((row): row is QuoteRowDto => row !== null);

    const rows: QuoteRowDto[] = [...phaseRows];

    // Ensure quote rows add up to the intended project total.
    // Phase rows are direct costs only, so we add a balancing line for markups/allowances.
    const directSubtotal = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const adjustment = Number((totalCost - directSubtotal).toFixed(2));

    if (Math.abs(adjustment) > 0.01) {
      rows.push({
        description: 'GC Overhead, Contingency & Market Adjustment',
        quantity: 1,
        unit: 'LS',
        unitPrice: adjustment,
        total: adjustment,
      });
    }

    // Include the project total row in the generated quote?
    // rows.push({
    //   description: 'Total Project Construction Cost',
    //   quantity: 1,
    //   unit: 'Lot',
    //   unitPrice: totalCost,
    //   total: totalCost,
    // });

    // Construct QuoteDto
    const quoteDto: QuoteDto = {
      quoteId: null, // New quote
      jobID: Number(job.jobId),
      companyId: currentUser.companyId || 0,
      number: '', // Backend generates this
      documentType: 'QUOTE',

      from:
        currentUser.companyName ||
        `${currentUser.firstName} ${currentUser.lastName}`,
      to: clientName,

      clientAddress: job.address || '',
      clientEmail: clientEmail,
      clientPhone: clientPhone,

      projectName: job.projectName || '',
      projectAddress: job.address || '',

      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // +14 days

      notes: 'Preliminary quotation based on initial analysis.',
      terms: 'Standard terms and conditions apply.',

      total: totalCost,

      createdID: currentUser.id,
      createdBy: currentUser.firstName,

      rows,
      extraCosts: [], // No extra costs as we are using flat total row
    };

    this.quoteService.saveDraft(quoteDto).subscribe({
    next: (res: any) => {
      this.quoteGenerated = true;
      // Handle PascalCase or camelCase
      this.generatedQuoteId = res.quoteId || res.QuoteId;
      this.generatedQuote = { ...quoteDto, quoteId: this.generatedQuoteId };

      if (this.generatedQuoteId) {
        this.localStorageService.setItem('quote_job_' + job.jobId, this.generatedQuoteId);
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    },
      error: (err) => {
        console.error('Failed to generate quote', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  viewQuote() {
    if (this.generatedQuoteId) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(['/quote'], {
          queryParams: { quoteId: this.generatedQuoteId },
        })
      );
      window.open(url, '_blank');
    } else {
      console.error('No quote ID available to view');
    }
  }

  sendToClient() {
    if (!this.generatedQuote || !this.generatedQuote.clientEmail) {
      this.snackBar.open('Quote data missing or no client email.', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isSending = true;
    this.quoteService
      .saveAndSend({
        quote: this.generatedQuote,
        send: {
          clientEmail: this.generatedQuote.clientEmail,
          clientName: this.generatedQuote.to,
          attachPdf: true,
        },
      })
      .subscribe({
        next: (res) => {
          this.isSending = false;
          this.snackBar.open(
            'Quote sent to client successfully!',
            'Close',
            { duration: 3000 }
          );
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to send quote', err);
          this.isSending = false;
          this.snackBar.open('Failed to send quote.', 'Close', {
            duration: 3000,
          });
          this.cdr.detectChanges();
        },
      });
  }

  regenerateQuote() {
    const jobId = this.projectDetails?.jobId;
    if (!jobId) {
      this.snackBar.open('Missing job context. Unable to regenerate quote.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const confirmed = window.confirm(
      'Regenerating will permanently delete the current quote for this job and create a brand new one. This cannot be undone. Continue?',
    );

    if (!confirmed) return;

    const existingQuoteId =
      this.generatedQuoteId || this.localStorageService.getItem('quote_job_' + jobId);

    const resetAndGenerate = () => {
      this.quoteGenerated = false;
      this.generatedQuoteId = null;
      this.generatedQuote = null;
      this.localStorageService.removeItem('quote_job_' + jobId);
      this.generateQuotation();
    };

    if (!existingQuoteId) {
      resetAndGenerate();
      return;
    }

    this.isLoading = true;
    this.quoteService.deleteQuote(existingQuoteId).subscribe({
      next: () => {
        this.snackBar.open('Previous quote deleted. Generating a new quote...', 'Close', {
          duration: 3000,
        });
        this.isLoading = false;
        resetAndGenerate();
      },
      error: (err) => {
        console.error('Failed to delete existing quote before regeneration', err);
        this.isLoading = false;
        this.snackBar.open('Could not delete existing quote. Regeneration cancelled.', 'Close', {
          duration: 4000,
        });
        this.cdr.detectChanges();
      },
    });
  }

  onJobGranted() {
    this.jobGranted.emit();
  }

  checkExistingQuote(jobId: string) {
    const existingQuoteId = this.localStorageService.getItem('quote_job_' + jobId);
    if (existingQuoteId) {
      this.quoteService.getQuote(existingQuoteId).subscribe({
        next: (quoteView) => {
          this.quoteGenerated = true;
          this.generatedQuoteId = existingQuoteId;

          // Map QuoteViewDto to QuoteDto
          this.generatedQuote = {
            quoteId: quoteView.quoteId,
            jobID: Number(jobId),
            companyId: 0,
            number: quoteView.number,
            documentType: quoteView.documentType,

            from: quoteView.version.from,
            to: quoteView.version.to,

            clientAddress: quoteView.version.clientAddress,
            clientEmail: quoteView.version.clientEmail,
            clientPhone: quoteView.version.clientPhone,

            projectName: quoteView.version.projectName,
            projectAddress: quoteView.version.projectAddress,

            date: quoteView.version.date,
            dueDate: quoteView.version.dueDate,

            notes: quoteView.version.notes,
            terms: quoteView.version.terms,
            paymentTerms: quoteView.version.paymentTerms,

            total: quoteView.version.total,
            logoId: quoteView.version.logoId,

            createdID: quoteView.createdID,
            createdBy: '',

            rows: quoteView.rows,
            extraCosts: quoteView.extraCosts,
          };
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load existing quote', err);
          this.localStorageService.removeItem('quote_job_' + jobId);
        },
      });
    }
  }

  get totalVeSavings(): number {
    return this.valueEngineering
      .filter(ve => this.veSelections[ve.id])
      .reduce((sum, ve) => sum + ve.savings, 0);
  }

  get totalVePotentialSavings(): number {
    return this.valueEngineering.reduce(
      (sum, ve) => sum + Number(ve?.savings || 0),
      0,
    );
  }

  get objectKeys() {
    return Object.keys;
  }
}
