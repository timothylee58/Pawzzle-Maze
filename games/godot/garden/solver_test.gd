extends SceneTree
const Rules = preload("res://garden/rules.gd")
var checks := 0
var failures := 0
var rules = Rules.new()

func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok:
		failures += 1
		printerr("FAIL: " + message)

func fixture() -> Dictionary:
	var edges: Array = []
	for i in 9: edges.append([])
	var path := [0, 1, 2, 5, 4, 3, 6]
	for i in path.size() - 1:
		edges[path[i]].append(path[i + 1])
		edges[path[i + 1]].append(path[i])
	return {"size": 3, "edges": edges, "items": [2, 5, 4], "key": 1, "home": 6, "hard": false}

# Independent Dijkstra oracle: explicit inventory tuples, no production
# state_key, move, won or solve calls. Minimum extraction instead of FIFO.
func oracle(level: Dictionary, start: Dictionary) -> int:
	var origin := Vector3i(start.pos, start.mask, int(start.key))
	var distances := {origin: 0}
	var pending := {origin: true}
	while not pending.is_empty():
		var best: Vector3i = pending.keys()[0]
		for candidate in pending:
			if distances[candidate] < distances[best]: best = candidate
		pending.erase(best)
		var cost: int = distances[best]
		if best.x == level.home and best.y == (1 << level.items.size()) - 1 and best.z == 1: return cost
		for target in level.edges[best.x]:
			if target == level.home and best.z == 0: continue
			var mask: int = best.y
			for i in level.items.size():
				if target == level.items[i]: mask |= 1 << i
			var key: int = best.z
			if target == level.key and (not level.hard or best.y == (1 << level.items.size()) - 1): key = 1
			var next := Vector3i(target, mask, key)
			if not distances.has(next) or cost + 1 < distances[next]:
				distances[next] = cost + 1
				pending[next] = true
	return -1

func verify(level: Dictionary, start: Dictionary = {}) -> void:
	if start.is_empty(): start = rules.initial()
	var untouched := start.duplicate(true)
	var level_before := level.duplicate(true)
	var answer: Dictionary = rules.solve_result(level, start)
	check(answer.minimum_steps == oracle(level, start), "matches independent Dijkstra")
	check(answer.solvable == (answer.minimum_steps >= 0), "explicit solvability")
	check(answer.states_visited <= level.size * level.size * (1 << level.items.size()) * 2, "bounded state search")
	check(start == untouched and level == level_before, "solver preserves inputs")
	if answer.solvable:
		var state: Dictionary = start.duplicate()
		for cell in answer.route:
			state = rules.move(level, state, cell)
			check(not state.is_empty(), "returned move is legal")
			if state.is_empty(): break
		check(not state.is_empty() and rules.won(level, state), "route completes all objectives")
		check(answer.route.size() == answer.minimum_steps, "distance matches route")
		check(state.moves - start.moves == answer.minimum_steps, "distance excludes prior moves")

func _initialize() -> void:
	var level := fixture()
	check(rules.solve_result(level).minimum_steps == 6, "normal collects early key")
	level.hard = true
	check(rules.solve_result(level).minimum_steps == 12, "hard must revisit early key")
	verify(level)
	verify(level, {"pos": 4, "mask": 7, "key": false, "moves": 91})
	var won := {"pos": 6, "mask": 7, "key": true, "moves": 12}
	check(rules.solve_result(level, won).minimum_steps == 0, "already won has zero remaining steps")
	verify(level, won)
	level.edges[0] = []
	var impossible: Dictionary = rules.solve_result(level)
	check(not impossible.solvable and impossible.minimum_steps == -1, "unreachable is not zero")
	verify(level)

	var random := RandomNumberGenerator.new()
	random.seed = 73192
	for sample in 80:
		level = fixture()
		for p in 9:
			for q in rules.neighbors(p, 3):
				if q > p and not level.edges[p].has(q) and random.randf() < 0.5:
					level.edges[p].append(q)
					level.edges[q].append(p)
		for hard in [false, true]:
			level.hard = hard
			verify(level)
	# Five-bone inventory cannot alias another position or accept only three bones.
	var five := fixture()
	five.items = [0, 2, 5, 4, 3]
	five.hard = true
	verify(five)
	verify(five, {"pos": 0, "mask": 15, "key": false, "moves": 2})
	check(not rules.won(five, {"pos": 6, "mask": 7, "key": true, "moves": 9}), "five-bone win rejects three bones")
	# Every supported generated garden size, both modes, deterministic seeds.
	var maximum_us := 0
	for n in range(5, 15):
		for hard in [false, true]:
			for seed_index in 3:
				level = rules.generate(n, "BFS-CHECK-%d" % seed_index, hard)
				var started := Time.get_ticks_usec()
				var answer: Dictionary = rules.solve_result(level)
				maximum_us = maxi(maximum_us, Time.get_ticks_usec() - started)
				check(answer.solvable, "generated puzzle solvable")
				check(answer.minimum_steps <= level.route.size(), "optimum no longer than certified route")
				var state: Dictionary = rules.initial()
				for cell in answer.route: state = rules.move(level, state, cell)
				check(rules.won(level, state), "generated optimum wins")
				check(answer.states_visited <= n * n * (1 << level.items.size()) * 2, "generated search bound")
	print("Garden BFS: %d checks; %d failures; slowest generated search %.2f ms." % [checks, failures, maximum_us / 1000.0])
	quit(1 if failures else 0)
