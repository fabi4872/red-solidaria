# Modelo de dominio

Definición **conceptual** del dominio del MVP. Este documento **no describe el
schema de Prisma** — ese no existe todavía (ver
[estado-actual.md](estado-actual.md)). Describe *qué* representa cada cosa y
*qué reglas* la gobiernan, independientemente de cómo se implemente después.

**Fuente**: [`../CLAUDE.md`](../CLAUDE.md). Si este documento lo contradice, gana
CLAUDE.md.

**Trazabilidad**: cada afirmación está marcada con su origen.

| Marca | Significa |
| --- | --- |
| **[CLAUDE.md]** | Está escrito de forma explícita en CLAUDE.md. |
| **[APROBADO]** | Decidido y aprobado el 2026-07-16. Tiene ADR cuando corresponde. |
| **[Derivado]** | Se desprende de lo anterior, pero no está enunciado literalmente. Vale confirmarlo. |
| **[PENDIENTE]** | Decisión abierta. **No se resolvió acá.** |

> **Idioma**: los nombres conceptuales son `Animal`, `Person`, `Transit`, `Photo` —
> **en inglés**, igual que el futuro schema. Los valores de enum van en **inglés y
> MAYÚSCULAS**. **[APROBADO]** Los textos que ve el usuario van en español y
> centralizados. Esto resuelve la contradicción que este documento registraba antes.

---

## Las tres reglas que sostienen todo el modelo

Si algo de este documento se olvida, que no sean estas tres.

### 1. El tránsito es un evento, no un estado del animal · [CLAUDE.md]

**Nunca** se guarda "cuidador actual" como campo del animal. Cada tránsito es un
registro propio, con su inicio y su fin.

Esto es lo que permite reconstruir el historial completo de la cadena y que una
persona tenga varios animales en tránsito a la vez. Ver
[ADR 0001](decisiones/0001-transito-como-evento.md).

### 2. El cuidador actual se deriva, no se almacena · [CLAUDE.md]

Se obtiene buscando **el tránsito activo** (sin fecha de fin) de ese animal. Es un
dato calculado, nunca un campo.

Corolario: **un animal sin tránsito activo no tiene cuidador**, y eso es un estado
legítimo (por ejemplo, recién registrado, o ya adoptado).

### 3. Un animal tiene como máximo un tránsito activo · [APROBADO]

Sin esta regla, la regla 2 no funciona: con dos tránsitos activos, "el cuidador
actual" deja de estar definido.

**La asimetría importa**: un animal tiene como máximo un cuidador; **una persona
puede tener muchos animales en tránsito al mismo tiempo**. El límite es por animal,
no por persona.

Se protege en **tres capas**:

1. **Validación de negocio** en el código.
2. **Dentro de transacciones**, para que no se cree un segundo tránsito en el hueco
   entre leer y escribir.
3. Si PostgreSQL/Prisma lo requieren, una **restricción estructural o índice único
   parcial** (unicidad sobre el animal donde la fecha de fin es nula), creada en una
   **migración personalizada**.

> **Un índice único parcial no es lógica de negocio: es integridad.** CLAUDE.md ya
> lo autoriza — dice que la base "garantiza integridad con sus claves y
> constraints". Lo que prohíbe son *stored procedures y triggers con lógica de
> negocio*. La diferencia: un constraint **impide que exista** un dato imposible; un
> trigger **decide qué pasa**. Escribir esa restricción en SQL dentro de una
> migración, porque Prisma no la expresa en el schema, **no contradice esa regla**.
>
> **La migración no se crea todavía.**

---

## Entidades

### Animal

Un animal doméstico concreto, encontrado por alguien. **[CLAUDE.md]**

Atributos: `species`, `status` (ver máquina de estados), **`isAvailableForAdoption`**
(ver abajo), nombre/alias (opcional), edad presunta, sexo aparente, tamaño, vacunas
(**texto libre** — CLAUDE.md prohíbe explícitamente una tabla de vacunas
estructurada en el MVP), ubicación donde apareció (**obligatoria**), quién lo
registró, fecha de registro.

