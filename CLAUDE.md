# CLAUDE.md

Este archivo gobierna cómo se construye este proyecto. Leelo al inicio de cada sesión y respetá estas decisiones. Si algo acá contradice un pedido puntual, avisá antes de romper una convención.

---

## Qué leer y en qué orden

Este archivo es la fuente de verdad. El resto de la documentación lo complementa; nada lo reemplaza.

**Orden de prioridad. Ante una contradicción, gana el número más bajo:**

1. **`CLAUDE.md`** (este archivo) — reglas operativas y decisiones vigentes.
2. **[`docs/decisiones/`](docs/decisiones/README.md)** — ADR vigentes: el *motivo* de las decisiones arquitectónicas.
3. **[`.claude/rules/`](.claude/rules/)** — reglas de ingeniería **pertinentes a la tarea** (ver abajo).
4. **[`docs/modelo-de-dominio.md`](docs/modelo-de-dominio.md)** — definición conceptual del dominio.
5. **[`docs/seguridad-identidad-permisos.md`](docs/seguridad-identidad-permisos.md)** — identidad y autorización. Contiene **decisiones aprobadas** de identidad y principios de permisos, además de aspectos todavía pendientes **claramente identificados** (la matriz de permisos, en particular, sigue siendo propuesta).
6. **[`docs/estado-actual.md`](docs/estado-actual.md)** — estado real de la implementación.
7. **[`README.md`](README.md)** — introducción y puesta en marcha.

**Si encontrás una contradicción entre estos documentos, informala. No la resuelvas en silencio.** Una contradicción es una decisión pendiente disfrazada, y resolverla sin avisar la convierte en una decisión tomada por accidente.

Antes de escribir código de dominio, leé `docs/estado-actual.md`: **que algo exista en este archivo no significa que esté implementado**. A la fecha, los cuatro objetivos del MVP están sin implementar.

---

## Reglas de ingeniería — lectura obligatoria

Las reglas especializadas viven en **[`.claude/rules/`](.claude/rules/)**. Este archivo es el contrato; **no repite su contenido**.

**Antes de actuar, leé las que apliquen a la tarea.** No hace falta leerlas todas: leé las pertinentes, y leelas **completas** antes de tocar nada de esa área.

| Archivo | Cuándo leerlo |
| --- | --- |
| [`.claude/rules/general-engineering.md`](.claude/rules/general-engineering.md) | **Siempre**, en cualquier tarea de código. |
| [`.claude/rules/workflow.md`](.claude/rules/workflow.md) | **Siempre.** Incluye qué requiere aprobación y la definición de terminado. |
| [`.claude/rules/skills-and-tools.md`](.claude/rules/skills-and-tools.md) | **Siempre** que vayas a usar una skill. |
| [`.claude/rules/frontend.md`](.claude/rules/frontend.md) | Next.js, React, componentes, UI. |
| [`.claude/rules/backend.md`](.claude/rules/backend.md) | Route Handlers, Server Actions, lógica de dominio, transacciones. |
| [`.claude/rules/database.md`](.claude/rules/database.md) | Prisma, schema, migraciones, constraints, RLS. |
| [`.claude/rules/testing.md`](.claude/rules/testing.md) | Cualquier tarea que agregue o toque tests. |
| [`.claude/rules/security.md`](.claude/rules/security.md) | Secretos, autenticación, permisos, privacidad, dependencias. |

**Prioridad:** `CLAUDE.md` → ADR → estas reglas. **`CLAUDE.md` y los ADR prevalecen sobre cualquier skill**, sin excepción. Una skill no conoce las decisiones de este proyecto; este repositorio sí. Si una skill contradice una decisión del proyecto, **gana el proyecto y la contradicción se informa**.

> **Nota sobre el mecanismo.** Estos archivos se referencian con **enlaces markdown**, no con imports `@ruta`. No se pudo verificar que la sintaxis de import esté soportada en la versión instalada (Claude Code 2.1.211): la documentación oficial no respondía y el paquete instalado no la documenta. **Los enlaces funcionan con seguridad; un import no verificado podría no cargar nada y nadie se enteraría.** Si en el futuro se confirma el soporte, se puede migrar.
>
> **Consecuencia práctica: estas reglas no se cargan solas. Hay que leerlas.**

