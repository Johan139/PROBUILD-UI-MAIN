import { Component, Inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TeamManagementService } from '../../../../../../services/team-management.service';
import { JobAssignmentService } from '../../../../job-assignment/job-assignment.service';
import { JobAssignmentLink } from '../../../../job-assignment/job-assignment.model';
import { AuthService } from '../../../../../../authentication/auth.service';
import { userTypes } from '../../../../../../data/user-types';

@Component({
  selector: 'app-add-team-member-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>Add Team Member</h2>
      <mat-dialog-content>
        <form [formGroup]="form" class="dialog-form">
          <mat-form-field appearance="outline">
            <mat-label>First Name</mat-label>
            <input matInput formControlName="firstName" placeholder="John">
            @if (form.get('firstName')?.hasError('required')) {
              <mat-error>Required</mat-error>
            }
          </mat-form-field>
    
          <mat-form-field appearance="outline">
            <mat-label>Last Name</mat-label>
            <input matInput formControlName="lastName" placeholder="Doe">
            @if (form.get('lastName')?.hasError('required')) {
              <mat-error>Required</mat-error>
            }
          </mat-form-field>
    
          <mat-form-field appearance="outline">
            <mat-label>Phone</mat-label>
            <input matInput formControlName="phoneNumber" placeholder="(555) 123-4567">
          </mat-form-field>
    
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" placeholder="john.doe@example.com">
            @if (form.get('email')?.hasError('required')) {
              <mat-error>Required</mat-error>
            }
            @if (form.get('email')?.hasError('email')) {
              <mat-error>Invalid email</mat-error>
            }
          </mat-form-field>
    
          <mat-form-field appearance="outline">
            <mat-label>Role</mat-label>
            <mat-select formControlName="role">
              @for (role of availableRoles; track role) {
                <mat-option [value]="role.value">
                  {{ role.display }}
                </mat-option>
              }
            </mat-select>
            @if (form.get('role')?.hasError('required')) {
              <mat-error>Required</mat-error>
            }
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button class="btn btn-secondary" type="button" mat-dialog-close>Cancel</button>
        <button mat-button class="btn btn-primary" type="button" [disabled]="form.invalid || isSubmitting" (click)="onSubmit()">
          {{ isSubmitting ? 'Inviting...' : 'Invite & Assign' }}
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
export class AddTeamMemberDialogComponent {
  form: FormGroup;
  isSubmitting = false;
  availableRoles = userTypes.filter(role => role.value !== 'GENERAL_CONTRACTOR' && role.value !== 'SUBCONTRACTOR');

  constructor(
    private fb: FormBuilder,
    private teamService: TeamManagementService,
    private jobAssignmentService: JobAssignmentService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<AddTeamMemberDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number }
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: [''],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required]
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

      // 1. Add to Team
      this.teamService.addTeamMember(formValue, inviterId).subscribe({
        next: (member) => {
          // 2. Assign to Job
          const assignmentLink: JobAssignmentLink = {
            userId: member.id,
            jobId: this.data.jobId,
            jobRole: formValue.role
          };

          this.jobAssignmentService.createJobAssignment(assignmentLink).subscribe({
            next: () => {
              this.snackBar.open('Team member invited and assigned!', 'Close', { duration: 3000 });
              this.dialogRef.close(true);
            },
            error: (err) => {
              console.error('Error assigning job', err);
              this.snackBar.open('Member invited but failed to assign to job.', 'Close', { duration: 3000 });
              this.isSubmitting = false;
            }
          });
        },
        error: (err) => {
          console.error('Error adding team member', err);
          this.snackBar.open(err.error?.message || 'Failed to invite team member', 'Close', { duration: 3000 });
          this.isSubmitting = false;
        }
      });
    }
  }
}
