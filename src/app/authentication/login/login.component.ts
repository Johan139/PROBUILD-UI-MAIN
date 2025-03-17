// login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { NgIf, isPlatformBrowser } from "@angular/common";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { LoaderComponent } from '../../loader/loader.component';
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Inject, PLATFORM_ID } from '@angular/core';
import { LoginService } from "../../services/login.service";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    NgIf,
    LoaderComponent,
    MatButtonModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginForm: FormGroup;
  showAlert: boolean = false;
  alertMessage: string = '';
  isLoading: boolean = false;
  isBrowser: boolean;

  constructor(
    private httpClient: HttpClient,
    private router: Router,
    private formBuilder: FormBuilder,
    private loginService: LoginService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

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
      this.httpClient
        .post(
          `${environment.BACKEND_URL}/Account/login`,
          JSON.stringify(this.loginForm.value),
          {headers: {'Content-Type': 'application/json'}}
        )
        .pipe(
          catchError((error) => {
            this.isLoading = false;
            this.showAlert = true;
            if (error.status === 401) {
              this.alertMessage = 'Login Failed, please check username or password';
            } else if (error.status === 500) {
              this.alertMessage = 'Oops something went wrong, please try again later.';
            } else {
              this.alertMessage = 'An unexpected error occurred. Contact support';
            }
            return of(null);
          })
        )
        .subscribe((res: any) => {
          if (res) {
            this.isLoading = false;
            if (this.isBrowser) {
              localStorage.setItem('token', res.token);
              localStorage.setItem('userType', res.userType);
              localStorage.setItem('firstName', res.firstName);
              localStorage.setItem('userId', res.id);
              localStorage.setItem('loggedIn', String(true));
            }
            this.loginService.setUserType(res.userType);
            this.loginService.setUserId(res.id);
            this.loginService.setFirstName(res.firstName);
            
            // Navigate directly to dashboard without showing alert
            this.router.navigateByUrl('dashboard');
          }
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