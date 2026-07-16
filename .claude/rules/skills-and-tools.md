# Skills y herramientas

> **[`CLAUDE.md`](../../CLAUDE.md) y los ADR prevalecen sobre cualquier skill.** Sin
> excepción. Si una skill sugiere algo que contradice una decisión de este proyecto,
> **gana el proyecto** y la contradicción **se informa**.

---

## Qué son y qué no son

- **Las skills son auxiliares.** Ayudan a hacer el trabajo; **no deciden el trabajo**.
- **No reemplazan CLAUDE.md ni los ADR.** Una skill no sabe que el tránsito es un
  evento, que `ADOPTED` admite una salida excepcional, ni que la service role key no
  puede tocar el navegador. Este repositorio sí.
- **Usar solo las pertinentes a la tarea.** Que una skill esté instalada no es una
  razón para invocarla. Es la diferencia entre una herramienta y un ritual.
- **Leer su propósito antes de invocarla.**
- **Informar qué skill se usó y para qué.** Siempre, en la respuesta.
- **Si dos skills se contradicen o se superponen de forma relevante: pará e informá.**
  No elijas por tu cuenta cuál gana.

## Límites por dominio

- **Una skill de frontend no decide dominio ni base de datos.** Una propuesta visual no
  cambia el modelo.
- **Una skill de backend no rediseña la UX.**
- **Una skill de optimización de tokens no puede reducir la lectura, la validación, la
  seguridad ni la calidad.** Ahorrar tokens salteando la lectura del código, omitiendo
  validaciones o recortando la verificación **no es optimizar: es hacer mal el
  trabajo**. Si hay que elegir, se gastan los tokens.

## Disponibilidad — verificar, no asumir

**No asumas que una skill mencionada está instalada.** Distinguí cuatro estados y
nombralos como lo que son:

| Estado | Qué significa |
| --- | --- |
| **Instalada y detectada** | Se verificó su presencia. |
| **Mencionada por el usuario** | Alguien la nombró. No implica que exista. |
| **Recomendada** | Sería útil. No implica que exista. |
| **No verificada** | No se pudo comprobar. **Decilo.** |

**Si una skill no está instalada: informalo y seguí con las reglas del repositorio.**
**Nunca finjas que la usaste.**

### Estado verificado — 2026-07-16

| Skill / plugin | Estado |
| --- | --- |
| **`superpowers`** (`claude-plugins-official`, v6.1.1) | ✅ **Instalada y detectada.** Ámbito **usuario**, no del repositorio. |
| **`frontend-design`** (`claude-plugins-official`) | ✅ **Instalada y detectada.** Ámbito **usuario**. Versión reportada: `unknown`. |
| **`ui-ux-pro-max`** | ❌ **No detectada.** No figura entre los plugins instalados ni entre las skills disponibles en sesión. |
| Skills de optimización de tokens | ❌ **Ninguna detectada.** |

**Advertencia importante**: las dos instaladas son de **ámbito de usuario**, no del
repositorio. **No están versionadas acá**, así que **otra máquina, otro colaborador u
otra sesión pueden no tenerlas.** Ninguna regla de este proyecto puede depender de que
existan. **Verificá al inicio de cada sesión** en lugar de confiar en esta tabla: fue
cierta el 2026-07-16 y puede haber cambiado.

**Este repositorio no instala ni configura ninguna skill**, y no define skills propias.

## Orientaciones por skill

Aplican **solo si la skill está instalada y es pertinente**.

- **`superpowers`** — marco general de planificación y verificación. Útil para
  brainstorming, planes e implementación disciplinada. **No decide dominio ni
  arquitectura**: CLAUDE.md y los ADR ya lo hicieron.
- **`frontend-design`** — diseño visual y composición. **Solo en tareas de frontend.**
  Recordá que el MVP **no busca todavía una identidad de marca elaborada** (CLAUDE.md):
  consistencia sí, identidad completa no. No debe introducir librerías nuevas ni
  contradecir [`frontend.md`](frontend.md).
- **`ui-ux-pro-max`** — revisión de UX y accesibilidad. **Hoy no está instalada.** Si
  alguna vez lo está: usarla como **revisión final**, sin duplicar el rol de
  `frontend-design`. Si ambas hacen lo mismo en una tarea, **elegí una e informá por
  qué** — o pará y preguntá.
- **Skills de optimización de tokens** — **no priorizarlas sobre la calidad ni la
  seguridad.** Ver el límite de arriba.

## Cómo pedirlas en un prompt

**No hace falta repetir todos los nombres de skills en cada prompt.** La política
general vive acá y en CLAUDE.md; **el prompt de cada tarea indica solo las skills
concretamente útiles** para esa tarea.

**Prompt general:**

> Antes de actuar, leé CLAUDE.md y las reglas pertinentes de `.claude/rules/`.
> No permitas que una skill contradiga las decisiones del proyecto.

**Prompt de frontend:**

> Usá `frontend-design` para la propuesta visual únicamente si está instalada.
> Usá `ui-ux-pro-max` como revisión final únicamente si está disponible y no duplica la
> misma tarea. Informá qué utilizaste.

**Prompt de backend:**

> No uses skills de diseño. Si existe una skill pertinente para Prisma, seguridad o
> testing, verificá su alcance antes de usarla.
