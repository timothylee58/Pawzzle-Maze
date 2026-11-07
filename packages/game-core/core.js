export const VERSION = 'maze-1';
export function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function neighbors(i, n) {
  return [
    i % n ? i - 1 : -1,
    i % n < n - 1 ? i + 1 : -1,
    i >= n ? i - n : -1,
    i < n * (n - 1) ? i + n : -1,
  ].filter((x) => x >= 0);
}
export function solve(g, start = 0, goal = g.length - 1, skip = []) {
  const q = [start],
    prev = new Map([[start, null]]);
  for (let k = 0; k < q.length; k++) {
    let u = q[k];
    if (u === goal) {
      const p = [];
      for (let v = u; v !== null; v = prev.get(v)) p.unshift(v);
      return p;
    }
    for (const v of g[u])
      if (!prev.has(v) && !(skip.includes(u) && skip.includes(v))) {
        prev.set(v, u);
        q.push(v);
      }
  }
  return [];
}
export function alternate(g) {
  const p = solve(g);
  return p.slice(1).some((v, i) => solve(g, 0, g.length - 1, [p[i], v]).length);
}
export function generate(n, seed) {
  const r = rng(seed);
  for (let trial = 0; trial < 200; trial++) {
    const g = Array.from({ length: n * n }, () => []),
      seen = new Set([0]),
      stack = [0];
    const open = (a, b) => {
      g[a].push(b);
      g[b].push(a);
    };
    while (stack.length) {
      const a = stack.at(-1),
        ns = neighbors(a, n).filter((x) => !seen.has(x));
      if (!ns.length) {
        stack.pop();
        continue;
      }
      const b = ns[Math.floor(r() * ns.length)];
      open(a, b);
      seen.add(b);
      stack.push(b);
    }
    for (let k = 0; k < n; k++) {
      let a = Math.floor(r() * n * n),
        ns = neighbors(a, n).filter((b) => !g[a].includes(b));
      if (ns.length) open(a, ns[Math.floor(r() * ns.length)]);
    }
    const optimal = solve(g);
    if (optimal.length - 1 > 2 * (n - 1) + 2 && alternate(g))
      return { n, g, seed, optimal, challengeId: `${VERSION}-${n}-${seed}` };
  }
  throw Error('Unable to generate maze');
}
export function move(path, cell, g) {
  if (!path.length || !g[path.at(-1)]?.includes(cell)) return path;
  const i = path.indexOf(cell);
  return i < 0 ? [...path, cell] : path.slice(0, i + 1);
}
export function valid(path, g) {
  return (
    path[0] === 0 &&
    path.at(-1) === g.length - 1 &&
    new Set(path).size === path.length &&
    path.slice(1).every((v, i) => g[path[i]].includes(v))
  );
}
export class Round {
  constructor(maze, now = 0) {
    this.maze = maze;
    this.start = now;
    this.deadline = now + 60000;
    this.status = 'active';
    this.attempts = 0;
    this.best = null;
  }
  submit(path, now) {
    if (this.status !== 'active') return null;
    if (now >= this.deadline) {
      this.status = 'finished';
      return null;
    }
    if (!valid(path, this.maze.g)) return null;
    this.attempts++;
    const result = {
      path: [...path],
      moves: path.length - 1,
      extra: path.length - this.maze.optimal.length,
      elapsed: now - this.start,
    };
    result.improved = !this.best || result.moves < this.best.moves;
    if (result.improved) this.best = result;
    if (!result.extra) this.status = 'finished';
    return result;
  }
}
export function ranks(rows) {
  const sorted = [...rows].sort((a, b) => a.extra - b.extra || a.elapsed - b.elapsed);
  return sorted
    .map((x, i) => ({
      ...x,
      rank: i && x.extra === sorted[i - 1].extra && x.elapsed === sorted[i - 1].elapsed ? 0 : i + 1,
    }))
    .map((x, i, a) => {
      if (!x.rank) x.rank = a[i - 1].rank;
      return x;
    });
}
// Grid traversal rejects exact corner crossings rather than guessing a branch.
export function crossed(a, b, n) {
  let x = Math.floor(a.x),
    y = Math.floor(a.y);
  const ex = Math.floor(b.x),
    ey = Math.floor(b.y),
    dx = b.x - a.x,
    dy = b.y - a.y,
    sx = Math.sign(dx),
    sy = Math.sign(dy),
    out = [];
  let tx = dx ? ((sx > 0 ? x + 1 : x) - a.x) / dx : Infinity,
    ty = dy ? ((sy > 0 ? y + 1 : y) - a.y) / dy : Infinity;
  for (let k = 0; k < n * n && (x !== ex || y !== ey); k++) {
    if (Math.abs(tx - ty) < 1e-9) return out;
    if (tx < ty) {
      x += sx;
      tx += 1 / Math.abs(dx);
    } else {
      y += sy;
      ty += 1 / Math.abs(dy);
    }
    if (x < 0 || y < 0 || x >= n || y >= n) return out;
    out.push(y * n + x);
  }
  return out;
}
