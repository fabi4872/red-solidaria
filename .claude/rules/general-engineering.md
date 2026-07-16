# Reglas de ingeniería general

> **[`CLAUDE.md`](../../CLAUDE.md) manda.** Esta guía **expande** sus convenciones.
> Donde una regla ya vive en CLAUDE.md se la marca con **(CLAUDE.md)**, y **esa** es
> la fuente. Si esta guía y CLAUDE.md discrepan, **gana CLAUDE.md e informá la
> contradicción** — no la resuelvas en silencio.

**No hay límites de líneas acá.** Ningún número mágico: ni "máximo 200 líneas por
archivo" ni "máximo 20 por función". Lo que importa es **cohesión, responsabilidades
y mantenibilidad**. Un archivo de 400 líneas que hace una sola cosa está bien; uno de
80 que hace cuatro, no.

---

## Responsabilidad única

- **Cada módulo, función y componente hace una cosa.** Si al describirlo necesitás un
  "y", probablemente sean dos.
- **Nada de clases-Dios.** (CLAUDE.md) Tampoco componentes-Dios, servicios-Dios,
  hooks-Dios ni archivos `utils.ts` que acumulan lo que no encaja en otro lado.
- Un archivo que crece por acumulación de cosas no relacionadas **se divide por
  responsabilidad**, no por tamaño.
- Si una función recibe un booleano que cambia lo que hace, **probablemente son dos
  funciones**.

## Duplicación

- **Una regla de negocio se escribe una vez.** Duplicarla garantiza que un día se
  arreglen cinco de las seis copias.
- **Una única fuente de verdad para cada dato.** (CLAUDE.md) Si un dato se puede
  derivar, se deriva; no se almacena una segunda copia que pueda contradecir a la
  primera. Es el razonamiento de
  [ADR 0001](../../docs/decisiones/0001-transito-como-evento.md) y
  [ADR 0006](../../docs/decisiones/0006-estados-finales-del-animal.md).
- **Centralizar**: reglas compartidas, constantes, mensajes al usuario (CLAUDE.md) y
  configuración. Nada de literales sueltos repetidos por el código.
- **La validación de transiciones vive en un solo lugar reutilizable.** (CLAUDE.md)
- Duplicación **aceptable**: dos cosas que hoy se parecen pero cambian por razones
  distintas. Unificarlas las acopla. Antes de extraer, preguntá si van a cambiar
  juntas.

## Abstracciones

- **Sin abstracciones prematuras.** (CLAUDE.md) No inventes capas, interfaces,
  genéricos ni patrones "por si acaso". Los patrones se agregan cuando el dolor
  aparece, no antes.
- **Puerta abierta, cuarto sin amueblar.** (CLAUDE.md) El modelo permite crecer; no
  se construye de más.
- Una abstracción con **un solo consumidor** casi nunca se justifica.
- **No mezclar dominio, presentación, persistencia y transporte** en la misma unidad
  sin necesidad. Pero tampoco inventes cuatro capas para un formulario de tres campos.

## Alcance y cambios

- **Cambios pequeños, reversibles y fáciles de revisar.** Un diff que hace una cosa se
  revisa; uno que hace seis, se aprueba sin leer.
- **No modificar archivos fuera del alcance sin informarlo.** Si algo roto aparece de
  paso, **decilo**; no lo arregles de callado en el mismo cambio.
- **Antes de cambiar un contrato compartido** (una firma exportada, un tipo, una
  forma de respuesta, un nombre de campo), **buscá referencias y consumidores**. Un
  cambio "obvio" rompe lo que no miraste.
- **Refactorizar solo** cuando la tarea lo necesita, o cuando el riesgo está
  explícitamente aprobado. Un refactor mezclado con un fix hace imposible saber cuál
  de los dos rompió.
- **Respetar el estilo existente** cuando es correcto. Tu preferencia personal no es
  una mejora.

## Higiene

- **Sin código muerto.** Nada comentado "por las dudas", ni exports que nadie usa, ni
  ramas inalcanzables. Para eso está Git.
- **Sin `TODO` ambiguos.** Un `TODO` sin dueño y sin condición de cierre es basura que
  nadie va a limpiar. O lo hacés, o lo registrás como pendiente en la documentación
  con contexto suficiente para que otro lo entienda.
- **No silenciar errores.** Nada de `catch {}` vacíos, `.catch(() => null)` sin
  motivo, ni `?? valorPorDefecto` que tapa una falla real. Si un error se ignora a
  propósito, **el comentario explica por qué** — ese es exactamente el caso donde un
  comentario vale.
- **`any` solo con justificación explícita** y escrita. TypeScript está en modo
  estricto: `any` apaga la única red que tenemos. `unknown` + validación suele ser lo
  que querías. Lo mismo vale para `as`, `@ts-ignore` y `!`.

## Nombres y comentarios

- **Nombres descriptivos, sin abreviaturas crípticas.** (CLAUDE.md)
- **Código en inglés; textos al usuario en español y centralizados.** (CLAUDE.md)
- **El comentario explica el porqué**, no repite lo que el código ya dice. Un
  comentario que narra la línea siguiente es ruido que envejece mal. Un comentario que
  explica una restricción no evidente —por qué el pooler y no la conexión directa, por
  qué no hay singleton en tiempo de import— vale oro. `prisma.config.ts` y
  `src/lib/prisma.ts` son buenos ejemplos de esto.

## Cuando algo no cierra

Si una regla de acá choca con lo que la tarea pide, con CLAUDE.md, con un ADR o con
el código existente: **pará e informá**. Una contradicción es una decisión pendiente
disfrazada, y resolverla sin avisar la convierte en una decisión tomada por accidente.
