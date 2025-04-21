import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ForgotPasswordService {
  private apiUrl = `${environment.BACKEND_URL}/account/forgotpassword`;

  constructor(private http: HttpClient) {}

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(this.apiUrl, { email }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred. Please try again later.';
    
    if (error.status === 404) {
      errorMessage = 'No account found with this email address.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    }
    
    return throwError(() => new Error(errorMessage));
  }
}