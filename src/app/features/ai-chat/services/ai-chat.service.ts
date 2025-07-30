import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AiChatStateService } from './ai-chat-state.service';
import { catchError, map } from 'rxjs/operators';
import { of, Observable, forkJoin } from 'rxjs';
import { Conversation, Prompt, ChatMessage } from '../models/ai-chat.models';
import { environment } from "../../../../environments/environment";
import { AuthService } from '../../../authentication/auth.service';
import { JobDocument } from '../../../models/JobDocument';

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

  startConversation(initialMessage: string, promptKey: string, files: File[]): Observable<Conversation | null> {
    console.log(`DELETE ME: [AiChatService] Starting conversation with promptKey: ${promptKey}`);
    this.state.setLoading(true);
    const userType = this.authService.getUserRole();
    console.log(`DELETE ME: [AiChatService] UserType for new conversation: ${userType}`);

    const formData = new FormData();
    formData.append('initialMessage', initialMessage);
    formData.append('promptKey', promptKey);
    formData.append('userType', userType as string);
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<Conversation>(`${BASE_URL}/start`, formData)
      .pipe(
        map(conversation => {
          console.log('DELETE ME: [AiChatService] Successfully started conversation:', conversation);
          if (conversation) {
            this.state.addConversation(conversation);
            this.state.setActiveConversationId(conversation.Id);
          }
          this.state.setLoading(false);
          return conversation;
        }),
        catchError(err => {
          console.error('DELETE ME: [AiChatService] Failed to start conversation:', err);
          this.state.setError('Failed to start conversation.');
          this.state.setLoading(false);
          return of(null);
        })
      );
  }

  sendMessage(conversationId: string, message: string, files: File[] = []) {
    console.log(`DELETE ME: [AiChatService] Sending message to conversation ${conversationId}: "${message}"`);
    this.state.setLoading(true);

    const formData = new FormData();
    formData.append('message', message);
    files.forEach(file => {
      formData.append('files', file);
    });

    this.http.post(`${BASE_URL}/${conversationId}/message`, formData)
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

    const messages$ = this.http.get<any[]>(`${BASE_URL}/${conversationId}`).pipe(
      map(messages => messages.map(m => ({
        Id: m.id,
        ConversationId: m.conversationId,
        Role: m.role,
        Content: m.content,
        IsSummarized: m.isSummarized,
        Timestamp: m.timestamp
      } as ChatMessage)))
    );

    const documents$ = this.http.get<JobDocument[]>(`${BASE_URL}/${conversationId}/documents`);

    forkJoin({ messages: messages$, documents: documents$ }).pipe(
      catchError(err => {
        console.error('DELETE ME: [AiChatService] Failed to fetch conversation data:', err);
        this.state.setError('Failed to fetch conversation data.');
        this.state.setLoading(false);
        return of(null);
      })
    ).subscribe(response => {
      if (response) {
        console.log('DELETE ME: [AiChatService] Successfully fetched conversation messages:', response.messages);
        this.state.setMessages(response.messages || []);
        console.log('DELETE ME: [AiChatService] Successfully fetched conversation documents:', response.documents);
        this.state.setDocuments(response.documents || []);
      }
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

  startRenovationAnalysis(files: FileList): void {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    this.http.post<any>(`${BASE_URL}/start-renovation-analysis`, formData).subscribe(response => {
      this.state.addMessage(response);
    });
  }

  startSubcontractorComparison(files: FileList): void {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    this.http.post<any>(`${BASE_URL}/start-subcontractor-comparison`, formData).subscribe(response => {
      this.state.addMessage(response);
    });
  }

  startVendorComparison(files: FileList): void {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    this.http.post<any>(`${BASE_URL}/start-vendor-comparison`, formData).subscribe(response => {
      this.state.addMessage(response);
    });
  }
  getDisplayContent(content: string, role: 'user' | 'model'): string {
    if (role === 'user') {
      const failureRegex = /^Failure Prompt:/s;
      if (failureRegex.test(content)) {
        return 'Failure';
      }

      const promptRegex1 = /^Prompt \d+: (.*)/s;
      const promptRegex2 = /^Phase \d+: (.*)/s;

      let match = content.match(promptRegex1);
      if (!match) {
        match = content.match(promptRegex2);
      }

      if (match && match[1] && content.length > 100) {
        // The title is the first line of the matched group.
        const title = match[1].split('\n')[0];
        return title.trim();
      }

    }
    if (role === 'model') {
      let modifiedContent = content;

      // Remove "To the esteemed client,"
      const clientRegex = /^To the esteemed client,/i;
      modifiedContent = modifiedContent.replace(clientRegex, '');

      // This regex removes variations of "Ready for the next prompt..."
      const removalRegex = /Ready for the next prompt \d+[\."\s]*/gi;
      modifiedContent = modifiedContent.replace(removalRegex, '');

      return modifiedContent.trim();
    }

    return content;
  }
}
