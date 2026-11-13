#!/usr/bin/env node
// Test Mat — 4000A, 5-storey office. Authored project composition. Regenerate with bash ../run_pipeline.sh.
// Service skeleton follows the canonical default; project-specific feeders are looked up below.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.resolve(HERE,'../2_build');
const REPO=path.resolve(HERE,'../../..');
const read=(n)=>JSON.parse(fs.readFileSync(path.join(REPO,'07_data/normalized',n+'_V1_0_0.json'),'utf8'));
const schedule=read('feeder_schedule');
const txSchedule=read('3_phase_transformer_feeder_schedule');
const impedance=read('transformer_impedance');
const topo={
  "$schema": "sld_topology/v1",
  "metadata": {
    "schema_version": "1.0.0",
    "project_name": "Test Mat — 4000A Office / Five Levels",
    "created_date": "2026-11-13",
    "slug": "testmat",
    "heading": "4000A Office · 480Y/277V · Five Levels",
    "facts": [
      "3000 kVA utility xfmr · 480Y/277V · 3PH 4W · 4000A GFP main",
      "Five-storey office · 4 power / 1 lighting / 2 mechanical risers",
      "Twenty 75 kVA step-down transformers (one per power riser per floor) · 208Y/120V"
    ],
    "created_by": "Claude",
    "checked_by": null,
    "revised_date": null,
    "nec_edition": "2023",
    "sheet_template": "30x42",
    "px_per_inch": 96,
    "data_layer_versions": {
      "sld_sheet_templates": "V1_0_0",
      "feeder_schedule": "V1_0_0",
      "3_phase_transformer_feeder_schedule": "V1_0_0",
      "transformer_impedance": "V1_0_0",
      "equipment_designation_legend": "V1_0_0",
      "nec_standard_ratings": "V1_0_0"
    },
    "compositor_halts": [],
    "compositor_notes": []
  },
  "sheets": [
    {
      "sheet_id": "S1",
      "sheet_number": "E-501",
      "title": "MAIN SINGLE-LINE DIAGRAM — NORMAL POWER"
    }
  ],
  "devices": [
    {
      "id": "d-301",
      "node_type": "L0-1",
      "designation": "UTILITY-XFMR",
      "sheet_id": "S1",
      "data_fields": {
        "kva_rating": 3000,
        "primary_voltage": "13.2kV",
        "secondary_voltage": "480Y/277V",
        "phases": 3,
        "wires": 4
      },
      "calc_fields": {
        "pct_z": null,
        "x_over_r": null
      }
    },
    {
      "id": "d-302",
      "node_type": "L1-4",
      "designation": "UTIL-MTR",
      "sheet_id": "S1",
      "data_fields": {
        "meter_type": "utility"
      }
    },
    {
      "id": "d-303",
      "node_type": "L1-1",
      "designation": "MAIN-GFP",
      "sheet_id": "S1",
      "data_fields": {
        "af": 4000,
        "at": 4000,
        "poles": 3,
        "trip_type": "LSIG"
      }
    },
    {
      "id": "d-304",
      "node_type": "L1-3",
      "designation": "NG-BOND",
      "sheet_id": "S1",
      "data_fields": {
        "sds": "service_entrance"
      }
    }
  ],
  "routed_elements": [
    {
      "id": "r-391",
      "edge_type": "R-2",
      "designation": "main-bus-4MSB-1-A",
      "sheet_id": "S1",
      "bus_level": "main",
      "stroke_weight": 2.5,
      "start": null,
      "end": null,
      "stub_exempt": null,
      "data_fields": {},
      "calc_fields": {
        "bus_rating": 4000
      },
      "annotation_ids": []
    },
    {
      "id": "r-392",
      "edge_type": "R-2",
      "designation": "sec-bus-4MSB-1-A",
      "sheet_id": "S1",
      "bus_level": "secondary",
      "stroke_weight": 2,
      "start": null,
      "end": null,
      "stub_exempt": null,
      "data_fields": {},
      "calc_fields": {
        "bus_rating": 4000
      },
      "annotation_ids": []
    }
  ],
  "annotations": [],
  "switchboards": [
    {
      "id": "sw-201",
      "designation": "4MSB-1-A",
      "variant": "NP",
      "bus_architecture": "two-level",
      "sheet_id": "S1",
      "data_fields": {
        "rating": "4000A",
        "voltage": "480Y/277V",
        "wires": "4W, 3PH"
      },
      "secondary_bus_overflow_ids": [],
      "main_bus_id": "r-391",
      "secondary_bus_id": "r-392",
      "distribution_bus_id": null
    }
  ],
  "sections": [
    {
      "id": "sec-201",
      "switchboard_id": "sw-201",
      "type": "incoming",
      "order": 1,
      "nec_class": null,
      "section_tag": "SEC-1",
      "device_ids": []
    },
    {
      "id": "sec-202",
      "switchboard_id": "sw-201",
      "type": "metering",
      "order": 2,
      "nec_class": null,
      "section_tag": "SEC-2",
      "device_ids": [
        "d-302"
      ]
    },
    {
      "id": "sec-203",
      "switchboard_id": "sw-201",
      "type": "main_breaker",
      "order": 3,
      "nec_class": null,
      "section_tag": "SEC-3",
      "device_ids": [
        "d-303"
      ]
    }
  ],
  "port_assignments": [
    {
      "id": "pa-301",
      "device_id": "d-303",
      "port": "line_in",
      "bus_id": "r-391"
    },
    {
      "id": "pa-302",
      "device_id": "d-303",
      "port": "bus_out",
      "bus_id": "r-392"
    }
  ],
  "spur_attachments": [],
  "measurement_attachments": [
    {
      "id": "meas-301",
      "device_id": "d-302",
      "host_routed_element_id": "r-391",
      "mode": "ct",
      "position": "incoming_section"
    }
  ],
  "cross_sheet_refs": []
};
const SLUG=topo.metadata.slug;
const LEVELS=[1,2,3,4,5];
const cfg={
  sheet_roles:{S1:'normal'},sheet_skips:{},floor_order:{S1:['5','4','3','2','1']},
  floor_anchors:{},floor_anchors_mechanical:{},floor_band_designations:[],
  level_map:{},level_order:['5','4','3','2','1'],riser_step_standard:1200,
  ats_xoffset_overrides:{},subfeed_max_depth:5,
  subfeed_start_ports:['feed_top','feed_bottom'],subfeed_src_types:['L2-4'],subfeed_dst_types:['L2-4'],
  subfeed_straighten:[],subfeed_exit_x_nudge:{},internal_chain_exit_nudge:{},chain_column_nudge:{},
  s2_level_line_pitch:{},s2_shift_delta:{},subfeed_midy_nudge:{},
  a1_tag_placement:{},a3_text_placement:{},fc_pennant_placement:{},fc_pennant_y_nudges:{}
};
let di=400,ri=400,ai=800,pi=400;
const device=(type,designation,data,calc)=>{
  const d={id:'d-'+(++di),node_type:type,designation,sheet_id:'S1',data_fields:data};
  if(calc)d.calc_fields=calc;
  topo.devices.push(d);return d;
};
function lookup(tag){
  const row=schedule.configurations.flatMap(c=>c.feeders).find(f=>f.tag===tag);
  if(!row)throw new Error('DATA_LOOKUP_MISS: '+tag);
  return row;
}
function feeder(src,sp,dst,dp,tag,{service=false,secondary=false,sbj=null}={}){
  const f=lookup(tag.replace(/T$/,''));
  const pc=f.phase_conductors,g=f.ground_conductor;
  const r={id:'r-'+(++ri),edge_type:'R-1',designation:'F-'+ri,sheet_id:'S1',
    start:{device_id:src.id,port:sp},end:{device_id:dst.id,port:dp},stub_exempt:false,
    data_fields:service?{is_service_entrance:true}:{},
    calc_fields:{conductor_material:pc.material,conductor_size:pc.size,
      conductors_per_phase:pc.quantity,neutral_size:pc.quantity===4?pc.size:null,
      ground_size:secondary&&sbj?sbj.replace(/^#/, '').replace(' AWG',''):g.size,ground_material:secondary?'CU':g.material,conduit_type:'EMT',
      conduit_size:f.conduit_size_min,num_sets:f.number_of_sets},annotation_ids:[]};
  const add=(type,content)=>{const id='a-'+(++ai);topo.annotations.push({id,annotation_type:type,bound_to:r.id,bound_to_type:'routed_element',sheet_id:'S1',content});r.annotation_ids.push(id);};
  const fmt=(size)=>Number(size)<=4?'#'+size:size;
  const prefix=f.number_of_sets>1?'('+f.number_of_sets+') ':'';
  const ground=sbj?sbj.replace(' AWG','')+' CU SBJ':fmt(g.size)+' '+g.material+' GND';
  if(!service)add('A-1',{tag_text:tag});
  add('A-2',{callout_text:prefix+f.conduit_size_min+'C - ('+pc.quantity+')'+fmt(pc.size)+' '+pc.material+' + '+ground});
  topo.routed_elements.push(r);return r;
}
feeder(topo.devices[0],'secondary_out',topo.devices[2],'line_in','40004',{service:true});

// Bus order, left to right. Power (transformer-tapped) columns are interleaved with
// non-transformer columns so no two tap clusters sit side by side (07 narrative §3 note).
// [kind, letter, riser amps, step-down kVA per floor or null]
const TX_KVA=75;
const branches=[['P','A',600,TX_KVA],['M','A',600,null],['P','B',600,TX_KVA],['L','A',225,null],
  ['P','C',600,TX_KVA],['M','B',600,null],['P','D',600,TX_KVA]];
const txRow=txSchedule.transformers.find(t=>t.kva===TX_KVA);
const txZ=impedance.transformers.find(t=>t.kva===TX_KVA);
if(!txRow||!txZ)throw new Error('DATA_LOOKUP_MISS transformer '+TX_KVA);
for(const [kind,letter,amps,kva] of branches){
  const key=kind+letter;
  const cb=device('L2-1','CB-'+key,{af:amps<=250?250:600,at:amps,poles:3,trip_type:'LSI'});
  topo.port_assignments.push({id:'pa-'+(++pi),device_id:cb.id,port:'bus_out',bus_id:'r-392'});
  topo.sections.push({id:'sec-'+(210+topo.sections.length),switchboard_id:'sw-201',type:'distribution',order:topo.sections.length+1,nec_class:null,section_tag:key,device_ids:[cb.id]});
  const space=device('L2-7','SPACE-'+key,{kind:'space'});
  topo.sections.at(-1).device_ids.push(space.id);
  let parent=cb;
  for(const level of LEVELS){
    const panel=device('L2-4',`4${kind}-${level}-${letter}`,{rating:amps+'A',voltage:'480Y/277V',mlo:true});
    cfg.floor_band_designations.push(panel.designation);cfg.level_map[panel.designation]=String(level);
    const f=feeder(parent,level===1?'line_in':'feed_top',panel,level===1?'feed_top':'feed_bottom',amps+'4');
    if(level>1)cfg.subfeed_straighten.push(f.designation);
    // Riser leaving a tapped panel exits east of the tap's internal-chain exit (OFF-018 / OFF-014),
    // so the horizontal primary run never crosses the continuing riser.
    if(level>1&&kva)cfg.subfeed_exit_x_nudge[f.designation]=20;
    parent=panel;
    if(!kva)continue;
    // Floor step-down tap: internal primary breaker in this floor's 480V power panel ->
    // 75 kVA 480Δ-208Y/120V -> 250A MCB 208V panel (secondary OCPD per NEC 240.21(C)).
    const pri=txRow.primary.ocpd.rating_a;
    const tcb=device('L2-1',`CB-T-${level}-${key}`,{af:pri<=250?250:400,at:pri,poles:3,trip_type:'LSI',internal_to:panel.designation});
    const tx=device('L2-2',`4T-${level}-${key}`,{kva,config:'480Δ-208Y/120V'},{pct_z:txZ.percent_z.midpoint,x_over_r:txZ.x_over_r.midpoint});
    const low=device('L2-4',`2${kind}-${level}-${letter}`,{rating:txRow.secondary.ocpd.rating_a+'A',voltage:'208Y/120V',mcb:true});
    cfg.level_map[tx.designation]=String(level);cfg.level_map[low.designation]=String(level);
    cfg.internal_chain_exit_nudge[panel.designation]=-24;
    cfg.chain_column_nudge[low.designation]=-180;
    feeder(tcb,'line_in',tx,'primary_in',txRow.primary.one_line_tag);
    feeder(tx,'secondary_out',low,'feed_top',txRow.secondary.one_line_tag,{secondary:true,sbj:txRow.bonding_jumper});
  }
}
topo.sections.at(-1).device_ids.push('d-304');
const halt=(id,topic,text,nec_reference,blocks)=>({id,topic,text:'COMPOSITOR_HALT: '+text,nec_reference,blocks});
topo.metadata.compositor_halts=[
 halt('HALT-001','Utility fault current and AIC','Utility available fault current has not been supplied. AIC/SCCR and bus bracing remain unset.','NEC 110.9 / 110.10 / 110.24','Fault study and equipment interrupting ratings'),
 halt('HALT-002','Utility transformer nameplate','Utility primary voltage, kVA, impedance and X/R require confirmation. 13.2kV / 3000kVA is a coordination placeholder, not a confirmed utility design.',null,'Utility interface and fault study'),
 halt('HALT-003','Feeder lengths and installation','Riser route lengths (5 storeys), ambient temperature, grouping and installation conditions are unknown. No voltage-drop or derating calculation has been performed.','NEC 215.2 / 310.15','Voltage drop and final conductor sizing'),
 halt('HALT-004','Loads and protection coordination','No connected/demand load schedule or mechanical MCA/MOCP supplied. Riser, panel and transformer ratings are preliminary allowances; verify cumulative riser loading (5 x 75kVA = 375kVA, 451A connected per power riser), continuous loads, coordination and equipment suitability.','NEC 220 / 215.2 / 430 / 440','Final load calculation and branch protection'),
 halt('HALT-005','Transformer secondary conductors and bonding','Verify each of the 20 transformer secondary conductor lengths/routing and panel-main location for NEC 240.21(C), and complete each separately derived system grounding/bonding detail.','NEC 240.21(C) / 250.30 / 450.3(B)','Secondary conductor protection and SDS installation')
];
topo.metadata.compositor_notes=[
 {id:'NOTE-001',topic:'Scope interpretation',text:'Owner brief: 4000A service, 5-storey office, 4 power / 1 lighting / 2 mechanical branches, step-down transformers, no emergency power. Each branch = one switchboard feeder serving a 480V riser with one panel per floor (L1-L5). Each power riser taps a 75kVA 480Δ-208Y/120V transformer on every floor (20 total).',nec_reference:null},
 {id:'NOTE-002',topic:'Service',text:'480Y/277V selected (owner-confirmed). 3000kVA utility transformer: 3,000,000 / (480 x 1.732) = 3608A -> 4000A main (NEC 240.6(A)). 4000AF/4000AT LSIG main with GFP, utility metering, service N-G bond.',nec_reference:'NEC 230.95 / 250.24(C)'},
 {id:'NOTE-003',topic:'Equipment allowances',text:'Power risers 600A each (5 x 75kVA = 451A connected at 480V); mechanical risers 600A each; lighting riser 225A at 277V. 75kVA taps: 125A primary OCPD, 250A secondary MCB per the repository transformer schedule. Sum of feeder trips 3825A on a 4000A bus. One future feeder space per distribution bay (7 total). Allowances, not calculated demand loads.',nec_reference:'NEC 450.3(B)'},
 {id:'NOTE-004',topic:'Riser protection',text:'480V riser panels are MLO with feed-through lugs/full-rated bus and same-rated feeders throughout; the upstream switchboard breaker protects the riser. Specify listed arrangements and verify total downstream demand.',nec_reference:'NEC 215 / 240.4 / 408.36'},
 {id:'NOTE-005',topic:'Emergency power',text:'None per owner brief. No generator, ATS or fire pump. If a fire pump is later added it must be tapped ahead of the service main (NEC 695.4(B)); egress lighting then needs an NEC 700 source.',nec_reference:'NEC 695.4(B) / 700'},
 {id:'NOTE-006',topic:'Design status',text:'This SLD is for design development and coordination. It requires review and seal by a licensed Professional Engineer before construction use.',nec_reference:null}
];
topo.layout_config=cfg;
fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(path.join(OUT,SLUG+'_SLD_topology_V1_0_0.json'),JSON.stringify(topo,null,2)+'\n');
fs.writeFileSync(path.join(OUT,SLUG+'_layout_config.json'),JSON.stringify(cfg,null,2)+'\n');
console.log(`Built ${SLUG}: ${topo.devices.length} devices, ${topo.routed_elements.length} routes, ${branches.filter(b=>b[3]).length*LEVELS.length} floor step-downs.`);
