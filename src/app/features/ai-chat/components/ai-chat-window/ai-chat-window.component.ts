import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AiChatService } from '../../services/ai-chat.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '../../models/ai-chat.models';
import { FileUploadService } from '../../../../services/file-upload.service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-ai-chat-window',
  templateUrl: './ai-chat-window.component.html',
  styleUrls: ['./ai-chat-window.component.scss'],
  standalone: true,
  imports: [NgIf, AsyncPipe, NgFor, NgClass, FormsModule, MatIconModule, MatTooltipModule, MarkdownModule],
})
export class AiChatWindowComponent implements OnDestroy {
  isChatOpen$: Observable<boolean>;
  messages$: Observable<ChatMessage[]>;
  isLoading$: Observable<boolean>;
  selectedPrompt$: Observable<any | null>;

  private conversationId: string | null = null;
  private destroy$ = new Subject<void>();
  private files: File[] = [];

  constructor(
    public state: AiChatStateService,
    private aiChatService: AiChatService,
    private router: Router,
    private fileUploadService: FileUploadService
  ) {
    this.isChatOpen$ = this.state.isChatOpen$;
    this.messages$ = this.state.messages$;
    this.isLoading$ = this.state.isLoading$;
    this.selectedPrompt$ = this.state.selectedPrompt$;

    this.state.activeConversationId$.pipe(takeUntil(this.destroy$)).subscribe(id => {
      console.log('DELETE ME: [AiChatWindowComponent] Active conversation ID changed to:', id);
      this.conversationId = id;
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
    this.state.setChatView('prompt-selection');
  }

  sendMessage(formValue: { message: string }): void {
    if ((!formValue.message || formValue.message.trim().length === 0) && this.files.length === 0) {
      console.log('DELETE ME: [AiChatWindowComponent] Message is empty and no files, not sending.');
      return;
    }
    if (!this.conversationId) {
      console.log('DELETE ME: [AiChatWindowComponent] No active conversation, not sending.');
      return;
    }
    console.log('DELETE ME: [AiChatWindowComponent] Sending message...');
    this.aiChatService.sendMessage(this.conversationId, formValue.message, this.files);
    this.files = [];
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files.length > 0) {
      this.files = Array.from(files);
    }
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

  goToFullScreen(): void {
    console.log('DELETE ME: [AiChatWindowComponent] Navigating to full screen');
    this.router.navigate(['/ai-chat']);
    this.state.setIsChatOpen(false);
  }
}
