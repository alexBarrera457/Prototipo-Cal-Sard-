# 2. Arquitectura de Módulos Profundos (Deep Modules)

## Estado

Aceptado

## Contexto

El código inicial de la aplicación acumulaba funciones libres con variables globales para el catálogo (`products.ts`), interacción directa con `localStorage` y chequeos de navegador (`isPlatformBrowser`) dentro de la lógica del carrito (`cart.ts`), y lógica de filtrado/ordenación compleja dentro de los componentes visuales (`Store`). Esto hacía que los componentes fueran módulos superficiales (_shallow modules_) y dificultaba la realización de pruebas unitarias.

## Decisión

Aplicar la disciplina de **Módulos Profundos (_Deep Modules_)** y **Costuras con Adaptadores (_Seams & Adapters_)** inspirada en los principios de diseño de software:

1. **Encapsulamiento en Servicios Inyectables**: Convertir la lógica de catálogo a `ProductsService`, ocultando la búsqueda difusa, normalización y ordenación detrás de métodos concisos.
2. **Costura de Persistencia (_Seam_)**: Extraer la persistencia del carrito a una interfaz `CartStorageAdapter`. El servicio principal interactúa con la interfaz, mientras que las implementaciones concretas (`LocalStorageAdapter` para navegador y `InMemoryStorageAdapter` para SSR y tests) manejan la infraestructura.
3. **Componentes Delgados**: La interfaz gráfica (`Store`, `ShopPage`) reacciona a entradas y delega todo el cálculo al servicio.

## Consecuencias

- Interfaz pública pequeña con gran comportamiento interno (alta palanca).
- Testabilidad completa de servicios sin necesidad de emular el navegador en Vitest.

## Referencias

- Issue [#1](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/1): Desacoplar catálogo y crear ProductsService profundo con DI
- Issue [#2](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/2): Aislar persistencia tras adaptador CartStorageAdapter (Seam)
- Issue [#3](https://github.com/alexBarrera457/Prototipo-Cal-Sard-/issues/3): Simplificar componente Store delegando lógica de negocio
