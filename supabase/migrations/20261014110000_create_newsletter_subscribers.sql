-- =================================================================
-- Migration: 20261014110000_create_newsletter_subscribers.sql
-- Description: Crear tabla newsletter_subscribers con RLS para gestión de boletín
-- Reference: Issue #26 - Cal Sardà
-- =================================================================

-- 1. Tabla de suscriptores al boletín
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text NOT NULL UNIQUE,
    confirmed boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice único y de búsqueda por email
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 3. Permitir a usuarios anónimos y autenticados insertar o renovar su suscripción
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
    ON public.newsletter_subscribers
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 4. Acceso completo administrativo para 'service_role' (sincronización con email marketing)
DROP POLICY IF EXISTS "Service role has full access to newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Service role has full access to newsletter_subscribers"
    ON public.newsletter_subscribers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
