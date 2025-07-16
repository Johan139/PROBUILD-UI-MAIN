import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Notification } from '../models/notification';
import { environment } from '../../environments/environment';
import { AuthService } from '../authentication/auth.service';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private apiUrl = `${environment.BACKEND_URL}/notifications`;
  private hubConnection!: signalR.HubConnection;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Only connect WebSocket if user is authenticated
    if (this.authService.isLoggedIn()) {
      this.connectSignalR();
    }

    // Subscribe to auth state changes
    this.authService.currentUser$.subscribe(user => {
      if (user && (!this.hubConnection || this.hubConnection.state === signalR.HubConnectionState.Disconnected)) {
        this.connectSignalR();
      } else if (!user && this.hubConnection) {
        this.disconnectSignalR();
      }
    });
  }

  private connectSignalR(): void {
    if (!this.authService.isLoggedIn()) {
      console.log('User not authenticated, skipping SignalR connection');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.SIGNALR_URL}/notifications`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => {
        console.log('SignalR connection established');
        this.reconnectAttempts = 0;
      })
      .catch(err => {
        console.error('Error while starting SignalR connection: ' + err);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.pow(2, this.reconnectAttempts) * 1000;
          console.log(`Reconnecting SignalR in ${delay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connectSignalR(), delay);
        }
      });

    this.hubConnection.on('ReceiveNotification', (notification: Notification) => {
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
    });

    this.hubConnection.onclose((error) => {
      console.log('SignalR connection closed.', error);
    });
  }

  private disconnectSignalR(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.reconnectAttempts = 0;
    }
  }

  // HTTP methods - these will automatically include auth headers via interceptor
  getRecentNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/recent`);
  }

  getAllNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  sendTestNotification(): Observable<any> {
    return this.http.post(`${this.apiUrl}/test`, {});
  }

  // Method to manually reconnect WebSocket if needed
  reconnectWebSocket(): void {
    this.disconnectSignalR();
    if (this.authService.isLoggedIn()) {
      this.connectSignalR();
    }
  }

  // Clean up when service is destroyed
  ngOnDestroy(): void {
    this.disconnectSignalR();
  }
}
