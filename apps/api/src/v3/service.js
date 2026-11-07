import { randomUUID } from 'node:crypto';
import {
  Campaign,
  PuzzleRun,
  createCatalog,
  compileLevel,
  simulate,
  RuleError,
  requestProgress,
} from '@pawzzle/game-core/v3';
import { ApiError } from '../service.js';
export function createV3Service(db, clock = Date.now, { catalog = createCatalog() } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS v3_campaign_saves(player_id TEXT PRIMARY KEY,save TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS v3_timed_runs(id TEXT PRIMARY KEY,player_id TEXT NOT NULL,start_id TEXT NOT NULL,level_id TEXT NOT NULL,level_version INTEGER NOT NULL,rules_version TEXT NOT NULL,definition TEXT NOT NULL,solution TEXT NOT NULL,snapshot TEXT NOT NULL,UNIQUE(player_id,start_id));`);
  const loadCampaign = (player) => {
    const saved = db.prepare('SELECT save FROM v3_campaign_saves WHERE player_id=?').get(player);
    return new Campaign(catalog, saved ? JSON.parse(saved.save) : undefined);
  };
  const saveCampaign = (player, campaign) =>
    db
      .prepare(
        'INSERT INTO v3_campaign_saves VALUES(?,?) ON CONFLICT(player_id) DO UPDATE SET save=excluded.save',
      )
      .run(player, JSON.stringify(campaign.snapshot()));
  const transaction = (fn) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
  const versions = (entry, body) => {
    if (
      body.levelVersion !== entry.compiled.definition.levelVersion ||
      body.rulesVersion !== entry.compiled.definition.rulesVersion
    )
      throw new RuleError('VERSION_MISMATCH', 'Level or rules version does not match.');
  };
  const loadRun = (id, player) => {
    const row = db
      .prepare('SELECT * FROM v3_timed_runs WHERE id=? AND player_id=?')
      .get(id, player);
    if (!row) throw new ApiError(404, 'Timed run not found.');
    const entry = {
      compiled: compileLevel(JSON.parse(row.definition)),
      solution: JSON.parse(row.solution),
    };
    return { row, run: PuzzleRun.restore(entry, JSON.parse(row.snapshot)) };
  };
  const saveRun = (id, run, now) =>
    db
      .prepare('UPDATE v3_timed_runs SET snapshot=? WHERE id=?')
      .run(JSON.stringify(run.snapshot(now)), id);
  const runView = (id, run, now) => {
    const state = run.view(now);
    return {
      id,
      serverNow: now,
      ...state,
      ...(!state.boardCovered ? { level: run.entry.compiled.definition } : {}),
      ...(state.status === 'finished'
        ? { optimalMoveCount: run.entry.solution.optimalMoveCount }
        : {}),
    };
  };
  const preview = (entry, actions) => {
    try {
      const result = simulate(entry.compiled, actions);
      return {
        valid: true,
        canGo: result.complete,
        ...result,
        requests: requestProgress(entry.compiled, result.state),
      };
    } catch (error) {
      if (!(error instanceof RuleError)) throw error;
      return {
        valid: false,
        canGo: false,
        error: { code: error.code, message: error.message, actionIndex: error.actionIndex },
      };
    }
  };
  return {
    catalog(player) {
      const campaign = loadCampaign(player);
      return {
        rulesVersion: '3.0',
        scope: 'local-campaign',
        levels: campaign.progress(),
        learnedMechanics: campaign.learnedMechanics(),
      };
    },
    level(player, id) {
      const campaign = loadCampaign(player);
      campaign.requireUnlocked(id);
      return campaign.entry(id).compiled.definition;
    },
    preview(player, id, body) {
      const campaign = loadCampaign(player);
      campaign.requireUnlocked(id);
      const entry = campaign.entry(id);
      versions(entry, body);
      return preview(entry, body.planActions);
    },
    submit(player, id, body) {
      return transaction(() => {
        const campaign = loadCampaign(player),
          result = campaign.submit(id, body);
        saveCampaign(player, campaign);
        return {
          result,
          progress: campaign.progress(),
          learnedMechanics: campaign.learnedMechanics(),
        };
      });
    },
    solution(player, id, body) {
      return transaction(() => {
        const campaign = loadCampaign(player);
        versions(campaign.entry(id), body);
        const result = campaign.solution(id, { assistance: body.assistance });
        saveCampaign(player, campaign);
        // Revealing a campaign solution also marks an already-started replay as assisted.
        for (const row of db
          .prepare(
            'SELECT id FROM v3_timed_runs WHERE player_id=? AND level_id=? AND level_version=? AND rules_version=?',
          )
          .all(player, id, body.levelVersion, body.rulesVersion)) {
          const { run } = loadRun(row.id, player);
          if (run.status === 'active') {
            run.assisted = true;
            run.rankedEligible = false;
            saveRun(row.id, run, clock());
          }
        }
        return result;
      });
    },
    startTimed(player, body, receivedAt = clock()) {
      return transaction(() => {
        const prior = db
          .prepare('SELECT * FROM v3_timed_runs WHERE player_id=? AND start_id=?')
          .get(player, body.startId);
        if (prior) {
          if (
            prior.level_id !== body.levelId ||
            prior.level_version !== body.levelVersion ||
            prior.rules_version !== body.rulesVersion
          )
            throw new RuleError(
              'IDEMPOTENCY_CONFLICT',
              'Start ID belongs to another level or version.',
            );
          const { run } = loadRun(prior.id, player);
          saveRun(prior.id, run, receivedAt);
          return runView(prior.id, run, receivedAt);
        }
        const campaign = loadCampaign(player);
        versions(campaign.entry(body.levelId), body);
        const run = campaign.startTimed(body.levelId, receivedAt),
          id = randomUUID(),
          d = run.entry.compiled.definition;
        db.prepare('INSERT INTO v3_timed_runs VALUES(?,?,?,?,?,?,?,?,?)').run(
          id,
          player,
          body.startId,
          d.levelId,
          d.levelVersion,
          d.rulesVersion,
          JSON.stringify(d),
          JSON.stringify(run.entry.solution),
          JSON.stringify(run.snapshot(receivedAt)),
        );
        return runView(id, run, receivedAt);
      });
    },
    run(player, id, now = clock()) {
      const { run } = loadRun(id, player);
      saveRun(id, run, now);
      return runView(id, run, now);
    },
    submitTimed(player, id, body, receivedAt = clock()) {
      const { run } = loadRun(id, player);
      try {
        const result = run.submit(body, receivedAt);
        saveRun(id, run, receivedAt);
        return { result, run: runView(id, run, receivedAt) };
      } catch (error) {
        saveRun(id, run, receivedAt);
        throw error;
      }
    },
    previewTimed(player, id, body, now = clock()) {
      const { run } = loadRun(id, player);
      versions(run.entry, body);
      const result = run.preview(body.planActions, now);
      saveRun(id, run, now);
      return {
        valid: true,
        canGo: result.complete,
        ...result,
        requests: requestProgress(run.entry.compiled, result.state),
      };
    },
    lifecycle(player, id, operation, body, now = clock()) {
      const { run } = loadRun(id, player);
      if (operation === 'pause') run.pause(body.reason, now);
      else if (operation === 'resume') run.resume(body.reason, now);
      else if (operation === 'finish') run.finish(now);
      else if (operation === 'mute') run.setMuted(body.muted);
      saveRun(id, run, now);
      return runView(id, run, now);
    },
    timedSolution(player, id) {
      const { run } = loadRun(id, player);
      run.refresh(clock());
      if (run.status !== 'finished')
        throw new ApiError(409, 'Solutions are available after the timed run.');
      const result = {
        label: 'One optimal solution',
        optimalMoveCount: run.entry.solution.optimalMoveCount,
        planActions: run.entry.solution.actions,
      };
      saveRun(id, run, clock());
      return result;
    },
  };
}
