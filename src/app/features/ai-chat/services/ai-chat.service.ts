import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AiChatStateService } from './ai-chat-state.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Conversation, Prompt } from '../models/ai-chat.models';
import { environment } from "../../../../environments/environment";
import { AuthService } from '../../../authentication/auth.service';

const BASE_URL = `${environment.BACKEND_URL}/Chat`;

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  constructor(
    private http: HttpClient,
    private state: AiChatStateService,
    private authService: AuthService
  ) { }

  getMyPrompts() {
    console.log('DELETE ME: [AiChatService] Getting my prompts...');
    this.state.setLoading(true);
    this.http.get<Prompt[]>(`${BASE_URL}/my-prompts`)
      .pipe(
        catchError(err => {
          console.error('DELETE ME: [AiChatService] Failed to fetch prompts:', err);
          this.state.setError('Failed to fetch prompts.');
          this.state.setLoading(false);
          return of([]);
        })
      )
      .subscribe(prompts => {
        console.log('DELETE ME: [AiChatService] Successfully fetched prompts:', prompts);
        this.state.setPrompts(prompts);
        this.state.setLoading(false);
      });
  }

  startConversation(initialMessage: string, promptKey: string, blueprintUrls: string[]) {
    console.log(`DELETE ME: [AiChatService] Starting conversation with promptKey: ${promptKey}`);
    this.state.setLoading(true);
    const userType = this.authService.getUserRole();
    console.log(`DELETE ME: [AiChatService] UserType for new conversation: ${userType}`);
    const payload = { initialMessage, promptKey, blueprintUrls, userType };
    console.log('DELETE ME: [AiChatService] Start conversation payload:', payload);
    this.http.post<Conversation>(`${BASE_URL}/start`, payload)
      .pipe(
        catchError(err => {
          console.error('DELETE ME: [AiChatService] Failed to start conversation:', err);
          this.state.setError('Failed to start conversation.');
          this.state.setLoading(false);
          return of(null);
        })
      )
      .subscribe(conversation => {
        console.log('DELETE ME: [AiChatService] Successfully started conversation:', conversation);
        if (conversation) {
          this.state.addConversation(conversation);
          this.state.setActiveConversationId(conversation.Id);
        }
        this.state.setLoading(false);
      });
  }

  sendMessage(conversationId: string, message: string) {
    console.log(`DELETE ME: [AiChatService] Sending message to conversation ${conversationId}: "${message}"`);
    this.state.setLoading(true);
    this.http.post(`${BASE_URL}/${conversationId}/message`, { message })
      .pipe(
        catchError(err => {
          console.error('DELETE ME: [AiChatService] Failed to send message:', err);
          this.state.setError('Failed to send message.');
          this.state.setLoading(false);
          return of(null);
        })
      )
      .subscribe(response => {
        console.log('DELETE ME: [AiChatService] Successfully sent message:', response);
        // Handle response if necessary
        this.state.setLoading(false);
      });
  }

  getConversation(conversationId: string) {
    console.log(`DELETE ME: [AiChatService] Getting conversation ${conversationId}`);
    this.state.setLoading(true);
    this.http.get<any[]>(`${BASE_URL}/${conversationId}`)
      .pipe(
        map(messages => messages.map(m => ({
          Id: m.id,
          ConversationId: m.conversationId,
          Role: m.role,
          Content: m.content,
          IsSummarized: m.isSummarized,
          Timestamp: m.timestamp
        }))),
        catchError(err => {
          console.error('DELETE ME: [AiChatService] Failed to fetch conversation:', err);
          this.state.setError('Failed to fetch conversation.');
          this.state.setLoading(false);
          return of([]);
        })
      )
      .subscribe(messages => {
        console.log('DELETE ME: [AiChatService] Successfully fetched conversation:', messages);
        this.state.setMessages(messages);
        this.state.setLoading(false);
      });
  }

  getMyConversations() {
    console.log('DELETE ME: [AiChatService] Getting my conversations...');
    this.state.setLoading(true);
    this.http.get<any[]>(`${BASE_URL}/my-conversations`)
      .pipe(
        map(conversations => conversations.map(c => ({
          Id: c.id,
          UserId: c.userId,
          Title: c.title,
          CreatedAt: c.createdAt,
          ConversationSummary: c.conversationSummary
        } as Conversation))),
        catchError(err => {
          console.error('DELETE ME: [AiChatService] Failed to fetch conversations:', err);
          this.state.setError('Failed to fetch conversations.');
          this.state.setLoading(false);
          return of([]);
        })
      )
      .subscribe(conversations => {
        console.log('DELETE ME: [AiChatService] Successfully fetched conversations:', conversations);
        this.state.setConversations(conversations);
        this.state.setLoading(false);
      });
  }
}
