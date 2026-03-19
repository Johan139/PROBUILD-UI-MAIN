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
  public analysisEmailSent = new Subject<number>();
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
        }, 60000);
      })
      .catch((err) => console.error('SignalR Connection Error:', err));

    this.hubConnection.on('Pong', () => {
      // No-op: keep-alive response from server
    });

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

    this.hubConnection.on('AnalysisComplete', (jobId: number, message?: string) => {
      this.analysisProgress.next({
        jobId,
        statusMessage: message || 'Analysis complete.',
        currentStep: 1,
        totalSteps: 1,
        isComplete: true,
        hasFailed: false,
        errorMessage: '',
      });
    });

    this.hubConnection.on('AnalysisFailed', (jobId: number, message?: string) => {
      this.analysisProgress.next({
        jobId,
        statusMessage: message || 'Analysis failed.',
        currentStep: 0,
        totalSteps: 0,
        isComplete: false,
        hasFailed: true,
        errorMessage: message || 'Analysis failed.',
      });
    });

    this.hubConnection.on('JobProcessingComplete', (payload: any) => {
      const jobId = Number(payload?.jobId ?? payload?.JobId);
      if (!Number.isFinite(jobId)) {
        return;
      }

      this.analysisProgress.next({
        jobId,
        statusMessage: payload?.message || payload?.Message || 'Document processing complete.',
        currentStep: 1,
        totalSteps: 1,
        isComplete: true,
        hasFailed: false,
        errorMessage: '',
      });
    });

    this.hubConnection.on('JobProcessingFailed', (payload: any) => {
      const jobId = Number(payload?.jobId ?? payload?.JobId);
      if (!Number.isFinite(jobId)) {
        return;
      }

      const error = payload?.error || payload?.Error || 'Document processing failed.';
      this.analysisProgress.next({
        jobId,
        statusMessage: 'Document processing failed.',
        currentStep: 0,
        totalSteps: 0,
        isComplete: false,
        hasFailed: true,
        errorMessage: String(error),
      });
    });

    this.hubConnection.on('ReceiveAnalysisData', (data: any) => {
      this.analysisData.next(data);
    });

    this.hubConnection.on('AnalysisEmailSent', (payload: any) => {
      const jobId = Number(payload?.jobId ?? payload?.JobId);
      if (!Number.isFinite(jobId)) {
        return;
      }
      this.analysisEmailSent.next(jobId);
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
