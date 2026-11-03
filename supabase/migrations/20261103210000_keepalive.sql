-- Free-tier Supabase projects are paused after 7 days without activity.
-- A daily scheduled call to this function (from Coolify) keeps the project awake
-- during the clinician test period. It reads no data.
-- Applied to the live project through the SQL editor on 2026-11-03.
create or replace function public.keepalive()
returns timestamptz
language sql
stable
set search_path = ''
as 'select now()';

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon;

comment on function public.keepalive() is 'Daily ping from Coolify so the free-tier project is not paused for inactivity. Reads no data.';
