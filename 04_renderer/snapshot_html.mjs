#!/usr/bin/env node
// ============================================================
// snapshot_html.mjs — headless snapshot frontend for self-contained
// SLD viewer HTMLs.
// ------------------------------------------------------------
// Boots the viewer's single inline <script> in node:vm behind a minimal
// DOM shim (pattern proven by 09_tests/Helix.../tools/test_html.js), then
// calls the viewer's own window.__snapshot.core(). This tool contains NO
// bounds / palette / rendering logic of its own — the viewer is the
// single source of truth; this is only a frontend that decides where the
// bytes go. Rasterization: rsvg-convert by default; see "PNG engine" below.
//
// Usage:
//   node snapshot_html.mjs --html <viewer.html>
//        [--sheets S1,S2]           default: all sheets
//        [--theme dark|light|both]  default: dark
//        [--width 1600]             PNG width in px
//        [--region x,y,w,h]         zoomed detail shot (SVG user units)
//        [--element ID]             close-up of one element by data-id
//                                   (viewers with the element() hook; excludes --region)
//        [--pad N]                  override bounds padding
//        [--page]                   composed Arch E1 page (sheet frame +
//                                   title block + fitted diagram) via the
//                                   viewer's __snapshot.page hook;
//                                   excludes --region/--element
//        [--page-meta FILE]         metadata-overlay JSON for --page (a
//                                   sld_titleblock_instance file; its
//                                   .metadata_overlay — or the whole
//                                   object if that key is absent — merges
//                                   over TOPO.metadata)
//        [--out DIR]                default: <viewer dir>/snapshots
//        [--slug name]              filename prefix; default from viewer hook
//        [--keep]                   archive existing outputs before writing
//        [--raster rsvg|resvg|none] PNG engine; default $SLD_RASTER, else rsvg (--no-png = none)
//        [--audit]                  run the viewer's geometry audit per
//                                   sheet, write <out>/audit.json (advisory
//                                   — never changes the exit code)
//
// Output: <out>/<slug>_<sheet>_<theme>[__rX,Y,WxH].{svg,png} + manifest.json
// Exit codes: 0 ok · 1 gate failure (coverage miss / unresolved var() /
// NO RENDERER / warnings) · 2 boot or environment error.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

function die(code, msg) { console.error('[snapshot] ERROR: ' + msg); process.exit(code); }

// ---- args ----
const argv = process.argv.slice(2);
// width: null = native 1:1 (one PNG px per SVG unit, capped at 6000) so
// 12px labels stay legible; pass --width to override in either direction.
const opt = { theme: 'dark', width: null, raster: null, keep: false };
// Read the value after a value-taking flag; reject a missing value or the next
// flag being swallowed as the value (e.g. `--element --no-png`). A single '-'
// (negative number / region coords) is a legal value; only '--' tokens aren't.
const need = (i, flag) => {
  const v = argv[i];
  if (v === undefined || (v.startsWith('--') && v.length > 2)) die(2, flag + ' requires a value');
  return v;
};
// Numeric flag: value must be present and parse to a finite number, otherwise
// garbage like `--pad xyz` silently became NaN and produced a corrupt viewBox.
const numArg = (i, flag, parse) => {
  const v = parse(need(i, flag), 10);
  if (!isFinite(v)) die(2, flag + ' must be a number');
  return v;
};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--html') opt.html = argv[++i];
  else if (a === '--sheets') opt.sheets = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
  else if (a === '--theme') opt.theme = argv[++i];
  else if (a === '--width') opt.width = numArg(++i, '--width', parseInt);
  else if (a === '--region') opt.region = argv[++i];
  else if (a === '--element') opt.element = need(++i, '--element');
  else if (a === '--pad') opt.pad = numArg(++i, '--pad', parseFloat);
  else if (a === '--page') opt.page = true;
  else if (a === '--page-meta') opt.pageMeta = need(++i, '--page-meta');
  else if (a === '--out') opt.out = argv[++i];
  else if (a === '--slug') opt.slug = argv[++i];
  else if (a === '--keep') opt.keep = true;
  else if (a === '--no-png' || a === '--raster') opt.raster = a === '--no-png' ? 'none' : need(++i, '--raster');
  else if (a === '--audit') opt.audit = true;
  else die(2, 'unknown argument: ' + a);
}
if (!opt.html) die(2, 'missing --html <viewer.html>');
if (!fs.existsSync(opt.html)) die(2, 'no such file: ' + opt.html);
if (!['dark', 'light', 'both'].includes(opt.theme)) die(2, "--theme must be dark|light|both");
let region = null;
if (opt.region) {
  const n = opt.region.split(',').map(Number);
  if (n.length !== 4 || n.some(v => !isFinite(v))) die(2, '--region must be x,y,w,h');
  region = { x: n[0], y: n[1], w: n[2], h: n[3] };
}
if (opt.element && opt.region) die(2, '--element cannot be combined with --region');
if (opt.element && opt.sheets && opt.sheets.length !== 1)
  die(2, '--element requires --sheets to name exactly one sheet (or omit --sheets to auto-resolve)');
