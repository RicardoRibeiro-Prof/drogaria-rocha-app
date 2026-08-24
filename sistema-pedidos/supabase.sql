create table if not exists public.pedidos_produtos (
  id uuid primary key default gen_random_uuid(),
  produto text not null check (char_length(produto) between 2 and 120),
  quantidade integer not null check (quantidade between 1 and 9999),
  prioridade text not null default 'normal' check (prioridade in ('alta','normal','baixa')),
  fornecedor text,
  observacao text,
  status text not null default 'anotado' check (status in ('anotado','pedido','recebido')),
  criado_por text not null,
  criado_por_id uuid references auth.users(id),
  pedido_por text,
  pedido_em timestamptz,
  recebido_por text,
  recebido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pedidos_produtos enable row level security;
grant select, insert, update, delete on public.pedidos_produtos to anon, authenticated;

create policy "Equipe pode visualizar pedidos" on public.pedidos_produtos for select to anon, authenticated using (true);
create policy "Equipe pode anotar produtos" on public.pedidos_produtos for insert to anon, authenticated with check (criado_por in ('Ricardo','Farmacêutica','Jonas','Nilza'));
create policy "Equipe pode atualizar pedidos" on public.pedidos_produtos for update to anon, authenticated using (true) with check (true);
create policy "Equipe pode excluir anotacoes" on public.pedidos_produtos for delete to anon, authenticated using (true);

create or replace function public.atualizar_data_pedido() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger atualizar_data_pedido before update on public.pedidos_produtos for each row execute function public.atualizar_data_pedido();
create index if not exists pedidos_produtos_status_idx on public.pedidos_produtos(status);
create index if not exists pedidos_produtos_created_at_idx on public.pedidos_produtos(created_at desc);
