# 0006 — Estados finales del animal: `REUNITED` y `DECEASED`, y baja del campo `vive`

> ## ⚠ Estado actual: Aceptada, **refinada por [ADR 0008](0008-estado-operativo-y-disponibilidad-como-ejes-separados.md) y [ADR 0009](0009-reapertura-por-adopcion-fallida.md)**.
>
> **Consultar esos ADR para la regla vigente.** El contenido de abajo es el registro
> histórico de lo que se decidió el 2026-07-16 y **no representa por sí solo la regla
> actual**. Dos cosas cambiaron:
>
> - **La lista de estados y la tabla de transiciones.** Ya no existe
>   `AVAILABLE_FOR_ADOPTION` como estado: los operativos son **cinco**, y la
>   disponibilidad es el eje aparte `isAvailableForAdoption`. Se agregó
>   `FOUND → DECEASED`. → [ADR 0008](0008-estado-operativo-y-disponibilidad-como-ejes-separados.md)
> - **`ADOPTED` ya no es un final absoluto**: es un cierre operativo con una salida
>   excepcional (`ADOPTION_RETURNED`). → [ADR 0009](0009-reapertura-por-adopcion-fallida.md)
>
> **Sigue vigente**: la baja del campo `vive`, la existencia de `REUNITED` y
> `DECEASED` como finales absolutos, y el cierre del tránsito activo en toda
> transición de cierre.

- **Estado**: Aceptada
- **Fecha**: 2026-07-16
- **Resuelve**: la decisión que
  [`../modelo-de-dominio.md`](../modelo-de-dominio.md) marcaba como pendiente
  ("¿Agregar `REUNITED` y `DECEASED`?").

## Contexto

La máquina de estados original tenía cuatro estados —`encontrado`, `en_transito`,
`en_adopcion`, `adoptado`— y **solo modelaba finales felices**.

Si un animal se reencontraba con su familia o fallecía durante el tránsito, **no
había forma de representarlo**. La única salida disponible era `adoptado`, que en
ambos casos es un registro falso. Para un sistema cuyo propósito es dejar registro
fiel de una cadena de custodia, asentar "adoptado" sobre un animal que murió no es
una imprecisión menor: es la cadena mintiendo en el eslabón que más importa.

Los dos casos no eran simétricos, y por eso se analizaron por separado:

- **Reencuentro**: concepto **completamente ausente**. Ningún campo lo insinuaba.
- **Fallecimiento**: **ya estaba parcialmente modelado**. El animal tenía un campo
  `vive` (sí/no). Era representable **como atributo**, pero no como estado ni como
  transición.

Ese campo `vive` es el nudo del problema. Con `vive` **y** un estado `DECEASED`
existirían **dos fuentes de verdad** sobre si el animal está vivo, y **pueden
contradecirse**: `vive = sí` con `status = DECEASED` es un estado imposible que
nada impediría escribir. Es exactamente el mismo error que
[ADR 0001](0001-transito-como-evento.md) evita con el cuidador actual — derivar en
lugar de duplicar.

## Decisión

**Estados** (enum en inglés y mayúsculas):

`FOUND`, `IN_TRANSIT`, `AVAILABLE_FOR_ADOPTION`, `ADOPTED`, `REUNITED`, `DECEASED`.

**Estados finales**: `ADOPTED`, `REUNITED`, `DECEASED`. No se sale de ellos.

**Se elimina el atributo booleano `vive` / `isAlive` del modelo conceptual.** La
vida o el fallecimiento del animal **no tiene dos fuentes de verdad**: se representa
únicamente con el estado `DECEASED`.

**Toda transición a un estado final debe cerrar el tránsito activo, si lo hay,
dentro de una única transacción.** Un animal adoptado, reencontrado o fallecido no
puede quedar con un cuidador asignado: sería afirmar que alguien lo tiene cuando ya
nadie lo tiene.

### Tabla de transiciones — PROPUESTA

| Desde | Hacia | Estado |
| --- | --- | --- |
| `FOUND` | `IN_TRANSIT` | Heredada del modelo original |
| `FOUND` | `AVAILABLE_FOR_ADOPTION` | Heredada |
| `FOUND` | `REUNITED` | **Nueva.** La familia aparece antes de que nadie lo cuide. |
| `IN_TRANSIT` | `IN_TRANSIT` | Heredada. Traspaso: cambia el cuidador, no el estado. |
| `IN_TRANSIT` | `AVAILABLE_FOR_ADOPTION` | Heredada |
| `IN_TRANSIT` | `ADOPTED` | Heredada |
| `IN_TRANSIT` | `REUNITED` | **Nueva** |
| `IN_TRANSIT` | `DECEASED` | **Nueva.** Muere estando al cuidado de alguien. |
| `AVAILABLE_FOR_ADOPTION` | `IN_TRANSIT` | Heredada |
| `AVAILABLE_FOR_ADOPTION` | `ADOPTED` | Heredada |
| `AVAILABLE_FOR_ADOPTION` | `REUNITED` | **Nueva** |
| `AVAILABLE_FOR_ADOPTION` | `DECEASED` | **Nueva** |

Cualquier transición que no figure acá **debe rechazarse en el código**, en un solo
lugar reutilizable.

> ⚠ **Esta tabla es una propuesta y tiene casos dudosos sin resolver.** Están
> enumerados en [`../modelo-de-dominio.md`](../modelo-de-dominio.md) → "Casos
> dudosos de la máquina de estados". **Deben revisarse antes de escribir el schema.**
> El más importante lo crea esta misma decisión: al eliminar `vive`, **un animal
> encontrado ya muerto no tiene cómo registrarse**.

