import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {confinedFile} from './project.mjs';

const skillRoot = fileURLToPath(new URL('../../', import.meta.url));
const types = {'.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.json':'application/json', '.csv':'text/csv', '.png':'image/png', '.jpg':'image/jpeg', '.woff2':'font/woff2', '.glb':'model/gltf-binary', '.gltf':'model/gltf+json', '.bin':'application/octet-stream', '.hdr':'application/octet-stream', '.exr':'application/octet-stream', '.svg':'image/svg+xml'};
export const captureBackend = options => options.software ? 'swiftshader' : process.platform === 'darwin' ? 'metal' : 'chromium-default';

export async function serve(root, port = 0) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      const vendor = pathname.startsWith('/vendor/three/');
      const base = vendor ? path.join(skillRoot, 'node_modules/three') : root;
      const relative = vendor ? pathname.slice('/vendor/three/'.length) : pathname === '/' ? 'index.html' : pathname.slice(1);
      const file = await confinedFile(base, relative);
      const body = await readFile(file);
      res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'}); res.end(body);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return {url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve))};
}

export async function openCapture(project, {software = false} = {}) {
  const server = await serve(project.root);
  let browser;
  try {
    browser = await chromium.launch({headless: true, executablePath: process.env.UNREALMOTION_CHROMIUM || undefined,
      args: software ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : process.platform === 'darwin' ? ['--use-gl=angle', '--use-angle=metal'] : []});
    const context = await browser.newContext({viewport:{width:project.config.width, height:project.config.height}, deviceScaleFactor:1, reducedMotion:'reduce'});
    const errors = [], blocked = [];
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(server.url + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      blocked.push(url); return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', r => errors.push(`Request failed: ${r.url()}: ${r.failure()?.errorText}`));
    await page.goto(server.url + '/?capture=1', {waitUntil:'load', timeout:60000});
    await page.waitForFunction(() => window.__unrealmotion?.ready || window.__unrealmotionError, null, {timeout:60000});
    const failure = await page.evaluate(() => window.__unrealmotionError);
    if (failure) throw new Error(failure);
    return {page, errors, blocked,
      async frame(f) { await page.evaluate(f => window.__unrealmotion.renderFrame(f), f); return page.screenshot({type:'png'}); },
      close: async () => { await browser.close(); await server.close(); }
    };
  } catch (error) { if (browser) await browser.close(); await server.close(); throw error; }
}
