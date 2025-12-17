import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import {
  AiChatState,
  ChatMessage,
  Conversation,
  Prompt,
} from '../models/ai-chat.models';
import { JobDocument } from '../../../models/JobDocument';

@Injectable({
  providedIn: 'root',
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
    documents: [],
    selectedPrompts: [],
  };

  private readonly stateSubject = new BehaviorSubject<AiChatState>(
    this.initialState,
  );
  private readonly state$ = this.stateSubject.asObservable();
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private _messages = new BehaviorSubject<ChatMessage[]>([]);

  currentConversation$ = this.state$.pipe(
    map((state) => state.currentConversation),
    distinctUntilChanged(),
  );
  selectedPrompts$ = this.state$.pipe(
    map((state) => state.selectedPrompts || []),
    distinctUntilChanged(),
  );

  // Selectors
  isChatOpen$ = this.state$.pipe(
    map((state) => state.isChatOpen),
    distinctUntilChanged(),
  );
  isFullScreen$ = this.state$.pipe(
    map((state) => state.isFullScreen),
    distinctUntilChanged(),
  );
  isLoading$ = this.state$.pipe(
    map((state) => state.isLoading),
    distinctUntilChanged(),
  );
  error$ = this.state$.pipe(
    map((state) => state.error),
    distinctUntilChanged(),
  );
  prompts$ = this.state$.pipe(
    map((state) => state.prompts),
    distinctUntilChanged(),
  );
  conversations$ = this.state$.pipe(
    map((state) => state.conversations),
    distinctUntilChanged(),
  );
  activeConversationId$ = this.state$.pipe(
    map((state) => state.activeConversationId),
    distinctUntilChanged(),
  );
  messages$ = this.state$.pipe(
    map((state) => state.messages),
    distinctUntilChanged(),
  );
  documents$ = this.state$.pipe(
    map((state) => state.documents),
    distinctUntilChanged(),
  );

  getCurrentConversationId(): string | null {
    return this.stateSubject.getValue().activeConversationId;
  }

  getConversationById(id: string): Conversation | undefined {
    return this.stateSubject.getValue().conversations.find((c) => c.Id === id);
  }

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

  setPrompts(prompts: Prompt[]): void {
    this.updateState({ prompts });
  }

  setConversations(conversations: Conversation[]): void {
    const sortedConversations = [...conversations].sort((a, b) => {
      const dateA = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
      const dateB = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;
      return dateB - dateA;
    });
    this.updateState({ conversations: sortedConversations });
  }

  setActiveConversationId(id: string | null): void {
    this.updateState({ activeConversationId: id });
  }

  addMessage(message: ChatMessage, isOptimistic = false): void {
    const currentState = this.stateSubject.getValue();
    let tempId = 0;

    if (isOptimistic) {
      // Create a temporary ID for optimistic updates
      tempId = Date.now();
      message = { ...message, Id: tempId, status: 'sent' };
    }

    const existingMessage = currentState.messages.find((m) => {
      // If both have valid IDs, check by ID
      if (m.Id && message.Id && m.Id === message.Id) {
        return true;
      }
      // If no ID or ID is 0, check by content and approximate timestamp
      if (
        m.Content === message.Content &&
        m.Role === message.Role &&
        m.ConversationId === message.ConversationId
      ) {
        const timeDiff = Math.abs(
          new Date(m.Timestamp).getTime() -
            new Date(message.Timestamp).getTime(),
        );
        return timeDiff < 5000; // Within 5 seconds
      }
      return false;
    });

    if (existingMessage) {
      return;
    }

    const updatedMessages = [...currentState.messages, message];
    this.updateState({ messages: updatedMessages });
  }

  updateMessage(updatedMessage: ChatMessage): void {
    const currentState = this.stateSubject.getValue();
    const messages = currentState.messages.map((message) =>
      message.Id === updatedMessage.Id ? updatedMessage : message,
    );
    this.updateState({ messages });
  }

  updateMessageStatus(messageId: number, status: 'sent' | 'failed'): void {
    const currentState = this.stateSubject.getValue();
    const messages = currentState.messages.map((message) =>
      message.Id === messageId ? { ...message, status } : message,
    );
    this.updateState({ messages });
  }

  deleteMessage(messageId: number): void {
    const currentState = this.stateSubject.getValue();
    const messages = currentState.messages.filter(
      (message) => message.Id !== messageId,
    );
    this.updateState({ messages });
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  addConversation(conversation: Conversation): void {
    const currentState = this.stateSubject.getValue();
    this.updateState({
      conversations: [...currentState.conversations, conversation],
    });
  }

  setMessages(messages: ChatMessage[]): void {
    this.updateState({ messages });
  }

  setSelectedPrompts(selectedPrompts: number[]): void {
    this.updateState({ selectedPrompts });
  }

  setCurrentConversation(conversation: Conversation | null): void {
    this.updateState({ currentConversation: conversation });
  }

  addDocuments(documents: JobDocument[]): void {
    const currentState = this.stateSubject.getValue();
    this.updateState({ documents: [...currentState.documents, ...documents] });
  }

  setDocuments(documents: JobDocument[]): void {
    this.updateState({ documents });
  }

  updateConversationTitle(conversationId: string, newTitle: string): void {
    const currentState = this.stateSubject.getValue();
    const updatedConversations = currentState.conversations.map((c) =>
      c.Id === conversationId ? { ...c, Title: newTitle } : c,
    );
    this.updateState({ conversations: updatedConversations });

    if (currentState.currentConversation?.Id === conversationId) {
      this.updateState({
        currentConversation: {
          ...currentState.currentConversation,
          Title: newTitle,
        },
      });
    }
  }

  sortConversations(order: 'asc' | 'desc'): void {
    const currentState = this.stateSubject.getValue();
    const sortedConversations = [...currentState.conversations].sort((a, b) => {
      const dateA = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
      const dateB = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    this.updateState({ conversations: sortedConversations });
  }
  pushFinalStreamedMessage(content: string): void {
    const conversationId = this.getCurrentConversationId();
    if (!conversationId) return;

    const currentMessages = this.stateSubject.getValue().messages;

    const newMessage: ChatMessage = {
      Id: Date.now(), // temporary ID
      ConversationId: conversationId,
      Role: 'model',
      Content: content,
      IsSummarized: false,
      Timestamp: new Date(),
      status: 'sent',
    };

    this.setMessages([...currentMessages, newMessage]);
  }
  private updateState(partialState: Partial<AiChatState>): void {
    const currentState = this.stateSubject.getValue();
    const nextState = { ...currentState, ...partialState };
    this.stateSubject.next(nextState);
  }
}
