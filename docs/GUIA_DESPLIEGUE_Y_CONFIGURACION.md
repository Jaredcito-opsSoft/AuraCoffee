# 🛠️ BrewDesk — Guía de Configuración, Base de Datos y Despliegue

Esta guía describe el procedimiento paso a paso para configurar el entorno de desarrollo, inicializar la base de datos PostgreSQL en Supabase, ejecutar migraciones y desplegar **BrewDesk** en producción (Vercel + Railway / Render).

---

## 📑 Tabla de Contenidos

1. [Requisitos Previos](#1-requisitos-previos)
2. [Configuración de Variables de Entorno](#2-configuración-de-variables-de-entorno)
3. [Configuración de Supabase (PostgreSQL)](#3-configuración-de-supabase-postgresql)
4. [Migraciones y Carga de Datos Iniciales (Seeders)](#4-migraciones-y-carga-de-datos-iniciales-seeders)
5. [Ejecución en Entorno Local](#5-ejecución-en-entorno-local)
6. [Despliegue a Producción](#6-despliegue-a-producción)
   - [Despliegue del Frontend (Vercel)](#despliegue-del-frontend-vercel)
   - [Despliegue de la API (Railway o Render)](#despliegue-de-la-api-railway-o-render)
7. [Solución de Problemas Comunes (FAQ)](#7-solución-de-problemas-comunes-faq)

---

## 1. Requisitos Previos

Asegúrate de contar con las siguientes herramientas instaladas en tu equipo:

- **Node.js**: Versión 20.x o superior (`node -v`)
- **pnpm**: Versión 9.x o superior (`pnpm -v`)
- **Git**: Versión 2.30+ (`git -v`)
- **Cuenta en Supabase**: [https://supabase.com](https://supabase.com) (el plan gratuito es suficiente)

---

## 2. Configuración de Variables de Entorno

El proyecto incluye una plantilla `.env.example` en la raíz. Para configurar ambos proyectos:

### Paso 1: Variables de la API Backend (`apps/api/.env`)
Copia `.env.example` dentro de `apps/api/.env`:

```env
PORT=3001
NODE_ENV=development

# Supabase PostgreSQL (Settings -> Database -> Connection string)
# Connection Pooling (puerto 6543 o pgbouncer):
DATABASE_URL="postgresql://postgres:[TU-PASSWORD]@db.[TU-PROJECT-ID].supabase.co:5432/postgres?pgbouncer=true"

# Direct URL (necesaria para migraciones de Prisma, puerto 5432 directo):
DIRECT_URL="postgresql://postgres:[TU-PASSWORD]@db.[TU-PROJECT-ID].supabase.co:5432/postgres"

# Supabase API (Settings -> API)
SUPABASE_URL="https://[TU-PROJECT-ID].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# JWT Secreto para tokens de sesión
JWT_SECRET="brewdesk_super_secret_key_cafeteria_2026_production_change_me"
JWT_EXPIRES_IN="8h"
```

### Paso 2: Variables del Frontend (`apps/web/.env`)
Copia `.env.example` dentro de `apps/web/.env`:

```env
# Variables públicas consumidas por Vite (prefijo VITE_)
VITE_SUPABASE_URL="https://[TU-PROJECT-ID].supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_API_URL="http://localhost:3001"
```

---

## 3. Configuración de Supabase (PostgreSQL)

1. Inicia sesión en [Supabase Console](https://app.supabase.com) y crea un nuevo proyecto (ej. `brewdesk-production`).
2. Guarda de inmediato la contraseña de la base de datos asignada.
3. Ve a **Project Settings** -> **Database** y copia la cadena de conexión en modo **Session / Direct** (`DIRECT_URL`) y en modo **Transaction Pooler** (`DATABASE_URL`).
4. Ve a **Project Settings** -> **API** y copia tu `URL`, `anon public key` y `service_role secret`.

---

## 4. Migraciones y Carga de Datos Iniciales (Seeders)

Una vez configurado `apps/api/.env`:

```bash
# 1. Generar los tipos de Prisma Client
pnpm db:generate

# 2. Aplicar la migración inicial a Supabase
pnpm db:migrate

# 3. Cargar datos maestros iniciales (Categorías, Productos, Insumos, Recetas, Usuarios, Caja)
pnpm db:seed
```

### ¿Qué datos genera el Seeder (`prisma/seed.ts`)?
- **Usuarios de prueba:**
  - `admin@brewdesk.com` (Rol: Administrador | PIN: `1234`)
  - `gerente@brewdesk.com` (Rol: Gerente | PIN: `2345`)
  - `cajero@brewdesk.com` (Rol: Cajero | PIN: `3456`)
  - `barista@brewdesk.com` (Rol: Barista | PIN: `4567`)
  - `mesero@brewdesk.com` (Rol: Mesero | PIN: `5678`)
- **Cajas:** `CAJA-01` (Caja Mostrador Principal).
- **Mesas:** 8 mesas distribuidas entre Salón Interior y Terraza.
- **Catálogo:** Categorías (Café Caliente, Café Frío, Repostería, Métodos de Extracción), productos insignia (Flat White, Espresso, Cold Brew, V60, Croissant de Almendras) con variantes por tamaño (8oz, 12oz, 16oz) y modificadores (Leche de Avena, Almendra, Jarabes Monin, Extra Shot).
- **Insumos & Recetas (BOM):** Café de especialidad Chiapas lavado, leches, vasos compostables y recetas enlazadas.

---

## 5. Ejecución en Entorno Local

Puedes iniciar ambos servidores concurrentemente o en terminales independientes:

```bash
# Opción A: Iniciar ambos servicios en paralelo
pnpm dev

# Opción B: Iniciar en terminales independientes
# Terminal 1: Backend API (Puerto 3001 con hot-reload)
pnpm dev:api

# Terminal 2: Frontend Web (Puerto 5173 con Vite HMR)
pnpm dev:web
```

Abre tu navegador en:
- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **API Health:** [http://localhost:3001/api/auth/me](http://localhost:3001/api/auth/me)

> **Nota:** Si ejecutas solo `pnpm dev:web`, el frontend detectará que la API no está encendida y activará automáticamente el **Modo Demo**, permitiéndote probar la interfaz, el POS y el KDS con datos simulados sin configurar bases de datos.

---

## 6. Despliegue a Producción

### Despliegue del Frontend (Vercel)
1. Conecta tu repositorio de GitHub a [Vercel](https://vercel.com).
2. Configuración del proyecto:
   - **Root Directory:** `apps/web`
   - **Framework Preset:** `Vite`
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
3. Variables de Entorno en Vercel:
   - `VITE_API_URL`: URL de tu backend en producción (ej. `https://api.brewdesk.tuempresa.com`).
   - `VITE_SUPABASE_URL`: Tu URL de Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Tu clave anónima de Supabase.

### Despliegue de la API (Railway o Render)
1. En [Railway](https://railway.app) o [Render](https://render.com), crea un nuevo servicio web vinculado al repositorio.
2. Configuración:
   - **Root Directory:** `apps/api`
   - **Build Command:** `pnpm install && pnpm build && pnpm db:generate`
   - **Start Command:** `node dist/main.js`
3. Configura las variables de entorno en el panel (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `NODE_ENV=production`).
4. Ejecuta las migraciones de producción una sola vez: `pnpm db:migrate:prod`.

---

## 7. Solución de Problemas Comunes (FAQ)

### Error: `Can't reach database server at ... 5432`
- **Causa:** Conexión bloqueada o timeout de Supabase.
- **Solución:** Verifica que `DATABASE_URL` use el puerto de connection pooling (6543 o con flag `?pgbouncer=true`) y `DIRECT_URL` use el puerto 5432. Verifica que tu IP no esté restringida en la sección de Network Restrictions de Supabase.

### Error: `P3005: The database schema is not empty`
- **Solución:** Si la base de datos ya contiene tablas creadas manualmente, ejecuta `pnpm db:push` en lugar de `pnpm db:migrate` para sincronizar el esquema.

### ¿Puedo probar la aplicación sin internet ni cuenta de Supabase?
- **Sí.** Inicia únicamente `pnpm dev:web` y utiliza el **Modo Demo** integrado que funciona con memoria local y datos precargados.
