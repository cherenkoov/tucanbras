// Extracts house 4 / house 6 footprints from the SVG and reports, per track,
// the progress ranges where the figure's path lies inside each house bbox.
// Cross-checks the hand-placed markers against the real occlusion arcs.

import { readFileSync } from 'node:fs';

const SVG = readFileSync(
  new URL('../public/SVG/background/background human track + markers.svg', import.meta.url),
  'utf8'
);

const TRACKS = {
  'human 1':
    'M541.5 1431L645.5 1564L683 1525L464.5 1324.5C441.333 1323.83 389.2 1317.2 366 1296C337 1269.5 335 1265 335 1261C335 1257 339.5 1239 323.5 1239.5C307.5 1240 231 1251 214.5 1259C198 1267 160.5 1224 159 1176C161.8 1164 167.833 1156.67 170.5 1154.5C173.167 1152.33 164.5 1196 164.5 1196L88 1133L47 1176C62.8333 1183.17 95.4 1194.4 99 1182C103.5 1166.5 136.972 1158.86 149 1176C161.028 1193.14 179 1239 170.5 1267.5C163.7 1290.3 282.167 1236.5 323.5 1236.5L345.5 1279C408.167 1318.23 458.5 1313.11 482 1332C505.5 1350.89 541.5 1431 541.5 1431Z',
  'human 2':
    'M573.5 1445.5L461 1316.5C422 1308.17 342.8 1289.5 338 1281.5C332 1271.5 254 1300.5 267 1314C280 1327.5 398.5 1283.5 422.5 1304.5C441.7 1321.3 583.5 1416.5 652 1462L602 1505L587.75 1475.25L573.5 1445.5Z',
  'human 3':
    'M333.5 1295.5L422.5 1307L609.5 1530.5L660 1500.5L457 1329.5L417.5 1320.5C401.833 1312.83 365.5 1293.6 345.5 1278C320.5 1258.5 333.5 1208 345.5 1193.5C357.5 1179 398 1191 417.5 1196.5C437 1202 423.5 1211 410.5 1223.5C400.1 1233.5 374.167 1227.67 362.5 1223.5C354.333 1225 337.1 1230.4 333.5 1240C328.999 1252 336.5 1259.5 338 1270C339.2 1278.4 321.5 1282.5 312.5 1283.5C312.5 1283.5 275.836 1295.8 276 1314.5C276.205 1337.91 333.5 1295.5 333.5 1295.5Z',
  'human 4':
    'M174.463 1231.94C172.925 1232.87 130.6 1164.6 107 1155C77.5001 1143 46.5001 1130 47.0001 1124C47.5001 1118 90.5001 1123.5 107 1134.5C123.5 1145.5 133.5 1155 156 1176C178.5 1197 150.5 1148 174.5 1134.5C198.5 1121 199.5 1147 235 1151.5C263.4 1155.1 253.333 1157.67 244 1167C232.333 1169.17 205.3 1169.8 190.5 1155C175.7 1140.2 165.667 1153.83 162.5 1162.5V1196.5C167.172 1210.34 176 1231 174.463 1231.94Z',
};

const MARKERS = {
  'human 1': [{ id: 'red', color: 'R', x: 552, y: 1444 }],
  'human 2': [{ id: 'red_4', color: 'R', x: 554, y: 1423 }],
  'human 3': [
    { id: 'red_2', color: 'R', x: 334, y: 1295 },
    { id: 'blue', color: 'B', x: 335, y: 1237 },
    { id: 'red_3', color: 'R', x: 332, y: 1230 },
  ],
  'human 4': [
    { id: 'blue_2', color: 'B', x: 167, y: 1154 },
    { id: 'red_5', color: 'R', x: 173, y: 1136 },
  ],
};

