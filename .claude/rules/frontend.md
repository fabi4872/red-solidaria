# Reglas de frontend — Next.js 16, React 19, TypeScript

> **[`CLAUDE.md`](../../CLAUDE.md) manda.** Esta guía **expande** sus convenciones de
> código y de diseño/UI. Donde una regla ya vive en CLAUDE.md se la marca con
> **(CLAUDE.md)**, y **esa** es la fuente. Si discrepan, **gana CLAUDE.md e informá la
> contradicción**.
>
> Ver también [`general-engineering.md`](general-engineering.md) y
> [`security.md`](security.md).

**No se deciden librerías nuevas acá.** Agregar una dependencia requiere aprobación
explícita (ver [`workflow.md`](workflow.md)).

---

## Server y Client Components

- **Server Components por defecto.** Es el default de Next y casi siempre el correcto.
- **`"use client"` solo cuando hace falta**: interacción del usuario, estado local,
  efectos, o APIs del navegador (cámara, geolocalización — que este proyecto necesita).
- **Ponerlo lo más abajo posible en el árbol.** `"use client"` en un layout arrastra
  todo el subárbol al bundle. Marcá la hoja interactiva, no la rama.
- **Nunca importar código server-only desde el cliente.** Es la regla más importante de
  este archivo: `src/lib/prisma.ts` y el cliente de service role de
  `src/lib/supabase.ts` **no deben terminar jamás en un bundle de navegador**. Ver
  [`security.md`](security.md) — hoy la única protección es un comentario, y un
  comentario no es un mecanismo de defensa.

## Componentes

- **Pequeños, cohesionados, reutilizables.** (CLAUDE.md) Existe una librería de
  componentes base (`src/components/`); **si ya hay un botón, usá ese botón**. No
  repetir markup. (CLAUDE.md)
- **No sobrediseñar capas para componentes simples.** Un componente de presentación no
  necesita un hook, un contexto y un provider.
- **Separar presentación, estado y acceso a datos cuando la complejidad lo pida** — no
  antes. La señal es el dolor real, no la anticipación.

## Estado y efectos

- **No guardar en estado lo que se puede derivar.** Si sale de props o de otro estado,
  se calcula al renderizar. Estado duplicado es estado que se desincroniza — el mismo
  razonamiento que [ADR 0001](../../docs/decisiones/0001-transito-como-evento.md)
  aplica al cliente.
- **`useEffect` no es para sincronizar estado.** Si estás copiando props a estado con
  un efecto, casi siempre está mal. Los efectos son para salir de React: suscripciones,
  APIs del navegador, timers.
- **Dependencias correctas y cleanup cuando corresponda.** Un efecto sin cleanup que se
  suscribe a algo es una fuga.
- **Cuidado con arrays y objetos inestables.** Un literal creado en cada render entra
  como dependencia nueva cada vez y provoca renders o loops. Es la causa más común de
  bucles infinitos en React.
- **`key` estable y con significado** en las listas. El índice del array no lo es.

## Formularios

- **Validación centralizada**, no un `if` distinto por campo en cada formulario.
- **Mensajes en español y centralizados** (CLAUDE.md → `src/lib/messages.ts`). Nunca
  hardcodear textos sueltos.
- **Los cuatro estados, siempre**: cargando, vacío, error, éxito. Un formulario que
  solo contempla el camino feliz **está incompleto**, no "es un MVP".
- **La foto y la ubicación son obligatorias para confirmar el registro** (CLAUDE.md).
  El formulario **puede** completarse progresivamente, pero no se confirma sin ellas.

## Accesibilidad

- **HTML semántico.** Un `<div>` con `onClick` no es un botón: no recibe foco, no
  responde a Enter, no se anuncia. Usá `<button>`.
- **Navegación por teclado** completa, con **foco visible**.
- **Labels asociados** a sus controles.
- **Buen contraste texto/fondo.** (CLAUDE.md)
- **No depender solo del color** para comunicar estado: sumar texto o ícono.
  (CLAUDE.md) Aplica directo a los estados del animal.

## Layout y medios

- **Mobile-first.** (CLAUDE.md) La gente saca la foto del animal con el celular, en la
  calle. Esa es la experiencia prioritaria, no un caso reducido de la de escritorio.
- **Layouts flexibles**: grid/flexbox y unidades relativas. **Nada de tamaños fijos en
  px para layouts.** (CLAUDE.md)
- **Imágenes optimizadas** (`next/image`). Nota: servir fotos desde Supabase Storage va
  a requerir declarar `images.remotePatterns` en `next.config.ts`, hoy vacío.
- **Evitar saltos visuales**: reservar espacio para imágenes y contenido asíncrono.
  Layout que salta mientras carga = clics equivocados.

## Consistencia visual

- **Sistema de diseño simple y consistente** para el MVP: paleta sobria, componentes
  coherentes. (CLAUDE.md)
- **No hace falta identidad de marca elaborada todavía** (CLAUDE.md) — eso viene
  después de validar. **Consistencia sí; identidad completa todavía no.**
- **No crear estilos aislados** si ya existe un componente base que resuelve el caso.
  Un one-off es deuda visual.

## Privacidad en la UI

- **No exponer datos privados.** El historial es público **pero nunca muestra** correo,
  teléfono, dirección exacta de personas, ubicación exacta actual del animal ni datos
  privados del perfil. (CLAUDE.md → "Privacidad del historial")
- La ubicación del hallazgo se muestra **aproximada**. La precisión exacta **no está
  definida** — es una decisión abierta de UX y seguridad, no la inventes.
- **La redacción de esos datos es responsabilidad del servidor**, no del cliente:
  filtrar en el frontend significa que el dato **ya viajó**. Ver
  [`backend.md`](backend.md).
