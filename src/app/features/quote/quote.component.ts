import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { QuoteService } from './quote.service';
import { Quote, QuoteRow } from './quote.model';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTable } from '@angular/material/table';
import { NgForOf, NgIf, AsyncPipe } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
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
    NgForOf,
    NgIf,
    AsyncPipe
  ],
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.scss'],
  providers: [QuoteService]
})
export class QuoteComponent implements OnInit {
  quoteForm: FormGroup;
  displayedColumns: string[] = ['description', 'quantity', 'unitPrice', 'total', 'actions'];
  extraCostColumns: string[] = ['type', 'value', 'actions'];
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  private grandTotalSubject = new BehaviorSubject<number>(0); // Reactive grand total
  grandTotal$ = this.grandTotalSubject.asObservable();

  @ViewChild('quoteTable') quoteTable!: MatTable<any>;
  @ViewChild('extraCostTable') extraCostTable!: MatTable<any>;

  constructor(
    private fb: FormBuilder,
    private quoteService: QuoteService,
    private cdr: ChangeDetectorRef
  ) {
    this.quoteForm = this.fb.group({
      quoteRows: this.fb.array([]),
      extraCosts: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.addRow();
    this.addExtraCost();
    // Subscribe to form changes with debounce to update grand total
    this.quoteForm.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.updateGrandTotal();
    });
  }

  get quoteRows(): FormArray {
    return this.quoteForm.get('quoteRows') as FormArray;
  }

  get extraCosts(): FormArray {
    return this.quoteForm.get('extraCosts') as FormArray;
  }

  addRow(): void {
    const row = this.fb.group({
      description: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      total: [{ value: 0, disabled: true }]
    });
    this.quoteRows.push(row);
    // Subscribe to row changes with debounce to update its total
    row.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.updateRowTotal(this.quoteRows.controls.indexOf(row));
    });
    this.updateRowTotal(this.quoteRows.length - 1);
    
    if (this.quoteTable) {
      this.quoteTable.renderRows();
    }
    this.cdr.detectChanges();
    console.log('Added row:', row.value);
    console.log('Current rows:', this.quoteRows.controls.length);
  }

  removeRow(index: number): void {
    this.quoteRows.removeAt(index);
    if (this.quoteTable) {
      this.quoteTable.renderRows();
    }
    this.cdr.detectChanges();
    console.log('Removed row, remaining:', this.quoteRows.controls.length);
  }

  addExtraCost(): void {
    const extraCost = this.fb.group({
      type: ['none'],
      value: [0]
    });
    this.extraCosts.push(extraCost);
    if (this.extraCostTable) {
      this.extraCostTable.renderRows();
    }
    this.cdr.detectChanges();
    console.log('Added extra cost:', extraCost.value);
    console.log('Current extra costs:', this.extraCosts.controls.length);
  }

  removeExtraCost(index: number): void {
    this.extraCosts.removeAt(index);
    if (this.extraCostTable) {
      this.extraCostTable.renderRows();
    }
    this.cdr.detectChanges();
    console.log('Removed extra cost, remaining:', this.extraCosts.controls.length);
  }

  updateRowTotal(index: number): void {
    if (index < 0 || index >= this.quoteRows.length) return; // Guard against invalid index
    const row = this.quoteRows.at(index) as FormGroup;
    const quantity = row.get('quantity')?.value || 0;
    const unitPrice = row.get('unitPrice')?.value || 0;

    const total = quantity * unitPrice;

    row.get('total')?.patchValue(total.toFixed(2), { emitEvent: false }); // Prevent loop
    console.log('Row total updated:', row.value);
  }

  updateGrandTotal(): void {
    let grandTotal = 0;
    this.quoteRows.controls.forEach((row, index) => {
      const quantity = row.get('quantity')?.value || 0;
      const unitPrice = row.get('unitPrice')?.value || 0;
      const total = quantity * unitPrice;
      row.get('total')?.patchValue(total.toFixed(2), { emitEvent: false }); // Update row total
      grandTotal += parseFloat(row.get('total')?.value || 0);
    });

    this.extraCosts.controls.forEach(extraCost => {
      const type = extraCost.get('type')?.value;
      const value = extraCost.get('value')?.value || 0;

      if (type === 'multiplyPercent') {
        grandTotal *= (1 + value / 100);
      } else if (type === 'dividePercent') {
        grandTotal /= (1 + value / 100);
      } else if (type === 'multiplyValue') {
        grandTotal += value;
      } else if (type === 'divideValue') {
        grandTotal -= value;
      } else if (type === 'addFixedValue') {
        grandTotal += value;
      }
    });

    grandTotal = parseFloat(grandTotal.toFixed(2));
    this.grandTotalSubject.next(grandTotal);
    this.cdr.detectChanges();
    console.log('Grand total updated:', grandTotal);
    console.log('All rows:', this.quoteRows.controls.map(c => c.value));
    console.log('All extra costs:', this.extraCosts.controls.map(c => c.value));
  }

  getGrandTotal(): number {
    return this.grandTotalSubject.value;
  }

  onSubmit(): void {
    console.log('Form status:', this.quoteForm.status, this.quoteForm.value);
    if (!this.isSaving) {
      this.isSaving = true;
      this.errorMessage = null;
      this.successMessage = null;

      const quote: Quote = {
        id: null,
        rows: this.quoteRows.value,
        total: this.getGrandTotal(),
        createdDate: new Date(),
        extraCosts: this.extraCosts.value.map((ec: any) => ({ type: ec.type, value: ec.value }))
      };

      this.quoteService.saveQuote(quote).subscribe({
        next: (response: Quote) => {
          this.successMessage = 'Quote saved successfully';
          this.isSaving = false;
          this.generatePDF(response);
        },
        error: (error) => {
          this.errorMessage = 'Failed to save quote. Please try again.';
          this.isSaving = false;
        }
      });
    } else {
      this.errorMessage = 'Please fill all required fields correctly.';
    }
  }

  generatePDF(quote: Quote): void {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Quote', 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${quote.createdDate.toLocaleDateString()}`, 20, 30);

    let y = 50;
    doc.setFontSize(14);
    doc.text('Quote Details', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.text('Description', 20, y);
    doc.text('Quantity', 80, y);
    doc.text('Unit Price', 100, y);
    doc.text('Total', 140, y);
    y += 5;
    doc.line(20, y, 190, y);
    y += 5;

    quote.rows.forEach(row => {
      doc.text(row.description || 'N/A', 20, y);
      doc.text(row.quantity.toString(), 80, y);
      doc.text(`$${row.unitPrice.toFixed(2)}`, 100, y);
      doc.text(`$${row.total}`, 140, y);
      y += 10;
    });

    y += 5;
    doc.line(20, y, 190, y);
    y += 10;

    if (quote.extraCosts.length > 0) {
      doc.setFontSize(14);
      doc.text('Extra Costs', 20, y);
      y += 10;
      doc.setFontSize(10);
      quote.extraCosts.forEach(ec => {
        if (ec.type !== 'none') {
          doc.text(`${ec.type}: ${ec.value}`, 20, y);
          y += 10;
        }
      });
      y += 5;
      doc.line(20, y, 190, y);
      y += 10;
    }

    doc.setFontSize(12);
    doc.text(`Grand Total: $${quote.total.toFixed(2)}`, 140, y);

    doc.save(`quote_${quote.createdDate.toISOString()}.pdf`);
  }
}