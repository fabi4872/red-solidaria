# Seguridad, identidad y permisos

**La decisión de identidad está tomada. La matriz de permisos sigue siendo
propuesta.**

| Parte de este documento | Estado |
| --- | --- |
| Modelo de identidad | ✅ **APROBADO** — Supabase Auth con magic link. Ver [ADR 0004](decisiones/0004-identidad-con-supabase-auth.md). |
| Vínculo `Person` ↔ Auth | ✅ **APROBADO** — `authUserId` nullable y unique. |
| Principios de autorización | ✅ **APROBADOS** — ver abajo. |
| RLS | ✅ **APROBADO** — habilitado desde la primera migración funcional. Ver [ADR 0010](decisiones/0010-rls-desde-la-primera-migracion.md). |
| Privacidad del historial | ✅ **APROBADA** — público con restricciones. Precisión geográfica **pendiente**. |
| Matriz de permisos | ⚠ **PROPUESTA PENDIENTE DE APROBACIÓN** |
| Rol `ADMIN` | ✅ Concepto aprobado. ❌ **Sin backoffice en el MVP**, pero ✅ **con una capacidad mínima de corrección server-only y auditable antes del lanzamiento**. Ver [ADR 0011](decisiones/0011-correccion-administrativa-minima.md). |

**Nada de esto está implementado.** No hay una línea de código de autenticación ni
de permisos. Ver [estado-actual.md](estado-actual.md).

---

## Decisión de identidad · APROBADA

**El MVP usa Supabase Auth con magic link por correo electrónico.** No se
implementa autenticación propia ni identificación liviana. `Person` se vincula al
usuario autenticado.

El razonamiento completo, las alternativas y los riesgos están en
[**ADR 0004**](decisiones/0004-identidad-con-supabase-auth.md). Acá va solo lo que
hace falta para leer la matriz de permisos.

### Qué verifica esta autenticación — y qué no

Verifica **el control de una casilla de correo**. Nada más. **No** prueba:

- la **identidad civil** de quien opera;
- la **posesión física real** del animal;
- la **autenticidad** de las fotografías;
- que un **traspaso físico haya ocurrido**.

Por eso la auditabilidad del sistema se describe como **alta**, nunca como
"completa" ni "irrefutable". Lo que el sistema produce es **evidencia declarativa
asociada a una cuenta verificada**: acciones **atribuibles a una cuenta
autenticada**, con **mayor trazabilidad** que un registro anónimo.

Dos personas pueden coordinar un traspaso en la app sin que el animal se mueva, y
el sistema no tiene forma de saberlo. **Verificar un mail no verifica un perro.**
Esta distinción no es una formalidad: define qué se le puede prometer al usuario.

### Personas sin cuenta · APROBADO

**`Person` tiene un vínculo opcional y único con Supabase Auth: `authUserId` —
nullable y unique.**

**Una `Person` puede existir sin cuenta**: la familia original, un adoptante externo,
un contacto relacionado. Son personas que el sistema necesita nombrar sin exigirles
que se registren.

**Pero las acciones sensibles requieren una `Person` vinculada a un usuario
autenticado:**

| Acción sensible | Requiere cuenta |
| --- | :---: |
| Registrar un animal | ✓ |
| Tomarlo en tránsito | ✓ |
| Iniciar un traspaso | ✓ |
| Aceptar un traspaso | ✓ |
| Marcar un desenlace (`ADOPTED`, `REUNITED`, `DECEASED`) | ✓ |
| Reabrir por adopción fallida (`ADOPTION_RETURNED`) | ✓ |

`nullable` permite que existan personas sin cuenta; `unique` garantiza que **una
cuenta no se reparta entre dos personas**.

> Consecuencia a tener presente: **el adoptante puede no tener cuenta**, pero **quien
> marca la adopción sí debe tenerla**. Son roles distintos — el que recibe al animal
> y el que asienta el hecho.

---

## Alternativas descartadas · contexto histórico

Se conservan en resumen para que la decisión no parezca arbitraria. El análisis
completo está en [ADR 0004](decisiones/0004-identidad-con-supabase-auth.md).

| Alternativa | Por qué se descartó |
| --- | --- |
| **A — Sin autenticación** | Cero fricción, y era el modelo que CLAUDE.md describía. Pero **cualquiera podía cerrar el tránsito de cualquier animal**, la cadena no era atribuible a nadie, los datos de contacto quedaban expuestos, y migrar a identidad después —con datos reales cargados— era la opción más cara. |
| **B — Identificación liviana** (nombre + contacto sin verificar) | **La peor de las tres.** Casi el mismo código que C sin ninguna de sus garantías, y **da apariencia de identidad sin serlo**. Además, al perder la sesión no hay forma de recuperar la cuenta: no hay nada contra qué verificar. |

