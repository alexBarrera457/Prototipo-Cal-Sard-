# ==============================================================================
# Cal Sardà 1930 - Multi-stage Production Dockerfile for Angular 19+ SSR
# ==============================================================================

# --- Etapa 1: Construcción (Builder) ---
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias necesarias para compatibilidad en Alpine
RUN apk add --no-cache libc6-compat

# Copiar manifiestos de paquetes del monorepo para aprovechar la caché de Docker
COPY package*.json ./
COPY packages/domain/package*.json ./packages/domain/
COPY app/package*.json ./app/

# Instalar dependencias limpias
RUN npm ci

# Copiar el código fuente completo del monorepo
COPY . .

# Compilar paquetes compartidos y la aplicación Angular SSR
RUN npm run build

# --- Etapa 2: Entorno de Producción Ligero (Runner) ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Crear usuario sin privilegios para máxima seguridad en producción
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 calsarda

# Copiar únicamente los artefactos compilados de la aplicación (browser y server)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/app/dist/cal-sarda ./dist/cal-sarda

# Asignar permisos al usuario de ejecución
RUN chown -R calsarda:nodejs /app

USER calsarda

# Exponer el puerto del servidor SSR Express
EXPOSE 4000

# Endpoint de comprobación de salud para Docker y balanceadores
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Iniciar servidor Express SSR optimizado
CMD ["node", "dist/cal-sarda/server/server.mjs"]
