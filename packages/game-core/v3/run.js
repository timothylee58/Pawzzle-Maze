import { simulate, RuleError, MAX_ACTIONS } from './rules.js';
import { demonstratesTutorial } from './levels.js';
export const saveKey = (level) =>
  `pawzzle:rules-${level.rulesVersion}:${level.levelId}@${level.levelVersion}`;
const error = (code, message) => {
  throw new RuleError(code, message);
};
function checkedRequest(level, request) {
  if (
    !request ||
    Object.keys(request).some(
      (k) => !['submissionId', 'levelVersion', 'rulesVersion', 'planActions'].includes(k),
    )
  )
    error('INVALID_SUBMISSION', 'Submit only an ID, versions and plan actions.');
  if (
    typeof request.submissionId !== 'string' ||
    request.submissionId.length < 8 ||
    request.submissionId.length > 100
  )
    error('INVALID_SUBMISSION', 'A stable submission ID is required.');
  if (request.levelVersion !== level.levelVersion || request.rulesVersion !== level.rulesVersion)
    error('VERSION_MISMATCH', 'Level or rules version does not match.');
  if (!Array.isArray(request.planActions) || request.planActions.length > MAX_ACTIONS)
    error('INVALID_PLAN', 'Invalid action sequence.');
  return JSON.stringify({
    levelVersion: request.levelVersion,
    rulesVersion: request.rulesVersion,
    planActions: request.planActions.map((a) =>
      a?.type === 'move'
        ? {
            type: a.type,
            direction: a.direction,
            ...Object.fromEntries(
              Object.entries(a).filter(([k]) => !['type', 'direction'].includes(k)),
            ),
          }
        : a,
    ),
  });
}
export class PuzzleRun {
  constructor(
    entry,
    { mode = 'campaign', now = 0, timeLimitMs = 60000, assisted = false, challengeId = null } = {},
  ) {
    if (!['campaign', 'localTimed', 'ranked'].includes(mode))
      error('INVALID_MODE', 'Unsupported mode.');
    if (!Number.isFinite(now) || !Number.isInteger(timeLimitMs) || timeLimitMs < 1)
      error('INVALID_TIME', 'Invalid clock or budget.');
    if (entry.solution.status !== 'proven')
      error('UNVERIFIED_LEVEL', 'A proven optimum is required.');
    if (mode === 'ranked' && (typeof challengeId !== 'string' || !challengeId))
      error('INVALID_CHALLENGE', 'A ranked result needs a challenge identity.');
    this.entry = entry;
    this.challengeId = challengeId;
    this.mode = mode;
    this.originalMode = mode;
    this.startedAt = now;
    this.lastClock = now;
    this.timeLimitMs = timeLimitMs;
    this.rankedDeadline = now + timeLimitMs;
    this.elapsedBeforePause = 0;
    this.segmentStartedAt = now;
    this.pauseReasons = [];
    this.status = 'active';
    this.rankedEligible = mode === 'ranked' && !assisted;
    this.assisted = assisted;
    this.muted = false;
    this.attempts = 0;
    this.best = null;
    this.bestUnassisted = null;
    this.tutorialCompleted = false;
    this.submissions = {};
  }
  clock(now) {
    if (!Number.isFinite(now) || now < this.lastClock)
      error('INVALID_TIME', 'The clock must be monotonic.');
    this.lastClock = now;
    return now;
  }
  elapsed(now) {
    return (
      this.elapsedBeforePause + (this.segmentStartedAt === null ? 0 : now - this.segmentStartedAt)
    );
  }
  refresh(now) {
    this.clock(now);
    if (
      this.status === 'active' &&
      this.mode !== 'campaign' &&
      ((this.mode === 'ranked' && now >= this.rankedDeadline) ||
        this.elapsed(now) >= this.timeLimitMs)
    ) {
      this.elapsedBeforePause = Math.min(this.timeLimitMs, this.elapsed(now));
      this.segmentStartedAt = null;
      this.status = 'finished';
    }
    return this;
  }
  view(now = this.lastClock) {
    this.refresh(now);
    return {
      mode: this.mode,
      status: this.status,
      rankedEligible: this.rankedEligible,
      assisted: this.assisted,
      completedAttempts: this.attempts,
      best: this.best,
      bestUnassisted: this.bestUnassisted,
      tutorialCompleted: this.tutorialCompleted,
      elapsedMs: this.elapsed(now),
      remainingMs:
        this.mode === 'campaign' ? null : Math.max(0, this.timeLimitMs - this.elapsed(now)),
      boardCovered: this.pauseReasons.length > 0,
      inputEnabled: this.status === 'active' && !this.pauseReasons.length,
      playbackEnabled: this.status !== 'interrupted' && !this.pauseReasons.length,
      audioEnabled: !this.muted && !this.pauseReasons.length,
      muted: this.muted,
      pauseReasons: [...this.pauseReasons],
    };
  }
  preview(actions, now = this.lastClock) {
    this.refresh(now);
    if (this.status !== 'active' || this.pauseReasons.length)
      error('RUN_NOT_ACTIVE', 'Resume planning before editing.');
    return simulate(this.entry.compiled, actions);
  }
  submit(request, now = this.lastClock) {
    this.clock(now);
    const payload = checkedRequest(this.entry.compiled.definition, request);
    const prior = Object.hasOwn(this.submissions, request.submissionId)
      ? this.submissions[request.submissionId]
      : null;
    if (prior) {
      if (prior.payload !== payload)
        error('IDEMPOTENCY_CONFLICT', 'Submission ID was used for another plan.');
      return structuredClone(prior.result);
    }
    this.refresh(now);
    if (this.status !== 'active' || this.pauseReasons.length)
      error('RUN_NOT_ACTIVE', 'This run cannot accept submissions.');
    if (this.mode === 'ranked' && !this.rankedEligible)
      error('RANKED_INTERRUPTED', 'Ranked eligibility has ended.');
    const simulation = simulate(this.entry.compiled, request.planActions, { trace: false });
    if (!simulation.complete)
      error(
        'INCOMPLETE_PLAN',
        'Collect required items, fulfill royal requests, and end at the doghouse.',
      );
    const d = this.entry.compiled.definition;
    const result = {
      levelId: d.levelId,
      levelVersion: d.levelVersion,
      rulesVersion: d.rulesVersion,
      submissionId: request.submissionId,
      challengeId: this.challengeId,
      planActions: structuredClone(request.planActions),
      moveCount: simulation.moveCount,
      optimalMoveCount: this.entry.solution.optimalMoveCount,
      extraMoves: simulation.moveCount - this.entry.solution.optimalMoveCount,
      completedAttempts: this.attempts + 1,
      assisted: this.assisted,
      mode: this.mode,
      acceptedElapsedMs: this.mode === 'campaign' ? null : this.elapsed(now),
      validationStatus: 'accepted',
      leverActionCount: simulation.leverActionCount,
      finalState: simulation.state,
      improved: !this.best || simulation.moveCount < this.best.moveCount,
    };
    if (result.extraMoves < 0)
      error('SOLVER_MISMATCH', 'Plan beat the verified optimum; refuse to score this level.');
    this.attempts++;
    if (result.improved) this.best = structuredClone(result);
    if (
      !result.assisted &&
      (!this.bestUnassisted || result.moveCount < this.bestUnassisted.moveCount)
    )
      this.bestUnassisted = structuredClone(result);
    if (d.tutorial && demonstratesTutorial(this.entry.compiled, simulation))
      this.tutorialCompleted = true;
    result.tutorialCompleted = this.tutorialCompleted;
    Object.defineProperty(this.submissions, request.submissionId, {
      value: { payload, result: structuredClone(result) },
      writable: true,
      configurable: true,
      enumerable: true,
    });
    if (this.mode !== 'campaign' && result.extraMoves === 0) {
      this.elapsedBeforePause = this.elapsed(now);
      this.segmentStartedAt = null;
      this.status = 'finished';
    }
    return result;
  }
  finish(now = this.lastClock) {
    this.refresh(now);
    if (this.status === 'finished') return this.view(now);
    if (this.status === 'interrupted')
      error('RANKED_INTERRUPTED', 'Continue as practice after interruption.');
    if (!this.best) error('NO_COMPLETED_PLAN', 'Finish is available after a valid submission.');
    this.elapsedBeforePause = this.elapsed(now);
    this.segmentStartedAt = null;
    this.status = 'finished';
    return this.view(now);
  }
  pause(reason, now = this.lastClock) {
    if (!['explicit', 'platform', 'hidden', 'reload'].includes(reason))
      error('INVALID_PAUSE', 'Unknown pause reason.');
    this.refresh(now);
    if (!this.pauseReasons.includes(reason)) {
      if (!this.pauseReasons.length) {
        this.elapsedBeforePause = this.elapsed(now);
        this.segmentStartedAt = null;
      }
      this.pauseReasons.push(reason);
    }
    if (this.mode === 'ranked' && this.status === 'active') {
      this.rankedEligible = false;
      this.status = 'interrupted';
    }
    return this.view(now);
  }
  resume(reason, now = this.lastClock) {
    this.clock(now);
    if (!['explicit', 'platform', 'hidden', 'reload'].includes(reason))
      error('INVALID_PAUSE', 'Unknown pause reason.');
    this.pauseReasons = this.pauseReasons.filter((r) => r !== reason);
    if (this.status === 'active' && !this.pauseReasons.length && this.segmentStartedAt === null)
      this.segmentStartedAt = now;
    return this.view(now);
  }
  continueAsPractice(now = this.lastClock) {
    this.clock(now);
    if (this.status !== 'interrupted')
      error('INVALID_MODE', 'Only an interrupted ranked run can continue as practice.');
    this.mode = 'localTimed';
    this.rankedEligible = false;
    this.status = 'active';
    if (!this.pauseReasons.length) this.segmentStartedAt = now;
    return this.view(now);
  }
  setMuted(muted) {
    if (typeof muted !== 'boolean') error('INVALID_SETTING', 'Mute must be boolean.');
    this.muted = muted;
  }
  solution({ assistance = false } = {}) {
    if (!this.best && !assistance)
      error('ASSISTANCE_REQUIRED', 'Choose assistance before revealing a solution.');
    if (this.mode === 'ranked' && this.status === 'active')
      error('RANKED_ASSISTANCE', 'Solutions are unavailable during ranked play.');
    this.assisted = true;
    this.rankedEligible = false;
    return {
      label: 'One optimal solution',
      optimalMoveCount: this.entry.solution.optimalMoveCount,
      planActions: structuredClone(this.entry.solution.actions),
    };
  }
  snapshot(now = this.lastClock) {
    this.refresh(now);
    const data = {};
    for (const key of Object.keys(this))
      if (key !== 'entry') data[key] = structuredClone(this[key]);
    return { schemaVersion: 1, saveKey: saveKey(this.entry.compiled.definition), ...data };
  }
  static restore(entry, snapshot, { now = snapshot.lastClock, reload = false } = {}) {
    if (snapshot.schemaVersion !== 1 || snapshot.saveKey !== saveKey(entry.compiled.definition))
      error('VERSION_MISMATCH', 'Saved progress belongs to another level/rules version.');
    const run = new PuzzleRun(entry);
    for (const key of Object.keys(run))
      if (key !== 'entry' && Object.hasOwn(snapshot, key))
        run[key] = structuredClone(snapshot[key]);
    // Local snapshots are trusted local saves, never accepted as ranked HTTP input.
    if (reload) {
      run.pause('reload', snapshot.lastClock);
      run.lastClock = now;
      run.segmentStartedAt = null;
    } else run.refresh(now);
    return run;
  }
}
export class Campaign {
  constructor(catalog, saved = { schemaVersion: 1, runs: {} }) {
    if (saved.schemaVersion !== 1) error('VERSION_MISMATCH', 'Unknown campaign save version.');
    this.catalog = catalog;
    this.runs = structuredClone(saved.runs);
  }
  entry(id) {
    const entry = this.catalog.get(id);
    if (!entry) error('LEVEL_NOT_FOUND', 'Unknown level.');
    return entry;
  }
  run(id) {
    const entry = this.entry(id),
      key = saveKey(entry.compiled.definition);
    return this.runs[key] ? PuzzleRun.restore(entry, this.runs[key]) : new PuzzleRun(entry);
  }
  unlocked(id) {
    return (this.entry(id).compiled.definition.prerequisites ?? []).every((prerequisite) =>
      this.entry(prerequisite).compiled.definition.tutorial
        ? this.run(prerequisite).tutorialCompleted
        : Boolean(this.run(prerequisite).best),
    );
  }
  requireUnlocked(id) {
    if (!this.unlocked(id)) error('LEVEL_LOCKED', 'Complete the previous puzzle first.');
  }
  learnedMechanics() {
    const learned = new Set();
    for (const [id, entry] of this.catalog)
      if (this.run(id).tutorialCompleted)
        for (const mechanic of entry.compiled.definition.tutorial?.teaches ?? [])
          learned.add(mechanic);
    return [...learned];
  }
  submit(id, request) {
    this.requireUnlocked(id);
    const run = this.run(id),
      result = run.submit(request, 0);
    this.runs[saveKey(run.entry.compiled.definition)] = run.snapshot(0);
    return result;
  }
  solution(id, options) {
    this.requireUnlocked(id);
    const run = this.run(id),
      solution = run.solution(options);
    this.runs[saveKey(run.entry.compiled.definition)] = run.snapshot(0);
    return solution;
  }
  progress() {
    return [...this.catalog].map(([id, entry]) => {
      const run = this.run(id);
      return {
        levelId: id,
        levelVersion: entry.compiled.definition.levelVersion,
        rulesVersion: entry.compiled.definition.rulesVersion,
        title: entry.compiled.definition.title,
        unlocked: this.unlocked(id),
        completed: Boolean(run.best),
        completedAttempts: run.attempts,
        best: run.best,
        bestUnassisted: run.bestUnassisted,
        tutorialCompleted: run.tutorialCompleted,
        assisted: run.assisted,
      };
    });
  }
  startTimed(id, now = 0) {
    this.requireUnlocked(id);
    const entry = this.entry(id),
      config = entry.compiled.definition.modeConfig;
    if (!config?.timed)
      error('TIMED_UNAVAILABLE', 'This level is not configured for timed replay.');
    const learned = this.learnedMechanics(),
      required = new Set([...entry.compiled.mechanics, ...(config.requiresMechanics ?? [])]);
    if ([...required].some((m) => !learned.includes(m)))
      error(
        'TUTORIAL_REQUIRED',
        'Complete the separate mechanic tutorials before starting the clock.',
      );
    return new PuzzleRun(entry, {
      mode: 'localTimed',
      now,
      timeLimitMs: config.timeLimitMs ?? 60000,
      assisted: this.run(id).assisted,
    });
  }
  snapshot() {
    return { schemaVersion: 1, runs: structuredClone(this.runs) };
  }
}
export function rankResults(results) {
  const eligible = results.filter(
    (r) => r.mode === 'ranked' && !r.assisted && r.validationStatus === 'accepted',
  );
  if (!eligible.length) return [];
  if (eligible.some((r) => typeof r.challengeId !== 'string' || !r.challengeId))
    error('INVALID_CHALLENGE', 'A ranked result needs a challenge identity.');
  const scope = (r) => `${r.challengeId}:${r.levelId}@${r.levelVersion}:${r.rulesVersion}`;
  if (eligible.some((r) => scope(r) !== scope(eligible[0])))
    error('MIXED_RANKING_SCOPE', 'Only compare the same level and rules versions.');
  const sorted = [...eligible].sort(
    (a, b) => a.extraMoves - b.extraMoves || a.acceptedElapsedMs - b.acceptedElapsedMs,
  );
  let rank = 0;
  return sorted.map((r, i) => {
    if (
      !i ||
      r.extraMoves !== sorted[i - 1].extraMoves ||
      r.acceptedElapsedMs !== sorted[i - 1].acceptedElapsedMs
    )
      rank = i + 1;
    return { ...r, rank };
  });
}
