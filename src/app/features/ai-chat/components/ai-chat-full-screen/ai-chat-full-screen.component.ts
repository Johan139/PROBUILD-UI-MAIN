import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, HostListener, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AiChatService } from '../../services/ai-chat.service';
import { SignalrService } from '../../services/signalr.service';
import { FileUploadService } from '../../../../services/file-upload.service';
import { Observable, combineLatest, Subject, ReplaySubject, of, from, BehaviorSubject } from 'rxjs';
import { map, take, takeUntil, tap, switchMap } from 'rxjs/operators';
import { Conversation, ChatMessage, Prompt } from '../../models/ai-chat.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MarkdownModule } from 'ngx-markdown';
import { Location as AngularLocation } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UploadedFileInfo } from '../../../../services/file-upload.service';
import { JobDocument } from '../../../../models/JobDocument';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { SelectedPromptsPipe } from '../../pipes/selected-prompts.pipe';

@Component({
  selector: 'app-ai-chat-full-screen',
  templateUrl: './ai-chat-full-screen.component.html',
  styleUrls: ['./ai-chat-full-screen.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule, MatIconModule, MatTooltipModule, MatProgressBarModule, MatButtonModule, SelectedPromptsPipe]
})
export class AiChatFullScreenComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('folderInput') folderInput!: ElementRef<HTMLInputElement>;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  
  private destroy$ = new Subject<void>();
  private promptsSource = new ReplaySubject<Prompt[]>(1);
  conversationId: string | null = null;
  @ViewChild('promptsPopup') promptsPopup!: ElementRef;
  private selectConversation$ = new Subject<string>();
  conversations$: Observable<Conversation[]>;
combinedMessages$!: Observable<ChatMessage[]>;
  messages$: Observable<ChatMessage[]>;
  currentConversation$: Observable<Conversation | null>;

  prompts$ = this.promptsSource.asObservable();
  selectedPrompts$: Observable<number[]>;
  hasDocuments$: Observable<boolean> = of(false);


public streamingMessages: Map<string, string> = new Map();
  newMessageContent = '';
streamingMessagesSubject = new BehaviorSubject<Map<string, string>>(new Map());
streamingMessages$ = this.streamingMessagesSubject.asObservable();

// ✅ Add here:
isLoading$!: Observable<boolean>;
isResponding$!: Observable<boolean>;


  files: File[] = [];
  uploadedFileInfos: UploadedFileInfo[] = [];
  isUploading = false;
  progress = 0;
  editingConversationId: string | null = null;
  editedTitle = '';
  
  public isPromptsPopupVisible = false;
  public documents: JobDocument[] = [];
  public sortOrder: 'asc' | 'desc' = 'desc';
  public promptSelectionState: { [key: number]: boolean } = {};
  public fullBlueprintAnalysisPromptId: number | null = null;
  private fullBlueprintAnalysisPromptKey = 'SYSTEM_COMPREHENSIVE_ANALYSIS';

  public get isSendDisabled(): boolean {
    let selectedPrompts: number[] = [];
    this.selectedPrompts$.pipe(take(1)).subscribe(prompts => selectedPrompts = prompts);
    let hasDocuments = false;
    this.hasDocuments$.pipe(take(1)).subscribe(docs => hasDocuments = docs);

    const hasText = this.newMessageContent.trim().length > 0;
    const hasFiles = this.files.length > 0;
    const hasPrompts = selectedPrompts.length > 0;

    if (hasText) {
      return false; // Always enable if there is text
    }

    if ((hasFiles || hasDocuments) && hasPrompts) {
      return false; // Enable if there are files (new or existing) and prompts
    }

    return true; // Disable in all other cases
  }

   public get isInputDisabled(): boolean {
      let selectedPrompts: number[] = [];
      this.selectedPrompts$.pipe(take(1)).subscribe(prompts => selectedPrompts = prompts);
      return selectedPrompts.length > 0;
  }

  constructor(
    private aiChatStateService: AiChatStateService,
    private aiChatService: AiChatService,
    private route: ActivatedRoute,
     private ngZone: NgZone,
    private router: Router,
       private location: AngularLocation,
    private fileUploadService: FileUploadService,
    private snackBar: MatSnackBar,
    private cdRef: ChangeDetectorRef,
    private signalrService: SignalrService
  ) {
    this.conversations$ = this.aiChatStateService.conversations$;
    
  this.isLoading$ = this.aiChatStateService.isLoading$;

this.isResponding$ = combineLatest([
  this.isLoading$,
  this.streamingMessages$.pipe(map(() => this.currentStreamingMessage.trim().length > 0))
]).pipe(
  map(([isLoading, isStreaming]) => isLoading || isStreaming)
);
    
    this.messages$ = this.aiChatStateService.messages$;
    this.selectedPrompts$ = this.aiChatStateService.selectedPrompts$;
    this.aiChatStateService.prompts$.pipe(
      takeUntil(this.destroy$),
      tap(prompts => {
        this.promptsSource.next(prompts);
      })
    ).subscribe();

    this.currentConversation$ = combineLatest([
      this.aiChatStateService.conversations$,
      this.aiChatStateService.activeConversationId$
    ]).pipe(
      map(([conversations, activeId]) => conversations.find(c => c.Id === activeId) || null)
    );

  }

  async ngOnInit(): Promise<void> {
    this.hasDocuments$ = this.aiChatStateService.documents$.pipe(
      map(documents => documents.length > 0)
    );
await this.signalrService.startConnection();

this.combinedMessages$ = combineLatest([
  this.messages$,
  this.streamingMessages$.pipe(map(() => this.currentStreamingMessage))
]).pipe(
  map(([messages, stream]) => {
    const result: ChatMessage[] = [...messages];

    if (stream?.trim()) {
      const streamMsg: ChatMessage = {
        Id: -1,
        ConversationId: this.conversationId ?? '',
        Role: 'model',
        Content: stream,
        IsSummarized: false,
        Timestamp: new Date()
      };
      result.push(streamMsg);
    }

    // ✅ Sort by timestamp to ensure proper order
    return result.sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
  })
);


this.signalrService.onReceiveStreamChunk((cid: string, chunk: string) => {
    console.log('[chunk]', { cid, chunk });
  this.ngZone.run(() => {
    // 👉 Adopt the stream's conversation id for the very first message
    if (!this.conversationId) {
      this.conversationId = cid;
    }

if (!this.streamingMessages.has(cid)) {
  // 👇 Clear or initialize only on the first chunk
  this.streamingMessages.set(cid, '');
}

const current = this.streamingMessages.get(cid)!;
this.streamingMessages.set(cid, current + chunk);
this.streamingMessagesSubject.next(new Map(this.streamingMessages));

    // Only trigger UI update for the active one
    if (cid === this.conversationId) {
      this.cdRef.detectChanges();
      this.scrollToBottom('auto');
    }
  });
});


let alreadyEndedFor: Set<string> = new Set();

this.signalrService.onStreamEnd((cid: string) => {
  if (alreadyEndedFor.has(cid)) return;
  alreadyEndedFor.add(cid);
  console.log('[streamEnd]', { cid, current: this.conversationId });
  this.ngZone.run(() => {
    // 👉 Ensure we’re pointing at this stream if it's the first one
    if (!this.conversationId) {
      this.conversationId = cid;
    }

    if (cid === this.conversationId) {
      const message = this.streamingMessages.get(cid) || '';
      if (message.trim().length) {
        this.aiChatStateService.pushFinalStreamedMessage(message);
      }
      this.streamingMessages.delete(cid);
this.streamingMessagesSubject.next(new Map(this.streamingMessages));

     this.streamingMessages.delete(cid);
this.streamingMessagesSubject.next(new Map(this.streamingMessages));

      this.cdRef.detectChanges();
      this.scrollToBottom('auto');
    }
  });
});


this.aiChatService.getMyConversations();
    this.aiChatService.getMyPrompts();
    this.setupConversationSelection();

    this.prompts$.pipe(
      takeUntil(this.destroy$),
      switchMap(allPrompts => {
        return this.selectedPrompts$.pipe(
          map(selectedPrompts => ({ allPrompts, selectedPrompts }))
        );
      })
    ).subscribe(({ allPrompts, selectedPrompts }) => {
      const fullBlueprintPrompt = allPrompts.find(p => p.promptKey === this.fullBlueprintAnalysisPromptKey);
      if (fullBlueprintPrompt) {
        this.fullBlueprintAnalysisPromptId = fullBlueprintPrompt.id;
      }

      this.promptSelectionState = allPrompts.reduce((acc, prompt) => {
        acc[prompt.id] = selectedPrompts.includes(prompt.id);
        return acc;
      }, {} as { [key: number]: boolean });
    });

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const conversationId = params['conversationId'];
      if (conversationId === 'new') {
        this.startNewConversation();
      } else if (conversationId) {
        this.selectConversation(conversationId);
      }
    });
    this.aiChatStateService.documents$.pipe(takeUntil(this.destroy$)).subscribe(documents => this.documents = documents);