if (opt.page && (opt.region || opt.element)) die(2, '--page cannot be combined with --region/--element');
if (opt.pageMeta && !opt.page) die(2, '--page-meta requires --page');
let pageMeta = null;
if (opt.pageMeta) {
  if (!fs.existsSync(opt.pageMeta)) die(2, 'no such file: ' + opt.pageMeta);
  try {
    const pm = JSON.parse(fs.readFileSync(opt.pageMeta, 'utf8'));
    pageMeta = pm.metadata_overlay || pm;
  } catch (e) {
    die(2, '--page-meta is not valid JSON: ' + (e && e.message || e));
  }
}

// ---- load & dissect the viewer ----
const html = fs.readFileSync(opt.html, 'utf8');
// All inline scripts run in order in one shared context (like sequential
// <script> tags); each gets a lineOffset so stack traces map to real HTML
// lines. Hospital viewer = 1 script; Helix viewer = 2 (engine + mount).
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(m => ({ src: m[1], lineOffset: html.slice(0, m.index).split('\n').length - 1 }));
if (!scripts.length) die(2, 'no inline <script> blocks found');
const styleM = html.match(/<style>([\s\S]*?)<\/style>/);
const cssText = styleM ? styleM[1] : '';
const revM = html.match(/<meta name="revision" content="([^"]*)"/);

