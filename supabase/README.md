# Supabase Migrations & Database Setup

Este directorio gestiona la persistencia y migraciones de base de datos PostgreSQL de **Cal Sardà** utilizando Supabase.

## Estructura

- `migrations/`: Archivos SQL de migración versionados con timestamp (`YYYYMMDDHHMMSS_name.sql`).
- `seed.sql`: (Opcional) Datos iniciales del catálogo extraídos de `products-catalog.ts`.

## Comandos Útiles

```bash
# Iniciar Supabase localmente (requiere Docker)
npx supabase start

# Aplicar migraciones localmente
npx supabase db reset

# Crear nueva migración
npx supabase migration new <nombre_migracion>

# Enlazar con proyecto remoto
npx supabase link --project-ref <project-id>

# Aplicar migraciones a producción/remoto
npx supabase db push
```