this.aiChatStateService.currentConversation$
  .pipe(takeUntil(this.destroy$))
  .subscribe(async conversation => {
    if (conversation && conversation.Id) {
      this.conversationId = conversation.Id;
      await this.signalrService.joinConversationGroup(this.conversationId);

      // 👇 trigger a render in case chunks were buffered before ID existed
      this.cdRef.detectChanges();
      this.scrollToBottom('auto');
    } else {
      this.conversationId = null;
    }
});

    this.messages$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.scrollToBottom();
    });
  }

  ngOnDestroy(): void {
  const conversationId = this.aiChatStateService.getCurrentConversationId()?? "";
  //this.signalrService.leaveConversationGroup(conversationId);

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

  selectConversation(conversationId: string): void {
    this.router.navigate(['/ai-chat', conversationId]);
    this.selectConversation$.next(conversationId);
  }

  private setupConversationSelection(): void {
    this.selectConversation$.pipe(
      tap(conversationId => {
        this.aiChatStateService.setActiveConversationId(conversationId);
        this.scrollToBottom('auto');
      }),
      switchMap(conversationId =>
        this.aiChatService.getConversation(conversationId).pipe(
          tap(async () => {
           // await this.signalrService.joinConversationGroup(conversationId);
          })
        )
      ),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  public get sortIcon(): string {
    return this.sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  public sortConversations(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.aiChatStateService.sortConversations(this.sortOrder);
  }

  startNewConversation(): void {
    this.router.navigate(['/ai-chat', 'new']);
    this.newMessageContent = '';
    this.aiChatStateService.setActiveConversationId(null);
    this.aiChatStateService.setMessages([]);
    this.aiChatStateService.setDocuments([]);
    this.aiChatService.getMyPrompts();
    this.aiChatStateService.setLoading(false);
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
get currentStreamingMessage(): string {
  const id = this.conversationId ?? '';
  const direct = this.streamingMessages.get(id);
  if (direct && direct.length) return direct;

  // Fallback: first/new chat before conversationId is set.
  if (!this.conversationId && this.streamingMessages.size > 0) {
    // Show the most recently inserted stream buffer
    const last = Array.from(this.streamingMessages.values()).pop();
    return last ?? '';
  }
  return '';
}
  sendMessage(): void {

      const currentStream = this.currentStreamingMessage.trim();
  if (currentStream.length > 0) {
    this.aiChatStateService.pushFinalStreamedMessage(currentStream);
    const cid = this.conversationId ?? '';
    this.streamingMessages.delete(cid);
    this.streamingMessagesSubject.next(new Map(this.streamingMessages));
    this.cdRef.detectChanges();
  }

  if (this.isSendDisabled) {
    return;
  }

  this.cdRef.detectChanges();

  const hasText = this.newMessageContent.trim().length > 0;
  if (!hasText && this.files.length === 0 && this.documents.length === 0) {
    this.selectedPrompts$.pipe(take(1)).subscribe(prompts => {
      if (prompts.length === 0) {
        this.snackBar.open('Please type a message, upload a file, or select a prompt.', 'Close', { duration: 3000 });
        return;
      }
    });
  }

  const messageToSend = this.newMessageContent;
this.conversationId = this.aiChatStateService.getCurrentConversationId();
const currentConversationId = this.conversationId;

  this.selectedPrompts$.pipe(take(1)).subscribe(selectedPrompts => {
    this.prompts$.pipe(take(1)).subscribe(allPrompts => {
      const selectedPromptKeys = selectedPrompts
        .map(id => allPrompts.find(p => p.id === id)?.promptKey)
        .filter((key): key is string => !!key);

      if (currentConversationId) {
  const documentUrls = this.documents.map(doc => doc.blobUrl);


  this.aiChatService.sendMessage(currentConversationId, messageToSend, this.files, selectedPromptKeys, documentUrls);
  this.router.navigate(['/ai-chat', currentConversationId]);
} else {
        // Create new conversation and join group before sending message
this.aiChatService.startConversation(
  messageToSend,
  selectedPromptKeys.length > 0 ? selectedPromptKeys[0] : null,
  this.files,
  selectedPromptKeys
).subscribe(async newConversation => {
  if (newConversation) {
    this.conversationId = newConversation.Id;

    await this.signalrService.joinConversationGroup(this.conversationId);

    // ✅ Instead of adding only 1, refresh the entire list
    this.aiChatService.getMyConversations(); // ⬅️ This will reload titles too

    this.aiChatStateService.setMessages(newConversation.messages ?? []);

    this.location.replaceState(`/ai-chat/${newConversation.Id}`);
    this.selectConversation(newConversation.Id);

    this.cdRef.detectChanges();
    this.scrollToBottom();
  }
});
      }
    });
  });

  this.newMessageContent = '';
  this.files = [];
  this.aiChatStateService.setSelectedPrompts([]);
  this.isPromptsPopupVisible = false;
  this.scrollToBottom();
}

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
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

   const uploadAction = (convId: string) => {
     this.fileUploadService.uploadFiles(files, convId, convId).subscribe({
       next: (uploadProgress) => {
         this.progress = uploadProgress.progress;
         this.isUploading = uploadProgress.isUploading;
         if (!uploadProgress.isUploading && uploadProgress.files) {
           this.uploadedFileInfos = [...this.uploadedFileInfos, ...uploadProgress.files];
           this.snackBar.open('Files uploaded successfully!', 'Close', { duration: 3000 });
           const id = this.aiChatStateService.getCurrentConversationId();
           if (id) {
             this.aiChatService.getConversationDocuments(id).subscribe(documents => {
               this.documents = documents;
               this.aiChatStateService.setDocuments(documents);
               this.cdRef.detectChanges();
             });
           }
         }
       },
       error: (error) => {
         this.isUploading = false;
         this.snackBar.open('File upload failed. Please try again.', 'Close', { duration: 3000 });
         console.error('Upload error:', error);
       }
     });
   };

   const currentConversationId = this.aiChatStateService.getCurrentConversationId();
   if (currentConversationId) {
     uploadAction(currentConversationId);
   } else {
     this.aiChatService.createConversation().subscribe(newConversation => {
       if (newConversation && newConversation.Id) {
         this.aiChatStateService.addConversation(newConversation);
         this.router.navigate(['/ai-chat', newConversation.Id]);
         this.aiChatStateService.setActiveConversationId(newConversation.Id);
         this.aiChatStateService.setMessages(newConversation.messages ?? []);
         this.conversationId = newConversation.Id;
         uploadAction(newConversation.Id);
       } else {
         this.isUploading = false;
         this.snackBar.open('Could not start a new conversation to upload files.', 'Close', { duration: 3000 });
       }
     });
   }
  }

  logDisplayName(prompt: any): boolean {
    return true;
  }

  getUploadedFileNames(): string {
      return this.fileUploadService.getUploadedFileNames(this.uploadedFileInfos);
  }

  viewUploadedFiles(): void {
     if (this.conversationId) {
       this.aiChatService.getConversationDocuments(this.conversationId).subscribe(documents => {
         this.fileUploadService.viewUploadedFiles(documents);
       });
     } else {
       this.fileUploadService.viewUploadedFiles(this.documents);
     }
  }

  startEditing(conversation: Conversation): void {
    this.editingConversationId = conversation.Id;
    this.editedTitle = conversation.Title;
  }
public get isStreaming(): boolean {
  return this.currentStreamingMessage.trim().length > 0;
}

  saveTitle(): void {
    if (!this.editingConversationId) return;

    const trimmedTitle = this.editedTitle ? this.editedTitle.trim() : '';

    if (trimmedTitle.length === 0) {
      this.snackBar.open('Title cannot be empty.', 'Close', { duration: 3000 });
      return;
    }

    this.editedTitle = trimmedTitle;

    const originalConversation = this.aiChatStateService.getConversationById(this.editingConversationId);
    if (originalConversation && originalConversation.Title === this.editedTitle) {
      this.cancelEditing();
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

  onTitleInput(): void {
    let currentTitle = this.editedTitle;
    let correctedTitle = currentTitle;
    let warningMessage = '';

    if (correctedTitle.length > 50) {
      correctedTitle = correctedTitle.substring(0, 50);
      warningMessage = 'Title cannot exceed 50 characters.';
    }

    const invalidCharRegex = /[^a-zA-Z0-9\s]/g;
    if (invalidCharRegex.test(correctedTitle)) {
      correctedTitle = correctedTitle.replace(invalidCharRegex, '');
      warningMessage = 'Title can only contain letters, numbers, and spaces.';
    }

    if (warningMessage) {
      this.snackBar.open(warningMessage, 'Close', { duration: 3000 });
    }

    if (this.editedTitle !== correctedTitle) {
      this.editedTitle = correctedTitle;
    }
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  togglePromptsPopup(): void {
    this.isPromptsPopupVisible = !this.isPromptsPopupVisible;
    this.cdRef.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isPromptsPopupVisible && this.promptsPopup && !this.promptsPopup.nativeElement.contains(event.target)) {
      const targetElement = event.target as HTMLElement;
      if (!targetElement.closest('.more-options-btn')) {
        this.isPromptsPopupVisible = false;
      }
    }
  }



    togglePromptSelection(promptId: number): void {
      this.prompts$.pipe(take(1)).subscribe(allPrompts => {
        const selectedPrompt = allPrompts.find(p => p.id === promptId);
        if (!selectedPrompt) return;

        const fullBlueprintPrompt = allPrompts.find(p => p.promptKey === this.fullBlueprintAnalysisPromptKey);

        this.selectedPrompts$.pipe(take(1)).subscribe(currentPromptIds => {
          const isSelected = currentPromptIds.includes(promptId);
          let newPromptIds: number[];

          if (selectedPrompt.promptKey === this.fullBlueprintAnalysisPromptKey) {
            newPromptIds = isSelected ? [] : [promptId];
          } else {
            if (isSelected) {
              newPromptIds = currentPromptIds.filter(id => id !== promptId);
            } else {
              let filteredIds = currentPromptIds;
              if (fullBlueprintPrompt) {
                filteredIds = filteredIds.filter(id => id !== fullBlueprintPrompt.id);
              }
              newPromptIds = [...filteredIds, promptId];
            }
          }
          this.aiChatStateService.setSelectedPrompts(newPromptIds);
        });
      });
    }

    clearPrompts(): void {
      this.aiChatStateService.setSelectedPrompts([]);
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


