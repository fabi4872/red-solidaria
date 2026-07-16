# 0011 — Capacidad mínima de corrección administrativa antes del lanzamiento

> ## ⚠ Estado actual: Aceptada, **completada por [ADR 0012](0012-bitacora-de-eventos-del-animal.md)**.
>
> Este ADR dejaba sin definir **el modelo físico de la auditoría** ("tabla, bitácora,
> versionado — sin decidir"). Ya está: la corrección se registra como un
> **`AnimalEvent` de tipo `ADMIN_CORRECTION`**, con administrador, fecha, motivo,
> entidad o dato afectado, valor original y valor corregido.
>
> **Todo lo que decide sigue vigente**, incluida la distinción de alcance: sin
> backoffice en el MVP, pero con la capacidad mínima server-only y auditable **antes
> del lanzamiento público**.

- **Estado**: Aceptada
- **Fecha**: 2026-07-16
- **Refina a**: [ADR 0007](0007-historial-y-correcciones-auditables.md), que decía
  que `ADMIN` "no se implementa en el MVP: ni el rol, ni sus pantallas, ni el
  backoffice". **Eso se ajusta**: sigue sin construirse un backoffice, pero **sí
  debe existir una capacidad mínima de corrección antes del lanzamiento público.**

## Contexto

[ADR 0007](0007-historial-y-correcciones-auditables.md) estableció que el historial
no se reescribe con operaciones ordinarias, y que las correcciones deben ser
excepcionales, autorizadas y auditables. Aprobó `ADMIN` como concepto y difirió su
construcción.

Sus propios riesgos 1 y 2 anticipaban el problema, y al cerrarse la segunda ronda
quedó registrado así:

> Durante todo el MVP no habrá forma de arreglar un error grave dentro del producto.
> Un `DECEASED` marcado por error o un traspaso aceptado por equivocación quedan
> asentados. La salida real va a ser un `UPDATE` a mano contra Supabase —
> exactamente lo que el ADR 0007 declara inaceptable.

Esa combinación no se sostiene. Una regla que prohíbe la corrección silenciosa
**mientras la única corrección disponible es silenciosa** no es una regla: es una
expresión de deseo que se incumple la primera vez que haga falta. Y va a hacer
falta: `DECEASED` es irreversible y no exige evidencia; una cuenta perdida deja un
animal con un tránsito activo que nadie puede cerrar
([ADR 0004](0004-identidad-con-supabase-auth.md), riesgo 4); las cuentas duplicadas
existen.

La tensión real no era "construir el backoffice o no". Era que **el alcance mezclaba
dos cosas distintas**: un backoffice completo (pantallas, gestión, listados) y la
capacidad mínima de arreglar un desastre. Lo primero es una funcionalidad. Lo
segundo es una condición para poder atender a usuarios reales.

## Decisión

**No se construye un backoffice completo dentro del MVP.**

**Sí debe existir, antes de publicar el MVP, una operación administrativa mínima,
server-only y auditable, para corregir errores graves.**

Toda corrección debe registrar:

- **administrador**;
- **fecha**;
- **motivo**;
- **dato original**;
- **dato corregido o evento correctivo**.

**Server-only**: no hay pantalla, no hay rol en la UI, no hay sesión de
administrador en el navegador. Es una capacidad que se ejecuta del lado del
servidor.

**El modelo físico no se diseña acá.**

### La distinción de alcance

| | En el MVP |
| --- | --- |
| Backoffice completo (pantallas, gestión, listados, moderación) | **No** |
| Rol `ADMIN` expuesto en la UI | **No** |
| Capacidad mínima de corrección, server-only y auditable | **Sí — antes del lanzamiento público** |

"Antes de publicar el MVP" es una condición de lanzamiento, no del primer commit.
Puede construirse último. **Pero sin ella no se abre al público.**

## Alternativas consideradas

**1. Nada hasta después del MVP** (lo que decidía ADR 0007). Descartada: garantiza
que la primera corrección real sea un `UPDATE` a mano en Supabase Studio —sin
registro, sin autorización, sin rastro—, que es la peor de todas las opciones y la
que ADR 0007 declara inaceptable. La regla y la realidad no pueden contradecirse por
diseño.

**2. Backoffice completo en el MVP.** Descartada por alcance, igual que en ADR 0007:
es autenticación de rol, pantallas, listados y auditoría para un sistema que todavía
no tiene un usuario.

**3. Aceptar el `UPDATE` manual, pero documentarlo como procedimiento.** Descartada:
un procedimiento escrito no deja rastro en los datos. Nadie sabría después que un
dato fue tocado, ni por quién, ni por qué. Y es indistinguible de una manipulación —
que es justo lo que hay que poder distinguir.

**4. Rehabilitar los datos vía la app, con permisos elevados para algún usuario.**
Descartada: mete un rol privilegiado en la superficie del navegador, que es
exactamente lo que "server-only" evita.

## Consecuencias

**Se vuelve fácil:**
- Los errores graves tienen una vía prevista **dentro del sistema**.
- La regla de ADR 0007 pasa a ser cumplible en lugar de aspiracional.
- Toda corrección queda con administrador, fecha, motivo y dato original: se puede
  reconstruir qué se tocó y por qué.
- Se puede atender a usuarios reales sin romper las propias reglas.

**Se vuelve difícil:**
- **Es trabajo que antes no estaba en el MVP**, y es una condición de lanzamiento.
  El alcance creció.
- Hay que diseñar el registro de auditoría: guardar el dato original obliga a
  representar "cómo era antes", que es más que un log de texto.
- Aparece una vía de escritura que **no pasa por las reglas del dominio**. Es su
  razón de ser, y también su peligro.
- "Server-only" hay que sostenerlo: no hay pantalla, así que la ejecución es
  incómoda a propósito. Esa incomodidad es parte del diseño.

## Riesgos

**1. Que se convierta en la vía normal.** Una operación que puede arreglar
cualquier cosa termina usándose para cualquier cosa. *Cómo nos daríamos cuenta*:
correcciones frecuentes, motivos vagos, correcciones que en realidad son features
faltantes. **Si se usa seguido, el problema no es la corrección: es lo que la hace
necesaria.**

**2. Alcance indefinido.** ADR 0007 ya lo señalaba: *"un rol capaz de reescribir
cualquier cosa sin límites es el problema que esta decisión evita, con otro
nombre"*. **Sigue abierto** qué puede tocar exactamente.

**3. Que se postergue hasta el lanzamiento y se haga apurada.** Al ser condición de
lanzamiento y no del primer commit, es candidata natural a quedar para el final —
justo cuando hay presión por publicar. Una auditoría hecha apurada es un `console.log`.

**4. Motivo como texto libre inútil.** "Corrección" no le sirve a nadie. Mismo
riesgo que en [ADR 0009](0009-reapertura-por-adopcion-fallida.md).

**5. Auditoría que nadie mira.** ADR 0007, riesgo 4: registrar no es controlar. La
auditabilidad es una capacidad; sin nadie que la ejerza, es un archivo que crece.

**6. Que el `UPDATE` manual pase igual.** Nada lo impide técnicamente. Esta decisión
lo hace innecesario; no lo hace imposible.

## Qué no implica esta decisión

- **No implica que exista nada.** No hay operación, ni auditoría, ni rol. Ver
  [`../estado-actual.md`](../estado-actual.md).
- **No construye un backoffice**, ni pantallas, ni un rol `ADMIN` en la UI.
- **No define el modelo físico** de la auditoría: tabla, bitácora, versionado —
  sin decidir.
- **No define el alcance exacto de las facultades** de la corrección: qué puede
  tocar y qué no. **Sigue abierto.**
- **No define cómo se ejecuta** ni quién la ejecuta.
- **No define cómo se autentica** al administrador.
- **No cambia [ADR 0007](0007-historial-y-correcciones-auditables.md)** en su
  principio: el historial no se reescribe con operaciones ordinarias, y esta **no es
  una operación ordinaria**. Solo ajusta el alcance de lo que existe en el MVP.
- **No es la vía para deshacer una adopción fallida**: eso es
  [ADR 0009](0009-reapertura-por-adopcion-fallida.md), un hecho del dominio, no un
  error.
