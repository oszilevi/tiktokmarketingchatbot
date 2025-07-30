import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Message {
  id: number;
  user_id: string;
  content: string;
  response: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  message_id: number;
  title: string;
  content: string;
  created_at: string;
}