// sheet buttons declared in the HTML (generic across viewers)
const sheetBtnIds = [...html.matchAll(/class="sheet-btn[^"]*"\s+data-sheet="([^"]+)"/g)].map(m => m[1]);

// ---- DOM shim (adapted from Helix tools/test_html.js) ----
const cache = {};
function mkEl(id) {
  const e = {
    id, innerHTML: '', textContent: '', _attr: {}, dataset: {}, style: {}, disabled: false,
    classList: {
      _s: new Set(),
      toggle(c, f) { f === undefined ? (this._s.has(c) ? this._s.delete(c) : this._s.add(c)) : (f ? this._s.add(c) : this._s.delete(c)); },
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }
    },
    setAttribute(k, v) { this._attr[k] = String(v); },
    getAttribute(k) { return this._attr[k] !== undefined ? this._attr[k] : null; },
    hasAttribute(k) { return this._attr[k] !== undefined; },
    removeAttribute(k) { delete this._attr[k]; },
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 1200, height: 800 }; },
    clientWidth: 1200, clientHeight: 800,
    closest() { return null; }, appendChild() {}, insertBefore() {}, remove() {},
    querySelectorAll() { return []; }, querySelector() { return null; },
    getBBox() { return { x: 0, y: 0, width: 1000, height: 1000 }; },
    focus() {}, blur() {},
    click() { if (this.onclick) this.onclick({ clientX: 0, clientY: 0 }); }, onclick: null
  };
  return e;
}
function gid(id) { return cache[id] || (cache[id] = mkEl(id)); }
const sheetBtns = sheetBtnIds.map(sid => { const b = mkEl('sheet-btn-' + sid); b.dataset.sheet = sid; return b; });
const doc = {
  getElementById: gid,
  querySelectorAll: sel => sel === '.sheet-btn' ? sheetBtns : [],
  querySelector: () => null,   // viewer CSS text is injected via __SLD_CSS_TEXT instead
  documentElement: mkEl('documentElement'),
  title: '',
  body: mkEl('body'),
  activeElement: null,
  addEventListener() {}, removeEventListener() {},
  createElement: () => mkEl('_tmp'),
  createElementNS: () => mkEl('_tmpNS'),
};
const sandbox = {
  document: doc, console, JSON, Math, Date,
  setTimeout() { return 0; }, clearTimeout() {},
  requestAnimationFrame(fn) { return 0; },
  Blob: function () {}, URL: { createObjectURL() { return 'blob:'; }, revokeObjectURL() {} },
  Image: function () {},
  navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
  isSecureContext: false,
  addEventListener() {}, removeEventListener() {},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.__SLD_CSS_TEXT = cssText;
vm.createContext(sandbox);

// ---- boot the viewer ----
try {
  for (const sc of scripts) {
    vm.runInContext(sc.src, sandbox, { filename: path.basename(opt.html), lineOffset: sc.lineOffset });
  }
} catch (e) {
  die(2, 'viewer script failed to boot headlessly:\n' + (e && e.stack || e));
}
const snap = sandbox.window.__snapshot;
if (!snap || snap.api !== 1) {
  die(2, 'viewer has no window.__snapshot (api 1) hook — paste the snapshotCore block into this viewer first');
}
if (opt.page && typeof snap.page !== 'function')
  die(2, 'viewer __snapshot has no page() hook — --page needs a page-capable viewer');

// ---- element close-up: resolve data-id -> region ----
let elementSuffix = '';
if (opt.element) {
  if (typeof snap.element !== 'function')
    die(2, 'viewer __snapshot has no element() hook — --element needs a viewer with the element() hook');
  const candidates = opt.sheets || snap.sheetIds();
  for (const s of candidates) {
    const r = snap.element(s, opt.element, opt.pad);
    if (r) { opt.sheets = [s]; region = r; break; }
  }
  if (!region) die(2, 'element not found: ' + opt.element);
  elementSuffix = '__el-' + opt.element.replace(/[^A-Za-z0-9_-]/g, '_');
}

// ---- plan the captures ----
const slug = opt.slug || snap.slug || path.basename(opt.html, '.html');
const sheets = opt.sheets || snap.sheetIds();
const themes = opt.theme === 'both' ? ['dark', 'light'] : [opt.theme];
const outDir = opt.out || path.join(path.dirname(path.resolve(opt.html)), 'snapshots');
fs.mkdirSync(outDir, { recursive: true });

if (opt.keep) {
  const existing = fs.readdirSync(outDir).filter(f => /\.(png|svg)$/.test(f) || f === 'manifest.json');
  if (existing.length) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archDir = path.join(outDir, 'archive', stamp);
    fs.mkdirSync(archDir, { recursive: true });
    existing.forEach(f => fs.renameSync(path.join(outDir, f), path.join(archDir, f)));
    console.log(`[snapshot] archived ${existing.length} previous file(s) → archive/${stamp}/`);
  }
}

