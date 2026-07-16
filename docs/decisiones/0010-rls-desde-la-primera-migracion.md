# 0010 — RLS habilitado desde la primera migración funcional

- **Estado**: Aceptada
- **Fecha**: 2026-07-16
- **Cierra**: la pregunta "¿RLS activo desde el día uno?" que
  [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md) tenía
  abierta.
- **Depende de**: [ADR 0004](0004-identidad-con-supabase-auth.md) — sin identidad,
  RLS no tiene sujeto sobre el cual decidir.

## Contexto

El proyecto expone una base PostgreSQL a través de Supabase. Supabase publica **una
API REST sobre las tablas**, alcanzable con la anon key que viaja al navegador. En
un proyecto Supabase, **una tabla sin RLS es una tabla legible —y potencialmente
escribible— por cualquiera que tenga esa clave**, que por diseño es pública.

Las tablas de este sistema guardan datos de contacto de personas reales y
ubicaciones de animales. Y el modelo de privacidad ya aprobado (CLAUDE.md →
"Privacidad del historial") dice que el historial es público **pero sin correo,
teléfono, dirección ni ubicación exacta**. Una tabla sin RLS no distingue nada de
eso: entrega la fila completa.

Habilitar RLS **después**, con datos y tablas ya en uso, obliga a revisar cada tabla
existente y a descubrir qué se rompe una por una. Habilitarlo desde el arranque
cuesta una línea por tabla en la primera migración.

## Decisión

**Se habilita Row Level Security desde la primera migración funcional, para todas
las tablas expuestas mediante Supabase.**

**Los buckets de Storage también nacen con políticas restrictivas.**

**Las operaciones sensibles de dominio se ejecutan del lado del servidor mediante
Prisma, y no dependen exclusivamente de permisos en el cliente.** Registrar un
animal, tomar en tránsito, proponer y aceptar un traspaso, marcar un desenlace y
reabrir una adopción son operaciones de servidor: su autorización la decide nuestro
código, no una política de la base.

**Las políticas concretas no se escriben todavía.** La migración tampoco.

### Cómo se reparten las responsabilidades — y qué protege RLS de verdad

Conviene ser explícito, porque es fácil creer que RLS protege más de lo que protege:

| Vía de acceso | Quién decide | Qué lo protege |
| --- | --- | --- |
| Nuestro código de servidor, vía Prisma | Nuestro código | Validación de negocio **dentro de transacciones** |
| Cliente Supabase en el navegador (anon key) | La base | **RLS** |
| Storage de fotos | Supabase Storage | **Políticas del bucket** |

**RLS no protege contra bugs de nuestro propio código de servidor.** Prisma se
conecta con un rol de PostgreSQL que, en la configuración habitual de Supabase, **es
el dueño de las tablas y por lo tanto no queda sujeto a RLS**. Eso es coherente con
la decisión —el servidor es código de confianza y ya valida— pero significa que
**RLS es una segunda línea de defensa, no la primera**.

Lo que RLS sí hace, y es la razón de esta decisión: **cierra por defecto la puerta
que Supabase abre sola.** Si la anon key se filtra, si alguien prueba la API REST a
mano, o si mañana una pantalla lee una tabla directo desde el navegador, RLS es lo
único que hay del otro lado.

**La redacción de datos del historial público —ocultar correo, teléfono, ubicación
exacta— la hace nuestro código de servidor, no RLS.** RLS decide qué filas se ven,
no qué columnas se muestran. Confundir esas dos cosas dejaría los datos personales
expuestos con RLS activo y la sensación de estar cubiertos.

## Alternativas consideradas

**1. RLS después, cuando haya pantallas.** Descartada: habilitarlo sobre tablas ya
en uso obliga a auditar cada una y a descubrir roturas de a una. Y mientras tanto,
cada tabla nueva nace abierta.

**2. Sin RLS, confiando en que todo pasa por Prisma.** Es tentador porque, con las
operaciones sensibles del lado del servidor, **hoy sería suficiente**. Descartada:
depende de que **nunca** nadie lea una tabla desde el navegador y de que la anon key
nunca se filtre. Son dos promesas sobre el futuro, y una de ellas la rompe cualquier
pantalla apurada.

