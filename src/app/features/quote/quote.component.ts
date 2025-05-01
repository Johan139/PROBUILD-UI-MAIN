import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { QuoteService } from './quote.service';
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
    NgIf
  ],
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.scss'],
  providers: [QuoteService]
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

  @ViewChild('quoteContent', { static: false }) quoteContent!: ElementRef;
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
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
      quoteRows: this.fb.array([])
    });

    // Initialize dataSource with the initial row
    const initialRow = this.createQuoteRow();
    this.quoteRows.push(initialRow);
    this.dataSource.data = [initialRow];

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

  ngOnInit(): void {}

  createQuoteRow(): FormGroup {
    const row = this.fb.group({
      description: [''],
      quantity: [1],
      unitPrice: [0],
      total: [0]
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
      reader.onload = e => {
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
    pdf.text(`${this.quoteForm.get('toTitle')?.value}: ${this.quoteForm.get('to')?.value || ''}`, margin, currentY, { maxWidth: contentWidth / 2 });
    currentY += 15;
    if (this.quoteForm.get('shipTo')?.value) {
      pdf.text(`${this.quoteForm.get('shipToTitle')?.value}: ${this.quoteForm.get('shipTo')?.value}`, margin, currentY, { maxWidth: contentWidth / 2 });
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
    pdf.text(this.quoteForm.get('itemHeader')?.value, margin, currentY, { maxWidth: 80 });
    pdf.text(this.quoteForm.get('quantityHeader')?.value, margin + 90, currentY);
    pdf.text(this.quoteForm.get('unitCostHeader')?.value, margin + 110, currentY);
    pdf.text(this.quoteForm.get('amountHeader')?.value, margin + 140, currentY);
    currentY += 5;
    pdf.line(margin, currentY, margin + contentWidth, currentY);
    currentY += 5;

    // Table Rows with distributed Extra Costs
    pdf.setFont('helvetica', 'normal');
    this.quoteRows.controls.forEach(row => {
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

    pdf.setFont('helvetica', 'bold');
    pdf.text('Total', margin, currentY);
    pdf.text(`$${grandTotal.toFixed(2)}`, margin + 140, currentY);
    currentY += 7;

    // Commented out Amount Paid and Balance Due sections
    /*
    // Only include Amount Paid and Balance Due in PDF if hasAmountPaid is true
    if (this.hasAmountPaid) {
      pdf.setFont('helvetica', 'normal');
      pdf.text('Amount Paid', margin, currentY);
      pdf.text(`$${(this.quoteForm.get('amountPaid')?.value || 0).toFixed(2)}`, margin + 140, currentY);
      currentY += 7;
      pdf.text('Balance Due', margin, currentY);
      pdf.text(`$${(this.getGrandTotal() - (this.quoteForm.get('amountPaid')?.value || 0)).toFixed(2)}`, margin + 140, currentY);
      currentY += 7;
    } else {
      // If no Amount Paid, still show Balance Due as the full total
      pdf.setFont('helvetica', 'normal');
      pdf.text('Balance Due', margin, currentY);
      pdf.text(`$${this.getGrandTotal().toFixed(2)}`, margin + 140, currentY);
      currentY += 7;
    }
    */

    // Notes and Terms
    checkNewPage(30);
    currentY += 10;
    if (this.quoteForm.get('notes')?.value) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.quoteForm.get('notesTitle')?.value, margin, currentY);
      currentY += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.text(this.quoteForm.get('notes')?.value, margin, currentY, { maxWidth: contentWidth });
      currentY += 15;
    }
    if (this.quoteForm.get('terms')?.value) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(this.quoteForm.get('termsTitle')?.value, margin, currentY);
      currentY += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.text(this.quoteForm.get('terms')?.value, margin, currentY, { maxWidth: contentWidth });
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
}