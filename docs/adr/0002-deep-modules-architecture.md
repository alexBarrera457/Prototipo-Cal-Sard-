# 2. Arquitectura de Módulos Profundos (Deep Modules)

## Estado
Aceptado

## Contexto
El código inicial de la aplicación acumulaba funciones libres con variables globales para el catálogo (`products.ts`), interacción directa con `localStorage` y chequeos de navegador (`isPlatformBrowser`) dentro de la lógica del carrito (`cart.ts`), y lógica de filtrado/ordenación compleja dentro de los componentes visuales (`Store`). Esto hacía que los componentes fueran módulos superficiales (*shallow modules*) y dificultaba la realización de pruebas unitarias.

## Decisión
Aplicar la disciplina de **Módulos Profundos (*Deep Modules*)** y **Costuras con Adaptadores (*Seams & Adapters*)** inspirada en los principios de Matt Pocock:
1. **Encapsulamiento en Servicios Inyectables**: Convertir la lógica de catálogo a `ProductsService`, ocultando la búsqueda difusa, normalización y ordenación detrás de métodos concisos.
2. **Costura de Persistencia (*Seam*)**: Extraer la persistencia del carrito a una interfaz `CartStorageAdapter`. El servicio principal interactúa con la interfaz, mientras que las implementaciones concretas (`LocalStorageAdapter` para navegador y `InMemoryStorageAdapter` para SSR y tests) manejan la infraestructura.
3. **Componentes Delgados**: La interfaz gráfica (`Store`, `ShopPage`) reacciona a entradas y delega todo el cálculo al servicio.

## Consecuencias
- Interfaz pública pequeña con gran comportamiento interno (alta palanca).
- Testabilidad completa de servicios sin necesidad de emular el navegador en Vitest.
