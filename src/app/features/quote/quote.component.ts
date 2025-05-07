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
import jsPDF from 'jspdf';
import { Quote } from './quote.model';
import { AuthService } from '../../authentication/auth.service';
import { QuoteDataService } from '../quote/quote-data.service';

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
    NgIf,
  ],
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.scss'],
  providers: [QuoteService],
})
export class QuoteComponent implements OnInit {
  quoteForm: FormGroup;
  isSaving = false;
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

  @ViewChild('quoteContent', { static: false }) quoteContent!: ElementRef;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private quoteService: QuoteService,
    private authService: AuthService,
    private quoteDataService: QuoteDataService
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
      });

      // Set boolean flags based on the Quote object
      this.hasExtraCost = !!quote.extraCostValue;
      this.hasTax = !!quote.taxValue;
      this.hasDiscount = !!quote.discountValue;
      this.hasFlatTotal = !!quote.flatTotalValue;
      this.hasAmountPaid = !!quote.amountPaid;

      // Update quote rows and refresh table
      this.updateQuoteRows(quote.rows || []);

      // Clear the service data to prevent stale data
      this.quoteDataService.clearQuote();

      this.cdr.detectChanges();
    } else {
      // If no service data, check for a quoteId in query params (editing an existing quote)
      this.route.queryParams.subscribe((params) => {
        if (params['quoteId']) {
          this.quoteId = params['quoteId'];
          this.quoteService.getQuote(params['quoteId']).subscribe({
            next: (savedQuote) => {
              console.log('Quote loaded:', savedQuote);
              this.quoteForm.patchValue({
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
              });

              // Set boolean flags
              this.hasExtraCost = !!savedQuote.extraCostValue;
              this.hasTax = !!savedQuote.taxValue;
              this.hasDiscount = !!savedQuote.discountValue;
              this.hasFlatTotal = !!savedQuote.flatTotalValue;

              // Update quote rows and refresh table
              this.updateQuoteRows(savedQuote.rows);

              this.isSaving = false;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error loading quote:', err);
              this.isSaving = false;
              this.cdr.detectChanges();
            },
          });
        } else {
          // If no service data or quoteId, initialize with a default empty row
          const initialRow = this.createQuoteRow();
          this.quoteRows.push(initialRow);
          this.dataSource.data = [initialRow];
          this.cdr.detectChanges();
        }
      });
    }
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
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
      this.isLogoSupported = true;
    } else {
      this.isLogoSupported = false;
    }
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
    const formValue = this.quoteForm.value;
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

    this.quoteService.saveQuote(quote).subscribe({
      next: (savedQuote) => {
        console.log('Quote saved:', savedQuote);
        this.isSaving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error saving quote:', err);
        this.isSaving = false;
        this.cdr.detectChanges();
      },
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

    // Fonts
    pdf.setFont('helvetica', 'normal');

    // Header with Logo
    if (this.logoUrl) {
      try {
        // Load the image
        const img = new Image();
        img.src = this.logoUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Failed to load image'));
        });

        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas 2D context');
        }
        ctx.drawImage(img, 0, 0);

        // Convert canvas to a data URL that jsPDF can use
        const canvasDataUrl = canvas.toDataURL('image/png');
        const base64Data = canvasDataUrl.split(',')[1];
        const format = 'PNG';

        // Calculate dimensions
        const imgWidth = 30; // Width in mm
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
      margin,
      currentY,
      { maxWidth: contentWidth / 2 }
    );
    currentY += 15;
    if (this.quoteForm.get('shipTo')?.value) {
      pdf.text(
        `${this.quoteForm.get('shipToTitle')?.value || 'Ship To'}: ${this.quoteForm.get('shipTo')?.value}`,
        margin,
        currentY,
        { maxWidth: contentWidth / 2 }
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

    // Calculate Extra Costs distribution for PDF
    let extraCostPerRow = 0;
    if (this.hasExtraCost && this.quoteRows.length > 0) {
      const extraCostValue = parseFloat(this.quoteForm.get('extraCostValue')?.value) || 0;
      extraCostPerRow = extraCostValue / this.quoteRows.length;
    }

    // Table Header
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(this.quoteForm.get('itemHeader')?.value || 'Item', margin, currentY, { maxWidth: 80 });
    pdf.text(this.quoteForm.get('quantityHeader')?.value || 'Quantity', margin + 90, currentY);
    pdf.text(this.quoteForm.get('unitCostHeader')?.value || 'Rate', margin + 110, currentY);
    pdf.text(this.quoteForm.get('amountHeader')?.value || 'Amount', margin + 140, currentY);
    currentY += 5;
    pdf.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 5;

    // Table Rows with distributed Extra Costs
    pdf.setFont('helvetica', 'normal');
    this.quoteRows.controls.forEach((row) => {
      checkNewPage(10);
      const description = row.get('description')?.value || '';
      const quantity = row.get('quantity')?.value || 0;
      const unitPrice = row.get('unitPrice')?.value || 0;
      let total = row.get('total')?.value || 0;
      total += extraCostPerRow; // Add distributed extra cost to each row's total
      pdf.text(description, margin, currentY, { maxWidth: 80 });
      pdf.text(quantity.toString(), margin + 90, currentY);
      pdf.text(`$${unitPrice.toFixed(2)}`, margin + 110, currentY);
      pdf.text(`$${total.toFixed(2)}`, margin + 140, currentY);
      currentY += 7;
    });

    // Totals Section
    checkNewPage(50);
    currentY += 10;

    // Only show Subtotal if it's different from Total
    const subtotal = this.getSubtotal();
    const grandTotal = this.getGrandTotal();
    if (subtotal !== grandTotal) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Subtotal', margin, currentY);
      pdf.text(`$${subtotal.toFixed(2)}`, margin + 140, currentY);
      currentY += 7;
    }

    // Tax
    if (this.hasTax) {
      const value = parseFloat(this.quoteForm.get('taxValue')?.value) || 0;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Tax', margin, currentY);
      pdf.text(`${value}%`, margin + 140, currentY);
      currentY += 7;
    }

    // Discount
    if (this.hasDiscount) {
      const value = parseFloat(this.quoteForm.get('discountValue')?.value) || 0;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Discount', margin, currentY);
      pdf.text(`${value}%`, margin + 140, currentY);
      currentY += 7;
    }

    // Flat Total
    if (this.hasFlatTotal) {
      const value = parseFloat(this.quoteForm.get('flatTotalValue')?.value) || 0;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Flat Total', margin, currentY);
      pdf.text(`$${value.toFixed(2)}`, margin + 140, currentY);
      currentY += 7;
    }

    // Total
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
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pdf.internal.pageSize.getHeight() - margin);
    }

    const invoiceNumber = this.quoteForm.get('number')?.value || 'Quote';
    pdf.save(`${invoiceNumber}.pdf`);
  }

  async updateDatabase(quoteId: string): Promise<void> {
    this.isSaving = true;
    const formValue = this.quoteForm.value;
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
}