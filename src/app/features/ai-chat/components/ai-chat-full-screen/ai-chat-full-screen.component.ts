import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AiChatService } from '../../services/ai-chat.service';
import { FileUploadService } from '../../../../services/file-upload.service';
import { Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Conversation, ChatMessage, Prompt } from '../../models/ai-chat.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MarkdownModule } from 'ngx-markdown';
import promptMapping from '../../assets/prompt_mapping.json';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UploadedFileInfo } from '../../../../services/file-upload.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-ai-chat-full-screen',
  templateUrl: './ai-chat-full-screen.component.html',
  styleUrls: ['./ai-chat-full-screen.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule, MatIconModule, MatTooltipModule, MatProgressBarModule]
})
export class AiChatFullScreenComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('folderInput') folderInput!: ElementRef<HTMLInputElement>;

  conversations$: Observable<Conversation[]>;
  messages$: Observable<ChatMessage[]>;
  currentConversation$: Observable<Conversation | null>;
  isLoading$: Observable<boolean>;
  prompts$: Observable<(Prompt & { displayName: string })[]>;
  chatView$: Observable<'prompt-selection' | 'chat-window'>;
  selectedPrompt$: Observable<any | null>;

  newMessageContent = '';
 files: File[] = [];
 uploadedFileInfos: UploadedFileInfo[] = [];
 isUploading = false;
 progress = 0;

  constructor(
    private aiChatStateService: AiChatStateService,
    private aiChatService: AiChatService,
    private route: ActivatedRoute,
    private fileUploadService: FileUploadService,
   private snackBar: MatSnackBar,
  ) {
    this.conversations$ = this.aiChatStateService.conversations$;
    this.messages$ = this.aiChatStateService.messages$;
    this.isLoading$ = this.aiChatStateService.isLoading$;
    this.chatView$ = this.aiChatStateService.chatView$;
    this.selectedPrompt$ = this.aiChatStateService.selectedPrompt$;
    this.prompts$ = this.aiChatStateService.prompts$.pipe(
      map(prompts => {
        const mappingData: { tradeName: string, promptFileName: string, displayName: string, description: string }[] = promptMapping;
        return prompts.map(prompt => {
          const match = mappingData.find(m => m.promptFileName === (prompt as any).promptKey);
          if (!match) {
            console.log('Unmatched prompt:', prompt);
          }
          const displayName = match ? match.displayName : prompt.tradeName;
          const description = match ? match.description : '';
          return { ...prompt, displayName, description };
        });
      }),
      map(prompts => {
        return prompts;
      })
    );

    this.currentConversation$ = combineLatest([
      this.aiChatStateService.conversations$,
      this.aiChatStateService.activeConversationId$
    ]).pipe(
      map(([conversations, activeId]) => conversations.find(c => c.Id === activeId) || null)
    );
  }

  ngOnInit(): void {
    console.log('DELETE ME: [AiChatFullScreenComponent] ngOnInit');
    this.aiChatService.getMyConversations();
    this.route.params.subscribe(params => {
      const conversationId = params['conversationId'];
      console.log('DELETE ME: [AiChatFullScreenComponent] Route params changed:', params);
      if (conversationId) {
        this.selectConversation(conversationId);
      }
    });
  }

  selectConversation(conversationId: string): void {
    console.log('DELETE ME: [AiChatFullScreenComponent] Selecting conversation:', conversationId);
    this.aiChatStateService.setActiveConversationId(conversationId);
    this.aiChatService.getConversation(conversationId);
    this.aiChatStateService.setSelectedPrompt(null);
    this.aiChatStateService.setChatView('chat-window');
  }

  startNewConversation(): void {
    console.log('DELETE ME: [AiChatFullScreenComponent] Starting new conversation flow');
    this.aiChatStateService.setChatView('prompt-selection');
    this.aiChatStateService.setSelectedPrompt(null);
    this.aiChatStateService.setActiveConversationId(null);
    this.aiChatStateService.setMessages([]);
    this.aiChatService.getMyPrompts();
    console.log('DELETE ME: [AiChatFullScreenComponent] State reset for new conversation.');
  }

  startConversationWithPrompt(prompt: Prompt): void {
    console.log('DELETE ME: [AiChatFullScreenComponent] Starting conversation with prompt:', prompt);
    const tempConversation: Conversation = {
      Id: '', // No ID yet
      Title: `New conversation with ${prompt.tradeName}`,
      messages: [],
      promptFileName: prompt.promptFileName,
      isArchived: false,
      timestamp: new Date()
    };
    this.aiChatStateService.setCurrentConversation(tempConversation);
    this.aiChatStateService.setSelectedPrompt(prompt);
    this.aiChatStateService.setChatView('chat-window');
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
    if (this.newMessageContent.trim() === '' && this.files.length === 0) {
      return;
    }
    console.log('DELETE ME: [AiChatFullScreenComponent] Sending message...');
    this.aiChatStateService.activeConversationId$.pipe(take(1)).subscribe(currentConversationId => {
        if (currentConversationId) {
            console.log(`DELETE ME: [AiChatFullScreenComponent] Found active conversation ${currentConversationId}, sending message.`);
            this.aiChatService.sendMessage(currentConversationId, this.newMessageContent, this.files);
            this.newMessageContent = '';
            this.files = [];
        } else {
            console.log('DELETE ME: [AiChatFullScreenComponent] No active conversation, cannot send message.');
        }
    });
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
}
