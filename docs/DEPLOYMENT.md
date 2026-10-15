# Guía de Despliegue a Producción · Cal Sardà 1930

Esta guía describe el procedimiento integral para compilar, empaquetar y desplegar la plataforma de **Cal Sardà 1930** en entornos productivos bajo el dominio `calsarda.com`.

---

## 1. Arquitectura de Producción

La plataforma está diseñada con arquitectura modular en monorepo:

- **Frontend & SSR Server:** Aplicación Angular con Server-Side Rendering (SSR) y prerenderizado estático (SSG) servida mediante un servidor optimizado Node.js Express.
- **Base de Datos y Auth:** Supabase PostgreSQL relacional con políticas de seguridad a nivel de fila (Row Level Security - RLS).
- **Correos Transaccionales:** Proveedor de email API (Resend / SendGrid / Supabase Edge Functions) con plantillas bilingües (`ca`/`es`).
- **Pasarela de Pago:** Pagos seguros mediante tarjeta bancaria (SCA PSD2 / Luhn) y Bizum instantáneo.

```mermaid
flowchart TD
    DNS["DNS: calsarda.com"] --> LB["Reverse Proxy (Nginx / Cloudflare / Coolify)"]
    LB -->|HTTPS 443 -> HTTP 4000| DOCKER["Docker Container: calsarda-app"]
    subgraph DOCKER [Contenedor Docker (Node.js 22 Alpine)]
        SERVER["Express SSR Server (server/server.mjs)"]
        BROWSER["Assets Estáticos (/browser)"]
        HEALTH["Endpoint Salud (/health)"]
    end
    DOCKER -->|Persistencia| SUPABASE["Supabase PostgreSQL (Orders, Items, Products)"]
    DOCKER -->|Transaccional| RESEND["Resend API (Alertas Email Obrador & Cliente)"]
```

---

## 2. Variables de Entorno de Producción

Copia la plantilla `.env.production.example` a `.env.production` o configura los valores en el gestor de secretos de tu infraestructura:

| Variable                    | Tipo     | Descripción                            | Ejemplo / Valor por defecto     |
| --------------------------- | -------- | -------------------------------------- | ------------------------------- |
| `PORT`                      | Numérico | Puerto de escucha del servidor Express | `4000`                          |
| `NODE_ENV`                  | String   | Entorno de ejecución                   | `production`                    |
| `ALLOWED_HOSTS`             | String   | Dominios autorizados para mitigar SSRF | `calsarda.com,www.calsarda.com` |
| `SUPABASE_URL`              | URL      | URL del proyecto Supabase              | `https://xxxx.supabase.co`      |
| `SUPABASE_ANON_KEY`         | JWT      | Clave anónima pública de Supabase      | `eyJhbGci...`                   |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT      | Clave de servicio de administración    | `eyJhbGci...`                   |
| `RESEND_API_KEY`            | String   | API Key para envíos de correo          | `re_123456789...`               |
| `NOTIFICATION_STORE_EMAIL`  | Email    | Correo de aviso al obrador             | `sarda@calsarda.com`            |
| `NOTIFICATION_SENDER_EMAIL` | Email    | Correo remitente al cliente            | `pedidos@calsarda.com`          |
| `PAYMENT_GATEWAY_ENV`       | String   | Modo de pasarela                       | `production`                    |

---

## 3. Despliegue con Docker y Docker Compose (Recomendado)

### 3.1 Construir la Imagen de Producción

El `Dockerfile` utiliza una compilación multi-etapa (_multi-stage build_) sobre Alpine Linux para generar una imagen final ultraligera sin herramientas de desarrollo ni dependencias innecesarias:

```bash
docker build -t calsarda-app:latest .
```

### 3.2 Iniciar con Docker Compose

```bash
# Levantar el contenedor en segundo plano con reinicio automático
docker compose up -d --build

# Verificar logs de inicio
docker compose logs -f web
```

El servicio estará disponible en `http://localhost:4000`.

---

## 4. Configuración del Servidor Web Reverso (Nginx + SSL)

Para vincular el contenedor con el dominio oficial `calsarda.com` y emitir certificados SSL gratuitos con Let's Encrypt / Certbot:

```nginx
# /etc/nginx/sites-available/calsarda.com

server {
    listen 80;
    server_name calsarda.com www.calsarda.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name calsarda.com www.calsarda.com;

    ssl_certificate /etc/letsencrypt/live/calsarda.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/calsarda.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Compresión gzip para assets
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Endpoint de monitorización de salud
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        access_log off;
    }
}
```

---

## 5. Comprobación de Salud y Monitorización (Healthcheck)

El servidor expone el endpoint público de salud:

- `GET /health` o `GET /api/health`

### Respuesta de ejemplo (HTTP 200 OK):

```json
{
  "status": "healthy",
  "timestamp": "2026-10-15T20:10:00.000Z",
  "uptime": 1420.5,
  "app": "Cal Sardà 1930 - Obrador Artesà",
  "version": "2.0.0",
  "environment": "production"
}
```

Este endpoint está integrado en la instrucción `HEALTHCHECK` del `Dockerfile` y en `docker-compose.yml`, permitiendo la autorreparación automática en orquestadores como Docker Swarm, Kubernetes o Coolify.

---

## 6. Opciones de Despliegue Alternativas (Serverless / PaaS)

### 6.1 Vercel / Netlify

1. Conecta el repositorio de GitHub en el panel de Vercel.
2. Selecciona el framework **Angular**.
3. Configura el _Root Directory_ a la raíz del repositorio (`.`).
4. Añade las variables de entorno especificadas en la sección 2.
5. Vercel detectará el archivo de configuración SSR y desplegará las funciones serverless de renderizado dinámico automáticamente.

### 6.2 Coolify (PaaS Autoalojado)

1. Crea un nuevo servicio seleccionando **Docker Compose**.
2. Asigna el repositorio git y selecciona la rama `master`.
3. Introduce el dominio `calsarda.com` en los ajustes del servicio. Coolify gestionará automáticamente la emisión del certificado SSL con Traefik y los despliegues automáticos ante nuevos commits.