Es la entidad central: todo lo demás cuelga de un animal.

> **No hay campo `vive` / `isAlive`.** **[APROBADO]** Se eliminó para que la vida o
> el fallecimiento del animal **no tenga dos fuentes de verdad**: `vive = sí` con
> `status = DECEASED` sería un estado imposible que nada impediría escribir. El
> fallecimiento se representa **solo** con el estado `DECEASED`. Ver
> [ADR 0006](decisiones/0006-estados-finales-del-animal.md).
>
> El hueco que esa baja abría —un animal encontrado ya muerto sin forma de
> registrarse— **quedó cerrado** con la transición `FOUND → DECEASED`. Ver
> [ADR 0008](decisiones/0008-estado-operativo-y-disponibilidad-como-ejes-separados.md).

**Especie** **[APROBADO]**: enum **`DOG`, `CAT`, `OTHER`**. El modelo técnico es
**multiespecie**; la experiencia inicial se concentra en **perros**. **No se crea una
tabla `Species`.**

> **No hay campo de descripción para `OTHER`**, y no se agrega salvo que aparezca una
> necesidad concreta durante el diseño del formulario. **[APROBADO]**

### Disponibilidad para adopción — un eje aparte · [APROBADO]

**`isAvailableForAdoption` es un booleano del animal, no un estado.** Un animal puede
estar `IN_TRANSIT` **y** disponible para adopción al mismo tiempo: son dos hechos
distintos, no uno.

- `FOUND` puede estar disponible o no.
- `IN_TRANSIT` puede estar disponible o no.
- `ADOPTED`, `REUNITED` y `DECEASED` **siempre** tienen `isAvailableForAdoption = false`.
- **Toda transición a un cierre desactiva la disponibilidad dentro de la misma
  transacción**, junto con el cierre del tránsito activo.

Ver [ADR 0008](decisiones/0008-estado-operativo-y-disponibilidad-como-ejes-separados.md).

**La invariante se protege en la base.** **[APROBADO]**

> **Si `status` es `ADOPTED`, `REUNITED` o `DECEASED`, entonces
> `isAvailableForAdoption` debe ser `false`.**

Separar los ejes creó una contradicción que antes era imposible por construcción
—cuando el estado era uno solo, no había dos campos que pudieran discrepar—. Es el
costo consciente de la decisión, y por eso la invariante se protege en **tres capas**:

1. **lógica de negocio**;
2. **transacciones**;
3. un **CHECK constraint de PostgreSQL**, incorporado mediante **migración SQL
   personalizada** si Prisma no puede expresarlo.

> **Esto es integridad estructural, no lógica de negocio mediante trigger.** Un CHECK
> **impide que exista** una fila imposible; un trigger **decide qué pasa**. CLAUDE.md
> prohíbe lo segundo y autoriza lo primero — dice que la base "garantiza integridad
> con sus claves y constraints". Es el mismo razonamiento que el índice único parcial
> de la regla 3.
>
> **La migración no se crea todavía.**

> **[PENDIENTE]** El valor por defecto de `isAvailableForAdoption` al registrar.

### Person

Alguien que participa: quien registra, quien cuida, quien adopta. **[CLAUDE.md]**

Atributos: nombre, contacto, fecha de alta.

**`Person` tiene un vínculo opcional y único con el usuario de Supabase Auth:
`authUserId` — nullable y unique.** **[APROBADO]** El MVP autentica con magic link;
ver [ADR 0004](decisiones/0004-identidad-con-supabase-auth.md).

**Una `Person` puede existir sin cuenta.** Por ejemplo: la familia original, un
adoptante externo, un contacto relacionado. Son personas que el sistema necesita
nombrar sin exigirles que se registren.

**Pero las acciones sensibles requieren una `Person` vinculada a un usuario
autenticado:**

- registrar un animal;
- tomarlo en tránsito;
- iniciar un traspaso;
- aceptar un traspaso;
- marcar un desenlace;
- realizar una reapertura por adopción fallida.

