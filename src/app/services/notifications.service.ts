import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Notification } from '../models/notification';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private apiUrl = `${environment.BACKEND_URL}/notifications`;
  private socket!: WebSocket;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    const wsUrl = this.apiUrl.replace(/^http/, 'ws');
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => console.log('WebSocket connection established');
    this.socket.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
    };
    this.socket.onclose = () => {
      console.log('WebSocket connection closed. Reconnecting...');
      setTimeout(() => this.connectWebSocket(), 5000);
    };
    this.socket.onerror = (error) => console.error('WebSocket error:', error);
  }

  getRecentNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/recent`);
  }

  getAllNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }
}
