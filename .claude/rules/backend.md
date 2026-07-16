# Reglas de backend — dentro de Next.js

> **[`CLAUDE.md`](../../CLAUDE.md) manda.** Esta guía **expande** sus convenciones.
> Donde una regla ya vive en CLAUDE.md se la marca con **(CLAUDE.md)**, y **esa** es
> la fuente. Si discrepan, **gana CLAUDE.md e informá la contradicción**.
>
> Ver también [`database.md`](database.md), [`security.md`](security.md) y
> [`general-engineering.md`](general-engineering.md).

**Acá no se diseñan servicios concretos ni se escribe código.** Son las reglas que ese
código, cuando exista, tendrá que cumplir.

---

## La frontera es fina

- **Route Handlers y Server Actions finos.** Reciben, validan, autorizan, delegan y
  responden. **La lógica de dominio no vive ahí.**
- **Validar las entradas en la frontera**, siempre. Todo lo que llega de afuera es
  hostil hasta que se demuestre lo contrario, incluso si el formulario propio ya validó.
- **Autorizar del lado del servidor en toda operación sensible.** Sin excepción. La
  lista de operaciones sensibles está en
  [`../../docs/seguridad-identidad-permisos.md`](../../docs/seguridad-identidad-permisos.md):
  registrar un animal, tomarlo en tránsito, iniciar y aceptar un traspaso, marcar un
  desenlace, reabrir por adopción fallida.
- **No confiar en datos ni permisos del cliente.** Que el botón no se muestre no
  significa que la operación no se pueda invocar. El servidor decide, y RLS es la
  segunda línea de defensa, no la primera
  ([ADR 0010](../../docs/decisiones/0010-rls-desde-la-primera-migracion.md)).

## Dominio

- **La lógica de dominio va en funciones o servicios cohesionados**, no repartida entre
  handlers, componentes y helpers. La lógica dispersa es la que se duplica y se
  contradice.
- **La validación de transiciones vive en un solo lugar reutilizable.** (CLAUDE.md)
- El dominio **no sabe de HTTP**. No recibe `Request`, no devuelve `Response`, no lee
  headers. Eso es transporte.

## Transacciones

- **Toda operación que toca varias entidades va en una transacción.** (CLAUDE.md) Es la
  única excepción autorizada a "la lógica va en el código, no en la base".
- **Cuando una operación afecta a `Animal`, `Transit`, `TransitTransfer` o
  `AnimalEvent`, todas quedan coherentes dentro de la misma transacción.** Sin
  excepción. Los casos concretos ya están escritos en CLAUDE.md:
  - **Traspaso** (aceptación): ocho pasos, todo o nada.
  - **Registro de un animal encontrado fallecido**: creación + `FOUND → DECEASED`,
    atómico.
  - **Transición a un cierre**: cerrar el tránsito activo + `isAvailableForAdoption =
    false`, atómico.
  - **`ADOPTION_RETURNED`**: evento + `Transit` nuevo + cambio de estado +
    disponibilidad, atómico.
  - **Toda operación de dominio escribe su entidad y su `AnimalEvent` en la misma
    transacción** ([ADR 0012](../../docs/decisiones/0012-bitacora-de-eventos-del-animal.md)).
    Si se separan, la bitácora y las entidades divergen y **nada indica cuál miente**.
- **Nunca dejar un animal a medio traspasar** — ni sin cuidador, ni con dos.
  (CLAUDE.md)
- La transacción **no reemplaza la validación**: valida primero, dentro de la misma
  transacción, para que nadie se cuele entre el chequeo y la escritura.

## Errores

- **Claros y categorizados.** No es lo mismo "no autorizado" que "no encontrado" que
  "la propuesta expiró". El código llamador tiene que poder distinguirlos sin parsear
  texto.
- **Sin filtrar detalles internos al usuario.** Ni stack traces, ni mensajes de
  Postgres, ni nombres de tablas. Ver [`security.md`](security.md).
- **Los textos que ve el usuario van en español y centralizados.** (CLAUDE.md)
- **No capturar errores para ignorarlos.** (Ver
  [`general-engineering.md`](general-engineering.md).) Un `catch` que no maneja, no
  registra y no relanza es un bug esperando.
- Nota de coherencia: `src/lib/supabase.ts` valida sus variables de entorno y falla
  ruidosamente; `src/lib/prisma.ts` **no valida `DATABASE_URL`** y falla más tarde y
  peor. **Unificar el criterio** cuando se toque.

## Datos

- **Seleccionar solo lo necesario.** Nada de traer la fila entera porque es cómodo.
- **No devolver campos sensibles por comodidad.** El historial público **nunca** lleva
  correo, teléfono, dirección exacta ni ubicación exacta actual (CLAUDE.md →
  "Privacidad del historial"). **Esa redacción la hace el servidor**: RLS decide qué
  filas se ven, **no qué columnas**.
- **Evitar N+1.** Una consulta por cada elemento de una lista es el error de
  performance más común con un ORM. Traé lo que necesitás de una vez.
- **Fechas en UTC.** Sin excepciones. La conversión a hora local es presentación.

## Idempotencia

- **Operaciones idempotentes cuando el flujo lo requiera.** El caso concreto: **aceptar
  un traspaso dos veces** (doble clic, reintento de red) **no puede crear dos
  tránsitos**. La validación de que la propuesta siga `PENDING`, dentro de la
  transacción, es lo que lo impide — pero **eso hay que testearlo, no suponerlo**
  ([ADR 0005](../../docs/decisiones/0005-traspaso-con-propuesta-y-aceptacion.md),
  riesgo 5).

## Logs

- **Sin secretos.** Ni tokens, ni claves, ni cadenas de conexión.
- **Sin datos personales innecesarios.** Correos, teléfonos y ubicaciones exactas no
  van al log "para debuggear". Un log es un lugar donde los datos personales sobreviven
  a cualquier política de privacidad.

## Tests

- **Las operaciones críticas van acompañadas de tests.** (CLAUDE.md) El alcance exacto
  está en [`testing.md`](testing.md). No es opcional para el motor de estados ni para
  el traspaso: son las piezas cuya corrección **no se puede verificar a ojo**.
