import { Component, OnDestroy, ViewChild, ElementRef, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AiChatService } from '../../services/ai-chat.service';
import { SignalrService } from '../../services/signalr.service';
import { Observable, Subject, map } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage, Conversation, Prompt } from '../../models/ai-chat.models';
import { FileUploadService, UploadedFileInfo } from '../../../../services/file-upload.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownModule } from 'ngx-markdown';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import promptMapping from '../../assets/prompt_mapping.json';
import { JobDocument } from '../../../../models/JobDocument';
import { AuthService } from '../../../../authentication/auth.service';

@Component({
  selector: 'app-ai-chat-window',
  templateUrl: './ai-chat-window.component.html',
  styleUrls: ['./ai-chat-window.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule, MarkdownModule, MatProgressBarModule, MatButtonModule],
})
export class AiChatWindowComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('folderInput') folderInput!: ElementRef<HTMLInputElement>;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  isChatOpen$: Observable<boolean>;
  messages$: Observable<ChatMessage[]>;
  isLoading$: Observable<boolean>;
  currentConversation$: Observable<Conversation | null>;
  prompts$: Observable<(Prompt & { displayName: string; description: string; promptFileName: string; })[]>;
  conversations$: Observable<Conversation[]>;
  selectedPrompts$: Observable<string[]>;

  public isHistoryVisible = false;
  private conversationId: string | null = null;
  private currentConversation: Conversation | null = null;
  private destroy$ = new Subject<void>();
  private files: File[] = [];
  uploadedFileInfos: UploadedFileInfo[] = [];
  isUploading = false;
  progress = 0;
  public newMessageContent = '';
  public isPromptsPopupVisible = false;
  public promptSelectionState: { [key: string]: boolean } = {};
  public documents: JobDocument[] = [];
  public sortOrder: 'asc' | 'desc' = 'desc';
  public isLoggedIn = false;

  public get isSendDisabled(): boolean {
    let selectedPrompts: string[] = [];
    this.selectedPrompts$.pipe(take(1)).subscribe(prompts => selectedPrompts = prompts);
    if (selectedPrompts.length > 0) {
      return false;
    }
    return !this.newMessageContent.trim() && this.files.length === 0;
  }

  constructor(
    public state: AiChatStateService,
    private aiChatService: AiChatService,
    private router: Router,
    private fileUploadService: FileUploadService,
    private snackBar: MatSnackBar,
    private cdRef: ChangeDetectorRef,
    public dialog: MatDialog,
    private signalrService: SignalrService,
    private authService: AuthService
  ) {
    this.isChatOpen$ = this.state.isChatOpen$;
    this.messages$ = this.state.messages$;
    this.isLoading$ = this.state.isLoading$;
    this.currentConversation$ = this.state.currentConversation$;
    this.conversations$ = this.state.conversations$;
    this.selectedPrompts$ = this.state.selectedPrompts$;

     this.prompts$ = this.state.prompts$.pipe(
       map(prompts => {
        const mappingData: { tradeName: string, promptFileName: string, displayName: string, description: string }[] = promptMapping;
        return prompts.map(prompt => {
          const match = mappingData.find(m => m.promptFileName === prompt.promptKey);
          const displayName = match ? match.displayName : prompt.promptName;
          const description = match ? match.description : '';
          return { ...prompt, displayName, description, promptFileName: prompt.promptKey };
        });
      })
    );

    this.currentConversation$.pipe(takeUntil(this.destroy$)).subscribe(async conversation => {
      this.currentConversation = conversation;
      if (conversation && conversation.Id) {
        this.conversationId = conversation.Id;
        await this.signalrService.joinConversationGroup(this.conversationId);
      } else {
        this.conversationId = null;
      }
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.isLoggedIn = !!user;
      if (this.isLoggedIn) {
        this.signalrService.startConnection();
        this.aiChatService.getMyPrompts();
        this.aiChatService.getMyConversations();
      }
    });

    this.state.documents$.pipe(takeUntil(this.destroy$)).subscribe(documents => this.documents = documents);

    this.selectedPrompts$.pipe(takeUntil(this.destroy$)).subscribe(selectedPrompts => {
      this.prompts$.pipe(take(1)).subscribe(allPrompts => {
        this.promptSelectionState = allPrompts.reduce((acc, prompt) => {
          acc[prompt.promptKey] = selectedPrompts.includes(prompt.promptKey);
          return acc;
        }, {} as { [key: string]: boolean });
      });
    });

    this.messages$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.scrollToBottom();
    });
  }

   ngOnDestroy(): void {
    this.signalrService.stopConnection();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private scrollToBottom(behavior: 'auto' | 'smooth' = 'auto'): void {
    setTimeout(() => {
      try {
        if (this.messageContainer && this.messageContainer.nativeElement) {
          this.messageContainer.nativeElement.scrollTo({
            top: this.messageContainer.nativeElement.scrollHeight,
            behavior: behavior,
          });
        }
      } catch (err) {
        console.error('Error scrolling to bottom:', err);
      }
    }, 0);
  }

  closeChat(): void {
    this.state.setIsChatOpen(false);
  }

  sendMessage(): void {
    if (this.isSendDisabled) {
      return;
    }

    const messageToSend = this.newMessageContent;
    const currentConversationId = this.state.getCurrentConversationId();
    this.selectedPrompts$.pipe(take(1)).subscribe(selectedPrompts => {
      if (currentConversationId) {
        this.aiChatService.sendMessage(currentConversationId, messageToSend, this.files, selectedPrompts);
      } else {
        this.aiChatService.startConversation(messageToSend, selectedPrompts.length > 0 ? selectedPrompts[0] : null, this.files)
          .subscribe(newConversation => {
            if (newConversation) {
              this.state.addConversation(newConversation);
              this.state.setActiveConversationId(newConversation.Id);
              this.state.setMessages(newConversation.messages ?? []);
            }
          });
      }
    });

    this.newMessageContent = '';
    this.files = [];
    this.state.setSelectedPrompts([]);
    this.isPromptsPopupVisible = false;
    this.scrollToBottom('smooth');
  }

  onAttachFile(): void {
    this.fileUploadService.openUploadOptionsDialog().subscribe(result => {
      if (result === 'files') {
        this.fileInput.nativeElement.click();
      } else if (result === 'folder') {
        this.folderInput.nativeElement.click();
      }
    });
  }

 onFileSelected(event: any): void {
   const files = event.target.files;
   if (files.length > 0) {
     this.files = Array.from(files);
     this.uploadFiles(this.files);
   }
 }

 private uploadFiles(files: File[]): void {
   this.isUploading = true;
   this.progress = 0;

   this.currentConversation$.pipe(take(1)).subscribe(conversation => {
     if (conversation && conversation.Id) {
       // The upload service uses conversation.Id for both the sessionId and the conversationId parameter.
       // - sessionId is required for all uploads to track the session.
       // - conversationId routes the request to the new chat-specific endpoint.
       this.fileUploadService.uploadFiles(files, conversation.Id, conversation.Id).subscribe({
         next: (uploadProgress) => {
           this.progress = uploadProgress.progress;
           this.isUploading = uploadProgress.isUploading;
           if (!uploadProgress.isUploading && uploadProgress.files) {
             this.uploadedFileInfos = [...this.uploadedFileInfos, ...uploadProgress.files];
             this.snackBar.open('Files uploaded successfully!', 'Close', { duration: 3000 });
             this.files = [];
           }
         },
         error: (error) => {
           this.isUploading = false;
           this.snackBar.open('File upload failed. Please try again.', 'Close', { duration: 3000 });
           console.error('Upload error:', error);
         }
       });
     } else {
       this.isUploading = false;
       this.snackBar.open('Cannot upload files: no active conversation.', 'Close', { duration: 3000 });
     }
   });
 }

  getDisplayContent(content: string, role: 'user' | 'model'): string {
      return this.aiChatService.getDisplayContent(content, role);
  }

  goToFullScreen(): void {
    this.router.navigate(['/ai-chat']);
    this.state.setIsChatOpen(false);
  }

  togglePromptsPopup(): void {
    this.isPromptsPopupVisible = !this.isPromptsPopupVisible;
    this.cdRef.detectChanges();
  }

  confirmPrompts(): void {
    this.isPromptsPopupVisible = false;
    // The selected prompts are already in selectedPromptKeys, so we just need to close the popup.
    // The UI will update based on the selectedPromptKeys array.
  }

  togglePromptSelection(promptKey: string): void {
    this.selectedPrompts$.pipe(take(1)).subscribe(currentPrompts => {
      const newPrompts = currentPrompts.includes(promptKey)
        ? currentPrompts.filter(p => p !== promptKey)
        : [...currentPrompts, promptKey];
      this.state.setSelectedPrompts(newPrompts);
    });
  }
 getUploadedFileNames(): string {
     return this.fileUploadService.getUploadedFileNames(this.uploadedFileInfos);
 }

 viewUploadedFiles(): void {
     this.state.documents$.pipe(take(1)).subscribe(documents => {
         this.fileUploadService.viewUploadedFiles(documents);
     });
 }
  toggleHistory(): void {
    this.isHistoryVisible = !this.isHistoryVisible;
  }

  async loadConversation(conversationId: string): Promise<void> {
    this.aiChatService.getConversation(conversationId);
    this.isHistoryVisible = false;
    await this.signalrService.joinConversationGroup(conversationId);
    this.scrollToBottom('auto');
   }

  public get sortIcon(): string {
    return this.sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  public sortConversations(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.state.sortConversations(this.sortOrder);
  }

  startNewConversation(): void {
    this.newMessageContent = '';
    this.state.setSelectedPrompts([]);
    this.state.setActiveConversationId(null);
    this.state.setMessages([]);
    this.aiChatService.getMyPrompts();
  }

  retryMessage(message: ChatMessage): void {
    this.state.deleteMessage(message.Id);
    if (message.ConversationId) {
      this.aiChatService.sendMessage(message.ConversationId, message.Content, []);
    } else {
      this.aiChatService.startConversation(message.Content, null, [])
        .subscribe(newConversation => {
          if (newConversation) {
            this.state.addConversation(newConversation);
            this.state.setActiveConversationId(newConversation.Id);
            this.state.setMessages(newConversation.messages ?? []);
          }
        });
    }
  }
}
