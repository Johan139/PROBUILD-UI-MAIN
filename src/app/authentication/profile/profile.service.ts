import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Profile, TeamMember, Document, ProfileDocument } from './profile.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.BACKEND_URL}/profile`;

  // Dummy data for team members
  private dummyTeamMembers: TeamMember[] = [
    { name: 'John Doe', role: 'SUBCONTRACTOR', email: 'john.doe@example.com' },
    { name: 'Jane Smith', role: 'FOREMAN', email: 'jane.smith@example.com' }
  ];

  // Dummy data for documents
  private dummyDocuments: Document[] = [
    { name: 'Certification.pdf', type: 'Certification', path: 'https://example.com/cert.pdf', uploadedDate: new Date('2025-01-15') },
    { name: 'License.docx', type: 'License', path: 'https://example.com/license.docx', uploadedDate: new Date('2025-02-20') }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  getProfile(): Observable<Profile> {
    const userId = this.authService.currentUserSubject.value?.id;
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

  downloadJobDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download/${documentId}`, { responseType: 'blob' });
  }

  updateProfile(profile: Profile): Observable<Profile> {
    const url = `${this.apiUrl}/update`;
    return this.http.post<Profile>(url, profile, { headers: this.getHeaders() })
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
  getUserDocuments(userId: string): Observable<ProfileDocument []> {
    return this.http.get<ProfileDocument []>(`${this.apiUrl}/GetDocuments/${userId}`);
  }

  getTeamMembers(): Observable<TeamMember[]> {
    // Simulate API call with dummy data
    return of(this.dummyTeamMembers);
  }

  addTeamMember(member: TeamMember): Observable<TeamMember> {
    // Simulate adding to dummy data
    this.dummyTeamMembers.push(member);
    return of(member);
  }

  removeTeamMember(email: string): Observable<void> {
    // Simulate removing from dummy data
    this.dummyTeamMembers = this.dummyTeamMembers.filter(member => member.email !== email);
    return of(void 0);
  }

  getDocuments(): Observable<Document[]> {
    // Simulate API call with dummy data
    return of(this.dummyDocuments);
  }
}
