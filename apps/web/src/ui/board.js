export function renderBoard(svg, maze, path = [], best = [], optimal = []) {
  const n = maze.n;
  svg.setAttribute('viewBox', `0 0 ${n * 40} ${n * 40}`);
  const xy = (i) => [(i % n) * 40 + 20, Math.floor(i / n) * 40 + 20];
  const line = (p, c) =>
    `<polyline points="${p.map((i) => xy(i).join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  let s = line(best, '#b2cbb9') + line(path, '#337d5b') + line(optimal, '#243a2c');
  s += '<g stroke="#3f4b43" stroke-width="2.5">';
  s += `<path d="M1 1H${n * 40 - 1}V${n * 40 - 1}H1Z" fill="none"/>`;
  for (let i = 0; i < n * n; i++) {
    const x = (i % n) * 40,
      y = Math.floor(i / n) * 40;
    if (i % n < n - 1 && !maze.g[i].includes(i + 1)) s += `<path d="M${x + 40} ${y}v40"/>`;
    if (i < n * (n - 1) && !maze.g[i].includes(i + n)) s += `<path d="M${x} ${y + 40}h40"/>`;
  }
  s += '</g>';
  for (const [i, label] of [
    [0, 'S'],
    [n * n - 1, 'G'],
  ]) {
    const [x, y] = xy(i);
    s += `<rect x="${x - 11}" y="${y - 11}" width="22" height="22" rx="${i === 0 ? 11 : 3}" fill="#e1eadb"/><text x="${x}" y="${y + 5}" text-anchor="middle" fill="#214a32" font-size="14" font-weight="700">${label}</text>`;
  }
  svg.innerHTML = s;
}
export const $ = (id) => document.getElementById(id);
