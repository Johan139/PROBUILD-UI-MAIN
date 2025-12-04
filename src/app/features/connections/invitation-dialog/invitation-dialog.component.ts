import { Component, Inject } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { InvitationService } from '../../../services/invitation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { TextFieldModule } from '@angular/cdk/text-field';

@Component({
  selector: 'app-invitation-dialog',
  templateUrl: './invitation-dialog.component.html',
  styleUrls: ['./invitation-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TextFieldModule,
  ],
})
export class InvitationDialogComponent {
  invitationForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<InvitationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { email: string },
    private fb: FormBuilder,
    private invitationService: InvitationService,
    private snackBar: MatSnackBar,
  ) {
    this.invitationForm = this.fb.group({
      email: [data.email, [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: [''],
      message: [''],
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  sendInvitation(): void {
    if (this.invitationForm.valid) {
      this.invitationService.inviteUser(this.invitationForm.value).subscribe({
        next: () => {
          this.snackBar.open('Invitation sent successfully!', 'Close', {
            duration: 3000,
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.snackBar.open(
            `There was an issue sending the invitation: ${error.error}`,
            'Close',
            {
              duration: 5000,
            },
          );
        },
      });
    }
  }
}
