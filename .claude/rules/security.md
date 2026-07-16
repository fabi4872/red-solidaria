# Reglas de seguridad

> **[`CLAUDE.md`](../../CLAUDE.md) manda.** Esta guía **expande** sus decisiones.
> Donde una regla ya vive en CLAUDE.md se la marca con **(CLAUDE.md)**. Si discrepan,
> **gana CLAUDE.md e informá la contradicción**.
>
> Ver también [`database.md`](database.md) y
> [`../../docs/seguridad-identidad-permisos.md`](../../docs/seguridad-identidad-permisos.md).

---

## Secretos

- **Los secretos viven solo en variables server-side.** Nunca en el código, nunca en un
  commit, nunca en un log.
- **Ninguna clave privilegiada con `NEXT_PUBLIC_`.** Ese prefijo significa "esto se
  empaqueta en el navegador". Es la regla que no se discute.
  - Las cinco variables actuales están en `.env.example`. `NEXT_PUBLIC_SUPABASE_URL` y
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` **deben** ser públicas: la anon key está pensada
    para el navegador y respeta RLS. `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` y
    `DIRECT_URL` **jamás**.
- **Nunca exponer la service role key.** **Salta RLS por completo.** Quien la tenga
  puede leer y escribir todo, y ninguna política lo detiene.
- **`.env` no se versiona.** Está en `.gitignore` y nunca se commiteó — verificado.
  Mantenerlo así.
- **Al informar sobre variables de entorno**: se puede decir que existen o que están
  vacías. **Nunca mostrar valores.**

## El límite servidor/cliente

**Este es el riesgo abierto más concreto del repositorio.** `createSupabaseServiceClient()`
lee la service role key y vive en `src/lib/supabase.ts`, un módulo que **cualquier
componente de cliente puede importar**. La única protección hoy es un comentario en
mayúsculas.

**Un comentario no es un mecanismo de defensa.** Si alguien lo importa por error, la
clave se empaqueta en el bundle y queda expuesta. No hay aviso, no hay error:
simplemente funciona, y la clave queda publicada. `src/lib/prisma.ts` tiene el mismo
problema.

- **Los módulos privilegiados se marcan `server-only`** cuando se implementen. Eso
  convierte el error en **fallo de build** en lugar de filtración silenciosa.
- **Hacerlo antes de la primera pantalla que toque datos, no después.**
- **Nunca importar código server-only desde el cliente.** Ver
  [`frontend.md`](frontend.md).

## Autenticación y autorización

- **Validar autenticación y autorización por operación**, del lado del servidor.
  (CLAUDE.md) Que la UI no muestre el botón no impide que alguien invoque la operación.
- **Principio de mínimo privilegio.** Cada rol, cada clave y cada política dan lo
  mínimo necesario. Empezá negando.
- **La autenticación verifica el control de una casilla de correo. Nada más.**
  (CLAUDE.md) **No** prueba identidad civil, ni posesión física del animal, ni
  autenticidad de las fotos, ni que un traspaso haya ocurrido. La auditabilidad es
  **alta**, nunca "completa" ni "irrefutable": lo que el sistema produce es **evidencia
  declarativa asociada a una cuenta verificada**. No prometas más que eso — ni en la
  UI, ni en la documentación, ni al razonar.
- **RLS desde la primera migración funcional**, con políticas restrictivas; buckets de
  Storage también.
  ([ADR 0010](../../docs/decisiones/0010-rls-desde-la-primera-migracion.md))

## Entradas

- **No confiar en datos del navegador.** Ninguno. Ni ids, ni roles, ni flags, ni
  "quién soy".
- **Sanitizar y validar** en la frontera del servidor, aunque el cliente ya haya
  validado. La validación del cliente es UX; la del servidor es seguridad.
- **Limitar tipos y tamaños de archivo** en la subida de fotos. Un input de archivo sin
  límites es un problema de costo y de abuso.

## Logs y errores

- **No loguear** tokens, cadenas de conexión, correos, teléfonos ni ubicaciones
  exactas. Un log es donde los datos personales sobreviven a cualquier política de
  privacidad.
- **Fallar de forma segura.** Ante la duda, denegar. Un error no puede dejar la puerta
  abierta.
- **No mostrar errores internos al usuario.** Ni stack traces, ni mensajes de Postgres,
  ni nombres de tablas. Mensaje claro en español y centralizado; el detalle va al log
  del servidor.

## Privacidad

- **El historial es público, sin datos privados.** Nunca correo, teléfono, dirección
  exacta de personas, ubicación exacta actual del animal ni datos privados del perfil.
  (CLAUDE.md → "Privacidad del historial")
- **La ubicación pública es aproximada.** La precisión exacta **no está definida** — es
  una decisión abierta de UX y seguridad. **No la inventes**: de ese número depende que
  la regla proteja algo o no.
- **La redacción la hace el servidor.** RLS decide qué filas, no qué columnas. Filtrar
  en el cliente significa que el dato **ya viajó**.
- **Storage: revisar el riesgo de acceso directo.** Las fotos llevan asociada la
  ubicación del hallazgo; un bucket público las vuelve indexables por buscadores con
  esa ubicación ([ADR 0003](../../docs/decisiones/0003-storage-de-fotografias.md),
  riesgo 3). Las fotos ya subidas quedan indexadas aunque el bucket se cierre después.
  **Un bucket abierto "para probar" es una filtración permanente.**
- Pendiente conocido: las fotos de celular traen **EXIF con coordenadas GPS**. Si se
  conservan o se limpian al subir **no está decidido**.

## Dependencias

**Evitar dependencias nuevas sin revisar su necesidad y su mantenimiento.** Cada una es
código de terceros con acceso al mismo proceso que las claves. Agregar una requiere
aprobación explícita (ver [`workflow.md`](workflow.md)); "es una librería chica" no es
un argumento — las chicas son las que nadie audita.
