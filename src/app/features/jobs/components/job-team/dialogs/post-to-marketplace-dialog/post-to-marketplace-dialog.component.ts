import { Component, Inject, OnInit } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { JobsService } from '../../../../../../services/jobs.service';
import { trades } from '../../../../../../data/registration-data';

@Component({
  selector: 'app-post-to-marketplace-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Post Job to Marketplace</h2>
      <mat-dialog-content>
        <div class="header-info">
          <p>Find qualified subcontractors for your project</p>
        </div>
    
        <form [formGroup]="form" class="dialog-form">
          <mat-form-field appearance="outline">
            <mat-label>Trade Required</mat-label>
            <mat-select formControlName="trade">
              @for (trade of trades; track trade) {
                <mat-option [value]="trade.value">
                  {{ trade.display }}
                </mat-option>
              }
            </mat-select>
            @if (form.get('trade')?.hasError('required')) {
              <mat-error>Required</mat-error>
            }
          </mat-form-field>
    
          <mat-form-field appearance="outline">
            <mat-label>Estimated Budget ($)</mat-label>
            <input matInput type="number" formControlName="budget" placeholder="150000">
            @if (form.get('budget')?.hasError('required')) {
              <mat-error>Required</mat-error>
            }
          </mat-form-field>
    
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Start Date</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="startDate">
              <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>
    
            <mat-form-field appearance="outline">
              <mat-label>Duration (e.g. 6 weeks)</mat-label>
              <input matInput formControlName="duration" placeholder="6 weeks">
            </mat-form-field>
          </div>
    
          <mat-form-field appearance="outline">
            <mat-label>Job Description</mat-label>
            <textarea matInput formControlName="description" rows="3" placeholder="Describe the scope of work..."></textarea>
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" [disabled]="form.invalid || isSubmitting" (click)="onSubmit()">
          {{ isSubmitting ? 'Posting...' : 'Post to Marketplace' }}
        </button>
      </mat-dialog-actions>
    </div>
    `,
  styles: [`
    .dialog-container {
      background-color: var(--color-surface);
      color: var(--color-text);
      border-radius: var(--radius-md);
      padding: var(--space-2);
    }
    h2[mat-dialog-title] {
      color: var(--color-text);
    }
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-top: var(--space-2);
      min-width: 450px;
    }
    .header-info {
      margin-bottom: var(--space-4);
      color: var(--color-text-muted);
    }
    .row {
      display: flex;
      gap: var(--space-4);

      mat-form-field {
        flex: 1;
      }
    }
    mat-form-field {
      width: 100%;
    }
  `]
})
export class PostToMarketplaceDialogComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  trades = trades;

  constructor(
    private fb: FormBuilder,
    private jobsService: JobsService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<PostToMarketplaceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number, prefilledTrade?: string, projectDetails?: any }
  ) {
    this.form = this.fb.group({
      trade: ['', Validators.required],
      budget: ['', Validators.required],
      startDate: [''],
      duration: [''],
      description: ['']
    });
  }

  ngOnInit(): void {
    if (this.data.prefilledTrade) {
      // Try to find matching trade value
      const matchingTrade = this.trades.find(t =>
        t.value === this.data.prefilledTrade ||
        t.display === this.data.prefilledTrade ||
        t.value.includes(this.data.prefilledTrade!)
      );
      if (matchingTrade) {
        this.form.patchValue({ trade: matchingTrade.value });
      }
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.isSubmitting = true;
      const formValue = this.form.value;
      const jobId = this.data.jobId;

      // Fetch fresh job data to ensure we don't overwrite other fields
      this.jobsService.getSpecificJob(jobId).subscribe({
        next: (job) => {
          // Update requiredSubcontractorTypes
          const currentTrades = job.trades || []; // backend DTO maps RequiredSubcontractorTypes to trades
          if (!currentTrades.includes(formValue.trade)) {
            currentTrades.push(formValue.trade);
          }

          // Update Trade Budgets
          const currentBudgets = job.tradeBudgets || [];
          // Check if budget exists for this trade, if so update, else add
          const existingBudgetIndex = currentBudgets.findIndex((b: any) => b.tradeName === formValue.trade);
          if (existingBudgetIndex >= 0) {
            currentBudgets[existingBudgetIndex].budget = formValue.budget;
          } else {
            currentBudgets.push({
              tradeName: formValue.trade,
              budget: formValue.budget,
              jobId: jobId
            });
          }

          const updatedJob = { ...job };
          updatedJob.trades = currentTrades;
          updatedJob.tradeBudgets = currentBudgets;

          // TODO: Check if status needs to be BIDDING.
          // If status is DRAFT, we might want to set to BIDDING to be visible.
          if (updatedJob.status === 'DRAFT' || updatedJob.status === 'NEW') {
             updatedJob.status = 'BIDDING';
             if (!updatedJob.biddingType) {
               updatedJob.biddingType = 'PUBLIC'; // Default to Public if not set
             }
          }

          this.jobsService.updateJob(updatedJob, jobId).subscribe({
            next: () => {
              this.dialogRef.close(true);
            },
            error: (err) => {
              console.error('Error updating job', err);
              this.snackBar.open('Failed to post job to marketplace', 'Close', { duration: 3000 });
              this.isSubmitting = false;
            }
          });
        },
        error: (err) => {
          console.error('Error fetching job', err);
          this.snackBar.open('Failed to fetch job details', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }
}
