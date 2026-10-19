-- =================================================================
-- Migration: 20261019210000_create_coupons_giftcards_stockalerts.sql
-- Description: Tablas relacionales y políticas RLS para cupones, tarjetas regalo y alertas de stock
-- Reference: Issue #74 - Cal Sardà
-- =================================================================

-- 1. Tabla 'coupons'
create table if not exists public.coupons (
    id text primary key,
    code text not null unique,
    description text not null default '',
    discount_type text not null check (discount_type in ('percentage', 'fixed')),
    discount_value numeric(10, 2) not null check (discount_value >= 0),
    min_purchase numeric(10, 2) not null default 0 check (min_purchase >= 0),
    expires_at timestamp with time zone,
    is_active boolean not null default true,
    usage_count integer not null default 0 check (usage_count >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_coupons_active on public.coupons(is_active);

alter table public.coupons enable row level security;

-- Lectura pública para validación en checkout
drop policy if exists "Coupons are viewable by everyone" on public.coupons;
create policy "Coupons are viewable by everyone"
    on public.coupons
    for select
    to anon, authenticated
    using (true);

-- Modificación solo por administradores
drop policy if exists "Admins can manage coupons" on public.coupons;
create policy "Admins can manage coupons"
    on public.coupons
    for all
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

drop policy if exists "Service role has full access to coupons" on public.coupons;
create policy "Service role has full access to coupons"
    on public.coupons
    for all
    to service_role
    using (true)
    with check (true);


-- 2. Tabla 'gift_cards'
create table if not exists public.gift_cards (
    code text primary key,
    initial_balance numeric(10, 2) not null check (initial_balance >= 0),
    current_balance numeric(10, 2) not null check (current_balance >= 0),
    sender_name text not null,
    sender_email text,
    recipient_name text not null,
    recipient_email text not null,
    dedication text,
    delivery_date date,
    is_active boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_gift_cards_recipient on public.gift_cards(recipient_email);
create index if not exists idx_gift_cards_active on public.gift_cards(is_active);

alter table public.gift_cards enable row level security;

-- Lectura pública para validación y canje en checkout
drop policy if exists "Gift cards can be read for redemption" on public.gift_cards;
create policy "Gift cards can be read for redemption"
    on public.gift_cards
    for select
    to anon, authenticated
    using (true);

-- Permiso de inserción al comprar tarjetas regalo
drop policy if exists "Anyone can purchase gift cards" on public.gift_cards;
create policy "Anyone can purchase gift cards"
    on public.gift_cards
    for insert
    to anon, authenticated
    with check (true);

-- Actualización por administración o para canje
drop policy if exists "Admins or redemption can update gift cards" on public.gift_cards;
create policy "Admins or redemption can update gift cards"
    on public.gift_cards
    for update
    to anon, authenticated
    using (true)
    with check (true);

drop policy if exists "Service role has full access to gift_cards" on public.gift_cards;
create policy "Service role has full access to gift_cards"
    on public.gift_cards
    for all
    to service_role
    using (true)
    with check (true);


-- 3. Tabla 'stock_alerts'
create table if not exists public.stock_alerts (
    id text primary key,
    product_number text not null,
    product_name text not null,
    contact text not null,
    channel text not null check (channel in ('whatsapp', 'email')),
    customer_name text,
    status text not null default 'pending' check (status in ('pending', 'notified')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    notified_at timestamp with time zone
);

create index if not exists idx_stock_alerts_product on public.stock_alerts(product_number);
create index if not exists idx_stock_alerts_status on public.stock_alerts(status);

alter table public.stock_alerts enable row level security;

-- Cualquier usuario puede registrar una solicitud de aviso
drop policy if exists "Anyone can subscribe to stock alerts" on public.stock_alerts;
create policy "Anyone can subscribe to stock alerts"
    on public.stock_alerts
    for insert
    to anon, authenticated
    with check (true);

-- Solo administradores pueden ver y gestionar solicitudes de reposición
drop policy if exists "Admins can view and manage stock alerts" on public.stock_alerts;
create policy "Admins can view and manage stock alerts"
    on public.stock_alerts
    for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

drop policy if exists "Admins can update stock alerts" on public.stock_alerts;
create policy "Admins can update stock alerts"
    on public.stock_alerts
    for update
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

drop policy if exists "Service role has full access to stock_alerts" on public.stock_alerts;
create policy "Service role has full access to stock_alerts"
    on public.stock_alerts
    for all
    to service_role
    using (true)
    with check (true);