`nullable` permite lo primero; `unique` garantiza que **una cuenta no se reparta
entre dos personas**. **[Derivado]** Las relaciones concretas de Prisma **no se
escriben todavía**.

### Transit

**El período durante el cual una persona cuida a un animal.** Es un *evento con
duración*, no una relación. **[CLAUDE.md]**

Atributos: a qué animal corresponde, quién lo cuida, fecha de inicio, fecha de fin
(**vacía mientras el tránsito está activo** — es el marcador de "activo"), nota
opcional.

Un tránsito **activo** (sin fecha de fin) designa al cuidador actual. Un tránsito
**cerrado** es un tramo del historial.

### Photo

Un registro visual, siempre asociado a un animal. **[CLAUDE.md]**

Atributos: animal (**siempre**), tránsito (**opcional** — vacío si es la foto del
rescate; con valor si es foto de seguimiento durante un tránsito), quién la subió,
fecha, y **la URL o referencia de almacenamiento**.

**La imagen nunca se guarda en la base de datos.** Ni base64, ni binario: solo la
referencia. Ver [ADR 0003](decisiones/0003-storage-de-fotografias.md).

El campo opcional `transit` es lo que distingue **la foto del rescate** (cómo
apareció el animal) de **las fotos de seguimiento** (cómo evoluciona durante cada
tramo de la cadena).

### TransitTransfer

El flujo de dos pasos **exige una entidad adicional** para representar un traspaso
propuesto y todavía no aceptado. **Nombre aprobado: `TransitTransfer`.**
**[APROBADO]**

**El modelo ya no está limitado a cuatro tablas.** Un traspaso pendiente es un hecho
del dominio que las cuatro originales no pueden representar: no es un tránsito (no
empezó), no es un atributo del animal (no cambia nada del animal), y no es un estado
(el animal sigue `IN_TRANSIT` con su cuidador de siempre).

**Estados conceptuales**: `PENDING`, `ACCEPTED`, `CANCELLED`, `EXPIRED`.

**Un animal tiene como máximo un `TransitTransfer` en `PENDING`** — ver "Traspaso".

> **[PENDIENTE]** Sus campos **no se diseñan todavía**. Ver
> [ADR 0005](decisiones/0005-traspaso-con-propuesta-y-aceptacion.md).

### AnimalEvent — la bitácora

Registra los **eventos auditables del ciclo de vida del animal**. **[APROBADO]** Ver
[ADR 0012](decisiones/0012-bitacora-de-eventos-del-animal.md).

Existe porque dos decisiones aprobadas no tenían dónde vivir —`ADOPTION_RETURNED` y
la corrección administrativa— y porque el historial visible se cortaba al llegar al
desenlace: una adopción o un fallecimiento no son tránsitos, así que la cadena
terminaba de golpe.

**Tipos conceptuales iniciales**: `REGISTERED`, `TAKEN_IN_TRANSIT`,
`TRANSFER_PROPOSED`, `TRANSFER_ACCEPTED`, `ADOPTED`, `ADOPTION_RETURNED`, `REUNITED`,
`DECEASED`, `ADMIN_CORRECTION`.

> ### Esto NO es event sourcing
>
> - **`AnimalEvent` no convierte el sistema en event sourcing.**
> - **Las entidades normales siguen siendo la fuente de verdad** (`Animal`,
>   `Transit`, `TransitTransfer`, `Photo`).
> - **El estado actual no se reconstruye exclusivamente desde eventos**: se lee del
>   campo `status`.
> - **`AnimalEvent` no reemplaza `Transit` ni `TransitTransfer`.**
>
> Dicho corto: **las entidades responden "cómo está ahora"; los eventos responden
> "qué pasó".** Si el código empieza a derivar el estado de la bitácora, la decisión
> se rompió — aunque nadie lo anuncie.
>
> Es coherente con la regla 1: el cuidador actual se deriva del **tránsito activo**,
> no de eventos.

**Toda operación de dominio escribe su entidad y su evento en la misma transacción.**
**[Derivado]** Son dos escrituras que no pueden separarse: si se separan, la bitácora
y las entidades divergen y nada indica cuál miente.

