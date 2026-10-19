-- =================================================================
-- Migration: 20261019200000_extend_profiles_schema.sql
-- Description: Añadir direcciones múltiples, datos fiscales, preferencias de corte y favoritos en profiles
-- Reference: Issue #73 - Cal Sardà
-- =================================================================

-- 1. Añadir columnas jsonb y text[] a la tabla 'profiles'
alter table public.profiles
    add column if not exists addresses jsonb default '[]'::jsonb;

alter table public.profiles
    add column if not exists fiscal_data jsonb default '{}'::jsonb;

alter table public.profiles
    add column if not exists preferences jsonb default '{}'::jsonb;

alter table public.profiles
    add column if not exists favorites text[] default '{}'::text[];

-- 2. Actualizar el trigger automático 'handle_new_user' para sincronizar estas estructuras
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (
        id,
        email,
        name,
        phone,
        address,
        postal_code,
        city,
        province,
        country,
        role,
        addresses,
        fiscal_data,
        preferences,
        favorites
    ) values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'address',
        new.raw_user_meta_data->>'postalCode',
        new.raw_user_meta_data->>'city',
        new.raw_user_meta_data->>'province',
        coalesce(new.raw_user_meta_data->>'country', 'España'),
        coalesce(new.raw_user_meta_data->>'role', 'customer'),
        coalesce(new.raw_user_meta_data->'addresses', '[]'::jsonb),
        coalesce(new.raw_user_meta_data->'fiscalData', '{}'::jsonb),
        coalesce(new.raw_user_meta_data->'preferences', '{}'::jsonb),
        case
            when new.raw_user_meta_data->'favorites' is not null
            then array(select jsonb_array_elements_text(new.raw_user_meta_data->'favorites'))
            else '{}'::text[]
        end
    )
    on conflict (id) do update set
        email = excluded.email,
        name = excluded.name,
        addresses = coalesce(excluded.addresses, public.profiles.addresses),
        fiscal_data = coalesce(excluded.fiscal_data, public.profiles.fiscal_data),
        preferences = coalesce(excluded.preferences, public.profiles.preferences),
        favorites = coalesce(excluded.favorites, public.profiles.favorites),
        updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;
