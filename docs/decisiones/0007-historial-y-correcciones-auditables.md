# 0007 — El historial no se reescribe con operaciones ordinarias; las correcciones son excepcionales y auditables

> ## ⚠ Estado actual: Aceptada, **refinada por [ADR 0011](0011-correccion-administrativa-minima.md)** y **completada por [ADR 0012](0012-bitacora-de-eventos-del-animal.md)**.
>
> **Consultar esos ADR para la regla vigente.** Lo que cambió:
>
> - Este ADR dice que **`ADMIN` "no se implementa en el MVP: ni el rol, ni sus
>   pantallas, ni el backoffice"**. Sigue sin haber backoffice, pero **sí debe existir
>   una capacidad mínima de corrección server-only y auditable antes del lanzamiento
>   público**. → [ADR 0011](0011-correccion-administrativa-minima.md)
> - El **mecanismo** de la corrección auditable, que este ADR dejaba sin definir, es
>   un `AnimalEvent` de tipo `ADMIN_CORRECTION`. →
>   [ADR 0012](0012-bitacora-de-eventos-del-animal.md)
>
> **Sigue vigente todo su principio**: el historial no se reescribe con operaciones
> ordinarias; las correcciones son excepcionales, autorizadas y auditables.

- **Estado**: Aceptada
- **Fecha**: 2026-07-16
- **Resuelve**: el punto que [ADR 0001](0001-transito-como-evento.md) dejó
  explícitamente abierto ("no implica que los tránsitos sean inmutables… no está
  aprobada y no se decide acá"). **No lo supersede**: 0001 sigue vigente.

## Contexto

El historial —la secuencia de tránsitos de un animal— **es el producto**. Toda la
arquitectura existe para poder reconstruirlo: por eso el tránsito es un evento y no
un campo ([ADR 0001](0001-transito-como-evento.md)).

Si cualquiera puede editar o borrar un tramo pasado, el historial deja de
documentar lo que ocurrió y pasa a documentar lo que el último editor quiso. La
cadena se vuelve una narración editable.

Pero la posición opuesta —**"append-only absoluto, nada se corrige nunca"**— tampoco
resiste el contacto con la realidad:

- La gente se equivoca: una fecha mal cargada, un traspaso aceptado por error.
- Hay fraude, cuentas duplicadas, personas que pierden acceso a su casilla.
- Un animal puede quedar con un tránsito activo que **nadie puede cerrar** porque su
  cuidador desapareció ([ADR 0004](0004-identidad-con-supabase-auth.md), riesgo 4).
- `DECEASED` es irreversible y puede marcarse por error
  ([ADR 0006](0006-estados-finales-del-animal.md), riesgo 3).

Prometer inmutabilidad total obliga a una de dos salidas peores: o el error queda
asentado para siempre, o alguien lo arregla con un `UPDATE` a mano contra la base —
**sin registro, sin autorización y sin rastro**. La segunda es lo que pasa siempre.

La tensión real no es "inmutable vs. editable". Es: **¿cómo se corrige un error sin
que la corrección sea indistinguible de una manipulación?**

## Decisión

**El historial no se reescribe mediante operaciones ordinarias. Las eventuales
correcciones administrativas deberán ser excepcionales, autorizadas y auditables,
preservando el dato original o registrando el evento correctivo.**

En concreto:

- **Ningún usuario común puede editar ni borrar tránsitos cerrados.** Ni el
  cuidador, ni el registrante, ni quien participó de ese tramo. **No hay excepción
  por rol** entre los usuarios comunes.
- El historial se corrige **agregando eventos**, no reescribiendo los anteriores.
- Se aprueba el rol conceptual **`ADMIN`**, que podrá intervenir en casos de
  **fraude, duplicados, errores graves, abandono o pérdida de acceso**.
- Toda intervención administrativa debe ser **excepcional, autorizada y auditable**,
  y debe **preservar el dato original o registrar el evento correctivo**. Una
  corrección que no deja rastro es indistinguible de una manipulación.
- **El rol `ADMIN` no se implementa en el MVP**: ni el rol, ni sus pantallas, ni el
  backoffice. Se aprueba como concepto para que el modelo pueda alojarlo sin
  romperse.

## Alternativas consideradas

**1. Append-only absoluto: nada se corrige jamás.** Descartada. Es la más simple de
enunciar y la más fácil de garantizar técnicamente, pero **falla ante el primer
error real**. Y no elimina las correcciones: las empuja fuera del sistema, a un
`UPDATE` manual contra la base, que es la peor versión posible — sin autorización,
sin registro y sin rastro.

**2. Edición libre por parte de los participantes.** Cada quien corrige su tramo.
Descartada: el historial deja de ser evidencia de nada. Y el incentivo a
"corregirlo" aparece justo cuando el tramo es incómodo — un animal que murió al
cuidado de alguien, un traspaso que no debió aceptarse.

**3. Borrado lógico** (marcar como borrado sin eliminar la fila). Descartada **como
mecanismo de corrección**: un tramo "borrado" que igual existe pero no se muestra
oculta la historia sin registrar quién ni por qué la ocultó. No es descartable como
detalle de implementación **dentro** de una intervención auditada, pero no es la
decisión.

**4. Implementar `ADMIN` ya, en el MVP.** Descartada por alcance: es un backoffice
completo (autenticación de rol, pantallas, auditoría) para un sistema que todavía no
tiene ni un usuario. Se aprueba el concepto, no la construcción.

## Consecuencias

**Se vuelve fácil:**
- El historial vale como **evidencia declarativa asociada a cuentas verificadas**:
  lo que muestra es lo que se declaró, no lo que alguien editó después.
- **Auditabilidad alta** de la cadena, con acciones atribuibles a cuentas
  autenticadas.
- Los errores tienen una vía prevista, en vez de terminar en un `UPDATE` a mano.
- El modelo puede alojar `ADMIN` más adelante sin rediseño.

**Se vuelve difícil:**
- **En el MVP, un error grave no tiene arreglo dentro del producto.** `ADMIN` está
  aprobado pero no construido: durante toda la vida del MVP, un traspaso aceptado
  por error o un `DECEASED` equivocado **quedan asentados**. Es una consecuencia
  deliberada y hay que asumirla con los ojos abiertos.
- Toda corrección exige diseñar el evento correctivo. No alcanza con "editar".
- La UI tiene que mostrar historias con correcciones, no solo la versión final. Es
  más difícil de leer que una lista limpia.
- Los datos crecen: nada se borra.
- **Choca con "derecho al olvido".** Si alguien pide que se borren sus datos, un
  historial que no se reescribe **no puede simplemente cumplirlo**. Sin resolver.

## Riesgos

**1. Que la ausencia de `ADMIN` en el MVP se vuelva insostenible antes de lo
previsto.** *Cómo nos daríamos cuenta*: pedidos de corrección que hoy solo se pueden
atender con un `UPDATE` manual a la base. **Ese es precisamente el escenario que
esta decisión busca evitar, y es el más probable de todos**, porque el MVP no tiene
la herramienta que la propia decisión describe.

**2. Corrección manual contra la base "por única vez".** Alguien —probablemente
nosotros— corrige un dato a mano en Supabase Studio. Sin registro, sin autorización,
sin rastro. **La decisión no lo impide técnicamente: nada lo impide.** Solo lo
declara inaceptable.

**3. `ADMIN` sin límites definidos.** Se aprueba el rol y sus motivos de
intervención, pero **el alcance exacto de sus facultades sigue abierto**. Un rol
capaz de reescribir cualquier cosa sin límites es, en la práctica, el problema que
esta decisión evita — con un nombre distinto.

**4. Auditoría que nadie mira.** Registrar el evento correctivo no sirve si nadie
lo revisa. La auditabilidad es una capacidad, no un control.

**5. Confundir "no reescribible" con "verdadero".** El historial registra lo que las
cuentas **declararon**. Que sea difícil de alterar después **no lo hace cierto**: no
prueba posesión física, ni identidad civil, ni que un traspaso haya ocurrido
([ADR 0004](0004-identidad-con-supabase-auth.md)). Un dato falso bien asentado es
igual de falso.

## Qué no implica esta decisión

- **No implica que nada de esto esté implementado.** No hay historial, ni tránsitos,
  ni rol, ni auditoría. Ver [`../estado-actual.md`](../estado-actual.md).
- **No implementa `ADMIN`**: ni el rol, ni permisos, ni pantallas, ni backoffice.
- **No define el alcance exacto de las facultades de `ADMIN`** — sigue abierto en
  [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md).
- **No define el mecanismo** de la corrección auditable: si es una tabla de
  auditoría, un evento correctivo, versionado, u otra cosa. **Se decide cuando se
  construya.**
- **No decide si un estado final puede reabrirse** por vía administrativa
  ([ADR 0006](0006-estados-finales-del-animal.md), riesgo 2).
- **No convierte el historial en inmutable a nivel técnico.** No hay nada en la base
  que impida un `UPDATE`. Esto es una **regla de producto**, no una garantía
  criptográfica ni estructural.
- **No decide qué se muestra públicamente.** Eso es privacidad, y está en CLAUDE.md
  → "Privacidad del historial".
- **No resuelve el borrado de datos personales a pedido.**
- **No aplica a los datos descriptivos del animal** (nombre, vacunas, tamaño), que
  son corregibles. Aplica al **historial de tránsitos**. Quién puede editar esos
  datos descriptivos **sigue pendiente**.
