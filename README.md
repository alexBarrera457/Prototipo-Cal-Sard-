# Cal Sardà — Plataforma E-Commerce & Catálogo Gastronómico

> Digitalización, catálogo interactivo y flujo Click & Collect para la charcutería y colmado centenario **Cal Sardà** (fundado en 1930 en Sant Quintí de Mediona, Barcelona).

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=flat-square&logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20RLS-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Unit%20Tests-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-45BA4B?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)

---

## 📌 Visión general del proyecto

Este proyecto nace de una experiencia laboral real como dependiente en Cal Sardà, trasladando las necesidades operativas de un comercio tradicional a una aplicación web moderna orientada al rendimiento, la accesibilidad y la escalabilidad.

- **Catálogo de +450 productos reales:** Clasificados por familias gastronómicas, alérgenos y formatos de venta (peso/unidad).
- **Cesta reactiva y pedidos Click & Collect:** Gestión de estado con Angular Signals y cálculo reactivo de totales e impuestos.
- **Configurador de Lotes Gourmet:** Creador de cestas de regalo personalizadas con validación de composición.
- **Arquitectura de Monorepo Modular:** Dominio desacoplado del framework mediante contratos compartidos en `@cal-sarda/domain`.

---

## 🏗️ Arquitectura y Decisiones Técnicas

El repositorio implementa principios de **Módulos Profundos (Deep Modules)** y patrones desacoplados documentados en registros de decisiones de arquitectura ([ADRs](./docs/adr/)):

1. **Separación Dominio/UI (`packages/domain`):** Entidades canónicas (_Producto_, _Lote_, _Cesta_, _Pedido_, _Cliente_) y reglas de negocio puras independientes del framework ([ADR 0001](./docs/adr/0001-modular-monorepo-structure.md)).
2. **Angular 22 + SSR en Express 5:** Renderizado en servidor para optimizar SEO y _First Contentful Paint_ (FCP), hidratación de datos y metadatos Open Graph / JSON-LD dinámicos ([ADR 0002](./docs/adr/0002-deep-modules-architecture.md)).
3. **Estado reactivo con Signals:** Sustitución de suscripciones RxJS complejas en vistas por primitivas `signal()` y `computed()`, mejorando la detección de cambios y el rendimiento en el navegador.
4. **Patrón Adapter / Seams:** Desacoplamiento de APIs del navegador (`localStorage`, cookies) mediante `CartStorageAdapter` para garantizar la compatibilidad entre SSR en Node y cliente.
5. **Persistencia y Seguridad en Supabase:** Esquema relacional con políticas de seguridad a nivel de fila (Row Level Security - RLS) ([ADR 0003](./docs/adr/0003-supabase-for-backend-and-migrations.md)).

---

## 📂 Estructura del Monorepo

```text
cal-sarda/
├── app/                    # Aplicación Angular 22 (Cliente & Servidor SSR)
│   ├── src/
│   │   ├── app/            # Componentes, vistas, servicios e inyectores
│   │   └── server.ts       # Servidor Express 5 SSR
├── packages/
│   └── domain/             # Módulo de dominio puro (@cal-sarda/domain)
├── docs/
│   └── adr/                # Architecture Decision Records (ADR 0001, 0002, 0003)
├── e2e/                    # Pruebas End-to-End con Playwright
├── supabase/               # Migraciones SQL, esquemas y políticas RLS
└── GLOSSARY.md             # Diccionario y lenguaje ubicuo del negocio
```

---

## 🚀 Puesta en marcha local

### Prerrequisitos

- Node.js 20+
- npm 10+

### Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/alexBarrera457/Prototipo-Cal-Sarda.git
cd Prototipo-Cal-Sarda

# 2. Instalar dependencias del monorepo
npm install

# 3. Iniciar servidor de desarrollo (con SSR en http://localhost:4200)
npm start
```

### Comandos de Calidad y Pruebas

```bash
npm test             # Ejecutar suite de pruebas unitarias con Vitest
npm run test:watch   # Pruebas unitarias en modo interactivo
npm run e2e          # Ejecutar suite E2E de Playwright (flujo de compra y admin)
npm run build        # Compilar bundles de cliente y servidor para producción
npm run format:check # Validar estándares de código con Prettier
```

---

## 👨‍💻 Autor

**Àlex Barrera Sardà**  
Desarrollador Web Junior | Estudiante de 2º DAW en Stucom Barcelona & Vinculado a Altia.

- Portfolio: [alexbarrera457.github.io](https://alexbarrera457.github.io)
- LinkedIn: [linkedin.com/in/àlex-barrera-sardà](https://www.linkedin.com/in/%C3%A0lex-barrera-sard%C3%A0-35b088397/)
