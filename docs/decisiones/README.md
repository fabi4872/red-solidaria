# Decisiones de arquitectura (ADR)

Un ADR registra **por qué** se tomó una decisión. [`../../CLAUDE.md`](../../CLAUDE.md)
dice *qué* se decidió; acá está el razonamiento, las alternativas descartadas y las
consecuencias asumidas.

La razón de existir de estos documentos: cuando alguien —dentro de seis meses, o
una sesión nueva de Claude— quiera cambiar una de estas decisiones, va a poder
saber qué se estaba resolviendo. **Sin eso, toda decisión parece arbitraria y se
revierte por comodidad.**

---

## Índice

| # | Título | Estado | Fecha |
| --- | --- | --- | --- |
| [0001](0001-transito-como-evento.md) | El tránsito es un evento, no un estado del animal | Aceptada | 2026-07-16 |
| [0002](0002-supabase-prisma-conexiones.md) | Conexiones a Supabase: pooler para runtime, directa para el CLI | Aceptada | 2026-07-16 |
| [0003](0003-storage-de-fotografias.md) | Las fotos van al storage; en la base solo la URL | Aceptada | 2026-07-16 |
| [0004](0004-identidad-con-supabase-auth.md) | Identidad: Supabase Auth con magic link | Aceptada | 2026-07-16 |
| [0005](0005-traspaso-con-propuesta-y-aceptacion.md) | El traspaso se hace en dos pasos: propuesta y aceptación | Aceptada | 2026-07-16 |
| [0006](0006-estados-finales-del-animal.md) | Estados finales `REUNITED` y `DECEASED`; baja del campo `vive` | Aceptada · **refinada por [0008](0008-estado-operativo-y-disponibilidad-como-ejes-separados.md) y [0009](0009-reapertura-por-adopcion-fallida.md)** | 2026-07-16 |
| [0007](0007-historial-y-correcciones-auditables.md) | El historial no se reescribe; las correcciones son auditables | Aceptada · **refinada por [0011](0011-correccion-administrativa-minima.md)**, completada por [0012](0012-bitacora-de-eventos-del-animal.md) | 2026-07-16 |
| [0008](0008-estado-operativo-y-disponibilidad-como-ejes-separados.md) | Cinco estados operativos y la disponibilidad para adopción como eje aparte | Aceptada · **con dos puntos cerrados después** | 2026-07-16 |
| [0009](0009-reapertura-por-adopcion-fallida.md) | Reapertura por adopción fallida: `ADOPTION_RETURNED` | Aceptada · **refinada por [0012](0012-bitacora-de-eventos-del-animal.md)** | 2026-07-16 |
| [0010](0010-rls-desde-la-primera-migracion.md) | RLS habilitado desde la primera migración funcional | Aceptada | 2026-07-16 |
| [0011](0011-correccion-administrativa-minima.md) | Capacidad mínima de corrección administrativa antes del lanzamiento | Aceptada · completada por [0012](0012-bitacora-de-eventos-del-animal.md) | 2026-07-16 |
| [0012](0012-bitacora-de-eventos-del-animal.md) | Bitácora de eventos del animal: `AnimalEvent` | Aceptada | 2026-07-16 |

**Ninguno está supersedido. Los doce rigen.** Cinco tienen **aviso de refinamiento en
su encabezado**: 0006, 0007, 0008, 0009 y 0011.

### ⚠ Refinamientos — leer antes de usar 0006, 0007, 0008, 0009 o 0011

Un ADR **refinado** sigue vigente, pero **una parte de lo que dice fue reemplazada
por uno posterior**. No alcanza con leerlo solo.

**Cada uno de esos cinco lleva el aviso en su propio encabezado**, así que quien abra
el archivo suelto se entera sin pasar por acá. Esta tabla es el panorama completo.

