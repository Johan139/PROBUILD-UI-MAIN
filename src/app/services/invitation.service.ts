import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BASE_URL = environment.BACKEND_URL;

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private apiUrl = `${BASE_URL}/Invitation`;

  constructor(private http: HttpClient) { }

  inviteUser(invitationData: { email: string, firstName: string, lastName: string, phoneNumber?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/invite`, invitationData);
  }

  getInvitation(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/invitation/${token}`);
  }

  registerInvited(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/invited`, data);
  }
}
