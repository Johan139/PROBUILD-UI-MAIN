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

  chatView$ = new BehaviorSubject<'prompt-selection' | 'chat-window'>('prompt-selection');
  selectedPrompt$ = new BehaviorSubject<any | null>(null);

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
    console.log('DELETE ME: [AiChatStateService] Setting isChatOpen to:', isOpen);
    this.updateState({ isChatOpen: isOpen });
  }

  setIsFullScreen(isFullScreen: boolean): void {
    console.log('DELETE ME: [AiChatStateService] Setting isFullScreen to:', isFullScreen);
    this.updateState({ isFullScreen });
  }

  setLoading(isLoading: boolean): void {
    console.log('DELETE ME: [AiChatStateService] Setting isLoading to:', isLoading);
    this.updateState({ isLoading });
  }

  setError(error: string | null): void {
    console.log('DELETE ME: [AiChatStateService] Setting error to:', error);
    this.updateState({ error });
  }

  setPrompts(prompts: Array<{ tradeName: string, promptFileName: string }>): void {
    console.log('DELETE ME: [AiChatStateService] Setting prompts:', prompts);
    this.updateState({ prompts });
  }

  setConversations(conversations: Conversation[]): void {
    console.log('DELETE ME: [AiChatStateService] Setting conversations:', conversations);
    this.updateState({ conversations });
  }

  setActiveConversationId(id: string | null): void {
    console.log('DELETE ME: [AiChatStateService] Setting activeConversationId to:', id);
    this.updateState({ activeConversationId: id });
  }

  addMessage(message: ChatMessage): void {
    console.log('DELETE ME: [AiChatStateService] Adding message:', message);
    const currentState = this.stateSubject.getValue();
    this.updateState({ messages: [...currentState.messages, message] });
  }

  addConversation(conversation: Conversation): void {
    console.log('DELETE ME: [AiChatStateService] Adding conversation:', conversation);
    const currentState = this.stateSubject.getValue();
    this.updateState({ conversations: [...currentState.conversations, conversation] });
  }

  setMessages(messages: ChatMessage[]): void {
    console.log('DELETE ME: [AiChatStateService] Setting messages:', messages);
    this.updateState({ messages });
  }

  setChatView(view: 'prompt-selection' | 'chat-window'): void {
    this.chatView$.next(view);
  }

  setSelectedPrompt(prompt: any | null): void {
    this.selectedPrompt$.next(prompt);
  }

  private updateState(partialState: Partial<AiChatState>): void {
    const currentState = this.stateSubject.getValue();
    const nextState = { ...currentState, ...partialState };
    console.log('DELETE ME: [AiChatStateService] Updating state:', partialState);
    console.log('DELETE ME: [AiChatStateService] New state:', nextState);
    this.stateSubject.next(nextState);
  }
}
