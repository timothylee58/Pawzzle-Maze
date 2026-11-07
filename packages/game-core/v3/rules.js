export const RULES_VERSION = '3.0';
export const MAX_ACTIONS = 4096;
export class RuleError extends Error {
  constructor(code, message, actionIndex = null) {
    super(message);
    this.code = code;
    this.actionIndex = actionIndex;
  }
}
const fail = (code, message) => {
  throw new RuleError(code, message);
};
const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const edgeId = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
};
export function compileLevel(input) {
  const d = structuredClone(input);
  if (
    !d ||
    typeof d !== 'object' ||
    typeof d.levelId !== 'string' ||
    !/^[a-z0-9-]{1,80}$/.test(d.levelId) ||
    !integer(d.levelVersion, 1, 100000) ||
    d.rulesVersion !== RULES_VERSION
  )
    fail('INVALID_LEVEL', 'A supported rules version and stable level identity are required.');
  if (!integer(d.width, 2, 10) || d.height !== d.width)
    fail('INVALID_LEVEL', 'Boards must be square and between 2 and 10 cells wide.');
  if (
    d.modeConfig?.timed &&
    (!integer(d.modeConfig.timeLimitMs, 1, 3600000) ||
      !Array.isArray(d.modeConfig.requiresMechanics ?? []))
  )
    fail('INVALID_LEVEL', 'Invalid timed mode configuration.');
  const cells = d.width * d.height;
  const checkCell = (c) => {
    if (!integer(c, 0, cells - 1)) fail('INVALID_LEVEL', 'Cell is outside the board.');
  };
  checkCell(d.startCell);
  checkCell(d.goalCell);
  if (d.startCell !== 0 || d.goalCell !== cells - 1)
    fail('INVALID_LEVEL', 'V3 starts top-left and finishes bottom-right.');
  for (const field of [
    'staticEdges',
    'controlledEdges',
    'requiredItems',
    'keys',
    'keyGates',
    'levers',
    'portalPairs',
    'discoveries',
    'royalRequests',
    'princessGateEdges',
    'interactionCells',
  ]) {
    if (d[field] === undefined) d[field] = [];
    if (!Array.isArray(d[field])) fail('INVALID_LEVEL', `${field} must be an array.`);
  }
  if (d.portalPairs.length)
    fail('UNSUPPORTED_MECHANIC', 'Portals are deferred from the V3 vertical slice.');
  if (
    d.requiredItems.length > 10 ||
    d.keys.length > 6 ||
    d.levers.length > 6 ||
    d.royalRequests.length > 4 ||
    d.discoveries.length > 4
  )
    fail('INVALID_LEVEL', 'This level exceeds the supported state-space limits.');
  if (!['unordered', 'ordered'].includes(d.collectionMode))
    fail('INVALID_LEVEL', 'Unknown collection mode.');
  const identify = (objects) => {
    const result = new Map(),
      occupied = new Set();
    objects.forEach((o, index) => {
      if (!o || typeof o.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(o.id) || result.has(o.id))
        fail('INVALID_LEVEL', 'Object IDs must be unique.');
      checkCell(o.cell);
      if (occupied.has(o.cell))
        fail('INVALID_LEVEL', 'Objects of the same kind cannot share a cell.');
      occupied.add(o.cell);
      result.set(o.id, index);
    });
    return result;
  };
  const itemIds = identify(d.requiredItems),
    keyIds = identify(d.keys),
    leverIds = identify(d.levers);
  if (
    d.requiredItems.some((i) => !['bone', 'tennis-ball', 'frisbee', 'squeaky-toy'].includes(i.kind))
  )
    fail('INVALID_LEVEL', 'Unknown required item kind.');
  if (d.collectionMode === 'ordered') {
    if (
      !Array.isArray(d.orderedItemIds) ||
      d.orderedItemIds.length !== itemIds.size ||
      new Set(d.orderedItemIds).size !== itemIds.size ||
      d.orderedItemIds.some((id) => !itemIds.has(id))
    )
      fail('INVALID_LEVEL', 'Ordered objectives must name every required item exactly once.');
  } else d.orderedItemIds = [];
  d.initialSwitchMask ??= 0;
  if (!integer(d.initialSwitchMask, 0, (1 << d.levers.length) - 1))
    fail('INVALID_LEVEL', 'Invalid initial switch mask.');
  const discoveryIds = identify(d.discoveries),
    requestIds = new Map(),
    interactionByRequest = new Map();
  const requestedDiscoveries = new Set();
  d.royalRequests.forEach((request, index) => {
    if (
      !request ||
      typeof request.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(request.id) ||
      requestIds.has(request.id) ||
      !discoveryIds.has(request.discoveryId) ||
      requestedDiscoveries.has(request.discoveryId)
    )
      fail('INVALID_LEVEL', 'Each request must reference one unique discovery.');
    requestIds.set(request.id, index);
    requestedDiscoveries.add(request.discoveryId);
  });
  if (requestedDiscoveries.size !== discoveryIds.size)
    fail('INVALID_LEVEL', 'Every discovery must belong to a royal request.');
  for (const interaction of d.interactionCells) {
    checkCell(interaction.cell);
    if (!requestIds.has(interaction.requestId) || interactionByRequest.has(interaction.requestId))
      fail('INVALID_LEVEL', 'Every request has exactly one interaction tile.');
    interactionByRequest.set(interaction.requestId, interaction.cell);
  }
  if (interactionByRequest.size !== requestIds.size)
    fail('INVALID_LEVEL', 'A request is missing its interaction tile.');
  const special = new Set();
  for (const object of [
    ...d.discoveries,
    ...d.interactionCells,
    ...d.requiredItems,
    ...d.keys,
    ...d.levers,
  ]) {
    if (special.has(object.cell) || object.cell === d.goalCell)
      fail('INVALID_LEVEL', 'Special tiles must be disjoint and cannot be the doghouse.');
    special.add(object.cell);
  }
  if (
    d.discoveries.some((item) => !['golden-treat', 'royal-ball', 'golden-leaf'].includes(item.kind))
  )
    fail('INVALID_LEVEL', 'Unknown royal discovery kind.');
  const edges = new Map();
  const addEdge = (pair, owner) => {
    if (!Array.isArray(pair) || pair.length !== 2)
      fail('INVALID_LEVEL', 'An edge must contain two cells.');
    const [a, b] = pair;
    checkCell(a);
    checkCell(b);
    if (
      Math.abs((a % d.width) - (b % d.width)) +
        Math.abs(Math.floor(a / d.width) - Math.floor(b / d.width)) !==
      1
    )
      fail('INVALID_LEVEL', 'Edges must connect orthogonal neighbors without wraparound.');
    const id = edgeId(a, b);
    if (edges.has(id)) fail('INVALID_LEVEL', 'Each edge must have exactly one owner.');
    edges.set(id, owner);
  };
  d.staticEdges.forEach((pair) => addEdge(pair, { kind: 'static' }));
  d.controlledEdges.forEach((e) => {
    if (!leverIds.has(e.leverId) || ![0, 1].includes(e.openWhen))
      fail('INVALID_LEVEL', 'Invalid controlled passage.');
    addEdge(e.cells, {
      kind: 'lever',
      index: leverIds.get(e.leverId),
      id: e.leverId,
      openWhen: e.openWhen,
    });
  });
  d.keyGates.forEach((e) => {
    if (!keyIds.has(e.keyId)) fail('INVALID_LEVEL', 'Gate has no matching key.');
    addEdge(e.cells, { kind: 'key', index: keyIds.get(e.keyId), id: e.keyId });
  });
  d.princessGateEdges.forEach((e) => {
    if (!requestIds.has(e.requestId)) fail('INVALID_LEVEL', 'Princess gate has no request.');
    addEdge(e.cells, { kind: 'princess', index: requestIds.get(e.requestId), id: e.requestId });
  });
  for (const request of d.royalRequests) {
    if (!d.princessGateEdges.some((e) => e.requestId === request.id))
      fail('INVALID_LEVEL', 'A royal request needs a linked passage.');
    // Test the topology with all other passages open: this gate cannot be bypassed.
    const reached = new Set([d.startCell]),
      queue = [d.startCell];
    for (let i = 0; i < queue.length; i++)
      for (const [key, owner] of edges) {
        if (owner.kind === 'princess' && owner.id === request.id) continue;
        const [a, b] = key.split(':').map(Number);
        const next = a === queue[i] ? b : b === queue[i] ? a : null;
        if (next !== null && !reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      }
    if (reached.has(d.goalCell))
      fail('INVALID_LEVEL', 'The doghouse must not bypass a princess gate.');
    if (
      !reached.has(d.discoveries[discoveryIds.get(request.discoveryId)].cell) ||
      !reached.has(interactionByRequest.get(request.id))
    )
      fail(
        'INVALID_LEVEL',
        'The discovery and interaction tile must be reachable before royal approval.',
      );
  }
  const mechanics = ['movement'];
  if (d.royalRequests.length) mechanics.push('royal-delivery');
  if (d.requiredItems.length) mechanics.push('collection');
  if (d.levers.length) mechanics.push('levers');
  if (d.collectionMode === 'ordered') mechanics.push('ordered');
  if (d.keys.length || d.keyGates.length) mechanics.push('keys');
  return {
    definition: freeze(d),
    edges,
    itemIds,
    keyIds,
    leverIds,
    mechanics: Object.freeze(mechanics),
    discoveryIds,
    requestIds,
    interactionByRequest,
    allItemsMask: (1 << d.requiredItems.length) - 1,
    allDiscoveriesMask: (1 << d.discoveries.length) - 1,
    allRequestsMask: (1 << d.royalRequests.length) - 1,
  };
}
function collect(level, state) {
  const d = level.definition,
    events = [];
  d.requiredItems.forEach((item, index) => {
    if (item.cell !== state.dogCell || state.collectedRequiredMask & (1 << index)) return;
    if (d.collectionMode === 'ordered' && d.orderedItemIds[state.nextRequiredIndex] !== item.id) {
      events.push({
        type: 'outOfOrder',
        itemId: item.id,
        nextItemId: d.orderedItemIds[state.nextRequiredIndex],
      });
      return;
    }
    state.collectedRequiredMask |= 1 << index;
    if (d.collectionMode === 'ordered') state.nextRequiredIndex++;
    events.push({ type: 'collected', itemId: item.id });
  });
  d.keys.forEach((key, index) => {
    if (key.cell === state.dogCell && !(state.collectedKeyMask & (1 << index))) {
      state.collectedKeyMask |= 1 << index;
      events.push({ type: 'keyCollected', keyId: key.id });
    }
  });
  d.discoveries.forEach((item, index) => {
    if (item.cell === state.dogCell && !(state.collectedDiscoveryMask & (1 << index))) {
      state.collectedDiscoveryMask |= 1 << index;
      state.carriedDiscoveryMask |= 1 << index;
      events.push({ type: 'discoveryCollected', discoveryId: item.id });
    }
  });
  d.royalRequests.forEach((request, index) => {
    if (
      level.interactionByRequest.get(request.id) !== state.dogCell ||
      state.fulfilledRequestMask & (1 << index)
    )
      return;
    const bit = 1 << level.discoveryIds.get(request.discoveryId);
    if (state.carriedDiscoveryMask & bit) {
      state.carriedDiscoveryMask &= ~bit;
      state.fulfilledRequestMask |= 1 << index;
      events.push({
        type: 'requestFulfilled',
        requestId: request.id,
        discoveryId: request.discoveryId,
      });
    } else
      events.push({
        type: 'requestMissingItem',
        requestId: request.id,
        discoveryId: request.discoveryId,
      });
  });
  return events;
}
export function initialState(level) {
  const state = {
    dogCell: level.definition.startCell,
    collectedRequiredMask: 0,
    nextRequiredIndex: 0,
    collectedKeyMask: 0,
    switchMask: level.definition.initialSwitchMask,
    collectedDiscoveryMask: 0,
    carriedDiscoveryMask: 0,
    fulfilledRequestMask: 0,
  };
  collect(level, state);
  return state;
}
export function isComplete(level, state) {
  return (
    state.dogCell === level.definition.goalCell &&
    state.collectedRequiredMask === level.allItemsMask &&
    state.collectedDiscoveryMask === level.allDiscoveriesMask &&
    state.fulfilledRequestMask === level.allRequestsMask
  );
}
export function stateKey(s) {
  return [
    s.dogCell,
    s.collectedRequiredMask,
    s.nextRequiredIndex,
    s.collectedKeyMask,
    s.switchMask,
    s.collectedDiscoveryMask,
    s.carriedDiscoveryMask,
    s.fulfilledRequestMask,
  ].join(':');
}
export function transition(level, state, action) {
  if (!action || typeof action !== 'object' || Array.isArray(action))
    fail('INVALID_ACTION', 'An action object is required.');
  const next = { ...state };
  if (action.type === 'activateLever') {
    if (
      Object.keys(action).some((k) => !['type', 'leverId'].includes(k)) ||
      !level.leverIds.has(action.leverId)
    )
      fail('INVALID_ACTION', 'Unknown lever action.');
    const index = level.leverIds.get(action.leverId);
    if (level.definition.levers[index].cell !== state.dogCell)
      fail('LEVER_OUT_OF_REACH', 'The dog must stand on the lever to activate it.');
    next.switchMask ^= 1 << index;
    return {
      state: next,
      moveCost: 0,
      events: [{ type: 'leverActivated', leverId: action.leverId, switchMask: next.switchMask }],
    };
  }
  if (action.type !== 'move' || Object.keys(action).some((k) => !['type', 'direction'].includes(k)))
    fail('INVALID_ACTION', 'Expected Move or ActivateLever.');
  const direction = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[action.direction];
  if (!direction) fail('INVALID_ACTION', 'Movement must be up, down, left, or right.');
  const n = level.definition.width,
    x = (state.dogCell % n) + direction[0],
    y = Math.floor(state.dogCell / n) + direction[1];
  if (x < 0 || y < 0 || x >= n || y >= n) fail('BLOCKED_MOVE', 'The move leaves the board.');
  const destination = y * n + x,
    edge = level.edges.get(edgeId(state.dogCell, destination));
  if (
    !edge ||
    (edge.kind === 'lever' &&
      Number(Boolean(state.switchMask & (1 << edge.index))) !== edge.openWhen) ||
    (edge.kind === 'key' && !(state.collectedKeyMask & (1 << edge.index))) ||
    (edge.kind === 'princess' && !(state.fulfilledRequestMask & (1 << edge.index)))
  )
    fail('BLOCKED_MOVE', 'The passage is closed.');
  next.dogCell = destination;
  const events = [{ type: 'moved', from: state.dogCell, to: destination }];
  if (edge.kind === 'lever') events.push({ type: 'controlledPassageCrossed', leverId: edge.id });
  if (edge.kind === 'princess') events.push({ type: 'princessGateCrossed', requestId: edge.id });
  if (edge.kind === 'key') events.push({ type: 'gateCrossed', keyId: edge.id });
  events.push(...collect(level, next));
  if (destination === level.definition.goalCell)
    events.push({ type: isComplete(level, next) ? 'home' : 'homeEarly' });
  return { state: next, moveCost: 1, events };
}
export function simulate(level, actions, { trace = true } = {}) {
  if (!Array.isArray(actions) || actions.length > MAX_ACTIONS)
    fail('INVALID_PLAN', `Plans must contain at most ${MAX_ACTIONS} actions.`);
  let state = initialState(level),
    moveCount = 0,
    leverActionCount = 0;
  const frames = trace ? [{ actionIndex: -1, state: { ...state }, moveCount: 0, events: [] }] : [];
  const events = [],
    visits = new Set([state.dogCell]);
  let revisited = false;
  actions.forEach((action, index) => {
    let step;
    try {
      step = transition(level, state, action);
    } catch (error) {
      if (error instanceof RuleError) error.actionIndex = index;
      throw error;
    }
    state = step.state;
    moveCount += step.moveCost;
    if (!step.moveCost) leverActionCount++;
    if (step.moveCost) {
      if (visits.has(state.dogCell)) revisited = true;
      visits.add(state.dogCell);
    }
    events.push(...step.events);
    if (trace)
      frames.push({ actionIndex: index, state: { ...state }, moveCount, events: step.events });
  });
  return {
    state,
    moveCount,
    leverActionCount,
    complete: isComplete(level, state),
    revisited,
    events,
    frames,
  };
}
export class PlanEditor {
  constructor(level) {
    this.level = level;
    this.actions = [];
  }
  get preview() {
    return simulate(this.level, this.actions);
  }
  append(action) {
    const actions = [...this.actions, structuredClone(action)];
    simulate(this.level, actions);
    this.actions = actions;
    return this.preview;
  }
  undo() {
    this.actions.pop();
    return this.preview;
  }
  clear() {
    this.actions = [];
    return this.preview;
  }
  scrub(length) {
    if (!integer(length, 0, this.actions.length)) fail('INVALID_PLAN', 'Invalid plan step.');
    return simulate(this.level, this.actions.slice(0, length));
  }
  truncate(length) {
    this.scrub(length);
    this.actions = this.actions.slice(0, length);
    return this.preview;
  }
}

export function requestProgress(level, state) {
  return level.definition.royalRequests.map((request, index) => ({
    requestId: request.id,
    discoveryId: request.discoveryId,
    status:
      state.fulfilledRequestMask & (1 << index)
        ? 'delivered'
        : state.carriedDiscoveryMask & (1 << level.discoveryIds.get(request.discoveryId))
          ? 'carry'
          : 'find',
  }));
}
