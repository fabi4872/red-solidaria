# Estado actual

**Snapshot al 2026-07-16 · commit `4d67f79`.**

Este documento describe **qué existe realmente en el repositorio**, no qué está
planificado. Para lo planificado, ver [`../CLAUDE.md`](../CLAUDE.md).

> ### ⚠ Las decisiones aprobadas no son código
>
> El 2026-07-16 hubo **cuatro rondas documentales**. Se aprobaron veintisiete
> decisiones funcionales y arquitectónicas (identidad, traspaso de dos pasos, estados,
> disponibilidad como eje aparte, bitácora de eventos, RLS, historial auditable…) y se
> escribieron doce ADR. **Todo eso se escribió. Nada se implementó. Ninguna decisión
> cambió una sola línea de código.**
>
> El commit `4d67f79` es el mismo de antes de la primera ronda: el repositorio **no
> avanzó**. Lo único que cambió es que ahora está documentado hacia dónde va.
>
> Cuando este documento dice que algo está **aprobado**, quiere decir *decidido*.
> **No** quiere decir configurado, implementado ni probado.

> **Mantenimiento**: actualizá este archivo **en el mismo commit** que el código
> que lo cambia. Documentación de estado que se actualiza aparte es documentación
> que miente.

---

## Escala de madurez

Todo lo que sigue está clasificado con esta escala. La distinción no es
burocrática: **que exista código no significa que funcione**.

| Nivel | Significa |
| --- | --- |
| **Detectado** | El archivo o paquete está presente. Nada más. |
| **Configurado** | Está declarado y parametrizado de forma coherente, pero nunca se ejecutó. |
| **Implementado** | Hay código escrito que cumple una función del producto. |
| **Probado** | Se ejecutó y se observó el resultado esperado. |
| **Pendiente de comprobar** | Se asume que funciona, pero nadie lo verificó. |

**A la fecha, ningún elemento de este repositorio alcanzó el nivel "Probado".**

---

## Git

| Aspecto | Valor |
| --- | --- |
| Rama actual | `master` |
| Último commit | `4d67f79` — "Esqueleto inicial: Next.js + Prisma + Supabase configurados" (Fabian Salomone, 2026-07-13) |
| Commits totales | 2 (`bd15ac9` → `4d67f79`) |
| Archivos versionados | 25 |
| Árbol de trabajo | Limpio al momento del snapshot |

Presentes en disco pero **fuera de Git** (ignorados correctamente): `.env`,
`node_modules/`, `.next/`, `src/generated/`, `next-env.d.ts`.

---

## Stack y versiones

Versiones **instaladas** en `node_modules` (verificadas, no solo declaradas en
`package.json`):

| Paquete | Declarado | Instalado |
| --- | --- | --- |
| next | 16.2.10 | 16.2.10 |
| react / react-dom | 19.2.4 | 19.2.4 |
| prisma / @prisma/client | ^7.8.0 | 7.8.0 |
| @prisma/adapter-pg | ^7.8.0 | 7.8.0 |
| pg | ^8.22.0 | 8.22.0 |
| @supabase/supabase-js | ^2.110.3 | 2.110.3 |
| typescript | ^5 | 5.9.3 |
| tailwindcss | ^4 | 4.3.2 |
| eslint | ^9 | 9.39.5 |

**Entorno**: Node v22.12.0, npm 10.9.0. Lockfile `package-lock.json`
(`lockfileVersion: 3`), sin lockfiles competidores de yarn/pnpm.

**Configuración**: TypeScript en `strict: true`, `noEmit`,
`moduleResolution: bundler`, alias `@/*` → `./src/*`. Next con App Router.
`next.config.ts` está **vacío**. Tailwind 4 vía `postcss.config.mjs`.

---

## Estado de Prisma

