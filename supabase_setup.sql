-- Crush Affi — Setup Supabase
-- Colle ce SQL dans l'éditeur SQL de Supabase et clique Run

create table if not exists affiliates (
  id text primary key,
  data jsonb not null default '{}'
);

create table if not exists links (
  id text primary key,
  data jsonb not null default '{}'
);

create table if not exists clicks (
  id text primary key,
  data jsonb not null default '{}'
);

create table if not exists withdrawals (
  id text primary key,
  data jsonb not null default '{}'
);

create table if not exists earnings (
  id text primary key,
  data jsonb not null default '{}'
);

create table if not exists config (
  key text primary key,
  value text not null
);

insert into config (key, value) values ('adminPassword', 'Tiimeeo87')
  on conflict (key) do nothing;

-- Accès public en lecture/écriture (RLS désactivé pour simplicité)
alter table affiliates  disable row level security;
alter table links       disable row level security;
alter table clicks      disable row level security;
alter table withdrawals disable row level security;
alter table earnings    disable row level security;
alter table config      disable row level security;