> **[PENDIENTE]** Sus campos físicos, el tipo del payload, y si los valores
> anterior/nuevo de `ADMIN_CORRECTION` van en JSON. También **si la bitácora es
> pública y con qué detalle**: un `ADMIN_CORRECTION` visible expondría la intervención
> y su motivo.

### Corrección administrativa — `ADMIN_CORRECTION`

La corrección administrativa mínima
([ADR 0011](decisiones/0011-correccion-administrativa-minima.md)) **se registra como
un `AnimalEvent` de tipo `ADMIN_CORRECTION`**. **[APROBADO]** Conserva
conceptualmente: **administrador responsable, fecha, motivo, entidad o dato afectado,
valor original y valor corregido**.

**No se diseña un editor administrativo genérico.** La primera implementación son
**operaciones server-only específicas y controladas** — no un formulario que edite
cualquier campo de cualquier tabla.

---

## Conceptos derivados

Estos **no son entidades**: no tienen tabla propia. Se calculan.

### Registrante

La persona que dio de alta al animal. **[CLAUDE.md]** Es un dato histórico e
inmutable: quien encontró al animal lo encontró para siempre.

**No implica ningún privilegio.** El registrante no es dueño del animal ni de su
ficha, y *no necesariamente* es su primer cuidador: se puede registrar un animal sin
tomarlo en tránsito. **[Derivado]**

> **[PENDIENTE]** Si el registrante tiene o no permisos especiales sobre los datos
> descriptivos de la ficha sigue **abierto**. Ver
> [seguridad-identidad-permisos.md](seguridad-identidad-permisos.md).

### Cuidador actual

La persona del tránsito activo de ese animal. **Derivado, nunca almacenado**
(regla 2). Si no hay tránsito activo, **no hay cuidador actual**, y eso es válido.

**Es el rol con autoridad operativa**: solo el cuidador actual puede iniciar un
traspaso. **[APROBADO]**

### Historial

**La secuencia completa de tránsitos de un animal, ordenada por fecha de inicio.**
**[CLAUDE.md]** Es el producto principal del sistema: la razón por la que el
tránsito se modela como evento es, precisamente, poder reconstruir esta cadena.

**El historial no se reescribe mediante operaciones ordinarias.** **[APROBADO]**
Ningún usuario común edita ni borra tránsitos cerrados. Las eventuales correcciones
administrativas deberán ser **excepcionales, autorizadas y auditables**, preservando
el dato original o registrando el evento correctivo. Ver
[ADR 0007](decisiones/0007-historial-y-correcciones-auditables.md).

> No es "append-only absoluto". La diferencia importa: prometer que nada se corrige
> jamás no elimina las correcciones, las empuja fuera del sistema —a un `UPDATE`
> manual contra la base, sin registro ni autorización—, que es la peor versión
> posible.

**Visibilidad** **[APROBADO]**: el historial es **públicamente consultable**, con
restricciones. **Nunca** muestra correo, teléfono, dirección exacta de personas,
ubicación exacta actual del animal, ni datos privados del perfil. **Sí** puede
mostrar alias o nombre público, fechas, etapas de la cadena, estado, fotografías
autorizadas y la ubicación **aproximada** del hallazgo cuando corresponda.

> **[PENDIENTE]** La precisión geográfica exacta y el mecanismo de anonimización
> **se definen en la etapa de UX y seguridad**.

---

## Operaciones

### Registro inicial

Alguien encuentra un animal y lo da de alta. Es el objetivo 1 del MVP.
**[CLAUDE.md]**

**La fotografía inicial y la ubicación del hallazgo son obligatorias para confirmar
el registro.** **[APROBADO]**

La app **puede permitir completar el formulario progresivamente**, pero **el
registro no queda confirmado ni publicado sin foto y ubicación**. La distinción es
importante: "obligatoria" no significa "primer campo del formulario", significa que
**no hay animal registrado sin ellas**.

