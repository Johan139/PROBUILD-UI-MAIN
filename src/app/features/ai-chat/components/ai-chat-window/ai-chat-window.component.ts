import {
  Component,
  OnDestroy,
  ViewChild,
  ElementRef,
  OnInit,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { Router } from '@angular/router';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AiChatService } from '../../services/ai-chat.service';
import { SignalrService } from '../../services/signalr.service';
import { BehaviorSubject, Observable, Subject, firstValueFrom, of } from 'rxjs';
import { takeUntil, take, map, tap, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage, Conversation, Prompt } from '../../models/ai-chat.models';
import {
  FileUploadService,
  UploadedFileInfo,
} from '../../../../services/file-upload.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownModule } from 'ngx-markdown';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { JobDocument } from '../../../../models/JobDocument';
import { AuthService } from '../../../../authentication/auth.service';
import { SelectedPromptsPipe } from '../../pipes/selected-prompts.pipe';
import { combineLatest } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-ai-chat-window',
  templateUrl: './ai-chat-window.component.html',
  styleUrls: ['./ai-chat-window.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    MarkdownModule,
    MatProgressBarModule,
    MatButtonModule,
    SelectedPromptsPipe,
  ],
})
export class AiChatWindowComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('folderInput') folderInput!: ElementRef<HTMLInputElement>;
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  activeConversationId?: string;
  isChatOpen$: Observable<boolean>;
  messages$: Observable<ChatMessage[]>;
  isLoading$: Observable<boolean>;
  currentConversation$: Observable<Conversation | null>;
  prompts$: Observable<Prompt[]>;
  conversations$: Observable<Conversation[]>;
  selectedPrompts$: Observable<number[]>;
  hasDocuments$: Observable<boolean> = of(false);
  private streamHandlerRegistered = false;
  private streamEndHandlerRegistered = false;
  public isHistoryVisible = false;
  private conversationId: string | null = null;
  private currentConversation: Conversation | null = null;
  private destroy$ = new Subject<void>();
  private selectConversation$ = new Subject<string>();
  private files: File[] = [];
  uploadedFileInfos: UploadedFileInfo[] = [];
  isUploading = false;
  progress = 0;
  public newMessageContent = '';
  public isPromptsPopupVisible = false;
  public promptSelectionState: { [key: number]: boolean } = {};
  public fullBlueprintAnalysisPromptId: number | null = null;
  private fullBlueprintAnalysisPromptKey = 'SYSTEM_COMPREHENSIVE_ANALYSIS';
  public documents: JobDocument[] = [];
  public sortOrder: 'asc' | 'desc' = 'desc';
  public isLoggedIn = false;

  public combinedMessages$!: Observable<ChatMessage[]>;
  public streamingMessages: Map<string, string> = new Map();
  private lastChunkByCid: Map<string, string> = new Map();
  public streamingMessagesSubject = new BehaviorSubject<Map<string, string>>(
    new Map(),
  );
  public streamingMessages$ = this.streamingMessagesSubject.asObservable();
  public get isSendDisabled(): boolean {
    let selectedPrompts: number[] = [];
    this.selectedPrompts$
      .pipe(take(1))
      .subscribe((prompts) => (selectedPrompts = prompts));
    let hasDocuments = false;
    this.hasDocuments$.pipe(take(1)).subscribe((docs) => (hasDocuments = docs));

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
    this.selectedPrompts$
      .pipe(take(1))
      .subscribe((prompts) => (selectedPrompts = prompts));
    return selectedPrompts.length > 0;
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
    private authService: AuthService,
    private ngZone: NgZone,
  ) {
    this.isChatOpen$ = this.state.isChatOpen$;
    this.messages$ = this.state.messages$;
    this.isLoading$ = this.state.isLoading$;
    this.currentConversation$ = this.state.currentConversation$;
    this.conversations$ = this.state.conversations$;
    this.selectedPrompts$ = this.state.selectedPrompts$;

    this.prompts$ = this.state.prompts$;

    this.currentConversation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (conversation) => {
        this.currentConversation = conversation;
        if (conversation && conversation.Id) {
          this.conversationId = conversation.Id;

          await this.signalrService.joinConversationGroup(this.conversationId);

          this.ngZone.run(() => {
            this.clearStreamingMessages();
            this.lastChunkByCid.clear(); // ✅ clear this to avoid "stuck on old stream"
            this.state.setActiveConversationId(conversation.Id);
            this.scrollToBottom('auto');
          });
        } else {
          this.conversationId = null;
        }
      });
  }

  ngOnInit(): void {
    this.hasDocuments$ = this.state.documents$.pipe(
      map((documents) => documents.length > 0),
    );
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.isLoggedIn = !!user;
        if (this.isLoggedIn) {
          this.signalrService.startConnection().then(() => {
            this.registerStreamHandlers(); // ✅ Now the connection is ready
          });

          this.aiChatService.getMyPrompts();
          this.aiChatService.getMyConversations();
          this.setupConversationSelection();
        }
      });

    this.state.documents$
      .pipe(takeUntil(this.destroy$))
      .subscribe((documents) => (this.documents = documents));

    this.selectedPrompts$
      .pipe(takeUntil(this.destroy$))
      .subscribe((selectedPrompts) => {
        this.prompts$.pipe(take(1)).subscribe((allPrompts) => {
          this.promptSelectionState = allPrompts.reduce(
            (acc, prompt) => {
              const fullBlueprintPrompt = allPrompts.find(
                (p) => p.promptKey === this.fullBlueprintAnalysisPromptKey,
              );
              if (fullBlueprintPrompt) {
                this.fullBlueprintAnalysisPromptId = fullBlueprintPrompt.id;
              }
              acc[prompt.id] = selectedPrompts.includes(prompt.id);
              return acc;
            },
            {} as { [key: number]: boolean },
          );
        });
      });

    this.messages$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.scrollToBottom();
    });

    this.combinedMessages$ = combineLatest([
      this.state.messages$,
      this.streamingMessages$,
      this.state.currentConversation$,
    ]).pipe(
      map(([messages, streamMap, convo]) => {
        const fallbackId = this.conversationId ?? ''; // fallback if currentConversation$ hasn't emitted yet
        const cid = convo?.Id ?? fallbackId;
        const stream = streamMap.get(cid) ?? '';
        const result: ChatMessage[] = [...messages];

        if (stream.trim()) {
          const streamMsg: ChatMessage = {
            Id: -1,
            ConversationId: cid,
            Role: 'model',
            Content: stream,
            IsSummarized: false,
            Timestamp: new Date(),
          };
          result.push(streamMsg);
        }

        return result.sort(
          (a, b) =>
            new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime(),
        );
      }),
    );
  }
  get currentStreamingMessage(): string {
    const id = this.conversationId ?? '';
    const direct = this.streamingMessages.get(id);
    if (direct && direct.length) return direct;

    if (!this.conversationId && this.streamingMessages.size > 0) {
      const last = Array.from(this.streamingMessages.values()).pop();
      return last ?? '';
    }

    return '';
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
  private registerStreamHandlers(): void {
    if (!this.streamHandlerRegistered) {
      this.streamHandlerRegistered = true;

      this.signalrService.onReceiveStreamChunk((cid: string, chunk: string) => {
        // console.log('[chunk]', { cid, chunk });

        this.ngZone.run(() => {
          const prev = this.streamingMessages.get(cid) || '';

          // ✅ Prevent duplicate trailing chunk (fixes the problem)
          if (prev.endsWith(chunk)) return;

          const updated = prev + chunk;
          this.streamingMessages.set(cid, updated);
          this.streamingMessagesSubject.next(new Map(this.streamingMessages));

          const activeConversationId = this.state.getCurrentConversationId();
          if (cid === activeConversationId) {
            this.cdRef.detectChanges();
            this.scrollToBottom('auto');
          }
        });
      });
    }

    if (!this.streamEndHandlerRegistered) {
      this.streamEndHandlerRegistered = true;
      let alreadyEndedFor: Set<string> = new Set();

      this.signalrService.onStreamEnd((cid: string) => {
        if (alreadyEndedFor.has(cid)) return;
        alreadyEndedFor.add(cid);
        // console.log('[streamEnd]', { cid, current: this.conversationId });

        this.ngZone.run(() => {
          if (!this.conversationId) {
            this.conversationId = cid;
          }

          if (cid === this.conversationId) {
            const message = this.streamingMessages.get(cid) || '';
            if (message.trim().length) {
              this.state.pushFinalStreamedMessage(message);
            }

            this.streamingMessages.delete(cid);
            this.streamingMessagesSubject.next(new Map(this.streamingMessages));

            this.cdRef.detectChanges();
            this.scrollToBottom('auto');
          }
        });
      });
    }
  }

  sendMessage(): void {
    const currentStream = this.currentStreamingMessage.trim();
    if (currentStream.length > 0) {
      this.state.pushFinalStreamedMessage(currentStream);
      const cid = this.conversationId ?? '';
      this.streamingMessages.delete(cid);
      this.streamingMessagesSubject.next(new Map(this.streamingMessages));
      this.cdRef.detectChanges();
    }
    if (this.isSendDisabled) {
      return;
    }

    const messageToSend = this.newMessageContent;
    const currentConversationId = this.state.getCurrentConversationId();

    this.selectedPrompts$.pipe(take(1)).subscribe((selectedPrompts) => {
      this.prompts$.pipe(take(1)).subscribe((allPrompts) => {
        const selectedPromptKeys = selectedPrompts
          .map((id) => allPrompts.find((p) => p.id === id)?.promptKey)
          .filter((key): key is string => !!key);

        if (currentConversationId) {
          (async () => {
            const documentUrls = this.documents.map((doc) => doc.blobUrl);

            await this.signalrService.joinConversationGroup(
              currentConversationId,
            );

            this.aiChatService.sendMessage(
              currentConversationId,
              messageToSend,
              this.files,
              selectedPromptKeys,
              documentUrls,
            );
          })();
        } else {
          this.aiChatService
            .startConversation(
              messageToSend,
              selectedPromptKeys.length > 0 ? selectedPromptKeys[0] : null,
              this.files,
              selectedPromptKeys,
            )
            .subscribe(async (newConversation) => {
              if (newConversation) {
                this.conversationId = newConversation.Id;

                // ✅ Join SignalR before streaming starts
                await this.signalrService.joinConversationGroup(
                  this.conversationId,
                );

                this.state.addConversation(newConversation);
                this.state.setActiveConversationId(newConversation.Id);

                // ✅ Let streaming handle message delivery
                this.selectConversation$.next(newConversation.Id);
                this.cdRef.detectChanges();
                this.scrollToBottom();
              }
            });
        }
      });
    });

    // 🔥 DO NOT finalize or clear the stream here!
    this.newMessageContent = '';
    this.files = [];
    this.state.setSelectedPrompts([]);
    this.isPromptsPopupVisible = false;
    this.scrollToBottom('smooth');
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  onAttachFile(): void {
    this.fileUploadService.openUploadOptionsDialog().subscribe((result) => {
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

    const uploadAction = (convId: string) => {
      this.fileUploadService.uploadFiles(files, convId, convId).subscribe({
        next: (uploadProgress) => {
          this.progress = uploadProgress.progress;
          this.isUploading = uploadProgress.isUploading;
          if (!uploadProgress.isUploading && uploadProgress.files) {
            this.uploadedFileInfos = [
              ...this.uploadedFileInfos,
              ...uploadProgress.files,
            ];
            this.snackBar.open('Files uploaded successfully!', 'Close', {
              duration: 3000,
            });
            const id = this.state.getCurrentConversationId();
            if (id) {
              this.aiChatService
                .getConversationDocuments(id)
                .subscribe((documents) => {
                  this.documents = documents;
                  this.state.setDocuments(documents);
                  this.cdRef.detectChanges();
                });
            }
          }
        },
        error: (error) => {
          this.isUploading = false;
          this.snackBar.open('File upload failed. Please try again.', 'Close', {
            duration: 3000,
          });
          console.error('Upload error:', error);
        },
      });
    };

    const currentConversationId = this.state.getCurrentConversationId();
    if (currentConversationId) {
      uploadAction(currentConversationId);
    } else {
      this.aiChatService.createConversation().subscribe((newConversation) => {
        if (newConversation && newConversation.Id) {
          this.state.addConversation(newConversation);
          this.state.setActiveConversationId(newConversation.Id);
          this.state.setMessages(newConversation.messages ?? []);
          this.conversationId = newConversation.Id;
          uploadAction(newConversation.Id);
        } else {
          this.isUploading = false;
          this.snackBar.open(
            'Could not start a new conversation to upload files.',
            'Close',
            { duration: 3000 },
          );
        }
      });
    }
  }

  getDisplayContent(content: string, role: 'user' | 'model'): string {
    return this.aiChatService.getDisplayContent(content, role);
  }

  goToFullScreen(): void {
    this.router.navigate(['/ai-chat']);
    this.state.setIsChatOpen(false);
  }
  async openPopout() {
    // use active conversation if available; otherwise 'new'
    const convoId = this.state.getCurrentConversationId();

    const tree = this.router.createUrlTree(['/ai-chat', convoId]);
    const url = `${window.location.origin}${this.router.serializeUrl(tree)}`;

    // name the window so repeated clicks focus the same popout
    const features = [
      'noopener',
      'noreferrer',
      'width=1100',
      'height=800',
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
    ].join(',');

    window.open(url, 'mason-popout', features);
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

  togglePromptSelection(promptId: number): void {
    this.prompts$.pipe(take(1)).subscribe((allPrompts) => {
      const selectedPrompt = allPrompts.find((p) => p.id === promptId);
      if (!selectedPrompt) return;

      const fullBlueprintPrompt = allPrompts.find(
        (p) => p.promptKey === this.fullBlueprintAnalysisPromptKey,
      );

      this.selectedPrompts$.pipe(take(1)).subscribe((currentPromptIds) => {
        const isSelected = currentPromptIds.includes(promptId);
        let newPromptIds: number[];

        if (selectedPrompt.promptKey === this.fullBlueprintAnalysisPromptKey) {
          newPromptIds = isSelected ? [] : [promptId];
        } else {
          if (isSelected) {
            newPromptIds = currentPromptIds.filter((id) => id !== promptId);
          } else {
            let filteredIds = currentPromptIds;
            if (fullBlueprintPrompt) {
              filteredIds = filteredIds.filter(
                (id) => id !== fullBlueprintPrompt.id,
              );
            }
            newPromptIds = [...filteredIds, promptId];
          }
        }
        this.state.setSelectedPrompts(newPromptIds);
      });
    });
  }

  clearPrompts(): void {
    this.state.setSelectedPrompts([]);
  }
  getUploadedFileNames(): string {
    return this.fileUploadService.getUploadedFileNames(this.uploadedFileInfos);
  }

  viewUploadedFiles(): void {
    if (this.conversationId) {
      this.aiChatService
        .getConversationDocuments(this.conversationId)
        .subscribe((documents) => {
          this.fileUploadService.viewUploadedFiles(documents);
        });
    } else {
      this.fileUploadService.viewUploadedFiles(this.documents);
    }
  }
  toggleHistory(): void {
    this.isHistoryVisible = !this.isHistoryVisible;
  }

  loadConversation(conversationId: string): void {
    this.selectConversation$.next(conversationId);
    this.isHistoryVisible = false;
  }
  private clearStreamingMessages(): void {
    this.streamingMessages.clear();
    this.streamingMessagesSubject.next(new Map());
  }
  private setupConversationSelection(): void {
    this.selectConversation$
      .pipe(
        switchMap((conversationId) =>
          this.aiChatService.getConversation(conversationId).pipe(
            tap(async () => {
              await this.signalrService.joinConversationGroup(conversationId);
              this.conversationId = conversationId; // ✅ CRUCIAL: ensure stream handlers match ID
              this.ngZone.run(() => {
                this.clearStreamingMessages();
                this.state.setActiveConversationId(conversationId);
                this.scrollToBottom('auto');
              });
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe();
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
    this.state.setDocuments([]);

    this.clearStreamingMessages(); // ✅ Crucial: clear dangling chunks

    this.lastChunkByCid.clear(); // optional, in case you use it

    this.aiChatService.getMyPrompts();
  }

  retryMessage(message: ChatMessage): void {
    this.state.deleteMessage(message.Id);
    if (message.ConversationId) {
      this.aiChatService.sendMessage(
        message.ConversationId,
        message.Content,
        [],
      );
    } else {
      this.aiChatService
        .startConversation(message.Content, null, [])
        .subscribe((newConversation) => {
          if (newConversation) {
            this.selectConversation$.next(newConversation.Id);
          }
        });
    }
  }
}
