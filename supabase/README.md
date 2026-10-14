# Supabase Migrations & Database Setup

Este directorio gestiona la persistencia y migraciones de base de datos PostgreSQL de **Cal Sardà** utilizando Supabase.

## Estructura

- `migrations/`: Archivos SQL de migración versionados con timestamp (`YYYYMMDDHHMMSS_name.sql`).
  - `20261005000000_initial_schema.sql`: Creación de extensiones y tablas `categories`, `products`, `orders` y `order_items`.
  - `20261014100000_enable_rls_and_policies.sql`: Habilitación de Row Level Security (RLS) y políticas de seguridad (lectura pública de categorías y productos activos, inserción anónima de pedidos, denegación de lectura/modificación de pedidos a terceros y acceso administrativo a `service_role`).
  - `20261014110000_create_newsletter_subscribers.sql`: Creación de tabla `newsletter_subscribers` con índice y RLS para suscripciones públicas al boletín.
- `seed.sql`: Catálogo completo oficial de categorías y 455 productos gourmet generado desde `products-catalog.ts`.

## Comandos Útiles

```bash
# Iniciar Supabase localmente (requiere Docker)
npx supabase start

# Aplicar migraciones y poblar seed.sql localmente
npx supabase db reset

# Regenerar seed.sql a partir del catálogo de la aplicación
npm run generate:seed

# Crear nueva migración
npx supabase migration new <nombre_migracion>

# Enlazar con proyecto remoto
npx supabase link --project-ref <project-id>

# Aplicar migraciones a producción/remoto
npx supabase db push
```