// ---- path flatten (shared) ----
function tokenize(d) {
  const out = [];
  const re = /([MLHVCSQTAZ])|(-?\d*\.?\d+(?:e-?\d+)?)/gi;
  let m;
  while ((m = re.exec(d))) out.push(m[1] ? m[1] : parseFloat(m[2]));
  return out;
}
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t, a = u*u*u, b = 3*u*u*t, c = 3*u*t*t, e = t*t*t;
  return { x: a*p0.x+b*p1.x+c*p2.x+e*p3.x, y: a*p0.y+b*p1.y+c*p2.y+e*p3.y };
}
const STEPS = 60;
function flatten(d) {
  const t = tokenize(d); const pts = [];
  let i=0, cur={x:0,y:0}, start={x:0,y:0}, cmd='';
  const push = p => pts.push({x:p.x,y:p.y});
  while (i < t.length) {
    if (typeof t[i] === 'string') cmd = t[i++];
    switch (cmd) {
      case 'M': cur={x:t[i++],y:t[i++]}; start={...cur}; push(cur); cmd='L'; break;
      case 'L': cur={x:t[i++],y:t[i++]}; push(cur); break;
      case 'H': cur={x:t[i++],y:cur.y}; push(cur); break;
      case 'V': cur={x:cur.x,y:t[i++]}; push(cur); break;
      case 'C': { const p1={x:t[i++],y:t[i++]}, p2={x:t[i++],y:t[i++]}, p3={x:t[i++],y:t[i++]};
        for (let s=1;s<=STEPS;s++) push(cubic(cur,p1,p2,p3,s/STEPS)); cur=p3; break; }
      case 'Z': push(start); cur={...start}; break;
      default: throw new Error('cmd '+cmd);
    }
  }
  return pts;
}

// ---- house bbox from the SVG group ----
function houseBBox(id) {
  const open = SVG.indexOf(`<g id="${id}">`);
  const close = SVG.indexOf('</g>', open);
  const block = SVG.slice(open, close);
  const ds = [...block.matchAll(/ d="([^"]+)"/g)].map(m => m[1]);
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const d of ds) for (const p of flatten(d)) {
    if (p.x<minX) minX=p.x; if (p.x>maxX) maxX=p.x;
    if (p.y<minY) minY=p.y; if (p.y>maxY) maxY=p.y;
  }
  return { minX, minY, maxX, maxY, n: ds.length };
}

const H4 = houseBBox('house 4');
const H6 = houseBBox('house 6');
const inside = (b,x,y) => x>=b.minX && x<=b.maxX && y>=b.minY && y<=b.maxY;

console.log('house 4 bbox', JSON.stringify(H4));
console.log('house 6 bbox', JSON.stringify(H6));

function ranges(name) {
  const pts = flatten(TRACKS[name]);
  // cumulative length for progress
  const cum=[0];
  for (let k=1;k<pts.length;k++) cum.push(cum[k-1]+Math.hypot(pts[k].x-pts[k-1].x, pts[k].y-pts[k-1].y));
  const total = cum[cum.length-1];
  const prog = i => (cum[i]/total)*100;
  console.log(`\n=== ${name}`);
  for (const [label,b] of [['house 4',H4],['house 6',H6]]) {
    let runs=[], runStart=null;
    for (let i=0;i<pts.length;i++){
      const hit = inside(b, pts[i].x, pts[i].y);
      if (hit && runStart===null) runStart=i;
      if (!hit && runStart!==null){ runs.push([runStart,i-1]); runStart=null; }
    }
    if (runStart!==null) runs.push([runStart,pts.length-1]);
    const txt = runs.length
      ? runs.map(([a,c])=>`${prog(a).toFixed(1)}%..${prog(c).toFixed(1)}%`).join(', ')
      : '(no overlap)';
    console.log(`   ${label}: ${txt}`);
  }
  // marker progress (nearest vertex)
  for (const m of MARKERS[name]) {
    let bi=0,bd=Infinity;
    for (let i=0;i<pts.length;i++){ const dd=Math.hypot(pts[i].x-m.x,pts[i].y-m.y); if(dd<bd){bd=dd;bi=i;} }
    console.log(`   marker ${m.color} ${m.id}: ${prog(bi).toFixed(1)}%`);
  }
}

for (const name of Object.keys(TRACKS)) ranges(name);
