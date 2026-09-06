create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_workspaces enable row level security;

-- Re-runnable for new or existing projects. Does not delete any workspace data.
drop policy if exists "Users can read their own workspace" on public.user_workspaces;
drop policy if exists "Users can create their own workspace" on public.user_workspaces;
drop policy if exists "Users can update their own workspace" on public.user_workspaces;
drop policy if exists "Users can delete their own workspace" on public.user_workspaces;

create policy "Users can read their own workspace"
on public.user_workspaces for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own workspace"
on public.user_workspaces for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own workspace"
on public.user_workspaces for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own workspace"
on public.user_workspaces for delete to authenticated
using (auth.uid() = user_id);
