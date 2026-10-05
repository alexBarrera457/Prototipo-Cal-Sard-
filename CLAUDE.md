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

## Estructura de Directorios (Monorepo)

```
├── app/                 # Aplicación web Angular 22 (@cal-sarda/app)
│   ├── angular.json     # Configuración de compilación y SSR
│   ├── package.json     # Dependencias de la aplicación web
│   ├── public/          # Activos estáticos (catálogo, imágenes)
│   ├── src/             # Código fuente de componentes, páginas y servicios
│   └── tsconfig.json    # Configuración de TypeScript con path mapping
├── docs/adr/            # Registro de decisiones de arquitectura (ADRs)
├── marketing/           # Campañas comerciales, SEO y redacción
├── packages/            # Paquetes compartidos y contratos
│   └── domain/          # Modelos de dominio TypeScript (@cal-sarda/domain)
├── supabase/            # Migraciones SQL y configuración de base de datos
├── videos/              # Producción de vídeo, guiones y recursos
└── package.json         # Configuración raíz de npm workspaces
```
