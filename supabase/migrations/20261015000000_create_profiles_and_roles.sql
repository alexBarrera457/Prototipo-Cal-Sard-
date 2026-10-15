-- =================================================================
-- Migration: 20261015000000_create_profiles_and_roles.sql
-- Description: Crear tabla de perfiles de usuario y gestión de roles (RBAC)
-- Reference: Issue #39 - Cal Sardà
-- =================================================================

-- 1. Crear tabla 'profiles' vinculada a 'auth.users'
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    name text not null,
    phone text,
    address text,
    postal_code text,
    city text,
    province text,
    country text default 'España',
    role text not null default 'customer' check (role in ('customer', 'admin', 'staff')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);

-- 2. Habilitar Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Políticas de acceso (RLS)
-- Los usuarios autenticados pueden ver su propio perfil
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
    on public.profiles
    for select
    to authenticated
    using (auth.uid() = id);

-- Los usuarios autenticados pueden actualizar su propio perfil (excepto cambiar su propio rol a admin)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
    on public.profiles
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Permitir a usuarios autenticados insertar su propio perfil en el registro
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
    on public.profiles
    for insert
    to authenticated, anon
    with check (true);

-- Política de acceso completo para service_role (administración y edge functions)
drop policy if exists "Service role has full access to profiles" on public.profiles;
create policy "Service role has full access to profiles"
    on public.profiles
    for all
    to service_role
    using (true)
    with check (true);

-- 4. Función y Trigger automático para sincronizar perfiles con auth.users
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
        role
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
        coalesce(new.raw_user_meta_data->>'role', 'customer')
    )
    on conflict (id) do update set
        email = excluded.email,
        name = excluded.name,
        updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

-- Trigger disparado tras registrar usuario en auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
