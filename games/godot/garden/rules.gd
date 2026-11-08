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

func generate_legacy(n: int, value: String, hard: bool = false) -> Dictionary:
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
		if p != key_cell and items.size() < 3 and (not hard or accessible.has(p)): items.append(p)
	return {"size": n, "seed": value, "hard": hard, "edges": edges, "items": items, "key": key_cell, "home": n * n - 1}

func initial(level: Dictionary = {}) -> Dictionary:
	var state := {"pos": 0, "mask": 0, "key": false, "moves": 0}
	if level.get("brutal", false): state.visited = [0]
	return state

func move(level: Dictionary, state: Dictionary, to: int) -> Dictionary:
	if not level.edges[state.pos].has(to): return {}
	if level.get("brutal", false) and state.get("visited", [state.pos]).has(to): return {}
	if to == level.home and not state.key: return {}
	var i: int = level.items.find(to)
	var next := {"pos": to, "mask": state.mask | ((1 << i) if i >= 0 else 0), "key": state.key or (to == level.key and (not level.get("hard", false) or state.mask == 7)), "moves": state.moves + 1}
	if level.get("brutal", false):
		next.visited = state.get("visited", [state.pos]).duplicate()
		next.visited.append(to)
	return next

func won(level: Dictionary, state: Dictionary) -> bool:
	return state.pos == level.home and state.mask == 7 and state.key

func state_key(state: Dictionary) -> int:
	return state.pos * 16 + state.mask * 2 + int(state.key)

## Exact shortest route through position, collected-bone mask and key possession.
## Every legal tile move costs one; blocked attempts never enter the queue.
## Revisiting a tile with different inventory is a different search state.
# Brutal mode must distinguish histories: inventory alone is not sufficient.
func search_key(level: Dictionary, state: Dictionary) -> String:
	var key := str(state_key(state))
	if level.get("brutal", false):
		var visited: Array = state.get("visited", [state.pos]).duplicate()
		visited.sort()
		key += ":" + str(visited)
	return key

func solve_result(level: Dictionary, start: Dictionary = {}) -> Dictionary:
	if start.is_empty():
		if level.get("brutal", false) and level.has("brutal_solution"):
			var route: Array = level.brutal_solution.duplicate()
			return {"solvable": true, "minimum_steps": route.size(), "route": route, "states_visited": 0}
		start = initial(level)
	var nodes: Array = [{"state": start, "prev": -1}]
	var seen: Dictionary = {search_key(level, start): true}
	var at := 0
	# Classic/Hard: at most n*n*8*2 states. Brutal also tracks visited cells.
	# Generated Brutal puzzles use the pre-certified exact optimum above.
	while at < nodes.size():
		var state: Dictionary = nodes[at].state
		if won(level, state):
			var route: Array = []
			var j := at
			while nodes[j].prev >= 0:
				route.append(nodes[j].state.pos)
				j = nodes[j].prev
			route.reverse()
			return {"solvable": true, "minimum_steps": route.size(), "route": route, "states_visited": at + 1}
		for p in level.edges[state.pos]:
			# Share gameplay transitions, including hard-mode key collection.
			var next := move(level, state, p)
			if not next.is_empty() and not seen.has(search_key(level, next)):
				seen[search_key(level, next)] = true
				nodes.append({"state": next, "prev": at})
		at += 1
	# -1 explicitly distinguishes unreachable from an already-won state (0).
	return {"solvable": false, "minimum_steps": -1, "route": [], "states_visited": at}

# Preserve the route-only API used by playback and legacy parity checks.
func solve(level: Dictionary, start: Dictionary = {}) -> Array:
	return solve_result(level, start).route

# Odd-sized grids assign their middle row/column to bottom/right.
func quadrant(cell: int, n: int) -> int:
	return int(cell % n >= n / 2) + 2 * int(cell / n >= n / 2)

func home_distances(level: Dictionary) -> Dictionary:
	var distances := {level.home: 0}
	var queue: Array = [level.home]
	var at := 0
	while at < queue.size():
		var p: int = queue[at]
		at += 1
		for q in level.edges[p]:
			if not distances.has(q):
				distances[q] = distances[p] + 1
				queue.append(q)
	return distances

func grid_distance(a: int, b: int, n: int) -> int:
	return absi(a % n - b % n) + absi(a / n - b / n)

func placement_valid(level: Dictionary) -> bool:
	var objects: Array = level.items + [level.key, level.home]
	for i in objects.size():
		for j in range(i + 1, objects.size()):
			if grid_distance(objects[i], objects[j], level.size) < 3: return false
	var occupied := {}
	for cell in level.items + [level.key]:
		if cell == 0 or cell == level.home or occupied.has(quadrant(cell, level.size)): return false
		occupied[quadrant(cell, level.size)] = true
	if occupied.size() != 4: return false
	var distances := home_distances(level)
	if not distances.has(level.key): return false
	for bone in level.items:
		if distances.has(bone) and distances[bone] < distances[level.key] and grid_distance(bone, level.home, level.size) < grid_distance(level.key, level.home, level.size):
			return true
	return false

