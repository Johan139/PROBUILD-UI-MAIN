import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LogoDto } from '../features/quote/quote.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LogoService {
  private apiUrl = `${environment.BACKEND_URL}/quotes`;

  constructor(private http: HttpClient) {}

  /**
   * Upload a logo for the current user
   */
  setUserLogo(file: File, userId: string): Observable<LogoDto> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<LogoDto>(`${this.apiUrl}/logo/` + userId, formData);
  }

  /**
   * Get the most recent logo for a specific user
   */
  getUserLogo(userId?: string): Observable<LogoDto> {
    // If no userId provided, the backend should use the authenticated user
    // Or you can pass it from the component
    const id = userId || 'current'; // Backend should handle 'current' or use auth token
    return this.http.get<LogoDto>(`${this.apiUrl}/logo/user/${id}`);
  }

  /**
   * Get a specific logo by ID
   */
  getLogoById(logoId: string): Observable<LogoDto> {
    return this.http.get<LogoDto>(`${this.apiUrl}/logo/${logoId}`);
  }
}
