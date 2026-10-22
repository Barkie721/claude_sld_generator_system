#!/usr/bin/env node
// ============================================================
// snapshot_catalog.mjs — headless snapshot frontend for the SLD Symbol
// Catalog (sld_catalog_V1_0_0.html+), the visual-reference sibling of
// 04_renderer/snapshot_html.mjs.
// ------------------------------------------------------------
// Boots the catalog's single inline <script> in node:vm behind a minimal DOM
// shim, injects the page CSS as __CATALOG_CSS_TEXT, then calls the catalog's
// own window.__snapshot.core(id, {theme, ports}). This tool contains NO
// rendering / palette logic — the catalog is the single source of truth; this
// is only a frontend that decides where the bytes go. Rasterize: rsvg-convert.
//
// Usage:
//   node snapshot_catalog.mjs --html <catalog.html>
//        [--symbols L2-1,R-3,A-4]   subset by id (default: all non-placeholder)
//        [--layer L2]               subset by layer (L0|L1|L2|L3|R|A)
//        [--all]                    every non-placeholder symbol (the default)
//        [--theme dark|light|both]  default: dark
//        [--ports on|off]           include port-marker overlay (default: on)
//        [--width N]                PNG width in px (default: 500)
//        [--out DIR]                default: <catalog dir>/snapshots
//        [--slug name]              filename prefix; default from viewer hook
//        [--keep]                   archive existing outputs before writing
//        [--no-png]                 write SVGs only (skip rsvg-convert)
//        [--audit]                  run the catalog's __audit per symbol,
//                                   write <out>/audit.json (advisory)
//
// Output: <out>/<slug>_<id>_<theme>[_noports].{svg,png} + manifest.json
// Exit codes: 0 ok · 1 gate failure (FATAL / coverage miss / var() residue) ·
//             2 boot or environment error.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

function die(code, msg) { console.error('[catalog-snap] ERROR: ' + msg); process.exit(code); }

// ---- args ----
const argv = process.argv.slice(2);
const opt = { theme: 'dark', ports: true, width: 500, png: true, keep: false };
const need = (i, flag) => {
  const v = argv[i];
  if (v === undefined || (v.startsWith('--') && v.length > 2)) die(2, flag + ' requires a value');
  return v;
};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--html') opt.html = need(++i, '--html');
  else if (a === '--symbols') opt.symbols = need(++i, '--symbols').split(',').map(s => s.trim()).filter(Boolean);
  else if (a === '--layer') opt.layer = need(++i, '--layer');
  else if (a === '--all') opt.all = true;
  else if (a === '--theme') opt.theme = need(++i, '--theme');
  else if (a === '--ports') opt.ports = need(++i, '--ports') !== 'off';
  else if (a === '--width') { opt.width = parseInt(need(++i, '--width'), 10); if (!isFinite(opt.width)) die(2, '--width must be a number'); }
  else if (a === '--out') opt.out = need(++i, '--out');
  else if (a === '--slug') opt.slug = need(++i, '--slug');
  else if (a === '--keep') opt.keep = true;
  else if (a === '--no-png') opt.png = false;
  else if (a === '--audit') opt.audit = true;
  else die(2, 'unknown argument: ' + a);
}
if (!opt.html) die(2, 'missing --html <catalog.html>');
if (!fs.existsSync(opt.html)) die(2, 'no such file: ' + opt.html);
if (!['dark', 'light', 'both'].includes(opt.theme)) die(2, '--theme must be dark|light|both');

// ---- load & dissect the catalog ----
const html = fs.readFileSync(opt.html, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(m => ({ src: m[1], lineOffset: html.slice(0, m.index).split('\n').length - 1 }));
if (!scripts.length) die(2, 'no inline <script> blocks found');
const styleM = html.match(/<style>([\s\S]*?)<\/style>/);
const cssText = styleM ? styleM[1] : '';
const revM = html.match(/<meta name="revision" content="([^"]*)"/);

