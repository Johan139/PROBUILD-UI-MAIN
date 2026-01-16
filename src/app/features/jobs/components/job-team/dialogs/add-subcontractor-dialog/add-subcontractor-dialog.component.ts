import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TeamManagementService } from '../../../../../../services/team-management.service';
import { JobAssignmentService } from '../../../../job-assignment/job-assignment.service';
import { JobAssignmentLink } from '../../../../job-assignment/job-assignment.model';
import { AuthService } from '../../../../../../authentication/auth.service';

@Component({
  selector: 'app-add-subcontractor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Add Subcontractor</h2>
      <mat-dialog-content>
        <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Trade</mat-label>
          <input matInput formControlName="trade" placeholder="e.g. Electrical">
          <mat-error *ngIf="form.get('trade')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Company Name</mat-label>
          <input matInput formControlName="company" placeholder="Company Name">
          <mat-error *ngIf="form.get('company')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Contact Person (Full Name)</mat-label>
          <input matInput formControlName="contact" placeholder="John Doe">
          <mat-error *ngIf="form.get('contact')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone" placeholder="(555) 123-4567">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" placeholder="john.doe@example.com">
          <mat-error *ngIf="form.get('email')?.hasError('required')">Required</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Invalid email</mat-error>
        </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" [disabled]="form.invalid || isSubmitting" (click)="onSubmit()">
          {{ isSubmitting ? 'Inviting...' : 'Add Subcontractor' }}
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
      min-width: 350px;
    }
    mat-form-field {
      width: 100%;
    }
  `]
})
export class AddSubcontractorDialogComponent {
  form: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private teamService: TeamManagementService,
    private jobAssignmentService: JobAssignmentService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<AddSubcontractorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number }
  ) {
    this.form = this.fb.group({
      trade: ['', Validators.required],
      company: ['', Validators.required],
      contact: ['', Validators.required],
      phone: [''],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.isSubmitting = true;
      const formValue = this.form.value;
      const inviterId = this.authService.getUserId();

      if (!inviterId) {
        this.snackBar.open('Error: User not logged in', 'Close', { duration: 3000 });
        this.isSubmitting = false;
        return;
      }

      // Split contact name
      const nameParts = formValue.contact.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '.';

      const memberData = {
        firstName: firstName,
        lastName: lastName,
        email: formValue.email,
        role: 'SUBCONTRACTOR'
      };

      // 1. Add to Team (Invite)
      this.teamService.addTeamMember(memberData, inviterId).subscribe({
        next: (member) => {
          // 2. Assign to Job
          const assignmentLink: JobAssignmentLink = {
            userId: member.id,
            jobId: this.data.jobId,
            jobRole: formValue.trade // Use Trade as Job Role for Subcontractors
          };

          this.jobAssignmentService.createJobAssignment(assignmentLink).subscribe({
            next: () => {
              this.snackBar.open('Subcontractor invited and assigned!', 'Close', { duration: 3000 });
              this.dialogRef.close(true);
            },
            error: (err) => {
              console.error('Error assigning job', err);
              this.snackBar.open('Subcontractor invited but failed to assign to job.', 'Close', { duration: 3000 });
              this.isSubmitting = false;
            }
          });
        },
        error: (err) => {
          console.error('Error adding team member', err);
          this.snackBar.open(err.error?.message || 'Failed to invite subcontractor', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }
}
