import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { AiChatState, ChatMessage, Conversation } from '../models/ai-chat.models';

@Injectable({
  providedIn: 'root'
})
export class AiChatStateService {
  private readonly initialState: AiChatState = {
    isChatOpen: false,
    isFullScreen: false,
    isLoading: false,
    error: null,
    prompts: [],
    conversations: [],
    activeConversationId: null,
    messages: []
  };

  private readonly stateSubject = new BehaviorSubject<AiChatState>(this.initialState);
  private readonly state$ = this.stateSubject.asObservable();

  // Selectors
  isChatOpen$ = this.state$.pipe(map(state => state.isChatOpen), distinctUntilChanged());
  isFullScreen$ = this.state$.pipe(map(state => state.isFullScreen), distinctUntilChanged());
  isLoading$ = this.state$.pipe(map(state => state.isLoading), distinctUntilChanged());
  error$ = this.state$.pipe(map(state => state.error), distinctUntilChanged());
  prompts$ = this.state$.pipe(map(state => state.prompts), distinctUntilChanged());
  conversations$ = this.state$.pipe(map(state => state.conversations), distinctUntilChanged());
  activeConversationId$ = this.state$.pipe(map(state => state.activeConversationId), distinctUntilChanged());
  messages$ = this.state$.pipe(map(state => state.messages), distinctUntilChanged());

  // State Updaters
  setIsChatOpen(isOpen: boolean): void {
    this.updateState({ isChatOpen: isOpen });
  }

  setIsFullScreen(isFullScreen: boolean): void {
    this.updateState({ isFullScreen });
  }

  setLoading(isLoading: boolean): void {
    this.updateState({ isLoading });
  }

  setError(error: string | null): void {
    this.updateState({ error });
  }

  setPrompts(prompts: Array<{ tradeName: string, promptFileName: string }>): void {
    this.updateState({ prompts });
  }

  setConversations(conversations: Conversation[]): void {
    this.updateState({ conversations });
  }

  setActiveConversationId(id: string | null): void {
    this.updateState({ activeConversationId: id });
  }

  addMessage(message: ChatMessage): void {
    const currentState = this.stateSubject.getValue();
    this.updateState({ messages: [...currentState.messages, message] });
  }

  private updateState(partialState: Partial<AiChatState>): void {
    const currentState = this.stateSubject.getValue();
    this.stateSubject.next({ ...currentState, ...partialState });
  }
}
