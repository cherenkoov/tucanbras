// Convert layer-toggle marker circles -> progress % on their track, and identify
// each human's SMALL arc (the shorter span between its two markers). Source:
// public/SVG/background/background human track + markers.svg (updated model).
//
// Model: big arc = RED (human above house 4/5/6). small arc = the marked colour:
//   yellow = house4,house6 < human < house5 ; blue = human below house 4/5/6.

const TRACKS = {
  'human 1':
    'M543 1430.82L647 1563.82L684.5 1524.82L466 1324.32C442.833 1323.65 390.7 1317.02 367.5 1295.82C338.5 1269.32 336.5 1264.82 336.5 1260.82C336.5 1256.82 341 1238.82 325 1239.32C309 1239.82 232.5 1250.82 216 1258.82C199.5 1266.82 162 1223.82 160.5 1175.82C163.3 1163.82 169.333 1156.49 172 1154.32C174.667 1152.15 166 1195.82 166 1195.82L89.5 1132.82L48.5 1175.82C64.3333 1182.99 96.9 1194.22 100.5 1181.82C105 1166.32 138.472 1158.68 150.5 1175.82C162.528 1192.96 180.5 1238.82 172 1267.32C165.2 1290.12 198.667 1293 240 1293L322.5 1286.5C386 1291 460 1312.93 483.5 1331.82C507 1350.71 543 1430.82 543 1430.82Z',
  'human 2':
    'M575 1445.32L462.5 1316.32C423.5 1307.99 344.3 1289.32 339.5 1281.32C333.5 1271.32 255.5 1300.32 268.5 1313.82C281.5 1327.32 400 1283.32 424 1304.32C443.2 1321.12 585 1416.32 653.5 1461.82L603.5 1504.82L589.25 1475.07L575 1445.32Z',
  'human 3':
    'M335 1295.32L424 1306.82L611 1530.32L661.5 1500.32L458.5 1329.32L419 1320.32C403.333 1312.65 367 1293.42 347 1277.82C322 1258.32 335 1207.82 347 1193.32C359 1178.82 399.5 1190.82 419 1196.32C438.5 1201.82 425 1210.82 412 1223.32C401.6 1233.32 375.667 1227.49 364 1223.32C355.833 1224.82 340 1232 335 1239.82C328.095 1250.62 331.5 1254.5 333 1265C334.2 1273.4 323 1282.32 314 1283.32C314 1283.32 277.336 1295.62 277.5 1314.32C277.705 1337.74 335 1295.32 335 1295.32Z',
  'human 4':
    'M175.963 1231.76C174.425 1232.69 132.1 1164.42 108.5 1154.82C79.0001 1142.82 48.0001 1129.82 48.5001 1123.82C49.0001 1117.82 92.0001 1123.32 108.5 1134.32C125 1145.32 135 1154.82 157.5 1175.82C180 1196.82 152 1147.82 176 1134.32C200 1120.82 201 1146.82 236.5 1151.32C264.9 1154.92 254.833 1157.49 245.5 1166.82C233.833 1168.99 206.8 1169.62 192 1154.82C177.2 1140.02 167.167 1153.65 164 1162.32V1196.32C168.672 1210.16 177.5 1230.82 175.963 1231.76Z',
}

// per track, in document order; color: R(red) / B(blue) / Y(yellow)
const MARKERS = {
  'human 1': [
    { id: 'red', color: 'Y-pair-red', x: 346, y: 1275 },
    { id: 'red_2(yellow)', color: 'Y', x: 190, y: 1247 },
  ],
  'human 2': [{ id: 'red_4', color: 'R', x: 555.5, y: 1422.82 }],
  'human 3': [
    { id: 'blue', color: 'B', x: 337, y: 1237 },
    { id: 'red_3', color: 'R', x: 334, y: 1255 },
  ],
  'human 4': [
    { id: 'blue_2', color: 'B', x: 168.5, y: 1153.82 },
    { id: 'red_5', color: 'R', x: 174.5, y: 1135.82 },
  ],
}

