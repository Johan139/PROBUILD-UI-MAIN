import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface SendToClientDialogData {
  quoteNumber: string;
  clientEmail?: string;
  clientName?: string;
  total: number;
  documentType: 'QUOTE' | 'INVOICE';
}

export interface SendToClientDialogResult {
  clientEmail: string;
  clientName?: string;
  personalMessage?: string;
  attachPdf: boolean;
}

@Component({
  selector: 'app-send-to-client-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <mat-icon class="header-icon">send</mat-icon>
        <h2 mat-dialog-title>Send {{ docTypeLabel }} to Client</h2>
      </div>

      <mat-dialog-content>
        <div class="quote-summary">
          <div class="summary-item">
            <span class="label">{{ docTypeLabel }} #:</span>
            <span class="value">{{ data.quoteNumber }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Total Amount:</span>
            <span class="value highlight">{{
              data.total | currency: 'USD' : 'symbol' : '1.2-2'
            }}</span>
          </div>
        </div>

        <form [formGroup]="form" class="send-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Client Email</mat-label>
            <input
              matInput
              type="email"
              formControlName="clientEmail"
              placeholder="client@example.com"
            />
            <mat-icon matSuffix>email</mat-icon>
            <mat-error *ngIf="form.get('clientEmail')?.hasError('required')">
              Email is required
            </mat-error>
            <mat-error *ngIf="form.get('clientEmail')?.hasError('email')">
              Please enter a valid email address
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Client Name (Optional)</mat-label>
            <input
              matInput
              type="text"
              formControlName="clientName"
              placeholder="John Doe"
            />
            <mat-icon matSuffix>person</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Personal Message (Optional)</mat-label>
            <textarea
              matInput
              formControlName="personalMessage"
              rows="4"
              placeholder="Add a personal note to your client..."
            ></textarea>
            <mat-hint align="end"
              >{{
                form.get('personalMessage')?.value?.length || 0
              }}/500</mat-hint
            >
          </mat-form-field>

          <div class="checkbox-row">
            <mat-checkbox formControlName="attachPdf" color="primary">
              Attach PDF copy of {{ docTypeLabel.toLowerCase() }}
            </mat-checkbox>
          </div>
        </form>

        <div class="info-box">
          <mat-icon>info</mat-icon>
          <span>
            The client will receive an email with the
            {{ docTypeLabel.toLowerCase() }} details. Once sent, the
            {{ docTypeLabel.toLowerCase() }} status will change to "Submitted".
          </span>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" [disabled]="isSending">
          Cancel
        </button>
        <button
          mat-raised-button
          class="send-btn"
          (click)="onSend()"
          [disabled]="form.invalid || isSending"
        >
          <mat-spinner *ngIf="isSending" diameter="20"></mat-spinner>
          <mat-icon *ngIf="!isSending">send</mat-icon>
          <span>{{ isSending ? 'Sending...' : 'Send to Client' }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-container {
        min-width: 450px;
      }

      .dialog-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 24px 0;
      }

      .header-icon {
        color: #fbd008;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      h2[mat-dialog-title] {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }

      mat-dialog-content {
        padding: 20px 24px;
      }

      .quote-summary {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
      }

      .summary-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .summary-item .label {
        font-size: 12px;
        color: #666;
        text-transform: uppercase;
      }

      .summary-item .value {
        font-size: 16px;
        font-weight: 500;
      }

      .summary-item .value.highlight {
        color: #2e7d32;
        font-size: 18px;
      }

      .send-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .full-width {
        width: 100%;
      }

      .checkbox-row {
        margin: 8px 0 16px;
      }

      .info-box {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: #fff3cd;
        border-left: 4px solid #fbd008;
        padding: 12px 16px;
        border-radius: 4px;
        margin-top: 16px;
      }

      .info-box mat-icon {
        color: #856404;
        flex-shrink: 0;
      }

      .info-box span {
        font-size: 13px;
        color: #856404;
        line-height: 1.5;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        gap: 8px;
      }

      .send-btn {
        background-color: #fbd008 !important;
        color: black !important;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .send-btn:hover:not([disabled]) {
        background-color: #e6bf00 !important;
      }

      .send-btn:disabled {
        opacity: 0.6;
      }

      .send-btn mat-spinner {
        display: inline-block;
      }

      .send-btn mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendToClientDialogComponent {
  form: FormGroup;
  isSending = false;

  get docTypeLabel(): string {
    return this.data.documentType === 'INVOICE' ? 'Invoice' : 'Quote';
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SendToClientDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SendToClientDialogData,
  ) {
    this.form = this.fb.group({
      clientEmail: [
        data.clientEmail || '',
        [Validators.required, Validators.email],
      ],
      clientName: [data.clientName || ''],
      personalMessage: ['', [Validators.maxLength(500)]],
      attachPdf: [true],
    });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSend(): void {
    if (this.form.invalid) {
      return;
    }

    const result: SendToClientDialogResult = {
      clientEmail: this.form.get('clientEmail')?.value,
      clientName: this.form.get('clientName')?.value || undefined,
      personalMessage: this.form.get('personalMessage')?.value || undefined,
      attachPdf: this.form.get('attachPdf')?.value,
    };

    this.dialogRef.close(result);
  }
}
