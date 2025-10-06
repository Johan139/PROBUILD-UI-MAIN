import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
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
import { NgIf } from '@angular/common';
import { jsPDF } from 'jspdf';
import { Quote } from './quote.model';
import { AuthService } from '../../authentication/auth.service';
import { QuoteDataService } from '../quote/quote-data.service';
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
    FormsModule,
    MatDialogModule,
    MatCheckboxModule,
    JobCardComponent,
    MatProgressSpinnerModule,
    PdfViewerComponent
  ],
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.scss'],
  providers: [QuoteService],
})


export class QuoteComponent implements OnInit {
  quoteForm: FormGroup;
  jobDetails: Job | null = null;
  isSaving = false;
  jobDetailsLoading = false;
  logoUrl: string | null = null;
  isLogoSupported = true;
  dataSource = new MatTableDataSource<FormGroup>([]);
  displayedColumns: string[] = ['description', 'quantity', 'unitPrice', 'total', 'remove'];
  hasAmountPaid = false;
  hasExtraCost = false;
  hasTax = false;
  hasDiscount = false;
  hasFlatTotal = false;
  quoteId: string | null = null;
  jobId?: string;
  readOnly: boolean = false;
  isOwnQuote: boolean = false;
  isFinalBiddingRound = false;
  showFeeReminder = false;
 quoteDocuments: { url: string, name: string }[] = [];

