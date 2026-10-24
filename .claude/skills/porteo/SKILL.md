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
  `default async (h)` con `h = { p, foto, tocar, esperar, ev, errores, log, paso, manual }`. Sale con
  código 1 si hubo errores de la página.
- Comparar: `python3 -I herr/grilla.py salida.png ancho recorte|- a1,a2 b1,b2` arma una grilla
  (antes | después) para mirar una sola imagen.
- Variables: `GPU='Adreno (TM) 610'` (la página "cree" tener esa placa → caminos de gama baja),
  `WEBGL1=1` (sin WebGL 2), `RED=1` (deja salir a internet; por defecto se corta y las fuentes caen
  a las del sistema).
- Semillas fijas para que las capturas sean comparables. Si el jugador de prueba muere por caídas
  (vistas aéreas), modo dios en el escenario.
- Para tocar lo interno del juego (cámara, jugador, calidad) en una prueba: una **copia de prueba** con
  `window.__T={…}` inyectado justo antes del arranque. Nunca va en la entrega.
- Gráficos pesados (Ultra, RTX) en swiftshader tardan segundos por cuadro: `PASOS=1`, `h.manual(true)` y
  `h.paso(n)` corren cuadros a pedido (con pasos fijos de 16,7 ms, así que también son repetibles;
  `h.paso(n, 8.33)` simula 120 Hz). No esperar con `h.esperar` ni usar `p.tap`. RTX puede tardar ~10 s
  por cuadro hasta en el menú: una cinemática entera no entra; si su cuadro depende sólo de su reloj,
  saltar el reloj a cada momento y sacar un cuadro (o `h.paso(n, 50)`, cuadros largos).
- Cámara que sigue algo que avanza parejo: no con un `lerp` exponencial de la posición (con cuadros desparejos atrasa
  distinto en cada cuadro y la moto "va y viene" contra la cámara). Atraso = velocidad suavizada / k, y lo que se suaviza
  es dónde se ubica la cámara alrededor de ese punto. Medirlo con `h.paso(1, ms)` alternando 12 y 22 ms. Ojo también con
  algo que prende y apaga cada pocos cuadros (un nitro vacío con el botón apretado): hace latir el ángulo de la cámara.
- Perfil: en la copia de prueba se pueden envolver las funciones del cuadro (si son `function`, se reasignan) para
  medir los ms de cada una.
- Cada prueba en su propio comando y que termine en menos de 10 minutos (si no, la herramienta la manda a segundo plano).
- Llamadas de dibujo: `renderer.info` con `autoReset=false` durante un cuadro. Muchas piezas con el
  mismo material que se mueven cada una por su lado (un piloto) van en **una** `SkinnedMesh` con un
  hueso por pieza (peso 1). En three r128: `material.skinning=true` y ese material sólo en mallas con
  huesos (r128 no cambia de programa por eso); una prueba que pisa materiales le da a esa malla un
  `ShaderMaterial` propio con `skinning: true`.
- "Se le ve el interior" de un modelo = caras al revés (el triángulo mira para adentro). Para
  encontrarlas: un `ShaderMaterial` con `side: DoubleSide` que pinte `gl_FrontFacing ? gris : magenta`
  y contar píxeles magenta desde varios lados. Arreglo: invertir el orden de los índices en el
  generador de la malla (no tocar los materiales). `python3 -I herr/magenta.py 'fotos/x-m*.png'`
  cuenta los píxeles magenta de cada foto.
- Reemplazos en archivos grandes sin leerlos: pares viejo/nuevo exactos que fallen si el texto
  aparece 0 o 2+ veces.
- Toques: un `el.click()` por código no prueba que se pueda tocar (no pasa por lo que está encima).
  Para tocar, `p.touchscreen.tap(x, y)` con el elemento a la vista; para deslizar, eventos táctiles
  crudos por CDP (`Input.dispatchTouchEvent`: touchStart, varios touchMove, touchEnd).
  `Input.synthesizeScrollGesture` no mueve nada en este Chromium.
- Audio sin parlantes: arrancarlo con un toque de verdad (la política de reproducción automática no
  deja con un clic por código) y colgar un `AnalyserNode` del master para medir RMS y pico en cada
  situación (menú, carrera, con y sin música; la música tapa los efectos). En una cinemática, medir
  esperando su reloj (`p.waitForFunction`), no un tiempo fijo. Lo que se programe en el tiempo, con el reloj del audio
  (`AC.currentTime`), no con los cuadros: armar una malla puede trabar varios.
