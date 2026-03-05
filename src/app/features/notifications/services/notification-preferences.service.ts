import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  NotificationPreference,
  UpdateNotificationPreferenceDto,
} from '../models/notification-preference.model';
import { environment } from '../../../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class NotificationPreferencesService {
  private baseUrl = `${environment.BACKEND_URL}/notifications`;

  constructor(private http: HttpClient) {}

  getPreferences(): Observable<NotificationPreference[]> {
    return this.http.get<NotificationPreference[]>(
      `${this.baseUrl}/preferences`,
    );
  }

  updatePreference(dto: UpdateNotificationPreferenceDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/preferences`, dto);
  }
}
