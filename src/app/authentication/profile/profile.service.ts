import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError,of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Profile } from './profile.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  
  private apiUrl = `${environment.BACKEND_URL}/profile`;
  
  constructor(private http: HttpClient,
    private authService: AuthService) {}

    private getHeaders(): HttpHeaders {
      const token = this.authService.getToken();
      return new HttpHeaders({
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      });
    }

  getProfile(): Observable<Profile> {
    const userId = this.authService.currentUserSubject.value?.id; // Get userId from AuthService
    if (!userId) {
      console.error('No userId available');
      return throwError(() => new Error('User not authenticated'));
    }
    const url = `${this.apiUrl}/GetProfile/${userId}`;
    return this.http.get<Profile>(url, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Error fetching profile:', error);
          return throwError(() => new Error('Failed to load profile'));
        })
      );
  }

  updateProfile(profile: Profile): Observable<Profile> {
    const url = `${this.apiUrl}/update`;
    return this.http.put<Profile>(url, profile, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Error updating profile:', error);
          return throwError(() => new Error('Failed to update profile'));
        })
      );
  }

  uploadCertification(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/certification`, formData)
      .pipe(
        catchError(error => {
          console.error('Error uploading certification:', error);
          return throwError(() => new Error('Failed to upload certification'));
        })
      );
  }
}