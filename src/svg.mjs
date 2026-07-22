// Build a single self-contained animated SVG: Pac-Man serpentines across the
// contribution grid, and each square fades out just as he reaches it.
// Light/dark is handled with a prefers-color-scheme media query, so one file
// works in both GitHub themes when embedded with <img>.

const CELL = 12; // square size
const GAP = 3; // gap between squares
const PITCH = CELL + GAP; // center-to-center distance
const MARGIN_X = 14;
const MARGIN_Y = 14;
const R = CELL * 0.85; // Pac-Man radius
const SECONDS_PER_CELL = 0.12; // travel speed (bigger = slower)
const CHOMP = 0.45; // seconds per full open/close cycle
const MOUTH_OPEN = 45; // widest mouth half-angle (degrees)
const MOUTH_SHUT = 2; // nearly-closed mouth half-angle (degrees)

const round = (n) => Math.round(n * 100) / 100;

const ROWS = 7;
const opposite = (r) => (r === 0 ? ROWS - 1 : 0);

const exists = (grid, w, d) => !!(grid[w] && grid[w][d]);

function neighbors(grid, w, d) {
  const out = [];
  if (exists(grid, w, d - 1)) out.push([w, d - 1]);
  if (exists(grid, w, d + 1)) out.push([w, d + 1]);
  if (exists(grid, w - 1, d)) out.push([w - 1, d]);
  if (exists(grid, w + 1, d)) out.push([w + 1, d]);
  return out;
}

// A genuinely random route: a Hamiltonian path found with Warnsdorff's rule
// (always step to the neighbour with the fewest onward moves, ties broken at
// random). Every step is to an orthogonally adjacent cell, so motion stays a
// continuous stream of 90-degree turns — up, down, left, right, no pattern.
// Returns null if a full-coverage path isn't found within `tries`.
function randomHamiltonian(grid, rand, tries) {
  const cells = [];
  for (let w = 0; w < grid.length; w++)
    for (let d = 0; d < ROWS; d++) if (exists(grid, w, d)) cells.push([w, d]);
  const total = cells.length;
  const start = cells[0];

  for (let t = 0; t < tries; t++) {
    const seen = new Set([`${start[0]},${start[1]}`]);
    const path = [start];
    let cur = start;
    for (;;) {
      const open = neighbors(grid, cur[0], cur[1]).filter(
        ([w, d]) => !seen.has(`${w},${d}`)
      );
      if (open.length === 0) break;
      let min = Infinity;
      let cands = [];
      for (const nb of open) {
        const deg = neighbors(grid, nb[0], nb[1]).filter(
          ([w, d]) => !seen.has(`${w},${d}`)
        ).length;
        if (deg < min) (min = deg), (cands = [nb]);
        else if (deg === min) cands.push(nb);
      }
      cur = cands[Math.floor(rand() * cands.length)];
      seen.add(`${cur[0]},${cur[1]}`);
      path.push(cur);
    }
    if (path.length === total) return path;
  }
  return null;
}

// Guaranteed fallback: chain random-width, random-orientation zig-zag zones.
// Each zone starts and ends on its right edge, so zones always connect.
function zonePath(grid, rand) {
  const W = grid.length;
  const order = [];
  let col = 0;
  let startRow = 0;

  while (col < W) {
    const width = 3 + Math.floor(rand() * 6); // 3..8 columns
    const c1 = Math.min(col + width, W);
    const w = c1 - col;
    const vertical = rand() < 0.5;

    if (vertical) {
      let sr = startRow;
      for (let c = col; c < c1; c++) {
        if (sr === 0) for (let d = 0; d < ROWS; d++) order.push([c, d]);
        else for (let d = ROWS - 1; d >= 0; d--) order.push([c, d]);
        sr = opposite(sr);
      }
      startRow = w % 2 === 1 ? opposite(startRow) : startRow;
    } else {
      const rowSeq =
        startRow === 0 ? [0, 1, 2, 3, 4, 5, 6] : [6, 5, 4, 3, 2, 1, 0];
      let dir = 1;
      for (const d of rowSeq) {
        if (dir === 1) for (let c = col; c < c1; c++) order.push([c, d]);
        else for (let c = c1 - 1; c >= col; c--) order.push([c, d]);
        dir = -dir;
      }
      startRow = opposite(startRow);
    }
    col = c1;
  }
  return order.filter(([w, d]) => exists(grid, w, d));
}

// "Backbite" shuffle: repeatedly take an end of the path, join it to a random
// grid-neighbour, and reverse the segment in between. Each move keeps the path
// a valid full-coverage Hamiltonian path but scrambles its shape, turning the
// tidy seed route into a chaotic up/down/left/right wander.
function backbite(grid, path, rand, moves) {
  const key = (c) => `${c[0]},${c[1]}`;
  const pos = new Map(path.map((c, i) => [key(c), i]));
  const n = path.length;
  const swap = (a, b) => {
    const t = path[a];
    path[a] = path[b];
    path[b] = t;
    pos.set(key(path[a]), a);
    pos.set(key(path[b]), b);
  };

  for (let m = 0; m < moves; m++) {
    const tail = rand() < 0.5;
    const end = tail ? path[n - 1] : path[0];
    const nbrs = neighbors(grid, end[0], end[1]);
    const j = pos.get(key(nbrs[Math.floor(rand() * nbrs.length)]));
    if (tail) {
      if (j >= n - 2) continue; // already adjacent
      for (let a = j + 1, b = n - 1; a < b; a++, b--) swap(a, b);
    } else {
      if (j <= 1) continue;
      for (let a = 0, b = j - 1; a < b; a++, b--) swap(a, b);
    }
  }
  return path;
}