**El contraargumento a la decisión tomada sigue en pie y vale recordarlo**: el
objetivo del MVP es *validar que la gente use el sistema*, y el magic link es
exactamente el tipo de fricción que puede hacer fracasar esa validación por una
razón ajena a la idea. Se aceptó ese riesgo a cambio de que la cadena signifique
algo. Está registrado como riesgo 1 del ADR 0004, **y hay que medirlo desde el día
uno.**

---

## Principios de autorización · APROBADOS

1. **Un usuario autenticado puede registrar un animal.**
2. **Solo el cuidador actual puede iniciar un traspaso.** Es quien tiene al animal.
3. **Solo el receptor propuesto puede aceptarlo.** Nadie recibe un animal sin
   aceptarlo. Ver [ADR 0005](decisiones/0005-traspaso-con-propuesta-y-aceptacion.md).
4. **Ningún participante puede editar ni borrar tránsitos cerrados.** Sin excepción
   entre usuarios comunes.
5. **El historial se corrige agregando eventos o mediante una futura intervención
   administrativa auditable — nunca reescribiendo silenciosamente el pasado.** Ver
   [ADR 0007](decisiones/0007-historial-y-correcciones-auditables.md).
6. **`ADMIN` podrá intervenir** en casos de fraude, duplicados, errores graves,
   abandono o pérdida de acceso. **No se construye un backoffice en el MVP**, pero
   **sí debe existir una operación administrativa mínima, server-only y auditable,
   antes de publicar el MVP** — registrando administrador, fecha, motivo, dato
   original y dato corregido o evento correctivo. Es **condición de lanzamiento**.
   Ver [ADR 0011](decisiones/0011-correccion-administrativa-minima.md).
7. **Las operaciones sensibles se ejecutan del lado del servidor**, vía Prisma. Su
   autorización la decide nuestro código, no una política de la base. **RLS es la
   segunda línea de defensa, no la primera.** Ver
   [ADR 0010](decisiones/0010-rls-desde-la-primera-migracion.md).

Dos principios que la matriz asume y que también rigen:

8. **El registrante no es dueño.** Su rol es histórico. Registrar no otorga control
   permanente sobre el animal ni sobre su ficha.
9. **El cuidador actual tiene la autoridad operativa**, porque es quien tiene al
   animal físicamente.

---

## Matriz de permisos

> ## ⚠ PROPUESTA PENDIENTE DE APROBACIÓN
>
> Los principios de arriba están aprobados; **el detalle de esta matriz no**. Las
> filas marcadas ⚠ son decisiones abiertas.

**Roles** (ninguno existe en código):

| Rol | Quién es | Estado |
| --- | --- | --- |
| **Anónimo** | Sin autenticar. | — |
| **Autenticado** | Persona con sesión válida (magic link). | Aprobado |
| **Registrante** | Quien dio de alta al animal. Histórico e inmutable. | Aprobado |
| **Cuidador actual** | Persona del tránsito activo. **Derivado**, cambia con cada traspaso. | Aprobado |
| **Receptor propuesto** | Destinatario de un traspaso aún no aceptado. | Aprobado |
| **`ADMIN`** | Interviene en fraude, duplicados, errores graves, abandono, pérdida de acceso. | Concepto aprobado · **sin backoffice**, solo la capacidad mínima server-only y auditable |

**Toda acción de la matriz salvo "consultar historial" exige una `Person` con
`authUserId`** — ver "Personas sin cuenta".

