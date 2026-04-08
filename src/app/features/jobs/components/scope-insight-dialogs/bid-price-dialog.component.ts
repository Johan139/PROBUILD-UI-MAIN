import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

export interface BidPriceDialogData {
  suggestedBid: number;
  costToBuild: number;
  totalProjectCost: number;
  overheadProfit: number;
  contingencyAllowance: number;
  escalationAllowance: number;
  taxesAllowance: number;
  grossMargin: number;
  grossMarginPercent: number;
  markupOnCostPercent: number;
  riskExposure: number;
  netContractorProfit: number;
  netProfitMarginPercent: number;
  returnOnCostPercent: number;
  marketRangeLow: number;
  marketRangeHigh: number;
  costPerSqFt: number;
  bidPerSqFtText: string;
}

@Component({
  selector: 'app-bid-price-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MoneyPipe],
  template: `
    <div class="scope-modal">
      <header class="scope-modal-header">
        <div class="scope-modal-heading">
          <div class="scope-modal-icon bid">
            <mat-icon>trending_up</mat-icon>
          </div>
          <div>
            <h2>Bid Proposal Analysis</h2>
            <p>Pricing, margin, and market comparison</p>
          </div>
        </div>
        <button type="button" class="scope-close-btn" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content class="scope-modal-content">
        <section class="scope-modal-section">
          <p class="scope-modal-section-title">Bid Summary</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row"><span>Recommended Bid Price</span><strong class="accent">{{ data.suggestedBid | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Direct Cost (Base)</span><strong>{{ data.costToBuild | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Total Project Cost</span><strong>{{ data.totalProjectCost | money : true : 0 }}</strong></div>
          </div>
        </section>

        <section class="scope-modal-section">
          <p class="scope-modal-section-title">Profitability Analysis</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row"><span>Gross Margin</span><strong>{{ data.grossMargin | money : true : 0 }}</strong></div>
            <div class="scope-stat-row"><span>Gross Margin %</span><strong>{{ data.grossMarginPercent | number: '1.1-1' }}%</strong></div>
            <div class="scope-stat-row"><span>Markup on Cost</span><strong>{{ data.markupOnCostPercent | number: '1.1-1' }}%</strong></div>
            <div class="scope-stat-row"><span>Risk Exposure (Net of Contingency)</span><strong>{{ data.riskExposure | money : true : 0 }}</strong></div>
          </div>
        </section>

        <section class="scope-modal-profit-card">
          <p class="scope-modal-section-title success">Contractor Profit Calculation</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row"><span>Bid Price to Client</span><strong>{{ data.suggestedBid | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Less: Direct Costs</span><strong>-{{ data.costToBuild | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Plus: Overhead & Profit</span><strong>{{ data.overheadProfit | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Less: Contingency</span><strong>-{{ data.contingencyAllowance | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Less: Escalation</span><strong>-{{ data.escalationAllowance | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Less: Taxes</span><strong>-{{ data.taxesAllowance | money : true : 2 }}</strong></div>
            <div class="scope-divider"></div>
            <div class="scope-stat-row total"><span>Net Contractor Profit</span><strong class="success">{{ data.netContractorProfit | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Net Profit Margin</span><strong class="success">{{ data.netProfitMarginPercent | number: '1.1-1' }}%</strong></div>
            <div class="scope-stat-row"><span>Return on Cost</span><strong class="success">{{ data.returnOnCostPercent | number: '1.1-1' }}%</strong></div>
          </div>
        </section>

        <section class="scope-modal-section">
          <p class="scope-modal-section-title">Market Comparison</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row"><span>Market Range (Low)</span><strong>{{ data.marketRangeLow | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Market Range (High)</span><strong>{{ data.marketRangeHigh | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Cost per Sq Ft</span><strong>{{ data.costPerSqFt | money : true : 2 }}</strong></div>
            <div class="scope-stat-row"><span>Bid per Sq Ft</span><strong>{{ data.bidPerSqFtText }}</strong></div>
          </div>
        </section>
      </mat-dialog-content>
    </div>
  `,
  styles: [
    `
      .scope-modal {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        color: var(--color-text);
        overflow: hidden;
      }
      .scope-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4) var(--space-5);
        border-bottom: 1px solid var(--color-border);
      }
      .scope-modal-heading {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        h2 { margin: 0; font-size: var(--fs-sm); font-weight: var(--fw-bold); color: var(--color-text); }
        p { margin: 2px 0 0; font-size: var(--fs-2xs); color: var(--color-text-muted); }
      }
      .scope-modal-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        display: grid;
        place-items: center;
        mat-icon { width: 16px; height: 16px; font-size: 16px; }
        &.bid {
          background: color-mix(in oklab, var(--color-danger) 15%, transparent);
          mat-icon { color: var(--color-danger); }
        }
      }
      .scope-close-btn {
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: var(--radius-md);
        background: var(--color-surface-hover);
        color: var(--color-text-muted);
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .scope-modal-content {
        padding: var(--space-4) var(--space-5);
        display: grid;
        gap: var(--space-3);
        max-height: 70vh;
      }
      .scope-modal-section,
      .scope-modal-profit-card {
        border-radius: var(--radius-md);
        background: var(--color-surface-subtle);
        padding: var(--space-4);
      }
      .scope-modal-profit-card {
        background: color-mix(in oklab, var(--color-success) 5%, var(--color-surface-subtle));
        border: 1px solid color-mix(in oklab, var(--color-success) 20%, transparent);
      }
      .scope-modal-section-title {
        margin: 0 0 var(--space-3);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-muted);
        font-weight: var(--fw-semibold);
      }
      .scope-modal-section-title.success { color: var(--color-success); }
      .scope-stat-list { display: grid; gap: 10px; }
      .scope-stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        font-size: var(--fs-sm);
        span { color: var(--color-text-muted); }
        strong { color: var(--color-text); font-weight: var(--fw-semibold); }
        strong.accent { color: var(--color-primary); }
        strong.success { color: var(--color-success); }
      }
      .scope-stat-row.total {
        span { color: var(--color-text); font-weight: var(--fw-bold); }
      }
      .scope-divider {
        height: 1px;
        background: color-mix(in oklab, var(--color-success) 20%, transparent);
        margin: 2px 0;
      }
    `,
  ],
})
export class BidPriceDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<BidPriceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BidPriceDialogData,
  ) {}
}