---

## Qué es el proyecto

Red Solidaria — plataforma para conectar necesidades con personas que quieran ayudar. El primer módulo (el MVP actual) es el **tránsito colaborativo de animales**: alguien encuentra un animal, lo registra, lo toma en tránsito, y lo va pasando a otros cuidadores hasta que encuentra hogar definitivo. Todo el historial de esa cadena queda registrado.

La arquitectura está pensada para que el mismo motor sirva después para otras causas (familias necesitadas, comedores, donaciones), pero **eso no se construye ahora**. El MVP es solo el tránsito de animales.

---

## Objetivo del MVP

Validar que la gente use el sistema. Lo mínimo que tiene que funcionar:

1. Registrar un animal encontrado (**foto y ubicación son obligatorias** para confirmar el registro).
2. Tomar un animal en tránsito.
3. Pasar un animal de un cuidador a otro (traspaso: **el cuidador propone, el receptor acepta**).
4. Ver el historial de tránsitos de un animal.

Para todo esto hace falta identidad: el MVP usa **Supabase Auth con magic link** (ver [ADR 0004](docs/decisiones/0004-identidad-con-supabase-auth.md)).

Nada más. Puntos, comercios, beneficios, validación de vecinos, mapa visual elaborado: **todo eso queda fuera del MVP** y no se implementa hasta que la idea base demuestre que se usa.

---

## Stack

- **Frontend + backend**: Next.js (React). Web responsive, no app nativa por ahora.
- **Base de datos**: PostgreSQL.
- **ORM**: Prisma (toda la interacción con la base pasa por Prisma, nunca SQL crudo salvo caso justificado).
- **Base y storage**: Supabase (PostgreSQL gestionado + storage de archivos para las fotos).
- **Sin Docker por ahora.** Se agrega cuando el MVP funcione y haya que llevarlo a un servidor. No antes.

---

## Decisiones de arquitectura (no romper sin avisar)

### El tránsito es un evento, no un estado del animal
Nunca guardar "cuidador actual" como campo en el animal. Cada tránsito es una fila propia en la tabla `Transit`. El cuidador actual se deduce buscando el tránsito activo (sin fecha de fin) de ese animal. Esto es lo que permite reconstruir el historial completo y que una persona tenga varios animales en tránsito a la vez. Ver [ADR 0001](docs/decisiones/0001-transito-como-evento.md).

### Un animal tiene como máximo un tránsito activo
El cuidador actual se deriva del tránsito activo, así que **dos tránsitos activos dejarían indefinido quién tiene al animal**. Una persona sí puede tener varios animales en tránsito a la vez: el límite es por animal, no por persona.

Esta regla se protege en tres capas: validación de negocio, dentro de transacciones, y —si PostgreSQL/Prisma lo requieren— con una **restricción estructural o índice único parcial** creado en una migración personalizada.

### La lógica de negocio va en el código, no en la base
Nada de stored procedures ni triggers con lógica de negocio. La base guarda datos y garantiza integridad con sus claves y constraints. El código TypeScript decide qué pasa. La única excepción es usar **transacciones** de Prisma para operaciones que tocan varias tablas a la vez (ver "traspaso" abajo).

**Un índice único parcial no es lógica de negocio: es integridad**, y esta misma regla la autoriza explícitamente ("garantiza integridad con sus claves y constraints"). La diferencia es que un constraint **impide que exista** un dato imposible; un trigger **decide qué pasa**. Escribir esa restricción en SQL dentro de una migración personalizada, porque Prisma no la expresa en el schema, no contradice esta regla.