| Aspecto | Nivel | Detalle |
| --- | --- | --- |
| `prisma/schema.prisma` | **Detectado** | Existe. 13 líneas: `generator` + `datasource` + comentarios. |
| Modelos de dominio | **Pendiente** | **Cero modelos.** Ninguna de las cuatro entidades del MVP existe. |
| `prisma.config.ts` | **Configurado** | Apunta el CLI a `DIRECT_URL` para migraciones. |
| Singleton `src/lib/prisma.ts` | **Implementado, sin usar** | Adapter `PrismaPg` con `DATABASE_URL`. Nadie lo importa. |
| Migraciones | **Pendiente** | No existe `prisma/migrations`. Nunca se corrió `prisma migrate`. |
| Conexión a una base real | **Pendiente de comprobar** | Nunca se intentó. |

El `datasource db` del schema **no declara `url`**, y eso es **intencional y
correcto** en Prisma 7: la URL la aportan `prisma.config.ts` (para el CLI) y el
driver adapter (para el runtime). Ver
[ADR 0002](decisiones/0002-supabase-prisma-conexiones.md).

El cliente generado se emite a `src/generated/prisma` (no a `node_modules`), está
en `.gitignore` y se regenera vía el script `postinstall`. El directorio existe en
disco, pero **al no haber modelos en el schema, ese cliente no expone ninguna
entidad**.

---

## Estado de Supabase

| Aspecto | Nivel | Detalle |
| --- | --- | --- |
| `@supabase/supabase-js` 2.110.3 | **Detectado** | Instalado. |
| `src/lib/supabase.ts` | **Implementado, sin usar** | Dos fábricas: `createSupabaseBrowserClient()` (anon key, respeta RLS) y `createSupabaseServiceClient()` (service role, salta RLS). |
| Uso en la aplicación | **Ninguno** | Verificado por búsqueda en todo `src/`: las únicas apariciones de `createSupabase*` son sus propias definiciones. |
| Proyecto Supabase | **Pendiente de comprobar** | No hay evidencia de que exista. |
| Bucket de storage | **Pendiente** | No hay bucket configurado ni referenciado en código. |
| Políticas de RLS | **Decidido, no implementado** | **RLS desde la primera migración funcional** ([ADR 0010](decisiones/0010-rls-desde-la-primera-migracion.md)). **Cero políticas escritas**, y no hay tablas sobre las cuales habilitarlo. |
| Auth | **Decidido, no implementado** | **Supabase Auth con magic link** ([ADR 0004](decisiones/0004-identidad-con-supabase-auth.md)). **Cero código**: no hay proyecto verificado, ni sesión, ni callback, ni vínculo `Person` ↔ usuario. |

---

## Variables de entorno

Solo nombres. **Este documento nunca contiene valores.**

Las cinco variables de `.env.example` coinciden exactamente con las cinco del
`.env` local: no hay drift. **Las cinco están vacías.**

