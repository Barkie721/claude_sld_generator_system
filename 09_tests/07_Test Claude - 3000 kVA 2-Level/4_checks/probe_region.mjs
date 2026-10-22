// WHAT LIVES IN THIS BOX? — the interactive half of the checker suite.
//
//   node 4_checks/probe_region.mjs <sheet> <x0> <y0> <x1> <y1>
//   node 4_checks/probe_region.mjs S1 1280 3560 1760 3895
//
// Every check_*.mjs answers "is anything wrong"; none of them answers "what is
// ALREADY at the place I want to move this tag to", which is the question every
// nudge in 2_build/<slug>_layout_config.json actually turns on. It exists
// because the same answer got re-derived by hand four times in one project: it
// is what proved the natural east standoff was empty for ten A-1 pills (so
// their pill_dx entries could be DELETED rather than retuned), and what found
// the 85 px corridor three stub pills now sit in.
//
// Reports every feeder / bus / level-line SEGMENT, device and tag RECT, and TEXT
// anchor overlapping the box, each with the designation that owns it. Scrapes the
// rendered light SVG, so snapshots must be current.
//
// ⚠️ Landing zones go stale. Columns moved in four of five consecutive phases on
// one project — re-probe before trusting any lane, including one this file's own
// comments call free.
import { loadProject, loadSVGs } from './check_lib.mjs';
const { t } = loadProject();
const reById={}; t.routed_elements.forEach(r=>reById[r.id]=r);
const SVG = loadSVGs(t);
const [SH,X0,Y0,X1,Y1] = [process.argv[2],+process.argv[3],+process.argv[4],+process.argv[5],+process.argv[6]];
const hit=(x,y)=>x>=X0&&x<=X1&&y>=Y0&&y<=Y1;
const svg = SVG[SH];
for (const g of svg.matchAll(/<g class="([a-z-]+)"([^>]*)>([\s\S]*?)<\/g>/g)) {
  const cls=g[1],attrs=g[2],body=g[3];
  const id=(attrs.match(/data-id="([^"]+)"/)||[])[1]||'';
  const des=reById[id]?reById[id].designation:id;
  const chains=[];
  const poly=body.match(/<polyline points="([^"]+)"/);
  if(poly) chains.push(poly[1].trim().split(/\s+/).map(q=>q.split(',').map(Number)));
  [...body.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)].forEach(m=>chains.push([[+m[1],+m[2]],[+m[3],+m[4]]]));
  if(cls==='feeder'||cls==='bus'||cls==='level-line'){
    for(const ch of chains) for(let i=0;i<ch.length-1;i++){
      const [a,b]=[ch[i],ch[i+1]];
      // segment vs box overlap (axis-aligned segs only here)
      if(Math.min(a[0],b[0])<=X1&&Math.max(a[0],b[0])>=X0&&Math.min(a[1],b[1])<=Y1&&Math.max(a[1],b[1])>=Y0)
        console.log(`  ${cls.padEnd(11)} ${des.padEnd(10)} [${a}] -> [${b}]`);
    }
  }
  for(const m of body.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)"/g)){
    const [x,y,w,h]=[+m[1],+m[2],+m[3],+m[4]];
    if(x<=X1&&x+w>=X0&&y<=Y1&&y+h>=Y0) console.log(`  ${cls.padEnd(11)} ${des.padEnd(10)} rect ${x},${y} ${w}x${h}`);
  }
  for(const m of body.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)"[^>]*>([^<]*)</g)){
    if(hit(+m[1],+m[2])) console.log(`  ${cls.padEnd(11)} ${des.padEnd(10)} text @${m[1]},${m[2]} "${m[3]}"`);
  }
}
