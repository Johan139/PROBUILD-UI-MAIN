import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import {
  MeasurementService,
  UnitOption,
} from '../../services/measurement.service';
import { QuoteService } from './quote.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule, NgIf } from '@angular/common';
import { jsPDF } from 'jspdf';
import { MatRadioModule } from '@angular/material/radio';
import { AuthService } from '../../authentication/auth.service';
import { Store } from '../../store/store.service';
import { SubtasksState } from '../../state/subtasks.state';
import { MatExpansionModule } from '@angular/material/expansion';
import { LogoService } from '../../services/logo.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Job } from '../../models/job';
import { JobsService } from '../../services/jobs.service';
import { JobCardComponent } from '../../components/job-card/job-card.component';
import { PdfViewerComponent } from '../../components/pdf-viewer/pdf-viewer.component';
import { BidsService } from '../../services/bids.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CompanyService } from '../../services/company.service';
import { QuoteDto, QuoteExtraCostDto } from './quote.model';
import { environment } from '../../../environments/environment';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobDataService } from '../jobs/services/job-data.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  mapMaterialsToQuoteRows,
  mapMaterialsToQuoteRowsByPhase,
} from './quote-materials.mapper';
import { CategoryPickerDialogComponent } from '../../quote-documents-dialog/category-picker-dialog.component';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  filter,
  Subject,
  take,
  takeUntil,
  timeout,
} from 'rxjs';
import {
  SendToClientDialogComponent,
  SendToClientDialogResult,
} from './sendtoclientdialog.component';
import {
  QuotePreviewData,
  QuotePreviewDialogComponent,
} from './quote-preview-dialog.component';

type DocumentType = 'QUOTE' | 'INVOICE';
interface CompanyDetails {
  name?: string;
  address?: string;
  email?: string;
  phoneNumber?: string;
  vatNo?: string;
}