> Consecuencia asumida: sin conexión, sin cámara o con la ubicación denegada, **no
> se puede completar el registro**. Es deliberado — una ficha sin foto no sirve para
> reconocer al animal, y sin ubicación no sirve para encontrarlo.

**Registro de un animal encontrado ya fallecido** **[APROBADO]**: es posible, y la
foto y la ubicación **siguen siendo obligatorias**. El animal **se crea en `FOUND` y
transiciona a `DECEASED` dentro de la misma transacción** que el registro inicial —
`DECEASED` **no es un estado inicial**. Ver
[ADR 0008](decisiones/0008-estado-operativo-y-disponibilidad-como-ejes-separados.md).

> Para qué sirve: que **una familia que busca a su animal deje de buscarlo**. Es un
> desenlace del sistema, no un caso borde.

### Traspaso — dos pasos: propuesta y aceptación · [APROBADO]

**Es la operación central del sistema.** Ver
[ADR 0005](decisiones/0005-traspaso-con-propuesta-y-aceptacion.md).

**Paso 1 — Propuesta.** El cuidador actual inicia el traspaso hacia una persona
autenticada. **No cambia nada**: el tránsito actual permanece abierto y el cuidador
sigue siendo el mismo hasta que haya aceptación.

**Paso 2 — Aceptación.** Solo el receptor propuesto puede aceptar. Al aceptar, todo
esto ocurre dentro de **una única transacción — todo o nada**:

1. Validar que la propuesta siga vigente (ni aceptada, ni cancelada, ni expirada).
2. Validar que quien acepta sea el receptor propuesto.
3. Validar que el tránsito original siga activo.
4. Validar que el estado del animal permita la transición.
5. Cerrar el tránsito anterior.
6. Crear el tránsito nuevo con el receptor.
7. Dejar el estado del animal en `IN_TRANSIT`.
8. Marcar la propuesta como aceptada / consumida.

**Si cualquier operación falla, no cambia nada.**

Por qué la transacción es innegociable: sin ella, un fallo entre los pasos 5 y 6
deja al animal **sin cuidador**, con la cadena rota y sin forma automática de saber
quién lo tiene físicamente. En un sistema que registra la tenencia de animales
vivos, ese estado intermedio no puede existir ni por un instante.

Una propuesta **puede expirar o ser cancelada**.

**Un animal tiene como máximo un `TransitTransfer` en `PENDING`.** **[APROBADO]**
Mientras exista:

- **no se puede crear otra propuesta**;
- el **cuidador actual** puede cancelarla;
- después de cancelarla o de que expire, se puede crear una nueva.

Se protege con las mismas tres capas que el tránsito activo único: **validación de
negocio**, **transacción**, y —si hace falta— **restricción o índice único parcial**.
**La migración no se crea todavía.**

> **[PENDIENTE]** El plazo exacto de expiración **no está decidido**, ni si expiran
> automáticamente, ni cómo se elige al receptor (¿mail? ¿buscador? ¿enlace?).

**La toma inicial de un animal sin cuidador** (`FOUND` → `IN_TRANSIT`) **no es un
traspaso**: nadie lo tiene, no hay quién proponga. Es un acto único. **[Derivado]**

### Adopción

El animal encuentra hogar definitivo. **[CLAUDE.md]** `ADOPTED` es un **cierre
operativo**, no un final absoluto: admite una salida excepcional. **[APROBADO]**

**Adopción directa desde `FOUND`** **[APROBADO]**: quien encuentra al animal decide
adoptarlo, **sin tránsito previo**. La operación debe:

- registrar **quién adopta**;
- dejar `isAvailableForAdoption = false`;
- **validar que no exista tránsito activo**;
- conservar **el mismo `Animal` y su historial**;
- **no crear un tránsito ficticio**.

> Por qué el tránsito ficticio está prohibido: **nadie cuidó al animal**. Inventar un
> tránsito de cero días para que la máquina de estados encaje sería meter en la cadena
> un tramo que no ocurrió — falsear el historial para no tocar el enum. La cadena
> puede tener cero eslabones; eso es un dato, no un problema.