### Identidad: Supabase Auth con magic link
El MVP autentica con **Supabase Auth por magic link**. La autenticación verifica el control de una casilla de correo — **no** la identidad civil, ni la posesión física del animal, ni que un traspaso haya ocurrido de verdad. Ver [ADR 0004](docs/decisiones/0004-identidad-con-supabase-auth.md).

`Person` tiene un vínculo **opcional y único** con el usuario de Auth (`authUserId`: nullable, unique). **Una `Person` puede existir sin cuenta** — familia original, adoptante externo, contacto relacionado. Pero **las acciones sensibles exigen una `Person` vinculada a un usuario autenticado**: registrar un animal, tomarlo en tránsito, iniciar un traspaso, aceptarlo, marcar un desenlace, o reabrir por adopción fallida.

### El estado operativo y la disponibilidad para adopción son ejes distintos
Un animal puede estar `IN_TRANSIT` **y** disponible para adopción al mismo tiempo: son dos hechos, no uno. La disponibilidad **no es un estado**, es `isAvailableForAdoption` (booleano). Ver [ADR 0008](docs/decisiones/0008-estado-operativo-y-disponibilidad-como-ejes-separados.md).

### RLS desde la primera migración funcional
**Todas las tablas expuestas vía Supabase nacen con Row Level Security habilitado**, y los buckets de Storage nacen con políticas restrictivas. Ver [ADR 0010](docs/decisiones/0010-rls-desde-la-primera-migracion.md).

**Las operaciones sensibles de dominio se ejecutan del lado del servidor mediante Prisma**, y no dependen exclusivamente de permisos en el cliente. RLS es la **segunda** línea de defensa —cierra la API REST que Supabase expone sola con la anon key—, no la primera. No valida reglas del dominio ni oculta columnas sensibles: eso lo hace nuestro código.

### Las fotos se guardan como URL, nunca como base64 ni binario en la base
La foto se sube al storage de Supabase. En la base de datos se guarda solo la URL o referencia de almacenamiento (un texto). Nunca meter base64 ni bytes de imagen en PostgreSQL. **La foto inicial y la ubicación del hallazgo son obligatorias** para confirmar el registro de un animal. Ver [ADR 0003](docs/decisiones/0003-storage-de-fotografias.md).

### Puerta abierta, cuarto sin amueblar
El modelo permite crecer (varias especies, varios animales por persona) sin construir de más. No agregar tablas, campos ni abstracciones para features que todavía no existen. Cuando el feature llegue, se agrega entonces.

**El modelo es multiespecie desde el arranque; la primera experiencia funcional se enfoca en perros.** No crear una tabla `Species` en el MVP: `species` será un enum o un campo simple — se decide al diseñar el schema.

---

## Modelo de datos (MVP)

**Nombres en inglés** (ver "Convenciones de código"). Los nombres de campos son orientativos; ajustar a las convenciones de Prisma. La definición conceptual completa está en [`docs/modelo-de-dominio.md`](docs/modelo-de-dominio.md).

Cuatro entidades base — **más una quinta** para la propuesta de traspaso (ver "La operación de traspaso"). **El modelo ya no está limitado a cuatro tablas.**

### `Animal`
- id
- species — **enum: `DOG`, `CAT`, `OTHER`**. El modelo es multiespecie; la experiencia inicial se concentra en perros. **No hay campo de descripción para `OTHER`**, y no se agrega salvo que aparezca una necesidad concreta al diseñar el formulario.
- status (ver máquina de estados abajo)
- **isAvailableForAdoption** (booleano — eje **separado** del estado)
- name / alias (opcional)
- estimatedAge
- apparentSex
- size
- vaccines (texto libre, ej: "antirrábica, moquillo" — NO una tabla de vacunas en el MVP)
- foundLatitude, foundLongitude (dónde apareció — **obligatorio**)
- registeredBy (persona)
- registeredAt

> **No hay campo `vive` / `isAlive`.** El fallecimiento se representa con el estado `DECEASED` y nada más: dos fuentes de verdad sobre si un animal está vivo pueden contradecirse. Ver [ADR 0006](docs/decisiones/0006-estados-finales-del-animal.md).