# Carve a simple randomized route into the maze, then choose one collectible
# per quadrant. Bones precede the key on this certified no-backtracking route.
func _place_on_route(base: Dictionary, route: Array) -> Dictionary:
	var level := base.duplicate(true)
	var previous := 0
	for cell in route:
		if not level.edges[previous].has(cell):
			level.edges[previous].append(cell)
			level.edges[cell].append(previous)
		previous = cell
	var distances := home_distances(level)
	var groups: Array = [[], [], [], []]
	for cell in route:
		if cell == level.home: break
		var q := quadrant(cell, level.size)
		var bones: Array = []
		for region in 4:
			if region == q: continue
			if groups[region].is_empty(): break
			var choices: Array = []
			for candidate in groups[region]:
				if grid_distance(candidate, cell, level.size) < 3 or grid_distance(candidate, level.home, level.size) < 3: continue
				var separated := true
				for placed in bones:
					if grid_distance(candidate, placed, level.size) < 3: separated = false
				if separated: choices.append(candidate)
			if choices.is_empty(): break
			var bone: int = choices[int(rand_value() * choices.size())]
			# Prefer a close-to-home bone in the house quadrant.
			if region == 3:
				for candidate in choices:
					if distances[candidate] < distances[bone]: bone = candidate
			bones.append(bone)
		if bones.size() == 3:
			level.items = bones
			level.key = cell
			level.route = route
			if placement_valid(level) and validate_route(level, route): return level
		groups[q].append(cell)
	return {}

func generate(n: int, value: String, hard: bool = false, brutal: bool = false) -> Dictionary:
	if brutal: return _generate_brutal(n, value)
	var base := generate_legacy(n, value, hard)
	for attempt in 32:
		var seen := {0: true}
		var stack: Array = [0]
		while not stack.is_empty() and stack.back() != base.home:
			var options: Array = []
			for q in neighbors(stack.back(), n):
				if not seen.has(q): options.append(q)
			if options.is_empty():
				stack.pop_back()
			else:
				var q: int = options[int(rand_value() * options.size())]
				seen[q] = true
				stack.append(q)
		if stack.is_empty(): continue
		var candidate := _place_on_route(base, stack.slice(1))
		if not candidate.is_empty(): return candidate
	# The constructive route also satisfies spacing on the smallest grid.
	var fallback := _brutal_fallback(n, value)
	fallback.hard = hard
	fallback.erase("brutal")
	fallback.erase("brutal_solution")
	return fallback

func validate_route(level: Dictionary, route: Array) -> bool:
	var visited := {0: true}
	var current := initial()
	var strict := level.duplicate()
	strict.hard = true
	for cell in route:
		if visited.has(cell): return false
		visited[cell] = true
		if cell == level.key and current.mask != 7: return false
		current = move(strict, current, cell)
		if current.is_empty(): return false
	return won(strict, current)

# A relaxed Hard-mode optimum is a lower bound for Brutal mode. If that
# optimum has no repeated cells, it proves the exact Brutal optimum too.
func _certify_brutal(level: Dictionary) -> Dictionary:
	var solution: Array = solve(level)
	if not validate_route(level, solution): return {}
	level.brutal = true
	level.brutal_solution = solution
	return level

func _generate_brutal(n: int, value: String) -> Dictionary:
	for attempt in 8:
		var candidate := generate(n, value + "-brutal-%d" % attempt, true)
		var certified := _certify_brutal(candidate)
		if not certified.is_empty(): return certified
	return _brutal_fallback(n, value)

func _brutal_fallback(n: int, value: String) -> Dictionary:
	# Bounded fallback: a simple tour with a bone-to-home shortcut. Reaching
	# that shortcut before the key is locked; after the key the forward exit
	# is shorter than retracing the tour. Attach remaining cells as branches.
	var level := generate_legacy(n, value + "-brutal-fallback", true)
	var route: Array = []
	for y in range(1, n): route.append(y * n)
	for x in range(1, n - 1): route.append((n - 1) * n + x)
	for y in range(n - 2, -1, -1): route.append(y * n + n - 2)
	route.append(n - 1)
	for y in range(1, n): route.append(y * n + n - 1)
	var edges: Array = []
	for i in n * n: edges.append([])
	var visited := {0: true}
	var previous := 0
	for cell in route:
		edges[previous].append(cell)
		edges[cell].append(previous)
		visited[cell] = true
		previous = cell
	var bone := (n - 3) * n + n - 2
	var shortcut := bone + 1
	edges[bone].append(shortcut)
	edges[shortcut].append(bone)
	var queue: Array = visited.keys()
	var cursor := 0
	while cursor < queue.size():
		var p: int = queue[cursor]
		cursor += 1
		for q in neighbors(p, n):
			if not visited.has(q):
				edges[p].append(q)
				edges[q].append(p)
				visited[q] = true
				queue.append(q)
	level.edges = edges
	level.items = [n, (n - 1) * n, bone]
	level.key = n - 1
	level.route = route
	var certified := _certify_brutal(level)
	assert(not certified.is_empty() and placement_valid(certified))
	return certified
