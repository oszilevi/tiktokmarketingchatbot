-- Create chat_sessions table
create table public.chat_sessions (
  id bigserial primary key,
  user_id uuid references auth.users not null,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  gallery_videos jsonb default '[]'::jsonb
);

-- Add session_id to messages table
alter table public.messages add column session_id bigint references public.chat_sessions;

-- Update notes to be per session instead of per message
alter table public.notes drop constraint notes_message_id_fkey;
alter table public.notes drop column message_id;
alter table public.notes add column session_id bigint references public.chat_sessions not null;

-- Enable RLS on chat_sessions
alter table public.chat_sessions enable row level security;

-- Create policies for chat_sessions
create policy "Users can view their own chat sessions" on public.chat_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own chat sessions" on public.chat_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own chat sessions" on public.chat_sessions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own chat sessions" on public.chat_sessions
  for delete using (auth.uid() = user_id);

-- Update notes policies to use session_id
drop policy if exists "Users can view their own notes" on public.notes;
drop policy if exists "Users can insert their own notes" on public.notes;
drop policy if exists "Users can update their own notes" on public.notes;
drop policy if exists "Users can delete their own notes" on public.notes;

create policy "Users can view notes from their sessions" on public.notes
  for select using (
    session_id in (
      select id from public.chat_sessions where user_id = auth.uid()
    )
  );

create policy "Users can insert notes to their sessions" on public.notes
  for insert with check (
    session_id in (
      select id from public.chat_sessions where user_id = auth.uid()
    )
  );

create policy "Users can update notes from their sessions" on public.notes
  for update using (
    session_id in (
      select id from public.chat_sessions where user_id = auth.uid()
    )
  );

create policy "Users can delete notes from their sessions" on public.notes
  for delete using (
    session_id in (
      select id from public.chat_sessions where user_id = auth.uid()
    )
  );