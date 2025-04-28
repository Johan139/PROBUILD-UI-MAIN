import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
import { NgForOf, NgIf } from '@angular/common';
import html2canvas from 'html2canvas';
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
    NgForOf,
    NgIf
  ],
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.scss'],
  providers: [QuoteService]
})
export class QuoteComponent implements OnInit {
  quoteForm: FormGroup;
  isSaving = false;
  logoUrl: string | ArrayBuffer | null = null;
  isLogoSupported = true;
  dataSource = new MatTableDataSource<FormGroup>([]);
  displayedColumns: string[] = ['description', 'quantity', 'unitPrice', 'total', 'remove'];

  @ViewChild('quoteContent', { static: false }) quoteContent!: ElementRef;

  constructor(private fb: FormBuilder) {
    this.quoteForm = this.fb.group({
      header: [''],
      number: [''],
      from: [''],
      toTitle: [''],
      to: [''],
      shipToTitle: [''],
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
      notesTitle: ['Notes'],
      notes: [''],
      termsTitle: ['Terms'],
      terms: [''],
      quoteRows: this.fb.array([]),
      extraCosts: this.fb.array([])
    });

    // Initialize dataSource with the initial row
    const initialRow = this.createQuoteRow();
    this.quoteRows.push(initialRow);
    this.dataSource.data = [initialRow];
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

  get extraCosts(): FormArray {
    return this.quoteForm.get('extraCosts') as FormArray;
  }

  addRow(): void {
    const newRow = this.createQuoteRow();
    this.quoteRows.push(newRow);
    this.dataSource.data = this.quoteRows.controls as FormGroup[];
  }

  removeRow(index: number): void {
    if (this.quoteRows.length > 1) {
      this.quoteRows.removeAt(index);
      this.dataSource.data = this.quoteRows.controls as FormGroup[];
    }
  }

  addExtraCost(type: string): void {
    this.extraCosts.push(this.fb.group({
      title: [type === 'multiplyPercent' ? 'Tax' : type === 'addFixedValue' ? 'Shipping' : 'Discount'],
      type: [type],
      value: [0]
    }));
  }

  removeExtraCost(index: number): void {
    this.extraCosts.removeAt(index);
  }

  getSubtotal(): number {
    return this.quoteRows.controls.reduce((acc, row) => {
      const quantity = row.get('quantity')?.value || 0;
      const unitPrice = row.get('unitPrice')?.value || 0;
      const total = quantity * unitPrice;
      row.get('total')?.setValue(total, { emitEvent: false });
      return acc + total;
    }, 0);
  }

  getGrandTotal(): number {
    let subtotal = this.getSubtotal();
    this.extraCosts.controls.forEach(extra => {
      const value = extra.get('value')?.value || 0;
      if (extra.get('type')?.value === 'multiplyPercent') {
        subtotal += subtotal * (value / 100);
      } else if (extra.get('type')?.value === 'addFixedValue') {
        subtotal += value;
      }
    });
    return subtotal;
  }

  hasTax(): boolean {
    return this.extraCosts.controls.some(extra => extra.get('type')?.value === 'multiplyPercent' && extra.get('title')?.value === 'Tax');
  }

  hasDiscount(): boolean {
    return this.extraCosts.controls.some(extra => extra.get('title')?.value === 'Discount');
  }

  hasShipping(): boolean {
    return this.extraCosts.controls.some(extra => extra.get('type')?.value === 'addFixedValue' && extra.get('title')?.value === 'Shipping');
  }

  onLogoChange(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => this.logoUrl = reader.result;
      reader.readAsDataURL(file);
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
    const DATA = this.quoteContent.nativeElement;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

    // Temporarily hide interactive elements for PDF rendering
    const buttons = DATA.querySelectorAll('button, .file-input');
    buttons.forEach((btn: HTMLElement) => btn.style.display = 'none');

    // Capture the content as a canvas
    const canvas = await html2canvas(DATA, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: DATA.scrollWidth,
      windowHeight: DATA.scrollHeight
    });

    // Restore interactive elements
    buttons.forEach((btn: HTMLElement) => btn.style.display = '');

    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

    // Handle multi-page content
    if (imgHeight > pageHeight - 2 * margin) {
      const totalPages = Math.ceil(imgHeight / (pageHeight - 2 * margin));
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
          currentY = margin;
        }
        const srcY = i * (pageHeight - 2 * margin) * (imgProps.width / contentWidth);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = (pageHeight - 2 * margin) * (canvas.width / contentWidth);
        const ctx = tempCanvas.getContext('2d');
        ctx?.drawImage(canvas, 0, srcY, canvas.width, tempCanvas.height, 0, 0, canvas.width, tempCanvas.height);
        const pageImgData = tempCanvas.toDataURL('image/png');
        pdf.addImage(pageImgData, 'PNG', margin, currentY, contentWidth, pageHeight - 2 * margin);
      }
    } else {
      pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight);
    }

    // Add footer with page numbers
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - margin);
    }

    const invoiceNumber = this.quoteForm.get('number')?.value || 'Quote';
    pdf.save(`${invoiceNumber}.pdf`);
  }
}