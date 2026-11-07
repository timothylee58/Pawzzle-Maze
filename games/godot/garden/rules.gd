extends RefCounted
## Garden rules v1. JS-compatible uint32 generator; objective-aware BFS.
var rng_state: int = 0

func rng_seed(value: String) -> void:
	rng_state = 2166136261
	for character in value:
		var code: int = character.unicode_at(0)
		# JS for-of iterates codepoints; charCodeAt(0) takes the high surrogate.
		if code > 65535: code = 0xd800 + ((code - 65536) >> 10)
		rng_state = ((rng_state ^ code) * 16777619) & 0xffffffff

func rand_value() -> float:
	rng_state = (rng_state + 0x6D2B79F5) & 0xffffffff
	var t: int = ((rng_state ^ (rng_state >> 15)) * (1 | rng_state)) & 0xffffffff
	t = (t ^ ((t + (((t ^ (t >> 7)) * (61 | t)) & 0xffffffff)) & 0xffffffff)) & 0xffffffff
	return float((t ^ (t >> 14)) & 0xffffffff) / 4294967296.0

func neighbors(p: int, n: int) -> Array:
	var result: Array = []
	if p % n > 0: result.append(p - 1)
	if p % n < n - 1: result.append(p + 1)
	if p >= n: result.append(p - n)
	if p < n * (n - 1): result.append(p + n)
	return result

func generate(n: int, value: String) -> Dictionary:
	assert(n >= 5 and n <= 14)
	rng_seed(value)
	var edges: Array = []
	for i in n * n: edges.append([])
	var seen: Dictionary = {0: true}
	var stack: Array = [0]
	while not stack.is_empty():
		var p: int = stack.back()
		var options: Array = []
		for q in neighbors(p, n):
			if not seen.has(q): options.append(q)
		if options.is_empty():
			stack.pop_back()
			continue
		var q: int = options[int(rand_value() * options.size())]
		edges[p].append(q)
		edges[q].append(p)
		seen[q] = true
		stack.append(q)
	for p in n * n:
		for q in neighbors(p, n):
			if q > p and not edges[p].has(q) and rand_value() < 0.14:
				edges[p].append(q)
				edges[q].append(p)
	var pool: Array = range(1, n * n - 1)
	for i in range(pool.size() - 1, 0, -1):
		var j := int(rand_value() * (i + 1))
		var temp = pool[i]
		pool[i] = pool[j]
		pool[j] = temp
	var accessible: Dictionary = {0: true}
	var queue: Array = [0]
	var at := 0
	while at < queue.size():
		for q in edges[queue[at]]:
			if q != n * n - 1 and not accessible.has(q):
				accessible[q] = true
				queue.append(q)
		at += 1
	var key_cell: int = -1
	for p in pool:
		if accessible.has(p):
			key_cell = p
			break
	var items: Array = []
	for p in pool:
		if p != key_cell and items.size() < 3: items.append(p)
	return {"size": n, "seed": value, "edges": edges, "items": items, "key": key_cell, "home": n * n - 1}

func initial() -> Dictionary:
	return {"pos": 0, "mask": 0, "key": false, "moves": 0}

func move(level: Dictionary, state: Dictionary, to: int) -> Dictionary:
	if not level.edges[state.pos].has(to): return {}
	if to == level.home and not state.key: return {}
	var i: int = level.items.find(to)
	return {"pos": to, "mask": state.mask | ((1 << i) if i >= 0 else 0), "key": state.key or to == level.key, "moves": state.moves + 1}

func won(level: Dictionary, state: Dictionary) -> bool:
	return state.pos == level.home and state.mask == 7 and state.key

func state_key(state: Dictionary) -> int:
	return state.pos * 16 + state.mask * 2 + int(state.key)

func solve(level: Dictionary, start: Dictionary = {}) -> Array:
	if start.is_empty(): start = initial()
	var nodes: Array = [{"state": start, "prev": -1}]
	var seen: Dictionary = {state_key(start): true}
	var at := 0
	# At most n*n positions * 8 masks * 2 key states.
	while at < nodes.size() and at < int(level.size) * int(level.size) * 16:
		var state: Dictionary = nodes[at].state
		if won(level, state):
			var route: Array = []
			var j := at
			while nodes[j].prev >= 0:
				route.push_front(nodes[j].state.pos)
				j = nodes[j].prev
			return route
		for p in level.edges[state.pos]:
			var next := move(level, state, p)
			if not next.is_empty() and not seen.has(state_key(next)):
				seen[state_key(next)] = true
				nodes.append({"state": next, "prev": at})
		at += 1
	return []
