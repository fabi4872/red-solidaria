# Reglas de base de datos — Prisma 7 + PostgreSQL (Supabase)

> **[`CLAUDE.md`](../../CLAUDE.md) manda.** Esta guía **expande** sus decisiones de
> arquitectura. Donde una regla ya vive en CLAUDE.md se la marca con **(CLAUDE.md)**, y
> **esa** es la fuente. Si discrepan, **gana CLAUDE.md e informá la contradicción**.
>
> Ver también [`backend.md`](backend.md) y [`security.md`](security.md).

---

## Cómo se accede

- **Prisma es la vía habitual de acceso.** (CLAUDE.md) Toda la interacción con la base
  pasa por Prisma.
- **SQL manual solo** para capacidades estructurales que Prisma no expresa
  correctamente, y **siempre dentro de migraciones versionadas**.
- **Nada de SQL manual disperso en la aplicación.** Un `$queryRaw` suelto en un handler
  es una regla que se escapa del schema y que nadie va a encontrar después.
- **Prisma 7 usa driver adapters**: la conexión la maneja `pg`. El runtime usa
  `DATABASE_URL` (pooler, 6543); el CLI usa `DIRECT_URL` (directa, 5432). **No
  unificarlas.** Ver
  [ADR 0002](../../docs/decisiones/0002-supabase-prisma-conexiones.md).

## Integridad vs. lógica de negocio

- **La lógica de negocio va en el código, no en la base.** (CLAUDE.md) Nada de stored
  procedures ni triggers con lógica de negocio.
- **Los constraints sí son de la base.** La distinción, escrita en CLAUDE.md: un
  constraint **impide que exista** un dato imposible; un trigger **decide qué pasa**.
  Lo primero está autorizado; lo segundo, prohibido.
- **Escribir un constraint en SQL dentro de una migración, porque Prisma no lo expresa,
  no contradice esa regla.** (CLAUDE.md)

### Invariantes que la base debe proteger

| Invariante | Mecanismo |
| --- | --- |
| **Un animal tiene como máximo un tránsito activo** (CLAUDE.md) | Validación de negocio + transacción + **índice único parcial** (unicidad sobre el animal donde la fecha de fin es nula) |
| **Un animal tiene como máximo un `TransitTransfer` en `PENDING`** (CLAUDE.md) | Ídem |
| **Si `status` es `ADOPTED`, `REUNITED` o `DECEASED`, entonces `isAvailableForAdoption` es `false`** (CLAUDE.md) | Validación de negocio + transacción + **CHECK constraint** |

**Las tres van en las tres capas**, no en una. La validación de negocio da el mensaje
de error bueno; la transacción cierra la ventana entre leer y escribir; el constraint
es lo único que sigue en pie cuando el código tiene un bug.

**Documentar todo índice parcial y todo CHECK constraint**: qué invariante protegen y
por qué existen. Un constraint sin explicación es un constraint que alguien va a borrar
cuando le moleste.

**Ninguna de estas migraciones se crea todavía.**

## Migraciones

- **Pequeñas y revisables.** Una migración que hace seis cosas no se lee, se aprueba.
- **No aplicar migraciones sin revisión humana.** (Ver [`workflow.md`](workflow.md) —
  las migraciones requieren aprobación explícita, siempre.)
- **No borrar ni renombrar columnas con datos sin estrategia.** Un rename es un drop +
  add: los datos se van. La estrategia se propone y se aprueba **antes**.
- **Índices justificados** por una invariante o por una consulta real. No "por si
  acaso": un índice cuesta en cada escritura.
  - Caso conocido: derivar el cuidador actual exige filtrar tránsitos por animal con
    fecha de fin nula ([ADR 0001](../../docs/decisiones/0001-transito-como-evento.md)).
    Eso **sí** justifica un índice.
- **RLS habilitado desde la primera migración funcional**, para todas las tablas
  expuestas vía Supabase.
  ([ADR 0010](../../docs/decisiones/0010-rls-desde-la-primera-migracion.md))
- **Los buckets de Storage nacen con políticas restrictivas.** No son parte de ninguna
  migración de Prisma: es un sistema aparte y **hay que acordarse a mano**.

## RLS y confianza

- **El servidor, vía Prisma, es la capa de confianza.** Ahí se valida y se autoriza.
- **RLS no corrige bugs del servidor.** Prisma se conecta con un rol que, en la
  configuración habitual de Supabase, es dueño de las tablas y **no queda sujeto a
  RLS**. RLS cierra la API REST que Supabase expone sola con la anon key. **Es la
  segunda línea de defensa, no la primera.**
- **RLS decide qué filas se ven, no qué columnas.** La redacción de datos personales
  del historial público la hace el servidor. Confundirlas deja los datos expuestos con
  RLS activo y la sensación de estar cubiertos.
- **Tener RLS habilitado no es tener RLS bien configurado.** Una política `using (true)`
  cumple la letra y no protege nada.

## Qué no va en PostgreSQL

- **No almacenar imágenes, base64 ni binarios.** (CLAUDE.md) La foto va al storage; la
  base guarda **solo la URL o referencia**. Ver
  [ADR 0003](../../docs/decisiones/0003-storage-de-fotografias.md).
- **No duplicar fuentes de verdad.** No hay campo "cuidador actual" (se deriva del
  tránsito activo), no hay campo `vive` (el fallecimiento es `DECEASED`), y
  `AnimalEvent` **no es la fuente de verdad del estado** — es una bitácora. Ver
  [ADR 0001](../../docs/decisiones/0001-transito-como-evento.md),
  [ADR 0006](../../docs/decisiones/0006-estados-finales-del-animal.md) y
  [ADR 0012](../../docs/decisiones/0012-bitacora-de-eventos-del-animal.md).
- **Esto no es event sourcing.** Si el código empieza a derivar el estado desde
  `AnimalEvent`, la decisión se rompió.

## Datos y tiempo

- **Timestamps y datos temporales en UTC.** La conversión a hora local es presentación.
- **Nombres en inglés**; enums en inglés y MAYÚSCULAS. (CLAUDE.md)

## Antes de exponer algo

**Revisar privacidad y exposición antes de crear una vista o un endpoint público.** El
historial es público, pero sin correo, teléfono, dirección exacta ni ubicación exacta
actual (CLAUDE.md → "Privacidad del historial"). La pregunta no es "¿esta consulta
funciona?" sino **"¿qué queda expuesto si alguien la llama con otro id?"**.
