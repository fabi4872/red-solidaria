# CLAUDE.md

Este archivo gobierna cómo se construye este proyecto. Leelo al inicio de cada sesión y respetá estas decisiones. Si algo acá contradice un pedido puntual, avisá antes de romper una convención.

---

## Qué es el proyecto

Red Solidaria — plataforma para conectar necesidades con personas que quieran ayudar. El primer módulo (el MVP actual) es el **tránsito colaborativo de animales**: alguien encuentra un animal, lo registra, lo toma en tránsito, y lo va pasando a otros cuidadores hasta que encuentra hogar definitivo. Todo el historial de esa cadena queda registrado.

La arquitectura está pensada para que el mismo motor sirva después para otras causas (familias necesitadas, comedores, donaciones), pero **eso no se construye ahora**. El MVP es solo el tránsito de animales.

---

## Objetivo del MVP

Validar que la gente use el sistema. Lo mínimo que tiene que funcionar:

1. Registrar un animal encontrado (con foto y ubicación).
2. Tomar un animal en tránsito.
3. Pasar un animal de un cuidador a otro (traspaso).
4. Ver el historial de tránsitos de un animal.

Nada más. Puntos, comercios, beneficios, validación de vecinos, mapa visual elaborado: **todo eso queda fuera del MVP** y no se implementa hasta que la idea base demuestre que se usa.

---

## Stack

- **Frontend + backend**: Next.js (React). Web responsive, no app nativa por ahora.
- **Base de datos**: PostgreSQL.
- **ORM**: Prisma (toda la interacción con la base pasa por Prisma, nunca SQL crudo salvo caso justificado).
- **Base y storage**: Supabase (PostgreSQL gestionado + storage de archivos para las fotos).
- **Sin Docker por ahora.** Se agrega cuando el MVP funcione y haya que llevarlo a un servidor. No antes.

---

## Decisiones de arquitectura (no romper sin avisar)

### El tránsito es un evento, no un estado del animal
Nunca guardar "cuidador actual" como campo en el animal. Cada tránsito es una fila propia en la tabla `transitos`. El cuidador actual se deduce buscando el tránsito abierto (sin fecha de fin) de ese animal. Esto es lo que permite reconstruir el historial completo y que una persona tenga varios animales en tránsito a la vez.

### La lógica de negocio va en el código, no en la base
Nada de stored procedures ni triggers con lógica de negocio. La base guarda datos y garantiza integridad con sus claves y constraints. El código TypeScript decide qué pasa. La única excepción es usar **transacciones** de Prisma para operaciones que tocan varias tablas a la vez (ver "traspaso" abajo).

### Las fotos se guardan como URL, nunca como base64 ni binario en la base
La foto se sube al storage de Supabase. En la base de datos se guarda solo la URL (un texto). Nunca meter base64 ni bytes de imagen en PostgreSQL.

### Puerta abierta, cuarto sin amueblar
El modelo permite crecer (varias especies, varios animales por persona) sin construir de más. No agregar tablas, campos ni abstracciones para features que todavía no existen. Cuando el feature llegue, se agrega entonces.

---

## Modelo de datos (MVP)

Cuatro tablas. Los nombres de campos son orientativos; ajustar a las convenciones de Prisma.

### `animales`
- id
- especie (perro, gato, … — campo que permite cualquier animal doméstico)
- estado (ver máquina de estados abajo)
- nombre / alias (opcional)
- vive (sí / no)
- edad_presunta
- sexo_aparente
- tamano
- vacunas (texto libre, ej: "antirrábica, moquillo" — NO una tabla de vacunas en el MVP)
- ubicacion_lat, ubicacion_long (dónde apareció)
- registrado_por (persona)
- fecha_registro

### `personas`
- id
- nombre
- contacto
- fecha_alta

### `transitos`
- id
- animal (a qué animal corresponde)
- persona (quién lo cuida)
- fecha_inicio
- fecha_fin (vacío mientras el tránsito está activo)
- nota (opcional)

### `fotos`
- id
- animal (siempre)
- transito (opcional — vacío si es la foto del rescate; con valor si es foto de seguimiento de un tránsito)
- subida_por (persona)
- fecha
- url (apunta al storage, NO la imagen en sí)

---

## Máquina de estados del animal

Estados posibles: `encontrado`, `en_transito`, `en_adopcion`, `adoptado`.

Transiciones válidas (cualquier otra debe rechazarse en el código):

- `encontrado` → `en_transito`
- `encontrado` → `en_adopcion`
- `en_transito` → `en_transito` (pasa a otro cuidador)
- `en_transito` → `en_adopcion`
- `en_transito` → `adoptado`
- `en_adopcion` → `adoptado`
- `en_adopcion` → `en_transito`

`adoptado` es estado final: no sale de ahí.

La validación de qué transición es válida vive en el código, en un solo lugar reutilizable.

---

## La operación de traspaso

Es la operación central. Cuando un animal pasa de un cuidador a otro, estas cuatro cosas ocurren dentro de una única transacción (todo o nada):

1. Cerrar el tránsito abierto del animal (ponerle fecha_fin).
2. Crear un tránsito nuevo con el nuevo cuidador y fecha_inicio actual.
3. Validar que el estado del animal permita la transición.
4. Dejar el estado del animal en `en_transito`.

Si cualquier paso falla, se deshace todo. Nunca dejar un animal a medio traspasar.

---

## Convenciones de código

- **Modular y simple. Sin abstracciones prematuras.** Modularizar lo que ya se repite; no inventar capas ni patrones "por si acaso". Los patrones se agregan cuando el dolor aparece, no antes.
- **Nada de clases-Dios.** Ningún archivo o función que haga demasiado. Responsabilidad única.
- **Componentes reutilizables.** Una librería de componentes visuales base (botones, tarjetas, formularios, inputs) que se reusa en toda la app. No repetir markup.
- **Mensajes al usuario centralizados.** Todos los textos que ve el usuario viven en un único lugar (ej: un módulo de strings/mensajes). Nunca hardcodear textos sueltos por el código. Esto permite corregir tono, traducir o cambiar mensajes desde un solo punto.
- **Validación de estados en un solo lugar.** La lógica de transiciones válidas del animal no se duplica.
- **Nombres claros y en un idioma consistente.** Decidir español o inglés para el código y no mezclar dentro de un mismo dominio.

---

## Convenciones de diseño / UI

- **Todo responsive.** Nada de tamaños fijos en px para layouts. Usar grilla (CSS grid / flexbox) y unidades relativas.
- **Mobile primero.** La gente saca la foto del animal con el celular. La experiencia en pantalla chica es la prioritaria.
- **Sistema de diseño simple y consistente** para el MVP: una paleta sobria, componentes coherentes, buen contraste. No hace falta identidad de marca elaborada todavía — eso viene después de validar.
- **Colores accesibles.** Buen contraste texto/fondo. No depender solo del color para comunicar estado (sumar texto o ícono).
- La cámara y la ubicación se toman desde el navegador (APIs web estándar).

---

## Qué NO hacer en el MVP

- No implementar sistema de puntos ni reputación.
- No implementar comercios ni beneficios.
- No implementar validación por vecinos / ONG.
- No construir el mapa colaborativo elaborado (guardar lat/long alcanza; mostrar un pin simple está bien).
- No crear tabla de vacunas estructurada (texto libre alcanza).
- No agregar Docker.
- No sobre-diseñar con patrones de arquitectura de empresa grande.

Estas cosas tienen su lugar más adelante y el modelo está pensado para soportarlas sin romperse. Pero construirlas ahora frena la validación del MVP.
