// V2 behavior tests (verification recipe item 6) — boots the V2 viewer in
// node:vm with listener-recording stub elements and asserts the new
// __snapshot.element / __audit hooks plus save-restore semantics.
import { bootViewer } from './boot_viewer.mjs';
// FU-0008 regression guard. Second implementation on purpose — see the header
// of that module for why it must not import the engine's own scan.
import { frameHonesty } from '../../../08_validation/lib/ink_extent_V1_0_0.mjs';

const htmlPath = process.argv[2];
const { sandbox, cache, evalIn } = bootViewer(htmlPath);

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
}

// ---- 1. hook presence & api versions ----
const snap = sandbox.window.__snapshot;
const audit = sandbox.window.__audit;
ok(snap && snap.api === 1, '__snapshot.api === 1');
ok(typeof snap.element === 'function', '__snapshot.element is a function');
ok(audit && audit.api === 1, '__audit.api === 1');
ok(typeof audit.run === 'function', '__audit.run is a function');

// ---- 2. element region contains the device's G[] anchor (current sheet) ----
ok(evalIn('currentSheet') === 'S1', 'boot currentSheet is S1');
const r1 = snap.element('S1', 'd-003');
ok(r1 && ['x', 'y', 'w', 'h'].every(k => isFinite(r1[k])), 'element(S1,d-003) returns finite {x,y,w,h}');
const g003 = evalIn('G["d-003"] && { x: G["d-003"].x, y: G["d-003"].y }');
ok(g003 && r1 &&
   g003.x >= r1.x && g003.x <= r1.x + r1.w &&
   g003.y >= r1.y && g003.y <= r1.y + r1.h, 'element bbox contains G["d-003"] anchor');
ok(snap.element('S1', 'no-such-id') === null, 'element(S1,bogus) === null');

// ---- 3. non-current-sheet element resolve restores G[]/currentSheet ----
const r2 = snap.element('S2', 'd-045');
ok(r2 && isFinite(r2.x), 'element(S2,d-045) resolves from S1');
ok(evalIn('currentSheet') === 'S1', 'currentSheet restored to S1 after element(S2,...)');
ok(evalIn('!!G["d-003"]') === true, 'G[] restored to S1 devices after element(S2,...)');

// ---- 4. audit shape for every sheet ----
const COUNT_KEYS = ['label_overlap', 'glyph_collision', 'out_of_frame', 'feeder_crossing', 'layout_warnings'];
for (const sheet of snap.sheetIds()) {
  const res = audit.run(sheet);
  ok(res && res.sheetId === sheet && typeof res.ok === 'boolean', `audit.run(${sheet}) has ok/sheetId`);
  ok(res && COUNT_KEYS.every(k => Number.isInteger(res.counts[k])), `audit.run(${sheet}) counts has 5 integer keys`);
  ok(res && Array.isArray(res.findings) && res.findings.every(f =>
      typeof f.type === 'string' && typeof f.severity === 'string' &&
      Array.isArray(f.ids) && typeof f.note === 'string' &&
      (f.bbox === null || ['x', 'y', 'w', 'h'].every(k => isFinite(f.bbox[k])))),
    `audit.run(${sheet}) findings are well-formed`);
}

// ---- 5. audit of non-current sheet restores globals & warnings ----
const warnLenBefore = evalIn('window.__LAYOUT_WARNINGS ? window.__LAYOUT_WARNINGS.length : -1');
audit.run('S2');
ok(evalIn('currentSheet') === 'S1', 'currentSheet restored to S1 after audit.run(S2)');
ok(evalIn('!!G["d-003"]') === true, 'G[] restored to S1 devices after audit.run(S2)');
const warnLenAfter = evalIn('window.__LAYOUT_WARNINGS ? window.__LAYOUT_WARNINGS.length : -1');
ok(warnLenBefore === warnLenAfter, `__LAYOUT_WARNINGS length unchanged by audit (${warnLenBefore} -> ${warnLenAfter})`);

