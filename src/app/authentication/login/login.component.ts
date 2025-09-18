// src/app/login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LoaderComponent } from '../../loader/loader.component';
import { AuthService } from '../auth.service';
import { MatDividerModule } from '@angular/material/divider';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    LoaderComponent,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginForm: FormGroup;
  environment = environment;
  showAlert: boolean = false;
  alertMessage: string = '';
  isLoading: boolean = false;
  hidePassword: boolean = true;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', Validators.required],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.pattern(
            /^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{10,}$/
          ),
        ],
      ],
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onLogin() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const credentials = this.loginForm.value;
      this.authService.login(credentials).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigateByUrl('dashboard');
        },
        error: (error: any) => {
          this.isLoading = false;
          this.showAlert = true;

          let message = 'Invalid login credentials.';
          this.alertMessage = message;
console.log(error)
let backendError = error.error;

// If it's a string, try parsing JSON; otherwise keep as-is
if (typeof backendError === 'string') {
  try {
    backendError = JSON.parse(backendError);
  } catch {
    // fallback to wrapping string into object
    backendError = { error: backendError };
  }
}

// Ensure we always have something
const backendMessage = backendError?.error || backendError?.message || message;

if (error.status === 401) {
  this.alertMessage = backendMessage;
} else if (error.status === 500) {
  this.alertMessage = backendMessage || 'Server error. Try again later.';
} else {
  this.alertMessage = backendMessage;
}
        },
      });
    } else {
      this.showAlert = true;
      this.alertMessage = 'Please ensure your password meets all requirements.';
    }
  }

  closeAlert(): void {
    this.showAlert = false;
  }
}
