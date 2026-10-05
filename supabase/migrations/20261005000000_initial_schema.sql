-- Initial schema for Cal Sardà
-- Enables UUID generation
create extension if not exists "uuid-ossp";

-- Categories table
create table if not exists public.categories (
    id uuid primary key default uuid_generate_v4(),
    slug text not null unique,
    label text not null,
    value text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Products table
create table if not exists public.products (
    id uuid primary key default uuid_generate_v4(),
    number text not null unique,
    name text not null,
    category_id uuid references public.categories(id) on delete set null,
    category_name text not null,
    description text not null default '',
    short_description text not null default '',
    price numeric(10, 2) not null check (price >= 0),
    price_label text,
    image text not null,
    images text[] default '{}',
    image_fit text default 'contain' check (image_fit in ('cover', 'contain')),
    source_url text,
    is_active boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Orders table
create table if not exists public.orders (
    id uuid primary key default uuid_generate_v4(),
    customer_name text not null,
    customer_email text not null,
    customer_phone text,
    shipping_address jsonb,
    status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'cancelled')),
    total numeric(10, 2) not null check (total >= 0),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Order items
create table if not exists public.order_items (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    product_name text not null,
    unit_price numeric(10, 2) not null check (unit_price >= 0),
    quantity integer not null check (quantity > 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index if not exists idx_products_category on public.products(category_name);
create index if not exists idx_products_number on public.products(number);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order on public.order_items(order_id);
