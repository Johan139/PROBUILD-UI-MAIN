import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TeamManagementService {
  private apiUrl = `${environment.BACKEND_URL}/teams`;

  constructor(private http: HttpClient) { }

  addTeamMember(member: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/members`, member);
  }

  getTeamMembers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/members`);
  }

  removeTeamMember(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/members/${id}`);
  }

  getTeamMemberById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/members/${id}`);
  }

  getMyTeams(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-teams`);
  }
}
