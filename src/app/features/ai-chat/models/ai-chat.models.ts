import { JobDocument } from "../../../models/JobDocument";

export interface ChatMessage {
  Id: number;
  ConversationId: string;
  Role: string;
  Content: string;
  IsSummarized: boolean;
  Timestamp: Date;
  status?: 'sent' | 'failed';
}

export interface Conversation {
  Id: string;
  UserId?: string;
  Title: string;
  CreatedAt?: Date;
  ConversationSummary?: string;
  messages?: ChatMessage[];
  documents?: JobDocument[];
  promptFileName?: string;
  isArchived?: boolean;
  timestamp?: Date;
}
export interface StartInitialReplyDto {
  initialMessage: string;
  promptKeys?: string[];
  blueprintUrls?: string[];
}

export interface Prompt {
   id: number;
   promptName: string;
   promptKey: string;
   displayName?: string;
   description?: string;
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
 documents: JobDocument[];
 selectedPrompts: number[];
}
