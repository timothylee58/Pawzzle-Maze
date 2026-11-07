extends RefCounted
## V3 opening campaign rules. Unsupported roadmap mechanics fail explicitly.
const Levels = preload("res://campaign_levels.gd")
const DIRECTIONS = {"up": Vector2i.UP, "down": Vector2i.DOWN, "left": Vector2i.LEFT, "right": Vector2i.RIGHT}

static func validate(d: Dictionary) -> bool:
	if d.rulesVersion != "3.0": return false
	for field in ["requiredItems", "keys", "keyGates", "levers", "controlledEdges", "portalPairs"]:
		if not d[field].is_empty(): return false
	return true

static func initial(d: Dictionary) -> Dictionary:
	var s := {"dogCell": int(d.startCell), "collectedRequiredMask": 0, "nextRequiredIndex": 0, "collectedKeyMask": 0, "switchMask": int(d.initialSwitchMask), "collectedDiscoveryMask": 0, "carriedDiscoveryMask": 0, "fulfilledRequestMask": 0}
	collect(d, s)
	return s

static func id_index(items: Array, id: String) -> int:
	for i in items.size():
		if items[i].id == id: return i
	return -1

static func collect(d: Dictionary, s: Dictionary) -> Array:
	var events: Array = []
	for i in d.discoveries.size():
		var item: Dictionary = d.discoveries[i]
		if item.cell == s.dogCell and not (int(s.collectedDiscoveryMask) & (1 << i)):
			s.collectedDiscoveryMask = int(s.collectedDiscoveryMask) | (1 << i)
			s.carriedDiscoveryMask = int(s.carriedDiscoveryMask) | (1 << i)
			events.append({"type": "discoveryCollected", "discoveryId": item.id})
	for i in d.royalRequests.size():
		var request: Dictionary = d.royalRequests[i]
		for tile in d.interactionCells:
			if tile.requestId != request.id or tile.cell != s.dogCell or (int(s.fulfilledRequestMask) & (1 << i)): continue
			var bit := 1 << id_index(d.discoveries, request.discoveryId)
			var fulfilled := bool(int(s.carriedDiscoveryMask) & bit)
			if fulfilled:
				s.carriedDiscoveryMask = int(s.carriedDiscoveryMask) & ~bit
				s.fulfilledRequestMask = int(s.fulfilledRequestMask) | (1 << i)
			events.append({"type": "requestFulfilled" if fulfilled else "requestMissingItem", "requestId": request.id, "discoveryId": request.discoveryId})
	return events

static func complete(d: Dictionary, s: Dictionary) -> bool:
	return s.dogCell == d.goalCell and int(s.collectedDiscoveryMask) == (1 << d.discoveries.size()) - 1 and int(s.fulfilledRequestMask) == (1 << d.royalRequests.size()) - 1

static func same_edge(edge: Array, a: int, b: int) -> bool:
	return (edge[0] == a and edge[1] == b) or (edge[1] == a and edge[0] == b)

static func passage(d: Dictionary, s: Dictionary, a: int, b: int) -> Dictionary:
	for edge in d.staticEdges:
		if same_edge(edge, a, b): return {"open": true}
	for gate in d.princessGateEdges:
		if same_edge(gate.cells, a, b):
			return {"open": bool(int(s.fulfilledRequestMask) & (1 << id_index(d.royalRequests, gate.requestId))), "requestId": gate.requestId}
	return {"open": false}

static func step(d: Dictionary, s: Dictionary, direction: String) -> Dictionary:
	if not DIRECTIONS.has(direction): return {"error": "INVALID_ACTION"}
	var n := int(d.width)
	var p := Vector2i(int(s.dogCell) % n, int(s.dogCell) / n) + Vector2i(DIRECTIONS[direction])
	if p.x < 0 or p.y < 0 or p.x >= n or p.y >= n: return {"error": "BLOCKED_MOVE"}
	var dest := p.y * n + p.x
	var edge := passage(d, s, int(s.dogCell), dest)
	if not edge.open: return {"error": "BLOCKED_MOVE"}
	var next := s.duplicate()
	next.dogCell = dest
	var events: Array = [{"type": "moved", "from": s.dogCell, "to": dest}]
	if edge.has("requestId"): events.append({"type": "princessGateCrossed", "requestId": edge.requestId})
	events.append_array(collect(d, next))
	if dest == d.goalCell: events.append({"type": "home" if complete(d, next) else "homeEarly"})
	return {"state": next, "moveCost": 1, "events": events}

static func simulate(d: Dictionary, actions: Array) -> Dictionary:
	if actions.size() > 4096: return {"error": "INVALID_PLAN"}
	var s := initial(d)
	var frames: Array = [{"state": s.duplicate(), "events": []}]
	var events: Array = []
	var visited := {int(s.dogCell): true}
	var revisited := false
	for direction in actions:
		var result := step(d, s, str(direction))
		if result.has("error"): return result
		s = result.state
		revisited = revisited or visited.has(int(s.dogCell))
		visited[int(s.dogCell)] = true
		events.append_array(result.events)
		frames.append({"state": s.duplicate(), "events": result.events})
	return {"state": s, "frames": frames, "events": events, "moveCount": actions.size(), "complete": complete(d, s), "revisited": revisited}

static func demonstrated(d: Dictionary, preview: Dictionary) -> bool:
	if not preview.complete: return false
	for required in d.get("tutorial", {}).get("require", []):
		var found := false
		for event in preview.events:
			if event.type == required: found = true
		if not found: return false
	return true

static func state_key(s: Dictionary) -> String:
	return "%d:%d:%d:%d" % [s.dogCell, s.collectedDiscoveryMask, s.carriedDiscoveryMask, s.fulfilledRequestMask]

static func optimal_moves(d: Dictionary) -> int:
	# Uniform-cost BFS over position AND inventory/request state, not just tiles.
	var first := initial(d)
	var queue: Array = [{"state": first, "distance": 0}]
	var seen := {state_key(first): true}
	var index := 0
	while index < queue.size():
		var item: Dictionary = queue[index]
		index += 1
		if complete(d, item.state): return item.distance
		for direction in DIRECTIONS:
			var result := step(d, item.state, direction)
			if result.has("error"): continue
			var key := state_key(result.state)
			if seen.has(key): continue
			seen[key] = true
			queue.append({"state": result.state, "distance": item.distance + 1})
	return -1
