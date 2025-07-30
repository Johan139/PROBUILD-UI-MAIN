import { Routes } from '@angular/router';
import { AiChatFullScreenComponent } from './components/ai-chat-full-screen/ai-chat-full-screen.component';
import { AuthGuard } from '../../authentication/auth.guard';

export const AI_CHAT_ROUTES: Routes = [
  {
    path: '',
    component: AiChatFullScreenComponent,
    canActivate: [AuthGuard]
  },
  {
    path: ':conversationId',
    component: AiChatFullScreenComponent,
    canActivate: [AuthGuard]
  }
];
