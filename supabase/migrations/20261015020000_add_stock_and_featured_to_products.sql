-- =================================================================
-- Migration: 20261015020000_add_stock_and_featured_to_products.sql
-- Description: Añadir campos de gestión de stock, destacados y alérgenos a la tabla products
-- Reference: Issue #42 - Cal Sardà
-- =================================================================

-- 1. Añadir columnas a public.products
alter table public.products
    add column if not exists in_stock boolean not null default true,
    add column if not exists featured boolean not null default false,
    add column if not exists allergens text[] default '{}';

-- 2. Índices para agilizar filtrados administrativos y de tienda
create index if not exists idx_products_in_stock on public.products(in_stock);
create index if not exists idx_products_featured on public.products(featured);

-- 3. Políticas RLS para administración y actualización de productos
-- Permitir a usuarios administradores y dependientes (staff) consultar todos los productos (activos o inactivos)
drop policy if exists "Admin and staff can view all products" on public.products;
create policy "Admin and staff can view all products"
    on public.products
    for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role in ('admin', 'staff')
        )
    );

-- Permitir a administradores y dependientes (staff) actualizar productos (stock, precio, descripciones, etc.)
drop policy if exists "Admin and staff can update products" on public.products;
create policy "Admin and staff can update products"
    on public.products
    for update
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role in ('admin', 'staff')
        )
    )
    with check (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role in ('admin', 'staff')
        )
    );