### `Person`
- id
- name
- contact
- createdAt
- **authUserId** — vínculo con el usuario de Supabase Auth: **nullable y unique**. Una `Person` puede existir **sin cuenta**; las acciones sensibles exigen tenerla. Ver [ADR 0004](docs/decisiones/0004-identidad-con-supabase-auth.md).

### `Transit`
- id
- animal (a qué animal corresponde)
- person (quién lo cuida)
- startedAt
- endedAt (vacío mientras el tránsito está activo — **es** el marcador de "activo")
- note (opcional)

### `Photo`
- id
- animal (siempre)
- transit (opcional — vacío si es la foto del rescate; con valor si es foto de seguimiento de un tránsito)
- uploadedBy (persona)
- createdAt
- url (apunta al storage, NO la imagen en sí)

### `TransitTransfer`
Entidad que exige el flujo de dos pasos. Estados conceptuales: **`PENDING`, `ACCEPTED`, `CANCELLED`, `EXPIRED`**. Sus campos **no se diseñan acá**. Ver [ADR 0005](docs/decisiones/0005-traspaso-con-propuesta-y-aceptacion.md).

### `AnimalEvent` — bitácora de eventos del animal
Registra los eventos auditables del ciclo de vida del animal. Tipos conceptuales iniciales: **`REGISTERED`, `TAKEN_IN_TRANSIT`, `TRANSFER_PROPOSED`, `TRANSFER_ACCEPTED`, `ADOPTED`, `ADOPTION_RETURNED`, `REUNITED`, `DECEASED`, `ADMIN_CORRECTION`**. Sus campos físicos **no se diseñan acá**. Ver [ADR 0012](docs/decisiones/0012-bitacora-de-eventos-del-animal.md).

**Esto NO es event sourcing.** Las entidades normales (`Animal`, `Transit`, `TransitTransfer`, `Photo`) **siguen siendo la fuente de verdad**; el estado actual **no se reconstruye desde los eventos**; `AnimalEvent` **no reemplaza** a `Transit` ni a `TransitTransfer`. Las entidades responden *"cómo está ahora"*; los eventos, *"qué pasó"*.

**Toda operación de dominio escribe su entidad y su evento en la misma transacción.** Son dos escrituras que no pueden separarse.

---

## Máquina de estados del animal

Estados operativos (**enum en inglés y mayúsculas**): `FOUND`, `IN_TRANSIT`, `ADOPTED`, `REUNITED`, `DECEASED`. Ver [ADR 0008](docs/decisiones/0008-estado-operativo-y-disponibilidad-como-ejes-separados.md).

**`AVAILABLE_FOR_ADOPTION` no es un estado**: la disponibilidad es el eje aparte `isAvailableForAdoption`.

**Cierres**: `REUNITED` y `DECEASED` son **finales absolutos**. `ADOPTED` es un **cierre operativo** con una única salida excepcional (`ADOPTION_RETURNED`).

Transiciones válidas (cualquier otra debe rechazarse en el código):

| Desde | Hacia | Nota |
| --- | --- | --- |
| `FOUND` | `IN_TRANSIT` | Alguien lo toma en tránsito. |
| `FOUND` | `REUNITED` | La familia aparece antes de que nadie lo cuide. |
| `FOUND` | `DECEASED` | Encontrado ya fallecido, o muere antes de que alguien lo tome. |
| `IN_TRANSIT` | `IN_TRANSIT` | Traspaso aceptado. El estado no cambia; cambia el cuidador. |
| `IN_TRANSIT` | `ADOPTED` | |
| `IN_TRANSIT` | `REUNITED` | |
| `IN_TRANSIT` | `DECEASED` | |
| `FOUND` | `ADOPTED` | Quien lo encuentra lo adopta directo, sin tránsito previo. |
| `ADOPTED` | `IN_TRANSIT` | **Solo** vía `ADOPTION_RETURNED`. Nunca como edición directa del estado. Ver [ADR 0009](docs/decisiones/0009-reapertura-por-adopcion-fallida.md). |