// ---- 6. golden case is clean (errors none; S2 has the 2 known info warnings) ----
const a1 = audit.run('S1'), a2 = audit.run('S2');
ok(a1.ok && a1.findings.length === 0, 'S1 audit clean (0 findings)');
ok(a2.ok && a2.findings.every(f => f.type === 'layout_warning') && a2.counts.layout_warnings === 2,
   'S2 audit clean except 2 known layout_warning infos');

// ---- 6b. unknown / non-string sheet id is rejected, not silently clean (A1c-1/A1c-2) ----
const bogus = audit.run('S9');
ok(bogus.ok === false && bogus.error === 'unknown sheet' && bogus.sheetId === 'S9' &&
   bogus.findings.length === 0,
   'audit.run(S9) unknown sheet -> ok:false + error, not false-clean');
const numArg = audit.run(123);
ok(numArg.ok === false && numArg.error === 'unknown sheet',
   'audit.run(123) non-string sheet id rejected');
ok(audit.run('S1').ok === true && audit.run('S1').error === undefined,
   'valid sheet still audits normally after guard');

// ---- 7. detection primitives actually detect ----
ok(sandbox._auditSegHitsBox(0, 5, 10, 5, { x: 4, y: 0, w: 2, h: 10 }, 0) === true,
   'segment through box detected');
ok(sandbox._auditSegHitsBox(0, 20, 10, 20, { x: 4, y: 0, w: 2, h: 10 }, 0) === false,
   'segment missing box not detected');
ok(sandbox._bboxOverlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }, -2) === true,
   'overlapping boxes detected (with tolerance)');
ok(sandbox._bboxOverlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 11, y: 0, w: 10, h: 10 }, -2) === false,
   'separated boxes not flagged');
const te = sandbox._auditTextExtent('<text x="0" y="10" font-size="10" text-anchor="start">HELLO</text>');
ok(te && Math.abs(te.w - 30) < 1e-9 && Math.abs(te.y - 2) < 1e-9 && Math.abs(te.h - 10.5) < 1e-9,
   'monospace text extent math (5 chars * 10px * 0.6)');

// ---- 8. markup helpers ----
const nested = '<rect/><g class="fc-pennant" data-id="p1" transform="translate(5,7) rotate(-30)"><g><rect x="1"/></g><text x="2" y="3">T</text></g><g data-id="p2"></g>';
const slice = sandbox.sliceBalancedGroup(nested, 'p1');
ok(slice && slice.startsWith('<g class="fc-pennant"') && slice.endsWith('</g>') &&
   slice.includes('<text'), 'sliceBalancedGroup balances nested <g>');
ok(sandbox.sliceBalancedGroup(nested, 'nope') === null, 'sliceBalancedGroup returns null for missing id');
const routes = sandbox.harvestRoutesFromMarkup(
  '<g class="feeder" data-id="f1" transform="translate(10,20)"><polyline points="0,0 5,5"/></g>' +
  '<g class="bus" data-id="b1"><line x1="1" y1="2" x2="3" y2="4"/><line x1="1" y1="2" x2="3" y2="4"/></g>');
ok(routes.f1 && routes.f1[0].x === 10 && routes.f1[0].y === 20 &&
   routes.f1[1].x === 15 && routes.f1[1].y === 25, 'harvestRoutes applies group translate to polyline');
ok(routes.b1 && routes.b1.length === 2 && routes.b1[1].x === 3, 'harvestRoutes reads bus <line> fallback');
const routesSp = sandbox.harvestRoutesFromMarkup(
  '<g class="feeder" data-id="fs" transform="translate(10 20)"><polyline points="0 0 5 5"/></g>');
ok(routesSp.fs && routesSp.fs.length === 2 &&
   routesSp.fs[0].x === 10 && routesSp.fs[0].y === 20 &&
   routesSp.fs[1].x === 15 && routesSp.fs[1].y === 25,
   'harvestRoutes parses space-separated points and translate(x y)');

