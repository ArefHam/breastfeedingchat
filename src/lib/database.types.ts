export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          language: 'fa' | 'en'
          created_at: string
          updated_at: string
          last_message_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          language?: 'fa' | 'en'
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
        }
        Update: {
          title?: string
          language?: 'fa' | 'en'
          updated_at?: string
          last_message_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          sequence: number
          conversation_id: string
          request_id: string
          role: 'user' | 'assistant'
          content: string
          status: 'pending' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          sequence?: never
          conversation_id: string
          request_id: string
          role: 'user' | 'assistant'
          content: string
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'completed' | 'failed'
          content?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      begin_chat_request: {
        Args: {
          p_user_id: string
          p_conversation_id: string | null
          p_request_id: string
          p_message: string
          p_language: 'fa' | 'en'
        }
        Returns: Json
      }
      complete_chat_request: {
        Args: {
          p_user_id: string
          p_conversation_id: string
          p_request_id: string
          p_answer: string
        }
        Returns: string
      }
      fail_chat_request: {
        Args: {
          p_user_id: string
          p_conversation_id: string
          p_request_id: string
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
