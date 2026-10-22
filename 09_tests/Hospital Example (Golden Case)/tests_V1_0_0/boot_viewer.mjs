// Shared vm boot for SLD viewer test scripts — same shim shape as
// 04_renderer/snapshot_html.mjs, plus _listeners capture on elements.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function bootViewer(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(m => ({ src: m[1], lineOffset: html.slice(0, m.index).split('\n').length - 1 }));
  if (!scripts.length) throw new Error('no inline <script> blocks found');
  const styleM = html.match(/<style>([\s\S]*?)<\/style>/);
  const cssText = styleM ? styleM[1] : '';
  const sheetBtnIds = [...html.matchAll(/class="sheet-btn[^"]*"\s+data-sheet="([^"]+)"/g)].map(m => m[1]);

  const cache = {};
  function mkEl(id) {
    const e = {
      id, innerHTML: '', textContent: '', _attr: {}, dataset: {}, style: {}, disabled: false,
      _listeners: {},
      classList: {
        _s: new Set(),
        toggle(c, f) { f === undefined ? (this._s.has(c) ? this._s.delete(c) : this._s.add(c)) : (f ? this._s.add(c) : this._s.delete(c)); },
        add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }
      },
      setAttribute(k, v) { this._attr[k] = String(v); },
      getAttribute(k) { return this._attr[k] !== undefined ? this._attr[k] : null; },
      hasAttribute(k) { return this._attr[k] !== undefined; },
      removeAttribute(k) { delete this._attr[k]; },
      addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
      removeEventListener() {},
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
  for (const sc of scripts) {
    vm.runInContext(sc.src, sandbox, { filename: path.basename(htmlPath), lineOffset: sc.lineOffset });
  }
  // evalIn sees top-level let/const from the viewer script (shared global
  // lexical environment) — needed for G, currentSheet, lastClickedElementId.
  const evalIn = code => vm.runInContext(code, sandbox);
  return { sandbox, cache, sheetBtnIds, evalIn };
}