export function pathOrder(grid) {
  const rand = Math.random;
  const seed = randomHamiltonian(grid, rand, 500) || zonePath(grid, rand);
  return backbite(grid, seed, rand, seed.length * 14);
}

const cx = (w) => MARGIN_X + w * PITCH + CELL / 2;
const cy = (d) => MARGIN_Y + d * PITCH + CELL / 2;

// Pac-Man wedge in local coords, pointing +x, mouth opening toward travel.
function pacPath(thetaDeg) {
  const t = (thetaDeg * Math.PI) / 180;
  const ux = round(R * Math.cos(t));
  const uy = round(-R * Math.sin(t));
  const lx = round(R * Math.cos(t));
  const ly = round(R * Math.sin(t));
  // large-arc=1 (go the long way, around the body), sweep=0 (decreasing angle
  // in SVG's y-down coords) so the wedge is Pac-Man and not an inverted bowtie.
  return `M0,0 L${ux},${uy} A${R},${R} 0 1,0 ${lx},${ly} Z`;
}

// Opacity keyframes for a square eaten at path-fraction `a` (0..1).
function eatAnim(a, fadeW, dur) {
  const t1 = round(a);
  const t2 = round(Math.min(a + fadeW, 1));
  let keyTimes, values;
  if (t1 <= 0) {
    keyTimes = `0;${t2 || 0.001};1`;
    values = `1;0;0`;
  } else if (t2 >= 1) {
    keyTimes = `0;${t1};1`;
    values = `1;1;0`;
  } else {
    keyTimes = `0;${t1};${t2};1`;
    values = `1;1;0;0`;
  }
  return `<animate attributeName="opacity" dur="${dur}s" repeatCount="indefinite" values="${values}" keyTimes="${keyTimes}"/>`;
}

export function buildSvg(grid) {
  const order = pathOrder(grid);
  const N = order.length;
  const dur = round(N * SECONDS_PER_CELL);
  const fadeW = 0.28 / N; // fade lasts ~0.28 of a cell's travel time

  const width = MARGIN_X * 2 + grid.length * PITCH - GAP;
  const height = MARGIN_Y * 2 + 7 * PITCH - GAP;

  // Index each cell by its position in the path so eat-time lines up with motion.
  const orderIndex = new Map();
  order.forEach(([w, d], i) => orderIndex.set(`${w},${d}`, i));

  const emptyCells = [];
  const squares = [];
  const pellets = [];
  for (let w = 0; w < grid.length; w++) {
    for (let d = 0; d < ROWS; d++) {
      const cell = grid[w][d];
      if (!cell) continue; // hole from a partial week
      const x = round(MARGIN_X + w * PITCH);
      const y = round(MARGIN_Y + d * PITCH);
      const i = orderIndex.get(`${w},${d}`);
      const a = N > 1 ? i / (N - 1) : 0;
      const eat = eatAnim(a, fadeW, dur);
      emptyCells.push(
        `<rect class="empty" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2"/>`
      );
      if (cell.level > 0) {
        // Busy days are "power tiles"; the busiest ones gently pulse.
        const pulse =
          cell.level === 4
            ? `<animate attributeName="opacity" dur="1s" repeatCount="indefinite" values="1;0.55;1" keyTimes="0;0.5;1"/>`
            : "";
        squares.push(
          `<rect class="l${cell.level}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2">${pulse}${eat}</rect>`
        );
      } else {
        // Empty days are maze corridors dotted with pellets for Pac to eat.
        pellets.push(
          `<circle class="pellet" cx="${round(x + CELL / 2)}" cy="${round(y + CELL / 2)}" r="1.6">${eat}</circle>`
        );
      }
    }
  }

  // Motion path through the cell centers.
  const motion =
    "M" + order.map(([w, d]) => `${round(cx(w))},${round(cy(d))}`).join(" L");

  const pac = `
  <g class="pac">
    <path d="${pacPath(MOUTH_SHUT)}">
      <animate attributeName="d" dur="${CHOMP}s" repeatCount="indefinite"
        calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
        values="${pacPath(MOUTH_SHUT)};${pacPath(MOUTH_OPEN)};${pacPath(MOUTH_SHUT)}"/>
    </path>
    <animateMotion dur="${dur}s" repeatCount="indefinite" rotate="auto"
      path="${motion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">
  <style>
    :root {
      --empty:#ebedf0; --l1:#9be9a8; --l2:#40c463; --l3:#30a14e; --l4:#216e39;
      --pac:#ffd93b; --pellet:#e0a92e;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --empty:#161b22; --l1:#0e4429; --l2:#006d32; --l3:#26a641; --l4:#39d353;
        --pac:#ffd93b; --pellet:#ffe08a;
      }
    }
    .empty { fill: var(--empty); }
    .l1 { fill: var(--l1); } .l2 { fill: var(--l2); }
    .l3 { fill: var(--l3); } .l4 { fill: var(--l4); }
    .pac { fill: var(--pac); }
    .pellet { fill: var(--pellet); }
  </style>
  <g>${emptyCells.join("")}</g>
  <g>${pellets.join("")}</g>
  <g>${squares.join("")}</g>
  ${pac}
</svg>`;
}
