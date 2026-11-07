import { move, crossed } from '@pawzzle/game-core';
import { MazeScene } from './scene.js';
import { api } from './api/client.js';
import { $, renderBoard } from './ui/board.js';
let round = null,
  path = [],
  drag = null,
  last = null,
  submitted = false,
  pending = null,
  busy = false,
  deadline = 0,
  showOptimal = false,
  scene;
try {
  scene = new MazeScene(document.querySelector('.board-wrap'));
  document.querySelector('.board-wrap').classList.add('dimensional');
  scene.renderer.domElement.hidden = true;
} catch {
  /* SVG fallback remains playable. */
}
const board = $('board');
$('practice').classList.remove('selected');
$('daily').classList.add('selected');
$('level-label').hidden = true;
$('board-size').textContent = '8 × 8 grid';
$('title').textContent = 'One maze for today.';
$('subtitle').textContent = 'One daily run. Fewest moves first; time breaks ties.';
$('mode-note').textContent = 'Server-scored · Anonymous development session';
$('start').disabled = true;
$('start').textContent = 'Connecting…';
function message(text) {
  $('feedback').textContent = text;
}
function draw() {
  if (!round) return;
  renderBoard(
    board,
    round.maze,
    path,
    round.status === 'finished' ? (round.best?.path ?? []) : [],
    showOptimal ? (round.optimal ?? []) : [],
  );
  scene?.update(
    path,
    round.status === 'finished' ? round.best?.path : null,
    showOptimal ? round.optimal : null,
  );
  $('moves').textContent = Math.max(0, path.length - 1);
  $('best').textContent = round.best?.moves ?? '—';
  $('attempts').textContent = round.attempts;
  $('clear').disabled = busy || round.status !== 'active';
  $('finish').disabled = busy || !round.best || round.status !== 'active';
}
function accept(next) {
  const oldId = round?.id;
  round = next;
  deadline = performance.now() + Math.max(0, next.deadlineAt - next.serverNow);
  $('curtain').hidden = true;
  if (scene) {
    scene.renderer.domElement.hidden = false;
    if (oldId !== next.id) scene.setMaze(next.maze);
  }
  $('board-size').textContent = `${next.maze.n} × ${next.maze.n} grid`;
  if (!path.length) path = next.best?.path ?? [0];
  draw();
  if (next.status === 'finished') results();
}
function results() {
  drag = null;
  $('time').textContent = 'Done';
  $('instructions').hidden = true;
  $('result').hidden = false;
  const b = round.best;
  $('result').innerHTML =
    `<small>Server accepted · Anonymous session</small><h2>${b ? (b.extra ? 'Room to improve.' : 'Perfectly done.') : 'No completed route'}</h2><dl><dt>Best route</dt><dd>${b ? b.moves + ' moves' : '—'}</dd><dt>Optimal route</dt><dd>${round.optimal.length - 1} moves</dd>${b ? `<dt>Extra moves</dt><dd>+${b.extra}</dd><dt>Best achieved</dt><dd>${(b.elapsed / 1000).toFixed(2)} s</dd>` : ''}<dt>Completed attempts</dt><dd>${round.attempts}</dd></dl><button id="optimal">View optimal route</button><button id="replay">Replay in practice</button><button id="result-scores">Daily leaderboard</button>`;
  $('optimal').onclick = () => {
    showOptimal = !showOptimal;
    message(showOptimal ? 'One optimal route · dotted line' : 'Best accepted route retained.');
    draw();
  };
  $('replay').onclick = () => {
    sessionStorage.setItem(
      'pawzzle-replay',
      JSON.stringify({ ...round.maze, optimal: round.optimal }),
    );
    location.href = '/';
  };
  $('result-scores').onclick = leaderboard;
  draw();
}
async function finish() {
  if (!round || busy || round.status === 'finished') return;
  busy = true;
  draw();
  try {
    accept(await api.finish(round.id));
    message('Round finished. Your best accepted route is kept.');
  } catch (error) {
    message(`Could not confirm the final result: ${error.message} Use Reconnect to retry.`);
    reconnect();
  } finally {
    busy = false;
    draw();
  }
}
function live() {
  return round?.status === 'active' && !busy && performance.now() < deadline;
}
async function submit() {
  if (!live()) return;
  pending ??= { submissionId: crypto.randomUUID(), orderedCellIds: [...path] };
  busy = true;
  drag = null;
  draw();
  message('Submitting route… Pending server validation.');
  try {
    const result = await api.submit(round.id, pending);
    pending = null;
    submitted = true;
    accept(result.round);
    message(
      result.extra
        ? `${result.improved ? 'New best. ' : ''}${result.moves} moves — ${result.extra} more moves than optimal.`
        : `Perfect! ${result.moves} moves.`,
    );
  } catch (error) {
    if (error.status) {
      pending = null;
      message(error.message);
      try {
        accept(await api.round(round.id));
      } catch {
        reconnect();
      }
    } else {
      message(
        'Connection lost. This route is not yet confirmed. Reconnect to retry the same submission.',
      );
      reconnect();
    }
  } finally {
    busy = false;
    draw();
  }
}
function reconnect() {
  let b = $('reconnect');
  if (!b) {
    b = document.createElement('button');
    b.id = 'reconnect';
    b.textContent = 'Reconnect';
    $('feedback').after(b);
  }
  b.onclick = async () => {
    try {
      await api.session();
      if (pending) {
        busy = false;
        await retryPending();
      } else if (round) accept(await api.round(round.id));
      else await initialize();
      b.remove();
    } catch (error) {
      message(error.message);
    }
  };
}
async function retryPending() {
  if (!pending) return;
  busy = true;
  try {
    const result = await api.submit(round.id, pending);
    pending = null;
    accept(result.round);
    message('Submission confirmed by the server.');
  } finally {
    busy = false;
    draw();
  }
}
function step(cell) {
  if (!live() || pending) return false;
  const next = move(path, cell, round.maze.g);
  if (next === path) return false;
  path = next;
  submitted = false;
  draw();
  if (cell === round.maze.n ** 2 - 1) void submit();
  return true;
}
function point(event) {
  const rect = board.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * round.maze.n,
    y: ((event.clientY - rect.top) / rect.height) * round.maze.n,
  };
}
const inside = (p) => p.x >= 0 && p.y >= 0 && p.x < round.maze.n && p.y < round.maze.n;
board.onpointerdown = (e) => {
  if (!live() || pending || drag !== null) return;
  const p = point(e);
  if (!inside(p)) return;
  const c = Math.floor(p.y) * round.maze.n + Math.floor(p.x);
  if (c === 0) {
    path = [0];
    submitted = false;
  } else if (submitted && path.includes(c)) {
    path = path.slice(0, path.indexOf(c) + 1);
    submitted = false;
  } else if (c !== path.at(-1)) return;
  drag = e.pointerId;
  last = p;
  board.setPointerCapture(e.pointerId);
  board.focus();
  draw();
  e.preventDefault();
};
board.onpointermove = (e) => {
  if (drag !== e.pointerId || !live()) return;
  const p = point(e);
  if (!inside(p)) {
    drag = null;
    return;
  }
  for (const c of crossed(last, p, round.maze.n)) {
    if (drag === null || !step(c)) break;
  }
  last = p;
};
board.onpointerup = board.onpointercancel = () => {
  drag = null;
};
board.onkeydown = (e) => {
  if (!round) return;
  const d = { ArrowUp: -round.maze.n, ArrowDown: round.maze.n, ArrowLeft: -1, ArrowRight: 1 }[
    e.key
  ];
  if (d === undefined) return;
  e.preventDefault();
  step(path.at(-1) + d);
};
$('clear').onclick = () => {
  if (live() && !pending) {
    path = [0];
    submitted = false;
    draw();
  }
};
$('finish').onclick = finish;
$('practice').onclick = async () => {
  if (round?.status === 'active') {
    if (busy) return;
    await finish();
    if (round.status === 'active') return;
  }
  location.href = '/';
};
$('daily').onclick = () => {};
$('start').onclick = async () => {
  if (busy) return;
  busy = true;
  $('start').disabled = true;
  try {
    accept(await api.start());
    board.focus();
  } catch (error) {
    message(error.message);
    reconnect();
  } finally {
    busy = false;
    $('start').disabled = false;
    draw();
  }
};
async function leaderboard() {
  try {
    const meta = round ? { id: round.challengeId } : await api.daily();
    const data = await api.leaderboard(meta.id);
    $('leaderboard').hidden = false;
    $('leaderboard').replaceChildren();
    const h = document.createElement('h2');
    h.textContent = 'Daily leaderboard';
    $('leaderboard').append(h);
    const note = document.createElement('small');
    note.textContent = 'Same challenge · Anonymous development sessions';
    $('leaderboard').append(note);
    for (const r of data.entries) {
      const row = document.createElement('p');
      row.textContent = `#${r.rank} ${r.player} · ${r.moves} moves · +${r.extra} · ${(r.elapsed / 1000).toFixed(2)} s`;
      $('leaderboard').append(row);
    }
    if (!data.entries.length) {
      const p = document.createElement('p');
      p.textContent = 'No accepted results yet.';
      $('leaderboard').append(p);
    }
  } catch (error) {
    message(error.message);
  }
}
$('scores').onclick = leaderboard;
$('help').onclick = () => $('help-dialog').showModal();
$('close-help').onclick = () => $('help-dialog').close();
async function initialize() {
  await api.session();
  const meta = await api.daily();
  $('subtitle').textContent =
    `${meta.date} · 8 × 8 · Resets ${new Date(meta.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} local time.`;
  if (meta.roundId) accept(await api.round(meta.roundId));
  else {
    $('start').disabled = false;
    $('start').textContent = 'Start daily maze →';
    message('One run per anonymous session. The server validates your route and timing.');
  }
}
initialize().catch((error) => {
  message(`Daily mode is unavailable: ${error.message} Practice remains available.`);
  $('start').textContent = 'Connection unavailable';
  reconnect();
});
let expiryRequested = false;
function tick() {
  if (round?.status === 'active') {
    const left = Math.max(0, deadline - performance.now());
    $('time').innerHTML = `${Math.ceil(left / 1000)}<span>s</span>`;
    if (!left && !busy && !expiryRequested) {
      expiryRequested = true;
      finish().finally(() => {
        if (round.status === 'active') reconnect();
      });
    }
  }
  requestAnimationFrame(tick);
}
tick();
