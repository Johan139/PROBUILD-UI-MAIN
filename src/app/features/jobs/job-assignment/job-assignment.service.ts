import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { JobAssignment, JobAssignmentLink } from './job-assignment.model';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../authentication/auth.service';

@Injectable({
  providedIn: 'root'
})
export class JobAssignmentService {
  private apiUrl = `${environment.BACKEND_URL}/jobAssignment`;
  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }
  
  getJobAssignment(): Observable<JobAssignment[]>  {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) {
      console.error('No userId available');
      return throwError(() => new Error('User not authenticated'));
    }
    const url = `${this.apiUrl}/GetAssignedUsers/${userId}`;
    return this.http.get<JobAssignment[]>(url, { headers: this.getHeaders() })
        .pipe(
          catchError(error => {
            console.error('Error fetching profile:', error);
            return throwError(() => new Error('Failed to load profile'));
          })
        );
  }

  createJobAssignment(assignmentData: JobAssignmentLink): Observable<JobAssignment> {
    return this.http.post<JobAssignment>(this.apiUrl, assignmentData, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Error creating job assignment:', error);
          return throwError(() => new Error('Failed to create job assignment'));
        })
      );
  }

  deleteJobAssignment(jobAssignment: JobAssignment): Observable<void> {
    const url = `${this.apiUrl}`;
    return this.http.put<void>(url, jobAssignment, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Error deleting job assignment:', error);
          return throwError(() => new Error('Failed to delete job assignment'));
        })
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}