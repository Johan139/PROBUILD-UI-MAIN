import { Component, Inject, ChangeDetectorRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-ai-acceptance-dialog',
  standalone: true,
  imports: [MatDialogModule, CommonModule], // Add CommonModule for *ngIf
  changeDetection: ChangeDetectionStrategy.OnPush, // Explicit change detection strategy
  template: `
    <h1 mat-dialog-title>Confirm Job Details</h1>
    <div mat-dialog-content>
      <p>Please confirm that you have reviewed the AI-generated output and subtasks, and that you accept them as correct.</p>
      <p *ngIf="warningMessage && warningMessage.length > 0" 
         class="warning-message" 
         style="border: 2px solid red; display: block !important;">
        ⚠ {{ warningMessage }}
      </p>
    </div>
    <mat-dialog-actions align="end">
      <button mat-button class="dialog-btn return-btn" (click)="onCancel()">Cancel</button>
      <button mat-button class="dialog-btn confirm-btn"
              [disabled]="disableConfirm"
              (click)="onConfirm()">Confirm</button>
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
    .return-btn {
      background-color: #FBD008;
      color: #333;
    }
    .return-btn:hover {
      background-color: #e6bf00;
    }
     .confirm-btn {
      background-color: #FBD008;
      color: #333;
    }
    .confirm-btn:hover:not(:disabled) {
      background-color: #e6bf00;
    }
    .confirm-btn:disabled {
      background-color: #e0e0e0 !important;
      color: #9e9e9e !important;
      cursor: not-allowed;
      opacity: 0.6;
    }
    .warning-message {
      color: #b00020;
      font-weight: bold;
      margin-top: 12px;
      padding: 8px;
      background-color: #ffebee;
      border-radius: 4px;
    }
  `]
})
export class ConfirmAIAcceptanceDialogComponent implements OnInit {
  warningMessage: string | null = null;
  disableConfirm = false;

  constructor(
    private dialogRef: MatDialogRef<ConfirmAIAcceptanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Set properties first
    this.warningMessage = this.data?.warningMessage || null;
    this.disableConfirm = !!this.data?.disableConfirm;
    
    // console.log('Dialog data:', { 
    //   warningMessage: this.warningMessage, 
    //   disableConfirm: this.disableConfirm,
    //   rawData: this.data 
    // });
    
    // Force change detection
    this.cdr.detectChanges();
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}