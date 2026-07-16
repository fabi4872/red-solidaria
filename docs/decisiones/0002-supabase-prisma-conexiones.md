# 0002 — Conexiones a Supabase: pooler para el runtime, directa para el CLI

- **Estado**: Aceptada
- **Fecha**: 2026-07-16 *(documentado retroactivamente; la decisión ya estaba
  implementada en el commit `4d67f79` del 2026-07-13)*
- **Fuente**: `prisma.config.ts`, `src/lib/prisma.ts`, `.env.example`. **No está en
  CLAUDE.md.** Hasta este ADR, su razonamiento existía únicamente como un comentario
  dentro de `prisma.config.ts` — que es precisamente la razón por la que se escribe.

## Contexto

CLAUDE.md fija PostgreSQL en Supabase, con Prisma como única vía de acceso. Eso
deja abiertas dos cuestiones que Supabase y Prisma 7 imponen:

**1. Supabase expone dos conexiones distintas, y no son intercambiables.**

- El **pooler de transacciones** (puerto 6543) multiplexa muchas conexiones lógicas
  sobre pocas físicas. Es lo que hace falta en un entorno serverless, donde cada
  invocación puede abrir su propia conexión y agotar el límite del proyecto.
- La **conexión directa** (puerto 5432) es una conexión real a Postgres.

El pooler de transacciones **no soporta sentencias preparadas ni DDL con estado
entre sentencias**. Las migraciones de Prisma necesitan exactamente eso. Correr
migraciones contra el pooler falla — y falla de manera confusa, no con un mensaje
que diga "usá el otro puerto".

**2. Prisma 7 cambió cómo se conecta.** Ya no usa un engine binario con la URL del
schema: usa **driver adapters**, donde la conexión la maneja un driver de Node
(`pg`) que recibe la cadena de conexión en código. El CLI, en cambio, sigue
necesitando su propia URL, y la toma de `prisma.config.ts`.

Es decir: **hay dos consumidores con dos necesidades opuestas.** El runtime quiere
el pooler; el CLI necesita la directa.

## Decisión

**Dos variables de entorno, una por consumidor:**

| Variable | Puerto | Consumidor | Dónde |
| --- | --- | --- | --- |
| `DATABASE_URL` | 6543 (pooler, `?pgbouncer=true`) | Runtime de la app | `src/lib/prisma.ts`, vía `PrismaPg` |
| `DIRECT_URL` | 5432 (directa) | CLI de Prisma (migraciones, studio) | `prisma.config.ts` |

Decisiones asociadas, ya implementadas:

- **`datasource db` en el schema no declara `url`.** Es deliberado: cada consumidor
  aporta la suya. Un `url` en el schema sería una tercera fuente de verdad,
  ambigua respecto de cuál de las dos conexiones representa.
- **El cliente de Prisma es un singleton cacheado en `globalThis`** fuera de
  producción. Sin eso, el hot-reload de Next abre una conexión nueva en cada recarga
  hasta agotar el pool.
- **El cliente generado se emite a `src/generated/prisma`**, no a `node_modules`, y
  está en `.gitignore`. Se regenera vía `postinstall`.

## Alternativas consideradas

> **Reconstrucción.** Este ADR se escribió después de la implementación. Las
> alternativas son las que el diseño descarta, no un acta de deliberación.

**1. Una sola URL, la directa, para todo.** Descartada: en serverless cada
invocación abre su conexión y agota el límite del proyecto Supabase. Es el modo de
falla clásico de Prisma sobre Supabase, y aparece bajo carga —o sea, **funciona
perfecto en desarrollo y explota en producción**.

**2. Una sola URL, el pooler, para todo.** Descartada: **las migraciones no corren**
contra el pooler de transacciones.

**3. `url` en el `datasource` del schema.** Descartada: reintroduce una tercera
fuente de verdad y contradice el modelo de driver adapters de Prisma 7.

**4. Postgres local con Docker para desarrollar.** Descartada: CLAUDE.md dice
explícitamente **"Sin Docker por ahora"**.

## Consecuencias

**Se vuelve fácil:**
- Correr migraciones y usar la app sin que ninguna pise a la otra.
- Desplegar en un entorno serverless sin agotar conexiones.
- Prisma 7 sin engine binario: menos peso, menos problemas de plataforma.

**Se vuelve difícil:**
- **Hay que configurar dos URLs, no una.** Es el doble de superficie para
  equivocarse, y **el error es silencioso**: poner el puerto cambiado en una de las
  dos no rompe nada hasta que se corre una migración o hasta que hay carga real.
- El razonamiento no es obvio para quien llega nuevo. `.env.example` documenta de
  dónde sacar cada valor; **este ADR documenta por qué son dos**.
- Acopla el proyecto a la topología de conexiones de Supabase.

## Riesgos

**1. URLs cruzadas.** Poner la directa en `DATABASE_URL` o el pooler en
`DIRECT_URL`. *Cómo nos daríamos cuenta*: en el primer caso, agotamiento de
conexiones **bajo carga, no en desarrollo**; en el segundo, migraciones que fallan
con un error poco descriptivo. *Mitigación actual*: los comentarios de
`.env.example` y de `prisma.config.ts`. **Nadie valida los puertos en tiempo de
ejecución.**

**2. `DATABASE_URL` ausente o vacía.** `PrismaPg` recibe `connectionString:
undefined` **sin queja alguna** y falla después, peor y más lejos del origen.
Contrasta con `src/lib/supabase.ts`, que sí valida con `requireEnv()` y lanza un
error claro en español. *La asimetría está registrada como riesgo en
[`../estado-actual.md`](../estado-actual.md).* **Ninguna de las dos URLs se validó
nunca contra una base real** (ver [`../estado-actual.md`](../estado-actual.md)).

**3. Falta `?pgbouncer=true`.** Si se omite en la URL del pooler, Prisma intenta
usar sentencias preparadas y falla de forma intermitente — el peor modo de falla
posible, porque no es reproducible a voluntad.

**4. Que alguien "simplifique" a una sola URL.** Es la alternativa 1 o la 2, y
ambas rompen — pero **tarde**, no al aplicar el cambio.

## Qué no implica esta decisión

- **No implica que la conexión funcione.** Nunca se probó contra una base real: las
  cinco variables de entorno están vacías. Esto es **configuración, no verificación**.
- **No define el modelo de datos.** El schema no tiene ni un modelo.
- **No decide nada sobre RLS.** Prisma con estas credenciales opera con permisos de
  Postgres, al margen de las políticas de RLS.
- **No decide nada sobre el storage de fotos** — ver
  [ADR 0003](0003-storage-de-fotografias.md) — ni sobre Supabase Auth, que sigue
  **sin decidir** (ver
  [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md)).
- **No es una decisión sobre el proveedor.** Que la base sea Supabase ya estaba
  decidido en CLAUDE.md. Esto es **cómo** conectarse, no **a qué**.
- **No decide el despliegue.** Aunque el pooler está pensado para serverless,
  **dónde corre la app no está decidido**.