// ---- 9. KEYMAP wiring ----
const keys = evalIn('Object.keys(KEYMAP)');
ok(keys.includes('l') && keys.includes('v'), "KEYMAP has 'l' and 'v' entries");
let helpThrew = false;
try { sandbox.showHelpOverlay(); } catch (e) { helpThrew = true; console.log('  showHelpOverlay threw: ' + e.message); }
const helpHtml = (cache['help-overlay-body'] && cache['help-overlay-body'].innerHTML) || '';
ok(!helpThrew && helpHtml.includes('Snapshot last-clicked element') &&
   helpHtml.includes('audit overlay'), "help overlay lists the 'l' and 'v' shortcuts");

// ---- 10. click simulation sets lastClickedElementId (listener capture) ----
const svgEl = cache['sld-svg'];
const clickFns = (svgEl._listeners && svgEl._listeners.click) || [];
ok(clickFns.length > 0, 'bindClickToCopy registered a click listener on #sld-svg');
if (clickFns.length) {
  const fake = {
    classList: { contains: c => c === 'dev' },
    dataset: { id: 'd-003' },
    getAttribute: k => (k === 'data-id' ? 'd-003' : null),
    parentNode: svgEl,
  };
  clickFns.forEach(fn => { try { fn({ target: fake, clientX: 0, clientY: 0, stopPropagation() {} }); } catch (e) { console.log('  (click handler threw: ' + e.message + ')'); } });
  ok(evalIn('lastClickedElementId') === 'd-003', "click on dev group sets lastClickedElementId = 'd-003'");
}

// ---- 11. UI entry points survive the headless shim ----
let threw = false;
try { sandbox.toggleAuditOverlay(); } catch (e) { threw = true; console.log('  toggleAuditOverlay(on) threw: ' + e.message); }
const panel = cache['audit-panel'];
ok(!threw && panel && panel.innerHTML.includes('Geometry Audit') && panel.style.display !== 'none',
   'Check ON fills and shows the audit findings panel');
try { sandbox.toggleAuditOverlay(); } catch (e) { threw = true; console.log('  toggleAuditOverlay(off) threw: ' + e.message); }
ok(!threw && panel.style.display === 'none', 'Check OFF hides the audit findings panel');
ok(!threw, 'toggleAuditOverlay on+off does not throw headlessly');
threw = false;
try { sandbox.snapshotElementPng(); } catch (e) { threw = true; console.log('  snapshotElementPng threw: ' + e.message); }
ok(!threw, 'snapshotElementPng does not throw headlessly');

// ---- 12. transform algebra behind the extent scan (FU-0008) ----
// Unit-level, because the sheet-level assertion in 13/14 can only tell you THAT
// a frame is wrong, never which primitive got it wrong.
const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t;
const mEq = (m, e, t = 1e-9) => Array.isArray(m) && m.length === 6 && m.every((v, i) => near(v, e[i], t));
ok(mEq(sandbox._mmeTransform('translate(10,20)'), [1, 0, 0, 1, 10, 20]), '_mmeTransform translate');
ok(mEq(sandbox._mmeTransform('scale(2)'), [2, 0, 0, 2, 0, 0]), '_mmeTransform scale(s) is uniform');
ok(mEq(sandbox._mmeTransform('rotate(90)'), [0, 1, -1, 0, 0, 0], 1e-12), '_mmeTransform rotate(90)');
{
  // rotate(a,cx,cy) must leave its own centre fixed — the form the renderers
  // emit for the A-1 tick arc, and the one a naive rotate() silently moves.
  const m = sandbox._mmeTransform('rotate(30, 345, 4890)');
  const x = m[0] * 345 + m[2] * 4890 + m[4], y = m[1] * 345 + m[3] * 4890 + m[5];
  ok(near(x, 345, 1e-6) && near(y, 4890, 1e-6), '_mmeTransform rotate(a,cx,cy) fixes its centre');
}

