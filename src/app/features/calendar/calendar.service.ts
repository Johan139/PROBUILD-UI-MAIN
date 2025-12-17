import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CalendarEvent } from './calendar.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../authentication/auth.service';

@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private apiUrl = `${environment.BACKEND_URL}/calendar`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  getEvents(): Observable<CalendarEvent[]> {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) {
      return of([]); // Simulate empty response for unauthenticated users
    }
    return this.http
      .get<
        CalendarEvent[]
      >(`${this.apiUrl}/events/${userId}`, { headers: this.getHeaders() })
      .pipe(
        catchError((error) => {
          console.error('Error fetching events:', error);
          return of([]); // Return empty array on error
        }),
      );
  }

  addEvent(event: CalendarEvent): Observable<CalendarEvent> {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) {
      return of(event); // Simulate success for unauthenticated users
    }
    return this.http
      .post<CalendarEvent>(
        `${this.apiUrl}/events`,
        { ...event, userId },
        { headers: this.getHeaders() },
      )
      .pipe(
        catchError((error) => {
          console.error('Error adding event:', error);
          return of(event); // Simulate success on error
        }),
      );
  }
}
