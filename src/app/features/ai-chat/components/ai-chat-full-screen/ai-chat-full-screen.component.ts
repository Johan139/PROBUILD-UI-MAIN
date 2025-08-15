import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
 public fullBlueprintAnalysisPromptKey = 'SYSTEM_COMPREHENSIVE_ANALYSIS';

 public get isSendDisabled(): boolean {
   let selectedPrompts: string[] = [];
   this.selectedPrompts$.pipe(take(1)).subscribe(prompts => selectedPrompts = prompts);

   const hasText = this.newMessageContent.trim().length > 0;
   const hasFiles = this.files.length > 0;
   const hasPrompts = selectedPrompts.length > 0;

   if (hasText) {
     return false; // Always enable if there is text
   }

   if (hasFiles && hasPrompts) {
     return false; // Enable if there are files and prompts
   }

   return true; // Disable in all other cases
 }

  constructor(
    private aiChatStateService: AiChatStateService,
    private aiChatService: AiChatService,
    private route: ActivatedRoute,
    private router: Router,
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

  ngOnInit(): void {
    this.signalrService.startConnection();
    console.log('AiChatFullScreenComponent initialized');
    this.aiChatService.getMyConversations();
    this.aiChatService.getMyPrompts();
    this.setupConversationSelection();

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

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const conversationId = params['conversationId'];
      if (conversationId === 'new') {
        this.startNewConversation();
      } else if (conversationId) {
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
            await this.signalrService.joinConversationGroup(conversationId);
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
              this.router.navigate(['/ai-chat', newConversation.Id]);
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

   const uploadAction = (convId: string) => {
     this.fileUploadService.uploadFiles(files, convId, convId).subscribe({
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
   };

   this.currentConversation$.pipe(take(1)).subscribe(conversation => {
     if (conversation && conversation.Id) {
       uploadAction(conversation.Id);
     } else {
       this.aiChatService.createConversation().subscribe(newConversation => {
         if (newConversation && newConversation.Id) {
           this.aiChatStateService.addConversation(newConversation);
           this.aiChatStateService.setActiveConversationId(newConversation.Id);
           this.aiChatStateService.setMessages(newConversation.messages ?? []);
           uploadAction(newConversation.Id);
         } else {
           this.isUploading = false;
           this.snackBar.open('Could not start a new conversation to upload files.', 'Close', { duration: 3000 });
         }
       });
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

 togglePromptsPopup(): void {
   console.log('togglePromptsPopup called. Current visibility:', this.isPromptsPopupVisible);
   this.isPromptsPopupVisible = !this.isPromptsPopupVisible;
   console.log('New visibility:', this.isPromptsPopupVisible);
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

 confirmPrompts(): void {
   this.isPromptsPopupVisible = false;
 }

  togglePromptSelection(promptKey: string): void {
    console.log(`Toggling selection for prompt: ${promptKey}`);
    console.log(`State BEFORE toggle:`, JSON.stringify(this.promptSelectionState));
    this.selectedPrompts$.pipe(take(1)).subscribe(currentPrompts => {
      console.log(`State AFTER toggle for ${promptKey}:`, this.promptSelectionState[promptKey]);
      console.log(`Full state object AFTER toggle:`, JSON.stringify(this.promptSelectionState));
      const isSelected = currentPrompts.includes(promptKey);
      let newPrompts: string[];

      if (promptKey === this.fullBlueprintAnalysisPromptKey) {
        newPrompts = isSelected ? [] : [this.fullBlueprintAnalysisPromptKey];
      } else {
        if (isSelected) {
          newPrompts = currentPrompts.filter(p => p !== promptKey);
        } else {
          newPrompts = [...currentPrompts.filter(p => p !== this.fullBlueprintAnalysisPromptKey), promptKey];
        }
      }
      this.aiChatStateService.setSelectedPrompts(newPrompts);
      console.log(`Updated selectedPrompts array:`, newPrompts);
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


