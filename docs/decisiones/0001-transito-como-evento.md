# 0001 — El tránsito es un evento, no un estado del animal

- **Estado**: Aceptada
- **Fecha**: 2026-07-16 *(documentado retroactivamente; la decisión ya estaba
  vigente en CLAUDE.md desde el inicio del proyecto)*
- **Fuente**: [`../../CLAUDE.md`](../../CLAUDE.md) → "Decisiones de arquitectura" y
  "Modelo de datos"

## Contexto

El producto consiste en una cadena de cuidadores: alguien encuentra un animal, lo
toma en tránsito, y lo va pasando a otras personas hasta que encuentra hogar
definitivo. **El valor del sistema no es saber dónde está el animal hoy: es poder
reconstruir por dónde pasó.**

Hay dos formas de modelar esto:

- Guardar en el animal un campo `cuidador_actual`, que se pisa en cada traspaso.
- Guardar cada período de cuidado como un registro propio, con inicio y fin.

La primera es la que sale sola. Es más simple de escribir, más simple de consultar
("¿quién lo tiene? mirá el campo") y es lo que uno hace sin pensarlo.

Y **destruye el producto**: cada traspaso sobrescribe el anterior. Al tercer
cuidador ya no hay forma de saber quién fue el primero. La información que el
sistema existe para conservar se pierde en el acto mismo de actualizarla.

Una restricción adicional: una persona puede tener **varios** animales en tránsito
a la vez.

## Decisión

**Cada tránsito es una fila propia en la tabla de tránsitos**, con animal,
persona, fecha de inicio, fecha de fin y una nota opcional.

**Nunca se guarda "cuidador actual" como campo del animal.** El cuidador actual se
**deriva**, buscando el tránsito abierto —el que no tiene fecha de fin— de ese
animal.

La fecha de fin vacía **es** el marcador de "activo". No hay un campo booleano
aparte que pueda contradecirla.

## Alternativas consideradas

> **Reconstrucción.** Este ADR se escribió después de que la decisión ya estuviera
> tomada y asentada en CLAUDE.md. Las alternativas de abajo son las que el diseño
> descarta implícitamente, no un acta de una deliberación registrada.

**1. Campo `cuidador_actual` en el animal.** Descartada: hace imposible el
historial, que es el producto. Además obliga a inventar una tabla de historial
paralela para recuperar lo que el campo pisa — o sea, se termina en el modelo de
eventos igual, pero con dos fuentes de verdad que pueden divergir.

**2. Campo `cuidador_actual` **más** tabla de historial.** Descartada: dato
duplicado, dos fuentes de verdad. En cuanto una escritura falle a mitad de camino,
el campo y el historial se contradicen, y **nada indica cuál de los dos miente**.
La derivación no puede desincronizarse porque no hay nada que sincronizar.

**3. Booleano `activo` en el tránsito, además de la fecha de fin.** Descartada por
la misma razón: dos campos que expresan el mismo hecho pueden contradecirse
(`activo = true` con fecha de fin cargada). Un solo campo no admite esa
contradicción.

## Consecuencias

**Se vuelve fácil:**
- Reconstruir el historial completo: es la lista de tránsitos del animal, ordenada.
- Que una persona tenga varios animales a la vez: son varias filas, sin conflicto.
- Auditar la cadena: cada tramo tiene su propio registro con fechas y nota.
- Confiar en el dato: **el cuidador actual no puede estar "desactualizado"**, porque
  no se almacena.

**Se vuelve difícil:**
- Saber quién cuida a un animal exige una consulta con filtro (`fecha_fin IS NULL`)
  en lugar de leer un campo. Se necesita un índice.
- Listar "todos los animales con su cuidador actual" requiere un join, no un select
  plano.
- La invariante "un solo tránsito abierto por animal" pasa a ser **responsabilidad
  nuestra**. Con un campo, la unicidad venía gratis. Acá hay que garantizarla.
- El traspaso deja de ser un `UPDATE` y pasa a ser dos escrituras que **deben** ser
  atómicas. De ahí la transacción obligatoria que exige CLAUDE.md.

## Riesgos

**1. Dos tránsitos abiertos para el mismo animal.** Es el riesgo principal: rompe
la derivación del cuidador actual y deja el dato indefinido. *Cómo nos daríamos
cuenta*: una consulta de cuidador actual devolvería dos filas donde el código
espera una — probablemente fallando en producción, no en desarrollo. *Mitigación
propuesta, **no decidida***: una restricción de unicidad parcial en la base
(unicidad sobre `animal` donde `fecha_fin IS NULL`), en lugar de confiar solo en el
código. Registrado como pendiente en
[`../modelo-de-dominio.md`](../modelo-de-dominio.md).

**2. Traspaso a medio ejecutar.** Si se cierra el tránsito viejo y falla la creación
del nuevo, el animal queda **sin cuidador** y la cadena se corta. *Cómo nos daríamos
cuenta*: animales en estado `en_transito` sin ningún tránsito abierto. *Mitigación*:
la transacción, que CLAUDE.md ya exige.

**3. Degradación de consultas.** Con muchos tránsitos por animal, la búsqueda del
abierto se degrada sin índice. Riesgo bajo en el MVP, real a escala.

**4. Que alguien "optimice" esto más adelante.** Agregar un campo `cuidador_actual`
"para no hacer el join" va a parecer una buena idea a alguien que no leyó este
documento. **Es exactamente la alternativa 2, y anula la decisión.**

## Qué no implica esta decisión

- **No define la máquina de estados del animal.** El estado (`encontrado`,
  `en_transito`, …) es un campo del animal y sigue existiendo. Esta decisión dice
  que *el cuidador* no se almacena; no dice nada sobre *el estado*.
- **No dice cómo se ejecuta el traspaso**, más allá de exigir que sea atómico.
  Si es un acto único o un flujo de iniciar → aceptar **sigue siendo una decisión
  abierta**.
- **No implica event sourcing.** El resto del sistema no se modela como eventos.
  El animal es una entidad mutable común. Esta decisión aplica **solo** al vínculo
  animal-cuidador.
- **No decide los nombres** de la tabla ni de los campos en el schema.
- **No implica que los tránsitos sean inmutables.** Que el historial no se reescriba
  es una propuesta registrada en
  [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md), **no
  está aprobada** y no se decide acá.
