-- =================================================================
-- Migration: 20261014100000_enable_rls_and_policies.sql
-- Description: Configurar Row Level Security (RLS) y políticas de acceso en Supabase
-- Reference: Issue #17 - Cal Sardà
-- =================================================================

-- 1. Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para 'categories'
-- Lectura pública para cualquier usuario (anónimo y autenticado)
-- Solo service_role o administradores pueden crear, modificar o eliminar categorías
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone"
    ON public.categories
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 3. Políticas para 'products'
-- Lectura pública para anon y authenticated únicamente si el producto está activo (is_active = true)
-- Denegar alteración de precios o creación de productos no autorizada
DROP POLICY IF EXISTS "Active products are viewable by everyone" ON public.products;
CREATE POLICY "Active products are viewable by everyone"
    ON public.products
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- 4. Políticas para 'orders'
-- Permitir a usuarios anónimos (anon) y autenticados insertar nuevos pedidos de encargo
-- Denegar acceso público para lectura, modificación o borrado de pedidos de otros clientes
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders"
    ON public.orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 5. Políticas para 'order_items'
-- Permitir a usuarios anónimos (anon) y autenticados insertar líneas de pedido asociadas
-- Denegar acceso público para lectura, modificación o borrado
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items"
    ON public.order_items
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 6. Políticas de acceso completo para 'service_role' (procesos administrativos y edge functions)
DROP POLICY IF EXISTS "Service role has full access to categories" ON public.categories;
CREATE POLICY "Service role has full access to categories"
    ON public.categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to products" ON public.products;
CREATE POLICY "Service role has full access to products"
    ON public.products
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to orders" ON public.orders;
CREATE POLICY "Service role has full access to orders"
    ON public.orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to order_items" ON public.order_items;
CREATE POLICY "Service role has full access to order_items"
    ON public.order_items
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
