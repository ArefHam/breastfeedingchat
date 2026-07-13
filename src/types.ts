export type Language = 'fa' | 'en'
export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'pending' | 'completed' | 'failed'

export interface Conversation {
  id: string
  user_id: string
  title: string
  language: Language
  created_at: string
  updated_at: string
  last_message_at: string | null
}

export interface ChatMessage {
  id: string
  sequence: number
  conversation_id: string
  request_id: string
  role: MessageRole
  content: string
  status: MessageStatus
  created_at: string
}

export interface ChatResponse {
  conversation: Conversation
  userMessage: ChatMessage
  assistantMessage: ChatMessage
}
