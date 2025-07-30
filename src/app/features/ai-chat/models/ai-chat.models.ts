export interface ChatMessage {
  Id: number;
  ConversationId: string;
  Role: string;
  Content: string;
  IsSummarized: boolean;
  Timestamp: Date;
}

export interface Conversation {
  Id: string;
  UserId?: string;
  Title: string;
  CreatedAt?: Date;
  ConversationSummary?: string;
  messages?: ChatMessage[];
  promptFileName?: string;
  isArchived?: boolean;
  timestamp?: Date;
}

export interface Prompt {
   tradeName: string;
   promptFileName: string;
}

export interface AiChatState {
 isChatOpen: boolean;
 isFullScreen: boolean;
 isLoading: boolean;
 error: string | null;
 prompts: Prompt[];
 conversations: Conversation[];
 activeConversationId: string | null;
 messages: ChatMessage[];
 currentConversation: Conversation | null;
}
