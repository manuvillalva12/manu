# Reemplazos exactos en un archivo grande sin abrirlo entero.
#   python3 -I herr/reemplazar.py archivo < pares
# pares: bloques "<<<<\nviejo\n====\nnuevo\n>>>>". Cada "viejo" tiene que aparecer una sola vez; si alguno
# aparece 0 o 2+ veces no se escribe nada.
import re, sys

ruta = sys.argv[1]
texto = open(ruta, encoding='utf-8').read()
pares = re.findall(r'<<<<\n(.*?)\n====\n(.*?)\n>>>>', sys.stdin.read(), re.S)
if not pares:
    sys.exit('no hay pares <<<< ==== >>>>')
for i, (viejo, nuevo) in enumerate(pares, 1):
    n = texto.count(viejo)
    if n != 1:
        sys.exit(f'par {i}: aparece {n} veces, no se cambió nada:\n{viejo[:300]}')
    texto = texto.replace(viejo, nuevo)
open(ruta, 'w', encoding='utf-8').write(texto)
print(f'{len(pares)} reemplazos en {ruta}')
