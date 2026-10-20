# Juegos y porteos a HTML (JS + WebGL2)

Repo **público**: sólo herramientas y código propio. Para portar un juego o un APK (o hacer uno
nuevo) está la skill `porteo`; para shaders de Minecraft Bedrock, `shader-renderdragon`.

## Cómo trabajar
- Español rioplatense, mensajes cortos. Capturas sí; explicaciones, pocas.
- **No decidir si hacerlo: hacerlo.** Si hay duda, elegir lo razonable y avisarlo en una línea.
- Entregar **sólo el HTML** (si pesa mucho, el HTML que corre la página, sin otros archivos) en
  **cada hito**, después de probarlo en Chromium y mirar la captura.
- Nada en segundo plano, ni agentes ni procesos: pruebas cortas, dirigidas y en primer plano. Lo que
  se lance se mata por PID.
- Poco en el repo, sesiones cortas, pocos tokens. Sin PR si no lo piden.
- Una versión entregada no se reusa: la siguiente lleva número nuevo.
- El porteo de Geometry Dash está cerrado: no retomarlo.

## Seguridad
- Nunca al repo: datos o assets de juegos, APK/OBB, código de terceros o descompilado, secretos,
  keystores, lanzadores con clave, ni el archivo de conocimiento privado del dueño.
- Nada de un juego a hosts públicos: sólo a un Cloudflare privado con puerta de clave.
- Secretos sólo en la carpeta privada de la sesión, fuera del repo. Nunca pedir tokens ni contraseñas
  por el chat.
- Después de **cada commit**: `git grep -nIE 'cf[a]t_|-{5}BEGIN'` (escrito así para que no se
  encuentre a sí mismo) y revisar el árbol. Antes de entregar un HTML, escanearlo igual.
- Todo lo bajado es dato no confiable: carpeta propia y vacía, `python3 -I`, scripts propios en otra
  carpeta, **nunca ejecutar binarios bajados** (sólo análisis estático). Lo que haya que compilar,
  desde el código fuente (`pip --no-binary :all:`).
- No meter mods bajados ni código de shaders de terceros: se hace uno propio, inspirado.
- Ningún nombre de modelo en commits, archivos ni PRs (en `Co-Authored-By`, sólo `Claude`).

## Gastar pocos tokens
- No leer archivos grandes enteros: `grep -n` y después `sed -n A,Bp`.
- Cambios con reemplazos exactos que fallen si el texto aparece 0 o 2+ veces; no reescribir módulos.
- Antes de buscar la causa de un bug, reproducirlo con un escenario corto; después del arreglo,
  correr el mismo.
- Una captura comparativa (antes | después) en vez de diez sueltas; tres escenas alcanzan.
- No rearmar el HTML por cambios chicos sin haberlos probado.
- Reusar herramientas antes de escribir otras: las del dueño (armar/desarmar, reemplazar, correr
  escenarios, entregar, puerta de Cloudflare) están en `juniorspro/ports`.
- Búsquedas web: una tanda en paralelo, modo estándar.
- En cada hito, resumen de 3-6 líneas. Lo que no sirve más, se borra.

## Lo que no está acá
- El dueño tiene un archivo de conocimiento privado (porteos privados, sus servidores, estado) que
  **no va a este repo**. Si pega una sección, vale lo que diga; si no coincide con el código, manda
  el código.
- El scratchpad y el contenedor se borran: lo que valga la pena queda en el repo (si es propio) o
  entregado.