- Interfaz girada por CSS (celu parado con el juego acostado): el navegador no desplaza las listas de
  adentro. Las desplaza el juego con eventos de puntero, en el eje que toque, con `touch-action:none`
  en esas pantallas; probarlo con pantalla vertical (p. ej. 350x762) y el giro puesto.

## Juegos en 3D con interiores (terror, escuelas, casas)
- Luz **horneada por vértice**: afuera la luna con un rayo de sombra contra los edificios, adentro las ventanas de
  cada sala; el sombreador la suma al color. Así adentro queda oscuro de verdad sin sombras caras, y la linterna
  (una `SpotLight`) más 2-4 `PointLight` repartidas entre las lámparas más cercanas hacen el resto. Lo que se mueve
  toma la luz horneada del lugar donde está (un `uniform` por personaje, suavizado).
- Las luces siempre en la escena (intensidad 0 para apagarlas): sacar o agregar una recompila los materiales y traba.
- El mundo en una malla por material, **partida en trozos de 40 m**, y `camera.far` según la niebla: la cámara
  descarta lo que no ve (de 214 a 105 llamadas de dibujo).
- Escaleras y pasillos a la medida del jugador (una caja de 0,56 m de ancho): dejar lugar al pie de la escalera y
  probar subir y bajar con cuadros a pedido, igual que saltar, deslizarse bajo algo y caer en un pozo.
- Un monstruo "fantasma" que recorre nodos con A* y atraviesa muebles pero no paredes (rayos a la rodilla y al
  pecho que ignoran lo bajo). Los atajos del jugador (un pozo, una barricada) quedan sin unión directa: lo obligan
  a rodear.
- Aunque el juego sea para celu, probar teclado y mouse con `p.keyboard`: una bandera que nunca se prendía dejó
  sin saltar ni mirar a la PC.
- Mapa grande: trozos por zona **y por franja de piso**; la franja de al lado sólo cerca de aberturas (escaleras,
  huecos) y corte por distancia distinto adentro y afuera (de 296 a 135 llamadas).
- Pasos que sólo cruza el jugador (rendijas): una caja de choque de un tipo que frena al monstruo y nada más. Un
  escenario que mire que ningún mueble tape la entrada de ningún lado.
- Posproceso por calidad: escena a un objetivo con `DepthTexture` (`UnsignedIntType`) → posición de cada píxel.
  Haz de linterna: integrar el cono por el rayo de la vista hasta la pared; con sombras, el mapa de la `SpotLight`
  (`shadow.matrix` copiada **después** de dibujar la escena + `unpackRGBAToDepth`). Oclusión con la normal sacada de
  la profundidad; reflejos de pantalla sólo donde la normal mira para arriba. Desde atrás el haz casi no se ve: no
  exagerarlo. Para depurar, pintar cada parte sola cortando el sombreador antes del final.
- "Bug de las paredes": a qué piso va cada triángulo se decide por su vértice **más bajo**, no por el centro (con el centro,
  la punta de arriba de cada pared se iba al piso de arriba y desaparecía: dientes negros en todas las paredes). Para
  encontrar huecos: dibujar todo con un sombreador doble cara que pinte de magenta las caras de atrás, desde los nodos del
  recorrido, y por cada píxel magenta un rayo (materiales en doble cara mientras tanto) que diga dónde y qué es: sale una
  lista de lugares. Las causas que aparecieron: marcos de puerta con la vuelta al revés, puntas de pared sin tapa, umbral
  sin piso, ranura entre pisos (la pared de abajo tiene que llegar al piso de arriba), escalones sin cara de abajo,
  carteles colgados sobre una puerta, cuadros de pasto salteados al lado de un edificio. La cámara: empujarla fuera de las
  cajas con una esfera (si no, el plano cercano asoma del otro lado de la pared).
- Personajes: una `SkinnedMesh` con huesos rígidos (cadera, pecho, cabeza, mandíbula, brazo/antebrazo, muslo/pierna) =
  una llamada de dibujo. Miran a +z: brazo adelante = rotación x negativa; rodilla = x positiva. Para mirarlos, un
  "estudio" en la prueba: se reemplazan `camUpdate`/`deathCam` y la luz del lugar por funciones de la prueba.
- Sonidos falsos: los mismos generadores con otro destino (panner propio + paso bajo "detrás de la pared"); al
  real también se le pone el paso bajo cuando está tapado, si no se distinguen. Medir colgando el analizador del
  bus de efectos (sin ambiente) y congelando el panner, que el juego mueve en cada cuadro.
