create extension if not exists pgcrypto with schema extensions;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  language text not null default 'fa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_title_length check (char_length(title) between 1 and 120),
  constraint conversations_language check (language in ('fa', 'en'))
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sequence bigint generated always as identity,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  request_id uuid not null,
  role text not null,
  content text not null,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  constraint messages_role check (role in ('user', 'assistant')),
  constraint messages_status check (status in ('pending', 'completed', 'failed')),
  constraint messages_content_length check (char_length(content) between 1 and 20000),
  constraint messages_request_role_unique unique (request_id, role)
);

create index conversations_owner_recent_idx
  on public.conversations (user_id, last_message_at desc nulls last, id);

create index messages_conversation_order_idx
  on public.messages (conversation_id, sequence);

create index messages_rate_limit_idx
  on public.messages (conversation_id, created_at desc)
  where role = 'user';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy conversations_select_own
on public.conversations
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy conversations_update_own
on public.conversations
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy conversations_delete_own
on public.conversations
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy messages_select_via_owned_conversation
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
);

revoke all on table public.conversations from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
grant select on table public.conversations to authenticated;
grant update (title) on table public.conversations to authenticated;
grant delete on table public.conversations to authenticated;
grant select on table public.messages to authenticated;

create or replace function public.begin_chat_request(
  p_user_id uuid,
  p_conversation_id uuid,
  p_request_id uuid,
  p_message text,
  p_language text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := p_user_id;
  v_conversation_id uuid;
  v_user_message_id uuid;
  v_existing_message_id uuid;
  v_existing_status text;
  v_existing_created_at timestamptz;
  v_conversation jsonb;
  v_title text;
  v_recent_count integer;
begin
  if v_user_id is null or not exists (select 1 from auth.users where id = v_user_id) then
    raise exception using errcode = '22023', message = 'invalid_user';
  end if;

  if p_request_id is null then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;

  if p_message is null or char_length(btrim(p_message)) < 1 or char_length(p_message) > 4000 then
    raise exception using errcode = '22023', message = 'invalid_message';
  end if;

  if p_language not in ('fa', 'en') then
    raise exception using errcode = '22023', message = 'invalid_language';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select m.id, m.status, m.created_at, to_jsonb(c)
    into v_existing_message_id, v_existing_status, v_existing_created_at, v_conversation
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where c.user_id = v_user_id
      and m.request_id = p_request_id
      and m.role = 'user';

  if v_existing_message_id is not null then
    if v_existing_status = 'completed' then
      return jsonb_build_object(
        'duplicate', true,
        'in_progress', false,
        'conversation', v_conversation,
        'user_message_id', v_existing_message_id
      );
    end if;

    if v_existing_status = 'pending' and v_existing_created_at > now() - interval '90 seconds' then
      return jsonb_build_object(
        'duplicate', true,
        'in_progress', true,
        'conversation', v_conversation,
        'user_message_id', v_existing_message_id
      );
    end if;

    update public.messages
    set status = 'pending', created_at = now()
    where id = v_existing_message_id;

    return jsonb_build_object(
      'duplicate', false,
      'retry', true,
      'in_progress', false,
      'conversation', v_conversation,
      'user_message_id', v_existing_message_id
    );
  end if;

  select count(*)
  into v_recent_count
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where c.user_id = v_user_id
    and m.role = 'user'
    and m.created_at > now() - interval '1 minute';

  if v_recent_count >= 10 then
    raise exception using errcode = 'P0001', message = 'rate_limit_exceeded';
  end if;

  if p_conversation_id is null then
    v_title := left(regexp_replace(btrim(p_message), '[[:space:]]+', ' ', 'g'), 60);
    insert into public.conversations (user_id, title, language, last_message_at)
    values (v_user_id, v_title, p_language, now())
    returning id into v_conversation_id;
  else
    select c.id into v_conversation_id
    from public.conversations c
    where c.id = p_conversation_id and c.user_id = v_user_id;

    if v_conversation_id is null then
      raise exception using errcode = 'P0002', message = 'conversation_not_found';
    end if;
  end if;

  insert into public.messages (conversation_id, request_id, role, content, status)
  values (v_conversation_id, p_request_id, 'user', btrim(p_message), 'pending')
  returning id into v_user_message_id;

  update public.conversations
  set last_message_at = now(), language = p_language
  where id = v_conversation_id;

  select to_jsonb(c) into v_conversation
  from public.conversations c
  where c.id = v_conversation_id;

  return jsonb_build_object(
    'duplicate', false,
    'retry', false,
    'in_progress', false,
    'conversation', v_conversation,
    'user_message_id', v_user_message_id
  );
end;
$$;

create or replace function public.complete_chat_request(
  p_user_id uuid,
  p_conversation_id uuid,
  p_request_id uuid,
  p_answer text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := p_user_id;
  v_assistant_message_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '22023', message = 'invalid_user';
  end if;

  if p_answer is null or char_length(btrim(p_answer)) < 1 or char_length(p_answer) > 20000 then
    raise exception using errcode = '22023', message = 'invalid_answer';
  end if;

  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id and user_id = v_user_id
  ) then
    raise exception using errcode = 'P0002', message = 'conversation_not_found';
  end if;

  update public.messages
  set status = 'completed'
  where conversation_id = p_conversation_id
    and request_id = p_request_id
    and role = 'user';

  insert into public.messages (conversation_id, request_id, role, content, status)
  values (p_conversation_id, p_request_id, 'assistant', btrim(p_answer), 'completed')
  on conflict (conversation_id, request_id, role)
  do update set content = excluded.content, status = 'completed'
  returning id into v_assistant_message_id;

  update public.conversations
  set last_message_at = now()
  where id = p_conversation_id;

  return v_assistant_message_id;
end;
$$;

create or replace function public.fail_chat_request(
  p_user_id uuid,
  p_conversation_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'invalid_user';
  end if;

  update public.messages m
  set status = 'failed'
  from public.conversations c
  where m.conversation_id = c.id
    and c.id = p_conversation_id
    and c.user_id = p_user_id
    and m.request_id = p_request_id
    and m.role = 'user';
end;
$$;

revoke all on function public.begin_chat_request(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_chat_request(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.fail_chat_request(uuid, uuid, uuid) from public, anon, authenticated;

grant execute on function public.begin_chat_request(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.complete_chat_request(uuid, uuid, uuid, text) to service_role;
grant execute on function public.fail_chat_request(uuid, uuid, uuid) to service_role;

comment on table public.conversations is 'Private chat sessions. The conversation UUID is the chatbot session identifier.';
comment on table public.messages is 'User and assistant messages stored under an owned conversation.';
comment on function public.begin_chat_request is 'Atomically validates ownership, enforces per-user burst limits, and stores a pending user message.';
