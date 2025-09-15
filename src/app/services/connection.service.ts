import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Connection } from '../models/connection';
import { environment } from '../../environments/environment';
import { AuthService } from '../authentication/auth.service';

const BASE_URL = environment.BACKEND_URL;

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private apiUrl = `${BASE_URL}/connections`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  getConnections(): Observable<Connection[]> {
    return this.http.get<Connection[]>(this.apiUrl);
  }

  getIncomingRequests(): Observable<Connection[]> {
    const userId = this.authService.getUserId();
    return this.getConnections().pipe(
      map(connections => connections.filter(c => c.receiverId === userId && c.status === 'PENDING'))
    );
  }

  getOutgoingRequests(): Observable<Connection[]> {
    const userId = this.authService.getUserId();
    return this.getConnections().pipe(
      map(connections => connections.filter(c => c.requesterId === userId && c.status === 'PENDING'))
    );
  }

  requestConnection(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/request`, { userId });
  }

  acceptConnection(connectionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${connectionId}/accept`, {});
  }

  declineConnection(connectionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${connectionId}/decline`, {});
  }
}