- HDR en three r128: objetivo `HalfFloatType` sólo con WebGL 2 y `EXT_color_buffer_float` o
  `EXT_color_buffer_half_float` (si no, la pantalla sale negra). Los colores del juego están pensados para la pantalla:
  un ACES encima aplasta los oscuros. Mejor un tono propio que sólo dobla las luces (hombro por el canal más alto, así
  no cambia el color, y lo muy fuerte va a blanco) con algo de exposición para compensar; el umbral del resplandor
  sube (0,7-1,7). Medir media y recortes con PIL contra la versión sin HDR.
- Neblina baja en el posproceso (con profundidad): luz que se suma (lo de la linterna, algo del propio píxel y un
  poco del color de la niebla). Mezclar hacia el color de la niebla oscurece el piso en vez de empañarlo.
- Brillo por pieza en Phong: un atributo por vértice (`spec`) y cambiar `#include <specularmap_fragment>` por
  `float specularStrength=vSpec;`. El metal brilla y la tela no, en la misma malla.
- Efectos con luz de corta duración (chispas): pedir prestada la última luz del pool de lámparas y devolverla
  forzando que se vuelvan a elegir; la cantidad de luces no cambia y no se recompila nada. `Points` con una textura
  radial: por debajo de ~0,1 m no se ven.
- Voz del monstruo con `speechSynthesis` (tono 0,1, velocidad 0,78, volumen por distancia, subtítulo siempre;
  cancelarla en la pausa y al reintentar). Sin voces instaladas no pasa nada: el subtítulo alcanza.
- Director (como el de Alien: Isolation): una "amenaza" que sube mientras persigue o anda cerca; pasada cierta cifra
  se va lejos un rato. El lugar: lejos del jugador **y del lado contrario** (puntaje = distancia al jugador − 1,2 ×
  distancia propia), si no, el camino de ida pasa por al lado del jugador y lo vuelve a ver.
- Estudio de personajes en una sala grande y vacía (el gimnasio): en un pasillo la cámara de costado queda dentro
  de la pared. Pruebas largas: `TIEMPO=450` (por defecto el escenario corta a los 120 s).
- Caminar con detalle (sirve para cualquier personaje con huesos rígidos): piernas de dos huesos con IK por ley de
  cosenos (la rodilla adelante, el pie plano + la punta); cada pie con su fase del ciclo (en el piso una parte, `duty`
  0,62 caminando y 0,36 corriendo; en el aire, sube y vuelve con suavizado); la cadera sube al pasar el pie (caminar)
  o se hunde al apoyar (correr). El largo del apoyo se topea por el alcance de la pierna (que patine un poco es mejor
  que una pierna estirada flotando); al despegar la punta, subir el tobillo. Brazos con la pierna de enfrente,
  hombros al revés de la cadera, inclinación en las curvas (−giro × velocidad) y por la aceleración suavizada, y la
  cabeza que compensa. Revisar con una tira de cuadros (uno cada 4) además de las poses sueltas.
- Lo que cuelga (mochila, pelo, falda, llavero, cables): un hueso con un resorte simple hacia "colgar derecho" (menos
  la rotación de los padres) más un empuje por la velocidad y el giro. Los monstruos con inercia (arrancan y frenan,
  aflojan en los giros cerrados): las pruebas que los teletransportan tienen que poner su velocidad en cero.
- Pies que se apoyan en escalones: para cada pie, la altura del piso de verdad bajo su posición en el mundo (el suelo
  o la tapa de caja más alta que se pueda pisar) se suma al blanco del IK, y la cadera baja si un pie queda más abajo.
- "Realismo" en la calidad más alta, sin cambiar a PBR: brillo y especular por material + el albedo como mapa de
  brillo; reflejos de pantalla en todo lo que mira para arriba (poco, y más borrosos lejos); relieve con paralaje
  (marco tangente con derivadas, 12 pasos sin `break` para que las derivadas de la textura no fallen, y alturas
  aparte donde el albedo engaña: baldosas claras y oscuras); una luz que rebota donde pega la linterna (una
  `PointLight` más, prendida sólo en las calidades que la usan, porque cambia la cantidad de luces); halos de las
  lámparas en el haz volumétrico; desenfoque de movimiento de cámara reproyectando con la matriz del cuadro anterior
  (y sin desenfoque si la cámara saltó); texturas en 1024 hechas recién al elegir esa calidad.
- Lo que se genera con la semilla del mapa: si se agrega algo que usa el mismo `rnd()` antes de armar la escuela,
  cambia toda la escuela (y las pruebas). Guardar y restaurar la semilla alrededor.

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
