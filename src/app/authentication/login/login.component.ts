import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
import { RouterLink } from '@angular/router';
declare const google: any;
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
    RouterLink,
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
  showResendLink: boolean = true;
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,

    private route: ActivatedRoute,
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', Validators.required],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.pattern(
            /^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{10,}$/,
          ),
        ],
      ],
    });
  }

  ngAfterViewInit() {
    const checkGsiLoaded = setInterval(() => {
      const googleLibLoaded =
        typeof window !== 'undefined' && (window as any).google?.accounts?.id;
      const divExists = document.getElementById('googleSignInDiv');

      if (googleLibLoaded && divExists) {
        clearInterval(checkGsiLoaded);

        google.accounts.id.initialize({
          client_id:
            '830495328853-9jp3r5b2o53124kpu10ais3pq0lljcoj.apps.googleusercontent.com',
          callback: (response: any) => this.handleGoogleCredential(response),
        });

        google.accounts.id.renderButton(divExists, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'center',
        });
      }
    }, 250);
  }

  handleGoogleCredential(response: any) {
    const idToken = response.credential;
    this.isLoading = true;

    this.authService.googleLogin(idToken).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        // Check if backend says registration is required
        if (res.requiresRegistration) {
          sessionStorage.setItem('googleData', JSON.stringify(res));
          this.router.navigate(['/register']);
        } else {
          // ✅ Normal flow (handleSuccessfulLogin was already called inside the pipe)
          this.router.navigateByUrl('dashboard');
        }
      },
      error: (err) => {
        console.error('Google login failed', err);
        this.isLoading = false;
        this.showAlert = true;
        this.alertMessage = 'Google sign-in failed. Please try again.';
      },
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
          const backendMessage =
            backendError?.error || backendError?.message || message;

          if (error.status === 401) {
            this.alertMessage = backendMessage;
            this.showResendLink = false;
            if (
              backendMessage.includes('Email address has not been verified')
            ) {
              this.showResendLink = true;
            }
          } else if (error.status === 500) {
            this.alertMessage =
              backendMessage || 'Server error. Try again later.';
          } else {
            this.alertMessage = backendMessage;
          }
        },
      });
    } else {
      this.showResendLink = false;

      this.showAlert = true;
      this.alertMessage = 'Please ensure your password meets all requirements.';
    }
  }

  closeAlert(): void {
    this.showAlert = false;
  }
  resendEmail() {
    const credentials = this.loginForm.value;
    this.authService.resendverificationemail(credentials.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl('login');
        this.showResendLink = false;
        this.showAlert = true;
        this.alertMessage =
          'Verification email sent successfully. Please check your inbox and spam folder.';
      },
      error: (error: any) => {
        this.showAlert = true;
        this.alertMessage = 'An error occured. Please contact support.';
      },
    });
  }
}
