import { initialState, isComplete, stateKey, transition, RuleError } from './rules.js';
// 0–1 BFS: all transitions share the simulator's rules, including zero-cost toggles.
export function solveLevel(level, { maxStates = 200000, maxTransitions = 2000000 } = {}) {
  if (
    !Number.isInteger(maxStates) ||
    maxStates < 1 ||
    !Number.isInteger(maxTransitions) ||
    maxTransitions < 1
  )
    throw new RangeError('Solver budgets must be positive integers.');
  const start = initialState(level),
    startKey = stateKey(start);
  const distances = new Map([[startKey, 0]]),
    parents = new Map();
  const deque = new Map([[0, { state: start, cost: 0 }]]);
  let head = 0,
    tail = 1,
    transitions = 0;
  while (head < tail) {
    const entry = deque.get(head);
    deque.delete(head++);
    const key = stateKey(entry.state);
    if (entry.cost !== distances.get(key)) continue;
    if (isComplete(level, entry.state)) {
      const actions = [];
      let cursor = key;
      while (cursor !== startKey) {
        const parent = parents.get(cursor);
        actions.push(parent.action);
        cursor = parent.key;
      }
      actions.reverse();
      return {
        status: 'proven',
        optimalMoveCount: entry.cost,
        actions,
        visitedStates: distances.size,
        transitions,
      };
    }
    const actions = ['up', 'down', 'left', 'right'].map((direction) => ({
      type: 'move',
      direction,
    }));
    for (const lever of level.definition.levers)
      if (lever.cell === entry.state.dogCell)
        actions.push({ type: 'activateLever', leverId: lever.id });
    for (const action of actions) {
      if (++transitions > maxTransitions)
        return { status: 'unverified', reason: 'transition-budget', visitedStates: distances.size };
      let step;
      try {
        step = transition(level, entry.state, action);
      } catch (error) {
        if (error instanceof RuleError && error.code === 'BLOCKED_MOVE') continue;
        throw error;
      }
      const nextKey = stateKey(step.state),
        cost = entry.cost + step.moveCost;
      if (cost >= (distances.get(nextKey) ?? Infinity)) continue;
      if (!distances.has(nextKey) && distances.size >= maxStates)
        return { status: 'unverified', reason: 'state-budget', visitedStates: distances.size };
      distances.set(nextKey, cost);
      parents.set(nextKey, { key, action });
      const next = { state: step.state, cost };
      if (step.moveCost === 0) deque.set(--head, next);
      else deque.set(tail++, next);
    }
  }
  return { status: 'unsolvable', visitedStates: distances.size, transitions };
}
