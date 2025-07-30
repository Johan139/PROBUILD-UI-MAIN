import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AiChatService } from '../../services/ai-chat.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '../../models/ai-chat.models';

@Component({
  selector: 'app-ai-chat-window',
  templateUrl: './ai-chat-window.component.html',
  styleUrls: ['./ai-chat-window.component.scss'],
  standalone: true,
  imports: [NgIf, AsyncPipe, NgFor, NgClass, FormsModule],
})
export class AiChatWindowComponent implements OnDestroy {
  isChatOpen$: Observable<boolean>;
  messages$: Observable<ChatMessage[]>;
  isLoading$: Observable<boolean>;

  private conversationId: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    public state: AiChatStateService,
    private aiChatService: AiChatService,
    private router: Router
  ) {
    this.isChatOpen$ = this.state.isChatOpen$;
    this.messages$ = this.state.messages$;
    this.isLoading$ = this.state.isLoading$;

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
  }

  sendMessage(formValue: { message: string }): void {
    if (!formValue.message || formValue.message.trim().length === 0 || !this.conversationId) {
      console.log('DELETE ME: [AiChatWindowComponent] Message is empty or no active conversation, not sending.');
      return;
    }
    console.log('DELETE ME: [AiChatWindowComponent] Sending message...');
    this.aiChatService.sendMessage(this.conversationId, formValue.message);
  }

  goToFullScreen(): void {
    console.log('DELETE ME: [AiChatWindowComponent] Navigating to full screen');
    this.router.navigate(['/ai-chat']);
    this.state.setIsChatOpen(false);
  }
}