  @ViewChild('quoteContent', { static: false }) quoteContent!: ElementRef;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private quoteService: QuoteService,
    private authService: AuthService,
    private quoteDataService: QuoteDataService,
    private logoService: LogoService,
    private dialog: MatDialog,
    private jobsService: JobsService,
    private bidsService: BidsService
  ) {
    this.quoteForm = this.fb.group({
      header: ['INVOICE'],
      number: [''],
      from: [''],
      toTitle: ['Bill To'],
      to: [''],
      shipToTitle: ['Ship To'],
      shipTo: [''],
      date: [''],
      paymentTerms: [''],
      dueDate: [''],
      poNumber: [''],
      itemHeader: ['Item'],
      quantityHeader: ['Quantity'],
      unitCostHeader: ['Rate'],
      amountHeader: ['Amount'],
      amountPaid: [0],
      extraCostValue: [0],
      taxValue: [0],
      discountValue: [0],
      flatTotalValue: [0],
      notesTitle: ['Notes'],
      notes: [''],
      termsTitle: ['Terms'],
      terms: [''],
      quoteRows: this.fb.array([]),
      status: ['Draft'],
      version: [0],
      logoId: [null],
      createdID: [''],
    });

    // Listen to quoteRows value changes to update the total
    this.quoteRows.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });

    // Listen to individual controls for live updates
    this.quoteForm.get('extraCostValue')?.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });
    this.quoteForm.get('taxValue')?.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });
    this.quoteForm.get('discountValue')?.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });
    this.quoteForm.get('flatTotalValue')?.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });
    this.quoteForm.get('amountPaid')?.valueChanges.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {


    this.route.queryParams.subscribe(params => {
      if (params['jobId']) {
        this.showFeeReminder = true;
        this.jobId = params['jobId'];
        this.jobDetailsLoading = true;
        this.jobsService.getSpecificJob(this.jobId).subscribe(job => {
          this.jobDetails = job;
          this.jobDetailsLoading = false;
          this.loadQuoteDocuments();
        });
      } else {
        this.showFeeReminder = false;
      }
      const userRoles = this.authService.currentUserSubject.value?.roles;
      this.isFinalBiddingRound = params['finalBiddingRound'] === 'true' &&
        (userRoles?.includes('Subcontractor') || userRoles?.includes('Vendor'));
    });
    // Check for quote data from the service (coming from JobSelectionComponent)
    const quote = this.quoteDataService.getQuote();
    if (quote) {
      // Populate the form with the passed Quote object
      this.quoteForm.patchValue({
        header: quote.header || 'INVOICE',
        number: quote.number || '',
        from: quote.from || '',
        toTitle: quote.toTitle || 'Bill To',
        to: quote.to || '',
        shipToTitle: quote.shipToTitle || 'Ship To',
        shipTo: quote.shipTo || '',
        date: quote.date || '',
        paymentTerms: quote.paymentTerms || '',
        dueDate: quote.dueDate || '',
        poNumber: quote.poNumber || '',
        itemHeader: quote.itemHeader || 'Item',
        quantityHeader: quote.quantityHeader || 'Quantity',
        unitCostHeader: quote.unitCostHeader || 'Rate',
        amountHeader: quote.amountHeader || 'Amount',
        amountPaid: quote.amountPaid || 0,
        extraCostValue: quote.extraCostValue || 0,
        taxValue: quote.taxValue || 0,
        discountValue: quote.discountValue || 0,
        flatTotalValue: quote.flatTotalValue || 0,
        notesTitle: quote.notesTitle || 'Notes',
        notes: quote.notes || '',
        termsTitle: quote.termsTitle || 'Terms',
        terms: quote.terms || '',
        status: quote.status || 'Draft',
      });

      // Set boolean flags based on the Quote object
      this.quoteForm.get('number')?.disable();
      this.hasExtraCost = !!quote.extraCostValue;
      this.hasTax = !!quote.taxValue;
      this.hasDiscount = !!quote.discountValue;
      this.hasFlatTotal = !!quote.flatTotalValue;
      this.hasAmountPaid = !!quote.amountPaid;
      this.jobId = quote.jobID;

      //Check if its the logged in user`s quote
      const currentUserId = this.authService.currentUserSubject.value?.id;
      const quoteCreatorId = quote.createdID;

      this.isOwnQuote = currentUserId && quoteCreatorId && currentUserId === quoteCreatorId;

      // Update quote rows and refresh table
      this.updateQuoteRows(quote.rows || []);

      // Clear the service data to prevent stale data
      this.quoteDataService.clearQuote();
      if (quote.status === 'Submitted') {
        this.readOnly = true;
        this.quoteForm.disable();
      }
      this.cdr.detectChanges();

      if (quote.logoId) {
        this.logoService.getLogo(quote.logoId).subscribe({
          next: (logo) => {
            this.logoUrl = logo.url;
            this.quoteForm.patchValue({ logoId: logo.id });
          },
          error: () => {
            this.logoUrl = null;
          }
        });
      }

    } else {
      // If no service data, check for a quoteId in query params (editing an existing quote)
      this.route.queryParams.subscribe((params) => {
        if (params['quoteId']) {
          this.quoteId = params['quoteId'];
          this.quoteService.getQuote(params['quoteId']).subscribe({
            next: (savedQuote) => {
              console.log('Quote loaded:', savedQuote);

              this.quoteForm.patchValue({
                id: savedQuote.id,
                header: savedQuote.header,
                number: savedQuote.number,
                from: savedQuote.from,
                toTitle: savedQuote.toTitle,
                to: savedQuote.to,
                shipToTitle: savedQuote.shipToTitle,
                shipTo: savedQuote.shipTo,
                date: savedQuote.date,
                paymentTerms: savedQuote.paymentTerms,
                dueDate: savedQuote.dueDate,
                poNumber: savedQuote.poNumber,
                itemHeader: savedQuote.itemHeader,
                quantityHeader: savedQuote.quantityHeader,
                unitCostHeader: savedQuote.unitCostHeader,
                amountHeader: savedQuote.amountHeader,
                notesTitle: savedQuote.notesTitle,
                notes: savedQuote.notes,
                termsTitle: savedQuote.termsTitle,
                terms: savedQuote.terms,
                extraCostValue: savedQuote.extraCostValue,
                taxValue: savedQuote.taxValue,
                discountValue: savedQuote.discountValue,
                flatTotalValue: savedQuote.flatTotalValue,
                status: savedQuote.status,
                version: savedQuote.version,
                logoId: savedQuote.logoId || null,
                createdID: savedQuote.createdID || null
              });

              // Fetch and show logo if logoId exists
              if (savedQuote.logoId) {
                this.logoService.getLogo(savedQuote.logoId).subscribe({
                  next: (logo) => {
                    this.logoUrl = logo.url;
                  },
                  error: (err) => {
                    console.error('Failed to load logo:', err);
                    this.logoUrl = null;
                  }
                });
              }
              this.quoteForm.get('number')?.disable();
              this.hasExtraCost = !!savedQuote.extraCostValue;
              this.hasTax = !!savedQuote.taxValue;
              this.hasDiscount = !!savedQuote.discountValue;
              this.hasFlatTotal = !!savedQuote.flatTotalValue;
              this.jobId = savedQuote.jobID;

              if (this.jobId) {
                this.loadJobDetails(this.jobId);
              }

              this.loadQuoteDocuments();
              this.updateQuoteRows(savedQuote.rows);
              this.isSaving = false;

              //Check if its the logged in user`s quote
              const currentUserId = this.authService.currentUserSubject.value?.id;
              const quoteCreatorId = this.quoteForm.get('createdID')?.value;

              this.isOwnQuote = currentUserId && quoteCreatorId && currentUserId === quoteCreatorId;

              if (savedQuote.status === 'Submitted' && params['edit'] !== 'true') {
                this.readOnly = true;
                this.quoteForm.disable();
              } else {
                this.readOnly = false;
                this.quoteForm.enable();
              }

              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error loading quote:', err);
              this.isSaving = false;
              this.cdr.detectChanges();
            }
          });
        } else {
          // If no service data or quoteId, initialize with a default empty row
          this.quoteForm.get('number')?.enable();
          const initialRow = this.createQuoteRow();
          this.quoteRows.push(initialRow);
          this.dataSource.data = [initialRow];
          this.cdr.detectChanges();
        }
      });
    }
  }

  loadJobDetails(jobId: string): void {
    this.jobDetailsLoading = true;
    this.jobsService.getSpecificJob(jobId).subscribe({
      next: (job) => {
        this.jobDetails = job;
        this.jobDetailsLoading = false;
      },
      error: (err) => {
        console.error('Failed to load job details:', err);
        this.jobDetailsLoading = false;
      }
    });
  }

  updateQuoteRows(items: any[]) {
    this.quoteRows.clear(); // Clear existing rows

    if (items.length === 0) {
      // If no items, add a default empty row
      const emptyRow = this.createQuoteRow();
      this.quoteRows.push(emptyRow);
    } else {
      items.forEach((item) => {
        const row = this.fb.group({
          description: [item.description || ''],
          quantity: [item.quantity || 1],
          unitPrice: [item.unitPrice || 0],
          total: [item.total || 0],
        });

        // Update total when quantity or unitPrice changes
        row.get('quantity')?.valueChanges.subscribe(() => this.updateTotal(row));
        row.get('unitPrice')?.valueChanges.subscribe(() => this.updateTotal(row));

        this.quoteRows.push(row);
      });
    }

    // Update dataSource with the new rows
    this.dataSource.data = this.quoteRows.controls as FormGroup[];
    this.cdr.detectChanges();
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
    const row = this.fb.group({
      description: [''],
      quantity: [1],
      unitPrice: [0],
      total: [0],
    });

    // Update total when quantity or unitPrice changes
    row.get('quantity')?.valueChanges.subscribe(() => this.updateTotal(row));
    row.get('unitPrice')?.valueChanges.subscribe(() => this.updateTotal(row));

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

  addRow(): void {
    const newRow = this.createQuoteRow();
    this.quoteRows.push(newRow);
    this.dataSource.data = this.quoteRows.controls as FormGroup[];
    this.cdr.detectChanges();
  }

  removeRow(index: number): void {
    if (this.quoteRows.length > 1) {
      this.quoteRows.removeAt(index);
      this.dataSource.data = this.quoteRows.controls as FormGroup[];
      this.cdr.detectChanges();
    }
  }

  addExtraCost(): void {
    this.hasExtraCost = true;
    this.cdr.detectChanges();
  }

  removeExtraCost(): void {
    this.hasExtraCost = false;
    this.quoteForm.get('extraCostValue')?.setValue(0);
    this.cdr.detectChanges();
  }

  addTax(): void {
    this.hasTax = true;
    this.cdr.detectChanges();
  }

  removeTax(): void {
    this.hasTax = false;
    this.quoteForm.get('taxValue')?.setValue(0);
    this.cdr.detectChanges();
  }

  addDiscount(): void {
    this.hasDiscount = true;
    this.cdr.detectChanges();
  }

  removeDiscount(): void {
    this.hasDiscount = false;
    this.quoteForm.get('discountValue')?.setValue(0);
    this.cdr.detectChanges();
  }

  addFlatTotal(): void {
    this.hasFlatTotal = true;
    this.cdr.detectChanges();
  }

  removeFlatTotal(): void {
    this.hasFlatTotal = false;
    this.quoteForm.get('flatTotalValue')?.setValue(0);
    this.cdr.detectChanges();
  }

  addAmountPaid(): void {
    this.hasAmountPaid = true;
    this.cdr.detectChanges();
  }

  removeAmountPaid(): void {
    this.hasAmountPaid = false;
    this.quoteForm.get('amountPaid')?.setValue(0);
    this.cdr.detectChanges();
  }

  approveQuote(): void {
    if (!this.quoteId) return;

    if (!this.jobId) {
      console.warn('Cannot approve quote: Job ID is missing.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Approval',
        message: 'Are you sure you want to approve this quote? This action cannot be undone.'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // original approve logic here
        if (!this.quoteId || !this.jobId) return;
        this.quoteService.changeStatus(this.quoteId, 'Approved').subscribe({
          next: (updatedQuote) => {
            this.quoteForm.patchValue({ status: updatedQuote.status });
            this.readOnly = true;
            this.quoteForm.disable();
          },
          error: (err) => console.error('Failed to approve quote:', err)
        });
      }
    });
  }

  rejectQuote(): void {
    if (!this.quoteId) return;

    if (!this.jobId) {
      console.warn('Cannot reject quote: Job ID is missing.');
      return;
    }

    this.quoteService.changeStatus(this.quoteId, 'Rejected').subscribe({
      next: (updatedQuote) => {
        this.quoteForm.patchValue({ status: updatedQuote.status });
        this.readOnly = true;
        this.quoteForm.disable();
        console.log('Quote rejected');
      },
      error: (err) => {
        console.error('Failed to reject quote:', err);
      }
    });
  }

  getSubtotal(): number {
    let subtotal = this.quoteRows.controls.reduce((acc, row) => {
      const quantity = row.get('quantity')?.value || 0;
      const unitPrice = row.get('unitPrice')?.value || 0;
      const total = quantity * unitPrice;
      row.get('total')?.setValue(total, { emitEvent: false });
      return acc + total;
    }, 0);

    // Add Extra Costs to the subtotal
    if (this.hasExtraCost) {
      const extraCostValue = parseFloat(this.quoteForm.get('extraCostValue')?.value) || 0;
      subtotal += extraCostValue;
    }

    return subtotal;
  }

  getGrandTotal(): number {
    let total = this.getSubtotal();

    // Apply Tax and Discount on the updated subtotal
    if (this.hasTax) {
      const taxValue = parseFloat(this.quoteForm.get('taxValue')?.value) || 0;
      total += total * (taxValue / 100);
    }

    if (this.hasDiscount) {
      const discountValue = parseFloat(this.quoteForm.get('discountValue')?.value) || 0;
      total -= total * (discountValue / 100);
    }

    if (this.hasFlatTotal) {
      const flatTotalValue = parseFloat(this.quoteForm.get('flatTotalValue')?.value) || 0;
      total = flatTotalValue;
    }

    return total;
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onLogoChange(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      this.isLogoSupported = false;
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      this.logoUrl = reader.result as string;
      this.isLogoSupported = true;

      const userId = this.authService.currentUserSubject.value?.id || 'anonymous';
      this.logoService.uploadLogo(file, 'quote', userId).subscribe({
        next: (logo) => {
          this.quoteForm.patchValue({ logoId: logo.id });
        },
        error: (err) => {
          console.error('Logo upload failed', err);
        }
      });
    };

    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.logoUrl = null;
  }

  async onSubmit(): Promise<void> {
    this.isSaving = true;
    await this.downloadPDF();
    this.isSaving = false;
  }

  async saveToDatabase(): Promise<void> {
    this.isSaving = true;
    const formValue = this.quoteForm.getRawValue();
    const quote: Quote = {
      id: null,
      header: formValue.header || '',
      number: formValue.number || '',
      from: formValue.from || '',
      toTitle: formValue.toTitle || '',
      to: formValue.to || '',
      shipToTitle: formValue.shipToTitle || '',
      shipTo: formValue.shipTo || '',
      date: formValue.date || '',
      paymentTerms: formValue.paymentTerms || '',
      dueDate: formValue.dueDate || '',
      poNumber: formValue.poNumber || '',
      itemHeader: formValue.itemHeader || '',
      quantityHeader: formValue.quantityHeader || '',
      unitCostHeader: formValue.unitCostHeader || '',
      amountHeader: formValue.amountHeader || '',
      amountPaid: parseFloat(formValue.amountPaid) || 0,
      extraCostValue: parseFloat(formValue.extraCostValue) || 0,
      taxValue: parseFloat(formValue.taxValue) || 0,
      discountValue: parseFloat(formValue.discountValue) || 0,
      flatTotalValue: parseFloat(formValue.flatTotalValue) || 0,
      notesTitle: formValue.notesTitle || '',
      notes: formValue.notes || '',
      termsTitle: formValue.termsTitle || '',
      terms: formValue.terms || '',
      rows: this.quoteRows.controls.map((row) => ({
        id: 0,
        quoteId: '',
        description: row.get('description')?.value || '',
        quantity: parseFloat(row.get('quantity')?.value) || 0,
        unitPrice: parseFloat(row.get('unitPrice')?.value) || 0,
        total: parseFloat(row.get('total')?.value) || 0,
        quote: null
      })),
      total: this.getGrandTotal(),
      createdDate: new Date(),
      extraCosts: [],
      createdBy: this.authService.currentUserSubject.value?.firstName || 'Unknown',
      createdID: this.authService.currentUserSubject.value?.id || 'Unknown',
      jobID: this.jobId,
      version: formValue.version || undefined, // Let backend calculate version
      status: 'Draft',
      logoId: formValue.logoId || null,
    };

    if (this.hasExtraCost) {
      quote.extraCosts.push({
        type: 'extraCost',
        value: parseFloat(this.quoteForm.get('extraCostValue')?.value) || 0,
        title: 'Extra Cost',
      });
    }
    if (this.hasTax) {
      quote.extraCosts.push({
        type: 'taxPercent',
        value: parseFloat(this.quoteForm.get('taxValue')?.value) || 0,
        title: 'Tax',
      });
    }
    if (this.hasDiscount) {
      quote.extraCosts.push({
        type: 'discount',
        value: parseFloat(this.quoteForm.get('discountValue')?.value) || 0,
        title: 'Discount',
      });
    }
    if (this.hasFlatTotal) {
      quote.extraCosts.push({
        type: 'flatTotal',
        value: parseFloat(this.quoteForm.get('flatTotalValue')?.value) || 0,
        title: 'Flat Total',
      });
    }

    this.quoteService.saveQuoteWithVersion(quote).subscribe({
      next: (savedQuote) => {
        console.log('Quote saved with version:', savedQuote);
        this.readOnly = true;
              this.quoteForm.disable();
              this.isSaving = false;
              this.cdr.detectChanges();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error saving quote with version:', err);
        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });

    //this.quoteService.saveQuote(quote).subscribe({
    //  next: (savedQuote) => {
    //    console.log('Quote saved:', savedQuote);
    //    this.isSaving = false;
    //    this.cdr.detectChanges();
    //  },
    //  error: (err) => {
    //    console.error('Error saving quote:', err);
    //    this.isSaving = false;
    //    this.cdr.detectChanges();
    //  },
    //});
  }

  submitQuote(): void {
    if (!this.jobId) {
      console.warn('Cannot submit quote: Job ID is missing.');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Submission',
        message: 'Are you sure you want to submit this quote? This will lock the quote and mark it as submitted.'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.isSaving = true;
      const formValue = this.quoteForm.getRawValue();

      const quote: Quote = {
        id: null,
        header: formValue.header || '',
        number: formValue.number || '',
        from: formValue.from || '',
        toTitle: formValue.toTitle || '',
        to: formValue.to || '',
        shipToTitle: formValue.shipToTitle || '',
        shipTo: formValue.shipTo || '',
        date: formValue.date || '',
        paymentTerms: formValue.paymentTerms || '',
        dueDate: formValue.dueDate || '',
        poNumber: formValue.poNumber || '',
        itemHeader: formValue.itemHeader || '',
        quantityHeader: formValue.quantityHeader || '',
        unitCostHeader: formValue.unitCostHeader || '',
        amountHeader: formValue.amountHeader || '',
        amountPaid: parseFloat(formValue.amountPaid) || 0,
        extraCostValue: parseFloat(formValue.extraCostValue) || 0,
        taxValue: parseFloat(formValue.taxValue) || 0,
        discountValue: parseFloat(formValue.discountValue) || 0,
        flatTotalValue: parseFloat(formValue.flatTotalValue) || 0,
        notesTitle: formValue.notesTitle || '',
        notes: formValue.notes || '',
        termsTitle: formValue.termsTitle || '',
        terms: formValue.terms || '',
        rows: this.quoteRows.controls.map((row) => ({
          id: 0,
          quoteId: '',
          description: row.get('description')?.value || '',
          quantity: parseFloat(row.get('quantity')?.value) || 0,
          unitPrice: parseFloat(row.get('unitPrice')?.value) || 0,
          total: parseFloat(row.get('total')?.value) || 0,
          quote: null
        })),
        total: this.getGrandTotal(),
        createdDate: new Date(),
        extraCosts: [],
        createdBy: this.authService.currentUserSubject.value?.firstName || 'Unknown',
        createdID: this.authService.currentUserSubject.value?.id || 'Unknown',
        jobID: this.jobId,
        version: formValue.version,
        status: 'Draft', // intentionally leave as Draft until we change it
        logoId: formValue.logoId || null,
      };

      // Populate extraCosts array
      if (this.hasExtraCost) {
        quote.extraCosts.push({
          type: 'extraCost',
          value: parseFloat(formValue.extraCostValue) || 0,
          title: 'Extra Cost',
        });
      }
      if (this.hasTax) {
        quote.extraCosts.push({
          type: 'taxPercent',
          value: parseFloat(formValue.taxValue) || 0,
          title: 'Tax',
        });
      }
      if (this.hasDiscount) {
        quote.extraCosts.push({
          type: 'discount',
          value: parseFloat(formValue.discountValue) || 0,
          title: 'Discount',
        });
      }
      if (this.hasFlatTotal) {
        quote.extraCosts.push({
          type: 'flatTotal',
          value: parseFloat(formValue.flatTotalValue) || 0,
          title: 'Flat Total',
        });
      }

      // Save quote first, then change status
      this.quoteService.saveQuoteWithVersion(quote).subscribe({
        next: (submittedQuote) => {
          console.log('Quote saved:', submittedQuote);

          // Now update the newly saved quote's status
          this.quoteService.changeStatus(submittedQuote.id!, 'Submitted').subscribe({
            next: (finalQuote) => {
              this.quoteForm.patchValue({ status: finalQuote.status });
              this.readOnly = true;
              this.quoteForm.disable();
              this.isSaving = false;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Failed to update status:', err);
              this.isSaving = false;
              this.cdr.detectChanges();
            }
          });
        },
        error: (err) => {
          console.error('Error saving quote before submission:', err);
          this.isSaving = false;
          this.cdr.detectChanges();
        }
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
        this.quoteForm.patchValue({ status: updatedQuote.status });
        this.readOnly = true;
        this.quoteForm.disable();
        console.log('Original bid kept');
      },
      error: (err) => {
        console.error('Failed to keep original bid:', err);
      }
    });
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
    pdf.text(this.quoteForm.get('header')?.value || 'INVOICE', margin, currentY);
    currentY += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`#${this.quoteForm.get('number')?.value || ''}`, margin, currentY);
    currentY += 10;

    // Contact Details
    checkNewPage(40);
    pdf.setFontSize(10);
    pdf.text(this.quoteForm.get('from')?.value || '', margin, currentY, { maxWidth: contentWidth / 2 });
    currentY += 15;
    pdf.text(
      `${this.quoteForm.get('toTitle')?.value || 'Bill To'}: ${this.quoteForm.get('to')?.value || ''}`,
      margin, currentY, { maxWidth: contentWidth / 2 }
    );
    currentY += 15;
    if (this.quoteForm.get('shipTo')?.value) {
      pdf.text(
        `${this.quoteForm.get('shipToTitle')?.value || 'Ship To'}: ${this.quoteForm.get('shipTo')?.value}`,
        margin, currentY, { maxWidth: contentWidth / 2 }
      );
      currentY += 15;
    }

    // Invoice Details
    let rightColumnY = margin + 20;
    pdf.text(`Date: ${this.quoteForm.get('date')?.value || ''}`, pageWidth - margin - 50, rightColumnY);
    rightColumnY += 7;
    pdf.text(`Payment Terms: ${this.quoteForm.get('paymentTerms')?.value || ''}`, pageWidth - margin - 50, rightColumnY);
    rightColumnY += 7;
    pdf.text(`Due Date: ${this.quoteForm.get('dueDate')?.value || ''}`, pageWidth - margin - 50, rightColumnY);
    rightColumnY += 7;
    pdf.text(`PO Number: ${this.quoteForm.get('poNumber')?.value || ''}`, pageWidth - margin - 50, rightColumnY);

    // Items Table
    checkNewPage(30);
    currentY += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Items', margin, currentY);
    currentY += 7;

    let extraCostPerRow = 0;
    if (this.hasExtraCost && this.quoteRows.length > 0) {
      const extraCostValue = parseFloat(this.quoteForm.get('extraCostValue')?.value) || 0;
      extraCostPerRow = extraCostValue / this.quoteRows.length;
    }

    // Table Header
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(this.quoteForm.get('itemHeader')?.value || 'Item', margin, currentY);
    pdf.text(this.quoteForm.get('quantityHeader')?.value || 'Quantity', margin + 90, currentY);
    pdf.text(this.quoteForm.get('unitCostHeader')?.value || 'Rate', margin + 110, currentY);
    pdf.text(this.quoteForm.get('amountHeader')?.value || 'Amount', margin + 140, currentY);
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
      let total = row.get('total')?.value || 0;
      total += extraCostPerRow;

      pdf.text(description, margin, currentY, { maxWidth: 80 });
      pdf.text(quantity.toString(), margin + 90, currentY);
      pdf.text(`$${unitPrice.toFixed(2)}`, margin + 110, currentY);
      pdf.text(`$${total.toFixed(2)}`, margin + 140, currentY);
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
      const value = parseFloat(this.quoteForm.get('flatTotalValue')?.value) || 0;
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
      pdf.text(this.quoteForm.get('notesTitle')?.value || 'Notes', margin, currentY);
      currentY += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.text(this.quoteForm.get('notes')?.value || '', margin, currentY, { maxWidth: contentWidth });
      currentY += 15;
    }
    if (this.quoteForm.get('terms')?.value) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.quoteForm.get('termsTitle')?.value || 'Terms', margin, currentY);
      currentY += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.text(this.quoteForm.get('terms')?.value || '', margin, currentY, { maxWidth: contentWidth });
    }

    // Page Numbers
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pdf.internal.pageSize.getHeight() - margin - 5);
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
        imgHeight
      );
    } catch (err) {
      console.warn('Failed to load ProBuildAI logo:', err);
    }

    // Save the PDF
    const invoiceNumber = this.quoteForm.get('number')?.value || 'Quote';
    pdf.save(`${invoiceNumber}.pdf`);
  }


  async updateDatabase(quoteId: string): Promise<void> {
    this.isSaving = true;
    const formValue = this.quoteForm.getRawValue();
    const quote: Quote = {
      id: quoteId,
      header: formValue.header || '',
      number: formValue.number || '',
      from: formValue.from || '',
      toTitle: formValue.toTitle || '',
      to: formValue.to || '',
      shipToTitle: formValue.shipToTitle || '',
      shipTo: formValue.shipTo || '',
      date: formValue.date || '',
      paymentTerms: formValue.paymentTerms || '',
      dueDate: formValue.dueDate || '',
      poNumber: formValue.poNumber || '',
      itemHeader: formValue.itemHeader || '',
      quantityHeader: formValue.quantityHeader || '',
      unitCostHeader: formValue.unitCostHeader || '',
      amountHeader: formValue.amountHeader || '',
      amountPaid: parseFloat(formValue.amountPaid) || 0,
      extraCostValue: parseFloat(formValue.extraCostValue) || 0,
      taxValue: parseFloat(formValue.taxValue) || 0,
      discountValue: parseFloat(formValue.discountValue) || 0,
      flatTotalValue: parseFloat(formValue.flatTotalValue) || 0,
      notesTitle: formValue.notesTitle || '',
      notes: formValue.notes || '',
      termsTitle: formValue.termsTitle || '',
      terms: formValue.terms || '',
      rows: this.quoteRows.controls.map((row) => ({
        id: 0,
        quoteId: quoteId,
        description: row.get('description')?.value || '',
        quantity: parseFloat(row.get('quantity')?.value) || 0,
        unitPrice: parseFloat(row.get('unitPrice')?.value) || 0,
        total: parseFloat(row.get('total')?.value) || 0,
        quote: null
      })),
      total: this.getGrandTotal(),
      createdDate: new Date(),
      extraCosts: [],
      createdBy: this.authService.currentUserSubject.value?.firstName || 'Unknown',
      createdID: this.authService.currentUserSubject.value?.id || 'Unknown',
      jobID: this.jobId,
    };

    if (this.hasExtraCost) {
      quote.extraCosts.push({
        type: 'extraCost',
        value: parseFloat(this.quoteForm.get('extraCostValue')?.value) || 0,
        title: 'Extra Cost',
      });
    }
    if (this.hasTax) {
      quote.extraCosts.push({
        type: 'taxPercent',
        value: parseFloat(this.quoteForm.get('taxValue')?.value) || 0,
        title: 'Tax',
      });
    }
    if (this.hasDiscount) {
      quote.extraCosts.push({
        type: 'discount',
        value: parseFloat(this.quoteForm.get('discountValue')?.value) || 0,
        title: 'Discount',
      });
    }
    if (this.hasFlatTotal) {
      quote.extraCosts.push({
        type: 'flatTotal',
        value: parseFloat(this.quoteForm.get('flatTotalValue')?.value) || 0,
        title: 'Flat Total',
      });
    }

    this.quoteService.updateQuote(quote).subscribe({
      next: (updatedQuote) => {
        console.log('Quote updated:', updatedQuote);
        this.isSaving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating quote:', err);
        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

 loadQuoteDocuments(): void {
   if (this.jobId) {
     this.bidsService.getBidsForJob(this.jobId).subscribe(bids => {
       this.quoteDocuments = bids
         .filter((bid: any) => bid.documentUrl)
         .map((bid: any) => ({
           url: bid.documentUrl,
           name: `Quote from ${bid.user.firstName} ${bid.user.lastName}`
         }));
     });
   }
 }
}
