import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InvitationService } from '../../../services/invitation.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-invitation-dialog',
  templateUrl: './invitation-dialog.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
})
export class InvitationDialogComponent {
  invitationForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<InvitationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { email: string },
    private fb: FormBuilder,
    private invitationService: InvitationService
  ) {
    this.invitationForm = this.fb.group({
      email: [data.email, [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['']
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  sendInvitation(): void {
    if (this.invitationForm.valid) {
      this.invitationService.inviteUser(this.invitationForm.value).subscribe(() => {
        this.dialogRef.close(true);
      });
    }
  }
}
