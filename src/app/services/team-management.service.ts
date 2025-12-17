import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TeamManagementService {
  private apiUrl = `${environment.BACKEND_URL}/teams`;

  constructor(private http: HttpClient) {}

  addTeamMember(member: any, inviterId: string): Observable<any> {
    const memberWithInviter = { ...member, inviterId };
    return this.http.post(`${this.apiUrl}/members`, memberWithInviter);
  }

  getTeamMembers(userId: string): Observable<any[]> {
    const url = `${this.apiUrl}/members/user/${userId}`;
    return this.http.get<any[]>(url);
  }

  removeTeamMember(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/members/${id}`);
  }

  getTeamMemberById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/members/${id}`);
  }

  deactivateTeamMember(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/members/${id}/deactivate`, {});
  }

  reactivateTeamMember(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/members/${id}/reactivate`, {});
  }

  getMyTeams(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-teams`);
  }

  getPermissions(teamMemberId: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}/members/${teamMemberId}/permissions`,
    );
  }
  acceptInvitation(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/accept-invitation`, {
      token: token,
    });
  }

  updatePermissions(
    teamMemberId: string,
    permissions: string[],
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/members/${teamMemberId}/permissions`, {
      Permissions: permissions,
    });
  }
}