| Variable | Consumida en |
| --- | --- |
| `DATABASE_URL` | `src/lib/prisma.ts` (adapter, pooler puerto 6543) |
| `DIRECT_URL` | `prisma.config.ts` (CLI de migraciones, puerto 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase.ts` (ambos clientes) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` (cliente de navegador) |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase.ts` (cliente de servidor) |

---

## Funcionalidades implementadas

| Ítem | Nivel |
| --- | --- |
| Proyecto Next.js que arranca en dev | **Configurado**; pendiente de comprobar |
| Layout raíz (`lang="es"`, fuentes Geist, metadata correcta del proyecto) | **Implementado** |
| Home `src/app/page.tsx` | **Implementado, pero es la plantilla de `create-next-app`** — en inglés, con logos y links de Vercel. No es funcionalidad del proyecto. |
| Singleton de Prisma con adapter `pg` | **Implementado**, sin usar, no probado |
| Fábricas de cliente Supabase | **Implementado**, sin usar, no probado |
| Módulo de mensajes `src/lib/messages.ts` | **Implementado** (una sola clave: `app.nombre`), sin usar |

**Los tres módulos de `src/lib/` están escritos con cuidado pero nunca se
ejecutaron contra nada real.** Código no ejercitado es código no verificado.

---

## Funcionalidades pendientes

Los cuatro objetivos del MVP definidos en CLAUDE.md: **cero de cuatro implementados.**

| Objetivo del MVP | Estado |
| --- | --- |
| 1. Registrar un animal encontrado (foto y ubicación obligatorias) | **Pendiente** |
| 2. Tomar un animal en tránsito | **Pendiente** |
| 3. Traspaso (propuesta + aceptación) | **Pendiente** |
| 4. Ver el historial de tránsitos de un animal | **Pendiente** |

Todo lo aprobado el 2026-07-16 está **pendiente sin excepción**:

| Elemento | Decisión | Implementación |
| --- | --- | --- |
| Modelo de datos (`Animal`, `Person`, `Transit`, `Photo`) | Nombres aprobados | **Cero.** El schema no tiene ni un modelo. |
| `TransitTransfer` (`PENDING`/`ACCEPTED`/`CANCELLED`/`EXPIRED`) | Nombre y estados aprobados; **campos sin diseñar** | **Cero** |
| Máquina de estados (**5 operativos**; `REUNITED`/`DECEASED` finales absolutos, `ADOPTED` cierre operativo) | **Cerrada.** Sin casos dudosos abiertos. | **Cero.** No hay enum ni validación. |
| `isAvailableForAdoption` como eje aparte | Aprobado | **Cero** |
| Invariante "cierre ⇒ no disponible" con CHECK constraint | Aprobada | **Cero.** No hay migración ni tabla. |
| `AnimalEvent` (bitácora — **no es event sourcing**) | Aprobada; **campos sin diseñar** | **Cero** |
| `species` enum (`DOG`/`CAT`/`OTHER`) | Aprobado | **Cero** |
| `Person.authUserId` (nullable, unique) | Aprobado | **Cero** |
| Autenticación (magic link) | Aprobada | **Cero** |
| Traspaso de dos pasos; una sola propuesta `PENDING` | Aprobado | **Cero** |
| `ADOPTION_RETURNED` (crea `Transit` nuevo, receptor explícito) | Aprobado | **Cero** |
| RLS desde la primera migración | Aprobado | **Cero políticas** |
| Historial no reescribible | Aprobado | **Cero** |
| Privacidad del historial público | Aprobada; **precisión geográfica sin definir** | **Cero** |
| Corrección administrativa mínima (`ADMIN_CORRECTION`) | Aprobada — **condición de lanzamiento** | **Cero.** Sin backoffice, y sin la capacidad mínima tampoco. |
| Tests del núcleo de negocio | Aprobados | **Cero.** Sin framework elegido ni instalado. |

Además: librería de componentes base (carpeta vacía, documentada como tal) y CI (no
hay workflows) — **pendientes**.

---

## Riesgos encontrados

Ordenados por severidad. Detalle completo en la auditoría del 2026-07-16.

1. **Service role key sin barrera técnica contra el bundle del cliente.**
   `createSupabaseServiceClient()` lee `SUPABASE_SERVICE_ROLE_KEY` y vive en
   `src/lib/supabase.ts`, importable desde cualquier componente de cliente. La
   protección actual es **un comentario en mayúsculas**, y un comentario no es un
   mecanismo de defensa. Hoy el riesgo es teórico (nadie lo importa); se vuelve
   real con la primera pantalla. `src/lib/prisma.ts` tiene el mismo problema.

2. **La home contradice las convenciones de CLAUDE.md.** `page.tsx` está en
   inglés, con textos hardcodeados y links de marketing a Vercel. CLAUDE.md exige
   textos en español y centralizados en `messages.ts`. Deuda cosmética, trivial de
   resolver, pero es la única pantalla que existe.

3. **Brecha total entre documentación y código en el dominio — y creciendo.**
   CLAUDE.md y los siete ADR especifican entidades, una máquina de estados de seis
   valores, un traspaso de dos pasos, identidad y reglas de historial. **Nada de eso
   existe en código.** No es un defecto —el proyecto está en su commit 2— pero la
   brecha **se ensanchó** con la ronda del 2026-07-16: ahora hay mucho más decidido
   y sigue habiendo lo mismo construido, o sea nada. Cuanto más crece, más fácil es
   confundir "está escrito" con "está hecho".

4. **`.env` con las cinco variables vacías.** `npm run dev` probablemente levante
   (la home no toca Prisma ni Supabase), pero cualquier llamada a Supabase lanzará
   el error de `requireEnv()`. Nota de contraste: **Supabase falla ruidosamente y
   en español; Prisma no valida `DATABASE_URL`** y fallará más tarde y peor. Vale
   unificar el criterio.

5. **Testing aprobado, pero sin framework ni un solo test.** CLAUDE.md ya define
   qué se testea (máquina de estados, unicidad del tránsito activo, propuestas de
   traspaso, autorización del receptor, rollback transaccional, cierre al llegar a
   un estado final). **El framework no está decidido y no hay nada instalado.** La
   deuda no desapareció: pasó de "no hay estrategia" a "hay estrategia sin
   ejecutar". Con el traspaso ahora en dos pasos, la superficie a testear **creció**
   — aceptaciones concurrentes, propuestas expiradas, receptores no autorizados.

6. **Inconsistencia menor sobre la versión de Node.** El README pide "20.19+ /
   22.13+"; el entorno corre **v22.12.0**. Los `engines` declarados se satisfacen
   (Next: `>=20.9.0`; Prisma: `^20.19 || ^22.12 || >=24.0`), o sea que **el README
   es más estricto que los requisitos reales**. No parece bloqueante, pero la
   discrepancia sigue sin resolver.

7. **`next.config.ts` vacío.** Para servir fotos desde Supabase Storage con
   `next/image` habrá que declarar `images.remotePatterns`. Pendiente conocido.

### Lo que está bien y conviene no romper

- `.env` ignorado y **nunca commiteado** (verificado sobre el historial completo).
- `.env.example` con placeholders, **sin un solo valor real**, y con instrucciones
  de dónde obtener cada valor.
- `.gitignore` cubre `.env`, `.env*.local`, `src/generated`, `*.pem`.
- TypeScript en modo estricto.
- Separación pooler/directa correcta y bien comentada.
- **Sin secretos en el historial de Git.**

---

## Próximo paso recomendado

**Diseñar `prisma/schema.prisma`**, sin migrar todavía.

**Nada lo bloquea.** Los siete bloqueantes de la segunda ronda y los tres de la
tercera se cerraron el 2026-07-16. Las **seis entidades** del modelo —`Animal`,
`Person`, `Transit`, `Photo`, `TransitTransfer`, `AnimalEvent`— tienen todo lo que
necesitan para escribirse, y la máquina de estados quedó cerrada sin casos dudosos.

Lo que queda abierto son decisiones que **se resuelven al escribir el schema** (campos
de `AnimalEvent`, campos de `TransitTransfer`, el default de `isAvailableForAdoption`,
la forma de la relación `Person` ↔ `authUserId`) o que **no lo tocan** (permisos, UX,
testing). La lista completa está en
[modelo-de-dominio.md](modelo-de-dominio.md) → "Decisiones pendientes".

Orden sugerido a partir de ahí:

1. Definir el modelo de dominio en `schema.prisma`, sin migrar todavía.
2. Endurecer el límite servidor/cliente (`server-only`) — **antes** de la primera
   pantalla, no después.
3. Verificar conectividad con Supabase: completar `.env`, primera migración **con RLS
   habilitado** ([ADR 0010](decisiones/0010-rls-desde-la-primera-migracion.md)).
4. Máquina de estados + traspaso de dos pasos, con tests.
5. Componentes base y pantallas.
6. **Antes de publicar**: la capacidad mínima de corrección administrativa
   ([ADR 0011](decisiones/0011-correccion-administrativa-minima.md)).

Cada paso reduce la incertidumbre del siguiente. El paso 1 es una decisión (barata de
revertir); del 3 en adelante se generan hechos consumados (migraciones aplicadas,
datos reales).

La lista completa de decisiones abiertas está en
[modelo-de-dominio.md](modelo-de-dominio.md) → "Decisiones pendientes" y en
[seguridad-identidad-permisos.md](seguridad-identidad-permisos.md) → "Decisiones que
siguen abiertas".
