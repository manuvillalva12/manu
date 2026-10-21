# cuenta píxeles magenta (caras de atrás a la vista) por foto:  python3 -I herr/magenta.py 'fotos/x-m*.png'
import sys, glob
from PIL import Image
for f in sorted(glob.glob(sys.argv[1])):
    im = Image.open(f).convert('RGB'); px = im.load(); W, H = im.size; n = 0
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            r, g, b = px[x, y]
            if r > 190 and b > 190 and g < 90: n += 1
    if n: print(f.rsplit('/', 1)[-1], n)
print('listo')
