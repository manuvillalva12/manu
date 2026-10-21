# grilla.py salida.png ancho_celda recorte(x0,y0,x1,y1 en fracciones o "-") fila1a,fila1b,... [fila2...]
import sys
from PIL import Image
out, cw, rec, filas = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4:]
celdas = []
for f in filas:
    fila = []
    for ruta in f.split(','):
        im = Image.open(ruta).convert('RGB')
        if rec != '-':
            x0, y0, x1, y1 = map(float, rec.split(','))
            W, H = im.size
            im = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
        im = im.resize((cw, int(im.size[1] * cw / im.size[0])))
        fila.append(im)
    celdas.append(fila)
ch = max(im.size[1] for f in celdas for im in f)
nc = max(len(f) for f in celdas)
g = Image.new('RGB', (nc * cw + (nc - 1) * 6, len(celdas) * ch + (len(celdas) - 1) * 6), (255, 210, 31))
for r, f in enumerate(celdas):
    for c, im in enumerate(f):
        g.paste(im, (c * (cw + 6), r * (ch + 6)))
g.save(out)
print(out, g.size)