**3. RLS como único mecanismo de autorización**, sin validación en el servidor.
Descartada: las reglas de este dominio —un solo tránsito activo, una sola propuesta
pendiente, transiciones válidas, traspaso transaccional de ocho pasos— **no son
expresables como políticas de fila**, y meterlas ahí sería exactamente la "lógica de
negocio en la base" que CLAUDE.md prohíbe.

**4. Buckets públicos por simplicidad.** Descartada: las fotos llevan asociada la
ubicación del hallazgo. Un bucket público las vuelve indexables por buscadores con
esa ubicación ([ADR 0003](0003-storage-de-fotografias.md), riesgo 3).

## Consecuencias

**Se vuelve fácil:**
- Las tablas nacen cerradas. **Abrir es una decisión explícita; estar abierto no es
  un descuido.**
- Si la anon key se filtra —y va a estar en el navegador— el daño está acotado.
- Cada tabla nueva hereda la costumbre: se crea con RLS.
- Cuando alguna pantalla necesite leer directo, la infraestructura ya está.

**Se vuelve difícil:**
- **Todo cuesta más desde el primer día.** Cada tabla necesita su política antes de
  que nada funcione desde el cliente.
- Habrá momentos de "esto no anda y no sé por qué" que sean una política faltante.
  RLS no devuelve error: **devuelve cero filas**. Es un modo de falla silencioso y
  confunde.
- Las políticas viven en SQL, fuera del schema de Prisma. **Son un artefacto que
  Prisma no ve**: hay que escribirlas en migraciones a mano y recordar que existen.
- Dos lugares donde razonar sobre permisos (nuestro código y las políticas), con el
  riesgo de que digan cosas distintas.

## Riesgos

**1. Creer que RLS protege lo que no protege.** El riesgo principal, y es
conceptual: RLS activo **no** valida las reglas del dominio, **no** filtra columnas
sensibles y **no** se interpone frente a nuestro código de servidor. Un equipo que
cree estar cubierto por RLS revisa menos su propio código. *Cómo nos daríamos
cuenta*: probablemente no nos daríamos cuenta — hasta la filtración.

**2. Políticas que divergen del código.** Nuestro servidor autoriza una cosa y la
política otra. Mientras todo pase por Prisma, la divergencia es invisible; aparece
el día que algo lee desde el cliente.

**3. Fallas silenciosas en desarrollo.** Cero filas devueltas se parece mucho a "no
hay datos". Se pierde tiempo buscando en el lugar equivocado.

**4. Que las políticas se escriban apuradas y permisivas.** Una política
`using (true)` cumple la letra de esta decisión y no protege nada. **Tener RLS
habilitado no es tener RLS bien configurado**, y esta decisión solo garantiza lo
primero.

**5. Buckets abiertos "para probar".** Un bucket público mientras se prueba la
subida de fotos, que después nadie cierra. Las fotos ya subidas quedan indexadas
aunque el bucket se cierre después.

**6. Que las políticas de Storage se olviden.** Esta decisión las nombra, pero
Storage es un sistema aparte: no lo cubre ninguna migración de Prisma.

## Qué no implica esta decisión

- **No implica que RLS esté habilitado.** No hay tablas, no hay migraciones, no hay
  proyecto Supabase verificado. Ver [`../estado-actual.md`](../estado-actual.md).
- **No escribe ninguna política**, ni de tablas ni de buckets.
- **No define qué rol usa Prisma** ni si debería quedar sujeto a RLS.
- **No decide si el bucket de fotos es público o privado** — solo que nace
  restrictivo.
- **No reemplaza la matriz de permisos** ni la valida: la autorización del dominio
  la decide nuestro código.
- **No cubre la redacción de datos personales** del historial público, que es
  responsabilidad del servidor.
- **No resuelve el riesgo de `SUPABASE_SERVICE_ROLE_KEY`** importable desde un
  componente de cliente: **esa clave salta RLS por completo**, así que esta decisión
  no la mitiga en absoluto. Ver
  [`../seguridad-identidad-permisos.md`](../seguridad-identidad-permisos.md) →
  "Riesgo de seguridad ya presente en el código".
- **No define cuándo es "la primera migración funcional"**, más allá de que RLS
  llegue con ella y no después.
