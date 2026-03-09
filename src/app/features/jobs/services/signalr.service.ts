import { Injectable } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { Subject, Observable, firstValueFrom } from 'rxjs';
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
  private startPromise?: Promise<void>;
  private manuallyStopped = false;
  private restartAttempt = 0;
  private readonly boundJobIds = new Set<number>();
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
    void this.ensureStarted();
  }

  public bindJob(jobId: number): void {
    if (!Number.isFinite(jobId)) return;
    this.boundJobIds.add(Number(jobId));

    // Best-effort: if already connected, immediately rebind
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      const connectionId = this.hubConnection.connectionId;
      if (connectionId) {
        void this.notifyBackendReconnect(Number(jobId), connectionId);
      }
    }
  }

  public unbindJob(jobId: number): void {
    this.boundJobIds.delete(Number(jobId));
  }

  private async ensureStarted(): Promise<void> {
    if (this.startPromise) {
      return this.startPromise;
    }

    if (this.hubConnection?.state === HubConnectionState.Connected) {
      return;
    }

    this.manuallyStopped = false;
    this.startPromise = this.startWithRetry();

    try {
      await this.startPromise;
    } finally {
      this.startPromise = undefined;
    }
  }

  private buildConnection(): void {
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

    this.hubConnection.keepAliveIntervalInMilliseconds = 15000;
    this.hubConnection.serverTimeoutInMilliseconds = 120000;

    this.hubConnection.onreconnecting((error) =>
      console.warn('Connection lost. Reconnecting...', error),
    );

    this.hubConnection.onreconnected(() => {
      this.restartAttempt = 0;
      const connectionId = this.hubConnection?.connectionId;
      if (connectionId) {
        void this.rebindAllJobs(connectionId);
      }
    });

    this.hubConnection.onclose((err) => {
      this.clearPingInterval();
      if (this.manuallyStopped) {
        return;
      }
      console.warn('SignalR connection closed. Restarting...', err);
      void this.ensureStarted();
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

    this.hubConnection.on('ReceiveAnalysisData', (data: any) => {
      console.log('SignalR: ReceiveAnalysisData event received', data);
      this.analysisData.next(data);
    });
  }

  private async startWithRetry(): Promise<void> {
    if (!this.hubConnection) {
      this.buildConnection();
    }

    if (this.hubConnection.state === HubConnectionState.Connected) {
      this.restartAttempt = 0;
      this.startPingInterval();
      return;
    }

    if (this.hubConnection.state !== HubConnectionState.Disconnected) {
      return;
    }

    try {
      await this.hubConnection.start();
      this.restartAttempt = 0;
      this.startPingInterval();

      const connectionId = this.hubConnection.connectionId;
      if (connectionId) {
        await this.rebindAllJobs(connectionId);
      }
    } catch (err) {
      this.restartAttempt++;
      const backoffMs = Math.min(30000, 1000 * Math.pow(2, this.restartAttempt));
      console.error('SignalR Connection Error:', err);
      await this.delay(backoffMs);

      if (!this.manuallyStopped) {
        return this.startWithRetry();
      }
    }
  }

  private startPingInterval(): void {
    this.clearPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.hubConnection?.state === HubConnectionState.Connected) {
        this.hubConnection.invoke('Ping').catch((err) => {
          console.warn('SignalR Ping failed:', err);
        });
      }
    }, 60000);
  }

  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getConnectionId = (): string | null => {
    return this.hubConnection?.connectionId ?? null;
  };

  public stopConnection(): void {
    this.manuallyStopped = true;
    this.clearPingInterval();
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }

  private async rebindAllJobs(connectionId: string): Promise<void> {
    const jobs = Array.from(this.boundJobIds.values());
    if (jobs.length === 0) return;

    await Promise.all(
      jobs.map((jobId) => this.notifyBackendReconnect(jobId, connectionId)),
    );
  }

  private async notifyBackendReconnect(
    jobId: number,
    connectionId: string,
  ): Promise<void> {
    const baseUrl = environment.BACKEND_URL.replace(/\/api\/?$/, '');
    try {
      await firstValueFrom(
        this.http.post(`${baseUrl}/api/JobStatus/${jobId}/reconnect`, {
          connectionId,
        }),
      );
    } catch (err) {
      console.warn('SignalR: failed to rebind job after reconnect', {
        jobId,
        err,
      });
    }
  }
}
