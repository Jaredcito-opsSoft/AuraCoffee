# ☕ BrewDesk — Sistema Integral de Gestión y Control de Cafeterías

> **Sistema de Punto de Venta (POS), Pantalla de Barista (KDS), Inventario con Recetas (BOM/Kardex) y Control de Caja para Cafeterías de Especialidad.**  
> Desarrollado como un Monorepo robusto con **React 19, Express 5, Prisma 6, PostgreSQL (Supabase) y Tailwind CSS v4**.

---

## 📚 Documentación Técnica y Operativa Completa

Toda la documentación detallada del proyecto se encuentra disponible en la carpeta [`docs/`](./docs/):

| Documento | Descripción |
|---|---|
| 📐 [**Arquitectura y Funcionamiento Técnico**](./docs/ARQUITECTURA_Y_FUNCIONAMIENTO.md) | Explicación exhaustiva de la arquitectura monorepo, modelo de datos de 11 entidades, reglas financieras en centavos, catálogo de endpoints REST y flujos de datos. |
| 🚀 [**Visión y Especificación de la Fase Terminada**](./docs/VISION_FASE_TERMINADA.md) | Detalle del sistema al 100%: hardware ESC/POS, timbrado fiscal CFDI 4.0, pedidos QR en mesa, multi-sucursal, CRM con Apple/Google Wallet, PWA offline y roadmap. |
| 🛠️ [**Guía de Configuración, BD y Despliegue**](./docs/GUIA_DESPLIEGUE_Y_CONFIGURACION.md) | Paso a paso para configurar Supabase, variables `.env`, migraciones Prisma, seeders y despliegue a producción en Vercel y Railway. |
| 📖 [**Manual de Usuario y Roles Operativos**](./docs/MANUAL_DE_USUARIO_Y_ROLES.md) | Guía de uso para cada perfil del equipo: Administrador, Gerente, Cajero (apertura y corte de caja), Barista (KDS) y Mesero. |

---

## 🗂️ Estructura del Monorepo

```
Sistema de Gestión y Control de Cafeterías/
├── apps/
│   ├── api/                      # Backend: Node.js + Express 5 + Prisma 6 + Supabase
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Modelado relacional PostgreSQL (11 entidades)
│   │   │   └── seed.ts           # Datos iniciales para pruebas y puesta en marcha
│   │   └── src/                  # Módulos: auth, cash, customers, dashboard, inventory, orders, products, sales
│   └── web/                      # Frontend: React 19 + Vite 6 + Tailwind CSS v4 + Zustand v5
│       └── src/
│           ├── components/       # Layout, Navbar y Sidebar
│           ├── lib/              # API Client (con fallback automático a MockData)
│           ├── pages/            # POS táctil, KDS, Caja, Inventario, Productos, Dashboard, Login
│           ├── store/            # Gestión de estado global Zustand (auth, cart, kds)
│           └── styles/           # Sistema de diseño BrewDesk (#0F0C08, #D97706, #FDF8F0)
├── docs/                         # Documentación técnica, visión terminada y manuales
├── .env.example                  # Plantilla de variables de entorno
├── .gitignore                    # Reglas de exclusión para control de versiones
├── package.json                  # Scripts orquestadores del monorepo
├── pnpm-workspace.yaml           # Configuración de workspaces de pnpm
└── README.md                     # Portal de bienvenida y guía rápida
```

---

## ⚡ Inicio Rápido (Quickstart)

### Prerrequisitos
- **Node.js**: 20+
- **pnpm**: 9+
- **PostgreSQL / Supabase**: Cuenta activa en [supabase.com](https://supabase.com) (o utiliza el **Modo Demo** sin BD para pruebas rápidas).

### 1. Instalación de Dependencias

```bash
pnpm install
```

### 2. Configuración de Variables de Entorno

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env
```
*Edita `apps/api/.env` con tus credenciales de PostgreSQL/Supabase.*

### 3. Base de Datos (Migraciones y Semilla)

```bash
# Generar cliente tipado de Prisma
pnpm db:generate

# Aplicar esquema a la base de datos
pnpm db:migrate

# Cargar catálogo de especialidad, insumos, recetas y usuarios
pnpm db:seed
```

### 4. Ejecución en Desarrollo

```bash
# Iniciar ambos servicios en paralelo (API en :3001 y Web en :5173):
pnpm dev

# O de forma individual:
pnpm dev:api   # Backend Express 5
pnpm dev:web   # Frontend React 19
```

> **💡 Modo Demo Integrado:** Si ejecutas únicamente `pnpm dev:web`, el frontend detectará que la API no está en línea y activará automáticamente el modo demo local con persistencia en `localStorage`, permitiéndote explorar el POS, KDS y Caja sin configurar bases de datos.

---

## 🔐 Usuarios y Credenciales de Prueba

Al ejecutar `pnpm db:seed` se crean los siguientes usuarios de prueba:

| Rol | Correo Electrónico | Contraseña | PIN Rápido |
|---|---|---|:---:|
| **Administrador** | `admin@brewdesk.com` | `Admin1234!` | `1234` |
| **Gerente** | `gerente@brewdesk.com` | `Gerente1234!` | `2345` |
| **Cajero** | `cajero@brewdesk.com` | `Cajero1234!` | `3456` |
| **Barista** | `barista@brewdesk.com` | `Barista1234!` | `4567` |
| **Mesero** | `mesero@brewdesk.com` | `Mesero1234!` | `5678` |

---

## 🔑 Principios de Arquitectura Críticos

1. **Moneda en Centavos Enteros (`Int`):** Todos los cálculos monetarios se realizan en centavos para eliminar problemas de precisión de punto flotante IEEE 754.
2. **Folios Consecutivos Atómicos:** Concurrencia segura mediante `FolioCounter` con transacciones de base de datos para folios `TKT-xxxx` y `CMD-xxxx`.
3. **Kardex Inmutable:** El historial de movimientos de inventario (`inventory_movements`) es contablemente inmutable (solo inserciones).
4. **Descuento de Recetas BOM en Tiempo Real:** Al confirmar una venta, la base de datos descuenta los insumos exactos (gr, ml, pza) de la receta y modificadores en la misma transacción.
5. **KDS en Tiempo Real:** Las comandas aparecen al instante en la pantalla del barista con cronómetros y alertas de tiempo.

---

## 📦 Scripts Disponibles

```bash
pnpm dev             # Inicia API y Web concurrentemente
pnpm dev:api         # Servidor backend con recarga automática
pnpm dev:web         # Frontend con Vite HMR
pnpm build           # Compilación de producción de ambas aplicaciones
pnpm db:generate     # Genera Prisma Client
pnpm db:migrate      # Aplica migraciones pendientes
pnpm db:seed         # Carga datos de prueba
pnpm db:studio       # Panel visual de Prisma Studio
```

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia ISC.