| ADR | Qué de él quedó reemplazado o cerrado | Por | Qué sigue vigente |
| --- | --- | --- | --- |
| [0006](0006-estados-finales-del-animal.md) | **Su lista de estados y su tabla de transiciones.** Ya no existe `AVAILABLE_FOR_ADOPTION` como estado; los operativos son cinco. Se agregó `FOUND → DECEASED`. | [0008](0008-estado-operativo-y-disponibilidad-como-ejes-separados.md) | La baja del campo `vive`, `REUNITED` y `DECEASED` como finales absolutos, y el cierre del tránsito activo en toda transición de cierre. |
| [0006](0006-estados-finales-del-animal.md) | **`ADOPTED` como final absoluto.** Pasa a ser un cierre operativo con una salida excepcional. | [0009](0009-reapertura-por-adopcion-fallida.md) | `REUNITED` y `DECEASED` **sí** siguen siendo finales absolutos. |
| [0007](0007-historial-y-correcciones-auditables.md) | **"`ADMIN` no se implementa en el MVP: ni el rol, ni sus pantallas, ni el backoffice."** Sigue sin haber backoffice, pero **sí** debe existir una capacidad mínima server-only y auditable **antes del lanzamiento público**. | [0011](0011-correccion-administrativa-minima.md) | Todo su principio: el historial no se reescribe con operaciones ordinarias; las correcciones son excepcionales, autorizadas y auditables. |
| [0007](0007-historial-y-correcciones-auditables.md) | El **mecanismo** de la corrección auditable, que dejaba sin definir. | [0012](0012-bitacora-de-eventos-del-animal.md) | Ídem. |
| [0008](0008-estado-operativo-y-disponibilidad-como-ejes-separados.md) | **`FOUND → ADOPTED` figura como "⚠ pendiente de confirmación": ya está aprobada.** Y la invariante "cierre ⇒ no disponible" figura como sin decidir: **se protege con un CHECK constraint.** | Decisiones del 2026-07-16, en [`../../CLAUDE.md`](../../CLAUDE.md) | Los cinco estados operativos, la disponibilidad como eje aparte, y `FOUND → DECEASED`. |
| [0009](0009-reapertura-por-adopcion-fallida.md) | **El hueco "no está definido quién queda como cuidador al reabrir": está cerrado.** La operación **debe crear un `Transit` nuevo** con una `Person` autenticada indicada **explícitamente**. Y el **diseño físico del evento** es un `AnimalEvent`. | [0012](0012-bitacora-de-eventos-del-animal.md) y [`../../CLAUDE.md`](../../CLAUDE.md) | `ADOPTED → IN_TRANSIT` solo por esta operación; fecha, responsable y motivo; se preserva el historial del mismo animal; nunca se duplica la ficha. |
| [0011](0011-correccion-administrativa-minima.md) | **El modelo físico de la auditoría**, que dejaba sin decidir: es un `AnimalEvent` de tipo `ADMIN_CORRECTION`. | [0012](0012-bitacora-de-eventos-del-animal.md) | Todo, incluida la distinción de alcance. |

**El contenido histórico de los ADR no se editó.** Los avisos se **agregaron** al
encabezado; ninguna decisión pasada se borró ni cambió de significado. Un ADR describe
lo que se decidió **en su fecha**, y reescribirlo borraría el registro de que alguna
vez pensamos distinto — que es su valor.

### Puntos abiertos que se cerraron después

Los ADR posteriores **completan** a los anteriores sin cambiarlos.

| ADR | Cierra un punto abierto de |
| --- | --- |
| [0005](0005-traspaso-con-propuesta-y-aceptacion.md) | [0001](0001-transito-como-evento.md) — "no dice cómo se ejecuta el traspaso, más allá de exigir que sea atómico". |
| [0007](0007-historial-y-correcciones-auditables.md) | [0001](0001-transito-como-evento.md) — "no implica que los tránsitos sean inmutables… no está aprobada y no se decide acá". |
| [0006](0006-estados-finales-del-animal.md) | La pregunta `REUNITED`/`DECEASED` de [`../modelo-de-dominio.md`](../modelo-de-dominio.md). |
| [0004](0004-identidad-con-supabase-auth.md) | La decisión de identidad de [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md). |
| [0008](0008-estado-operativo-y-disponibilidad-como-ejes-separados.md) | Los casos dudosos 1 y 3 de [`../modelo-de-dominio.md`](../modelo-de-dominio.md): animal encontrado fallecido, y `AVAILABLE_FOR_ADOPTION` mezclando dos ejes. |
| [0009](0009-reapertura-por-adopcion-fallida.md) | El caso dudoso 2 y el punto de [0006](0006-estados-finales-del-animal.md): "no decide si un estado final puede reabrirse". |
| [0010](0010-rls-desde-la-primera-migracion.md) | "¿RLS desde el día uno?" de [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md). |
| [0012](0012-bitacora-de-eventos-del-animal.md) | "No define el diseño físico del evento" de [0009](0009-reapertura-por-adopcion-fallida.md), y "no define el modelo físico de la auditoría" de [0011](0011-correccion-administrativa-minima.md). |

Por la regla de inmutabilidad, **los ADR 0001-0003 tampoco se editaron**. Si al leer
0001 encontrás que un punto "queda abierto", mirá estas tablas: puede haberse
cerrado después.

**Decisiones cerradas sin ADR propio.** No toda decisión merece un ADR: algunas son
detalles que un ADR anterior dejó pendientes y que se resolvieron sin cambiar ninguna
arquitectura. Viven en [`../../CLAUDE.md`](../../CLAUDE.md) y
[`../modelo-de-dominio.md`](../modelo-de-dominio.md):

