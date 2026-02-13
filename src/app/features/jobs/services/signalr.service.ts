import { Injectable } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../authentication/auth.service';
import { environment } from '../../../../environments/environment';

export interface AnalysisProgressUpdate {
  jobId: number;
  statusMessage: string;
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  hasFailed: boolean;
  errorMessage: string;
}

@Injectable({
  providedIn: 'root',
})
export class SignalrService {
  private hubConnection!: HubConnection;
  public progress = new Subject<number>();
  public uploadComplete = new Subject<number>();
  public analysisProgress = new Subject<AnalysisProgressUpdate>();
  public analysisData = new Subject<any>();
  private pingInterval: any;

  constructor(private authService: AuthService, private http: HttpClient) {}

  public getAnalysisState(jobId: number): Observable<any> {
    const baseUrl = environment.BACKEND_URL.replace(/\/api\/?$/, '');
    return this.http.get<any>(`${baseUrl}/api/Jobs/${jobId}/analysis-state`);
  }

  public startConnection(): void {
    if (this.hubConnection && this.hubConnection.state === 'Connected') {
      return;
    }

    const baseUrl = environment.BACKEND_URL.replace(/\/api\/?$/, '');
    const hubUrl = `${baseUrl}/hubs/progressHub`;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: async () => {
          const token = await this.authService.getToken();
          return token || '';
        },
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(LogLevel.Debug)
      .build();

    this.hubConnection.onreconnecting((error) =>
      console.warn('Connection lost. Reconnecting...', error),
    );
    this.hubConnection
      .start()
      .then(() => {
        // Start ping interval to keep connection alive
        this.pingInterval = setInterval(() => {
          if (this.hubConnection.state === 'Connected') {
            this.hubConnection.invoke('Ping').catch((err) => {
              console.warn('SignalR Ping failed:', err);
            });
          }
        }, 60000); // Ping every 60 seconds TODO: Need to add a Pong handler to stop warnings on front end console
      })
      .catch((err) => console.error('SignalR Connection Error:', err));

    this.hubConnection.on('ReceiveProgress', (progress: number) => {
      this.progress.next(progress);
    });

    this.hubConnection.on('UploadComplete', (fileCount: number) => {
      this.uploadComplete.next(fileCount);
    });

    this.hubConnection.on(
      'ReceiveAnalysisProgress',
      (data: AnalysisProgressUpdate) => {
        this.analysisProgress.next(data);
      },
    );

    this.hubConnection.on('ReceiveAnalysisData', (data: any) => {
      console.log('SignalR: ReceiveAnalysisData event received', data);
      this.analysisData.next(data);
    });
  }

  public getConnectionId = (): string | null => {
    return this.hubConnection?.connectionId ?? null;
  };

  public stopConnection(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
