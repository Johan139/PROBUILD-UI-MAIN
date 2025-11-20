import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AiChatStateService } from './ai-chat-state.service';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { of, Observable, forkJoin } from 'rxjs';
import { Conversation, ChatMessage } from '../models/ai-chat.models';
import { environment } from "../../../../environments/environment";
import { AuthService } from '../../../authentication/auth.service';
import { JobDocument } from '../../../models/JobDocument';

const CHAT_BASE_URL = `${environment.BACKEND_URL}/Chat`;
const AI_BASE_URL = `${environment.BACKEND_URL}/Ai`;

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
      this.state.setPrompts([]);
      return;
    }
    this.state.setLoading(true);
    this.authService.currentUser$.pipe(
      take(1),
      switchMap(user => {
        return this.http.get<any[]>(`${CHAT_BASE_URL}/prompts`).pipe(
          map(prompts => {
            const userRole = this.authService.getUserRole();
            const userTrades = user?.trades || [];
            const hiddenPrompts = [
              "Subcontractor_Comparison_Prompt.txt",
              "Vendor_Comparison_Prompt.txt",
              "selected-prompt-system-persona.txt",
              "prompt-failure-corrective-action.txt",
              "prompt-revision.txt",
              "bid-justification-rebuttal-prompt.txt"
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
              .map((prompt, index) => ({
                id: index + 1, // Generate a unique ID
                promptName: prompt.displayName,
                promptKey: prompt.promptFileName,
                description: prompt.description
              }));
          })
        );
      }),
      catchError(err => {
        this.state.setError('Failed to fetch prompts.');
        return of([]);
      })
    ).subscribe(prompts => {
      this.state.setPrompts(prompts);
      this.state.setLoading(false);
    });
  }

  startConversation(initialMessage: string, promptKey: string | null, files: File[], promptKeys: string[] = []): Observable<Conversation | null> {
    this.state.setLoading(true);
    const userType = this.authService.getUserRole();
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
    formData.append('initialMessage', initialMessage || '');
    if (promptKey) {
      formData.append('promptKey', promptKey);
    }
    (promptKeys || []).forEach(key => {
        formData.append('promptKeys', key);
    });
    if (userType) {
        formData.append('userType', userType);
    }
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post<any>(`${CHAT_BASE_URL}/start`, formData)
      .pipe(
        switchMap(response => {
          if (!response) {
            this.state.setLoading(false);
            return of(null);
          }

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

          this.state.setLoading(false);
          return of(conversation);
        }),
        catchError(err => {
          this.state.setError('Failed to start conversation.');
          this.state.updateMessageStatus(tempId, 'failed');
          this.state.setLoading(false);
          return of(null);
        })
      );
  }

  createConversation(): Observable<Conversation | null> {
    return this.http.post<any>(`${CHAT_BASE_URL}/create`, {})
      .pipe(
        map(response => {
          if (!response) return null;
          const conversation: Conversation = {
            Id: response.id,
            UserId: response.userId,
            Title: response.title,
            CreatedAt: response.createdAt,
            ConversationSummary: response.conversationSummary,
            messages: []
          };
          return conversation;
        }),
        catchError(err => {
          this.state.setError('Failed to create conversation.');
          return of(null);
        })
      );
  }

  sendMessage(conversationId: string, message: string, files: File[] = [], promptKeys: string[] = [], documentUrls: string[] = []) {
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
    documentUrls.forEach(url => {
      formData.append('documentUrls', url);
    });

    this.http.post<ChatMessage>(`${CHAT_BASE_URL}/${conversationId}/message`, formData)
      .pipe(
        catchError(err => {
          this.state.setError('Failed to send message.');
          this.state.updateMessageStatus(tempId, 'failed');
          this.state.setLoading(false);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          // this.state.deleteMessage(tempId);
          // this.state.addMessage(response);
        }
        this.state.setLoading(false);
      });
  }

  getConversation(conversationId: string): Observable<{ messages: ChatMessage[], documents: JobDocument[] } | null> {
    this.state.setLoading(true);

    const messages$ = this.http.get<any[]>(`${CHAT_BASE_URL}/${conversationId}`).pipe(
      map(messages => messages.map(m => ({
        Id: m.id,
        ConversationId: m.conversationId,
        Role: m.role,
        Content: m.content,
        IsSummarized: m.isSummarized,
        Timestamp: m.timestamp
      } as ChatMessage)))
    );

    const documents$ = this.http.get<JobDocument[]>(`${CHAT_BASE_URL}/${conversationId}/documents`).pipe(
      catchError(error => {
        console.warn(`Could not fetch documents for conversation ${conversationId}. This is expected if no documents are attached.`, error);
        return of([]);
      })
    );

    return forkJoin({ messages: messages$, documents: documents$ }).pipe(
      map(response => {
        this.state.setMessages(response.messages || []);
        this.state.setDocuments(response.documents || []);
        this.state.setActiveConversationId(conversationId);
        this.state.setLoading(false);
        return response;
      }),
      catchError(err => {
        this.state.setError('Failed to fetch conversation data.');
        this.state.setLoading(false);
        return of(null);
      })
    );
  }

  getMyConversations() {
    if (!this.authService.isLoggedIn()) {
      this.state.setConversations([]);
      return;
    }
    this.state.setLoading(true);
    this.http.get<any[]>(`${CHAT_BASE_URL}/my-conversations`)
      .pipe(
        map(conversations => conversations.map(c => ({
          Id: c.id,
          UserId: c.userId,
          Title: c.title,
          CreatedAt: c.createdAt,
          ConversationSummary: c.conversationSummary
        } as Conversation))),
        catchError(err => {
          this.state.setError('Failed to fetch conversations.');
          this.state.setLoading(false);
          return of([]);
        })
      )
      .subscribe(conversations => {
        this.state.setConversations(conversations);
        this.state.setLoading(false);
      });
  }

  public updateConversationTitle(conversationId: string, newTitle: string): Observable<any> {
    const body = { conversationId, newTitle };
    return this.http.put(`${CHAT_BASE_URL}/conversation/title`, body);
  }

  getConversationDocuments(conversationId: string): Observable<JobDocument[]> {
    return this.http.get<JobDocument[]>(`${CHAT_BASE_URL}/${conversationId}/documents`);
  }

  startRenovationAnalysis(files: FileList): void {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    this.http.post<any>(`${AI_BASE_URL}/renovation/analyze`, formData).subscribe(response => {
      this.state.addMessage(response);
    });
  }

  startSubcontractorComparison(files: FileList): void {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    this.http.post<any>(`${AI_BASE_URL}/comparison/analyze`, formData).subscribe(response => {
      this.state.addMessage(response);
    });
  }

  startVendorComparison(files: FileList): void {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    this.http.post<any>(`${AI_BASE_URL}/comparison/analyze`, formData).subscribe(response => {
      this.state.addMessage(response);
    });
  }

  getDisplayContent(content: string, role: 'user' | 'model'): string {
    if (role === 'user') {
      const failureRegex = /^Failure Prompt:/s;
      if (failureRegex.test(content)) {
        return 'Failure';
      }

      const criticalOutputRegex = /^CRITICAL OUTPUT REQUIREMENT:/s;
      const budgetOutputRegex = /^Prompt: .*?Budget Context/s;
      if (criticalOutputRegex.test(content) || budgetOutputRegex.test(content)) {
        return 'The start of your analysis with Mason';
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

      const jsonRegex = /```json\s*\{[\s\S]*?\}\s*```/s;
      modifiedContent = modifiedContent.replace(jsonRegex, '');

      const jsonBackupRegex = /\{\s*"projectName":[\s\S]*?"buildingSize":\s*\d+\s*\}/s;
      modifiedContent = modifiedContent.replace(jsonBackupRegex, '');

      const clientRegex = /^To the esteemed client,/i;
      modifiedContent = modifiedContent.replace(clientRegex, '');

      const removalRegex = /Ready for the next prompt \d+[\."\s]*/gi;
      modifiedContent = modifiedContent.replace(removalRegex, '');

      const iAmDoneRegex = /I am Done[\.\s]*/gi;
      modifiedContent = modifiedContent.replace(iAmDoneRegex, '');

      const preparedByRegex = /^\s*(\*\*|)?Prepared By:(\*\*|)? Gemini,.*$/gim;
      modifiedContent = modifiedContent.replace(preparedByRegex, '');

      const fromGeminiRegex = /^\s*(\*\*From:\*\*|\*\*From\*\*:|From:)\s*Gemini.*$/gim;
      modifiedContent = modifiedContent.replace(fromGeminiRegex, '');

      const toRegex = /^\s*(\*\*To:\*\*|\*\*To\*\*:|To:)\s*.*$/gim;
      modifiedContent = modifiedContent.replace(toRegex, '');

      return modifiedContent.trim();
    }

    return content;
  }
}
