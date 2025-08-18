import { Component, Inject } from '@angular/core';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { StripeService } from '../../services/StripeService';

@Component({
  selector: 'app-payment-prompt-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Registration Complete</h2>
    <mat-dialog-content>
      <p>Your account was created. Please complete payment to continue.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button class="dialog-btn skip-btn" (click)="skip()">Skip</button>
      <button mat-button class="dialog-btn pay-btn" (click)="continueToPayment()">Pay Now</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
    }
    p {
      font-size: 1rem;
      color: #555;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    mat-dialog-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
    }
    .dialog-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      transition: background-color 0.3s ease;
    }
    .skip-btn {
      background-color: #FBD008;
      color: #333;
    }
    .skip-btn:hover {
      background-colorwater: #e6bf00;
    }
    .pay-btn {
      background-color: #FBD008;
      color: #333;
    }
    .pay-btn:hover {
      background-color: #e6bf00;
    }
  `]
})
export class PaymentPromptDialogComponent {
    constructor(
      private dialogRef: MatDialogRef<PaymentPromptDialogComponent>,
      private stripeService: StripeService,
      @Inject(MAT_DIALOG_DATA) public data: {source: string, userId: string, packageName: string; amount: number }
    ) {}
  
    continueToPayment() {
        this.stripeService.createCheckoutSession({
          userId: this.data.userId, 
          packageName: this.data.packageName,
          amount: this.data.amount,
          source: this.data.source,
          assignedUser:''
        }).subscribe({
          next: res => {
            console.log(res)
            this.dialogRef.close();
            window.location.href = res.url;
          },
          error: err => console.error('Checkout session error', err)
        });
      }
  
    skip() {
      this.dialogRef.close();
    }
  }