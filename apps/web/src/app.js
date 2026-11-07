import { generate, move, Round, ranks, crossed } from '@pawzzle/game-core';
import { MazeScene } from './scene.js';
const $ = (id) => document.getElementById(id),
  svg = $('board');
let mode = 'practice',
  maze,
  round,
  path = [],
  submitted = false,
  drag = null,
  last = null,
  optimalShown = false,
  saved = false;
let scene;
try {
  scene = new MazeScene(document.querySelector('.board-wrap'));
  document.querySelector('.board-wrap').classList.add('dimensional');
} catch (error) {
  console.warn('Using the accessible flat renderer:', error.message);
}
let memory = {};
try {
  memory = JSON.parse(localStorage.getItem('minimalist-maze-v1') || '{}');
} catch {}
memory.scores ??= [];
memory.daily ??= {};
if (['6', '9', '12'].includes(memory.level)) $('level').value = memory.level;
function persist() {
  try {
    localStorage.setItem('minimalist-maze-v1', JSON.stringify(memory));
  } catch {
    $('mode-note').textContent = 'Storage unavailable · Results last this visit only';
  }
}
const today = () => new Date().toISOString().slice(0, 10);
function setup(replay = false) {
  round = null;
  path = [];
  submitted = false;
  optimalShown = false;
  saved = false;
  drag = null;
  const width = $('board').getBoundingClientRect().width;
  let n = mode === 'daily' ? 8 : Math.min(+$('level').value, Math.max(6, Math.floor(width / 32)));
  if (!replay) maze = generate(n, mode === 'daily' ? today() : crypto.randomUUID());
  $('board-size').textContent = `${maze.n} × ${maze.n} grid`;
  $('curtain').hidden = false;
  svg.replaceChildren();
  if (scene) scene.renderer.domElement.hidden = true;
  $('time').innerHTML = '60<span>s</span>';
  $('time').classList.remove('warning');
  $('result').hidden = true;
  $('leaderboard').hidden = true;
  $('instructions').hidden = false;
  $('feedback').textContent = 'Your best completed route is always kept.';
  $('start').disabled = false;
  $('start').textContent =
    mode === 'daily' && memory.daily[maze.seed] ? 'Review daily result' : 'Start maze →';
  $('level').disabled = mode === 'daily';
  $('clear').disabled = true;
  $('finish').disabled = true;
  hud();
}
function hud() {
  $('moves').textContent = Math.max(0, path.length - 1);
  $('best').textContent = round?.best?.moves ?? '—';
  $('attempts').textContent = round?.attempts ?? 0;
}
function draw() {
  const n = maze.n;
  svg.setAttribute('viewBox', `0 0 ${n * 40} ${n * 40}`);
  let s = '';
  const xy = (i) => [(i % n) * 40 + 20, Math.floor(i / n) * 40 + 20];
  const route = (p, color, dash = '') =>
    `<polyline points="${p.map((i) => xy(i).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round" ${dash}/>`;
  if (round?.status === 'finished' && round.best) s += route(round.best.path, '#c5d7cb');
  if (path.length) s += route(path, '#31775a');
  if (optimalShown) s += route(maze.optimal, '#222d26', 'stroke-dasharray="3 10"');
  s += '<g stroke="#3f4b43" stroke-width="2.5" stroke-linecap="square">';
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
    s += `<rect x="${x - 11}" y="${y - 11}" width="22" height="22" rx="${i === 0 ? 11 : 3}" fill="#fff"/><text x="${x}" y="${y + 5}" text-anchor="middle" fill="#253c2d" font-size="14" font-weight="700">${label}</text>`;
  }
  if (path.length > 1 && path.at(-1) !== n * n - 1) {
    const [x, y] = xy(path.at(-1));
    s += `<circle cx="${x}" cy="${y}" r="5" fill="white" stroke="#31775a" stroke-width="3"/>`;
  }
  svg.innerHTML = s;
  scene?.update(
    path,
    round?.status === 'finished' ? round.best?.path : null,
    optimalShown ? maze.optimal : null,
  );
  hud();
}
function save() {
  if (!round) return;
  if (mode === 'daily') {
    memory.daily[maze.seed] = {
      ...memory.daily[maze.seed],
      status: round.status,
      best: round.best,
      attempts: round.attempts,
    };
  }
  if (mode === 'daily' && round.best) {
    const row = {
      ...round.best,
      challengeId: maze.challengeId,
      mode,
      date: new Date().toISOString(),
    };
    const i = memory.scores.findIndex(
      (x) => x.challengeId === maze.challengeId && x.mode === 'daily',
    );
    if (i < 0) memory.scores.push(row);
    else memory.scores[i] = row;
  }
  if (round.status === 'finished' && !saved) {
    if (round.best && mode !== 'daily')
      memory.scores.push({
        ...round.best,
        challengeId: maze.challengeId,
        mode,
        date: new Date().toISOString(),
      });
    saved = true;
  }
  persist();
}
function end() {
  if (!round) return;
  round.status = 'finished';
  drag = null;
  save();
  $('clear').disabled = true;
  $('finish').disabled = true;
  $('level').disabled = mode === 'daily';
  $('instructions').hidden = true;
  $('result').hidden = false;
  const b = round.best;
  $('result').innerHTML =
    `<small>${mode === 'daily' ? 'Daily · Device-only result' : 'Practice · Unranked'}</small><h2>${b ? (b.extra ? 'A route worth improving.' : 'Perfectly done.') : 'No completed route'}</h2><dl><dt>Best route</dt><dd>${b ? b.moves + ' moves' : '—'}</dd><dt>Optimal route</dt><dd>${maze.optimal.length - 1} moves</dd>${b ? `<dt>Extra moves</dt><dd>+${b.extra}</dd><dt>Best achieved</dt><dd>${(b.elapsed / 1000).toFixed(2)} s</dd>` : ''}<dt>Completed attempts</dt><dd>${round.attempts}</dd></dl><button id="optimal">View optimal route</button><button id="replay">Replay in practice</button><button id="new" class="primary">New practice maze →</button><button id="result-scores">Local leaderboard</button>`;
  $('optimal').onclick = () => {
    optimalShown = !optimalShown;
    $('optimal').textContent = optimalShown ? 'Hide optimal route' : 'View optimal route';
    $('feedback').textContent = optimalShown
      ? 'One optimal route · dotted line'
      : 'Your best completed route is shown in pale green.';
    draw();
  };
  $('replay').onclick = () => {
    mode = 'practice';
    setLabels();
    setup(true);
  };
  $('new').onclick = () => switchMode('practice');
  $('result-scores').onclick = showScores;
  draw();
}
function active() {
  if (!round || round.status !== 'active') return false;
  if (performance.now() >= round.deadline) {
    $('feedback').textContent = 'Time’s up. Your best completed route is kept.';
    end();
    return false;
  }
  return true;
}
function step(cell) {
  if (!active()) return false;
  const next = move(path, cell, maze.g);
  if (next === path) {
    $('board').classList.add('collision');
    setTimeout(() => $('board').classList.remove('collision'), 130);
    return false;
  }
  path = next;
  submitted = false;
  if (cell === maze.n * maze.n - 1) {
    const result = round.submit(path, performance.now());
    drag = null;
    submitted = true;
    if (result) {
      $('feedback').textContent = result.extra
        ? `${result.improved ? 'New best. ' : ''}${result.moves} moves — ${result.extra} more moves than optimal.`
        : `Perfect! ${result.moves} moves.`;
      save();
      $('finish').disabled = false;
    }
    if (round.status === 'finished') end();
  }
  draw();
  return true;
}
function start() {
  if (mode === 'daily' && memory.daily[maze.seed]) {
    const prior = memory.daily[maze.seed];
    round = new Round(maze, performance.now());
    round.best = prior.best ?? null;
    round.attempts = prior.attempts ?? 0;
    path = round.best?.path ?? [];
    $('curtain').hidden = true;
    if (scene) {
      scene.renderer.domElement.hidden = false;
      scene.setMaze(maze);
    }
    end();
    return;
  }
  round = new Round(maze, performance.now());
  if (mode === 'daily') {
    memory.daily[maze.seed] = { status: 'active' };
    save();
  }
  path = [0];
  $('curtain').hidden = true;
  if (scene) {
    scene.renderer.domElement.hidden = false;
    scene.setMaze(maze);
  }
  $('clear').disabled = false;
  $('level').disabled = true;
  $('feedback').textContent = 'Draw from S to G. You can also use the arrow keys.';
  draw();
  svg.focus();
}
function point(e) {
  const b = svg.getBoundingClientRect();
  return {
    x: ((e.clientX - b.left) / b.width) * maze.n,
    y: ((e.clientY - b.top) / b.height) * maze.n,
  };
}
function cell(p) {
  return Math.floor(p.y) * maze.n + Math.floor(p.x);
}
function inside(p) {
  return p.x >= 0 && p.y >= 0 && p.x < maze.n && p.y < maze.n;
}
svg.onpointerdown = (e) => {
  if (!active() || drag !== null) return;
  const p = point(e);
  if (!inside(p)) return;
  const c = cell(p);
  if (c === 0) {
    path = [0];
    submitted = false;
  } else if (submitted && path.includes(c)) {
    path = path.slice(0, path.indexOf(c) + 1);
    submitted = false;
  } else if (c !== path.at(-1)) return;
  drag = e.pointerId;
  last = p;
  svg.setPointerCapture(e.pointerId);
  svg.focus();
  draw();
  e.preventDefault();
};
svg.onpointermove = (e) => {
  if (drag !== e.pointerId || !active()) return;
  const p = point(e);
  if (!inside(p)) {
    drag = null;
    return;
  }
  for (const c of crossed(last, p, maze.n)) {
    if (drag === null || !step(c)) break;
  }
  last = p;
};
svg.onpointerup = svg.onpointercancel = () => {
  drag = null;
  last = null;
};
svg.onkeydown = (e) => {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault();
  if (!active()) return;
  if (!path.length) path = [0];
  let c = path.at(-1),
    n = maze.n,
    d = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[e.key];
  step(c + d);
};
$('clear').onclick = () => {
  if (active()) {
    path = [0];
    submitted = false;
    draw();
  }
};
$('finish').onclick = () => {
  if (active() && round.best) end();
};
$('start').onclick = start;
function setLabels() {
  $('practice').classList.toggle('selected', mode === 'practice');
  $('daily').classList.toggle('selected', mode === 'daily');
  $('title').textContent = mode === 'daily' ? 'One maze for today.' : 'Find your shortest way.';
  const reset = new Date();
  reset.setUTCHours(24, 0, 0, 0);
  $('subtitle').textContent =
    mode === 'daily'
      ? `Device-only daily · Resets ${reset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} local time.`
      : 'A fresh maze. Sixty seconds. Room to improve.';
  $('mode-note').textContent =
    mode === 'daily' ? 'Daily · Local, unverified' : 'Practice · Unranked';
}
function switchMode(next) {
  if (round?.status === 'active') {
    end();
  }
  mode = next;
  setLabels();
  setup();
}
$('practice').onclick = () => switchMode('practice');
$('daily').onclick = () => {
  location.href = '/daily.html';
};
$('level').onchange = () => {
  memory.level = $('level').value;
  persist();
  setup();
};
function showScores() {
  $('leaderboard').hidden = !$('leaderboard').hidden;
  if ($('leaderboard').hidden) return;
  const rows = ranks(
    memory.scores.filter((x) => x.challengeId === maze.challengeId && x.mode === mode),
  );
  $('leaderboard').innerHTML =
    '<h2>Local leaderboard</h2><small>This maze and mode · This device · Unverified</small>' +
    (rows.length
      ? rows
          .map(
            (r) =>
              `<div class="score-row">#${r.rank} · ${r.moves} moves · +${r.extra}<br>${(r.elapsed / 1000).toFixed(2)} s · ${r.mode}</div>`,
          )
          .join('')
      : '<p>No completed runs for this maze yet.</p>');
}
$('scores').onclick = showScores;
$('help').onclick = () => $('help-dialog').showModal();
$('close-help').onclick = () => $('help-dialog').close();
function tick() {
  if (round?.status === 'active') {
    const remaining = Math.max(0, round.deadline - performance.now());
    $('time').innerHTML = `${Math.ceil(remaining / 1000)}<span>s</span>`;
    $('time').classList.toggle('warning', remaining < 10000);
    if (!remaining) active();
  }
  requestAnimationFrame(tick);
}
const replay = sessionStorage.getItem('pawzzle-replay');
if (replay) {
  sessionStorage.removeItem('pawzzle-replay');
  try {
    maze = JSON.parse(replay);
    setup(true);
  } catch {
    setup();
  }
} else setup();
tick();
