import { Component, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AiChatService } from '../../services/ai-chat.service';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage, Conversation } from '../../models/ai-chat.models';
import { FileUploadService, UploadedFileInfo } from '../../../../services/file-upload.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownModule } from 'ngx-markdown';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

 @Component({
   selector: 'app-ai-chat-window',
   templateUrl: './ai-chat-window.component.html',
   styleUrls: ['./ai-chat-window.component.scss'],
   standalone: true,
   imports: [NgIf, AsyncPipe, NgFor, NgClass, FormsModule, MatIconModule, MatTooltipModule, MarkdownModule, MatProgressBarModule],
 })
 export class AiChatWindowComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('folderInput') folderInput!: ElementRef<HTMLInputElement>;

  isChatOpen$: Observable<boolean>;
  messages$: Observable<ChatMessage[]>;
  isLoading$: Observable<boolean>;
  selectedPrompt$: Observable<any | null>;
  currentConversation$: Observable<Conversation | null>;

  private conversationId: string | null = null;
  private currentConversation: Conversation | null = null;
  private destroy$ = new Subject<void>();
  private files: File[] = [];
 uploadedFileInfos: UploadedFileInfo[] = [];
 isUploading = false;
 progress = 0;

  constructor(
    public state: AiChatStateService,
    private aiChatService: AiChatService,
    private router: Router,
    private fileUploadService: FileUploadService,
   private snackBar: MatSnackBar,
  ) {
    this.isChatOpen$ = this.state.isChatOpen$;
    this.messages$ = this.state.messages$;
    this.isLoading$ = this.state.isLoading$;
    this.selectedPrompt$ = this.state.selectedPrompt$;
    this.currentConversation$ = this.state.currentConversation$;

    this.currentConversation$.pipe(takeUntil(this.destroy$)).subscribe(conversation => {
      this.currentConversation = conversation;
      this.conversationId = conversation ? conversation.Id : null;
    });
  }

  ngOnDestroy(): void {
    console.log('DELETE ME: [AiChatWindowComponent] ngOnDestroy');
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeChat(): void {
    console.log('DELETE ME: [AiChatWindowComponent] Closing chat');
    this.state.setIsChatOpen(false);
  }

  sendMessage(formValue: { message: string }): void {
    if ((!formValue.message || formValue.message.trim().length === 0) && this.files.length === 0) {
      return;
    }

    if (this.currentConversation && !this.currentConversation.Id) {
      this.selectedPrompt$.pipe(take(1)).subscribe(prompt => {
        if (prompt) {
          this.aiChatService.startConversation(formValue.message, prompt.promptFileName, this.files)
            .subscribe(newConversation => {
              if (newConversation) {
                this.state.setCurrentConversation(newConversation);
                this.state.addConversation(newConversation);
                this.state.setActiveConversationId(newConversation.Id);
              }
            });
          this.files = [];
        }
      });
    } else if (this.conversationId) {
      this.aiChatService.sendMessage(this.conversationId, formValue.message, this.files);
      this.files = [];
    }
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
    console.log('DELETE ME: [AiChatWindowComponent] Navigating to full screen');
    this.router.navigate(['/ai-chat']);
    this.state.setIsChatOpen(false);
  }
 getUploadedFileNames(): string {
     return this.fileUploadService.getUploadedFileNames(this.uploadedFileInfos);
 }

 viewUploadedFiles(): void {
     this.state.documents$.pipe(take(1)).subscribe(documents => {
         this.fileUploadService.viewUploadedFiles(documents);
     });
 }
}