**Registro de un animal encontrado ya fallecido**: se crea en `FOUND` y transiciona a `DECEASED` **dentro de la misma transacción que el registro inicial**. `DECEASED` no es estado inicial. La foto y la ubicación siguen siendo obligatorias.

**`FOUND → ADOPTED`** — quien encuentra al animal decide adoptarlo. La operación debe: registrar **quién adopta**, dejar `isAvailableForAdoption = false`, **validar que no exista tránsito activo**, conservar **el mismo `Animal` y su historial**, y **no crear un tránsito ficticio**. Nadie cuidó al animal: inventar un tránsito para simularlo sería falsear la cadena.

**Toda transición a un cierre (`ADOPTED`, `REUNITED`, `DECEASED`), dentro de una única transacción, debe:**
1. cerrar el tránsito activo, si lo hay;
2. dejar `isAvailableForAdoption = false`.

Un animal adoptado, reencontrado o fallecido no puede quedar con un cuidador asignado ni ofrecido en adopción.

### La invariante entre estado y disponibilidad se protege en la base

**Si `status` es `ADOPTED`, `REUNITED` o `DECEASED`, entonces `isAvailableForAdoption` debe ser `false`.**

Se protege en tres capas: **lógica de negocio**, **transacciones**, y un **CHECK constraint de PostgreSQL** — incorporado mediante **migración SQL personalizada** si Prisma no puede expresarlo.

**Esto es integridad estructural, no lógica de negocio mediante trigger.** Un CHECK **impide que exista** una fila imposible; un trigger **decide qué pasa**. La regla "la lógica de negocio va en el código, no en la base" prohíbe lo segundo y autoriza lo primero. **La migración no se crea todavía.**

La validación de qué transición es válida vive en el código, en un solo lugar reutilizable.

---

## La operación de traspaso

Es la operación central. **Son dos pasos: el cuidador actual propone, el receptor acepta.** Nadie recibe un animal sin haber aceptado tenerlo. Ver [ADR 0005](docs/decisiones/0005-traspaso-con-propuesta-y-aceptacion.md).

**Paso 1 — Propuesta.** El cuidador actual inicia el traspaso hacia una persona autenticada. **No cambia nada**: el tránsito sigue abierto y el cuidador sigue siendo el mismo. La propuesta puede expirar o cancelarse (el plazo **no está decidido**).

**Un animal tiene como máximo un `TransitTransfer` en `PENDING`.** Mientras exista: no se puede crear otra, el cuidador actual puede cancelarla, y recién después de cancelarla o de que expire se puede crear una nueva. Se protege igual que el tránsito activo único: validación de negocio, transacción, y —si hace falta— restricción o índice único parcial. **La migración no se crea todavía.**

**Paso 2 — Aceptación.** Solo el receptor propuesto puede aceptar. Al hacerlo, esto ocurre dentro de **una única transacción (todo o nada)**:

1. Validar que la propuesta siga vigente (ni aceptada, ni cancelada, ni expirada).
2. Validar que quien acepta sea el receptor propuesto.
3. Validar que el tránsito original siga activo.
4. Validar que el estado del animal permita la transición.
5. Cerrar el tránsito anterior (ponerle `endedAt`).
6. Crear el tránsito nuevo con el receptor y `startedAt` actual.
7. Dejar el estado del animal en `IN_TRANSIT`.
8. Marcar la propuesta como aceptada / consumida.

**Si cualquier paso falla, no cambia nada. Nunca dejar un animal a medio traspasar** — ni sin cuidador, ni con dos.

---

## La devolución de adopción

Una adopción puede fracasar. `ADOPTED → IN_TRANSIT` ocurre **únicamente** por la operación explícita `ADOPTION_RETURNED`, **nunca** como edición directa del estado. Ver [ADR 0009](docs/decisiones/0009-reapertura-por-adopcion-fallida.md).

