-- Sukhan AI cloud schema
-- Paste into Supabase SQL Editor after creating a dedicated Sukhan AI project.
-- Uses 384-dimensional sentence embeddings (e.g. all-MiniLM-L6-v2).

create extension if not exists vector with schema extensions;

create table if not exists public.chats (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Conversation',
  saved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chats_id_user_id_unique unique (id, user_id)
);

create index if not exists chats_user_updated_idx
  on public.chats (user_id, updated_at desc);

create table if not exists public.messages (
  id text primary key,
  chat_id text not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 20000),
  feedback text not null default 'none'
    check (feedback in ('none', 'up', 'down')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_chat_owner_fk
    foreign key (chat_id, user_id)
    references public.chats(id, user_id)
    on delete cascade
);

create index if not exists messages_user_chat_created_idx
  on public.messages (user_id, chat_id, created_at);


create table if not exists public.saved_poems (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id text,
  content text not null check (char_length(content) <= 20000),
  created_at timestamptz not null default now(),
  constraint saved_poems_chat_owner_fk
    foreign key (chat_id, user_id)
    references public.chats(id, user_id)
    on delete set null (chat_id)
);

create index if not exists saved_poems_user_created_idx
  on public.saved_poems (user_id, created_at desc);

create table if not exists public.poem_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poem_id text not null references public.saved_poems(id) on delete cascade,
  chunk_index integer not null default 0,
  language text not null default 'auto',
  content text not null,
  embedding extensions.vector(384) not null,
  model text not null default 'sentence-transformers/all-MiniLM-L6-v2',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (poem_id, chunk_index)
);

create index if not exists poem_embeddings_user_idx
  on public.poem_embeddings (user_id);
create index if not exists poem_embeddings_vector_hnsw_idx
  on public.poem_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.saved_poems enable row level security;
alter table public.poem_embeddings enable row level security;

drop policy if exists "Users manage their own chats" on public.chats;
create policy "Users manage their own chats"
  on public.chats for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own messages" on public.messages;
create policy "Users manage their own messages"
  on public.messages for all to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chats c
      where c.id = messages.chat_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chats c
      where c.id = messages.chat_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage their own saved poems" on public.saved_poems;
create policy "Users manage their own saved poems"
  on public.saved_poems for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      chat_id is null or exists (
        select 1 from public.chats c
        where c.id = saved_poems.chat_id and c.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users manage their own poem embeddings" on public.poem_embeddings;
create policy "Users manage their own poem embeddings"
  on public.poem_embeddings for all to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.saved_poems p
      where p.id = poem_embeddings.poem_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.saved_poems p
      where p.id = poem_embeddings.poem_id and p.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.chats to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.saved_poems to authenticated;
grant select, insert, update, delete on public.poem_embeddings to authenticated;

-- Example vector search (execute as a signed-in user; RLS limits results to that user):
-- select poem_id, content, 1 - (embedding <=> '[0, ... 384 floats ...]'::extensions.vector) as similarity
-- from public.poem_embeddings
-- order by embedding <=> '[0, ... 384 floats ...]'::extensions.vector
-- limit 8;
