import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEventType } from '@angular/common/http';
import { Observable, throwError, of, Subject } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Profile, TeamMember, Document, ProfileDocument } from './profile.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.BACKEND_URL}/profile`;
  private hubConnection!: HubConnection;
  private progressSubject = new Subject<number>();
  private uploadCompleteSubject = new Subject<number>();

  progress$ = this.progressSubject.asObservable();
  uploadComplete$ = this.uploadCompleteSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  initializeSignalR(): void {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl('https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/progressHub')
      .configureLogging(LogLevel.Debug)
      .build();

    this.hubConnection.on('ReceiveProgress', (progress: number) => {
      const cappedProgress = Math.min(100, progress);
      const finalProgress = Math.min(100, 50 + Math.round((cappedProgress * 50) / 100));
      this.progressSubject.next(finalProgress);
    });

    this.hubConnection.on('UploadComplete', (fileCount: number) => {
      this.uploadCompleteSubject.next(fileCount);
    });

    this.hubConnection
      .start()
      .then(() => console.log('SignalR connection established successfully'))
      .catch(err => console.error('SignalR Connection Error:', err));
  }

  stopSignalR(): void {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log('SignalR connection stopped'))
        .catch(err => console.error('Error stopping SignalR:', err));
    }
  }

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

  uploadImage(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/UploadImage`, formData, {
      reportProgress: true,
      observe: 'events',
      headers: new HttpHeaders({ Accept: 'application/json' }),
    }).pipe(
      timeout(300000), // 5 minutes timeout
      catchError(error => {
        console.error('Upload error:', error);
        return throwError(() => new Error('Failed to upload image'));
      })
    );
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
    const url = `${this.apiUrl}/team`;
    return this.http.get<TeamMember[]>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error fetching team members:', error);
        return throwError(() => new Error('Failed to load team members'));
      })
    );
  }

  addTeamMember(member: TeamMember): Observable<TeamMember> {
    const url = `${this.apiUrl}/team`;
    return this.http.post<TeamMember>(url, member, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error adding team member:', error);
        return throwError(() => new Error('Failed to add team member'));
      })
    );
  }

  removeTeamMember(email: string): Observable<void> {
    const url = `${this.apiUrl}/team/${email}`;
    return this.http.delete<void>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error removing team member:', error);
        return throwError(() => new Error('Failed to remove team member'));
      })
    );
  }

  getDocuments(): Observable<Document[]> {
    // This seems to be unused, if it were to be used, it would need a proper implementation
    return of([]);
  }

  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.Google_API}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (typeof google !== 'undefined' && google.maps) {
          resolve();
        } else {
          reject('Google Maps API not available after load');
        }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  hasActiveSubscription(): Observable<{ hasActive: boolean }> {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) {
      return throwError(() => new Error('User not logged in'));
    }
    return this.http.get<{ hasActive: boolean }>(`${environment.BACKEND_URL}/Account/has-active-subscription/${userId}`);
  }
}
