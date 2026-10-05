# 1. Estructura Modular Monorepo Pragmática

## Estado
Aceptado

## Contexto
Cal Sardà requiere organizar no solo el código de la tienda online (Angular 22), sino también paquetes de dominio compartidos, activos de vídeo y estrategias de marketing/contenido para su comercio centenario. Sin embargo, introducir herramientas complejas de monorepo como Nx o Turborepo añadiría sobrecarga innecesaria para la escala actual del equipo.

## Decisión
Adoptamos una estructura monorepo modular ligera basada en carpetas raíz y paquetes desacoplados:
- `app/`: Documentación y referencias del núcleo de la aplicación Angular.
- `packages/`: Paquetes TypeScript compartidos (`@cal-sarda/domain`) con tipos y contratos limpios.
- `videos/`: Guiones, storyboards y recursos para la creación de contenido audiovisual de marca.
- `marketing/`: Campañas estacionales, textos comerciales y optimización SEO.
- `supabase/`: Migraciones y esquemas de persistencia.

## Consecuencias
- Mantenemos los scripts nativos de Angular CLI (`npm start`, `npm test`) sin fricción ni capas adicionales de configuración.
- Los dominios y contratos quedan desacoplados de los componentes de la interfaz de usuario.