// ---- DOM shim (superset of snapshot_html.mjs's — adds insertAdjacentHTML,
// which the catalog's reference-tab builders call) ----
const cache = {};
function mkEl(id) {
  return {
    id, innerHTML: '', textContent: '', _attr: {}, dataset: {}, style: {}, disabled: false,
    classList: { _s: new Set(), toggle(c, f) { f === undefined ? (this._s.has(c) ? this._s.delete(c) : this._s.add(c)) : (f ? this._s.add(c) : this._s.delete(c)); }, add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    setAttribute(k, v) { this._attr[k] = String(v); }, getAttribute(k) { return this._attr[k] !== undefined ? this._attr[k] : null; },
    hasAttribute(k) { return this._attr[k] !== undefined; }, removeAttribute(k) { delete this._attr[k]; },
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 800 }; },
    clientWidth: 1200, clientHeight: 800,
    closest() { return null; }, appendChild() {}, insertBefore() {}, remove() {},
    insertAdjacentHTML() {}, querySelectorAll() { return []; }, querySelector() { return null; },
    getBBox() { return { x: 0, y: 0, width: 1000, height: 1000 }; },
    focus() {}, blur() {}, click() { if (this.onclick) this.onclick({ clientX: 0, clientY: 0 }); }, onclick: null
  };
}
function gid(id) { return cache[id] || (cache[id] = mkEl(id)); }
const doc = {
  getElementById: gid, querySelectorAll: () => [], querySelector: () => null,
  documentElement: mkEl('documentElement'), title: '', body: mkEl('body'), activeElement: null,
  addEventListener() {}, removeEventListener() {},
  createElement: () => mkEl('_tmp'), createElementNS: () => mkEl('_tmpNS'),
};
const sandbox = {
  document: doc, console, JSON, Math, Date, RegExp,
  setTimeout() { return 0; }, clearTimeout() {}, requestAnimationFrame() { return 0; },
  Blob: function () {}, URL: { createObjectURL() { return 'blob:'; }, revokeObjectURL() {} }, Image: function () {},
  navigator: { clipboard: { writeText() { return Promise.resolve(); } } }, isSecureContext: false,
  addEventListener() {}, removeEventListener() {},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.__CATALOG_CSS_TEXT = cssText;
vm.createContext(sandbox);

// ---- boot ----
try {
  for (const sc of scripts) vm.runInContext(sc.src, sandbox, { filename: path.basename(opt.html), lineOffset: sc.lineOffset });
} catch (e) {
  die(2, 'catalog script failed to boot headlessly:\n' + (e && e.stack || e));
}
const snap = sandbox.window.__snapshot;
if (!snap || snap.api !== 1 || typeof snap.core !== 'function' || typeof snap.symbolIds !== 'function')
  die(2, 'catalog has no window.__snapshot (api 1) hook — this needs sld_catalog_V1_0_0.html+');

// ---- resolve the symbol set ----
let ids = snap.symbolIds();               // non-placeholder ids
if (opt.layer) ids = ids.filter(id => id === opt.layer || id.startsWith(opt.layer + '-'));
if (opt.symbols) ids = opt.symbols;       // explicit list wins (may include placeholders → reported as skips)
if (!ids.length) die(2, 'no symbols matched (layer=' + (opt.layer || '-') + ', symbols=' + (opt.symbols ? opt.symbols.join(',') : '-') + ')');

const slug = opt.slug || snap.slug || path.basename(opt.html, '.html');
const themes = opt.theme === 'both' ? ['dark', 'light'] : [opt.theme];
const outDir = opt.out || path.join(path.dirname(path.resolve(opt.html)), 'snapshots');
fs.mkdirSync(outDir, { recursive: true });

if (opt.keep) {
  const existing = fs.readdirSync(outDir).filter(f => /\.(png|svg)$/.test(f) || f === 'manifest.json' || f === 'audit.json');
  if (existing.length) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archDir = path.join(outDir, 'archive', stamp);
    fs.mkdirSync(archDir, { recursive: true });
    existing.forEach(f => fs.renameSync(path.join(outDir, f), path.join(archDir, f)));
    console.log(`[catalog-snap] archived ${existing.length} previous file(s) → archive/${stamp}/`);
  }
}

