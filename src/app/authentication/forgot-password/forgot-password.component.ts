import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

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
    MatFormFieldModule,
    MatInputModule,
    LoaderComponent,
    MatButtonModule,
    MatDividerModule
],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  showAlert = false;
  alertMessage: string = '';
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private forgotPasswordService: ForgotPasswordService,
    private router: Router,
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }
  closeAlert(): void {
    this.showAlert = false;
    this.router.navigate(['/login']);
  }
  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.alertMessage = 'Please enter a valid email address.';
      this.showAlert = true;
      return;
    }

    this.isLoading = true;
    const email = this.forgotPasswordForm.value.email;

    this.forgotPasswordService.requestPasswordReset(email).subscribe({
      next: () => {
        this.isLoading = false;

        // Always show the same message (security safe)
        this.alertMessage =
          'If an account exists with this email address, you will receive a password reset link.';
        this.showAlert = true;

        // Optional: clear form
        this.forgotPasswordForm.reset();
      },
      error: () => {
        this.isLoading = false;

        this.alertMessage = 'Something went wrong. Please try again later.';
        this.showAlert = true;
      },
    });
  }
}