**La operación debe crear obligatoriamente un `Transit` nuevo.** Hay que **indicar explícitamente** una `Person` **autenticada** que recibe físicamente al animal. **No se infiere.** Puede ser el cuidador anterior, un cuidador nuevo, o el propio adoptante si sigue teniéndolo transitoriamente.

Dentro de **una única transacción**:

1. Registrar la devolución (`AnimalEvent` de tipo `ADOPTION_RETURNED`, con fecha, responsable y motivo).
2. Validar que el receptor esté autenticado.
3. Crear el `Transit` nuevo con ese receptor.
4. Cambiar el estado `ADOPTED` → `IN_TRANSIT`.
5. **Establecer explícitamente** `isAvailableForAdoption`. **Valor propuesto por defecto: `true`** — la operación podrá confirmarlo o modificarlo expresamente.

Dos reglas que no se negocian: **se preserva el historial del mismo animal**, y **nunca se crea otro registro de animal** para ocultar la adopción fallida.

---

## Convenciones de código

> **Este es el resumen y manda.** El detalle está en [`.claude/rules/general-engineering.md`](.claude/rules/general-engineering.md) y, por área, en [`frontend.md`](.claude/rules/frontend.md), [`backend.md`](.claude/rules/backend.md), [`database.md`](.claude/rules/database.md), [`testing.md`](.claude/rules/testing.md) y [`security.md`](.claude/rules/security.md).

- **Modular y simple. Sin abstracciones prematuras.** Modularizar lo que ya se repite; no inventar capas ni patrones "por si acaso". Los patrones se agregan cuando el dolor aparece, no antes.
- **Nada de clases-Dios.** Ningún archivo o función que haga demasiado. Responsabilidad única.
- **Componentes reutilizables.** Una librería de componentes visuales base (botones, tarjetas, formularios, inputs) que se reusa en toda la app. No repetir markup.
- **Mensajes al usuario centralizados.** Todos los textos que ve el usuario viven en un único lugar (ej: un módulo de strings/mensajes). Nunca hardcodear textos sueltos por el código. Esto permite corregir tono, traducir o cambiar mensajes desde un solo punto.
- **Validación de estados en un solo lugar.** La lógica de transiciones válidas del animal no se duplica.
- **Nombres claros y consistentes.** Nombres descriptivos, sin abreviaturas crípticas.
- **Idioma: código en inglés, textos al usuario en español.** Los nombres de **modelos, tablas, campos, enums, funciones y variables** van en **inglés**. Los **valores de enum van en inglés y MAYÚSCULAS** (`IN_TRANSIT`, `DOG`, `PENDING`). Todos los textos que ve el usuario van en **español** (centralizados, ver el punto anterior sobre mensajes). No mezclar idiomas dentro del código. Los nombres conceptuales aprobados son `Animal`, `Person`, `Transit`, `Photo`.
- **Tests para el núcleo de negocio, desde el inicio.** Solo para el motor del dominio: máquina de estados, unicidad del tránsito activo, creación y aceptación de propuestas de traspaso, autorización del receptor, rollback transaccional, y cierre del tránsito al llegar a un estado final. **No** se exigen tests exhaustivos de componentes visuales. Framework **sin decidir**; no instalar nada todavía.
- **El historial no se reescribe con operaciones ordinarias.** Ningún usuario común edita ni borra tránsitos cerrados. Ver [ADR 0007](docs/decisiones/0007-historial-y-correcciones-auditables.md).

---

## Convenciones de diseño / UI

> **Este es el resumen y manda.** El detalle está en [`.claude/rules/frontend.md`](.claude/rules/frontend.md).

- **Todo responsive.** Nada de tamaños fijos en px para layouts. Usar grilla (CSS grid / flexbox) y unidades relativas.
- **Mobile primero.** La gente saca la foto del animal con el celular. La experiencia en pantalla chica es la prioritaria.
- **Sistema de diseño simple y consistente** para el MVP: una paleta sobria, componentes coherentes, buen contraste. No hace falta identidad de marca elaborada todavía — eso viene después de validar.
- **Colores accesibles.** Buen contraste texto/fondo. No depender solo del color para comunicar estado (sumar texto o ícono).
- La cámara y la ubicación se toman desde el navegador (APIs web estándar).

