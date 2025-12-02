import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-unsubscribe',
  templateUrl: './unsubscribe.component.html',
  styleUrls: ['./unsubscribe.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
})
export class UnsubscribeComponent implements OnInit {
  message: string = '';
  email: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'];
      if (this.email) {
        this.unsubscribe();
      }
    });
  }

  unsubscribe(): void {
    this.http
      .get(
        `${environment.BACKEND_URL}/subscription/unsubscribe?email=${this.email}`,
        { responseType: 'text' },
      )
      .subscribe({
        next: (response) => (this.message = response),
        error: (error) =>
          (this.message = 'An error occurred while trying to unsubscribe.'),
      });
  }
}
