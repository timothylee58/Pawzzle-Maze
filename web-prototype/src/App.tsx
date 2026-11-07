import { MotionConfig, motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import mochaArt from './assets/mocha.png';
import houseArt from './assets/doghouse.png';
import treatArt from './assets/golden-treat.png';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Download,
  Flag,
  Home,
  KeyRound,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Undo2,
  Diamond,
  Package,
  Clock3,
} from 'lucide-react';
import {
  generate,
  replay,
  transition,
  won,
  gateOpen,
  countBits,
  type Config,
  type Level,
} from './puzzle';

const DEFAULT: Config = { size: 6, items: 3, keys: true, delivery: true, ordered: false };
const SAVE = 'pawzzle-maze-lab-v1';
type Best = { moves: number; assisted: boolean };
type Progress = { completed: string[]; bests: Record<string, Best> };
const identity = (l: Level) =>
  JSON.stringify([l.generatorVersion, l.rulesVersion, l.seed, l.config]);
function Mark({
  kind,
  x,
  y,
  muted = false,
  label = '',
}: {
  kind: string;
  x: number;
  y: number;
  muted?: boolean;
  label?: string;
}) {
  const color = muted
    ? '#a8b3ad'
    : kind === 'key'
      ? '#b77b18'
      : kind === 'parcel' || kind === 'delivery'
        ? '#98657f'
        : '#23775c';
  return (
    <g transform={`translate(${x},${y})`} opacity={muted ? 0.55 : 1} pointerEvents="none">
      {kind === 'item' ? (
        <>
          <path
            d="M0 -11 L10 0 L0 11 L-10 0 Z"
            fill={muted ? 'none' : '#dceee5'}
            stroke={color}
            strokeWidth="2"
          />
          {label && (
            <text textAnchor="middle" y="4" fontSize="10" fill={color} fontWeight="700">
              {label}
            </text>
          )}
        </>
      ) : kind === 'key' ? (
        <g fill="none" stroke={color} strokeWidth="2.5">
          <circle cx="-5" cy="-3" r="5" />
          <path d="M-1 1L8 10m-4-4 3-3m0 6 3-3" />
        </g>
      ) : kind === 'home' ? (
        <g fill="none" stroke={color} strokeWidth="2">
          <path d="M-12-1L0-11 12-1M-9-3V11H9V-3M-3 11V3H3V11" />
        </g>
      ) : kind === 'parcel' ? (
        <g fill="#f0eaf9" stroke={color} strokeWidth="2">
          <rect x="-10" y="-9" width="20" height="18" rx="2" />
          <path d="M0-9V9M-10-3H10" />
        </g>
      ) : (
        <g fill="none" stroke={color} strokeWidth="2">
          <circle r="12" />
          <path d="M-5 0L-1 4 6-5" />
        </g>
      )}
    </g>
  );
}
export default function Page() {
  const reducedMotion = useReducedMotion();
  const [level, setLevel] = useState<Level>(() => generate('PAW-1024', DEFAULT));
  const [config, setConfig] = useState<Config>(DEFAULT),
    [seed, setSeed] = useState('PAW-1024');
  const [path, setPath] = useState<number[]>([]),
    [playAt, setPlayAt] = useState<number | null>(null);
  const [mode, setMode] = useState<'campaign' | 'timed'>('campaign'),
    [phase, setPhase] = useState<'ready' | 'running' | 'paused' | 'ended'>('running');
  const [remaining, setRemaining] = useState(60),
    [attempts, setAttempts] = useState(0),
    [best, setBest] = useState<number | null>(null);
  const [assisted, setAssisted] = useState(false),
    [result, setResult] = useState<string | null>(null),
    [notice, setNotice] = useState('');
  const [progress, setProgress] = useState<Progress>({ completed: [], bests: {} }),
    [loaded, setLoaded] = useState(false),
    [saveOk, setSaveOk] = useState(true);
  const [help, setHelp] = useState(false),
    [busy, setBusy] = useState(false),
    [showSteps, setShowSteps] = useState(false);
  const pathRef = useRef(path),
    svgRef = useRef<SVGSVGElement>(null),
    drag = useRef(false),
    lastPoint = useRef<{ x: number; y: number } | null>(null),
    remainingRef = useRef(60),
    lastTick = useRef(0);
  const runGuard = useRef(false);
  pathRef.current = path;
  const state = useMemo(() => replay(level, path), [level, path]);
  const displayPath = playAt === null ? path : path.slice(0, playAt);
  const displayState = useMemo(() => replay(level, displayPath), [level, displayPath]);
  const valid = won(level, state),
    hidden = phase === 'paused' || (mode === 'timed' && phase === 'ready');
  const editable = !hidden && phase !== 'ended' && playAt === null && !busy && !help;
  const personal = progress.bests[identity(level)];
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.version === 1 && data.seed && data.config) {
          const l = generate(data.seed, data.config);
          const p = Array.isArray(data.path) ? data.path : [];
          replay(l, p);
          setLevel(l);
          setSeed(l.seed);
          setConfig(l.config);
          setPath(p);
          if (data.progress && Array.isArray(data.progress.completed) && data.progress.bests)
            setProgress(data.progress);
          setAssisted(!!data.assisted);
          setNotice('Your saved campaign puzzle is ready.');
        }
      }
    } catch {
      setNotice('Previous save could not be loaded. A fresh puzzle is ready.');
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded || mode !== 'campaign') return;
    try {
      localStorage.setItem(
        SAVE,
        JSON.stringify({
          version: 1,
          seed: level.seed,
          config: level.config,
          path,
          assisted,
          progress,
        }),
      );
      setSaveOk(true);
    } catch {
      setSaveOk(false);
    }
  }, [loaded, level, path, progress, assisted, mode]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) setPhase((p) => (p === 'running' ? 'paused' : p));
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  useEffect(() => {
    if (mode !== 'timed' || phase !== 'running') return;
    lastTick.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const left = Math.max(0, remainingRef.current - (now - lastTick.current) / 1000);
      lastTick.current = now;
      remainingRef.current = left;
      setRemaining(left);
      if (left === 0) {
        setPhase('ended');
        setPlayAt(null);
      }
    }, 100);
    return () => clearInterval(id);
  }, [mode, phase]);
  useEffect(() => {
    if (playAt === null || phase === 'paused') return;
    if (playAt >= path.length) {
      const id = setTimeout(() => setPlayAt(null), 450);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setPlayAt((i) => (i === null ? null : i + 1)), 120);
    return () => clearTimeout(id);
  }, [playAt, path.length, phase]);
  function reset(l: Level, newMode = mode) {
    setLevel(l);
    setPath([]);
    setPlayAt(null);
    setResult(null);
    setNotice('');
    setAttempts(0);
    setBest(null);
    setAssisted(false);
    setPhase(newMode === 'timed' ? 'ready' : 'running');
    setRemaining(60);
    remainingRef.current = 60;
    runGuard.current = false;
  }
  function create(newSeed = seed) {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      try {
        const l = generate(newSeed.trim() || 'PAW-1024', config);
        setSeed(l.seed);
        reset(l);
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Generation failed');
      } finally {
        setBusy(false);
      }
    }, 25);
  }
  function random() {
    create('PAW-' + Math.floor(Math.random() * 900000 + 100000));
  }
  function selectMode(m: 'campaign' | 'timed') {
    setMode(m);
    reset(level, m);
  }
  function move(to: number) {
    if (!editable) return;
    const p = pathRef.current,
      s = replay(level, p);
    if (to === s.cell) return;
    const next = transition(level, s, to);
    if (!next) {
      setNotice('That passage is blocked. Follow an open edge or unlock its gate.');
      return;
    }
    const np = [...p, to];
    pathRef.current = np;
    setPath(np);
    setResult(null);
    runGuard.current = false;
    setNotice(
      to === level.goal && !won(level, next)
        ? 'Home reached — finish the remaining objectives, then return.'
        : level.config.ordered &&
            level.items.includes(to) &&
            !(next.mask & (1 << level.items.indexOf(to)))
          ? 'Collect the numbered items in order.'
          : next.discovery === 2 && s.discovery !== 2
            ? 'Delivery complete. The rose gate is now open.'
            : next.key && !s.key
              ? 'Key collected. The gold gate stays open for this plan.'
              : '',
    );
  }
  function undo() {
    if (!editable) return;
    setPath((p) => p.slice(0, -1));
    runGuard.current = false;
    setResult(null);
    setNotice('');
  }
  function clear() {
    if (!editable) return;
    setPath([]);
    runGuard.current = false;
    setResult(null);
    setNotice('');
  }
  function submit() {
    if (!valid || !editable || runGuard.current) return;
    if (mode === 'timed') {
      const left = remainingRef.current - (performance.now() - lastTick.current) / 1000;
      if (left <= 0) {
        setPhase('ended');
        remainingRef.current = 0;
        setRemaining(0);
        return;
      }
    }
    runGuard.current = true;
    setAttempts((a) => a + 1);
    setBest((b) => (b === null ? path.length : Math.min(b, path.length)));
    const extra = path.length - level.optimal;
    setResult(
      extra === 0
        ? 'Perfect route. Every objective, in the fewest moves.'
        : `Puzzle complete. ${extra} moves above optimal — can you improve it?`,
    );
    setProgress((p) => {
      const id = identity(level),
        old = p.bests[id];
      const improve =
        !old ||
        (!assisted && old.assisted) ||
        (old.assisted === assisted && path.length < old.moves);
      return {
        completed: p.completed.includes(id) ? p.completed : [...p.completed, id],
        bests: improve ? { ...p.bests, [id]: { moves: path.length, assisted } } : p.bests,
      };
    });
    if (mode === 'timed' && extra === 0) setPhase('ended');
    else setPlayAt(0);
  }
  function reveal() {
    if (!editable || (mode === 'timed' && phase === 'running')) return;
    setPath([...level.solution]);
    setAssisted(true);
    runGuard.current = false;
    setNotice('One optimal solution loaded. This attempt is marked assisted.');
    setResult(null);
  }
  function exportLevel() {
    const payload = {
      ...level,
      exportFormat: 'pawzzle-level-v1',
      startCell: level.start,
      goalCell: level.goal,
      requiredItems: level.items.map((cell, id) => ({ id, cell })),
      keys: level.key < 0 ? [] : [{ id: 0, cell: level.key }],
      optimalActions: level.solution.map((cell) => ({ type: 'MoveTo', cell })),
      notes:
        'Cell indices are row-major. Gate conditions and automatic entry effects follow lib/puzzle.ts. Prototype export; adapt to Godot LevelDefinition.',
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `pawzzle-${level.seed.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function pointerPoint(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * level.n,
      y: ((e.clientY - r.top) / r.height) * level.n,
    };
  }
  function pointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag.current || !editable) return;
    const p = pointerPoint(e),
      prev = lastPoint.current || p;
    const count = Math.ceil(Math.max(Math.abs(p.x - prev.x), Math.abs(p.y - prev.y)) * 8);
    for (let i = 1; i <= Math.max(1, count); i++) {
      const t = i / Math.max(1, count),
        x = Math.floor(prev.x + (p.x - prev.x) * t),
        y = Math.floor(prev.y + (p.y - prev.y) * t);
      if (x >= 0 && x < level.n && y >= 0 && y < level.n) move(y * level.n + x);
    }
    lastPoint.current = p;
  }
  const n = level.n,
    unit = 60,
    pos = (c: number) => ({ x: (c % n) * unit + 30, y: Math.floor(c / n) * unit + 30 });
  const player = pos(displayState.cell);
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <div className="app-shell">
          <header className="topbar">
            <a className="brand" href="./" aria-label="Maze Lab home">
              <span className="brand-icon">
                <img src={mochaArt} alt="" />
              </span>
              <strong>
                pawzzle<span> / maze lab</span>
              </strong>
            </a>
            <div className="top-actions">
              <span className="prototype">A puzzle for curious paws</span>
              <Button
                className="text-button"
                onClick={() => {
                  if (phase === 'running') setPhase('paused');
                  setHelp(true);
                }}
              >
                <CircleHelp size={17} /> How to play
              </Button>
            </div>
          </header>
          <main>
            <div className="intro">
              <div>
                <p className="eyebrow">THE GARDEN IS YOUR PLAYGROUND</p>
                <h1>
                  Small paws. <em>Big plans.</em>
                </h1>
                <p>A pocket-sized adventure. Collect, deliver, and find your way home.</p>
              </div>
              <span className="save-status">
                <span className={saveOk ? 'dot' : 'dot warning'} />
                {saveOk ? 'Progress saved on this device' : 'Local saving unavailable'}
              </span>
            </div>
            <div className="workspace">
              <motion.aside
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="settings-panel"
              >
                <div className="panel-title">
                  <h2>Make it your maze</h2>
                  <Shuffle size={16} />
                </div>
                <label className="field">
                  Board size
                  <select
                    value={config.size}
                    onChange={(e) => setConfig({ ...config, size: +e.target.value })}
                  >
                    {[5, 6, 7, 8].map((v) => (
                      <option key={v} value={v}>
                        {v} × {v}
                        {v === 5 ? ' · small' : v === 8 ? ' · large' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="field">
                  <legend>Required collectibles</legend>
                  <div className="segmented">
                    {[1, 2, 3, 4].map((v) => (
                      <Button
                        key={v}
                        className={config.items === v ? 'selected' : ''}
                        onClick={() => setConfig({ ...config, items: v })}
                        aria-pressed={config.items === v}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                <div className="mechanics-label">MECHANICS</div>
                {(
                  [
                    {
                      name: 'Key & gate',
                      description: 'Find the key to open a passage',
                      key: 'keys',
                      Icon: KeyRound,
                    },
                    {
                      name: 'Royal delivery',
                      description: 'Bring a golden treat to Mocha',
                      key: 'delivery',
                      Icon: Package,
                    },
                    {
                      name: 'Ordered collection',
                      description: 'Collect diamonds 1, 2, 3…',
                      key: 'ordered',
                      Icon: Flag,
                    },
                  ] as const
                ).map(({ name, description, key, Icon }) => (
                  <label className="toggle-row" key={key}>
                    <Icon size={18} />
                    <span>
                      <strong>{name}</strong>
                      <small>{description}</small>
                    </span>
                    <Switch
                      aria-label={name}
                      checked={config[key]}
                      onCheckedChange={(checked) => setConfig({ ...config, [key]: checked })}
                    />
                  </label>
                ))}
                <label className="field seed-field">
                  Puzzle seed
                  <input
                    value={seed}
                    maxLength={48}
                    onChange={(e) => setSeed(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') create();
                    }}
                    placeholder="e.g. PAW-1024"
                  />
                </label>
                <div className="generate-row">
                  <Button className="primary" onClick={() => create()} disabled={busy}>
                    <Shuffle size={16} />
                    {busy ? 'Verifying…' : 'Generate puzzle'}
                  </Button>
                  <Button
                    className="icon-button"
                    onClick={random}
                    disabled={busy}
                    aria-label="Generate random seed"
                    title="Random seed"
                  >
                    <RotateCcw size={17} />
                  </Button>
                </div>
                <p className="quiet">
                  Settings apply when you generate. Every puzzle is checked for a valid, optimal
                  solution.
                </p>
                <div className="separator" />
                <div className="panel-title">
                  <h3>Play mode</h3>
                </div>
                <Tabs
                  value={mode}
                  onValueChange={(value) => selectMode(value as 'campaign' | 'timed')}
                >
                  <TabsList className="mode-switch" aria-label="Play mode">
                    <TabsTrigger value="campaign">Free play</TabsTrigger>
                    <TabsTrigger value="timed">Timed · 60s</TabsTrigger>
                  </TabsList>
                  <TabsContent value="campaign">
                    <p className="quiet">Take your time. Any valid route completes a puzzle.</p>
                  </TabsContent>
                  <TabsContent value="timed">
                    <p className="quiet">
                      Find your best route before the clock runs out. Pause hides the board.
                    </p>
                  </TabsContent>
                </Tabs>
                <div className="campaign-progress">
                  <span>
                    <CheckCircle2 size={16} /> Puzzles completed
                  </span>
                  <strong>{progress.completed.length}</strong>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button className="export-button" onClick={exportLevel}>
                      <Download size={16} /> Export this puzzle <ArrowRight size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download the level as JSON for development.</TooltipContent>
                </Tooltip>
              </motion.aside>
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="play-panel"
              >
                <div className="play-header">
                  <div>
                    <span className="eyebrow">YOUR GARDEN MAZE</span>
                    <h2>
                      {n} × {n} <span>/</span> {level.seed}
                    </h2>
                  </div>
                  <span className="verified">
                    <Check size={13} /> Solver verified
                  </span>
                </div>
                <div className="stats">
                  <div>
                    <span>PLANNED MOVES</span>
                    <strong>
                      {path.length}
                      <small> moves</small>
                    </strong>
                  </div>
                  <div>
                    <span>{mode === 'timed' ? 'TIME LEFT' : 'PERSONAL BEST'}</span>
                    <strong>
                      {mode === 'timed' ? Math.ceil(remaining) : (personal?.moves ?? '—')}
                      <small>
                        {mode === 'timed' ? ' sec' : personal?.assisted ? ' assisted' : ' moves'}
                      </small>
                    </strong>
                  </div>
                  <div>
                    <span>OBJECTIVES</span>
                    <strong>
                      {countBits(displayState.mask)}
                      <small> / {level.items.length} collected</small>
                    </strong>
                  </div>
                </div>
                <div className="board-area">
                  <div className="board-wrap">
                    {!hidden && (
                      <svg
                        ref={svgRef}
                        viewBox={`0 0 ${n * unit} ${n * unit}`}
                        className="maze"
                        tabIndex={0}
                        role="application"
                        aria-label="Maze route planner. Use arrow keys to move, Backspace to undo, Enter to submit."
                        onKeyDown={(e) => {
                          const d: Record<string, number> = {
                            ArrowUp: -n,
                            ArrowDown: n,
                            ArrowLeft: -1,
                            ArrowRight: 1,
                          };
                          if (e.key in d) {
                            e.preventDefault();
                            move(state.cell + d[e.key]);
                          }
                          if (e.key === 'Backspace') {
                            e.preventDefault();
                            undo();
                          }
                          if (e.key === 'Enter') submit();
                        }}
                        onPointerDown={(e) => {
                          if (!editable) return;
                          e.preventDefault();
                          e.currentTarget.focus();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          drag.current = true;
                          lastPoint.current = pointerPoint(e);
                          const p = lastPoint.current;
                          const x = Math.floor(p.x),
                            y = Math.floor(p.y);
                          if (x >= 0 && x < n && y >= 0 && y < n) move(y * n + x);
                        }}
                        onPointerMove={pointerMove}
                        onPointerUp={() => {
                          drag.current = false;
                          lastPoint.current = null;
                        }}
                        onPointerCancel={() => {
                          drag.current = false;
                          lastPoint.current = null;
                        }}
                      >
                        <defs>
                          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                            <path
                              d="M 60 0 L 0 0 0 60"
                              fill="none"
                              stroke="#e4e0c8"
                              strokeWidth="1"
                            />
                          </pattern>
                          <marker
                            id="arrow"
                            viewBox="0 0 10 10"
                            refX="5"
                            refY="5"
                            markerWidth="3"
                            markerHeight="3"
                            orient="auto"
                          >
                            <path d="M0 0L10 5 0 10" fill="none" stroke="#70a68e" strokeWidth="2" />
                          </marker>
                        </defs>
                        <rect width={n * 60} height={n * 60} fill="#f9f5df" />
                        <rect width={n * 60} height={n * 60} fill="url(#grid)" />
                        <rect x="3" y="3" width="54" height="54" rx="8" fill="#edf4ef" />
                        <rect
                          x={(level.goal % n) * 60 + 3}
                          y={Math.floor(level.goal / n) * 60 + 3}
                          width="54"
                          height="54"
                          rx="8"
                          fill="#edf4ef"
                        />
                        {[0, ...displayPath].map((c, i, a) =>
                          i > 0 ? (
                            <line
                              key={i}
                              x1={pos(a[i - 1]).x}
                              y1={pos(a[i - 1]).y}
                              x2={pos(c).x}
                              y2={pos(c).y}
                              stroke="#8eb78c"
                              strokeWidth="8"
                              strokeLinecap="round"
                              markerMid="url(#arrow)"
                            />
                          ) : null,
                        )}
                        {Array.from({ length: n * n }, (_, c) => {
                          const x = (c % n) * 60,
                            y = Math.floor(c / n) * 60;
                          return (
                            <g key={c} stroke="#557557" strokeWidth="5" strokeLinecap="round">
                              {c % n < n - 1 && !level.edges[c].includes(c + 1) && (
                                <line x1={x + 60} y1={y} x2={x + 60} y2={y + 60} />
                              )}{' '}
                              {c < n * (n - 1) && !level.edges[c].includes(c + n) && (
                                <line x1={x} y1={y + 60} x2={x + 60} y2={y + 60} />
                              )}
                            </g>
                          );
                        })}
                        <rect
                          x="1.5"
                          y="1.5"
                          width={n * 60 - 3}
                          height={n * 60 - 3}
                          fill="none"
                          stroke="#557557"
                          strokeWidth="5"
                        />
                        {level.gates.map((g, i) => {
                          const a = pos(g.a),
                            b = pos(g.b),
                            x = (a.x + b.x) / 2,
                            y = (a.y + b.y) / 2,
                            open = gateOpen(g, displayState),
                            vertical = a.y === b.y;
                          return (
                            <g key={i}>
                              <line
                                x1={x - (vertical ? 0 : 24)}
                                y1={y - (vertical ? 24 : 0)}
                                x2={x + (vertical ? 0 : 24)}
                                y2={y + (vertical ? 24 : 0)}
                                stroke={g.kind === 'key' ? '#bc8a2a' : '#98657f'}
                                strokeWidth={open ? 2 : 5}
                                strokeDasharray={open ? '3 7' : undefined}
                              />
                              {!open && (
                                <rect
                                  x={x - 7}
                                  y={y - 7}
                                  width="14"
                                  height="14"
                                  rx="3"
                                  fill={g.kind === 'key' ? '#bc8a2a' : '#98657f'}
                                />
                              )}
                            </g>
                          );
                        })}
                        {level.items.map((c, i) => (
                          <Mark
                            key={c}
                            kind="item"
                            {...pos(c)}
                            label={level.config.ordered ? String(i + 1) : ''}
                            muted={!!(displayState.mask & (1 << i))}
                          />
                        ))}
                        {level.key >= 0 && (
                          <Mark kind="key" {...pos(level.key)} muted={displayState.key} />
                        )}
                        {level.discovery >= 0 && (
                          <image
                            href={treatArt}
                            x={pos(level.discovery).x - 20}
                            y={pos(level.discovery).y - 20}
                            width="40"
                            height="40"
                            opacity={displayState.discovery > 0 ? 0.22 : 1}
                            pointerEvents="none"
                          />
                        )}
                        {level.interaction >= 0 && (
                          <>
                            <circle
                              {...{ cx: pos(level.interaction).x, cy: pos(level.interaction).y }}
                              r="24"
                              fill="#f3e2ec"
                              stroke="#9c6987"
                              strokeDasharray="3 3"
                            />
                            <image
                              href={mochaArt}
                              x={pos(level.interaction).x - 20}
                              y={pos(level.interaction).y - 23}
                              width="40"
                              height="40"
                              opacity={displayState.discovery === 2 ? 0.5 : 1}
                              pointerEvents="none"
                            />
                            <text
                              x={pos(level.interaction).x + 17}
                              y={pos(level.interaction).y + 18}
                              fontSize="10"
                              fill="#98657f"
                            >
                              D
                            </text>
                          </>
                        )}
                        <image
                          href={houseArt}
                          x={pos(level.goal).x - 24}
                          y={pos(level.goal).y - 24}
                          width="48"
                          height="48"
                          pointerEvents="none"
                        />
                        <text x="8" y="13" fontSize="8" fill="#7b8b80">
                          START
                        </text>
                        {showSteps &&
                          displayPath.map((c, i) => (
                            <text
                              key={i}
                              x={pos(c).x + 15}
                              y={
                                pos(c).y -
                                15 +
                                (displayPath.slice(0, i).filter((x) => x === c).length % 3) * 9
                              }
                              fontSize="8"
                              fill="#3b7056"
                            >
                              {i + 1}
                            </text>
                          ))}
                        <motion.g
                          initial={false}
                          animate={{ x: player.x, y: player.y }}
                          transition={{ duration: reducedMotion ? 0 : 0.11, ease: 'easeOut' }}
                          pointerEvents="none"
                          data-testid="player"
                        >
                          <ellipse cy="18" rx="19" ry="5" fill="#2f4f3520" />
                          <g opacity={playAt === null ? 0.8 : 1}>
                            <ellipse cy="6" rx="14" ry="13" fill="#bd7f48" />
                            <ellipse cx="-12" cy="-6" rx="7" ry="12" fill="#88532f" />
                            <ellipse cx="12" cy="-6" rx="7" ry="12" fill="#88532f" />
                            <ellipse cy="-4" rx="14" ry="13" fill="#e4b477" />
                            <ellipse cy="3" rx="9" ry="6" fill="#f7e8ce" />
                            <circle cx="-5" cy="-7" r="2" fill="#253b2b" />
                            <circle cx="5" cy="-7" r="2" fill="#253b2b" />
                            <path d="M-3 0Q0 -3 3 0L0 4Z" fill="#253b2b" />
                            <path d="M-10 10H10" stroke="#3c7c64" strokeWidth="4" />
                          </g>
                          {displayState.discovery === 1 && (
                            <image href={treatArt} x="5" y="-28" width="24" height="24" />
                          )}
                        </motion.g>
                      </svg>
                    )}
                    {hidden && (
                      <div className="board-cover">
                        <span className="cover-icon">
                          {phase === 'paused' ? <Pause /> : <Clock3 />}
                        </span>
                        <h3>
                          {phase === 'paused' ? 'Take a breather.' : 'Ready for a little pressure?'}
                        </h3>
                        <p>
                          {phase === 'paused'
                            ? 'Your plan and remaining time are safe.'
                            : '60 seconds. Unlimited valid attempts. Your shortest route wins.'}
                        </p>
                        <Button
                          className="primary"
                          onClick={() => {
                            setPhase('running');
                            lastTick.current = performance.now();
                          }}
                        >
                          <Play size={16} />
                          {phase === 'paused' ? 'Resume puzzle' : 'Start challenge'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="board-caption">
                  <span>
                    <span className="preview-dot" />
                    {playAt !== null ? `Playing step ${playAt} of ${path.length}` : 'Plan preview'}
                    {assisted ? ' · Assisted' : ''}
                  </span>
                  <label>
                    <input
                      type="checkbox"
                      checked={showSteps}
                      onChange={(e) => setShowSteps(e.target.checked)}
                    />{' '}
                    Step numbers
                  </label>
                </div>
                <div className="controls">
                  <div>
                    <Button onClick={undo} disabled={!editable || !path.length}>
                      <Undo2 size={16} />
                      Undo
                    </Button>
                    <Button onClick={clear} disabled={!editable || !path.length}>
                      <RotateCcw size={15} />
                      Clear
                    </Button>
                    <Button
                      onClick={() => setPhase('paused')}
                      disabled={phase !== 'running'}
                      aria-label="Pause puzzle"
                    >
                      <Pause size={16} />
                    </Button>
                  </div>
                  {playAt !== null ? (
                    <Button className="primary" onClick={() => setPlayAt(null)}>
                      Edit plan <ArrowRight size={16} />
                    </Button>
                  ) : (
                    <Button
                      className="primary go"
                      onClick={submit}
                      disabled={!valid || !editable || runGuard.current}
                    >
                      Go <Play size={15} />
                    </Button>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={phase === 'ended' ? 'ended' : result || notice || 'planning'}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className={result ? 'feedback success' : 'feedback'}
                    aria-live="polite"
                  >
                    {phase === 'ended' ? (
                      <>
                        <strong>
                          {best === null
                            ? 'Time’s up. No completed route.'
                            : `Challenge complete · Best: ${best} moves`}
                        </strong>
                        <span>
                          {best === null
                            ? 'Incomplete plans do not score. Try another round.'
                            : `${best - level.optimal} above optimal · ${attempts} accepted attempt(s).`}
                        </span>
                        <Button onClick={() => reset(level)}>
                          Retry challenge <ArrowRight size={14} />
                        </Button>
                      </>
                    ) : result ? (
                      <>
                        <strong>
                          <CheckCircle2 size={17} />
                          {result}
                        </strong>
                        <span>
                          {path.length} moves · Optimal: {level.optimal}
                          {assisted ? ' · Assisted solution' : ''}
                        </span>
                        <Button onClick={random}>
                          Next puzzle <ArrowRight size={14} />
                        </Button>
                      </>
                    ) : (
                      <span>
                        {notice ||
                          (valid
                            ? 'All objectives complete. Press Go to submit your route.'
                            : 'Click an adjacent cell, drag from the marker, or use arrow keys. Retracing adds moves.')}
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
                <div className="direction-pad" aria-label="Direction controls">
                  {[
                    { label: 'Move up', delta: -n, icon: '↑' },
                    { label: 'Move left', delta: -1, icon: '←' },
                    { label: 'Move down', delta: n, icon: '↓' },
                    { label: 'Move right', delta: 1, icon: '→' },
                  ].map(({ label, delta, icon }) => (
                    <Button
                      key={label}
                      aria-label={label}
                      disabled={!editable}
                      onClick={() => move(state.cell + delta)}
                    >
                      {icon}
                    </Button>
                  ))}
                </div>
              </motion.section>
              <motion.aside
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="objectives-panel"
              >
                <div className="panel-title">
                  <h2>A little to-do list</h2>
                  <Flag size={16} />
                </div>
                <div className="mocha-note">
                  <img src={mochaArt} alt="Princess Mocha" />
                  <div>
                    <span>Princess Mocha says</span>
                    <p>
                      {displayState.discovery === 2
                        ? '“Acceptable. You may proceed.”'
                        : level.discovery >= 0
                          ? '“A treat first. Adventure second.”'
                          : '“Do try not to get lost.”'}
                    </p>
                  </div>
                </div>
                <p className="quiet">Complete each task, then head home.</p>
                <div className="objective">
                  <span
                    className={
                      displayState.mask === (1 << level.items.length) - 1
                        ? 'objective-icon done'
                        : 'objective-icon'
                    }
                  >
                    <Diamond size={19} />
                  </span>
                  <div>
                    <strong>Collect all diamonds</strong>
                    <p>
                      {countBits(displayState.mask)} of {level.items.length} collected
                      {level.config.ordered ? ' · in order' : ''}
                    </p>
                    <div className="pips">
                      {level.items.map((_, i) => (
                        <span key={i} className={displayState.mask & (1 << i) ? 'filled' : ''}>
                          {displayState.mask & (1 << i) ? <Check size={10} /> : i + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {level.key >= 0 && (
                  <div className="objective">
                    <span
                      className={displayState.key ? 'objective-icon done' : 'objective-icon gold'}
                    >
                      <KeyRound size={19} />
                    </span>
                    <div>
                      <strong>Unlock the gold gate</strong>
                      <p>{displayState.key ? 'Key found · gate open' : 'Find the gold key'}</p>
                    </div>
                  </div>
                )}
                {level.discovery >= 0 && (
                  <div className="objective">
                    <span
                      className={
                        displayState.discovery === 2
                          ? 'objective-icon done'
                          : 'objective-icon purple'
                      }
                    >
                      <Package size={19} />
                    </span>
                    <div>
                      <strong>Make a royal delivery</strong>
                      <p>
                        {
                          [
                            'Find the golden treat',
                            'Carry it to the D tile',
                            'Delivered · rose gate open',
                          ][displayState.discovery]
                        }
                      </p>
                      <div className="delivery-stages">
                        <span className={displayState.discovery >= 1 ? 'active' : ''}>Find</span>
                        <ArrowRight size={10} />
                        <span className={displayState.discovery === 1 ? 'active' : ''}>Carry</span>
                        <ArrowRight size={10} />
                        <span className={displayState.discovery === 2 ? 'active' : ''}>
                          Deliver
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="objective">
                  <span
                    className={won(level, displayState) ? 'objective-icon done' : 'objective-icon'}
                  >
                    <Home size={19} />
                  </span>
                  <div>
                    <strong>Find your way home</strong>
                    <p>Bottom-right corner</p>
                  </div>
                </div>
                <div className="tip">
                  <span>THE FEWEST MOVES WIN</span>
                  <p>
                    Backtracking is part of the puzzle. Walking back adds a move;{' '}
                    <strong>Undo</strong> removes one.
                  </p>
                </div>
                <Button
                  className="solution-button"
                  disabled={!editable || (mode === 'timed' && phase === 'running')}
                  onClick={reveal}
                >
                  Show one optimal solution <ArrowRight size={15} />
                </Button>
                <p className="quiet small">
                  Loads a route and marks it assisted. Disabled during a timed challenge.
                </p>
                <details>
                  <summary>
                    Generation details <ChevronDown size={14} />
                  </summary>
                  <p>
                    Seed: {level.seed}
                    <br />
                    Method: DFS + loops
                    <br />
                    Solver: full-state BFS
                    <br />
                    States checked: {level.explored.toLocaleString()}
                    <br />
                    Rules: V3 collection, keys & delivery
                  </p>
                </details>
              </motion.aside>
            </div>
            <footer>
              <span>PAWZZLE / MAZE LAB</span>
              <p>A good day for a clever little adventure.</p>
              <span>Local prototype · No ranked scores</span>
            </footer>
          </main>
          <Dialog open={help} onOpenChange={setHelp}>
            <DialogContent className="help-modal">
              <DialogTitle>Plan first. Then paws on.</DialogTitle>
              <DialogDescription>Every step matters. Here’s how to get home.</DialogDescription>
              <ol>
                <li>
                  <strong>Draw your route.</strong> Tap adjacent tiles, drag from the dog, or use
                  the arrow keys.
                </li>
                <li>
                  <strong>Follow your checklist.</strong> Collect diamonds and the gold key. Bring
                  the golden treat to Mocha’s D tile to open the rose gate.
                </li>
                <li>
                  <strong>Make it home.</strong> Go becomes available when your route ends at the
                  doghouse with every task complete.
                </li>
                <li>
                  <strong>Watch and improve.</strong> Press Go to score your plan and watch the dog
                  follow it. Undo removes a step; retracing adds one.
                </li>
              </ol>
              <p>
                The puzzle stays paused while you read. Close this guide and choose Resume when
                you’re ready.
              </p>
              <Button className="primary" onClick={() => setHelp(false)}>
                Got it <ArrowRight size={16} />
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}