---

## Qué NO hacer en el MVP

- No implementar sistema de puntos ni reputación.
- No implementar comercios ni beneficios.
- No implementar validación por vecinos / ONG.
- No construir el mapa colaborativo elaborado (guardar lat/long alcanza; mostrar un pin simple está bien).
- No crear tabla de vacunas estructurada (texto libre alcanza).
- No crear tabla `Species` (el modelo es multiespecie con un campo; la primera experiencia se enfoca en perros).
- **No construir un backoffice completo** (pantallas de gestión, listados, moderación) ni exponer un rol `ADMIN` en la UI. **Pero sí** debe existir, **antes de publicar el MVP**, una **operación administrativa mínima, server-only y auditable** para corregir errores graves. Es condición de lanzamiento, no del primer commit. Ver [ADR 0011](docs/decisiones/0011-correccion-administrativa-minima.md).
- **No diseñar un editor administrativo genérico.** La corrección se registra como un `AnimalEvent` de tipo `ADMIN_CORRECTION` —con administrador, fecha, motivo, entidad o dato afectado, valor original y valor corregido— y la primera implementación son **operaciones server-only específicas y controladas**, no un formulario que edite cualquier campo de cualquier tabla. Ver [ADR 0012](docs/decisiones/0012-bitacora-de-eventos-del-animal.md).
- **No hacer event sourcing.** `AnimalEvent` es una bitácora; las entidades siguen siendo la fuente de verdad.
- No agregar Docker.
- No sobre-diseñar con patrones de arquitectura de empresa grande.

Estas cosas tienen su lugar más adelante y el modelo está pensado para soportarlas sin romperse. Pero construirlas ahora frena la validación del MVP.

**La autenticación sí está dentro del MVP** y nunca estuvo en esta lista: ver [ADR 0004](docs/decisiones/0004-identidad-con-supabase-auth.md).

---

## Privacidad del historial

El historial de un animal es **públicamente consultable**. Pero **nunca** muestra: correo electrónico, teléfono, dirección exacta de personas, ubicación exacta actual del animal, ni datos privados del perfil.

Sí puede mostrar: alias o nombre público, fechas, etapas de la cadena, estado, fotografías autorizadas, y la ubicación **aproximada** del hallazgo cuando corresponda.

La precisión geográfica exacta y el mecanismo de anonimización **se definen en la etapa de UX y seguridad**. No están decididos.

---

## Historial de este documento

- **2026-07-16 — Segunda ronda documental.** Se incorporaron las decisiones aprobadas y quedaron **reemplazadas** estas reglas previas:
  - *Nombres del modelo en español* (`animales`, `personas`, `transitos`, `fotos`) → **inglés** (`Animal`, `Person`, `Transit`, `Photo`). Resuelve la contradicción con la regla "código en inglés", que ya estaba en este archivo.
  - *Estados en español* (`encontrado`, `en_transito`, …) → **enum en inglés y mayúsculas**, más `REUNITED` y `DECEASED`.
  - *Campo `vive` en el animal* → **eliminado**. Motivo: duplicaba con `DECEASED` la fuente de verdad sobre si el animal está vivo. Ver [ADR 0006](docs/decisiones/0006-estados-finales-del-animal.md).
  - *"Cuatro tablas"* → **el modelo ya no está limitado a cuatro**: el traspaso de dos pasos exige una entidad de propuesta. Ver [ADR 0005](docs/decisiones/0005-traspaso-con-propuesta-y-aceptacion.md).
  - *Traspaso como acto único* → **flujo de propuesta y aceptación**. Ver [ADR 0005](docs/decisiones/0005-traspaso-con-propuesta-y-aceptacion.md).
  - *Identidad sin definir* → **Supabase Auth con magic link**. Ver [ADR 0004](docs/decisiones/0004-identidad-con-supabase-auth.md).

