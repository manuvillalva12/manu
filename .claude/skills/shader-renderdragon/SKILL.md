---
name: shader-renderdragon
description: Packs de shaders de Minecraft Bedrock (RenderDragon, .material.bin dentro de un .mcpack) para Android sin Vibrant Visuals, basados en Newb X y compilados con Lazurite y shaderc hechos desde el código fuente. Usar para crear o tocar el pack, compilarlo, validar las variantes GLSL, previsualizarlo, cargarlo con MB Loader, o explicar qué se puede y qué no en el pipeline forward.
---

# Shaders de Bedrock (RenderDragon)

El pack es de Lucas: nombre, UUIDs, subpacks y banderas propias (nada de marcas ajenas).

## Lo básico
- Bedrock 26.x (26.50 en septiembre de 2026): los shaders son `.material.bin` en
  `renderer/materials/` de un resource pack (`.mcpack`).
- Android: **MB Loader** (Play Store, `io.github.bambosan.mbloader`) → abrir Minecraft con
  **"MBL2/Draco"** → activar el pack en **Recursos globales** (no en el mundo). MBL2 0.1.17 soporta
  26.50. Desde 26.40 muchos shaders perdieron la detección de hora y niebla.
- MB Loader ya inyecta: no hace falta otro mod. Un APK propio que parchee el juego = tocar binarios
  de terceros: no se hace.
- Ejemplo de gama baja: Exynos 850 / Mali-G52 MP1 (Samsung M12), sin Vibrant Visuals.

## Qué se puede y qué no
- En el pipeline **forward** (sin Vibrant Visuals) **no hay** pasada de mapa de sombras ni de
  post-proceso: ni sombras proyectadas reales ni bloom real (sólo existen en el *deferred* de
  Vibrant Visuals). No hay sombra de un árbol estirándose sobre el piso al bajar el sol.
- Lo que se aproxima, barato (por vértice o fragmento):
  1. sombra de luz de cielo (lightmap): bajo techos, árboles y en cuevas;
  2. **sombra por cara según el sol**: normal de la cara con
     `cross(dFdx(v_position), dFdy(v_position))` contra la dirección del sol (de noche, la luna):
     de frente = luz, de espaldas = sombra azulada, y se mueve con la hora; deshacer parte del
     sombreado fijo de Minecraft (arriba 1, abajo 0,5, x 0,6, z 0,8);
  3. halo / bloom falso del sol y la luna en el shader del cielo;
  4. niebla teñida por el sol y bruma azul de distancia.
- Vibrant Visuals en un celular no soportado: existe un "unlocker" de terceros (reemplaza
  `tiers.bin`; licencia All Rights Reserved) → **no se redistribuye** y no se recomienda en gama
  baja: soporte oficial en Android = Adreno 640+, Mali-G68/G77, Xclipse 530+; con menos, informan
  terreno invisible, pocos fps y bichos negros.

## Cadena de herramientas (todo desde el código fuente)
- **Lazurite 0.10.0** (veka0, LGPLv3, Python puro): compila y junta shaders en `material.bin`. Llama
  a shaderc con `--platform android -p 300_es --type vertex|fragment --varyingdef … -i … --define …`
  y espera shaders de bgfx **versión 5**. Venv con sus dependencias (`pip --no-binary :all:`).
- **shaderc** del fork `devendrn/bgfx-mcbe` (`BGFX_SHADER_BIN_VERSION 5`), con `bx` fijado en
  `198cd12` y `bimg`; se compila con **GENie + make**. Nunca binarios bajados.
- **Newb X** (`devendrn/newb-x-mcbe`, **MIT**): `src/materials/<Mat>/{vertex.sc, fragment.sc,
  varying.def.sc, material.json, config.json, uniforms}`, `src/newb/{config.h, main.sh,
  functions/*.h, pack_config.toml}`, `include/`, `tool/`, `assets/`, y las definiciones JSON
  `src-materials-1.26.51.zip` (13 materiales). Conservar la licencia MIT dentro del pack y acreditar
  a Newb, Lazurite y bgfx.

