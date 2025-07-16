import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError, map } from 'rxjs';
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
  public hasUnreadNotifications$ = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private seenNotificationIds: number[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.loadSeenNotifications();
    if (this.authService.isLoggedIn()) {
      this.connectSignalR();
    }
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
      .withUrl(`${environment.SIGNALR_URL}/notifications`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

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
      console.log('Received real-time notification:', notification);
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
      this.checkForUnreadNotifications();
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

  getRecentNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/recent`);
  }

  getAllNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl).pipe(
      tap(notifications => {
        this.notificationsSubject.next(notifications);
        this.checkForUnreadNotifications();
        console.log('Notifications subject updated with:', notifications);
      }),
      catchError(error => {
        console.error('Error fetching historical notifications:', error);
        return throwError(error);
      })
    );
  }

  sendTestNotification(): Observable<any> {
    const token = this.authService.getToken();

    // Explicitly set headers
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.apiUrl}/test`, {}, { headers }).pipe(
      tap((response) => {
        console.log('Test notification success:', response);
      }),
      catchError((error) => {
        console.error('Test notification error:', error);
        return throwError(error);
      })
    );
  }

  markAsRead(): void {
    const allNotificationIds = this.notificationsSubject.value.map(n => n.id);
    this.seenNotificationIds = [...new Set([...this.seenNotificationIds, ...allNotificationIds])];
    this.saveSeenNotifications();
    this.hasUnreadNotifications$.next(false);
  }

  private checkForUnreadNotifications(): void {
    const allNotifications = this.notificationsSubject.value;
    const unreadNotifications = allNotifications.filter(n => !this.seenNotificationIds.includes(n.id));
    this.hasUnreadNotifications$.next(unreadNotifications.length > 0);
  }

  private saveSeenNotifications(): void {
    localStorage.setItem('seenNotificationIds', JSON.stringify(this.seenNotificationIds));
  }

  private loadSeenNotifications(): void {
    const seenIds = localStorage.getItem('seenNotificationIds');
    if (seenIds) {
      this.seenNotificationIds = JSON.parse(seenIds);
    }
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
