import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { NgIf } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { LoaderComponent } from '../../loader/loader.component';
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { TeamManagementService } from '../../services/team-management.service';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButton,
    NgIf,
    LoaderComponent,
  ],
  templateUrl: './accept-invite.component.html',
  styleUrls: ['./accept-invite.component.scss'],
})
export class AcceptInviteComponent implements OnInit {
  acceptForm: FormGroup;
  isLoading = false;
  showAlert = false;
  alertMessage = '';
  redirectUrl: string = '';

  token: string | null = null;
  inviterName: string = '';
  role: string = '';
  email: string = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private teamService: TeamManagementService,
  ) {
    this.acceptForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.showError('Invalid or missing invitation token.');
      return;
    }

    this.loadInvitation();
  }

  loadInvitation() {
    this.isLoading = true;

    this.http
      .get<any>(`${environment.BACKEND_URL}/account/invitation/${this.token}`)
      .pipe(
        catchError((err) => {
          this.isLoading = false;
          this.showError(
            'Failed to load invitation. It may be invalid or expired.',
          );
          return of(null);
        }),
      )
      .subscribe((res) => {
        this.isLoading = false;

        if (!res) return;

        // Backend returns: firstName, lastName, email, role
        this.inviterName = `${res.firstName} ${res.lastName}`;
        this.role = res.role;
        this.email = res.email;
      });
  }

  onAccept() {
    if (!this.token) {
      this.showError('Missing invitation token.');
      return;
    }

    this.isLoading = true;

    this.teamService
      .acceptInvitation(this.token)
      .pipe(
        catchError((err) => {
          this.isLoading = false;
          this.showError(
            'Unable to accept invitation. Please contact support.',
          );
          return of(null);
        }),
      )
      .subscribe((res) => {
        this.isLoading = false;
        this.showSuccess('Invitation accepted! You can now log in.');
      });
  }

  showError(message: string) {
    this.alertMessage = message;
    this.showAlert = true;
    this.redirectUrl = '';
  }

  showSuccess(message: string) {
    this.alertMessage = message;
    this.showAlert = true;
    this.redirectUrl = '/login';
  }

  closeAlert() {
    this.showAlert = false;
    if (this.redirectUrl) {
      this.router.navigateByUrl(this.redirectUrl);
    }
  }
}
