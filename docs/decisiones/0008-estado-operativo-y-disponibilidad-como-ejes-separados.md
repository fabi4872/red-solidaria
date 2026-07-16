# 0008 — Cinco estados operativos y la disponibilidad para adopción como eje aparte

> ## ⚠ Estado actual: Aceptada, con **dos puntos cerrados después**.
>
> **Consultar [`../../CLAUDE.md`](../../CLAUDE.md) para la regla vigente.** El
> contenido de abajo es el registro de lo decidido el 2026-07-16 y **deja dos cosas
> abiertas que ya se resolvieron**:
>
> - **`FOUND → ADOPTED` está aprobada.** Abajo figura como "⚠ Propuesta — pendiente
>   de confirmación"; **ya no lo está**. La operación debe registrar quién adopta,
>   dejar `isAvailableForAdoption = false`, validar que no exista tránsito activo,
>   conservar el mismo `Animal` y su historial, y **no crear un tránsito ficticio**.
> - **La invariante "cierre ⇒ no disponible" se protege también en la base**, con un
>   **CHECK constraint** de PostgreSQL, además de la lógica de negocio y las
>   transacciones. Abajo figura como sin decidir.
>
> **Todo lo demás sigue vigente**: los cinco estados operativos, la disponibilidad
> como eje aparte, y `FOUND → DECEASED`.

- **Estado**: Aceptada
- **Fecha**: 2026-07-16
- **Refina a**: [ADR 0006](0006-estados-finales-del-animal.md). **Reemplaza su lista
  de estados y su tabla de transiciones.** El resto de 0006 sigue vigente: la baja
  del campo `vive`, la existencia de `REUNITED` y `DECEASED`, y la regla de que
  toda transición de cierre cierra el tránsito activo dentro de una transacción.
- **Cierra**: los casos dudosos 1 y 3 de
  [`../modelo-de-dominio.md`](../modelo-de-dominio.md).

## Contexto

[ADR 0006](0006-estados-finales-del-animal.md) dejó dos casos dudosos abiertos, y
ambos apuntaban al mismo defecto: **el enum de estados estaba mezclando dos cosas
que no son la misma.**

**1. `AVAILABLE_FOR_ADOPTION` mezclaba dos ejes.** Un animal en adopción **sigue
estando en manos de alguien**. Como estado excluyente de `IN_TRANSIT`, obligaba a
elegir entre describir *dónde está el animal* o *si se lo puede adoptar* — cuando
en la realidad ambas cosas son ciertas a la vez. Un perro puede estar al cuidado de
Ana **y** disponible para adopción; el enum no podía decir eso.

**2. Un animal encontrado ya muerto no tenía cómo registrarse.** El propio ADR 0006
creó este hueco al eliminar el campo `vive`: `FOUND` presupone un animal vivo y la
tabla no permitía `FOUND → DECEASED`. Es un caso real y útil — registrar un animal
fallecido sirve para que **una familia que lo busca deje de buscarlo**.

Los dos problemas se resuelven acá porque los dos son sobre **la forma de la
máquina de estados**.

## Decisión

### Cinco estados operativos

`FOUND`, `IN_TRANSIT`, `ADOPTED`, `REUNITED`, `DECEASED`.

**`AVAILABLE_FOR_ADOPTION` deja de ser un valor del estado operativo.**

### La disponibilidad es un eje aparte

Se representa conceptualmente con **`isAvailableForAdoption: boolean`**.

Reglas:

- `FOUND` puede estar disponible o no.
- `IN_TRANSIT` puede estar disponible o no.
- `ADOPTED`, `REUNITED` y `DECEASED` **siempre** tienen
  `isAvailableForAdoption = false`.
- **Toda transición a un estado de cierre desactiva la disponibilidad dentro de la
  misma transacción**, junto con el cierre del tránsito activo.

### Registro de un animal encontrado ya fallecido

**Se aprueba la transición `FOUND → DECEASED`.**

