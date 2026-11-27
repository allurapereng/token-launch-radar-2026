// Screenshot helper: renders a local page in headless Chrome over CDP and
// saves a PNG. No dependencies: Node's built-in WebSocket talks CDP.
// Usage: node tools/shot.mjs --url <file-or-http-url> --out <png> [--width 1440] [--height 900] [--wait 1200]
import { spawn, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const CHROME = '/opt/meta-chromium/chrome';
const DOMAINS_FILE = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : fallback;
}

const url = arg('url', '');
const out = arg('out', 'shot.png');
const width = parseInt(arg('width', '1440'), 10);
const height = parseInt(arg('height', '900'), 10);
const waitMs = parseInt(arg('wait', '1200'), 10);
if (!url || !out) {
  process.stderr.write('usage: node tools/shot.mjs --url <url> --out <png> [--width 1440] [--height 900] [--wait 1200]\n');
  process.exit(2);
}

const sha = createHash('sha256').update(readFileSync(DOMAINS_FILE)).digest('hex');
const profile = `/tmp/chrome-shot-${process.pid}`;
const port = 9333 + (process.pid % 500);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--user-data-dir=${profile}`,
  `--hatch-webgl-allowed-domains-file=${DOMAINS_FILE}`,
  `--hatch-webgl-allowed-domains-sha256=${sha}`,
  `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${path}`);
      if (res.ok) return await res.json();
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('CDP endpoint did not come up');
}

let exitCode = 0;
try {
  const targets = await getJson('/json/list');
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) events.push(msg);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  // Wait for the load event, then a beat for the page's own render.
  const t0 = Date.now();
  while (!events.some((e) => e.method === 'Page.loadEventFired') && Date.now() - t0 < 15000) await sleep(100);
  await sleep(waitMs);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  ws.close();
  process.stdout.write(`shot: ${out} ${width}x${height}\n`);
} catch (err) {
  process.stderr.write(`shot failed: ${err.message}\n`);
  exitCode = 1;
} finally {
  chrome.kill('SIGKILL');
  try { execSync(`rm -rf ${profile}`); } catch { /* best effort */ }
}
process.exit(exitCode);
