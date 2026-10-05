# Cal Sardà - Agent & Assistant Guidelines

Guía de desarrollo y contexto operativo para asistentes IA y desarrolladores en el repositorio de **Cal Sardà**.

## Visión General
Monorepo modular para Cal Sardà (comercio tradicional fundado en 1930):
- **Core Web**: Angular 22 (Standalone Components, SSR con Express).
- **Paquetes**: `@cal-sarda/domain` en `packages/domain/` para contratos y modelos compartidos.
- **Persistencia**: Supabase / PostgreSQL con migraciones en `supabase/migrations/`.
- **Estrategia & Medios**: `marketing/` y `videos/`.

## Comandos Esenciales
```bash
npm start           # Iniciar servidor de desarrollo con SSR (http://localhost:4200)
npm test            # Ejecutar suite de pruebas con Vitest
npm run build       # Compilar aplicación para producción
npx prettier -w .   # Formatear archivos con Prettier
```

## Principios de Arquitectura (Deep Modules)
Consulte las decisiones en `docs/adr/`:
- **Módulos Profundos**: Preferir interfaces pequeñas con implementaciones ricas. Ocultar detalles algorítmicos (búsquedas difusas, normalizaciones) dentro de los servicios.
- **Costuras y Adaptadores (Seams)**: Desacoplar APIs del navegador (`localStorage`, `window`) mediante adaptadores inyectables para garantizar pruebas unitarias limpias.
- **Componentes Reactivos Ligeros**: Utilizar Angular Signals (`signal`, `computed`). Evitar lógica de filtrado o transformación masiva dentro de los componentes visuales.
- **Inyección de Dependencias**: Toda dependencia de datos o persistencia debe recibirse mediante inyección (`inject()` o constructor), nunca a través de variables globales o funciones importadas directamente.

## Estructura de Directorios
```
├── app/             # Documentación y directrices de la aplicación web
├── docs/adr/        # Registro de decisiones de arquitectura (ADRs)
├── marketing/       # Campañas comerciales, SEO y redacción
├── packages/        # Paquetes compartidos (tipos de dominio y contratos)
│   └── domain/
├── public/          # Activos estáticos (imágenes de catálogo, iconos)
├── src/             # Código fuente de la aplicación Angular 22
│   ├── app/
│   │   ├── components/  # Componentes UI reutilizables
│   │   ├── pages/       # Vistas de ruta
│   │   ├── services/    # Servicios inyectables y lógica de negocio
│   │   └── shared/      # Directivas y utilidades visuales
├── supabase/        # Migraciones SQL y configuración de base de datos
└── videos/          # Producción de vídeo, guiones y recursos
```
