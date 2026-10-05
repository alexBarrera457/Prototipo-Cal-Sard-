# Cal Sardà - Web Application

Núcleo de la aplicación web de comercio electrónico y presencia de marca de **Cal Sardà** (fundada en 1930).

## Tecnologías
- **Framework**: Angular 22 (Standalone Components, SSR con Node/Express)
- **Estado Reactivo**: Angular Signals (`signal`, `computed`)
- **Testing**: Vitest (`ng test`)
- **Estilos**: Vanilla CSS modular

## Estructura de la Aplicación
- `src/app/pages/`: Vistas principales (Inicio, Tienda Online, Historia, Checkout, Contacto).
- `src/app/components/`: Componentes reutilizables (Navbar, Footer, Store, ProductDetail, Hero).
- `src/app/services/`: Capa de servicios y adaptadores (Catálogo, Carrito).
- `src/app/shared/`: Utilidades compartidas (animaciones, scroll-reveal).

## Comandos de Ejecución
```bash
# Desarrollo con SSR
npm start

# Ejecutar suite de tests
npm test

# Compilación de producción
npm run build
```
