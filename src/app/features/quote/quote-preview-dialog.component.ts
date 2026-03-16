import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface QuotePreviewData {
  // Header info
  documentType: 'QUOTE' | 'INVOICE';
  number: string;
  date: string;
  dueDate: string;

  // Company info
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  logoUrl?: string | null;

  // Client info
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;

  // Project info
  projectName?: string;
  projectAddress?: string;

  // Line items
  rows: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }[];

  // Totals
  subtotal: number;
  extraCost?: number;
  taxRate?: number;
  taxAmount?: number;
  discountRate?: number;
  discountAmount?: number;
  grandTotal: number;

  // Invoice-specific
  paymentTerms?: string;
  amountPaid?: number;
  balanceDue?: number;

  // Notes
  notes?: string;
  terms?: string;
}

@Component({
  selector: 'app-quote-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    CurrencyPipe,
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-container">
      <!-- Dialog Header -->
      <div class="dialog-header">
        <h2>
          {{ data.documentType === 'INVOICE' ? 'Invoice' : 'Quote' }} Preview
        </h2>
        <div class="header-actions">
          <button
            mat-icon-button
            matTooltip="Print preview"
            (click)="printPreview()"
          >
            <mat-icon>print</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Close" (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Scrollable Preview Content -->
      <div class="preview-scroll-container">
        <div class="quote-preview" id="quote-preview-content">
          <!-- Quote Header -->
          <header class="preview-header">
            <div class="company-section">
              <img
                *ngIf="data.logoUrl"
                [src]="data.logoUrl"
                alt="Company Logo"
                class="company-logo"
              />
              <div class="company-info">
                <h3 class="company-name">{{ data.companyName }}</h3>
                <p *ngIf="data.companyAddress">{{ data.companyAddress }}</p>
                <p *ngIf="data.companyEmail">{{ data.companyEmail }}</p>
                <p *ngIf="data.companyPhone">{{ data.companyPhone }}</p>
              </div>
            </div>

            <div class="document-section">
              <h1 class="document-title">
                {{ data.documentType === 'INVOICE' ? 'INVOICE' : 'QUOTE' }}
              </h1>
              <div class="document-meta">
                <div class="meta-row">
                  <span class="label">
                    {{ data.documentType === 'INVOICE' ? 'Invoice' : 'Quote' }}
                    #:
                  </span>
                  <span class="value">{{ data.number || 'DRAFT' }}</span>
                </div>
                <div class="meta-row">
                  <span class="label">Date:</span>
                  <span class="value">{{
                    data.date | date: 'mediumDate'
                  }}</span>
                </div>
                <div class="meta-row">
                  <span class="label">
                    {{
                      data.documentType === 'INVOICE'
                        ? 'Due Date'
                        : 'Valid Until'
                    }}:
                  </span>
                  <span class="value">{{
                    data.dueDate | date: 'mediumDate'
                  }}</span>
                </div>
                <!-- Payment Terms - Invoice only -->
                <div
                  class="meta-row"
                  *ngIf="data.documentType === 'INVOICE' && data.paymentTerms"
                >
                  <span class="label">Payment Terms:</span>
                  <span class="value">{{ data.paymentTerms }}</span>
                </div>
              </div>
            </div>
          </header>

          <div class="divider"></div>

          <!-- Bill To & Project Section -->
          <section class="details-section">
            <div class="detail-block">
              <h4>BILL TO</h4>
              <p class="client-name">{{ data.clientName || 'Client Name' }}</p>
              <p *ngIf="data.clientAddress">{{ data.clientAddress }}</p>
              <p *ngIf="data.clientPhone">{{ data.clientPhone }}</p>
              <p *ngIf="data.clientEmail">{{ data.clientEmail }}</p>
            </div>

            <div
              class="detail-block"
              *ngIf="data.projectName || data.projectAddress"
            >
              <h4>PROJECT</h4>
              <p *ngIf="data.projectName" class="project-name">
                {{ data.projectName }}
              </p>
              <p *ngIf="data.projectAddress">{{ data.projectAddress }}</p>
            </div>
          </section>

          <div class="divider"></div>

          <!-- Line Items Table -->
          <section class="items-section">
            <table class="items-table">
              <thead>
                <tr>
                  <th class="desc-col">Description</th>
                  <th class="qty-col">Qty</th>
                  <th class="unit-col">Unit</th>
                  <th class="price-col">Unit Price</th>
                  <th class="amount-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of data.rows">
                  <td class="desc-col">{{ row.description }}</td>
                  <td class="qty-col">{{ row.quantity }}</td>
                  <td class="unit-col">{{ row.unit }}</td>
                  <td class="price-col">
                    {{ row.unitPrice | currency: 'USD' : 'symbol' : '1.2-2' }}
                  </td>
                  <td class="amount-col">
                    {{ row.total | currency: 'USD' : 'symbol' : '1.2-2' }}
                  </td>
                </tr>
                <tr *ngIf="data.rows.length === 0" class="empty-row">
                  <td colspan="5">No line items added</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Totals Section -->
          <section class="totals-section">
            <div class="totals-container">
              <div class="total-row">
                <span class="label">Subtotal:</span>
                <span class="value">
                  {{ data.subtotal | currency: 'USD' : 'symbol' : '1.2-2' }}
                </span>
              </div>

              <div
                class="total-row"
                *ngIf="data.extraCost && data.extraCost > 0"
              >
                <span class="label">Extra Cost:</span>
                <span class="value">
                  {{ data.extraCost | currency: 'USD' : 'symbol' : '1.2-2' }}
                </span>
              </div>

              <div
                class="total-row"
                *ngIf="data.discountRate && data.discountRate > 0"
              >
                <span class="label">Discount ({{ data.discountRate }}%):</span>
                <span class="value negative">
                  -{{
                    data.discountAmount | currency: 'USD' : 'symbol' : '1.2-2'
                  }}
                </span>
              </div>

              <div class="total-row" *ngIf="data.taxRate && data.taxRate > 0">
                <span class="label">Tax ({{ data.taxRate }}%):</span>
                <span class="value">
                  {{ data.taxAmount | currency: 'USD' : 'symbol' : '1.2-2' }}
                </span>
              </div>

              <div class="totals-divider"></div>

              <!-- Grand Total -->
              <div class="total-row grand-total">
                <span class="label">Total:</span>
                <span class="value">
                  {{ data.grandTotal | currency: 'USD' : 'symbol' : '1.2-2' }}
                </span>
              </div>

              <!-- Amount Paid - Invoice only -->
              <div
                class="total-row amount-paid"
                *ngIf="data.amountPaid && data.amountPaid > 0"
              >
                <span class="label">Amount Paid:</span>
                <span class="value paid">
                  -{{ data.amountPaid | currency: 'USD' : 'symbol' : '1.2-2' }}
                </span>
              </div>

              <!-- Balance Due - Invoice only -->
              <div
                class="total-row balance-due"
                *ngIf="
                  data.balanceDue !== undefined &&
                  data.amountPaid &&
                  data.amountPaid > 0
                "
                [class.paid-in-full]="data.balanceDue <= 0"
              >
                <span class="label">
                  {{ data.balanceDue > 0 ? 'Balance Due:' : 'Paid in Full:' }}
                </span>
                <span class="value">
                  {{
                    (data.balanceDue < 0 ? 0 : data.balanceDue)
                      | currency: 'USD' : 'symbol' : '1.2-2'
                  }}
                </span>
              </div>
            </div>
          </section>

          <!-- Notes & Terms -->
          <section class="notes-section" *ngIf="data.notes || data.terms">
            <div class="notes-block" *ngIf="data.notes">
              <h4>NOTES</h4>
              <p>{{ data.notes }}</p>
            </div>

            <div class="terms-block" *ngIf="data.terms">
              <h4>TERMS & CONDITIONS</h4>
              <p>{{ data.terms }}</p>
            </div>
          </section>

          <!-- Footer -->
          <footer class="preview-footer">
            <p>Generated by ProBuildAI</p>
          </footer>
        </div>
      </div>

      <!-- Dialog Actions -->
      <div class="dialog-actions">
        <button mat-button class="btn btn-secondary" (click)="close()">Close</button>
        <button mat-button class="btn btn-ghost" (click)="printPreview()">
          <mat-icon>print</mat-icon>
          Print
        </button>
        <button
          mat-button
          class="btn btn-primary"
          (click)="confirmAndClose()"
        >
          Looks Good
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .preview-container {
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        width: 100%;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid #e0e0e0;
        background: #f8f9fa;

        h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 500;
          color: #333333;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }
      }

      .preview-scroll-container {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        background: #f5f5f5;
      }

      .quote-preview {
        max-width: 800px;
        margin: 0 auto;
        background: #ffffff;
        padding: 40px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border-radius: 4px;
      }

      .preview-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 24px;
      }

      .company-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .company-logo {
        max-width: 120px;
        max-height: 60px;
        object-fit: contain;
      }

      .company-info {
        .company-name {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #333333;
        }

        p {
          margin: 0;
          font-size: 0.85rem;
          color: #666666;
          line-height: 1.4;
        }
      }

      .document-section {
        text-align: right;
      }

      .document-title {
        font-size: 2rem;
        font-weight: 700;
        color: #fbd008;
        margin: 0 0 16px 0;
        letter-spacing: 2px;
      }

      .document-meta {
        .meta-row {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-bottom: 4px;
          font-size: 0.9rem;

          .label {
            color: #666666;
          }

          .value {
            font-weight: 500;
            min-width: 100px;
            text-align: left;
            color: #333333;
          }
        }
      }

      .divider {
        height: 1px;
        background: #e0e0e0;
        margin: 16px 0;
      }

      .details-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 32px;
        padding: 24px 0;
      }

      .detail-block {
        h4 {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #666666;
          margin: 0 0 8px 0;
          letter-spacing: 0.5px;
        }

        .client-name,
        .project-name {
          font-weight: 600;
          color: #333333;
          margin: 0 0 4px 0;
        }

        p {
          margin: 0 0 2px 0;
          font-size: 0.9rem;
          color: #666666;
          line-height: 1.5;
        }
      }

      .items-section {
        padding: 24px 0;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;

        th {
          background: #f8f9fa;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          color: #333333;
          border-bottom: 2px solid #e0e0e0;
        }

        td {
          padding: 12px 8px;
          border-bottom: 1px solid #eeeeee;
          color: #666666;
        }

        .desc-col {
          width: 40%;
        }

        .qty-col,
        .unit-col {
          width: 10%;
          text-align: center;
        }

        .price-col,
        .amount-col {
          width: 20%;
          text-align: right;
        }

        th.qty-col,
        th.unit-col {
          text-align: center;
        }

        th.price-col,
        th.amount-col {
          text-align: right;
        }

        .empty-row td {
          text-align: center;
          color: #666666;
          font-style: italic;
        }
      }

      .totals-section {
        display: flex;
        justify-content: flex-end;
        padding: 24px 0;
      }

      .totals-container {
        width: 280px;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 0.9rem;

        .label {
          color: #666666;
        }

        .value {
          font-weight: 500;
          color: #333333;

          &.negative {
            color: #dc3545;
          }

          &.paid {
            color: #28a745;
          }
        }
      }

      .totals-divider {
        height: 1px;
        background: #e0e0e0;
        margin: 8px 0;
      }

      .total-row.grand-total {
        padding: 12px;
        margin-top: 8px;
        background: #fbd008;
        border-radius: 4px;
        font-size: 1.1rem;

        .label,
        .value {
          font-weight: 700;
          color: #000000;
        }
      }

      /* Amount Paid row */
      .total-row.amount-paid {
        margin-top: 8px;
        padding: 8px 12px;
        background: rgba(40, 167, 69, 0.1);
        border-radius: 4px;

        .label {
          color: #28a745;
        }

        .value {
          color: #28a745;
          font-weight: 600;
        }
      }

      /* Balance Due row */
      .total-row.balance-due {
        padding: 12px;
        margin-top: 8px;
        background: #dc3545;
        border-radius: 4px;
        font-size: 1.1rem;

        .label,
        .value {
          font-weight: 700;
          color: #ffffff;
        }
      }

      /* Paid in Full variation */
      .total-row.balance-due.paid-in-full {
        background: #28a745;

        .label,
        .value {
          color: #ffffff;
        }
      }

      .notes-section {
        padding: 24px 0;
        border-top: 1px solid #e0e0e0;
      }

      .notes-block,
      .terms-block {
        margin-bottom: 16px;

        &:last-child {
          margin-bottom: 0;
        }

        h4 {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #666666;
          margin: 0 0 8px 0;
          letter-spacing: 0.5px;
        }

        p {
          margin: 0;
          font-size: 0.85rem;
          color: #666666;
          line-height: 1.6;
          white-space: pre-wrap;
        }
      }

      .preview-footer {
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;
        text-align: center;

        p {
          margin: 0;
          font-size: 0.75rem;
          color: #999999;
        }
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 24px;
        border-top: 1px solid #e0e0e0;
        background: #f8f9fa;

        .btn-primary {
          background-color: #fbd008;
          color: #000000;

          &:hover {
            background-color: #e6bf00;
          }
        }

        button mat-icon {
          margin-right: 4px;
        }
      }

      @media print {
        .dialog-header,
        .dialog-actions {
          display: none !important;
        }

        .preview-scroll-container {
          padding: 0;
          overflow: visible;
          background: white;
        }

        .quote-preview {
          box-shadow: none;
          padding: 0;
          max-width: 100%;
        }
      }
    `,
  ],
})
export class QuotePreviewDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<QuotePreviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QuotePreviewData,
  ) {}

  close(): void {
    this.dialogRef.close(false);
  }

  confirmAndClose(): void {
    this.dialogRef.close(true);
  }

  printPreview(): void {
    const printContent = document.getElementById('quote-preview-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the preview.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${this.data.documentType} #${this.data.number || 'DRAFT'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #333;
            }
            .preview-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 24px;
              padding-bottom: 24px;
              border-bottom: 1px solid #e0e0e0;
            }
            .company-logo {
              max-width: 120px;
              max-height: 60px;
              object-fit: contain;
              margin-bottom: 12px;
            }
            .company-name {
              font-size: 1.1rem;
              font-weight: 600;
              color: #333;
              margin-bottom: 4px;
            }
            .company-info p {
              font-size: 0.85rem;
              color: #666;
              line-height: 1.4;
            }
            .document-title {
              font-size: 2rem;
              font-weight: 700;
              color: #fbd008;
              text-align: right;
              margin-bottom: 16px;
              letter-spacing: 2px;
            }
            .meta-row {
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              margin-bottom: 4px;
              font-size: 0.9rem;
            }
            .meta-row .label { color: #666; }
            .meta-row .value { font-weight: 500; min-width: 100px; color: #333; }
            .divider { display: none; }
            .details-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 32px;
              padding: 24px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .detail-block h4 {
              font-size: 0.7rem;
              font-weight: 600;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            }
            .detail-block p {
              font-size: 0.9rem;
              color: #666;
              line-height: 1.5;
              margin-bottom: 2px;
            }
            .client-name, .project-name {
              font-weight: 600;
              color: #333;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 24px 0;
              font-size: 0.9rem;
            }
            .items-table th {
              background: #f8f9fa;
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
              color: #333;
              border-bottom: 2px solid #e0e0e0;
            }
            .items-table td {
              padding: 12px 8px;
              border-bottom: 1px solid #eee;
              color: #666;
            }
            .items-table .qty-col, .items-table .unit-col { text-align: center; }
            .items-table .price-col, .items-table .amount-col { text-align: right; }
            .totals-section {
              display: flex;
              justify-content: flex-end;
              padding: 24px 0;
            }
            .totals-container { width: 280px; }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 0.9rem;
            }
            .total-row .label { color: #666; }
            .total-row .value { font-weight: 500; color: #333; }
            .total-row .value.negative { color: #dc3545; }
            .total-row .value.paid { color: #28a745; }
            .totals-divider {
              height: 1px;
              background: #e0e0e0;
              margin: 8px 0;
            }
            .total-row.grand-total {
              padding: 12px;
              margin-top: 8px;
              background: #fbd008;
              border-radius: 4px;
              font-size: 1.1rem;
            }
            .total-row.grand-total .label,
            .total-row.grand-total .value {
              font-weight: 700;
              color: #000;
            }
            .total-row.amount-paid {
              margin-top: 8px;
              padding: 8px 12px;
              background: rgba(40, 167, 69, 0.1);
              border-radius: 4px;
            }
            .total-row.amount-paid .label,
            .total-row.amount-paid .value {
              color: #28a745;
              font-weight: 600;
            }
            .total-row.balance-due {
              padding: 12px;
              margin-top: 8px;
              background: #dc3545;
              border-radius: 4px;
              font-size: 1.1rem;
            }
            .total-row.balance-due .label,
            .total-row.balance-due .value {
              font-weight: 700;
              color: #fff;
            }
            .total-row.balance-due.paid-in-full {
              background: #28a745;
            }
            .notes-section {
              padding: 24px 0;
              border-top: 1px solid #e0e0e0;
            }
            .notes-block, .terms-block { margin-bottom: 16px; }
            .notes-block h4, .terms-block h4 {
              font-size: 0.7rem;
              font-weight: 600;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            }
            .notes-block p, .terms-block p {
              font-size: 0.85rem;
              color: #666;
              line-height: 1.6;
              white-space: pre-wrap;
            }
            .preview-footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #e0e0e0;
              text-align: center;
              font-size: 0.75rem;
              color: #999;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
}
