# 3. Supabase para Base de Datos y Migraciones SQL

## Estado

Aceptado

## Contexto

Cal Sardà requiere gestionar un catálogo dinámico de más de 200 referencias gourmet, categorías, gestión de pedidos y futuras integraciones con pasarelas de pago y clientes registrados. Almacenar los productos en un archivo estático en el frontend limita las capacidades transaccionales y de actualización en tiempo real.

## Decisión

Utilizar **Supabase (PostgreSQL)** como base de datos relacional y plataforma de backend:

1. Las migraciones se gestionan de forma declarativa y reproducible en `supabase/migrations/*.sql`.
2. Se definen esquemas relacionales para `categories`, `products`, `orders` y `order_items` con restricciones de integridad, UUIDs y tipos JSONB para direcciones y metadatos.
3. Se mantiene compatibilidad con ejecución local mediante Supabase CLI y Docker.

## Consecuencias

- Historial de cambios de esquema auditable en Git.
- Posibilidad de habilitar Row Level Security (RLS) y autenticación sin añadir servidores Node intermedios complejos.

## Referencias

- Issue [#5](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/5): Inicializar entorno de base de datos y migraciones en Supabase
