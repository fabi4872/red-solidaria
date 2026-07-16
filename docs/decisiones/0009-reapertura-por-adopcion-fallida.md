# 0009 — Reapertura por adopción fallida: `ADOPTION_RETURNED`

> ## ⚠ Estado actual: Aceptada, **refinada por [ADR 0012](0012-bitacora-de-eventos-del-animal.md)** y con **el hueco del cuidador ya cerrado**.
>
> **Consultar [ADR 0012](0012-bitacora-de-eventos-del-animal.md) y
> [`../../CLAUDE.md`](../../CLAUDE.md) para la regla vigente.** Lo que cambió:
>
> - **El hueco que este ADR declara abierto —"no está definido quién queda como
>   cuidador al reabrir"— está resuelto.** La operación **debe crear obligatoriamente
>   un `Transit` nuevo**, con una `Person` **autenticada** que se indica
>   **explícitamente** y que recibe físicamente al animal. **No se infiere.** Puede ser
>   el cuidador anterior, un cuidador nuevo, o el propio adoptante si sigue teniéndolo
>   transitoriamente.
> - **El diseño físico del evento**, que este ADR dejaba sin decidir, es un
>   `AnimalEvent` de tipo `ADOPTION_RETURNED`. →
>   [ADR 0012](0012-bitacora-de-eventos-del-animal.md)
> - La transacción debe además **establecer explícitamente la disponibilidad para
>   adopción** (valor por defecto propuesto: `true`).
>
> **Sigue vigente**: `ADOPTED → IN_TRANSIT` solo por esta operación, nunca como
> edición directa; fecha, responsable y motivo obligatorios; se preserva el historial
> del mismo animal; jamás se crea otro registro de animal para ocultar la adopción
> fallida.

- **Estado**: Aceptada
- **Fecha**: 2026-07-16
- **Refina a**: [ADR 0006](0006-estados-finales-del-animal.md). **`ADOPTED` deja de
  ser un final absoluto** y pasa a ser un cierre operativo con una salida
  excepcional. `REUNITED` y `DECEASED` **sí** siguen siendo finales absolutos.
- **Cierra**: el caso dudoso 2 de
  [`../modelo-de-dominio.md`](../modelo-de-dominio.md) y el punto que ADR 0006
  dejaba abierto ("no decide si un estado final puede reabrirse").
- **Se apoya en**: [ADR 0007](0007-historial-y-correcciones-auditables.md).

## Contexto

[ADR 0006](0006-estados-finales-del-animal.md) declaró `ADOPTED` final sin salida.
Su propio riesgo 2 lo marcaba como **el caso dudoso más probable de todos**, porque
las adopciones fallidas son comunes: alguien adopta y a los dos meses no puede
sostenerlo.

Sin salida, la única vía era **registrar al animal de nuevo, como si fuera otro
animal**. Eso produce dos fichas del mismo perro con dos historiales inconexos, y
**borra de la vista precisamente el hecho más importante**: que ya pasó por una
adopción que no funcionó. Quien evalúe una nueva adopción no lo sabría. El sistema
existe para conservar esa cadena; obligar a partirla en dos lo contradice de raíz.

La tensión: si `ADOPTED` se puede deshacer con un cambio de estado cualquiera, el
cierre no significa nada y el historial se vuelve editable — lo que
[ADR 0007](0007-historial-y-correcciones-auditables.md) rechaza. **La salida no
puede ser una edición; tiene que ser un hecho registrado.**

## Decisión

**`REUNITED` y `DECEASED` son estados finales absolutos.**

**`ADOPTED` es un cierre operativo**, y admite una **reapertura excepcional**:

```
ADOPTED → IN_TRANSIT
```

**No se implementa como edición directa y silenciosa del estado.** Debe representar
una **operación explícita de devolución de adopción**, registrada con:

- **fecha**;
- **responsable**;
- **motivo**.

Nombre conceptual de la operación/evento: **`ADOPTION_RETURNED`**.

Dos reglas que no se negocian:

1. **Debe preservarse el historial del mismo animal.** La reapertura continúa la
   cadena existente; no la reinicia.
2. **Nunca debe crearse otro registro de animal para ocultar la adopción fallida.**
   Duplicar la ficha es exactamente el daño que esta decisión evita.

**El diseño físico del evento no se decide acá**: si es una tabla propia, un evento
en una bitácora de auditoría, o un campo de un `Transit` — se resuelve al diseñar el
schema.

Ejecutar una reapertura es una **acción sensible**: requiere una `Person` vinculada
a un usuario autenticado ([ADR 0004](0004-identidad-con-supabase-auth.md)).

## Alternativas consideradas

**1. `ADOPTED` final absoluto** (lo que decidía ADR 0006). Descartada: fuerza a
duplicar la ficha del animal, que es peor que reabrir. El dato no desaparece —
reaparece partido en dos y sin conexión.

**2. Transición ordinaria `ADOPTED → IN_TRANSIT`, sin evento.** La más simple.
**Descartada**: el cierre dejaría de significar algo y no quedaría constancia de
que hubo una adopción fallida. Sin fecha, responsable ni motivo, deshacer una
adopción sería indistinguible de corregir un error de tipeo.

