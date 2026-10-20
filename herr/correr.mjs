// Corre un escenario de prueba sobre un HTML en Chromium, como si fuera un celu apaisado.
//   node herr/correr.mjs esc.mjs juego.html [762x350] [2]
// Variables: GPU='Adreno (TM) 610' (la página "cree" tener esa placa), WEBGL1=1 (sin WebGL 2),
//            RED=1 (deja salir a internet), FOTOS=carpeta (por defecto ./fotos), TIEMPO=segundos,
//            TFOTO=ms de espera por foto (con swiftshader los gráficos pesados tardan),
//            PASOS=1 (cuadros a pedido: h.manual(true) frena el requestAnimationFrame del juego y h.paso(n) corre
//            n cuadros de 16,7 ms; devuelve los ms reales por cuadro. Sirve para gráficos que en swiftshader van lentos).
// El escenario exporta `default async (h)` con h = { p, foto, tocar, esperar, ev, errores, log, paso, manual }.
// Sale con 1 si la página tiró errores, con 2 si falló el escenario.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(import.meta.url);
const { chromium } = req('playwright'); // global: lo encuentra por NODE_PATH

const [esc, html, tam = '762x350', dens = '2'] = process.argv.slice(2);
if (!esc || !html) {
  console.error('uso: node herr/correr.mjs esc.mjs juego.html [762x350] [2]');
  process.exit(2);
}
const [width, height] = tam.split('x').map(Number);
const fotos = process.env.FOTOS || 'fotos';
fs.mkdirSync(fotos, { recursive: true });

const nav = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await nav.newContext({ viewport: { width, height }, deviceScaleFactor: +dens, isMobile: true, hasTouch: true });
if (!process.env.RED) await ctx.route(u => !['file:', 'data:', 'blob:'].includes(u.protocol), r => r.abort());
if (process.env.GPU) {
  await ctx.addInitScript(gpu => {
    for (const C of [self.WebGLRenderingContext, self.WebGL2RenderingContext]) {
      if (!C) continue;
      const orig = C.prototype.getParameter;
      C.prototype.getParameter = function (k) { return k === 0x9246 ? gpu : orig.call(this, k); };
    }
  }, process.env.GPU);
}
if (process.env.WEBGL1) {
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, ...a) { return t === 'webgl2' ? null : orig.call(this, t, ...a); };
  });
}

if (process.env.PASOS) {
  await ctx.addInitScript(() => {
    const r0 = window.requestAnimationFrame.bind(window);
    let pend = [], t = 0;
    window.__manual = false;
    window.requestAnimationFrame = cb => { if (window.__manual) { pend.push(cb); return 0; } return r0(cb); };
    window.__paso = n => {
      if (!t) t = performance.now();
      const a = performance.now();
      for (let i = 0; i < n; i++) { const l = pend; pend = []; t += 16.7; for (const cb of l) cb(t); }
      return Math.round((performance.now() - a) / Math.max(1, n));
    };
  });
}

const p = await ctx.newPage();
const errores = [];
let cortados = 0;
p.on('pageerror', e => errores.push('pageerror: ' + e.message));
p.on('console', m => {
  if (m.type() !== 'error') return;
  if (/net::ERR_|Failed to load resource/.test(m.text())) cortados++;
  else errores.push('console: ' + m.text());
});

const log = (...a) => console.log('·', ...a);
const h = {
  p, errores, log,
  esperar: ms => p.waitForTimeout(ms),
  ev: (fn, arg) => p.evaluate(fn, arg),
  paso: n => p.evaluate(n => window.__paso(n), n),
  manual: async on => { await p.evaluate(v => { window.__manual = v; }, on); if (on) await p.waitForTimeout(300); },
  tocar: async q => (typeof q === 'string' ? p.tap(q) : p.touchscreen.tap(q.x, q.y)),
  foto: async nombre => {
    const f = path.join(fotos, nombre + '.png');
    await p.screenshot({ path: f, timeout: +process.env.TFOTO || 30000 });
    log('foto', f);
    return f;
  },
};

let codigo = 0;
const tope = setTimeout(() => { console.error('✗ el escenario tardó demasiado'); process.exit(2); }, (+process.env.TIEMPO || 120) * 1000);
try {
  await p.goto(pathToFileURL(path.resolve(html)).href);
  const { default: correr } = await import(pathToFileURL(path.resolve(esc)).href);
  await correr(h);
} catch (e) {
  console.error('✗ escenario:', e.message);
  codigo = 2;
}
clearTimeout(tope);
await nav.close();
if (cortados) log(cortados, 'pedidos a internet cortados (RED=1 para dejarlos salir)');
if (errores.length) {
  console.error('✗ errores de la página:\n  ' + errores.join('\n  '));
  codigo ||= 1;
} else log('sin errores de la página');
process.exit(codigo);
