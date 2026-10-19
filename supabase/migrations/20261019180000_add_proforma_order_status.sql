-- Migration: allow proforma and presupuesto order statuses for B2B quotes (Issue #76)
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
    'proforma',
    'presupuesto',
    'pending',
    'confirmed',
    'shipped',
    'cancelled'
  ));
