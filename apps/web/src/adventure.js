import { Campaign, createCatalog, PlanEditor } from '@pawzzle/game-core/v3';
import { crossed } from '@pawzzle/game-core';
import { MazeScene } from './scene.js';
const $ = (id) => document.getElementById(id);
const board = $('board'),
  catalog = createCatalog(),
  saveKey = 'pawzzle:adventure:rules-3.0';
let campaign,
  storageOK = true;
try {
  campaign = new Campaign(catalog, JSON.parse(localStorage.getItem(saveKey)) || undefined);
  campaign.progress();
} catch {
  campaign = new Campaign(catalog);
  storageOK = false;
}
let entry,
  editor,
  playback = null,
  paused = false,
  drag = null,
  lastPoint = null,
  lastTime = 0,
  scene;
try {
  scene = new MazeScene(document.querySelector('.board-wrap'));
} catch {
  $('storage').textContent = 'Flat board renderer · All game controls available';
}
function persist() {
  try {
    localStorage.setItem(saveKey, JSON.stringify(campaign.snapshot()));
  } catch {
    storageOK = false;
  }
  if (!storageOK)
    $('storage').textContent = 'Storage unavailable or reset · Progress lasts this visit';
}
function menu() {
  $('level').replaceChildren(
    ...campaign.progress().map((p) => {
      const option = document.createElement('option');
      option.value = p.levelId;
      option.textContent = `${p.completed ? '✓ ' : ''}${p.title}${p.unlocked ? '' : ' · Locked'}`;
      option.disabled = !p.unlocked;
      return option;
    }),
  );
}
function load(id) {
  if (!campaign.unlocked(id)) return;
  entry = catalog.get(id);
  editor = new PlanEditor(entry.compiled);
  playback = null;
  paused = false;
  drag = null;
  menu();
  $('level').value = id;
  $('title').textContent = entry.compiled.definition.title;
  $('instruction').textContent =
    entry.compiled.definition.instruction ||
    'Fetch the golden treat, deliver it at Mocha’s crown tile, then find your way home.';
  $('objective-title').textContent = entry.compiled.definition.royalRequests.length
    ? 'A favor for Mocha'
    : 'Every adventure starts small';
  $('result').hidden = true;
  $('pause-cover').hidden = true;
  const n = entry.compiled.definition.width,
    g = Array.from({ length: n * n }, () => []);
  for (const key of entry.compiled.edges.keys()) {
    const [a, b] = key.split(':').map(Number);
    g[a].push(b);
    g[b].push(a);
  }
  scene?.setMaze({ n, g });
  say(
    entry.compiled.definition.instruction ||
      'Plan your route. Mocha expects a treat before she opens the way home.',
  );
  render();
}
function say(text) {
  $('feedback').textContent = text;
}
const dog = (white = false) =>
  `<g class="dog-art"><ellipse cy="8" rx="15" ry="10" fill="${white ? '#fffdf3' : '#b9824f'}"/><ellipse cx="-14" cy="-5" rx="7" ry="13" fill="${white ? '#dfdfd3' : '#725036'}"/><ellipse cx="14" cy="-5" rx="7" ry="13" fill="${white ? '#dfdfd3' : '#725036'}"/><ellipse cy="-4" rx="15" ry="14" fill="${white ? '#fffdf3' : '#dca76c'}"/><ellipse cy="2" rx="9" ry="6" fill="#f5e5c8"/><circle cx="-6" cy="-7" r="2" fill="#25352b"/><circle cx="6" cy="-7" r="2" fill="#25352b"/><path d="M-3 0Q0 -3 3 0L0 4Z" fill="#25352b"/><path d="M-11 10H11" stroke="${white ? '#b18b31' : '#356b55'}" stroke-width="4"/>${white ? '<path d="M-10 -18L-12 -27L-4 -23L0 -31L5 -23L12 -27L10 -18Z" fill="#cda641" stroke="#7b642c"/>' : ''}</g>`;
const treat =
  '<g fill="#dba83c" stroke="#8f651d" stroke-width="1.5"><path d="M-8 -4L8 -4L8 4L-8 4Z"/><circle cx="-9" cy="-4" r="4"/><circle cx="-9" cy="4" r="4"/><circle cx="9" cy="-4" r="4"/><circle cx="9" cy="4" r="4"/></g>';
