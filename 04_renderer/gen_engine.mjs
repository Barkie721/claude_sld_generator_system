// Generates 04_renderer/sld_engine.mjs from the refactored engine HTML.
// The module extracts the layout engine verbatim (behavior-preserving),
// stubs the DOM, and exposes buildGeometry(topoInput) which reproduces
// exportGeometry()'s output shape without a real DOM.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Paths are resolved relative to this script so the toolchain works from
// any checkout location (was a hardcoded /sdcard/... absolute path).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_HTML = path.join(__dirname, 'sld_viewer_engine_V1_0_0.html');
const OUT = path.join(__dirname, 'sld_engine.mjs');

const html = fs.readFileSync(ENGINE_HTML, 'utf8');
const m = html.match(/<script>\n([\s\S]*?)\n<\/script>/);
if (!m) throw new Error('no <script> block');
let body = m[1];

// 1) strip auto-run init IIFE
const b0 = body.length;
body = body.replace(/\n\(function init\(\)\s*\{[\s\S]*?\n\}\)\(\);\s*$/, '\n/* init IIFE removed for headless engine module */\n');
if (body.length === b0) throw new Error('init IIFE not stripped');

// 2) make TOPO reassignable (only the top-level declaration)
const b1 = body.length;
body = body.replace(/\nconst TOPO = \{\n/, '\nlet TOPO = {\n');
if (body.length !== b1 - 2) throw new Error('TOPO const->let not applied (len delta ' + (body.length-b1) + ')');
if (!/\nlet TOPO = \{\n/.test(body)) throw new Error('TOPO not converted to let');

// HEADER (DOM stubs) and FOOTER (headless geometry export) are byte-concatenated
// around the extracted engine body. They live in sibling fragment files read
// VERBATIM — not inline template literals — so (a) this generator is backtick-free
// (edit its comments freely) and (b) the footer is editable as ordinary JS: its
// regexes carry single backslashes, not the doubled ones a template literal forced.
// Edit the fragment, then regenerate. The fragments are not standalone modules
// (the footer references identifiers defined in the assembled engine).
const HEADER = fs.readFileSync(path.join(__dirname, 'engine_header_fragment.js'), 'utf8');
const FOOTER = fs.readFileSync(path.join(__dirname, 'engine_footer_fragment.js'), 'utf8');

body = HEADER + body + FOOTER;
fs.writeFileSync(OUT, body, 'utf8');
console.log('wrote', OUT, 'bytes', body.length);
