import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { AiChatStateService } from './ai-chat-state.service';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../authentication/auth.service';
import { ChatMessage } from '../models/ai-chat.models';

@Injectable({
  providedIn: 'root'
})
export class SignalrService {
  private hubConnection!: signalR.HubConnection;
  private connectionPromise?: Promise<void>;

  constructor(
    private aiChatStateService: AiChatStateService,
    private authService: AuthService
  ) { }

  public startConnection(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      const token = await this.authService.getToken();
      const baseUrl = environment.BACKEND_URL.replace('/api', '');
      const hubUrl = `${baseUrl}/chathub`;

      console.log(`SignalR: Hub URL is ${hubUrl}`);
      console.log(`SignalR: Token exists: ${!!token}`);

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => {
            console.log('SignalR: Providing token to connection');
            return token || '';
          },
          skipNegotiation: false
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Debug)
        .build();

      this.hubConnection.on('ReceiveMessage', (message: ChatMessage) => {
        console.log('SignalR: Received message via SignalR:', message);
        console.log('SignalR: Message structure:', JSON.stringify(message, null, 2));
        this.aiChatStateService.addMessage(message);
        console.log('SignalR: Added message to state service');
      });

      this.hubConnection.onclose(error => {
        console.error(`SignalR connection closed with error: ${error}`);
      });

      console.log('SignalR: Starting connection...');
      await this.hubConnection.start();
      console.log('SignalR: Connection started successfully.');
    })();

    return this.connectionPromise;
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.connectionPromise = undefined;
    }
  }

  public async joinConversationGroup(conversationId: string): Promise<void> {
    console.log(`SignalR: Attempting to join conversation group: ${conversationId}`);
    await this.startConnection();
    try {
      console.log(`SignalR: Invoking JoinConversationGroup for ${conversationId}`);
      await this.hubConnection.invoke('JoinConversationGroup', conversationId);
      console.log(`SignalR: Successfully invoked JoinConversationGroup for ${conversationId}`);
    } catch (err) {
      console.error(`SignalR: Error joining conversation group ${conversationId}:`, err);
    }
  }
}