function tokenize(d) {
  const out = []; const re = /([MLHVCSQTAZ])|(-?\d*\.?\d+(?:e-?\d+)?)/gi; let m
  while ((m = re.exec(d))) out.push(m[1] ? m[1] : parseFloat(m[2]))
  return out
}
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t, a = u*u*u, b = 3*u*u*t, c = 3*u*t*t, e = t*t*t
  return { x: a*p0.x+b*p1.x+c*p2.x+e*p3.x, y: a*p0.y+b*p1.y+c*p2.y+e*p3.y }
}
const STEPS = 400
function flatten(d) {
  const t = tokenize(d), pts = []
  let i=0, cur={x:0,y:0}, start={x:0,y:0}, cmd=''
  const push = p => { if (!pts.length || pts[pts.length-1].x!==p.x || pts[pts.length-1].y!==p.y) pts.push({x:p.x,y:p.y}) }
  while (i < t.length) {
    if (typeof t[i] === 'string') cmd = t[i++]
    switch (cmd) {
      case 'M': cur={x:t[i++],y:t[i++]}; start={...cur}; push(cur); cmd='L'; break
      case 'L': cur={x:t[i++],y:t[i++]}; push(cur); break
      case 'H': cur={x:t[i++],y:cur.y}; push(cur); break
      case 'V': cur={x:cur.x,y:t[i++]}; push(cur); break
      case 'C': { const p1={x:t[i++],y:t[i++]},p2={x:t[i++],y:t[i++]},p3={x:t[i++],y:t[i++]}
        for (let s=1;s<=STEPS;s++) push(cubic(cur,p1,p2,p3,s/STEPS)); cur=p3; break }
      case 'Z': push(start); cur={...start}; break
      default: throw new Error('cmd '+cmd)
    }
  }
  return pts
}
function cum(pts){const c=[0];for(let k=1;k<pts.length;k++)c.push(c[k-1]+Math.hypot(pts[k].x-pts[k-1].x,pts[k].y-pts[k-1].y));return c}
function nearest(pts,c,mx,my){let best={dist:Infinity,len:0}
  for(let k=1;k<pts.length;k++){const a=pts[k-1],b=pts[k],dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy
    let tt=L2?((mx-a.x)*dx+(my-a.y)*dy)/L2:0;tt=Math.max(0,Math.min(1,tt))
    const px=a.x+tt*dx,py=a.y+tt*dy,dist=Math.hypot(mx-px,my-py)
    if(dist<best.dist)best={dist,len:c[k-1]+tt*Math.hypot(dx,dy)}}
  return best}

for (const name of Object.keys(TRACKS)) {
  const pts = flatten(TRACKS[name]); const c = cum(pts); const total = c[c.length-1]
  console.log(`\n=== ${name} (len=${total.toFixed(1)})`)
  const progs = MARKERS[name].map(m => {
    const n = nearest(pts, c, m.x, m.y); const p = n.len/total
    console.log(`  ${m.color.padEnd(11)} ${m.id.padEnd(14)} (${m.x},${m.y}) -> ${(p*100).toFixed(2)}%  (snap ${n.dist.toFixed(2)})`)
    return p
  })
  if (progs.length === 2) {
    const [p1, p2] = [...progs].sort((a,b)=>a-b)
    const spanInside = p2 - p1          // arc that does NOT cross the seam
    const spanWrap = 1 - spanInside     // arc that crosses the seam
    if (spanInside <= spanWrap) {
      console.log(`  SMALL arc = [${p1.toFixed(3)}, ${p2.toFixed(3)}]  (len ${(spanInside*100).toFixed(1)}%, no wrap)`)
    } else {
      console.log(`  SMALL arc = [${p2.toFixed(3)}, 1.0] U [0, ${p1.toFixed(3)}]  (len ${(spanWrap*100).toFixed(1)}%, WRAPS seam)`)
    }
  }
}
