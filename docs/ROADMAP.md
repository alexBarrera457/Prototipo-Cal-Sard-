# Cal Sardà — Hoja de Ruta (Roadmap) y Plan de Entrega

Documento de referencia para el plan de trabajo, backlog de issues en GitHub y estimaciones de tiempo para la entrega del proyecto **Cal Sardà** (fundado en 1930).

---

## 📌 ID de Conversación y Persistencia
- **Conversation ID en Antigravity**: `f560be43-1f54-43c3-850e-16b1aef2ddd1`
- **Ubicación de logs y transcripción**: `C:\Users\salex\.gemini\antigravity-cli\brain\f560be43-1f54-43c3-850e-16b1aef2ddd1\`
- **Repositorio GitHub**: [alexBarrera457/Prototipo-Cal-Sard-](https://github.com/alexBarrera457/Prototipo-Cal-Sard-)

---

## 🎯 Estrategia de Entrega en 2 Fases

### Escenario A: Catálogo Digital + Encargos Online (Click & Collect y Entrega)
- **Alcance**: Experiencia de compra completa con reserva online y pago al recoger en tienda (C/ Marina 237, Barcelona), Bizum o contra reembolso. Persistencia real en Supabase, notificaciones automáticas por email, cumplimiento legal RGPD/AEPD, rendimiento óptimo en Angular 22 SSR y cero advertencias de compilación.
- **Estimación**: ~10 – 12 horas con IA / 38 – 45 horas tradicionales (3 a 5 días laborables).

### Escenario B: E-Commerce 100% Autónomo con Cobro Online y Backoffice
- **Alcance**: Integración de pasarela de pago bancaria (TPV Virtual Redsýs / Bizum / Stripe), panel de administración para el personal de la tienda/obrador, generación de tickets/facturas simplificadas con desglose de IVA y despliegue a producción con dominio `calsarda.com`.
- **Estimación**: ~14 – 18 horas con IA / 55 – 80 horas tradicionales (1 a 2 semanas + trámites bancarios).

---

## 📋 Backlog de Issues Registrados en GitHub

### 🚀 1. Frontend & Rendimiento (Angular 22, SSR y Core Web Vitals)
- [Issue #10](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/10): `perf(routing): implementar lazy loading de componentes de ruta con loadComponent`
- [Issue #11](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/11): `perf(store): optimizar reactividad del catálogo migrando getters a Signals computados`
- [Issue #12](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/12): `fix(product-detail): corregir bucle iterativo al añadir múltiples unidades a la cesta`
- [Issue #13](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/13): `perf(ssr): aislar temporizador en HistoryBook para evitar bloqueo del renderizado en servidor`
- [Issue #14](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/14): `perf(images): migrar imágenes de catálogo a NgOptimizedImage y optimizar Core Web Vitals`
- [Issue #15](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/15): `feat(search): implementar debounce y cancelación de peticiones en búsqueda de cabecera`
- [Issue #33](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/33): `feat(accessibility): auditoría y mejoras a11y (focus management en modales y navegación por teclado)`

### 🗄️ 2. Base de Datos y Backend (Supabase)
- [Issue #16](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/16): `feat(db): generar script de seed SQL con el catálogo de productos y categorías`
- [Issue #17](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/17): `feat(db-security): configurar Row Level Security (RLS) y políticas de acceso en Supabase`
- [Issue #18](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/18): `feat(backend): implementar ProductsRepository con adaptador Supabase y fallback a catálogo estático`
- [Issue #19](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/19): `feat(orders): persistir pedidos de clientes en Supabase desde CheckoutPage`

### 🛒 3. E-Commerce, Dominio y Monorepo
- [Issue #20](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/20): `refactor(domain): consumir @cal-sarda/domain en la aplicación y sincronizar con GLOSSARY.md`
- [Issue #21](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/21): `feat(cart): enriquecer CartItem con identificador de producto e imagen para optimizar checkout`
- [Issue #22](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/22): `feat(catalog): soportar rutas semánticas individuales para productos (/tienda-online/producto/:slug)`
- [Issue #23](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/23): `feat(checkout): añadir validaciones avanzadas de formulario y cálculo estimativo de envíos`
- [Issue #24](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/24): `feat(i18n): habilitar catálogo y navegación bilingüe en Catalán y Español`

### 📣 4. Marketing, SEO y Contenido
- [Issue #25](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/25): `feat(seo): configurar Open Graph, Twitter Cards y marcado JSON-LD para comercio local`
- [Issue #26](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/26): `feat(marketing): integrar suscripción real al boletín mediante API o servicio de newsletter`
- [Issue #27](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/27): `feat(marketing): documentar catálogo de campañas estacionales y lotes en marketing/`
- [Issue #28](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/28): `feat(blog): implementar arquitectura de blog para artículos de gastronomía y recetas de obrador`

### 🧪 5. Testing, CI/CD y Calidad de Código
- [Issue #29](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/29): `ci: crear pipeline de GitHub Actions para tests, formato y compilación`
- [Issue #30](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/30): `test(pages): implementar tests unitarios e integración para páginas principales`
- [Issue #31](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/31): `test(e2e): configurar pruebas end-to-end con Playwright para el funnel de compra`
- [Issue #32](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/32): `chore(code-style): formatear el repositorio completo con Prettier y añadir pre-commit hook`

### 🔔 6. Notificaciones, Flujo de Encargo y Legal (Cierre Fase A)
- [Issue #34](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/34): `feat(notifications): envío de correos transaccionales de confirmación al cliente y a la tienda`
- [Issue #35](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/35): `feat(legal): banner de consentimiento de cookies conforme a RGPD y LSSI`
- [Issue #36](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/36): `feat(orders): vista de confirmación de encargo con código de referencia y detalles de recogida/entrega`

---

## 🛠️ Plan de Ejecución por Bloques (Fase A)
1. **Bloque 1 — Estabilidad inmediata y cero warnings**: #32 (Prettier), #10 (Lazy loading), #12 (Fix bucle cesta), #13 (SSR timer).
2. **Bloque 2 — Reactividad y Dominio**: #11 (Signals Store), #15 (Debounce), #20 (Dominio & Cesta), #21 (CartItem enriquecido).
3. **Bloque 3 — Persistencia**: #16 (Seed SQL), #17 (RLS Supabase), #18 (ProductsRepository), #19 (Guardar pedidos).
4. **Bloque 4 — Flujo de Encargo**: #23 (Validaciones checkout), #36 (Confirmación CS-XXXX), #34 (Emails transaccionales), #35 (Cookies), #24 (Catalán).
5. **Bloque 5 — QA & SEO**: #29 (CI Actions), #30 (Tests páginas), #31 (Playwright E2E), #25 (SEO & Schema).
