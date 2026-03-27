import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

export interface OverallBudgetDialogData {
  materialsCost: number;
  laborCost: number;
  costToBuild: number;
  generalConditionsSiteServices: number;
  permitsAdminFees: number;
  insuranceBonds: number;
  directAndInsurableSubtotal: number;
  overheadProfit: number;
  overheadPct: number;
  contingencyAllowance: number;
  contingencyPct: number;
  escalationAllowance: number;
  preTaxSubtotal: number;
  taxesAllowance: number;
  salesTaxPct: number;
  totalProjectCost: number;
  costPerSqFt: number;
  materialRatio: number;
  laborRatio: number;
}

@Component({
  selector: 'app-overall-budget-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MoneyPipe,
  ],
  template: `
    <div class="scope-modal">
      <header class="scope-modal-header">
        <div class="scope-modal-heading">
          <div class="scope-modal-icon budget">
            <mat-icon>attach_money</mat-icon>
          </div>
          <div>
            <h2>Project Budget Breakdown</h2>
            <p>Detailed cost analysis for this project</p>
          </div>
        </div>
        <button
          type="button"
          class="scope-close-btn"
          (click)="dialogRef.close()"
        >
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content class="scope-modal-content">
        <section class="scope-modal-section">
          <p class="scope-modal-section-title">Direct Costs</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row">
              <span>Material Costs</span>
              <strong>{{ data.materialsCost | money: true : 2 }}</strong>
            </div>
            <div class="scope-stat-row">
              <span>Labor Costs</span>
              <strong>{{ data.laborCost | money: true : 2 }}</strong>
            </div>
          </div>
        </section>

        <section class="scope-modal-section">
          <p class="scope-modal-section-title">Indirect & Soft Costs</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row">
              <span>General Conditions & Site Services</span>
              <strong>{{
                data.generalConditionsSiteServices | money: true : 2
              }}</strong>
            </div>
            <div class="scope-stat-row">
              <span>Permits & Admin Fees</span>
              <strong>{{ data.permitsAdminFees | money: true : 2 }}</strong>
            </div>
            <div class="scope-stat-row">
              <span>Insurance & Bonds</span>
              <strong>{{ data.insuranceBonds | money: true : 2 }}</strong>
            </div>
            <div class="scope-stat-row total">
              <span>Subtotal (Direct & Insurable Costs)</span>
              <strong>{{
                data.directAndInsurableSubtotal | money: true : 2
              }}</strong>
            </div>
          </div>
        </section>

        <section class="scope-modal-section">
          <p class="scope-modal-section-title">Markups & Contingencies</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row">
              <span
                >GC Overhead & Profit ({{
                  data.overheadPct | number: '1.0-2'
                }}%)</span
              >
              <strong>{{ data.overheadProfit | money: true : 2 }}</strong>
            </div>
            <div class="scope-stat-row">
              <span
                >Contingency Allowance ({{
                  data.contingencyPct | number: '1.0-2'
                }}%)</span
              >
              <strong>{{ data.contingencyAllowance | money: true : 2 }}</strong>
            </div>
            <div class="scope-stat-row">
              <span>Cost Escalation Allowance</span>
              <strong>{{ data.escalationAllowance | money: true : 2 }}</strong>
            </div>
            <div class="scope-stat-row total">
              <span>Subtotal (Pre-Tax Cost)</span>
              <strong>{{ data.preTaxSubtotal | money: true : 2 }}</strong>
            </div>
          </div>
        </section>

        <section class="scope-modal-section">
          <p class="scope-modal-section-title">Taxes</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row">
              <span
                >Sales Tax ({{
                  data.salesTaxPct | number: '1.0-2'
                }}% on materials)</span
              >
              <strong>{{ data.taxesAllowance | money: true : 2 }}</strong>
            </div>
          </div>
        </section>

        <section class="scope-modal-highlight">
          <div class="scope-highlight-top-row">
            <span>Total Project Budget</span>
            <strong>{{ data.totalProjectCost | money: true : 0 }}</strong>
          </div>
          <div class="scope-highlight-grid">
            <div>
              <p>Cost / Sq Ft</p>
              <span>{{ data.costPerSqFt | money: true : 2 }}</span>
            </div>
            <div>
              <p>Material Ratio</p>
              <span>{{ data.materialRatio | number: '1.0-0' }}%</span>
            </div>
            <div>
              <p>Labor Ratio</p>
              <span>{{ data.laborRatio | number: '1.0-0' }}%</span>
            </div>
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
        gap: 12px;

        h2 {
          margin: 0;
          font-size: var(--fs-sm);
          font-weight: var(--fw-bold);
          color: var(--color-text);
        }

        p {
          margin: 2px 0 0;
          font-size: var(--fs-2xs);
          color: var(--color-text-muted);
        }
      }

      .scope-modal-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        display: grid;
        place-items: center;

        mat-icon {
          width: 16px;
          height: 16px;
          font-size: 16px;
        }

        &.budget {
          background: color-mix(
            in oklab,
            var(--color-primary) 15%,
            transparent
          );

          mat-icon {
            color: var(--color-primary);
          }
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

        &:hover {
          background: color-mix(
            in oklab,
            var(--color-border) 65%,
            var(--color-surface-hover)
          );
        }

        mat-icon {
          width: 14px;
          height: 14px;
          font-size: 14px;
        }
      }

      .scope-modal-content {
        padding: var(--space-4) var(--space-5);
        display: grid;
        gap: var(--space-3);
        max-height: 70vh;
      }

      .scope-modal-section {
        border-radius: var(--radius-md);
        background: var(--color-surface-subtle);
        padding: var(--space-4);
      }

      .scope-modal-section-title {
        margin: 0 0 var(--space-3);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-muted);
        font-weight: var(--fw-semibold);
      }

      .scope-stat-list {
        display: grid;
        gap: 10px;
      }

      .scope-stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 14px;

        span {
          color: var(--color-text-muted);
        }

        strong {
          color: var(--color-text);
          font-weight: var(--fw-semibold);
        }

        &.total {
          padding-top: 10px;
          border-top: 1px solid var(--color-border);

          span {
            color: var(--color-text);
            font-weight: var(--fw-semibold);
          }

          strong {
            color: var(--color-text);
            font-weight: var(--fw-bold);
          }
        }
      }

      .scope-modal-highlight {
        border-radius: var(--radius-md);
        border: 1px solid
          color-mix(in oklab, var(--color-primary) 20%, transparent);
        background: color-mix(
          in oklab,
          var(--color-primary) 6%,
          var(--color-surface-subtle)
        );
        padding: var(--space-4);
      }

      .scope-highlight-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-3);

        span {
          font-size: var(--fs-sm);
          color: var(--color-text);
          font-weight: var(--fw-bold);
        }

        strong {
          font-size: var(--fs-lg);
          color: var(--color-primary);
          font-weight: var(--fw-bold);
        }
      }

      .scope-highlight-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;

        p {
          margin: 0 0 4px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
        }

        span {
          font-size: var(--fs-sm);
          font-weight: var(--fw-semibold);
          color: var(--color-text);
        }
      }
    `,
  ],
})
export class OverallBudgetDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<OverallBudgetDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OverallBudgetDialogData,
  ) {}
}
