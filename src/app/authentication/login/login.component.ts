// src/app/login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { LoaderComponent } from '../../loader/loader.component';
import { AuthService } from '../auth.service'; // New service
import { MatDividerModule } from '@angular/material/divider';

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
    MatDividerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginForm: FormGroup;
  showAlert: boolean = false;
  alertMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
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

  onLogin() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const credentials = this.loginForm.value;
      this.authService.login(credentials).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigateByUrl('dashboard'); // Navigate on success
        },
        error: (error) => {
          this.isLoading = false;
          this.showAlert = true;
          if (error.status === 401) {
            this.alertMessage = 'Login Failed, please check username or password';
          } else if (error.status === 500) {
            this.alertMessage = 'Oops something went wrong, please try again later.';
          } else {
            this.alertMessage = 'An unexpected error occurred. Contact support';
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