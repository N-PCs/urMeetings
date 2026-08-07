import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a Supabase client for client-side operations
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database schema
export interface Bot {
  id: string
  name: string
  meeting_url: string
  meeting_name?: string
  meeting_platform: string
  bot_status: string
  recording_status?: string
  transcript_status?: string
  status_changes?: StatusChange[]
  joined_at?: string
  webpage_url?: string
  recording_url?: string
  transcript_url?: string
  created_at: string
}

export interface StatusChange {
  code: string
  message?: string | null
  created_at: string
  sub_code?: string | null
}