| Acción | Anónimo | Autenticado | Registrante | Cuidador actual | Receptor propuesto | `ADMIN` | Notas |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | --- |
| Consultar historial | **✓** | ✓ | ✓ | ✓ | ✓ | ✓ | **Público**, con datos personales y ubicación exacta ocultos (ver abajo). **La redacción la hace el servidor, no RLS.** |
| Registrar animal | ✗ | **✓** | — | — | — | ✓ | Requiere foto y ubicación. Al registrar, la persona **se vuelve** registrante. |
| Registrar animal ya fallecido | ✗ | **✓** | — | — | — | ✓ | Mismo permiso. **⚠ Sin evidencia exigida** — ver abajo. |
| Editar datos descriptivos | ✗ | ✗ | ⚠ | ⚠ | ✗ | ✓ | **⚠ Abierta.** Propuesta: **ambos**, sobre campos descriptivos (vacunas, tamaño, alias), **nunca** sobre el historial. |
| Cambiar `isAvailableForAdoption` | ✗ | ✗ | ⚠ | ⚠ | ✗ | ✓ | **⚠ Abierta.** Eje nuevo ([ADR 0008](decisiones/0008-estado-operativo-y-disponibilidad-como-ejes-separados.md)); nadie decidió quién lo controla. Propuesta: el cuidador actual, y el registrante mientras el animal esté `FOUND`. |
| Tomar en tránsito | ✗ | **✓** | ✓ | — | — | ✓ | Solo si el animal **no tiene** tránsito activo. Si lo tiene, la vía es el traspaso. |
| Iniciar traspaso | ✗ | ✗ | ✗ | **✓** | ✗ | ⚠ | **Aprobado**: solo el cuidador actual. Solo si no hay otra propuesta en `PENDING`. |
| Aceptar traspaso | ✗ | ✗ | ✗ | ✗ | **✓** | ⚠ | **Aprobado**: solo el receptor propuesto. |
| Cancelar propuesta | ✗ | ✗ | ✗ | **✓** | ⚠ | ⚠ | **Aprobado** para el cuidador actual. **⚠ Abierta**: ¿el receptor puede rechazar explícitamente, o solo dejar expirar? |
| Marcar adopción | ✗ | ✗ | ⚠ | ✓ | — | ✓ | **⚠ Abierta.** ¿Solo el cuidador, o también el registrante? El **adoptante** puede no tener cuenta; quien **marca** sí. |
| Marcar `REUNITED` | ✗ | ✗ | ⚠ | ⚠ | — | ✓ | **⚠ Abierta.** Quién puede marcarlo. Final absoluto: sin vuelta atrás. |
| Cerrar por `DECEASED` | ✗ | ✗ | ✗ | ⚠ | — | ✓ | **⚠ Abierta**: qué evidencia se exige. Propuesta: solo el cuidador actual. |
| Reabrir por adopción fallida (`ADOPTION_RETURNED`) | ✗ | ✗ | ⚠ | — | — | ⚠ | **⚠ Abierta** quién la ejecuta. Exige cuenta. **El receptor sí está definido**: la operación crea un `Transit` nuevo con una `Person` autenticada **indicada explícitamente** — nunca inferida. Ver [ADR 0009](decisiones/0009-reapertura-por-adopcion-fallida.md). |
| Registrar un `AnimalEvent` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **Nadie, directamente.** Los eventos los escribe el sistema como parte de cada operación, **en la misma transacción**. No hay una acción "crear evento". Ver [ADR 0012](decisiones/0012-bitacora-de-eventos-del-animal.md). |
| Ejecutar una corrección administrativa (`ADMIN_CORRECTION`) | ✗ | ✗ | ✗ | ✗ | ✗ | **✓** | **Server-only**, sin pantalla. Operaciones **específicas y controladas**, no un editor genérico. **⚠ Abierto** su alcance exacto. |
| Editar o borrar tránsito cerrado | ✗ | ✗ | **✗** | **✗** | ✗ | ⚠ | **Aprobado**: nadie, sin excepción entre usuarios comunes. `ADMIN` solo por la vía auditable. |

✓ permitido · ✗ denegado · ⚠ decisión abierta · — no aplica

### Decisiones que siguen abiertas

- Quién puede editar los **datos descriptivos** del animal.
- **Quién controla `isAvailableForAdoption`** — eje nuevo, sin dueño asignado.
- Quién puede marcar una **adopción** y **`REUNITED`**.
- **Qué evidencia se exige para `DECEASED`** — es irreversible, no requiere prueba
  alguna, y ahora **también se puede asentar en el registro inicial**.
- **Quién puede ejecutar `ADOPTION_RETURNED`.** *(Quién queda como cuidador al
  reabrir **ya está resuelto**: se indica explícitamente y debe estar autenticado.)*
- **El alcance exacto de las facultades de la corrección administrativa.** Una
  capacidad que puede arreglar cualquier cosa sin límites es el problema que
  queríamos evitar, con otro nombre.
- Si el receptor puede **rechazar** una propuesta explícitamente.
- **¿La bitácora (`AnimalEvent`) es pública, y con qué detalle?** El historial público
  oculta datos personales; **un `ADMIN_CORRECTION` visible expondría la intervención y
  su motivo**. Ver [ADR 0012](decisiones/0012-bitacora-de-eventos-del-animal.md).

---

## Privacidad del historial · APROBADO

El historial es **públicamente consultable**, pero **nunca** muestra:

