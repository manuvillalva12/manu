# Reemplazos exactos en un archivo grande sin abrirlo entero.
#   python3 -I herr/reemplazar.py archivo < pares
# pares: bloques "<<<<\nviejo\n====\nnuevo\n
import re, sys

ruta = sys.argv[1]
texto = open(ruta, encoding='utf-8').read()
# el reemplazo puede estar vacío ("====\n>>>>"): borra el texto viejo
pares = re.findall(r'<<<<\n(.*?)\n====\n(.*?)\n?>>>>', sys.stdin.read(), re.S)
if not pares:
    sys.exit('no hay pares <<<< ==== >>>>')
for i, (viejo, nuevo) in enumerate(pares, 1):
    if re.search(r'^(<<<<|====|>>>>)$', viejo + '\n' + nuevo, re.M):
        sys.exit(f'par {i}: quedó una marca adentro (¿par mal cerrado?), no se cambió nada')
for i, (viejo, nuevo) in enumerate(pares, 1):
    n = texto.count(viejo)
    if n != 1:
        sys.exit(f'par {i}: aparece {n} veces, no se cambió nada:\n{viejo[:300]}')
    texto = texto.replace(viejo, nuevo)
open(ruta, 'w', encoding='utf-8').write(texto)
print(f'{len(pares)} reemplazos en {ruta}')