## Alternativas consideradas

**1. Dejar la máquina como estaba** (cuatro estados, sin finales tristes).
Descartada: obliga a registrar como `adoptado` a un animal que murió o volvió con su
familia. El sistema mentiría en su dato más sensible.

**2. Agregar `REUNITED` pero no `DECEASED`**, dejando el fallecimiento en el campo
`vive`. Descartada: mantiene las dos fuentes de verdad y deja el fallecimiento como
un atributo silencioso, sin transición validada ni cierre del tránsito.

**3. Conservar `vive` **junto con** `DECEASED`**, con `vive` como "apareció vivo o
muerto" y `DECEASED` como "murió durante el proceso". Es la alternativa más
defendible de las tres: son dos hechos distintos. **Descartada** porque el costo de
dos campos que pueden contradecirse supera el beneficio de distinguir esos casos, y
porque nada impediría escribir la combinación imposible. **Su descarte es lo que
genera el caso dudoso del animal encontrado ya muerto** — el problema real que
resolvía no desapareció, solo quedó sin representación.

**4. Un estado `CLOSED` genérico con un motivo aparte.** Descartada: mueve el
problema a un campo `reason` sin validación, y hace que las transiciones no puedan
distinguir un desenlace de otro.

## Consecuencias

**Se vuelve fácil:**
- Registrar los tres desenlaces reales sin falsear ninguno.
- **Imposible la contradicción "vivo y fallecido"**: no hay dos campos que puedan
  discrepar.
- La regla "estado final ⇒ sin cuidador" es uniforme para los tres finales.
- Estadísticas honestas: cuántos animales se reencontraron, cuántos murieron.
- Agregar un valor a un enum **antes** de que haya datos reales es gratis;
  reinterpretar filas históricas después, no.

**Se vuelve difícil:**
- **Un animal encontrado ya muerto no tiene cómo registrarse.** El campo `vive` lo
  permitía; el estado inicial `FOUND` presupone un animal vivo. Esto **es una
  pérdida de capacidad**, y es el caso dudoso principal.
- Más transiciones que validar y que testear.
- `DECEASED` es un dato sensible que **cualquiera con la cuenta del cuidador puede
  asentar**, sin evidencia. Qué evidencia exigir **está pendiente**.
- Tres finales significan tres caminos sin retorno. **Una adopción o un reencuentro
  que fracasan no tienen vuelta** en el modelo actual: el animal habría que
  registrarlo de nuevo, **perdiendo el vínculo con su historial anterior** —
  justo lo que el sistema existe para conservar.

## Riesgos

**1. El animal encontrado muerto queda fuera del sistema.** *Cómo nos daríamos
cuenta*: alguien intenta registrar uno y no encuentra cómo, o lo registra como
`FOUND` y lo pasa a `DECEASED` de inmediato — **una transición que la tabla
propuesta no permite**. Es un caso real: registrar un animal fallecido sirve para
que una familia que lo busca deje de buscarlo. *Pendiente de resolver.*

**2. Falta de retorno desde un estado final.** Una adopción que se cae a los dos
meses deja al animal sin camino de vuelta. *Cómo nos daríamos cuenta*: animales
duplicados, registrados dos veces, con dos historiales inconexos. **Es el riesgo
más probable de todos**, porque las adopciones fallidas son comunes. *Mitigación
posible, no decidida*: permitir la reapertura como intervención administrativa
auditable ([ADR 0007](0007-historial-y-correcciones-auditables.md)) en lugar de
como transición ordinaria.

**3. `DECEASED` marcado por error o de mala fe.** Es irreversible y borra al animal
de las búsquedas activas. Si además fue un error, no hay vuelta atrás sin
intervención administrativa. *Sin evidencia requerida ni procedimiento definido.*

**4. Transición a final con el tránsito abierto.** Si la transacción falla a medias,
queda un animal `DECEASED` con cuidador activo. La transacción lo previene; **hay
que testearlo**, y está dentro del núcleo de testing aprobado.

**5. `AVAILABLE_FOR_ADOPTION` y la custodia son ejes distintos.** Un animal en
adopción **sigue estando en manos de alguien**. Como solo los estados finales
cierran el tránsito, un animal puede estar `AVAILABLE_FOR_ADOPTION` **con tránsito
activo** — lo cual es correcto, pero significa que el estado **mezcla dos ejes**:
dónde está el animal y si se lo puede adoptar. *Está registrado como caso dudoso;
no se resuelve acá.*

## Qué no implica esta decisión

- **No implica que la máquina de estados esté implementada.** No existe: no hay
  enum, ni validación, ni schema. Ver [`../estado-actual.md`](../estado-actual.md).
- **No cierra la tabla de transiciones**: es una propuesta con casos dudosos
  pendientes de revisión.
- **No resuelve cómo registrar un animal encontrado ya muerto.**
- **No decide qué evidencia se exige** para marcar `DECEASED`.
- **No decide quién puede marcar** `ADOPTED`, `REUNITED` ni `DECEASED` — sigue
  abierto en
  [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md).
- **No decide si un estado final puede reabrirse** por intervención administrativa.
- **No define el nombre del enum ni del campo** en el schema (`status`,
  `AnimalStatus`, …).
- **No cambia [ADR 0001](0001-transito-como-evento.md).** El estado sigue siendo un
  campo del animal; el cuidador se sigue derivando del tránsito activo. Son ejes
  distintos.
