import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AiChatStateService } from './ai-chat-state.service';
import { catchError, map, switchMap, take } from 'rxjs/operators';
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
    if (!this.authService.isLoggedIn()) {
      console.log('DELETE ME: [AiChatService] User not logged in, skipping getMyPrompts.');
      this.state.setPrompts([]);
      return;
    }
    console.log('DELETE ME: [AiChatService] Getting my prompts...');
    this.state.setLoading(true);
    this.authService.currentUser$.pipe(
      take(1),
      switchMap(user => {
        return this.http.get<any[]>(`${BASE_URL}/prompts`).pipe(
          map(prompts => {
            const userRole = this.authService.getUserRole();
            const userTrades = user?.trades || [];
            const hiddenPrompts = [
              "Subcontractor_Comparison_Prompt.txt",
              "Vendor_Comparison_Prompt.txt",
              "sub-contractor-selected-prompt-master-prompt.txt",
              "prompt-failure-corrective-action.txt",
              "prompt-revision.txt",
              "prompt-22-rebuttal.txt"
            ];
            return prompts
              .filter(prompt => {
                const isRoleAllowed = prompt.allowedUserTypes.includes(userRole);
                if (userRole === 'GENERAL_CONTRACTOR') {
                  return isRoleAllowed;
                }
                const isTradeAllowed = prompt.associatedTrades.length === 0 || prompt.associatedTrades.some((trade: any) => userTrades.includes(trade));
                return isRoleAllowed && isTradeAllowed;
              })
              .filter(prompt => !hiddenPrompts.includes(prompt.promptFileName))
              .map(prompt => ({
                promptName: prompt.displayName,
                promptKey: prompt.promptFileName,
                description: prompt.description
              }));
          })
        );
      }),
      catchError(err => {
        console.error('DELETE ME: [AiChatService] Failed to fetch prompts:', err);
        this.state.setError('Failed to fetch prompts.');
        return of([]);
      })
    ).subscribe(prompts => {
      console.log('DELETE ME: [AiChatService] Successfully fetched prompts:', prompts);
      this.state.setPrompts(prompts);
      this.state.setLoading(false);
    });
  }

  startConversation(initialMessage: string, promptKey: string | null, files: File[], promptKeys?: string[]): Observable<Conversation | null> {
    console.log(`DELETE ME: [AiChatService] Starting conversation with promptKey: ${promptKey}`);
    this.state.setLoading(true);
    const userType = this.authService.getUserRole();
    console.log(`DELETE ME: [AiChatService] UserType for new conversation: ${userType}`);

    const tempId = Date.now();
    const userMessage: ChatMessage = {
      Id: tempId,
      ConversationId: '', // No conversation ID yet
      Role: 'user',
      Content: initialMessage,
      IsSummarized: false,
      Timestamp: new Date(),
      status: 'sent'
    };
    this.state.addMessage(userMessage, true);

    const formData = new FormData();
    formData.append('initialMessage', initialMessage);
    if (promptKey) {
      formData.append('promptKey', promptKey);
    }
    if (promptKeys && promptKeys.length > 0) {
      promptKeys.forEach(key => formData.append('promptKeys', key));
    }
    formData.append('userType', userType as string);
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<any>(`${BASE_URL}/start`, formData)
      .pipe(
        map(response => {
          if (!response) return null;

          const conversation: Conversation = {
            Id: response.id,
            UserId: response.userId,
            Title: response.title,
            CreatedAt: response.createdAt,
            ConversationSummary: response.conversationSummary,
            messages: response.messages ? response.messages.map((m: any) => ({
              Id: m.id,
              ConversationId: m.conversationId,
              Role: m.role,
              Content: m.content,
              IsSummarized: m.isSummarized,
              Timestamp: m.timestamp
            } as ChatMessage)) : []
          };

          console.log('DELETE ME: [AiChatService] Successfully started conversation:', conversation);
          if (conversation) {
            this.state.addConversation(conversation);
            this.state.setActiveConversationId(conversation.Id);
            if (conversation.messages && conversation.messages.length > 0) {
              this.state.setMessages(conversation.messages);
            }
          }
          this.state.setLoading(false);
          return conversation;
        }),
        catchError(err => {
          console.error('DELETE ME: [AiChatService] Failed to start conversation:', err);
          this.state.setError('Failed to start conversation.');
          this.state.updateMessageStatus(tempId, 'failed');
          this.state.setLoading(false);
          return of(null);
        })
      );
  }

  sendMessage(conversationId: string, message: string, files: File[] = [], promptKeys: string[] = []) {
    console.log(`DELETE ME: [AiChatService] Sending message to conversation ${conversationId}: "${message}"`);
    this.state.setLoading(true);

    const tempId = Date.now();
    const userMessage: ChatMessage = {
      Id: tempId,
      ConversationId: conversationId,
      Role: 'user',
      Content: message,
      IsSummarized: false,
      Timestamp: new Date(),
      status: 'sent'
    };
    this.state.addMessage(userMessage, true);

    const formData = new FormData();
    formData.append('message', message);
    files.forEach(file => {
      formData.append('files', file);
    });
    promptKeys.forEach(key => {
      formData.append('promptKeys', key);
    });

    this.http.post<ChatMessage>(`${BASE_URL}/${conversationId}/message`, formData)
      .pipe(
        catchError(err => {
          console.error('DELETE ME: [AiChatService] Failed to send message:', err);
          this.state.setError('Failed to send message.');
          this.state.updateMessageStatus(tempId, 'failed');
          this.state.setLoading(false);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          console.log('DELETE ME: [AiChatService] Successfully sent message:', response);
          // this.state.deleteMessage(tempId);
          // this.state.addMessage(response);
        }
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

    const documents$ = this.http.get<JobDocument[]>(`${BASE_URL}/${conversationId}/documents`).pipe(
      catchError(error => {
        console.warn(`Could not fetch documents for conversation ${conversationId}. This is expected if no documents are attached.`, error);
        return of([]);
      })
    );

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
        this.state.setActiveConversationId(conversationId);
      }
      this.state.setLoading(false);
    });
  }

  getMyConversations() {
    if (!this.authService.isLoggedIn()) {
      console.log('DELETE ME: [AiChatService] User not logged in, skipping getMyConversations.');
      this.state.setConversations([]);
      return;
    }
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

  public updateConversationTitle(conversationId: string, newTitle: string): Observable<any> {
    const body = { conversationId, newTitle };
    return this.http.put(`${BASE_URL}/conversation/title`, body);
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

      const iAmDoneRegex = /I am Done[\.\s]*/gi;
      modifiedContent = modifiedContent.replace(iAmDoneRegex, '');

      return modifiedContent.trim();
    }

    return content;
  }
}