> **[PENDIENTE]** Quién puede marcarla, y si el adoptante queda registrado como
> `Person` (podría no tener cuenta — ver `Person`).

### Adopción fallida — reapertura excepcional · [APROBADO]

Una adopción puede fracasar. Se aprueba `ADOPTED → IN_TRANSIT`, **únicamente** a
través de la operación explícita **`ADOPTION_RETURNED`**, con **fecha, responsable y
motivo**. **Nunca como edición directa y silenciosa del estado.** Ver
[ADR 0009](decisiones/0009-reapertura-por-adopcion-fallida.md).

**La operación debe crear obligatoriamente un `Transit` nuevo.** **[APROBADO]** Hay
que **indicar explícitamente** una `Person` **autenticada** que recibe físicamente al
animal. **No se infiere automáticamente quién es esa persona.** Puede ser:

- el **cuidador anterior**;
- un **cuidador nuevo**;
- el **adoptante**, si continúa teniéndolo transitoriamente.

> Por qué no se infiere: las tres opciones son plausibles y **el sistema no puede
> saber cuál ocurrió en la realidad**. Adivinar mal significa asentar que alguien
> tiene un animal que no tiene — el error exacto que el traspaso de dos pasos existe
> para evitar. Que sea explícito es incómodo a propósito.

Dentro de **una única transacción**: **[APROBADO]**

1. Registrar la devolución (`AnimalEvent` de tipo `ADOPTION_RETURNED`).
2. Validar que el receptor esté autenticado.
3. Crear el `Transit` nuevo con ese receptor.
4. Cambiar el estado `ADOPTED` → `IN_TRANSIT`.
5. **Establecer explícitamente** `isAvailableForAdoption`. **Valor propuesto por
   defecto: `true`** — la operación podrá confirmarlo o modificarlo expresamente.

Dos reglas que no se negocian:

1. **Debe preservarse el historial del mismo animal.** La reapertura continúa la
   cadena; no la reinicia.
2. **Nunca debe crearse otro registro de animal para ocultar la adopción fallida.**
   Duplicar la ficha parte el historial en dos y esconde justo el hecho que más
   importa para una adopción futura.

Ejecutarla es una acción sensible: requiere una `Person` con cuenta.

> **Nota sobre `isAvailableForAdoption = true` por defecto**: un animal devuelto
> normalmente necesita otro hogar, así que el valor tiene sentido. Pero **no siempre**
> —puede volver enfermo, o el cuidador puede querer evaluarlo antes de ofrecerlo—, y
> por eso el paso 5 exige **establecerlo explícitamente** en vez de dejarlo
> implícito. El default es una sugerencia de la UI, no una regla del dominio.

### Reencuentro con familia · [APROBADO]

El animal vuelve con su familia original. Se representa con el estado `REUNITED`,
**final absoluto**: no se sale de ahí por ninguna vía. Ver
[ADR 0006](decisiones/0006-estados-finales-del-animal.md).

> **[PENDIENTE]** Quién puede marcarlo.
>
> Nota: la reapertura por adopción fallida **no aplica acá**. Si una familia vuelve a
> abandonar al animal, `REUNITED` no tiene salida. **Fue una decisión, no un olvido**
> — pero el pedido de extenderla va a llegar
> ([ADR 0009](decisiones/0009-reapertura-por-adopcion-fallida.md), riesgo 5).

### Fallecimiento · [APROBADO]

El animal muere. Se representa con el estado `DECEASED`, **final absoluto y sin
salida ordinaria**, y **con nada más** — el campo `vive` se eliminó.

Se llega desde `IN_TRANSIT` (muere al cuidado de alguien) o desde `FOUND`
(encontrado ya fallecido, o muere antes de que alguien lo tome).

> **[PENDIENTE]** Qué evidencia se exige para marcarlo. Hoy cualquiera con la cuenta
> del cuidador podría asentarlo sin prueba alguna, y es irreversible. **Con
> `FOUND → DECEASED` aprobado, esto se extiende al registro inicial**: cualquiera
> puede dar de alta un animal como fallecido.

