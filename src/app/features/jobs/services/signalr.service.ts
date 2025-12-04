import { Injectable } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import { Subject } from 'rxjs';
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

  constructor(private authService: AuthService) {}

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
      .then()
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
  }

  public getConnectionId = (): string | null => {
    return this.hubConnection?.connectionId ?? null;
  };

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
