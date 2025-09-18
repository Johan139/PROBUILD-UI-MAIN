import { Component, Injectable, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ForgotPasswordService } from '../forgot-password/forgot-password.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatError } from '@angular/material/form-field'; // For mat-error
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // optional, if app-loader uses spinner
import { LoaderComponent } from '../../loader/loader.component';

@Injectable({
  providedIn: 'root',
})
@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    LoaderComponent,
    HttpClientModule
  ]
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  token!: string;
  email!: string;
  submitted = false;
  error: string | null = null;
  success: string | null = null;
  isLoading = false; // or true, depending on your loading logic

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private forgotPasswordService: ForgotPasswordService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.email = this.route.snapshot.queryParamMap.get('email') || '';

    this.resetForm = this.fb.group({
      password: ['',[
          Validators.required,
          Validators.minLength(10),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{10,}$/)
        ]],
      confirmPassword: ['',[
          Validators.required,
          Validators.minLength(10),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{10,}$/)
        ]]
    }, {
      validator: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = null;
    this.success = null;

    if (this.resetForm.invalid) return;

    const resetData = {
        token: this.token,           // no encodeURIComponent here!
        email: this.email,
        Password: this.resetForm.value.password
      };

    this.forgotPasswordService.resetPassword(resetData).subscribe({
        next: () => {
          this.success = 'Password successfully reset. You can now log in.';
          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: err => {
          this.error = err.error.error;
        }
      });
  }
}
