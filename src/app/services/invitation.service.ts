import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private apiUrl = `${environment.BACKEND_URL}/account`;

  constructor(private http: HttpClient) { }

  getInvitation(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/invitation/${token}`);
  }

  registerInvited(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/invited`, data);
  }
}