// ---- PNG engine ----
// rsvg  rsvg-convert (librsvg) on PATH. The default, the phone's engine, and the
//       ONLY engine the G5/G6 PNG baselines were made with: those gates pin it.
// resvg a pinned resvg binary kept OUTSIDE the repo (the Windows PC; there is no
//       rsvg-convert there). Its PNGs can never match an rsvg baseline sha.
// none  SVG only (what --no-png always meant).
// --raster beats $SLD_RASTER beats rsvg. The chosen engine is verified BEFORE the
// first capture, and a missing or unpinned one is exit 2. It never falls back
// to SVG-only: a run that silently made no PNGs reads as a clean run.
const RESVG_VERSION = '0.47.0';
const RESVG_SHA256 = '433a7c744cff561ed64fcf73c7c04e239d7a07ae5f0aadbf1ba8471d63707402';   // resvg-win64.zip v0.47.0, resvg.exe
const raster = opt.raster || process.env.SLD_RASTER || 'rsvg';
if (!['rsvg', 'resvg', 'none'].includes(raster)) die(2, `PNG engine must be rsvg|resvg|none, got '${raster}' (--raster / $SLD_RASTER)`);
opt.png = raster !== 'none';
let rasterBin = null, rasterVersion = null;
if (raster === 'rsvg') {
  rasterBin = 'rsvg-convert';
  const v = spawnSync(rasterBin, ['--version']);
  if (v.error || v.status !== 0) die(2, 'rsvg-convert not runnable: ' + (v.error ? v.error.message : v.stderr.toString()) +
    ' (on the Windows PC use --raster resvg or SLD_RASTER=resvg; --no-png for SVGs only)');
  rasterVersion = v.stdout.toString().trim();
} else if (raster === 'resvg') {
  // $RESVG_PATH relocates the binary; it does not unpin it.
  const home = process.env.USERPROFILE || process.env.HOME || '';
  rasterBin = process.env.RESVG_PATH ||
    path.join(home, 'tools', 'resvg', RESVG_VERSION, process.platform === 'win32' ? 'resvg.exe' : 'resvg');
  if (!fs.existsSync(rasterBin)) die(2, `resvg not found at ${rasterBin} — install resvg ${RESVG_VERSION} there, or point $RESVG_PATH at it`);
  const { createHash } = await import('node:crypto');
  const got = createHash('sha256').update(fs.readFileSync(rasterBin)).digest('hex');
  if (got !== RESVG_SHA256) die(2, `${rasterBin} hashes ${got.slice(0, 12)}…, pinned ${RESVG_SHA256.slice(0, 12)}… (resvg ${RESVG_VERSION}). ` +
    'A different resvg is a different renderer: change the pin deliberately, never to clear this.');
  rasterVersion = RESVG_VERSION;
}
// Same contract both ways: width W, height from the aspect ratio.
const rasterArgs = (w, svg, png) => raster === 'rsvg'
  ? ['--width', String(w), '--keep-aspect-ratio', '-o', png, svg]
  : ['-w', String(w), svg, png];

// ---- capture ----
const manifest = {
  html: path.resolve(opt.html),
  viewer_revision: revM ? revM[1] : null,
  generated: new Date().toISOString(),
  width: opt.width || 'native-1x (cap 6000)',
  region: region,
  captures: [],
};
if (opt.page) { manifest.mode = 'page'; if (opt.pageMeta) manifest.page_meta = path.resolve(opt.pageMeta); }
let gateFailures = 0;
const regionSuffix = elementSuffix ||
  (region ? `__r${region.x},${region.y},${region.w}x${region.h}` : (opt.page ? '__page' : ''));

