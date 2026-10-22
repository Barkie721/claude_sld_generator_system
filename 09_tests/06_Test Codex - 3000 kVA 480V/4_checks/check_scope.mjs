// Project acceptance: verify the requested electrical topology, independent of rendering.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const t=JSON.parse(fs.readFileSync(new URL('../2_build/codex3000_SLD_topology_V1_0_0__WITH_GEOMETRY.json',import.meta.url)));
const find=(name)=>{const d=t.devices.find(d=>d.designation===name);assert(d,`Missing ${name}`);return d;};
const connected=(a,b)=>t.routed_elements.some(r=>r.edge_type==='R-1'&&r.start?.device_id===a.id&&r.end?.device_id===b.id);
assert.equal(find('UTILITY-XFMR').data_fields.kva_rating,3000);
assert.equal(find('UTILITY-XFMR').data_fields.secondary_voltage,'480Y/277V');
assert.equal(find('MAIN-GFP').data_fields.at,4000);
assert.equal(t.devices.filter(d=>d.node_type==='L2-2').length,8);
assert.equal(t.devices.filter(d=>d.node_type==='L2-4'&&d.data_fields.voltage==='480Y/277V').length,32);
assert.equal(t.devices.filter(d=>d.node_type==='L2-4'&&d.data_fields.voltage==='208Y/120V').length,8);
for(const [kind,letters] of [['L','ABC'],['P','AB'],['M','ABC']])for(const letter of letters){
 const panels=[1,2,3,4].map(level=>find(`4${kind}-${level}-${letter}`));
 for(let i=0;i<4;i++){
  assert.equal(panels[i].data_fields.voltage,'480Y/277V');
  assert.equal(t.layout_config.level_map[panels[i].designation],String(i+1));
  if(i)assert(connected(panels[i-1],panels[i]));
 }
 assert(connected(find(`CB-${kind}${letter}`),panels[0]));
 const tx=find(`4T-3-${kind}${letter}`),low=find(`2${kind}-3-${letter}`),cb=find(`CB-T-${kind}${letter}`);
 assert.equal(cb.data_fields.internal_to,panels[2].designation);
 assert.equal(t.layout_config.level_map[tx.designation],'3');
 assert.equal(t.layout_config.level_map[low.designation],'3');
 assert.equal(tx.data_fields.config,'480Δ-208Y/120V');
 assert(connected(cb,tx));assert(connected(tx,low));assert.equal(low.data_fields.mcb,true);
}
assert.deepEqual(t.geometry.level_lines.map(l=>l.level).sort(),['1','2','3','4']);
assert(!t.geometry.layout_warnings.some(w=>/DROP/.test(w)));
console.log('PASS: 3000 kVA / 480 V, 8 risers x 4 levels, 8 protected L3-only stepdowns, 480 V continuity through L4.');
