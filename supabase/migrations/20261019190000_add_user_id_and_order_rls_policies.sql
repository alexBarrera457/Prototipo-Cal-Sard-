-- =================================================================
-- Migration: 20261019190000_add_user_id_and_order_rls_policies.sql
-- Description: Añadir user_id a orders, real_weight_grams a order_items y políticas RLS completas
-- Reference: Issues #71 and #72 - Cal Sardà
-- =================================================================

-- 1. Añadir user_id e índices a 'orders'
alter table public.orders
    add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_orders_user_id on public.orders(user_id);

-- 2. Añadir real_weight_grams a 'order_items' para registro de pesaje en báscula
alter table public.order_items
    add column if not exists real_weight_grams numeric(10, 2);

-- 3. Políticas de lectura (SELECT) en 'orders'
-- Usuarios autenticados pueden ver sus propios pedidos (por user_id o email coincidente) o si son administradores
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Authenticated users can view own orders" on public.orders;
create policy "Users can view own orders"
    on public.orders
    for select
    to authenticated
    using (
        auth.uid() = user_id
        or customer_email = (auth.jwt() ->> 'email')
        or exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Permitir a usuarios anon leer pedidos recientes (para confirmación tras INSERT o consulta inmediata)
drop policy if exists "Anon can view recent orders" on public.orders;
create policy "Anon can view recent orders"
    on public.orders
    for select
    to anon
    using (
        created_at >= now() - interval '1 hour'
    );

-- 4. Políticas de actualización (UPDATE) en 'orders' para administradores
drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
    on public.orders
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

-- 5. Políticas de lectura (SELECT) en 'order_items'
drop policy if exists "Users and admins can view order items" on public.order_items;
create policy "Users and admins can view order items"
    on public.order_items
    for select
    to authenticated
    using (
        exists (
            select 1 from public.orders
            where orders.id = order_items.order_id
            and (
                orders.user_id = auth.uid()
                or orders.customer_email = (auth.jwt() ->> 'email')
                or exists (
                    select 1 from public.profiles
                    where profiles.id = auth.uid()
                    and profiles.role = 'admin'
                )
            )
        )
    );

drop policy if exists "Anon can view recent order items" on public.order_items;
create policy "Anon can view recent order items"
    on public.order_items
    for select
    to anon
    using (
        created_at >= now() - interval '1 hour'
    );

-- 6. Políticas de actualización (UPDATE) en 'order_items' para administradores
drop policy if exists "Admins can update order items" on public.order_items;
create policy "Admins can update order items"
    on public.order_items
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