- **`Person.authUserId` opcional y único** — cierra "no define el vínculo `Person` ↔ usuario" de [0004](0004-identidad-con-supabase-auth.md).
- **`TransitTransfer` como nombre**, con estados `PENDING` / `ACCEPTED` / `CANCELLED` / `EXPIRED` — cierra "no fija el nombre de la entidad" de [0005](0005-traspaso-con-propuesta-y-aceptacion.md).
- **Una sola propuesta `PENDING` por animal** — cierra "no decide si se permiten propuestas simultáneas" de [0005](0005-traspaso-con-propuesta-y-aceptacion.md).
- **`species` como enum `DOG` / `CAT` / `OTHER`** — cierra la pregunta "¿enum o campo simple?".
- **`FOUND → ADOPTED` aprobada** — cierra el "⚠ pendiente de confirmación" de [0008](0008-estado-operativo-y-disponibilidad-como-ejes-separados.md).
- **La invariante "cierre ⇒ no disponible" se protege con un CHECK constraint** — cierra "no decide si se protege con un constraint" de [0008](0008-estado-operativo-y-disponibilidad-como-ejes-separados.md).
- **`ADOPTION_RETURNED` debe crear un `Transit` nuevo, con receptor autenticado explícito** — cierra el hueco del cuidador de [0009](0009-reapertura-por-adopcion-fallida.md).

**El campo `vive` y los nombres en español no fueron decisiones de ningún ADR** —
estaban directamente en CLAUDE.md. Su reemplazo se explica en
[ADR 0006](0006-estados-finales-del-animal.md) y en el "Historial de este documento"
de [`../../CLAUDE.md`](../../CLAUDE.md).

---

## Reglas

1. **Los ADR son inmutables.** No se editan para reflejar un cambio de opinión. Si
   una decisión cambia, se escribe un ADR nuevo que la **supersede** (cae entera) o
   la **refina** (cae una parte), y **la relación se marca en el índice de este
   archivo**, no dentro del ADR viejo. El registro de que una vez pensamos distinto
   **es** el valor del archivo.
2. **Solo lo arquitectónico.** Un ADR es para decisiones costosas de revertir: las
   que condicionan el modelo de datos, el stack o los límites del sistema. La
   elección de un nombre de variable no es un ADR.
3. **CLAUDE.md manda.** Si un ADR lo contradice, gana CLAUDE.md y el ADR se
   corrige o se supersede. Los ADR **explican** las decisiones de CLAUDE.md; no las
   crean.
4. **Numeración correlativa**, sin reutilizar números.
5. **Un ADR no inventa decisiones.** Documenta las que ya están vigentes. Proponer
   algo nuevo no es un ADR: es una decisión pendiente, y va en
   [`../modelo-de-dominio.md`](../modelo-de-dominio.md) o
   [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md) hasta
   que se apruebe.

### Estados posibles

| Estado | Significa |
| --- | --- |
| `Propuesta` | Escrita, sin aprobar. No rige. |
| `Aceptada` | Vigente. Rige. |
| `Aceptada · refinada por NNNN` | Rige, **pero una parte fue reemplazada** por un ADR posterior. **No alcanza con leerlo solo**: mirar la tabla de refinamientos del índice. |
| `Superseded por NNNN` | Ya no rige **nada** de lo que decide. Se conserva como registro histórico. |
| `Deprecada` | Ya no rige y nada la reemplaza. |

**Refinada ≠ supersedida.** Supersedida es "esto ya no vale"; refinada es "esto vale
salvo la parte X". La mayoría de los cambios reales son refinamientos: rara vez una
decisión se cae entera.

**El estado se marca en el índice, no dentro del ADR.** El archivo no se toca: un ADR
describe lo que se decidió en su fecha, y editarlo borraría el registro de que alguna
vez pensamos distinto. El costo de esta elección es real —quien lee un ADR suelto
puede no enterarse de que fue refinado— y por eso el índice tiene una tabla de
refinamientos bien visible.

### Nota sobre los ADR 0001-0003

Los tres documentan decisiones **ya vigentes**, tomadas antes de que existiera este
registro: estaban en CLAUDE.md o en los comentarios del código. Se escribieron
retroactivamente el 2026-07-16 para rescatar su razonamiento —el ADR 0002, en
particular, existía únicamente como un comentario dentro de `prisma.config.ts`—.

**Sus secciones de "Alternativas consideradas" son una reconstrucción**, no un acta
de deliberación. Cada una lo aclara.

Los ADR **0004-0007 son distintos**: documentan decisiones tomadas y aprobadas el
2026-07-16, en el momento de escribirlos. Sus alternativas **sí** son las que se
evaluaron.

---

## Plantilla

```markdown
# NNNN — Título en una línea

- **Estado**: Propuesta | Aceptada | Superseded por NNNN | Deprecada
- **Fecha**: AAAA-MM-DD

## Contexto
Qué problema existe y qué fuerzas están en juego. Sin mencionar todavía la
solución.

## Decisión
Qué se decidió. En voz activa y afirmativa: "Usamos X".

## Alternativas consideradas
Qué más se evaluó y por qué se descartó. Una alternativa descartada sin razón
escrita reaparece en seis meses.

## Consecuencias
Qué se vuelve fácil y qué se vuelve difícil. Ambas cosas.

## Riesgos
Qué puede salir mal, y cómo nos daríamos cuenta.

## Qué no implica esta decisión
El límite explícito. Evita que la decisión se estire para justificar cosas que
nunca decidió.
```