---

## Máquina de estados

### Estados operativos · [APROBADO]

`FOUND`, `IN_TRANSIT`, `ADOPTED`, `REUNITED`, `DECEASED`.

**`AVAILABLE_FOR_ADOPTION` ya no es un estado** — la disponibilidad es el eje aparte
`isAvailableForAdoption`. Ver
[ADR 0008](decisiones/0008-estado-operativo-y-disponibilidad-como-ejes-separados.md).

**Cierres**:

- `REUNITED` y `DECEASED` son **finales absolutos**.
- `ADOPTED` es un **cierre operativo** con una única salida excepcional
  (`ADOPTION_RETURNED`).

### Transiciones · [APROBADO]

| Desde | Hacia | Nota |
| --- | --- | --- |
| `FOUND` | `IN_TRANSIT` | Alguien lo toma en tránsito. |
| `FOUND` | `REUNITED` | La familia aparece antes de que nadie lo cuide. |
| `FOUND` | `DECEASED` | Encontrado ya fallecido, o muere antes de que alguien lo tome. Atómica con el registro inicial cuando aplica. |
| `IN_TRANSIT` | `IN_TRANSIT` | Traspaso aceptado. Cambia el cuidador, no el estado. |
| `IN_TRANSIT` | `ADOPTED` | |
| `IN_TRANSIT` | `REUNITED` | |
| `IN_TRANSIT` | `DECEASED` | Muere estando al cuidado de alguien. |
| `FOUND` | `ADOPTED` | Quien lo encuentra lo adopta directo. **Sin tránsito ficticio.** |
| `ADOPTED` | `IN_TRANSIT` | **Solo** vía `ADOPTION_RETURNED`. Nunca como edición directa. |

```
  FOUND ──────────┬──────────────┬──────────────┐
   │              │              │              │
   ▼              ▼              ▼              ▼
  IN_TRANSIT   REUNITED ■     DECEASED ■     ADOPTED □
   │  ↺ (traspaso: otro cuidador)               │
   │                                            │
   ├──► REUNITED ■                              │
   ├──► DECEASED ■                              │
   ├──► ADOPTED  □ ◄────────────────────────────┘
   │      │
   ▲      └── ADOPTION_RETURNED ──┐
   └──────────────────────────────┘
       (crea un Transit nuevo, receptor explícito)

   ■ = final absoluto      □ = cierre operativo (una salida excepcional)
```

Cualquier transición que no figure en la tabla **debe rechazarse en el código**, en
un solo lugar reutilizable. **[CLAUDE.md]**

**Toda transición a un cierre debe, dentro de una única transacción:** **[APROBADO]**

1. **cerrar el tránsito activo**, si lo hay;
2. **dejar `isAvailableForAdoption = false`**.

Un animal adoptado, reencontrado o fallecido no puede quedar con un cuidador
asignado ni ofrecido en adopción: sería afirmar que alguien lo tiene cuando ya nadie
lo tiene.

### Casos dudosos de la máquina de estados

**Los casos dudosos 1, 2 y 3 de la ronda anterior quedaron resueltos.** Se conservan
acá en una línea, para que se vea qué se decidió y no parezca que desaparecieron:

| Caso anterior | Resolución |
| --- | --- |
| ~~1. El animal encontrado ya muerto no tiene cómo registrarse~~ | **Resuelto**: se aprueba `FOUND → DECEASED`, atómico con el registro inicial. [ADR 0008](decisiones/0008-estado-operativo-y-disponibilidad-como-ejes-separados.md) |
| ~~2. No hay salida de los estados finales~~ | **Resuelto**: `ADOPTED` admite `ADOPTION_RETURNED`. `REUNITED` y `DECEASED` siguen sin salida, **a propósito**. [ADR 0009](decisiones/0009-reapertura-por-adopcion-fallida.md) |
| ~~3. `AVAILABLE_FOR_ADOPTION` mezcla dos ejes~~ | **Resuelto**: deja de ser estado; pasa a ser `isAvailableForAdoption`. [ADR 0008](decisiones/0008-estado-operativo-y-disponibilidad-como-ejes-separados.md) |
| ~~4. `FOUND → ADOPTED` directo~~ | **Resuelto**: **aprobada**, sin tránsito ficticio. Restituye el camino `encontrado → en_adopcion → adoptado` que el modelo original tenía y que se había caído al quitar `AVAILABLE_FOR_ADOPTION` del enum. |

