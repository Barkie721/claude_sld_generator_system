#!/usr/bin/env node
// ============================================================
// check_titleblock_derivation.mjs — B4 derivation gate (G7).
//
// Proves the canonical title-block path reproduces the frozen design of
// record WITHOUT touching it:
//
//   engine (04_renderer/sld_viewer_engine_V1_0_0.html, template-verbatim
//   port) + 01_inputs/hospital_titleblock_data_V1_0_0.json overlay
//   + the compose-layer auto-NEC rule (inside pageCore)
//     ===  hospital_titleblock_30x42_V1_0_0.html's own buildTitleBlock()
//          (which hard-codes the same data and bakes the NEC note in)
//
// Checks (all must hold; exit 1 otherwise):
//   1. per sheet S1/S2: byte-equal '<g class="sheet-frame">…' markup —
//      engine side from __snapshot.page(...).frame (raw, var() refs
//      unresolved), DoR side from its buildTitleBlock(TPL, TOPO.metadata,
//      sheetMeta, {}) evaluated in the DoR's own vm context.
//   2. engine TPL deep-equals the DoR TPL.
//   3. engine TPL mirrors 07_data/normalized/sld_sheet_templates_V1_0_0.json
//      '30x42' (every TPL key equal to the JSON entry's value).
//
// Both HTMLs boot under the same node:vm DOM shim as snapshot_html.mjs.
// Read-only: nothing is written.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '..');
const ENGINE_HTML = path.join(__dirname, 'sld_viewer_engine_V1_0_0.html');
const DOR_HTML = path.join(BASE, '09_tests', 'Hospital Example (Golden Case)', 'hospital_titleblock_30x42_V1_0_0.html');
const OVERLAY_JSON = path.join(BASE, '01_inputs', 'hospital_titleblock_data_V1_0_0.json');
const SHEET_TPL_JSON = path.join(BASE, '07_data', 'normalized', 'sld_sheet_templates_V1_0_0.json');

let fails = 0;
const ok = (cond, name, detail) => {
  if (cond) { console.log('  ok  ' + name); }
  else { fails++; console.log('FAIL  ' + name + (detail ? ' — ' + detail : '')); }
};

// ---- vm boot (same shim shape as snapshot_html.mjs) ----
function bootHtml(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(m => ({ src: m[1], lineOffset: html.slice(0, m.index).split('\n').length - 1 }));
  if (!scripts.length) throw new Error('no inline <script> blocks in ' + htmlPath);
  const styleM = html.match(/<style>([\s\S]*?)<\/style>/);
  const sheetBtnIds = [...html.matchAll(/class="sheet-btn[^"]*"\s+data-sheet="([^"]+)"/g)].map(m => m[1]);

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
  const gid = id => cache[id] || (cache[id] = mkEl(id));
  const sheetBtns = sheetBtnIds.map(sid => { const b = mkEl('sheet-btn-' + sid); b.dataset.sheet = sid; return b; });
  const doc = {
    getElementById: gid,
    querySelectorAll: sel => sel === '.sheet-btn' ? sheetBtns : [],
    querySelector: () => null,
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
    requestAnimationFrame() { return 0; },
    Blob: function () {}, URL: { createObjectURL() { return 'blob:'; }, revokeObjectURL() {} },
    Image: function () {},
    navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
    isSecureContext: false,
    addEventListener() {}, removeEventListener() {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.__SLD_CSS_TEXT = styleM ? styleM[1] : '';
  vm.createContext(sandbox);
  for (const sc of scripts) {
    vm.runInContext(sc.src, sandbox, { filename: path.basename(htmlPath), lineOffset: sc.lineOffset });
  }
  return { sandbox, evalIn: expr => vm.runInContext(expr, sandbox) };
}

function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

// ---- 1. boot both sides ----
const eng = bootHtml(ENGINE_HTML);
const dor = bootHtml(DOR_HTML);
const overlay = JSON.parse(fs.readFileSync(OVERLAY_JSON, 'utf8')).metadata_overlay;
const snap = eng.sandbox.window.__snapshot;
ok(snap && typeof snap.page === 'function', 'engine exposes __snapshot.page');

// ---- 2. per-sheet frame byte-equality ----
const dorSheets = dor.evalIn('JSON.parse(JSON.stringify(TOPO.sheets))');
dorSheets.forEach((sheet, i) => {
  const sheetMeta = { sheet_number: sheet.sheet_number, title: sheet.title, index: i + 1, count: dorSheets.length };
  dor.sandbox.__CHK_SHEETMETA = sheetMeta;
  const ref = dor.evalIn('buildTitleBlock(TPL, TOPO.metadata, __CHK_SHEETMETA, {})');
  const r = snap.page(sheet.sheet_id, { meta: overlay });
  const got = r && r.frame;
  const eq = typeof ref === 'string' && ref.length > 0 && got === ref;
  ok(eq, `frame byte-equal for ${sheet.sheet_id} (${sheet.sheet_number})`,
    eq ? null : (got == null ? 'engine frame missing'
      : `lengths ${String(got).length} vs ${ref.length}; first diff at ${firstDiff(String(got), ref)}`));
});

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return `char ${i}: …${a.slice(Math.max(0, i - 40), i + 40)}… vs …${b.slice(Math.max(0, i - 40), i + 40)}…`;
  return 'length';
}

// ---- 3. TPL equivalence: engine vs DoR, engine vs data-layer JSON ----
const engTPL = eng.evalIn('JSON.parse(JSON.stringify(TPL))');
const dorTPL = dor.evalIn('JSON.parse(JSON.stringify(TPL))');
ok(deepEq(engTPL, dorTPL), 'engine TPL deep-equals design-of-record TPL');

const tplJson = JSON.parse(fs.readFileSync(SHEET_TPL_JSON, 'utf8')).templates['30x42'];
const mirrorBad = Object.keys(engTPL).filter(k => !deepEq(engTPL[k], tplJson[k]));
ok(mirrorBad.length === 0, "engine TPL mirrors sld_sheet_templates_V1_0_0.json '30x42'",
  mirrorBad.length ? 'diverging keys: ' + mirrorBad.join(', ') : null);

console.log(fails ? `\nDERIVATION GATE: ${fails} FAILURE(S)` : '\nDERIVATION GATE: PASS — template+data reproduces the design of record');
process.exit(fails ? 1 : 0);
