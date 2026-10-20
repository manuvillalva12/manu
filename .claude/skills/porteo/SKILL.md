---
name: porteo
description: Portar un juego nativo o un APK de Android (o hacer un juego propio) a un HTML único en JS + WebGL2 que ande en el celular. Usar al arrancar un porteo o un juego, al sacar datos de un APK, al armar el HTML, al probarlo con Playwright y Chromium, al entregarlo, y al sumarle multijugador sin servidor propio u hosting privado con clave.
---

# Porteo: juego nativo / APK → un HTML

Las reglas (seguridad, tokens, entregas, nada de marcas ajenas) son las de `CLAUDE.md`. Acá va el
cómo.

## Método
1. **Qué hay**: de dónde salen los assets y las reglas (APK extraído, datos públicos). Mirar sólo lo
   necesario: formato de niveles, tablas, sonidos.
   - Un APK es un zip: `unzip -q juego.apk -d <carpeta nueva y vacía>` → `assets/`, `res/`,
     `lib/<abi>/*.so`, `classes*.dex`. Leer con `python3 -I` y scripts propios de otra carpeta; los
     `.so` y los `.dex`, sólo análisis estático.
2. **Motor propio** en JS + WebGL2, con respaldo WebGL1 para teléfonos viejos. Nada del ejecutable
   del juego.
3. **Empaquetador**: un script que lleve del APK/assets a una carpeta `sitio/` con hojas, íconos,
   sonidos y niveles. Lo público que haga falta (tablas de proyectos abiertos) **se baja al
   empaquetar**; no se commitea.
4. **Armado**: un HTML único (bloques comprimidos: gzip + basE91) o una página + paquetes grandes.
   Que se pueda desarmar: un HTML entregado se desarma y se sigue desde ahí.
5. **Física y lógica fieles**: pasos fijos (p. ej. 240 por segundo), constantes de la fuente
   original, y comprobar contra la jugabilidad real.
6. **Móvil primero**: táctil, teclado propio en pantalla, perfiles de gama (resolución de render,
   sombras, distancia) con **valores por defecto razonables** y un menú de gráficos. Meta: 60 fps
   clavados (120 en pantallas de 120 Hz): mallas por trozos en un worker, pocas llamadas de dibujo,
   nada de tirones al generar.
7. **Pruebas**: escenarios en Chromium (abajo).
8. **Online** sin servidor propio, si hace falta (abajo).
9. **Entrega**: el HTML por el chat, o Cloudflare Pages con puerta de clave (abajo).
10. **Cierre**: escaneo de secretos, número de versión nuevo, una captura, tres líneas de resumen.

## Pruebas
- En este contenedor ya están Chromium (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) y Playwright
  global: **no** correr `playwright install`.
- `node herr/correr.mjs esc.mjs juego.html [762x350] [2]` (ancho×alto apaisado, densidad): celu
  táctil, swiftshader, fotos en `fotos/` (o `FOTOS=carpeta`). El escenario exporta
  `default async (h)` con `h = { p, foto, tocar, esperar, ev, errores, log }`. Sale con código 1 si
  hubo errores de la página.
- Variables: `GPU='Adreno (TM) 610'` (la página "cree" tener esa placa → caminos de gama baja),
  `WEBGL1=1` (sin WebGL 2), `RED=1` (deja salir a internet; por defecto se corta y las fuentes caen
  a las del sistema).
- Semillas fijas para que las capturas sean comparables. Si el jugador de prueba muere por caídas
  (vistas aéreas), modo dios en el escenario.
- Para tocar lo interno del juego (cámara, jugador, calidad) en una prueba: una **copia de prueba** con
  `window.__T={…}` inyectado justo antes del arranque. Nunca va en la entrega.
- Gráficos pesados (Ultra, RTX) en swiftshader tardan segundos por cuadro: `PASOS=1`, `h.manual(true)` y
  `h.paso(n)` corren cuadros a pedido (con pasos fijos de 16,7 ms, así que también son repetibles). No
  esperar con `h.esperar` ni usar `p.tap`.
- "Se le ve el interior" de un modelo = caras al revés (el triángulo mira para adentro). Para
  encontrarlas: un `ShaderMaterial` con `side: DoubleSide` que pinte `gl_FrontFacing ? gris : magenta`
  y contar píxeles magenta desde varios lados. Arreglo: invertir el orden de los índices en el
  generador de la malla (no tocar los materiales).
- Reemplazos en archivos grandes sin leerlos: pares viejo/nuevo exactos que fallen si el texto
  aparece 0 o 2+ veces.

## Online sin servidor propio
- Broker MQTT público como "correo" (mqtt.js dentro del HTML). Sala = un mundo, y el **número de
  versión del protocolo va en el nombre de la sala**: protocolo nuevo = salas nuevas, que arrancan de
  cero; a los que tienen una versión vieja se les avisa. Un cambio que no toca la red no cambia la
  sala.
- Cada jugador publica su estado (~100 ms si cambió algo), sus acciones y el chat en tópicos aparte.
  Sin anfitrión: cada uno es dueño sólo de su jugador y aplica lo de los demás.
- Lo construido: un mensaje **retenido** por trozo (cambios en deflate + base64, a los ~3 s); al
  suscribirse, el broker los entrega todos. Hora, clima y rangos, firmados.
- Cualquiera puede publicar cualquier cosa: **validar todo lo que llega** (rangos numéricos, largos y
  cantidades máximas) e ignorar lo que no cierra. Las protecciones valen para lo propio, lo remoto,
  lo retenido y lo que se guarda.
- Desde el sandbox no se llega a brokers públicos (el proxy no deja WebSocket ni puertos ≠ 443):
  probar con un broker local que se levanta y se mata por PID en cada prueba; lo real, en el teléfono.
- Alternativa: un worker de Cloudflare.

## Hosting privado (Cloudflare Pages con puerta)
- Un `_worker.js` propio hace de puerta: sin la clave no sale ni la página ni un byte del juego.
  Cookie firmada de un año, o enlace `https://…/#clave=XXXX-XXXX-XXXX-XXXX` (lo de después del `#`
  no viaja al servidor).
- La clave (16 caracteres, ~79 bits) va al proyecto como secreto, **nunca al repo**; cambiarla cierra
  todas las sesiones.
- Fail-closed: si se pasa el tope gratis, error en vez de servir sin puerta. Verificar desde afuera
  que sin clave no sale nada (rutas disfrazadas, cookies falsas).
- Dentro de otra página (visores de HTML) la cookie no viaja: la sesión va en la ruta
  (`/__s/<vence>.<firma>/`), y por eso no se manda `X-Frame-Options`.
- Archivos > 25 MiB: partir en pedazos de 20 MB.

## Look "Java" (sirve para cualquier motor)
- Tono ACES (Narkowicz) sobre color lineal (`c²`), exposición 0,8; después `sqrt(...)*1,1` y
  saturación 1,15.
- Sol cálido y sombra azulada: ambiente `* [0,92; 0,98; 1,1]`, sol `* [1,15; 1,06; 0,92]`.
- Niebla teñida por el sol con `pow(dot(vistaDir, solDir), 5)`; bruma del aire: mezclar hacia
  `cenit*0,9 + niebla*0,1` con peso `clamp(dist/220)*0,12`.
- Por gama: realista para alta, "Java" para media, luz y sombras baratas para baja; elegir solo
  según la placa, con menú para cambiarlo.
