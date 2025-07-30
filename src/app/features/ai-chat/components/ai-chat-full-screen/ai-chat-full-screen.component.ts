import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AiChatService } from '../../services/ai-chat.service';
import { Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Conversation, ChatMessage, Prompt } from '../../models/ai-chat.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai-chat-full-screen',
  templateUrl: './ai-chat-full-screen.component.html',
  styleUrls: ['./ai-chat-full-screen.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AiChatFullScreenComponent implements OnInit {
  conversations$: Observable<Conversation[]>;
  messages$: Observable<ChatMessage[]>;
  currentConversation$: Observable<Conversation | null>;
  isLoading$: Observable<boolean>;
  prompts$: Observable<Prompt[]>;

  newMessageContent = '';

  constructor(
    private aiChatStateService: AiChatStateService,
    private aiChatService: AiChatService,
    private route: ActivatedRoute
  ) {
    this.conversations$ = this.aiChatStateService.conversations$;
    this.messages$ = this.aiChatStateService.messages$;
    this.isLoading$ = this.aiChatStateService.isLoading$;
    this.prompts$ = this.aiChatStateService.prompts$;

    this.currentConversation$ = combineLatest([
      this.aiChatStateService.conversations$,
      this.aiChatStateService.activeConversationId$
    ]).pipe(
      map(([conversations, activeId]) => conversations.find(c => c.Id === activeId) || null)
    );
  }

  ngOnInit(): void {
    this.aiChatService.getMyConversations();
    this.route.params.subscribe(params => {
      const conversationId = params['conversationId'];
      if (conversationId) {
        this.selectConversation(conversationId);
      }
    });
  }

  selectConversation(conversationId: string): void {
    this.aiChatStateService.setActiveConversationId(conversationId);
    this.aiChatService.getConversation(conversationId);
  }

  startNewConversation(): void {
    this.aiChatStateService.setActiveConversationId(null);
    this.aiChatService.getMyPrompts();
  }

  startConversationWithPrompt(prompt: Prompt): void {
    this.aiChatService.startConversation(`New conversation with ${prompt.tradeName}`, prompt.promptFileName, []);
  }

  sendMessage(): void {
    if (this.newMessageContent.trim() === '') {
      return;
    }

    this.aiChatStateService.activeConversationId$.pipe(take(1)).subscribe(currentConversationId => {
        if (currentConversationId) {
            this.aiChatService.sendMessage(currentConversationId, this.newMessageContent);
            this.newMessageContent = '';
        }
    });
  }
}
