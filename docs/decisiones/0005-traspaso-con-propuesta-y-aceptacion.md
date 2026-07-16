# 0005 — El traspaso se hace en dos pasos: propuesta y aceptación

- **Estado**: Aceptada
- **Fecha**: 2026-07-16
- **Resuelve**: el punto que [ADR 0001](0001-transito-como-evento.md) dejó
  explícitamente abierto ("no dice cómo se ejecuta el traspaso, más allá de exigir
  que sea atómico"). **No lo supersede**: 0001 sigue vigente en todo lo que decide.

## Contexto

El traspaso es la operación central del sistema: un animal pasa de un cuidador a
otro, y esa cadena es el producto.

CLAUDE.md describía **un solo acto atómico**: alguien lo ejecuta y el animal cambia
de manos en el modelo. Eso deja un problema sin resolver: **el receptor no
participa**. Alguien puede quedar registrado como cuidador de un animal que nunca
aceptó recibir, y a partir de ahí figurar como responsable de un ser vivo por
decisión de un tercero.

Además, el traspaso físico y el registro **no son simultáneos**. Un acto único
obliga a elegir cuándo se aprieta el botón: ¿antes de entregar el animal, dejando
un hueco donde el registro miente? ¿Después, confiando en que alguien se acuerde?
Con dos pasos, el hueco se representa: **hay una propuesta pendiente**, y el
sistema sabe que está pendiente.

En contra: el flujo de dos pasos **agrega una entidad, agrega estados y agrega
formas de fallar**. Un traspaso que nadie acepta queda colgado. Es más código y
más UX que un botón.

## Decisión

**El traspaso son dos pasos: el cuidador actual propone, el receptor acepta.**

**Paso 1 — Propuesta.** El cuidador actual inicia el traspaso hacia una persona
autenticada. **No cambia nada más**: el tránsito actual permanece abierto y el
cuidador sigue siendo el mismo hasta que haya aceptación.

**Paso 2 — Aceptación.** Solo el receptor propuesto puede aceptar. Al aceptar, todo
esto ocurre dentro de **una única transacción**:

1. Validar que la propuesta siga vigente (ni aceptada, ni cancelada, ni expirada).
2. Validar que quien acepta sea el receptor propuesto.
3. Validar que el tránsito original siga activo.
4. Validar que el estado del animal permita la transición.
5. Cerrar el tránsito anterior.
6. Crear el tránsito nuevo con el receptor.
7. Dejar el estado del animal en `IN_TRANSIT`.
8. Marcar la propuesta como aceptada / consumida.

**Si cualquier operación falla, no cambia nada.**

Una propuesta **puede expirar o ser cancelada**. **El plazo exacto no se decide
acá.**

### El modelo ya no está limitado a cuatro tablas

Esta decisión **requiere una entidad adicional** para representar la propuesta
pendiente. Nombres candidatos: `TransitTransfer`, `TransitHandoff`. **El nombre
definitivo no se fija en este ADR** y el schema no se diseña acá.

Es un cambio real respecto de CLAUDE.md, que hablaba de "cuatro tablas". Un
traspaso propuesto y no aceptado es un hecho del dominio que **el modelo de cuatro
tablas no puede representar**: no es un tránsito (no empezó), no es un atributo del
animal (no cambia nada del animal), y no es un estado (el animal sigue
`IN_TRANSIT` con su cuidador de siempre).

## Alternativas consideradas

**1. Acto único** (el modelo que describía CLAUDE.md). El cuidador ejecuta el
traspaso y el animal cambia de manos. **Descartada**: el receptor queda registrado
como responsable de un animal sin haber aceptado nada, y no hay forma de
representar el intervalo entre el acuerdo y la entrega. Su ventaja real —una tabla
menos y un botón— no compensa registrar responsabilidades que nadie asumió.

**2. Acto único con confirmación posterior opcional.** El traspaso se aplica de
inmediato y el receptor "confirma" después. **Descartada**: es lo peor de los dos
mundos. El registro cambia sin consentimiento igual, y la confirmación no
significa nada porque el hecho ya está asentado.

**3. Doble confirmación con código o QR presencial** (el receptor escanea al
recibir el animal). Es más fuerte: acerca el registro al momento físico de la
entrega. **Descartada para el MVP** por complejidad de UX y porque exige que ambos
estén presentes con la app abierta. **No queda cerrada**: sería una mejora
compatible con esta decisión, sin cambiar el modelo.

**4. Propuesta abierta** ("cedo este animal, que lo tome quien quiera"). Descartada:
es otra funcionalidad, no un traspaso. El cuidador dejaría de elegir a quién le
entrega el animal.

## Consecuencias

**Se vuelve fácil:**
- **Nadie recibe un animal sin haberlo aceptado.** Es la razón de ser de la
  decisión.
- El intervalo entre acuerdo y entrega **existe en el modelo** en vez de ser un
  hueco.
- Ambas partes quedan atribuidas a cuentas autenticadas
  ([ADR 0004](0004-identidad-con-supabase-auth.md)): la cadena gana trazabilidad.
- El cuidador no puede "sacarse el animal de encima" en el registro
  unilateralmente.
- Se abre lugar para mejoras futuras (recordatorios, confirmación presencial) sin
  rehacer el modelo.

**Se vuelve difícil:**
- **Una entidad más**, con su propio ciclo de vida y sus propios estados.
- **Propuestas colgadas.** Un traspaso propuesto que nadie acepta ni cancela queda
  pendiente para siempre si no hay expiración — y **la expiración no está
  decidida**.
- Más UX: proponer, ver pendientes, aceptar, rechazar, cancelar. Son pantallas que
  antes no existían.
- El receptor **debe tener cuenta** para poder aceptar. Con el acto único, el
  cuidador podía registrar a alguien sin cuenta. Esto **restringe a quién se le
  puede traspasar**, y es una consecuencia deliberada.
- Más casos que testear — de ahí que la aceptación y la autorización del receptor
  estén en el núcleo de testing aprobado.

## Riesgos

**1. Divergencia entre el registro y la realidad física.** Alguien entrega el
animal y el receptor nunca acepta en la app. **El registro dice que el animal sigue
con el cuidador anterior, y es falso.** *Cómo nos daríamos cuenta*: propuestas
pendientes que envejecen. **Este riesgo es peor que en el acto único**: ahí el
registro cambiaba sin consentimiento; acá puede no cambiar nunca. Es el precio
aceptado a cambio de no asignar responsabilidades sin aceptación.

**2. Propuestas simultáneas.** ¿Puede el cuidador proponer el mismo animal a dos
personas a la vez? Si sí, **acepta la primera y la segunda debe fallar** — la
transacción lo garantiza, pero la UX de "llegaste tarde" hay que diseñarla. **No
está decidido si se permiten propuestas simultáneas.**

**3. Aceptación sobre un tránsito que ya no está activo.** El animal fue adoptado o
falleció mientras la propuesta estaba pendiente. Por eso la validación 3 existe. *Si
faltara*: se crearía un tránsito sobre un animal en estado final, rompiendo la
regla de que un estado final no tiene cuidador.

**4. Propuestas sin expiración.** Sin plazo, se acumulan indefinidamente y ensucian
la vista del receptor. **Pendiente de decidir.**

**5. Aceptación con doble clic o reintento.** Dos aceptaciones concurrentes de la
misma propuesta. La transacción más la validación 1 deberían impedir el doble
tránsito, pero **esto hay que testearlo, no suponerlo** — está dentro del núcleo de
testing aprobado.

**6. Que alguien "simplifique" el flujo a un acto único** por presión de UX. Es la
alternativa 1, y anula esta decisión.

## Qué no implica esta decisión

- **No implica que nada de esto esté implementado.** No hay entidad, ni endpoint, ni
  pantalla. Ver [`../estado-actual.md`](../estado-actual.md).
- **No fija el nombre de la entidad** (`TransitTransfer` vs `TransitHandoff` vs
  otro).
- **No diseña el schema**: ni campos, ni estados de la propuesta, ni índices.
- **No decide el plazo de expiración**, ni si expiran automáticamente.
- **No decide si se permiten propuestas simultáneas** para un mismo animal.
- **No decide cómo se elige al receptor** (¿por mail? ¿un buscador? ¿un enlace?).
  Es UX y no está resuelto.
- **No cambia [ADR 0001](0001-transito-como-evento.md).** El tránsito sigue siendo
  un evento y el cuidador actual se sigue derivando del tránsito activo. Esta
  decisión solo define **cómo** se pasa de un tránsito al siguiente.
- **No afecta la toma inicial de un animal sin cuidador** (`FOUND` → `IN_TRANSIT`).
  Ahí no hay traspaso: nadie lo tiene, no hay quién proponga. Es un acto único y
  sigue siéndolo.
- **No implica un flujo de dos pasos para las demás transiciones** (adopción,
  reencuentro, fallecimiento).
