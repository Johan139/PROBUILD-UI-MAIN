import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { Router, ActivatedRoute } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { NgIf } from "@angular/common";
import { MatFormField } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButton } from "@angular/material/button";
import { LoaderComponent } from '../../loader/loader.component';
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [FormsModule, MatCardModule, ReactiveFormsModule, MatFormField, MatInputModule, NgIf, LoaderComponent, MatButton],
  templateUrl: './confirm-email.component.html',
  styleUrls: ['./confirm-email.component.scss']
})
export class ConfirmEmailComponent implements OnInit {
  confirmEmailForm: FormGroup;
  showAlert: boolean = false;
  alertMessage: string = '';
  routeURL: string = '';
  isLoading: boolean = false;
  userId: string | null = null;
  code: string | null = null;

  constructor(
    private httpClient: HttpClient,
    private router: Router,
    private route: ActivatedRoute,  // Inject ActivatedRoute to access query parameters
    private formBuilder: FormBuilder
  ) {
    this.confirmEmailForm = this.formBuilder.group({});
  }

  ngOnInit(): void {
    // Retrieve query parameters on component initialization
    this.userId = this.route.snapshot.queryParamMap.get('userId');
    this.code = this.route.snapshot.queryParamMap.get('code');
  }

  onConfirmEmail() {
    if (!this.userId || !this.code) {
      this.showAlert = true;
      this.alertMessage = "Missing confirmation details.";
      return;
    }

    this.isLoading = true;
    const url = `${environment.BACKEND_URL}/Account/confirmemail?userId=${encodeURIComponent(this.userId)}&code=${encodeURIComponent(this.code)}`;

    this.httpClient.get(url, {})  // Send an empty object as payload
      .pipe(
        catchError((error) => {
          this.isLoading = false;
          if (error.status === 401) {
            this.showAlert = true;
            this.routeURL = 'login';
            this.alertMessage = "Email Confirmation failed, please register or contact support@probuildai.com";
          } else if (error.status === 500) {
            this.showAlert = true;
            this.routeURL = '';
            this.alertMessage = "Oops, something went wrong. Please try again later.";
          } else {
            this.showAlert = true;
            this.routeURL = '';
            this.alertMessage = "An unexpected error occurred. Contact support.";
          }
          return of(null);  // Return null observable to keep the stream alive
        })
      )
      .subscribe((res: any) => {
        if (res) {
          this.isLoading = false;
          this.showAlert = true;
          this.alertMessage = "Email Confirmation Successful!";
          this.routeURL = 'login';
        }
      });
  }

  closeAlert(): void {
    if (this.routeURL) {
      this.router.navigateByUrl(this.routeURL);
    }
    this.showAlert = false;
  }
}