// ---- capture ----
const manifest = {
  html: path.resolve(opt.html), viewer_revision: revM ? revM[1] : null,
  generated: new Date().toISOString(), width: opt.width, ports: opt.ports, captures: [],
};
let gateFailures = 0;
const portSuffix = opt.ports ? '' : '_noports';

for (const id of ids) {
  for (const theme of themes) {
    let r;
    try { r = snap.core(id, { theme, ports: opt.ports, rsvgSafe: true }); }
    catch (e) { die(2, `core(${id}, ${theme}) threw:\n` + (e && e.stack || e)); }

    if (r.placeholder) { console.log(`[catalog-snap] skip ${id}_${theme}  (placeholder — no art)`); continue; }

    const base = `${slug}_${id}_${theme}${portSuffix}`;
    const svgPath = path.join(outDir, base + '.svg');
    fs.writeFileSync(svgPath, r.svg);

    const bad = r.warnings.some(w => /^FATAL/.test(w)) || (r.coverage && !r.coverage.ok);
    if (bad) gateFailures++;

    let pngPath = null;
    if (opt.png) {
      pngPath = path.join(outDir, base + '.png');
      const res = spawnSync('rsvg-convert', ['--width', String(opt.width), '--keep-aspect-ratio', '-o', pngPath, svgPath]);
      if (res.error) die(2, 'rsvg-convert not runnable: ' + res.error.message);
      if (res.status !== 0) die(2, `rsvg-convert failed for ${base}: ` + res.stderr.toString());
    }

    manifest.captures.push({
      id, theme, svg: path.basename(svgPath), png: pngPath ? path.basename(pngPath) : null,
      png_width: pngPath ? opt.width : null, viewBox: r.viewBox,
      coverage: r.coverage || null, warnings: r.warnings,
    });
    console.log(`[catalog-snap] ${bad ? 'FAIL' : ' ok '} ${base}` + (r.warnings.length ? `  warnings: ${r.warnings.join(' | ')}` : ''));
  }
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[catalog-snap] wrote ${manifest.captures.length} capture(s) → ${outDir}`);

// ---- advisory audit (warn-don't-fail) ----
if (opt.audit) {
  const auditHook = sandbox.window.__audit;
  if (!auditHook || auditHook.api !== 1 || typeof auditHook.run !== 'function') {
    console.log('[catalog-snap] audit skipped — catalog has no __audit (api 1) hook');
  } else {
    const auditOut = { html: path.resolve(opt.html), viewer_revision: revM ? revM[1] : null, generated: new Date().toISOString(), symbols: [] };
    for (const id of ids) {
      let res;
      try { res = auditHook.run(id); } catch (e) { res = { ok: false, id, error: String(e && e.stack || e), findings: [] }; }
      auditOut.symbols.push(res);
      const c = res.counts || {};
      console.log(`[catalog-snap] audit ${id}: ${res.ok ? 'ok' : 'FINDINGS'}  findings ${c.findings ?? '?'}` +
        (res.findings && res.findings.length ? '  ' + res.findings.map(x => x.type).join(',') : ''));
    }
    fs.writeFileSync(path.join(outDir, 'audit.json'), JSON.stringify(auditOut, null, 2));
    console.log('[catalog-snap] audit → audit.json (advisory)');
  }
}
if (gateFailures) {
  console.error(`[catalog-snap] ${gateFailures} capture(s) failed gates (FATAL / coverage / var() residue)`);
  process.exit(1);
}