- correo electrónico;
- teléfono;
- dirección exacta de personas;
- **ubicación exacta actual del animal**;
- datos privados del perfil.

**Sí** puede mostrar: alias o nombre público, fechas, etapas de la cadena, estado,
fotografías autorizadas, y la ubicación **aproximada** del hallazgo cuando
corresponda.

> **[PENDIENTE]** La **precisión geográfica exacta** y el **mecanismo de
> anonimización** se definen en la etapa de **UX y seguridad**. Hasta entonces, "no
> mostrar la ubicación exacta" es una regla sin implementación: qué significa
> "aproximada" —¿el barrio? ¿un radio? ¿cuántos metros?— **no está definido**, y de
> ese número depende que la regla proteja algo o no.

Nota sobre las fotos: van con la ubicación del hallazgo asociada. Un **bucket
público** las haría indexables por buscadores con esa ubicación
([ADR 0003](decisiones/0003-storage-de-fotografias.md), riesgo 3). No hay bucket
configurado: la decisión sigue abierta y **es de privacidad, no solo técnica**.

---

## Riesgo de seguridad ya presente en el código

**Existe hoy, con independencia de todo lo anterior.**

`createSupabaseServiceClient()` lee `SUPABASE_SERVICE_ROLE_KEY` — la clave que
**salta RLS por completo** — y vive en `src/lib/supabase.ts`, un módulo que
cualquier componente de cliente puede importar. La única protección actual es un
comentario en mayúsculas que dice "NUNCA importar esto desde el navegador".

**Un comentario no es un mecanismo de defensa.** Si alguien lo importa por error
desde un componente de cliente, la clave se empaqueta en el bundle y queda expuesta
a cualquiera que abra las herramientas de desarrollo. No hay aviso, no hay error:
simplemente funciona, y la clave queda publicada.

Hoy el riesgo es teórico —**nadie importa ese módulo**— y se vuelve real con la
primera pantalla que toque datos.

**Mitigación propuesta** (no implementada, requiere modificar código):

- Mover el cliente de service role a un módulo propio con `import "server-only"`,
  que convierte el error en **fallo de build** en lugar de filtración silenciosa.
- Aplicar lo mismo a `src/lib/prisma.ts`, que tiene idéntico problema.
- Hacerlo **antes** de la primera pantalla, no después.

---

## RLS desde la primera migración funcional · APROBADO

**Todas las tablas expuestas vía Supabase nacen con Row Level Security habilitado**,
y **los buckets de Storage nacen con políticas restrictivas**. **Las políticas
concretas no se escriben todavía.** Ver
[ADR 0010](decisiones/0010-rls-desde-la-primera-migracion.md).

**Las operaciones sensibles de dominio se ejecutan del lado del servidor mediante
Prisma**, y no dependen exclusivamente de permisos en el cliente.

### Qué protege RLS de verdad — y qué no

Vale ser explícito, porque es fácil creer que cubre más de lo que cubre:

| Vía de acceso | Quién decide | Qué lo protege |
| --- | --- | --- |
| Nuestro código de servidor, vía Prisma | Nuestro código | Validación de negocio dentro de transacciones |
| Cliente Supabase en el navegador (anon key) | La base | **RLS** |
| Storage de fotos | Supabase Storage | **Políticas del bucket** |

**RLS no protege contra bugs de nuestro propio código de servidor.** Prisma se
conecta con un rol de PostgreSQL que, en la configuración habitual de Supabase, es el
dueño de las tablas y **no queda sujeto a RLS**. Es coherente —el servidor es código
de confianza y ya valida— pero significa que **RLS es la segunda línea de defensa, no
la primera**.

Lo que RLS sí hace: **cierra por defecto la puerta que Supabase abre sola.** Supabase
publica una API REST sobre las tablas, alcanzable con la anon key que viaja al
navegador. Si esa clave se filtra, si alguien prueba la API a mano, o si mañana una
pantalla lee una tabla directo, RLS es lo único que hay del otro lado.

**La redacción de datos del historial público —ocultar correo, teléfono, ubicación
exacta— la hace nuestro código de servidor, no RLS.** RLS decide **qué filas** se
ven, no **qué columnas** se muestran. Confundir esas dos cosas dejaría los datos
personales expuestos con RLS activo y la sensación de estar cubiertos.

> **[PENDIENTE]** Las políticas concretas, qué rol usa Prisma, y si el bucket de
> fotos es público o privado.
>
> **RLS no mitiga en nada el riesgo de `SUPABASE_SERVICE_ROLE_KEY`** descrito arriba:
> esa clave **salta RLS por completo**.