Debe ser posible registrar un animal encontrado ya fallecido. **La foto inicial y
la ubicación siguen siendo obligatorias.**

**`DECEASED` no es un estado inicial.** El animal se crea en `FOUND` y transiciona
a `DECEASED`; **la creación del registro y su estado `DECEASED` se persisten de
forma consistente dentro de la operación inicial** — una sola transacción, no dos
pasos que alguien pueda dejar a medias.

`DECEASED` es final y **no tiene salida ordinaria**.

### Tabla de transiciones

| Desde | Hacia | Nota |
| --- | --- | --- |
| `FOUND` | `IN_TRANSIT` | Alguien lo toma en tránsito. |
| `FOUND` | `REUNITED` | La familia aparece antes de que nadie lo cuide. |
| `FOUND` | `DECEASED` | **Nueva.** Encontrado ya fallecido, o muere antes de que alguien lo tome. Atómica con el registro inicial cuando aplica. |
| `IN_TRANSIT` | `IN_TRANSIT` | Traspaso aceptado. Cambia el cuidador, no el estado. |
| `IN_TRANSIT` | `ADOPTED` | |
| `IN_TRANSIT` | `REUNITED` | |
| `IN_TRANSIT` | `DECEASED` | |
| `ADOPTED` | `IN_TRANSIT` | **Solo** por `ADOPTION_RETURNED`. Ver [ADR 0009](0009-reapertura-por-adopcion-fallida.md). |
| `FOUND` | `ADOPTED` | ⚠ **Propuesta — pendiente de confirmación.** Ver abajo. |

`REUNITED` y `DECEASED` son **finales absolutos**: no se sale de ellos por ninguna
vía.

> ### ⚠ `FOUND → ADOPTED`: pendiente de confirmación
>
> **Quitar `AVAILABLE_FOR_ADOPTION` del enum eliminó, sin quererlo, un camino que
> antes existía.** El modelo original permitía
> `encontrado → en_adopcion → adoptado`: un animal podía adoptarse **sin pasar
> nunca por un tránsito**. Al desaparecer el estado intermedio, ese camino se cae.
>
> Si **no** se permite `FOUND → ADOPTED`, toda adopción exige un tránsito previo —
> **una restricción nueva que nadie decidió**, introducida como efecto colateral de
> esta decisión. Por eso la tabla la incluye como propuesta: **restituye una
> capacidad que ya existía**, no agrega una.
>
> El caso real: alguien encuentra un perro y se lo queda. **Requiere tu
> confirmación explícita.**

## Alternativas consideradas

**1. Dejar `AVAILABLE_FOR_ADOPTION` como estado** (lo que decidía ADR 0006).
Descartada: obliga a mentir sobre uno de los dos ejes. Con un animal cuidado por
Ana y ofrecido en adopción, o el estado dice `IN_TRANSIT` y la disponibilidad se
pierde, o dice `AVAILABLE_FOR_ADOPTION` y el sistema deja de mostrar que Ana lo
tiene — cuando lo tiene.

**2. Estado compuesto** (`IN_TRANSIT_AVAILABLE`, `IN_TRANSIT_NOT_AVAILABLE`, …).
Descartada: multiplica los valores del enum por cada eje que se agregue, y las
transiciones se vuelven un producto cartesiano. Es el mismo error, con más filas.

**3. Derivar la disponibilidad** en lugar de almacenarla — por ejemplo, "está
disponible si no tiene adoptante asignado". Descartada: la disponibilidad es **una
decisión de una persona**, no una consecuencia de otros datos. Un cuidador puede
tener al animal y no ofrecerlo todavía. No hay de qué derivarla.

**4. Para el animal fallecido: permitir `DECEASED` como estado inicial.**
Descartada a favor de la transición atómica. Un estado inicial `DECEASED` haría que
el registro nazca en un estado final, sin transición que validar, y duplicaría los
caminos de creación. La transición dentro de la misma transacción da el mismo
resultado con una sola puerta de entrada.

