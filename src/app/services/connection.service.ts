import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Connection } from '../models/connection';
import { environment } from '../../environments/environment';
import { AuthService } from '../authentication/auth.service';
import { ConnectionDto } from '../features/connections/connections.component';

const BASE_URL = environment.BACKEND_URL;

@Injectable({
  providedIn: 'root',
})
export class ConnectionService {
  private apiUrl = `${BASE_URL}/connections`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  getConnections(): Observable<ConnectionDto[]> {
    return this.http.get<ConnectionDto[]>(this.apiUrl);
  }

  getIncomingRequests(): Observable<Connection[]> {
    return this.http.get<Connection[]>(`${this.apiUrl}/incoming`);
  }

  removeConnection(connectionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${connectionId}/remove`, {});
  }

  getOutgoingRequests(): Observable<Connection[]> {
    return this.http.get<Connection[]>(`${this.apiUrl}/outgoing`);
  }

  requestConnection(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/request`, { receiverId: userId });
  }

  acceptConnection(connectionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${connectionId}/accept`, {});
  }

  declineConnection(connectionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${connectionId}/decline`, {});
  }
}