@Component({
  selector: 'app-quote',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    MatExpansionModule,
    NgIf,

    MatDialogModule,
    MatCheckboxModule,
    JobCardComponent,
    MatProgressSpinnerModule,
    PdfViewerComponent,
    CommonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
    MatTooltipModule,
    MatProgressBarModule,
  ],
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.scss'],
  providers: [QuoteService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  quoteForm: FormGroup;
  jobDetails: Job | null = null;
  isSaving = false;
  jobDetailsLoading = false;
  logoUrl: string | null = null;
  isLogoSupported = true;
  dataSource = new MatTableDataSource<FormGroup>([]);
  hasAmountPaid = false;
  hasExtraCost = false;
  hasTax = false;
  hasDiscount = false;
  successJobs: any[] = [];
  selectedJobId: string | null = null;
  jobsLoading = false;
  activeTab: 'company' | 'jobs' = 'company';
  hasFlatTotal = false;
  quoteId: string | null = null;
  jobId?: string;
  readOnly: boolean = false;
  isOwnQuote: boolean = false;
  isAlreadyActioned = false;

  isFinalBiddingRound = false;
  showFeeReminder = false;
  quoteDocuments: { url: string; name: string }[] = [];
  units: UnitOption[] = [];
  companyDetails: CompanyDetails | null = null;
  documentType: DocumentType = 'QUOTE';
  userEmail?: string;
  companyId!: number;
  subtaskGroups: any[] = [];
  quoteCategories: {
    title: string;
    selected: boolean;
    subtasks: any[];
  }[] = [];
  //Quote generation scope
  generationMode: 'PROJECT' | 'PHASE' = 'PROJECT';
  selectedPhases: string[] = [];
  isInboundQuote = false;
  get isQuote(): boolean {
    return this.documentType === 'QUOTE';
  }

  get isInvoice(): boolean {
    return this.documentType === 'INVOICE';
  }

  switchToQuote(): void {
    if (this.documentType === 'QUOTE') return;
    if (this.quoteId) {
      this.showSuccessToast('Document type cannot be changed after saving.');
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Switch to Quote',
        message: 'Switching will change the document type. Continue?',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.documentType = 'QUOTE';
        this.quoteForm.patchValue({ header: 'QUOTE' });

        if (!this.quoteId) {
          this.quoteForm.patchValue({ number: '' });
        }

        this.cdr.markForCheck();
      }
    });
  }

  switchToInvoice(): void {
    if (this.documentType === 'INVOICE') return;
    if (this.quoteId) {
      this.showSuccessToast('Document type cannot be changed after saving.');
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Switch to Invoice',
        message: 'Switching will change the document type. Continue?',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.documentType = 'INVOICE';
        this.quoteForm.patchValue({ header: 'INVOICE' });

        if (!this.quoteId) {
          this.quoteForm.patchValue({ number: '' });
        }

        this.cdr.markForCheck();
      }
    });
  }

  @ViewChild('quoteContent', { static: false }) quoteContent!: ElementRef;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;
  apiBase = environment.BACKEND_URL;
  logoId: string | null = null;
  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private jobDataService: JobDataService,
    private route: ActivatedRoute,
    private router: Router,
    private companyService: CompanyService,
    private quoteService: QuoteService,
    private authService: AuthService,
    private store: Store<SubtasksState>,
    private logoService: LogoService,
    private dialog: MatDialog,
    private jobsService: JobsService,
    private bidsService: BidsService,
    private measurementService: MeasurementService,
  ) {
    this.quoteForm = this.fb.group({
      header: [''],
      number: [''],
      from: ['', Validators.required],

      to: ['', Validators.required],
      clientAddress: [''],
      clientPhone: [''],
      clientEmail: [''],

      projectName: [''],
      projectAddress: [''],

      date: ['', Validators.required],
      paymentTerms: [''],
      dueDate: [''],

      extraCostValue: [0],
      taxValue: [0],
      discountValue: [0],
      flatTotalValue: [0],
      amountPaid: [0],

      notes: [''],
      terms: [''],

      quoteRows: this.fb.array([]),
      logoId: [null],
    });

    // Listen to quoteRows value changes to update the total
    this.quoteRows.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });

    // Listen to individual controls for live updates
    this.quoteForm
      .get('taxValue')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((v) => {
        this.hasTax = +v > 0;
      });

    this.quoteForm
      .get('discountValue')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((v) => {
        this.hasDiscount = +v > 0;
      });

    this.quoteForm
      .get('extraCostValue')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((v) => {
        this.hasExtraCost = +v > 0;
      });

    this.quoteForm
      .get('flatTotalValue')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((v) => {
        this.hasFlatTotal = +v > 0;
      });
    this.quoteForm
      .get('amountPaid')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((v) => {
        this.hasAmountPaid = +v > 0;
      });
  }
  ngOnInit(): void {
    this.units = this.measurementService.getUnits();
    this.loadCompanyDetails();
    this.loadUserLogo();
    this.companyId = this.authService.currentUserSubject.value!.companyId;

    this.loadSuccessJobs();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.jobId = params['jobId'] ?? undefined;
        this.quoteId = params['quoteId'] ?? null;

        if (this.jobId) {
          this.selectedJobId = this.jobId;

          this.ensureJobScopeLoaded(this.jobId);

          this.loadJobDetails(this.jobId);
          this.loadQuoteDocuments();
        }

        if (this.quoteId) {
          this.loadExistingQuote(this.quoteId);
        } else {
          this.initializeNewQuote();
        }
      });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  loadSuccessJobs(): void {
    this.jobsLoading = true;
    const userId = this.authService.currentUserSubject.value?.id;

    this.jobsService.getAllJobsByUserId(userId).subscribe({
      next: (jobs) => {
        this.successJobs = jobs;

        this.jobsLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load jobs:', err);
        this.jobsLoading = false;
        this.showSuccessToast('Failed to load jobs. Please refresh the page.'); // Rename to showToast
        this.cdr.markForCheck();
      },
    });
  }
  ngAfterViewInit(): void {
    // Handle subtaskGroups (existing)
    this.store
      .select((state) => state.subtaskGroups)
      .pipe(takeUntil(this.destroy$))
      .subscribe((groups) => {
        if (!groups || groups.length === 0) return;

        this.subtaskGroups = groups;

        this.quoteCategories = groups.map((g) => ({
          title: g.title,
          selected: false,
          subtasks: g.subtasks ?? [],
        }));

        this.cdr.markForCheck();
      });
  }
  public ensureJobScopeLoaded(jobId: string | number): void {
    const subtasksStorageKey = `subtasks_${jobId}`;
    const materialsStorageKey = `materials_${jobId}`;

    let hasSubtasks = false;
    let hasMaterials = false;

    if (typeof localStorage !== 'undefined') {
      // Load subtasks from cache
      const cachedSubtasks = localStorage.getItem(subtasksStorageKey);
      if (cachedSubtasks) {
        try {
          const parsed = JSON.parse(cachedSubtasks);
          this.store.setState({ subtaskGroups: parsed });
          hasSubtasks = true;
        } catch (e) {
          console.error('Error parsing cached subtasks', e);
        }
      }

      // Load materials from cache
      const cachedMaterials = localStorage.getItem(materialsStorageKey);
      if (cachedMaterials) {
        try {
          const parsed = JSON.parse(cachedMaterials);
          this.store.setState({ materialGroups: parsed });
          hasMaterials = true;
        } catch (e) {
          console.error('Error parsing cached materials', e);
        }
      }
    }

    // If we don't have BOTH cached, fetch fresh data
    if (!hasSubtasks || !hasMaterials) {
      this.jobDataService.fetchJobData({ jobId });
    } else {
    }
  }

  private loadUserLogo(): void {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) return;

    this.logoService.getUserLogo(userId).subscribe({
      next: (logo) => {
        if (logo && logo.url) {
          // Use the Azure URL directly, don't convert to blob URL

          this.logoId = logo.id;
          this.quoteForm.patchValue({ logoId: logo.id });
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.log('No default logo found for user');
      },
    });
  }
  private initializeNewQuote(): void {
    this.readOnly = false;
    this.jobDetailsLoading = false;
    if (!this.readOnly) {
      this.quoteForm.enable({ emitEvent: false });
      this.quoteForm.get('number')?.disable({ emitEvent: false });
    }
    const today = new Date();
    const due = new Date();
    due.setDate(today.getDate() + 7);

    this.quoteForm.patchValue({
      date: today,
      dueDate: due,
    });

    const row = this.createQuoteRow();
    this.quoteRows.push(row);
    this.dataSource.data = [row];

    this.cdr.markForCheck();
  }

  private loadExistingQuote(quoteId: string): void {
    this.isSaving = true;

    this.quoteService.getQuote(quoteId).subscribe({
      next: (data) => {
        this.documentType = data.documentType;
        this.quoteId = data.quoteId;
        const currentUserId = this.authService.currentUserSubject.value?.id;

        const createdById = data.createdID ? String(data.createdID) : null;
        const sentToId = data.sentTo ? String(data.sentTo) : null;
        const currentId = currentUserId ? String(currentUserId) : null;

        // I created it = OUTBOUND (my quote)
        // I didn't create it BUT it was sent to me = INBOUND (received quote)
        this.isOwnQuote = createdById === currentId;
        this.isInboundQuote = !this.isOwnQuote && sentToId === currentId;

        this.isAlreadyActioned =
          data.status === 'Approved' || data.status === 'Rejected';

        // Inbound = always read-only, cannot edit anything
        if (this.isInboundQuote) {
          this.readOnly = true;
          this.quoteForm.disable();
        }

        // Outbound non-draft = read-only
        if (this.isOwnQuote && data.status !== 'Draft') {
          this.readOnly = true;
          this.quoteForm.disable();
        }

        this.cdr.markForCheck();

        // Rest of existing code...
        if (data.version.logoId) {
          this.logoId = data.version.logoId;
          this.quoteForm.patchValue({ logoId: data.version.logoId });
        }

        this.quoteForm.patchValue({
          header: data.documentType,
          number: data.number,
          from: data.version.from,
          to: data.version.to,
          clientAddress: data.version.clientAddress,
          clientPhone: data.version.clientPhone,
          clientEmail: data.version.clientEmail,
          projectName: data.version.projectName,
          projectAddress: data.version.projectAddress,

          date: data.version.date ? data.version.date.split('T')[0] : null,

          dueDate: data.version.dueDate
            ? data.version.dueDate.split('T')[0]
            : null,

          paymentTerms: data.version.paymentTerms,
          notes: data.version.notes,
          terms: data.version.terms,
        });

        this.updateQuoteRows(data.rows);

        data.extraCosts.forEach((cost) => {
          switch (cost.type) {
            case 'Extra':
              this.hasExtraCost = true;
              this.quoteForm.patchValue({ extraCostValue: cost.value });
              break;
            case 'Tax':
              this.hasTax = true;
              this.quoteForm.patchValue({ taxValue: cost.value });
              break;
            case 'Discount':
              this.hasDiscount = true;
              this.quoteForm.patchValue({ discountValue: cost.value });
              break;
            case 'Flat':
              this.hasFlatTotal = true;
              this.quoteForm.patchValue({ flatTotalValue: cost.value });
              break;
            case 'AmountPaid':
              this.hasAmountPaid = true;
              this.quoteForm.patchValue({ amountPaid: cost.value });
              break;
          }
        });

        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load quote', err);
        alert('Failed to load quote. Please try again.');
        this.router.navigate(['/quotes']);
        this.isSaving = false;
      },
    });
  }
  private loadCompanyDetails(): void {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) return;

    this.companyService.getCompanyProfile(userId).subscribe({
      next: (company) => {
        const addr = company.billingAddress;

        this.companyDetails = {
          name: company.name ?? '',
          email: company.email ?? '',
          phoneNumber: company.phoneNumber ?? '',
          vatNo: company.vatNo ?? '',
          address: addr
            ? (addr.formattedAddress ??
              [
                addr.streetNumber,
                addr.streetName,
                addr.city,
                addr.state,
                addr.postalCode,
                addr.country,
              ]
                .filter(Boolean)
                .join(', '))
            : undefined,
        };

        // Keep quote + PDF consistent
        this.quoteForm.patchValue({
          from: company.name,
        });
      },
      error: (err) => {
        console.error('Failed to load company profile', err);
      },
    });
  }

  loadJobDetails(jobId: string): void {
    this.jobDetailsLoading = true;

    this.jobsService
      .getSpecificJob(jobId)
      .pipe(
        take(1),
        timeout(10000),
        catchError((err) => {
          console.error('Job load failed:', err);
          return EMPTY;
        }),
      )
      .subscribe({
        next: (job) => {
          this.jobDetails = job;
          this.jobDetailsLoading = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.jobDetailsLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  updateQuoteRows(items: any[]) {
    this.quoteRows.clear();

    const disabled = this.readOnly || this.isInboundQuote;

    if (items.length === 0) {
      this.quoteRows.push(this.createQuoteRow());
    } else {
      items.forEach((item) => {
        const row = this.fb.group({
          description: [{ value: item.description || '', disabled }],
          quantity: [{ value: item.quantity || 1, disabled }],
          unit: [
            {
              value: this.measurementService.normalizeUnit(item.unit) || '',
              disabled,
            },
          ],
          unitPrice: [{ value: item.unitPrice || 0, disabled }],
          total: [{ value: item.total || 0, disabled: true }],
        });

        row
          .get('quantity')
          ?.valueChanges.pipe(takeUntil(this.destroy$))
          .subscribe(() => this.updateTotal(row));
        row
          .get('unitPrice')
          ?.valueChanges.pipe(takeUntil(this.destroy$))
          .subscribe(() => this.updateTotal(row));

        this.updateTotal(row);
        this.quoteRows.push(row);
      });
    }

    this.dataSource.data = this.quoteRows.controls as FormGroup[];
    this.cdr.markForCheck();
  }

  toggleReadOnly(): void {
    this.readOnly = !this.readOnly;
    if (this.readOnly) {
      this.quoteForm.disable();
    } else {
      this.quoteForm.enable();
    }
  }

  createQuoteRow(): FormGroup {
    const disabled = this.readOnly || this.isInboundQuote;

    const row = this.fb.group({
      description: [{ value: '', disabled }],
      quantity: [{ value: 1, disabled }],
      unit: [{ value: '', disabled }],
      unitPrice: [{ value: 0, disabled }],
      total: [{ value: 0, disabled: true }],
    });

    row
      .get('quantity')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateTotal(row));
    row
      .get('unitPrice')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateTotal(row));

    this.updateTotal(row);
    return row;
  }

  updateTotal(row: FormGroup): void {
    const quantity = row.get('quantity')?.value || 0;
    const unitPrice = row.get('unitPrice')?.value || 0;
    const total = quantity * unitPrice;
    row.get('total')?.setValue(total, { emitEvent: false });
  }

  get quoteRows(): FormArray {
    return this.quoteForm.get('quoteRows') as FormArray;
  }

  get displayedColumns(): string[] {
    const columns = ['description', 'quantity', 'unit', 'unitPrice', 'total'];
    if (this.quoteRows.length > 1) {
      columns.push('remove');
    }
    return columns;
  }

  addRow(): void {
    const newRow = this.createQuoteRow();
    this.quoteRows.push(newRow);
    this.dataSource.data = this.quoteRows.controls as FormGroup[];
    this.cdr.markForCheck();
  }

  removeRow(index: number): void {
    if (this.quoteRows.length > 1) {
      this.quoteRows.removeAt(index);
      this.dataSource.data = this.quoteRows.controls as FormGroup[];
      this.cdr.markForCheck();
    }
  }

  addExtraCost(): void {
    this.hasExtraCost = true;
    this.cdr.markForCheck();
  }

  removeExtraCost(): void {
    this.hasExtraCost = false;
    this.quoteForm.get('extraCostValue')?.setValue(0);
    this.cdr.markForCheck();
  }

  addTax(): void {
    this.hasTax = true;
    this.cdr.markForCheck();
  }

  removeTax(): void {
    this.hasTax = false;
    this.quoteForm.get('taxValue')?.setValue(0);
    this.cdr.markForCheck();
  }

  addDiscount(): void {
    this.hasDiscount = true;
    this.cdr.markForCheck();
  }

  removeDiscount(): void {
    this.hasDiscount = false;
    this.quoteForm.get('discountValue')?.setValue(0);
    this.cdr.markForCheck();
  }

  addFlatTotal(): void {
    this.hasFlatTotal = true;
    this.cdr.markForCheck();
  }

  removeFlatTotal(): void {
    this.hasFlatTotal = false;
    this.quoteForm.get('flatTotalValue')?.setValue(0);
    this.cdr.markForCheck();
  }

  addAmountPaid(): void {
    this.hasAmountPaid = true;
    this.cdr.markForCheck();
  }

  removeAmountPaid(): void {
    this.hasAmountPaid = false;
    this.quoteForm.get('amountPaid')?.setValue(0);
    this.cdr.markForCheck();
  }

  approveQuote(): void {
    if (!this.quoteId) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Approval',
        message:
          'Are you sure you want to approve this quote? This action cannot be undone.',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (!this.quoteId) return;
        this.quoteService.changeStatus(this.quoteId, 'Approved').subscribe({
          next: () => {
            this.isAlreadyActioned = true; // Disable buttons after action
            this.readOnly = true;
            this.quoteForm.disable({ emitEvent: false });
            this.showSuccessToast('Quote approved successfully!');
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('Failed to approve quote:', err);
            alert('Failed to approve quote. Please try again.');
            this.cdr.markForCheck();
          },
        });
      }
    });
  }

  rejectQuote(): void {
    if (!this.quoteId) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Rejection',
        message: 'Are you sure you want to reject this quote?',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (!this.quoteId) return;
        this.quoteService.changeStatus(this.quoteId, 'Rejected').subscribe({
          next: () => {
            this.isAlreadyActioned = true; // Disable buttons after action
            this.showSuccessToast('Quote rejected.');
            this.cdr.markForCheck();
          },
          error: (err) => console.error('Failed to reject quote:', err),
        });
      }
    });
  }

  getSubtotal(): number {
    return this.quoteRows.controls.reduce((acc, row) => {
      const quantity = row.get('quantity')?.value || 0;
      const unitPrice = row.get('unitPrice')?.value || 0;
      return acc + quantity * unitPrice;
    }, 0);
  }

  getGrandTotal(): number {
    // If flat total is set, use it directly
    if (this.hasFlatTotal) {
      return parseFloat(this.quoteForm.get('flatTotalValue')?.value) || 0;
    }

    let total = this.getSubtotal();

    // Add extra costs
    if (this.hasExtraCost) {
      total += parseFloat(this.quoteForm.get('extraCostValue')?.value) || 0;
    }

    // Apply discount FIRST (before tax)
    if (this.hasDiscount) {
      const discountValue =
        parseFloat(this.quoteForm.get('discountValue')?.value) || 0;
      total -= total * (discountValue / 100);
    }

    // Apply tax AFTER discount
    if (this.hasTax) {
      const taxValue = parseFloat(this.quoteForm.get('taxValue')?.value) || 0;
      total += total * (taxValue / 100);
    }

    return total;
  }
  getBalanceDue(): number {
    const total = this.getGrandTotal();
    const paid = parseFloat(this.quoteForm.get('amountPaid')?.value) || 0;
    return total - paid;
  }
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }
  get logoImageSrc(): string | null {
    if (!this.logoId) return null;
    return `${this.apiBase}/quotes/logo/file/${this.logoId}`;
  }
  private getTodayISO(): string {
    return new Date().toISOString().split('T')[0]; // yyyy-MM-dd
  }

  private getDueDateISO(days = 7): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  onLogoChange(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.isLogoSupported = false;
      alert('Please select a valid image file (PNG, JPG, etc.)');
      return;
    }

    // Show preview using FileReader (temporary, local preview only)
    const reader = new FileReader();
    reader.onload = () => {
      this.logoUrl = reader.result as string; // This creates a blob: URL for preview
      this.isLogoSupported = true;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);

    // Upload to server immediately
    this.isSaving = true;
    const userId = this.authService.currentUserSubject.value?.id;
    // Upload to server
    this.logoService.setUserLogo(file, userId).subscribe({
      next: (response) => {
        // CRITICAL: Replace the blob: URL with the actual Azure URL
        this.logoId = response.id;
        this.quoteForm.patchValue({ logoId: response.id });
        this.logoUrl = null;
        this.quoteForm.patchValue({ logoId: response.id });

        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Logo upload failed', err);
        alert('Failed to upload logo. Please try again.');
        this.logoUrl = null;
        this.isLogoSupported = false;
        this.isSaving = false;
        this.cdr.markForCheck();
      },
    });
  }

  removeLogo(): void {
    if (this.readOnly) return;
    if (confirm('Are you sure...')) {
      this.logoUrl = null;
      this.logoId = null;
      this.quoteForm.patchValue({ logoId: null });
      this.cdr.markForCheck();
    }
  }

  onSubmit(): void {
    this.exportPdf();
    this.submitManuallyAfterExport();
  }
  private getValidUntilDate(days = 7): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0]; // yyyy-MM-dd for mat-datepicker
  }
  submitManuallyAfterExport(): void {
    if (!this.quoteId) {
      console.warn('No quoteId available, cannot submit');
      return;
    }

    // Only submit if still draft

    this.quoteService.submitQuote(this.quoteId).subscribe({
      next: () => {
        this.readOnly = true;
        this.quoteForm.disable({ emitEvent: false });
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to submit quote after export', err);
      },
    });
  }

  saveToDatabase(): void {
    if (this.isSaving) return;

    this.isSaving = true;

    const form = this.quoteForm.getRawValue();

    const dto: QuoteDto = {
      quoteId: this.quoteId ?? null,
      jobID: this.jobId ? Number(this.jobId) : null,
      companyId: this.companyId,
      number: form.number ?? 'DRAFT',
      documentType: this.documentType,
      logoId: this.quoteForm.get('logoId')?.value,

      from: form.from,
      to: form.to,

      clientAddress: form.clientAddress,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      projectAddress: form.projectAddress,
      projectName: form.projectName,

      dueDate: form.dueDate,
      date: form.date,
      paymentTerms: this.isInvoice ? form.paymentTerms : undefined,
      notes: form.notes,
      terms: form.terms,

      total: this.getGrandTotal(),

      createdID: this.authService.currentUserSubject.value!.id,
      createdBy: this.authService.currentUserSubject.value!.firstName,

      rows: this.quoteRows.controls.map((row) => ({
        description: row.get('description')!.value,
        quantity: Number(row.get('quantity')!.value),
        unit: row.get('unit')!.value,
        unitPrice: Number(row.get('unitPrice')!.value),
        total: Number(row.get('total')!.value),
      })),

      extraCosts: this.buildExtraCosts(),
    };

    this.quoteService.saveDraft(dto).subscribe({
      next: (res) => {
        this.quoteId = res.quoteId;
        console.log('Quote saved successfully');

        // Show success message briefly
        this.showSuccessToast(
          `${this.documentType === 'INVOICE' ? 'Invoice' : 'Quote'} saved successfully!`,
        );

        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to save quote', err);
        alert('Failed to save quote. Please try again.');
        this.isSaving = false;
        this.cdr.markForCheck();
      },
    });
  }
  private showSuccessToast(text: string): void {
    const toast = document.createElement('div');
    toast.textContent = text;

    toast.style.cssText = `
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #4caf50;
    color: white;
    padding: 14px 28px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
  `;

    document.body.appendChild(toast);

    // Fade + slight drop-in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(6px)';
    });

    // Fade out
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-6px)';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }

  private buildExtraCosts(): QuoteExtraCostDto[] {
    const costs: QuoteExtraCostDto[] = [];

    if (this.hasExtraCost)
      costs.push({
        type: 'Extra',
        value: +this.quoteForm.value.extraCostValue,
        title: 'Extra Cost',
      });

    if (this.hasTax)
      costs.push({
        type: 'Tax',
        value: +this.quoteForm.value.taxValue,
        title: 'Tax',
      });

    if (this.hasDiscount)
      costs.push({
        type: 'Discount',
        value: +this.quoteForm.value.discountValue,
        title: 'Discount',
      });

    if (this.hasFlatTotal)
      costs.push({
        type: 'Flat',
        value: +this.quoteForm.value.flatTotalValue,
        title: 'Flat Total',
      });

    if (this.isInvoice && this.hasAmountPaid) {
      const amountPaid = +this.quoteForm.value.amountPaid;
      if (amountPaid > 0) {
        costs.push({
          type: 'AmountPaid',
          value: amountPaid,
          title: 'Amount Paid',
        });
      }
    }

    return costs;
  }

  submitQuote(): void {
    // First, save the quote if it hasn't been saved yet
    if (!this.quoteId) {
      this.saveToDatabase();
      const checkInterval = setInterval(() => {
        if (this.quoteId && !this.isSaving) {
          clearInterval(checkInterval);
          this.submitQuote();
        }
      }, 500);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this.quoteId) {
          alert('Please save the quote first before sending to client.');
        }
      }, 10000);
      return;
    }

    // Validate form
    if (this.quoteForm.invalid) {
      Object.keys(this.quoteForm.controls).forEach((key) => {
        const control = this.quoteForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      console.warn('Form is invalid');
      return;
    }

    // Open the send dialog
    const dialogRef = this.dialog.open(SendToClientDialogComponent, {
      width: '500px',
      disableClose: true,
      data: {
        quoteNumber: this.quoteForm.get('number')?.value || 'DRAFT',
        clientEmail: this.quoteForm.get('clientEmail')?.value || '',
        clientName: this.quoteForm.get('to')?.value || '',
        total: this.getGrandTotal(),
        documentType: this.documentType,
      },
    });

    dialogRef
      .afterClosed()
      .subscribe((result: SendToClientDialogResult | null) => {
        if (!result) {
          return; // User cancelled
        }

        this.isSaving = true;
        this.cdr.markForCheck();

        // Call the API to send to client
        const form = this.quoteForm.getRawValue();

        const quoteDto: QuoteDto = {
          quoteId: this.quoteId ?? null,
          jobID: this.jobId ? Number(this.jobId) : null,
          companyId: this.companyId,
          number: form.number ?? 'DRAFT',
          documentType: this.documentType,
          logoId: form.logoId,

          from: form.from,
          to: form.to,
          clientAddress: form.clientAddress,
          clientEmail: form.clientEmail,
          clientPhone: form.clientPhone,
          projectName: form.projectName,
          projectAddress: form.projectAddress,

          date: form.date,
          dueDate: form.dueDate,
          notes: form.notes,
          terms: form.terms,
          total: this.getGrandTotal(),

          createdID: this.authService.currentUserSubject.value!.id,
          createdBy: this.authService.currentUserSubject.value!.firstName,

          rows: this.quoteRows.controls.map((row) => ({
            description: row.get('description')!.value,
            quantity: Number(row.get('quantity')!.value),
            unit: row.get('unit')!.value,
            unitPrice: Number(row.get('unitPrice')!.value),
            total: Number(row.get('total')!.value),
          })),

          extraCosts: this.buildExtraCosts(),
        };

        this.quoteService
          .saveAndSend({
            quote: quoteDto,
            send: {
              clientEmail: result.clientEmail,
              clientName: result.clientName,
              personalMessage: result.personalMessage,
              attachPdf: result.attachPdf,
            },
          })
          .subscribe({
            next: () => {
              this.readOnly = true;
              this.isSaving = false;
              this.quoteForm.disable();
              this.showSuccessToast(`Quote sent to ${result.clientEmail}`);
            },
            error: (err) => {
              this.isSaving = false;
              console.error(err);
              alert('Failed to send quote');
            },
          });
      });
  }

  resendQuote(): void {
    if (!this.quoteId) {
      alert('Cannot resend: Quote not found');
      return;
    }

    const dialogRef = this.dialog.open(SendToClientDialogComponent, {
      width: '500px',
      disableClose: true,
      data: {
        quoteNumber: this.quoteForm.get('number')?.value || 'DRAFT',
        clientEmail: this.quoteForm.get('clientEmail')?.value || '',
        clientName: this.quoteForm.get('to')?.value || '',
        total: this.getGrandTotal(),
        documentType: this.documentType,
      },
    });

    dialogRef
      .afterClosed()
      .subscribe((result: SendToClientDialogResult | null) => {
        if (!result) {
          return;
        }

        this.isSaving = true;
        this.cdr.markForCheck();

        this.quoteService
          .resendToClient(
            this.quoteId!,
            result.clientEmail,
            result.personalMessage,
          )
          .subscribe({
            next: (response) => {
              this.showSuccessToast(
                `${this.documentType === 'INVOICE' ? 'Invoice' : 'Quote'} resent to ${result.clientEmail}!`,
              );
              this.isSaving = false;
              this.cdr.markForCheck();
            },
            error: (err) => {
              console.error('Failed to resend:', err);
              alert(`Failed to resend. ${err.message || 'Please try again.'}`);
              this.isSaving = false;
              this.cdr.markForCheck();
            },
          });
      });
  }
  keepOriginalBid(): void {
    if (!this.quoteId) {
      console.warn('Cannot keep original bid: Quote ID is missing.');
      return;
    }

    this.quoteService.changeStatus(this.quoteId, 'Submitted').subscribe({
      next: (updatedQuote) => {
        this.quoteForm.patchValue({ status: 'Submitted' }); // or Rejected
        this.readOnly = true;
        this.quoteForm.disable();
        // console.log('Original bid kept');
      },
      error: (err) => {
        console.error('Failed to keep original bid:', err);
      },
    });
  }
  onLogoLoadError(event: Event): void {
    console.error('Failed to load logo from URL:', this.logoUrl);
    this.logoUrl = null;
    alert('Failed to load logo image. Please re-upload.');
  }
  async downloadPDF(): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

    // Helper function to check for new page
    const checkNewPage = (height: number): void => {
      if (currentY + height > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        currentY = margin;
      }
    };

    pdf.setFont('helvetica', 'normal');

    // ================= PDF HEADER LOGO =================
    if (this.logoId) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = this.logoImageSrc!;

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject('Logo failed to load');
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context failed');

        ctx.drawImage(img, 0, 0);

        const imgData = canvas.toDataURL('image/png');

        const imgWidth = 45;
        const imgHeight = (img.naturalHeight * imgWidth) / img.naturalWidth;

        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);

        currentY += imgHeight + 12;
      } catch (err) {
        console.warn('Logo not included in PDF:', err);
      }
    }

    // Header with Logo
    if (this.logoUrl) {
      try {
        const img = new Image();
        img.src = this.logoUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Failed to load image'));
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas 2D context');
        ctx.drawImage(img, 0, 0);

        const canvasDataUrl = canvas.toDataURL('image/png');
        const base64Data = canvasDataUrl.split(',')[1];
        const format = 'PNG';

        const imgWidth = 30;
        const imgHeight = (img.height * imgWidth) / img.width;
        pdf.addImage(base64Data, format, margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5;
      } catch (e) {
        console.error('Error adding logo to PDF:', e);
      }
    }

    // Header Title and Number
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      this.quoteForm.get('header')?.value || 'INVOICE',
      margin,
      currentY,
    );
    currentY += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`#${this.quoteForm.get('number')?.value || ''}`, margin, currentY);
    currentY += 10;

    // Contact Details
    checkNewPage(40);
    pdf.setFontSize(10);
    const companyNameY = currentY;

    pdf.text(this.quoteForm.get('from')?.value || '', margin, currentY, {
      maxWidth: contentWidth / 2,
    });
    currentY += 15;
    pdf.text(
      `${this.quoteForm.get('toTitle')?.value || 'Bill To'}: ${this.quoteForm.get('to')?.value || ''}`,
      margin,
      currentY,
      { maxWidth: contentWidth / 2 },
    );
    currentY += 15;
    if (this.quoteForm.get('shipTo')?.value) {
      pdf.text(
        `${this.quoteForm.get('shipToTitle')?.value || 'Ship To'}: ${this.quoteForm.get('shipTo')?.value}`,
        margin,
        currentY,
        { maxWidth: contentWidth / 2 },
      );
      currentY += 15;
    }

    // Invoice Details
    let rightColumnY = companyNameY;
    pdf.text(
      `Date: ${this.quoteForm.get('date')?.value || ''}`,
      pageWidth - margin - 50,
      rightColumnY,
    );
    rightColumnY += 7;
    pdf.text(
      `Payment Terms: ${this.quoteForm.get('paymentTerms')?.value || ''}`,
      pageWidth - margin - 50,
      rightColumnY,
    );
    rightColumnY += 7;
    pdf.text(
      `Due Date: ${this.quoteForm.get('dueDate')?.value || ''}`,
      pageWidth - margin - 50,
      rightColumnY,
    );
    rightColumnY += 7;
    pdf.text(
      `PO Number: ${this.quoteForm.get('poNumber')?.value || ''}`,
      pageWidth - margin - 50,
      rightColumnY,
    );

    // Items Table
    checkNewPage(30);
    currentY += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Items', margin, currentY);
    currentY += 7;

    let extraCostPerRow = 0;
    if (this.hasExtraCost && this.quoteRows.length > 0) {
      const extraCostValue =
        parseFloat(this.quoteForm.get('extraCostValue')?.value) || 0;
      extraCostPerRow = extraCostValue / this.quoteRows.length;
    }

    // Table Header
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(
      this.quoteForm.get('itemHeader')?.value || 'Item',
      margin,
      currentY,
    );
    pdf.text(
      this.quoteForm.get('quantityHeader')?.value || 'Quantity',
      margin + 90,
      currentY,
    );
    pdf.text(
      this.quoteForm.get('unitCostHeader')?.value || 'Rate',
      margin + 110,
      currentY,
    );
    pdf.text(
      this.quoteForm.get('amountHeader')?.value || 'Amount',
      margin + 140,
      currentY,
    );
    currentY += 5;
    pdf.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 5;

    // Table Rows
    pdf.setFont('helvetica', 'normal');
    this.quoteRows.controls.forEach((row) => {
      checkNewPage(10);
      const description = row.get('description')?.value || '';
      const quantity = row.get('quantity')?.value || 0;
      const unitPrice = row.get('unitPrice')?.value || 0;
      const baseTotal = row.get('total')?.value || 0;

      // Calculate display total WITHOUT modifying form
      const displayTotal = baseTotal + extraCostPerRow;

      pdf.text(description, margin, currentY, { maxWidth: 80 });
      pdf.text(quantity.toString(), margin + 90, currentY);
      pdf.text(`$${unitPrice.toFixed(2)}`, margin + 110, currentY);
      pdf.text(`$${displayTotal.toFixed(2)}`, margin + 140, currentY); // Use displayTotal
      currentY += 7;
    });

    // Totals
    checkNewPage(50);
    currentY += 10;
    const subtotal = this.getSubtotal();
    const grandTotal = this.getGrandTotal();
    if (subtotal !== grandTotal) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Subtotal', margin, currentY);
      pdf.text(`$${subtotal.toFixed(2)}`, margin + 140, currentY);
      currentY += 7;
    }

    if (this.hasTax) {
      const value = parseFloat(this.quoteForm.get('taxValue')?.value) || 0;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Tax', margin, currentY);
      pdf.text(`${value}%`, margin + 140, currentY);
      currentY += 7;
    }

    if (this.hasDiscount) {
      const value = parseFloat(this.quoteForm.get('discountValue')?.value) || 0;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Discount', margin, currentY);
      pdf.text(`${value}%`, margin + 140, currentY);
      currentY += 7;
    }

    if (this.hasFlatTotal) {
      const value =
        parseFloat(this.quoteForm.get('flatTotalValue')?.value) || 0;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Flat Total', margin, currentY);
      pdf.text(`$${value.toFixed(2)}`, margin + 140, currentY);
      currentY += 7;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.text('Total', margin, currentY);
    pdf.text(`$${grandTotal.toFixed(2)}`, margin + 140, currentY);
    currentY += 7;

    // Notes and Terms
    checkNewPage(30);
    currentY += 10;
    if (this.quoteForm.get('notes')?.value) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(
        this.quoteForm.get('notesTitle')?.value || 'Notes',
        margin,
        currentY,
      );
      currentY += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.text(this.quoteForm.get('notes')?.value || '', margin, currentY, {
        maxWidth: contentWidth,
      });
      currentY += 15;
    }
    if (this.quoteForm.get('terms')?.value) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(
        this.quoteForm.get('termsTitle')?.value || 'Terms',
        margin,
        currentY,
      );
      currentY += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.text(this.quoteForm.get('terms')?.value || '', margin, currentY, {
        maxWidth: contentWidth,
      });
    }

    // Page Numbers
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - margin - 20,
        pdf.internal.pageSize.getHeight() - margin - 5,
      );
    }

    // --- Branded Footer ---
    checkNewPage(20);
    const footerY = pdf.internal.pageSize.getHeight() - margin;
    const footerText = 'Generated by ProBuildAI';
    const footerWidth = pdf.getTextWidth(footerText);

    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(footerText, (pageWidth - footerWidth) / 2, footerY);

    try {
      const logo = new Image();
      logo.src = '/logo.png'; // or '/logo.png' if public
      await new Promise((res, rej) => {
        logo.onload = res;
        logo.onerror = rej;
      });

      const canvas = document.createElement('canvas');
      canvas.width = logo.width;
      canvas.height = logo.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(logo, 0, 0);
      const logoData = canvas.toDataURL('image/png');

      const imgWidth = 10;
      const imgHeight = (logo.height * imgWidth) / logo.width;

      pdf.addImage(
        logoData,
        'PNG',
        (pageWidth - footerWidth) / 2 - imgWidth - 2,
        footerY - imgHeight,
        imgWidth,
        imgHeight,
      );
    } catch (err) {
      console.warn('Failed to load ProBuildAI logo:', err);
    }

    // Save the PDF
    const invoiceNumber = this.quoteForm.get('number')?.value || 'Quote';
    pdf.save(`${invoiceNumber}.pdf`);
  }

  loadQuoteDocuments(): void {
    if (this.jobId) {
      this.bidsService.getBidsForJob(this.jobId).subscribe((bids) => {
        this.quoteDocuments = bids
          .filter((bid: any) => bid.documentUrl)
          .map((bid: any) => ({
            url: bid.documentUrl,
            name: `Quote from ${bid.user.firstName} ${bid.user.lastName}`,
          }));
      });
    }
  }
  exportPdf(): void {
    if (!this.quoteId) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    this.quoteService.downloadPdf(this.quoteId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;

        const filename = `${this.quoteForm.get('number')?.value || 'Quote'}.pdf`;

        a.download = filename;
        a.click();

        window.URL.revokeObjectURL(url);

        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('PDF download failed', err);
        alert('Failed to download PDF');
        this.isSaving = false;
        this.cdr.markForCheck();
      },
    });
  }

  populateQuoteFromJob(selectedPhases: string[] | null = null) {
    const allMaterialGroups = this.store.getState().materialGroups;

    if (!allMaterialGroups || allMaterialGroups.length === 0) {
      console.warn('📦 No materials found for job');
      this.jobDetailsLoading = false;
      return;
    }

    let rows: any[] = [];

    // --------------------------------------------------
    // PROJECT MODE → summary by phase
    // --------------------------------------------------
    if (this.generationMode === 'PROJECT') {
      rows = mapMaterialsToQuoteRowsByPhase(allMaterialGroups);
    }
    // --------------------------------------------------
    // PHASE MODE → detailed rows, possibly filtered
    // --------------------------------------------------
    else {
      let filteredGroups = allMaterialGroups;

      if (selectedPhases && selectedPhases.length > 0) {
        filteredGroups = allMaterialGroups.filter((group) =>
          selectedPhases.includes(group.phase),
        );
      }

      rows = mapMaterialsToQuoteRows(filteredGroups);
    }

    // --------------------------------------------------
    // Apply rows to form
    // --------------------------------------------------
    this.quoteRows.clear();

    rows.forEach((r) => {
      const row = this.fb.group({
        description: [r.description],
        quantity: [r.quantity],
        unit: [this.measurementService.normalizeUnit(r.unit)],
        unitPrice: [r.unitPrice],
        total: [r.total],
      });

      row
        .get('quantity')
        ?.valueChanges.pipe(takeUntil(this.destroy$))
        .subscribe(() => this.updateTotal(row));
      row
        .get('unitPrice')
        ?.valueChanges.pipe(takeUntil(this.destroy$))
        .subscribe(() => this.updateTotal(row));

      this.updateTotal(row);
      this.quoteRows.push(row);
    });

    this.dataSource.data = this.quoteRows.controls as FormGroup[];
    this.cdr.markForCheck();

    this.jobDetailsLoading = false;
  }
  openPreview(): void {
    const form = this.quoteForm.getRawValue();

    // Calculate amounts
    const subtotal = this.getSubtotal();
    const extraCost = this.hasExtraCost
      ? parseFloat(form.extraCostValue) || 0
      : 0;
    const discountRate = this.hasDiscount
      ? parseFloat(form.discountValue) || 0
      : 0;
    const discountAmount = (subtotal * discountRate) / 100;
    const taxRate = this.hasTax ? parseFloat(form.taxValue) || 0 : 0;
    const taxAmount = ((subtotal + extraCost - discountAmount) * taxRate) / 100;
    const grandTotal = this.getGrandTotal();

    // Invoice-specific calculations
    const amountPaid = this.isInvoice ? parseFloat(form.amountPaid) || 0 : 0;
    const balanceDue = grandTotal - amountPaid;

    // Build preview data
    const previewData: QuotePreviewData = {
      // Document info
      documentType: this.documentType,
      number: form.number || 'DRAFT',
      date: form.date,
      dueDate: form.dueDate,

      // Company info
      companyName: this.companyDetails?.name || form.from || '',
      companyAddress: this.companyDetails?.address,
      companyEmail: this.companyDetails?.email,
      companyPhone: this.companyDetails?.phoneNumber,
      logoUrl: this.logoId ? this.logoImageSrc : null,

      // Client info
      clientName: form.to || '',
      clientAddress: form.clientAddress,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,

      // Project info
      projectName: form.projectName,
      projectAddress: form.projectAddress,

      // Line items
      rows: this.quoteRows.controls.map((row) => ({
        description: row.get('description')?.value || '',
        quantity: Number(row.get('quantity')?.value) || 0,
        unit: row.get('unit')?.value || '',
        unitPrice: Number(row.get('unitPrice')?.value) || 0,
        total: Number(row.get('total')?.value) || 0,
      })),

      // Totals
      subtotal,
      extraCost: this.hasExtraCost ? extraCost : undefined,
      taxRate: this.hasTax ? taxRate : undefined,
      taxAmount: this.hasTax ? taxAmount : undefined,
      discountRate: this.hasDiscount ? discountRate : undefined,
      discountAmount: this.hasDiscount ? discountAmount : undefined,
      grandTotal,

      // Invoice-specific fields
      paymentTerms: this.isInvoice ? form.paymentTerms : undefined,
      amountPaid: this.isInvoice && amountPaid > 0 ? amountPaid : undefined,
      balanceDue: this.isInvoice && amountPaid > 0 ? balanceDue : undefined,

      // Notes
      notes: form.notes,
      terms: form.terms,
    };

    // Open dialog
    const dialogRef = this.dialog.open(QuotePreviewDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'quote-preview-dialog',
      data: previewData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        console.log('Preview confirmed');
      }
    });
  }
  selectJob(job: Job): void {
    if (this.selectedJobId === job.jobId.toString()) {
      return; // Already selected
    }

    // Confirm if there are unsaved changes
    if (this.quoteForm.dirty) {
      const confirmed = confirm(
        'You have unsaved changes. Do you want to continue?',
      );
      if (!confirmed) return;
    }

    this.selectedJobId = job.jobId.toString();
    this.jobId = job.jobId.toString();

    // Navigate to quote with this job
    this.router.navigate(['/quote'], {
      queryParams: { jobId: job.jobId },
    });

    // Reset form for new quote
    this.quoteId = null;
    this.quoteForm.reset();
    this.initializeNewQuote();
    this.applyCompanyDefaults();
    // Load job data
    this.ensureJobScopeLoaded(this.jobId);
    this.loadJobDetails(this.jobId);

    // Pre-fill client info from job
    if (job.address) {
      this.quoteForm.patchValue({
        to: job.projectName || '',
        clientAddress: job.address || '',
        projectName: job.projectName || '',
        projectAddress: job.address || '',
      });
    }

    this.cdr.markForCheck();
  }

  openGenerateQuoteDialog(job: any): void {
    const jobId = job.jobId?.toString() || job.id?.toString();
    if (!jobId) {
      alert('Cannot generate quote: Job ID is missing');
      return;
    }

    this.jobsLoading = true;

    // Trigger fetch
    this.jobDataService.fetchJobData({ jobId });

    // Wait ONCE for materials
    this.store
      .select((state) => state.materialGroups)
      .pipe(
        filter((m) => Array.isArray(m) && m.length > 0),
        take(1),
        timeout(10000), // 10 second timeout
        catchError((err) => {
          this.jobsLoading = false;
          alert('Failed to load job materials');
          return EMPTY;
        }),
      )
      .subscribe((materials) => {
        this.jobsLoading = false;

        this.dialog
          .open(CategoryPickerDialogComponent, {
            width: '500px',
            data: { phases: materials },
          })
          .afterClosed()
          .subscribe((result) => {
            if (!result) return;

            this.generationMode = result.mode;
            this.selectedPhases = result.selectedPhases ?? [];

            this.generateQuoteForJob(job);
          });
      });
  }
  trackByIndex(index: number): number {
    return index;
  }

  trackByJobId(index: number, job: any): string | number {
    return job.id || job.jobId || index;
  }
  // Update the generateQuoteForJob method to use already loaded data
  generateQuoteForJob(job: any): void {
    if (
      this.generationMode === 'PHASE' &&
      (!this.selectedPhases || this.selectedPhases.length === 0)
    ) {
      alert('Please select at least one phase.');
      return;
    }

    // Extract job ID - handle both jobId and id properties
    const jobId = job.jobId?.toString() || job.id?.toString();

    if (!jobId) {
      console.error('❌ Job ID is missing:', job);
      alert('Cannot generate quote: Job ID is missing');
      return;
    }

    // Confirm if there are unsaved changes
    if (this.quoteForm.dirty) {
      const confirmed = confirm(
        'You have unsaved changes. Do you want to continue?',
      );
      if (!confirmed) return;
    }

    const existingLogoId = this.quoteForm.get('logoId')?.value;

    this.selectedJobId = jobId;
    this.jobId = jobId;

    // Navigate to quote with this job
    this.router.navigate(['/quote'], {
      queryParams: { jobId },
    });

    // Reset form for new quote
    this.quoteId = null;
    this.quoteForm.reset();
    this.initializeNewQuote();
    this.applyCompanyDefaults();
    // Load full job details to populate form
    this.jobsService.getSpecificJob(this.jobId).subscribe({
      next: (jobDetails) => {
        // Pre-fill quote form with job details
        this.quoteForm.patchValue({
          to: jobDetails.projectName || '',
          clientAddress: jobDetails.address || '',
          projectName: jobDetails.projectName || '',
          projectAddress: jobDetails.address || '',
          date: this.getTodayISO(),
          dueDate: this.getDueDateISO(7),
          logoId: existingLogoId,
        });

        let phaseFilter: string[] | null = null;

        if (this.generationMode === 'PHASE') {
          phaseFilter = [...this.selectedPhases];
        }
        this.populateQuoteFromJob(phaseFilter);

        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load job details:', err);
      },
    });

    // Switch to company tab to see the quote being created
    this.activeTab = 'company';
    this.cdr.markForCheck();
  }
  goBackToQuotes(): void {
    this.router.navigate(['/quotes']);
  }

  switchTab(tab: 'company' | 'jobs'): void {
    this.activeTab = tab;
    this.cdr.markForCheck();
  }
  get availablePhases() {
    return this.store.getState().materialGroups || [];
  }
  private applyCompanyDefaults(): void {
    if (!this.companyDetails) return;

    this.quoteForm.patchValue({
      from: this.companyDetails.name ?? '',
      clientEmail: this.companyDetails.email ?? '',
      clientPhone: this.companyDetails.phoneNumber ?? '',
    });
  }
  duplicateQuote() {
    if (!this.quoteId) return;

    const quoteId = this.quoteId;

    this.quoteService.duplicateQuote(quoteId).subscribe({
      next: (res) => {
        // Navigate to the new quote
        this.router.navigate(['/quote'], {
          queryParams: { quoteId: res.quoteId },
        });
      },
      error: (err) => {
        console.error('Failed to duplicate quote', err);
        alert(err?.error ?? 'Failed to duplicate quote');
      },
    });
  }

  deleteQuote() {
    if (!this.quoteId) return;

    const quoteId = this.quoteId;

    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          title: 'Delete Quote',
          message: 'This will permanently delete the draft quote.',
          confirmText: 'Delete',
          confirmColor: 'warn',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.quoteService.deleteQuote(quoteId).subscribe({
            next: () => {
              this.router.navigate(['/quotes']);
            },
            error: (err) => {
              console.error('Failed to delete quote', err);
              alert(err?.error ?? 'Failed to delete quote');
            },
          });
        }
      });
  }
  get quoteRowsAsFormGroups(): FormGroup[] {
    return this.quoteRows.controls as FormGroup[];
  }
  canEdit(): boolean {
    return !this.isInboundQuote && !this.readOnly;
  }

  canSend(): boolean {
    return !this.isInboundQuote && !this.readOnly;
  }

  canSaveDraft(): boolean {
    return !this.isInboundQuote && !this.readOnly;
  }

  canDuplicate(): boolean {
    return !this.isInboundQuote;
  }

  canDelete(): boolean {
    return !this.isInboundQuote && !this.readOnly;
  }

  canPreview(): boolean {
    return true;
  }

  canApprove(): boolean {
    return this.isInboundQuote;
  }

  canReject(): boolean {
    return this.isInboundQuote;
  }
}