**No quedan casos dudosos abiertos. La máquina de estados está cerrada.**

---

## Contradicciones detectadas

Se informan, **no se resuelven acá**.

### ~~1. Idioma del código vs. nombres de tablas~~ · RESUELTA · [APROBADO]

**Resuelta el 2026-07-16.** CLAUDE.md decía "nombres de tablas y campos en inglés" y
a la vez nombraba las tablas `animales`, `personas`, `transitos`, `fotos`, con
estados en español.

**Gana la regla del inglés.** Nombres conceptuales aprobados: `Animal`, `Person`,
`Transit`, `Photo`. Enums en inglés y mayúsculas. Textos al usuario en español y
centralizados. CLAUDE.md fue actualizado; ver su "Historial de este documento".

### ~~2. Contradicción sobre el estado de `seguridad-identidad-permisos.md`~~ · RESUELTA

CLAUDE.md y README.md decían que **todo** ese documento era propuesta y que nada
estaba aprobado, cuando la identidad ya estaba decidida desde la segunda ronda.
**Corregido el 2026-07-16**: ambos ahora describen que contiene decisiones aprobadas
de identidad y principios de permisos, más los pendientes claramente identificados.

### 3. Ninguna otra contradicción abierta

Al cierre de la tercera ronda documental no quedan contradicciones internas
registradas. **`FOUND → ADOPTED` no es una contradicción: es una decisión
pendiente.**

---

## Decisiones pendientes de este documento

### Nada bloquea el schema

**Los siete bloqueantes de la segunda ronda y los tres de la tercera están cerrados.**
Las seis entidades del modelo —`Animal`, `Person`, `Transit`, `Photo`,
`TransitTransfer`, `AnimalEvent`— tienen todo lo que necesitan para escribirse.

Lo que sigue son decisiones de **diseño físico** (se resuelven *al* escribir el
schema, no antes) y de **producto o UX** (no lo tocan).

### Se resuelven al escribir el schema

| # | Decisión |
| --- | --- |
| 1 | Campos de `AnimalEvent`; tipo del payload; si los valores anterior/nuevo de `ADMIN_CORRECTION` van en JSON |
| 2 | Campos de `TransitTransfer` |
| 3 | Valor por defecto de `isAvailableForAdoption` al registrar |
| 4 | Forma exacta de la relación `Person` ↔ `authUserId` |

### No tocan el schema

| # | Decisión |
| --- | --- |
| 5 | Plazo de expiración de una propuesta; ¿expiran solas? |
| 6 | Cómo se elige al receptor de un traspaso (mail, buscador, enlace) |
| 7 | ¿El receptor puede rechazar una propuesta explícitamente? |
| 8 | Quién edita los datos descriptivos del animal |
| 9 | Quién controla `isAvailableForAdoption` |
| 10 | Quién marca `ADOPTED` / `REUNITED`; qué evidencia exige `DECEASED` |
| 11 | Quién puede ejecutar `ADOPTION_RETURNED` |
| 12 | Alcance exacto de las facultades de la corrección administrativa |
| 13 | ¿La bitácora es pública? ¿Con qué detalle? Un `ADMIN_CORRECTION` visible expondría la intervención y su motivo |
| 14 | Precisión geográfica y anonimización del historial público |
| 15 | Framework de testing |
| 16 | ¿El bucket de fotos es público o privado? ¿Se limpia el EXIF? |
| 17 | Dónde se registra una corrección administrativa que **no** involucre a un animal ([ADR 0012](decisiones/0012-bitacora-de-eventos-del-animal.md), riesgo 5) |