```sh
# materiales sueltos (10-15 s)
LD_LIBRARY_PATH=./tool/lib PY tool mats -p android -m RenderChunk Sky [-s ULTRA]
# pack completo (~25 s) → build/<pack>-<v>-android.mcpack y build/pack-android/
LD_LIBRARY_PATH=./tool/lib PY tool pack -p android
# ver el GLSL generado de un material
lazurite unpack build/android/RenderChunk.material.bin -o carpeta
```
- `PY` = el Python del venv. `tool/data/.builder.pkl` guarda la configuración (sistema, URL de
  materiales, shaderc).
- Subpacks = banderas en `config.h` (`#ifdef ULTRA`…); el de más a la derecha queda por defecto.

## Ideas de look tipo Java (referencia)
- Tonemap ACES (`NL_TONEMAP_TYPE 5`) con exposición ~0,245, saturación 1,15, sombra azulada,
  niebla teñida por el sol, bruma de distancia y rayos de sol suaves (`NL_GODRAY 0.3`).
- Sombras por cara de sol y de luna, deshacer el sombreado fijo, follaje con lado de sombra y bloom
  falso. Bichos y jugador también con lado al sol y lado en sombra; la mano no (su espacio no es el
  del mundo: apagarlo con una bandera propia).
- Para gama baja, apagar: sombra y niebla de nubes, bruma de lluvia, arcoíris, brillo de glow, olas,
  aurora, estrellas fugaces, resalte de bordes de entidades, ruido de lava.
- Amaneceres dorados, no rosados (`NL_DAWN_*` más cálidos). Subpacks tipo completo / ultra /
  default con nombres propios, UUIDs propios, `min_supported_mc_version [1,26,50]`.

## Probar sin el teléfono
- Validar: compilar **todos** los `.glsl` desempaquetados en WebGL2 (Chromium + ANGLE/swiftshader).
  Meta: 0 fallas (con Newb, ~2092 variantes).
- Enlazar vértice + fragmento de cada variante. Unas 73 **ya fallan en Newb original** (pases
  `DepthOnlyOpaque` de Actor/ActorGlint/ActorMultiTexture y `Stars/Transparent`, sin uso):
  comparar contra el original.
- Vista previa: con los GLSL compilados de RenderChunk, Sky y SunMoon, dibujar un cielo, el sol y un
  terreno de prueba a 5 horas del día. Para comparar versiones, una imagen antes | después.
- Esas herramientas se hacen chicas con Playwright (ver `herr/correr.mjs`).
- Entrega: `tool pack` → desempaquetar todo → validar → enlazar → vista previa → escaneo de secretos
  del pack → mandar el `.mcpack` + una imagen.

## Trampas
| Síntoma | Causa | Arreglo |
|---|---|---|
| El subpack ULTRA no compila ("`NL_GLOW_TEX` undeclared") | `#undef NL_GLOW_TEX` rompe `nlGlow` | no deshacer la macro: condicionar la llamada con `#ifndef ULTRA` en `fragment.sc` |
| La vista previa dice "falta …/RenderChunk/passes" | otra estructura de carpetas al desempaquetar | una carpeta plana con enlaces simbólicos por material |
| Texturas estiradas en rayas | UV en el borde con `fract` | recortar los UV a 0,0005 / 0,999 |
| Atardeceres rosados | colores `DAWN` de Newb | subirlos hacia dorado |
| `uv1` / `uv0` raros | vienen codificados | `uv1 = fract(a_texcoord1.y*vec2(256,4096))` = (luz de bloque, luz de cielo); `uv0 = fract(2*a_texcoord0)` |
| Sombras del lado equivocado | `env.sunDir` de Newb no es la dirección del sol dibujado (`SunMoon` rota con otro signo) | hacia el sol en el mundo = `(-sunDir.x, sunDir.y, -sunDir.z)` (la luna igual, con `moonDir`); en `nlRenderSky`, además `viewDir.y = -viewDir.y` |