**5. Para el animal fallecido: dejarlo fuera del MVP.** Descartada: es un caso real
con valor propio — que una familia deje de buscar es un desenlace del sistema, no
un caso borde.

## Consecuencias

**Se vuelve fácil:**
- Decir la verdad sobre los dos ejes a la vez: quién tiene al animal **y** si se lo
  puede adoptar.
- Listar animales disponibles sin importar en qué estado operativo estén: es un
  filtro por un booleano.
- Registrar un animal encontrado muerto, cerrando el hueco que abrió ADR 0006.
- El enum queda **más chico** que antes (cinco valores en vez de seis) y cada valor
  significa una sola cosa.
- Ofrecer o retirar de adopción **no es una transición de estado**: no toca la
  máquina, no valida nada del ciclo de vida.

**Se vuelve difícil:**
- **Aparece una invariante nueva que hay que sostener**: "estado de cierre ⇒
  `isAvailableForAdoption = false`". Antes era imposible por construcción — el
  estado era uno solo. Ahora **son dos campos que pueden contradecirse**, y es
  exactamente el tipo de duplicación que [ADR 0001](0001-transito-como-evento.md) y
  [ADR 0006](0006-estados-finales-del-animal.md) evitan en otros lados. **Es el
  costo consciente de esta decisión.**
- El registro inicial de un animal fallecido es una operación transaccional, no un
  `INSERT`.
- La UI tiene que comunicar dos ejes sin confundir al usuario.

## Riesgos

**1. `ADOPTED` con `isAvailableForAdoption = true`.** El estado imposible que esta
decisión hace posible. *Cómo nos daríamos cuenta*: un animal adoptado apareciendo
en el listado de disponibles. *Mitigación*: la regla de desactivar dentro de la
misma transacción, más validación en el mismo lugar que valida transiciones.
**Conviene considerar además una restricción en la base** — es integridad, no lógica
de negocio (ver CLAUDE.md). No está decidido.

**2. Que `FOUND → ADOPTED` quede prohibido por omisión.** Si nadie confirma la
propuesta, el sistema pierde silenciosamente un camino que antes tenía. *Cómo nos
daríamos cuenta*: alguien encuentra un perro, se lo queda, y **no puede
registrarlo** salvo simulando un tránsito.

**3. Registro inicial de fallecido a medias.** Si la transacción falla entre la
creación y la transición, queda un animal `FOUND` que en realidad está muerto —
listado como si pudiera rescatarse. *La transacción lo previene; hay que
testearlo.*

**4. `DECEASED` sigue sin exigir evidencia.** Ahora también en el registro inicial:
cualquiera puede dar de alta un animal como fallecido. **Sigue pendiente** qué
evidencia se exige.

**5. Que alguien "restaure" `AVAILABLE_FOR_ADOPTION` al enum** por parecer más
simple. Es la alternativa 1 y anula esta decisión.

## Qué no implica esta decisión

- **No implica que nada esté implementado.** No hay enum, ni campo, ni validación,
  ni schema. Ver [`../estado-actual.md`](../estado-actual.md).
- **No confirma `FOUND → ADOPTED`**: queda como propuesta explícita.
- **No decide el tipo físico de `species`, `status` ni `isAvailableForAdoption`**,
  ni sus nombres definitivos en el schema.
- **No decide el valor por defecto** de `isAvailableForAdoption` al registrar.
- **No decide si la invariante "cierre ⇒ no disponible" se protege con un
  constraint** o solo con código.
- **No decide quién puede cambiar la disponibilidad.** Es un permiso, y no está en
  la matriz.
- **No decide qué evidencia se exige para `DECEASED`.**
- **No cambia [ADR 0001](0001-transito-como-evento.md)**: el cuidador se sigue
  derivando del tránsito activo.
- **No revive el campo `vive`.** El fallecimiento se sigue representando solo con
  `DECEASED` ([ADR 0006](0006-estados-finales-del-animal.md)).
