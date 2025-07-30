import { Component } from '@angular/core';
import { AiChatStateService } from '../../services/ai-chat-state.service';

@Component({
  selector: 'app-ai-chat-icon',
  templateUrl: './ai-chat-icon.component.html',
  styleUrls: ['./ai-chat-icon.component.scss'],
  standalone: true
})
export class AiChatIconComponent {
  constructor(private state: AiChatStateService) {}

  openChat(): void {
    this.state.setIsChatOpen(true);
  }
}
