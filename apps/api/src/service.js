import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { generate, valid, ranks } from '@pawzzle/game-core';
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function createService(db, clock = Date.now) {
  const hash = (t) => createHash('sha256').update(t).digest('hex');
  const getRound = (id, player) => {
    const r = db.prepare('SELECT * FROM rounds WHERE id=? AND player_id=?').get(id, player);
    if (!r) throw new ApiError(404, 'Round not found.');
    if (r.status === 'active' && clock() >= r.deadline_at) {
      db.prepare("UPDATE rounds SET status='finished' WHERE id=?").run(id);
      r.status = 'finished';
    }
    return r;
  };
  const definition = (id) =>
    JSON.parse(db.prepare('SELECT definition FROM challenges WHERE id=?').get(id).definition);
  const view = (r) => {
    const m = definition(r.challenge_id);
    return {
      id: r.id,
      challengeId: r.challenge_id,
      startedAt: r.started_at,
      deadlineAt: r.deadline_at,
      serverNow: clock(),
      status: r.status,
      attempts: r.attempts,
      best: r.best ? JSON.parse(r.best) : null,
      maze: { n: m.n, g: m.g, seed: m.seed, challengeId: m.challengeId },
      ...(r.status === 'finished' ? { optimal: m.optimal } : {}),
    };
  };
  const daily = () => {
    const date = new Date(clock()).toISOString().slice(0, 10),
      id = `daily-maze-1-${date}`;
    let row = db.prepare('SELECT definition FROM challenges WHERE id=?').get(id);
    if (!row) {
      const m = generate(8, date);
      m.challengeId = id;
      db.prepare('INSERT OR IGNORE INTO challenges VALUES(?,?,?)').run(
        id,
        JSON.stringify(m),
        clock(),
      );
    }
    return {
      id,
      date,
      rulesVersion: '1',
      generatorVersion: 'maze-1',
      gridSize: 8,
      timeLimitMs: 60000,
      resetsAt: Date.parse(`${date}T00:00:00Z`) + 86400000,
    };
  };
  return {
    session(token) {
      if (token) {
        const prior = db
          .prepare('SELECT player_id FROM sessions WHERE token_hash=?')
          .get(hash(token));
        if (prior) return { playerId: prior.player_id, token };
      }
      const fresh = randomBytes(32).toString('hex'),
        playerId = randomUUID();
      db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(fresh), playerId, clock());
      return { playerId, token: fresh };
    },
    player(token) {
      const s =
        token && db.prepare('SELECT player_id FROM sessions WHERE token_hash=?').get(hash(token));
      if (!s) throw new ApiError(401, 'Start a session first.');
      return s.player_id;
    },
    daily(player) {
      const meta = daily();
      const r = db
        .prepare('SELECT id FROM rounds WHERE challenge_id=? AND player_id=?')
        .get(meta.id, player);
      return { ...meta, roundId: r?.id ?? null };
    },
    start(player) {
      const meta = daily();
      const prior = db
        .prepare('SELECT id FROM rounds WHERE challenge_id=? AND player_id=?')
        .get(meta.id, player);
      if (prior) return view(getRound(prior.id, player));
      const now = clock(),
        id = randomUUID();
      db.prepare(
        'INSERT INTO rounds(id,challenge_id,player_id,started_at,deadline_at) VALUES(?,?,?,?,?)',
      ).run(id, meta.id, player, now, now + 60000);
      return view(getRound(id, player));
    },
    round(id, player) {
      return view(getRound(id, player));
    },
    finish(id, player) {
      getRound(id, player);
      db.prepare("UPDATE rounds SET status='finished' WHERE id=?").run(id);
      return view(getRound(id, player));
    },
    submit(id, player, submission) {
      const received = clock();
      const r = getRound(id, player);
      const payload = JSON.stringify(submission.orderedCellIds);
      const previous = db
        .prepare('SELECT * FROM submissions WHERE round_id=? AND id=?')
        .get(id, submission.submissionId);
      if (previous) {
        if (previous.payload !== payload)
          throw new ApiError(409, 'Submission ID was already used for a different route.');
        return { ...JSON.parse(previous.result), round: view(r) };
      }
      if (r.status !== 'active' || received >= r.deadline_at)
        throw new ApiError(409, 'This round has ended.');
      const m = definition(r.challenge_id),
        path = submission.orderedCellIds;
      if (
        !Array.isArray(path) ||
        path.length > m.n * m.n ||
        !path.every((x) => Number.isInteger(x) && x >= 0 && x < m.n * m.n) ||
        !valid(path, m.g)
      )
        throw new ApiError(
          422,
          'The route must connect S to G through open passages without repeated cells.',
        );
      const best = r.best ? JSON.parse(r.best) : null;
      const result = {
        submissionId: submission.submissionId,
        path,
        moves: path.length - 1,
        extra: path.length - m.optimal.length,
        elapsed: received - r.started_at,
        validationStatus: 'accepted',
        improved: !best || path.length - 1 < best.moves,
      };
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('UPDATE rounds SET attempts=attempts+1,best=?,status=? WHERE id=?').run(
          JSON.stringify(result.improved ? result : best),
          result.extra === 0 ? 'finished' : 'active',
          id,
        );
        db.prepare('INSERT INTO submissions VALUES(?,?,?,?)').run(
          id,
          submission.submissionId,
          payload,
          JSON.stringify(result),
        );
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return { ...result, round: view(getRound(id, player)) };
    },
    leaderboard(challengeId) {
      const rows = db
        .prepare('SELECT player_id,best FROM rounds WHERE challenge_id=? AND best IS NOT NULL')
        .all(challengeId);
      return ranks(
        rows.map((r) => {
          const b = JSON.parse(r.best);
          return {
            player: `Player ${r.player_id.slice(0, 8)}`,
            moves: b.moves,
            extra: b.extra,
            elapsed: b.elapsed,
          };
        }),
      );
    },
  };
}
