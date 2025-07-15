import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SignalrService {
  private hubConnection!: HubConnection;
  public progress = new Subject<number>();
  public uploadComplete = new Subject<number>();

  constructor() {}

  public startConnection(sessionId: string): void {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(
        `https://probuildai-backend.wonderfulgrass-0f331ae8.centralus.azurecontainerapps.io/progressHub?sessionId=${sessionId}`
      )
      .configureLogging(LogLevel.Debug)
      .build();

    this.hubConnection
      .start()
      .then(() => console.log('SignalR connection established successfully'))
      .catch((err) => console.error('SignalR Connection Error:', err));

    this.hubConnection.on('ReceiveProgress', (progress: number) => {
      this.progress.next(progress);
    });

    this.hubConnection.on('UploadComplete', (fileCount: number) => {
      this.uploadComplete.next(fileCount);
    });
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
