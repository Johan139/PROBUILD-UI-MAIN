import { Component, OnInit } from '@angular/core';
import { AiChatStateService } from '../../services/ai-chat-state.service';
import { AuthService } from '../../../../authentication/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-chat-icon',
  templateUrl: './ai-chat-icon.component.html',
  styleUrls: ['./ai-chat-icon.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class AiChatIconComponent implements OnInit {
  isLoggedIn = false;

  constructor(
    private state: AiChatStateService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
    });
  }

  openChat(): void {
    this.state.setIsChatOpen(true);
  }
}