- **2026-07-16 — Tercera ronda documental.** Se cerraron los siete bloqueantes del schema y quedaron **reemplazadas** estas reglas de la segunda ronda:
  - *`AVAILABLE_FOR_ADOPTION` como estado* → **eliminado del enum**. Los estados operativos son **cinco**; la disponibilidad es el eje aparte `isAvailableForAdoption`. Motivo: como estado excluyente obligaba a mentir sobre uno de los dos ejes — un animal en adopción **sigue estando en manos de alguien**. Ver [ADR 0008](docs/decisiones/0008-estado-operativo-y-disponibilidad-como-ejes-separados.md).
  - *`ADOPTED` como final absoluto* → **cierre operativo** con una salida excepcional (`ADOPTION_RETURNED`). Motivo: sin salida, una adopción fallida obligaba a duplicar la ficha del animal y **partir su historial en dos**. `REUNITED` y `DECEASED` siguen siendo absolutos. Ver [ADR 0009](docs/decisiones/0009-reapertura-por-adopcion-fallida.md).
  - *"No implementar el rol `ADMIN` ni su backoffice"* → sigue sin haber backoffice, pero **sí** una capacidad mínima de corrección server-only y auditable **antes del lanzamiento público**. Motivo: prohibir la corrección silenciosa mientras la única corrección posible era un `UPDATE` a mano no se sostiene. Ver [ADR 0011](docs/decisiones/0011-correccion-administrativa-minima.md).
  - *Sin `FOUND → DECEASED`* → **transición aprobada**. Cierra el hueco que abrió la baja del campo `vive`: un animal encontrado ya fallecido no tenía cómo registrarse.
  - *"¿RLS desde el día uno?" sin decidir* → **RLS desde la primera migración funcional**. Ver [ADR 0010](docs/decisiones/0010-rls-desde-la-primera-migracion.md).
  - Se fijaron: `Person.authUserId` (nullable, unique), `TransitTransfer` como nombre, `species` como enum `DOG`/`CAT`/`OTHER`, y **una sola propuesta `PENDING` por animal**.

- **2026-07-16 — Ajuste final.** Se cerraron los últimos pendientes que bloqueaban el schema:
  - *`FOUND → ADOPTED` pendiente de confirmación* → **aprobada**. Quien encuentra al animal puede adoptarlo directo, **sin crear un tránsito ficticio**. Restituye un camino que el modelo original tenía (`encontrado → en_adopcion → adoptado`) y que se había caído al quitar `AVAILABLE_FOR_ADOPTION` del enum.
  - *`ADOPTION_RETURNED` sin cuidador definido* → **debe crear un `Transit` nuevo**, con una `Person` autenticada **indicada explícitamente**, nunca inferida.
  - *Invariante "cierre ⇒ no disponible" sin protección estructural* → **CHECK constraint** en la base, además de la lógica de negocio y las transacciones.
  - *Sin lugar donde registrar eventos auditables* → **`AnimalEvent`**, la bitácora. **No es event sourcing**: las entidades siguen siendo la fuente de verdad. Ver [ADR 0012](docs/decisiones/0012-bitacora-de-eventos-del-animal.md).
  - La **corrección administrativa** pasa a registrarse como un `AnimalEvent` de tipo `ADMIN_CORRECTION`.
  - Se agregaron **avisos de refinamiento** al encabezado de los ADR 0006, 0007, 0008, 0009 y 0011, cuyo contenido aislado ya no representaba la regla vigente. **No se reescribió ningún contenido histórico.**

- **2026-07-16 — Reglas permanentes de ingeniería.** Se creó [`.claude/rules/`](.claude/rules/) con ocho archivos (general, frontend, backend, base de datos, testing, seguridad, flujo de trabajo, skills). **No se reemplazó ninguna decisión**: este archivo conserva el resumen y las reglas de máxima prioridad; el detalle vive en los archivos especializados. Se agregó el orden de lectura de las reglas y la política de skills — **CLAUDE.md y los ADR prevalecen sobre cualquier skill**.
