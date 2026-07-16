# 0004 — Identidad: Supabase Auth con magic link

- **Estado**: Aceptada
- **Fecha**: 2026-07-16
- **Resuelve**: la decisión de identidad que quedó abierta en
  [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md).

## Contexto

CLAUDE.md definía `Person` con nombre, contacto y fecha de alta: **un registro de
contacto, sin identidad verificada**. No decía si alguien se autentica, ni lo
prohibía — la autenticación nunca estuvo en la lista de "qué NO hacer en el MVP".

El problema concreto de no tener identidad: **cualquiera podía cerrar el tránsito
de cualquier animal y declararse su cuidador**. Para un sistema cuyo producto es
una cadena de custodia, eso vacía de sentido el registro. Un historial que
cualquiera puede escribir a nombre de otro no documenta nada.

Un problema adicional, menos visible: `Person` guarda **datos de contacto de
personas reales**. Sin identidad, esos datos quedan legibles y escribibles por
cualquiera. No es solo un problema de integridad; es de privacidad.

Tres fuerzas en tensión:

- El objetivo declarado del MVP es **validar que la gente use el sistema**.
  Cualquier fricción en el alta atenta directamente contra esa validación.
- El caso de uso real es **alguien en la calle, con un animal encontrado y datos
  móviles**. Es el peor momento posible para pedir un trámite.
- El costo de agregar identidad **después**, con datos reales ya cargados, es muy
  superior: obliga a reconciliar personas creadas al vuelo con usuarios
  verificados, sin ningún criterio automático posible.

## Decisión

**El MVP usa Supabase Auth con magic link por correo electrónico.**

- No se implementa autenticación propia.
- No se implementa identificación liviana (nombre + contacto sin verificar).
- `Person` se vincula al usuario de Supabase Auth. **La forma exacta del vínculo
  se resuelve al diseñar el schema.**

### Lo que esta autenticación verifica — y lo que no

Verifica **el control de una casilla de correo**. Nada más. Explícitamente **no**
prueba:

- la **identidad civil** de quien opera;
- la **posesión física real** del animal;
- la **autenticidad** de las fotografías;
- que un **traspaso físico haya ocurrido** de verdad.

Por eso la auditabilidad del sistema se describe como **alta**, nunca como
"completa" ni "irrefutable". Lo que el sistema produce es **evidencia declarativa
asociada a una cuenta verificada**: acciones **atribuibles a una cuenta
autenticada**, con **mayor trazabilidad** que un registro anónimo. Dos personas
pueden coordinar un traspaso en la app sin que el animal se mueva, y el sistema no
tiene forma de saberlo.

Esta distinción no es una formalidad: define qué se le puede prometer al usuario.

## Alternativas consideradas

**1. Sin autenticación.** Es el modelo que CLAUDE.md describía. Cero fricción y
máxima coherencia con "validar que la gente use el sistema" — mide el interés real
sin que el alta contamine la medición. **Descartada**: cualquiera puede cerrar el
tránsito de cualquier animal, la cadena no es atribuible a nadie, los datos de
contacto quedan expuestos, y migrar a identidad después es la más cara de las
opciones.

**2. Identificación liviana** (nombre y contacto sin verificar, sesión por token o
cookie). **Descartada, y es la peor de las tres.** Tiene casi el mismo código que
la opción elegida sin ninguna de sus garantías, y agrega un problema propio: **da
apariencia de identidad sin serlo**. La UI muestra "cuidador: Fulano" con una
confiabilidad que el dato no tiene. Además, al limpiar cookies o cambiar de
dispositivo **no hay forma de recuperar la cuenta**, porque no hay nada contra qué
verificar. Si la respuesta es "sin fricción", la opción 1 es más honesta; si es
"cadena atribuible", esta decisión es la real.

**3. Auth con contraseña.** Descartada: obliga a gestionar recuperación, hashing y
filtraciones, para un público que no va a querer crear otra contraseña más.