**3. Reapertura solo por vía administrativa** (`ADMIN`), como intervención
excepcional — la mitigación que sugería ADR 0006. **Descartada**: una adopción
fallida **no es un error del sistema**, es un hecho del dominio. Tratarla como
incidente de soporte la vuelve un trámite, y además el `ADMIN` no se construye en el
MVP ([ADR 0011](0011-correccion-administrativa-minima.md)): en la práctica
significaría que no hay salida.

**4. Un estado propio `ADOPTION_FAILED`.** Descartada: sería un estado del que hay
que salir igual, y el animal en ese momento **está en tránsito con alguien** —
`IN_TRANSIT` ya lo describe. El hecho de la devolución se registra en el evento, no
en el estado.

## Consecuencias

**Se vuelve fácil:**
- Una adopción fallida **se registra como lo que es**, en el historial del mismo
  animal.
- El animal vuelve al circuito conservando toda su cadena.
- Quien evalúe una adopción futura **puede ver que hubo una devolución y por qué**.
- El cierre sigue significando algo: reabrir exige motivo y responsable, no un clic.

**Se vuelve difícil:**
- **`ADOPTED` ya no es final**, así que la máquina de estados no tiene tres salidas
  limpias sino dos y media. Es una excepción, y las excepciones se olvidan.
- Aparece un tipo de registro nuevo (el evento) que hay que diseñar y persistir.
- La UI tiene que mostrar historiales con devoluciones sin convertirlas en un
  estigma para el animal.
- Más casos que testear: reapertura sobre un animal que ya fue reabierto, motivo
  vacío, responsable sin cuenta.

### Un hueco que esta decisión abre

**No está definido quién queda como cuidador al reabrir.**

`ADOPTED` cerró el tránsito activo ([ADR 0006](0006-estados-finales-del-animal.md)):
el animal **no tiene cuidador**. Pasar a `IN_TRANSIT` exige **crear un tránsito
nuevo**, y todo tránsito necesita una persona. ¿Quién?

- ¿El adoptante que devuelve, hasta que alguien lo reciba? Puede no tener cuenta
  ([ADR 0004](0004-identidad-con-supabase-auth.md)).
- ¿Quien haya iniciado la reapertura?
- ¿El cuidador anterior a la adopción?

**Ninguna es obviamente correcta y no se decide acá.** No bloquea el schema —el
tránsito lleva una clave a `Person` en cualquier caso— pero **sí bloquea la
operación**: sin esa respuesta, `ADOPTION_RETURNED` no se puede implementar.

## Riesgos

**1. Que la reapertura se use para tapar errores.** Es la vía para deshacer un
`ADOPTED`, y va a ser tentador usarla cuando alguien marcó una adopción por
equivocación — que **no es una devolución**. El motivo quedaría registrado, pero
falso. *Cómo nos daríamos cuenta*: reaperturas a los minutos de la adopción.
Corregir un error es lo que hace la corrección administrativa
([ADR 0011](0011-correccion-administrativa-minima.md)), no esta operación.

**2. `ADOPTION_RETURNED` sin cuidador definido** — el hueco de arriba. Es el riesgo
más concreto: **la operación no se puede construir hasta resolverlo.**

**3. Motivo como texto libre sin utilidad.** "Devuelto" no le sirve a nadie. Si el
motivo no aporta contexto, la trazabilidad es decorativa.

**4. Reaperturas en cadena.** Nada limita cuántas veces un animal puede ser adoptado
y devuelto. Probablemente esté bien —refleja la realidad— pero **no se decidió**.

**5. Que la excepción se estire.** Habiendo un precedente de "final que se reabre",
alguien va a pedir lo mismo para `REUNITED` (la familia lo vuelve a abandonar). **Se
decidió que no**: `REUNITED` y `DECEASED` son absolutos. Ese pedido va a llegar.

## Qué no implica esta decisión

- **No implica que nada esté implementado.** No hay evento, ni operación, ni
  estados. Ver [`../estado-actual.md`](../estado-actual.md).
- **No define el diseño físico del evento**: tabla propia, bitácora de auditoría, o
  campo — sin decidir.
- **No define quién queda como cuidador al reabrir** (el hueco de arriba).
- **No define quién puede ejecutar la reapertura**, más allá de exigir una cuenta
  autenticada. Sigue abierto en
  [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md).
- **No decide si el motivo es texto libre o una lista de causas.**
- **No decide si `isAvailableForAdoption` vuelve a `true`** al reabrir
  ([ADR 0008](0008-estado-operativo-y-disponibilidad-como-ejes-separados.md)).
- **No limita la cantidad de reaperturas.**
- **No afecta a `REUNITED` ni a `DECEASED`**, que siguen siendo finales absolutos.
- **No convierte el historial en editable** ([ADR 0007](0007-historial-y-correcciones-auditables.md)):
  la reapertura **agrega** un evento; no reescribe la adopción anterior, que sigue
  siendo parte de la cadena.
