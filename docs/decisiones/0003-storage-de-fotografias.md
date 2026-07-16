# 0003 — Las fotos van al storage; en la base solo la URL

- **Estado**: Aceptada
- **Fecha**: 2026-07-16 *(documentado retroactivamente; la decisión ya estaba
  vigente en CLAUDE.md desde el inicio del proyecto)*
- **Fuente**: [`../../CLAUDE.md`](../../CLAUDE.md) → "Decisiones de arquitectura" y
  "Modelo de datos"

## Contexto

La fotografía es central en este producto: **es la forma en que un animal se
reconoce**. Alguien lo encuentra, le saca una foto con el celular y la sube. Además
del rescate, cada tránsito puede sumar fotos de seguimiento.

Las fotos de un celular moderno pesan varios megabytes. Un animal puede acumular
muchas a lo largo de una cadena de cuidadores.

Hay tres formas de guardarlas:

- Como **binario** (`bytea`) en Postgres.
- Como **base64** en una columna de texto.
- En un **storage de objetos**, guardando en la base solo una referencia.

La tentación de las dos primeras es real: una sola cosa que respaldar, una sola
transacción, sin servicio extra. Pero Postgres no es un almacén de archivos.
Meterle imágenes hace que **cada backup arrastre todos los megabytes**, que las
consultas que solo quieren el nombre del animal traigan la foto sin pedirla, y que
el cache de la base se llene de píxeles en vez de índices. Base64 además **infla
los datos un ~33 %** y obliga a decodificar en cada lectura.

El stack ya incluye Supabase, que **trae storage de objetos con el mismo proyecto**
que provee la base. El servicio extra no es extra: ya está.

## Decisión

**La foto se sube al storage de Supabase. En la base de datos se guarda solo la
URL: un texto.**

CLAUDE.md es terminante: *"Nunca meter base64 ni bytes de imagen en PostgreSQL."*

El modelo de la entidad foto, tal como lo define CLAUDE.md:

| Campo | Regla |
| --- | --- |
| animal | **Siempre.** Toda foto pertenece a un animal. |
| tránsito | **Opcional.** Vacío = foto del rescate. Con valor = foto de seguimiento de ese tránsito. |
| subida por | La persona. |
| fecha | Cuándo se subió. |
| url | Apunta al storage. **Nunca la imagen en sí.** |

El campo opcional `tránsito` es lo que separa **cómo apareció el animal** de **cómo
evolucionó** durante cada tramo de la cadena.

## Alternativas consideradas

> **Reconstrucción.** Este ADR se escribió después de que la decisión estuviera
> asentada en CLAUDE.md. Las alternativas son las que el diseño descarta
> explícitamente, no un acta de deliberación.

**1. Binario (`bytea`) en Postgres.** Descartada: infla backups y restauraciones,
degrada el cache de la base y hace que consultas triviales muevan megabytes.
Postgres no es un almacén de archivos.

**2. Base64 en una columna de texto.** Descartada, y es **peor** que la 1: todos los
problemas de la anterior, más un ~33 % de tamaño extra y decodificación en cada
lectura. CLAUDE.md la prohíbe por nombre.

**3. Un storage de terceros (S3, Cloudinary…).** Descartada: agrega un proveedor,
credenciales y facturación, cuando el proyecto Supabase que el stack ya requiere
**incluye storage**.

## Consecuencias

**Se vuelve fácil:**
- Backups de la base livianos y rápidos.
- Servir imágenes por HTTP con cache y CDN, sin pasar por la app.
- Consultar animales sin arrastrar megabytes.
- Subir desde el navegador directo al storage, sin que los bytes crucen el servidor.

**Se vuelve difícil:**
- **Se pierde la atomicidad.** La subida al storage y el `INSERT` de la fila son dos
  operaciones en dos sistemas distintos. **Ninguna transacción de Postgres las
  abarca.** Puede quedar un archivo sin fila (huérfano) o una fila apuntando a un
  archivo que no existe (URL rota).
- **Borrar una foto ahora son dos borrados.** Si se borra la fila y no el archivo,
  queda ocupando espacio para siempre.
- Aparece un vector de permisos nuevo: quién puede subir, quién puede ver. Es
  configuración de storage, no de Postgres, **y hay que decidirla aparte**.
- `next/image` va a requerir declarar `images.remotePatterns` en `next.config.ts`,
  hoy **vacío**.
- La integridad referencial de la base **no alcanza**: Postgres no sabe si esa URL
  resuelve.

## Riesgos

**1. Archivos huérfanos.** Sube la foto, falla el `INSERT`: el archivo queda sin
referencia. *Cómo nos daríamos cuenta*: **no nos daríamos cuenta.** No hay
reconciliación, y nada lo señala. Solo crece la factura de storage. *Mitigación
propuesta, **no decidida***: subir primero, insertar después, y aceptar los
huérfanos como costo — son inertes. El caso inverso (fila con URL rota) es **mucho
peor**: la ficha del animal muestra una imagen que no carga.

**2. URLs rotas por borrado directo.** Si alguien borra del bucket, las filas
apuntan a la nada. Nada en la base lo impide ni lo detecta.

**3. Bucket público sin querer.** Las fotos van con la ubicación de dónde apareció
el animal. **Un bucket público las hace indexables por buscadores**, con esa
ubicación asociada. *No hay bucket configurado todavía*, así que la decisión sigue
abierta — y **es de privacidad, no solo técnica**.

**4. Fotos de varios MB desde un celular con mala señal.** El caso de uso real es
alguien en la calle, con datos móviles. Sin compresión en el cliente, la subida
falla o tarda demasiado, **justo en el momento en que el sistema tiene que
funcionar**. *No hay compresión implementada ni decidida.*

**5. Que la URL se guarde absoluta.** Guardar la URL completa acopla las filas al
dominio actual del proyecto. Si cambia, **todas las filas quedan rotas**. Guardar
la ruta relativa y componer la URL al leer sería más robusto — **no está decidido**,
y CLAUDE.md dice "url", no "ruta".

## Qué no implica esta decisión

- **No implica que el storage esté configurado.** **No hay bucket**, no hay
  políticas, no hay una línea de código que suba nada. Ver
  [`../estado-actual.md`](../estado-actual.md).
- **No decide si el bucket es público o privado**, ni sus políticas de acceso.
- **No decide si la foto del registro inicial es obligatoria.** Está registrado como
  pendiente en [`../modelo-de-dominio.md`](../modelo-de-dominio.md).
- **No decide si se guarda URL absoluta o ruta relativa** (riesgo 5).
- **No define límites** de tamaño, formato, cantidad por animal, ni compresión.
- **No decide nada sobre metadatos de la imagen.** Las fotos de celular traen EXIF,
  que puede incluir **coordenadas GPS**. Si se conservan o se limpian al subir es
  una decisión **abierta y con implicancias de privacidad**, distinta de la
  ubicación que el modelo guarda a propósito.
- **No implica que las fotos sean inmutables ni auditables** como el historial de
  tránsitos.
