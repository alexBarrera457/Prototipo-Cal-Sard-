-- Migration: expand order statuses for store operations (Issue #41)
-- Allows operational statuses: recibido, en_preparacion, listo_recogida, enviado, entregado, cancelado

alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in (
    'recibido',
    'en_preparacion',
    'listo_recogida',
    'enviado',
    'entregado',
    'cancelado',
    'pending',
    'confirmed',
    'shipped',
    'cancelled'
  ));