for (const sheet of sheets) {
  for (const theme of themes) {
    let r;
    try {
      r = opt.page
        ? snap.page(sheet, { theme, meta: pageMeta, rsvgSafe: true })
        : snap.core(sheet, { theme, region, pad: opt.pad, rsvgSafe: true });
    } catch (e) {
      die(2, `${opt.page ? 'pageCore' : 'snapshotCore'}(${sheet}, ${theme}) threw:\n` + (e && e.stack || e));
    }
    const base = `${slug}_${sheet}_${theme}${regionSuffix}`;
    const svgPath = path.join(outDir, base + '.svg');
    fs.writeFileSync(svgPath, r.svg);

    const fatal = r.warnings.filter(w => w.startsWith('FATAL'));
    const bad = fatal.length > 0 || (r.coverage && !r.coverage.ok) || r.warnings.some(w => /NO RENDERER/.test(w));
    if (bad) gateFailures++;

    let pngPath = null;
    const pngWidth = opt.width || Math.min(Math.ceil(r.viewBox.w), 6000);
    if (opt.png) {
      pngPath = path.join(outDir, base + '.png');
      fs.rmSync(pngPath, { force: true });   // so the exists-check below cannot pass on a stale PNG
      const res = spawnSync(rasterBin, rasterArgs(pngWidth, svgPath, pngPath));
      if (res.error) die(2, `${raster} not runnable: ` + res.error.message);
      if (res.status !== 0) die(2, `${raster} failed for ${base}: ` + res.stderr.toString());
      if (!fs.existsSync(pngPath)) die(2, `${raster} exited 0 but wrote no ${path.basename(pngPath)}`);
    }

    const cap = {
      sheet, theme,
      svg: path.basename(svgPath),
      png: pngPath ? path.basename(pngPath) : null,
      png_width: pngPath ? pngWidth : null,
      raster: pngPath ? { engine: raster, version: rasterVersion } : null,
      viewBox: r.viewBox,
      coverage: r.coverage ? { rendered: r.coverage.rendered, total: r.coverage.total, ok: r.coverage.ok } : null,
      warnings: r.warnings,
    };
    if (opt.page) { cap.mode = 'page'; cap.transform = r.transform; }   // page-mode only — sheet-capture manifest shape unchanged
    manifest.captures.push(cap);
    const covStr = r.coverage ? `${r.coverage.rendered}/${r.coverage.total}` : 'n/a';
    console.log(`[snapshot] ${bad ? 'FAIL' : ' ok '} ${base}  coverage ${covStr}` +
      (r.warnings.length ? `  warnings: ${r.warnings.join(' | ')}` : ''));
  }
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[snapshot] wrote ${manifest.captures.length} capture(s) → ${outDir}`);

// ---- geometry audit (advisory — warn-don't-fail, so existing
// pipelines never break on findings) ----
if (opt.audit) {
  const auditHook = sandbox.window.__audit;
  if (!auditHook || auditHook.api !== 1 || typeof auditHook.run !== 'function') {
    console.log('[snapshot] audit skipped — viewer has no __audit (api 1) hook');
  } else {
    const auditOut = {
      html: path.resolve(opt.html),
      viewer_revision: revM ? revM[1] : null,
      generated: new Date().toISOString(),
      sheets: [],
    };
    for (const sheet of sheets) {
      let res;
      try {
        res = auditHook.run(sheet);
      } catch (e) {
        res = { ok: false, sheetId: sheet, error: String(e && e.stack || e), counts: {}, findings: [] };
      }
      auditOut.sheets.push(res);
      const c = res.counts || {};
      console.log(`[snapshot] audit ${sheet}: ${res.ok ? 'ok' : 'FINDINGS'}  ` +
        `label_overlap ${c.label_overlap ?? '?'} · glyph_collision ${c.glyph_collision ?? '?'} · ` +
        `out_of_frame ${c.out_of_frame ?? '?'} · feeder_crossing ${c.feeder_crossing ?? '?'} · ` +
        `layout_warnings ${c.layout_warnings ?? '?'}` + (res.error ? '  ERROR: ' + res.error.split('\n')[0] : ''));
    }
    fs.writeFileSync(path.join(outDir, 'audit.json'), JSON.stringify(auditOut, null, 2));
    console.log('[snapshot] audit → audit.json (advisory)');
  }
}
if (gateFailures) {
  console.error(`[snapshot] ${gateFailures} capture(s) failed gates (coverage / var() residue / NO RENDERER)`);
  process.exit(1);
}
