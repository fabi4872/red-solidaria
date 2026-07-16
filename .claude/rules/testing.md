# Reglas de testing

> **[`CLAUDE.md`](../../CLAUDE.md) manda.** Esta guía **expande** su convención de
> testing. Si discrepan, **gana CLAUDE.md e informá la contradicción**.

**El framework no está elegido y no hay nada instalado.** No lo elijas en una tarea que
no sea esa: agregar una dependencia requiere aprobación explícita (ver
[`workflow.md`](workflow.md)). **Los comandos oficiales de validación se definen más
adelante, cuando el framework exista** — hasta entonces, no inventes un `npm test` que
no está en `package.json`.

---

## Qué se testea

**El núcleo de negocio. Nada más.** (CLAUDE.md) Son las piezas cuya corrección **no se
puede verificar a ojo**: reglas de "todo o nada" y transiciones prohibidas.

| Qué | Por qué |
| --- | --- |
| **Máquina de estados** | Transiciones válidas **y las prohibidas**. Que `REUNITED` y `DECEASED` no tengan salida es tan importante como que `FOUND → IN_TRANSIT` funcione. |
| **Tránsito activo único** | Rompe la derivación del cuidador actual ([ADR 0001](../../docs/decisiones/0001-transito-como-evento.md)). |
| **Propuesta `PENDING` única** | Misma familia de invariante. |
| **Creación de propuestas de traspaso** | |
| **Aceptación de traspaso** | Los ocho pasos, y que el estado quede en `IN_TRANSIT`. |
| **Autorización del receptor** | Que **solo** el receptor propuesto pueda aceptar. |
| **Rollback transaccional** | Que un fallo a mitad **no deje nada escrito**. |
| **Estados finales** | Que cierren el tránsito activo y dejen `isAvailableForAdoption = false`. |
| **`ADOPTION_RETURNED`** | Que cree el `Transit` nuevo, con receptor explícito y autenticado. |
| **Invariantes de disponibilidad** | Que un cierre no pueda quedar disponible. |
| **Coherencia de `AnimalEvent` con las entidades** | Que entidad y evento se escriban en la misma transacción, y que no queden huérfanos ([ADR 0012](../../docs/decisiones/0012-bitacora-de-eventos-del-animal.md), riesgo 1). |

**No se exigen tests exhaustivos de componentes visuales.** (CLAUDE.md) Un test que
verifica que un botón dice "Guardar" cuesta más de lo que protege.

## Cómo se testea

- **Testear comportamiento, no detalles internos.** Un test que conoce la
  implementación se rompe con cada refactor y no detecta ningún bug. Si al renombrar
  una función privada se cae un test, ese test estaba mal.
- **Casos felices, límites y fallos.** Los tres. **El camino feliz es el que menos
  importa**: es el que ya probaste a mano. Los bugs viven en los otros dos.
  - Límites concretos de este dominio: aceptar una propuesta ya aceptada; aceptar una
    expirada; aceptar sobre un animal que ya fue adoptado; dos aceptaciones
    concurrentes; una transición desde un estado final.
- **Deterministas.** Sin dependencia del reloj real, del orden de ejecución, de la red
  ni de datos que otro test dejó. Un test que falla una de cada veinte corridas se
  ignora, y a partir de ahí la suite entera vale menos.
- **No abusar de mocks.** Un test donde todo está mockeado verifica los mocks. Para las
  transacciones esto importa especialmente: **una transacción mockeada no prueba que la
  transacción funcione.** Si hace falta una base real para probar el rollback, hace
  falta una base real.

## Lo que no se hace

- **No debilitar una regla válida para que pase un test.** Si el test falla, o el
  código está mal, o el test está mal, o **la regla estaba mal y hay que discutirla**.
  Aflojar la regla para que el semáforo se ponga verde es cambiar el producto para no
  cambiar el código.
- **No borrar ni saltear un test que molesta** sin informarlo.
- **No declarar que algo pasa sin haberlo corrido.** Ver [`workflow.md`](workflow.md) →
  "Definición de terminado".
