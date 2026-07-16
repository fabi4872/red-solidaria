# 0012 — Bitácora de eventos del animal: `AnimalEvent`

- **Estado**: Aceptada
- **Fecha**: 2026-07-16
- **Completa a**: [ADR 0009](0009-reapertura-por-adopcion-fallida.md) ("no define el
  diseño físico del evento") y
  [ADR 0011](0011-correccion-administrativa-minima.md) ("no define el modelo físico
  de la auditoría").

## Contexto

Al cerrar la tercera ronda quedaron dos decisiones aprobadas **sin lugar donde
vivir**:

- **`ADOPTION_RETURNED`** ([ADR 0009](0009-reapertura-por-adopcion-fallida.md)) debe
  registrarse con fecha, responsable y motivo. ¿Dónde?
- **La corrección administrativa mínima**
  ([ADR 0011](0011-correccion-administrativa-minima.md)) debe registrar
  administrador, fecha, motivo, dato original y dato corregido. ¿Dónde?

Ambas necesitan lo mismo: **un lugar donde asentar que algo pasó**, con quién, cuándo
y por qué. Y ninguna de las entidades existentes sirve. `Transit` registra períodos
de cuidado, no hechos puntuales. `TransitTransfer` registra propuestas. El `Animal`
guarda cómo está ahora, no cómo llegó ahí.

Hay una tercera necesidad, menos urgente pero real: el historial que el sistema
muestra hoy se arma **solo con tránsitos**. Una adopción, un reencuentro o un
fallecimiento no son tránsitos, así que la cadena que ve el usuario termina de golpe
y sin desenlace.

La tentación evidente —y el riesgo— es resolver esto convirtiendo todo en eventos.
Eso sería rehacer el modelo entero, y contradice frontalmente
[ADR 0001](0001-transito-como-evento.md), que dice explícitamente: *"No implica event
sourcing. El resto del sistema no se modela como eventos."*

## Decisión

**Se aprueba conceptualmente una entidad adicional: `AnimalEvent`.**

Es una **bitácora**: registra eventos auditables del ciclo de vida del animal. Sirve
para soportar la adopción, la devolución de adopción, el reencuentro, el
fallecimiento, las correcciones administrativas y otros eventos relevantes.

**Tipos conceptuales iniciales:**

| Tipo | Registra |
| --- | --- |
| `REGISTERED` | El alta del animal. |
| `TAKEN_IN_TRANSIT` | Alguien lo tomó en tránsito. |
| `TRANSFER_PROPOSED` | Se propuso un traspaso. |
| `TRANSFER_ACCEPTED` | El receptor aceptó. |
| `ADOPTED` | Adopción. |
| `ADOPTION_RETURNED` | La adopción fracasó y el animal vuelve al circuito. |
| `REUNITED` | Reencuentro con la familia. |
| `DECEASED` | Fallecimiento. |
| `ADMIN_CORRECTION` | Corrección administrativa. |

**Los campos físicos no se diseñan acá.**

### La corrección administrativa es un `AnimalEvent`

La corrección administrativa mínima de
[ADR 0011](0011-correccion-administrativa-minima.md) **se registra como un
`AnimalEvent` de tipo `ADMIN_CORRECTION`**, y conserva conceptualmente:

- administrador responsable;
- fecha;
- motivo;
- entidad o dato afectado;
- valor original;
- valor corregido.

El diseño físico de los valores anterior/nuevo **podrá usar JSON**, pero eso se
resuelve al escribir el schema.

**No se diseña un editor administrativo genérico.** La primera implementación son
**operaciones server-only específicas y controladas** — no un formulario que edite
cualquier campo de cualquier tabla.

## Diferencia respecto de event sourcing

**Esto NO es event sourcing.** La distinción no es una formalidad: define qué es
verdad en este sistema.

| | Event sourcing | `AnimalEvent` (lo que hacemos) |
| --- | --- | --- |
| Fuente de verdad | **Los eventos.** | **Las entidades normales** (`Animal`, `Transit`, `TransitTransfer`, `Photo`). |
| Estado actual | Se **reconstruye** reproduciendo los eventos. | Se **lee** del campo `status` del animal. |
| Si se borran los eventos | El sistema pierde todo. | El sistema sigue funcionando; se pierde la bitácora. |
| Rol de los eventos | Son el sistema. | Son un **registro de lo que pasó**. |

Cuatro reglas que fijan el límite:

1. **`AnimalEvent` NO convierte el sistema en event sourcing.**
2. **Las entidades normales siguen siendo la fuente de verdad.**
3. **El estado actual NO se reconstruye exclusivamente desde eventos.**
4. **`AnimalEvent` no reemplaza `Transit` ni `TransitTransfer`.**

Dicho corto: **las entidades responden "cómo está ahora"; los eventos responden "qué
pasó".** Si alguna vez el código empieza a derivar el estado de la bitácora, esta
decisión se rompió — aunque nadie lo haya anunciado.

Esto es coherente con [ADR 0001](0001-transito-como-evento.md): el cuidador actual se
deriva del tránsito activo, no de eventos. Esa regla no cambia.

## Alternativas consideradas

**1. Nada: cada operación registra lo suyo donde pueda.** Es lo que había.
Descartada: `ADOPTION_RETURNED` y `ADMIN_CORRECTION` quedaban sin lugar, y el
historial visible se cortaba al llegar al desenlace.

**2. Una tabla por tipo de evento** (`AdoptionReturn`, `AdminCorrection`, …).
Descartada: cada desenlace nuevo sería una tabla nueva, y armar una línea de tiempo
exigiría unir todas. La bitácora es una sola cosa; que sean varias tablas no la hace
más clara.

**3. Event sourcing completo.** Descartada de plano: contradice
[ADR 0001](0001-transito-como-evento.md), rehace el modelo entero y agrega una
complejidad enorme a un MVP que todavía no tiene un usuario. Además, derivar el
cuidador actual reproduciendo eventos es más frágil que leerlo del tránsito activo.

**4. Solo un log de texto** (quién, cuándo, qué, en prosa). Descartada: no se puede
consultar, no se puede tipar, y para `ADMIN_CORRECTION` hay que conservar el valor
original de forma recuperable — no una frase que lo describa.

**5. Guardar solo los eventos que no son derivables** (`ADOPTION_RETURNED`,
`ADMIN_CORRECTION`, y los desenlaces). Es la alternativa más honesta y estuvo cerca:
evita la duplicación que se describe abajo. **Descartada** porque produce una línea de
tiempo con agujeros —el tramo de tránsitos habría que reconstruirlo aparte y
mezclarlo— y porque la regla "toda operación de dominio escribe su evento" es más
fácil de sostener que "algunas sí y otras no". **Es una decisión discutible y su
costo es real**, ver el riesgo 1.

## Consecuencias

**Se vuelve fácil:**
- `ADOPTION_RETURNED` y `ADMIN_CORRECTION` tienen dónde vivir, con fecha,
  responsable y motivo.
- El historial que ve el usuario **llega hasta el desenlace**, en vez de cortarse.
- Una sola línea de tiempo por animal, uniforme, sin unir cuatro tablas.
- Agregar un tipo de evento es un valor de enum, no una tabla.
- La auditoría de [ADR 0007](0007-historial-y-correcciones-auditables.md) deja de ser
  aspiracional: tiene una forma concreta.

**Se vuelve difícil:**
- **Toda operación de dominio pasa a escribir en dos lugares**: la entidad y el
  evento. **Dentro de la misma transacción, siempre.** Es una obligación nueva y
  fácil de olvidar.
- **La bitácora duplica información que ya está en otro lado** (ver riesgo 1).
- Más filas: la bitácora crece y nunca se borra.
- La UI tiene que mostrar una línea de tiempo mixta, con eventos de naturalezas
  distintas.
- `ADMIN_CORRECTION` obliga a representar "cómo era antes" de forma genérica —
  probablemente JSON, que no tiene garantías de forma.

## Riesgos

**1. Duplicación deliberada, y la deriva que trae.** Es el riesgo central y conviene
mirarlo de frente: **`REGISTERED`, `TAKEN_IN_TRANSIT`, `TRANSFER_PROPOSED` y
`TRANSFER_ACCEPTED` son derivables** de `Transit` y `TransitTransfer`. Esa
información ya existe; la bitácora la repite. Solo `ADMIN_CORRECTION`, los desenlaces
y `ADOPTION_RETURNED` aportan algo que no está en otro lado.

Y donde hay dos copias, hay divergencia: un `Transit` creado sin su evento, o un
evento escrito sobre una operación que después falló. **Es exactamente el tipo de
duplicación que [ADR 0001](0001-transito-como-evento.md) evita con el cuidador
actual** — solo que acá se acepta a propósito, a cambio de la línea de tiempo
uniforme. *Cómo nos daríamos cuenta*: cantidad de tránsitos ≠ cantidad de eventos de
tránsito. **Nadie lo va a estar mirando.** *Mitigación*: escribir entidad y evento en
la misma transacción, sin excepción.

**2. Que se convierta en event sourcing sin que nadie lo decida.** Empieza con "ya
que tengo los eventos, derivo esto de acá". Cada paso parece razonable y ninguno se
anuncia. *Cómo nos daríamos cuenta*: código que lee `AnimalEvent` para saber **cómo
está** el animal en vez de **qué le pasó**.

**3. Que la bitácora se crea confiable.** Un evento dice lo que el código escribió, y
solo si el código lo escribió. **No es una prueba de nada**: sigue siendo evidencia
declarativa asociada a una cuenta verificada
([ADR 0004](0004-identidad-con-supabase-auth.md)). Un `AnimalEvent` bien guardado de
un hecho falso es igual de falso.

**4. `ADMIN_CORRECTION` con JSON sin forma.** Sin estructura, "valor original" puede
terminar siendo cualquier cosa, y recuperarlo un ejercicio de arqueología.

**5. Eventos huérfanos de `ADMIN_CORRECTION`.** La corrección puede tocar una entidad
que no es el animal —una `Person`, un `Transit`— pero el evento cuelga del animal. Si
alguna vez hay que corregir algo que no tiene animal asociado, **esta bitácora no
tiene dónde ponerlo**. *No está resuelto.*

**6. Auditoría que nadie mira** ([ADR 0007](0007-historial-y-correcciones-auditables.md),
riesgo 4). Registrar no es controlar.

## Qué no implica esta decisión

- **No implica que exista nada.** No hay entidad, ni evento, ni bitácora, ni schema.
  Ver [`../estado-actual.md`](../estado-actual.md).
- **No es event sourcing**, ni un paso hacia él. Ver la sección dedicada.
- **No reemplaza `Transit` ni `TransitTransfer`**, que siguen siendo las entidades del
  traspaso.
- **No cambia [ADR 0001](0001-transito-como-evento.md)**: el cuidador actual se sigue
  derivando del tránsito activo, no de eventos.
- **No define los campos físicos** de `AnimalEvent`, ni el tipo del payload, ni si los
  valores anterior/nuevo van en JSON.
- **No cierra la lista de tipos**: son los iniciales.
- **No decide si los eventos son inmutables** a nivel técnico.
- **No diseña un editor administrativo genérico.** La primera implementación son
  operaciones server-only específicas y controladas.
- **No define quién puede leer la bitácora.** El historial público oculta datos
  personales (CLAUDE.md → "Privacidad del historial"); **si la bitácora es pública, y
  con qué nivel de detalle, no está decidido** — un `ADMIN_CORRECTION` visible
  expondría la intervención y su motivo.
- **No resuelve dónde se registra una corrección** que no involucre a un animal.
