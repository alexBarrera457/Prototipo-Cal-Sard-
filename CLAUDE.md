# Cal Sardà - Directrices Operativas para Agentes y Desarrolladores

Guía de desarrollo, contexto operativo y estándares de ingeniería para el repositorio de **Cal Sardà** (comercio tradicional y charcutería gourmet fundado en 1930 en Sant Quintí de Mediona).

## Context Pointers (Fuentes de Verdad)

- **Glosario de Dominio**: Consulte [`GLOSSARY.md`](./GLOSSARY.md) para terminología canónica de negocio (_Producto_, _Lote_, _Obrador_, _Cesta_, _Pedido_, _Cliente_).
- **Decisiones de Arquitectura (ADRs)**: Consulte [`docs/adr/`](./docs/adr/) antes de proponer cambios estructurales o de infraestructura.
  - [ADR 0001: Estructura Modular Monorepo](./docs/adr/0001-modular-monorepo-structure.md)
  - [ADR 0002: Arquitectura de Módulos Profundos](./docs/adr/0002-deep-modules-architecture.md)
  - [ADR 0003: Persistencia y Migraciones en Supabase](./docs/adr/0003-supabase-for-backend-and-migrations.md)
- **Contratos Compartidos**: Ubicados en [`packages/domain/src/index.ts`](./packages/domain/src/index.ts).

## Comandos Canónicos

Ejecutar siempre desde la raíz del monorepo:

```bash
npm start           # Iniciar servidor Angular en desarrollo con SSR (http://localhost:4200)
npm test            # Ejecutar suite de pruebas unitarias (Vitest, modo single-run)
npm run test:watch  # Ejecutar pruebas unitarias en modo interactivo/watch
npm run build       # Compilar aplicación cliente y servidor SSR en app/dist/
npm run format      # Formatear todo el repositorio con Prettier
npm run format:check# Verificar formato con Prettier
```

## Principios de Diseño de Código (Deep Modules & Seams)

1. **Módulos Profundos**: Diseñar interfaces públicas estrechas respaldadas por implementaciones ricas. Los servicios encapsulan la complejidad (búsqueda difusa, normalizaciones, ordenación); los componentes visuales permanecen delgados.
2. **Costuras y Adaptadores (Seams)**: Desacoplar llamadas a APIs del navegador (`localStorage`, `window`, `document`) mediante interfaces inyectables (`CartStorageAdapter`) con implementaciones diferenciadas para cliente y servidor/tests.
3. **Estado Reactivo con Signals**: Priorizar Angular Signals (`signal`, `computed`) para el estado reactivo local. Evitar suscripciones manuales a RxJS dentro de componentes cuando `toSignal` o `computed` sean suficientes.
4. **Inyección de Dependencias**: Inyectar servicios mediante `inject()` o constructores tipados. Evitar dependencias globales o instancias singleton no gestionadas.

## Ciclo de Trabajo y Verificación

Para cada tarea o cambio:

1. **Ramas descriptivas**: Crear ramas desde `master` con prefijo semántico: `feature/...`, `refactor/...`, `fix/...`, `docs/...`.
2. **Desarrollo guiado por pruebas (TDD)**: Escribir o actualizar las pruebas unitarias (`*.spec.ts`) antes o en paralelo con la lógica de negocio.
3. **Verificación local**:
   - `npm test` debe completar con 100% de tests pasando.
   - `npm run build` debe compilar sin errores de TypeScript ni empaquetado.
   - `npm run format:check` para validar formato de código.
4. **Commits y PRs convencionales**:
   - Mensajes con formato Conventional Commits: `<tipo>(<alcance>): <descripción> (closes #N)`.
   - Vincular y cerrar issues de GitHub con `gh issue close <id>` o mediante la palabra clave en el commit.
