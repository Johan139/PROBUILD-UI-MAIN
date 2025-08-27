import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { AiChatStateService } from './ai-chat-state.service';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../authentication/auth.service';
import { ChatMessage } from '../models/ai-chat.models';

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private hubConnection?: signalR.HubConnection;
  private connectionPromise?: Promise<void>;

  constructor(
    private aiChatStateService: AiChatStateService,
    private authService: AuthService
  ) {}

  public async startConnection(): Promise<void> {
    // Fast-path: already connected
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;
    if (this.connectionPromise) return this.connectionPromise;

    if (!this.authService.isLoggedIn()) {
      console.log('SignalR: User not logged in, skipping connection.');
      return;
    }

    const baseUrl = environment.BACKEND_URL.replace(/\/api\/?$/, '');
    const hubUrl = `${baseUrl}/chathub`;

    // (Re)build if missing or was disposed
    if (!this.hubConnection) {
   this.hubConnection = new signalR.HubConnectionBuilder()
  .withUrl(hubUrl, {
    // ensure Promise<string>, never null
    accessTokenFactory: async (): Promise<string> =>
      (await this.authService.getToken()) ?? '',
    skipNegotiation: false,
  })
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Information)
  .build();

      this.hubConnection.on('ReceiveMessage', (message: ChatMessage) => {
        this.aiChatStateService.addMessage(message);
        console.debug('SignalR: message received');
      });

      this.hubConnection.onreconnecting(err => {
        console.warn('SignalR: reconnecting...', err);
      });

      this.hubConnection.onreconnected(connectionId => {
        console.info('SignalR: reconnected.', { connectionId });
      });

      this.hubConnection.onclose(err => {
        if (err) {
          console.error('SignalR: connection closed due to error:', err);
        } else {
          console.log('SignalR: connection closed gracefully (stop/dispose).');
        }
        this.connectionPromise = undefined;
      });
    }

    this.connectionPromise = this.hubConnection.start()
      .then(() => console.log('SignalR: connection started.'))
      .catch(err => {
        console.error('SignalR: failed to start:', err);
        this.connectionPromise = undefined;
        throw err;
      });

    return this.connectionPromise;
  }

  public async stopConnection(): Promise<void> {
    if (!this.hubConnection) return;
    if (this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
      this.connectionPromise = undefined;
      return;
    }
    try {
      await this.hubConnection.stop();
    } finally {
      this.connectionPromise = undefined;
    }
  }

  public async joinConversationGroup(conversationId: string): Promise<void> {
    await this.startConnection();
    try {
      await this.hubConnection!.invoke('JoinConversationGroup', conversationId);
      console.debug('SignalR: joined group', conversationId);
    } catch (err) {
      console.error(`SignalR: error joining group ${conversationId}:`, err);
    }
  }

  public async leaveConversationGroup(conversationId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      try {
       await this.hubConnection!.invoke('LeaveConversation', conversationId);
        console.debug('SignalR: left group', conversationId);
      } catch (err) {
        console.error(`SignalR: error leaving group ${conversationId}:`, err);
      }
    }
  }
private streamChunkListener?: (conversationId: string, chunk: string) => void;

onReceiveStreamChunk(callback: (conversationId: string, chunk: string) => void): void {
  if (this.streamChunkListener) {
    this.hubConnection?.off("ReceiveStreamChunk", this.streamChunkListener);
  }
  this.streamChunkListener = callback;
  this.hubConnection?.on("ReceiveStreamChunk", this.streamChunkListener);
}

private streamEndListener?: (conversationId: string) => void;

onStreamEnd(callback: (conversationId: string) => void): void {
  if (this.streamEndListener) {
    this.hubConnection?.off("StreamComplete", this.streamEndListener);
  }
  this.streamEndListener = callback;
  this.hubConnection?.on("StreamComplete", this.streamEndListener);
}
}
