import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AiChatService } from '../../services/ai-chat.service';
import { Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Conversation, ChatMessage, Prompt } from '../../models/ai-chat.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MarkdownModule } from 'ngx-markdown';
import promptMapping from '../../assets/prompt_mapping.json';

@Component({
  selector: 'app-ai-chat-full-screen',
  templateUrl: './ai-chat-full-screen.component.html',
  styleUrls: ['./ai-chat-full-screen.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule, MatIconModule]
})
export class AiChatFullScreenComponent implements OnInit {
  conversations$: Observable<Conversation[]>;
  messages$: Observable<ChatMessage[]>;
  currentConversation$: Observable<Conversation | null>;
  isLoading$: Observable<boolean>;
  prompts$: Observable<(Prompt & { displayName: string })[]>;

  newMessageContent = '';

  constructor(
    private aiChatStateService: AiChatStateService,
    private aiChatService: AiChatService,
    private route: ActivatedRoute
  ) {
    this.conversations$ = this.aiChatStateService.conversations$;
    this.messages$ = this.aiChatStateService.messages$;
    this.isLoading$ = this.aiChatStateService.isLoading$;
    this.prompts$ = this.aiChatStateService.prompts$.pipe(
      map(prompts => {
        const mappingData: { tradeName: string, promptFileName: string, displayName: string }[] = promptMapping;
        return prompts.map(prompt => {
          const match = mappingData.find(m => m.promptFileName === (prompt as any).promptKey);
          const displayName = match ? match.displayName : prompt.tradeName;
          return { ...prompt, displayName };
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
  }

  startNewConversation(): void {
    console.log('DELETE ME: [AiChatFullScreenComponent] Starting new conversation flow');
    this.aiChatStateService.setActiveConversationId(null);
    this.aiChatService.getMyPrompts();
  }

  startConversationWithPrompt(prompt: Prompt): void {
    console.log('DELETE ME: [AiChatFullScreenComponent] Starting conversation with prompt:', prompt);
    this.aiChatService.startConversation(`New conversation with ${prompt.tradeName}`, prompt.promptFileName, []);
  }

  sendMessage(): void {
    if (this.newMessageContent.trim() === '') {
      return;
    }
    console.log('DELETE ME: [AiChatFullScreenComponent] Sending message...');
    this.aiChatStateService.activeConversationId$.pipe(take(1)).subscribe(currentConversationId => {
        if (currentConversationId) {
            console.log(`DELETE ME: [AiChatFullScreenComponent] Found active conversation ${currentConversationId}, sending message.`);
            this.aiChatService.sendMessage(currentConversationId, this.newMessageContent);
            this.newMessageContent = '';
        } else {
            console.log('DELETE ME: [AiChatFullScreenComponent] No active conversation, cannot send message.');
        }
    });
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

  logDisplayName(prompt: any): boolean {
    console.log('Rendering prompt:', prompt.displayName);
    return true;
  }

}
