import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AiChatService } from '../../services/ai-chat.service';
import { SignalrService } from '../../services/signalr.service';
import { FileUploadService } from '../../../../services/file-upload.service';
import { Observable, combineLatest, Subject, ReplaySubject } from 'rxjs';
import { map, take, takeUntil, tap, switchMap } from 'rxjs/operators';
import { Conversation, ChatMessage, Prompt } from '../../models/ai-chat.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MarkdownModule } from 'ngx-markdown';
import promptMapping from '../../assets/prompt_mapping.json';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UploadedFileInfo } from '../../../../services/file-upload.service';
import { JobDocument } from '../../../../models/JobDocument';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-ai-chat-full-screen',
  templateUrl: './ai-chat-full-screen.component.html',
  styleUrls: ['./ai-chat-full-screen.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule, MatIconModule, MatTooltipModule, MatProgressBarModule, MatButtonModule]
})
export class AiChatFullScreenComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('folderInput') folderInput!: ElementRef<HTMLInputElement>;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private promptsSource = new ReplaySubject<(Prompt & { displayName: string; description: string; promptFileName: string; })[]>(1);
  conversationId: string | null = null;

  conversations$: Observable<Conversation[]>;
  messages$: Observable<ChatMessage[]>;
  currentConversation$: Observable<Conversation | null>;
  isLoading$: Observable<boolean>;
  prompts$ = this.promptsSource.asObservable();
  selectedPrompts$: Observable<string[]>;

   newMessageContent = '';
 files: File[] = [];
 uploadedFileInfos: UploadedFileInfo[] = [];
 isUploading = false;
 progress = 0;
 editingConversationId: string | null = null;
 editedTitle = '';
 public isPromptsPopupVisible = false;
 public documents: JobDocument[] = [];
 public sortOrder: 'asc' | 'desc' = 'desc';
 public promptSelectionState: { [key: string]: boolean } = {};

 public get isSendDisabled(): boolean {
  let selectedPrompts: string[] = [];
  this.selectedPrompts$.pipe(take(1)).subscribe(prompts => selectedPrompts = prompts);
  if (selectedPrompts.length > 0) {
    return false;
  }
  return !this.newMessageContent.trim() && this.files.length === 0;
 }

  constructor(
    private aiChatStateService: AiChatStateService,
    private aiChatService: AiChatService,
    private route: ActivatedRoute,
    private fileUploadService: FileUploadService,
    private snackBar: MatSnackBar,
    private cdRef: ChangeDetectorRef,
    private signalrService: SignalrService
  ) {
    this.conversations$ = this.aiChatStateService.conversations$;
    this.messages$ = this.aiChatStateService.messages$;
    this.isLoading$ = this.aiChatStateService.isLoading$;
    this.selectedPrompts$ = this.aiChatStateService.selectedPrompts$;
    this.aiChatStateService.prompts$.pipe(
      takeUntil(this.destroy$),
      map(prompts => {
        const mappingData: { tradeName: string, promptFileName: string, displayName: string, description: string }[] = promptMapping;
        return prompts.map(prompt => {
          const match = mappingData.find(m => m.promptFileName === prompt.promptKey);
          if (!match) {
            console.log('Unmatched prompt:', prompt);
          }
          const displayName = match ? match.displayName : prompt.promptName;
          const description = match ? match.description : '';
          return { ...prompt, displayName, description, promptFileName: prompt.promptKey };
        });
      }),
      tap(mappedPrompts => {
        console.log('Mapped prompts:', mappedPrompts);
        this.promptsSource.next(mappedPrompts);
      })
    ).subscribe();

    this.currentConversation$ = combineLatest([
      this.aiChatStateService.conversations$,
      this.aiChatStateService.activeConversationId$
    ]).pipe(
      map(([conversations, activeId]) => conversations.find(c => c.Id === activeId) || null)
    );
  }

  ngOnInit(): void {
    this.signalrService.startConnection();
    console.log('AiChatFullScreenComponent initialized');
    this.aiChatService.getMyConversations();
    this.aiChatService.getMyPrompts();

    this.prompts$.pipe(
      takeUntil(this.destroy$),
      switchMap(allPrompts => {
        console.log('Prompts received, initializing selection state:', allPrompts);
        return this.selectedPrompts$.pipe(
          map(selectedPrompts => ({ allPrompts, selectedPrompts }))
        );
      })
    ).subscribe(({ allPrompts, selectedPrompts }) => {
      this.promptSelectionState = allPrompts.reduce((acc, prompt) => {
        acc[prompt.promptKey] = selectedPrompts.includes(prompt.promptKey);
        return acc;
      }, {} as { [key: string]: boolean });
      console.log('Initial promptSelectionState:', this.promptSelectionState);
    });

    this.route.params.subscribe(params => {
      const conversationId = params['conversationId'];
      if (conversationId) {
        this.selectConversation(conversationId);
      }
    });
    this.aiChatStateService.documents$.pipe(takeUntil(this.destroy$)).subscribe(documents => this.documents = documents);

    this.aiChatStateService.currentConversation$.pipe(takeUntil(this.destroy$)).subscribe(async conversation => {
      if (conversation && conversation.Id) {
        this.conversationId = conversation.Id;
        await this.signalrService.joinConversationGroup(this.conversationId);
      } else {
        this.conversationId = null;
      }
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
        this.messageContainer.nativeElement.scrollTo({
          top: this.messageContainer.nativeElement.scrollHeight,
          behavior: behavior
        });
      } catch (err) { }
    }, 0);
  }

  async selectConversation(conversationId: string): Promise<void> {
    this.aiChatStateService.setActiveConversationId(conversationId);
    this.aiChatService.getConversation(conversationId);
    await this.signalrService.joinConversationGroup(conversationId);
    this.scrollToBottom('auto');
  }

  public get sortIcon(): string {
    return this.sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  public sortConversations(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.aiChatStateService.sortConversations(this.sortOrder);
  }

  startNewConversation(): void {
    this.newMessageContent = '';
    this.aiChatStateService.setActiveConversationId(null);
    this.aiChatStateService.setMessages([]);
    this.aiChatService.getMyPrompts();
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

  sendMessage(): void {
    if (this.isSendDisabled) {
      return;
    }

    const messageToSend = this.newMessageContent;
    const currentConversationId = this.aiChatStateService.getCurrentConversationId();
    this.selectedPrompts$.pipe(take(1)).subscribe(selectedPrompts => {
      if (currentConversationId) {
        this.aiChatService.sendMessage(currentConversationId, messageToSend, this.files, selectedPrompts);
      } else {
        this.aiChatService.startConversation(messageToSend, selectedPrompts.length > 0 ? selectedPrompts[0] : null, this.files)
          .subscribe(newConversation => {
            if (newConversation) {
              this.aiChatStateService.addConversation(newConversation);
              this.aiChatStateService.setActiveConversationId(newConversation.Id);
              this.aiChatStateService.setMessages(newConversation.messages ?? []);
            }
          });
      }
    });

    this.newMessageContent = '';
    this.files = [];
    this.aiChatStateService.setSelectedPrompts([]);
    this.isPromptsPopupVisible = false;
    this.scrollToBottom();
  }

  getDisplayContent(content: string, role: 'user' | 'model'): string {
      return this.aiChatService.getDisplayContent(content, role);
  }

 onFileSelected(event: any, type?: 'renovation' | 'subcontractor' | 'vendor'): void {
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

  logDisplayName(prompt: any): boolean {
    console.log('Rendering prompt:', prompt.displayName);
    return true;
  }

 getUploadedFileNames(): string {
     return this.fileUploadService.getUploadedFileNames(this.uploadedFileInfos);
 }

 viewUploadedFiles(): void {
     this.aiChatStateService.documents$.pipe(take(1)).subscribe(documents => {
         this.fileUploadService.viewUploadedFiles(documents);
     });
 }

 startEditing(conversation: Conversation): void {
   this.editingConversationId = conversation.Id;
   this.editedTitle = conversation.Title;
 }

 saveTitle(): void {
   if (!this.editingConversationId) return;

   if (this.editedTitle.length > 255) {
     this.snackBar.open('Title cannot exceed 255 characters.', 'Close', { duration: 3000 });
     return;
   }

   this.aiChatService.updateConversationTitle(this.editingConversationId, this.editedTitle).subscribe({
     next: () => {
       this.aiChatStateService.updateConversationTitle(this.editingConversationId!, this.editedTitle);
       this.cancelEditing();
     },
     error: (error) => {
       console.error('Error updating title:', error);
       this.snackBar.open('Failed to update title. Please try again.', 'Close', { duration: 3000 });
     }
   });
 }

 cancelEditing(): void {
   this.editingConversationId = null;
   this.editedTitle = '';
 }

 togglePromptsPopup(): void {
   console.log('togglePromptsPopup called. Current visibility:', this.isPromptsPopupVisible);
   this.isPromptsPopupVisible = !this.isPromptsPopupVisible;
   console.log('New visibility:', this.isPromptsPopupVisible);
   this.cdRef.detectChanges();
 }

 confirmPrompts(): void {
   this.isPromptsPopupVisible = false;
 }

togglePromptSelection(promptKey: string): void {
    console.log(`Toggling selection for prompt: ${promptKey}`);
  console.log(`State BEFORE toggle:`, JSON.stringify(this.promptSelectionState));
  this.selectedPrompts$.pipe(take(1)).subscribe(currentPrompts => {
      console.log(`State AFTER toggle for ${promptKey}:`, this.promptSelectionState[promptKey]);
  console.log(`Full state object AFTER toggle:`, JSON.stringify(this.promptSelectionState));
    const newPrompts = currentPrompts.includes(promptKey)
      ? currentPrompts.filter(p => p !== promptKey)
      : [...currentPrompts, promptKey];
    this.aiChatStateService.setSelectedPrompts(newPrompts);
      console.log(`Updated selectedPrompts array:`, this.promptSelectionState);
  });
}


 retryMessage(message: ChatMessage): void {
   this.aiChatStateService.deleteMessage(message.Id);
   if (message.ConversationId) {
     this.aiChatService.sendMessage(message.ConversationId, message.Content, []);
   } else {
     this.aiChatService.startConversation(message.Content, null, [])
       .subscribe(newConversation => {
         if (newConversation) {
           this.aiChatStateService.addConversation(newConversation);
           this.aiChatStateService.setActiveConversationId(newConversation.Id);
           this.aiChatStateService.setMessages(newConversation.messages ?? []);
         }
       });
   }
 }
}