**4. OAuth social** (Google, Facebook). No descartada por mérito técnico, sino
porque el magic link no requiere que la persona tenga cuenta en un tercero.
**Podría sumarse después sin romper esta decisión.**

## Consecuencias

**Se vuelve fácil:**
- Atribuir cada eslabón de la cadena a una cuenta verificada.
- **RLS con sujeto.** Sin identidad, las políticas de RLS no tienen sobre quién
  decidir. Con Auth, la base misma puede impedir un acceso indebido, sin depender
  de que el código no tenga bugs.
- Recuperación de acceso: es el mismo flujo que el ingreso. No hay procedimiento
  aparte.
- Sin contraseñas: nada que hashear, olvidar ni filtrar.
- El camino hacia lo que CLAUDE.md posterga (reputación, validación por ONG) queda
  abierto: **todo eso presupone identidad**.
- No agrega proveedor ni costo: Supabase Auth viene con el proyecto que el stack ya
  requiere.

**Se vuelve difícil:**
- **Fricción en el peor momento.** La persona está en la calle con un animal y el
  sistema le pide ir al mail y volver. **Es la consecuencia más seria de esta
  decisión** y va en contra del objetivo de validar el uso.
- El modelo se complica: `Person` deja de ser una tabla suelta.
- Más superficie: sesiones, callback, estados de carga, expiración de enlaces.
- Acopla el MVP a Supabase Auth (aunque el stack ya está acoplado a Supabase).

### Personas sin cuenta

**No se asume que toda persona ligada a un animal tenga cuenta.** Un adoptante
externo o la familia original pueden necesitar quedar registrados **sin ser
usuarios de la aplicación**.

Esto **no bloquea** la decisión general de usar Auth, pero deja una pregunta
abierta para el diseño físico: ¿`Person` con vínculo opcional al usuario? ¿Dos
conceptos separados? **Se resuelve al diseñar el schema**, no acá.

## Riesgos

**1. Que la fricción del magic link haga fracasar la validación del MVP** — y que
el fracaso se lea como "la idea no interesa" cuando en realidad fue el alta. *Cómo
nos daríamos cuenta*: altas iniciadas que no se completan. **Requiere medirlo desde
el día uno**, o el dato no existe. *Mitigación posible, **no decidida***: permitir
completar el formulario del animal primero y pedir el mail al final, antes de
confirmar. **Eso es diseño de flujo y no está resuelto.**

**2. Entrega del correo.** Demoras, spam, dominios corporativos que bloquean. El
enlace llega tarde o no llega, y la persona abandona. Sin control nuestro sobre eso.

**3. Sobreestimar lo que la identidad prueba.** El riesgo más sutil: que la UI, la
documentación o nosotros mismos empecemos a hablar de la cadena como si fuera
prueba de posesión física. **No lo es.** Verificar un mail no verifica un perro.

**4. Pérdida de acceso a la casilla.** Cambiar de mail deja a la persona fuera, y
**no hay procedimiento de recuperación definido**. Si además es el cuidador actual
de un animal, ese animal queda con un tránsito activo que **nadie puede cerrar**
— uno de los casos que motiva el rol `ADMIN`.

**5. Suplantación por acceso al correo.** Quien controle la casilla es, para el
sistema, la persona. No hay segundo factor.

## Qué no implica esta decisión

- **No implica que la autenticación esté implementada.** No hay una línea de código
  de auth, ni proyecto Supabase verificado. Ver
  [`../estado-actual.md`](../estado-actual.md).
- **No define el vínculo `Person` ↔ usuario** en el schema, ni si toda persona
  necesita cuenta.
- **No decide las políticas de RLS.** Las habilita; no las escribe.
- **No decide la matriz de permisos.** Varias filas siguen abiertas — ver
  [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md).
- **No implementa el rol `ADMIN`**, que se aprueba como concepto pero **no se
  construye en el MVP**.
- **No decide el flujo de UX del alta**, ni si el mail se pide al principio o al
  final.
- **No cierra la puerta a OAuth social** más adelante.
- **No convierte el historial en prueba de nada más que de lo que las cuentas
  declararon.**