function render(fraction = 0) {
  const d = entry.compiled.definition,
    n = d.width,
    preview = editor.preview;
  const frame = playback?.frames[playback.index],
    state = frame?.state || preview.state;
  const xy = (c) => [(c % n) * 60 + 30, Math.floor(c / n) * 60 + 30];
  board.setAttribute('viewBox', `0 0 ${n * 60} ${n * 60}`);
  let markup = '';
  for (let c = 0; c < n * n; c++) {
    const [x, y] = xy(c);
    markup += `<rect x="${x - 29}" y="${y - 29}" width="58" height="58" rx="5" fill="${(c + Math.floor(c / n)) % 2 ? '#dde7ce' : '#eef1dc'}" opacity="${scene ? 0.25 : 1}"/>`;
  }
  const route = preview.frames.map((f) => f.state.dogCell);
  markup += `<polyline points="${route.map((c) => xy(c).join(',')).join(' ')}" fill="none" stroke="#62926c" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
  const line = (a, b, color, width = 4, extra = '') => {
    const [ax, ay] = xy(a),
      [bx, by] = xy(b),
      x = (ax + bx) / 2,
      y = (ay + by) / 2;
    return `<path d="${ay === by ? `M${x} ${y - 30}v60` : `M${x - 30} ${y}h60`}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
  };
  if (!scene) {
    markup += `<rect x="2" y="2" width="${n * 60 - 4}" height="${n * 60 - 4}" fill="none" stroke="#617959" stroke-width="4"/>`;
    for (let a = 0; a < n * n; a++)
      for (const b of [a % n < n - 1 ? a + 1 : -1, a + n < n * n ? a + n : -1])
        if (b >= 0 && !entry.compiled.edges.has(`${a}:${b}`)) markup += line(a, b, '#617959');
  }
  for (const gate of d.princessGateEdges) {
    const open = !!(
      state.fulfilledRequestMask &
      (1 << entry.compiled.requestIds.get(gate.requestId))
    );
    markup += line(
      ...gate.cells,
      open ? '#89aa78' : '#b88b38',
      6,
      `class="gate" opacity="${open ? 0.22 : 1}" ${open ? 'stroke-dasharray="3 12"' : ''}`,
    );
  }
  const [hx, hy] = xy(d.goalCell);
  markup += `<g transform="translate(${hx} ${hy})"><path d="M-19 -4L0 -21L19 -4V20H-19Z" fill="#e6c492" stroke="#785a3a" stroke-width="2"/><path d="M-24 -3L0 -25L24 -3" fill="none" stroke="#557654" stroke-width="6"/><path d="M-7 20V6A7 7 0 0 1 7 6V20" fill="#65513d"/></g>`;
  d.discoveries.forEach((item, i) => {
    if (!(state.collectedDiscoveryMask & (1 << i))) {
      const [x, y] = xy(item.cell);
      markup += `<g transform="translate(${x} ${y})">${treat}</g>`;
    }
  });
  for (const tile of d.interactionCells) {
    const [x, y] = xy(tile.cell);
    markup += `<g transform="translate(${x} ${y})"><circle r="24" fill="#f1e2af" stroke="#a37b2d" stroke-width="1.5" stroke-dasharray="3 3"/><g transform="translate(15 -10) scale(.55)">${dog(true)}</g><path d="M-13 10L-15 0L-8 4L-3 -3L2 4L9 0L7 10Z" fill="#a37b2d"/></g>`;
  }
  let [x, y] = xy(state.dogCell);
  if (playback && playback.index < playback.frames.length - 1) {
    const [nx, ny] = xy(playback.frames[playback.index + 1].state.dogCell);
    x += (nx - x) * fraction;
    y += (ny - y) * fraction;
  }
  if (!playback && state.dogCell !== d.startCell) {
    const [sx, sy] = xy(d.startCell);
    markup += `<g transform="translate(${sx} ${sy}) scale(.7)">${dog()}</g>`;
  }
  markup += `<g id="dog" class="${playback ? '' : 'ghost'}" transform="translate(${x} ${y})">${dog()}${state.carriedDiscoveryMask ? `<g transform="translate(0 -28) scale(.65)">${treat}</g>` : ''}</g>`;
  board.innerHTML = markup;
  const run = campaign.run(d.levelId);
  $('moves').textContent = preview.moveCount;
  $('best').textContent = run.best?.moveCount ?? '—';
  $('attempts').textContent = run.attempts;
  $('position').textContent =
    `Row ${Math.floor(state.dogCell / n) + 1}, column ${(state.dogCell % n) + 1}`;
  $('phase').textContent = paused
    ? 'Paused'
    : playback
      ? 'Playing your route'
      : 'Planning · ghost dog';
  const found = state.collectedDiscoveryMask === entry.compiled.allDiscoveriesMask,
    delivered = state.fulfilledRequestMask === entry.compiled.allRequestsMask;
  const objectives = d.royalRequests.length
    ? [
        [found, 'Find the golden treat'],
        [delivered, 'Deliver it to Mocha'],
        [state.dogCell === d.goalCell && delivered, 'Reach the doghouse'],
      ]
    : [[state.dogCell === d.goalCell, 'Reach the doghouse']];
  $('objectives').innerHTML = objectives
    .map(([done, text]) => `<li class="${done ? 'done' : ''}">${text}</li>`)
    .join('');
  $('mocha').textContent = !d.royalRequests.length
    ? '“A short walk. You’ve got this.”'
    : delivered
      ? '“Acceptable. You may proceed.”'
      : found
        ? '“Lovely. Bring that over here.”'
        : '“I could move. Or you could fetch my treat.”';
  $('go').disabled = !!playback || paused || !preview.complete;
  $('undo').disabled = $('clear').disabled = !!playback || paused || !editor.actions.length;
  $('level').disabled = !!playback || paused;
  document.querySelectorAll('[data-direction]').forEach((b) => (b.disabled = !!playback || paused));
  $('pause').textContent = paused ? 'Resume' : 'Pause';
}
function editable() {
  return !playback && !paused && !$('help-dialog').open;
}
function add(direction) {
  if (!editable()) return false;
  try {
    const p = editor.append({ type: 'move', direction });
    $('result').hidden = true;
    const events = p.frames.at(-1).events;
    const messages = {
      discoveryCollected: 'Treat collected in your preview. Bring it to Mocha’s crown tile.',
      requestFulfilled: 'Delivery planned. Mocha’s gate is now open in the preview.',
      requestMissingItem: 'Mocha is waiting for her golden treat. Fetch it first.',
      homeEarly: 'Not quite home yet. Finish the royal delivery first.',
    };
    say(
      p.complete
        ? 'Your route is ready. Press Go to watch it unfold.'
        : events
            .map((e) => messages[e.type])
            .filter(Boolean)
            .at(-1) || 'Keep planning. Revisited tiles count as another move.',
    );
    render();
    return true;
  } catch {
    say('That passage is closed. Try another direction, or Undo.');
    return false;
  }
}
function stepCell(c) {
  const n = entry.compiled.definition.width,
    a = editor.preview.state.dogCell;
  if (c === a) return true;
  const dx = (c % n) - (a % n),
    dy = Math.floor(c / n) - Math.floor(a / n);
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
  return add(dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up');
}
function point(e) {
  const r = board.getBoundingClientRect(),
    n = entry.compiled.definition.width;
  return { x: ((e.clientX - r.left) / r.width) * n, y: ((e.clientY - r.top) / r.height) * n };
}
board.onpointerdown = (e) => {
  if (!editable() || drag !== null) return;
  const p = point(e),
    n = entry.compiled.definition.width,
    c = Math.floor(p.y) * n + Math.floor(p.x);
  if (p.x < 0 || p.y < 0 || p.x >= n || p.y >= n) return;
  if (c !== editor.preview.state.dogCell && !stepCell(c)) return;
  drag = e.pointerId;
  lastPoint = p;
  board.setPointerCapture(e.pointerId);
  board.focus();
  e.preventDefault();
};
board.onpointermove = (e) => {
  if (drag !== e.pointerId || !editable()) return;
  const p = point(e),
    n = entry.compiled.definition.width;
  if (p.x < 0 || p.y < 0 || p.x >= n || p.y >= n) {
    drag = null;
    return;
  }
  for (const c of crossed(lastPoint, p, n))
    if (!stepCell(c)) {
      drag = null;
      break;
    }
  lastPoint = p;
};
board.onpointerup = board.onpointercancel = () => {
  drag = null;
  lastPoint = null;
};
board.onkeydown = (e) => {
  const direction = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[
    e.key
  ];
  if (direction) {
    e.preventDefault();
    add(direction);
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    $('undo').click();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    $('go').click();
  }
};
document
  .querySelectorAll('[data-direction]')
  .forEach((b) => (b.onclick = () => add(b.dataset.direction)));
$('undo').onclick = () => {
  if (editable()) {
    editor.undo();
    say('Last step removed. Preview objectives restored.');
    render();
  }
};
$('clear').onclick = () => {
  if (editable()) {
    editor.clear();
    $('result').hidden = true;
    say('A fresh plan. Your personal best is safe.');
    render();
  }
};
$('go').onclick = () => {
  if (!editable() || !editor.preview.complete) return;
  const d = entry.compiled.definition;
  const result = campaign.submit(d.levelId, {
    submissionId: crypto.randomUUID(),
    levelVersion: d.levelVersion,
    rulesVersion: d.rulesVersion,
    planActions: editor.actions,
  });
  persist();
  playback = { frames: editor.preview.frames, index: 0, elapsed: 0, result };
  drag = null;
  $('result').hidden = true;
  say('Off we go. Your completed route has been scored.');
  render();
};
function finish() {
  const result = playback.result;
  playback = null;
  render();
  $('result').hidden = false;
  $('result-title').textContent = result.extraMoves
    ? 'Home, with a happy princess.'
    : 'Perfectly paw-some.';
  $('result-detail').textContent =
    `${result.moveCount} moves · ${result.extraMoves ? `${result.extraMoves} more than optimal` : 'An optimal route'}. Best: ${campaign.run(entry.compiled.definition.levelId).best.moveCount} moves.`;
  const ids = [...catalog.keys()],
    next = ids[ids.indexOf(entry.compiled.definition.levelId) + 1];
  $('next').hidden = !next;
  $('next').onclick = () => load(next);
  say('Home safely. Edit your plan or try a fresh route.');
  menu();
  $('level').value = entry.compiled.definition.levelId;
}
$('retry').onclick = () => {
  if (editable()) {
    editor.clear();
    $('result').hidden = true;
    say('Ready for another adventure.');
    render();
    board.focus();
  }
};
function setPaused(value) {
  paused = value;
  drag = null;
  $('pause-cover').hidden = !paused;
  render();
}
$('pause').onclick = () => setPaused(!paused);
$('resume').onclick = () => setPaused(false);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true);
});
$('help').onclick = () => {
  setPaused(true);
  $('help-dialog').showModal();
};
$('close-help').onclick = () => $('help-dialog').close();
$('level').onchange = (e) => load(e.target.value);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function tick(now) {
  const dt = Math.min(now - lastTime, 80);
  lastTime = now;
  if (playback && !paused) {
    playback.elapsed += dt;
    const duration = reduced.matches ? 100 : 360;
    if (playback.elapsed >= duration) {
      playback.elapsed -= duration;
      playback.index++;
      const events = playback.frames[playback.index].events;
      const text = events.some((e) => e.type === 'requestFulfilled')
        ? 'Mocha approves! The royal gate opens.'
        : events.some((e) => e.type === 'discoveryCollected')
          ? 'Golden treat collected!'
          : null;
      if (text) say(text);
      if (playback.index === playback.frames.length - 1) {
        finish();
        requestAnimationFrame(tick);
        return;
      }
    }
    render(reduced.matches ? 0 : playback.elapsed / duration);
  }
  requestAnimationFrame(tick);
}
menu();
const progress = campaign.progress();
load(progress.find((p) => p.unlocked && !p.completed)?.levelId || 'royal-garden');
requestAnimationFrame(tick);
