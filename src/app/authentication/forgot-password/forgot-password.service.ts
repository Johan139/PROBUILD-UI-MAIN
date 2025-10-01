import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ForgotPasswordService {
  private apiUrl = `${environment.BACKEND_URL}`;

  constructor(private http: HttpClient) {}

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(this.apiUrl + '/account/forgotpassword', { email }).pipe(
     catchError((error: HttpErrorResponse) => {

          return throwError(() => this.handleError(error));
        })
    );
  }
  resetPassword(data: any): Observable<void> {
    return this.http.post<void>(this.apiUrl + '/account/resetpassword', data).pipe(
              catchError((error: HttpErrorResponse) => {

          return throwError(() => this.handleError(error));
        })
    );
  }

  
  private handleError(error: HttpErrorResponse): HttpErrorResponse {
    let parsed = error.error;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = {};
      }
    }
    return error;
  }
}