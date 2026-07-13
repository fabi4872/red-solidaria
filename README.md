# Red Solidaria

Plataforma para conectar necesidades con personas que quieran ayudar. El primer
módulo (MVP) es el **tránsito colaborativo de animales**: alguien encuentra un
animal, lo registra, lo toma en tránsito y lo va pasando a otros cuidadores hasta
que encuentra hogar definitivo. Todo el historial de esa cadena queda registrado.

Las decisiones de arquitectura, el modelo de datos y las convenciones del
proyecto viven en [`CLAUDE.md`](./CLAUDE.md). **Leelo antes de tocar el código.**

## Stack

- **Next.js 16** (App Router, React 19, TypeScript) — web responsive, mobile-first.
- **Tailwind CSS 4** para los estilos.
- **PostgreSQL** vía **Prisma 7** (driver adapter `pg`, sin engine binario).
- **Supabase** — PostgreSQL gestionado + storage de fotos.

## Puesta en marcha

Requiere **Node.js 20.19+ / 22.13+** y npm.

```bash
# 1. Instalar dependencias (genera el cliente de Prisma automáticamente)
npm install

# 2. Configurar variables de entorno
cp .env.example .env
#    …y completar los valores desde el panel de Supabase (ver .env.example)

# 3. Levantar el entorno de desarrollo
npm run dev
```

Abrí http://localhost:3000. La app arranca sin credenciales de Supabase; solo las
vas a necesitar cuando se conecte la base de datos y el storage.

## Scripts

| Script                  | Qué hace                                         |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Servidor de desarrollo (Turbopack).              |
| `npm run build`         | Build de producción.                             |
| `npm run start`         | Sirve el build de producción.                    |
| `npm run lint`          | ESLint.                                          |
| `npm run prisma:generate` | Regenera el cliente de Prisma.                 |
| `npm run db:migrate`    | Aplica migraciones en desarrollo.                |
| `npm run db:studio`     | Abre Prisma Studio.                              |

## Estructura

```
prisma/
  schema.prisma        # Esquema de la base (todavía sin modelos)
prisma.config.ts       # Config del CLI de Prisma (usa DIRECT_URL para migraciones)
src/
  app/                 # Rutas y layout (App Router)
  components/          # Librería de componentes base reutilizables (vacía por ahora)
  lib/
    prisma.ts          # Singleton de Prisma con el adapter de Postgres
    supabase.ts        # Fábricas del cliente de Supabase (storage)
    messages.ts        # Único lugar de los textos que ve el usuario
  generated/prisma/    # Cliente de Prisma generado (no se versiona)
```

## Estado

En desarrollo — esqueleto del MVP. Sin modelo de datos ni pantallas todavía.
