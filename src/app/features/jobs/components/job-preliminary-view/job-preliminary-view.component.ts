import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LucideAngularModule, DollarSign, Package, Sparkles, FileText, CheckCircle2, ChevronUp, ChevronDown, Download, Calculator, TrendingUp, RefreshCw, UploadIcon, X, Mail, Eye, FileCheck, Loader } from 'lucide-angular';
import { MatTabsModule } from '@angular/material/tabs';
import { BomService } from '../../services/bom.service';
import { ReportService } from '../../services/report.service';
import { JobsService } from '../../../../services/jobs.service';
import { QuoteService } from '../../../../features/quote/quote.service';
import { AuthService } from '../../../../authentication/auth.service';
import { LocalStorageService } from '../../../../services/local-storage.service';
import { QuoteDto, QuoteRowDto } from '../../../../features/quote/quote.model';

@Component({
  selector: 'app-job-preliminary-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MatTabsModule, MatSnackBarModule],
  templateUrl: './job-preliminary-view.component.html',
  styleUrls: ['./job-preliminary-view.component.scss']
})
export class JobPreliminaryViewComponent implements OnInit {
  @Input() projectDetails: any;
  @Output() jobGranted = new EventEmitter<void>();

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

  loadData(jobId: string) {
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
    console.log(`Download ${type}`);
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

    // Calculate Total Cost
    const totalCost =
      this.costAnalysis?.suggestedBid ||
      0;

    // Create Single Row
    const row: QuoteRowDto = {
      description: 'Total Project Construction Cost',
      quantity: 1,
      unit: 'Lot',
      unitPrice: totalCost,
      total: totalCost,
    };

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

      rows: [row],
      extraCosts: [], // No extra costs as we are using flat total row
    };

    this.quoteService.saveDraft(quoteDto).subscribe({
    next: (res: any) => {
      console.log('Quote generated response:', res);
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
    console.log('Viewing quote ID:', this.generatedQuoteId);
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

  get objectKeys() {
    return Object.keys;
  }
}
