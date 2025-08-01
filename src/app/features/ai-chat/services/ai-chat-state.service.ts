import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { AiChatState, ChatMessage, Conversation } from '../models/ai-chat.models';
import { JobDocument } from '../../../models/JobDocument';

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
    messages: [],
    currentConversation: null,
    documents: []
  };

  private readonly stateSubject = new BehaviorSubject<AiChatState>(this.initialState);
  private readonly state$ = this.stateSubject.asObservable();

  selectedPrompt$ = new BehaviorSubject<any | null>(null);
  currentConversation$ = this.state$.pipe(map(state => state.currentConversation), distinctUntilChanged());

  // Selectors
  isChatOpen$ = this.state$.pipe(map(state => state.isChatOpen), distinctUntilChanged());
  isFullScreen$ = this.state$.pipe(map(state => state.isFullScreen), distinctUntilChanged());
  isLoading$ = this.state$.pipe(map(state => state.isLoading), distinctUntilChanged());
  error$ = this.state$.pipe(map(state => state.error), distinctUntilChanged());
  prompts$ = this.state$.pipe(map(state => state.prompts), distinctUntilChanged());
  conversations$ = this.state$.pipe(map(state => state.conversations), distinctUntilChanged());
  activeConversationId$ = this.state$.pipe(map(state => state.activeConversationId), distinctUntilChanged());
  messages$ = this.state$.pipe(map(state => state.messages), distinctUntilChanged());
  documents$ = this.state$.pipe(map(state => state.documents), distinctUntilChanged());

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

  setSelectedPrompt(prompt: any | null): void {
    this.selectedPrompt$.next(prompt);
  }

  setCurrentConversation(conversation: Conversation | null): void {
    this.updateState({ currentConversation: conversation });
  }

  addDocuments(documents: JobDocument[]): void {
      console.log('DELETE ME: [AiChatStateService] Adding documents:', documents);
      const currentState = this.stateSubject.getValue();
      this.updateState({ documents: [...currentState.documents, ...documents] });
  }

  setDocuments(documents: JobDocument[]): void {
    console.log('DELETE ME: [AiChatStateService] Setting documents:', documents);
    this.updateState({ documents });
  }

 updateConversationTitle(conversationId: string, newTitle: string): void {
   const currentState = this.stateSubject.getValue();
   const updatedConversations = currentState.conversations.map(c =>
     c.Id === conversationId ? { ...c, Title: newTitle } : c
   );
   this.updateState({ conversations: updatedConversations });

   if (currentState.currentConversation?.Id === conversationId) {
     this.updateState({
       currentConversation: { ...currentState.currentConversation, Title: newTitle }
     });
   }
 }

  private updateState(partialState: Partial<AiChatState>): void {
    const currentState = this.stateSubject.getValue();
    const nextState = { ...currentState, ...partialState };
    console.log('DELETE ME: [AiChatStateService] Updating state:', partialState);
    console.log('DELETE ME: [AiChatStateService] New state:', nextState);
    this.stateSubject.next(nextState);
  }
}
