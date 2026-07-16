# Flujo de trabajo

> **[`CLAUDE.md`](../../CLAUDE.md) manda.** Si esta guía y CLAUDE.md discrepan, **gana
> CLAUDE.md e informá la contradicción**.

---

## El proceso

1. **Leer [`CLAUDE.md`](../../CLAUDE.md) y la documentación pertinente.** Incluye los
   ADR vigentes y las reglas de `.claude/rules/` que apliquen a la tarea. Ver el orden
   de prioridad en CLAUDE.md → "Qué leer y en qué orden".
2. **Revisar el estado de Git.** Rama, archivos modificados, sin versionar, último
   commit. Antes de tocar nada.
3. **Inspeccionar antes de modificar.** Leer el archivo, buscar consumidores, entender
   qué hay. No editar a ciegas.
4. **Distinguir hechos, inferencias y pendientes.** Un hecho se verificó; una
   inferencia es razonable pero no se comprobó; un pendiente no está decidido.
   **Etiquetarlos como lo que son.** "Probablemente funciona" no es "funciona".
5. **Explicar el diagnóstico.** Qué encontraste y qué significa, antes de proponer qué
   hacer.
6. **Proponer un plan.**
7. **Pedir aprobación** — ver abajo.
8. **Implementar cambios mínimos.** Lo que la tarea pide, nada más.
9. **Validar.**
10. **Mostrar los archivos tocados y un diff resumido.**
11. **Actualizar la documentación en el mismo cambio**, cuando corresponda. Documentación
    que se actualiza aparte es documentación que miente.
12. **No hacer commit salvo pedido explícito.**
13. **No declarar éxito sin evidencia.**
14. **No continuar al siguiente paso sin aprobación** cuando el prompt lo prohíba.

## Cuándo pedir aprobación — siempre

- **Migraciones.**
- **Cambios de schema.**
- **Dependencias** (agregar, quitar, actualizar).
- **Seguridad** (claves, permisos, RLS, políticas, límites servidor/cliente).
- **Arquitectura** (una decisión que un ADR debería registrar).
- **Cambios destructivos** (borrar, renombrar, sobreescribir, `reset`, `force`).
- **Alcance no solicitado** — cualquier cosa que la tarea no pidió.

Ante la duda, **preguntá**. Es más barato que deshacer.

## Definición de terminado

Una tarea está terminada cuando **todo** esto es cierto:

- [ ] **El requisito está cumplido** — el que se pidió, no una interpretación cómoda.
- [ ] **Se ejecutaron lint / typecheck / tests aplicables.** *Aplicables* significa los
      que existen: hoy no hay framework de tests, así que no inventes un `npm test`
      inexistente. Lo que existe, se corre.
- [ ] **Los errores conocidos están informados.** Si algo falla, se dice, con la salida
      real. Si un paso se salteó, se dice.
- [ ] **La documentación está actualizada**, en el mismo cambio.
- [ ] **No hay secretos** en el código, en la documentación ni en los logs.
- [ ] **No hay archivos fuera de alcance.** Si tocaste algo que no estaba en la tarea,
      está informado.
- [ ] **El `git diff` está revisado.** Por vos, antes de mostrarlo.
- [ ] **[`../../docs/estado-actual.md`](../../docs/estado-actual.md) refleja el estado
      real**, cuando corresponda.

**Ninguno de estos puntos se marca de memoria.** Se marca porque se hizo.

## Cómo se informa

- **La conclusión primero.** Qué pasó, después el detalle.
- **Sin inflar.** "Funciona" solo si se ejecutó y se observó. Que exista código no
  significa que funcione — es el error que este proyecto viene evitando desde la
  auditoría inicial, y su documentación distingue **detectado / configurado /
  implementado / probado / pendiente de comprobar** justamente por eso. Usá esa escala.
- **Las contradicciones se informan, no se resuelven en silencio.** (CLAUDE.md) Una
  contradicción es una decisión pendiente disfrazada; resolverla sin avisar la
  convierte en una decisión tomada por accidente.
- **Lo que no se pudo verificar se dice.** "No pude comprobarlo" es una respuesta
  válida. Inventar que sí, no.
