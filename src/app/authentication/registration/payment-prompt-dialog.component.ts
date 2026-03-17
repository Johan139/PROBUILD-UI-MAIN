import { Component, Inject } from '@angular/core';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { StripeService } from '../../services/StripeService';
export type BillingCycle = 'monthly' | 'yearly';
@Component({
  selector: 'app-payment-prompt-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Registration Complete</h2>
    <mat-dialog-content>
      <p>Your account was created. Please complete payment to continue.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button class="btn btn-secondary" (click)="skip()">Pay Later</button>
      <button mat-button class="btn btn-primary" (click)="continueToPayment()">Pay Now</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: 16px;
      }
      p {
        font-size: 1rem;
        color: var(--color-text-muted);
        line-height: 1.5;
        margin-bottom: 16px;
      }
    `,
  ],
})
export class PaymentPromptDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<PaymentPromptDialogComponent>,
    private stripeService: StripeService,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      source: string;
      userId: string;
      packageName: string;
      amount: number;
      billingCycle: BillingCycle;
    }
  ) {}
  ngOnInit() {
  }
  continueToPayment() {
    this.stripeService
      .createCheckoutSession({
        userId: this.data.userId,
        packageName: this.data.packageName,
        amount: this.data.amount,
        source: this.data.source,
        assignedUser: '',
        billingCycle: this.data.billingCycle,
        SubscriptionId: '',
      })
      .subscribe({
        next: (res) => {
          this.dialogRef.close();
          window.location.href = res.url;
        },
        error: (err) => console.error('Checkout session error', err),
      });
  }

  skip() {
    this.dialogRef.close();
  }
}
