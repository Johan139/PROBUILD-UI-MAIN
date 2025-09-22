import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { LoaderComponent } from '../../loader/loader.component';
import { ForgotPasswordService } from './forgot-password.service';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    LoaderComponent,
    MatButtonModule,
    MatDividerModule,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  showAlert: boolean = false;
  alertMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private forgotPasswordService: ForgotPasswordService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      const email = this.forgotPasswordForm.value.email;
      this.forgotPasswordService.requestPasswordReset(email).subscribe({
        next: () => {
          this.isLoading = false;
          this.showAlert = true;
          this.alertMessage = 'A password reset link has been sent to your email. Please check your inbox and spam folder.';
        },
        error: (error) => {
          this.isLoading = false;
          this.showAlert = true;
          this.alertMessage = error.message;
        },
      });
    } else {
      this.showAlert = true;
      this.alertMessage = 'Please enter a valid email address.';
    }
  }

  closeAlert(): void {
    this.showAlert = false;
  }
}