// ---- 13. measureMarkupExtent bounds a pennant by its INK, not by its digits ----
// THE FL-0007 REGRESSION TEST. The old step 1 bounded a transformed group by a
// ±r square where r was the largest NUMBER anywhere in the group's markup, so
// this exact pennant claimed ±837 px around its anchor — x 163..1837 instead of
// 1000..1093. If this check ever goes red with a ~1674 px width, the scrape is
// back. Numbers below are hand-derived from the geometry, not from a run:
//   path  x 0..93,  y -10.5..10.5
//   text  7 glyphs * 12px * 0.6 = 50.4 wide, anchored middle at x=53 -> 27.8..78.2
//         y 4 - 12*0.8 = -5.6 .. 4 + 12*0.25 = 7      (inside the path box)
const PENNANT_BODY =
  '<path d="M0,0 L13,-10.5 L93,-10.5 L93,10.5 L13,10.5 Z" fill="none" stroke-width="2.5"/>' +
  '<text x="53" y="4" text-anchor="middle" font-size="12" font-weight="700">41,837A</text>';
{
  const e = sandbox.measureMarkupExtent(
    '<g class="fc-pennant" data-id="p1" transform="translate(1000,2000)">' + PENNANT_BODY + '</g>',
    { noAnchors: true });
  ok(e && e.minX === 1000 && e.maxX === 1093 && e.minY === 1989.5 && e.maxY === 2010.5,
     'extent of a translated pennant is its ink (1000..1093 x 1989.5..2010.5), not ±837');
}
{
  // Mirror + rotate: the pennant forms that actually ship. A circumscribed
  // bound is allowed (FU-0008 §2); an inflated one is not.
  const e = sandbox.measureMarkupExtent(
    '<g transform="translate(1000,2000) rotate(-30) scale(1,-1)">' + PENNANT_BODY + '</g>',
    { noAnchors: true });
  ok(e && (e.maxX - e.minX) < 120 && (e.maxY - e.minY) < 120,
     `rotated+mirrored pennant stays ~100px (got ${e ? (e.maxX - e.minX).toFixed(1) : '?'} x ${e ? (e.maxY - e.minY).toFixed(1) : '?'})`);
}
{
  // Nested transformed groups compose. The old step 1's non-greedy </g> stopped
  // at the INNER close tag and spilled the rest into the parent frame.
  const e = sandbox.measureMarkupExtent(
    '<g transform="translate(100,200)"><g transform="translate(10,20)">' +
    '<line x1="0" y1="0" x2="10" y2="0"/></g></g>', { noAnchors: true });
  ok(e && e.minX === 110 && e.maxX === 120 && e.minY === 220 && e.maxY === 220,
     'nested transformed groups compose (translate 100,200 then 10,20)');
}

// ---- 14. every golden sheet's viewBox is HONEST about its own ink (FU-0008) ----
// FL-0007 §6: no gate compared the frame to the content. G1 checks anchors,
// G5/G6 check PNGs against baselines rendered with the same defect, and
// `--audit out_of_frame` only fires when ink escapes — a frame that is too
// LARGE passes it trivially. This is the missing direction, and it is why a
// re-blessed baseline can now be defended as correct rather than merely new.
for (const sheet of snap.sheetIds()) {
  const r = snap.core(sheet, { theme: 'dark' });
  const h = frameHonesty(r.svg);
  ok(h.ok, `${sheet} viewBox minus the 120px pad == true ink extent ` +
           `(worst side ${h.worst === undefined ? h.reason : h.worst.toFixed(2)}px, tol ${h.tol}px)` +
           (h.ok ? '' : `  L/T/R/B ${h.slack.l.toFixed(1)}/${h.slack.t.toFixed(1)}/` +
                        `${h.slack.r.toFixed(1)}/${h.slack.b.toFixed(1)}  drivers ` +
                        `minX=${h.drivers.minX} minY=${h.drivers.minY} maxX=${h.drivers.maxX} maxY=${h.drivers.maxY}`));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
