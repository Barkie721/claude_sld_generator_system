// ============================================================
// sld_engine.mjs  (AUTO-GENERATED — do not edit by hand)
// Source: 04_renderer/sld_viewer_engine_V1_0_0.html  (<script> body)
// Regenerate: node 04_renderer/gen_engine.mjs  (see README_engine.md)
//
// This is the hospital SLD layout engine extracted VERBATIM into a pure-JS
// module. The DOM is stubbed (buildSheet is DOM-free: it builds SVG as
// strings and records device anchors in the G[] registry). Route vertices
// are harvested from the returned markup with a faithful stack-based tag
// scan that mirrors exportGeometry()'s DOMParser querySelector semantics.
//
// The embedded TOPO is the hospital reference/demo (carries layout_config).
// buildGeometry(topoInput) swaps in an external topology when provided.
// ============================================================

// ---- Minimal DOM/global stubs (headless; layout path never touches DOM) ----
function _stubEl() {
  const el = {
    style:{}, dataset:{}, children:[], classList:{add(){},remove(){},contains(){return false}},
    setAttribute(){}, getAttribute(){return null}, hasAttribute(){return false},
    appendChild(){return _stubEl()}, insertBefore(){return _stubEl()}, removeChild(){},
    remove(){}, addEventListener(){}, removeEventListener(){}, querySelector(){return null},
    querySelectorAll(){return []}, getBoundingClientRect(){return {left:0,top:0,width:0,height:0}},
    getBBox(){return {x:0,y:0,width:0,height:0}}, focus(){}, click(){}, insertAdjacentHTML(){},
    innerHTML:'', textContent:'', firstChild:null, value:''
  };
  return el;
}
const document = {
  getElementById(){return _stubEl()}, querySelector(){return null}, querySelectorAll(){return []},
  createElement(){return _stubEl()}, createElementNS(){return _stubEl()},
  addEventListener(){}, removeEventListener(){}, body:_stubEl(), title:'', documentElement:_stubEl()
};
const window = {
  addEventListener(){}, removeEventListener(){}, matchMedia(){return {matches:false,addEventListener(){}}},
  localStorage:{getItem(){return null}, setItem(){}, removeItem(){}},
  getComputedStyle(){return {}}, requestAnimationFrame(){}, __sldDebug:false
};
const navigator = { clipboard:null };
const localStorage = window.localStorage;
class DOMParser { parseFromString(){ return { querySelectorAll(){return []} }; } }
class Blob { constructor(){} }
const URL = { createObjectURL(){return ''}, revokeObjectURL(){} };
// ---- end stubs ----

